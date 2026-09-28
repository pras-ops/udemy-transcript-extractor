/**
 * Theme, shared by the popup and the dashboard.
 *
 * Both entry points have to apply the stored preference before first paint or
 * the page flashes the wrong colours, and both have to agree on where that
 * preference lives — a dashboard that opens light while the popup is dark
 * reads as two different products.
 */

export const THEME_KEY = 'transcript-extractor-theme';

export type Theme = 'light' | 'dark';

/**
 * The theme to show now.
 *
 * A stored choice always wins. The system preference is only the default for
 * someone who has never chosen — reapplying it over an explicit choice is how
 * a theme toggle ends up appearing not to work.
 */
export function resolveTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch {
    // Storage can be unavailable; fall through to the system preference.
  }

  if (stored === 'dark' || stored === 'light') return stored;

  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  return prefersDark ? 'dark' : 'light';
}

/** Put the theme on the document. Safe to call before React mounts. */
export function applyTheme(theme: Theme = resolveTheme()): Theme {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  return theme;
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // A preference that cannot be saved is a smaller problem than a crash.
  }
  applyTheme(theme);
}
