// @vitest-environment jsdom

/**
 * `findPrimaryVideo` decides which element three features act on: the seek a
 * timestamp performs, the frame a capture crops, and the moment a quick note is
 * filed at. Picking a thumbnail preview over the lecture would send all three
 * to the wrong place, silently.
 *
 * jsdom has no layout engine, so `clientWidth`, `duration` and `paused` have to
 * be defined rather than rendered. That is the point of the helper below: the
 * scoring is what is under test, not the browser's geometry.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { findPrimaryVideo, isGenericVideoPage } from './generic-extractor';

interface FakeVideo {
  duration?: number;
  paused?: boolean;
  currentTime?: number;
  width?: number;
  height?: number;
}

function addVideo(shape: FakeVideo = {}): HTMLVideoElement {
  const video = document.createElement('video');

  const fixed: Record<string, unknown> = {
    duration: shape.duration ?? NaN,
    paused: shape.paused ?? true,
    currentTime: shape.currentTime ?? 0,
    clientWidth: shape.width ?? 0,
    clientHeight: shape.height ?? 0,
  };

  for (const [name, value] of Object.entries(fixed)) {
    Object.defineProperty(video, name, { value, configurable: true });
  }

  document.body.appendChild(video);
  return video;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('findPrimaryVideo', () => {
  it('finds nothing on a page with no video', () => {
    expect(findPrimaryVideo()).toBeNull();
  });

  it('takes the only video there is', () => {
    const only = addVideo();
    expect(findPrimaryVideo()).toBe(only);
  });

  it('prefers the one that is playing over a larger one that is not', () => {
    // The real case: a course page with a big promotional still and a small
    // playing lecture. Size alone would pick the wrong one.
    addVideo({ width: 1280, height: 720 });
    const playing = addVideo({ paused: false, width: 320, height: 180 });

    expect(findPrimaryVideo()).toBe(playing);
  });

  it('prefers a lecture you are partway through over an untouched one', () => {
    // Paused but at 10:00 is the lecture; paused at zero is a preview.
    addVideo({ width: 1280, height: 720 });
    const watched = addVideo({ currentTime: 600, width: 320, height: 180 });

    expect(findPrimaryVideo()).toBe(watched);
  });

  it('prefers the one with a real duration over a comparable one without', () => {
    addVideo({ width: 320, height: 180 });
    const lecture = addVideo({ duration: 900, width: 320, height: 180 });

    expect(findPrimaryVideo()).toBe(lecture);
  });

  it('lets a much larger element outweigh a duration, which is the current weighting', () => {
    // Characterising rather than endorsing. Duration counts as `seconds * 1000`
    // and size as width × height, so a full 1080p element (2.07M) outscores a
    // fifteen-minute duration (900K). On a real lecture page this is harmless —
    // the lecture is both the longest and the largest — but anyone rebalancing
    // these weights should know this test is what will tell them they did.
    const big = addVideo({ width: 1920, height: 1080 });
    addVideo({ duration: 900, width: 200, height: 120 });

    expect(findPrimaryVideo()).toBe(big);
  });

  it('prefers the longer of two lectures that both report a duration', () => {
    addVideo({ duration: 12 });
    const longer = addVideo({ duration: 900 });

    expect(findPrimaryVideo()).toBe(longer);
  });

  it('falls back to size when nothing reports a duration', () => {
    addVideo({ width: 100, height: 100 });
    const bigger = addVideo({ width: 800, height: 600 });

    expect(findPrimaryVideo()).toBe(bigger);
  });

  it('never returns null when a video exists, however little it knows', () => {
    // Every score can be zero — a paused, unloaded, unlaid-out video. Returning
    // null there would make capture and seek claim there is no video at all.
    const unknown = addVideo();
    expect(findPrimaryVideo()).toBe(unknown);
  });
});

describe('isGenericVideoPage', () => {
  it('follows whether a video is present', () => {
    expect(isGenericVideoPage()).toBe(false);
    addVideo();
    expect(isGenericVideoPage()).toBe(true);
  });
});
