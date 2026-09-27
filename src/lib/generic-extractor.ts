/**
 * Platform-agnostic transcript extraction.
 *
 * Bespoke extractors only cover the sites someone thought to write code for.
 * This one covers anything built on a standard HTML5 player — which is most of
 * the lecture-capture and LMS world (Panopto, Kaltura, Echo360, Canvas Studio,
 * Moodle, edX, and the countless self-hosted players behind university logins)
 * — by going after the caption data itself rather than a site's markup.
 *
 * Three routes, cheapest and most reliable first:
 *
 *   1. `video.textTracks` — the browser has already parsed the cues, and gives
 *      us precise start *and* end times. Better data than any DOM scrape.
 *   2. `<track src>` — fetch the caption file and parse it ourselves.
 *   3. Resource timing — find caption files the player fetched dynamically
 *      (the usual case for adaptive players that never emit a <track>).
 *
 * Verified against a standard HTML5 player: all three routes resolved, and
 * route 1 returned cues with real end times.
 */

import {
  parseCaptionFile,
  looksLikeCaptionFile,
  cleanCueText,
  toBracketTranscript,
  type TimedCue,
} from './caption-formats';

export interface GenericTrackInfo {
  label: string;
  language: string;
  kind: string;
  /** How this track was found, for diagnostics in the UI. */
  via: 'texttrack' | 'element' | 'network';
  /** Index into `video.textTracks`, when that is how we reach it. */
  index?: number;
  url?: string;
}

export interface GenericVideoInfo {
  title: string;
  duration: string;
}

