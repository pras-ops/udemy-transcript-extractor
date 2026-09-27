/**
 * Defining sentences, a glossary, and cloze flashcards — with no model.
 *
 * This is deliberately the lightest feature in the extension: lexical-syntactic
 * patterns of the kind Hearst introduced, run over the transcript. No weights,
 * no loading, nothing to wait for. It is available the moment a transcript is.
 *
 * The reason it exists is that the learning-science evidence is unusually
 * one-sided. Across a meta-analysis of 242 studies, the two techniques that
 * actually move outcomes are practice testing and distributed practice —
 * retrieval beats re-reading at roughly g = 0.50. Summaries and highlights do
 * not rank. Generating a *question* needs a language model; generating a
 * *retrieval prompt* only needs a sentence with a hole in it.
 *
 * Every card is a sentence the lecturer actually said, keeping its timestamp,
 * so nothing here can invent content.
 */

import type { Cue } from './transcript';

export interface Definition {
  /** The thing being defined. */
  term: string;
  /** The full sentence it was defined in. */
  sentence: string;
  startSeconds: number | null;
  /** Which pattern matched, useful when tuning. */
  pattern: string;
}

export interface ClozeCard {
  /** The sentence with the term blanked out. */
  front: string;
  /** The term that fills the blank. */
  back: string;
  startSeconds: number | null;
  timestamp: string | null;
}

/* -------------------------------------------------------------------------- */
/* Patterns                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Definitional frames, each capturing the term in group 1.
 *
 * Ordered roughly by how reliably they signal a definition rather than a
 * passing mention. "X is a Y" is common but noisy; "X is defined as" is rare
 * and almost always a real definition.
 */
const PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'defined-as', regex: /\b([\w][\w\s-]{2,40}?)\s+is\s+defined\s+as\b/i },
  { name: 'refers-to', regex: /\b([\w][\w\s-]{2,40}?)\s+refers?\s+to\b/i },
  { name: 'means', regex: /\b([\w][\w\s-]{2,40}?)\s+means\b/i },
  { name: 'we-call', regex: /\bwe\s+call\s+(?:this|that|it)?\s*([\w][\w\s-]{2,40}?)\b/i },
  { name: 'is-called', regex: /\b([\w][\w\s-]{2,40}?)\s+is\s+called\b/i },
  { name: 'known-as', regex: /\b([\w][\w\s-]{2,40}?)\s+is\s+known\s+as\b/i },
  // The negative lookaheads matter: "the network is going to", "these are
  // about to" and similar are narration, not definitions, but they match the
  // bare frame and yield a plausible-looking term.
  { name: 'is-a', regex: /\b([\w][\w\s-]{2,40}?)\s+is\s+(?!going\b|about\b|able\b)(?:a|an|the)\s+\w+/i },
  { name: 'are', regex: /\b([\w][\w\s-]{2,40}?)\s+are\s+(?!going\b|about\b|able\b|just\b)(?:the\s+)?\w+/i },
];

/**
 * Words that cannot begin a term.
 *
 * Without this, "the idea is a good one" yields the term "the idea", and
 * pronoun subjects ("it is a function") yield terms that mean nothing on a
 * flashcard.
 */
const BAD_TERM_STARTS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'they', 'we', 'you',
  'i', 'he', 'she', 'there', 'here', 'what', 'which', 'who', 'and', 'but', 'so',
  'if', 'when', 'then', 'because', 'now', 'ok', 'okay', 'right', 'well', 'one',
  'something', 'anything', 'everything', 'nothing', 'someone', 'everyone',
  'all', 'both', 'each', 'every', 'some', 'any', 'no', 'not',
]);

/** Terms that are grammatically fine but useless as a card. */
const BAD_TERM_WHOLE = new Set([
  'idea', 'thing', 'way', 'point', 'part', 'example', 'problem', 'question',
  'answer', 'reason', 'result', 'case', 'time', 'course', 'video', 'lecture',
  'section', 'chapter', 'step', 'thought', 'goal', 'purpose',
]);

/** Tidy a captured term, or reject it. */
function cleanTerm(raw: string): string | null {
  let term = raw.trim().toLowerCase().replace(/\s+/g, ' ');

  // Drop filler from both ends. Trimming only the front left terms like
  // "thing we", which are grammatically fine and useless on a card.
  let words = term.split(' ');
  while (words.length > 0 && BAD_TERM_STARTS.has(words[0])) words = words.slice(1);
  while (words.length > 0 && BAD_TERM_STARTS.has(words[words.length - 1])) words = words.slice(0, -1);
  // A term running past four words is a clause, not a concept.
  if (words.length === 0 || words.length > 4) return null;

  term = words.join(' ');
  if (term.length < 3) return null;
  if (BAD_TERM_WHOLE.has(term)) return null;
  if (!/^[\p{L}][\p{L}\p{N}\s-]*$/u.test(term)) return null;

  return term;
}

