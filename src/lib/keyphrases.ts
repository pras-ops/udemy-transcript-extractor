/**
 * Key concept extraction — what is this lecture actually about?
 *
 * A KeyBERT-style approach: generate candidate phrases from the text, embed
 * them, and rank by similarity to the document as a whole. Because ranking is
 * semantic rather than frequency-based, a concept that gets restated in
 * different words still scores highly — which is exactly the case in speech,
 * and where purely statistical methods like YAKE or RAKE tend to struggle.
 *
 * Selection is diversified with MMR, reusing the same machinery the search
 * results use. Without it the top phrases are near-duplicates of each other
 * ("gradient descent", "the gradient descent", "descent algorithm") rather
 * than a spread of the lecture's actual topics.
 *
 * Pure functions over vectors: the caller supplies the embeddings.
 */

import { dot } from './semantic-search';

/**
 * Words that should not begin or end a phrase.
 *
 * Deliberately small: this is about phrase *boundaries*, not removing content.
 * "the loss function" should surface as "loss function", but a word like
 * "gradient" must never be filtered out for being common in this transcript.
 */
const BOUNDARY_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'while',
  'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'about',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'do', 'does', 'did', 'have', 'has', 'had', 'having',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'so', 'just', 'now', 'here', 'there', 'what', 'which', 'who', 'how', 'why',
  'not', 'no', 'yes', 'ok', 'okay', 'right', 'well', 'like', 'really', 'very',
  'going', 'got', 'get', 'let', 'lets', 'want', 'need', 'know', 'see', 'look',
  'one', 'two', 'also', 'actually', 'basically', 'thing', 'things', 'way',
  // Discourse filler. A lecturer says these constantly and they name nothing;
  // left in, they crowd out the terms someone would actually search for.
  'obviously', 'probably', 'maybe', 'simply', 'exactly', 'definitely',
  'certainly', 'literally', 'essentially', 'clearly', 'suppose', 'say', 'says',
  'saying', 'said', 'talk', 'talking', 'tell', 'telling', 'discuss',
  'discussing', 'try', 'trying', 'understand', 'understanding', 'think',
  'thinking', 'consider', 'remember', 'imagine', 'mean', 'means',
  'much', 'many', 'more', 'most', 'some', 'any', 'every', 'all', 'each',
  'amount', 'number', 'kind', 'sort', 'lot', 'bit', 'part', 'point',
  'first', 'second', 'third', 'next', 'last', 'previous', 'another',
  // Lecture scaffolding rather than subject matter.
  'video', 'videos', 'session', 'lecture', 'class', 'course', 'guys',
]);

/**
 * A token made only of digits and separators.
 *
 * Timestamps survive into the text as bare numbers, and a pair of them
 * ("09 22") passes every other filter: each token is two characters, neither
 * is a stopword, and the length rule only applies to single words. They then
 * rank well simply by being frequent.
 */
const NUMERIC_TOKEN = /^[\d.,:/-]+$/;

export interface CandidateOptions {
  /** Shortest phrase length in words. */
  minWords?: number;
  /** Longest phrase length in words. */
  maxWords?: number;
  /** Discard phrases occurring fewer times than this. */
  minOccurrences?: number;
  /** Cap on candidates, so a long lecture does not blow up embedding cost. */
  maxCandidates?: number;
}

export const DEFAULT_CANDIDATE_OPTIONS: Required<CandidateOptions> = {
  minWords: 1,
  maxWords: 3,
  minOccurrences: 2,
  maxCandidates: 400,
};

export interface Candidate {
  phrase: string;
  occurrences: number;
}

/** Split into word tokens, keeping only alphabetic-ish terms. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Build candidate phrases from the transcript.
 *
 * Phrases may not start or end on a stopword, which turns "the loss function
 * is" into "loss function" without needing a part-of-speech tagger.
 */
