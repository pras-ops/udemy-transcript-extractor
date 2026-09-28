'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sun,
  Moon,
  Download,
  Clipboard,
  Play,
  Lock,
  Github,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Loader2,
  ArrowRight,
  ChevronRight,
  Camera,
  ScanText,
  Zap,
  ChevronDown,
  Library,
  FileText,
  Highlighter,
  StickyNote,
  X,
} from 'lucide-react';
import { StorageService } from '../../lib/storage-service';
import type { ExportFormat } from '../../lib/extension-service';
import type { SourceMeta } from '../../lib/transcript';
import {
  addLecture,
  lectureId,
  loadCollection,
  saveCollection,
  totalWords,
  type CollectedLecture,
} from '../../lib/collection';
import { TranscriptSearch } from '../TranscriptSearch';
import {
  allFrames,
  captureCurrentFrame,
  deleteFrame,
  framesForLecture,
  readAndStoreFrame,
} from '../../lib/frame-service';
import { planFrameExport, type CapturedFrame } from '../../lib/frame-capture';
import { probeImageModel, startModelDownload, type AiProbe } from '../../lib/on-device-ai';
import { createZip, dataUrlBytes, textBytes } from '../../lib/zip';
import { searchService } from '../../lib/search-service';
import { applyTheme, storeTheme } from '../../lib/theme';
import { lectureActivity, setLectureComplete } from '../../lib/library-db';
import {
  activityCount,
  countWords,
  lectureStatus,
  STATUS_LABELS,
  type LectureActivity,
} from '../../lib/library-schema';
import {
  loadCourseCollection,
  removeCourseLecture,
  saveCourseLecture,
} from '../../lib/collection-store';

// Helper function for dynamic ExtensionService import
const getExtensionService = async () => {
  const { ExtensionService } = await import('../../lib/extension-service');
  return ExtensionService;
};

/** What each export is for, shown under the picker so the choice is obvious. */
/** Short name for the collapsed export row, so the choice stays visible. */
const FORMAT_LABELS: Record<ExportFormat, string> = {
  markdown: 'Markdown',
  organized: 'Organized notes',
  obsidian: 'Obsidian',
  txt: 'Plain text',
  json: 'JSON',
  rag: 'Retrieval chunks',
  srt: 'SubRip',
  vtt: 'WebVTT',
  csv: 'Spreadsheet',
  anki: 'Anki cards',
};

const FORMAT_HINTS: Record<ExportFormat, string> = {
  markdown:
    'Readable notes with plain-text timestamps. Best for pasting into ChatGPT, Claude or Notion.',
  organized:
    'The transcript rewritten as notes: headings per topic, time ranges, paragraphs. Still the lecturer’s words.',
  obsidian:
    'Markdown plus YAML properties and a contents list, so a course drops straight into a vault.',
  txt: 'Plain text, no formatting. Works anywhere.',
  rag: 'Pre-chunked with context headers and timestamps, ready for a vector store or NotebookLM.',
  srt: 'Standard subtitle file for video editors and players.',
  vtt: 'Web subtitle format, for HTML5 players.',
  csv: 'One row per line with timestamps and links. Imports into Excel, Sheets, Anki, or Quizlet.',
  json: 'Structured cues for your own scripts.',
  anki: 'Fill-in-the-blank flashcards built from the lecture, ready to import into Anki.',
};

