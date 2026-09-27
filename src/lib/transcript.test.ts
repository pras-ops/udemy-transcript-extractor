import { describe, it, expect } from 'vitest';
import {
  parseTimestamp,
  formatTimestamp,
  parseTranscript,
  cleanCues,
  chunkCues,
  estimateTokens,
  buildDeepLink,
  buildContextHeader,
  buildChunks,
  estimateCueTimings,
  DEFAULT_CHUNK_OPTIONS,
  type Cue,
} from './transcript';

/** Build a transcript in the `[MM:SS] text` shape the extractors emit. */
function transcript(...lines: [string, string][]): string {
  return lines.map(([t, text]) => `[${t}] ${text}`).join('\n\n');
}

describe('parseTimestamp', () => {
  it('parses MM:SS and HH:MM:SS', () => {
    expect(parseTimestamp('00:00')).toBe(0);
    expect(parseTimestamp('02:14')).toBe(134);
    expect(parseTimestamp('1:02:03')).toBe(3723);
  });

  it('rejects non-timestamps rather than coercing them', () => {
    expect(parseTimestamp('Music')).toBeNull();
    expect(parseTimestamp('99')).toBeNull();
    expect(parseTimestamp('00:99')).toBeNull();
    expect(parseTimestamp('a:bb')).toBeNull();
  });
});

describe('formatTimestamp', () => {
  it('pads and only shows hours when needed', () => {
    expect(formatTimestamp(0)).toBe('00:00');
    expect(formatTimestamp(134)).toBe('02:14');
    expect(formatTimestamp(3723)).toBe('1:02:03');
  });

  it('round-trips with parseTimestamp', () => {
    for (const s of [0, 5, 59, 60, 599, 3599, 3600, 7261]) {
      expect(parseTimestamp(formatTimestamp(s))).toBe(s);
    }
  });
});

describe('parseTranscript', () => {
  it('parses the extractor output format', () => {
    const raw = transcript(['00:03', 'Welcome to the course.'], ['00:09', 'Today we cover vectors.']);
    expect(parseTranscript(raw)).toEqual([
      { startSeconds: 3, text: 'Welcome to the course.' },
      { startSeconds: 9, text: 'Today we cover vectors.' },
    ]);
  });

  it('keeps untimed lines instead of dropping them', () => {
    const cues = parseTranscript('No timestamp here.\n\n[00:10] But here there is.');
    expect(cues).toEqual([
      { startSeconds: null, text: 'No timestamp here.' },
      { startSeconds: 10, text: 'But here there is.' },
    ]);
  });

  it('treats a non-time bracket as text, not a timestamp', () => {
    const cues = parseTranscript('[MUSIC] intro plays');
    expect(cues).toEqual([{ startSeconds: null, text: '[MUSIC] intro plays' }]);
  });

  it('normalises internal whitespace and skips blank blocks', () => {
    expect(parseTranscript('[00:01]   a    b \n\n\n\n   \n\n[00:02] c')).toEqual([
      { startSeconds: 1, text: 'a b' },
      { startSeconds: 2, text: 'c' },
    ]);
  });

  it('returns empty for empty input', () => {
    expect(parseTranscript('')).toEqual([]);
    expect(parseTranscript('   \n\n  ')).toEqual([]);
  });
});

describe('cleanCues', () => {
  it('drops non-speech sound tags', () => {
    const cues: Cue[] = [
      { startSeconds: 0, text: '[Music]' },
      { startSeconds: 5, text: 'Now [Applause] we begin.' },
    ];
    expect(cleanCues(cues)).toEqual([{ startSeconds: 5, text: 'Now we begin.' }]);
  });

  it('removes standalone fillers without touching real words', () => {
    const cues: Cue[] = [
      { startSeconds: 0, text: 'So um, this is uh the gradient.' },
      { startSeconds: 5, text: 'Umbrella terms are ambiguous.' },
      { startSeconds: 9, text: "I'm going to erase this." },
    ];
    const out = cleanCues(cues);
    expect(out[0].text).toBe('So, this is the gradient.');
    // Regression guards: "Umbrella" and "erase" must survive filler stripping.
    expect(out[1].text).toBe('Umbrella terms are ambiguous.');
    expect(out[2].text).toBe("I'm going to erase this.");
  });

  it('collapses YouTube rolling-caption repeats', () => {
    const cues: Cue[] = [
      { startSeconds: 0, text: 'the network learns' },
      { startSeconds: 2, text: 'the network learns weights' },
      { startSeconds: 4, text: 'the network learns weights' },
      { startSeconds: 6, text: 'and biases' },
    ];
    expect(cleanCues(cues)).toEqual([
      { startSeconds: 0, text: 'the network learns weights' },
      { startSeconds: 6, text: 'and biases' },
    ]);
  });

  it('preserves timestamps through cleanup', () => {
    const cues: Cue[] = [{ startSeconds: 42, text: 'um, so the point is this.' }];
    expect(cleanCues(cues)[0].startSeconds).toBe(42);
  });

  it('honours opt-outs', () => {
    const cues: Cue[] = [{ startSeconds: 0, text: 'um [Music] hello' }];
    const out = cleanCues(cues, { removeFillers: false, removeSoundTags: false });
    expect(out[0].text).toBe('um [Music] hello');
  });
});

