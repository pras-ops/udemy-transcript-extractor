# Transcript Extractor – Privacy Policy

_Last updated: 28 September 2026_

Transcript Extractor helps students, educators, researchers and content creators
turn video lectures into notes they can keep, search and take elsewhere.

Everything it does runs on your own machine. This document explains exactly
what that means.

---

## 1. Information we collect

**None.** Transcript Extractor does not collect, store, or transmit any
personally identifiable information.

There is no account, no analytics, no telemetry, no crash reporting and no
remote configuration. The extension makes **no network requests of any kind**
while it runs.

Specifically, we never collect:

- Names, email addresses or contact details
- Financial or payment information
- Authentication details (passwords, cookies, tokens)
- Health, location or browsing history
- Which courses you watch, or anything you search for

---

## 2. What is stored on your device

Everything below stays in your browser's local storage and never leaves it.
Removing the extension deletes all of it.

| What | Where | Why |
|---|---|---|
| Transcripts you extract | IndexedDB | So a course accumulates as you work through it |
| Courses and lectures they belong to | IndexedDB | So a transcript has a title and a link back |
| Passages you highlight, and notes on them | IndexedDB | So your own marks survive closing the tab |
| Notes you write against a moment | IndexedDB | So they can be found later by lecture and timestamp |
| Screenshots you capture | IndexedDB | So stills appear alongside the transcript when you export |
| Text read from screenshots | IndexedDB | So the same image is not re-read every time |
| Notes written with the keyboard shortcut | `chrome.storage`, briefly | A lecture page cannot write to the library directly, so a note waits there until you next open the dashboard |
| The course collection the popup shows | `chrome.storage` | So the popup and the library agree on what has been collected |
| Preferences (export format, theme, reader layout) | `chrome.storage` | So the extension opens the way you left it |

You can delete any of it at any time from within the extension, or all of it by
removing the extension.

---

## 3. On-device AI

Two separate things, both local, neither of which sends your data anywhere:

**Search, chapters, key concepts and summaries** use a small embedding model
that ships inside the extension package. Nothing is downloaded and nothing is
uploaded — the model is simply a lookup table stored in the extension.

**Reading text from screenshots and writing prose summaries** use Chrome's
built-in on-device model (Gemini Nano), where your browser and hardware support
it. Chrome downloads that model once, from Google, as a browser feature —
Transcript Extractor never initiates that download without you clicking a
button that says so. Once installed it runs entirely offline. Your screenshots
and transcripts are processed on your machine and are not sent to Google or
anyone else.

If your machine does not support it, those two features are simply absent. The
rest of the extension is unaffected.

---

## 4. Permissions explained

| Permission | Why it is needed |
|---|---|
| `activeTab` | Read the lecture page, and capture a video frame, only when you invoke the extension — by clicking it, or by pressing one of its keyboard shortcuts |
| `scripting` | Inject the transcript reader into the page you are on |
| `storage` | Save your preferences and collected transcripts on this device |
| `unlimitedStorage` | Keep captured screenshots; the default 10 MB cap holds only a few |
| `clipboardWrite` | Copy a transcript when you ask for it |
| Host access to `udemy.com`, `coursera.org`, `youtube.com` | Read transcripts on those sites |

The extension does **not** request access to all websites, and does not run on
sites other than those listed above.

---

## 5. Data sharing

There is nothing to share. No data is sold, rented, transferred or disclosed to
any third party, because no data ever leaves your device.

---

## 6. Changes to this policy

This policy may be updated as features change. Any change will appear here with
a new "Last updated" date.

---

## 7. Contact

Questions about this policy or the extension:

📧 **jacobprashant20@gmail.com**

---

**In summary:** Transcript Extractor is local-first by design. Your transcripts,
screenshots and searches stay on your machine, and no personal information is
ever collected, transmitted or shared.