/** `mm:ss`, or `h:mm:ss` past an hour — the label on a captured still. */
const formatClockLabel = (seconds: number): string => {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(safe / 3600);
  const mm = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** Narrow the content script's platform string to the exported metadata type. */
const toPlatform = (value?: string): SourceMeta['platform'] =>
  value === 'udemy' || value === 'youtube' || value === 'coursera' || value === 'generic'
    ? value
    : 'unknown';

// Simple debouncing utility
const debounce = (func: (...args: unknown[]) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Custom LogIcon component using actual Log.png image
// Professional SVG Logo Component
const TranscriptIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M14 2V8H20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 13H8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 17H8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 9H8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TranscriptExtractorPopup = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown');
  const [exportTarget, setExportTarget] = useState<'clipboard' | 'download'>('clipboard');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  const [isExtracting, setIsExtracting] = useState(false);
  const [availability, setAvailability] = useState<{
    platform: string;
    hasTranscript: boolean;
    isCoursePage: boolean;
  } | null>(null);
  const [currentVideo, setCurrentVideo] = useState<{ title: string; duration: string } | null>(
    null
  );
  const [courseStructure, setCourseStructure] = useState<any>(null);
  const [isCourseStructureLoading, setIsCourseStructureLoading] = useState(false);
  const [extractedTranscript, setExtractedTranscript] = useState<string>('');
  const [extractionStatus, setExtractionStatus] = useState<
    'idle' | 'extracting' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Source page URL, used to build timestamped deep links in exports.
  const [pageUrl, setPageUrl] = useState<string | null>(null);

  // Transcripts gathered across this course, so exports cover the whole thing
  // rather than whichever lecture happened to be open last.
  const [collection, setCollection] = useState<CollectedLecture[]>([]);

  // Simple navigation state
  const [isNavigating, setIsNavigating] = useState(false);

  // Semantic search over the extracted transcript, running locally on CPU.
  const [showSearch, setShowSearch] = useState(false);

  // Stills captured from the video. A transcript cannot show a line of code or
  // a diagram, which is most of what a programming lecture is made of.
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureNote, setCaptureNote] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(
    null,
  );

  const currentLectureId = useMemo(
    () => lectureId(pageUrl ?? undefined, currentVideo?.title ?? 'lecture'),
    [pageUrl, currentVideo?.title],
  );

  // Can this browser read a screenshot on its own? Checked, never assumed:
  // Chrome's on-device model is absent on plenty of machines, so anything
  // built on it has to be an enhancement rather than a promise. Probing does
  // not start the model download.
  const [aiProbe, setAiProbe] = useState<AiProbe | null>(null);
  const [isInstallingModel, setIsInstallingModel] = useState(false);
  const [installProgress, setInstallProgress] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    probeImageModel().then((probe) => {
      if (!cancelled) setAiProbe(probe);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Chrome will not fetch the model on its own — it sits at "Pending Usage"
  // until something asks for it. This is that ask, and it is a button rather
  // than something automatic because about 4 GB crosses the network.
  const handleInstallModel = async () => {
    setIsInstallingModel(true);
    setInstallProgress(null);
    try {
      setAiProbe(await startModelDownload(setInstallProgress));
    } finally {
      setIsInstallingModel(false);
    }
  };

  // Reload stills whenever the lecture changes, so the strip always shows the
  // frames belonging to the video on screen.
  useEffect(() => {
    let cancelled = false;
    framesForLecture(currentLectureId)
      .then((stored) => {
        if (!cancelled) setFrames(stored);
      })
      .catch(() => {
        if (!cancelled) setFrames([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentLectureId]);

  const handleCaptureFrame = async () => {
    setIsCapturing(true);
    setCaptureNote(null);
    try {
      const result = await captureCurrentFrame(currentLectureId);
      if (result.verdict === 'ok' && result.frame) {
        setFrames(await framesForLecture(currentLectureId));
        setCaptureNote({ tone: 'ok', text: 'Frame captured.' });
      } else {
        setCaptureNote({
          tone: 'warn',
          text: result.message ?? 'That frame could not be captured.',
        });
      }
    } catch (error) {
      setCaptureNote({
        tone: 'warn',
        text: error instanceof Error ? error.message : 'That frame could not be captured.',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDeleteFrame = async (seconds: number) => {
    await deleteFrame(currentLectureId, seconds);
    setFrames(await framesForLecture(currentLectureId));
  };

  // Frames the model has not looked at yet. `undefined` is "not attempted";
  // an empty string is "read, nothing legible" and is not retried.
  const unreadFrames = frames.filter((frame) => frame.readout === undefined);
  const [isReadingFrames, setIsReadingFrames] = useState(false);
  const [readProgress, setReadProgress] = useState<{ done: number; total: number } | null>(null);

  // Which still is open for inspection. Transcribed text has to be readable in
  // the popup: a badge saying text was found is not evidence of what it says,
  // and a tooltip is not somewhere anyone checks accuracy.
  const [openFrame, setOpenFrame] = useState<number | null>(null);

  // Organising loads the 30 MB embedding model if search has not already done
  // so. Without a working state the buttons look broken for a second or two.
  const [isExporting, setIsExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  /**
   * Whether the user has chosen export settings during this popup session.
   *
   * Restoring saved state is asynchronous, and the popup is usable before it
   * resolves. Without this guard a choice made in that window is silently
   * reverted a moment later: you pick a format, the restore lands, the select
   * snaps back, and the export uses the old format with no sign anything
   * happened.
   */
  const userChoseSettings = useRef(false);
  const inspected = frames.find((frame) => frame.seconds === openFrame) ?? null;

  const handleReadFrames = async () => {
    const queue = frames.filter((frame) => frame.readout === undefined);
    if (queue.length === 0) return;

    setIsReadingFrames(true);
    setReadProgress({ done: 0, total: queue.length });
    setCaptureNote(null);

    let failure: string | null = null;
    for (let i = 0; i < queue.length; i += 1) {
      const result = await readAndStoreFrame(queue[i]);
      if (result.error) failure = result.error;
      setReadProgress({ done: i + 1, total: queue.length });
    }

    setFrames(await framesForLecture(currentLectureId));
    setIsReadingFrames(false);
    setReadProgress(null);
    setCaptureNote(
      failure
        ? { tone: 'warn', text: failure }
        : { tone: 'ok', text: 'Screenshots read. The text is included when you export.' },
    );
  };


  const handleThemeToggle = () => {
    const next = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(next === 'dark');
    storeTheme(next);
  };

  // Check availability when component mounts and load saved state
  useEffect(() => {
    // One implementation, shared with the dashboard.
    //
    // The popup used to decide this itself with `saved === 'dark'`, which
    // ignores the system preference entirely. Two surfaces of the same
    // extension, on the same origin, could therefore disagree about the theme
    // — the popup opening dark and the library opening light.
    setIsDarkMode(applyTheme() === 'dark');

    loadSavedState();
    checkPageAvailability();

    return () => {
      setExtractionStatus('idle');
      setExtractedTranscript('');
    };
  }, []);

  // Auto-save course structure when it changes
  useEffect(() => {
    if (courseStructure) {
      StorageService.saveCourseStructure(courseStructure);
    }
  }, [courseStructure]);

  // Auto-save UI preferences when they change
  useEffect(() => {
    StorageService.saveState({
      exportFormat,
      exportTarget,
      includeTimestamps,
      extractedTranscript,
      extractionStatus,
    });
  }, [exportFormat, exportTarget, includeTimestamps, extractedTranscript, extractionStatus]);

  // Load saved state from Chrome storage
  const loadSavedState = async () => {
    try {
      const savedState = await StorageService.loadState();

      // Never overwrite a choice the user has already made this session.
      if (!userChoseSettings.current) {
        setExportFormat(savedState.exportFormat);
        setExportTarget(savedState.exportTarget);
        setIncludeTimestamps(savedState.includeTimestamps);
      }

      if (savedState.extractedTranscript && savedState.extractedTranscript.trim().length > 0) {
        setExtractedTranscript(savedState.extractedTranscript);
        setExtractionStatus(savedState.extractionStatus === 'success' ? 'success' : 'idle');
      } else {
        setExtractedTranscript('');
        setExtractionStatus('idle');
      }

      if (savedState.courseStructure) {
        setCourseStructure(savedState.courseStructure);
      }
      if (savedState.currentVideo) {
        setCurrentVideo(savedState.currentVideo);
      }
      if (savedState.availability) {
        setAvailability(savedState.availability);
      }
    } catch (error) {
      // Failed to load saved state
    }
  };

  const checkPageAvailability = async () => {
    try {
      setExtractionStatus('extracting');
      setErrorMessage('');

      const response = await (await getExtensionService()).checkAvailability();
      const url = await (await getExtensionService()).getCurrentTabUrl();
      setPageUrl(url);
      // Reads the indexed library, migrating this course across on first sight
      // and falling back to the old storage if anything goes wrong.
      setCollection(
        await loadCourseCollection(url ?? undefined, {
          courseTitle: courseStructure?.title,
          instructor: courseStructure?.instructor,
        }),
      );

      if (response.success && response.data) {
        setAvailability(response.data);
        setExtractionStatus('idle');

        if (response.data.isCoursePage) {
          const videoInfo = await (await getExtensionService()).getVideoInfo();
          if (videoInfo.success && videoInfo.data) {
            setCurrentVideo(videoInfo.data);
          }

          setIsCourseStructureLoading(true);
          const courseResponse = await (await getExtensionService()).extractCourseStructure();
          if (courseResponse.success && courseResponse.data) {
            setCourseStructure(courseResponse.data);
          } else {
            setCourseStructure({ title: 'Unknown Course', sections: [] });
          }
          setIsCourseStructureLoading(false);
        }
      } else {
        setErrorMessage(response.error || 'Could not detect page type');
        setExtractionStatus('error');
        setAvailability({
          platform: 'unknown',
          hasTranscript: false,
          isCoursePage: false,
        });
      }
    } catch (error) {
      setErrorMessage('Extension communication failed');
      setExtractionStatus('error');
      setAvailability({
        platform: 'unknown',
        hasTranscript: false,
        isCoursePage: false,
      });
    }
  };

  const handleExtractTranscript = async () => {
    if (!availability?.hasTranscript) {
      setErrorMessage('No transcript available for this video');
      setExtractionStatus('error');
      return;
    }

    setIsExtracting(true);
    setExtractionStatus('extracting');
    setErrorMessage('');

    try {
      const response = await (await getExtensionService()).extractTranscript();

      if (response.success && response.data) {
        setExtractedTranscript(response.data);
        setExtractionStatus('success');

        // Add to the course collection rather than replacing it. Moving to the
        // next lecture used to discard the previous one, which made the tool
        // work per video and not per course.
        const id = lectureId(pageUrl ?? undefined, currentVideo?.title ?? 'lecture');
        const collected = {
          id,
          title: currentVideo?.title || 'Untitled lecture',
          url: pageUrl ?? undefined,
          transcript: response.data,
          collectedAt: Date.now(),
        };
        const next = addLecture(collection, collected);
        setCollection(next);
        void saveCourseLecture(collected, next, pageUrl ?? undefined, {
          courseTitle: courseStructure?.title,
          instructor: courseStructure?.instructor,
        });

        try {
          const copied = await (await getExtensionService()).copyToClipboard(response.data);
          if (!copied) {
            setErrorMessage('Transcript extracted but failed to copy to clipboard');
          }
        } catch (clipboardError) {
          setErrorMessage('Transcript extracted but failed to copy to clipboard');
        }
      } else {
        setErrorMessage(response.error || 'Failed to extract transcript');
        setExtractionStatus('error');
      }
    } catch (error) {
      setErrorMessage('Error extracting transcript');
      setExtractionStatus('error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExport = async (action: 'clipboard' | 'download') => {
    if (!extractedTranscript) {
      setErrorMessage('No transcript available to export');
      return;
    }

    const service = await getExtensionService();

    // One list, used for both the document and the screenshot archive. They
    // have to describe the same set of lectures or the images in the export
    // point at sections that are not there.
    const exportedLectures =
      collection.length > 0
        ? collection
        : [
            {
              id: currentLectureId,
              title: currentVideo?.title ?? 'Transcript',
              url: pageUrl ?? undefined,
              transcript: extractedTranscript,
            },
          ];

    // Organised notes are built by the search service, not the formatter: they
    // need the embedding model to find where the topic turns, and the
    // formatter is synchronous and model-free by design.
    //
    // One document per lecture, because section boundaries and time ranges are
    // meaningless across videos whose clocks both start at zero.
    if (exportFormat === 'organized') {
      setIsExporting(true);
      try {
        const parts: string[] = [];
        for (const lecture of exportedLectures) {
          if (!lecture.transcript) continue;
          const notes = await searchService.organize(lecture.transcript, {
            title: lecture.title,
            courseTitle: courseStructure?.title,
            instructor: courseStructure?.instructor,
            url: lecture.url,
            savedAt: new Date().toLocaleString(),
          });
          if (notes.trim()) parts.push(notes.trim());
        }

        if (parts.length === 0) {
          setErrorMessage('There was nothing to organise.');
          return;
        }

        const organized = parts.join('\n\n---\n\n') + '\n';
        const filename = service.generateFilename(
          currentVideo?.title || 'transcript',
          'organized',
        );

        if (action === 'clipboard') {
          const copied = await service.copyToClipboard(organized);
          setErrorMessage(copied ? '' : 'Failed to copy to clipboard');
        } else {
          service.downloadFile(organized, filename, service.getMimeType('organized'));
          setErrorMessage('');
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? `Could not organise: ${error.message}` : 'Could not organise.',
        );
      } finally {
        setIsExporting(false);
      }
      return;
    }

    const formattedTranscript = service.formatCollection(
      exportedLectures,
      exportFormat,
      includeTimestamps,
      {
        url: pageUrl ?? undefined,
        platform: toPlatform(availability?.platform),
        courseTitle: courseStructure?.title,
        instructor: courseStructure?.instructor,
      }
    );

    try {
      switch (action) {
        case 'clipboard': {
          // The clipboard cannot carry image files, but it can carry what was
          // read off them — which is the part a chat window or a notes app can
          // actually use.
          const plan = planFrameExport(formattedTranscript, await allFrames(), {
            lectures: exportedLectures,
            includeImages: false,
          });

          const copied = await service.copyToClipboard(plan.markdown);
          if (!copied) {
            setErrorMessage('Failed to copy to clipboard');
          } else {
            setErrorMessage('');
          }
          break;
        }

        case 'download': {
          const service = await getExtensionService();
          const filename = service.generateFilename(
            currentVideo?.title || 'transcript',
            exportFormat
          );

          // With screenshots, the deliverable is a folder, not a file: the
          // document plus the images it references. Data URIs were the other
          // option and would inflate a course export beyond usefulness.
          const documentFormat =
            exportFormat === 'markdown' || exportFormat === 'obsidian' || exportFormat === 'txt';

          // Screenshots come from every lecture in the export, not just the one
          // on screen. `planFrameExport` drops any frame whose lecture is not
          // part of this document, and names the files so two lectures cannot
          // collide on a frame captured at the same second.
          const exportFrames = await allFrames();
          const plan = planFrameExport(formattedTranscript, exportFrames, {
            lectures: exportedLectures,
          });

          if (plan.files.length > 0 && documentFormat) {
            const archive = createZip([
              { name: filename, data: textBytes(plan.markdown) },
              ...plan.files.map((file) => ({
                name: file.path,
                data: dataUrlBytes(file.frame.dataUrl),
              })),
            ]);
            service.downloadBytes(
              archive,
              filename.replace(/\.[^.]+$/, '') + '.zip',
              'application/zip'
            );
          } else {
            const mimeType = service.getMimeType(exportFormat);
            service.downloadFile(formattedTranscript, filename, mimeType);
          }
          setErrorMessage('');
          break;
        }
      }
    } catch (error) {
      setErrorMessage('Export failed');
    }
  };

  // Simple navigation to next lecture
  const handleNextLecture = async () => {
    setIsNavigating(true);
    try {
      const response = await (await getExtensionService()).navigateToNextLecture();
      if (response.success) {
        // Wait for page to load
        setTimeout(async () => {
          await checkPageAvailability();
          setIsNavigating(false);
          // Reset extraction status so user can extract again
          setExtractionStatus('idle');
          setExtractedTranscript('');
          setErrorMessage('Ready to extract next transcript!');
          setTimeout(() => setErrorMessage(''), 2000);
        }, 1500);
      } else {
        setErrorMessage('Failed to navigate to next lecture');
        setIsNavigating(false);
      }
    } catch (error) {
      setErrorMessage('Failed to navigate to next lecture');
      setIsNavigating(false);
    }
  };

  // Render helper, not a component: defining a component inside render
  // remounts the whole subtree on every state change.
  /**
   * What export and search operate on.
   *
   * The collection when there is one, otherwise whatever was just extracted.
   * Gating these on the *current* lecture meant navigating to a new one hid a
   * course's worth of collected transcripts behind an un-extracted page.
   */
  const searchableLectures =
    collection.length > 0
      ? collection.map((l) => ({ title: l.title, url: l.url, transcript: l.transcript }))
      : extractedTranscript
        ? [
            {
              title: currentVideo?.title ?? 'Transcript',
              url: pageUrl ?? undefined,
              transcript: extractedTranscript,
            },
          ]
        : [];

  const hasAnything = searchableLectures.length > 0;

  /**
   * Lectures in the course, when the sidebar has been read.
   *
   * Null when it has not. A progress bar against a denominator we are guessing
   * at is worse than a plain count — it would tell the user they are 1/8
   * through a course that has sixty lectures.
   */
  const totalLectures: number | null = useMemo(() => {
    const sections = courseStructure?.sections;
    if (!Array.isArray(sections)) return null;
    const total = sections.reduce(
      (sum: number, section: { lectures?: unknown[] }) =>
        sum + (Array.isArray(section.lectures) ? section.lectures.length : 0),
      0,
    );
    return total > 0 ? total : null;
  }, [courseStructure]);

  const isBusy = isExtracting || isNavigating;
  const isDone = extractionStatus === 'success' && Boolean(extractedTranscript);

  /** Words in the transcript just captured, ignoring timestamp markers. */
  const transcriptWords = useMemo(
    () => (extractedTranscript ? countWords(extractedTranscript) : 0),
    [extractedTranscript],
  );

  /**
   * What is attached to the lecture on screen.
   *
   * Answers "where am I with this one" rather than "what can this extension
   * do" — the counts all come from indexed lookups, so nothing large is read
   * to show them.
   */
  const [activity, setActivity] = useState<LectureActivity | null>(null);

  useEffect(() => {
    let cancelled = false;
    lectureActivity(currentLectureId)
      .then((found) => {
        if (!cancelled) setActivity(found);
      })
      .catch(() => {
        if (!cancelled) setActivity(null);
      });
    return () => {
      cancelled = true;
    };
    // Re-read whenever the lecture changes or something is attached to it.
  }, [currentLectureId, frames.length, collection.length, extractedTranscript]);

  const toggleComplete = async () => {
    if (!activity) return;
    await setLectureComplete(currentLectureId, activity.completedAt === undefined);
    setActivity(await lectureActivity(currentLectureId));
  };

  /**
   * Nothing to extract here.
   *
   * Either the page has no transcript, or an attempt already failed — courses
   * routinely mix in text-only pages. Both cases want the same thing: a way
   * onward, not a disabled button.
   */
  const isBlocked =
    !isBusy && !isDone && (!availability?.hasTranscript || extractionStatus === 'error');

  const renderExtractSection = () => (
    <div className="space-y-3">
      {/* What we are looking at. Secondary information, so it reads quietly. */}
      {currentVideo && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <Play className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                {currentVideo.title}
              </h2>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {currentVideo.duration}
                </span>
                {/* One statement about the transcript, not two.
                    This used to show "Transcript available" from the page's
                    point of view directly above a button offering to extract
                    it — the same word meaning "the site has one" and "we have
                    one". Capture state wins, because that is the thing the
                    reader is actually deciding about. */}
                {isDone ? (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-3 h-3" />
                    Captured · {transcriptWords.toLocaleString()} words
                  </span>
                ) : isExtracting ? (
                  <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Extracting…
                  </span>
                ) : availability?.hasTranscript ? (
                  <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                    <FileText className="w-3 h-3" />
                    Ready to extract
                  </span>
                ) : availability ? (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    No transcript on this page
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-px" />
            <p className="text-[12px] leading-relaxed text-amber-900 dark:text-amber-200">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Two actions, so a lecture without a transcript is never a dead end.
          Plenty of courses mix in text-only pages; the useful thing there is to
          keep moving through the course rather than to stare at an error. */}
      <div className="space-y-2">
        <button
          onClick={isDone || isBlocked ? handleNextLecture : handleExtractTranscript}
          disabled={isBusy}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors ${
            isBusy
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
          }`}
        >
          {isExtracting || isNavigating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isExtracting ? 'Extracting…' : 'Loading next lecture…'}
            </>
          ) : isDone ? (
            <>
              <ArrowRight className="w-4 h-4" />
              Next lecture
            </>
          ) : isBlocked ? (
            <>
              <ArrowRight className="w-4 h-4" />
              Skip to next lecture
            </>
          ) : (
            <>
              <TranscriptIcon className="w-4 h-4" />
              Extract transcript
            </>
          )}
        </button>

        {/* When extraction is possible, moving on is still one click away. */}
        {!isBusy && !isDone && !isBlocked && (
          <button
            onClick={handleNextLecture}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Skip to next lecture
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  /** Open the library in a tab, reusing one if it is already open. */
  const openDashboard = () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return;
    const url = chrome.runtime.getURL('dashboard.html');
    if (chrome.tabs?.create) void chrome.tabs.create({ url });
    else window.open(url, '_blank');
  };

  const dropLecture = async (id: string) => {
    setCollection(await removeCourseLecture(id, collection, pageUrl ?? undefined));
  };

  /** What has been gathered so far, and a way to prune it. */
  const renderCollectionSection = () => {
    if (collection.length === 0) return null;

    return (
      // A flat section rather than a card. This sits inside the popup's own
      // frame already; a bordered box around it is a card inside a card.
      <section>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Course progress
          </h3>
          <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            {totalWords(collection).toLocaleString()} words
          </span>
        </div>

        {/* A bar only when the denominator is real; otherwise a plain count,
            which is honest about not knowing how long the course is. */}
        {totalLectures !== null ? (
          <>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {collection.length} / {totalLectures} lectures
              </span>
              <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                {Math.round((collection.length / totalLectures) * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 mb-2">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${Math.min(100, (collection.length / totalLectures) * 100)}%`,
                }}
              />
            </div>
          </>
        ) : (
          <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums mb-2">
            {collection.length} {collection.length === 1 ? 'lecture' : 'lectures'} collected
          </p>
        )}

        <ul className="space-y-0.5 max-h-32 overflow-y-auto -mx-1">
          {collection.map((lecture, i) => (
            <li
              key={lecture.id}
              className="group flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400 flex items-center justify-center">
                {i + 1}
              </span>
              <span className="flex-1 min-w-0 truncate text-[12px] text-slate-700 dark:text-slate-200">
                {lecture.title}
              </span>
              <button
                onClick={() => void dropLecture(lecture.id)}
                className="flex-shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                aria-label={`Remove ${lecture.title}`}
                title={`Remove ${lecture.title}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          Exports cover every lecture above.
        </p>
      </section>
    );
  };

  // Render helper, not a component (see renderExtractSection).
  const renderExportOptionsSection = () => (
    <div className="space-y-4 pt-1">
      <div>
        <label
          htmlFor="export-format"
          className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5"
        >
          Export as
        </label>
        <select
          id="export-format"
          value={exportFormat}
          onChange={e => {
            userChoseSettings.current = true;
            setExportFormat(e.target.value as ExportFormat);
          }}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[13px] text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition"
        >
          <optgroup label="Reading and AI tools">
            <option value="markdown">Markdown (.md)</option>
            <option value="organized">Organized notes (.md)</option>
            <option value="txt">Plain text (.txt)</option>
            <option value="rag">Retrieval chunks (.json)</option>
          </optgroup>
          <optgroup label="Notes apps">
            <option value="obsidian">Obsidian note (.md)</option>
          </optgroup>
          <optgroup label="Studying">
            <option value="anki">Flashcards for Anki (.csv)</option>
          </optgroup>
          <optgroup label="Subtitles">
            <option value="srt">SubRip (.srt)</option>
            <option value="vtt">WebVTT (.vtt)</option>
          </optgroup>
          <optgroup label="Data">
            <option value="csv">Spreadsheet (.csv)</option>
            <option value="json">JSON (.json)</option>
          </optgroup>
        </select>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          {FORMAT_HINTS[exportFormat]}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleExport('clipboard')}
          disabled={isExporting}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Clipboard className="w-3.5 h-3.5" />
          )}
          {isExporting ? 'Organising…' : 'Copy'}
        </button>
        <button
          onClick={() => handleExport('download')}
          disabled={isExporting}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {isExporting ? 'Organising…' : 'Download'}
        </button>
      </div>

      <button
        onClick={() => setShowSearch(true)}
        className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
      >
        <span className="flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>
            <span className="block text-[13px] font-semibold text-slate-900 dark:text-white">
              Search this lecture
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              Chapters, key concepts, jump to a moment
            </span>
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );

  const sourceMeta: SourceMeta = {
    title: currentVideo?.title,
    url: pageUrl ?? undefined,
    platform: toPlatform(availability?.platform),
    courseTitle: courseStructure?.title,
    instructor: courseStructure?.instructor,
  };

  // Every view is the same size. The popup used to grow when the search panel
  // opened, which made the whole window jump under the cursor.
  const SHELL = 'w-[380px] h-[560px]';

  if (showSearch) {
    return (
      <div className={SHELL}>
        <TranscriptSearch
          lectures={searchableLectures}
          meta={sourceMeta}
          onClose={() => setShowSearch(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${SHELL} flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-white`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <TranscriptIcon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-semibold leading-tight truncate">
              Transcript Extractor
            </h1>
            {/* "Local · private" says it in two words. The long version lives
                in the privacy policy, not on every screen. */}
            <p className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Local · private
            </p>
          </div>
        </div>

        <button
          onClick={handleThemeToggle}
          className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {renderExtractSection()}

        {/* Stills. A transcript says "so we write x equals five"; the code on
            screen is what the reader actually needs back. */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Visual notes
              {frames.length > 0 && (
                <span className="ml-1.5 normal-case font-semibold text-blue-600 dark:text-blue-400">
                  {frames.length}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1.5">
              {/* Only offered when the model is actually installed, so the
                  button is never a promise this machine cannot keep. */}
              {aiProbe?.ready && unreadFrames.length > 0 && (
                <button
                  onClick={handleReadFrames}
                  disabled={isReadingFrames}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-50 transition-colors"
                >
                  {isReadingFrames ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ScanText className="w-3.5 h-3.5" />
                  )}
                  {isReadingFrames && readProgress
                    ? `Reading ${readProgress.done}/${readProgress.total}`
                    : `Read ${unreadFrames.length}`}
                </button>
              )}

              <button
                onClick={handleCaptureFrame}
                disabled={isCapturing}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 transition-colors"
              >
                {isCapturing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                Capture frame
              </button>
            </div>
          </div>

          {captureNote && (
            <p
              className={`mb-2 text-[11px] leading-relaxed ${
                captureNote.tone === 'ok'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {captureNote.text}
            </p>
          )}

          {/* Whether this browser could read the text out of a screenshot.
              Reported rather than assumed — Chrome's on-device model is absent
              on plenty of machines. */}
          {/* Capability, not an announcement.
              When the model is ready there is nothing to act on, so it earns a
              chip rather than a panel. It only grows back into something
              bigger when there is a decision to make — a download to start —
              or an explanation to give for why Read is missing. */}
          {aiProbe?.ready && (
            <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-900/25 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              <Zap className="w-3 h-3" />
              On-device AI
            </p>
          )}

          {/* Chrome sits at "Pending Usage" until something asks for the model.
              Nothing here asks without a click: it is a ~4 GB download, and it
              is the user's bandwidth and disk. */}
          {(aiProbe?.status === 'downloadable' || aiProbe?.status === 'downloading') && (
            <div className="mb-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Read text off screenshots with Chrome's on-device model.
                </p>
                <button
                  onClick={handleInstallModel}
                  disabled={isInstallingModel}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {isInstallingModel && <Loader2 className="w-3 h-3 animate-spin" />}
                  {isInstallingModel ? 'Installing…' : 'Install (~4 GB)'}
                </button>
              </div>

              {isInstallingModel && (
                <>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full bg-blue-600 ${
                        installProgress === null ? 'w-1/3 animate-pulse' : 'transition-all'
                      }`}
                      style={
                        installProgress === null
                          ? undefined
                          : { width: `${Math.round(installProgress * 100)}%` }
                      }
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                    {installProgress === null
                      ? 'Downloading — Chrome does not report a percentage yet.'
                      : `${Math.round(installProgress * 100)}% — you can keep using the extension.`}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Why the Read button is absent. Silence would read as a bug. */}
          {(aiProbe?.status === 'unavailable' || aiProbe?.status === 'unsupported') && (
            <p className="mb-2 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
              {aiProbe.detail}
            </p>
          )}

          {frames.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Pause on a diagram or a block of code and capture it. Stills are saved with the
              lecture and exported alongside the transcript.
            </p>
          ) : (
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {frames.map((frame) => (
                <li key={frame.seconds} className="relative shrink-0 group">
                  <button
                    onClick={() =>
                      setOpenFrame(openFrame === frame.seconds ? null : frame.seconds)
                    }
                    aria-label={`Inspect frame at ${formatClockLabel(frame.seconds)}`}
                    className="block"
                  >
                    <img
                      src={frame.dataUrl}
                      alt={`Frame at ${formatClockLabel(frame.seconds)}`}
                      className={`h-16 w-auto rounded-lg border transition-colors ${
                        openFrame === frame.seconds
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    />
                  </button>
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-mono text-white tabular-nums">
                    {formatClockLabel(frame.seconds)}
                  </span>
                  {/* A read frame carries its text into the export; showing
                      which ones have been read is the difference between an
                      image and searchable notes. */}
                  {frame.readout ? (
                    <span className="pointer-events-none absolute top-1 left-1 rounded bg-emerald-600/90 px-1 text-[9px] font-semibold text-white">
                      text
                    </span>
                  ) : null}
                  <button
                    onClick={() => handleDeleteFrame(frame.seconds)}
                    aria-label={`Remove frame at ${formatClockLabel(frame.seconds)}`}
                    className="absolute -top-1.5 -right-1.5 rounded-full bg-slate-700 text-white p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* What the model actually read, in full. The only way to judge
              whether a transcription is good enough to keep. */}
          {inspected && (
            <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-2.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  On screen at {formatClockLabel(inspected.seconds)}
                </span>
                <button
                  onClick={() => setOpenFrame(null)}
                  aria-label="Close"
                  className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {inspected.readout === undefined ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {aiProbe?.ready
                    ? 'Not read yet. Use Read to transcribe it.'
                    : 'Not read. On-device AI is not available on this machine.'}
                </p>
              ) : inspected.readout === '' ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Read, but nothing legible was on screen.
                </p>
              ) : (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 font-mono">
                  {inspected.readout}
                </pre>
              )}
            </div>
          )}
        </section>

        {/* Where this lecture stands.
            Every count is an indexed lookup, and the status is derived from
            them — the only stored part is "done", which is the one judgement
            the data cannot make on the reader's behalf. */}
        {activity && (activity.hasTranscript || activityCount(activity) > 0) && (
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                This lecture
              </h3>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  lectureStatus(activity) === 'completed'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {STATUS_LABELS[lectureStatus(activity)]}
              </span>
            </div>

            <dl className="grid grid-cols-4 gap-2 mb-2.5">
              {[
                { icon: <FileText className="w-3.5 h-3.5" />, label: 'Transcript', value: activity.hasTranscript ? '✓' : '—' },
                { icon: <Highlighter className="w-3.5 h-3.5" />, label: 'Highlights', value: String(activity.highlights) },
                { icon: <StickyNote className="w-3.5 h-3.5" />, label: 'Notes', value: String(activity.notes) },
                { icon: <Camera className="w-3.5 h-3.5" />, label: 'Stills', value: String(activity.screenshots) },
              ].map((entry) => (
                <div key={entry.label} className="text-center">
                  <dd className="text-[15px] font-semibold tabular-nums leading-none text-slate-700 dark:text-slate-200">
                    {entry.value}
                  </dd>
                  <dt className="mt-1 text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {entry.label}
                  </dt>
                </div>
              ))}
            </dl>

            <button
              onClick={() => void toggleComplete()}
              className={`w-full rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                activity.completedAt === undefined
                  ? 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              {activity.completedAt === undefined ? 'Mark as done' : '✓ Done — undo'}
            </button>
          </section>
        )}

        {collection.length > 0 && renderCollectionSection()}

        {/* The library, at full size.
            A popup is the wrong place to read three thousand words or search
            across courses — and it is destroyed the moment it loses focus, so
            it cannot even finish the work. The dashboard is an ordinary tab. */}
        <button
          onClick={openDashboard}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <Library className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              Open library
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              Read, search and annotate everything you have collected
            </span>
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
        </button>

        {hasAnything && (
          <>
            <div className="border-t border-slate-200 dark:border-slate-800" />

            {/* Export is what you do once, at the end — not the thing the
                popup should lead with. Collapsed until asked for, so the
                format picker and its explanation stop competing with the
                lecture and the course. */}
            <button
              onClick={() => setExportOpen((open) => !open)}
              aria-expanded={exportOpen}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Export
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {FORMAT_LABELS[exportFormat]}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {exportOpen && renderExportOptionsSection()}
          </>
        )}
      </main>

      {/* Trust signals, not a nav bar. Vertical space in a popup is the
          scarcest thing there is. */}
      <footer className="border-t border-slate-200 dark:border-slate-800 px-4 py-1.5">
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
          Open source · MIT
        </p>
      </footer>
    </div>
  );
};
