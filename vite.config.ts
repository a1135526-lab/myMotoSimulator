/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // Third-party vendor chunks (recharts, three) are ~500 kB raw / ~150 kB gzip.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Charting is large and changes rarely; keep it in its own cacheable chunk.
        manualChunks: { charts: ['recharts'] },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Domain and data are pure TS and run in Node; only UI/application need a DOM.
    environment: 'node',
    environmentMatchGlobs: [
      ['src/ui/**', 'jsdom'],
      ['src/application/**', 'jsdom'],
      ['src/app/**', 'jsdom'],
    ],
    setupFiles: ['./src/test/setup.ts'],
    // Circuit tests simulate whole laps; give them headroom under coverage instrumentation.
    testTimeout: 15_000,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/app/main.tsx'],
      thresholds: {
        'src/domain/**': { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  },
});
