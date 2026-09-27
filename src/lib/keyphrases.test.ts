import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { extractCandidates, rankKeyphrases, type Candidate } from './keyphrases';
import { normalize } from './semantic-search';
import { StaticEmbedder, type StaticModelData } from './static-embedder';

const unit = (...values: number[]) => normalize(new Float32Array(values));

describe('extractCandidates', () => {
  const text =
    'The gradient descent algorithm updates the weights. ' +
    'Gradient descent is an optimisation method. ' +
    'The gradient descent step uses a learning rate.';

  it('rejects timestamps that survived into the text', () => {
    // A pair of two-digit tokens passes every other filter — neither is a
    // stopword and the length rule only applies to single words — and then
    // ranks well purely by being frequent.
    const withTimes = '09 22 the weights update. 09 22 the weights update again.';
    const phrases = extractCandidates(withTimes).map((c) => c.phrase);
    for (const phrase of phrases) {
      expect(phrase).not.toMatch(/\d/);
    }
  });

  it('rejects discourse filler a lecturer repeats constantly', () => {
    const filler =
      'So obviously we try to understand the amount. ' +
      'Obviously we try to understand the amount again.';
    const phrases = extractCandidates(filler).map((c) => c.phrase);
    for (const junk of ['obviously', 'amount', 'try to understand', 'saying']) {
      expect(phrases).not.toContain(junk);
    }
  });

  it('still keeps real subject matter alongside the filler', () => {
    const mixed =
      'Obviously the activation function transforms the output. ' +
      'The activation function is applied twice.';
    expect(extractCandidates(mixed).map((c) => c.phrase)).toContain('activation function');
  });

  it('finds repeated multi-word phrases', () => {
    const phrases = extractCandidates(text).map((c) => c.phrase);
    expect(phrases).toContain('gradient descent');
  });

  it('does not start or end a phrase on a stopword', () => {
    for (const { phrase } of extractCandidates(text)) {
      expect(phrase.startsWith('the ')).toBe(false);
      expect(phrase.endsWith(' the')).toBe(false);
      expect(phrase.endsWith(' is')).toBe(false);
    }
  });

  it('counts occurrences', () => {
    const found = extractCandidates(text).find((c) => c.phrase === 'gradient descent');
    expect(found?.occurrences).toBe(3);
  });

  it('drops phrases below the occurrence floor', () => {
    const phrases = extractCandidates(text, { minOccurrences: 3 }).map((c) => c.phrase);
    expect(phrases).toContain('gradient descent');
    expect(phrases).not.toContain('learning rate');
  });

  it('does not build phrases across a sentence boundary', () => {
    const phrases = extractCandidates('One ends here. Another begins.', {
      minOccurrences: 1,
    }).map((c) => c.phrase);
    expect(phrases).not.toContain('here another');
  });

  it('skips very short single words', () => {
    const phrases = extractCandidates('cat cat cat dog dog dog', { minOccurrences: 2 }).map(
      (c) => c.phrase,
    );
    expect(phrases).not.toContain('cat');
  });

  it('respects the candidate cap', () => {
    const long = Array.from({ length: 200 }, (_, i) => `concept${i} concept${i}`).join('. ');
    expect(extractCandidates(long, { maxCandidates: 10 }).length).toBeLessThanOrEqual(10);
  });

  it('returns nothing for empty input', () => {
    expect(extractCandidates('')).toEqual([]);
  });
});

