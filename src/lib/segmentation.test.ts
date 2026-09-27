import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  gapSimilarities,
  smooth,
  depthScores,
  detectBoundaries,
  buildSegments,
} from './segmentation';
import { normalize } from './semantic-search';
import { StaticEmbedder, type StaticModelData } from './static-embedder';

/** A unit vector pointing mostly along `axis`, with a little jitter. */
function topicVector(axis: number, dims = 8, jitter = 0.05, seed = 0): Float32Array {
  const v = new Float32Array(dims);
  for (let d = 0; d < dims; d++) {
    // Deterministic pseudo-jitter so tests do not flake.
    v[d] = ((Math.sin(seed * 12.9898 + d * 78.233) * 43758.5453) % 1) * jitter;
  }
  v[axis] += 1;
  return normalize(v);
}

/** `counts` blocks of each topic, laid end to end. */
function transcriptOf(counts: number[]): Float32Array[] {
  const out: Float32Array[] = [];
  counts.forEach((count, topic) => {
    for (let i = 0; i < count; i++) out.push(topicVector(topic, 8, 0.05, out.length));
  });
  return out;
}

describe('gapSimilarities', () => {
  it('returns one score per gap', () => {
    expect(gapSimilarities(transcriptOf([5]), 2)).toHaveLength(4);
  });

  it('dips where the topic changes', () => {
    const scores = gapSimilarities(transcriptOf([6, 6]), 3);
    // Gap 5 sits between the two topics and should be the lowest point.
    const lowest = scores.indexOf(Math.min(...scores));
    expect(lowest).toBe(5);
  });

  it('stays high throughout a single topic', () => {
    const scores = gapSimilarities(transcriptOf([12]), 3);
    for (const score of scores) expect(score).toBeGreaterThan(0.9);
  });
});

describe('smooth', () => {
  it('flattens a single spike', () => {
    const out = smooth([1, 1, 5, 1, 1], 1);
    expect(out[2]).toBeLessThan(5);
    expect(out[2]).toBeGreaterThan(1);
  });

  it('leaves the endpoints alone', () => {
    const out = smooth([3, 1, 1, 1, 7], 2);
    expect(out[0]).toBe(3);
    expect(out[4]).toBe(7);
  });

  it('is a no-op with zero passes', () => {
    expect(smooth([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });
});

describe('depthScores', () => {
  it('scores an isolated valley highly', () => {
    const depths = depthScores([1, 1, 0, 1, 1]);
    expect(depths[2]).toBeCloseTo(2, 6);
  });

  it('scores a flat run at zero', () => {
    for (const d of depthScores([1, 1, 1, 1])) expect(d).toBeCloseTo(0, 6);
  });

  it('accumulates left depth on a monotonic decline', () => {
    // Not a defect: the left side climbs back to the earlier peak, so depth
    // grows along the slope. Whether that becomes a *boundary* is decided by
    // detectBoundaries, which requires a local maximum — see below.
    const depths = depthScores([1, 0.9, 0.8, 0.7, 0.6]);
    expect(depths[0]).toBeCloseTo(0, 6);
    expect(depths[3]).toBeCloseTo(0.3, 6);
  });
});

describe('gradual drift', () => {
  it('produces no boundary when a topic evolves steadily', () => {
    // The property that actually matters: a lecture that drifts from one idea
    // into a neighbouring one should not be cut, because there is no seam.
    const dims = 8;
    const vectors: Float32Array[] = [];
    for (let i = 0; i < 30; i++) {
      const v = new Float32Array(dims);
      // Rotate slowly from axis 0 toward axis 1 across the whole transcript.
      const t = i / 29;
      v[0] = Math.cos((t * Math.PI) / 2);
      v[1] = Math.sin((t * Math.PI) / 2);
      vectors.push(normalize(v));
    }
    expect(detectBoundaries(vectors)).toEqual([]);
  });
});

describe('detectBoundaries', () => {
  it('finds the junction between two topics', () => {
    const boundaries = detectBoundaries(transcriptOf([10, 10]));
    expect(boundaries).toHaveLength(1);
    // Allow a block of slack: smoothing shifts the detected point slightly.
    expect(Math.abs(boundaries[0] - 10)).toBeLessThanOrEqual(2);
  });

  it('finds both junctions across three topics', () => {
    const boundaries = detectBoundaries(transcriptOf([10, 10, 10]));
    expect(boundaries.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(boundaries[0] - 10)).toBeLessThanOrEqual(2);
  });

  it('reports no boundary for a single coherent topic', () => {
    expect(detectBoundaries(transcriptOf([30]))).toEqual([]);
  });

  it('returns nothing when there is too little to segment', () => {
    expect(detectBoundaries(transcriptOf([3]))).toEqual([]);
    expect(detectBoundaries([])).toEqual([]);
  });

  it('respects the minimum segment length', () => {
    const boundaries = detectBoundaries(transcriptOf([10, 10, 10]), { minBlocksPerSegment: 8 });
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i] - boundaries[i - 1]).toBeGreaterThanOrEqual(8);
    }
  });

  it('never exceeds maxSegments', () => {
    const boundaries = detectBoundaries(transcriptOf([6, 6, 6, 6, 6, 6, 6, 6]), {
      maxSegments: 3,
      minBlocksPerSegment: 3,
    });
    expect(boundaries.length).toBeLessThanOrEqual(2);
  });

  it('returns boundaries in ascending order', () => {
    const boundaries = detectBoundaries(transcriptOf([8, 8, 8, 8]));
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]).toBeGreaterThan(boundaries[i - 1]);
    }
  });
});

