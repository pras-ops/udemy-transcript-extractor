/**
 * Frame capture geometry and validation.
 *
 * A transcript cannot show a line of code, a diagram, or a step in a software
 * demo, which is most of what a programming lecture is actually made of. This
 * module holds the parts of capturing a still that can be reasoned about
 * without a browser: where to crop, whether the result is usable, and where it
 * belongs in the transcript.
 *
 * ## Why crop at all
 *
 * `chrome.tabs.captureVisibleTab` returns the whole viewport — player chrome,
 * sidebar, the browser's own UI. The frame a reader wants is the video
 * rectangle inside it, so the capture is cropped to the `<video>` element's
 * bounds scaled by the device pixel ratio.
 *
 * ## Why validate
 *
 * Several course platforms protect video with DRM, and a protected frame does
 * not fail loudly — it captures as a black rectangle. Saving those silently
 * would fill a notes file with black images and leave the reader to work out
 * why. `classifyFrame` detects that case so the UI can say what happened.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Where to crop a full-viewport capture so only the video remains.
 *
 * The device pixel ratio matters and is the detail most implementations get
 * wrong: a 400x300 CSS-pixel video on a 2x display occupies 800x600 pixels of
 * the captured bitmap. Ignoring it crops a quarter of the frame.
 *
 * Returns null when nothing usable is visible — the video scrolled out of
 * view, or is collapsed to zero height — rather than returning an empty
 * rectangle a caller has to re-check.
 */
export function cropRectFor(
  videoRect: Rect,
  devicePixelRatio: number,
  bitmap: Size,
): Rect | null {
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;

  const left = Math.round(videoRect.x * dpr);
  const top = Math.round(videoRect.y * dpr);
  const right = Math.round((videoRect.x + videoRect.width) * dpr);
  const bottom = Math.round((videoRect.y + videoRect.height) * dpr);

  // Clamp into the bitmap: a video can hang off the edge of the viewport while
  // still being mostly visible, and cropping outside the source throws.
  const x = Math.max(0, Math.min(left, bitmap.width));
  const y = Math.max(0, Math.min(top, bitmap.height));
  const x2 = Math.max(0, Math.min(right, bitmap.width));
  const y2 = Math.max(0, Math.min(bottom, bitmap.height));

  const width = x2 - x;
  const height = y2 - y;
  if (width <= 0 || height <= 0) return null;

  return { x, y, width, height };
}

export type FrameVerdict = 'ok' | 'blank' | 'protected';

export interface FrameClassification {
  verdict: FrameVerdict;
  /** Human-readable reason, shown when the verdict is not `ok`. */
  reason?: string;
}

/**
 * Sampling stride, in pixels. Checking every pixel of a 1080p frame is two
 * million reads for a question that a sample answers just as well.
 *
 * Kept small and prime deliberately. Any fixed stride can alias: content whose
 * own period matches the stride lands on one repeating value and reads as
 * flat. A stride of 13 makes that require detail repeating every 13 pixels
 * across an entire frame, where a coarse stride aliases against ordinary
 * regular structure like code indentation or table rows. The cost is ~160k
 * samples on a 1080p frame, which is a few milliseconds.
 *
 * The failure this risks is a false "blank" on a real frame, which the UI
 * presents as "try again" — recoverable. The reverse error, saving a blanked
 * frame as though it were content, is the one worth avoiding.
 */
const SAMPLE_STRIDE = 13;

/** Below this mean luminance (0-255) a frame carries no visible content. */
const DARK_LUMINANCE = 12;

/** Below this luminance spread the frame is one flat colour. */
const FLAT_SPREAD = 8;

/**
 * Decide whether a captured frame is worth keeping.
 *
 * Two failure modes look identical to the pixels and are worth separating for
 * the reader:
 *
 * - **protected** — uniformly black. DRM blanked the frame, and no retry or
 *   setting will change it. Capture is simply unavailable on this player.
 * - **blank** — flat but not black, which is what a player shows before the
 *   first frame decodes or while a poster image is up. Trying again a moment
 *   later usually works.
 *
 * `pixels` is RGBA, as returned by `CanvasRenderingContext2D.getImageData`.
 */
