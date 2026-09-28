/**
 * The learning library, on disk.
 *
 * IndexedDB rather than `chrome.storage`, for two reasons that both matter at
 * library scale: `chrome.storage.local` is a key-value store that serialises
 * the whole value on every write, and it is capped at 10 MB. A few courses of
 * transcripts and screenshots exceed both the ceiling and the patience.
 *
 * The record shapes and every decision about them live in `library-schema.ts`,
 * which is pure and tested. This file is deliberately thin: open, upgrade,
 * read, write, and the one-time migration out of the old storage.
 */

import {
  countWords,
  courseIdFromCollectionKey,
  courseIdFromUrl,
  toLibraryRecords,
  type CourseRecord,
  type HighlightRecord,
  type LectureActivity,
  type LectureRecord,
  type LegacyLecture,
  type NoteRecord,
  type TranscriptRecord,
} from './library-schema';
import type { CapturedFrame } from './frame-capture';
import { takePendingNotes } from './pending-notes';

const DB_NAME = 'transcript-extractor-library';

/**
 * Bumped from 1 to add the highlights store.
 *
 * A new object store can only be created inside `onupgradeneeded`, so adding
 * one always costs a version. Every `createObjectStore` below is guarded by a
 * `contains` check, which is what lets this upgrade run on a database at
 * version 1 and on a fresh one alike.
 */
const DB_VERSION = 2;

export const STORES = {
  courses: 'courses',
  lectures: 'lectures',
  transcripts: 'transcripts',
  notes: 'notes',
  screenshots: 'screenshots',
  highlights: 'highlights',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

/** A screenshot as the library holds it: a captured frame plus its course. */
export interface ScreenshotRecord extends CapturedFrame {
  courseId: string;
}

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.courses)) {
        db.createObjectStore(STORES.courses, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.lectures)) {
        const lectures = db.createObjectStore(STORES.lectures, { keyPath: 'id' });
        lectures.createIndex('courseId', 'courseId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.transcripts)) {
        // Keyed by lecture, so the text is fetched only when something reads
        // it — listing a course must not deserialise every transcript in it.
        const transcripts = db.createObjectStore(STORES.transcripts, { keyPath: 'lectureId' });
        transcripts.createIndex('courseId', 'courseId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.notes)) {
        const notes = db.createObjectStore(STORES.notes, { keyPath: 'id' });
        notes.createIndex('lectureId', 'lectureId', { unique: false });
        notes.createIndex('courseId', 'courseId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.highlights)) {
        const highlights = db.createObjectStore(STORES.highlights, { keyPath: 'id' });
        highlights.createIndex('lectureId', 'lectureId', { unique: false });
        highlights.createIndex('courseId', 'courseId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.screenshots)) {
        // Same compound key the standalone frame store used, so migrating is a
        // copy rather than a re-keying.
        const shots = db.createObjectStore(STORES.screenshots, {
          keyPath: ['lectureId', 'seconds'],
        });
        shots.createIndex('lectureId', 'lectureId', { unique: false });
        shots.createIndex('courseId', 'courseId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the library'));
  });
}

/** Promisify one request against one store. */
function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openLibrary().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = work(tx.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error(`${store} request failed`));
        tx.oncomplete = () => db.close();
      }),
  );
}

/** Write many records across several stores in one transaction. */
function writeAll(
  entries: { store: StoreName; records: unknown[] }[],
): Promise<void> {
  const stores = [...new Set(entries.map((entry) => entry.store))];
  if (stores.length === 0) return Promise.resolve();

  return openLibrary().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(stores, 'readwrite');
        for (const { store, records } of entries) {
          const target = tx.objectStore(store);
          for (const record of records) target.put(record);
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error ?? new Error('Library write failed'));
        tx.onabort = () => reject(tx.error ?? new Error('Library write aborted'));
      }),
  );
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

export async function listCourses(): Promise<CourseRecord[]> {
  const courses = await run<CourseRecord[]>(STORES.courses, 'readonly', (s) => s.getAll());
  // Most recently touched first: a library is opened to continue something.
  return courses.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCourse(courseId: string): Promise<CourseRecord | undefined> {
  return run<CourseRecord | undefined>(STORES.courses, 'readonly', (s) => s.get(courseId));
}

/** Lecture records for a course — metadata only, no transcript text. */
export async function listLectures(courseId: string): Promise<LectureRecord[]> {
  const lectures = await run<LectureRecord[]>(STORES.lectures, 'readonly', (s) =>
    s.index('courseId').getAll(courseId),
  );
  return lectures.sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.collectedAt - b.collectedAt,
  );
}

export async function getTranscript(lectureId: string): Promise<TranscriptRecord | undefined> {
  return run<TranscriptRecord | undefined>(STORES.transcripts, 'readonly', (s) => s.get(lectureId));
}

