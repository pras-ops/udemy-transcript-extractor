# Troubleshooting

## Nothing is extracted

**Open the transcript panel first.** The extension reads the transcript the
player itself renders. On Udemy that is the *Transcript* button under the
video; on YouTube it is *Show transcript* in the description. If the panel is
closed, there is nothing on the page to read.

**Check the video actually has captions.** Not every lecture does. If the
player offers no transcript and no subtitle track, neither does the extension —
it transcribes nothing itself, it collects what is already there.

**Reload the page after updating the extension.** Content scripts are injected
at page load. An extension that was reloaded while the tab was open is running
the old script in that tab until you refresh it.

## Only part of the transcript came through

Udemy's transcript panel is virtualised: it only keeps the visible cues in the
DOM and recycles the rest as you scroll. The extension scrolls the panel to
collect all of them, but a very long lecture takes a moment. Let it finish
before navigating away.

If the result still looks short, compare the last line captured against the
panel — a transcript that ends mid-lecture means the scroll was interrupted.

## The extracted text is the course description

This was a bug in older versions, where the panel selector matched the course
Overview section. Update to 4.2.0 or later, where panel matching requires the
element to actually contain caption cues.

## Search finds nothing

**Keyword search works immediately; meaning-based search loads in the
background.** The header says which is active. If it still says "keyword search
ready" after a while, the embedding model did not load — search keeps working
on keywords alone, which is why it is ordered that way.

**Search covers what you have collected**, not the whole course automatically.
Lectures accumulate as you extract them. The count in the panel header tells
you how many passages are indexed.

## The export or search section disappeared

Fixed in 4.2.0. It used to be gated on the *current* lecture being extracted,
so moving to a new lecture hid everything already collected. It is now
available whenever anything has been collected.

## A technical term looks wrong in the output

The extension repairs vocabulary that speech recognition reliably mangles —
"Jupiter notebook" becomes "Jupyter Notebook", "numb pie" becomes "NumPy". Only
unambiguous phrases are corrected, and code and URLs are never touched.

If a correction fires where it should not, the table is a plain list in
`src/lib/tech-terms.ts` and the rule can be removed.

## Collected lectures disappeared

The collection is scoped to the course, stored with `chrome.storage`. Moving to
a different course starts a separate collection; going back returns to the
first one. Clearing the extension's storage, or removing and reinstalling it,
discards both.

## Reporting something else

Open an issue with the platform, the page URL pattern (not the lecture itself),
and what the panel showed versus what was exported. Extraction problems are
almost always a site markup change, and that detail is what makes them fixable.
