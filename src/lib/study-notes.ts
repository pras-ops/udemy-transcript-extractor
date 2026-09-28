/**
 * A lecture written out as study notes.
 *
 * The exports in `extension-service` all take a transcript string, because that
 * is all the popup has. The dashboard has more: passages the reader marked,
 * notes they wrote against a moment, and text an on-device model read off the
 * frames they captured. None of that survives a transcript-shaped export, so
 * until now it stayed in IndexedDB — which made the reader a place to do work
 * you could not take away with you.
 *
 * The document is Markdown because that is what the notes apps people asked
 * about read: Obsidian, Notion, Logseq. It uses `==marks==` for highlights,
 * which Obsidian renders and everything else leaves as legible punctuation.
 */

import {
  anchoredIn,
  cleanCues,
  formatTimestamp,
  parseTranscript,
  readingBlocks,
  type Block,
  type ReadingMode,
} from './transcript';

export interface StudyHighlight {
  seconds?: number;
  text: string;
  /** What the reader made of the passage, when they wrote it down. */
  note?: string;
}

export interface StudyNote {
  seconds?: number;
  body: string;
}

export interface StudyScreenshot {
  seconds: number;
  /** What an on-device model read off the frame, when it has been read. */
  readout?: string;
}

export interface StudyLecture {
  title: string;
  url?: string;
  /** The stored transcript, in the `[MM:SS] text` shape the extractors emit. */
  transcript: string;
  highlights?: StudyHighlight[];
  notes?: StudyNote[];
  screenshots?: StudyScreenshot[];
}

export interface StudyOptions {
  courseTitle?: string;
  instructor?: string;
  /** Paragraphs by default, matching how the dashboard reads a transcript. */
  mode?: ReadingMode;
  /**
   * Whether to write the transcript out at all.
   *
   * Off gives the digest alone — what you marked and what you wrote, with no
   * three thousand words of lecture around it. That is the form worth keeping
   * in a notes vault, and it is the one people asked for.
   */
  includeTranscript?: boolean;
}

/**
 * A bold `**[12:34]**` lead-in, or nothing.
 *
 * Nothing, rather than an empty pair of marks, for anything never anchored to a
 * moment: `**** text` is not bold, it is four literal asterisks.
 */
function lead(seconds: number | undefined | null): string {
  return seconds === undefined || seconds === null ? '' : `**[${formatTimestamp(seconds)}]** `;
}

/**
 * Mark the highlighted passages inside a paragraph.
 *
 * A highlight is stored as the text that was selected, so it is usually found
 * verbatim in the paragraph it came from. Where it is not — the reader
 * highlighted across a paragraph boundary, or the transcript was re-extracted
 * and the wording moved — the passage is simply left unmarked rather than
 * guessed at. It still appears in the digest above, so nothing is lost.
 *
 * Longest first, so marking a short highlight cannot land inside the marks of
 * a longer one that contains it and produce nested `==` that renders as
 * literal equals signs.
 */
function mark(text: string, highlights: StudyHighlight[]): string {
  // Segments alternate between searchable and already marked. Replacing on the
  // whole string instead lets a short highlight match inside a longer one that
  // has already been marked, producing `==follows ==the slope== downhill==`.
  let segments: { text: string; marked: boolean }[] = [{ text, marked: false }];

  for (const highlight of [...highlights].sort((a, b) => b.text.length - a.text.length)) {
    const passage = highlight.text.trim();
    if (!passage) continue;

    const next: typeof segments = [];
    let placed = false;

    for (const segment of segments) {
      const at = segment.marked || placed ? -1 : segment.text.indexOf(passage);
      if (at === -1) {
        next.push(segment);
        continue;
      }

      // One highlight marks one passage, so the first occurrence is enough.
      if (at > 0) next.push({ text: segment.text.slice(0, at), marked: false });
      next.push({ text: passage, marked: true });

      const rest = segment.text.slice(at + passage.length);
      if (rest) next.push({ text: rest, marked: false });
      placed = true;
    }

    segments = next;
  }

  return segments.map((part) => (part.marked ? `==${part.text}==` : part.text)).join('');
}

/**
 * Everything the reader produced, in the order they met it.
 *
 * This is the part that is worth reading on its own. Notes and highlights are
 * merged rather than listed separately, because they were made in one pass
 * through the lecture and splitting them by type scatters a single train of
 * thought across two lists.
 *
 * Items with no moment sort to the end: they are real, but there is nowhere in
 * the lecture to put them.
 */