/* -------------------------------------------------------------------------- */
/* Extraction                                                                  */
/* -------------------------------------------------------------------------- */

export interface DefinitionOptions {
  /** Ignore sentences shorter than this many characters. */
  minSentenceLength?: number;
  /** Ignore sentences longer than this; long ones make unreadable cards. */
  maxSentenceLength?: number;
  /** Cap on results. */
  maxDefinitions?: number;
}

export const DEFAULT_DEFINITION_OPTIONS: Required<DefinitionOptions> = {
  minSentenceLength: 25,
  maxSentenceLength: 240,
  maxDefinitions: 40,
};

/**
 * Find sentences that define something.
 *
 * Works from cues rather than raw text so every result keeps the timestamp it
 * came from — a card you cannot trace back to the lecture is not much use when
 * the answer does not make sense.
 */
export function extractDefinitions(
  cues: Cue[],
  options: DefinitionOptions = {},
): Definition[] {
  const opts = { ...DEFAULT_DEFINITION_OPTIONS, ...options };
  const found: Definition[] = [];
  const seenTerms = new Set<string>();

  // Cues are fragments of speech; join them so sentences are not cut in half,
  // while remembering which cue each sentence started in.
  for (const { sentence, startSeconds } of sentencesFromCues(cues)) {
    if (sentence.length < opts.minSentenceLength) continue;
    if (sentence.length > opts.maxSentenceLength) continue;

    for (const { name, regex } of PATTERNS) {
      const match = regex.exec(sentence);
      if (!match) continue;

      const term = cleanTerm(match[1]);
      if (!term || seenTerms.has(term)) continue;

      seenTerms.add(term);
      found.push({ term, sentence, startSeconds, pattern: name });
      break;
    }

    if (found.length >= opts.maxDefinitions) break;
  }

  return found;
}

/**
 * Reassemble sentences from caption cues.
 *
 * Captions break mid-sentence, so pattern matching on individual cues misses
 * most definitions. Each rebuilt sentence carries the timestamp of the cue it
 * began in.
 */
export function sentencesFromCues(
  cues: Cue[],
): { sentence: string; startSeconds: number | null }[] {
  const out: { sentence: string; startSeconds: number | null }[] = [];
  let buffer = '';
  let startSeconds: number | null = null;

  const flush = () => {
    const sentence = buffer.trim().replace(/\s+/g, ' ');
    if (sentence) out.push({ sentence, startSeconds });
    buffer = '';
    startSeconds = null;
  };

  for (const cue of cues) {
    if (buffer === '') startSeconds = cue.startSeconds;
    buffer += (buffer ? ' ' : '') + cue.text;

    // Split on sentence enders, keeping any trailing fragment for the next cue.
    const parts = buffer.split(/(?<=[.!?])\s+/);
    if (parts.length > 1) {
      const trailing = parts.pop() ?? '';
      for (const part of parts) {
        buffer = part;
        flush();
      }
      buffer = trailing;
      startSeconds = cue.startSeconds;
    }
  }
  flush();

  return out;
}

/* -------------------------------------------------------------------------- */
/* Cloze cards                                                                 */
/* -------------------------------------------------------------------------- */

function formatStamp(seconds: number | null): string | null {
  if (seconds === null) return null;
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/**
 * Turn a definition into a retrieval prompt.
 *
 * The term is replaced with a blank so the learner has to produce it. That
 * act of retrieval is the part the evidence supports; recognising the sentence
 * again would not be.
 */
export function toClozeCard(definition: Definition): ClozeCard | null {
  // Match the term case-insensitively but only on a word boundary, so "rate"
  // does not blank the middle of "generated".
  const escaped = definition.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  if (!regex.test(definition.sentence)) return null;

  const front = definition.sentence.replace(regex, '_____');
  // If blanking removed everything meaningful there is no question left.
  if (front.replace(/_____/g, '').trim().length < 15) return null;

  return {
    front,
    back: definition.term,
    startSeconds: definition.startSeconds,
    timestamp: formatStamp(definition.startSeconds),
  };
}

/** Cards for every definition that can produce one. */
export function buildClozeCards(definitions: Definition[]): ClozeCard[] {
  return definitions
    .map(toClozeCard)
    .filter((card): card is ClozeCard => card !== null);
}
