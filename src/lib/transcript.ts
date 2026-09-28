/**
 * Transcript parsing, cleanup and chunking.
 *
 * This module is deliberately pure (no DOM, no chrome.*) so the behaviour that
 * actually determines export quality is unit-testable, independent of whether
 * any given site's selectors still work.
 *
 * The chunking defaults are set from published retrieval evaluations rather
 * than intuition — see `DEFAULT_CHUNK_OPTIONS` for the rationale.
 */

import { fixTechnicalTerms } from './tech-terms';

export interface Cue {
  /** Seconds from video start, or null when the source line carried no timestamp. */
  startSeconds: number | null;
  /** Cue text, whitespace-normalised, never empty. */
  text: string;
}

export interface Chunk {
  id: string;
  /** Text as it should be embedded: contextual header + body. */
  content: string;
  /** Body only, without the contextual header. */
  body: string;
  startSeconds: number | null;
  endSeconds: number | null;
  /** Human-readable range, e.g. "02:14 - 03:05". */
  timeRange: string | null;
  /** Deep link back into the source video at `startSeconds`, when derivable. */
  url: string | null;
  wordCount: number;
  estimatedTokens: number;
  chunkIndex: number;
}

export interface SourceMeta {
  title?: string;
  platform?: 'udemy' | 'youtube' | 'coursera' | 'generic' | 'unknown';
  /** Canonical page URL, used to build per-chunk deep links. */
  url?: string;
  courseTitle?: string;
  instructor?: string;
}

/* -------------------------------------------------------------------------- */
/* Timestamps                                                                  */
/* -------------------------------------------------------------------------- */

const TIMESTAMP_LINE = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([\s\S]*)$/;

/** Parse "MM:SS" or "HH:MM:SS" to seconds. Returns null if not a timestamp. */
export function parseTimestamp(value: string): number | null {
  const parts = value.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const [h, m, s] = parts.length === 3 ? nums : [0, nums[0], nums[1]];
  if (m > 59 || s > 59) return null;
  return h * 3600 + m * 60 + s;
}

/** Format seconds as MM:SS, or HH:MM:SS past an hour. */
export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Parse the `[MM:SS] text` form emitted by every extractor into cues.
 *
 * Lines without a leading timestamp are kept with `startSeconds: null` rather
 * than dropped, so transcripts from sources that expose no timing still work.
 */
export function parseTranscript(raw: string): Cue[] {
  if (!raw) return [];
  const cues: Cue[] = [];

  for (const block of raw.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const match = TIMESTAMP_LINE.exec(trimmed);
    if (match) {
      const seconds = parseTimestamp(match[1]);
      const text = normalizeWhitespace(match[2]);
      // A bracketed value that parses as a time is a timestamp; anything else
      // (e.g. "[MUSIC]") stays part of the text.
      if (seconds !== null) {
        if (text) cues.push({ startSeconds: seconds, text });
        continue;
      }
    }

    const text = normalizeWhitespace(trimmed);
    if (text) cues.push({ startSeconds: null, text });
  }

  return cues;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/* -------------------------------------------------------------------------- */
/* Estimated timings                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Give untimed cues approximate timestamps from the video's duration.
 *
 * Some players — Udemy's among them — render transcript text with no times in
 * the DOM and expose no native text tracks, so there is genuinely nothing to
 * read. Without timings every downstream feature degrades: no jump links, no
 * chapters, no flashcard sources.
 *
 * Cues are spread across the duration in proportion to their length rather than
 * evenly, since speech takes time roughly in proportion to how much of it there
 * is. The result is an estimate and callers should say so — it is accurate
 * enough to land you in the right part of a lecture, not on the exact word.
 *
 * Cues that already carry a real timestamp are left untouched.
 */
export function estimateCueTimings(cues: Cue[], durationSeconds: number): Cue[] {
  if (cues.length === 0) return cues;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return cues;
  // Only estimate when there is nothing real to preserve.
  if (cues.some((cue) => cue.startSeconds !== null)) return cues;

  const lengths = cues.map((cue) => Math.max(1, cue.text.length));
  const total = lengths.reduce((sum, n) => sum + n, 0);

  let elapsed = 0;
  return cues.map((cue, i) => {
    const startSeconds = Math.floor((elapsed / total) * durationSeconds);
    elapsed += lengths[i];
    return { startSeconds, text: cue.text };
  });
}

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                     */
/* -------------------------------------------------------------------------- */

export interface CleanOptions {
  /** Drop bracketed non-speech markers such as [Music] / [Applause]. */
  removeSoundTags?: boolean;
  /**
   * Remove filler words ("um", "uh", ...).
   *
   * Instruction-tuned LLMs measurably degrade on verbatim ASR disfluencies, so
   * this is on by default for downstream-consumption formats.
   */
  removeFillers?: boolean;
  /** Collapse the repeated lines YouTube's rolling caption view produces. */
  dedupeRepeats?: boolean;
  /**
   * Repair the technical vocabulary speech recognition mangles ("Jupiter
   * notebook" -> "Jupyter Notebook").
   *
   * On by default: on the courses this extension is used for, the mangled
   * words are the subject of the lecture and the terms a reader will search
   * for later. See `tech-terms.ts` for why only unambiguous phrases are in the
   * table.
   */
  fixTechnicalTerms?: boolean;
}

export const DEFAULT_CLEAN_OPTIONS: Required<CleanOptions> = {
  removeSoundTags: true,
  removeFillers: true,
  dedupeRepeats: true,
  fixTechnicalTerms: true,
};

const SOUND_TAG = /\[[^\]]{0,40}\]|\([^)]{0,40}\)/g;
const SOUND_TAG_WORDS =
  /^(music|applause|laughter|silence|inaudible|crosstalk|blank_audio|sound effect|background noise|foreign)$/i;

