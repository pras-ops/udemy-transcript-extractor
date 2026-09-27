/**
 * Local semantic search, running in the popup.
 *
 * There is no offscreen document, no service-worker relay and no message
 * protocol here. Those existed because Transformers.js cannot load in a service
 * worker, which forced inference into a separate context and everything that
 * followed — duplicate message delivery, progress races, a WASM runtime that
 * had to be located and bundled by hand.
 *
 * A static embedding model has no runtime to host, so all of that is gone. The
 * model is two local files and the maths is a few loops; it runs where it is
 * used.
 */

import { StaticEmbedder, loadStaticModel } from './static-embedder';
import { rankChunks, type RankOptions, type SearchHit } from './semantic-search';
import { detectBoundaries, buildSegments, type Segment } from './segmentation';
import { extractCandidates, rankKeyphrases, type Keyphrase } from './keyphrases';
import { BM25Index, fuseRankings } from './bm25';
import { buildChunks, cleanCues, groupIntoParagraphs, parseTranscript } from './transcript';
import {
  assignParagraphs,
  buildOrganizedMarkdown,
  titleFromPhrases,
  type OrganizeMeta,
} from './organize';
import { sentencesFromCues } from './definitions';
import {
  summarizeExtractive,
  type ExtractiveOptions,
  type SummarySentence,
} from './extractive-summary';

/** An extractive summary of one lecture, whole and by chapter. */
export interface LectureSummary {
  overall: SummarySentence[];
  perChapter: { chapter: number; sentences: SummarySentence[] }[];
}

/** Where the bundled model lives inside the extension. */
const MODEL_PATH = 'models/search/';

export interface IndexProgress {
  fraction: number;
  label: string;
}

interface IndexedChunk {
  chunkIndex: number;
  vector: Float32Array;
}

export class SearchService {
  private embedder: StaticEmbedder | null = null;
  private loading: Promise<StaticEmbedder> | null = null;
  private vectors: IndexedChunk[] = [];
  private texts = new Map<number, string>();
  private indexedFor: string | null = null;

  /** Keyword index. Built synchronously, so search works before the model loads. */
  private lexical = new BM25Index();
  private lexicalFor: string | null = null;

