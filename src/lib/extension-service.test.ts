import { describe, it, expect } from 'vitest';
import { ExtensionService, normalizeLectureUrl } from './extension-service';
import { parseCaptionFile } from './caption-formats';

const RAW = [
  '[00:03] Welcome back. um, today we look at gradient descent.',
  '[00:09] [Music]',
  '[00:12] The idea is to follow the slope downhill.',
  '[00:18] We compute a derivative and take a step.',
].join('\n\n');

describe('normalizeLectureUrl', () => {
  const LECTURE = 'https://www.udemy.com/course/deep-learning/learn/lecture/12345678';

  it('matches a stored URL to the tab showing the same lecture', () => {
    // The stored URL is whatever the tab showed when the transcript was taken;
    // the tab open now usually carries different query params. Comparing raw
    // URLs would miss the very tab we are looking for, and the timestamp would
    // silently open a duplicate instead of seeking.
    expect(normalizeLectureUrl(`${LECTURE}?start=0`)).toBe(normalizeLectureUrl(LECTURE));
    expect(normalizeLectureUrl(`${LECTURE}#overview`)).toBe(normalizeLectureUrl(LECTURE));
    expect(normalizeLectureUrl(`${LECTURE}/`)).toBe(normalizeLectureUrl(LECTURE));
  });

  it('keeps different lectures in the same course apart', () => {
    // Seeking the wrong video is worse than not seeking at all.
    const other = 'https://www.udemy.com/course/deep-learning/learn/lecture/87654321';
    expect(normalizeLectureUrl(other)).not.toBe(normalizeLectureUrl(LECTURE));
  });

  it('never matches when there is no URL to match on', () => {
    // Two lectures with no stored URL must not be treated as the same page.
    expect(normalizeLectureUrl(undefined)).toBe('');
    expect(normalizeLectureUrl('')).toBe('');
  });

  it('keeps YouTube videos apart, where the id lives in the query', () => {
    // Dropping the query normalises every watch page to `youtube.com/watch`,
    // so a timestamp would have seeked whichever YouTube tab was open.
    const one = 'https://www.youtube.com/watch?v=aaaaaaaaaaa';
    const two = 'https://www.youtube.com/watch?v=bbbbbbbbbbb';

    expect(normalizeLectureUrl(one)).not.toBe(normalizeLectureUrl(two));
    expect(normalizeLectureUrl(`${one}&t=90s`)).toBe(normalizeLectureUrl(one));
    expect(normalizeLectureUrl(`${one}&list=PL123`)).toBe(normalizeLectureUrl(one));
  });

  it('settles the trailing slash without eating the video id behind it', () => {
    // The slash now sits in front of a `?v=`, so stripping it from the end of
    // the whole string would miss it here and strip the id itself elsewhere.
    const one = 'https://www.youtube.com/watch?v=aaaaaaaaaaa';
    expect(normalizeLectureUrl('https://www.youtube.com/watch/?v=aaaaaaaaaaa')).toBe(
      normalizeLectureUrl(one),
    );
    expect(normalizeLectureUrl(one).endsWith('v=aaaaaaaaaaa')).toBe(true);
  });

  it('leaves a URL it cannot parse alone rather than dropping it', () => {
    expect(normalizeLectureUrl('not a url')).toBe('not a url');
  });
});

