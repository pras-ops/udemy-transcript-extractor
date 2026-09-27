/**
 * Whether this browser can read a screenshot on its own.
 *
 * Chrome ships Gemini Nano with the browser and exposes it to extensions
 * through `LanguageModel`, with no origin trial token and no bytes added to
 * this package. That makes it the only route to understanding a captured
 * frame that does not violate what this extension is: nothing downloaded by
 * us, nothing sent anywhere, no runtime bundled in.
 *
 * The catch is that it is not there for everyone. Image input needs a recent
 * Chrome, and the model itself needs roughly 22 GB of free disk and either
 * >4 GB of VRAM or a 4-core CPU with 16 GB RAM. So the capability is probed
 * rather than assumed, and anything built on it has to be an enhancement that
 * is simply absent on machines that do not qualify.
 *
 * Probing is free: `availability()` reports status without triggering the
 * ~4 GB download. Only `create()` does that, which is why nothing here calls
 * it — a diagnostic must never start a multi-gigabyte download on its own.
 */

/** Status as this extension reports it, normalised from the browser's reply. */
export type AiStatus =
  /** Ready to use right now. */
  | 'available'
  /** Supported, but Chrome must fetch the model first. */
  | 'downloadable'
  /** Chrome is fetching the model now. */
  | 'downloading'
  /** The API exists but this machine or build does not qualify. */
  | 'unavailable'
  /** No `LanguageModel` at all — Chrome too old, or the API is not enabled. */
  | 'unsupported'
  /** The probe itself failed. */
  | 'error';

export interface AiProbe {
  status: AiStatus;
  /** One line, written for the person reading it rather than for a log. */
  detail: string;
  /** True when a screenshot could be read without any further setup. */
  ready: boolean;
}

/**
 * Turn the browser's raw reply into something reportable.
 *
 * Split out from the call so the mapping — including replies this code has
 * never seen — is testable without a browser that has the model.
 *
 * `null` means the API was absent, which is different from the API saying
 * "unavailable": one is an old Chrome, the other is a machine that does not
 * meet the requirements, and the user can act on only one of them.
 */
export function describeAvailability(raw: string | null): AiProbe {
  if (raw === null) {
    return {
      status: 'unsupported',
      detail:
        'This Chrome has no on-device model API. Reading text out of screenshots needs Chrome 148 or newer.',
      ready: false,
    };
  }

  switch (raw) {
    case 'available':
    case 'readily':
      return {
        status: 'available',
        detail: 'On-device AI is ready. Screenshots can be read without leaving your machine.',
        ready: true,
      };

    case 'downloadable':
    case 'after-download':
      return {
        status: 'downloadable',
        detail:
          'On-device AI is supported, but Chrome has not downloaded the model yet (about 4 GB).',
        ready: false,
      };

    case 'downloading':
      return {
        status: 'downloading',
        detail: 'Chrome is downloading the on-device model. This will work once it finishes.',
        ready: false,
      };

    case 'unavailable':
    case 'no':
      return {
        status: 'unavailable',
        detail:
          'On-device AI is not available here. It needs about 22 GB free disk and either 4 GB of VRAM or a 4-core CPU with 16 GB RAM.',
        ready: false,
      };

    default:
      // The API is young and the vocabulary has already changed once
      // ("readily" became "available"). An unrecognised reply is reported as
      // itself rather than guessed at.
      return {
        status: 'unavailable',
        detail: `On-device AI reported an unrecognised state: "${raw}".`,
        ready: false,
      };
  }
}

/**
 * Progress as a 0..1 fraction, or null when it cannot be known.
 *
 * The event has been reported two ways across Chrome versions: as `loaded`
 * and `total` byte counts, and as `loaded` already normalised to 0..1. Both
 * are handled, and anything else returns null so the UI shows an
 * indeterminate bar rather than a wrong number.
 */
export function downloadFraction(event: { loaded?: number; total?: number }): number | null {
  const loaded = typeof event.loaded === 'number' ? event.loaded : null;
  if (loaded === null || Number.isNaN(loaded)) return null;

  const total = typeof event.total === 'number' ? event.total : null;
  if (total !== null && total > 0) {
    return Math.min(1, Math.max(0, loaded / total));
  }

  // Already a fraction.
  if (loaded >= 0 && loaded <= 1) return loaded;

  // A byte count with no total is not a fraction of anything.
  return null;
}

interface DownloadMonitor {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: { loaded?: number; total?: number }) => void,
  ): void;
}

interface PromptPart {
  type: 'text' | 'image';
  value: unknown;
}

interface LanguageModelSession {
  destroy?(): void;
  prompt?(input: { role: string; content: PromptPart[] }[]): Promise<string>;
}