/** Every transcript in a course — for search, which genuinely needs the text. */
export async function listTranscripts(courseId: string): Promise<TranscriptRecord[]> {
  return run<TranscriptRecord[]>(STORES.transcripts, 'readonly', (s) =>
    s.index('courseId').getAll(courseId),
  );
}

/** Every lecture in the library — metadata only, still no transcript text. */
export async function listAllLectures(): Promise<LectureRecord[]> {
  const lectures = await run<LectureRecord[]>(STORES.lectures, 'readonly', (s) => s.getAll());
  return lectures.sort((a, b) => b.collectedAt - a.collectedAt);
}

/**
 * Every transcript in the library.
 *
 * This is the one call that genuinely loads everything, and it exists for
 * cross-library search, which cannot work on anything less. It belongs to the
 * dashboard: a page that survives losing focus can afford it, and the popup
 * cannot.
 */
export async function listAllTranscripts(): Promise<TranscriptRecord[]> {
  return run<TranscriptRecord[]>(STORES.transcripts, 'readonly', (s) => s.getAll());
}

export async function listAllNotes(): Promise<NoteRecord[]> {
  const notes = await run<NoteRecord[]>(STORES.notes, 'readonly', (s) => s.getAll());
  return notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listHighlights(lectureId: string): Promise<HighlightRecord[]> {
  const found = await run<HighlightRecord[]>(STORES.highlights, 'readonly', (s) =>
    s.index('lectureId').getAll(lectureId),
  );
  return found.sort((a, b) => (a.seconds ?? 0) - (b.seconds ?? 0) || a.createdAt - b.createdAt);
}

export async function listAllHighlights(): Promise<HighlightRecord[]> {
  const found = await run<HighlightRecord[]>(STORES.highlights, 'readonly', (s) => s.getAll());
  return found.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveHighlight(highlight: HighlightRecord): Promise<void> {
  await run(STORES.highlights, 'readwrite', (s) => s.put(highlight));
}

export async function deleteHighlight(id: string): Promise<void> {
  await run(STORES.highlights, 'readwrite', (s) => s.delete(id));
}

export async function listNotes(lectureId: string): Promise<NoteRecord[]> {
  const notes = await run<NoteRecord[]>(STORES.notes, 'readonly', (s) =>
    s.index('lectureId').getAll(lectureId),
  );
  return notes.sort((a, b) => (a.seconds ?? 0) - (b.seconds ?? 0) || a.createdAt - b.createdAt);
}

export async function listScreenshots(lectureId: string): Promise<ScreenshotRecord[]> {
  const shots = await run<ScreenshotRecord[]>(STORES.screenshots, 'readonly', (s) =>
    s.index('lectureId').getAll(lectureId),
  );
  return shots.sort((a, b) => a.seconds - b.seconds);
}

export async function listAllScreenshots(): Promise<ScreenshotRecord[]> {
  const shots = await run<ScreenshotRecord[]>(STORES.screenshots, 'readonly', (s) => s.getAll());
  return shots.sort((a, b) => a.seconds - b.seconds);
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Record a lecture and its transcript, creating the course if it is new.
 *
 * One transaction: a lecture that exists without its transcript, or a
 * transcript orphaned from its lecture, is worse than neither.
 */
export async function saveLecture(
  lecture: LegacyLecture,
  meta: { courseTitle?: string; instructor?: string } = {},
): Promise<void> {
  const courseId = courseIdFromUrl(lecture.url);
  const existing = await getCourse(courseId);
  const now = Date.now();

  const { course, lectures, transcripts } = toLibraryRecords(courseId, [lecture], {
    title: meta.courseTitle ?? existing?.title,
    instructor: meta.instructor ?? existing?.instructor,
    now,
  });

  await writeAll([
    {
      store: STORES.courses,
      // Keep the original creation date; only the touch time moves.
      records: [{ ...course, createdAt: existing?.createdAt ?? course.createdAt, updatedAt: now }],
    },
    { store: STORES.lectures, records: lectures },
    { store: STORES.transcripts, records: transcripts },
  ]);
}

/**
 * Everything attached to a lecture, counted without loading any of it.
 *
 * Four indexed lookups rather than four full reads: the panel showing this
 * only needs to know how many, and a transcript is twenty thousand characters
 * nobody is about to display.
 */
export async function lectureActivity(lectureId: string): Promise<LectureActivity> {
  const [transcript, highlights, notes, shots, lecture] = await Promise.all([
    getTranscript(lectureId).catch(() => undefined),
    listHighlights(lectureId).catch(() => [] as HighlightRecord[]),
    listNotes(lectureId).catch(() => [] as NoteRecord[]),
    listScreenshots(lectureId).catch(() => [] as ScreenshotRecord[]),
    run<LectureRecord | undefined>(STORES.lectures, 'readonly', (s) => s.get(lectureId)).catch(
      () => undefined,
    ),
  ]);

  return {
    hasTranscript: Boolean(transcript?.text),
    highlights: highlights.length,
    notes: notes.length,
    screenshots: shots.length,
    completedAt: lecture?.completedAt,
  };
}

/**
 * Mark a lecture done, or undo it.
 *
 * The one piece of lecture state the data cannot imply. Everything else —
 * captured, annotated — is derived; this is a judgement only the reader makes.
 */
export async function setLectureComplete(lectureId: string, done: boolean): Promise<void> {
  const lecture = await run<LectureRecord | undefined>(STORES.lectures, 'readonly', (s) =>
    s.get(lectureId),
  );
  if (!lecture) return;

  await run(STORES.lectures, 'readwrite', (s) =>
    s.put({ ...lecture, completedAt: done ? Date.now() : undefined }),
  );
}

export async function saveNote(note: NoteRecord): Promise<void> {
  await run(STORES.notes, 'readwrite', (s) => s.put(note));
}

export async function deleteNote(id: string): Promise<void> {
  await run(STORES.notes, 'readwrite', (s) => s.delete(id));
}

export async function saveScreenshot(shot: ScreenshotRecord): Promise<void> {
  await run(STORES.screenshots, 'readwrite', (s) => s.put(shot));
}

/** The compound key the screenshots store is keyed on. */
export async function deleteScreenshot(lectureId: string, seconds: number): Promise<void> {
  await run(STORES.screenshots, 'readwrite', (s) => s.delete([lectureId, seconds]));
}

/**
 * Copy frames out of the old standalone store, as many times as it takes.
 *
 * The one-time migration handled the frames that existed when the library was
 * first opened, and stopped — but captures kept going into the old store, so
 * anything taken afterwards never appeared in the dashboard and never reached
 * an export. Captures now write here directly; this brings across whatever the
 * old store still holds.
 *
 * Idempotent, and deliberately non-destructive in both directions: a frame
 * already in the library is left exactly as it is, so a readout made here is
 * never overwritten by the unread copy the old store kept.
 */
export async function importLegacyFrames(): Promise<number> {
  const frames = await readLegacyFrames().catch(() => [] as CapturedFrame[]);
  if (frames.length === 0) return 0;

  const held = await listAllScreenshots().catch(() => [] as ScreenshotRecord[]);
  const known = new Set(held.map((shot) => `${shot.lectureId}\u0000${shot.seconds}`));

  const missing = frames
    .filter((frame) => !known.has(`${frame.lectureId}\u0000${frame.seconds}`))
    .map((frame) => ({ ...frame, courseId: courseIdFromUrl(frame.lectureId) }));

  if (missing.length > 0) {
    await writeAll([{ store: STORES.screenshots, records: missing }]);
  }

  return missing.length;
}

/** Remove a lecture and everything anchored to it. */
export async function deleteLecture(lectureId: string): Promise<void> {
  const [notes, shots, highlights] = await Promise.all([
    listNotes(lectureId),
    listScreenshots(lectureId),
    listHighlights(lectureId),
  ]);

  await run(STORES.lectures, 'readwrite', (s) => s.delete(lectureId));
  await run(STORES.transcripts, 'readwrite', (s) => s.delete(lectureId));
  for (const note of notes) await deleteNote(note.id);
  for (const highlight of highlights) await deleteHighlight(highlight.id);
  for (const shot of shots) {
    await run(STORES.screenshots, 'readwrite', (s) => s.delete([shot.lectureId, shot.seconds]));
  }
}

/* -------------------------------------------------------------------------- */
/* Migration                                                                   */
/* -------------------------------------------------------------------------- */

const MIGRATION_FLAG = 'library:migrated:v1';
const LEGACY_FRAME_DB = 'transcript-extractor-frames';

export interface MigrationResult {
  ran: boolean;
  courses: number;
  lectures: number;
  screenshots: number;
}

/** Read the standalone frame store, if one was ever created. */
function readLegacyFrames(): Promise<CapturedFrame[]> {
  return new Promise((resolve) => {
    const request = indexedDB.open(LEGACY_FRAME_DB);

    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('frames')) {
        db.close();
        resolve([]);
        return;
      }
      const tx = db.transaction('frames', 'readonly');
      const all = tx.objectStore('frames').getAll();
      all.onsuccess = () => {
        db.close();
        resolve((all.result as CapturedFrame[]) ?? []);
      };
      all.onerror = () => {
        db.close();
        resolve([]);
      };
    };

    // No such database, or it cannot be opened. Nothing to bring across.
    request.onerror = () => resolve([]);
    request.onblocked = () => resolve([]);
  });
}

/**
 * Move existing data into the library, once.
 *
 * Deliberately **non-destructive**: the old `chrome.storage` collections and
 * the old frame database are left exactly where they are. If something here is
 * wrong, the original data is still the original data, and the migration can
 * be corrected and re-run after clearing the flag.
 *
 * Idempotent by flag *and* by key — every write is a `put` against a
 * deterministic id, so a second run overwrites identical records rather than
 * duplicating them.
 */
export async function migrateIntoLibrary(force = false): Promise<MigrationResult> {
  const empty: MigrationResult = { ran: false, courses: 0, lectures: 0, screenshots: 0 };

  if (typeof chrome === 'undefined' || !chrome.storage) return empty;

  if (!force) {
    const flag = await chrome.storage.local.get(MIGRATION_FLAG);
    if (flag[MIGRATION_FLAG]) return empty;
  }

  const everything = (await chrome.storage.local.get(null)) as Record<string, unknown>;
  const collectionKeys = Object.keys(everything).filter((key) => key.startsWith('collection:'));

  let courses = 0;
  let lectures = 0;

  for (const key of collectionKeys) {
    const stored = everything[key];
    if (!Array.isArray(stored) || stored.length === 0) continue;

    const courseId = courseIdFromCollectionKey(key);
    const records = toLibraryRecords(courseId, stored as LegacyLecture[]);

    await writeAll([
      { store: STORES.courses, records: [records.course] },
      { store: STORES.lectures, records: records.lectures },
      { store: STORES.transcripts, records: records.transcripts },
    ]);

    courses += 1;
    lectures += records.lectures.length;
  }

  // Screenshots were keyed by lecture only; the course is recoverable because
  // a frame's lectureId is the lecture URL the id was derived from.
  const frames = await readLegacyFrames();
  const lectureIndex = new Map<string, string>();
  for (const key of collectionKeys) {
    const stored = everything[key];
    if (!Array.isArray(stored)) continue;
    for (const lecture of stored as LegacyLecture[]) {
      lectureIndex.set(lecture.id, courseIdFromCollectionKey(key));
    }
  }

  const shots: ScreenshotRecord[] = frames.map((frame) => ({
    ...frame,
    // A screenshot whose lecture was never collected still belongs somewhere.
    courseId: lectureIndex.get(frame.lectureId) ?? courseIdFromUrl(frame.lectureId),
  }));

  if (shots.length > 0) {
    await writeAll([{ store: STORES.screenshots, records: shots }]);
  }

  await chrome.storage.local.set({ [MIGRATION_FLAG]: Date.now() });

  console.log(
    `[library] migrated ${courses} courses, ${lectures} lectures, ${shots.length} screenshots`,
  );

  return { ran: true, courses, lectures, screenshots: shots.length };
}

/**
 * Bring notes written on the lecture page into the library.
 *
 * The other half of `pending-notes`: a content script cannot reach this
 * database, so notes taken while watching wait in `chrome.storage` until an
 * extension page opens and moves them here.
 *
 * A note can arrive for a lecture that was never collected — someone can write
 * one on a video whose transcript they never extracted. Rather than drop it or
 * leave it pointing at nothing, the lecture (and its course) is created empty,
 * so the note has a title and a link back to the video. An existing lecture is
 * never touched: re-saving it with no transcript would reset its word count and
 * its collection date.
 */
export async function importPendingNotes(): Promise<number> {
  const queued = await takePendingNotes();
  if (queued.length === 0) return 0;

  const known = new Set((await listAllLectures().catch(() => [])).map((entry) => entry.id));

  for (const pending of queued) {
    if (!known.has(pending.lectureId)) {
      await saveLecture({
        id: pending.lectureId,
        title: pending.lectureTitle || 'Untitled lecture',
        url: pending.url,
        transcript: '',
        collectedAt: pending.createdAt,
      });
      known.add(pending.lectureId);
    }

    await saveNote({
      id: pending.id,
      lectureId: pending.lectureId,
      courseId: courseIdFromUrl(pending.url),
      seconds: pending.seconds,
      body: pending.body,
      createdAt: pending.createdAt,
      updatedAt: pending.createdAt,
    });
  }

  return queued.length;
}

/** Totals for the library as a whole, without reading any transcript text. */
export async function libraryTotals(): Promise<{
  courses: number;
  lectures: number;
  words: number;
}> {
  const [courses, lectures] = await Promise.all([
    run<CourseRecord[]>(STORES.courses, 'readonly', (s) => s.getAll()),
    run<LectureRecord[]>(STORES.lectures, 'readonly', (s) => s.getAll()),
  ]);

  return {
    courses: courses.length,
    lectures: lectures.length,
    words: lectures.reduce((sum, lecture) => sum + (lecture.wordCount || 0), 0),
  };
}

/** Exported for tests and for recomputing a stale count. */
export { countWords };
