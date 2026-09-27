/**
 * A course collection — transcripts accumulated across lectures.
 *
 * Extracting used to replace whatever was held, so moving to the next lecture
 * threw the previous one away. That makes the tool useful per video and useless
 * per course, which is the unit people actually study in.
 *
 * Lectures are keyed by URL, so re-extracting the same one updates it in place
 * rather than duplicating. Each keeps its own timestamps, because they restart
 * at zero per video; the export writes lecture headings so those times stay
 * unambiguous once the lectures sit end to end.
 */

export interface CollectedLecture {
  /** Stable per lecture: the URL without query or hash. */
  id: string;
  title: string;
  url?: string;
  transcript: string;
  collectedAt: number;
}

/**
 * Identity for a lecture.
 *
 * Query and hash are stripped: Udemy appends `?start=` and `#overview`, and the
 * same lecture reached by two different links is still one lecture.
 */
export function lectureId(url: string | undefined, fallback: string): string {
  if (!url) return fallback;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Add a lecture, or replace it if it is already held.
 *
 * Order of first collection is preserved — that is normally the order the
 * course is taken in, and re-extracting one lecture should not move it.
 */
export function addLecture(
  collection: CollectedLecture[],
  lecture: CollectedLecture,
): CollectedLecture[] {
  const index = collection.findIndex((item) => item.id === lecture.id);
  if (index === -1) return [...collection, lecture];

  const next = [...collection];
  next[index] = { ...lecture, collectedAt: collection[index].collectedAt };
  return next;
}

export function removeLecture(
  collection: CollectedLecture[],
  id: string,
): CollectedLecture[] {
  return collection.filter((item) => item.id !== id);
}

/** Total words held, for showing the size of what has been gathered. */
export function totalWords(collection: CollectedLecture[]): number {
  return collection.reduce((sum, lecture) => {
    const text = lecture.transcript.replace(/^\[[^\]]*\]\s*/gm, '');
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return sum + words;
  }, 0);
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Collections are scoped to a course, not to the whole browser.
 *
 * Two courses open in two tabs must not append into each other.
 */
export function collectionKey(url: string | undefined): string {
  if (!url) return 'collection:unknown';
  try {
    const parsed = new URL(url);
    // Udemy: /course/<slug>/learn/lecture/<id> — the course slug is the scope.
    const courseMatch = parsed.pathname.match(/^\/course\/([^/]+)/);
    if (courseMatch) return `collection:${parsed.origin}/course/${courseMatch[1]}`;
    return `collection:${parsed.origin}${parsed.pathname}`;
  } catch {
    return `collection:${url}`;
  }
}

export async function loadCollection(url: string | undefined): Promise<CollectedLecture[]> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) return [];
    const key = collectionKey(url);
    const stored = (await chrome.storage.local.get(key)) as Record<
      string,
      CollectedLecture[] | undefined
    >;
    return Array.isArray(stored[key]) ? stored[key]! : [];
  } catch {
    // A collection is a convenience; storage failure must not break extraction.
    return [];
  }
}

export async function saveCollection(
  url: string | undefined,
  collection: CollectedLecture[],
): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    await chrome.storage.local.set({ [collectionKey(url)]: collection });
  } catch {
    // Same: never throw into the render path.
  }
}
