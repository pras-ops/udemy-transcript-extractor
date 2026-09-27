import { describe, it, expect } from 'vitest';
import {
  centroid,
  isSubstantial,
  selectSentences,
  summarizeExtractive,
} from './extractive-summary';

const v = (...values: number[]) => new Float32Array(values);

/**
 * Two near-duplicates (0 and 1) plus two distinct directions.
 *
 * A lecturer restating the same point is exactly what scores well against a
 * centroid, so this is the shape that separates "most on-topic" from "worth
 * reading".
 */
const REPEATED = [v(1, 0, 0), v(0.99, 0.14, 0), v(0, 1, 0), v(0, 0, 1)];

describe('centroid', () => {
  it('is the mean direction of the set', () => {
    const result = centroid([v(1, 0), v(0, 1)]);
    expect(result).not.toBeNull();
    // Normalised, so both components are 1/sqrt(2).
    expect(result![0]).toBeCloseTo(0.7071, 3);
    expect(result![1]).toBeCloseTo(0.7071, 3);
  });

  it('returns null for an empty set rather than a zero vector', () => {
    // A zero vector would make every sentence equally central.
    expect(centroid([])).toBeNull();
    expect(centroid([new Float32Array(0)])).toBeNull();
  });

  it('survives vectors of differing length', () => {
    expect(() => centroid([v(1, 0, 0), v(1, 0)])).not.toThrow();
  });
});

describe('selectSentences', () => {
  it('returns everything when there is less than a summary', () => {
    expect(selectSentences([v(1, 0), v(0, 1)], { maxSentences: 5 })).toEqual([0, 1]);
  });

  it('returns reading order, not score order', () => {
    // A summary is read top to bottom; sentences pulled out of sequence lose
    // the thread even when each is well chosen.
    const picked = selectSentences(REPEATED, { maxSentences: 3 });
    expect([...picked]).toEqual([...picked].sort((a, b) => a - b));
  });

  it('picks the two most central when diversity is switched off', () => {
    // lambda 1 is pure centrality, and the repeated pair dominates the centroid.
    expect(selectSentences(REPEATED, { maxSentences: 2, lambda: 1 })).toEqual([0, 1]);
  });

  it('avoids near-duplicates once diversity is weighted', () => {
    // The point of MMR here: a lecture repeats itself, and two rewordings of
    // one idea is a worse summary than two different ideas.
    const picked = selectSentences(REPEATED, { maxSentences: 2, lambda: 0.5 });
    expect(picked).toHaveLength(2);
    expect(picked).not.toEqual([0, 1]);
  });

  it('handles degenerate requests', () => {
    expect(selectSentences([], { maxSentences: 3 })).toEqual([]);
    expect(selectSentences(REPEATED, { maxSentences: 0 })).toEqual([]);
  });
});

describe('isSubstantial', () => {
  it('rejects the filler speech is full of', () => {
    for (const filler of ['Right.', 'Okay guys.', 'Correct.', '']) {
      expect(isSubstantial(filler)).toBe(false);
    }
  });

  it('keeps a sentence that carries meaning', () => {
    expect(isSubstantial('A perceptron is a single layer neural network unit.')).toBe(true);
  });
});

describe('summarizeExtractive', () => {
  const sentences = [
    { sentence: 'Right.', startSeconds: 0 },
    { sentence: 'A perceptron is a single layer neural network unit.', startSeconds: 10 },
    { sentence: 'The activation function transforms the output between zero and one.', startSeconds: 20 },
    { sentence: 'We multiply every input by its weight and sum them.', startSeconds: 30 },
  ];

  it('never selects filler, and maps back to the original index', () => {
    const picked = summarizeExtractive(sentences, REPEATED, { maxSentences: 2 });
    expect(picked).toHaveLength(2);
    for (const item of picked) {
      expect(item.index).toBeGreaterThan(0);
      expect(item.text).not.toBe('Right.');
    }
  });

  it('keeps the timestamp each sentence was spoken at', () => {
    // Every line came out of the lecture, so it can point at where.
    const picked = summarizeExtractive(sentences, REPEATED, { maxSentences: 2 });
    for (const item of picked) {
      expect(item.startSeconds).toBe(sentences[item.index].startSeconds);
      expect(item.text).toBe(sentences[item.index].sentence);
    }
  });

  it('returns sentences in the order they were spoken', () => {
    const picked = summarizeExtractive(sentences, REPEATED, { maxSentences: 3 });
    const order = picked.map((item) => item.index);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('returns nothing when there is nothing substantial to say', () => {
    expect(summarizeExtractive([{ sentence: 'Okay.', startSeconds: 0 }], [v(1, 0)])).toEqual([]);
    expect(summarizeExtractive([], [])).toEqual([]);
  });

  it('ignores sentences with no matching vector', () => {
    // A caller that embedded fewer sentences than it passed must not produce
    // an entry backed by someone else's vector.
    const picked = summarizeExtractive(sentences, [v(1, 0, 0), v(0, 1, 0)], { maxSentences: 4 });
    for (const item of picked) expect(item.index).toBeLessThan(2);
  });
});
