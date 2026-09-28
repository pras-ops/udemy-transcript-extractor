// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://www.udemy.com/course/deep-learning/learn/lecture/42" }

/**
 * The extractors had no tests at all, which is the wrong state for the most
 * fragile code in the project: every selector here is a guess about someone
 * else's markup, and Udemy is free to change it any Tuesday.
 *
 * What these fixtures encode is the *selector contract* the extractor depends
 * on — not captured Udemy HTML. So they cannot tell you Udemy still looks like
 * this. What they can tell you is that a refactor has not broken the parsing,
 * and exactly which selector a redesign invalidated. When extraction does break
 * against the real site, the fix is to re-capture the sidebar from a live
 * lecture page and update these fixtures to match.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { UdemyExtractor } from './udemy-extractor';

/** A sidebar in the shape the primary selectors expect. */
const SIDEBAR = `
  <h1 data-purpose="course-title">Deep Learning A–Z</h1>
  <div data-purpose="instructor-name">A. Teacher</div>

  <div data-purpose="section-panel-1">
    <div class="ud-accordion-panel-title">Section 1: Foundations</div>
    <div data-purpose="section-duration">0 / 2 | 38min</div>

    <div data-purpose="curriculum-item-1" class="curriculum-item-link--is-current--2mKk4">
      <span data-purpose="item-title">What gradient descent is</span>
      <div class="ud-text-xs"><span>Video</span><span>12min</span></div>
    </div>
    <div data-purpose="curriculum-item-2">
      <span data-purpose="item-title">Backpropagation</span>
      <div class="ud-text-xs"><span>Video</span><span>26min</span></div>
    </div>
  </div>

  <div data-purpose="section-panel-2">
    <div class="ud-accordion-panel-title">Section 2: Practice</div>
    <div data-purpose="section-duration">0 / 1 | 9min</div>

    <div data-purpose="curriculum-item-3">
      <span data-purpose="item-title">Your first network</span>
      <div class="ud-text-xs"><span>Video</span><span>9min</span></div>
    </div>
  </div>
`;

afterEach(() => {
  document.body.innerHTML = '';
  window.history.pushState({}, '', '/course/deep-learning/learn/lecture/42');
});

describe('isUdemyCoursePage', () => {
  it('recognises a lecture page', () => {
    expect(UdemyExtractor.isUdemyCoursePage()).toBe(true);
  });

  it('declines a Udemy page that is not a course', () => {
    // The popup gates extraction on this; a true here on the homepage would
    // offer to extract a transcript that cannot exist.
    window.history.pushState({}, '', '/');
    expect(UdemyExtractor.isUdemyCoursePage()).toBe(false);
  });
});

describe('isTranscriptAvailable', () => {
  it('sees a transcript that is already open', () => {
    document.body.innerHTML = '<div data-purpose="transcript-cue">Welcome back.</div>';
    expect(UdemyExtractor.isTranscriptAvailable()).toBe(true);
  });

  it('reports none on a page with neither cues nor a video', () => {
    document.body.innerHTML = '<div>Nothing to see</div>';
    expect(UdemyExtractor.isTranscriptAvailable()).toBe(false);
  });
});

describe('extractCourseStructure', () => {
  it('reads the course, its sections and their lectures in order', () => {
    document.body.innerHTML = SIDEBAR;

    const course = UdemyExtractor.extractCourseStructure();

    expect(course).not.toBeNull();
    expect(course?.title).toBe('Deep Learning A–Z');
    expect(course?.instructor).toBe('A. Teacher');
    expect(course?.sections).toHaveLength(2);

    expect(course?.sections[0].title).toBe('Section 1: Foundations');
    expect(course?.sections[0].lectures.map((l) => l.title)).toEqual([
      'What gradient descent is',
      'Backpropagation',
    ]);
    expect(course?.sections[1].lectures.map((l) => l.title)).toEqual(['Your first network']);
  });

  it('pulls the duration out of the counted section label', () => {
    // The label reads "0 / 2 | 38min" — the progress count has to be discarded
    // or the course shows "0" where a running time belongs.
    document.body.innerHTML = SIDEBAR;

    expect(UdemyExtractor.extractCourseStructure()?.sections[0].duration).toBe('38min');
  });

  it('marks which lecture is being watched', () => {
    document.body.innerHTML = SIDEBAR;

    const course = UdemyExtractor.extractCourseStructure();
    const current = course?.sections[0].lectures.filter((lecture) => lecture.isCurrent);

    expect(current?.map((lecture) => lecture.title)).toEqual(['What gradient descent is']);
    expect(course?.currentLecture?.title).toBe('What gradient descent is');
  });

  it('still finds lectures when only the links survive a redesign', () => {
    // The selector cascade exists for exactly this: `data-purpose` attributes
    // are Udemy's to rename, but a lecture is always a link to a lecture.
    document.body.innerHTML = `
      <h1 data-purpose="course-title">Deep Learning A–Z</h1>
      <div data-purpose="section-panel-1">
        <div class="ud-accordion-panel-title">Section 1: Foundations</div>
        <a href="/course/deep-learning/learn/lecture/42">What gradient descent is</a>
        <a href="/course/deep-learning/learn/lecture/43">Backpropagation</a>
      </div>
    `;

    const lectures = UdemyExtractor.extractCourseStructure()?.sections[0].lectures;

    expect(lectures).toHaveLength(2);
    expect(lectures?.map((lecture) => lecture.title)).toEqual([
      'What gradient descent is',
      'Backpropagation',
    ]);
  });

  it('returns a named course with no sections rather than throwing', () => {
    // A collapsed sidebar is an ordinary state, not an error. Returning null
    // here would make the popup report a broken page.
    document.body.innerHTML = '<h1 data-purpose="course-title">Deep Learning A–Z</h1>';

    const course = UdemyExtractor.extractCourseStructure();

    expect(course?.title).toBe('Deep Learning A–Z');
    expect(course?.sections).toEqual([]);
  });

  it('falls back to readable placeholders when the page says nothing', () => {
    const course = UdemyExtractor.extractCourseStructure();

    expect(course?.title).toBe('Untitled Course');
    expect(course?.instructor).toBe('Unknown Instructor');
  });
});
