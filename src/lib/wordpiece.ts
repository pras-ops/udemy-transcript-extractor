/**
 * WordPiece tokenizer — the BERT/BGE pipeline, in plain TypeScript.
 *
 * This exists so the extension can embed text without shipping an inference
 * runtime. The static embedding model is a lookup table keyed by token id, so
 * the tokenizer is the only piece of real logic between raw text and a vector.
 *
 * It reproduces three stages, in order:
 *
 *   1. BertNormalizer  — clean control characters, optionally space out CJK,
 *                        strip accents, lowercase.
 *   2. BertPreTokenizer — split on whitespace, then split punctuation out into
 *                        its own tokens.
 *   3. WordPiece        — greedy longest-match-first within each word, with a
 *                        `##` prefix on continuations and an [UNK] fallback.
 *
 * Getting casing wrong here is not a subtle bug: the vocabulary is
 * lowercase-only, so skipping stage 1 sends nearly every word to [UNK] and
 * yields embeddings that look fine and mean nothing.
 */

export interface TokenizerConfig {
  /** Token strings in id order. */
  vocab: string[];
  unkToken: string;
  continuingPrefix: string;
  maxInputCharsPerWord: number;
  lowercase: boolean;
  stripAccents: boolean;
  handleChineseChars: boolean;
}

/* -------------------------------------------------------------------------- */
/* Character classes                                                           */
/* -------------------------------------------------------------------------- */

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || /\p{Zs}/u.test(ch);
}

function isControl(ch: string): boolean {
  if (ch === '\t' || ch === '\n' || ch === '\r') return false;
  return /\p{C}/u.test(ch);
}

/**
 * BERT's notion of punctuation: the four ASCII ranges plus anything Unicode
 * classifies as `P*`.
 *
 * Note the ASCII ranges cover characters Unicode calls *symbols* — `$` (36),
 * `+` (43), `<` (60) — so those do split, even though `\p{P}` alone would not
 * match them. Non-ASCII symbols such as × or € are not covered by either rule
 * and stay attached to their word. This asymmetry is inherited from the
 * reference implementation; changing it would move token boundaries away from
 * the ones the vocabulary was built against.
 */
function isPunctuation(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  if (
    (cp >= 33 && cp <= 47) ||
    (cp >= 58 && cp <= 64) ||
    (cp >= 91 && cp <= 96) ||
    (cp >= 123 && cp <= 126)
  ) {
    return true;
  }
  return /\p{P}/u.test(ch);
}

const CJK_RANGES: [number, number][] = [
  [0x4e00, 0x9fff],
  [0x3400, 0x4dbf],
  [0x20000, 0x2a6df],
  [0x2a700, 0x2b73f],
  [0x2b740, 0x2b81f],
  [0x2b820, 0x2ceaf],
  [0xf900, 0xfaff],
  [0x2f800, 0x2fa1f],
];

function isCJK(cp: number): boolean {
  return CJK_RANGES.some(([low, high]) => cp >= low && cp <= high);
}

/* -------------------------------------------------------------------------- */
/* Stage 1 — normalisation                                                     */
/* -------------------------------------------------------------------------- */

export function normalizeText(text: string, config: TokenizerConfig): string {
  let out = '';

  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    // The replacement character and control codes are dropped outright.
    if (cp === 0 || cp === 0xfffd || isControl(ch)) continue;

    if (isWhitespace(ch)) {
      out += ' ';
      continue;
    }

    // Each CJK character is its own word, so pad it with spaces.
    if (config.handleChineseChars && isCJK(cp)) {
      out += ` ${ch} `;
      continue;
    }

    out += ch;
  }

  if (config.stripAccents) {
    // Decompose, then drop the combining marks that decomposition exposed.
    out = out.normalize('NFD').replace(/\p{Mn}/gu, '');
  }
  if (config.lowercase) {
    out = out.toLowerCase();
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Stage 2 — pre-tokenisation                                                  */
/* -------------------------------------------------------------------------- */

/** Split on whitespace, then peel punctuation off into separate tokens. */
export function preTokenize(text: string): string[] {
  const words: string[] = [];

  for (const chunk of text.split(/\s+/)) {
    if (!chunk) continue;

    let current = '';
    for (const ch of chunk) {
      if (isPunctuation(ch)) {
        if (current) {
          words.push(current);
          current = '';
        }
        words.push(ch);
      } else {
        current += ch;
      }
    }
    if (current) words.push(current);
  }

  return words;
}

/* -------------------------------------------------------------------------- */
/* Stage 3 — WordPiece                                                         */
/* -------------------------------------------------------------------------- */

export class WordPieceTokenizer {
  private readonly config: TokenizerConfig;
  private readonly ids: Map<string, number>;
  private readonly unkId: number;

  constructor(config: TokenizerConfig) {
    this.config = config;
    this.ids = new Map();
    config.vocab.forEach((token, id) => {
      // First id wins; a well-formed vocab has no duplicates anyway.
      if (!this.ids.has(token)) this.ids.set(token, id);
    });

    const unk = this.ids.get(config.unkToken);
    if (unk === undefined) {
      throw new Error(`Vocabulary is missing its unknown token "${config.unkToken}".`);
    }
    this.unkId = unk;
  }

  get vocabSize(): number {
    return this.config.vocab.length;
  }

  /**
   * Greedy longest-match-first over a single word.
   *
   * Walks from the start, taking the longest piece present in the vocabulary,
   * then continues with the `##` prefix. A word with any unmatchable remainder
   * becomes a single [UNK] rather than a partial decomposition — that is what
   * the reference implementation does, and partial pieces would embed noise.
   */
  private encodeWord(word: string): number[] {
    if (word.length > this.config.maxInputCharsPerWord) return [this.unkId];

    const chars = [...word];
    const pieces: number[] = [];
    let start = 0;

    while (start < chars.length) {
      let end = chars.length;
      let matched = -1;

      while (start < end) {
        const candidate =
          (start > 0 ? this.config.continuingPrefix : '') + chars.slice(start, end).join('');
        const id = this.ids.get(candidate);
        if (id !== undefined) {
          matched = id;
          break;
        }
        end--;
      }

      if (matched === -1) return [this.unkId];

      pieces.push(matched);
      start = end;
    }

    return pieces;
  }

  /** Text to token ids. Special tokens are not added: static embeddings pool
   *  over content tokens, and [CLS]/[SEP] would only dilute the average. */
  encode(text: string): number[] {
    const normalized = normalizeText(text, this.config);
    const ids: number[] = [];
    for (const word of preTokenize(normalized)) {
      ids.push(...this.encodeWord(word));
    }
    return ids;
  }

  /** Token strings, for debugging why a query matched what it did. */
  tokenize(text: string): string[] {
    return this.encode(text).map((id) => this.config.vocab[id] ?? this.config.unkToken);
  }
}
