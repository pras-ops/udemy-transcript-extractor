/**
 * Static embedding — a lookup table, not a network.
 *
 * `potion-base-8M` is a Model2Vec distillation: every token in the vocabulary
 * has a fixed 256-dimensional vector baked in at distillation time. Embedding
 * text is therefore tokenise, look up, average, normalise. There is no graph to
 * execute, so there is no inference runtime, no WebAssembly, no ONNX, and none
 * of the loading machinery that goes with them.
 *
 * That is the whole point of choosing it. Quality is close to the transformer
 * it was distilled from (MTEB 56.3 against ~56 for all-MiniLM-L6-v2), while the
 * code below is the entire implementation.
 */

import { WordPieceTokenizer, type TokenizerConfig } from './wordpiece';

export interface StaticModelData {
  tokenizer: TokenizerConfig;
  /** vocabSize * dims, row-major, little-endian float32. */
  embeddings: Float32Array;
  dims: number;
  /** L2-normalise each output vector. */
  normalize: boolean;
}

export class StaticEmbedder {
  private readonly tokenizer: WordPieceTokenizer;
  private readonly embeddings: Float32Array;
  private readonly dims: number;
  private readonly shouldNormalize: boolean;

  constructor(data: StaticModelData) {
    const expected = data.tokenizer.vocab.length * data.dims;
    if (data.embeddings.length !== expected) {
      throw new Error(
        `Embedding table is ${data.embeddings.length} floats, expected ${expected} ` +
          `(${data.tokenizer.vocab.length} tokens x ${data.dims} dims).`,
      );
    }

    this.tokenizer = new WordPieceTokenizer(data.tokenizer);
    this.embeddings = data.embeddings;
    this.dims = data.dims;
    this.shouldNormalize = data.normalize;
  }

  get dimensions(): number {
    return this.dims;
  }

  /**
   * Embed one piece of text.
   *
   * Text with no recognisable tokens returns a zero vector rather than NaN.
   * Downstream that scores 0 against everything, so it simply fails to match —
   * which is the honest outcome for input the model cannot represent.
   */
  embed(text: string): Float32Array {
    const ids = this.tokenizer.encode(text);
    const out = new Float32Array(this.dims);
    if (ids.length === 0) return out;

    for (const id of ids) {
      const offset = id * this.dims;
      for (let d = 0; d < this.dims; d++) out[d] += this.embeddings[offset + d];
    }

    for (let d = 0; d < this.dims; d++) out[d] /= ids.length;

    if (this.shouldNormalize) {
      let sumSquares = 0;
      for (let d = 0; d < this.dims; d++) sumSquares += out[d] * out[d];
      const magnitude = Math.sqrt(sumSquares);
      if (magnitude > 0) {
        for (let d = 0; d < this.dims; d++) out[d] /= magnitude;
      }
    }

    return out;
  }

  embedBatch(texts: string[]): Float32Array[] {
    return texts.map((text) => this.embed(text));
  }

  /** Token strings for a query, for explaining why something matched. */
  debugTokens(text: string): string[] {
    return this.tokenizer.tokenize(text);
  }
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Load the bundled model.
 *
 * Both files ship inside the extension, so these are local reads — there is no
 * network involved and nothing to consent to. `baseUrl` is passed in rather
 * than derived so this stays usable from tests and from any extension context.
 */
export async function loadStaticModel(baseUrl: string): Promise<StaticModelData> {
  const [vocabResponse, binResponse] = await Promise.all([
    fetch(`${baseUrl}vocab.json`),
    fetch(`${baseUrl}embeddings.bin`),
  ]);

  if (!vocabResponse.ok) {
    throw new Error(`Could not read the search vocabulary (HTTP ${vocabResponse.status}).`);
  }
  if (!binResponse.ok) {
    throw new Error(`Could not read the search embeddings (HTTP ${binResponse.status}).`);
  }

  const meta = (await vocabResponse.json()) as TokenizerConfig & {
    dims: number;
    normalize: boolean;
  };
  const buffer = await binResponse.arrayBuffer();

  return {
    tokenizer: meta,
    embeddings: new Float32Array(buffer),
    dims: meta.dims,
    normalize: meta.normalize !== false,
  };
}