/**
 * What the model is asked to do with a lecture screenshot.
 *
 * Written to constrain rather than invite. A language model asked to "describe
 * this slide" will happily explain the concept, and an explanation that the
 * lecturer never gave is worse than no text at all — it arrives in the
 * student's notes indistinguishable from what was actually taught.
 *
 * So: transcribe, do not interpret. The sentinel gives the model a way to say
 * "nothing here" that does not require inventing something.
 */
export const READ_FRAME_PROMPT = [
  'Transcribe exactly what is visible in this screenshot from a video lecture.',
  '',
  'Rules:',
  '- Copy any text or code verbatim, keeping line breaks and indentation.',
  '- If the screen shows code, output the code and nothing else.',
  '- If it shows a diagram or handwritten notes, list the labels and the',
  '  relationships drawn between them.',
  '- Do not explain, summarise, define, or add anything that is not visible.',
  '- If there is no legible text, reply with exactly: NO TEXT',
].join('\n');

/** The model's way of saying a frame had nothing readable on it. */
const EMPTY_SENTINEL = 'NO TEXT';

/**
 * Tidy a model reply into something worth storing.
 *
 * Returns null for an empty read, so callers distinguish "nothing on screen"
 * from "not read yet" — one is a finished answer, the other is work pending.
 *
 * Fenced blocks are unwrapped: the export decides its own formatting, and a
 * fence nested inside a fence renders as neither.
 */
export function cleanFrameText(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;

  const fence = /^```[\w-]*\n([\s\S]*?)\n?```$/;
  const match = fence.exec(text);
  if (match) text = match[1].trim();

  if (!text || text.toUpperCase() === EMPTY_SENTINEL) return null;
  // A reply that only says the sentinel plus punctuation is still empty.
  if (text.toUpperCase().replace(/[^A-Z ]/g, '').trim() === EMPTY_SENTINEL) return null;

  return text;
}

interface LanguageModelApi {
  availability(options?: { expectedInputs?: { type: string }[] }): Promise<string>;
  create?(options?: {
    expectedInputs?: { type: string }[];
    monitor?: (monitor: DownloadMonitor) => void;
  }): Promise<LanguageModelSession>;
}

