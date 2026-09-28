import { describe, it, expect } from 'vitest';
import { collectionKey } from './collection';
import {
  activityCount,
  countWords,
  lectureStatus,
  STATUS_LABELS,
  courseIdFromCollectionKey,
  courseIdFromUrl,
  courseTotals,
  platformFromUrl,
  titleFromCourseId,
  toCollectedLectures,
  toLibraryRecords,
  type LegacyLecture,
} from './library-schema';

const LECTURE_URL = 'https://www.udemy.com/course/python/learn/lecture/42';

describe('countWords', () => {
  it('ignores timestamp markers', () => {
    expect(countWords('[00:00] one two three')).toBe(3);
    expect(countWords('[1:02:05] alpha beta')).toBe(2);
  });

  it('is zero for nothing', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('courseIdFromUrl', () => {
  it('is the same for every lecture in a course', () => {
    expect(courseIdFromUrl('https://www.udemy.com/course/python/learn/lecture/1')).toBe(
      courseIdFromUrl('https://www.udemy.com/course/python/learn/lecture/999?start=30'),
    );
  });

  it('keeps separate courses apart', () => {
    expect(courseIdFromUrl('https://www.udemy.com/course/python/learn/lecture/1')).not.toBe(
      courseIdFromUrl('https://www.udemy.com/course/rust/learn/lecture/1'),
    );
  });

  it('survives a missing or malformed url', () => {
    expect(courseIdFromUrl(undefined)).toBe('course:unknown');
    expect(courseIdFromUrl('not a url')).toContain('not a url');
  });
});

describe('courseIdFromCollectionKey', () => {
  it('agrees with the id derived from a lecture URL', () => {
    // The invariant that makes migration safe: a course rebuilt from old
    // storage lands on the same identity a freshly collected one would, so
    // migrated data and new data are the same course rather than two.
    expect(courseIdFromCollectionKey(collectionKey(LECTURE_URL))).toBe(
      courseIdFromUrl(LECTURE_URL),
    );
  });

  it('tolerates a key without the expected prefix', () => {
    expect(courseIdFromCollectionKey('something-else')).toBe('course:something-else');
  });
});

describe('platformFromUrl', () => {
  it('recognises the platforms the extractor supports', () => {
    expect(platformFromUrl('https://www.udemy.com/course/x')).toBe('udemy');
    expect(platformFromUrl('https://coursera.org/learn/x')).toBe('coursera');
    expect(platformFromUrl('https://www.youtube.com/watch?v=a')).toBe('youtube');
    expect(platformFromUrl('https://youtu.be/a')).toBe('youtube');
  });

  it('calls anything else generic, and nothing unknown', () => {
    expect(platformFromUrl('https://lectures.university.edu/x')).toBe('generic');
    expect(platformFromUrl(undefined)).toBe('unknown');
    expect(platformFromUrl('not a url')).toBe('unknown');
  });
});

describe('titleFromCourseId', () => {
  it('reads a course slug as words', () => {
    expect(titleFromCourseId('course:https://www.udemy.com/course/complete-python-bootcamp')).toBe(
      'Complete python bootcamp',
    );
  });

  it('falls back when there is no usable url', () => {
    expect(titleFromCourseId('course:unknown')).toBe('Untitled course');
  });
});

describe('toLibraryRecords', () => {
  const lectures: LegacyLecture[] = [
    {
      id: '/l/1',
      title: 'Intro',
      url: LECTURE_URL,
      transcript: '[00:00] welcome to the course',
      collectedAt: 200,
    },
    {
      id: '/l/2',
      title: 'Descent',
      url: 'https://www.udemy.com/course/python/learn/lecture/43',
      transcript: '[00:05] gradient descent minimises loss',
      collectedAt: 100,
    },
  ];

  const courseId = courseIdFromUrl(LECTURE_URL);

  it('produces one course, and a record per lecture', () => {
    const records = toLibraryRecords(courseId, lectures, { title: 'ML 101', now: 500 });
    expect(records.course.id).toBe(courseId);
    expect(records.course.title).toBe('ML 101');
    expect(records.course.platform).toBe('udemy');
    expect(records.lectures.map((l) => l.title)).toEqual(['Intro', 'Descent']);
  });

  it('dates the course from when its lectures were collected', () => {
    const records = toLibraryRecords(courseId, lectures, { now: 500 });
    expect(records.course.createdAt).toBe(100);
    expect(records.course.updatedAt).toBe(200);
  });

  it('keeps transcript text in its own records', () => {
    // The split that decides whether a library of 75 lectures opens instantly:
    // listing them must not deserialise every transcript.
    const records = toLibraryRecords(courseId, lectures, { now: 500 });
    expect(records.transcripts).toHaveLength(2);
    for (const lecture of records.lectures) {
      expect(lecture).not.toHaveProperty('text');
      expect(lecture).not.toHaveProperty('transcript');
    }
  });

  it('counts words onto the lecture, so totals need no transcript', () => {
    const records = toLibraryRecords(courseId, lectures, { now: 500 });
    expect(records.lectures[0].wordCount).toBe(4);
    expect(courseTotals(records.lectures).words).toBe(4 + 4);
  });

  it('keeps a lecture that has no transcript yet', () => {
    const records = toLibraryRecords(
      courseId,
      [{ id: '/l/3', title: 'Empty', transcript: '', collectedAt: 1 }],
      { now: 500 },
    );
    expect(records.lectures).toHaveLength(1);
    expect(records.transcripts).toHaveLength(0);
  });

  it('names a course that never reported a title', () => {
    const records = toLibraryRecords(
      'course:https://www.udemy.com/course/deep-learning-bootcamp',
      lectures,
      { now: 500 },
    );
    expect(records.course.title).toBe('Deep learning bootcamp');
  });

  it('skips entries with no identity', () => {
    const records = toLibraryRecords(
      courseId,
      [{ id: '', title: 'Nameless', transcript: 'text', collectedAt: 1 }],
      { now: 500 },
    );
    expect(records.lectures).toHaveLength(0);
  });

  it('handles an empty collection', () => {
    const records = toLibraryRecords(courseId, [], { now: 500 });
    expect(records.lectures).toEqual([]);
    expect(records.transcripts).toEqual([]);
    expect(records.course.createdAt).toBe(500);
  });
});

describe('lectureStatus', () => {
  const nothing = { hasTranscript: false, highlights: 0, notes: 0, screenshots: 0 };

  it('starts at new', () => {
    expect(lectureStatus(nothing)).toBe('new');
  });

  it('becomes captured once a transcript exists', () => {
    expect(lectureStatus({ ...nothing, hasTranscript: true })).toBe('captured');
  });

  it('becomes in-progress once anything is attached', () => {
    // Any one of the three is enough — a reader who highlighted something has
    // started working on the lecture, whatever else they have not done.
    expect(lectureStatus({ ...nothing, hasTranscript: true, highlights: 1 })).toBe('annotated');
    expect(lectureStatus({ ...nothing, hasTranscript: true, notes: 1 })).toBe('annotated');
    expect(lectureStatus({ ...nothing, hasTranscript: true, screenshots: 1 })).toBe('annotated');
  });

  it('counts annotations even without a transcript', () => {
    // A screenshot can be captured before extracting anything.
    expect(lectureStatus({ ...nothing, screenshots: 2 })).toBe('annotated');
  });

  it('lets the reader have the final say', () => {
    // Completion is the one thing the data cannot imply, so an explicit mark
    // outranks everything derived from it.
    expect(lectureStatus({ ...nothing, completedAt: 1 })).toBe('completed');
    expect(
      lectureStatus({ hasTranscript: true, highlights: 5, notes: 3, screenshots: 2, completedAt: 1 }),
    ).toBe('completed');
  });

  it('has a label for every state', () => {
    for (const status of ['new', 'captured', 'annotated', 'completed'] as const) {
      expect(STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

describe('activityCount', () => {
  it('totals everything attached to a lecture', () => {
    expect(
      activityCount({ hasTranscript: true, highlights: 4, notes: 2, screenshots: 1 }),
    ).toBe(7);
  });

  it('is zero for an untouched lecture', () => {
    expect(
      activityCount({ hasTranscript: true, highlights: 0, notes: 0, screenshots: 0 }),
    ).toBe(0);
  });
});

describe('toCollectedLectures', () => {
  const courseId = courseIdFromUrl(LECTURE_URL);

  const lectures: LegacyLecture[] = [
    {
      id: '/l/1',
      title: 'Intro',
      url: LECTURE_URL,
      transcript: '[00:00] welcome to the course',
      collectedAt: 200,
    },
    {
      id: '/l/2',
      title: 'Descent',
      url: 'https://www.udemy.com/course/python/learn/lecture/43',
      transcript: '[00:05] gradient descent minimises loss',
      collectedAt: 100,
    },
  ];

  it('round-trips a collection through the library shape', () => {
    // The property that makes the switch-over safe: what goes in comes back.
    const records = toLibraryRecords(courseId, lectures, { now: 500 });
    const back = toCollectedLectures(records.lectures, records.transcripts);
    expect(back).toEqual(lectures);
  });

  it('keeps a lecture whose transcript is missing', () => {
    // It was collected, so it belongs in the list. Hiding it would read as
    // data loss rather than an empty extraction.
    const records = toLibraryRecords(courseId, lectures, { now: 500 });
    const back = toCollectedLectures(records.lectures, []);
    expect(back).toHaveLength(2);
    expect(back.every((lecture) => lecture.transcript === '')).toBe(true);
  });

  it('ignores a transcript with no lecture', () => {
    const orphan = { lectureId: '/gone', courseId, text: 'orphaned', savedAt: 1 };
    expect(toCollectedLectures([], [orphan])).toEqual([]);
  });

  it('handles an empty library', () => {
    expect(toCollectedLectures([], [])).toEqual([]);
  });
});