export function classifyFrame(pixels: Uint8ClampedArray): FrameClassification {
  if (pixels.length < 4) {
    return { verdict: 'blank', reason: 'The capture was empty.' };
  }

  let min = 255;
  let max = 0;
  let total = 0;
  let samples = 0;

  // Step in whole pixels (4 bytes), spaced by a stride that is coprime with
  // common frame widths so samples do not land on one repeating column.
  for (let i = 0; i < pixels.length; i += 4 * SAMPLE_STRIDE) {
    // Rec. 601 luma, which is close enough for "is anything visible".
    const luma = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    if (luma < min) min = luma;
    if (luma > max) max = luma;
    total += luma;
    samples += 1;
  }

  if (samples === 0) {
    return { verdict: 'blank', reason: 'The capture was empty.' };
  }

  const mean = total / samples;
  const spread = max - min;

  if (mean < DARK_LUMINANCE && spread < FLAT_SPREAD) {
    return {
      verdict: 'protected',
      reason:
        'The player returned a black frame. This video is DRM-protected, so frames cannot be captured from it.',
    };
  }

  if (spread < FLAT_SPREAD) {
    return {
      verdict: 'blank',
      reason: 'The frame was still loading. Try again once the video is playing.',
    };
  }

  return { verdict: 'ok' };
}

/**
 * Index of the cue a frame belongs beside.
 *
 * A frame is captured at a moment; the transcript is a list of moments. The
 * frame belongs with the last cue that had already started, which is the line
 * being spoken as the frame was shown — not the nearest cue by absolute
 * distance, which would attach a frame to a line not yet reached.
 *
 * Returns -1 when the frame precedes every cue, so a caller can place it
 * before the transcript rather than inventing a position.
 */
export function cueIndexForTime(
  cues: { startSeconds: number | null }[],
  seconds: number,
): number {
  let index = -1;
  for (let i = 0; i < cues.length; i += 1) {
    const start = cues[i].startSeconds;
    if (start === null) continue;
    if (start <= seconds) index = i;
    else break;
  }
  return index;
}

/**
 * Stable, sortable filename for a captured frame.
 *
 * Zero-padded seconds keep files in chronological order in any file browser,
 * which is how they will actually be looked at.
 */
export function frameFilename(seconds: number, extension = 'png'): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
  const hh = String(Math.floor(safe / 3600)).padStart(2, '0');
  const mm = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `frame-${hh}${mm}${ss}.${extension}`;
}

/** A frame as it is stored and exported. */
export interface CapturedFrame {
  /** Lecture this frame belongs to, matching the collection's lecture id. */
  lectureId: string;
  /** Position in the video, in seconds. */
  seconds: number;
  /** PNG bytes as a data URL. */
  dataUrl: string;
  capturedAt: number;
  /**
   * Text read off the frame by the on-device model.
   *
   * `undefined` means not read yet; an empty string means read and found
   * nothing legible. The distinction keeps a blank slide from being retried
   * forever.
   */
  readout?: string;
}

/** A `**[mm:ss]**` or `**[h:mm:ss]**` paragraph marker, as the exports write it. */
const TIMESTAMP_MARKER = /^\*\*\[(?:(\d+):)?(\d{1,2}):(\d{2})\]\*\*/;

/** A `## 3. Lecture title` section heading in a course export. */
const SECTION_HEADING = /^##\s+(\d+)\.\s/;

