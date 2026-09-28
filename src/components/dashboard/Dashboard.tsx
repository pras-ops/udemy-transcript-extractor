import React, { useCallback, useEffect, useState } from 'react';
import {
  Library,
  Search as SearchIcon,
  StickyNote,
  Highlighter,
  Sun,
  Moon,
  FileText,
} from 'lucide-react';
import {
  importPendingNotes,
  libraryTotals,
  migrateIntoLibrary,
} from '../../lib/library-db';
import { applyTheme, resolveTheme, storeTheme, type Theme } from '../../lib/theme';
import { LibraryView } from './LibraryView';
import { LectureView } from './LectureView';
import { SearchView } from './SearchView';
import { NotesView } from './NotesView';
import { HighlightsView } from './HighlightsView';

/**
 * The library, as a full extension page.
 *
 * The popup is the wrong host for anything that takes more than an instant: it
 * is destroyed the moment it loses focus, which takes every in-flight read and
 * index with it. This page is an ordinary tab, so whole-library indexing,
 * cross-course search and reading a three-thousand-word transcript are all
 * possible here and none of them are possible there.
 *
 * Navigation is a small tagged union rather than a router. There are four
 * places to be, the page is not addressable from outside the extension, and a
 * routing library would be more machinery than the problem has.
 */
export type View =
  | { name: 'library' }
  | { name: 'lecture'; lectureId: string }
  | { name: 'search' }
  | { name: 'highlights' }
  | { name: 'notes' };

interface Totals {
  courses: number;
  lectures: number;
  words: number;
}

export const Dashboard: React.FC = () => {
  const [view, setView] = useState<View>({ name: 'library' });
  const [theme, setTheme] = useState<Theme>(() => resolveTheme());
  const [totals, setTotals] = useState<Totals | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTotals = useCallback(async () => {
    try {
      setTotals(await libraryTotals());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The library could not be read.');
    }
  }, []);

  // Migrate before first read, so a user opening the dashboard for the first
  // time sees the courses they have already collected rather than an empty
  // library and a reason to close the tab.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await migrateIntoLibrary();
      } catch (cause) {
        console.error('[library] migration failed', cause);
      }

      // Notes written on the lecture page have been waiting in storage for an
      // extension page to open; this is that page. Its own catch, so one bad
      // note cannot stop the library loading.
      try {
        const imported = await importPendingNotes();
        if (imported > 0) console.log(`[library] imported ${imported} notes from the player`);
      } catch (cause) {
        console.error('[library] importing player notes failed', cause);
      }

      if (cancelled) return;
      await refreshTotals();
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTotals]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    storeTheme(next);
    setTheme(next);
  };

  const navItems: { view: View; label: string; icon: React.ReactNode }[] = [
    { view: { name: 'library' }, label: 'Library', icon: <Library className="w-4 h-4" /> },
    { view: { name: 'search' }, label: 'Search', icon: <SearchIcon className="w-4 h-4" /> },
    {
      view: { name: 'highlights' },
      label: 'Highlights',
      icon: <Highlighter className="w-4 h-4" />,
    },
    { view: { name: 'notes' }, label: 'Notes', icon: <StickyNote className="w-4 h-4" /> },
  ];

  const isActive = (candidate: View) =>
    candidate.name === view.name ||
    // A lecture is reached from the library, so the library stays lit.
    (candidate.name === 'library' && view.name === 'lecture');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        {/* Navigation. Four destinations, each of which does something real —
            a longer list would be mostly labels for things that are really
            just filters over the same records. */}
        <nav className="w-52 shrink-0 border-r border-slate-200 dark:border-slate-800 px-3 py-4 flex flex-col">
          {/* Same shape as the popup header, toggle included — two surfaces of
              one product should not hide the same control in different
              places. It sat at the very bottom edge before, which is where
              things go to be missed. */}
          <div className="flex items-center gap-2 px-2 mb-5">
            <div className="w-7 h-7 shrink-0 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight truncate">
                Transcript Extractor
              </p>
              <p className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Local · private
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="shrink-0 rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => setView(item.view)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                    isActive(item.view)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Totals belong on the page, not tucked into a sidebar footer at
              11px — they are the first thing worth knowing about a library. */}
          <p className="mt-auto px-2 text-[10px] text-slate-400 dark:text-slate-500">
            Open source · MIT
          </p>
        </nav>

        <main className="flex-1 min-w-0 px-8 py-7">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                The library could not be read
              </p>
              <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {!ready ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Opening your library…</p>
          ) : view.name === 'library' ? (
            <LibraryView
              totals={totals}
              onOpenLecture={(lectureId) => setView({ name: 'lecture', lectureId })}
              onBrowse={() => setView({ name: 'search' })}
            />
          ) : view.name === 'lecture' ? (
            <LectureView
              lectureId={view.lectureId}
              onBack={() => setView({ name: 'library' })}
              onChanged={refreshTotals}
            />
          ) : view.name === 'search' ? (
            <SearchView onOpenLecture={(lectureId) => setView({ name: 'lecture', lectureId })} />
          ) : view.name === 'highlights' ? (
            <HighlightsView
              onOpenLecture={(lectureId) => setView({ name: 'lecture', lectureId })}
              onGoToLibrary={() => setView({ name: 'library' })}
            />
          ) : (
            <NotesView
              onOpenLecture={(lectureId) => setView({ name: 'lecture', lectureId })}
              onGoToLibrary={() => setView({ name: 'library' })}
            />
          )}
        </main>
      </div>
    </div>
  );
};
