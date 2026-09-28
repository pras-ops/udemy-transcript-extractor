# Changelog

All notable changes to this project are documented here.

## [4.3.0] — 2026-09-28

The release that closed the loop between watching a lecture and keeping notes
from it.

4.2.0 could turn a course into files. It could not help you study one: there was
nowhere to read a transcript properly, nowhere to mark a passage, and no way
back from a note to the moment it came from. This release is that half.

### Added — the big one

- **A dashboard.** A full browser tab, not a panel, because the popup is
  destroyed the moment it loses focus — which takes every in-flight index and
  read with it. Indexing a whole library and reading a three-thousand-word
  transcript are only possible in a tab.

  It holds the library grouped by course, a lecture view with insights,
  transcript, highlights, screenshots and notes, search across every course at
  once, and cross-library views of everything you have marked or written.

- **A learning library, in IndexedDB.** `chrome.storage.local` serialises the
  whole value on every write and caps at 10 MB; a few courses of transcripts and
  stills exceed both the ceiling and the patience. Courses, lectures,
  transcripts, highlights, notes and screenshots now live in indexed object
  stores, and what 4.2.0 collected migrates in on first open.

- **A reader instead of a caption dump.** The transcript is grouped into
  paragraphs, with a **Lines** toggle back to one cue per line. A caption cue is
  about two seconds of speech; rendering one per line was the wall of
  unreadable text this was supposed to fix, and the paragraph grouping the
  exports had always used simply was not wired to the screen.

- **Highlights, with the moment attached.** Select a passage and it captures the
  timestamp it was said at, because a highlight whose moment has to be typed is
  one nobody makes. Attach your own note to a highlight and the quote and what
  you made of it stay one thought.

- **Click any timestamp to go back to the video.** In the reader, your
  highlights, your notes, your screenshots, the chapter list, a search result.

  Udemy ignores `#t=` in its URLs, which is why people scrub the timeline by
  hand hunting for the line they just read — so this does not use a link. The
  content script holds the `<video>` element, where the playhead is a property.
  A selection is anchored to the cue it actually starts in rather than the
  paragraph it sits in, because a timestamp landing a minute early defeats the
  point.

- **Notes while watching — `Alt+Shift+N`.** A composer opens over the video,
  pauses it, takes the moment you reacted to, and saves. The complaint this
  answers is not that notes are hard to write; it is the round trip of pausing,
  alt-tabbing, finding the page, typing five words and hunting for your place
  again.

  A content script cannot write to the library — its `indexedDB` is the *site's*,
  so a note would land in Udemy's storage where nothing could read it — so notes
  queue in `chrome.storage` and the dashboard drains them on open. The composer
  says that, rather than claiming "Saved". This restores, in a better place, the
  notes feature 4.2.0 removed.

- **Screenshots while watching — `Alt+Shift+S`.** Captures the frame on screen
  without opening the popup, which closes the moment you click back into the
  page.

  This is why a background service worker exists again, at ~6 KB and for this
  one job. Capture needs `chrome.tabs.captureVisibleTab`; a content script has
  no `chrome.tabs`, and the `activeTab` grant that call depends on is only given
  when the user *invokes* the extension — a keypress on the page is not that, but
  a `chrome.commands` shortcut is, and command events are only delivered to a
  background context. Adds `background` and `commands` to the manifest.

- **Study notes export — the thing the dashboard could not do at all.** Until
  now everything you produced while studying was trapped in IndexedDB: the ten
  export formats all take a transcript string, which is all the popup has.

  The study document carries the rest — your highlights marked `==inline==`,
  your notes at their moments, and text read off your frames in fenced blocks —
  either with the transcript or as the digest alone. A whole course exports as
  one document, each lecture under its own heading, because timestamps restart
  at zero in every video.

  The reader and the export share one placement rule, deliberately: an export
  that filed your notes differently from the page you wrote them on would be
  quietly wrong in a way nobody would check.