describe('estimateTokens', () => {
  it('is monotonic and non-zero for real text', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('hello')).toBeGreaterThan(0);
    expect(estimateTokens('one two three')).toBeGreaterThan(estimateTokens('one two'));
  });

  it('over-estimates rather than under-estimates word count', () => {
    expect(estimateTokens('one two three four')).toBeGreaterThanOrEqual(4);
  });
});

/** 10 words per cue, sentence-terminated. */
function makeCues(count: number, wordsPer = 10): Cue[] {
  return Array.from({ length: count }, (_, i) => ({
    startSeconds: i * 5,
    text: Array.from({ length: wordsPer - 1 }, (_, w) => `w${i}x${w}`).join(' ') + ' end.',
  }));
}

describe('chunkCues', () => {
  it('returns nothing for no cues', () => {
    expect(chunkCues([])).toEqual([]);
  });

  it('produces chunks near the token target, not tiny fragments', () => {
    const chunks = chunkCues(makeCues(200));
    expect(chunks.length).toBeGreaterThan(1);
    // The regression this module exists to prevent: ~70-token fragments.
    for (const c of chunks.slice(0, -1)) {
      expect(c.estimatedTokens).toBeGreaterThan(200);
      expect(c.estimatedTokens).toBeLessThanOrEqual(DEFAULT_CHUNK_OPTIONS.maxTokens);
    }
  });

  it('never exceeds maxTokens', () => {
    const chunks = chunkCues(makeCues(300, 25), { targetTokens: 200, maxTokens: 260 });
    for (const c of chunks) expect(c.estimatedTokens).toBeLessThanOrEqual(260);
  });

  it('carries overlap between consecutive chunks', () => {
    const chunks = chunkCues(makeCues(200), { overlapTokens: 64 });
    expect(chunks.length).toBeGreaterThan(1);
    const tailWords = chunks[0].body.split(' ').slice(-5).join(' ');
    expect(chunks[1].body).toContain(tailWords);
  });

  it('emits no overlap when overlap is disabled', () => {
    const chunks = chunkCues(makeCues(200), { overlapTokens: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    // Compare only the per-cue unique tokens (`w<cue>x<word>`); the shared
    // sentence terminator every generated cue carries is not evidence of overlap.
    const unique = (body: string) => new Set(body.match(/\bw\d+x\d+\b/g) ?? []);
    const first = unique(chunks[0].body);
    for (const token of unique(chunks[1].body)) {
      expect(first.has(token)).toBe(false);
    }
  });

  it('covers every cue', () => {
    const cues = makeCues(120);
    const chunks = chunkCues(cues, { overlapTokens: 0 });
    const joined = chunks.map((c) => c.body).join(' ');
    for (const cue of cues) expect(joined).toContain(cue.text);
  });

  it('records an ascending, non-inverted time range', () => {
    const chunks = chunkCues(makeCues(200));
    for (const c of chunks) {
      expect(c.startSeconds).not.toBeNull();
      expect(c.endSeconds).not.toBeNull();
      expect(c.endSeconds!).toBeGreaterThanOrEqual(c.startSeconds!);
      expect(c.timeRange).toMatch(/^\d{1,2}:\d{2}(:\d{2})? - \d{1,2}:\d{2}(:\d{2})?$/);
    }
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startSeconds!).toBeGreaterThanOrEqual(chunks[i - 1].startSeconds!);
    }
  });

  it('does not emit a trailing chunk that is only overlap', () => {
    for (const n of [7, 19, 33, 64, 101]) {
      const chunks = chunkCues(makeCues(n));
      const last = chunks[chunks.length - 1];
      if (chunks.length > 1) {
        expect(chunks[chunks.length - 2].body.endsWith(last.body)).toBe(false);
      }
    }
  });

  it('handles a single cue larger than maxTokens without hanging or dropping it', () => {
    const huge: Cue[] = [{ startSeconds: 0, text: Array.from({ length: 2000 }, (_, i) => `w${i}`).join(' ') }];
    const chunks = chunkCues(huge);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].body).toContain('w1999');
  });

  it('tolerates cues with no timestamps', () => {
    const cues: Cue[] = Array.from({ length: 50 }, () => ({ startSeconds: null, text: 'some words here end.' }));
    const chunks = chunkCues(cues);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].startSeconds).toBeNull();
    expect(chunks[0].timeRange).toBeNull();
  });

  it('numbers chunks contiguously from zero', () => {
    const chunks = chunkCues(makeCues(150));
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
  });
});

