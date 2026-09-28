import path from 'path';
import { defineConfig } from 'vite';

/**
 * Separate build for the background service worker.
 *
 * Same reason the content script has its own build: the main multi-entry build
 * hoists anything shared between two entries into a common chunk and emits an
 * `import` to pull it in. The worker shares `frame-capture`, `library-db` and
 * `zip` with the popup, so it would pick up exactly that treatment.
 *
 * The manifest registers it without `"type": "module"`, so it is a classic
 * script and cannot use `import` at runtime. Building it alone in IIFE format
 * inlines every dependency into one self-contained file, which keeps sharing
 * code with the popup free.
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
      entry: path.resolve(__dirname, 'src/background.ts'),
      formats: ['iife'],
      name: 'TranscriptExtractorBackground',
      fileName: () => 'background.js',
    },
  },
});
