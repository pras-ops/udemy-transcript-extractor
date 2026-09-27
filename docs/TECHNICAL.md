# Technical Details

## Stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript (strict), Tailwind, Lucide |
| Extension | Chrome Manifest V3 |
| Build | Vite (two configs — see below), Vitest |
| Search | Model2Vec static embeddings + BM25, both in-process |
| Storage | `chrome.storage` — nothing leaves the device |

## Architecture

There is **no background service worker and no offscreen document**. Both
existed to host a language-model runtime; when that was replaced with a static
embedding table in 4.2.0, the reason for them went away, and with it the
message protocol that coordinated the three contexts.

```
Content script  ──reads the page──▶  platform extractor  ──cues──▶  popup
    (classic IIFE)                                                    │
                                                                      ▼
                                          pure libs: chunk, index, search, export
                                                                      │
                                                                      ▼
                                              chrome.storage  /  file download
```

Search runs **in the popup, directly**. The model is a lookup table, so it
loads and runs where it is used.

### Why two Vite configs

`vite.content.config.ts` builds the content script on its own, as an **IIFE**.

This is not a preference. A Manifest V3 content script must be a classic
script; an ESM bundle fails at load with no useful error, and the extension
appears to do nothing at all. The popup bundle has no such constraint, so it
stays a normal ESM build in `vite.config.ts`. `npm run check:store` asserts the
content script is still classic, because this is easy to reintroduce by
importing a shared module.

### Search

Two indexes over the same passages, fused with reciprocal rank fusion:

1. **BM25** — built synchronously when the panel opens. Nothing to load, so
   search is usable immediately rather than behind a spinner.
2. **Static embeddings** — `potion-base-8M`, shipped as `models/embeddings.bin`
   plus `vocab.json` and declared in `web_accessible_resources`. Tokenisation
   is WordPiece with a BERT normaliser; embedding a token is an array index,
   not a forward pass, so there is no runtime, no WASM and no GPU path.

If the embeddings never load, keyword search keeps working. That is the whole
reason for the ordering.

Chapters come from TextTiling over embedding similarity (depth scores with an
absolute floor, so structure is not invented in noise). Key concepts are
KeyBERT-style with MMR for diversity.

## Layout

```
src/
├── lib/                  # pure — no DOM, no chrome.* — and unit tested
│   ├── transcript.ts         parsing, cleanup, chunking, timestamps
│   ├── tech-terms.ts         technical vocabulary repair table
│   ├── caption-formats.ts    VTT/SRT parse and serialise
│   ├── bm25.ts               lexical index + rank fusion
│   ├── static-embedder.ts    safetensors reader, embedding lookup
│   ├── wordpiece.ts          tokeniser
│   ├── semantic-search.ts    ranking, MMR, snippets
│   ├── segmentation.ts       TextTiling chapters
│   ├── keyphrases.ts         candidate extraction and ranking
│   ├── definitions.ts        Hearst patterns -> cloze cards
│   ├── collection.ts         course-scoped lecture accumulation
│   ├── search-service.ts     indexing and query orchestration
│   └── extension-service.ts  export formats
│
├── lib/*-extractor.ts    # DOM-touching: udemy, youtube, coursera, generic
├── lib/content-script.ts # injected; built separately as IIFE
└── components/           # TranscriptSearch, TranscriptExtractorPopup
```

The split matters: everything that determines export quality lives in the pure
half and is tested without a browser. The extractors are the fragile part, and
they are fragile because the sites they read change, not because the logic is
hard.

## Commands

```bash
npm install
npm run dev          # Vite dev server for UI work
npm run build        # typecheck, then both bundles
npm run typecheck    # tsc --noEmit -p tsconfig.app.json
npm run lint
npm run test         # vitest
npm run verify       # typecheck + lint + test
npm run deploy       # build + copy assets + store compliance gates
npm run check:store  # the gates on their own
```

`npm run fetch:model` downloads and converts the embedding model. The output
lands in `public/models/` and is required for semantic search.

### Testing DOM code

`vitest.config.ts` routes `src/**/*.dom.test.ts` to the jsdom environment.
Fixtures for extractor tests must be **saved real markup** — a hand-built
fragment passes selectors that the real page would break, which is exactly the
failure mode the tests exist to catch.

## Requirements

- Chrome 88+
- Node 18+ to build
- An account on the platform whose lectures you are reading

## Privacy properties

- No network calls at runtime. The model ships inside the package.
- No telemetry, no analytics, no remote configuration.
- Host permissions are restricted to the three supported platforms; there is no
  all-URLs permission, and `check:store` fails the build if one appears.
- CSP is `script-src 'self'` — no `wasm-unsafe-eval`, because nothing evaluates
  generated code.
