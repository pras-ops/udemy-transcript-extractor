import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

/**
 * Apply the saved theme before first paint.
 *
 * This previously forced light mode unconditionally and registered a
 * `prefers-color-scheme` listener that re-forced it, so the popup's own dark
 * mode toggle was undone whenever the OS theme changed. The stored preference
 * is the single source of truth; the system preference is only the default for
 * a user who has never chosen.
 */
const THEME_KEY = 'transcript-extractor-theme';

function applyStoredTheme() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch {
    // Storage can be unavailable; fall through to the system preference.
  }

  const prefersDark =
    stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches;

  document.documentElement.classList.toggle('dark', stored === 'dark' || prefersDark);
}

applyStoredTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
