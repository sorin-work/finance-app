import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // PGlite boots a WASM Postgres per test file, which takes a moment.
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
});
