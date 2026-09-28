/**
 * The extension's one background job: capturing a frame from a keystroke.
 *
 * It exists because capture needs `chrome.tabs.captureVisibleTab`, and that is
 * doubly out of reach from the lecture page. A content script has no
 * `chrome.tabs` at all, and the `activeTab` permission the call depends on is
 * only granted when the user invokes the extension — pressing a key on the page
 * is not that. A `chrome.commands` shortcut *is*, which is what makes this work
 * and why the shortcut has to be declared in the manifest rather than listened
 * for on the page the way the note shortcut is.
 *
 * Nothing else belongs here. The worker is torn down between events, so it can
 * hold no state, and everything it needs it asks the page for.
 */

import { classifyFrame, cropRectFor, type CapturedFrame } from './lib/frame-capture';
import { saveScreenshot } from './lib/library-db';
import { courseIdFromUrl } from './lib/library-schema';
import { lectureId } from './lib/collection';
import { dataUrlBytes } from './lib/zip';
import type { ToastTone } from './lib/page-toast';

/** Must match the key in the manifest's `commands`. */
const CAPTURE_COMMAND = 'capture-frame';

interface Geometry {
  rect: { x: number; y: number; width: number; height: number };
  seconds: number;
  devicePixelRatio: number;
  wasPlaying: boolean;
}

/**
 * Say something on the page, and never fail because of it.
 *
 * A tab that has navigated away has no listener; that is not worth surfacing,
 * and it certainly is not worth losing a captured frame over.
 */
async function say(tabId: number, message: string, tone: ToastTone = 'ok'): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'SHOW_TOAST', data: { message, tone } });
  } catch {
    // The page is gone. Nothing to tell, and nobody to tell it to.
  }
}

/** The captured viewport, decoded into something a worker can draw. */
async function decode(dataUrl: string): Promise<ImageBitmap> {
  const bytes = dataUrlBytes(dataUrl);
  return createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/png' }));
}

/** PNG data URL from a worker canvas, without `FileReader` or a DOM. */
async function toPngDataUrl(canvas: OffscreenCanvas): Promise<string> {
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const bytes = new Uint8Array(await blob.arrayBuffer());

  // Chunked: spreading a megabyte of bytes into one call overflows the stack.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }

  return `data:image/png;base64,${btoa(binary)}`;
}

/**
 * Crop the viewport down to the video and decide whether it is worth keeping.
 *
 * The same two steps the popup's capture does, in the worker's idioms:
 * `OffscreenCanvas` rather than a `<canvas>` element, and `createImageBitmap`
 * rather than an `Image`. `cropRectFor` and `classifyFrame` are pure, so the
 * judgement about device pixel ratio and about black DRM frames is shared
 * rather than written twice.
 */
async function cropAndCheck(
  shot: string,
  geometry: Geometry,
): Promise<{ dataUrl: string } | { error: string }> {
  const bitmap = await decode(shot);

  const crop = cropRectFor(geometry.rect, geometry.devicePixelRatio, {
    width: bitmap.width,
    height: bitmap.height,
  });
  if (!crop) return { error: 'Scroll the video into view before capturing.' };

  const canvas = new OffscreenCanvas(crop.width, crop.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { error: 'Could not prepare the image canvas.' };

  context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  const classification = classifyFrame(
    context.getImageData(0, 0, crop.width, crop.height).data,
  );
  if (classification.verdict !== 'ok') {
    // `reason` is optional on the type, and a rejection with nothing said is
    // worse than a generic sentence.
    return { error: classification.reason ?? 'The captured frame was not usable.' };
  }

  return { dataUrl: await toPngDataUrl(canvas) };
}

/**
 * The lecture tab, found the way a worker has to find it.
 *
 * `currentWindow: true` is the obvious query and the wrong one here: "current"
 * means the window containing the calling context, and a service worker has no
 * window. The query then comes back empty, so the shortcut did nothing — except
 * while the popup happened to be open, which gave the call a window to resolve
 * against and made the bug look like a permissions problem.
 *
 * `lastFocusedWindow` is the equivalent that means something from a worker. The
 * two fallbacks behind it cover a focused window Chrome has not finished
 * reporting yet, and a browser whose only window is not marked focused at all.
 */
async function activeTab(): Promise<chrome.tabs.Tab | null> {
  const [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (focused?.id !== undefined) return focused;

  const window = await chrome.windows.getLastFocused({ populate: true }).catch(() => null);
  const inWindow = window?.tabs?.find((tab) => tab.active);
  if (inWindow?.id !== undefined) return inWindow;

  const [anywhere] = await chrome.tabs.query({ active: true });
  return anywhere?.id === undefined ? null : anywhere;
}

/**
 * Ask the page to pause and measure itself, attaching the script if need be.
 *
 * A tab open since before the extension was last reloaded has no content
 * script in it, and the lecture looks perfectly normal — so without this the
 * first press after every update would do nothing at all.
 */
async function prepare(tabId: number): Promise<Geometry | null> {
  const ask = async () => {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PREPARE_CAPTURE' });
    return (response?.data as Geometry | null) ?? null;
  };

  try {
    return await ask();
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content-script.js'] });
    return await ask();
  }
}

/**
 * Capture the frame the user is looking at, and file it.
 *
 * Playback is restored however this turns out: the pause was this extension's
 * doing, not the user's choice.
 */
async function captureFrame(): Promise<void> {
  const tab = await activeTab();

  // Logged rather than swallowed. These are the paths that made the shortcut
  // appear to be unbound, and the worker console is the only place to see them.
  if (!tab?.id || !tab.url) {
    console.warn('[capture] no active tab to capture', { tab });
    return;
  }
  if (tab.windowId === undefined) {
    console.warn('[capture] active tab reported no window', { url: tab.url });
    return;
  }

  const tabId = tab.id;

  let geometry: Geometry | null = null;
  try {
    geometry = await prepare(tabId);
  } catch (error) {
    // Nothing is listening on the page, so there is nowhere to show this.
    console.warn('[capture] could not reach the page', error);
    return;
  }

  if (!geometry) {
    await say(tabId, 'No video found on this page.', 'warn');
    return;
  }

  try {
    const shot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const result = await cropAndCheck(shot, geometry);

    if ('error' in result) {
      await say(tabId, result.error, 'warn');
      return;
    }

    const frame: CapturedFrame = {
      lectureId: lectureId(tab.url, tab.url),
      seconds: Math.floor(geometry.seconds),
      dataUrl: result.dataUrl,
      capturedAt: Date.now(),
    };

    await saveScreenshot({ ...frame, courseId: courseIdFromUrl(tab.url) });
    await say(tabId, 'Frame captured — it is in your library.');
  } catch (error) {
    // `captureVisibleTab` is the likeliest thrower here, and its message names
    // the reason (a missing permission grant, or a page Chrome will not let the
    // extension read). Worth having in both places: the toast tells the user,
    // the console tells whoever is debugging it.
    console.warn('[capture] failed', error);
    await say(
      tabId,
      error instanceof Error ? error.message : 'The frame could not be captured.',
      'warn',
    );
  } finally {
    if (geometry.wasPlaying) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'RESUME_PLAYBACK' });
      } catch {
        // The tab went away; there is nothing left to resume.
      }
    }
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === CAPTURE_COMMAND) void captureFrame();
});
