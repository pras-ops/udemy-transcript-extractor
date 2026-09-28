# Chrome Web Store listing — v4.3.0

Copy each block into the matching field in the Developer Dashboard.

The current live listing still advertises "WebLLM AI integration is currently
experimental and not fully functional". That feature was removed three versions
ago. Replacing this copy is the single highest-value thing in this file.

---

## Name

```
Transcript Extractor
```

## Summary  *(132 characters max)*

```
Turn video lectures into searchable notes. Transcripts, screenshots and summaries — all on your own machine.
```

## Category

`Education`

---

## Detailed description

```
Turn video lectures into notes you can actually use.

Transcript Extractor pulls the transcript from a lecture, keeps it as you work
through a course, and lets you search, summarise and export it — without
sending a single byte anywhere.


WHAT IT DOES

• Extract the transcript from any lecture in one click
• Collect a whole course as you go, instead of one video at a time
• Read it as prose, not as a wall of two-second caption lines
• Highlight passages and write notes without leaving the video
• Click any timestamp to send the video back to that exact moment
• Search across every course you have collected, in your own words
• Capture screenshots of code, diagrams and slides
• Export your notes, or the transcript, in a format you can take anywhere


STUDY, NOT JUST EXTRACT

The dashboard is where a course becomes something you can work with. Your
transcripts, grouped by course. A reader that puts the captions back into
paragraphs. Everything you have highlighted or written, across every course,
in one place.

Two shortcuts keep you in the lecture while you are watching it:

• Alt+Shift+N writes a note against the moment you are at
• Alt+Shift+S captures the frame on screen

Both pause the video, take the moment, and let it carry on.

And every timestamp is a control. Click one in your notes, your highlights or a
search result and the lecture's own player jumps there — no scrubbing the
timeline hunting for the line you just read.


SEARCH THAT UNDERSTANDS THE QUESTION

Ask "where did they explain backpropagation" and jump to the moment it was
answered. Keyword search is instant; meaning-based search loads a moment later
and the two are combined, so results are ranked by relevance rather than by
whether you guessed the lecturer's exact words.

It also reads the transcript for structure:

• Chapters, detected from where the topic actually turns
• Key concepts, extracted and clickable
• A summary built from the lecturer's own sentences, with timestamps

The summary quotes rather than paraphrases, so it can never claim something the
lecture did not say.


SCREENSHOTS, NOT JUST WORDS

A transcript cannot show a line of code or a diagram — and on a programming
course, that is most of the lecture. Pause on something and capture it. The
still is saved with the lecture and lands in the export beside the sentence
that was being spoken.

Where your version of Chrome supports it, the browser's built-in on-device
model can read the text off a captured frame, so the code on a slide becomes
searchable text instead of a picture.


EXPORTS

• Study notes — the transcript with your highlights marked, your notes at their
  moments, and the text read off your screenshots. Or just the notes, without
  the transcript. A whole course exports as one document.
• Markdown — for pasting into ChatGPT, Claude or Notion
• Organized notes — the transcript rewritten with headings and time ranges
• Obsidian — markdown with YAML properties and a contents list
• Retrieval chunks — pre-chunked JSON for a vector store or NotebookLM
• Anki — cloze flashcards built from definitions the lecturer actually stated
• Plain text, JSON, CSV, SubRip (.srt), WebVTT (.vtt)

Exports with screenshots download as a zip: the document plus an images folder.


WHERE IT WORKS

Dedicated support for Udemy, Coursera and YouTube, plus a generic extractor
that reads captions from any standard HTML5 player — Panopto, Kaltura,
Echo360, Moodle, edX and most self-hosted lecture players.


GENUINELY LOCAL

No account. No API key. No server. No analytics.

The search model ships inside the extension, so nothing is downloaded and
nothing is uploaded. Your transcripts, screenshots and searches never leave
your machine, and the extension makes no network requests at all while it runs.

Open source, MIT licensed.
```

---

## Privacy practices

### Single purpose

```
Transcript Extractor extracts transcripts from educational video pages and lets
the user search and export them. Every feature serves that one purpose:
collecting a lecture's transcript, making it navigable, and getting it out in a
format the user can take elsewhere. All processing happens on the user's device.
```

### Permission justifications

**activeTab**
```
Reads the lecture page to extract its transcript, and captures the current
video frame when the user asks for a screenshot — either by clicking the
button in the popup or by pressing the extension's capture shortcut. Access is
granted only for the tab the user has just acted on.
```

**scripting**
```
Injects the transcript reader into the lecture page the user is viewing. The
transcript is rendered by the site's own player, so the extension must run in
the page to read it.
```

**storage**
```
Saves the user's export preferences, the transcripts they have collected, and
notes they write with the keyboard shortcut while a lecture page is open — a
page cannot write to the extension's own database, so a note waits in storage
until the user next opens the dashboard. All of it stays on their device.
```

**unlimitedStorage**
```
Stores screenshots the user captures from lectures. chrome.storage.local is
capped at 10 MB, which a few dozen stills exhaust, and without this permission
the browser may evict them under disk pressure. Images stay on the device and
are never uploaded.
```

**clipboardWrite**
```
Copies the extracted transcript to the clipboard when the user asks for it.
```

**Host permissions (udemy.com, coursera.org, youtube.com)**
```
The extension reads transcripts from these three platforms. It does not request
access to all sites and does not run anywhere else.
```

### Data usage disclosures

Tick **"I do not collect or use user data"** — then confirm all three
certifications. Every category below is genuinely *not collected*:

| Category | Collected |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | No — read in the page, never transmitted |

### Privacy policy URL

Point at the hosted copy of `PRIVACY.md`. It was rewritten for this release and
now covers screenshot storage, `unlimitedStorage`, and the on-device model —
the live version predates all three.

---

## Note for the reviewer

Worth pasting into the submission notes, because the size jump is conspicuous
and unexplained changes stall review:

```
This version replaces the previous browser-based language model with a static
embedding table (Model2Vec potion-base-8M), bundled in the package at models/.
That is why the package grew from ~90 KB to around 30 MB.

The trade is deliberate: the previous approach required a multi-gigabyte
download and a WebAssembly runtime. This one has no inference runtime at all —
embedding a token is an array lookup — so the extension now runs with
"script-src 'self'" and no 'wasm-unsafe-eval'.

This version also adds a background service worker and a "commands" entry. The
worker is about 6 KB and exists for one reason: a keyboard shortcut that
captures the current video frame. chrome.tabs.captureVisibleTab cannot be
called from a content script, and the activeTab grant it requires is only
issued when the user invokes the extension — which a commands shortcut does and
a keypress on the page does not. The worker holds no state, registers one
listener, and makes no network calls.

The extension makes no network requests at runtime. Where Chrome's built-in
on-device model is available it is used for optional screenshot reading and
summary writing; that model belongs to the browser, is invoked only after an
explicit user action, and processes data locally.
```

---

## Screenshots  *(you must retake these)*

The current listing uses images from August 2025 that predate the entire
interface. The store takes 1–5 at 1280×800 or 640×400.

Worth capturing, in this order:

1. The dashboard library, with a course or two collected — this is the product
2. The reader, showing paragraphs with a highlight and a note against a moment
3. Search results answering a real question, with timestamps
4. The popup on a lecture mid-extraction — the core loop
5. The study-notes export open in Obsidian, marks and all

The images in `store-assets/` predate the dashboard entirely, so none of them
show the reader, highlights, notes, seek or the study export.
