import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Trash2, Highlighter } from 'lucide-react';
import {
  deleteHighlight,
  listAllHighlights,
  listAllLectures,
  listCourses,
} from '../../lib/library-db';
import { formatTimestamp } from '../../lib/transcript';
import { ExtensionService } from '../../lib/extension-service';
import type { CourseRecord, HighlightRecord, LectureRecord } from '../../lib/library-schema';

interface HighlightsViewProps {
  onOpenLecture: (lectureId: string) => void;
  onGoToLibrary: () => void;
}

/**
 * Every passage marked, across every course.
 *
 * Highlights were reachable only inside the lecture they came from, which made
 * them notes-in-a-drawer: the reason to mark a passage is to come back to it,
 * and coming back meant remembering which video it was in. Notes already had
 * this screen; highlights are the ones the jump button and the study export are
 * built around, so they needed it more.
 */
export const HighlightsView: React.FC<HighlightsViewProps> = ({
  onOpenLecture,
  onGoToLibrary,
}) => {
  const [highlights, setHighlights] = useState<HighlightRecord[] | null>(null);
  const [lectureTitles, setLectureTitles] = useState<Map<string, string>>(new Map());
  const [lectureUrls, setLectureUrls] = useState<Map<string, string | undefined>>(new Map());
  const [courseTitles, setCourseTitles] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState('');

  /** Said only when a jump did not land; a jump that worked shows itself. */
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    const [found, lectures, courses] = await Promise.all([
      listAllHighlights().catch(() => [] as HighlightRecord[]),
      listAllLectures().catch(() => [] as LectureRecord[]),
      listCourses().catch(() => [] as CourseRecord[]),
    ]);

    setLectureTitles(new Map(lectures.map((lecture) => [lecture.id, lecture.title])));
    setLectureUrls(new Map(lectures.map((lecture) => [lecture.id, lecture.url])));
    setCourseTitles(new Map(courses.map((course) => [course.id, course.title])));
    setHighlights(found);
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (!highlights) return [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return highlights;

    return highlights.filter(
      (highlight) =>
        highlight.text.toLowerCase().includes(needle) ||
        (highlight.note ?? '').toLowerCase().includes(needle) ||
        (lectureTitles.get(highlight.lectureId) ?? '').toLowerCase().includes(needle),
    );
  }, [highlights, filter, lectureTitles]);

  const remove = async (id: string) => {
    await deleteHighlight(id);
    await load();
  };

  /** Send the lecture's player to the moment this passage was marked at. */
  const jumpTo = async (lectureId: string, seconds: number) => {
    const result = await ExtensionService.seekLecture(lectureUrls.get(lectureId), seconds);

    if (result.status === 'seeked') {
      setNotice(null);
      return;
    }

    setNotice(
      result.status === 'opened'
        ? 'Opened the lecture in a new tab — click the timestamp again once the video has loaded.'
        : result.reason,
    );
  };

  if (highlights === null) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Reading your highlights…</p>;
  }

  if (highlights.length === 0) {
    return (
      <div className="flex min-h-[60vh] max-w-md flex-col justify-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30">
          <Highlighter className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Nothing highlighted yet</h1>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-5">
          Open a lecture and select a passage in its transcript, or use the highlighter on any line.
          The moment it was said is captured with it — so from here you can jump straight back to
          that point in the video.
        </p>
        <button
          onClick={onGoToLibrary}
          className="self-start rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Open library
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-0.5">Highlights</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        {highlights.length} {highlights.length === 1 ? 'passage' : 'passages'} across your library.
      </p>

      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter highlights…"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition mb-4"
      />

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200">
            {notice}
          </p>
          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 rounded px-1 text-[12px] text-amber-600 hover:text-amber-800 dark:text-amber-400"
          >
            ×
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No highlights match “{filter}”.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((highlight) => {
            const url = lectureUrls.get(highlight.lectureId);
            const canJump = highlight.seconds !== undefined && url !== undefined;

            return (
              <li
                key={highlight.id}
                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  {canJump ? (
                    <button
                      onClick={() => void jumpTo(highlight.lectureId, highlight.seconds as number)}
                      title="Play the lecture from here"
                      className="w-12 shrink-0 pt-0.5 text-left text-[11px] font-mono tabular-nums text-slate-400 hover:text-blue-600 hover:underline dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
                    >
                      {formatTimestamp(highlight.seconds as number)}
                    </button>
                  ) : (
                    <span className="w-12 shrink-0 pt-0.5 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                      {highlight.seconds === undefined ? '—' : formatTimestamp(highlight.seconds)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="border-l-2 border-amber-400 pl-3 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                      {highlight.text}
                    </p>

                    {/* The reader's own words about the lecturer's. */}
                    {highlight.note && (
                      <p className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {highlight.note}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => void remove(highlight.id)}
                    aria-label="Delete highlight"
                    className="shrink-0 rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onOpenLecture(highlight.lectureId)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
                >
                  {[
                    courseTitles.get(highlight.courseId),
                    lectureTitles.get(highlight.lectureId),
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Open lecture'}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
