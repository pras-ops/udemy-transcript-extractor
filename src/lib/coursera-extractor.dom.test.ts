// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://www.coursera.org/learn/machine-learning/lecture/abc123/gradient-descent" }

/**
 * Detection is the gate everything else sits behind: the popup decides whether
 * to offer extraction from this, so a wrong answer either hides the feature on
 * a page that supports it or offers it on one that cannot.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { CourseraExtractor } from './coursera-extractor';

const LECTURE = '/learn/machine-learning/lecture/abc123/gradient-descent';

afterEach(() => {
  window.history.pushState({}, '', LECTURE);
});

describe('isCourseraCoursePage', () => {
  it('recognises a lecture page', () => {
    expect(CourseraExtractor.isCourseraCoursePage()).toBe(true);
  });

  it('recognises a reading, which is course content with no video', () => {
    window.history.pushState({}, '', '/learn/machine-learning/reading/xyz789/notes');
    expect(CourseraExtractor.isCourseraCoursePage()).toBe(true);
  });

  it('declines the parts of Coursera that are not course content', () => {
    for (const path of ['/', '/browse', '/degrees']) {
      window.history.pushState({}, '', path);
      expect(CourseraExtractor.isCourseraCoursePage()).toBe(false);
    }
  });
});
