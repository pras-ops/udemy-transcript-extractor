import { describe, it, expect } from 'vitest';
import {
  parseCaptionFile,
  cleanCueText,
  formatCueTime,
  looksLikeCaptionFile,
  withEndTimes,
  toWebVTT,
  toSRT,
  toBracketTranscript,
  toCues,
  type TimedCue,
} from './caption-formats';

const VTT = `WEBVTT
Kind: captions
Language: en

NOTE this is a comment block that must not become a cue

1
00:00:01.000 --> 00:00:04.500
First line of the lecture.

2
00:00:04.500 --> 00:00:09.250
Second line, <i>with</i> markup.
`;

const SRT = `1
00:00:01,000 --> 00:00:04,500
First line of the lecture.

2
00:00:04,500 --> 00:00:09,250
Second line of the lecture.
`;

describe('parseCaptionFile', () => {
  it('parses WebVTT', () => {
    expect(parseCaptionFile(VTT)).toEqual([
      { startSeconds: 1, endSeconds: 4.5, text: 'First line of the lecture.' },
      { startSeconds: 4.5, endSeconds: 9.25, text: 'Second line, with markup.' },
    ]);
  });

  it('parses SubRip with comma decimals', () => {
    const cues = parseCaptionFile(SRT);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({
      startSeconds: 1,
      endSeconds: 4.5,
      text: 'First line of the lecture.',
    });
  });

  it('skips WEBVTT, NOTE, STYLE and REGION blocks', () => {
    const cues = parseCaptionFile(`WEBVTT

STYLE
::cue { color: red }

REGION
id:top

NOTE just a note

00:00:02.000 --> 00:00:03.000
Only real cue.`);
    expect(cues).toEqual([{ startSeconds: 2, endSeconds: 3, text: 'Only real cue.' }]);
  });

  it('accepts MM:SS.mmm timestamps without an hours field', () => {
    const cues = parseCaptionFile('WEBVTT\n\n01:30.500 --> 01:34.000\nShort form.');
    expect(cues[0].startSeconds).toBe(90.5);
    expect(cues[0].endSeconds).toBe(94);
  });

  it('parses hours past 99 minutes correctly', () => {
    const cues = parseCaptionFile('WEBVTT\n\n01:02:03.000 --> 01:02:05.000\nLong lecture.');
    expect(cues[0].startSeconds).toBe(3723);
  });

  it('handles CRLF line endings and a BOM', () => {
    const cues = parseCaptionFile('﻿WEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\nHello.');
    expect(cues).toEqual([{ startSeconds: 1, endSeconds: 2, text: 'Hello.' }]);
  });

  it('joins multi-line cue text', () => {
    const cues = parseCaptionFile('WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nfirst part\nsecond part');
    expect(cues[0].text).toBe('first part second part');
  });

  it('tolerates cues with no identifier line', () => {
    const cues = parseCaptionFile('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nNo id here.');
    expect(cues).toHaveLength(1);
  });

  it('collapses rolling-caption duplicates', () => {
    const cues = parseCaptionFile(`WEBVTT

00:00:01.000 --> 00:00:02.000
the model learns

00:00:02.000 --> 00:00:03.000
the model learns weights

00:00:03.000 --> 00:00:04.000
the model learns weights

00:00:04.000 --> 00:00:05.000
and biases`);
    expect(cues.map((c) => c.text)).toEqual(['the model learns weights', 'and biases']);
    // The surviving cue should span the whole run it absorbed.
    expect(cues[0].endSeconds).toBe(4);
  });

  it('drops a zero-length or inverted range rather than trusting it', () => {
    const cues = parseCaptionFile('WEBVTT\n\n00:00:05.000 --> 00:00:05.000\nInstant.');
    expect(cues[0].endSeconds).toBeNull();
  });

  it('returns empty for junk rather than throwing', () => {
    expect(parseCaptionFile('')).toEqual([]);
    expect(parseCaptionFile('<html><body>Not a caption file</body></html>')).toEqual([]);
    expect(parseCaptionFile('   \n\n  ')).toEqual([]);
  });
});