describe('rankKeyphrases', () => {
  const candidates: Candidate[] = [
    { phrase: 'gradient descent', occurrences: 5 },
    { phrase: 'descent gradient', occurrences: 3 }, // near-duplicate
    { phrase: 'learning rate', occurrences: 4 },
    { phrase: 'unrelated topic', occurrences: 2 },
  ];
  // Laid out so relevance to `doc` orders them c0 > c1 > c2 > c3, while c0 and
  // c1 remain near-duplicates of each other (dot ~0.99). c1 is tilted *away*
  // from doc so being a duplicate does not also make it the best match — an
  // earlier version of this fixture had c1 winning outright, which tested
  // nothing about diversity.
  const vectors = [
    unit(1, 0, 0, 0), // gradient descent
    unit(0.98, -0.15, 0, 0), // descent gradient — near-duplicate of c0
    unit(0.5, 0.86, 0, 0), // learning rate — distinct
    unit(0, 0, 1, 0), // unrelated topic — orthogonal
  ];
  const doc = unit(1, 0.1, 0, 0);

  it('returns nothing when there are no candidates', () => {
    expect(rankKeyphrases([], [], doc)).toEqual([]);
  });

  it('ranks the most document-relevant phrase first', () => {
    const out = rankKeyphrases(candidates, vectors, doc, { diversity: 1, topK: 2 });
    expect(out[0].phrase).toBe('gradient descent');
  });

  it('suppresses near-duplicates when diversity is on', () => {
    const out = rankKeyphrases(candidates, vectors, doc, { topK: 2, diversity: 0.5, minScore: 0 });
    const phrases = out.map((k) => k.phrase);
    expect(phrases).not.toEqual(
      expect.arrayContaining(['gradient descent', 'descent gradient']),
    );
  });

  it('filters phrases unrelated to the document', () => {
    const out = rankKeyphrases(candidates, vectors, doc, { topK: 4, minScore: 0.3 });
    expect(out.map((k) => k.phrase)).not.toContain('unrelated topic');
  });

  it('carries occurrence counts through', () => {
    const out = rankKeyphrases(candidates, vectors, doc, { topK: 1, diversity: 1 });
    expect(out[0].occurrences).toBe(5);
  });

  it('returns results in descending score order', () => {
    const out = rankKeyphrases(candidates, vectors, doc, { topK: 4, minScore: 0 });
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
    }
  });

  it('throws when candidates and vectors disagree', () => {
    expect(() => rankKeyphrases(candidates, vectors.slice(0, 2), doc)).toThrow(/mismatch/i);
  });
});

/* -------------------------------------------------------------------------- */
/* Against the real model                                                      */
/* -------------------------------------------------------------------------- */

const MODEL_DIR = path.join(process.cwd(), 'public', 'models', 'search');
const hasRealModel = fs.existsSync(path.join(MODEL_DIR, 'embeddings.bin'));

function loadReal(): StaticModelData {
  const meta = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'vocab.json'), 'utf8'));
  const buffer = fs.readFileSync(path.join(MODEL_DIR, 'embeddings.bin'));
  const floats = new Float32Array(buffer.byteLength / 4);
  for (let i = 0; i < floats.length; i++) floats[i] = buffer.readFloatLE(i * 4);
  return { tokenizer: meta, embeddings: floats, dims: meta.dims, normalize: meta.normalize };
}

// Skipped on a fresh clone: weights are a build input (`npm run fetch:model`).
describe.skipIf(!hasRealModel)('on real lecture text', () => {
  const embedder = new StaticEmbedder(loadReal());

  const lecture = `
    Today we are going to look at gradient descent. Gradient descent is the
    algorithm that lets a neural network learn. The idea is that we compute the
    gradient of the loss function with respect to the weights. The gradient
    tells us which direction increases the loss, so we step the other way.
    The size of that step is called the learning rate. If the learning rate is
    too large the loss will oscillate. If the learning rate is too small
    training takes forever. So choosing a good learning rate matters a lot when
    you train a neural network with gradient descent.
  `;

  it('surfaces the concepts a human would list', () => {
    const candidates = extractCandidates(lecture);
    const vectors = candidates.map((c) => embedder.embed(c.phrase));
    const doc = embedder.embed(lecture);

    const phrases = rankKeyphrases(candidates, vectors, doc, { topK: 6 }).map((k) => k.phrase);

    // The two things this passage is actually about.
    expect(phrases.join(' | ')).toMatch(/gradient descent/);
    expect(phrases.join(' | ')).toMatch(/learning rate/);
  });

  it('does not return filler as a concept', () => {
    const candidates = extractCandidates(lecture);
    const vectors = candidates.map((c) => embedder.embed(c.phrase));
    const doc = embedder.embed(lecture);

    const phrases = rankKeyphrases(candidates, vectors, doc, { topK: 8 }).map((k) => k.phrase);
    for (const filler of ['going to', 'the idea', 'a lot', 'so choosing']) {
      expect(phrases).not.toContain(filler);
    }
  });
});
