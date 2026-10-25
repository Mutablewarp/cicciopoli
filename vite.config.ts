import { defineConfig } from 'vite';

// Relative base so the build works both on a GitHub Pages project path
// (https://USER.github.io/cicciopoli/) and on any static host root.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: 'index.html',
      // Rollup 4.64 tree-shaking folded a mutated object property to its first value and emptied the level 8
      // touch button handlers in production only (state set through Object.values()); the size cost is ~1.5 kB.
      treeshake: false,
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  server: { host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // the level reach tests simulate whole levels: allow slow / busy machines
    testTimeout: 120000,
    // the GitHub runner has few cores: parallel workers starve each other and vitest's fixed 60 s worker RPC
    // timeout fires during the long whole-shift sweeps (every test still passes); one worker there
    ...(process.env.CI ? { maxWorkers: 1, minWorkers: 1 } : {}),
  },
} as never);
