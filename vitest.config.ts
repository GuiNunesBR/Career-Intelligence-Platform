import { defineConfig } from 'vitest/config';

// Dedicated Vitest config so the test suite does not boot the full Vite dev
// server / app middleware that vite.config.ts wires up. It also provides a
// default SQLITE_URL pointing at a throwaway database, which db/index.ts and
// the repositories read at import time. CI may override SQLITE_URL.
process.env.SQLITE_URL = process.env.SQLITE_URL || 'file:./test-sqlite.db';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'tests/**/*.test.ts'],
    // DB-backed repository tests mutate shared tables; run serially.
    fileParallelism: false,
    env: {
      SQLITE_URL: process.env.SQLITE_URL,
    },
  },
});
