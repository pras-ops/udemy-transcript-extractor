import { describe, it, expect } from 'vitest';
import { BM25Index, tokenize, fuseRankings } from './bm25';

const chunks = [
  { chunkIndex: 0, text: 'Gradient descent updates the weights using the learning rate.' },
  { chunkIndex: 1, text: 'A list comprehension builds a list in a single expression.' },
  { chunkIndex: 2, text: 'Quicksort picks a pivot and partitions the list around it.' },
  { chunkIndex: 3, text: 'The learning rate controls how big each gradient step is.' },
];

function indexOf(options = {}) {
  const index = new BM25Index(options);
  index.add(chunks);
  return index;
}

describe('tokenize', () => {
  it('lowercases and splits on punctuation', () => {
    expect(tokenize('Gradient descent, updates!')).toEqual(['gradient', 'descent', 'updates']);
  });

  it('keeps apostrophes inside words', () => {
    expect(tokenize("don't stop")).toEqual(["don't", 'stop']);
  });

  it('trims leading and trailing punctuation from a word', () => {
    expect(tokenize("--hello-- 'world'")).toEqual(['hello', 'world']);
  });

  it('drops single characters', () => {
    expect(tokenize('a b in the list')).toEqual(['in', 'the', 'list']);
  });

  it('returns nothing for empty input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('!!! ???')).toEqual([]);
  });
});

describe('BM25Index', () => {
  it('reports its size', () => {
    expect(indexOf().size).toBe(4);
  });

  it('ranks the chunk containing the query terms first', () => {
    const hits = indexOf().search('quicksort pivot');
    expect(hits[0].chunkIndex).toBe(2);
  });

  it('finds exact technical terms, which is what lexical scoring is for', () => {
    const hits = indexOf().search('list comprehension');
    expect(hits[0].chunkIndex).toBe(1);
  });

  it('returns several chunks when a term appears in more than one', () => {
    const hits = indexOf().search('learning rate');
    const found = hits.map((h) => h.chunkIndex);
    expect(found).toContain(0);
    expect(found).toContain(3);
  });

  it('never produces a negative score for a matching term', () => {
    // The textbook IDF goes negative for terms in over half the documents,
    // which in a single lecture would penalise common words for matching.
    const index = new BM25Index();
    index.add([
      { chunkIndex: 0, text: 'the list is here' },
      { chunkIndex: 1, text: 'the list is there' },
      { chunkIndex: 2, text: 'the list is everywhere' },
    ]);
    for (const hit of index.search('list')) expect(hit.score).toBeGreaterThan(0);
  });

  it('returns nothing for a query with no matches', () => {
    expect(indexOf().search('zzzz qqqq')).toEqual([]);
  });

  it('returns nothing for an empty query or empty index', () => {
    expect(indexOf().search('')).toEqual([]);
    expect(new BM25Index().search('anything')).toEqual([]);
  });

  it('respects topK', () => {
    expect(indexOf().search('the list', 2)).toHaveLength(2);
  });

  it('orders results by descending score', () => {
    const hits = indexOf().search('learning rate gradient', 4);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
    }
  });

  it('does not let a long chunk win on length alone', () => {
    const index = new BM25Index();
    index.add([
      { chunkIndex: 0, text: 'pivot' },
      { chunkIndex: 1, text: `pivot ${'filler '.repeat(200)}` },
    ]);
    // Length normalisation should favour the concise match.
    expect(index.search('pivot')[0].chunkIndex).toBe(0);
  });

  it('clears', () => {
    const index = indexOf();
    index.clear();
    expect(index.size).toBe(0);
    expect(index.search('pivot')).toEqual([]);
  });
});

describe('fuseRankings', () => {
  it('rewards a chunk that both rankings agree on', () => {
    const lexical = [{ chunkIndex: 5 }, { chunkIndex: 1 }, { chunkIndex: 2 }];
    const dense = [{ chunkIndex: 9 }, { chunkIndex: 5 }, { chunkIndex: 3 }];
    // 5 appears high in both, so it should beat either list's own top pick.
    expect(fuseRankings([lexical, dense])[0].chunkIndex).toBe(5);
  });

  it('keeps results from a single ranking in order', () => {
    const only = [{ chunkIndex: 7 }, { chunkIndex: 8 }];
    expect(fuseRankings([only]).map((h) => h.chunkIndex)).toEqual([7, 8]);
  });

  it('merges without duplicating', () => {
    const a = [{ chunkIndex: 1 }, { chunkIndex: 2 }];
    const b = [{ chunkIndex: 2 }, { chunkIndex: 1 }];
    const out = fuseRankings([a, b]);
    expect(new Set(out.map((h) => h.chunkIndex)).size).toBe(out.length);
  });

  it('respects topK', () => {
    const a = [{ chunkIndex: 1 }, { chunkIndex: 2 }, { chunkIndex: 3 }];
    expect(fuseRankings([a], 2)).toHaveLength(2);
  });

  it('handles empty input', () => {
    expect(fuseRankings([])).toEqual([]);
    expect(fuseRankings([[], []])).toEqual([]);
  });
});
