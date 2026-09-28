# Troubleshooting

## Nothing is extracted

**Open the transcript panel first.** The extension reads the transcript the player itself renders.
On Udemy that is the *Transcript* button under the video; on YouTube it is *Show transcript* in the
description. If the panel is closed, there is nothing on the page to read.

**Check the video actually has captions.** Not every lecture does. If the player offers no
transcript and no subtitle track, neither does the extension — it transcribes nothing itself, it
collects what is already there.

**Reload the page after updating the extension.** Content scripts are injected at page load. An
extension that was reloaded while the tab was open is running the old script in that tab until you
refresh it.

**If it used to work and now returns nothing on a site that has not changed for you**, the site's
markup probably changed. Extraction depends on other people's HTML, and that is the fragile part of
this extension. Report it with the detail described at the bottom of this page.

## Only part of the transcript came through

Udemy's transcript panel is virtualised: it only keeps the visible cues in the DOM and recycles the
rest as you scroll. The extension scrolls the panel to collect all of them, but a very long lecture
takes a moment. Let it finish before navigating away.

If the result still looks short, compare the last line captured against the panel — a transcript
that ends mid-lecture means the scroll was interrupted.

## The extracted text is the course description

This was a bug in older versions, where the panel selector matched the course Overview section.
Update to 4.2.0 or later, where panel matching requires the element to actually contain caption
cues.

## A keyboard shortcut does nothing

**Check `chrome://extensions/shortcuts` first.** Chrome silently drops a suggested shortcut that
conflicts with another extension — it does not warn you, and the feature simply never fires. That
page is also where you rebind them.

The defaults are `Alt+Shift+N` to write a note and `Alt+Shift+S` to capture a frame.

**Both need a video on the page.** They check for one and do nothing on a page without it.

**Reload the lecture tab after updating the extension.** The note shortcut lives in the content
script, so a tab open across an update does not have it yet.

**If capture specifically does nothing**, open `chrome://extensions`, find the extension, and click
**service worker → inspect**. Press the shortcut and read the console — the worker logs why it gave
up. A message about a permission means the capture itself was refused; no message at all means the
shortcut is not reaching the extension, which points back at a conflict.

## A note I wrote on the lecture page is not in the dashboard

**Open the dashboard again.** Notes written with `Alt+Shift+N` cannot be saved into the library
directly — a lecture page cannot write to the extension's own database — so they wait in storage and
the dashboard collects them when it opens. The composer says as much when you save.

Nothing is lost while waiting: a queued note survives closing the tab, the browser and the machine.

## Clicking a timestamp does not move the video

**The lecture has to be open in a tab.** If it is not, the extension opens it — then click the
timestamp again once the video has actually loaded, because a player has to exist before it can be
seeked.

**The tab must be one the extension can see**, which means Udemy, Coursera or YouTube. It has no
access to other sites, so it cannot drive their players.

Note that this does not work by putting a time in the URL — Udemy ignores `#t=` — so a stored link
alone will not do it.

## A captured frame is black, or capture says it is unavailable

The player is DRM-protected. It hands back a blank rectangle rather than an error, and no setting or
retry changes that. The extension detects the blank result and tells you, rather than filling your
notes with black images.

A frame that is flat but *not* black usually means the player had not decoded the first frame yet —
that one is worth retrying a moment later.

## Search finds nothing

**Keyword search works immediately; meaning-based search loads behind it.** The header says which is
active. If it never upgrades, the embedding model did not load — search keeps working on keywords
alone, which is exactly why it is ordered that way.

**Search covers what you have collected**, not a course you have not extracted. The count in the
header tells you how many passages are indexed.

**Search in the dashboard covers every course at once.** The popup's search is scoped to what it has
to hand, so if you are looking across courses, use the dashboard.

## Screenshots I captured are not in the dashboard

Fixed in 4.3.0. Captures used to go into a separate database from the one the dashboard reads, and
only a one-time migration bridged them — so anything captured after you first opened the dashboard
was invisible there and missing from its exports. There is now a single store, and old frames are
brought across automatically.

If you are on an older build, update.

## Collected lectures disappeared

**The library lives in this browser profile's IndexedDB.** Clearing site data for the extension, or
removing and reinstalling it, discards everything — transcripts, highlights, notes and screenshots.

**The popup's collection is scoped to the course.** Moving to a different course starts a separate
collection; going back returns to the first one. That is by design.

**There is no backup or restore yet**, and this is the honest warning: export anything you would be
upset to lose. Markdown export is per lecture or per course and is not a restore path. A library
backup is the next thing on the roadmap.

## A technical term looks wrong in the output

The extension repairs vocabulary that speech recognition reliably mangles — "Jupiter notebook"
becomes "Jupyter Notebook", "numb pie" becomes "NumPy". Only unambiguous phrases are corrected, and
code and URLs are never touched.

If a correction fires where it should not, the table is a plain list in `src/lib/tech-terms.ts` and
the rule can be removed.

## The summary or "read text from frames" button is missing

Those two features use Chrome's built-in on-device model, which needs a recent Chrome and supported
hardware. The extension probes for it and does not offer the feature when it is absent, rather than
failing when pressed.

Everything else — search, the reader, chapters, concepts, definitions, key moments, seek and every
export — works without it.

## Reporting something else

Open an issue with the platform, the page URL *pattern* (not the lecture itself), and what the panel
showed versus what was exported. Extraction problems are almost always a site markup change, and
that detail is what makes them fixable.

For capture or shortcut problems, include the service worker console output described above.