// Standalone fillers only. Bounded on both sides so "I'm" / "Umbrella" /
// "Like this" as a real verb are untouched.
const FILLER =
  /(?:^|(?<=[\s,]))(?:um+|uh+|erm+|ah+|eh+|hmm+|mm+hmm|mhm|er)(?=[\s,.!?]|$)/gi;

/**
 * Clean cues for downstream consumption.
 *
 * Cues that become empty are dropped. Timestamps are preserved, so cleanup
 * never costs the ability to cite back into the video.
 */
export function cleanCues(cues: Cue[], options: CleanOptions = {}): Cue[] {
  const opts = { ...DEFAULT_CLEAN_OPTIONS, ...options };
  const out: Cue[] = [];

  for (const cue of cues) {
    let text = cue.text;

    if (opts.removeSoundTags) {
      text = text.replace(SOUND_TAG, (match) => {
        const inner = match.slice(1, -1).trim();
        return SOUND_TAG_WORDS.test(inner) ? '' : match;
      });
    }

    if (opts.removeFillers) {
      text = text.replace(FILLER, '');
      // Tidy the punctuation the removal can strand.
      text = text.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/^\s*,\s*/, '');
    }

    // After filler removal, so the table sees the words as they will be read,
    // and before deduping, so two cues that differ only in how the recogniser
    // spelled a term collapse into one.
    if (opts.fixTechnicalTerms) text = fixTechnicalTerms(text);

    text = normalizeWhitespace(text);
    if (!text || !/[\p{L}\p{N}]/u.test(text)) continue;

    if (opts.dedupeRepeats && out.length > 0) {
      const prev = out[out.length - 1];
      if (prev.text.toLowerCase() === text.toLowerCase()) continue;
      // YouTube's rolling captions re-emit the previous line with more words
      // appended; keep the longer superset and drop the prefix.
      if (text.toLowerCase().startsWith(prev.text.toLowerCase() + ' ')) {
        out[out.length - 1] = { startSeconds: prev.startSeconds, text };
        continue;
      }
    }

    out.push({ startSeconds: cue.startSeconds, text });
  }

  return out;
}

/**
 * Merge caption cues into readable paragraphs.
 *
 * Caption cues are ~2 seconds of speech each; rendering one per line is
 * unreadable. A new paragraph starts on a sentence end once the current one
 * has enough substance, so prose keeps its shape.
 *
 * Lives here rather than beside the exporters because organising a transcript
 * and exporting one both need it, and it depends on nothing but cues.
 */
