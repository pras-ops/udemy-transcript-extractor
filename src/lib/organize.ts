/**
 * Turning a transcript into something that reads like notes.
 *
 * A raw transcript is one undifferentiated wall of speech. Everything needed
 * to give it structure already exists in this codebase and was only ever used
 * for search: segmentation finds where the topic changes, and keyphrase
 * extraction says what each stretch is about. Put together, they produce a
 * document with headings, time ranges and paragraphs — the shape a person
 * actually revises from.
 *
 * Nothing here is generated. Every word is the lecturer's; the only additions
 * are the headings, and those are phrases lifted from the section they title.
 * So this works on every machine, and it cannot state something the lecture
 * did not.
 */

import { formatTimestamp } from './transcript';

export interface OrganizedSection {
  index: number;
  title: string;
  startSeconds: number | null;
  endSeconds: number | null;
  paragraphs: { startSeconds: number | null; text: string }[];
}

/** Sentence case: a heading, not a shouted label. */
function sentenceCase(phrase: string): string {
  const trimmed = phrase.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Name a section from the phrases that characterise it.
 *
 * One phrase, not several joined: "Perceptron and weights and activation"
 * reads like a search query, while "Perceptron" reads like a heading. A second
 * phrase is only added when the first is very short, where it would otherwise
 * be too vague to distinguish one section from the next.
 *
 * Falls back to a positional name rather than inventing a topic — a wrong
 * heading is worse than a dull one, because it tells the reader the section is
 * about something it is not.
 */
export function titleFromPhrases(phrases: string[], position: number): string {
  const usable = phrases.map((p) => p.trim()).filter(Boolean);
  if (usable.length === 0) return `Part ${position}`;

  const first = usable[0];
  if (first.split(/\s+/).length >= 2 || usable.length === 1) return sentenceCase(first);

  // The lead phrase is a single short word; pair it with the next distinct one.
  const second = usable.find((p) => p !== first && !p.includes(first) && !first.includes(p));
  return sentenceCase(second ? `${first}, ${second}` : first);
}

/** `00:00 – 02:14`, or just the start when nothing bounds the end. */
export function timeRange(startSeconds: number | null, endSeconds: number | null): string | null {
  if (startSeconds === null) return null;
  const start = formatTimestamp(startSeconds);
  if (endSeconds === null || endSeconds <= startSeconds) return start;
  return `${start} – ${formatTimestamp(endSeconds)}`;
}

export interface OrganizeMeta {
  title?: string;
  courseTitle?: string;
  instructor?: string;
  url?: string;
  savedAt?: string;
}

/**
 * Render organised sections as markdown.
 *
 * Timestamps are plain text, as everywhere else in this codebase: a document
 * gets pasted into notes apps and into model context, and a wrapped URL on
 * every heading is noise in both.
 */
export function buildOrganizedMarkdown(
  sections: OrganizedSection[],
  meta: OrganizeMeta = {},
): string {
  const head: string[] = [`# ${meta.title || 'Lecture notes'}`];

  const fields: string[] = [];
  if (meta.courseTitle && meta.courseTitle !== meta.title) {
    fields.push(`**Course:** ${meta.courseTitle}`);
  }
  if (meta.instructor) fields.push(`**Instructor:** ${meta.instructor}`);
  if (meta.url) fields.push(`**Source:** ${meta.url}`);
  if (meta.savedAt) fields.push(`**Saved:** ${meta.savedAt}`);
  if (fields.length > 0) head.push(fields.join('\n'));

  // A contents list is what makes a long lecture navigable at a glance, but on
  // two or three sections it is longer than the thing it indexes.
  if (sections.length > 2) {
    head.push(
      ['## Contents', sections.map((s) => `${s.index + 1}. ${s.title}`).join('\n')].join('\n\n'),
    );
  }

  const body = sections.flatMap((section) => {
    const range = timeRange(section.startSeconds, section.endSeconds);
    const heading = `## ${section.index + 1}. ${section.title}`;
    const blocks = range ? [heading, `*${range}*`] : [heading];
    return [...blocks, ...section.paragraphs.map((p) => p.text)];
  });

  return [...head, ...body].join('\n\n').trim() + '\n';
}

/**
 * Group paragraphs into sections by the clock.
 *
 * Section boundaries come from chunk positions and paragraphs are built from
 * cues, so the two do not share an index. Time is the axis both carry.
 *
 * A paragraph with no timestamp joins whichever section is open, rather than
 * being dropped — losing the lecturer's words to a missing timestamp would be
 * a worse outcome than putting them a section early.
 */
export function assignParagraphs(
  boundaries: { index: number; startSeconds: number | null; endSeconds: number | null }[],
  paragraphs: { startSeconds: number | null; text: string }[],
  titleOf: (index: number) => string,
): OrganizedSection[] {
  if (boundaries.length === 0) {
    if (paragraphs.length === 0) return [];
    return [
      {
        index: 0,
        title: titleOf(0),
        startSeconds: paragraphs[0]?.startSeconds ?? null,
        endSeconds: null,
        paragraphs,
      },
    ];
  }

  const sections: OrganizedSection[] = boundaries.map((boundary) => ({
    index: boundary.index,
    title: titleOf(boundary.index),
    startSeconds: boundary.startSeconds,
    endSeconds: boundary.endSeconds,
    paragraphs: [],
  }));

  let current = 0;
  for (const paragraph of paragraphs) {
    if (paragraph.startSeconds !== null) {
      // Advance while the next section has already begun.
      while (
        current + 1 < sections.length &&
        sections[current + 1].startSeconds !== null &&
        paragraph.startSeconds >= (sections[current + 1].startSeconds as number)
      ) {
        current += 1;
      }
    }
    sections[current].paragraphs.push(paragraph);
  }

  // An empty section is a boundary the paragraphs did not agree with; keeping
  // it would put a heading over nothing.
  return sections
    .filter((section) => section.paragraphs.length > 0)
    .map((section, position) => ({ ...section, index: position }));
}
