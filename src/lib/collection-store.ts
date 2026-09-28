/**
 * The popup's view of the library.
 *
 * The popup works with a plain `CollectedLecture[]` and should keep doing so;
 * where that list is persisted is not its concern. This adapter moves the
 * storage underneath from one `chrome.storage` key per course to the indexed
 * library, without changing the shape the UI holds — which keeps the switch
 * small and, more importantly, keeps it reversible.
 *
 * ## Self-healing rather than all-or-nothing
 *
 * A single migration flag is one chance to get it right. If the flag is set
 * but a course did not make it across — storage read failed, the popup was
 * closed mid-write — that course is silently gone from the user's point of
 * view, and the flag says there is nothing to do.
 *
 * So there are two layers: a one-time sweep, and a per-course fallback. If the
 * library has nothing for the course being opened but the old storage does,
 * that course is read from the old storage and written into the library then
 * and there. Nothing is ever deleted from the old storage, so this can only
 * recover data, never lose it.
 */

import {
  loadCollection,
  saveCollection,
  removeLecture,
  type CollectedLecture,
} from './collection';
import {
  courseIdFromUrl,
  toCollectedLectures,
  toLibraryRecords,
} from './library-schema';
import {
  deleteLecture,
  listLectures,
  listTranscripts,
  migrateIntoLibrary,
  saveLecture,
} from './library-db';

/** The one-time sweep, run at most once per popup session. */
let sweep: Promise<unknown> | null = null;

function ensureMigrated(): Promise<unknown> {
  if (!sweep) {
    sweep = migrateIntoLibrary().catch((error) => {
      // A failed sweep must not stop the popup from opening: the per-course
      // fallback below still recovers whatever this course needs.
      console.error('[library] migration sweep failed', error);
    });
  }
  return sweep;
}

/** Everything collected for the course this URL belongs to. */
export async function loadCourseCollection(
  url: string | undefined,
  meta: { courseTitle?: string; instructor?: string } = {},
): Promise<CollectedLecture[]> {
  await ensureMigrated();

  const courseId = courseIdFromUrl(url);

  try {
    const [lectures, transcripts] = await Promise.all([
      listLectures(courseId),
      listTranscripts(courseId),
    ]);

    if (lectures.length > 0) return toCollectedLectures(lectures, transcripts);

    // Nothing in the library. Whatever the old storage holds for this course
    // is the truth, and is brought across now.
    const legacy = await loadCollection(url);
    if (legacy.length === 0) return [];

    const records = toLibraryRecords(courseId, legacy, {
      title: meta.courseTitle,
      instructor: meta.instructor,
    });
    for (const lecture of legacy) {
      await saveLecture(lecture, meta).catch(() => undefined);
    }
    console.log(`[library] recovered ${records.lectures.length} lectures for ${courseId}`);

    return legacy;
  } catch (error) {
    // The library is unreachable — private mode, quota, a corrupt database.
    // The old storage still works, and a degraded popup beats a broken one.
    console.error('[library] read failed, falling back to storage', error);
    return loadCollection(url);
  }
}

/**
 * Record one extracted lecture.
 *
 * Written to both stores for now. The old key is what a previous version of
 * the extension reads, and a user who rolls back — or runs two profiles at
 * different versions — should not find their collection empty.
 */
export async function saveCourseLecture(
  lecture: CollectedLecture,
  collection: CollectedLecture[],
  url: string | undefined,
  meta: { courseTitle?: string; instructor?: string } = {},
): Promise<void> {
  try {
    await saveLecture(lecture, meta);
  } catch (error) {
    console.error('[library] write failed', error);
  }

  await saveCollection(url, collection);
}

/** Forget one lecture, in both stores. */
export async function removeCourseLecture(
  lectureId: string,
  collection: CollectedLecture[],
  url: string | undefined,
): Promise<CollectedLecture[]> {
  const next = removeLecture(collection, lectureId);

  try {
    await deleteLecture(lectureId);
  } catch (error) {
    console.error('[library] delete failed', error);
  }

  await saveCollection(url, next);
  return next;
}
