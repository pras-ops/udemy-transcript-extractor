# Technical Details

## Stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript (strict), Tailwind, Lucide |
| Extension | Chrome Manifest V3 |
| Build | Vite (three configs — see below), Vitest |
| Search | Model2Vec static embeddings + BM25, both in-process |
| Library | IndexedDB (`transcript-extractor-library`) |
| Preferences, course collection, queued notes | `chrome.storage.local` |

Nothing leaves the device. See [Privacy properties](#privacy-properties).

## Architecture

Four contexts, each with one job.

```
Lecture page                                Extension
────────────                                ─────────
content-script.ts  ◀── messages ──▶  popup      extract · collect · capture · export
  ├ udemy/coursera/youtube/generic    dashboard  library · reader · search · notes · export
  ├ quick-note.ts   Alt+Shift+N       worker     Alt+Shift+S capture, and nothing else
  └ page-toast.ts                        │
                                         ▼
                        IndexedDB library  +  chrome.storage  →  file download
```

### Why there is a service worker again

4.2.0 removed the background service worker and the offscreen document. Both existed only to host
the language-model runtime, so when that was replaced with a static embedding table, their reason
went away.

4.3.0 added a new one, ~6 KB, for exactly one job: the `Alt+Shift+S` capture shortcut. The
constraint chain is worth stating because it is not obvious:

1. Capturing a frame needs `chrome.tabs.captureVisibleTab`.
2. A content script has no `chrome.tabs` at all, so the page cannot do it.
3. That call needs the `activeTab` permission, which Chrome grants only when the user *invokes* the
   extension. Pressing a key on the page is not an invocation — but triggering a `chrome.commands`
   shortcut is.
4. `chrome.commands` events are only delivered to a background context.

So the worker is what makes the shortcut possible, and nothing else belongs in it. It is torn down
between events, holds no state, and asks the page for everything it needs.

Notes need none of this, which is why `Alt+Shift+N` is a plain `keydown` listener in the content
script with no manifest involvement.

**One trap worth recording.** The worker must not use
`chrome.tabs.query({ active: true, currentWindow: true })`. "Current window" means the window
containing the *calling context*, and a worker has no window, so the query returns nothing — except
while the popup happens to be open, which makes the bug look like a permissions problem. Use
`lastFocusedWindow`. The popup's own code may keep `currentWindow`, because the popup genuinely has
one.

### Why notes queue instead of being saved

A content script's `indexedDB` is the **site's**, not the extension's. Writing a note there would
file it into Udemy's storage, where nothing in the extension could ever read it, and there is no
background context to hand it to synchronously.

So `quick-note.ts` writes to `chrome.storage.local`, which content scripts and extension pages
genuinely share, and `importPendingNotes()` drains the queue into the library when the dashboard
opens. A note survives closing the tab, the browser or the machine — but it appears in the dashboard
on next open rather than instantly, and the composer says so rather than claiming "Saved".

### One screenshot store

Frames used to live in their own database (`transcript-extractor-frames`) while the dashboard read
the library, bridged only by the one-time migration. Every frame captured after that migration was
invisible in the dashboard and missing from its exports, and a readout made in one place never
reached the other.

`frame-service.ts` now delegates to the library and owns no database. `importLegacyFrames()` brings
across whatever the old store still holds, lazily and idempotently on first read, and leaves
anything already in the library untouched so a readout is never overwritten by an unread copy.

### Why three Vite configs

`vite.config.ts` builds the popup and dashboard as a normal multi-entry ESM build.

`vite.content.config.ts` and `vite.background.config.ts` each build one file as an **IIFE**.

This is not a preference. The multi-entry build hoists any module shared between two entries into a
common chunk and emits an `import` to pull it in. A Manifest V3 content script must be a classic
script, and the worker is registered without `"type": "module"`, so in both cases that `import`
fails at load with no useful error and the feature appears to do nothing. Building each alone in
IIFE format inlines every dependency, which keeps sharing code with the popup free.
`npm run check:store` asserts the content script is still classic, because this is easy to
reintroduce.

### Search

Two indexes over the same passages, fused with reciprocal rank fusion:

1. **BM25** — built synchronously when the panel opens. Nothing to load, so search is usable
   immediately rather than behind a spinner.
2. **Static embeddings** — `potion-base-8M`, shipped as `models/embeddings.bin` plus `vocab.json`
   and declared in `web_accessible_resources`. Tokenisation is WordPiece with a BERT normaliser;
   embedding a token is an array index, not a forward pass, so there is no runtime, no WASM and no
   GPU path.

If the embeddings never load, keyword search keeps working. That is the whole reason for the
ordering, and the two tiers have separate `catch` blocks so a failed upgrade cannot replace a
working keyword search with an error panel.

Chapters come from TextTiling over embedding similarity (depth scores with an absolute floor, so
structure is not invented in noise). Key concepts are KeyBERT-style with MMR for diversity.

### The two AI tiers

Tier one is everything above: selection and statistics, works on every machine, cannot hallucinate
because it never generates.

Tier two is Chrome's built-in on-device model (Gemini Nano) via the Summarizer and Prompt APIs, used
for prose summaries and reading text off captured frames. `on-device-ai.ts` probes availability
(`probeSummarizer`, `probeImageModel`) and callers simply do not offer the feature when it is
absent. The extension never ships or downloads a model itself.

## Layout

```
src/
├── lib/                  # pure — no DOM, no chrome.* — and unit tested
│   ├── transcript.ts         parsing, cleanup, paragraphs, blocks, chunking, timestamps
│   ├── tech-terms.ts         technical vocabulary repair table
│   ├── caption-formats.ts    VTT/SRT parse and serialise
│   ├── bm25.ts               lexical index + rank fusion
│   ├── static-embedder.ts    safetensors reader, embedding lookup
│   ├── wordpiece.ts          tokeniser
│   ├── semantic-search.ts    ranking, MMR, snippets
│   ├── segmentation.ts       TextTiling chapters
│   ├── keyphrases.ts         candidate extraction and ranking
│   ├── definitions.ts        Hearst patterns -> cloze cards
│   ├── extractive-summary.ts representative-sentence selection
│   ├── library-schema.ts     record shapes, ids, course/platform derivation
│   ├── study-notes.ts        the Markdown study document
│   ├── collection.ts         lecture identity + course-scoped accumulation
│   ├── frame-capture.ts      crop geometry, DRM/blank classification, export planning
│   ├── zip.ts                archive writing, data-URL decoding
│   ├── search-service.ts     indexing and query orchestration
│   └── extension-service.ts  export formats, messaging, seek
│
├── lib/library-db.ts     # IndexedDB: the library, migrations, drains
├── lib/frame-service.ts  # capture, delegating storage to the library
├── lib/pending-notes.ts  # the chrome.storage queue
├── lib/on-device-ai.ts   # Chrome's built-in model, probed
├── lib/*-extractor.ts    # DOM-touching: udemy, youtube, coursera, generic
├── lib/content-script.ts # injected; built separately as IIFE
├── lib/quick-note.ts     # Alt+Shift+N composer, shadow DOM
├── lib/page-toast.ts     # what the worker speaks through
├── background.ts         # the capture command; built separately as IIFE
└── components/
    ├── generated/TranscriptExtractorPopup.tsx
    └── dashboard/        Dashboard, LibraryView, LectureView, SearchView,
                          NotesView, HighlightsView
```

The split matters: everything that determines export quality lives in the pure half and is tested
without a browser. The extractors are the fragile part, and they are fragile because the sites they
read change, not because the logic is hard.

## Commands

```bash
npm install
npm run dev          # Vite dev server for UI work
npm run build        # typecheck, then all three bundles
npm run typecheck    # tsc --noEmit -p tsconfig.app.json
npm run lint
npm run test         # vitest
npm run verify       # typecheck + lint + test
npm run deploy       # build + copy assets + store compliance gates
npm run check:store  # the gates on their own
```

`npm run fetch:model` downloads and converts the embedding model into `public/models/`. It is
required for semantic search and is not committed.

Use `npm run typecheck`, not a bare `tsc --noEmit` — the latter picks up the root config, which is
looser and will miss real errors that the build then fails on.

### Testing DOM code

Tests default to `node` because almost all of them are pure; booting jsdom for all 543 costs seconds
on every run.

Files needing a DOM are named `*.dom.test.ts` **and declare `// @vitest-environment jsdom` on their
first line**. The declaration is not redundant: `vitest.config.ts` used to route them with
`environmentMatchGlobs`, which **Vitest 4 removed**, so that glob silently stopped applying. The
naming is kept because it states what a file needs, and because `test.projects` could route on it
again later.

Where a test depends on the page URL — the platform detection tests do — add
`// @vitest-environment-options { "url": "..." }`. Environment *options* cannot come from a glob even
when routing works, so they belong in the file regardless.

#### The fixture standard, and where the current tests fall short

**Fixtures for extractor tests should be saved real markup.** A hand-built fragment passes exactly
the selectors the real page would break, which is the failure mode these tests exist to catch.

The fixtures presently in `udemy-extractor.dom.test.ts` **do not meet that bar.** They are
hand-built to the selector contract the extractor depends on, and their header says so. What they
do give you is a regression guard against refactors and a precise statement of which selector a
redesign invalidated. What they cannot tell you is whether Udemy still looks like that.

Replacing them with markup captured from a live lecture page is on the roadmap. Until then, treat a
green extractor suite as "the parsing logic is intact", never as "extraction works".

## Requirements

- Chrome 88+ for everything in tier one — Manifest V3, the service worker and `commands` all date
  from there
- A considerably newer Chrome, plus supported hardware, for the tier-two AI features. The code
  probes rather than checking versions
- Node 18+ to build
- An account on the platform whose lectures you are reading

## Privacy properties

- No network calls at runtime. The search model ships inside the package.
- No telemetry, no analytics, no remote configuration, no account.
- Host permissions are restricted to the three supported platforms; there is no all-URLs
  permission, and `check:store` fails the build if one appears.
- CSP is `script-src 'self'` — no `wasm-unsafe-eval`, because nothing evaluates generated code.
- Tier-two AI runs in-browser via Chrome's own model. The extension does not download it and does
  not send screenshots or transcripts anywhere.

## Known gaps

- **No library backup or restore.** The library is one profile's IndexedDB; clearing site data loses
  it. Markdown export is not a restore path. The schema in `library-schema.ts` is pure and tested,
  so a JSON dump plus import is bounded work.
- **Extraction failure is quiet.** A site redesign returns nothing rather than saying the site
  changed.
- **DRM blocks capture** on protected players. `classifyFrame` detects the blank result and reports
  it rather than storing black images.
