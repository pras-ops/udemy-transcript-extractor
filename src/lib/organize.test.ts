import { describe, it, expect } from 'vitest';
import {
  assignParagraphs,
  buildOrganizedMarkdown,
  timeRange,
  titleFromPhrases,
  type OrganizedSection,
} from './organize';

describe('titleFromPhrases', () => {
  it('names a section after the phrase that characterises it', () => {
    expect(titleFromPhrases(['perceptron basics'], 1)).toBe('Perceptron basics');
  });

  it('pairs a one-word lead with the next distinct phrase', () => {
    // "Weights" alone does not distinguish one section from the next.
    expect(titleFromPhrases(['weights', 'activation function'], 1)).toBe(
      'Weights, activation function',
    );
  });

  it('does not pair a phrase with a restatement of itself', () => {
    expect(titleFromPhrases(['bias', 'bias term'], 1)).toBe('Bias');
  });

  it('falls back to a positional name rather than inventing a topic', () => {
    // A wrong heading is worse than a dull one: it tells the reader the
    // section is about something it is not.
    expect(titleFromPhrases([], 3)).toBe('Part 3');
    expect(titleFromPhrases(['  ', ''], 2)).toBe('Part 2');
  });
});

describe('timeRange', () => {
  it('renders a span', () => {
    expect(timeRange(0, 134)).toBe('00:00 – 02:14');
  });

  it('renders just the start when nothing bounds the end', () => {
    expect(timeRange(0, null)).toBe('00:00');
    expect(timeRange(100, 50)).toBe('01:40');
  });

  it('is absent when the section has no clock', () => {
    expect(timeRange(null, 100)).toBeNull();
  });
});

describe('assignParagraphs', () => {
  const title = (index: number) => `Section ${index + 1}`;

  it('buckets paragraphs into the section that was running', () => {
    const sections = assignParagraphs(
      [
        { index: 0, startSeconds: 0, endSeconds: 99 },
        { index: 1, startSeconds: 100, endSeconds: null },
      ],
      [
        { startSeconds: 0, text: 'first' },
        { startSeconds: 50, text: 'second' },
        { startSeconds: 150, text: 'third' },
      ],
      title,
    );

    expect(sections).toHaveLength(2);
    expect(sections[0].paragraphs.map((p) => p.text)).toEqual(['first', 'second']);
    expect(sections[1].paragraphs.map((p) => p.text)).toEqual(['third']);
  });

  it('keeps a paragraph that carries no timestamp', () => {
    // Losing the lecturer's words to a missing timestamp is worse than
    // placing them a section early.
    const sections = assignParagraphs(
      [
        { index: 0, startSeconds: 0, endSeconds: 99 },
        { index: 1, startSeconds: 100, endSeconds: null },
      ],
      [
        { startSeconds: 0, text: 'first' },
        { startSeconds: null, text: 'untimed' },
      ],
      title,
    );

    expect(sections[0].paragraphs.map((p) => p.text)).toEqual(['first', 'untimed']);
  });

  it('drops sections the paragraphs never reached, and renumbers', () => {
    // A heading over nothing is a boundary the content did not agree with.
    const sections = assignParagraphs(
      [
        { index: 0, startSeconds: 0, endSeconds: 49 },
        { index: 1, startSeconds: 50, endSeconds: 99 },
        { index: 2, startSeconds: 100, endSeconds: null },
      ],
      [{ startSeconds: 0, text: 'only' }],
      title,
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].index).toBe(0);
  });

  it('makes one section when there are no boundaries at all', () => {
    const sections = assignParagraphs([], [{ startSeconds: 7, text: 'body' }], title);
    expect(sections).toHaveLength(1);
    expect(sections[0].startSeconds).toBe(7);
  });

  it('returns nothing for an empty transcript', () => {
    expect(assignParagraphs([], [], title)).toEqual([]);
  });
});

describe('buildOrganizedMarkdown', () => {
  const section = (index: number, title: string): OrganizedSection => ({
    index,
    title,
    startSeconds: index * 100,
    endSeconds: index * 100 + 99,
    paragraphs: [{ startSeconds: index * 100, text: `Body of ${title}.` }],
  });

  it('writes headings with their time range', () => {
    const out = buildOrganizedMarkdown([section(0, 'Perceptron')], { title: 'Lecture 3' });
    expect(out).toMatch(/^# Lecture 3/);
    expect(out).toContain('## 1. Perceptron');
    expect(out).toContain('*00:00 – 01:39*');
    expect(out).toContain('Body of Perceptron.');
  });

  it('adds a contents list only when it is worth having', () => {
    const two = buildOrganizedMarkdown([section(0, 'A'), section(1, 'B')], {});
    expect(two).not.toContain('## Contents');

    const four = [0, 1, 2, 3].map((i) => section(i, `S${i}`));
    expect(buildOrganizedMarkdown(four, {})).toContain('## Contents');
  });

  it('carries source metadata', () => {
    const out = buildOrganizedMarkdown([section(0, 'A')], {
      courseTitle: 'ML 101',
      instructor: 'Ada',
      url: 'https://example.com/x',
      savedAt: 'today',
    });
    expect(out).toContain('**Course:** ML 101');
    expect(out).toContain('**Instructor:** Ada');
    expect(out).toContain('**Saved:** today');
  });

  it('shows times as plain text, never as links', () => {
    const out = buildOrganizedMarkdown([section(0, 'A')], { url: 'https://example.com/x' });
    expect(out).not.toMatch(/\[\d{2}:\d{2}[^\]]*\]\(http/);
  });

  it('leaves no blank-line gaps', () => {
    expect(buildOrganizedMarkdown([section(0, 'A'), section(1, 'B')], {})).not.toMatch(/\n{3,}/);
  });

  it('handles having nothing to organise', () => {
    expect(buildOrganizedMarkdown([], { title: 'Empty' })).toContain('# Empty');
  });
});
