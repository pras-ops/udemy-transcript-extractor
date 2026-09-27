/**
 * BM25 — keyword search with no model at all.
 *
 * This exists so search works the instant the panel opens. It weighs nothing,
 * loads nothing, and runs on any machine, because it is arithmetic over word
 * counts rather than a learned representation.
 *
 * It is not a fallback for the embedding model so much as a complement to it.
 * Published comparisons consistently find lexical scoring *ahead* of dense
 * retrieval on exact terminology — named entities, identifiers, technical
 * jargon — which is most of what a programming lecture consists of. Dense
 * retrieval wins on paraphrase, where the words differ but the meaning does
 * not. They fail in different directions, so the useful system runs both.
 *
 * Pure functions, no DOM, no network, no weights.
 */

export interface BM25Options {
  /**
   * Term-frequency saturation. Higher lets repetition keep adding score;
   * 1.2-2.0 is the usual range.
   */
  k1?: number;
  /** Length normalisation, 0 = none, 1 = full. */
  b?: number;
}

export const DEFAULT_BM25_OPTIONS: Required<BM25Options> = {
  k1: 1.5,
  b: 0.75,
};

export interface BM25Hit {
  chunkIndex: number;
  score: number;
}

/**
 * Split text into comparable terms.
 *
 * Deliberately simple and shared between indexing and querying — the two must
 * tokenise identically or nothing matches. Apostrophes are kept inside words so
 * "don't" stays one term rather than becoming "don" and "t".
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^['-]+|['-]+$/g, ''))
    .filter((word) => word.length > 1);
}

interface Document {
  chunkIndex: number;
  length: number;
  frequencies: Map<string, number>;
}

export class BM25Index {
  private readonly documents: Document[] = [];
  private readonly documentFrequency = new Map<string, number>();
  private averageLength = 0;
  private readonly options: Required<BM25Options>;

  constructor(options: BM25Options = {}) {
    this.options = { ...DEFAULT_BM25_OPTIONS, ...options };
  }

  get size(): number {
    return this.documents.length;
  }

  /** Build the index. Cheap enough to redo whenever the transcript changes. */
  add(chunks: { chunkIndex: number; text: string }[]): void {
    for (const chunk of chunks) {
      const terms = tokenize(chunk.text);
      const frequencies = new Map<string, number>();
      for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);

      for (const term of frequencies.keys()) {
        this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
      }

      this.documents.push({ chunkIndex: chunk.chunkIndex, length: terms.length, frequencies });
    }

    const total = this.documents.reduce((sum, doc) => sum + doc.length, 0);
    this.averageLength = this.documents.length > 0 ? total / this.documents.length : 0;
  }

  /**
   * Inverse document frequency, in the form that keeps scores non-negative.
   *
   * The textbook BM25 IDF goes negative for terms present in more than half the
   * documents, which for a single lecture — where common words appear
   * everywhere — would subtract score for matching. The +1 variant avoids that.
   */
  private idf(term: string): number {
    const containing = this.documentFrequency.get(term) ?? 0;
    if (containing === 0) return 0;
    const total = this.documents.length;
    return Math.log(1 + (total - containing + 0.5) / (containing + 0.5));
  }

  /** Score every document against a query, best first. */
  search(query: string, topK = 5): BM25Hit[] {
    const terms = tokenize(query);
    if (terms.length === 0 || this.documents.length === 0) return [];

    const { k1, b } = this.options;
    const hits: BM25Hit[] = [];

    for (const doc of this.documents) {
      let score = 0;

      for (const term of terms) {
        const frequency = doc.frequencies.get(term);
        if (!frequency) continue;

        const normalisation =
          this.averageLength > 0 ? 1 - b + (b * doc.length) / this.averageLength : 1;
        score += this.idf(term) * ((frequency * (k1 + 1)) / (frequency + k1 * normalisation));
      }

      if (score > 0) hits.push({ chunkIndex: doc.chunkIndex, score });
    }

    return hits.sort((a, b2) => b2.score - a.score).slice(0, topK);
  }

  clear(): void {
    this.documents.length = 0;
    this.documentFrequency.clear();
    this.averageLength = 0;
  }
}

/* -------------------------------------------------------------------------- */
/* Fusion                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Combine two ranked lists with Reciprocal Rank Fusion.
 *
 * RRF merges by *rank* rather than score, which matters because BM25 scores are
 * unbounded and cosine similarities sit in [0, 1] — averaging them directly
 * would let BM25 drown out the embeddings. It also needs no tuning, which is
 * the reason it is the usual choice for hybrid search.
 *
 * `k` damps the influence of top ranks; 60 is the conventional value.
 */
export function fuseRankings(
  rankings: { chunkIndex: number }[][],
  topK = 5,
  k = 60,
): { chunkIndex: number; score: number }[] {
  const scores = new Map<number, number>();

  for (const ranking of rankings) {
    ranking.forEach((hit, position) => {
      scores.set(hit.chunkIndex, (scores.get(hit.chunkIndex) ?? 0) + 1 / (k + position + 1));
    });
  }

  return [...scores.entries()]
    .map(([chunkIndex, score]) => ({ chunkIndex, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
