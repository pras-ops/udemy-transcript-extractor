import { describe, it, expect } from 'vitest';
import {
  cropRectFor,
  classifyFrame,
  cueIndexForTime,
  frameFilename,
  planFrameExport,
  type CapturedFrame,
} from './frame-capture';

/** Build an RGBA buffer big enough that the sampler takes several samples. */
function frame(luma: (pixelIndex: number) => number, pixels = 400): Uint8ClampedArray {
  const data = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < pixels; i += 1) {
    const value = luma(i);
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  return data;
}

describe('cropRectFor', () => {
  const bitmap = { width: 1000, height: 1000 };

  it('scales by the device pixel ratio', () => {
    // The detail most implementations get wrong: a 100x50 CSS-pixel video on a
    // 2x display is 200x100 in the captured bitmap.
    expect(cropRectFor({ x: 10, y: 20, width: 100, height: 50 }, 2, bitmap)).toEqual({
      x: 20,
      y: 40,
      width: 200,
      height: 100,
    });
  });

  it('passes through at 1x', () => {
    expect(cropRectFor({ x: 10, y: 20, width: 100, height: 50 }, 1, bitmap)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    });
  });

  it('clamps a video that hangs off the right edge', () => {
    const crop = cropRectFor({ x: 900, y: 0, width: 200, height: 100 }, 1, bitmap);
    expect(crop).toEqual({ x: 900, y: 0, width: 100, height: 100 });
  });

  it('clamps a video scrolled partly above the viewport', () => {
    const crop = cropRectFor({ x: -50, y: -30, width: 100, height: 100 }, 1, bitmap);
    expect(crop).toEqual({ x: 0, y: 0, width: 50, height: 70 });
  });

  it('returns null when nothing is visible', () => {
    expect(cropRectFor({ x: 1100, y: 0, width: 100, height: 100 }, 1, bitmap)).toBeNull();
    expect(cropRectFor({ x: 0, y: 0, width: 100, height: 0 }, 1, bitmap)).toBeNull();
  });

  it('treats a missing or nonsensical pixel ratio as 1', () => {
    const expected = { x: 0, y: 0, width: 100, height: 50 };
    expect(cropRectFor({ x: 0, y: 0, width: 100, height: 50 }, 0, bitmap)).toEqual(expected);
    expect(cropRectFor({ x: 0, y: 0, width: 100, height: 50 }, -2, bitmap)).toEqual(expected);
  });
});

describe('classifyFrame', () => {
  it('reports a uniformly black frame as DRM-protected', () => {
    const result = classifyFrame(frame(() => 0));
    expect(result.verdict).toBe('protected');
    expect(result.reason).toMatch(/DRM/);
  });

  it('reports a flat non-black frame as still loading', () => {
    const result = classifyFrame(frame(() => 128));
    expect(result.verdict).toBe('blank');
    expect(result.reason).toMatch(/loading/);
  });

  it('accepts a frame with visible content', () => {
    expect(classifyFrame(frame((i) => (i % 2 === 0 ? 255 : 0))).verdict).toBe('ok');
  });

  it('accepts a dark frame that still has content', () => {
    // The case that matters most here: programming courses are taught in dark
    // editor themes, and a dark screenshot must not be mistaken for a blanked
    // one. Darkness alone is not the signal — flatness is.
    const darkEditor = frame((i) => (i % 7 === 0 ? 200 : 20));
    expect(classifyFrame(darkEditor).verdict).toBe('ok');
  });

  it('handles an empty capture', () => {
    expect(classifyFrame(new Uint8ClampedArray(0)).verdict).toBe('blank');
  });
});

describe('cueIndexForTime', () => {
  const cues = [{ startSeconds: 0 }, { startSeconds: 10 }, { startSeconds: 20 }];

  it('attaches a frame to the line being spoken, not the nearest line', () => {
    // At 15s the lecturer is still on the cue that began at 10s. Nearest-by-
    // distance would attach it to the 20s cue, which had not happened yet.
    expect(cueIndexForTime(cues, 15)).toBe(1);
  });

  it('handles the boundaries', () => {
    expect(cueIndexForTime(cues, 0)).toBe(0);
    expect(cueIndexForTime(cues, 20)).toBe(2);
    expect(cueIndexForTime(cues, 999)).toBe(2);
  });

  it('returns -1 for a frame that precedes every cue', () => {
    expect(cueIndexForTime([{ startSeconds: 5 }], 1)).toBe(-1);
  });

  it('skips cues with no timestamp', () => {
    expect(cueIndexForTime([{ startSeconds: null }, { startSeconds: 10 }], 15)).toBe(1);
  });

  it('handles an empty transcript', () => {
    expect(cueIndexForTime([], 5)).toBe(-1);
  });
});

