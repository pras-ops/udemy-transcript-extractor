/**
 * WebVTT and SubRip (SRT) parsing and serialising.
 *
 * These are the two formats essentially every HTML5 player uses, so being able
 * to read them is what lets one generic extractor cover platforms we have
 * never seen. Being able to write them is what lets the output drop into
 * video editors, subtitle tools and note apps.
 *
 * Pure functions, no DOM — the parsing rules are the part worth testing.
 */

import type { Cue } from './transcript';

/** A cue with an end time. Richer than `Cue`, which only carries a start. */
export interface TimedCue {
  startSeconds: number;
  endSeconds: number | null;
  text: string;
}

/** A cue whose end time is known — what serialising to VTT/SRT requires. */
export interface ResolvedCue extends TimedCue {
  endSeconds: number;
}

/* -------------------------------------------------------------------------- */
/* Timestamps                                                                  */
/* -------------------------------------------------------------------------- */

// HH:MM:SS.mmm / MM:SS.mmm (WebVTT) and the comma variant SubRip uses.
const CUE_TIME = /(\d{1,3}):(\d{2})(?::(\d{2}))?[.,](\d{1,3})/;
const CUE_RANGE = new RegExp(`${CUE_TIME.source}\\s*-->\\s*${CUE_TIME.source}`);

function toSeconds(a: string, b: string, c: string | undefined, ms: string): number {
  // With three groups it is H:M:S; with two it is M:S — WebVTT allows both.
  const [h, m, s] = c !== undefined ? [Number(a), Number(b), Number(c)] : [0, Number(a), Number(b)];
  return h * 3600 + m * 60 + s + Number(ms.padEnd(3, '0')) / 1000;
}