describe('buildSegments', () => {
  const startsAt = (block: number) => block * 10;

  it('covers every block with no gaps or overlaps', () => {
    const segments = buildSegments(20, [7, 14], startsAt);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({ startBlock: 0, endBlock: 6 });
    expect(segments[1]).toMatchObject({ startBlock: 7, endBlock: 13 });
    expect(segments[2]).toMatchObject({ startBlock: 14, endBlock: 19 });
  });

  it('produces one segment when there are no boundaries', () => {
    const segments = buildSegments(10, [], startsAt);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ startBlock: 0, endBlock: 9 });
  });

  it('carries timestamps through', () => {
    const [first] = buildSegments(10, [5], startsAt);
    expect(first.startSeconds).toBe(0);
    expect(first.endSeconds).toBe(40);
  });

  it('handles an empty transcript', () => {
    expect(buildSegments(0, [], startsAt)).toEqual([]);
  });

  it('ignores out-of-range boundaries', () => {
    expect(buildSegments(5, [0, 99], startsAt)).toHaveLength(1);
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

  it('puts a boundary where the subject actually changes', () => {
    // Ten sentences about variables, then ten about sorting. A correct
    // segmenter finds the seam near block 10 and does not invent others.
    const python = [
      'a variable is a name that refers to a value in memory',
      'you assign to a variable using the equals sign',
      'python variables do not need a declared type',
      'the type is inferred from the value you assign',
      'integers and floats are both numeric types',
      'strings hold text and are written in quotes',
      'you can reassign a variable to a different type later',
      'naming a variable clearly makes code easier to read',
      'constants are written in capitals by convention',
      'variable scope decides where a name is visible',
    ];
    const sorting = [
      'bubble sort repeatedly swaps adjacent elements that are out of order',
      'its worst case running time is quadratic in the size of the list',
      'merge sort divides the list in half and sorts each half',
      'merging two sorted halves takes linear time',
      'the overall complexity of merge sort is n log n',
      'quicksort picks a pivot and partitions around it',
      'a bad pivot choice degrades quicksort to quadratic time',
      'sorting algorithms are compared by time and space complexity',
      'a stable sort preserves the order of equal elements',
      'python uses timsort for its built in sort function',
    ];

    const vectors = [...python, ...sorting].map((s) => embedder.embed(s));
    const boundaries = detectBoundaries(vectors, { minBlocksPerSegment: 4 });

    expect(boundaries.length).toBeGreaterThanOrEqual(1);
    const nearest = boundaries.reduce((best, b) =>
      Math.abs(b - 10) < Math.abs(best - 10) ? b : best,
    );
    expect(Math.abs(nearest - 10)).toBeLessThanOrEqual(3);
  });

  it('does not chop up text that stays on one subject', () => {
    const sentences = [
      'a variable is a name that refers to a value in memory',
      'you assign to a variable using the equals sign',
      'python variables do not need a declared type',
      'the type is inferred from the value you assign',
      'you can reassign a variable to a different type later',
      'naming a variable clearly makes code easier to read',
      'constants are written in capitals by convention',
      'variable scope decides where a name is visible',
      'a local variable only exists inside its function',
      'a global variable is visible across the module',
      'shadowing happens when a local name hides a global one',
      'clear variable names reduce the need for comments',
    ];
    const vectors = sentences.map((s) => embedder.embed(s));
    expect(detectBoundaries(vectors).length).toBeLessThanOrEqual(1);
  });
});
