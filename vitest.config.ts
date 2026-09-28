import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Tests run in `node` by default, because almost all of them are pure.
 *
 * The handful that need a DOM are named `*.dom.test.ts` and declare
 * `// @vitest-environment jsdom` in their own first line. That declaration is
 * not redundant: this config used to route those files with
 * `environmentMatchGlobs`, which **Vitest 4 removed**, so the glob silently
 * stopped applying and the only thing keeping those files in jsdom is the
 * docblock. The naming is kept because it says what a file needs at a glance,
 * and because `test.projects` could route on it again later.
 *
 * Keeping `node` as the default is deliberate rather than incidental: booting
 * jsdom for all 543 tests costs seconds on every run, and the pure half of the
 * codebase is the half that gets edited most.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