/** Format seconds as `HH:MM:SS.mmm` (WebVTT) or `HH:MM:SS,mmm` (SubRip). */
export function formatCueTime(totalSeconds: number, separator: '.' | ',' = '.'): string {
  const clamped = Math.max(0, totalSeconds);
  const whole = Math.floor(clamped);
  const ms = Math.round((clamped - whole) * 1000);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(ms, 3)}`;
}

/* -------------------------------------------------------------------------- */
/* Cue text cleanup                                                            */
/* -------------------------------------------------------------------------- */

// WebVTT markup: voice spans (<v Speaker>), classes (<c.loud>), styling, and
// the timestamp tags used for karaoke-style word highlighting.
const VTT_TAG = /<\/?[^>]+>/g;
const HTML_ENTITY: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * Strip cue markup down to readable text.
 *
 * A `<v Speaker>` voice span is the one tag carrying information a reader
 * wants, so the speaker name is kept as a `Speaker:` prefix rather than thrown
 * away with the rest of the markup.
 */
export function cleanCueText(raw: string): string {
  let text = raw;

  const voice = /^\s*<v(?:\.[^\s>]+)*\s+([^>]+)>/.exec(text);
  const speaker = voice ? voice[1].trim() : null;

  text = text.replace(VTT_TAG, '');
  text = text.replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITY[entity.toLowerCase()] ?? entity);
  text = text.replace(/\s+/g, ' ').trim();

  if (speaker && text && !text.toLowerCase().startsWith(speaker.toLowerCase())) {
    return `${speaker}: ${text}`;
  }
  return text;
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Parse WebVTT or SubRip into cues.
 *
 * One parser handles both: the formats differ only in a header, the cue-id
 * convention and `.` vs `,` before milliseconds, and being permissive about
 * all three costs nothing while covering players that emit slight variants.
 */
export function parseCaptionFile(source: string): TimedCue[] {
  if (!source || !source.trim()) return [];

  const normalised = source.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  const cues: TimedCue[] = [];

  for (const block of normalised.split(/\n{2,}/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // WebVTT header and metadata blocks carry no cue text.
    if (/^WEBVTT/.test(trimmed)) continue;
    if (/^(NOTE|STYLE|REGION)\b/.test(trimmed)) continue;

    const lines = trimmed.split('\n');
    const timingIndex = lines.findIndex((line) => CUE_RANGE.test(line));
    if (timingIndex === -1) continue;

    const match = CUE_RANGE.exec(lines[timingIndex]);
    if (!match) continue;

    const startSeconds = toSeconds(match[1], match[2], match[3], match[4]);
    const endSeconds = toSeconds(match[5], match[6], match[7], match[8]);

    const text = cleanCueText(lines.slice(timingIndex + 1).join('\n'));
    if (!text) continue;

    cues.push({
      startSeconds,
      endSeconds: endSeconds > startSeconds ? endSeconds : null,
      text,
    });
  }

  return dedupeRolling(cues);
}

/**
 * Drop the duplicate cues rolling-caption players emit.
 *
 * Live and auto-generated tracks frequently repeat the previous line with more
 * words appended; keeping only the longest form of each run preserves the text
 * without the stutter.
 */
function dedupeRolling(cues: TimedCue[]): TimedCue[] {
  const out: TimedCue[] = [];
  for (const cue of cues) {
    const prev = out[out.length - 1];
    if (prev) {
      const a = prev.text.toLowerCase();
      const b = cue.text.toLowerCase();
      if (a === b) {
        prev.endSeconds = cue.endSeconds ?? prev.endSeconds;
        continue;
      }
      if (b.startsWith(a + ' ')) {
        prev.text = cue.text;
        prev.endSeconds = cue.endSeconds ?? prev.endSeconds;
        continue;
      }
    }
    out.push({ ...cue });
  }
  return out;
}

/** Detect whether a payload looks like a caption file we can parse. */
export function looksLikeCaptionFile(source: string): boolean {
  if (!source) return false;
  const head = source.slice(0, 2000);
  return /^\uFEFF?WEBVTT/.test(head.trim()) || CUE_RANGE.test(head);
}

/* -------------------------------------------------------------------------- */
/* Serialising                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Give every cue an end time.
 *
 * Sources that only report start times (DOM-scraped transcript panels) still
 * need ends to produce a valid subtitle file, so a cue runs until the next one
 * begins, and the last cue gets a modest fixed tail.
 */
export function withEndTimes(cues: TimedCue[], trailingSeconds = 4): ResolvedCue[] {
  return cues.map((cue, i) => {
    if (cue.endSeconds !== null && cue.endSeconds > cue.startSeconds) {
      return { ...cue, endSeconds: cue.endSeconds };
    }
    const next = cues[i + 1];
    const end = next ? next.startSeconds : cue.startSeconds + trailingSeconds;
    return { ...cue, endSeconds: Math.max(end, cue.startSeconds + 0.5) };
  });
}

/** Serialise to WebVTT. */
export function toWebVTT(cues: TimedCue[]): string {
  const timed = withEndTimes(cues);
  const blocks = timed.map(
    (cue, i) =>
      `${i + 1}\n${formatCueTime(cue.startSeconds, '.')} --> ${formatCueTime(cue.endSeconds, '.')}\n${cue.text}`,
  );
  return `WEBVTT\n\n${blocks.join('\n\n')}\n`;
}

/** Serialise to SubRip (SRT). */
export function toSRT(cues: TimedCue[]): string {
  const timed = withEndTimes(cues);
  const blocks = timed.map(
    (cue, i) =>
      `${i + 1}\n${formatCueTime(cue.startSeconds, ',')} --> ${formatCueTime(cue.endSeconds, ',')}\n${cue.text}`,
  );
  return `${blocks.join('\n\n')}\n`;
}

/* -------------------------------------------------------------------------- */
/* Interop with the rest of the pipeline                                       */
/* -------------------------------------------------------------------------- */

/** Render cues in the `[MM:SS] text` form the extractors and parser share. */
export function toBracketTranscript(cues: TimedCue[]): string {
  return cues
    .map((cue) => {
      const s = Math.floor(cue.startSeconds);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
      return `[${stamp}] ${cue.text}`;
    })
    .join('\n\n');
}

/** Narrow timed cues to the pipeline's `Cue` shape. */
export function toCues(cues: TimedCue[]): Cue[] {
  return cues.map((cue) => ({ startSeconds: cue.startSeconds, text: cue.text }));
}
