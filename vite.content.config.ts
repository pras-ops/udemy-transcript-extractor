import path from 'path';
import { defineConfig } from 'vite';

/**
 * Separate build for the content script.
 *
 * Content scripts are **always classic scripts** — both the ones declared in
 * `content_scripts` and the ones injected via `chrome.scripting.executeScript`.
 * They cannot use ESM. The main multi-entry build hoists any module shared
 * between two entries into a common chunk and emits an `import` statement to
 * pull it in, which is fine for the popup and service worker (both modules) and
 * fatal for the content script: Chrome throws
 * "Cannot use import statement outside a module" and extraction silently dies.
 *
 * Building it on its own in IIFE format inlines every dependency into one
 * self-contained file, so sharing code with the popup stays free.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    // The main build runs first and its output must survive.
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: path.resolve(__dirname, 'src/lib/content-script.ts'),
      formats: ['iife'],
      name: 'TranscriptExtractor',
      fileName: () => 'content-script.js',
    },
  },
});
