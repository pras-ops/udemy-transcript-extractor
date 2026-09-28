import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PENDING_NOTES_KEY,
  queueNote,
  takePendingNotes,
  validPendingNotes,
  type PendingNote,
} from './pending-notes';

const NOTE: PendingNote = {
  id: 'note:1',
  lectureId: 'https://www.udemy.com/course/x/learn/lecture/42',
  url: 'https://www.udemy.com/course/x/learn/lecture/42?start=90',
  lectureTitle: 'Gradient descent',
  seconds: 90,
  body: 'the derivative points uphill',
  createdAt: 1,
};

describe('validPendingNotes', () => {
  it('keeps a well-formed note', () => {
    expect(validPendingNotes([NOTE])).toEqual([NOTE]);
  });

  it('keeps a note that was never anchored to a moment', () => {
    // A player that reported no time still produced a real note.
    const loose = { ...NOTE, seconds: undefined };
    expect(validPendingNotes([loose])).toEqual([loose]);
  });

  it('drops one bad entry without taking the rest with it', () => {
    // The queue is read back from storage other versions wrote. A single
    // `JSON.parse`-and-trust would lose every note behind the bad one.
    const queue = [NOTE, null, 'nonsense', {}, { ...NOTE, id: 'note:2' }];
    expect(validPendingNotes(queue).map((note) => note.id)).toEqual(['note:1', 'note:2']);
  });

  it('refuses a note with nothing written in it', () => {
    expect(validPendingNotes([{ ...NOTE, body: '   ' }])).toEqual([]);
    expect(validPendingNotes([{ ...NOTE, body: '' }])).toEqual([]);
  });

  it('refuses a note with no lecture to attach to', () => {
    expect(validPendingNotes([{ ...NOTE, lectureId: '' }])).toEqual([]);
  });

  it('refuses a nonsensical timestamp rather than filing a note at it', () => {
    expect(validPendingNotes([{ ...NOTE, seconds: -5 }])).toEqual([]);
    expect(validPendingNotes([{ ...NOTE, seconds: 'ninety' }])).toEqual([]);
  });

  it('treats anything that is not a list as an empty queue', () => {
    expect(validPendingNotes(undefined)).toEqual([]);
    expect(validPendingNotes({ 0: NOTE })).toEqual([]);
  });
});

describe('the queue', () => {
  let store: Record<string, unknown>;

  beforeEach(() => {
    store = {};
    (globalThis as { chrome?: unknown }).chrome = {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: store[key] }),
          set: async (patch: Record<string, unknown>) => void Object.assign(store, patch),
          remove: async (key: string) => void delete store[key],
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it('accumulates notes rather than replacing the last one', async () => {
    // `chrome.storage` has no append, so this is read-modify-write. Getting it
    // wrong would mean each note silently erasing the one before it.
    expect(await queueNote(NOTE)).toBe(true);
    expect(await queueNote({ ...NOTE, id: 'note:2', body: 'and again' })).toBe(true);

    expect(validPendingNotes(store[PENDING_NOTES_KEY])).toHaveLength(2);
  });

  it('hands over everything queued and clears it', async () => {
    await queueNote(NOTE);

    expect((await takePendingNotes()).map((note) => note.id)).toEqual(['note:1']);
    // Taken twice would import the same note twice.
    expect(await takePendingNotes()).toEqual([]);
  });

  it('leaves the queue alone when there was nothing in it', async () => {
    expect(await takePendingNotes()).toEqual([]);
    expect(store[PENDING_NOTES_KEY]).toBeUndefined();
  });

  it('reports failure instead of throwing when storage refuses a write', async () => {
    // A note that cannot be saved has to be reported, so the composer can say
    // so rather than claiming success and losing it.
    (globalThis as { chrome?: unknown }).chrome = {
      storage: {
        local: {
          get: async () => ({}),
          set: async () => {
            throw new Error('quota exceeded');
          },
          remove: async () => undefined,
        },
      },
    };

    expect(await queueNote(NOTE)).toBe(false);
  });

  it('does nothing at all outside an extension', async () => {
    delete (globalThis as { chrome?: unknown }).chrome;

    expect(await queueNote(NOTE)).toBe(false);
    expect(await takePendingNotes()).toEqual([]);
  });
});
