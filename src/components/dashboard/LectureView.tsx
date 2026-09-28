import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Plus,
  Trash2,
  Check,
  Highlighter,
  ScanText,
  Loader2,
  Sparkles,
  StickyNote,
  Pilcrow,
  AlignJustify,
  X,
  Download,
  ChevronDown,
} from 'lucide-react';
import {
  probeImageModel,
  probeSummarizer,
  readFrameText,
  summarizeWithModel,
} from '../../lib/on-device-ai';
import { dataUrlBytes } from '../../lib/zip';
import { ExtensionService, type ExportFormat } from '../../lib/extension-service';
import { buildStudyNotes } from '../../lib/study-notes';
import { searchService } from '../../lib/search-service';
import type { SummarySentence } from '../../lib/extractive-summary';
import { extractDefinitions, type Definition } from '../../lib/definitions';
import type { Keyphrase } from '../../lib/keyphrases';
import {
  deleteHighlight,
  deleteNote,
  getCourse,
  getTranscript,
  listHighlights,
  listLectures,
  listNotes,
  listScreenshots,
  saveHighlight,
  saveNote,
  saveScreenshot,
  type ScreenshotRecord,
} from '../../lib/library-db';
import type {
  CourseRecord,
  HighlightRecord,
  LectureRecord,
  NoteRecord,
} from '../../lib/library-schema';
import {
  anchoredIn,
  buildChunks,
  cleanCues,
  formatTimestamp,
  momentOfPassage,
  parseTranscript,
  readingBlocks,
  type Block,
  type Cue,
} from '../../lib/transcript';

type Tab = 'insights' | 'transcript' | 'highlights' | 'screenshots' | 'notes';

/**
 * What an export writes.
 *
 * The study document is its own kind rather than another `ExportFormat`,
 * because it is built from things a transcript string cannot carry.
 */
type ExportChoice =
  | { kind: 'study'; withTranscript: boolean }
  | { kind: 'format'; format: ExportFormat };

const PLAIN_EXPORTS: { format: ExportFormat; label: string }[] = [
  { format: 'txt', label: 'Plain text' },
  { format: 'obsidian', label: 'Obsidian notes' },
  { format: 'srt', label: 'Subtitles (.srt)' },
  { format: 'vtt', label: 'WebVTT' },
  { format: 'csv', label: 'Spreadsheet' },
  { format: 'anki', label: 'Anki cards' },
  { format: 'json', label: 'JSON' },
];

/** How the transcript is laid out for reading. */
type Reader = 'paragraphs' | 'lines';

const READER_KEY = 'transcript-extractor-reader';

/**
 * The reader's layout preference, paragraphs unless they chose otherwise.
 *
 * Paragraphs are the default because a caption cue is about two seconds of
 * speech: one per line is the wall of unreadable text that made people ask for
 * a reader in the first place. Lines stay available for the times a reader
 * wants to see exactly where each cue begins.
 */
function storedReader(): Reader {
  try {
    return localStorage.getItem(READER_KEY) === 'lines' ? 'lines' : 'paragraphs';
  } catch {
    // Storage can be unavailable; the default is a fine answer.
    return 'paragraphs';
  }
}


/**
 * What the reader has selected in the transcript, and where it came from.
 *
 * The timestamp is read off the cue the selection starts in, so a highlight
 * knows its moment without the reader having to tell it.
 */
interface Selection {
  text: string;
  seconds?: number;
}

interface LectureViewProps {
  lectureId: string;
  onBack: () => void;
  onChanged: () => void;
}

/** `mm:ss`, or `h:mm:ss` past an hour. */
const clock = (seconds: number) => formatTimestamp(seconds);

/**
 * One lecture, at full size.
 *
 * A three-thousand-word transcript in a 400px popup is unreadable; that is the
 * single clearest reason this page exists. Everything attached to the lecture
 * — its text, its stills, its notes — is reachable from here without leaving.
 */
