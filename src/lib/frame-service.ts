/**
 * Capturing a video frame, and keeping it.
 *
 * The browser-facing half of frame capture: the geometry and validation live
 * in `frame-capture.ts`, which is pure and tested. This module talks to
 * `chrome.tabs`, a canvas and IndexedDB, and is deliberately thin so the parts
 * worth reasoning about are not trapped behind those APIs.
 *
 * ## Why IndexedDB
 *
 * `chrome.storage.local` is capped at 10 MB. A single 1080p PNG is a few
 * hundred KB, so a couple of dozen frames would exhaust it and the failure
 * would arrive as a quota error midway through a course. IndexedDB has no such
 * ceiling, and the manifest declares `unlimitedStorage` so the browser does not
 * evict the store under disk pressure.
 */

import {
  classifyFrame,
  cropRectFor,
  type CapturedFrame,
  type FrameVerdict,
  type Rect,
} from './frame-capture';
import { readFrameText, type FrameReadResult } from './on-device-ai';
import { dataUrlBytes } from './zip';

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

const DB_NAME = 'transcript-extractor-frames';
const DB_VERSION = 1;
const STORE = 'frames';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // Keyed by lecture and moment: capturing the same second twice is a
        // correction, not a second copy.
        const store = db.createObjectStore(STORE, { keyPath: ['lectureId', 'seconds'] });
        store.createIndex('lectureId', 'lectureId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the frame store'));
  });
}

/** Promisify one transaction, so callers are not writing event plumbing. */
function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Frame store write failed'));
        tx.oncomplete = () => db.close();
      }),
  );
}

export async function saveFrame(frame: CapturedFrame): Promise<void> {
  await run('readwrite', (store) => store.put(frame));
}

export async function framesForLecture(lectureId: string): Promise<CapturedFrame[]> {
  const frames = await run<CapturedFrame[]>('readonly', (store) =>
    store.index('lectureId').getAll(lectureId),
  );
  return frames.sort((a, b) => a.seconds - b.seconds);
}

export async function allFrames(): Promise<CapturedFrame[]> {
  const frames = await run<CapturedFrame[]>('readonly', (store) => store.getAll());
  return frames.sort((a, b) => a.seconds - b.seconds);
}

/**
 * Read a stored frame with the on-device model and keep the result.
 *
 * The empty string is stored for a frame with nothing legible on it, so a
 * blank slide is not re-read every time the popup opens. `undefined` stays
 * reserved for "not attempted".
 */
export async function readAndStoreFrame(frame: CapturedFrame): Promise<FrameReadResult> {
  const image = new Blob([dataUrlBytes(frame.dataUrl) as BlobPart], { type: 'image/png' });
  const result = await readFrameText(image);

  // A failed read leaves the frame untouched, so it can be retried.
  if (result.error) return result;

  await saveFrame({ ...frame, readout: result.text ?? '' });
  return result;
}

export async function deleteFrame(lectureId: string, seconds: number): Promise<void> {
  await run('readwrite', (store) => store.delete([lectureId, seconds]));
}

export async function clearFrames(): Promise<void> {
  await run('readwrite', (store) => store.clear());
}

/* -------------------------------------------------------------------------- */
/* Capture                                                                     */
/* -------------------------------------------------------------------------- */

export interface CaptureResult {
  verdict: FrameVerdict | 'unavailable';
  frame?: CapturedFrame;
  message?: string;
}

interface VideoRectResponse {
  rect: Rect;
  seconds: number;
  devicePixelRatio: number;
  viewport: { width: number; height: number };
  paused: boolean;
  /** True when this extension paused the lecture in order to capture it. */
  wasPlaying?: boolean;
}

/** Load a data URL into an image element, which is how a canvas can crop it. */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The capture could not be decoded'));
    image.src = dataUrl;
  });
}

/**
 * Capture the current frame of the lecture video.
 *
 * `captureVisibleTab` needs either `<all_urls>` or `activeTab`. This extension
 * has `activeTab`, which is granted for the tab the user just acted on — so
 * this works from the popup, where the user has by definition just clicked
 * something. The same call from a side panel does not receive that grant.
 *
 * The returned frame is cropped to the video and checked before it is stored,
 * because a DRM-protected player returns a black rectangle rather than an
 * error, and silently filling a notes file with black images is worse than
 * saying capture is unavailable here.
 */
export async function captureCurrentFrame(lectureId: string): Promise<CaptureResult> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return { verdict: 'unavailable', message: 'Extension APIs are not available.' };
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.windowId === undefined) {
    return { verdict: 'unavailable', message: 'No active tab.' };
  }

  // Pauses the lecture if it is playing, so the still is a settled frame
  // rather than whatever the compositor was mid-way through.
  let geometry: VideoRectResponse | null = null;
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'PREPARE_CAPTURE' });
    geometry = response?.data ?? null;
  } catch {
    return {
      verdict: 'unavailable',
      message: 'Reload the page — the extension is not attached to this tab yet.',
    };
  }

  if (!geometry) {
    return { verdict: 'unavailable', message: 'No video found on this page.' };
  }

  // Playback is restored however this turns out, including on a thrown
  // capture: pausing was this extension's doing, not the user's choice.
  const resume = async () => {
    if (!geometry?.wasPlaying) return;
    try {
      await chrome.tabs.sendMessage(tab.id as number, { type: 'RESUME_PLAYBACK' });
    } catch {
      // The tab went away; there is nothing left to resume.
    }
  };

  try {
    return await captureFromTab(tab.windowId, geometry, lectureId);
  } finally {
    await resume();
  }
}

/** The capture itself, once the page has been paused and measured. */
async function captureFromTab(
  windowId: number,
  geometry: VideoRectResponse,
  lectureId: string,
): Promise<CaptureResult> {
  const shot = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  const image = await loadImage(shot);

  const crop = cropRectFor(geometry.rect, geometry.devicePixelRatio, {
    width: image.width,
    height: image.height,
  });
  if (!crop) {
    return {
      verdict: 'unavailable',
      message: 'Scroll the video into view before capturing.',
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return { verdict: 'unavailable', message: 'Could not prepare the image canvas.' };
  }

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  const classification = classifyFrame(
    context.getImageData(0, 0, crop.width, crop.height).data,
  );
  if (classification.verdict !== 'ok') {
    return { verdict: classification.verdict, message: classification.reason };
  }

  const frame: CapturedFrame = {
    lectureId,
    seconds: Math.floor(geometry.seconds),
    dataUrl: canvas.toDataURL('image/png'),
    capturedAt: Date.now(),
  };

  await saveFrame(frame);
  return { verdict: 'ok', frame };
}
