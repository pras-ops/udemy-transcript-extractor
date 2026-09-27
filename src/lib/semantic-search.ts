/**
 * Ranking for local semantic search over transcript chunks.
 *
 * The model produces vectors; everything that decides what the user actually
 * sees happens here, in pure functions that can be tested without loading
 * 23 MB of weights.
 *
 * The design constraint worth knowing: chunks overlap by ~64 tokens by
 * construction (see `transcript.ts`), so neighbouring chunks are genuinely
 * similar to each other. Naive top-k therefore loves to return three
 * near-duplicate results covering the same ten seconds of video. `rankChunks`
 * counteracts that explicitly.
 */

export interface Embedding {
  /** L2-normalised vector. */
  vector: Float32Array;
}

export interface SearchHit {
  chunkIndex: number;
  /** Cosine similarity in [-1, 1]; in practice ~[0, 1] for these models. */
  score: number;
}

/* -------------------------------------------------------------------------- */
/* Vector maths                                                                */
/* -------------------------------------------------------------------------- */

/**
 * L2-normalise in place-safe fashion.
 *
 * Normalising once up front turns every later cosine similarity into a plain
 * dot product, which is the whole reason search stays fast on CPU.
 */
export function normalize(vector: ArrayLike<number>): Float32Array {
  let sumSquares = 0;
  for (let i = 0; i < vector.length; i++) sumSquares += vector[i] * vector[i];

  const magnitude = Math.sqrt(sumSquares);
  const out = new Float32Array(vector.length);
  // A zero vector has no direction; returning zeros keeps similarity at 0
  // rather than producing NaN that would poison every comparison.
  if (magnitude === 0) return out;

  for (let i = 0; i < vector.length; i++) out[i] = vector[i] / magnitude;
  return out;
}

/** Dot product. Equals cosine similarity when both inputs are normalised. */
export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** Cosine similarity for vectors that may not be normalised. */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return dot(normalize(a), normalize(b));
}

/* -------------------------------------------------------------------------- */
/* Ranking                                                                     */
/* -------------------------------------------------------------------------- */

export interface RankOptions {
  /** How many hits to return. */
  topK?: number;
  /**
   * Minimum similarity to report at all.
   *
   * Embedding search always returns *something*, so without a floor a question
   * the lecture never addresses still yields three confident-looking results.
   */
  minScore?: number;
  /**
   * Trade relevance against variety, 1 = pure relevance, 0 = pure variety.
   *
   * Applied via Maximal Marginal Relevance. Needed because adjacent chunks
   * share overlap text and would otherwise crowd out genuinely different parts
   * of the lecture.
   */
  diversity?: number;
}

export const DEFAULT_RANK_OPTIONS: Required<RankOptions> = {
  topK: 5,
  // Calibrated for all-MiniLM-L6-v2, whose unrelated-text similarities sit
  // around 0.0-0.15 and topical matches comfortably above 0.3.
  minScore: 0.25,
  diversity: 0.7,
};

/**
 * Rank chunk embeddings against a query embedding.
 *
 * All vectors are expected pre-normalised, so scoring is a dot product.
 * Selection is greedy MMR: repeatedly take the candidate maximising
 * `diversity * relevance - (1 - diversity) * maxSimilarityToAlreadyPicked`.
 */
export function rankChunks(
  queryVector: Float32Array,
  chunkVectors: Float32Array[],
  options: RankOptions = {},
): SearchHit[] {
  const opts = { ...DEFAULT_RANK_OPTIONS, ...options };
  if (chunkVectors.length === 0) return [];

  const relevance = chunkVectors.map((vector) => dot(queryVector, vector));

  const eligible = relevance
    .map((score, chunkIndex) => ({ chunkIndex, score }))
    .filter((hit) => hit.score >= opts.minScore)
    .sort((a, b) => b.score - a.score);

  if (eligible.length === 0) return [];
  if (opts.diversity >= 1) return eligible.slice(0, opts.topK);

  const selected: SearchHit[] = [];
  const remaining = [...eligible];

  // Ties are common — a chunk's relevance and its redundancy often move
  // together — and resolving them by array order would systematically favour
  // the near-duplicate that sorted higher. Break toward the less redundant
  // candidate instead, which is the whole point of running MMR.
  const EPSILON = 1e-9;

  while (selected.length < opts.topK && remaining.length > 0) {
    let bestPosition = 0;
    let bestValue = -Infinity;
    let bestRedundancy = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      let maxSimilarityToSelected = 0;
      for (const picked of selected) {
        const similarity = dot(chunkVectors[candidate.chunkIndex], chunkVectors[picked.chunkIndex]);
        if (similarity > maxSimilarityToSelected) maxSimilarityToSelected = similarity;
      }

      const value =
        opts.diversity * candidate.score - (1 - opts.diversity) * maxSimilarityToSelected;

      const better =
        value > bestValue + EPSILON ||
        (Math.abs(value - bestValue) <= EPSILON && maxSimilarityToSelected < bestRedundancy);

      if (better) {
        bestValue = value;
        bestRedundancy = maxSimilarityToSelected;
        bestPosition = i;
      }
    }

    selected.push(remaining[bestPosition]);
    remaining.splice(bestPosition, 1);
  }

  // Report in score order; MMR governs which chunks are chosen, not how they read.
  return selected.sort((a, b) => b.score - a.score);
}

/* -------------------------------------------------------------------------- */
/* Presentation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Pull the most query-relevant sentence out of a chunk, for a preview line.
 *
 * Purely lexical on purpose: the expensive part already happened during
 * ranking, and a cheap keyword overlap is enough to choose which sentence of a
 * 512-token chunk to show first.
 */
export function bestSnippet(chunkText: string, query: string, maxLength = 220): string {
  const sentences = chunkText.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return chunkText.slice(0, maxLength);

  const terms = new Set(
    query
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2),
  );

  let best = sentences[0];
  let bestOverlap = -1;
  for (const sentence of sentences) {
    const words = sentence.toLowerCase().split(/\W+/);
    let overlap = 0;
    for (const word of words) if (terms.has(word)) overlap++;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = sentence;
    }
  }

  const trimmed = best.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1).trimEnd()}…` : trimmed;
}

/**
 * Turn a similarity into a label.
 *
 * A raw cosine number means nothing to a student, and showing "0.41" invites
 * false precision about what the model actually knows.
 */
export function confidenceLabel(score: number): 'strong' | 'likely' | 'weak' {
  if (score >= 0.5) return 'strong';
  if (score >= 0.35) return 'likely';
  return 'weak';
}