/** Seconds for a marked paragraph, or null when the line carries no marker. */
function markerSeconds(line: string): number | null {
  const match = TIMESTAMP_MARKER.exec(line);
  if (!match) return null;
  const hours = match[1] ? Number(match[1]) : 0;
  return hours * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

export interface FrameExportPlan {
  /** The document with image references threaded in. */
  markdown: string;
  /** Archive paths, matching the references in `markdown` exactly. */
  files: { path: string; frame: CapturedFrame }[];
}

export interface FrameExportOptions {
  imageDir?: string;
  /**
   * Lectures in export order, when the document covers a whole course.
   *
   * Required for a course export rather than merely helpful: timestamps
   * restart at zero in every video, so a `**[00:12]**` marker appears in every
   * section. Anchoring on the timestamp alone would scatter one lecture's
   * screenshots across the whole document.
   */
  lectures?: { id: string }[];
  /**
   * Whether to write image references (default true).
   *
   * Set false for a destination that cannot carry files — the clipboard, or a
   * paste into a chat window. The transcribed text still goes in, because that
   * is the part those destinations can actually use; a link to
   * `images/frame-000006.png` in a pasted document points at nothing.
   */
  includeImages?: boolean;
}

/**
 * Thread captured frames into a formatted document, and say where the image
 * files have to go.
 *
 * Returning both halves from one function is deliberate. The references inside
 * the document and the paths inside the archive must agree exactly, and
 * computing them in two places is precisely what produced broken images the
 * first time.
 *
 * Each frame lands after the last paragraph that had already started when it
 * was captured — beside the sentence explaining what is on screen.
 *
 * A document with no timestamps at all (they can be switched off) gets its
 * frames appended under a heading instead, because there is nothing to anchor
 * them to and dropping them silently would lose work the user deliberately did.
 */
export function planFrameExport(
  markdown: string,
  frames: CapturedFrame[],
  options: FrameExportOptions = {},
): FrameExportPlan {
  const imageDir = options.imageDir ?? 'images';
  const withImages = options.includeImages !== false;
  if (frames.length === 0) return { markdown, files: [] };

  const { lectures } = options;
  const scoped = (lectures?.length ?? 0) > 0;
  const orderOf = new Map((lectures ?? []).map((lecture, index) => [lecture.id, index]));

  // One folder per lecture only when there are several: two lectures can both
  // hold a frame at 00:12, and a flat folder would have them overwrite.
  const perLectureFolders = (lectures?.length ?? 0) > 1;

  const lines = markdown.split('\n');
  const anyMarker = lines.some((line) => markerSeconds(line) !== null);

  // Which lecture each line sits under, so a frame is only ever anchored
  // inside its own section. Null throughout for a single-lecture document.
  const lineLecture: (number | null)[] = new Array(lines.length).fill(null);
  if (scoped) {
    let current: number | null = null;
    lines.forEach((line, index) => {
      const heading = SECTION_HEADING.exec(line);
      if (heading) {
        const order = Number(heading[1]) - 1;
        current = order >= 0 && order < (lectures as { id: string }[]).length ? order : null;
      }
      lineLecture[index] = current;
    });
  }

  const pathFor = (frame: CapturedFrame, order: number | null): string =>
    perLectureFolders && order !== null
      ? `${imageDir}/lecture-${String(order + 1).padStart(2, '0')}/${frameFilename(frame.seconds)}`
      : `${imageDir}/${frameFilename(frame.seconds)}`;

  interface Placed {
    frame: CapturedFrame;
    path: string;
  }

  const files: Placed[] = [];
  const anchors = new Map<number, Placed[]>();

  for (const frame of [...frames].sort((a, b) => a.seconds - b.seconds)) {
    const known = orderOf.has(frame.lectureId);
    const order = known ? (orderOf.get(frame.lectureId) as number) : null;

    // A frame from a lecture this export does not cover has nowhere to go;
    // including it would reference a section that is not in the document.
    if (scoped && !known) continue;

    const placed: Placed = { frame, path: pathFor(frame, order) };
    files.push(placed);

    let anchor = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (order !== null && lineLecture[i] !== order) continue;
      const seconds = markerSeconds(lines[i]);
      if (seconds === null) continue;
      if (seconds <= frame.seconds) anchor = i;
      else break;
    }

    const bucket = anchors.get(anchor);
    if (bucket) bucket.push(placed);
    else anchors.set(anchor, [placed]);
  }

  /**
   * The image, plus whatever the on-device model read off it.
   *
   * The transcription is the point of reading a frame at all: an image is
   * opaque to search and to any model this document is later pasted into,
   * where the same content as text is not. It goes in a fence so indentation
   * survives, and under a plain label so a reader can tell transcribed pixels
   * from what the lecturer said.
   */
  const reference = (entry: Placed): string | null => {
    const stamp = formatClock(entry.frame.seconds);
    const readout = entry.frame.readout?.trim();

    if (!withImages) {
      // Nothing to say about a frame that has neither an image nor text.
      return readout ? `*On screen at ${stamp}:*\n\n\`\`\`\n${readout}\n\`\`\`` : null;
    }

    const image = `![Frame at ${stamp}](${entry.path})`;
    if (!readout) return image;
    return `${image}\n\n*On screen:*\n\n\`\`\`\n${readout}\n\`\`\``;
  };

  // Without images there is nothing to put in an archive, whatever was read.
  const archived = withImages ? files : [];

  if (!anyMarker) {
    const appended = [...anchors.values()]
      .flat()
      .map(reference)
      .filter((block): block is string => block !== null);

    if (appended.length === 0) return { markdown, files: archived };

    return {
      markdown: `${markdown.trimEnd()}\n\n## Screenshots\n\n${appended.join('\n\n')}\n`,
      files: archived,
    };
  }

  const out: string[] = [];

  // Frames from before the first marked paragraph still belong in the file.
  for (const entry of anchors.get(-1) ?? []) {
    const block = reference(entry);
    if (block !== null) out.push(block, '');
  }

  lines.forEach((line, index) => {
    out.push(line);
    for (const entry of anchors.get(index) ?? []) {
      const block = reference(entry);
      if (block !== null) out.push('', block);
    }
  });

  return { markdown: out.join('\n'), files: archived };
}

/** `mm:ss`, or `h:mm:ss` past an hour. Local to this module's alt text. */
function formatClock(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