describe('frameFilename', () => {
  it('is zero-padded so files sort chronologically', () => {
    expect(frameFilename(0)).toBe('frame-000000.png');
    expect(frameFilename(65)).toBe('frame-000105.png');
    expect(frameFilename(3725)).toBe('frame-010205.png');
  });

  it('survives nonsense input', () => {
    expect(frameFilename(-5)).toBe('frame-000000.png');
    expect(frameFilename(Number.NaN)).toBe('frame-000000.png');
  });
});

describe('planFrameExport', () => {
  const capture = (seconds: number, lectureId = 'l1'): CapturedFrame => ({
    lectureId,
    seconds,
    dataUrl: 'data:image/png;base64,AAAA',
    capturedAt: 1,
  });

  const doc = [
    '# Gradient Descent',
    '',
    '**Saved:** today',
    '',
    '**[00:03]** first paragraph',
    '',
    '**[00:20]** second paragraph',
    '',
  ].join('\n');

  it('places a frame after the paragraph it illustrates', () => {
    const { markdown } = planFrameExport(doc, [capture(25)]);
    expect(markdown).toContain(
      '**[00:20]** second paragraph\n\n![Frame at 00:25](images/frame-000025.png)',
    );
  });

  it('does not run ahead of the paragraph being spoken', () => {
    // At 10s the lecturer is still on the 00:03 paragraph.
    const { markdown } = planFrameExport(doc, [capture(10)]);
    expect(markdown).toContain(
      '**[00:03]** first paragraph\n\n![Frame at 00:10](images/frame-000010.png)',
    );
  });

  it('keeps a frame captured before the first paragraph', () => {
    const { markdown } = planFrameExport(doc, [capture(1)]);
    expect(markdown.startsWith('![Frame at 00:01](images/frame-000001.png)')).toBe(true);
  });

  it('understands hour-long timestamps', () => {
    const long = '**[00:30]** early\n\n**[1:02:05]** late';
    const { markdown } = planFrameExport(long, [capture(3730)]);
    expect(markdown).toContain('**[1:02:05]** late\n\n![Frame at 1:02:10](images/frame-010210.png)');
  });

  it('appends frames under a heading when the document has no timestamps', () => {
    // Timestamps can be switched off. Dropping the frames silently would lose
    // work the user deliberately did.
    const plain = '# Title\n\njust prose, no markers\n';
    const { markdown } = planFrameExport(plain, [capture(5)]);
    expect(markdown).toContain('## Screenshots');
    expect(markdown).toContain('images/frame-000005.png');
  });

  it('leaves a document with no frames untouched', () => {
    expect(planFrameExport(doc, [])).toEqual({ markdown: doc, files: [] });
  });

  it('orders several frames chronologically regardless of capture order', () => {
    const { markdown } = planFrameExport(doc, [capture(25), capture(5)]);
    expect(markdown.indexOf('frame-000005.png')).toBeLessThan(markdown.indexOf('frame-000025.png'));
  });

  it('references files rather than embedding image data', () => {
    const { markdown } = planFrameExport(doc, [capture(25)]);
    expect(markdown).not.toContain('data:image');
  });

  it('puts text read off the frame under the image', () => {
    // The point of reading a frame: an image is opaque to search and to any
    // model this document is pasted into; the same content as text is not.
    const read: CapturedFrame = { ...capture(25), readout: 'def f():\n    return 1' };
    const { markdown } = planFrameExport(doc, [read]);

    expect(markdown).toContain('*On screen:*');
    expect(markdown).toContain('```\ndef f():\n    return 1\n```');
    // Indentation has to survive, or transcribed code is useless.
    expect(markdown).toContain('    return 1');
  });

  it('writes only the image when a frame has not been read', () => {
    const { markdown } = planFrameExport(doc, [capture(25)]);
    expect(markdown).not.toContain('*On screen:*');
  });

  it('writes only the image when a frame had nothing legible on it', () => {
    // An empty string means read-and-found-nothing, which is a finished
    // answer, not pending work.
    const blank: CapturedFrame = { ...capture(25), readout: '' };
    const { markdown } = planFrameExport(doc, [blank]);
    expect(markdown).not.toContain('*On screen:*');
  });

  it('carries transcribed text without images, for the clipboard', () => {
    // A clipboard cannot hold files, and a link to images/frame-000025.png in
    // a pasted document points at nothing. The text is the part that travels.
    const read: CapturedFrame = { ...capture(25), readout: 'z = w1x1 + w2x2 + b' };
    const { markdown, files } = planFrameExport(doc, [read], { includeImages: false });

    expect(markdown).toContain('z = w1x1 + w2x2 + b');
    expect(markdown).not.toContain('![Frame');
    expect(markdown).not.toContain('images/');
    expect(files).toEqual([]);
  });

  it('adds nothing for an unread frame when images are off', () => {
    // No image and no text is not worth a heading.
    const { markdown } = planFrameExport(doc, [capture(25)], { includeImages: false });
    expect(markdown).toBe(doc);
  });

  it('adds nothing when a timestamp-free document has only unread frames', () => {
    const plain = '# Title\n\nno markers here\n';
    const { markdown } = planFrameExport(plain, [capture(5)], { includeImages: false });
    expect(markdown).toBe(plain);
    expect(markdown).not.toContain('## Screenshots');
  });

  it('reports archive paths that match the references it wrote', () => {
    // The bug this prevents: the document and the archive computed paths
    // separately and disagreed, so every image in the export was broken.
    const { markdown, files } = planFrameExport(doc, [capture(25), capture(5)]);
    expect(files).toHaveLength(2);
    for (const file of files) {
      expect(markdown).toContain(`](${file.path})`);
    }
  });
});

