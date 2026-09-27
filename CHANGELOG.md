# Changelog

All notable changes to this project are documented here.

## [4.2.0] — unreleased

The release that removed the AI runtime and got search working anyway.

### Changed — the big one

- **Replaced the browser-based LLM with static embeddings.** Search now uses a
  [Model2Vec](https://github.com/MinishLab/model2vec) `potion-base-8M` lookup
  table instead of running a language model in the browser. There is no
  inference runtime, no WebGPU requirement, no multi-gigabyte download, and no
  WASM. Embedding a token is an array index, so the same code path runs at the
  same speed on every machine.
- Consequences of the above: the background service worker, the offscreen
  document and the message protocol between them are all gone, along with four
  high-severity dependency vulnerabilities that came with the runtime.
- `'wasm-unsafe-eval'` removed from the extension CSP — nothing needs it now.

### Added

- **Screenshot capture.** A transcript cannot show a line of code, a diagram
  or a step in a demo, which is most of what a programming lecture is. Pause on
  something and capture the frame; stills are stored with the lecture and land
  in the export beside the paragraph that was being spoken when you took them.

  Exports that contain screenshots download as a `.zip` — the document plus an
  `images/` folder — because embedding them as data URIs would inflate a course
  export past anything usable. The archive is written by a small store-only ZIP
  writer rather than a dependency; PNG data is already compressed, so there was
  nothing for a compression library to do.

  Frames are checked before they are kept. A DRM-protected player returns a
  black rectangle rather than an error, and the extension says so instead of
  filling a notes file with black images. Where DRM blocks capture, it is
  blocked — there is no attempt to work around it.

  Adds the `unlimitedStorage` permission: `chrome.storage.local` caps at 10 MB,
  which a few dozen stills exhaust. Images never leave the device.
- **Search across a whole course.** Ask a question in your own words and jump
  to the passage that answers it. Keyword search (BM25) is live the instant the
  panel opens; semantic matching upgrades it in the background and the two are
  combined with reciprocal rank fusion. Nothing leaves the machine.
- **Chapters**, detected from the transcript itself using TextTiling over
  embedding similarity — no fixed-size buckets.
- **Key concepts**, extracted KeyBERT-style with MMR so the list is diverse
  rather than five rewordings of one phrase. Click one to search for it.
- **Course collection.** Lectures accumulate as you move through a course
  instead of each one replacing the last. Export the whole thing at once.
- **Obsidian export** (`.md`): markdown with YAML front matter, so course,
  instructor, platform and save time arrive as sortable properties, plus a
  contents list whose anchors actually resolve.
- **Technical term repair.** Speech recognition renders programming vocabulary
  as the nearest everyday words — "Jupiter notebook", "numb pie", "my sequel".
  A lookup table fixes the unambiguous cases and deliberately leaves the
  ambiguous ones ("sequel", "Jason") alone. Code and URLs are never touched.
- **Generic caption extractor** for any standard HTML5 player, via three
  discovery routes (text tracks, `<track src>`, resource timing). Covers
  Panopto, Kaltura, Echo360, Moodle, edX and most self-hosted lecture players.
- **Subtitle and spreadsheet exports**: SubRip (`.srt`), WebVTT (`.vtt`), CSV,
  and Anki cloze flashcards built from definitions the lecturer actually stated.
- `npm run check:store` — eight Chrome Web Store compliance gates that fail the
  build rather than the review.
- Extension icons at all four required sizes.

### Fixed

- Timestamps are plain text everywhere — in the documents and in the search
  results. They were links, which is noise in a file that gets pasted into a
  notes app or a model's context.
- Export and search stayed hidden until the *current* lecture had been
  extracted, so navigating to a new lecture hid a course's worth of collected
  transcripts. They are now available whenever anything has been collected.
- The Udemy transcript panel is virtualised; a single pass collected only the
  visible cues. The panel is now scrolled to gather all of them.
- Panel matching is self-validating (it must actually contain cue elements),
  which stops the course Overview description being scraped as a transcript.
- Filenames no longer come out as `.markdown` or `.rag`.
- Transcripts containing `javascript:` or `<script>` are no longer corrupted by
  sanitisation that had no business running on document text.

### Removed

- The notes feature, and five unused components.
- Seventeen stale documentation files describing features that no longer exist.

---

## [4.1.0] — 2025-10-23

Published to the Chrome Web Store. Sequential lecture navigation, multiple
export formats, clipboard auto-copy, dark mode. WebLLM integration shipped in
an experimental and non-functional state; it is removed entirely in 4.2.0.

## [4.0.0] — 2025-10-14

UI rebuild and removal of the earlier AI stack.

## [3.6.5] — 2025-10-05

Bulk extraction fixes and memory handling for long courses.
