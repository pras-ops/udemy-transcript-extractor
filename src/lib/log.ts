/**
 * Logging that is quiet by default.
 *
 * The extension used to write several hundred `console.log` lines per session,
 * including the first two hundred characters of the transcript it had just
 * extracted. That last part matters more than the noise: the content script
 * runs inside the lecture page, so anything logged there lands in a console
 * the site controls. Writing lecture content into it undercuts the one claim
 * this product makes about itself.
 *
 * So: `debug` and `info` are for development and vanish from a release build.
 * `warn` and `error` always survive, because a user reporting a problem needs
 * something to report — but neither should ever be handed content.
 *
 * ## What never goes in a log
 *
 * Transcript text, note or highlight bodies, screenshot data, page URLs.
 * Lengths, counts and durations are fine and are what actually help when
 * something is wrong.
 */

/**
 * Whether the noisy levels are on.
 *
 * Vite replaces `import.meta.env.DEV` at build time, so the calls are dropped
 * from the production bundle entirely rather than merely silenced.
 *
 * `__TRANSCRIPT_DEBUG__` is the escape hatch for diagnosing an installed
 * build: set it on `globalThis` from the console and reload.
 */
function verbose(): boolean {
  if (import.meta.env?.DEV) return true;
  return Boolean((globalThis as { __TRANSCRIPT_DEBUG__?: boolean }).__TRANSCRIPT_DEBUG__);
}

/** Detail useful while building. Absent from a release build. */
export function debug(...args: unknown[]): void {
  if (verbose()) console.log(...args);
}

/** Milestones worth seeing when debugging is on. */
export function info(...args: unknown[]): void {
  if (verbose()) console.info(...args);
}

/** Something recoverable went wrong. Always shown. */
export function warn(...args: unknown[]): void {
  console.warn(...args);
}

/** Something failed. Always shown, so a user can report it. */
export function error(...args: unknown[]): void {
  console.error(...args);
}

export const log = { debug, info, warn, error };
