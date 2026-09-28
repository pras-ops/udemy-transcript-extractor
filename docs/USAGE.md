# 📖 Usage Guide

The whole workflow, in the order you actually do it.

---

## 1. Extract a transcript

1. Open a lecture on Udemy, Coursera, YouTube or any site with a captioned HTML5 player.
2. **Open the player's own transcript panel.** On Udemy that is the *Transcript* button under the
   video; on YouTube it is *Show transcript* in the description. The extension reads what the player
   renders — it does not transcribe audio itself, so a closed panel means there is nothing to read.
3. Click the extension icon, then **Extract transcript**.
4. The transcript is copied to your clipboard automatically. Choose a format to download it instead.

### Collecting a whole course

After a successful extraction the button becomes **Next lecture & extract**. Clicking it navigates
to the next lecture and extracts that one too, so you can walk a curriculum without going back to
the sidebar each time.

Lectures accumulate per course. Moving to a different course starts a separate collection; coming
back returns to the first one.

---

## 2. While you are watching

Two shortcuts work directly on the lecture page, so you never lose your place.

| Shortcut | What happens |
| --- | --- |
| `Alt+Shift+N` | A small composer opens over the video. It pauses, takes the moment you reacted to, and saves your note against it. `Ctrl+Enter` saves, `Esc` cancels. |
| `Alt+Shift+S` | Captures the frame on screen. A transcript cannot show a diagram or a line of code; the still can. |

Both restore playback afterwards if the video was playing.

**If a shortcut does nothing**, check `chrome://extensions/shortcuts` — Chrome drops a shortcut that
conflicts with another extension without warning you, and that page is also where you rebind them.

**Notes appear in the dashboard the next time you open it**, not instantly. A content script cannot
write to the extension's own database, so notes queue in storage and the dashboard collects them
when it opens. The composer says so rather than just claiming "Saved". Nothing is lost in the
meantime — a queued note survives closing the tab, the browser or the machine.

**If capture reports the frame is unavailable**, the player is DRM-protected. It returns a black
rectangle rather than an error, and the extension would rather tell you than fill your notes with
black images.

---

## 3. Review in the dashboard

Open the dashboard from the popup. It is a full browser tab rather than a panel, because indexing a
library and reading a three-thousand-word transcript are not things a popup can survive — it is
destroyed the moment it loses focus.

### Library

Every course, grouped, with lecture counts and word counts. The download button on a course writes
the whole thing out as one study document.

### A lecture

Five tabs:

- **Insights** — chapters, key concepts, definitions the lecturer actually stated, and the key
  moments. All derived from the transcript by selection, so nothing here was invented. Prose
  summaries appear on top where Chrome's on-device model is available.
- **Transcript** — the reader. Grouped into paragraphs by default; the **Lines** toggle shows one
  caption cue per line when you want to see exactly where each starts. Filter narrows it.
  Hovering any block offers a highlighter and a note button.
- **Highlights** — what you marked in this lecture, each with the moment it was said. Add your own
  note to any of them.
- **Screenshots** — the stills, with any text read off them. **Read text from frames** transcribes
  them where Chrome's on-device model is available.
- **Notes** — everything you wrote against this lecture.

### Jumping back to the video

**Every timestamp is a control.** Click one in the reader, your highlights, your notes, your
screenshots, the chapter list or a search result, and the lecture's own player goes to that moment.

The lecture tab has to be open. If it is not, the extension opens it — then click the timestamp
again once the video has loaded, because a player needs to exist before it can be seeked.

This exists because Udemy ignores `#t=` in its URLs, so a link cannot do it. The extension holds the
video element directly instead.

### Search

Searches **every course at once**, by meaning rather than exact words.

Keyword search is ready immediately. The meaning tier loads behind it and upgrades the results — the
header tells you which is active. If the model never loads, keyword search keeps working on its own.

Results are passages with timestamps, never a generated answer, so search cannot tell you something
that was never said. Click the timestamp to jump to the video, or the result body to open the
lecture.

### Highlights and Notes, across everything

Two more tabs in the sidebar show every highlight and every note in the library, filterable, each
linking back to its lecture and its moment.

---

## 4. Export

### From a lecture

The **Export** menu sits in the lecture header, because what it writes is the work from every tab.

| Choice | What you get |
| --- | --- |
| **Study notes** | The transcript with your highlights marked `==inline==`, your notes at their moments, and text read off your screenshots in fenced code blocks |
| **Just what you marked** | The same digest without the transcript — the form worth keeping in a notes vault |
| **Transcript only** | Plain text, Obsidian, SRT, WebVTT, CSV, Anki cards or JSON |

### From a course

The download button beside any course in the library writes every lecture into one document, each
under its own heading. Timestamps restart at zero in every video, so a flat merge would produce a
file full of `00:00` with nothing to say which lecture each belonged to.

### Formats in full

| Format | Best for |
| --- | --- |
| **Study notes** (`.md`) | Obsidian, Notion, Logseq — your own marks included |
| **Markdown** (`.md`) | Readable notes with timestamps and headings |
| **Obsidian** (`.md`) | Vault-ready, with YAML frontmatter and tags |
| **Plain text** (`.txt`) | Anywhere |
| **Retrieval chunks** (`.json`) | Vector stores and NotebookLM — pre-chunked with context headers |
| **JSON** (`.json`) | Your own scripts |
| **SubRip** (`.srt`) | Video editors and players |
| **WebVTT** (`.vtt`) | HTML5 players, re-upload |
| **CSV** (`.csv`) | Excel, Google Sheets |
| **Anki** (`.csv`) | Cloze cards built from definitions the lecturer stated |

---

## Tips

- **Let a long transcript finish.** Udemy's panel is virtualised — it only keeps visible cues in the
  DOM — so the extension scrolls it to collect them all. A very long lecture takes a moment.
- **Reload the page after updating the extension.** Content scripts are injected at page load, so a
  tab open across an update is running the old script until you refresh.
- **Mark as you go.** Highlights capture the moment automatically, which is what makes them worth
  anything later. A highlight you make while reading is a timestamp you never have to type.
- **Back up what matters.** There is no library backup yet, so export anything you would be upset to
  lose. See the limitations in the [README](../README.md#️-known-limitations).

---

## When something does not work

See **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** — it covers empty extractions, partial
transcripts, search finding nothing, shortcuts doing nothing, and where collected lectures went.