export const LectureView: React.FC<LectureViewProps> = ({ lectureId, onBack, onChanged }) => {
  const [lecture, setLecture] = useState<LectureRecord | null>(null);
  const [course, setCourse] = useState<CourseRecord | null>(null);
  const [cues, setCues] = useState<Cue[] | null>(null);
  const [screenshots, setScreenshots] = useState<ScreenshotRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [tab, setTab] = useState<Tab>('transcript');
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [reader, setReader] = useState<Reader>(storedReader);

  const [exportOpen, setExportOpen] = useState(false);

  /**
   * Something to say about the last jump, when there is anything to say.
   *
   * A jump that worked needs no words: the lecture tab comes forward sitting on
   * the moment, which is the whole confirmation.
   */
  const [seekNote, setSeekNote] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [draftSeconds, setDraftSeconds] = useState('');

  const [highlights, setHighlights] = useState<HighlightRecord[]>([]);
  /** How much of the reader's own work there is to write out. */
  const marked =
    highlights.length + notes.length + screenshots.filter((shot) => shot.readout).length;

  const [selection, setSelection] = useState<Selection | null>(null);

  // Reading text off a still needs Chrome's on-device model, which is absent
  // on plenty of machines. Probed, never assumed: where it is missing the
  // button is simply not offered rather than failing when pressed.
  /**
   * What the lecture is about, derived rather than written.
   *
   * Key moments are the lecturer's own most representative sentences, and the
   * concepts are phrases lifted from the transcript — both from the embeddings
   * that ship with the extension, so they exist on every machine. The written
   * summary layers on top only where Chrome's model is installed.
   */
  const [keyMoments, setKeyMoments] = useState<SummarySentence[] | null>(null);
  const [concepts, setConcepts] = useState<Keyphrase[]>([]);
  const [written, setWritten] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [canWrite, setCanWrite] = useState(false);

  /**
   * The lecture's own shape: where it turns, what each part is called, and the
   * lines that carry each part.
   *
   * All selection, no generation — which is what lets it exist on a machine
   * with no model at all. The written tier layers on top per chapter, never
   * over the whole transcript, because each chapter's key lines are a hundred
   * words where the transcript is three thousand.
   */
  const [outline, setOutline] = useState<
    { index: number; title: string; startSeconds: number | null; lines: SummarySentence[] }[]
  >([]);
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [chapterProse, setChapterProse] = useState<Record<number, string>>({});

  const [canRead, setCanRead] = useState(false);
  const [readingShots, setReadingShots] = useState(false);
  const [readProgress, setReadProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    probeImageModel().then((probe) => {
      if (!cancelled) setCanRead(probe.ready);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Inline composing, anchored to one line of the transcript.
   *
   * Selecting text then finding a toolbar is a lot of work for a thought you
   * had while reading. A button on the line you are looking at is not.
   */
  const [composingAt, setComposingAt] = useState<number | null>(null);
  const [lineNote, setLineNote] = useState('');

  /** Which highlight is having a note written against it. */
  const [annotating, setAnnotating] = useState<string | null>(null);
  const [highlightNote, setHighlightNote] = useState('');

  /**
   * Attach the reader's own words to a highlight.
   *
   * Stored on the highlight rather than as a separate note, because the two
   * are one thought — a quote and what you made of it. Splitting them would
   * leave the note stranded in a list with no idea what it referred to.
   */
  const annotateHighlight = async (highlight: HighlightRecord) => {
    const note = highlightNote.trim();
    if (!note) return;

    await saveHighlight({ ...highlight, note });
    setHighlights(await listHighlights(lectureId));
    setAnnotating(null);
    setHighlightNote('');
    onChanged();
  };

  /**
   * Highlight a whole line, without asking the reader to select it first.
   *
   * Takes the shape rather than a `Cue` so the same action works wherever a
   * timestamped line is shown — the transcript, a chapter's key lines, a
   * definition. A reader who spots something worth keeping should not have to
   * find the tab where keeping it is allowed.
   */
  const highlightLine = async (line: { text: string; startSeconds: number | null }) => {
    const now = Date.now();
    await saveHighlight({
      id: `highlight:${lectureId}:${now}`,
      lectureId,
      courseId: course?.id ?? '',
      seconds: line.startSeconds ?? undefined,
      text: line.text,
      createdAt: now,
    });
    setHighlights(await listHighlights(lectureId));
    onChanged();
  };

  const chooseReader = (next: Reader) => {
    setReader(next);
    try {
      localStorage.setItem(READER_KEY, next);
    } catch {
      // A preference that cannot be saved is a smaller problem than a crash.
    }
  };

  /**
   * Write this lecture out to a file.
   *
   * The study document is the one that could not be produced anywhere else:
   * the popup has a transcript and nothing more, so the passages marked here,
   * the notes written against a moment and the text read off captured frames
   * had no way out of IndexedDB at all. The plain formats are offered beside it
   * because they already exist and someone who wants subtitles wants subtitles.
   */
  const exportAs = async (choice: ExportChoice) => {
    setExportOpen(false);

    // Read the transcript rather than rebuilding it from `cues`: cleaning is
    // lossy, and an export should carry what was stored.
    const stored = await getTranscript(lectureId).catch(() => undefined);
    const text = stored?.text ?? '';
    const title = lecture?.title ?? 'Lecture';

    if (choice.kind === 'study') {
      const content = buildStudyNotes(
        { title, url: lecture?.url, transcript: text, highlights, notes, screenshots },
        {
          courseTitle: course?.title,
          instructor: course?.instructor,
          // The layout on screen, so the file reads the way the page does.
          mode: reader,
          includeTranscript: choice.withTranscript,
        },
      );

      ExtensionService.downloadFile(
        content,
        ExtensionService.generateFilename(title, 'markdown'),
        'text/markdown',
      );
      return;
    }

    const content = ExtensionService.formatTranscript(text, choice.format, true, title, {
      title,
      url: lecture?.url,
      courseTitle: course?.title,
      instructor: course?.instructor,
    });

    ExtensionService.downloadFile(
      content,
      ExtensionService.generateFilename(title, choice.format),
      ExtensionService.getMimeType(choice.format),
    );
  };

  /**
   * Send the lecture's own player to a moment.
   *
   * This is the way back. Reading a transcript and then hunting the timeline for
   * the line you just read is the friction that makes people stop using notes
   * at all — and Udemy ignores `#t=` in a URL, so a link cannot do it. The
   * content script holds the `<video>` element, so from here it is a message.
   */
  const jumpTo = async (seconds: number) => {
    const result = await ExtensionService.seekLecture(lecture?.url, seconds);

    if (result.status === 'seeked') {
      setSeekNote(null);
      return;
    }

    setSeekNote(
      result.status === 'opened'
        ? 'Opened the lecture in a new tab — click the timestamp again once the video has loaded.'
        : result.reason,
    );
  };

  /**
   * A timestamp that goes back to the video.
   *
   * Where no URL was stored for the lecture there is nothing to jump to, so it
   * stays plain text: a control that cannot work is worse than a label.
   */
  const TimeButton: React.FC<{ seconds: number | null; className?: string }> = ({
    seconds,
    className = 'w-12 shrink-0 pt-0.5 text-[11px] font-mono tabular-nums',
  }) => {
    const resting = 'text-slate-400 dark:text-slate-500';

    if (seconds === null) return <span className={`${className} ${resting}`}>—</span>;
    if (!lecture?.url) return <span className={`${className} ${resting}`}>{clock(seconds)}</span>;

    return (
      <button
        onClick={() => void jumpTo(seconds)}
        title="Play the lecture from here"
        className={`${className} ${resting} text-left hover:text-blue-600 hover:underline dark:hover:text-blue-400 transition-colors`}
      >
        {clock(seconds)}
      </button>
    );
  };

  /** Highlight and note buttons, for any line that has a moment. */
  const LineActions: React.FC<{ line: { text: string; startSeconds: number | null } }> = ({
    line,
  }) => (
    <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      <button
        onClick={() => void highlightLine(line)}
        aria-label="Highlight this passage"
        title="Highlight this passage"
        className="rounded-md p-1 text-slate-400 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:text-amber-300 transition-colors"
      >
        <Highlighter className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => {
          setComposingAt(composingAt === line.startSeconds ? null : line.startSeconds);
          setLineNote('');
        }}
        aria-label="Add a note here"
        title="Add a note here"
        className="rounded-md p-1 text-slate-400 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
      >
        <StickyNote className="w-3.5 h-3.5" />
      </button>
    </span>
  );

  /** The inline note composer, shown under whichever line opened it. */
  const NoteComposer: React.FC<{ seconds: number | null }> = ({ seconds }) => (
    <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2">
      <textarea
        value={lineNote}
        onChange={(event) => setLineNote(event.target.value)}
        rows={2}
        autoFocus
        placeholder="Note on this moment…"
        className="w-full resize-y rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-[13px] leading-relaxed outline-none focus:border-blue-500 transition"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <button
          onClick={() => void saveLineNote(seconds)}
          disabled={!lineNote.trim()}
          className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Save note
        </button>
        <button
          onClick={() => setComposingAt(null)}
          className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  /** Save the note being composed against a line, then close the composer. */
  const saveLineNote = async (seconds: number | null) => {
    const body = lineNote.trim();
    if (!body) return;

    const now = Date.now();
    await saveNote({
      id: `note:${lectureId}:${now}`,
      lectureId,
      courseId: course?.id ?? '',
      seconds: seconds ?? undefined,
      body,
      createdAt: now,
      updatedAt: now,
    });

    setNotes(await listNotes(lectureId));
    setLineNote('');
    setComposingAt(null);
    onChanged();
  };

  const [insightState, setInsightState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [insightError, setInsightError] = useState<string | null>(null);

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
   * Derive what this lecture is about.
   *
   * Lazy, and only on request: it loads the embedding model and indexes the
   * transcript, which is seconds of work. Doing that on mount would make every
   * lecture slow to open for the sake of a tab most visits never reach.
   */
  const buildInsights = async () => {
    const transcript = await getTranscript(lectureId).catch(() => undefined);
    if (!transcript?.text) {
      setInsightState('error');
      setInsightError('No transcript stored for this lecture.');
      return;
    }

    setInsightState('running');
    setInsightError(null);

    try {
      const blocks = buildChunks(
        transcript.text,
        {},
        { targetTokens: 55, maxTokens: 85, overlapTokens: 0, contextualize: false },
      );
      const payload = blocks.map((block) => ({
        chunkIndex: block.chunkIndex,
        text: block.content,
      }));

      await searchService.indexSemantic(payload, `lecture:${lectureId}:${blocks.length}`);

      const analysis = await searchService.analyze(
        transcript.text,
        (position) => blocks[position]?.startSeconds ?? null,
      );

      // The chapters are what make this readable, and what keep the written
      // tier inside its token budget: a chapter's key lines are a hundred
      // words where the whole transcript is three thousand.
      const summary = await searchService.summarize(transcript.text, analysis.chapters);
      const byChapter = new Map(summary.perChapter.map((entry) => [entry.chapter, entry.sentences]));

      setOutline(
        analysis.chapters
          .map((chapter, position) => ({
            index: chapter.index,
            title: analysis.chapterTitles[chapter.index] ?? `Part ${position + 1}`,
            startSeconds: chapter.startSeconds,
            lines: byChapter.get(chapter.index) ?? [],
          }))
          .filter((chapter) => chapter.lines.length > 0),
      );

      // Statements the lecturer actually made, matched by Hearst patterns
      // ("X is a Y", "X is called Y"). Extraction, so nothing is invented —
      // these are the definitions and rules the lecture stated outright.
      setDefinitions(extractDefinitions(cleanCues(parseTranscript(transcript.text))).slice(0, 8));

      setConcepts(analysis.concepts.slice(0, 10));
      setKeyMoments(summary.overall);
      setInsightState('done');
    } catch (cause) {
      console.error('[lecture] insights failed', cause);
      setInsightError(cause instanceof Error ? cause.message : 'Could not read this transcript.');
      setInsightState('error');
    }
  };

  /**
   * Write prose, chapter by chapter.
   *
   * This is the map step the token cap forces. The model accepts roughly 750
   * words; a lecture is three thousand, but a chapter's selected lines are
   * about a hundred. So each chapter is summarised on its own and the results
   * are kept separate — which also reads better than one paragraph trying to
   * cover twenty minutes.
   */
  const writeSummary = async () => {
    if (outline.length === 0 && (!keyMoments || keyMoments.length === 0)) return;
    setWriting(true);

    try {
      // Whole-lecture blurb, from the overall selection rather than the text.
      if (keyMoments && keyMoments.length > 0) {
        const result = await summarizeWithModel(keyMoments.map((line) => line.text).join(' '), {
          type: 'tldr',
          length: 'short',
        });
        setWritten(
          result.text ??
            (result.tooLong
              ? 'Still too long for the on-device model.'
              : (result.error ?? 'No summary was produced.')),
        );
      }

      for (const chapter of outline) {
        const source = chapter.lines.map((line) => line.text).join(' ');
        if (!source) continue;

        const result = await summarizeWithModel(source, { type: 'key-points', length: 'short' });
        if (result.text) {
          setChapterProse((current) => ({ ...current, [chapter.index]: result.text as string }));
        }
      }
    } finally {
      setWriting(false);
    }
  };

  /** Show where a concept is discussed, in the transcript itself. */
  const showInTranscript = (phrase: string) => {
    setFilter(phrase);
    setTab('transcript');
  };

  const unreadShots = screenshots.filter((shot) => shot.readout === undefined);

  /**
   * Transcribe the stills that have not been read.
   *
   * Written back into the library rather than the old standalone frame store,
   * so the dashboard and the popup are reading the same records.
   */
  const readScreenshots = async () => {
    const queue = screenshots.filter((shot) => shot.readout === undefined);
    if (queue.length === 0) return;

    setReadingShots(true);
    setReadProgress({ done: 0, total: queue.length });

    for (let i = 0; i < queue.length; i += 1) {
      const shot = queue[i];
      const image = new Blob([dataUrlBytes(shot.dataUrl) as BlobPart], { type: 'image/png' });
      const result = await readFrameText(image);

      // A failed read leaves the record untouched so it can be retried; an
      // empty one is stored as "" so a blank slide is not read forever.
      if (!result.error) {
        await saveScreenshot({ ...shot, readout: result.text ?? '' });
      }
      setReadProgress({ done: i + 1, total: queue.length });
    }

    setScreenshots(await listScreenshots(lectureId));
    setReadingShots(false);
    setReadProgress(null);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const transcript = await getTranscript(lectureId).catch(() => undefined);
      if (cancelled) return;
      setCues(transcript ? cleanCues(parseTranscript(transcript.text)) : []);

      const courseId = transcript?.courseId;
      if (courseId) {
        const [found, inCourse] = await Promise.all([
          getCourse(courseId).catch(() => undefined),
          listLectures(courseId).catch(() => [] as LectureRecord[]),
        ]);
        if (cancelled) return;
        setCourse(found ?? null);
        setLecture(inCourse.find((entry) => entry.id === lectureId) ?? null);
      }

      const [shots, found, marked] = await Promise.all([
        listScreenshots(lectureId).catch(() => [] as ScreenshotRecord[]),
        listNotes(lectureId).catch(() => [] as NoteRecord[]),
        listHighlights(lectureId).catch(() => [] as HighlightRecord[]),
      ]);
      if (cancelled) return;
      setScreenshots(shots);
      setNotes(found);
      setHighlights(marked);
    })();

    return () => {
      cancelled = true;
    };
  }, [lectureId]);

  /**
   * The transcript as it is read: paragraphs or cues, filtered.
   *
   * Filtering happens after grouping rather than before, so a filter narrows
   * which paragraphs are shown instead of welding surviving cues from different
   * parts of the lecture into a paragraph nobody ever said.
   */
  const blocks = useMemo<Block[]>(() => {
    if (!cues) return [];

    const windowed = readingBlocks(cues, reader);
    const needle = filter.trim().toLowerCase();
    if (!needle) return windowed;
    return windowed.filter((block) => block.text.toLowerCase().includes(needle));
  }, [cues, filter, reader]);

  const copyAll = async () => {
    if (!cues) return;
    const text = cues
      .map((cue) => (cue.startSeconds === null ? cue.text : `[${clock(cue.startSeconds)}] ${cue.text}`))
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission can be refused; the text is still on screen.
    }
  };

  const addNote = async () => {
    const body = draft.trim();
    if (!body) return;

    // An empty or nonsensical timestamp means "not anchored", rather than 0 —
    // which would silently file every note at the start of the lecture.
    const parsed = Number(draftSeconds);
    const seconds =
      draftSeconds.trim() !== '' && Number.isFinite(parsed) && parsed >= 0
        ? Math.floor(parsed)
        : undefined;

    const now = Date.now();
    const note: NoteRecord = {
      id: `note:${lectureId}:${now}`,
      lectureId,
      courseId: course?.id ?? '',
      seconds,
      body,
      createdAt: now,
      updatedAt: now,
    };

    await saveNote(note);
    setNotes(await listNotes(lectureId));
    setDraft('');
    setDraftSeconds('');
    onChanged();
  };

  /**
   * Capture what the reader has selected, and the moment it starts at.
   *
   * The timestamp is worked out rather than asked for, because a highlight whose
   * moment has to be typed in is one nobody makes.
   */
  const readSelection = () => {
    const active = window.getSelection();
    const text = active?.toString().trim() ?? '';

    // Too short to be a passage — usually a stray click-drag.
    if (text.length < 4) {
      setSelection(null);
      return;
    }

    const anchor = active?.anchorNode;
    const element =
      anchor instanceof Element ? anchor : (anchor?.parentElement ?? null);
    const cue = element?.closest<HTMLElement>('[data-seconds]');
    const raw = cue?.dataset.seconds;
    const seconds = raw !== undefined && raw !== '' ? Number(raw) : Number.NaN;

    // The block's own start is the floor and the fallback; the cue the passage
    // begins in is better when it can be found.
    const blockStart = Number.isFinite(seconds) ? seconds : undefined;
    setSelection({
      text,
      seconds: momentOfPassage(cues ?? [], text, blockStart ?? null) ?? blockStart,
    });
  };

  const addHighlight = async () => {
    if (!selection) return;

    const now = Date.now();
    await saveHighlight({
      id: `highlight:${lectureId}:${now}`,
      lectureId,
      courseId: course?.id ?? '',
      seconds: selection.seconds,
      text: selection.text,
      createdAt: now,
    });

    setHighlights(await listHighlights(lectureId));
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    onChanged();
  };

  const removeHighlight = async (id: string) => {
    await deleteHighlight(id);
    setHighlights(await listHighlights(lectureId));
    onChanged();
  };

  /**
   * Blocks that contain a highlighted passage, for marking them in the reader.
   *
   * Indexed by position in `blocks` rather than in `cues`, so the mark follows
   * the block it belongs to when the layout changes or a filter is applied.
   */
  const highlightedBlocks = useMemo(() => {
    const marked = new Set<number>();
    blocks.forEach((block, index) => {
      if (highlights.some((highlight) => highlight.text && block.text.includes(highlight.text))) {
        marked.add(index);
      }
    });
    return marked;
  }, [blocks, highlights]);

  const removeNote = async (id: string) => {
    await deleteNote(id);
    setNotes(await listNotes(lectureId));
    onChanged();
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'insights', label: 'Insights' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'highlights', label: 'Highlights', count: highlights.length },
    { id: 'screenshots', label: 'Screenshots', count: screenshots.length },
    { id: 'notes', label: 'Notes', count: notes.length },
  ];

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-3 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Library
      </button>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight">
            {lecture?.title ?? 'Lecture'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {[course?.title, lecture ? `${lecture.wordCount.toLocaleString()} words` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        {/* In the header rather than on the transcript tab: what this writes
            out is the work from every tab, not the words from one of them. */}
        <div className="relative shrink-0">
          <button
            onClick={() => setExportOpen((open) => !open)}
            aria-expanded={exportOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[12px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {exportOpen && (
            <>
              {/* Clicking anywhere else closes it, which is what a menu does. */}
              <button
                aria-hidden
                tabIndex={-1}
                onClick={() => setExportOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />

              <div
                role="menu"
                className="absolute right-0 z-20 mt-1.5 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Your study notes
                </p>

                <button
                  role="menuitem"
                  onClick={() => void exportAs({ kind: 'study', withTranscript: true })}
                  className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Study notes
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                    Transcript, with what you marked
                  </span>
                </button>

                <button
                  role="menuitem"
                  onClick={() => void exportAs({ kind: 'study', withTranscript: false })}
                  disabled={marked === 0}
                  className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-slate-800 dark:disabled:hover:bg-transparent transition-colors"
                >
                  Just what you marked
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                    {marked === 0
                      ? 'Nothing marked in this lecture yet'
                      : `${marked} item${marked === 1 ? '' : 's'}, without the transcript`}
                  </span>
                </button>

                <p className="mt-1 border-t border-slate-100 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  Transcript only
                </p>

                {PLAIN_EXPORTS.map((entry) => (
                  <button
                    key={entry.format}
                    role="menuitem"
                    onClick={() => void exportAs({ kind: 'format', format: entry.format })}
                    className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 mb-4">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setTab(entry.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
              tab === entry.id
                ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {entry.label}
            {entry.count !== undefined && entry.count > 0 && (
              <span className="ml-1.5 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                {entry.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'insights' && (
        <div className="max-w-2xl">
          {insightState === 'idle' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5">
              <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 mb-3">
                Pull out the key moments and the concepts this lecture actually covers — read from
                the transcript on this machine, with no model download.
              </p>
              <button
                onClick={() => void buildInsights()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Read this lecture
              </button>
            </div>
          )}

          {insightState === 'running' && (
            <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading the transcript…
            </p>
          )}

          {insightState === 'error' && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <p className="text-[13px] text-amber-800 dark:text-amber-300">
                {insightError ?? 'That did not finish.'}
              </p>
              <button
                onClick={() => void buildInsights()}
                className="mt-2 rounded-lg border border-amber-300 dark:border-amber-800 px-2.5 py-1 text-[12px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {insightState === 'done' && (
            <div className="space-y-6">
              {concepts.length > 0 && (
                <section>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                    What this covers
                  </h2>
                  {/* Each one shows where it is discussed, rather than
                      answering for the lecture — nothing is generated, so
                      nothing can claim something the lecturer did not say. */}
                  <div className="flex flex-wrap gap-1.5">
                    {concepts.map((concept) => (
                      <button
                        key={concept.phrase}
                        onClick={() => showInTranscript(concept.phrase)}
                        title={`Mentioned ${concept.occurrences} times — show in the transcript`}
                        className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
                      >
                        {concept.phrase}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {canWrite && written === null && Object.keys(chapterProse).length === 0 && (
                <button
                  onClick={() => void writeSummary()}
                  disabled={writing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-50 transition-colors"
                >
                  {writing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {writing ? 'Writing, chapter by chapter…' : 'Write it as prose'}
                </button>
              )}

              {written !== null && (
                <section>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                    In short
                  </h2>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-900/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1.5">
                      Written by the on-device model
                    </p>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                      {written}
                    </p>
                  </div>
                </section>
              )}

              {/* The lecture's shape. Titled chapters with the lines that
                  carry them read as notes; a flat list of sentences does not. */}
              {outline.length > 0 && (
                <section>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
                    How it goes · {outline.length} parts
                  </h2>

                  <ol className="space-y-5">
                    {outline.map((chapter, position) => (
                      <li key={chapter.index}>
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <TimeButton
                            seconds={chapter.startSeconds}
                            className="shrink-0 text-[11px] font-mono tabular-nums"
                          />
                          <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                            {position + 1}. {chapter.title}
                          </h3>
                        </div>

                        {chapterProse[chapter.index] && (
                          <p className="mb-2 whitespace-pre-wrap rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 px-3 py-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                            {chapterProse[chapter.index]}
                          </p>
                        )}

                        <ul className="space-y-1.5 border-l-2 border-slate-200 dark:border-slate-800 pl-3">
                          {chapter.lines.map((line) => (
                            <li key={line.index} className="group">
                              <div className="flex items-start gap-2">
                                <p className="flex-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                                  {line.text}
                                </p>
                                <LineActions line={line} />
                              </div>
                              {composingAt !== null && composingAt === line.startSeconds && (
                                <NoteComposer seconds={line.startSeconds} />
                              )}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Statements the lecturer made outright — matched by pattern,
                  never inferred, so a "fact" here was genuinely said. */}
              {definitions.length > 0 && (
                <section>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                    Stated in this lecture
                  </h2>
                  <ul className="space-y-1.5">
                    {definitions.map((definition) => (
                      <li key={`${definition.term}-${definition.startSeconds}`} className="group">
                        <div className="flex items-start gap-3">
                          <TimeButton seconds={definition.startSeconds} />
                          <p className="flex-1 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                            <span className="font-semibold">{definition.term}</span> —{' '}
                            {definition.sentence}
                          </p>
                          <LineActions
                            line={{ text: definition.sentence, startSeconds: definition.startSeconds }}
                          />
                        </div>
                        {composingAt !== null && composingAt === definition.startSeconds && (
                          <NoteComposer seconds={definition.startSeconds} />
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* What was on screen. Formulas and diagrams live here, not in
                  the words — and the image is the check on the transcription. */}
              {screenshots.length > 0 && (
                <section>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                    On screen
                  </h2>
                  <ul className="space-y-3">
                    {screenshots.map((shot) => (
                      <li key={shot.seconds} className="flex gap-3">
                        <TimeButton seconds={shot.seconds} />
                        <div className="min-w-0">
                          <img
                            src={shot.dataUrl}
                            alt={`Frame at ${clock(shot.seconds)}`}
                            className="max-w-sm rounded-lg border border-slate-200 dark:border-slate-700"
                          />
                          {shot.readout ? (
                            <pre className="mt-1 max-w-sm whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                              {shot.readout}
                            </pre>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'transcript' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter this transcript…"
              className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            />
            {/* Paragraphs or cues. The exports have always written prose;
                this is the reader catching up with them. */}
            <div className="flex shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
              <button
                onClick={() => chooseReader('paragraphs')}
                aria-pressed={reader === 'paragraphs'}
                title="Read as paragraphs"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  reader === 'paragraphs'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Pilcrow className="w-3.5 h-3.5" />
                Paragraphs
              </button>
              <button
                onClick={() => chooseReader('lines')}
                aria-pressed={reader === 'lines'}
                title="Read line by line, one caption cue each"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  reader === 'lines'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
                Lines
              </button>
            </div>

            <button
              onClick={() => void copyAll()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[12px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy all'}
            </button>
          </div>

          {/* Only ever shown when a jump did not land. A jump that worked
              speaks for itself in the other tab. */}
          {seekNote && (
            <div className="mb-3 flex max-w-3xl items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200">
                {seekNote}
              </p>
              <button
                onClick={() => setSeekNote(null)}
                aria-label="Dismiss"
                className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {cues === null ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading transcript…</p>
          ) : cues.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No transcript stored for this lecture.
            </p>
          ) : (
            <>
            <ul
              className="space-y-2.5 max-w-3xl"
              onMouseUp={readSelection}
              onKeyUp={readSelection}
            >
              {blocks.map((block, index) => {
                const attached = anchoredIn(notes, (note) => note.seconds, block);
                const stills = anchoredIn(screenshots, (shot) => shot.seconds, block);
                const composing = composingAt !== null && composingAt === block.startSeconds;

                return (
                  <li
                    key={`${block.startSeconds ?? 'x'}-${index}`}
                    // Read back off the DOM when something is selected, so a
                    // highlight knows its moment without being asked for it.
                    data-seconds={block.startSeconds ?? ''}
                    className="group flex gap-3"
                  >
                    <TimeButton seconds={block.startSeconds} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p
                          className={`flex-1 text-[14px] leading-relaxed ${
                            highlightedBlocks.has(index)
                              ? 'text-slate-900 dark:text-slate-50 border-l-2 border-amber-400 -ml-[9px] pl-2'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {block.text}
                        </p>

                        {/* On the line you are already looking at. Selecting
                            text and hunting for a toolbar is a lot of work for
                            a thought you had mid-sentence. */}
                        <LineActions line={block} />
                      </div>

                      {composing && <NoteComposer seconds={block.startSeconds} />}

                      {/* Notes and stills sit with the words they belong to,
                          not in a separate tab the reader has to correlate. */}
                      {attached.map((note) => (
                        <p
                          key={note.id}
                          className="mt-1.5 rounded-lg border-l-2 border-blue-400 bg-blue-50/60 dark:bg-blue-900/20 px-2.5 py-1.5 text-[12px] leading-relaxed text-slate-700 dark:text-slate-200"
                        >
                          {note.body}
                        </p>
                      ))}

                      {stills.map((shot) => (
                        <figure key={shot.seconds} className="mt-2">
                          <img
                            src={shot.dataUrl}
                            alt={`Frame at ${clock(shot.seconds)}`}
                            className="max-w-md rounded-lg border border-slate-200 dark:border-slate-700"
                          />
                          {shot.readout ? (
                            <figcaption className="mt-1 max-w-md whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                              {shot.readout}
                            </figcaption>
                          ) : null}
                        </figure>
                      ))}
                    </div>
                  </li>
                );
              })}
              {blocks.length === 0 && (
                <li className="text-sm text-slate-500 dark:text-slate-400">
                  Nothing in this transcript matches “{filter}”.
                </li>
              )}
            </ul>

            {/* Appears only with a selection, anchored to the viewport so it is
                reachable wherever in a long transcript the reader is. */}
            {selection && (
              <div className="sticky bottom-4 mt-4 flex max-w-3xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <span className="min-w-0 flex-1 truncate text-[12px] text-slate-500 dark:text-slate-400">
                  {selection.seconds !== undefined && (
                    <span className="font-mono tabular-nums mr-1.5">
                      {clock(selection.seconds)}
                    </span>
                  )}
                  “{selection.text}”
                </span>
                <button
                  onClick={() => void addHighlight()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  Highlight
                </button>
              </div>
            )}
            </>
          )}
        </div>
      )}

      {tab === 'highlights' && (
        <div className="max-w-2xl">
          {highlights.length === 0 ? (
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Nothing highlighted yet. Select any passage in the Transcript tab and a Highlight
              button appears — the moment it was said is captured with it.
            </p>
          ) : (
            <ul className="space-y-2">
              {highlights.map((highlight) => (
                <li
                  key={highlight.id}
                  className="group flex gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5"
                >
                  <TimeButton seconds={highlight.seconds ?? null} />
                  <div className="min-w-0 flex-1">
                    <p className="border-l-2 border-amber-400 pl-3 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                      {highlight.text}
                    </p>

                    {/* The reader's own words about the lecturer's. This is
                        what turns a saved quote into a thought worth keeping. */}
                    {highlight.note ? (
                      <p className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {highlight.note}
                      </p>
                    ) : annotating === highlight.id ? (
                      <div className="mt-2">
                        <textarea
                          value={highlightNote}
                          onChange={(event) => setHighlightNote(event.target.value)}
                          rows={2}
                          autoFocus
                          placeholder="What did you want to say about this?"
                          className="w-full resize-y rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-[12px] leading-relaxed outline-none focus:border-blue-500 transition"
                        />
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            onClick={() => void annotateHighlight(highlight)}
                            disabled={!highlightNote.trim()}
                            className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setAnnotating(null)}
                            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAnnotating(highlight.id);
                          setHighlightNote('');
                        }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <StickyNote className="w-3 h-3" />
                        Add a note
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => void removeHighlight(highlight.id)}
                    aria-label="Delete highlight"
                    className="shrink-0 self-start rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'screenshots' && (
        <div>
          {/* Offered only where the model is installed, so the button is never
              a promise this machine cannot keep. Everything else on this tab
              works regardless. */}
          {canRead && unreadShots.length > 0 && (
            <button
              onClick={() => void readScreenshots()}
              disabled={readingShots}
              className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              {readingShots ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ScanText className="w-3.5 h-3.5" />
              )}
              {readingShots && readProgress
                ? `Reading ${readProgress.done}/${readProgress.total}`
                : `Read ${unreadShots.length} with on-device AI`}
            </button>
          )}

          {screenshots.length === 0 ? (
            <div className="max-w-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                No stills captured from this lecture. A transcript cannot show a diagram or a line
                of code, so capture the frame instead.
              </p>
              {/* The shortcut is the reason this is worth doing mid-lecture: the
                  popup closes the moment you click back into the page. */}
              <p className="mt-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                While watching, press{' '}
                <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800">
                  Alt+Shift+S
                </kbd>{' '}
                on the lecture page — or use “Capture frame” in the extension popup.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 max-w-3xl">
              {screenshots.map((shot) => (
                <li
                  key={shot.seconds}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900"
                >
                  <img
                    src={shot.dataUrl}
                    alt={`Frame at ${clock(shot.seconds)}`}
                    className="w-full"
                  />
                  <div className="px-3 py-2">
                    <TimeButton
                      seconds={shot.seconds}
                      className="block text-[11px] font-mono tabular-nums"
                    />
                    {shot.readout ? (
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed font-mono text-slate-700 dark:text-slate-200">
                        {shot.readout}
                      </pre>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="max-w-2xl">
          {/* The shortcut is invisible otherwise, and an undiscoverable
              shortcut is the same as no shortcut. */}
          <p className="mb-3 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            While watching, press{' '}
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800">
              Alt+Shift+N
            </kbd>{' '}
            on the lecture page to write a note without leaving the video.
          </p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 mb-4">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="What did you want to remember about this lecture?"
              className="w-full resize-y rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                value={draftSeconds}
                onChange={(event) => setDraftSeconds(event.target.value)}
                inputMode="numeric"
                placeholder="Seconds (optional)"
                className="w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-[12px] outline-none focus:border-blue-500 transition"
              />
              <button
                onClick={() => void addNote()}
                disabled={!draft.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add note
              </button>
            </div>
          </div>

          {notes.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No notes on this lecture yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="group flex gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5"
                >
                  <TimeButton seconds={note.seconds ?? null} />
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                    {note.body}
                  </p>
                  <button
                    onClick={() => void removeNote(note.id)}
                    aria-label="Delete note"
                    className="shrink-0 self-start rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