describe('estimateCueTimings', () => {
  const untimed = (...texts: string[]): Cue[] =>
    texts.map((text) => ({ startSeconds: null, text }));

  it('spreads cues across the duration', () => {
    const out = estimateCueTimings(untimed('aaaa', 'bbbb', 'cccc', 'dddd'), 120);
    expect(out.map((c) => c.startSeconds)).toEqual([0, 30, 60, 90]);
  });

  it('weights by length, since longer speech takes longer', () => {
    // First cue is three times the length, so it should occupy three times
    // the span before the second begins.
    const out = estimateCueTimings(untimed('aaaaaaaaa', 'bbb'), 120);
    expect(out[0].startSeconds).toBe(0);
    expect(out[1].startSeconds).toBe(90);
  });

  it('never rewrites real timestamps', () => {
    const mixed: Cue[] = [
      { startSeconds: 5, text: 'real' },
      { startSeconds: null, text: 'missing' },
    ];
    expect(estimateCueTimings(mixed, 100)).toEqual(mixed);
  });

  it('leaves cues alone when the duration is unusable', () => {
    const cues = untimed('a', 'b');
    expect(estimateCueTimings(cues, 0)).toEqual(cues);
    expect(estimateCueTimings(cues, Number.NaN)).toEqual(cues);
    expect(estimateCueTimings(cues, -10)).toEqual(cues);
  });

  it('produces non-decreasing, in-range timings', () => {
    const out = estimateCueTimings(untimed(...Array(20).fill('some words here')), 600);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].startSeconds!).toBeGreaterThanOrEqual(out[i - 1].startSeconds!);
      expect(out[i].startSeconds!).toBeLessThanOrEqual(600);
    }
  });

  it('handles an empty list', () => {
    expect(estimateCueTimings([], 100)).toEqual([]);
  });
});

describe('buildDeepLink', () => {
  it('builds a YouTube time link', () => {
    expect(buildDeepLink('https://www.youtube.com/watch?v=abc123', 134)).toBe(
      'https://www.youtube.com/watch?v=abc123&t=134s',
    );
  });

  it('builds a Udemy time link', () => {
    expect(buildDeepLink('https://www.udemy.com/course/x/learn/lecture/42', 90)).toBe(
      'https://www.udemy.com/course/x/learn/lecture/42?start=90',
    );
  });

  it('returns null rather than a link that ignores the timestamp', () => {
    expect(buildDeepLink('https://example.com/video', 90)).toBeNull();
    expect(buildDeepLink(undefined, 90)).toBeNull();
    expect(buildDeepLink('https://www.youtube.com/watch?v=a', null)).toBeNull();
    expect(buildDeepLink('not a url', 5)).toBeNull();
  });

  it('overwrites an existing t param instead of duplicating it', () => {
    const out = buildDeepLink('https://www.youtube.com/watch?v=a&t=10s', 55)!;
    expect(out).toContain('t=55s');
    expect(out.match(/t=/g)).toHaveLength(1);
  });
});

describe('buildContextHeader', () => {
  it('names the source and the position', () => {
    const header = buildContextHeader(
      { title: 'Backpropagation', courseTitle: 'Deep Learning' },
      { timeRange: '02:14 - 03:05' },
    );
    expect(header).toContain('Deep Learning');
    expect(header).toContain('Backpropagation');
    expect(header).toContain('02:14 - 03:05');
  });

  it('degrades gracefully with no metadata', () => {
    expect(buildContextHeader({}, { timeRange: null })).toMatch(/transcript/i);
  });

  it('does not repeat the title when course and title match', () => {
    const header = buildContextHeader({ title: 'Same', courseTitle: 'Same' }, { timeRange: null });
    expect(header.match(/Same/g)).toHaveLength(1);
  });
});

describe('buildChunks', () => {
  const raw = transcript(
    ...Array.from({ length: 150 }, (_, i) => [`${String(Math.floor(i / 12)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`, `um, sentence number ${i} with some filler content here to fill it out.`] as [string, string]),
  );

  it('runs the whole pipeline and embeds context into the chunk text', () => {
    const chunks = buildChunks(raw, {
      title: 'Neural Networks',
      url: 'https://www.youtube.com/watch?v=abc',
    });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.content).toContain('Neural Networks');
      expect(c.content.endsWith(c.body)).toBe(true);
      expect(c.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=abc&t=\d+s$/);
      expect(c.id).toMatch(/^chunk_\d{4}$/);
    }
  });

  it('strips fillers before chunking', () => {
    const chunks = buildChunks(raw, { title: 'T' });
    expect(chunks.some((c) => /\bum\b/.test(c.body))).toBe(false);
  });

  it('can be asked not to contextualize', () => {
    const chunks = buildChunks(raw, { title: 'T' }, { contextualize: false });
    expect(chunks[0].content).toBe(chunks[0].body);
  });

  it('returns nothing for an empty transcript', () => {
    expect(buildChunks('', { title: 'T' })).toEqual([]);
  });
});
