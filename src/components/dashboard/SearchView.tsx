import React, { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, Loader2, ChevronRight, X } from 'lucide-react';
import { listAllLectures, listAllTranscripts, listCourses } from '../../lib/library-db';
import { searchService } from '../../lib/search-service';
import { ExtensionService } from '../../lib/extension-service';
import { buildChunks, formatTimestamp, type Chunk } from '../../lib/transcript';
import { bestSnippet, confidenceLabel, type SearchHit } from '../../lib/semantic-search';

interface SearchViewProps {
  onOpenLecture: (lectureId: string) => void;
}

/** A passage, plus where in the library it came from. */
type LibraryChunk = Chunk & {
  lectureId: string;
  lectureTitle: string;
  courseTitle: string;
  /** Carried so a hit can seek the video without opening the lecture first. */
  lectureUrl?: string;
};

const CONFIDENCE_STYLES: Record<ReturnType<typeof confidenceLabel>, string> = {
  strong: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  likely: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  weak: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

/**
 * Search across everything collected, not just the lecture on screen.
 *
 * This is the capability the popup could never have. Indexing a whole library
 * takes seconds and holds the embedding model in memory while it runs; a popup
 * is destroyed the moment it loses focus, taking the work with it. An ordinary
 * tab simply stays open.
 */
export const SearchView: React.FC<SearchViewProps> = ({ onOpenLecture }) => {
  const [chunks, setChunks] = useState<LibraryChunk[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [semanticReady, setSemanticReady] = useState(false);

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  /** Said only when a jump did not land; a jump that worked shows itself. */
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [courses, lectures, transcripts] = await Promise.all([
          listCourses(),
          listAllLectures(),
          listAllTranscripts(),
        ]);
        if (cancelled) return;

        if (transcripts.length === 0) {
          setStatus('empty');
          return;
        }

        const courseTitles = new Map(courses.map((course) => [course.id, course.title]));
        const lectureTitles = new Map(lectures.map((lecture) => [lecture.id, lecture.title]));
        const lectureUrls = new Map(lectures.map((lecture) => [lecture.id, lecture.url]));

        // Chunked per lecture and merged with global indices. Timestamps
        // restart at zero in every video, so a passage has to carry its own
        // lecture or "02:14" means nothing across a library.
        const merged: LibraryChunk[] = [];
        for (const transcript of transcripts) {
          const lectureTitle = lectureTitles.get(transcript.lectureId) ?? 'Untitled lecture';
          const built = buildChunks(
            transcript.text,
            { title: lectureTitle },
            { targetTokens: 55, maxTokens: 85, overlapTokens: 0 },
          );
          for (const chunk of built) {
            merged.push({
              ...chunk,
              chunkIndex: merged.length,
              lectureId: transcript.lectureId,
              lectureTitle,
              lectureUrl: lectureUrls.get(transcript.lectureId),
              courseTitle: courseTitles.get(transcript.courseId) ?? 'Untitled course',
            });
          }
        }

        if (cancelled) return;
        setChunks(merged);

        const payload = merged.map((chunk) => ({
          chunkIndex: chunk.chunkIndex,
          text: chunk.content,
        }));
        const signature = `library:${transcripts.length}:${merged.length}`;

        // Keyword search first: nothing to load, so the field is usable now.
        searchService.indexLexical(payload, signature);
        if (cancelled) return;
        setStatus('ready');
        inputRef.current?.focus();

        // The meaning upgrade gets its own catch, deliberately.
        //
        // Sharing the outer one meant a model that failed to load replaced a
        // perfectly working keyword search with an error panel — the upgrade
        // destroying the tier beneath it, which is the opposite of what a
        // progressive enhancement is for. On a machine that cannot load the
        // model, keyword search is the product.
        try {
          await searchService.indexSemantic(payload, signature);
          if (!cancelled) setSemanticReady(true);
        } catch (cause) {
          console.error('[search] semantic index unavailable, keywords still work', cause);
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'The library could not be indexed.');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const byIndex = React.useMemo(() => {
    const map = new Map<number, LibraryChunk>();
    for (const chunk of chunks ?? []) map.set(chunk.chunkIndex, chunk);
    return map;
  }, [chunks]);

  const run = async () => {
    const trimmed = query.trim();
    if (!trimmed || status !== 'ready') return;
    setSearching(true);
    try {
      setHits(await searchService.search(trimmed));
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  /**
   * Send the lecture's player to the moment a hit came from.
   *
   * The reason this belongs on the search result and not only inside the lecture:
   * the hit already knows where in which video the answer is. Making the reader
   * open the lecture and find the passage again is exactly the step that keeps
   * people scrubbing the timeline by hand.
   */
  const jumpTo = async (url: string | undefined, seconds: number) => {
    const result = await ExtensionService.seekLecture(url, seconds);

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

  /**
   * A hit's timestamp, as a control rather than a label.
   *
   * Stays text where no URL was stored for the lecture: a button that cannot
   * work is worse than a label that never promised to.
   */
  const HitTime: React.FC<{ seconds: number | null; url?: string }> = ({ seconds, url }) => {
    const shape = 'w-12 shrink-0 pt-0.5 text-[11px] font-mono tabular-nums';
    const resting = 'text-slate-400 dark:text-slate-500';

    if (seconds === null) return <span className={`${shape} ${resting}`}>—</span>;
    if (!url) return <span className={`${shape} ${resting}`}>{formatTimestamp(seconds)}</span>;

    return (
      <button
        onClick={() => void jumpTo(url, seconds)}
        title="Play the lecture from here"
        className={`${shape} ${resting} text-left hover:text-blue-600 hover:underline dark:hover:text-blue-400 transition-colors`}
      >
        {formatTimestamp(seconds)}
      </button>
    );
  };

  if (status === 'empty') {
    return (
      <div className="flex min-h-[60vh] max-w-md flex-col justify-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
          <SearchIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Nothing to search yet</h1>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Extract a transcript or two and they become searchable here — across every course at
          once, by meaning rather than exact words, and without anything leaving this machine.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-0.5">Search</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        {status === 'loading'
          ? 'Indexing your library…'
          : `${chunks?.length.toLocaleString() ?? 0} passages · ${
              semanticReady ? 'keyword + meaning' : 'keyword'
            } · on your machine`}
      </p>

      <div className="flex gap-2 mb-5">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void run();
          }}
          disabled={status !== 'ready'}
          placeholder="Where did they explain…?"
          className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-[14px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition"
        />
        <button
          onClick={() => void run()}
          disabled={status !== 'ready' || !query.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
          Search
        </button>
      </div>

      {status === 'error' && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">Search is unavailable</p>
          <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200">
            {notice}
          </p>
          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {hits !== null && hits.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nothing in your library matches that.
        </p>
      )}

      {hits !== null && hits.length > 0 && (
        <ul className="space-y-2.5">
          {hits.map((hit) => {
            const chunk = byIndex.get(hit.chunkIndex);
            if (!chunk) return null;
            const confidence = confidenceLabel(hit.score);

            return (
              // A row with two destinations: the timestamp goes to the
              // video, the rest goes to the lecture. Nested buttons are not
              // valid HTML, so the row is a container rather than one control.
              <li
                key={hit.chunkIndex}
                className="group flex gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
              >
                <HitTime seconds={chunk.startSeconds} url={chunk.lectureUrl} />

                <button
                  onClick={() => onOpenLecture(chunk.lectureId)}
                  className="flex min-w-0 flex-1 gap-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                        {chunk.lectureTitle}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CONFIDENCE_STYLES[confidence]}`}
                      >
                        {confidence}
                      </span>
                    </span>
                    <span className="block text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {bestSnippet(chunk.body, query)}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-slate-400 dark:text-slate-500">
                      {chunk.courseTitle}
                    </span>
                  </span>

                  <ChevronRight className="mt-0.5 w-4 h-4 shrink-0 text-slate-300 group-hover:text-blue-500 dark:text-slate-600 transition-colors" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
