import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { StaticEmbedder, type StaticModelData } from './static-embedder';
import { cosineSimilarity } from './semantic-search';
import type { TokenizerConfig } from './wordpiece';

const tokenizer: TokenizerConfig = {
  vocab: ['[UNK]', 'a', 'b', 'c'],
  unkToken: '[UNK]',
  continuingPrefix: '##',
  maxInputCharsPerWord: 100,
  lowercase: true,
  stripAccents: true,
  handleChineseChars: true,
};

/** 4 tokens x 2 dims, chosen so averages are easy to check by hand. */
const toy: StaticModelData = {
  tokenizer,
  embeddings: new Float32Array([
    0, 0, // [UNK]
    1, 0, // a
    0, 1, // b
    1, 1, // c
  ]),
  dims: 2,
  normalize: false,
};

describe('StaticEmbedder', () => {
  it('averages the vectors of its tokens', () => {
    const embedder = new StaticEmbedder(toy);
    // "a b" -> mean of (1,0) and (0,1)
    expect([...embedder.embed('a b')]).toEqual([0.5, 0.5]);
  });

  it('returns a single token vector unchanged', () => {
    expect([...new StaticEmbedder(toy).embed('c')]).toEqual([1, 1]);
  });

  it('normalises when configured', () => {
    const embedder = new StaticEmbedder({ ...toy, normalize: true });
    const out = embedder.embed('c');
    expect(Math.hypot(out[0], out[1])).toBeCloseTo(1, 6);
  });

  it('returns zeros rather than NaN for text with no tokens', () => {
    const out = new StaticEmbedder({ ...toy, normalize: true }).embed('   ');
    expect([...out]).toEqual([0, 0]);
    expect(out.some(Number.isNaN)).toBe(false);
  });

  it('reports the right dimensionality', () => {
    expect(new StaticEmbedder(toy).dimensions).toBe(2);
  });

  it('rejects a table whose size does not match the vocabulary', () => {
    expect(
      () => new StaticEmbedder({ ...toy, embeddings: new Float32Array([1, 2, 3]) }),
    ).toThrow(/expected/i);
  });

  it('embeds a batch', () => {
    const out = new StaticEmbedder(toy).embedBatch(['a', 'b']);
    expect(out).toHaveLength(2);
    expect([...out[0]]).toEqual([1, 0]);
  });
});

/* -------------------------------------------------------------------------- */
/* Against the real model                                                      */
/* -------------------------------------------------------------------------- */

const MODEL_DIR = path.join(process.cwd(), 'public', 'models', 'search');
const hasRealModel =
  fs.existsSync(path.join(MODEL_DIR, 'vocab.json')) &&
  fs.existsSync(path.join(MODEL_DIR, 'embeddings.bin'));

function loadReal(): StaticModelData {
  const meta = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'vocab.json'), 'utf8'));
  const buffer = fs.readFileSync(path.join(MODEL_DIR, 'embeddings.bin'));
  // Copy into a correctly aligned ArrayBuffer; a Node Buffer is a view into a
  // shared pool and its byteOffset is rarely a multiple of 4.
  const floats = new Float32Array(buffer.byteLength / 4);
  for (let i = 0; i < floats.length; i++) floats[i] = buffer.readFloatLE(i * 4);

  return { tokenizer: meta, embeddings: floats, dims: meta.dims, normalize: meta.normalize };
}

// Skipped on a fresh clone: weights are a build input (`npm run fetch:model`).
describe.skipIf(!hasRealModel)('potion-base-8M end to end', () => {
  const embedder = new StaticEmbedder(loadReal());

  it('produces a normalised vector of the right size', () => {
    const out = embedder.embed('gradient descent');
    expect(out.length).toBe(256);
    let sum = 0;
    for (const v of out) sum += v * v;
    expect(Math.sqrt(sum)).toBeCloseTo(1, 4);
  });

  it('scores related sentences above unrelated ones', () => {
    // The test that actually validates the pipeline: tokenisation, lookup,
    // pooling and normalisation all have to be right for this ordering to hold.
    const query = embedder.embed('how does the model learn from data');
    const related = embedder.embed(
      'the network updates its weights using gradient descent to reduce the loss',
    );
    const unrelated = embedder.embed('add the chopped onions and fry them until golden brown');

    const relatedScore = cosineSimilarity(query, related);
    const unrelatedScore = cosineSimilarity(query, unrelated);

    expect(relatedScore).toBeGreaterThan(unrelatedScore);
    // A meaningful margin, not a coin flip.
    expect(relatedScore - unrelatedScore).toBeGreaterThan(0.1);
  });

  it('is case-insensitive', () => {
    const lower = embedder.embed('gradient descent');
    const upper = embedder.embed('GRADIENT DESCENT');
    expect(cosineSimilarity(lower, upper)).toBeCloseTo(1, 5);
  });

  it('rates a paraphrase above an unrelated sentence from the same domain', () => {
    const query = embedder.embed('what is a loss function');
    const paraphrase = embedder.embed('the loss function measures how wrong the prediction is');
    const offTopic = embedder.embed('install python and set up your editor');

    expect(cosineSimilarity(query, paraphrase)).toBeGreaterThan(
      cosineSimilarity(query, offTopic),
    );
  });

  it('embeds a realistic chunk quickly', () => {
    const chunk = 'so what we are going to do here is take the derivative of the loss '.repeat(20);
    const started = performance.now();
    for (let i = 0; i < 50; i++) embedder.embed(chunk);
    const perCall = (performance.now() - started) / 50;

    // No inference engine, so this should be well under a millisecond-scale
    // budget even for a long chunk. Generous bound to stay stable in CI.
    expect(perCall).toBeLessThan(50);
  });
});
