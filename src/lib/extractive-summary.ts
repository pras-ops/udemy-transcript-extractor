/**
 * Summaries that work on every machine.
 *
 * Chrome's on-device model is the better writer, but it is absent on plenty of
 * hardware and capped at roughly 1024 tokens per prompt — about 750 words,
 * where a single lecture runs to three thousand. Making summarisation depend
 * on it would mean the feature simply does not exist for most people.
 *
 * So this is the floor: an extractive summary, built from the static
 * embeddings that already ship with the extension. It selects the sentences
 * the lecturer actually said rather than writing new ones.
 *
 * ## Why extractive is not merely the fallback
 *
 * It cannot hallucinate. Every line in the output was spoken, with the
 * timestamp it was spoken at. For study notes that is a real advantage over
 * generated prose, which can state something the lecture never claimed in
 * language indistinguishable from what it did.
 *
 * The generated tier layers on top where it is available — it does not replace
 * this one.
 */

import { cosineSimilarity, normalize } from './semantic-search';

export interface SummarySentence {
  /** Index in the source, so callers can map back. */
  index: number;
  text: string;
  startSeconds: number | null;
}

export interface ExtractiveOptions {
  /** How many sentences to keep. */
  maxSentences?: number;
  /**
   * Centrality versus variety, 0..1.
   *
   * At 1 the summary is the most on-topic sentences, which on a lecture means
   * several rewordings of the same idea — the speaker repeats themselves, and
   * repetition is exactly what scores well against the centroid. Lowering it
   * trades a little relevance for coverage.
   */
  lambda?: number;
  /**
   * Shortest sentence worth keeping, in words.
   *
   * Speech is full of "Right.", "Okay guys.", "Correct." — short, frequent,
   * and meaningless in a summary.
   */
  minWords?: number;
}

const DEFAULTS: Required<ExtractiveOptions> = {
  maxSentences: 5,
  lambda: 0.7,
  minWords: 6,
};

/**
 * Mean direction of a set of vectors — the "gist" they cluster around.
 *
 * Normalised on the way out so similarity against it is a plain cosine.
 * Returns null for an empty set rather than a zero vector, which would make
 * every sentence equally central.
 */
export function centroid(vectors: Float32Array[]): Float32Array | null {
  if (vectors.length === 0) return null;

  const dims = vectors[0].length;
  if (dims === 0) return null;

  const sum = new Float32Array(dims);
  for (const vector of vectors) {
    // A short vector would read past its end; a long one is truncated. Neither
    // should happen, and neither should corrupt the result if it does.
    const limit = Math.min(dims, vector.length);
    for (let i = 0; i < limit; i += 1) sum[i] += vector[i];
  }

  for (let i = 0; i < dims; i += 1) sum[i] /= vectors.length;
  return normalize(sum);
}

/**
 * Choose which sentences to keep.
 *
 * Greedy maximal marginal relevance: take the most central sentence, then
 * repeatedly take whichever remaining sentence best balances being on-topic
 * against not repeating what is already chosen.
 *
 * Returns indices in **reading order**, not score order. A summary is read top
 * to bottom, and sentences pulled out of sequence lose the thread of the
 * argument even when each one is individually well chosen.
 */
export function selectSentences(
  vectors: Float32Array[],
  options: ExtractiveOptions = {},
): number[] {
  const { maxSentences, lambda } = { ...DEFAULTS, ...options };
  if (vectors.length === 0 || maxSentences <= 0) return [];
  if (vectors.length <= maxSentences) return vectors.map((_, i) => i);

  const gist = centroid(vectors);
  if (!gist) return [];

  const centrality = vectors.map((vector) => cosineSimilarity(vector, gist));

  const chosen: number[] = [];
  const remaining = new Set(vectors.map((_, i) => i));

  while (chosen.length < maxSentences && remaining.size > 0) {
    let best = -1;
    let bestScore = -Infinity;

    for (const candidate of remaining) {
      let redundancy = 0;
      for (const taken of chosen) {
        const similarity = cosineSimilarity(vectors[candidate], vectors[taken]);
        if (similarity > redundancy) redundancy = similarity;
      }

      const score = lambda * centrality[candidate] - (1 - lambda) * redundancy;
      // Ties break toward the earlier sentence, which keeps the opening of a
      // chapter — usually the statement of what it is about — over a later
      // restatement of the same thing.
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best === -1) break;
    chosen.push(best);
    remaining.delete(best);
  }

  return chosen.sort((a, b) => a - b);
}

/** A sentence long enough to carry meaning on its own. */
export function isSubstantial(text: string, minWords = DEFAULTS.minWords): boolean {
  return text.trim().split(/\s+/).filter(Boolean).length >= minWords;
}

/**
 * Build an extractive summary from sentences and their vectors.
 *
 * `vectors[i]` must correspond to `sentences[i]`; the caller owns embedding
 * because the embedder is async and this module stays pure.
 */
export function summarizeExtractive(
  sentences: { sentence: string; startSeconds: number | null }[],
  vectors: Float32Array[],
  options: ExtractiveOptions = {},
): SummarySentence[] {
  const settings = { ...DEFAULTS, ...options };

  // Filter first, so the filler does not drag the centroid toward itself and
  // does not occupy a slot in the result.
  const candidates = sentences
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry, index }) => index < vectors.length && isSubstantial(entry.sentence, settings.minWords));

  if (candidates.length === 0) return [];

  const picked = selectSentences(
    candidates.map(({ index }) => vectors[index]),
    settings,
  );

  return picked.map((position) => {
    const { entry, index } = candidates[position];
    return { index, text: entry.sentence, startSeconds: entry.startSeconds };
  });
}
