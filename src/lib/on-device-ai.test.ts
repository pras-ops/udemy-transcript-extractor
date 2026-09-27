import { describe, it, expect, afterEach } from 'vitest';
import {
  cleanFrameText,
  describeAvailability,
  downloadFraction,
  probeImageModel,
  readFrameText,
  startModelDownload,
  summarizeWithModel,
  READ_FRAME_PROMPT,
} from './on-device-ai';

describe('describeAvailability', () => {
  it('reports a ready model', () => {
    const probe = describeAvailability('available');
    expect(probe.status).toBe('available');
    expect(probe.ready).toBe(true);
  });

  it('separates "no API" from "API says no"', () => {
    // These call for different actions — update Chrome, versus the machine
    // does not meet the requirements — so they must not collapse together.
    expect(describeAvailability(null).status).toBe('unsupported');
    expect(describeAvailability('unavailable').status).toBe('unavailable');
  });

  it('treats a pending download as not ready', () => {
    for (const raw of ['downloadable', 'downloading']) {
      const probe = describeAvailability(raw);
      expect(probe.ready).toBe(false);
      expect(probe.detail.length).toBeGreaterThan(0);
    }
  });

  it('accepts the older vocabulary the API used to return', () => {
    // "readily" and "after-download" predate the current names.
    expect(describeAvailability('readily').status).toBe('available');
    expect(describeAvailability('after-download').status).toBe('downloadable');
    expect(describeAvailability('no').status).toBe('unavailable');
  });

  it('reports an unrecognised reply rather than guessing', () => {
    const probe = describeAvailability('something-new');
    expect(probe.ready).toBe(false);
    expect(probe.detail).toContain('something-new');
  });

  it('always explains itself', () => {
    for (const raw of [null, 'available', 'downloadable', 'downloading', 'unavailable', 'weird']) {
      expect(describeAvailability(raw).detail.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('probeImageModel', () => {
  const globals = globalThis as { LanguageModel?: unknown };

  afterEach(() => {
    delete globals.LanguageModel;
  });

  it('reports unsupported when the browser has no such API', async () => {
    expect((await probeImageModel()).status).toBe('unsupported');
  });

  it('reports unsupported when the global exists but is the wrong shape', async () => {
    globals.LanguageModel = {};
    expect((await probeImageModel()).status).toBe('unsupported');
  });

  it('asks about image input specifically', async () => {
    // A build can serve the text model and still refuse images; reporting
    // "available" on the text model alone would promise a feature that fails.
    let asked: unknown = null;
    globals.LanguageModel = {
      availability: async (options: unknown) => {
        asked = options;
        return 'available';
      },
    };

    await probeImageModel();
    expect(asked).toEqual({ expectedInputs: [{ type: 'image' }] });
  });

  it('passes the browser reply through', async () => {
    globals.LanguageModel = { availability: async () => 'downloadable' };
    expect((await probeImageModel()).status).toBe('downloadable');
  });

  it('survives the probe itself throwing', async () => {
    globals.LanguageModel = {
      availability: async () => {
        throw new Error('model capability is not available');
      },
    };
    const probe = await probeImageModel();
    expect(probe.status).toBe('error');
    expect(probe.ready).toBe(false);
    expect(probe.detail).toContain('model capability is not available');
  });

  it('never triggers a download on its own', async () => {
    // Only create() downloads the model. A diagnostic that quietly started a
    // 4 GB fetch would be a hostile thing to run on popup open.
    let created = false;
    globals.LanguageModel = {
      availability: async () => 'downloadable',
      create: async () => {
        created = true;
        return {};
      },
    };

    await probeImageModel();
    expect(created).toBe(false);
  });
});

describe('READ_FRAME_PROMPT', () => {
  it('constrains the model to transcription', () => {
    // A model asked to "describe this slide" explains the concept instead, and
    // an explanation the lecturer never gave lands in the student's notes
    // looking exactly like something that was taught.
    expect(READ_FRAME_PROMPT).toMatch(/verbatim/i);
    expect(READ_FRAME_PROMPT).toMatch(/do not explain/i);
    expect(READ_FRAME_PROMPT).toContain('NO TEXT');
  });
});

describe('cleanFrameText', () => {
  it('keeps transcribed text', () => {
    expect(cleanFrameText('  x = 5  ')).toBe('x = 5');
  });

  it('preserves indentation inside a multi-line read', () => {
    expect(cleanFrameText('def f():\n    return 1')).toBe('def f():\n    return 1');
  });

  it('unwraps a fenced block', () => {
    // The export writes its own fence; one nested in another renders as
    // neither.
    expect(cleanFrameText('```python\nprint(1)\n```')).toBe('print(1)');
    expect(cleanFrameText('```\nplain\n```')).toBe('plain');
  });

  it('returns null for an empty read', () => {
    expect(cleanFrameText('')).toBeNull();
    expect(cleanFrameText('   ')).toBeNull();
    expect(cleanFrameText('NO TEXT')).toBeNull();
    expect(cleanFrameText('no text')).toBeNull();
    expect(cleanFrameText('NO TEXT.')).toBeNull();
  });

  it('does not mistake real content that mentions the sentinel', () => {
    expect(cleanFrameText('NO TEXT was found in the config file')).not.toBeNull();
  });
});

describe('readFrameText', () => {
  const globals = globalThis as { LanguageModel?: unknown };
  const image = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

  afterEach(() => {
    delete globals.LanguageModel;
  });

  it('reports plainly when the browser cannot do it', async () => {
    const result = await readFrameText(image);
    expect(result.text).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('sends the prompt and the image together', async () => {
    let sent: { role: string; content: { type: string; value: unknown }[] }[] | undefined;
    globals.LanguageModel = {
      availability: async () => 'available',
      create: async () => ({
        prompt: async (input: typeof sent) => {
          sent = input;
          return 'x = 5';
        },
        destroy: () => undefined,
      }),
    };

    const result = await readFrameText(image);

    expect(result.text).toBe('x = 5');
    expect(sent?.[0].content.map((part) => part.type)).toEqual(['text', 'image']);
    expect(sent?.[0].content[1].value).toBe(image);
  });

  it('releases the session even when the read fails', async () => {
    // Sessions carry history, so one left open would leak the previous slide
    // into the next answer.
    let destroyed = false;
    globals.LanguageModel = {
      availability: async () => 'available',
      create: async () => ({
        prompt: async () => {
          throw new Error('inference failed');
        },
        destroy: () => {
          destroyed = true;
        },
      }),
    };

    const result = await readFrameText(image);
    expect(destroyed).toBe(true);
    expect(result.error).toContain('inference failed');
  });

  it('treats an empty reply as a frame with nothing on it', async () => {
    globals.LanguageModel = {
      availability: async () => 'available',
      create: async () => ({
        prompt: async () => 'NO TEXT',
        destroy: () => undefined,
      }),
    };

    const result = await readFrameText(image);
    expect(result.text).toBeNull();
    expect(result.error).toBeUndefined();
  });
});

describe('summarizeWithModel', () => {
  const globals = globalThis as { Summarizer?: unknown };

  afterEach(() => {
    delete globals.Summarizer;
  });

  it('reports plainly when the browser cannot summarise', async () => {
    const result = await summarizeWithModel('some text');
    expect(result.text).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns the summary', async () => {
    globals.Summarizer = {
      availability: async () => 'available',
      create: async () => ({
        summarize: async () => '  key points here  ',
        destroy: () => undefined,
      }),
    };

    expect((await summarizeWithModel('a lecture')).text).toBe('key points here');
  });

  it('measures before calling, and reports text that will not fit', async () => {
    // The per-prompt limit is about 750 words and a lecture is three thousand,
    // so this is the normal case, not an edge case.
    let summarized = false;
    globals.Summarizer = {
      availability: async () => 'available',
      create: async () => ({
        inputQuota: 1024,
        measureInputUsage: async () => 4000,
        summarize: async () => {
          summarized = true;
          return 'should not happen';
        },
        destroy: () => undefined,
      }),
    };

    const result = await summarizeWithModel('a very long lecture');
    expect(result.tooLong).toBe(true);
    expect(result.text).toBeNull();
    expect(summarized).toBe(false);
  });

  it('proceeds when the text fits', async () => {
    globals.Summarizer = {
      availability: async () => 'available',
      create: async () => ({
        inputQuota: 1024,
        measureInputUsage: async () => 200,
        summarize: async () => 'short summary',
        destroy: () => undefined,
      }),
    };

    const result = await summarizeWithModel('a chapter');
    expect(result.text).toBe('short summary');
    expect(result.tooLong).toBeUndefined();
  });

  it('treats a thrown quota error as too long, not as a failure', async () => {
    globals.Summarizer = {
      availability: async () => 'available',
      create: async () => ({
        summarize: async () => {
          throw new Error('QuotaExceededError: input too large');
        },
        destroy: () => undefined,
      }),
    };

    const result = await summarizeWithModel('a lecture');
    expect(result.tooLong).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('releases the session even when summarising throws', async () => {
    let destroyed = false;
    globals.Summarizer = {
      availability: async () => 'available',
      create: async () => ({
        summarize: async () => {
          throw new Error('inference failed');
        },
        destroy: () => {
          destroyed = true;
        },
      }),
    };

    await summarizeWithModel('a lecture');
    expect(destroyed).toBe(true);
  });

  it('does nothing for empty input', async () => {
    const result = await summarizeWithModel('   ');
    expect(result.text).toBeNull();
    expect(result.error).toBeUndefined();
  });
});

describe('downloadFraction', () => {
  it('computes a fraction from byte counts', () => {
    expect(downloadFraction({ loaded: 500, total: 1000 })).toBe(0.5);
  });

  it('accepts a value that is already a fraction', () => {
    // Newer Chrome builds report `loaded` normalised, with no `total`.
    expect(downloadFraction({ loaded: 0.25 })).toBe(0.25);
    expect(downloadFraction({ loaded: 0 })).toBe(0);
    expect(downloadFraction({ loaded: 1 })).toBe(1);
  });

  it('clamps a ratio that overshoots', () => {
    expect(downloadFraction({ loaded: 1200, total: 1000 })).toBe(1);
  });

  it('returns null rather than a wrong number', () => {
    // A byte count with no total is not a fraction of anything, and showing
    // "4000%" is worse than showing an indeterminate bar.
    expect(downloadFraction({ loaded: 4_000_000 })).toBeNull();
    expect(downloadFraction({})).toBeNull();
    expect(downloadFraction({ loaded: Number.NaN })).toBeNull();
    expect(downloadFraction({ loaded: 500, total: 0 })).toBeNull();
  });
});

describe('startModelDownload', () => {
  const globals = globalThis as { LanguageModel?: unknown };

  afterEach(() => {
    delete globals.LanguageModel;
  });

  it('reports unsupported when there is nothing to install', async () => {
    expect((await startModelDownload()).status).toBe('unsupported');
  });

  it('requests image support and reports progress', async () => {
    let asked: { expectedInputs?: unknown } | undefined;
    const seen: (number | null)[] = [];

    globals.LanguageModel = {
      availability: async () => 'downloadable',
      create: async (options: {
        expectedInputs?: unknown;
        monitor?: (m: { addEventListener: (t: string, l: (e: unknown) => void) => void }) => void;
      }) => {
        asked = options;
        options.monitor?.({
          addEventListener: (_type, listener) => {
            listener({ loaded: 0.5 });
            listener({ loaded: 1 });
          },
        });
        return { destroy: () => undefined };
      },
    };

    const result = await startModelDownload((fraction) => seen.push(fraction));

    expect(asked?.expectedInputs).toEqual([{ type: 'image' }]);
    expect(seen).toEqual([0.5, 1]);
    expect(result.status).toBe('available');
  });

  it('releases the session, since the point is the install not the session', async () => {
    let destroyed = false;
    globals.LanguageModel = {
      availability: async () => 'downloadable',
      create: async () => ({
        destroy: () => {
          destroyed = true;
        },
      }),
    };

    await startModelDownload();
    expect(destroyed).toBe(true);
  });

  it('tolerates a session with no destroy method', async () => {
    globals.LanguageModel = {
      availability: async () => 'downloadable',
      create: async () => ({}),
    };
    expect((await startModelDownload()).status).toBe('available');
  });

  it('reports a failed install rather than throwing', async () => {
    globals.LanguageModel = {
      availability: async () => 'downloadable',
      create: async () => {
        throw new Error('insufficient disk space');
      },
    };

    const result = await startModelDownload();
    expect(result.status).toBe('error');
    expect(result.detail).toContain('insufficient disk space');
    expect(result.ready).toBe(false);
  });
});
