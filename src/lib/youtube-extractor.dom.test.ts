// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://www.youtube.com/watch?v=aaaaaaaaaaa" }

/**
 * Detection is the gate everything else sits behind: the popup decides whether
 * to offer extraction from this, so a wrong answer either hides the feature on
 * a page that supports it or offers it on one that cannot.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { YouTubeExtractor } from './youtube-extractor';

afterEach(() => {
  window.history.pushState({}, '', '/watch?v=aaaaaaaaaaa');
});

describe('isYouTubeVideoPage', () => {
  it('recognises a watch page', () => {
    expect(YouTubeExtractor.isYouTubeVideoPage()).toBe(true);
  });

  it('still recognises it with a playlist and a start time attached', () => {
    window.history.pushState({}, '', '/watch?v=aaaaaaaaaaa&list=PL123&t=90s');
    expect(YouTubeExtractor.isYouTubeVideoPage()).toBe(true);
  });

  it('declines the parts of YouTube that are not a video', () => {
    for (const path of ['/', '/feed/subscriptions', '/results?search_query=gradient']) {
      window.history.pushState({}, '', path);
      expect(YouTubeExtractor.isYouTubeVideoPage()).toBe(false);
    }
  });
});
