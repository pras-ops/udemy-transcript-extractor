// Extension Service for communicating with content script
import { UdemyCourse } from './udemy-extractor';
import { errorMessage } from './utils';
import {
  buildChunks,
  buildDeepLink,
  cleanCues,
  formatTimestamp,
  groupIntoParagraphs,
  parseTranscript,
  DEFAULT_CHUNK_OPTIONS,
  type Cue,
  type SourceMeta,
} from './transcript';
import { toSRT, toWebVTT, type TimedCue } from './caption-formats';
import { extractDefinitions, buildClozeCards } from './definitions';

/** Adapt pipeline cues (start only) to the timed cues subtitle files need. */
function toTimedCues(cues: Cue[]): TimedCue[] {
  return cues
    .filter((cue) => cue.startSeconds !== null)
    .map((cue) => ({ startSeconds: cue.startSeconds as number, endSeconds: null, text: cue.text }));
}

export type ExportFormat =
  | 'markdown'
  | 'obsidian'
  /**
   * Structured notes: headings, time ranges, paragraphs.
   *
   * Produced by the search service, not here, because it needs the embedding
   * model to find where the topic turns. The case below is a fallback so the
   * type stays total — the popup intercepts this format before it reaches the
   * synchronous formatter.
   */
  | 'organized'
  | 'txt'
  | 'json'
  | 'rag'
  | 'srt'
  | 'vtt'
  | 'csv'
  | 'anki';

/**
 * Extension and MIME type per format.
 *
 * Kept as tables because the format id and the file extension genuinely differ
 * (`markdown` -> `.md`, `rag` -> `.json`); deriving one from the other is what
 * previously produced `.markdown` and `.rag` files.
 */
const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  markdown: 'md',
  organized: 'md',
  obsidian: 'md',
  txt: 'txt',
  json: 'json',
  rag: 'json',
  srt: 'srt',
  vtt: 'vtt',
  csv: 'csv',
  anki: 'csv',
};

const FORMAT_MIME_TYPES: Record<ExportFormat, string> = {
  markdown: 'text/markdown',
  organized: 'text/markdown',
  obsidian: 'text/markdown',
  txt: 'text/plain',
  json: 'application/json',
  rag: 'application/json',
  srt: 'application/x-subrip',
  vtt: 'text/vtt',
  csv: 'text/csv',
  anki: 'text/csv',
};

/** RFC 4180 specifies CRLF between records, and Excel depends on it. */
const CRLF = '\r\n';

// A field needs quoting if it contains a comma, a quote, or a line break.
const CSV_NEEDS_QUOTING = new RegExp('[",\\r\\n]');

/**
 * Quote a CSV field per RFC 4180.
 *
 * Transcript text routinely contains commas and quotes, and lecture titles
 * contain both — unquoted output would corrupt the file on import.
 */
function csvField(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return CSV_NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Human-readable capture time for the top of an export.
 *
 * A transcript is a snapshot: courses get re-recorded and captions get
 * corrected, so a file with no date gives no way to tell how stale it is.
 * Local time rather than ISO, because this line is for a person; the machine
 * readable ISO form is carried separately in the JSON formats.
 */
function formatSavedAt(date = new Date()): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* -------------------------------------------------------------------------- */
/* YAML front matter                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Local `YYYY-MM-DDTHH:mm`, which Obsidian parses as a datetime property.
 *
 * Deliberately not `toISOString()`: that is UTC, and a note saying a lecture
 * was saved at 03:00 when it was mid-afternoon reads as a bug to the only
 * person who will ever look at it.
 */
function savedProperty(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Quote a value as a YAML double-quoted scalar.
 *
 * Always quoting is the safe choice here: lecture titles routinely contain
 * colons ("Part 2: Recursion"), leading digits, and `#`, each of which changes
 * the meaning of an unquoted scalar or breaks the parse outright.
 */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Obsidian tags cannot contain spaces; anything unusable is dropped. */
function yamlTags(values: (string | undefined)[]): string[] {
  const tags = values
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((v) => v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9/_-]/g, ''))
    .filter((v) => v.length > 0);
  return [...new Set(tags)];
}