- **Cross-library views** for every highlight and every note, filterable, each
  linking back to its lecture and its moment.

- **First tests for the extractors**, the most fragile code in the project and
  previously the only part with none. Covers `findPrimaryVideo` — which decides
  what seek, capture and quick notes all act on — Udemy's structure parsing
  including its selector-drift fallback, and platform detection.

  Read the caveat in `docs/TECHNICAL.md` before trusting a green run: these
  fixtures are hand-built to the selector contract, not captured from a live
  page, so they prove the parsing logic is intact and not that extraction works.

### Changed

- **One store for screenshots.** `frame-service` no longer owns a database; it
  delegates to the library, and whatever the old `transcript-extractor-frames`
  store still holds is imported lazily and idempotently. Without this the
  dashboard would only ever have seen the frames present at its first open, and
  a readout made in one place would never have reached the other.
- Lecture identity preserves the `v` query parameter — see Fixed.
- `vitest.config.ts` no longer carries `environmentMatchGlobs`, which **Vitest 4
  removed**. It had silently stopped routing `*.dom.test.ts` to jsdom; those
  files now declare the environment themselves.

### Fixed

- **Collecting a second YouTube video overwrote the first.** Lecture identity was
  origin-plus-path with the query stripped, and YouTube puts the video id in the
  query — so every watch page collapsed onto `youtube.com/watch`. `addLecture`
  was doing exactly what it should on ids that could not tell two videos apart.

  The fix preserves `v` and nothing else from the query: `&t=` and `&list=`
  describe where you are in a video, not which video it is. It is deliberately
  additive, so Udemy and Coursera ids are byte-identical and nothing already
  collected is orphaned. It does not recover transcripts already lost.
- Notes and stills anchored to a paragraph are found by range rather than by an
  exact second, so switching the reader to paragraphs no longer hides them.
- A filtered transcript no longer stretches one block's window across everything
  the filter hid, which had filed every note in between under the last matching
  line.
- Highlight marks are indexed by their block rather than by position in the
  unfiltered cue list, so they follow the passage they belong to.

---

## [4.2.0] — 2026-09-27

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

- **Summaries, on every machine.** A summary built from the lecturer's own
  most representative sentences, selected with the embeddings already in the
  package — so it exists without any model, and cannot state something the
  lecture did not. Where Chrome's on-device model is present, a button rewrites
  those same lines as prose, clearly labelled as generated.

  The two tiers compose out of necessity: the on-device model accepts about
  1024 tokens, roughly 750 words, where one lecture runs to three thousand.
  Feeding it the extractive selection rather than the transcript is what makes
  it usable at all.
- **Organized notes** (`.md`): the transcript rewritten with a heading per
  topic, time ranges and paragraphs. Segmentation finds where the subject
  turns, keyphrase extraction names each section. Nothing is generated — the
  only additions are the headings, lifted from the section they title.
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

- **Transcripts came out mis-sequenced.** Two causes, compounding. The player
  autoscrolls its transcript panel to follow playback, so scraping a lecture
  you had been watching began mid-way and only ever scrolled down — the opening
  lines arrived last, or not at all. And the reordering pass ran only when
  *every* cue carried a timestamp, so one untimed line discarded the ordering
  of the several hundred around it. Now the panel is scrolled to the top first,
  and untimed cues are anchored to the line before them.
- **Key concepts included timestamps and filler.** Bare numbers like "09 22"
  passed every filter — each token is two characters, neither is a stopword,
  and the length rule only applied to single words — and then ranked well by
  being frequent. Numeric tokens are now rejected, along with discourse filler
  the lecturer repeats constantly.
- **The analysis pass cancelled itself.** The effect that built the semantic
  index kept `index.status` in its dependency list and *set* that status, so
  React re-ran it and the re-run's cleanup cancelled work that had just begun.
  Semantic search, chapters, concepts and summaries never once completed.
  Keyword search still worked, which is why it went unnoticed.
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