export function groupIntoParagraphs(
  cues: Cue[],
  minWords = 60,
): { startSeconds: number | null; text: string }[] {
  const paragraphs: { startSeconds: number | null; text: string }[] = [];
  let buffer: Cue[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const timed = buffer.find((c) => c.startSeconds !== null);
    paragraphs.push({
      startSeconds: timed ? timed.startSeconds : null,
      text: buffer.map((c) => c.text).join(' '),
    });
    buffer = [];
  };

  for (const cue of cues) {
    buffer.push(cue);
    const words = buffer.reduce((n, c) => n + c.text.split(/\s+/).length, 0);
    if (words >= minWords && /[.!?]["')\]]?$/.test(cue.text)) flush();
  }
  flush();
  return paragraphs;
}

/**
 * One unit of reading: a paragraph of prose, or a single caption cue.
 *
 * `endSeconds` is where the next block starts. It is what lets a note, a
 * highlight or a captured frame find the block it belongs under — they are all
 * filed against the exact second they were made at, which lined up one-to-one
 * with a cue but falls somewhere inside a paragraph.
 */
export interface Block {
  startSeconds: number | null;
  endSeconds: number | null;
  text: string;
}

export type ReadingMode = 'paragraphs' | 'lines';

/**
 * The transcript as it is read, with each block's stretch of the lecture.
 *
 * Shared by the dashboard's reader and the study-notes export on purpose: an
 * export that placed someone's notes differently from the page they wrote them
 * on would be quietly wrong in a way nobody would think to check.
 */
export function readingBlocks(cues: Cue[], mode: ReadingMode = 'paragraphs'): Block[] {
  const units: { startSeconds: number | null; text: string }[] =
    mode === 'paragraphs'
      ? groupIntoParagraphs(cues)
      : cues.map((cue) => ({ startSeconds: cue.startSeconds, text: cue.text }));

  return units.map((unit, index) => ({
    ...unit,
    endSeconds: units[index + 1]?.startSeconds ?? null,
  }));
}

/**
 * The items anchored inside a block's stretch of the lecture.
 *
 * Half-open on purpose: an item landing exactly on the next block's start
 * belongs to that block, so nothing is reported twice.
 */
export function anchoredIn<T>(
  items: T[],
  at: (item: T) => number | undefined,
  block: Block,
): T[] {
  if (block.startSeconds === null) return [];
  const from = block.startSeconds;
  const to = block.endSeconds ?? Number.MAX_SAFE_INTEGER;

  return items.filter((item) => {
    const seconds = at(item);
    return seconds !== undefined && seconds >= from && seconds < to;
  });
}

/**
 * The moment a passage of the transcript begins.
 *
 * Needed because a reader selects text, not a timestamp. Where the transcript is
 * rendered one cue per line the enclosing element carries the moment exactly,
 * but a paragraph is a minute of speech — reading the moment off it would anchor
 * a highlight up to a minute before the sentence that was marked, and a
 * timestamp that lands early defeats the point of being able to jump back.
 *
 * So the passage's opening words are matched against the cues. Shorter and
 * shorter openings are tried because a selection can begin mid-cue, in which
 * case its first few words straddle two cues and no single cue holds all of
 * them. Very short openings are refused outright: two common words match
 * somewhere in almost any lecture, and a confidently wrong moment is worse than
 * falling back to the paragraph's own start.
 *
 * `notBefore` is that paragraph start. A phrase a lecturer repeats would
 * otherwise anchor to the first time they said it rather than the passage in
 * front of the reader.
 */
export function momentOfPassage(
  cues: Cue[],
  passage: string,
  notBefore: number | null = null,
): number | undefined {
  const words = passage.split(/\s+/).filter(Boolean);

  for (let take = Math.min(6, words.length); take >= 2; take -= 1) {
    const opening = words.slice(0, take).join(' ').toLowerCase();
    if (opening.length < 8) break;

    for (const cue of cues) {
      if (cue.startSeconds === null) continue;
      if (notBefore !== null && cue.startSeconds < notBefore) continue;
      if (cue.text.toLowerCase().includes(opening)) return cue.startSeconds;
    }
  }

  return undefined;
}

/**
 * Put scraped cues back into the order they were spoken.
 *
 * A virtualised transcript panel only keeps the lines near the scroll offset in
 * the DOM, so cues are gathered by scrolling and arrive in whatever order the
 * harvest saw them. That order is trustworthy only if the scroll started at the
 * top — and with the player's autoscroll following playback, it usually does
 * not. The symptom is a transcript whose paragraphs are subtly out of sequence,
 * differently each time, which is far worse than an obvious failure.
 *
 * Untimed cues inherit the timestamp of the cue before them rather than being
 * dropped or forcing the whole transcript back to harvest order. The sort is
 * stable, so cues sharing a timestamp keep their relative order, and cues
 * appearing before any timestamp stay at the front.
 */
export function orderCollectedCues<T extends { seconds: number | null }>(cues: T[]): T[] {
  if (cues.length === 0) return cues;

  let carried: number | null = null;
  const anchored = cues.map((cue, index) => {
    if (cue.seconds !== null) carried = cue.seconds;
    return { cue, index, at: cue.seconds ?? carried };
  });

  // Nothing to order by; harvest order is all there is.
  if (anchored.every((entry) => entry.at === null)) return cues;

  return anchored
    .slice()
    .sort((a, b) => {
      // A cue preceding every timestamp belongs at the front.
      if (a.at === null && b.at === null) return a.index - b.index;
      if (a.at === null) return -1;
      if (b.at === null) return 1;
      return a.at - b.at || a.index - b.index;
    })
    .map((entry) => entry.cue);
}

/* -------------------------------------------------------------------------- */
/* Chunking                                                                    */
/* -------------------------------------------------------------------------- */

export interface ChunkOptions {
  /** Target chunk size in estimated tokens. */
  targetTokens?: number;
  /** Hard ceiling; a chunk is closed once it would exceed this. */
  maxTokens?: number;
  /** Tokens of trailing context repeated at the head of the next chunk. */
  overlapTokens?: number;
  /** Prefer closing a chunk on a sentence boundary near the target. */
  respectSentences?: boolean;
}

/**
 * Defaults chosen from retrieval evaluations, not intuition.
 *
 * ~512 tokens: fixed-size recursive splitting at this scale has repeatedly
 * outperformed embedding-similarity ("semantic") splitting in independent
 * benchmarks. The common failure of semantic splitters is emitting ~40-token
 * fragments that retrieve cleanly but carry too little context for the model
 * to answer from. The previous implementation here targeted 55 *words*
 * (~70 tokens), squarely in that failure mode.
 *
 * ~64 tokens of overlap (12.5%) keeps a claim that straddles a boundary
 * retrievable from either side.
 */
export const DEFAULT_CHUNK_OPTIONS: Required<ChunkOptions> = {
  targetTokens: 512,
  maxTokens: 640,
  overlapTokens: 64,
  respectSentences: true,
};

/**
 * Approximate token count without shipping a tokenizer.
 *
 * English prose runs about 0.75 words per token; punctuation and numerals push
 * it up. Deliberately a slight over-estimate, so chunks land under a model's
 * real limit rather than over it.
 */
export function estimateTokens(text: string): number {
  if (!text.trim()) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.35);
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const SENTENCE_END = /[.!?]["')\]]?$/;

/**
 * Group cues into retrieval-sized chunks with overlap, preserving the time
 * range each chunk covers.
 */
export function chunkCues(cues: Cue[], options: ChunkOptions = {}): Omit<Chunk, 'content' | 'id'>[] {
  const opts = { ...DEFAULT_CHUNK_OPTIONS, ...options };
  if (cues.length === 0) return [];

  const chunks: Omit<Chunk, 'content' | 'id'>[] = [];
  let current: Cue[] = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length === 0) return;
    const body = current.map((c) => c.text).join(' ');
    const timed = current.filter((c) => c.startSeconds !== null);
    const startSeconds = timed.length > 0 ? timed[0].startSeconds : null;
    // End of a chunk is the start of its last cue: we have no duration data,
    // so claiming anything later would be invented.
    const endSeconds = timed.length > 0 ? timed[timed.length - 1].startSeconds : null;

    chunks.push({
      body,
      startSeconds,
      endSeconds,
      timeRange:
        startSeconds !== null && endSeconds !== null
          ? `${formatTimestamp(startSeconds)} - ${formatTimestamp(endSeconds)}`
          : null,
      url: null,
      wordCount: countWords(body),
      estimatedTokens: estimateTokens(body),
      chunkIndex: chunks.length,
    });

    // Carry the tail forward as overlap for the next chunk.
    if (opts.overlapTokens > 0) {
      const carried: Cue[] = [];
      let carriedTokens = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const t = estimateTokens(current[i].text);
        if (carriedTokens + t > opts.overlapTokens) break;
        carried.unshift(current[i]);
        carriedTokens += t;
      }
      // Never carry the whole chunk — that would not make progress.
      current = carried.length < current.length ? carried : [];
      currentTokens = current.reduce((sum, c) => sum + estimateTokens(c.text), 0);
    } else {
      current = [];
      currentTokens = 0;
    }
  };

  for (const cue of cues) {
    const cueTokens = estimateTokens(cue.text);

    if (current.length > 0 && currentTokens + cueTokens > opts.maxTokens) {
      flush();
    }

    current.push(cue);
    currentTokens += cueTokens;

    if (currentTokens >= opts.targetTokens) {
      // Close on a sentence boundary when we're already at target and the cue
      // ends one; otherwise keep going until maxTokens forces the split.
      if (!opts.respectSentences || SENTENCE_END.test(cue.text)) {
        flush();
      }
    }
  }

  // Final flush, without producing an overlap-only tail chunk.
  if (current.length > 0) {
    const body = current.map((c) => c.text).join(' ');
    const isOverlapOnly =
      chunks.length > 0 && chunks[chunks.length - 1].body.endsWith(body);
    if (!isOverlapOnly) {
      const savedOverlap = opts.overlapTokens;
      opts.overlapTokens = 0;
      flush();
      opts.overlapTokens = savedOverlap;
    }
  }

  return chunks.map((c, i) => ({ ...c, chunkIndex: i }));
}