/** Assemble a front-matter block from fields that have a value. */
function frontMatter(fields: [string, string | null][], tags: string[]): string {
  const lines = fields
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([key, value]) => `${key}: ${value}`);

  if (tags.length > 0) lines.push('tags:', ...tags.map((t) => `  - ${t}`));

  return ['---', ...lines, '---'].join('\n');
}

/**
 * GitHub/Obsidian heading anchor, so an in-document contents list actually
 * jumps: "## 1. Intro" is reachable at "#1-intro".
 */
function headingSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}


export interface ExtensionServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ExtensionService {
  /**
   * Send message to content script and get response
   */
  private static async sendMessage<T>(message: any): Promise<ExtensionServiceResponse<T>> {
    try {
      // Check if we're in a browser extension context
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw new Error('Extension APIs not available');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      console.log('🎯 Sending message to tab:', tab.id, 'Message:', message);
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, message);
        console.log('🎯 Received response:', response);
        return response;
      } catch (connectionError) {
        // If connection fails, try to inject content script and retry
        if (errorMessage(connectionError).includes('Receiving end does not exist')) {
          console.log('🎯 Content script not found, attempting to inject...');
          
          try {
            console.log('🎯 Attempting to inject content script...');
            
            // Inject the content script
            const injectionResult = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content-script.js']
            });
            
            // Also try injecting the script directly if file injection fails
            if (!injectionResult || injectionResult.length === 0) {
              console.log('🎯 File injection failed, trying direct script injection...');
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  // This will be executed in the page context
                  console.log('🎯 Direct script injection executed');
                }
              });
            }
            
            console.log('🎯 Content script injection result:', injectionResult);
            console.log('🎯 Content script injected, waiting for initialization...');
            
            // Wait a moment for the script to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Retry the message
            console.log('🎯 Retrying message after content script injection...');
            const response = await chrome.tabs.sendMessage(tab.id, message);
            console.log('🎯 Received response after injection:', response);
            return response;
          } catch (injectionError) {
            console.error('🎯 Failed to inject content script:', injectionError);
            throw new Error('Failed to connect to page. Please refresh the page and try again.');
          }
        } else {
          throw connectionError;
        }
      }
    } catch (error) {
      console.error('Error sending message to content script:', error);
      return {
        success: false,
        error: errorMessage(error, 'Extension communication failed')
      };
    }
  }

  /**
   * URL of the active tab.
   *
   * Needed to build per-chunk deep links back into the video. Returns null if
   * the URL is not visible to us (no host permission for that origin).
   */
  static async getCurrentTabUrl(): Promise<string | null> {
    try {
      if (typeof chrome === 'undefined' || !chrome.tabs) return null;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab?.url ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Check if current page supports transcript extraction
   */
  static async checkAvailability(): Promise<ExtensionServiceResponse<{
    platform: string;
    hasTranscript: boolean;
    isCoursePage: boolean;
  }>> {
    return this.sendMessage({ type: 'CHECK_AVAILABILITY' });
  }

  /**
   * Extract course structure from current page
   */
  static async extractCourseStructure(): Promise<ExtensionServiceResponse<UdemyCourse>> {
    return this.sendMessage({ type: 'EXTRACT_COURSE_STRUCTURE' });
  }

  /**
   * Extract transcript from current video
   */
  static async extractTranscript(): Promise<ExtensionServiceResponse<string>> {
    return this.sendMessage({ type: 'EXTRACT_TRANSCRIPT' });
  }


  static async testCourseStructure(): Promise<ExtensionServiceResponse<string>> {
    return this.sendMessage({ type: 'TEST_COURSE_STRUCTURE' });
  }

  /**
   * Get current video information
   */
  static async getVideoInfo(): Promise<ExtensionServiceResponse<{
    title: string;
    duration: string;
  }>> {
    return this.sendMessage({ type: 'GET_VIDEO_INFO' });
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  /**
   * Download file with given content.
   *
   * The object URL is revoked on a later tick rather than immediately after
   * `click()`: revoking synchronously can invalidate the blob before the
   * browser has started reading it, which cancels the download — and it fails
   * silently, so the user just sees nothing happen.
   */
  /**
   * Save binary content — an archive of a transcript plus its screenshots.
   *
   * Separate from `downloadFile` because a `Blob` built from a string applies
   * UTF-8 encoding, which corrupts every byte of a ZIP above 0x7F.
   */
  static downloadBytes(bytes: Uint8Array, filename: string, mimeType: string): void {
    const blob = new Blob([bytes as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /**
   * Format a transcript for export.
   *
   * All formats run through the tested pipeline in `./transcript`, so cleanup,
   * chunking and timestamp handling behave identically across them.
   */
  static formatTranscript(
    transcript: string,
    format: ExportFormat,
    includeTimestamps: boolean = true,
    videoTitle?: string,
    meta: SourceMeta = {},
  ): string {
    const source: SourceMeta = { ...meta, title: meta.title ?? videoTitle };
    const cues = cleanCues(parseTranscript(transcript));

    switch (format) {
      case 'organized':
      case 'markdown':
        return this.formatAsMarkdown(cues, includeTimestamps, source);
      case 'obsidian':
        return this.formatAsObsidian(cues, includeTimestamps, source);
      case 'json':
        return this.formatAsJSON(cues, includeTimestamps, source);
      case 'rag':
        return this.formatAsRAG(transcript, source);
      case 'srt':
        return toSRT(toTimedCues(cues));
      case 'vtt':
        return toWebVTT(toTimedCues(cues));
      case 'csv':
        return this.formatAsCSV(cues, source);
      case 'anki':
        return this.formatAsAnki(cues, source);
      case 'txt':
      default:
        return this.formatAsText(cues, includeTimestamps, source);
    }
  }

  /**
   * Export a whole course rather than one lecture.
   *
   * Timestamps restart at zero in every video, so lectures cannot simply be
   * concatenated — the output would contain several `00:00` entries with
   * nothing to say which lecture each belonged to. Every format below keeps the
   * lecture boundary explicit.
   *
   * Subtitle formats are the exception: an `.srt` describes one video's
   * timeline, and merging several would produce a file whose timings are wrong
   * everywhere after the first. Those export the current lecture alone.
   */
  static formatCollection(
    lectures: { title: string; url?: string; transcript: string }[],
    format: ExportFormat,
    includeTimestamps: boolean = true,
    meta: SourceMeta = {},
  ): string {
    if (lectures.length === 0) return this.formatTranscript('', format, includeTimestamps, meta.title, meta);
    if (lectures.length === 1) {
      const only = lectures[0];
      return this.formatTranscript(only.transcript, format, includeTimestamps, only.title, {
        ...meta,
        title: only.title,
        url: only.url,
      });
    }

    const perLectureMeta = (lecture: { title: string; url?: string }): SourceMeta => ({
      ...meta,
      title: lecture.title,
      url: lecture.url,
      courseTitle: meta.courseTitle,
    });

    switch (format) {
      case 'srt':
      case 'vtt': {
        // One video, one timeline.
        const current = lectures[lectures.length - 1];
        return this.formatTranscript(
          current.transcript,
          format,
          includeTimestamps,
          current.title,
          perLectureMeta(current),
        );
      }

      case 'json': {
        return JSON.stringify(
          {
            course: meta.courseTitle ?? meta.title ?? null,
            savedAt: formatSavedAt(),
            extractedAt: new Date().toISOString(),
            lectureCount: lectures.length,
            lectures: lectures.map((lecture, i) => ({
              order: i + 1,
              title: lecture.title,
              url: lecture.url ?? null,
              cues: cleanCues(parseTranscript(lecture.transcript)).map((cue) => ({
                ...(includeTimestamps && cue.startSeconds !== null
                  ? { start: cue.startSeconds, timestamp: formatTimestamp(cue.startSeconds) }
                  : {}),
                text: cue.text,
              })),
            })),
          },
          null,
          2,
        );
      }

      case 'rag': {
        // Chunks carry their lecture, so a retrieved passage can say which
        // lecture it came from — the whole point of a course-level export.
        const chunks = lectures.flatMap((lecture, i) =>
          buildChunks(lecture.transcript, perLectureMeta(lecture)).map((chunk) => ({
            id: `l${i + 1}_${chunk.id}`,
            content: chunk.content,
            body: chunk.body,
            metadata: {
              lecture_order: i + 1,
              lecture_title: lecture.title,
              lecture_url: lecture.url ?? null,
              chunk_index: chunk.chunkIndex,
              start_seconds: chunk.startSeconds,
              end_seconds: chunk.endSeconds,
              time_range: chunk.timeRange,
              url: chunk.url,
              word_count: chunk.wordCount,
              estimated_tokens: chunk.estimatedTokens,
            },
          })),
        );

        return JSON.stringify(
          {
            schema_version: '3.0',
            document: {
              course: meta.courseTitle ?? meta.title ?? null,
              platform: meta.platform ?? 'unknown',
              lecture_count: lectures.length,
              extracted_at: new Date().toISOString(),
              saved_at: formatSavedAt(),
            },
            chunking: {
              strategy: 'fixed-size-with-overlap',
              target_tokens: DEFAULT_CHUNK_OPTIONS.targetTokens,
              max_tokens: DEFAULT_CHUNK_OPTIONS.maxTokens,
              overlap_tokens: DEFAULT_CHUNK_OPTIONS.overlapTokens,
              contextual_headers: true,
              scope: 'course',
            },
            stats: {
              chunk_count: chunks.length,
              estimated_tokens: chunks.reduce((sum, c) => sum + c.metadata.estimated_tokens, 0),
            },
            chunks,
          },
          null,
          2,
        );
      }

      case 'csv':
      case 'anki': {
        // Prepend a lecture column, then the per-lecture rows without their
        // own header line.
        const [firstHeader] = this.formatTranscript(
          lectures[0].transcript,
          format,
          includeTimestamps,
          lectures[0].title,
          perLectureMeta(lectures[0]),
        ).split(CRLF);

        const rows = lectures.flatMap((lecture) => {
          const body = this.formatTranscript(
            lecture.transcript,
            format,
            includeTimestamps,
            lecture.title,
            perLectureMeta(lecture),
          )
            .split(CRLF)
            .slice(1)
            .filter((line) => line.trim().length > 0);
          return body.map((line) => `${csvField(lecture.title)},${line}`);
        });

        return [`lecture,${firstHeader}`, ...rows].join(CRLF) + CRLF;
      }

      case 'markdown': {
        const head = [
          `# ${meta.courseTitle ?? meta.title ?? 'Course transcript'}`,
          [
            `**Lectures:** ${lectures.length}`,
            meta.instructor ? `**Instructor:** ${meta.instructor}` : null,
            `**Saved:** ${formatSavedAt()}`,
          ]
            .filter((line): line is string => line !== null)
            .join('\n'),
        ];

        const body = lectures.flatMap((lecture, i) => {
          const section = this.formatTranscript(
            lecture.transcript,
            'markdown',
            includeTimestamps,
            lecture.title,
            perLectureMeta(lecture),
          )
            // Drop the per-lecture document header; it becomes a section here.
            .split('\n\n')
            .slice(2)
            .join('\n\n')
            .trim();

          return [`## ${i + 1}. ${lecture.title}`, section];
        });

        return [...head, ...body].join('\n\n').trim() + '\n';
      }

      case 'obsidian': {
        const courseTitle = meta.courseTitle ?? meta.title ?? 'Course transcript';

        const head = frontMatter(
          [
            ['title', yamlString(courseTitle)],
            ['instructor', meta.instructor ? yamlString(meta.instructor) : null],
            ['platform', meta.platform ? yamlString(meta.platform) : null],
            ['lectures', String(lectures.length)],
            ['saved', savedProperty()],
          ],
          yamlTags(['transcript', 'course', meta.platform, courseTitle]),
        );

        // A course export runs to tens of thousands of words, so it opens with
        // a contents list. The links are in-document anchors rather than
        // wiki-links: this is one file, and `[[...]]` would point at notes that
        // do not exist in the reader's vault.
        const sectionHeadings = lectures.map((lecture, i) => `${i + 1}. ${lecture.title}`);
        const contents = [
          '## Contents',
          sectionHeadings
            .map((heading, i) => `${i + 1}. [${lectures[i].title}](#${headingSlug(heading)})`)
            .join('\n'),
        ];

        const body = lectures.flatMap((lecture, i) => {
          const section = this.formatTranscript(
            lecture.transcript,
            'markdown',
            includeTimestamps,
            lecture.title,
            perLectureMeta(lecture),
          )
            // Drop the per-lecture document header; it becomes a section here.
            .split('\n\n')
            .slice(2)
            .join('\n\n')
            .trim();

          return [`## ${sectionHeadings[i]}`, section];
        });

        return [head, `# ${courseTitle}`, ...contents, ...body].join('\n\n').trim() + '\n';
      }

      case 'txt':
      default: {
        const head = [
          meta.courseTitle ?? meta.title ?? 'Course transcript',
          `Lectures: ${lectures.length}`,
          `Saved: ${formatSavedAt()}`,
        ].join('\n');

        const body = lectures.map((lecture, i) => {
          const section = this.formatTranscript(
            lecture.transcript,
            'txt',
            includeTimestamps,
            lecture.title,
            perLectureMeta(lecture),
          )
            .split('\n\n')
            .slice(1)
            .join('\n\n')
            .trim();

          return `${'='.repeat(48)}\n${i + 1}. ${lecture.title}\n${'='.repeat(48)}\n\n${section}`;
        });

        return `${head}\n\n${body.join('\n\n')}\n`;
      }
    }
  }

  private static formatAsMarkdown(
    cues: Cue[],
    includeTimestamps: boolean,
    meta: SourceMeta,
  ): string {
    const title = meta.title || 'Transcript';

    // Metadata lines belong on consecutive lines, not as separate blocks. They
    // were previously joined with the body's blank-line separator, which left
    // three empty lines between the heading and the first field.
    const fields: string[] = [];
    if (meta.courseTitle && meta.courseTitle !== meta.title) fields.push(`**Course:** ${meta.courseTitle}`);
    if (meta.instructor) fields.push(`**Instructor:** ${meta.instructor}`);
    if (meta.url) fields.push(`**Source:** ${meta.url}`);
    fields.push(`**Saved:** ${formatSavedAt()}`);

    const head: string[] = [`# ${title}`, fields.join('\n')];

    // Paragraphs rather than one bullet per caption line: caption cues are
    // ~2 seconds of speech, so bulleting them produces an unreadable wall of
    // fragments. Grouping restores sentence flow for human reading.
    //
    // Timestamps are plain text, not links. A document is read and pasted
    // around — into notes apps, into a model's context — and a wrapped URL on
    // every paragraph is noise in all of those places. The source URL is in the
    // header once, which is enough to reconstruct any link.
    const paragraphs = groupIntoParagraphs(cues);
    const body = paragraphs.map((p) => {
      if (!includeTimestamps || p.startSeconds === null) return p.text;
      return `**[${formatTimestamp(p.startSeconds)}]** ${p.text}`;
    });

    return [...head, ...body].join('\n\n').trim() + '\n';
  }

  /**
   * Markdown with YAML front matter, for a notes vault.
   *
   * The difference from `markdown` is entirely in the header. Obsidian, Logseq
   * and most static-site generators read front matter as structured
   * properties, so the course, instructor and save time become fields that can
   * be filtered and sorted rather than prose the reader has to scan for.
   *
   * `markdown` keeps its plain human-readable header, because the same file
   * often gets pasted straight into a chat window where a YAML block is just
   * noise in the context.
   */
  private static formatAsObsidian(
    cues: Cue[],
    includeTimestamps: boolean,
    meta: SourceMeta,
  ): string {
    const title = meta.title || 'Transcript';

    const head = frontMatter(
      [
        ['title', yamlString(title)],
        ['course', meta.courseTitle ? yamlString(meta.courseTitle) : null],
        ['instructor', meta.instructor ? yamlString(meta.instructor) : null],
        ['source', meta.url ? yamlString(meta.url) : null],
        ['platform', meta.platform ? yamlString(meta.platform) : null],
        ['saved', savedProperty()],
      ],
      yamlTags(['transcript', meta.platform, meta.courseTitle]),
    );

    const body = groupIntoParagraphs(cues).map((p) => {
      if (!includeTimestamps || p.startSeconds === null) return p.text;
      return `**[${formatTimestamp(p.startSeconds)}]** ${p.text}`;
    });

    return [head, `# ${title}`, ...body].join('\n\n').trim() + '\n';
  }

  private static formatAsJSON(cues: Cue[], includeTimestamps: boolean, meta: SourceMeta): string {
    return JSON.stringify(
      {
        title: meta.title ?? null,
        course: meta.courseTitle ?? null,
        instructor: meta.instructor ?? null,
        platform: meta.platform ?? 'unknown',
        url: meta.url ?? null,
        extractedAt: new Date().toISOString(),
        savedAt: formatSavedAt(),
        cueCount: cues.length,
        cues: cues.map((c) => ({
          ...(includeTimestamps && c.startSeconds !== null
            ? { start: c.startSeconds, timestamp: formatTimestamp(c.startSeconds) }
            : {}),
          text: c.text,
        })),
      },
      null,
      2,
    );
  }

  private static formatAsText(
    cues: Cue[],
    includeTimestamps: boolean,
    meta: SourceMeta = {},
  ): string {
    // A dated header, so a saved transcript can be told apart from a newer one.
    const header =
      [meta.title || 'Transcript', meta.url ? `Source: ${meta.url}` : null, `Saved: ${formatSavedAt()}`]
        .filter((line): line is string => line !== null)
        .join('\n') + '\n\n';

    if (!includeTimestamps) {
      return header + groupIntoParagraphs(cues).map((p) => p.text).join('\n\n') + '\n';
    }

    return (
      header +
      cues
        .map((c) =>
          c.startSeconds === null ? c.text : `[${formatTimestamp(c.startSeconds)}] ${c.text}`,
        )
        .join('\n') + '\n'
    );
  }

  /**
   * Retrieval-ready chunks for a vector store.
   *
   * Each chunk carries a situating header inside `content` (the text meant to
   * be embedded), the time range it covers, and a deep link back into the
   * video — so an answer built from a chunk can cite the moment it came from.
   */
  private static formatAsRAG(transcript: string, meta: SourceMeta): string {
    const chunks = buildChunks(transcript, meta);
    const totalTokens = chunks.reduce((sum, c) => sum + c.estimatedTokens, 0);

    return JSON.stringify(
      {
        schema_version: '3.0',
        document: {
          title: meta.title ?? null,
          course: meta.courseTitle ?? null,
          instructor: meta.instructor ?? null,
          platform: meta.platform ?? 'unknown',
          url: meta.url ?? null,
          extracted_at: new Date().toISOString(),
          saved_at: formatSavedAt(),
        },
        chunking: {
          strategy: 'fixed-size-with-overlap',
          target_tokens: DEFAULT_CHUNK_OPTIONS.targetTokens,
          max_tokens: DEFAULT_CHUNK_OPTIONS.maxTokens,
          overlap_tokens: DEFAULT_CHUNK_OPTIONS.overlapTokens,
          contextual_headers: true,
          token_estimate: 'approximate (word-count heuristic, no tokenizer shipped)',
        },
        stats: {
          chunk_count: chunks.length,
          estimated_tokens: totalTokens,
        },
        chunks: chunks.map((c) => ({
          id: c.id,
          // `content` is what you embed: header + body.
          content: c.content,
          // `body` is the transcript text alone, for display or re-chunking.
          body: c.body,
          metadata: {
            chunk_index: c.chunkIndex,
            start_seconds: c.startSeconds,
            end_seconds: c.endSeconds,
            time_range: c.timeRange,
            url: c.url,
            word_count: c.wordCount,
            estimated_tokens: c.estimatedTokens,
            title: meta.title ?? null,
            platform: meta.platform ?? 'unknown',
          },
        })),
      },
      null,
      2,
    );
  }

  /**
   * Spreadsheet-friendly rows.
   *
   * Also the simplest route into flashcard tools: Anki, Quizlet and RemNote all
   * import CSV, so a timestamped transcript becomes study material without any
   * intermediate conversion step.
   */
  private static formatAsCSV(cues: Cue[], meta: SourceMeta): string {
    const header = ['start_seconds', 'timestamp', 'text', 'url'];
    const rows = cues.map((cue) =>
      [
        csvField(cue.startSeconds),
        csvField(cue.startSeconds === null ? null : formatTimestamp(cue.startSeconds)),
        csvField(cue.text),
        csvField(buildDeepLink(meta.url, cue.startSeconds)),
      ].join(','),
    );
    return [header.join(','), ...rows].join(CRLF) + CRLF;
  }

  /**
   * Cloze flashcards, ready for Anki.
   *
   * Each row is a sentence the lecturer actually said with its key term blanked
   * out, plus a link back to the moment it was said. Anki imports this directly
   * and handles the scheduling, which together covers the two study techniques
   * with the strongest evidence behind them: practice testing and distributed
   * practice.
   *
   * Nothing is generated, so no card can state something the lecture did not.
   */
  private static formatAsAnki(cues: Cue[], meta: SourceMeta): string {
    const definitions = extractDefinitions(cues);
    const cards = buildClozeCards(definitions);

    const header = ['front', 'back', 'source', 'url'];
    const rows = cards.map((card) =>
      [
        csvField(card.front),
        csvField(card.back),
        csvField(
          [meta.title, card.timestamp].filter(Boolean).join(' · ') || 'Lecture transcript',
        ),
        csvField(buildDeepLink(meta.url, card.startSeconds)),
      ].join(','),
    );

    return [header.join(','), ...rows].join(CRLF) + CRLF;
  }

  /**
   * Build a safe download filename.
   *
   * Note the extension comes from `FORMAT_EXTENSIONS`, not the format name —
   * `markdown` must yield `.md`, and `rag` must yield `.json`.
   */
  static generateFilename(videoTitle: string, format: string): string {
    const sanitizedTitle =
      videoTitle
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 50) || 'transcript';

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const extension = FORMAT_EXTENSIONS[format as ExportFormat] ?? 'txt';
    return `${sanitizedTitle}_${timestamp}.${extension}`;
  }

  static getMimeType(format: string): string {
    return FORMAT_MIME_TYPES[format as ExportFormat] ?? 'text/plain';
  }

  /**
   * Start batch collection for multiple lectures
   */
  static async startBatchCollection(lectureIds: string[]): Promise<ExtensionServiceResponse<void>> {
    return this.sendMessage({ 
      type: 'START_BATCH_COLLECTION', 
      data: { lectureIds } 
    });
  }

  /**
   * Navigate to next lecture in batch
   */
  static async navigateToNextLecture(): Promise<ExtensionServiceResponse<boolean>> {
    return this.sendMessage({ type: 'NAVIGATE_TO_NEXT_LECTURE' });
  }

  /**
   * Collect transcript from current lecture
   */
  static async collectCurrentTranscript(): Promise<ExtensionServiceResponse<{
    lectureId: string;
    transcript: string;
  }>> {
    return this.sendMessage({ type: 'COLLECT_CURRENT_TRANSCRIPT' });
  }

  /**
   * Export all collected batch transcripts
   */
  static async exportBatchTranscripts(format: 'markdown' | 'txt' | 'json'): Promise<ExtensionServiceResponse<string>> {
    return this.sendMessage({ 
      type: 'EXPORT_BATCH_TRANSCRIPTS', 
      data: { format } 
    });
  }
}
