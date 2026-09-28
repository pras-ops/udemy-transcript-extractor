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

  it('keeps YouTube videos distinct, where the id lives in the query', () => {
    // The bug this guards: dropping the query collapsed every watch page onto
    // `youtube.com/watch`, so `addLecture` treated the second video collected
    // as a re-extraction of the first and overwrote its transcript.
    expect(lectureId('https://www.youtube.com/watch?v=aaaaaaaaaaa', 'f')).not.toBe(
      lectureId('https://www.youtube.com/watch?v=bbbbbbbbbbb', 'f'),
    );
  });

  it('ignores the rest of a YouTube query, which says where you are not which video', () => {
    const plain = lectureId('https://www.youtube.com/watch?v=aaaaaaaaaaa', 'f');

    expect(lectureId('https://www.youtube.com/watch?v=aaaaaaaaaaa&t=90s', 'f')).toBe(plain);
    expect(lectureId('https://www.youtube.com/watch?v=aaaaaaaaaaa&list=PL123', 'f')).toBe(plain);
    expect(lectureId('https://www.youtube.com/watch?list=PL123&v=aaaaaaaaaaa', 'f')).toBe(plain);
    expect(lectureId('https://www.youtube.com/watch?v=aaaaaaaaaaa#t=10', 'f')).toBe(plain);
  });

  it('leaves ids on platforms that key off the path exactly as they were', () => {
    // These are the ids already sitting in people's libraries. Preserving `v`
    // had to be additive: any change here orphans stored transcripts.
    expect(lectureId('https://www.udemy.com/course/x/learn/lecture/42?start=15', 'f')).toBe(
      'https://www.udemy.com/course/x/learn/lecture/42',
    );
    expect(lectureId('https://www.coursera.org/learn/x/lecture/abc/title?t=1', 'f')).toBe(
      'https://www.coursera.org/learn/x/lecture/abc/title',
    );
  });

  it('falls back when there is no usable url', () => {
    expect(lectureId(undefined, 'fallback')).toBe('fallback');
  });

  it('keeps a url it cannot parse rather than dropping it', () => {
    expect(lectureId('not a url', 'fallback')).toBe('not a url');
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

describe('addLecture with real lecture ids', () => {
  const collected = (url: string, transcript: string) => ({
    id: lectureId(url, url),
    title: transcript,
    url,
    transcript,
    collectedAt: 1,
  });

  it('accumulates two YouTube videos instead of replacing the first', () => {
    // End to end over the actual bug: `addLecture` was doing exactly what it
    // should, on ids that could not tell two videos apart.
    const first = collected('https://www.youtube.com/watch?v=aaaaaaaaaaa', 'first');
    const second = collected('https://www.youtube.com/watch?v=bbbbbbbbbbb', 'second');

    const collection = addLecture(addLecture([], first), second);

    expect(collection).toHaveLength(2);
    expect(collection.map((item) => item.transcript)).toEqual(['first', 'second']);
  });

  it('still replaces in place when the same video is collected twice', () => {
    const once = collected('https://www.youtube.com/watch?v=aaaaaaaaaaa', 'first pass');
    const again = collected('https://www.youtube.com/watch?v=aaaaaaaaaaa&t=120s', 'second pass');

    const collection = addLecture(addLecture([], once), again);

    expect(collection).toHaveLength(1);
    expect(collection[0].transcript).toBe('second pass');
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