/** The global, when this browser has it. */
function languageModel(): LanguageModelApi | null {
  const candidate = (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel;
  return candidate && typeof candidate.availability === 'function' ? candidate : null;
}

/**
 * Ask whether this browser could read an image.
 *
 * Image input is requested explicitly: a build can have the text model and
 * still refuse images, and reporting "available" on that basis would promise
 * a feature that then fails.
 */
export async function probeImageModel(): Promise<AiProbe> {
  const model = languageModel();
  if (!model) return describeAvailability(null);

  try {
    const raw = await model.availability({ expectedInputs: [{ type: 'image' }] });
    return describeAvailability(raw);
  } catch (error) {
    return {
      status: 'error',
      detail:
        error instanceof Error
          ? `Could not check on-device AI: ${error.message}`
          : 'Could not check on-device AI.',
      ready: false,
    };
  }
}

export interface FrameReadResult {
  /** Transcribed text, or null when the frame had nothing legible on it. */
  text: string | null;
  /** Set when the read could not be attempted or failed. */
  error?: string;
}

/**
 * Read the text off a captured frame, on this machine.
 *
 * A screenshot is opaque: search cannot see inside it, and neither can any
 * model the transcript is later pasted into. Turning it into text is what
 * makes the code on a slide part of the notes rather than a picture of them.
 *
 * A fresh session per frame is deliberate. Sessions carry conversation
 * history, so reusing one lets the previous slide's contents bleed into the
 * next answer — which on a lecture deck of similar-looking slides produces
 * confident text that was never on screen.
 */
export async function readFrameText(image: Blob): Promise<FrameReadResult> {
  const model = languageModel();
  if (!model || typeof model.create !== 'function') {
    return { text: null, error: 'On-device AI is not available in this browser.' };
  }

  let session: LanguageModelSession | null = null;
  try {
    session = await model.create({ expectedInputs: [{ type: 'image' }] });
    if (typeof session.prompt !== 'function') {
      return { text: null, error: 'This browser cannot prompt the on-device model.' };
    }

    const reply = await session.prompt([
      {
        role: 'user',
        content: [
          { type: 'text', value: READ_FRAME_PROMPT },
          { type: 'image', value: image },
        ],
      },
    ]);

    return { text: cleanFrameText(reply) };
  } catch (error) {
    return {
      text: null,
      error: error instanceof Error ? error.message : 'The screenshot could not be read.',
    };
  } finally {
    session?.destroy?.();
  }
}

/* -------------------------------------------------------------------------- */
/* Summarising                                                                 */
/* -------------------------------------------------------------------------- */

interface SummarizerSession {
  destroy?(): void;
  summarize?(text: string): Promise<string>;
  measureInputUsage?(text: string): Promise<number>;
  inputQuota?: number;
}

interface SummarizerApi {
  availability(options?: Record<string, unknown>): Promise<string>;
  create?(options?: Record<string, unknown>): Promise<SummarizerSession>;
}

function summarizerApi(): SummarizerApi | null {
  const candidate = (globalThis as { Summarizer?: SummarizerApi }).Summarizer;
  return candidate && typeof candidate.availability === 'function' ? candidate : null;
}

/** Whether Chrome can write a summary here. Probing downloads nothing. */
export async function probeSummarizer(): Promise<AiProbe> {
  const api = summarizerApi();
  if (!api) return describeAvailability(null);

  try {
    return describeAvailability(await api.availability());
  } catch (error) {
    return {
      status: 'error',
      detail:
        error instanceof Error
          ? `Could not check the summarizer: ${error.message}`
          : 'Could not check the summarizer.',
      ready: false,
    };
  }
}

export interface ModelSummary {
  text: string | null;
  /** Set when the text did not fit; the caller should summarise smaller parts. */
  tooLong?: boolean;
  error?: string;
}

/**
 * Write a summary with Chrome's on-device summarizer.
 *
 * The purpose-built API rather than a general prompt: it takes `type` and
 * `length` directly and does not need a hand-written instruction that the
 * model may or may not follow.
 *
 * The quota check is not optional. The per-prompt limit is around 1024 tokens
 * — roughly 750 words, where one lecture runs to three thousand — so passing a
 * whole transcript throws `QuotaExceededError`. Measuring first turns that
 * into `tooLong`, which the caller answers by summarising chapters separately
 * and then summarising those summaries.
 */
export async function summarizeWithModel(
  text: string,
  options: { type?: 'key-points' | 'tldr' | 'teaser' | 'headline'; length?: 'short' | 'medium' | 'long' } = {},
): Promise<ModelSummary> {
  // Nothing to summarise is an answer, not a capability problem — so it is
  // settled before asking whether the browser could have done it.
  const trimmed = text.trim();
  if (!trimmed) return { text: null };

  const api = summarizerApi();
  if (!api || typeof api.create !== 'function') {
    return { text: null, error: 'On-device summarising is not available in this browser.' };
  }

  let session: SummarizerSession | null = null;
  try {
    session = await api.create({
      type: options.type ?? 'key-points',
      format: 'plain-text',
      length: options.length ?? 'short',
    });

    if (typeof session.summarize !== 'function') {
      return { text: null, error: 'This browser cannot run the summarizer.' };
    }

    // Measure before calling, rather than calling and catching: a thrown
    // quota error gives no hint how far over the limit the text was.
    if (typeof session.measureInputUsage === 'function' && typeof session.inputQuota === 'number') {
      const usage = await session.measureInputUsage(trimmed);
      if (usage > session.inputQuota) return { text: null, tooLong: true };
    }

    const summary = (await session.summarize(trimmed)).trim();
    return { text: summary || null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Belt and braces: some builds throw rather than reporting a quota.
    if (/quota/i.test(message)) return { text: null, tooLong: true };
    return { text: null, error: `The summary could not be written: ${message}` };
  } finally {
    session?.destroy?.();
  }
}

/**
 * Ask Chrome to install the model, and report progress while it does.
 *
 * This is the only call here that downloads anything, and it exists as a
 * separate, explicitly invoked function for that reason. Chrome will not fetch
 * the model on its own: `chrome://on-device-internals` sits at "Pending Usage"
 * with every asset at 0% until something calls `create()`. Probing forever
 * would report "downloading" and nothing would ever happen.
 *
 * Roughly 4 GB crosses the network, so this must never run without the user
 * having asked for it in as many words.
 *
 * The session is destroyed immediately. The point is the installation, not the
 * session, and holding one open pins the model in memory for no reason.
 */
export async function startModelDownload(
  onProgress?: (fraction: number | null) => void,
): Promise<AiProbe> {
  const model = languageModel();
  if (!model || typeof model.create !== 'function') return describeAvailability(null);

  try {
    const session = await model.create({
      expectedInputs: [{ type: 'image' }],
      monitor: (monitor) => {
        monitor.addEventListener('downloadprogress', (event) => {
          onProgress?.(downloadFraction(event));
        });
      },
    });

    session?.destroy?.();
    return describeAvailability('available');
  } catch (error) {
    return {
      status: 'error',
      detail:
        error instanceof Error
          ? `The model could not be installed: ${error.message}`
          : 'The model could not be installed.',
      ready: false,
    };
  }
}