describe('cleanCueText', () => {
  it('keeps the speaker from a voice span', () => {
    expect(cleanCueText('<v Dr. Chen>Now consider the gradient.</v>')).toBe(
      'Dr. Chen: Now consider the gradient.',
    );
  });

  it('does not double the speaker when the text already names them', () => {
    expect(cleanCueText('<v Ada>Ada here, welcome back.</v>')).toBe('Ada here, welcome back.');
  });

  it('strips styling and class tags', () => {
    expect(cleanCueText('<c.loud><b>Loud</b></c> and <i>quiet</i>')).toBe('Loud and quiet');
  });

  it('decodes the entities captions actually contain', () => {
    expect(cleanCueText('a &amp; b &lt;tag&gt; &quot;quoted&quot;')).toBe('a & b <tag> "quoted"');
  });

  it('collapses whitespace', () => {
    expect(cleanCueText('  lots   of \n space  ')).toBe('lots of space');
  });
});

describe('formatCueTime', () => {
  it('pads to HH:MM:SS.mmm', () => {
    expect(formatCueTime(0)).toBe('00:00:00.000');
    expect(formatCueTime(3723.5)).toBe('01:02:03.500');
  });

  it('uses a comma for SubRip', () => {
    expect(formatCueTime(1.25, ',')).toBe('00:00:01,250');
  });

  it('never emits a negative time', () => {
    expect(formatCueTime(-5)).toBe('00:00:00.000');
  });
});

describe('looksLikeCaptionFile', () => {
  it('recognises VTT and SRT', () => {
    expect(looksLikeCaptionFile(VTT)).toBe(true);
    expect(looksLikeCaptionFile(SRT)).toBe(true);
  });

  it('rejects an HTML error page served with a 200', () => {
    expect(looksLikeCaptionFile('<!DOCTYPE html><html><head>')).toBe(false);
    expect(looksLikeCaptionFile('')).toBe(false);
  });
});

describe('withEndTimes', () => {
  it('fills a missing end from the next cue start', () => {
    const cues: TimedCue[] = [
      { startSeconds: 0, endSeconds: null, text: 'a' },
      { startSeconds: 5, endSeconds: null, text: 'b' },
    ];
    const out = withEndTimes(cues);
    expect(out[0].endSeconds).toBe(5);
    expect(out[1].endSeconds).toBe(9); // trailing default
  });

  it('keeps a real end time', () => {
    const out = withEndTimes([{ startSeconds: 0, endSeconds: 2, text: 'a' }]);
    expect(out[0].endSeconds).toBe(2);
  });

  it('always produces an end after the start', () => {
    const out = withEndTimes([
      { startSeconds: 10, endSeconds: null, text: 'a' },
      { startSeconds: 10, endSeconds: null, text: 'b' },
    ]);
    for (const cue of out) expect(cue.endSeconds).toBeGreaterThan(cue.startSeconds);
  });
});

describe('serialising', () => {
  const cues: TimedCue[] = [
    { startSeconds: 1, endSeconds: 4.5, text: 'First line.' },
    { startSeconds: 4.5, endSeconds: 9.25, text: 'Second line.' },
  ];

  it('round-trips through WebVTT', () => {
    expect(parseCaptionFile(toWebVTT(cues))).toEqual(cues);
  });

  it('round-trips through SRT', () => {
    expect(parseCaptionFile(toSRT(cues))).toEqual(cues);
  });

  it('writes a WEBVTT header and an arrow per cue', () => {
    const out = toWebVTT(cues);
    expect(out.startsWith('WEBVTT')).toBe(true);
    expect(out.match(/-->/g)).toHaveLength(2);
  });

  it('writes SRT without a WEBVTT header and with comma decimals', () => {
    const out = toSRT(cues);
    expect(out).not.toContain('WEBVTT');
    expect(out).toContain('00:00:01,000 --> 00:00:04,500');
  });
});

describe('pipeline interop', () => {
  const cues: TimedCue[] = [
    { startSeconds: 3, endSeconds: 6, text: 'Welcome.' },
    { startSeconds: 3723, endSeconds: 3725, text: 'An hour in.' },
  ];

  it('renders the bracket transcript the rest of the pipeline reads', () => {
    expect(toBracketTranscript(cues)).toBe('[00:03] Welcome.\n\n[1:02:03] An hour in.');
  });

  it('narrows to pipeline cues', () => {
    expect(toCues(cues)).toEqual([
      { startSeconds: 3, text: 'Welcome.' },
      { startSeconds: 3723, text: 'An hour in.' },
    ]);
  });
});