export function extractCandidates(text: string, options: CandidateOptions = {}): Candidate[] {
  const opts = { ...DEFAULT_CANDIDATE_OPTIONS, ...options };
  const counts = new Map<string, number>();

  // Sentence-ish units, so phrases never span a full stop.
  for (const sentence of text.split(/[.!?\n]+/)) {
    const tokens = words(sentence);

    for (let n = opts.minWords; n <= opts.maxWords; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const gram = tokens.slice(i, i + n);

        if (BOUNDARY_STOPWORDS.has(gram[0])) continue;
        if (BOUNDARY_STOPWORDS.has(gram[gram.length - 1])) continue;
        if (gram.some((w) => NUMERIC_TOKEN.test(w))) continue;
        // A single short token is almost never a concept worth surfacing.
        if (gram.some((w) => w.length < 2)) continue;
        if (n === 1 && gram[0].length < 4) continue;

        const phrase = gram.join(' ');
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .filter(([, occurrences]) => occurrences >= opts.minOccurrences)
    // Frequent phrases first, so the cap keeps the ones worth embedding.
    .sort((a, b) => b[1] - a[1])
    .slice(0, opts.maxCandidates)
    .map(([phrase, occurrences]) => ({ phrase, occurrences }));
}

/* -------------------------------------------------------------------------- */
/* Ranking                                                                     */
/* -------------------------------------------------------------------------- */

export interface KeyphraseOptions {
  topK?: number;
  /** 1 = pure relevance, 0 = pure variety. */
  diversity?: number;
  /** Minimum similarity to the document before a phrase is considered. */
  minScore?: number;
}

export const DEFAULT_KEYPHRASE_OPTIONS: Required<KeyphraseOptions> = {
  topK: 8,
  diversity: 0.6,
  minScore: 0.15,
};

export interface Keyphrase {
  phrase: string;
  score: number;
  occurrences: number;
}

/**
 * Rank candidates against the document embedding, diversified with MMR.
 *
 * Vectors are expected normalised, so scoring is a dot product.
 */
export function rankKeyphrases(
  candidates: Candidate[],
  candidateVectors: Float32Array[],
  documentVector: Float32Array,
  options: KeyphraseOptions = {},
): Keyphrase[] {
  const opts = { ...DEFAULT_KEYPHRASE_OPTIONS, ...options };
  if (candidates.length === 0) return [];
  if (candidates.length !== candidateVectors.length) {
    throw new Error(
      `Candidate/vector mismatch: ${candidates.length} phrases, ${candidateVectors.length} vectors.`,
    );
  }

  const eligible = candidates
    .map((candidate, i) => ({ i, score: dot(documentVector, candidateVectors[i]) }))
    .filter((entry) => entry.score >= opts.minScore)
    .sort((a, b) => b.score - a.score);

  if (eligible.length === 0) return [];

  const selected: typeof eligible = [];
  const remaining = [...eligible];
  const EPSILON = 1e-9;

  while (selected.length < opts.topK && remaining.length > 0) {
    let bestPosition = 0;
    let bestValue = -Infinity;
    let bestRedundancy = Infinity;

    for (let k = 0; k < remaining.length; k++) {
      const candidate = remaining[k];
      let redundancy = 0;
      for (const picked of selected) {
        const similarity = dot(candidateVectors[candidate.i], candidateVectors[picked.i]);
        if (similarity > redundancy) redundancy = similarity;
      }

      const value = opts.diversity * candidate.score - (1 - opts.diversity) * redundancy;
      const better =
        value > bestValue + EPSILON ||
        (Math.abs(value - bestValue) <= EPSILON && redundancy < bestRedundancy);

      if (better) {
        bestValue = value;
        bestRedundancy = redundancy;
        bestPosition = k;
      }
    }

    selected.push(remaining[bestPosition]);
    remaining.splice(bestPosition, 1);
  }

  return selected
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      phrase: candidates[entry.i].phrase,
      score: entry.score,
      occurrences: candidates[entry.i].occurrences,
    }));
}
