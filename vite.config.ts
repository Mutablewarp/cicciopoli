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
  },
} as never);
