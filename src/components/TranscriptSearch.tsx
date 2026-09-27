import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Loader2, ArrowLeft, Info, Sparkles, Check } from 'lucide-react';
import { buildChunks, type Chunk, type SourceMeta } from '../lib/transcript';
import { bestSnippet, confidenceLabel, type SearchHit } from '../lib/semantic-search';
import { searchService } from '../lib/search-service';
import { formatTimestamp } from '../lib/transcript';
import type { Segment } from '../lib/segmentation';
import type { SummarySentence } from '../lib/extractive-summary';
import { probeSummarizer, summarizeWithModel } from '../lib/on-device-ai';
import type { Keyphrase } from '../lib/keyphrases';

export interface SearchableLecture {
  title: string;
  url?: string;
  transcript: string;
}

interface TranscriptSearchProps {
  /** Every lecture gathered for this course, searched together. */
  lectures: SearchableLecture[];
  meta: SourceMeta;
  onClose: () => void;
}

interface IndexState {
  status: 'idle' | 'indexing' | 'ready' | 'error';
  progress: number;
  label: string;
  error?: string;
}

const CONFIDENCE_STYLES: Record<ReturnType<typeof confidenceLabel>, string> = {
  strong: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  likely: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  weak: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export const TranscriptSearch: React.FC<TranscriptSearchProps> = ({
  lectures,
  meta,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [index, setIndex] = useState<IndexState>({ status: 'idle', progress: 0, label: '' });
  const [chapters, setChapters] = useState<Segment[]>([]);
  const [chapterTitles, setChapterTitles] = useState<string[]>([]);

  // Two tiers, and the first one is the floor.
  //
  // `summaries` are the lecturer's own sentences, selected with the embeddings
  // that ship with the extension — so a summary exists on every machine and
  // can never contain a claim the lecture did not make.
  //
  // `written` is Chrome's on-device model turning those same lines into prose,
  // where the hardware allows it. It layers on; it does not replace.
  const [summaries, setSummaries] = useState<{ lecture: string; lines: SummarySentence[] }[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [written, setWritten] = useState<Record<string, string>>({});
  const [writingFor, setWritingFor] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<Keyphrase[]>([]);
  // Keyword search is live from the start; this flips once the model lands.
  const [semanticReady, setSemanticReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** The lecture set currently being indexed, so stale passes can stand down. */
  const activeSignature = useRef<string | null>(null);

  /**
   * Whether the deeper pass has run, and how it went.
   *
   * Surfaced rather than kept internal: this work used to happen invisibly,
   * so when it silently failed there was no way to tell the difference
   * between "still working" and "never going to finish".
   */
  const [analysis, setAnalysis] = useState<{
    state: 'idle' | 'running' | 'done' | 'error';
    error?: string;
  }>({ state: 'idle' });

  // Search works at a *finer* grain than the retrieval export.
  //
  // The export uses ~512-token chunks because that is what suits feeding a
  // language model. Navigation is a different job: a 512-token chunk covers
  // minutes of speech, so "where did they explain X" returned a wall of text
  // and a timestamp pointing at the start of a paragraph. These passages are a
  // couple of sentences each, with their own timestamp, and no overlap — so a
  // result points at a moment rather than a region.
  //
  // Chunking happens per lecture and the results are merged. Timestamps restart
  // at zero in every video, so a passage has to remember which lecture it came
  // from or "02:14" means nothing across a course.
  const chunks: (Chunk & { lecture: string })[] = useMemo(() => {
    const merged: (Chunk & { lecture: string })[] = [];
    for (const lecture of lectures) {
      if (!lecture.transcript) continue;
      const built = buildChunks(
        lecture.transcript,
        { ...meta, title: lecture.title, url: lecture.url },
        { targetTokens: 55, maxTokens: 85, overlapTokens: 0 },
      );
      for (const chunk of built) {
        // Reindex globally; per-lecture indices would collide once merged.
        merged.push({ ...chunk, chunkIndex: merged.length, lecture: lecture.title });
      }
    }
    return merged;
  }, [lectures, meta]);

  const byIndex = useMemo(() => {
    const map = new Map<number, Chunk & { lecture: string }>();
    for (const chunk of chunks) map.set(chunk.chunkIndex, chunk);
    return map;
  }, [chunks]);

  /** Identifies the lecture set, so repeated renders do not redo the work. */
  const signature = useMemo(
    () => lectures.map((l) => `${l.title}:${l.transcript.length}`).join('|'),
    [lectures],
  );

  /**
   * The deeper pass: semantic index, chapters, concepts, summaries.
   *
   * Callable rather than buried inside an effect, so the panel can offer a
   * button and a retry. This used to run invisibly, which meant a failure
   * looked exactly like still working.
   */
  const runAnalysis = async () => {
    if (chunks.length === 0) return;

    const payload = chunks.map((c) => ({ chunkIndex: c.chunkIndex, text: c.content }));

    // Work is superseded by a different lecture set, never by React re-running
    // an effect.
    //
    // The previous version tracked cancellation with a flag cleared in the
    // effect's cleanup and kept `index.status` in the dependency list. Setting
    // that status to "ready" re-ran the effect, whose cleanup cancelled the
    // pass that had only just started — so semantic indexing, chapters,
    // concepts and summaries never once completed. Search still worked on
    // keywords, which is exactly why it went unnoticed.
    activeSignature.current = signature;
    const superseded = () => activeSignature.current !== signature;

    setAnalysis({ state: 'running' });
    try {
      await searchService.indexSemantic(payload, signature);
      if (superseded()) return;
      setSemanticReady(true);

      const found = await searchService.analyze(
        lectures.map((l) => l.transcript).join('\n\n'),
        (position) => chunks[position]?.startSeconds ?? null,
      );
      if (superseded()) return;
      setChapters(found.chapters);
      setChapterTitles(found.chapterTitles);
      setConcepts(found.concepts);

      // Summarised one lecture at a time, never over the joined text:
      // timestamps restart at zero in every video, so a line pulled from the
      // concatenation could not say where it came from.
      const perLecture: { lecture: string; lines: SummarySentence[] }[] = [];
      for (const lecture of lectures) {
        if (!lecture.transcript) continue;
        const summary = await searchService.summarize(lecture.transcript);
        if (superseded()) return;
        if (summary.overall.length > 0) {
          perLecture.push({ lecture: lecture.title, lines: summary.overall });
        }
      }

      setSummaries(perLecture);
      setAnalysis({ state: 'done' });
    } catch (error) {
      console.error('[search] analysis failed', error);
      setAnalysis({
        state: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Build the keyword index when the panel opens, then start the deeper pass.
  //
  // This runs in the popup, directly. There is no message round trip and no
  // separate context to coordinate with: the model is a lookup table, so it
  // loads and runs where it is used.
  useEffect(() => {
    if (chunks.length === 0 || activeSignature.current === signature) return;

    // Keyword search first, synchronously. There is nothing to load, so the
    // panel is usable immediately instead of sitting behind a spinner.
    try {
      searchService.indexLexical(
        chunks.map((c) => ({ chunkIndex: c.chunkIndex, text: c.content })),
        signature,
      );
      setIndex({ status: 'ready', progress: 1, label: '' });
      inputRef.current?.focus();
    } catch (error) {
      setIndex({
        status: 'error',
        progress: 0,
        label: '',
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    void runAnalysis();

    // No cleanup: this starts work that outlives a re-render, and tearing it
    // down on every dependency change is precisely the bug described above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunks, signature]);

  useEffect(() => {
    let cancelled = false;
    probeSummarizer().then((probe) => {
      if (!cancelled) setCanWrite(probe.ready);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Turn selected sentences into prose with the on-device model.
   *
   * The extractive summary is what gets sent, not the transcript. Six
   * sentences is roughly 150 words, comfortably inside the ~1024-token prompt
   * limit that a three-thousand-word lecture blows straight through — so the
   * cheap tier is also what makes the expensive one usable.
   */
  const writeSummary = async (lecture: string, lines: SummarySentence[]) => {
    setWritingFor(lecture);
    try {
      const result = await summarizeWithModel(lines.map((line) => line.text).join(' '), {
        type: 'key-points',
        length: 'short',
      });

      setWritten((previous) => ({
        ...previous,
        [lecture]:
          result.text ??
          (result.tooLong
            ? 'That was still too long for the on-device model.'
            : (result.error ?? 'No summary was produced.')),
      }));
    } finally {
      setWritingFor(null);
    }
  };

  // `term` lets a concept chip search immediately: `setQuery` is asynchronous,
  // so reading `query` here would still hold the previous value.
  const runSearch = async (term?: string) => {
    const trimmed = (term ?? query).trim();
    if (!trimmed || index.status !== 'ready') return;

    setIsSearching(true);
    try {
      setHits(await searchService.search(trimmed));
    } catch {
      setHits([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col">
      <header className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Back to transcript"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold leading-tight">Search this lecture</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight">
            {chunks.length} passages · {semanticReady ? 'keyword + meaning' : 'keyword search ready'} · on your machine
          </p>
        </div>
      </header>

      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            disabled={index.status !== 'ready'}
            placeholder="Where did they explain…?"
            className="flex-1 min-w-0 px-3 py-2 text-[13px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 outline-none transition disabled:opacity-50"
          />
          <button
            onClick={() => runSearch()}
            disabled={index.status !== 'ready' || !query.trim() || isSearching}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            aria-label="Search"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {chunks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <Info className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              There is nothing to search yet.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Extract a transcript first, then come back here.
            </p>
          </div>
        )}

        {chunks.length > 0 && index.status === 'indexing' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-700 dark:text-slate-200">{index.label}</p>
            <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${Math.round(index.progress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Everything runs on this machine. Nothing is uploaded, and nothing is downloaded —
              the model ships with the extension.
            </p>
          </div>
        )}

        {index.status === 'error' && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              Search is unavailable
            </p>
            <p className="text-xs text-red-700 dark:text-red-300">{index.error}</p>
          </div>
        )}

        {index.status === 'ready' && hits === null && (
          <div className="space-y-5">
            {/* What the deeper pass is doing, and a way to run it.
                Keeping this invisible is what let a silent failure look
                identical to work still in progress. */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
              {analysis.state === 'running' ? (
                <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  Reading the transcript — summary, chapters and key concepts.
                </p>
              ) : analysis.state === 'error' ? (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    That did not finish. Keyword search still works.
                    <br />
                    <span className="text-[10px] opacity-80">{analysis.error}</span>
                  </p>
                  <button
                    onClick={() => void runAnalysis()}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              ) : summaries.length > 0 || chapters.length > 1 ? (
                // Done. Deliberately no "rebuild": this pass is deterministic,
                // so re-running it recomputes the identical result and looks
                // like a button that does nothing.
                <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Summary, chapters and key concepts — read from this transcript.
                </p>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Build a summary, chapters and key concepts from this transcript.
                  </p>
                  <button
                    onClick={() => void runAnalysis()}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Analyse lecture
                  </button>
                </div>
              )}
            </section>

            {summaries.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                  Summary · the lecturer's own words
                </h3>

                <div className="space-y-3">
                  {summaries.map((summary) => (
                    <div key={summary.lecture}>
                      {summaries.length > 1 && (
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 truncate">
                          {summary.lecture}
                        </p>
                      )}

                      <ul className="space-y-1">
                        {summary.lines.map((line) => (
                          <li key={line.index} className="flex gap-2 items-baseline text-xs">
                            <span className="font-mono font-semibold text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                              {line.startSeconds === null
                                ? '—'
                                : formatTimestamp(line.startSeconds)}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {line.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* The generated tier, offered only where the hardware
                          has it. Its output is labelled, never mixed in with
                          the quoted lines above. */}
                      {canWrite && !written[summary.lecture] && (
                        <button
                          onClick={() => writeSummary(summary.lecture, summary.lines)}
                          disabled={writingFor === summary.lecture}
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-50 transition-colors"
                        >
                          {writingFor === summary.lecture && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                          {writingFor === summary.lecture ? 'Writing…' : 'Write it as prose'}
                        </button>
                      )}

                      {written[summary.lecture] && (
                        <div className="mt-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/60 p-2">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">
                            Written by the on-device model
                          </p>
                          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                            {written[summary.lecture]}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {concepts.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                  Key concepts
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {concepts.map((concept) => (
                    <button
                      key={concept.phrase}
                      onClick={() => {
                        setQuery(concept.phrase);
                        void runSearch(concept.phrase);
                      }}
                      className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      title={`Mentioned ${concept.occurrences} times — search for this`}
                    >
                      {concept.phrase}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {chapters.length > 1 && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                  Chapters · detected from the transcript
                </h3>
                <ul className="space-y-1">
                  {chapters.map((chapter) => {
                    const stamp =
                      chapter.startSeconds === null ? null : formatTimestamp(chapter.startSeconds);
                    // Named from the chapter's own text. Listing it by its
                    // opening words says nothing about what is inside it.
                    const title = chapterTitles[chapter.index];
                    const preview = byIndex.get(chapter.startBlock)?.body ?? '';
                    return (
                      <li
                        key={chapter.index}
                        className="flex gap-2 items-baseline text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        {/* Plain text, never a link: a timestamp is a position to
                            scrub to yourself, not something to click. */}
                        <span className="font-mono font-semibold text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                          {stamp ?? '—'}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {title || `Part ${chapter.index + 1}`}
                          </span>
                          <span className="block text-slate-500 dark:text-slate-400 line-clamp-1">
                            {preview.slice(0, 90)}
                            {preview.length > 90 ? '…' : ''}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div className="flex flex-col items-center justify-center gap-2 text-center px-4 pt-2">
              <Search className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ask in your own words — it matches meaning, not just keywords. Every result links
                back to the moment in the video.
              </p>
            </div>
          </div>
        )}

        {hits !== null && hits.length === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Nothing in this lecture looks like a close match. It may simply not be covered here —
              try different wording before assuming it is.
            </p>
          </div>
        )}

        {hits !== null && hits.length > 0 && (
          <ul className="space-y-3">
            {hits.map((hit) => {
              const chunk = byIndex.get(hit.chunkIndex);
              if (!chunk) return null;
              const confidence = confidenceLabel(hit.score);
              return (
                <li
                  key={hit.chunkIndex}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    {/* The time is shown, never linked — see the chapter list. */}
                    <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                      {chunk.timeRange ?? 'No timestamp'}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${CONFIDENCE_STYLES[confidence]}`}
                    >
                      {confidence}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {bestSnippet(chunk.body, query)}
                  </p>
                  {/* Results span the whole course, so a bare "02:14" is
                      ambiguous without the lecture it belongs to. */}
                  {lectures.length > 1 && (
                    <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {chunk.lecture}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
