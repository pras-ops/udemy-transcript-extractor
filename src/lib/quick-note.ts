/**
 * Writing a note without leaving the lecture.
 *
 * The complaint this answers is not that notes are hard to write, it is the
 * round trip: pause, alt-tab to the notes app, find the right page, type five
 * words, come back, find your place again. By the time that is done the thought
 * is gone and so is the flow. A key away, in the page, with the moment already
 * filled in, is a different thing entirely.
 *
 * The composer lives in a shadow root because it has to appear over a page this
 * extension does not own. Without one, the site's stylesheet reaches in and the
 * composer inherits whatever Udemy last said about `textarea`, and our own
 * styles leak out over the lecture.
 */

import { findPrimaryVideo } from './generic-extractor';
import { lectureId } from './collection';
import { queueNote } from './pending-notes';

const HOST_ID = 'transcript-extractor-quick-note';

/** `mm:ss`, or `h:mm:ss` past an hour. Local so the player stays dependency-free. */
function clock(total: number): string {
  const seconds = Math.max(0, Math.floor(total));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

/**
 * Whether a keystroke was meant for the page rather than for us.
 *
 * Someone typing in the site's own search box or a comment field must keep
 * their keystroke. A shortcut that steals a letter mid-word is worse than no
 * shortcut.
 */
function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || !element.tagName) return false;

  const tag = element.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable;
}

/** The lecture's name, as well as the page will say it. */
function lectureTitle(): string {
  const heading = document.querySelector('h1')?.textContent?.trim();
  if (heading) return heading;
  return document.title.replace(/\s*[|\-–]\s*Udemy.*$/i, '').trim() || 'Untitled lecture';
}

const STYLE = `
  :host { all: initial; }
  .panel {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483647;
    width: 320px;
    box-sizing: border-box;
    padding: 12px;
    border-radius: 12px;
    background: #0f172a;
    color: #f8fafc;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .at { font: 600 12px/1 ui-monospace, monospace; color: #93c5fd; }
  .what { font-size: 11px; color: #94a3b8; }
  textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 72px;
    resize: vertical;
    padding: 8px;
    border: 1px solid #334155;
    border-radius: 8px;
    background: #1e293b;
    color: #f8fafc;
    font: 400 13px/1.5 system-ui, -apple-system, sans-serif;
  }
  textarea:focus { outline: none; border-color: #3b82f6; }
  .actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  button {
    font: 600 12px/1 system-ui, -apple-system, sans-serif;
    padding: 7px 11px;
    border-radius: 7px;
    border: 0;
    cursor: pointer;
  }
  .save { background: #2563eb; color: #fff; }
  .save:hover { background: #1d4ed8; }
  .cancel { background: transparent; color: #94a3b8; }
  .cancel:hover { color: #e2e8f0; }
  .hint { margin-left: auto; font-size: 10px; color: #64748b; }
  .done { font-size: 12px; color: #6ee7b7; padding: 2px 0; }
`;

/**
 * The composer, for one note.
 *
 * Deliberately not a persistent widget: it exists between the keystroke and the
 * save, then removes itself. Nothing of ours stays on the lecture page while
 * someone is watching it.
 */
class QuickNote {
  private host: HTMLDivElement | null = null;
  private resumeOnClose = false;
  private seconds: number | undefined;

  get isOpen(): boolean {
    return this.host !== null;
  }

  open(): void {
    if (this.isOpen) return;

    const video = findPrimaryVideo();
    if (!video) return;

    // The moment is taken when the composer opens, not when it saves: that is
    // the moment being reacted to, and typing takes as long as it takes.
    this.seconds = Number.isFinite(video.currentTime) ? video.currentTime : undefined;

    // Pausing is the point. A lecture that keeps talking while you write means
    // you miss the next thing, which is the round trip all over again.
    this.resumeOnClose = !video.paused;
    if (this.resumeOnClose) video.pause();

    this.host = document.createElement('div');
    this.host.id = HOST_ID;
    const root = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLE;

    const panel = document.createElement('div');
    panel.className = 'panel';

    const row = document.createElement('div');
    row.className = 'row';
    const at = document.createElement('span');
    at.className = 'at';
    at.textContent = this.seconds === undefined ? 'No timestamp' : clock(this.seconds);
    const what = document.createElement('span');
    what.className = 'what';
    what.textContent = 'Note on this moment';
    row.append(at, what);

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'What just clicked?';

    const actions = document.createElement('div');
    actions.className = 'actions';
    const save = document.createElement('button');
    save.className = 'save';
    save.textContent = 'Save note';
    const cancel = document.createElement('button');
    cancel.className = 'cancel';
    cancel.textContent = 'Cancel';
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = 'Ctrl+Enter · Esc';
    actions.append(save, cancel, hint);

    panel.append(row, textarea, actions);
    root.append(style, panel);
    document.body.appendChild(this.host);

    textarea.focus();

    save.addEventListener('click', () => void this.save(textarea.value, panel));
    cancel.addEventListener('click', () => this.close());

    // Keys are handled on the composer itself so they never reach the player,
    // which treats bare letters as shortcuts.
    panel.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this.save(textarea.value, panel);
      }
    });
  }

  private async save(body: string, panel: HTMLElement): Promise<void> {
    const text = body.trim();
    if (!text) return;

    const url = window.location.href;
    const stored = await queueNote({
      id: `note:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      lectureId: lectureId(url, url),
      url,
      lectureTitle: lectureTitle(),
      seconds: this.seconds === undefined ? undefined : Math.floor(this.seconds),
      body: text,
      createdAt: Date.now(),
    });

    // Say where it went. "Saved" with no destination invites the reasonable
    // question of whether it is in the library yet, and it is not.
    panel.innerHTML = '';
    const done = document.createElement('div');
    done.className = 'done';
    done.textContent = stored
      ? 'Saved — it appears in your dashboard next time you open it.'
      : 'Could not save this note.';
    panel.append(done);

    setTimeout(() => this.close(), stored ? 1600 : 2600);
  }

  close(): void {
    if (!this.host) return;

    this.host.remove();
    this.host = null;

    if (this.resumeOnClose) {
      // A rejected play() is not worth surfacing: the note is saved, and the
      // user can press play themselves.
      findPrimaryVideo()
        ?.play()
        .catch(() => undefined);
      this.resumeOnClose = false;
    }
  }
}

/**
 * Listen for the shortcut on every lecture page.
 *
 * `Alt+Shift+N` rather than a bare letter: players bind single keys, and this
 * has to coexist with them. There is no background service worker to receive a
 * `chrome.commands` binding, so the listener lives here — which also puts it
 * exactly where the video is.
 */
export function installQuickNote(): () => void {
  const composer = new QuickNote();

  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
    if (event.code !== 'KeyN') return;
    if (isTyping(event.target)) return;
    if (composer.isOpen) return;
    if (!findPrimaryVideo()) return;

    event.preventDefault();
    event.stopPropagation();
    composer.open();
  };

  // Capture phase, so a player that swallows keydown on its own container does
  // not swallow this one first.
  window.addEventListener('keydown', onKeyDown, true);

  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    composer.close();
  };
}