/* -------------------------------------------------------------------------- */
/* Deep links                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Build a URL that opens the source at a given second.
 *
 * Returns null rather than guessing when the platform has no known time-link
 * form, so a caller never emits a link that silently ignores the timestamp.
 */
export function buildDeepLink(sourceUrl: string | undefined, seconds: number | null): string | null {
  if (!sourceUrl || seconds === null) return null;

  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    url.searchParams.set('t', `${Math.floor(seconds)}s`);
    return url.toString();
  }

  if (host.endsWith('udemy.com')) {
    // Udemy's player reads a `start` query param (in seconds) on lecture URLs.
    url.searchParams.set('start', String(Math.floor(seconds)));
    return url.toString();
  }

  if (host.endsWith('coursera.org')) {
    url.searchParams.set('t', String(Math.floor(seconds)));
    return url.toString();
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Contextual headers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Situate a chunk within its document, prepended to the text that gets embedded.
 *
 * Embedding a bare chunk loses whatever the surrounding document established —
 * "it", "this method", "the second approach" have no referent on their own.
 * Prepending a short situating line to the chunk *before* embedding is the
 * cheap, well-replicated fix (Anthropic report up to a 49% reduction in
 * retrieval failures from contextual embeddings + contextual BM25).
 *
 * We build the header from metadata we already hold, so it costs no LLM call.
 */
export function buildContextHeader(meta: SourceMeta, chunk: { timeRange: string | null }): string {
  const parts: string[] = [];
  if (meta.courseTitle && meta.courseTitle !== meta.title) parts.push(meta.courseTitle);
  if (meta.title) parts.push(meta.title);
  const subject = parts.join(' — ');

  const where = chunk.timeRange ? ` at ${chunk.timeRange}` : '';
  if (!subject) return `Excerpt from a video transcript${where}.`;
  return `From the video transcript "${subject}"${where}.`;
}

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                    */
/* -------------------------------------------------------------------------- */

export interface BuildChunksOptions extends ChunkOptions {
  clean?: CleanOptions;
  /** Prepend a situating header to each chunk's embedded text. Default true. */
  contextualize?: boolean;
}

/** Raw transcript text -> retrieval-ready chunks. */
export function buildChunks(
  raw: string,
  meta: SourceMeta = {},
  options: BuildChunksOptions = {},
): Chunk[] {
  const { clean, contextualize = true, ...chunkOpts } = options;
  const cues = cleanCues(parseTranscript(raw), clean);
  const base = chunkCues(cues, chunkOpts);

  return base.map((c, index) => {
    const url = buildDeepLink(meta.url, c.startSeconds);
    const header = contextualize ? buildContextHeader(meta, c) : '';
    const content = header ? `${header}\n\n${c.body}` : c.body;
    return {
      ...c,
      id: `chunk_${String(index + 1).padStart(4, '0')}`,
      chunkIndex: index,
      url,
      content,
      estimatedTokens: estimateTokens(content),
    };
  });
}