const CAPTION_KINDS = new Set(['subtitles', 'captions']);
const CAPTION_URL = /\.(vtt|srt)(\?|#|$)/i;

/* -------------------------------------------------------------------------- */
/* Page probing                                                                */
/* -------------------------------------------------------------------------- */

/** The largest `<video>` on the page — the lecture, not a thumbnail preview. */
export function findPrimaryVideo(): HTMLVideoElement | null {
  const videos = [...document.querySelectorAll('video')];
  if (videos.length === 0) return null;

  const scored = videos
    .map((video) => ({
      video,
      // Prefer something playing, then something with real duration, then size.
      score:
        (video.currentTime > 0 || !video.paused ? 1e9 : 0) +
        (Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : 0) +
        video.clientWidth * video.clientHeight,
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0].video;
}

/** Any page with a video element is a candidate; caption discovery decides the rest. */
export function isGenericVideoPage(): boolean {
  return findPrimaryVideo() !== null;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Unknown';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function metaContent(...selectors: string[]): string | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLMetaElement>(selector);
    const value = el?.content?.trim();
    if (value) return value;
  }
  return null;
}

export function getGenericVideoInfo(): GenericVideoInfo | null {
  const video = findPrimaryVideo();
  if (!video) return null;

  const heading = document.querySelector('h1')?.textContent?.trim();
  const title =
    metaContent('meta[property="og:title"]', 'meta[name="title"]') ||
    (heading && heading.length > 2 ? heading : null) ||
    document.title.trim() ||
    'Video';

  return { title, duration: formatDuration(video.duration) };
}

/* -------------------------------------------------------------------------- */
/* Track discovery                                                             */
/* -------------------------------------------------------------------------- */

function absolute(url: string): string {
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
}

/** Caption files the player fetched, found via the resource timing buffer. */
function captionUrlsFromNetwork(): string[] {
  try {
    return [
      ...new Set(
        performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => CAPTION_URL.test(name)),
      ),
    ];
  } catch {
    return [];
  }
}

/** Everything we can see, across all three routes. */
export function listGenericTracks(): GenericTrackInfo[] {
  const tracks: GenericTrackInfo[] = [];
  const video = findPrimaryVideo();

  if (video) {
    [...video.textTracks].forEach((track, index) => {
      if (!CAPTION_KINDS.has(track.kind)) return;
      tracks.push({
        label: track.label || track.language || `Track ${index + 1}`,
        language: track.language || '',
        kind: track.kind,
        via: 'texttrack',
        index,
      });
    });
  }

  for (const el of document.querySelectorAll<HTMLTrackElement>('track[src]')) {
    if (!CAPTION_KINDS.has(el.kind)) continue;
    tracks.push({
      label: el.label || el.srclang || 'Caption file',
      language: el.srclang || '',
      kind: el.kind || 'captions',
      via: 'element',
      url: absolute(el.getAttribute('src') || ''),
    });
  }

  for (const url of captionUrlsFromNetwork()) {
    tracks.push({ label: 'Detected caption file', language: '', kind: 'captions', via: 'network', url });
  }

  return tracks;
}

/**
 * Rank tracks so we pick a useful one by default.
 *
 * Human-authored beats auto-generated, and the page's own language beats an
 * arbitrary translation — a learner almost always wants the track matching the
 * audio they are listening to.
 */
function rankTracks(tracks: GenericTrackInfo[], preferredLanguage?: string): GenericTrackInfo[] {
  const preferred = (preferredLanguage || document.documentElement.lang || 'en')
    .toLowerCase()
    .slice(0, 2);

  return [...tracks].sort((a, b) => score(b) - score(a));

  function score(track: GenericTrackInfo): number {
    let value = 0;
    if (track.language.toLowerCase().startsWith(preferred)) value += 100;
    if (!/auto|asr|generated/i.test(track.label)) value += 20;
    // A parsed TextTrack is cheaper and carries end times, so prefer it.
    if (track.via === 'texttrack') value += 10;
    else if (track.via === 'element') value += 5;
    return value;
  }
}

/* -------------------------------------------------------------------------- */
/* Extraction routes                                                           */
/* -------------------------------------------------------------------------- */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Read cues out of a `TextTrack`.
 *
 * Cues only populate once a track is not `disabled`, so we switch it to
 * `hidden` (loads without drawing captions over the video), poll briefly, then
 * put the mode back exactly as we found it — the user's caption setting is
 * theirs, and silently turning subtitles on would be a visible side effect.
 */
async function readTextTrack(track: TextTrack, timeoutMs = 3000): Promise<TimedCue[]> {
  const originalMode = track.mode;
  try {
    if (track.mode === 'disabled') track.mode = 'hidden';

    const deadline = Date.now() + timeoutMs;
    while ((!track.cues || track.cues.length === 0) && Date.now() < deadline) {
      await sleep(100);
    }

    if (!track.cues || track.cues.length === 0) return [];

    const cues: TimedCue[] = [];
    for (const raw of [...track.cues]) {
      const cue = raw as VTTCue;
      const text = cleanCueText(cue.text ?? '');
      if (!text) continue;
      cues.push({
        startSeconds: cue.startTime,
        endSeconds: Number.isFinite(cue.endTime) && cue.endTime > cue.startTime ? cue.endTime : null,
        text,
      });
    }
    return cues;
  } finally {
    track.mode = originalMode;
  }
}

/** Fetch and parse a caption file. */
async function readCaptionUrl(url: string): Promise<TimedCue[]> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return [];
    const body = await response.text();
    // Gated endpoints answer 200 with an HTML error page or an empty body;
    // parsing that would produce a confident, empty result.
    if (!looksLikeCaptionFile(body)) return [];
    return parseCaptionFile(body);
  } catch {
    return [];
  }
}

/**
 * Extract a transcript from any HTML5 player, trying each route in turn.
 *
 * Returns the same `[MM:SS] text` string the platform extractors produce, so
 * every downstream format keeps working unchanged.
 */
export async function extractGenericTranscript(preferredLanguage?: string): Promise<string> {
  const video = findPrimaryVideo();
  if (!video) {
    throw new Error('No video found on this page.');
  }

  const ranked = rankTracks(listGenericTracks(), preferredLanguage);

  if (ranked.length === 0) {
    throw new Error(
      'No captions found on this page. The video may have none, or they may load only once playback starts — try pressing play, turning captions on, then extracting again.',
    );
  }

  for (const track of ranked) {
    let cues: TimedCue[] = [];

    if (track.via === 'texttrack' && track.index !== undefined) {
      const textTrack = video.textTracks[track.index];
      if (textTrack) cues = await readTextTrack(textTrack);
    } else if (track.url) {
      cues = await readCaptionUrl(track.url);
    }

    if (cues.length > 0) return toBracketTranscript(cues);
  }

  throw new Error(
    'Found caption tracks but could not read any of them. This usually means the platform serves captions through a protected endpoint.',
  );
}

/**
 * Are there captions we can plausibly reach?
 *
 * Deliberately does not fetch anything — this runs on popup open, and probing
 * every candidate URL on a page load would be both slow and rude.
 */
export function hasGenericTranscript(): boolean {
  return listGenericTracks().length > 0;
}
