/**
 * The shape of a local learning library.
 *
 * Today a transcript lives in `chrome.storage` under one key per course, and
 * everything the extension can do is scoped to whatever course happens to be
 * open. That is the right shape for a popup and the wrong shape for a library:
 * you cannot list what you have collected, search across courses, or attach a
 * note to a moment without loading every transcript you own.
 *
 * This module defines the records that replace it, and the pure transforms
 * that get existing data into them. The IndexedDB plumbing lives next door in
 * `library-db.ts`; everything here is testable without a browser.
 *
 * ## Why transcripts are their own store
 *
 * A lecture record is a hundred bytes; its transcript is twenty thousand.
 * Listing a course of 75 lectures should not deserialise 75 transcripts, so
 * the text is keyed separately and fetched only when something actually needs
 * to read it. This single split is the difference between a library that opens
 * instantly and one that stalls.
 */

/** Platforms the extractor knows by name. */
export type Platform = 'udemy' | 'coursera' | 'youtube' | 'generic' | 'unknown';

export interface CourseRecord {
  /** Stable per course: origin plus course slug. */
  id: string;
  title: string;
  instructor?: string;
  platform: Platform;
  /** A link back to the course, when one can be derived. */
  url?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LectureRecord {
  /** Stable per lecture: see `lectureId` in `collection.ts`. */
  id: string;
  courseId: string;
  title: string;
  url?: string;
  /** Seconds, when the page reported a duration. */
  durationSeconds?: number;
  /**
   * Position in the course, when it is actually known.
   *
   * Left undefined rather than guessed. The order lectures were *extracted* in
   * is not the order they appear in the course, and presenting one as the
   * other would misnumber someone's library.
   */
  order?: number;
  collectedAt: number;
  wordCount: number;
  /**
   * When the reader marked this lecture done.
   *
   * The only piece of lecture state that has to be stored. Whether a
   * transcript exists, and whether anything was highlighted, noted or
   * captured, are all answerable from the records themselves — but "I am
   * finished with this" is a judgement only the reader can make, and there is
   * nothing in the data that implies it.
   */
  completedAt?: number;
}

/**
 * Where a lecture stands, derived rather than tracked.
 *
 * Deliberately four states, not the five a full progress model would have.
 * Anything finer would mean inventing distinctions the extension cannot
 * actually observe — it has no background worker and therefore no idea how
 * much of a video has been watched. Claiming to know would be worse than
 * admitting it does not.
 */
export type LectureStatus = 'new' | 'captured' | 'annotated' | 'completed';

export interface LectureActivity {
  hasTranscript: boolean;
  highlights: number;
  notes: number;
  screenshots: number;
  completedAt?: number;
}

export function lectureStatus(activity: LectureActivity): LectureStatus {
  if (activity.completedAt !== undefined) return 'completed';
  if (activity.highlights > 0 || activity.notes > 0 || activity.screenshots > 0) {
    return 'annotated';
  }
  return activity.hasTranscript ? 'captured' : 'new';
}

/** What to call each state on screen. */
export const STATUS_LABELS: Record<LectureStatus, string> = {
  new: 'Not captured',
  captured: 'Transcript captured',
  annotated: 'In progress',
  completed: 'Done',
};

/** Total things the reader has attached to a lecture. */
export function activityCount(activity: LectureActivity): number {
  return activity.highlights + activity.notes + activity.screenshots;
}

export interface TranscriptRecord {
  /** Same id as the lecture it belongs to. */
  lectureId: string;
  courseId: string;
  text: string;
  savedAt: number;
}

export interface NoteRecord {
  id: string;
  lectureId: string;
  courseId: string;
  /** Moment in the lecture this note is about, when anchored to one. */
  seconds?: number;
  body: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * A passage the reader marked as mattering.
 *
 * The lecturer's own words, kept verbatim, with where they were said. That is
 * the whole point: a highlight that cannot be traced back to the moment it
 * came from is just a quote, and the thing this product is actually good at is
 * knowing exactly where something was said.
 *
 * `text` is stored rather than a character range into the transcript. A range
 * is smaller, but it breaks the moment a transcript is re-extracted with
 * different cue boundaries — and re-extraction is routine here. A highlight
 * that silently points at the wrong words is worse than a slightly larger
 * record.
 */
export interface HighlightRecord {
  id: string;
  lectureId: string;
  courseId: string;
  /** Moment the highlighted passage begins, when the cue carried one. */
  seconds?: number;
  text: string;
  /** The reader's own words about it, if they added any. */
  note?: string;
  createdAt: number;
}

/** Word count that ignores `[00:00]` markers, matching the collection's count. */
export function countWords(transcript: string): number {
  return transcript
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Stable identity for a course, derived from any lecture URL inside it.
 *
 * Deliberately the same rule the current `collectionKey` uses, minus its
 * `collection:` prefix — so a library built from migrated data lands on the
 * same identities a freshly collected course would.
 */
export function courseIdFromUrl(url: string | undefined): string {
  if (!url) return 'course:unknown';
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.match(/^\/course\/([^/]+)/);
    if (slug) return `course:${parsed.origin}/course/${slug[1]}`;
    return `course:${parsed.origin}${parsed.pathname}`;
  } catch {
    return `course:${url}`;
  }
}

/** Recover a course id from an existing `collection:…` storage key. */
export function courseIdFromCollectionKey(key: string): string {
  return key.startsWith('collection:') ? `course:${key.slice('collection:'.length)}` : `course:${key}`;
}

/** Which platform a URL belongs to, by host. */
export function platformFromUrl(url: string | undefined): Platform {
  if (!url) return 'unknown';
  try {
    const host = new URL(url).hostname;
    if (host.endsWith('udemy.com')) return 'udemy';
    if (host.endsWith('coursera.org')) return 'coursera';
    if (host.endsWith('youtube.com') || host.endsWith('youtu.be')) return 'youtube';
    return 'generic';
  } catch {
    return 'unknown';
  }
}

/** A collected lecture as the current storage holds it. */
export interface LegacyLecture {
  id: string;
  title: string;
  url?: string;
  transcript: string;
  collectedAt: number;
}

export interface LibraryRecords {
  course: CourseRecord;
  lectures: LectureRecord[];
  transcripts: TranscriptRecord[];
}

/**
 * Turn one stored collection into library records.
 *
 * `courseTitle` and `instructor` are whatever the popup knew at the time;
 * neither is required, because a collection saved before the course sidebar
 * was read has neither and losing the transcripts over a missing title would
 * be absurd. The course then falls back to a name derived from its own id.
 */
export function toLibraryRecords(
  courseId: string,
  lectures: LegacyLecture[],
  meta: { title?: string; instructor?: string; now?: number } = {},
): LibraryRecords {
  const now = meta.now ?? Date.now();
  const firstUrl = lectures.find((lecture) => lecture.url)?.url;

  // Oldest collection time is when this course entered the library.
  const times = lectures.map((lecture) => lecture.collectedAt).filter((t) => Number.isFinite(t));
  const createdAt = times.length > 0 ? Math.min(...times) : now;
  const updatedAt = times.length > 0 ? Math.max(...times) : now;

  const course: CourseRecord = {
    id: courseId,
    title: meta.title?.trim() || titleFromCourseId(courseId),
    instructor: meta.instructor?.trim() || undefined,
    platform: platformFromUrl(firstUrl),
    url: courseUrlFromId(courseId),
    createdAt,
    updatedAt,
  };

  const records: LibraryRecords = { course, lectures: [], transcripts: [] };

  for (const lecture of lectures) {
    if (!lecture.id) continue;

    records.lectures.push({
      id: lecture.id,
      courseId,
      title: lecture.title || 'Untitled lecture',
      url: lecture.url,
      collectedAt: Number.isFinite(lecture.collectedAt) ? lecture.collectedAt : now,
      wordCount: countWords(lecture.transcript ?? ''),
    });

    // A lecture with no transcript is still a lecture; it simply has no text
    // record yet, which is how "collected but empty" is represented.
    if (lecture.transcript) {
      records.transcripts.push({
        lectureId: lecture.id,
        courseId,
        text: lecture.transcript,
        savedAt: Number.isFinite(lecture.collectedAt) ? lecture.collectedAt : now,
      });
    }
  }

  return records;
}

/** `course:https://www.udemy.com/course/python` -> `https://www.udemy.com/course/python` */
function courseUrlFromId(courseId: string): string | undefined {
  const rest = courseId.startsWith('course:') ? courseId.slice('course:'.length) : courseId;
  return /^https?:\/\//.test(rest) ? rest : undefined;
}

/**
 * A readable name for a course that never told us its title.
 *
 * The slug is the best available signal, and a slug rendered as words beats
 * showing someone a raw URL in a list of their own courses.
 */
export function titleFromCourseId(courseId: string): string {
  const url = courseUrlFromId(courseId);
  if (!url) return 'Untitled course';

  try {
    const slug = new URL(url).pathname.match(/^\/course\/([^/]+)/)?.[1];
    if (!slug) return 'Untitled course';
    const words = slug.replace(/[-_]+/g, ' ').trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Untitled course';
  } catch {
    return 'Untitled course';
  }
}

/**
 * Library records back into the shape the popup already works with.
 *
 * The popup's list is `{ id, title, url, transcript, collectedAt }`, and it
 * stays that way: presenting the library through the existing shape keeps the
 * switch-over to a few lines and, more usefully, keeps it reversible.
 *
 * A lecture whose transcript record is missing comes back with empty text
 * rather than being dropped — it was collected, so it belongs in the list, and
 * hiding it would look like data loss rather than an empty extraction.
 */
export function toCollectedLectures(
  lectures: LectureRecord[],
  transcripts: TranscriptRecord[],
): LegacyLecture[] {
  const text = new Map(transcripts.map((record) => [record.lectureId, record.text]));

  return lectures.map((lecture) => ({
    id: lecture.id,
    title: lecture.title,
    url: lecture.url,
    transcript: text.get(lecture.id) ?? '',
    collectedAt: lecture.collectedAt,
  }));
}

/** Totals for a course, computed without loading any transcript text. */
export function courseTotals(lectures: LectureRecord[]): {
  lectures: number;
  words: number;
} {
  return {
    lectures: lectures.length,
    words: lectures.reduce((sum, lecture) => sum + (lecture.wordCount || 0), 0),
  };
}