describe('generateFilename', () => {
  it('maps format ids to real file extensions', () => {
    // Regression: these previously produced `.markdown` and `.rag`, neither of
    // which any tool opens, while the UI promised `.md`.
    expect(ExtensionService.generateFilename('Lesson 1', 'markdown')).toMatch(/\.md$/);
    expect(ExtensionService.generateFilename('Lesson 1', 'rag')).toMatch(/\.json$/);
    expect(ExtensionService.generateFilename('Lesson 1', 'json')).toMatch(/\.json$/);
    expect(ExtensionService.generateFilename('Lesson 1', 'txt')).toMatch(/\.txt$/);
  });

  it('falls back to .txt for an unknown format', () => {
    expect(ExtensionService.generateFilename('x', 'bogus')).toMatch(/\.txt$/);
  });

  it('strips characters that are illegal in filenames', () => {
    const name = ExtensionService.generateFilename('a/b\\c:d*e?"f<g>h|i', 'txt');
    expect(name).not.toMatch(/[/\\:*?"<>|]/);
  });

  it('never produces a name that is only a timestamp', () => {
    expect(ExtensionService.generateFilename('!!!', 'txt')).toMatch(/^transcript_/);
    expect(ExtensionService.generateFilename('', 'txt')).toMatch(/^transcript_/);
  });

  it('collapses runs of underscores', () => {
    expect(ExtensionService.generateFilename('a    b', 'txt')).toContain('a_b');
  });
});

describe('getMimeType', () => {
  it('returns the correct type per format', () => {
    expect(ExtensionService.getMimeType('markdown')).toBe('text/markdown');
    expect(ExtensionService.getMimeType('json')).toBe('application/json');
    expect(ExtensionService.getMimeType('rag')).toBe('application/json');
    expect(ExtensionService.getMimeType('txt')).toBe('text/plain');
    expect(ExtensionService.getMimeType('bogus')).toBe('text/plain');
  });
});

describe('formatTranscript', () => {
  it('does not corrupt transcripts that talk about code', () => {
    // Regression: the old sanitizer stripped the literal "javascript:" and any
    // <script> tag from transcript text, silently mangling web-dev courses.
    const raw = '[00:01] Type javascript:void(0) then add a <script> tag to the page.';
    const out = ExtensionService.formatTranscript(raw, 'txt', true);
    expect(out).toContain('javascript:void(0)');
    expect(out).toContain('<script>');
  });

  describe('markdown', () => {
    it('includes a title heading and source metadata', () => {
      const out = ExtensionService.formatTranscript(RAW, 'markdown', true, 'Gradient Descent', {
        url: 'https://www.youtube.com/watch?v=abc',
        instructor: 'Ada',
      });
      expect(out).toMatch(/^# Gradient Descent/);
      expect(out).toContain('Ada');
      expect(out).toContain('https://www.youtube.com/watch?v=abc');
    });

    it('shows timestamps as plain text, not links', () => {
      // A document gets pasted into notes apps and into model context; a URL
      // wrapped around every paragraph is noise in both. The source appears
      // once in the header instead.
      const out = ExtensionService.formatTranscript(RAW, 'markdown', true, 'T', {
        url: 'https://www.youtube.com/watch?v=abc',
      });
      expect(out).toMatch(/\*\*\[\d{2}:\d{2}\]\*\*/);
      expect(out).not.toMatch(/\[\d{2}:\d{2}\]\(http/);
    });

    it('records when the transcript was saved', () => {
      const out = ExtensionService.formatTranscript(RAW, 'markdown', true, 'T');
      expect(out).toContain('**Saved:**');
    });

    it('keeps the header tidy rather than leaving blank-line gaps', () => {
      // Regression: metadata lines were joined with the body separator, which
      // produced three empty lines between the heading and the first field.
      const out = ExtensionService.formatTranscript(RAW, 'markdown', true, 'T', {
        url: 'https://www.youtube.com/watch?v=abc',
      });
      expect(out).not.toMatch(/\n{3,}/);
    });

    it('omits timestamps when asked', () => {
      const out = ExtensionService.formatTranscript(RAW, 'markdown', false, 'T');
      expect(out).not.toMatch(/\[\d{2}:\d{2}\]/);
      expect(out).toContain('gradient descent');
    });
  });

  describe('obsidian', () => {
    it('opens with a YAML front-matter block', () => {
      const out = ExtensionService.formatTranscript(RAW, 'obsidian', true, 'T');
      expect(out).toMatch(/^---\n/);
      expect(out).toContain('title: "T"');
      expect(out).toMatch(/saved: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    });

    it('puts the heading after the front matter, not inside it', () => {
      const out = ExtensionService.formatTranscript(RAW, 'obsidian', true, 'T');
      expect(out).toContain('---\n\n# T');
    });

    it('quotes titles that would otherwise break the YAML parse', () => {
      // "Part 2: Recursion" unquoted is a nested mapping, not a string.
      const colon = ExtensionService.formatTranscript(RAW, 'obsidian', true, 'Part 2: Recursion');
      expect(colon).toContain('title: "Part 2: Recursion"');

      const quoted = ExtensionService.formatTranscript(RAW, 'obsidian', true, 'The "big" O');
      expect(quoted).toContain('title: "The \\"big\\" O"');
    });

    it('carries source metadata as properties', () => {
      const out = ExtensionService.formatTranscript(RAW, 'obsidian', true, 'T', {
        url: 'https://www.udemy.com/course/x/learn/lecture/1',
        courseTitle: 'ML 101',
        instructor: 'Ada',
        platform: 'udemy',
      });
      expect(out).toContain('course: "ML 101"');
      expect(out).toContain('instructor: "Ada"');
      expect(out).toContain('platform: "udemy"');
      expect(out).toContain('source: "https://www.udemy.com/course/x/learn/lecture/1"');
    });

    it('emits tags Obsidian can actually use', () => {
      const out = ExtensionService.formatTranscript(RAW, 'obsidian', true, 'T', {
        courseTitle: 'ML 101',
        platform: 'udemy',
      });
      expect(out).toContain('tags:');
      expect(out).toContain('  - transcript');
      expect(out).toContain('  - udemy');
      // Spaces are not legal in an Obsidian tag.
      expect(out).toContain('  - ml-101');
    });

    it('keeps timestamps as plain text, like every other document format', () => {
      const out = ExtensionService.formatTranscript(RAW, 'obsidian', true, 'T', {
        url: 'https://www.youtube.com/watch?v=abc',
      });
      expect(out).toMatch(/\*\*\[\d{2}:\d{2}\]\*\*/);
      expect(out).not.toMatch(/\[\d{2}:\d{2}\]\(http/);
    });

    it('writes a .md file', () => {
      expect(ExtensionService.generateFilename('Lesson 1', 'obsidian')).toMatch(/\.md$/);
      expect(ExtensionService.getMimeType('obsidian')).toBe('text/markdown');
    });

    it('leaves no blank-line gaps', () => {
      const out = ExtensionService.formatTranscript(RAW, 'obsidian', true, 'T', {
        courseTitle: 'ML 101',
      });
      expect(out).not.toMatch(/\n{3,}/);
    });
  });

  describe('json', () => {
    it('emits parseable, structured cues', () => {
      const parsed = JSON.parse(ExtensionService.formatTranscript(RAW, 'json', true, 'T'));
      expect(parsed.title).toBe('T');
      expect(Array.isArray(parsed.cues)).toBe(true);
      expect(parsed.cues[0]).toHaveProperty('start');
      expect(parsed.cues[0]).toHaveProperty('timestamp');
      expect(parsed.cueCount).toBe(parsed.cues.length);
    });

    it('drops timing fields when timestamps are off', () => {
      const parsed = JSON.parse(ExtensionService.formatTranscript(RAW, 'json', false, 'T'));
      expect(parsed.cues[0]).not.toHaveProperty('start');
    });
  });

  describe('rag', () => {
    const build = () =>
      JSON.parse(
        ExtensionService.formatTranscript(RAW, 'rag', true, 'Gradient Descent', {
          url: 'https://www.youtube.com/watch?v=abc',
          platform: 'youtube',
          courseTitle: 'ML 101',
        }),
      );

    it('is valid JSON with a chunk array', () => {
      const doc = build();
      expect(Array.isArray(doc.chunks)).toBe(true);
      expect(doc.chunks.length).toBeGreaterThan(0);
      expect(doc.stats.chunk_count).toBe(doc.chunks.length);
    });

    it('embeds situating context in the text meant to be embedded', () => {
      const doc = build();
      for (const chunk of doc.chunks) {
        expect(chunk.content).toContain('Gradient Descent');
        expect(chunk.content.endsWith(chunk.body)).toBe(true);
      }
    });

    it('carries a citable timestamp and deep link per chunk', () => {
      const doc = build();
      for (const chunk of doc.chunks) {
        expect(chunk.metadata.start_seconds).not.toBeNull();
        expect(chunk.metadata.time_range).toMatch(/\d{1,2}:\d{2}/);
        expect(chunk.metadata.url).toContain('&t=');
      }
    });

    it('declares the chunking parameters it actually used', () => {
      const doc = build();
      expect(doc.chunking.target_tokens).toBe(512);
      expect(doc.chunking.overlap_tokens).toBeGreaterThan(0);
      expect(doc.chunking.contextual_headers).toBe(true);
    });

    it('cleans fillers and sound tags out of chunk bodies', () => {
      const doc = build();
      const all = doc.chunks.map((c: { body: string }) => c.body).join(' ');
      expect(all).not.toContain('[Music]');
      expect(all).not.toMatch(/\bum\b/);
      expect(all).toContain('gradient descent');
    });
  });

  describe('subtitle formats', () => {
    it('emits SRT that parses back to the same cues', () => {
      const srt = ExtensionService.formatTranscript(RAW, 'srt', true, 'T');
      expect(srt).toMatch(/^1\r?\n00:00:03,000 --> /);
      const back = parseCaptionFile(srt);
      expect(back.length).toBeGreaterThan(0);
      expect(back[0].text).toContain('Welcome back');
    });

    it('emits WebVTT with a header', () => {
      const vtt = ExtensionService.formatTranscript(RAW, 'vtt', true, 'T');
      expect(vtt.startsWith('WEBVTT')).toBe(true);
      expect(parseCaptionFile(vtt).length).toBeGreaterThan(0);
    });

    it('derives end times so each cue runs until the next', () => {
      const cues = parseCaptionFile(ExtensionService.formatTranscript(RAW, 'srt', true, 'T'));
      for (const cue of cues) {
        expect(cue.endSeconds).not.toBeNull();
        expect(cue.endSeconds!).toBeGreaterThan(cue.startSeconds);
      }
    });
  });

  describe('csv', () => {
    it('writes a header row and one row per cue', () => {
      const csv = ExtensionService.formatTranscript(RAW, 'csv', true, 'T');
      const rows = csv.trim().split(/\r\n/);
      expect(rows[0]).toBe('start_seconds,timestamp,text,url');
      expect(rows.length).toBeGreaterThan(1);
    });

    it('quotes fields containing commas and doubles embedded quotes', () => {
      const raw = '[00:01] He said, "use a comma", then paused.';
      const csv = ExtensionService.formatTranscript(raw, 'csv', true, 'T');
      expect(csv).toContain('"He said, ""use a comma"", then paused."');
    });

    it('includes a deep link column when a source URL is known', () => {
      const csv = ExtensionService.formatTranscript(RAW, 'csv', true, 'T', {
        url: 'https://www.youtube.com/watch?v=abc',
      });
      expect(csv).toContain('&t=3s');
    });
  });

  describe('formatCollection', () => {
    const lectures = [
      { title: 'Intro', url: 'https://udemy.com/c/x/learn/lecture/1', transcript: '[00:03] welcome to the course about gradients.' },
      { title: 'Descent', url: 'https://udemy.com/c/x/learn/lecture/2', transcript: '[00:05] gradient descent minimises the loss function.' },
    ];
    const meta = { courseTitle: 'ML 101', platform: 'udemy' as const };

    it('keeps every lecture rather than only the last', () => {
      const out = ExtensionService.formatCollection(lectures, 'markdown', true, meta);
      expect(out).toContain('Intro');
      expect(out).toContain('Descent');
      expect(out).toContain('welcome to the course');
      expect(out).toContain('minimises the loss');
    });

    it('labels each lecture, since timestamps restart per video', () => {
      const out = ExtensionService.formatCollection(lectures, 'markdown', true, meta);
      expect(out).toContain('## 1. Intro');
      expect(out).toContain('## 2. Descent');
    });

    it('records the course and lecture count', () => {
      const out = ExtensionService.formatCollection(lectures, 'markdown', true, meta);
      expect(out).toContain('ML 101');
      expect(out).toContain('**Lectures:** 2');
      expect(out).toContain('**Saved:**');
    });

    it('gives an obsidian course export course-level properties', () => {
      const out = ExtensionService.formatCollection(lectures, 'obsidian', true, meta);
      expect(out).toMatch(/^---\n/);
      expect(out).toContain('title: "ML 101"');
      expect(out).toContain('lectures: 2');
      expect(out).toContain('  - course');
    });

    it('opens a course export with contents that link to its sections', () => {
      // A course export runs to tens of thousands of words; the anchors have to
      // match the headings they point at or the list is decoration.
      const out = ExtensionService.formatCollection(lectures, 'obsidian', true, meta);
      expect(out).toContain('## Contents');
      expect(out).toContain('1. [Intro](#1-intro)');
      expect(out).toContain('2. [Descent](#2-descent)');
      expect(out).toContain('## 1. Intro');
      expect(out).toContain('## 2. Descent');
    });

    it('keeps every lecture body in an obsidian course export', () => {
      const out = ExtensionService.formatCollection(lectures, 'obsidian', true, meta);
      expect(out).toContain('welcome to the course');
      expect(out).toContain('minimises the loss');
      // One front-matter block for the document, not one per lecture.
      expect(out.match(/^---$/gm)).toHaveLength(2);
    });

    it('tags rag chunks with the lecture they came from', () => {
      const doc = JSON.parse(ExtensionService.formatCollection(lectures, 'rag', true, meta));
      expect(doc.document.lecture_count).toBe(2);
      const titles = new Set(doc.chunks.map((c: { metadata: { lecture_title: string } }) => c.metadata.lecture_title));
      expect(titles).toEqual(new Set(['Intro', 'Descent']));
      for (const chunk of doc.chunks) expect(chunk.metadata.lecture_order).toBeGreaterThan(0);
    });

    it('nests lectures in json', () => {
      const doc = JSON.parse(ExtensionService.formatCollection(lectures, 'json', true, meta));
      expect(doc.lectures).toHaveLength(2);
      expect(doc.lectures[0].title).toBe('Intro');
      expect(doc.lectures[0].cues.length).toBeGreaterThan(0);
    });

    it('adds a lecture column to csv', () => {
      const csv = ExtensionService.formatCollection(lectures, 'csv', true, meta);
      const rows = csv.trim().split('\r\n');
      expect(rows[0].startsWith('lecture,')).toBe(true);
      expect(rows.slice(1).some((r) => r.startsWith('Intro,'))).toBe(true);
      expect(rows.slice(1).some((r) => r.startsWith('Descent,'))).toBe(true);
    });

    it('exports one lecture only for subtitle formats', () => {
      // An .srt describes a single video timeline; merging would make every
      // timing after the first wrong.
      const srt = ExtensionService.formatCollection(lectures, 'srt', true, meta);
      expect(srt).toContain('minimises the loss');
      expect(srt).not.toContain('welcome to the course');
    });

    it('falls back to the plain format for a single lecture', () => {
      const out = ExtensionService.formatCollection([lectures[0]], 'markdown', true, meta);
      expect(out).toMatch(/^# Intro/);
      expect(out).not.toContain('## 1.');
    });

    it('handles an empty collection without throwing', () => {
      for (const format of ['markdown', 'txt', 'json', 'rag', 'csv', 'srt'] as const) {
        expect(() => ExtensionService.formatCollection([], format, true, meta)).not.toThrow();
      }
    });
  });

  it('handles an empty transcript in every format without throwing', () => {
    for (const format of ['markdown', 'txt', 'json', 'rag', 'srt', 'vtt', 'csv'] as const) {
      expect(() => ExtensionService.formatTranscript('', format, true, 'T')).not.toThrow();
    }
    expect(JSON.parse(ExtensionService.formatTranscript('', 'rag', true, 'T')).chunks).toEqual([]);
  });
});
