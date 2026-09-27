import { describe, it, expect } from 'vitest';
import {
  extractDefinitions,
  sentencesFromCues,
  toClozeCard,
  buildClozeCards,
  type Definition,
} from './definitions';
import type { Cue } from './transcript';

const cue = (startSeconds: number | null, text: string): Cue => ({ startSeconds, text });

describe('sentencesFromCues', () => {
  it('rebuilds a sentence split across cues', () => {
    // The case that matters: captions break mid-sentence, so matching on
    // individual cues would miss almost every definition.
    const out = sentencesFromCues([
      cue(0, 'gradient descent is an'),
      cue(2, 'algorithm for minimising loss.'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].sentence).toBe('gradient descent is an algorithm for minimising loss.');
  });

  it('keeps the timestamp of the cue the sentence started in', () => {
    const out = sentencesFromCues([
      cue(10, 'a variable is a name'),
      cue(12, 'for a value.'),
    ]);
    expect(out[0].startSeconds).toBe(10);
  });

  it('splits multiple sentences inside one cue', () => {
    const out = sentencesFromCues([cue(0, 'First one. Second one. Third one.')]);
    expect(out.map((s) => s.sentence)).toEqual(['First one.', 'Second one.', 'Third one.']);
  });

  it('keeps a trailing fragment that never terminates', () => {
    const out = sentencesFromCues([cue(0, 'no full stop here')]);
    expect(out).toHaveLength(1);
    expect(out[0].sentence).toBe('no full stop here');
  });

  it('handles empty input', () => {
    expect(sentencesFromCues([])).toEqual([]);
  });
});

describe('extractDefinitions', () => {
  const from = (text: string, seconds = 0) => extractDefinitions([cue(seconds, text)]);

  it('matches "X is a Y"', () => {
    const [definition] = from('gradient descent is an algorithm that minimises the loss.');
    expect(definition.term).toBe('gradient descent');
    expect(definition.pattern).toBe('is-a');
  });

  it('matches "X is defined as"', () => {
    const [definition] = from('the learning rate is defined as the size of each step taken.');
    expect(definition.term).toBe('learning rate');
    expect(definition.pattern).toBe('defined-as');
  });

  it('matches "X refers to"', () => {
    const [definition] = from('backpropagation refers to the way gradients flow backwards.');
    expect(definition.term).toBe('backpropagation');
  });

  it('matches "X means"', () => {
    const [definition] = from('overfitting means the model memorised the training data.');
    expect(definition.term).toBe('overfitting');
  });

  it('strips a leading article from the term', () => {
    const [definition] = from('the loss function is a measure of how wrong we are.');
    expect(definition.term).toBe('loss function');
  });

  it('rejects a pronoun subject', () => {
    // "it is a function" gives a term that means nothing on a card.
    expect(from('it is a function that we will use later on here.')).toEqual([]);
  });

  it('rejects generic nouns that make useless cards', () => {
    expect(from('the idea is a simple one that we will build on later.')).toEqual([]);
  });

  it('rejects a term longer than four words', () => {
    expect(
      from('the thing we are going to talk about next is a really important one.'),
    ).toEqual([]);
  });

  it('keeps only the first definition of a term', () => {
    const found = extractDefinitions([
      cue(0, 'a pivot is an element used to partition the list.'),
      cue(30, 'a pivot is a chosen value in quicksort partitioning.'),
    ]);
    expect(found.filter((d) => d.term === 'pivot')).toHaveLength(1);
    expect(found[0].startSeconds).toBe(0);
  });

  it('ignores sentences that are too short or too long', () => {
    expect(from('x is a y.')).toEqual([]);
    expect(from(`${'a very long clause '.repeat(30)} thing is a concept.`)).toEqual([]);
  });

  it('respects the cap', () => {
    const cues = Array.from({ length: 50 }, (_, i) =>
      cue(i, `concept${i} is an important idea in this particular lecture.`),
    );
    expect(extractDefinitions(cues, { maxDefinitions: 5 }).length).toBeLessThanOrEqual(5);
  });

  it('does not treat narration as a definition', () => {
    // "X is going to" matches the bare "X is a" frame and would otherwise
    // yield a confident-looking term from a sentence that defines nothing.
    expect(from('the network is going to the next layer after this step.')).toEqual([]);
    expect(from('these values are just the numbers we computed a moment ago.')).toEqual([]);
  });

  it('returns nothing for text with no definitions', () => {
    expect(from('so now we are going to open the editor and start typing.')).toEqual([]);
  });
});

describe('toClozeCard', () => {
  const definition: Definition = {
    term: 'gradient descent',
    sentence: 'Gradient descent is an algorithm that minimises the loss.',
    startSeconds: 65,
    pattern: 'is-a',
  };

  it('blanks the term out of the sentence', () => {
    const card = toClozeCard(definition)!;
    expect(card.front).toBe('_____ is an algorithm that minimises the loss.');
    expect(card.back).toBe('gradient descent');
  });

  it('carries a formatted timestamp', () => {
    expect(toClozeCard(definition)!.timestamp).toBe('01:05');
  });

  it('matches the term case-insensitively', () => {
    const card = toClozeCard({ ...definition, term: 'GRADIENT DESCENT' })!;
    expect(card.front.startsWith('_____')).toBe(true);
  });

  it('only blanks whole words', () => {
    // "rate" must not blank the middle of "generated".
    const card = toClozeCard({
      term: 'rate',
      sentence: 'The rate is generated from the configured schedule value.',
      startSeconds: 0,
      pattern: 'is-a',
    })!;
    expect(card.front).toContain('generated');
    expect(card.front).toContain('_____');
  });

  it('returns null when the term is not in the sentence', () => {
    expect(toClozeCard({ ...definition, term: 'absent phrase' })).toBeNull();
  });

  it('returns null when blanking leaves no question', () => {
    expect(
      toClozeCard({ term: 'a pivot', sentence: 'A pivot is it.', startSeconds: 0, pattern: 'is-a' }),
    ).toBeNull();
  });
});

describe('buildClozeCards', () => {
  it('makes a card per usable definition', () => {
    const definitions = extractDefinitions([
      cue(0, 'gradient descent is an algorithm that minimises the loss function.'),
      cue(40, 'the learning rate is defined as the size of each step we take.'),
    ]);
    const cards = buildClozeCards(definitions);
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.front).toContain('_____');
      expect(card.back.length).toBeGreaterThan(2);
    }
  });

  it('drops definitions that cannot produce a card', () => {
    expect(
      buildClozeCards([
        { term: 'missing', sentence: 'Nothing matches here at all.', startSeconds: 0, pattern: 'is-a' },
      ]),
    ).toEqual([]);
  });

  it('handles empty input', () => {
    expect(buildClozeCards([])).toEqual([]);
  });
});