function digest(lecture: StudyLecture): string[] {
  const entries: { seconds?: number; line: string }[] = [];

  for (const note of lecture.notes ?? []) {
    const body = note.body.trim();
    if (body) entries.push({ seconds: note.seconds, line: `- ${lead(note.seconds)}${body}` });
  }

  for (const highlight of lecture.highlights ?? []) {
    const passage = highlight.text.trim();
    if (!passage) continue;

    // Quoted inline rather than as a blockquote: a `>` inside a list item is
    // parsed inconsistently, and the reader's own note hangs off it as a
    // sub-bullet so the quote and the thought stay one entry.
    const said = `- ${lead(highlight.seconds)}“${passage}”`;
    const thought = highlight.note?.trim();
    entries.push({
      seconds: highlight.seconds,
      line: thought ? `${said}\n  - ${thought}` : said,
    });
  }

  return entries
    .sort((a, b) => (a.seconds ?? Number.MAX_SAFE_INTEGER) - (b.seconds ?? Number.MAX_SAFE_INTEGER))
    .map((entry) => entry.line);
}

/**
 * What was on screen during a block, as text rather than an image.
 *
 * Fenced so indentation survives, which is the whole reason a code frame was
 * worth reading in the first place. An unread frame contributes nothing: there
 * is no image in this document to caption.
 */
function onScreen(shots: StudyScreenshot[]): string[] {
  return shots
    .filter((shot) => shot.readout?.trim())
    .map(
      (shot) =>
        `*On screen at ${formatTimestamp(shot.seconds)}:*\n\n\`\`\`\n${shot.readout!.trim()}\n\`\`\``,
    );
}

/** One block of transcript, with whatever the reader attached to it. */
function blockSection(
  block: Block,
  lecture: StudyLecture,
  highlights: StudyHighlight[],
): string[] {
  const parts: string[] = [`${lead(block.startSeconds)}${mark(block.text, highlights)}`];

  for (const note of anchoredIn(lecture.notes ?? [], (n) => n.seconds, block)) {
    const body = note.body.trim();
    if (!body) continue;

    // The note's own moment, not the block's: a paragraph is a minute of
    // speech, and the reader wrote this against a point inside it.
    const at = note.seconds === undefined ? '' : ` ${formatTimestamp(note.seconds)}`;
    parts.push(`> **Note${at}:** ${body}`);
  }

  parts.push(...onScreen(anchoredIn(lecture.screenshots ?? [], (s) => s.seconds, block)));

  return parts;
}

/**
 * Write a lecture out as a study document.
 *
 * Empty sections are omitted rather than written as headings with nothing under
 * them — a file that says "Highlights" above blank space reads as a bug.
 */
export function buildStudyNotes(lecture: StudyLecture, options: StudyOptions = {}): string {
  const { courseTitle, instructor, mode = 'paragraphs', includeTranscript = true } = options;

  const out: string[] = [`# ${lecture.title || 'Untitled lecture'}`];

  const provenance = [courseTitle, instructor].filter(Boolean).join(' · ');
  if (provenance) out.push(`*${provenance}*`);
  if (lecture.url) out.push(`[Open the lecture](${lecture.url})`);

  const marked = digest(lecture);
  if (marked.length > 0) {
    out.push('## What you marked', marked.join('\n'));
  }

  if (includeTranscript) {
    const blocks = readingBlocks(cleanCues(parseTranscript(lecture.transcript)), mode);

    if (blocks.length > 0) {
      out.push('## Transcript');
      for (const block of blocks) {
        const inside = anchoredIn(lecture.highlights ?? [], (h) => h.seconds, block);
        out.push(...blockSection(block, lecture, inside));
      }
    }
  }

  return `${out.join('\n\n')}\n`;
}

/**
 * Several lectures as one document.
 *
 * Each keeps its own heading level below the course, because timestamps restart
 * at zero in every video — a flat merge would produce a file full of `00:00`
 * with nothing to say which lecture each belonged to.
 */
export function buildCourseStudyNotes(
  lectures: StudyLecture[],
  options: StudyOptions & { title?: string } = {},
): string {
  const { title, ...rest } = options;
  const heading = title?.trim() || rest.courseTitle?.trim() || 'Course notes';

  const body = lectures
    .map((lecture) => buildStudyNotes(lecture, { ...rest, courseTitle: undefined }))
    // Each lecture's own `#` becomes `##` so the course keeps the top level.
    .map((document) => document.replace(/^#/gm, '##').trim());

  const provenance = [rest.courseTitle, rest.instructor].filter(Boolean).join(' · ');

  return [`# ${heading}`, ...(provenance ? [`*${provenance}*`] : []), ...body].join('\n\n') + '\n';
}
