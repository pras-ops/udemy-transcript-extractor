import { describe, it, expect } from 'vitest';
import {
  normalize,
  dot,
  cosineSimilarity,
  rankChunks,
  bestSnippet,
  confidenceLabel,
  DEFAULT_RANK_OPTIONS,
} from './semantic-search';

const vec = (...values: number[]) => new Float32Array(values);
const unit = (...values: number[]) => normalize(vec(...values));

describe('normalize', () => {
  it('produces a unit vector', () => {
    const out = normalize(vec(3, 4));
    expect(out[0]).toBeCloseTo(0.6, 6);
    expect(out[1]).toBeCloseTo(0.8, 6);
    expect(Math.hypot(out[0], out[1])).toBeCloseTo(1, 6);
  });

  it('returns zeros for a zero vector instead of NaN', () => {
    const out = normalize(vec(0, 0, 0));
    expect([...out]).toEqual([0, 0, 0]);
    expect(out.some(Number.isNaN)).toBe(false);
  });

  it('leaves an already-normalised vector unchanged', () => {
    const out = normalize(vec(1, 0, 0));
    expect([...out]).toEqual([1, 0, 0]);
  });
});

describe('dot / cosineSimilarity', () => {
  it('scores identical directions at 1 and opposite at -1', () => {
    expect(cosineSimilarity(vec(1, 2, 3), vec(1, 2, 3))).toBeCloseTo(1, 6);
    expect(cosineSimilarity(vec(1, 0), vec(-1, 0))).toBeCloseTo(-1, 6);
  });

  it('scores orthogonal vectors at 0', () => {
    expect(cosineSimilarity(vec(1, 0), vec(0, 1))).toBeCloseTo(0, 6);
  });

  it('ignores magnitude', () => {
    expect(cosineSimilarity(vec(1, 1), vec(50, 50))).toBeCloseTo(1, 6);
  });

  it('throws on mismatched lengths rather than scoring nonsense', () => {
    expect(() => dot(vec(1, 2), vec(1, 2, 3))).toThrow(/mismatch/i);
  });
});

describe('rankChunks', () => {
  // Four distinct directions, plus one near-duplicate of the first.
  const chunks = [
    unit(1, 0, 0, 0), // 0 — matches query
    unit(0.99, 0.14, 0, 0), // 1 — near-duplicate of 0
    unit(0, 1, 0, 0), // 2 — different topic
    unit(0, 0, 1, 0), // 3 — different topic
    unit(0, 0, 0, 1), // 4 — different topic
  ];

  it('returns nothing when there are no chunks', () => {
    expect(rankChunks(unit(1, 0, 0, 0), [])).toEqual([]);
  });

  it('ranks the closest chunk first', () => {
    const hits = rankChunks(unit(1, 0, 0, 0), chunks, { diversity: 1 });
    expect(hits[0].chunkIndex).toBe(0);
    expect(hits[0].score).toBeCloseTo(1, 5);
  });

  it('filters out everything below minScore', () => {
    // A query orthogonal to every chunk should yield no hits at all, rather
    // than three confident-looking irrelevant ones.
    const hits = rankChunks(unit(0, 0, 0, 0.0001), [unit(1, 0, 0, 0), unit(0, 1, 0, 0)]);
    expect(hits).toEqual([]);
  });

  it('respects topK', () => {
    const hits = rankChunks(unit(1, 1, 1, 1), chunks, { topK: 2, minScore: 0 });
    expect(hits).toHaveLength(2);
  });

  describe('overlap suppression', () => {
    // The real situation this guards: two chunks that overlap in the source
    // (0 and 1 are near-identical) plus a third covering different ground.
    // The query deliberately matches no chunk exactly — when it equals one
    // chunk, relevance and redundancy become the same number for every
    // candidate and MMR has nothing to trade off.
    const query = unit(0.9, 0.3, 0.1, 0);
    const overlapping = [
      unit(1, 0, 0, 0), // 0
      unit(0.99, 0.14, 0, 0), // 1 — near-duplicate of 0
      unit(0.6, 0.8, 0, 0), // 2 — genuinely different material
    ];

    it('drops a near-duplicate in favour of different material', () => {
      const hits = rankChunks(query, overlapping, { topK: 2, minScore: 0, diversity: 0.5 });
      const picked = hits.map((h) => h.chunkIndex).sort();
      expect(picked).not.toEqual([0, 1]);
      expect(picked).toContain(2);
    });

    it('keeps both near-duplicates when diversity is disabled', () => {
      const hits = rankChunks(query, overlapping, { topK: 2, minScore: 0, diversity: 1 });
      expect(hits.map((h) => h.chunkIndex).sort()).toEqual([0, 1]);
    });

    it('breaks an exact tie toward the less redundant candidate', () => {
      // With the query sitting exactly on chunk 0, every candidate scores the
      // same under MMR; the tie-break must still not return the duplicate.
      const hits = rankChunks(unit(1, 0, 0, 0), overlapping, {
        topK: 2,
        minScore: 0,
        diversity: 0.5,
      });
      expect(hits.map((h) => h.chunkIndex).sort()).not.toEqual([0, 1]);
    });
  });

  it('returns results in descending score order', () => {
    const hits = rankChunks(unit(1, 0.5, 0.2, 0), chunks, { topK: 5, minScore: 0 });
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
    }
  });

  it('never returns the same chunk twice', () => {
    const hits = rankChunks(unit(1, 1, 0, 0), chunks, { topK: 5, minScore: 0, diversity: 0.6 });
    expect(new Set(hits.map((h) => h.chunkIndex)).size).toBe(hits.length);
  });

  it('cannot return more hits than there are chunks', () => {
    const hits = rankChunks(unit(1, 0, 0, 0), chunks.slice(0, 2), { topK: 10, minScore: 0 });
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it('uses a sensible default floor', () => {
    expect(DEFAULT_RANK_OPTIONS.minScore).toBeGreaterThan(0);
    expect(DEFAULT_RANK_OPTIONS.topK).toBeGreaterThan(0);
  });
});

describe('bestSnippet', () => {
  const chunk =
    'We begin with the chain rule. The gradient tells you which direction increases the loss. ' +
    'Then we take a small step the other way.';

  it('picks the sentence sharing the most query terms', () => {
    expect(bestSnippet(chunk, 'what is the gradient')).toContain('gradient');
  });

  it('falls back to the first sentence when nothing overlaps', () => {
    expect(bestSnippet(chunk, 'zzzz qqqq')).toContain('chain rule');
  });

  it('truncates with an ellipsis', () => {
    const long = 'a'.repeat(500);
    const out = bestSnippet(long, 'a', 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith('…')).toBe(true);
  });

  it('handles an empty chunk without throwing', () => {
    expect(() => bestSnippet('', 'query')).not.toThrow();
  });
});

describe('confidenceLabel', () => {
  it('maps scores to words rather than false precision', () => {
    expect(confidenceLabel(0.8)).toBe('strong');
    expect(confidenceLabel(0.4)).toBe('likely');
    expect(confidenceLabel(0.26)).toBe('weak');
  });
});
