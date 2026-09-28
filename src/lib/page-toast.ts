/**
 * A short message, shown on the lecture page itself.
 *
 * A shortcut has nowhere to report to. The popup is the only surface the
 * extension normally speaks through, and pressing a key does not open it — so a
 * capture that failed because the player is DRM-protected, or succeeded and went
 * into the library, would otherwise be completely silent. Silence after a
 * keypress is indistinguishable from a shortcut that is not registered.
 *
 * In a shadow root for the same reason the note composer is: this appears over a
 * page the extension does not own, and neither side's CSS should reach the
 * other.
 */

const HOST_ID = 'transcript-extractor-toast';

export type ToastTone = 'ok' | 'warn';

const STYLE = `
  :host { all: initial; }
  .toast {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483647;
    max-width: 320px;
    padding: 10px 14px;
    border-radius: 10px;
    background: #0f172a;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
    font: 500 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .ok { color: #6ee7b7; }
  .warn { color: #fcd34d; }
`;

/**
 * Replace any toast already showing rather than stacking.
 *
 * Holding the shortcut down repeats it, and a column of identical notices
 * climbing the screen is worse than the one message being correct.
 */
export function showPageToast(message: string, tone: ToastTone = 'ok'): void {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  const root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLE;

  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  toast.textContent = message;

  root.append(style, toast);
  document.body.appendChild(host);

  setTimeout(() => {
    // Only if it is still the toast this call put up; a later message will have
    // replaced the node and should keep its own full time on screen.
    if (document.getElementById(HOST_ID) === host) host.remove();
  }, 2600);
}
