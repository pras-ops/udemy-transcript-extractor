import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Clock, BookOpen, Download, Loader2 } from 'lucide-react';
import {
  getTranscript,
  listCourses,
  listHighlights,
  listLectures,
  listNotes,
  listScreenshots,
} from '../../lib/library-db';
import { courseTotals, type CourseRecord, type LectureRecord } from '../../lib/library-schema';
import { buildCourseStudyNotes, type StudyLecture } from '../../lib/study-notes';
import { ExtensionService } from '../../lib/extension-service';

/** Locale date, no time — a library is browsed by day, not by minute. */
function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const PLATFORM_LABELS: Record<string, string> = {
  udemy: 'Udemy',
  coursera: 'Coursera',
  youtube: 'YouTube',
  generic: 'Web',
  unknown: '',
};

interface LibraryViewProps {
  totals: { courses: number; lectures: number; words: number } | null;
  onOpenLecture: (lectureId: string) => void;
  onBrowse: () => void;
}

/** One number, given room to be read. */
const StatTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
    <p className="text-[22px] font-semibold leading-none tabular-nums">{value}</p>
    <p className="mt-1.5 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {label}
    </p>
  </div>
);

/**
 * Everything collected, grouped by course.
 *
 * Lectures load only when a course is opened. The course list is built from
 * lecture metadata alone — no transcript is read to draw this screen, which is
 * the whole reason transcripts live in their own store.
 */
export const LibraryView: React.FC<LibraryViewProps> = ({ totals, onOpenLecture, onBrowse }) => {
  const [courses, setCourses] = useState<CourseRecord[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [lectures, setLectures] = useState<Record<string, LectureRecord[]>>({});

  /** Which course is being written out, so its button can say so. */
  const [writing, setWriting] = useState<string | null>(null);

  /**
   * Write a whole course out as one study document.
   *
   * Per lecture rather than per course in one query, because a course's
   * transcripts are the one thing this screen otherwise never reads — drawing
   * the library does not touch them, and it should not start now.
   */
  const exportCourse = async (course: CourseRecord) => {
    setWriting(course.id);

    try {
      const inCourse = lectures[course.id] ?? (await listLectures(course.id).catch(() => []));
      const built: StudyLecture[] = [];

      for (const lecture of inCourse) {
        const [transcript, marked, written, shots] = await Promise.all([
          getTranscript(lecture.id).catch(() => undefined),
          listHighlights(lecture.id).catch(() => []),
          listNotes(lecture.id).catch(() => []),
          listScreenshots(lecture.id).catch(() => []),
        ]);

        built.push({
          title: lecture.title,
          url: lecture.url,
          transcript: transcript?.text ?? '',
          highlights: marked,
          notes: written,
          screenshots: shots,
        });
      }

      // `instructor` only: the course title is already the heading, and passing
      // it again would print the same name twice.
      const content = buildCourseStudyNotes(built, {
        title: course.title,
        instructor: course.instructor,
      });

      ExtensionService.downloadFile(
        content,
        ExtensionService.generateFilename(course.title, 'markdown'),
        'text/markdown',
      );
    } finally {
      setWriting(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    listCourses()
      .then((found) => {
        if (cancelled) return;
        setCourses(found);
        // One course is not a choice; open it rather than making the user
        // click through a list of one.
        if (found.length === 1) void expand(found[0].id);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      });
    return () => {
      cancelled = true;
    };
    // `expand` is stable for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expand = async (courseId: string) => {
    setOpen((current) => (current === courseId ? null : courseId));
    if (lectures[courseId]) return;
    try {
      const found = await listLectures(courseId);
      setLectures((current) => ({ ...current, [courseId]: found }));
    } catch {
      setLectures((current) => ({ ...current, [courseId]: [] }));
    }
  };

  if (courses === null) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Reading your library…</p>;
  }

  if (courses.length === 0) {
    return (
      <div className="flex min-h-[60vh] max-w-md flex-col justify-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Your library is empty</h1>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Open a lecture on Udemy, Coursera or YouTube, then click the extension and extract its
          transcript. Everything you collect lands here — grouped by course, searchable, and never
          leaving this machine.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[22px] font-semibold mb-0.5">Library</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Everything you have collected, on this machine.
      </p>

      {totals && (
        <div className="mb-7 grid grid-cols-3 gap-3 max-w-2xl">
          <StatTile label="Courses" value={String(totals.courses)} />
          <StatTile label="Lectures" value={String(totals.lectures)} />
          <StatTile label="Words" value={totals.words.toLocaleString()} />
        </div>
      )}

      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Your courses
        </h2>
        <button
          onClick={onBrowse}
          className="text-[12px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
        >
          Search everything →
        </button>
      </div>

      <ul className="space-y-2">
        {courses.map((course) => {
          const expanded = open === course.id;
          const inCourse = lectures[course.id];
          const totals = inCourse ? courseTotals(inCourse) : null;
          const platform = PLATFORM_LABELS[course.platform] ?? '';

          return (
            <li
              key={course.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
            >
              <div className="flex items-center">
              <button
                onClick={() => void expand(course.id)}
                aria-expanded={expanded}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                )}

                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold truncate">{course.title}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    {[
                      platform,
                      course.instructor,
                      `updated ${formatDay(course.updatedAt)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>

                {totals && (
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {totals.lectures} {totals.lectures === 1 ? 'lecture' : 'lectures'} ·{' '}
                    {totals.words.toLocaleString()} words
                  </span>
                )}
              </button>

              <button
                onClick={() => void exportCourse(course)}
                disabled={writing === course.id}
                title="Export this course as study notes"
                aria-label={`Export ${course.title} as study notes`}
                className="mr-2 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                {writing === course.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
              </div>

              {expanded && (
                <ul className="border-t border-slate-100 dark:border-slate-800">
                  {inCourse === undefined ? (
                    <li className="px-4 py-3 text-[12px] text-slate-500 dark:text-slate-400">
                      Loading lectures…
                    </li>
                  ) : inCourse.length === 0 ? (
                    <li className="px-4 py-3 text-[12px] text-slate-500 dark:text-slate-400">
                      No lectures in this course yet.
                    </li>
                  ) : (
                    inCourse.map((lecture, index) => (
                      <li key={lecture.id}>
                        <button
                          onClick={() => onOpenLecture(lecture.id)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <span className="w-6 shrink-0 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700 dark:text-slate-200">
                            {lecture.title}
                          </span>
                          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                            <Clock className="w-3 h-3" />
                            {lecture.wordCount.toLocaleString()} words
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
