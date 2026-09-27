/**
 * Topic segmentation — where does the lecture change subject?
 *
 * An embedding-based TextTiling. The original algorithm compares word-frequency
 * vectors across a sliding gap and looks for dips in similarity; swapping those
 * for sentence embeddings is the standard modern variant, and it is what makes
 * this work on speech, where the same idea gets restated in different words.
 *
 * The output is chapter boundaries for a video that has none. It also gives the
 * retrieval export topic-aligned chunks instead of cuts at arbitrary token
 * counts — the same benefit slide-transition detection provides, without
 * needing to look at the video.
 *
 * Pure functions over vectors: no model, no DOM, no network.
 */

import { dot, normalize } from './semantic-search';

export interface SegmentOptions {
  /** Blocks averaged either side of a gap when measuring similarity. */
  windowSize?: number;
  /** Passes of 3-point smoothing applied to the similarity curve. */
  smoothing?: number;
  /** Never place two boundaries closer together than this. */
  minBlocksPerSegment?: number;
  /**
   * How far above average a dip must be to count, in standard deviations.
   * Higher is more conservative — fewer, more confident chapters.
   */
  sensitivity?: number;
  /** Upper bound on chapters, so a rambling lecture cannot explode. */
  maxSegments?: number;
  /**
   * Absolute floor on how deep a dip must be, regardless of the rest.
   *
   * Without this the threshold is purely relative, so a lecture that never
   * changes subject still yields "boundaries" — whatever noise happens to sit
   * above the mean. A real topic change drops similarity by a visible amount;
   * jitter does not.
   */
  minDepth?: number;
}

export const DEFAULT_SEGMENT_OPTIONS: Required<SegmentOptions> = {
  windowSize: 3,
  smoothing: 1,
  minBlocksPerSegment: 4,
  sensitivity: 0.4,
  maxSegments: 12,
  minDepth: 0.05,
};

/** Mean of a set of vectors, renormalised so comparisons stay cosine-like. */
function meanVector(vectors: Float32Array[], from: number, to: number): Float32Array {
  const dims = vectors[0].length;
  const out = new Float32Array(dims);
  let count = 0;

  for (let i = Math.max(0, from); i < Math.min(vectors.length, to); i++) {
    const v = vectors[i];
    for (let d = 0; d < dims; d++) out[d] += v[d];
    count++;
  }
  if (count === 0) return out;
  for (let d = 0; d < dims; d++) out[d] /= count;
  return normalize(out);
}

/**
 * Similarity across each gap between consecutive blocks.
 *
 * `scores[i]` compares the window ending at block `i` with the window starting
 * at block `i + 1`. A low value means the subject changed there.
 */
export function gapSimilarities(vectors: Float32Array[], windowSize: number): number[] {
  const scores: number[] = [];
  for (let i = 0; i < vectors.length - 1; i++) {
    const left = meanVector(vectors, i - windowSize + 1, i + 1);
    const right = meanVector(vectors, i + 1, i + 1 + windowSize);
    scores.push(dot(left, right));
  }
  return scores;
}

/** Three-point moving average; speech is noisy and raw dips are unreliable. */
export function smooth(values: number[], passes: number): number[] {
  let current = [...values];
  for (let pass = 0; pass < passes; pass++) {
    const next = [...current];
    for (let i = 1; i < current.length - 1; i++) {
      next[i] = (current[i - 1] + current[i] + current[i + 1]) / 3;
    }
    current = next;
  }
  return current;
}

/**
 * Depth score for each gap.
 *
 * How far the curve climbs on either side of a dip before it stops rising.
 * A deep, isolated valley scores high; a gentle downward drift scores low,
 * which is what stops a slowly evolving topic being chopped up.
 */
export function depthScores(scores: number[]): number[] {
  return scores.map((value, i) => {
    let left = value;
    for (let j = i - 1; j >= 0 && scores[j] >= left; j--) left = scores[j];

    let right = value;
    for (let j = i + 1; j < scores.length && scores[j] >= right; j++) right = scores[j];

    return left - value + (right - value);
  });
}

/**
 * Indices at which a new topic begins.
 *
 * A boundary must be a local maximum in depth, exceed the threshold, and
 * respect the minimum segment length. Requiring a local maximum matters: a
 * broad low-similarity region would otherwise produce a boundary at every
 * point inside it.
 */
export function detectBoundaries(
  vectors: Float32Array[],
  options: SegmentOptions = {},
): number[] {
  const opts = { ...DEFAULT_SEGMENT_OPTIONS, ...options };

  // Too short to segment meaningfully — one chapter is the honest answer.
  if (vectors.length < opts.minBlocksPerSegment * 2 + 1) return [];

  const scores = smooth(gapSimilarities(vectors, opts.windowSize), opts.smoothing);
  const depths = depthScores(scores);
  if (depths.length === 0) return [];

  const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
  const variance = depths.reduce((sum, d) => sum + (d - mean) ** 2, 0) / depths.length;
  // Both tests must pass: deeper than its neighbours *and* deep in absolute
  // terms. The relative test alone finds structure in pure noise.
  const threshold = Math.max(mean + opts.sensitivity * Math.sqrt(variance), opts.minDepth);

  const candidates: { index: number; depth: number }[] = [];
  for (let i = 0; i < depths.length; i++) {
    if (depths[i] < threshold) continue;
    const isPeak =
      (i === 0 || depths[i] >= depths[i - 1]) &&
      (i === depths.length - 1 || depths[i] >= depths[i + 1]);
    if (isPeak) candidates.push({ index: i + 1, depth: depths[i] });
  }

  // Strongest first, so when two boundaries are too close the better one wins.
  candidates.sort((a, b) => b.depth - a.depth);

  const chosen: number[] = [];
  for (const candidate of candidates) {
    if (chosen.length >= opts.maxSegments - 1) break;

    const tooClose = chosen.some(
      (existing) => Math.abs(existing - candidate.index) < opts.minBlocksPerSegment,
    );
    const nearEdge =
      candidate.index < opts.minBlocksPerSegment ||
      candidate.index > vectors.length - opts.minBlocksPerSegment;

    if (!tooClose && !nearEdge) chosen.push(candidate.index);
  }

  return chosen.sort((a, b) => a - b);
}

/* -------------------------------------------------------------------------- */
/* Turning boundaries into chapters                                            */
/* -------------------------------------------------------------------------- */

export interface Segment {
  index: number;
  /** Inclusive block range this segment covers. */
  startBlock: number;
  endBlock: number;
  startSeconds: number | null;
  endSeconds: number | null;
}

/** Expand boundary indices into contiguous segments over `blockCount` blocks. */
export function buildSegments(
  blockCount: number,
  boundaries: number[],
  startSecondsOf: (block: number) => number | null,
): Segment[] {
  if (blockCount === 0) return [];

  const starts = [0, ...boundaries.filter((b) => b > 0 && b < blockCount)];
  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] - 1 : blockCount - 1;
    return {
      index: i,
      startBlock: start,
      endBlock: end,
      startSeconds: startSecondsOf(start),
      // The end of a segment is the start of its last block: we have no
      // duration data, so claiming anything later would be invented.
      endSeconds: startSecondsOf(end),
    };
  });
}