describe('planFrameExport across a course', () => {
  const capture = (seconds: number, lectureId: string): CapturedFrame => ({
    lectureId,
    seconds,
    dataUrl: 'data:image/png;base64,AAAA',
    capturedAt: 1,
  });

  const lectures = [{ id: 'a' }, { id: 'b' }];

  const singleLectureDoc = '**[00:05]** only paragraph';

  const courseDoc = [
    '# ML 101',
    '',
    '## 1. Intro',
    '',
    '**[00:05]** intro paragraph',
    '',
    '## 2. Descent',
    '',
    '**[00:05]** descent paragraph',
    '',
  ].join('\n');

  it('anchors each frame inside its own lecture', () => {
    // Timestamps restart at zero in every video, so both sections contain a
    // 00:05 marker. Anchoring on the timestamp alone would put lecture B's
    // screenshot under lecture A.
    const { markdown } = planFrameExport(courseDoc, [capture(8, 'b')], { lectures });
    const imageAt = markdown.indexOf('![Frame at 00:08]');
    expect(imageAt).toBeGreaterThan(markdown.indexOf('## 2. Descent'));
  });

  it('gives each lecture its own image folder so filenames cannot collide', () => {
    // Both lectures have a frame at exactly 00:08.
    const { files } = planFrameExport(
      courseDoc,
      [capture(8, 'a'), capture(8, 'b')],
      { lectures },
    );
    const paths = files.map((f) => f.path);
    expect(new Set(paths).size).toBe(2);
    expect(paths).toContain('images/lecture-01/frame-000008.png');
    expect(paths).toContain('images/lecture-02/frame-000008.png');
  });

  it('drops frames from lectures this export does not cover', () => {
    // Otherwise the document references a section that is not in it.
    const { markdown, files } = planFrameExport(courseDoc, [capture(8, 'elsewhere')], {
      lectures,
    });
    expect(files).toEqual([]);
    expect(markdown).not.toContain('![Frame');
  });

  it('keeps a flat image folder for a single-lecture export', () => {
    const { files } = planFrameExport(singleLectureDoc, [capture(8, 'a')], {
      lectures: [{ id: 'a' }],
    });
    expect(files[0].path).toBe('images/frame-000008.png');
  });
});
