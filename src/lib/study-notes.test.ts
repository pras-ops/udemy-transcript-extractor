import { describe, it, expect } from 'vitest';
import { buildStudyNotes, buildCourseStudyNotes, type StudyLecture } from './study-notes';

/** Enough cues to make `groupIntoParagraphs` produce more than one paragraph. */
function transcript(...lines: [string, string][]): string {
  return lines.map(([at, text]) => `[${at}] ${text}`).join('\n\n');
}

const LECTURE: StudyLecture = {
  title: 'Gradient descent',
  url: 'https://www.udemy.com/course/x/learn/lecture/42',
  transcript: transcript(
    ['00:00', 'Welcome back to the course.'],
    ['00:12', 'Gradient descent follows the slope downhill.'],
    ['00:24', 'We compute a derivative and take a step.'],
  ),
};

describe('buildStudyNotes', () => {
  it('writes a lecture with nothing marked as a plain transcript', () => {
    const notes = buildStudyNotes(LECTURE);

    expect(notes).toContain('# Gradient descent');
    expect(notes).toContain('## Transcript');
    expect(notes).toContain('Gradient descent follows the slope downhill.');
  });

  it('omits a section rather than writing a heading over nothing', () => {
    // A file that says "What you marked" above blank space reads as a bug.
    expect(buildStudyNotes(LECTURE)).not.toContain('## What you marked');
  });

  it('carries the reader’s own work, which no transcript export could', () => {
    // The whole reason this module exists: highlights, notes and frame
    // readouts had no way out of IndexedDB.
    const notes = buildStudyNotes(
      {
        ...LECTURE,
        highlights: [{ seconds: 12, text: 'follows the slope downhill', note: 'the key idea' }],
        notes: [{ seconds: 24, body: 'derivative = direction of steepest ascent' }],
        screenshots: [{ seconds: 24, readout: 'w = w - lr * grad' }],
      },
      { courseTitle: 'Deep Learning', instructor: 'A. Teacher' },
    );

    expect(notes).toContain('## What you marked');
    expect(notes).toContain('derivative = direction of steepest ascent');
    expect(notes).toContain('the key idea');
    expect(notes).toContain('*Deep Learning · A. Teacher*');
    expect(notes).toContain('[Open the lecture](https://www.udemy.com/course/x/learn/lecture/42)');
    // Fenced so indentation survives, which is why a code frame was read at all.
    expect(notes).toContain('```\nw = w - lr * grad\n```');
  });

  it('orders what you marked by when you met it, notes and highlights together', () => {
    // They were made in one pass through the lecture; splitting them by type
    // scatters a single train of thought across two lists.
    const notes = buildStudyNotes({
      ...LECTURE,
      notes: [{ seconds: 24, body: 'SECOND' }],
      highlights: [{ seconds: 12, text: 'FIRST' }],
    });

    const digest = notes.slice(notes.indexOf('## What you marked'), notes.indexOf('## Transcript'));
    expect(digest.indexOf('FIRST')).toBeLessThan(digest.indexOf('SECOND'));
  });

  it('sorts anything never anchored to a moment to the end', () => {
    const notes = buildStudyNotes({
      ...LECTURE,
      notes: [{ body: 'UNANCHORED' }, { seconds: 24, body: 'ANCHORED' }],
    });

    expect(notes.indexOf('ANCHORED')).toBeLessThan(notes.indexOf('UNANCHORED'));
  });

  it('never emits an empty pair of emphasis marks for an unanchored note', () => {
    // `**** text` is not bold, it is four literal asterisks.
    expect(buildStudyNotes({ ...LECTURE, notes: [{ body: 'no moment' }] })).not.toContain('****');
  });

  it('marks a highlighted passage where it sits in the transcript', () => {
    const notes = buildStudyNotes({
      ...LECTURE,
      highlights: [{ seconds: 12, text: 'follows the slope downhill' }],
    });

    expect(notes).toContain('==follows the slope downhill==');
  });

  it('leaves a highlight unmarked rather than guessing when it does not match', () => {
    // Re-extraction can move the wording. The passage is still in the digest,
    // so nothing is lost by declining to guess where it went.
    const notes = buildStudyNotes({
      ...LECTURE,
      highlights: [{ seconds: 12, text: 'wording that is no longer in the transcript' }],
    });

    expect(notes).not.toContain('==');
    expect(notes).toContain('wording that is no longer in the transcript');
  });

  it('does not nest marks when one highlight contains another', () => {
    // Marking the short one first would put `==` inside the longer one's marks
    // and render as literal equals signs.
    const notes = buildStudyNotes({
      ...LECTURE,
      highlights: [
        { seconds: 12, text: 'the slope' },
        { seconds: 12, text: 'follows the slope downhill' },
      ],
    });

    expect(notes).toContain('==follows the slope downhill==');
    expect(notes).not.toContain('====');
    expect(notes).not.toMatch(/==[^=]*==[^=]*==/);
  });

  it('can leave the transcript out entirely', () => {
    const notes = buildStudyNotes(
      { ...LECTURE, notes: [{ seconds: 12, body: 'just this' }] },
      { includeTranscript: false },
    );

    expect(notes).toContain('just this');
    expect(notes).not.toContain('## Transcript');
    expect(notes).not.toContain('Welcome back to the course.');
  });

  it('survives a lecture with no transcript at all', () => {
    const notes = buildStudyNotes({ title: 'Empty', transcript: '' });

    expect(notes).toContain('# Empty');
    expect(notes).not.toContain('## Transcript');
  });

  it('ignores a frame that has not been read', () => {
    // There is no image in this document for an unread frame to caption.
    const notes = buildStudyNotes({ ...LECTURE, screenshots: [{ seconds: 12 }] });
    expect(notes).not.toContain('On screen');
  });
});

describe('buildCourseStudyNotes', () => {
  const second: StudyLecture = {
    title: 'Backpropagation',
    transcript: transcript(['00:00', 'Now we go backwards through the graph.']),
  };

  it('keeps each lecture under the course rather than flattening them', () => {
    // Timestamps restart at zero in every video, so a flat merge would produce
    // a file full of `00:00` with nothing to say which lecture each was from.
    const notes = buildCourseStudyNotes([LECTURE, second], { courseTitle: 'Deep Learning' });

    expect(notes).toContain('# Deep Learning');
    expect(notes).toContain('## Gradient descent');
    expect(notes).toContain('## Backpropagation');
    // The course owns the only top-level heading.
    expect(notes.match(/^# /gm)).toHaveLength(1);
  });

  it('demotes a lecture’s inner headings too, not just its title', () => {
    const notes = buildCourseStudyNotes([{ ...LECTURE, notes: [{ seconds: 0, body: 'x' }] }], {
      courseTitle: 'Deep Learning',
    });

    expect(notes).toContain('### What you marked');
    expect(notes).toContain('### Transcript');
  });

  it('handles a course with no lectures', () => {
    expect(buildCourseStudyNotes([], { courseTitle: 'Empty' })).toContain('# Empty');
  });
});