  /**
   * Load the model once per popup lifetime.
   *
   * Concurrent callers share the same load rather than each starting one.
   */
  private async getEmbedder(): Promise<StaticEmbedder> {
    if (this.embedder) return this.embedder;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const started = performance.now();
      const baseUrl =
        typeof chrome !== 'undefined' && chrome.runtime?.getURL
          ? chrome.runtime.getURL(MODEL_PATH)
          : `/${MODEL_PATH}`;

      const data = await loadStaticModel(baseUrl);
      const embedder = new StaticEmbedder(data);
      console.log(
        `[search] model loaded in ${(performance.now() - started).toFixed(0)}ms ` +
          `(${data.tokenizer.vocab.length} tokens x ${data.dims} dims, no inference runtime)`,
      );
      this.embedder = embedder;
      return embedder;
    })();

    try {
      return await this.loading;
    } catch (error) {
      // Allow a retry rather than leaving a rejected promise cached.
      this.loading = null;
      throw error;
    } finally {
      this.loading = null;
    }
  }

  /**
   * Build the keyword index. Synchronous and immediate.
   *
   * This is what makes the panel usable the moment it opens: BM25 needs no
   * model, so there is nothing to wait for. Semantic matching is layered on
   * afterwards by `indexSemantic`.
   */
  indexLexical(chunks: { chunkIndex: number; text: string }[], signature: string): number {
    if (this.lexicalFor === signature && this.lexical.size > 0) return this.lexical.size;

    const started = performance.now();
    this.lexical.clear();
    this.lexical.add(chunks);
    this.lexicalFor = signature;

    console.log(
      `[search] keyword index over ${chunks.length} chunks in ` +
        `${(performance.now() - started).toFixed(0)}ms (no model)`,
    );
    return this.lexical.size;
  }

  /**
   * Embed the chunks, upgrading search from keyword to semantic.
   *
   * Runs after the panel is already usable, so its cost is hidden rather than
   * blocking. Callers may ignore the result — search degrades to keyword-only
   * if this fails or never finishes.
   */
  async indexSemantic(
    chunks: { chunkIndex: number; text: string }[],
    signature: string,
    onProgress?: (progress: IndexProgress) => void,
  ): Promise<number> {
    if (this.indexedFor === signature && this.vectors.length > 0) {
      return this.vectors.length;
    }

    onProgress?.({ fraction: 0.05, label: 'Loading search model…' });
    const embedder = await this.getEmbedder();

    const started = performance.now();
    const next: IndexedChunk[] = [];
    const batchSize = 32;

    for (let start = 0; start < chunks.length; start += batchSize) {
      const batch = chunks.slice(start, start + batchSize);
      for (const chunk of batch) {
        next.push({ chunkIndex: chunk.chunkIndex, vector: embedder.embed(chunk.text) });
      }

      const done = Math.min(start + batch.length, chunks.length);
      onProgress?.({
        fraction: 0.3 + 0.7 * (done / Math.max(1, chunks.length)),
        label: `Indexing ${done} of ${chunks.length}…`,
      });

      // Yield so the popup stays responsive while this runs in the background.
      if (start + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this.vectors = next;
    // Kept so chapters can be named from their own text. Titling needs the
    // words, not just the vectors, and re-deriving them would mean chunking
    // the transcript a second time.
    this.texts = new Map(chunks.map((chunk) => [chunk.chunkIndex, chunk.text]));
    this.indexedFor = signature;

    console.log(
      `[search] semantic index over ${next.length} chunks in ` +
        `${(performance.now() - started).toFixed(0)}ms`,
    );
    return next.length;
  }

  /** True once semantic matching is available on top of keyword search. */
  get isSemanticReady(): boolean {
    return this.vectors.length > 0;
  }

  /**
   * Rank chunks against a query.
   *
   * Keyword results are always available. When the embedding model has
   * finished loading the two rankings are fused, because they fail in
   * different directions: lexical scoring is stronger on exact terminology,
   * semantic scoring on paraphrase. Fusing is by rank rather than score —
   * BM25 scores are unbounded while cosine sits in [0, 1], so combining the
   * raw numbers would let one drown out the other.
   */
  async search(query: string, options: RankOptions = {}): Promise<SearchHit[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const topK = options.topK ?? 5;
    const lexicalHits = this.lexical.search(trimmed, Math.max(topK, 10));

    // Keyword-only until the model is ready — which is the normal state for
    // the first second or so after the panel opens.
    if (this.vectors.length === 0) {
      return lexicalHits.slice(0, topK);
    }

    const embedder = await this.getEmbedder();
    const dense = rankChunks(
      embedder.embed(trimmed),
      this.vectors.map((entry) => entry.vector),
      { ...options, topK: Math.max(topK, 10) },
    ).map((hit) => ({
      chunkIndex: this.vectors[hit.chunkIndex].chunkIndex,
      score: hit.score,
    }));

    if (lexicalHits.length === 0) return dense.slice(0, topK);

    const fused = fuseRankings([lexicalHits, dense], topK);

    // Report the semantic score where there is one; it is the number the
    // confidence label is calibrated against.
    const denseScores = new Map(dense.map((hit) => [hit.chunkIndex, hit.score]));
    return fused.map((hit) => ({
      chunkIndex: hit.chunkIndex,
      score: denseScores.get(hit.chunkIndex) ?? hit.score,
    }));
  }

  /**
   * Chapters and key concepts for the indexed transcript.
   *
   * Chapters cost nothing extra: segmentation runs over the chunk vectors that
   * indexing already produced. Concepts need the candidate phrases embedded,
   * which for a lookup-table model is a few hundred array lookups.
   *
   * Must be called after `index`.
   */
  async analyze(
    transcriptText: string,
    startSecondsOf: (chunkPosition: number) => number | null,
  ): Promise<{ chapters: Segment[]; chapterTitles: string[]; concepts: Keyphrase[] }> {
    if (this.vectors.length === 0) return { chapters: [], chapterTitles: [], concepts: [] };

    const embedder = await this.getEmbedder();
    const started = performance.now();

    const boundaries = detectBoundaries(this.vectors.map((entry) => entry.vector));
    const chapters = buildSegments(this.vectors.length, boundaries, startSecondsOf);

    const candidates = extractCandidates(transcriptText);
    const concepts =
      candidates.length === 0
        ? []
        : rankKeyphrases(
            candidates,
            candidates.map((c) => embedder.embed(c.phrase)),
            embedder.embed(transcriptText),
          );

    // Name each chapter from its own text, not the lecture's. A chapter listed
    // by its opening words ("Hello guys. So we are going to continue…") tells
    // the reader nothing about what is in it.
    const chapterTitles = chapters.map((chapter, position) => {
      const text = this.vectors
        .slice(chapter.startBlock, chapter.endBlock + 1)
        .map((entry) => this.texts.get(entry.chunkIndex) ?? '')
        .join(' ')
        .trim();

      if (!text) return `Part ${position + 1}`;

      const chapterCandidates = extractCandidates(text);
      if (chapterCandidates.length === 0) return `Part ${position + 1}`;

      const ranked = rankKeyphrases(
        chapterCandidates,
        chapterCandidates.map((candidate) => embedder.embed(candidate.phrase)),
        embedder.embed(text),
      );
      return titleFromPhrases(
        ranked.map((entry) => entry.phrase),
        position + 1,
      );
    });

    console.log(
      `[search] analysed ${chapters.length} chapters and ${concepts.length} concepts ` +
        `in ${(performance.now() - started).toFixed(0)}ms`,
    );
    return { chapters, chapterTitles, concepts };
  }

  /**
   * Summarise a transcript using only what ships with the extension.
   *
   * This runs on every machine. Chrome's generative model is capped at roughly
   * 1024 tokens per prompt — a fraction of one lecture — and is absent on much
   * hardware, so a summary that depended on it would not exist for most
   * people. Selecting the lecturer's own most representative sentences needs
   * neither.
   *
   * Per-chapter summaries are bucketed by time rather than by chunk index:
   * chapters are defined over chunks and sentences are not, and the clock is
   * the one axis both share.
   */
  async summarize(
    transcriptText: string,
    chapters: Segment[] = [],
    options: ExtractiveOptions = {},
  ): Promise<LectureSummary> {
    const sentences = sentencesFromCues(cleanCues(parseTranscript(transcriptText)));
    if (sentences.length === 0) return { overall: [], perChapter: [] };

    const embedder = await this.getEmbedder();
    const started = performance.now();
    const vectors = sentences.map((entry) => embedder.embed(entry.sentence));

    const overall = summarizeExtractive(sentences, vectors, { maxSentences: 6, ...options });

    const perChapter = chapters
      .map((chapter) => {
        const from = chapter.startSeconds;
        const to = chapter.endSeconds;

        // A chapter with no clock cannot claim any sentence.
        if (from === null) return { chapter: chapter.index, sentences: [] };

        const inRange: number[] = [];
        sentences.forEach((entry, index) => {
          if (entry.startSeconds === null) return;
          if (entry.startSeconds < from) return;
          if (to !== null && entry.startSeconds > to) return;
          inRange.push(index);
        });

        return {
          chapter: chapter.index,
          sentences: summarizeExtractive(
            inRange.map((i) => sentences[i]),
            inRange.map((i) => vectors[i]),
            { maxSentences: 2, ...options },
          ),
        };
      })
      .filter((entry) => entry.sentences.length > 0);

    console.log(
      `[search] summarised ${sentences.length} sentences into ${overall.length} lines ` +
        `and ${perChapter.length} chapter summaries in ${(performance.now() - started).toFixed(0)}ms`,
    );

    return { overall, perChapter };
  }

  /**
   * Rewrite a transcript as structured notes.
   *
   * Everything this needs was already here and only ever used for search:
   * segmentation says where the topic turns, keyphrase extraction says what
   * each stretch is about. Together they give a wall of speech headings, time
   * ranges and paragraphs.
   *
   * Each section is titled from its own text rather than the lecture's, so a
   * heading describes that section instead of repeating the video's subject
   * eight times.
   */
  async organize(transcriptText: string, meta: OrganizeMeta = {}): Promise<string> {
    const cues = cleanCues(parseTranscript(transcriptText));
    if (cues.length === 0) return '';

    const embedder = await this.getEmbedder();
    const started = performance.now();

    // Finer than the export chunking: topic boundaries land on the sentence,
    // not somewhere inside a five-minute block.
    const blocks = buildChunks(transcriptText, {}, {
      targetTokens: 55,
      maxTokens: 85,
      overlapTokens: 0,
      contextualize: false,
    });

    const segments = buildSegments(
      blocks.length,
      detectBoundaries(blocks.map((block) => embedder.embed(block.body))),
      (position) => blocks[position]?.startSeconds ?? null,
    );

    const titles = segments.map((segment, position) => {
      const text = blocks
        .slice(segment.startBlock, segment.endBlock + 1)
        .map((block) => block.body)
        .join(' ');

      const candidates = extractCandidates(text);
      if (candidates.length === 0) return `Part ${position + 1}`;

      const ranked = rankKeyphrases(
        candidates,
        candidates.map((candidate) => embedder.embed(candidate.phrase)),
        embedder.embed(text),
      );
      return titleFromPhrases(
        ranked.map((entry) => entry.phrase),
        position + 1,
      );
    });

    const sections = assignParagraphs(
      segments.map((segment) => ({
        index: segment.index,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
      })),
      groupIntoParagraphs(cues),
      (index) => titles[index] ?? `Part ${index + 1}`,
    );

    console.log(
      `[search] organised ${cues.length} cues into ${sections.length} sections ` +
        `in ${(performance.now() - started).toFixed(0)}ms`,
    );

    return buildOrganizedMarkdown(sections, meta);
  }

  get indexedCount(): number {
    return this.vectors.length;
  }

  clear(): void {
    this.vectors = [];
    this.indexedFor = null;
  }
}

/**
 * One instance per popup.
 *
 * The popup is torn down when it closes, taking the model with it. Reloading is
 * a local file read measured in milliseconds, so this is cheaper than keeping a
 * separate context alive to cache it.
 */
export const searchService = new SearchService();
