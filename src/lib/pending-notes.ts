/**
 * Notes written on the lecture page, waiting to reach the library.
 *
 * A note taken while watching cannot be saved where it belongs at the moment it
 * is written. The library is IndexedDB on the extension's own origin, and a
 * content script's `indexedDB` is the *site's* — writing there would put a note
 * about a lecture into Udemy's storage, where nothing would ever read it. There
 * is no background service worker to hand it to either.
 *
 * So notes go into `chrome.storage.local`, which content scripts and extension
 * pages genuinely share, and the dashboard drains the queue into the library
 * when it opens. That is the same shape as the existing migration, and it means
 * a note survives closing the tab, the browser, or the machine.
 */

/** Where the queue lives. Nothing else in the extension uses this key. */
export const PENDING_NOTES_KEY = 'pending-notes';

export interface PendingNote {
  id: string;
  /** `lectureId(url, url)` — the identity the library files lectures under. */
  lectureId: string;
  url: string;
  /** What the page called the lecture, so a note can name its home. */
  lectureTitle: string;
  /** Where in the video the reader was. Absent if the player had no time. */
  seconds?: number;
  body: string;
  createdAt: number;
}

/**
 * Keep only what is actually a note.
 *
 * The queue is read back from storage that other versions of this extension
 * have written and future ones will, so a malformed entry is a real
 * possibility. One bad record must not take the rest of someone's notes with
 * it, which is what a single `JSON.parse`-and-trust would do.
 */
export function validPendingNotes(raw: unknown): PendingNote[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter((entry): entry is PendingNote => {
    if (!entry || typeof entry !== 'object') return false;
    const note = entry as Partial<PendingNote>;
    return (
      typeof note.id === 'string' &&
      typeof note.lectureId === 'string' &&
      note.lectureId.length > 0 &&
      typeof note.body === 'string' &&
      note.body.trim().length > 0 &&
      (note.seconds === undefined || (typeof note.seconds === 'number' && note.seconds >= 0))
    );
  });
}

function storage(): chrome.storage.LocalStorageArea | null {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return null;
    return chrome.storage.local;
  } catch {
    return null;
  }
}

/**
 * Add a note to the queue.
 *
 * Read-modify-write rather than append, because `chrome.storage` has no append.
 * Two lectures queuing at the same instant is not a real scenario: this is one
 * person typing in one tab.
 */
export async function queueNote(note: PendingNote): Promise<boolean> {
  const area = storage();
  if (!area) return false;

  try {
    const held = await area.get(PENDING_NOTES_KEY);
    const queue = validPendingNotes((held as Record<string, unknown>)[PENDING_NOTES_KEY]);
    await area.set({ [PENDING_NOTES_KEY]: [...queue, note] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Take everything queued, clearing it.
 *
 * Cleared only after the read succeeds, so a failure leaves the notes where
 * they are rather than dropping them. The caller has to be able to write them
 * on; if it cannot, they are lost either way, and a queue that empties itself
 * on a read that went nowhere would be the worse of the two.
 */
export async function takePendingNotes(): Promise<PendingNote[]> {
  const area = storage();
  if (!area) return [];

  try {
    const held = await area.get(PENDING_NOTES_KEY);
    const queue = validPendingNotes((held as Record<string, unknown>)[PENDING_NOTES_KEY]);
    if (queue.length === 0) return [];

    await area.remove(PENDING_NOTES_KEY);
    return queue;
  } catch {
    return [];
  }
}
