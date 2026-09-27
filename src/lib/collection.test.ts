import { describe, it, expect } from 'vitest';
import {
  lectureId,
  addLecture,
  removeLecture,
  totalWords,
  collectionKey,
  type CollectedLecture,
} from './collection';

const lecture = (id: string, title: string, transcript = '[00:00] hello there'): CollectedLecture => ({
  id,
  title,
  url: `https://udemy.com${id}`,
  transcript,
  collectedAt: 1,
});

describe('lectureId', () => {
  it('ignores query and hash, so one lecture stays one lecture', () => {
    expect(lectureId('https://udemy.com/course/x/learn/lecture/42?start=15#overview', 'f')).toBe(
      lectureId('https://udemy.com/course/x/learn/lecture/42', 'f'),
    );
  });

  it('keeps different lectures distinct', () => {
    expect(lectureId('https://udemy.com/course/x/learn/lecture/1', 'f')).not.toBe(
      lectureId('https://udemy.com/course/x/learn/lecture/2', 'f'),
    );
  });

  it('falls back when there is no usable url', () => {
    expect(lectureId(undefined, 'fallback')).toBe('fallback');
  });
});

describe('addLecture', () => {
  it('appends a new lecture rather than replacing the collection', () => {
    // The behaviour this module exists for: moving to the next lecture used to
    // discard the previous one.
    const one = addLecture([], lecture('/l/1', 'One'));
    const two = addLecture(one, lecture('/l/2', 'Two'));
    expect(two.map((l) => l.title)).toEqual(['One', 'Two']);
  });

  it('updates a lecture in place when re-extracted', () => {
    const first = addLecture([], lecture('/l/1', 'One', 'old text'));
    const again = addLecture(first, lecture('/l/1', 'One', 'new text'));
    expect(again).toHaveLength(1);
    expect(again[0].transcript).toBe('new text');
  });

  it('keeps original position when a lecture is re-extracted', () => {
    let collection = addLecture([], lecture('/l/1', 'One'));
    collection = addLecture(collection, lecture('/l/2', 'Two'));
    collection = addLecture(collection, lecture('/l/1', 'One', 'revised'));
    expect(collection.map((l) => l.title)).toEqual(['One', 'Two']);
  });

  it('preserves the original collection time on update', () => {
    const first = addLecture([], { ...lecture('/l/1', 'One'), collectedAt: 100 });
    const again = addLecture(first, { ...lecture('/l/1', 'One'), collectedAt: 999 });
    expect(again[0].collectedAt).toBe(100);
  });

  it('does not mutate the input', () => {
    const original = addLecture([], lecture('/l/1', 'One'));
    addLecture(original, lecture('/l/2', 'Two'));
    expect(original).toHaveLength(1);
  });
});

describe('removeLecture', () => {
  it('removes only the named lecture', () => {
    const collection = addLecture(addLecture([], lecture('/l/1', 'One')), lecture('/l/2', 'Two'));
    expect(removeLecture(collection, '/l/1').map((l) => l.title)).toEqual(['Two']);
  });

  it('is a no-op for an unknown id', () => {
    const collection = addLecture([], lecture('/l/1', 'One'));
    expect(removeLecture(collection, '/nope')).toHaveLength(1);
  });
});

describe('totalWords', () => {
  it('counts words across lectures, ignoring timestamps', () => {
    const collection = [
      lecture('/l/1', 'One', '[00:00] one two three'),
      lecture('/l/2', 'Two', '[00:00] four five'),
    ];
    expect(totalWords(collection)).toBe(5);
  });

  it('is zero for an empty collection', () => {
    expect(totalWords([])).toBe(0);
  });
});

describe('collectionKey', () => {
  it('scopes to the course, so all its lectures accumulate together', () => {
    expect(collectionKey('https://udemy.com/course/python/learn/lecture/1')).toBe(
      collectionKey('https://udemy.com/course/python/learn/lecture/2'),
    );
  });

  it('keeps separate courses apart', () => {
    expect(collectionKey('https://udemy.com/course/python/learn/lecture/1')).not.toBe(
      collectionKey('https://udemy.com/course/rust/learn/lecture/1'),
    );
  });

  it('handles a missing or malformed url', () => {
    expect(collectionKey(undefined)).toContain('unknown');
    expect(collectionKey('not a url')).toContain('not a url');
  });
});
