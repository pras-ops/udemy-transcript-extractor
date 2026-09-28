import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Trash2, StickyNote } from 'lucide-react';
import { deleteNote, listAllLectures, listAllNotes, listCourses } from '../../lib/library-db';
import { formatTimestamp } from '../../lib/transcript';
import type { CourseRecord, LectureRecord, NoteRecord } from '../../lib/library-schema';

interface NotesViewProps {
  onOpenLecture: (lectureId: string) => void;
  onGoToLibrary: () => void;
}

/**
 * Every note, across every course.
 *
 * Notes were removed from the popup for good reason — a text box in a 400px
 * panel competing with the extract button helped nobody. What makes them worth
 * having is exactly what a library provides: a note anchored to a course, a
 * lecture and a moment, findable later without remembering which video it was.
 */
export const NotesView: React.FC<NotesViewProps> = ({ onOpenLecture, onGoToLibrary }) => {
  const [notes, setNotes] = useState<NoteRecord[] | null>(null);
  const [lectureTitles, setLectureTitles] = useState<Map<string, string>>(new Map());
  const [courseTitles, setCourseTitles] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState('');

  const load = async () => {
    const [found, lectures, courses] = await Promise.all([
      listAllNotes().catch(() => [] as NoteRecord[]),
      listAllLectures().catch(() => [] as LectureRecord[]),
      listCourses().catch(() => [] as CourseRecord[]),
    ]);
    setLectureTitles(new Map(lectures.map((lecture) => [lecture.id, lecture.title])));
    setCourseTitles(new Map(courses.map((course) => [course.id, course.title])));
    setNotes(found);
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (!notes) return [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return notes;
    return notes.filter(
      (note) =>
        note.body.toLowerCase().includes(needle) ||
        (lectureTitles.get(note.lectureId) ?? '').toLowerCase().includes(needle),
    );
  }, [notes, filter, lectureTitles]);

  const remove = async (id: string) => {
    await deleteNote(id);
    await load();
  };

  if (notes === null) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Reading your notes…</p>;
  }

  if (notes.length === 0) {
    return (
      <div className="flex min-h-[60vh] max-w-md flex-col justify-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30">
          <StickyNote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-semibold mb-2">No notes yet</h1>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-3">
          Open a lecture from your library and write a note under its Notes tab. Give it a second
          and it anchors to that exact moment — so you can find it later without remembering which
          video it was in.
        </p>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-5">
          Or write one without leaving the video: press{' '}
          <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800">
            Alt+Shift+N
          </kbd>{' '}
          on a lecture page. It pauses, takes the moment you are at, and the note turns up here the
          next time you open this page.
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
      <h1 className="text-xl font-semibold mb-0.5">Notes</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        {notes.length} {notes.length === 1 ? 'note' : 'notes'} across your library.
      </p>

      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter notes…"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition mb-4"
      />

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No notes match “{filter}”.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((note) => (
            <li
              key={note.id}
              className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="w-12 shrink-0 pt-0.5 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                  {note.seconds === undefined ? '—' : formatTimestamp(note.seconds)}
                </span>

                <p className="min-w-0 flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                  {note.body}
                </p>

                <button
                  onClick={() => void remove(note.id)}
                  aria-label="Delete note"
                  className="shrink-0 rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => onOpenLecture(note.lectureId)}
                className="mt-1.5 ml-15 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
              >
                {[courseTitles.get(note.courseId), lectureTitles.get(note.lectureId)]
                  .filter(Boolean)
                  .join(' · ') || 'Open lecture'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
