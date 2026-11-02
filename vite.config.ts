/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; the deploy job sets this.
  // Dev, preview and e2e stay at the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    // Installable app (home screen, no browser bars) that also plays offline.
    // The service worker only exists in production builds, never in `npm run dev`.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: 'Scooter Dyno Simulator 機車模擬器',
        short_name: '機車模擬器',
        description: '機車動力模擬器：馬力機、直線加速、賽道繞圈、楠梓街景。',
        lang: 'zh-Hant-TW',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        // Android hides the status bar too; iOS falls back to standalone.
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        theme_color: '#0d0f12',
        background_color: '#0d0f12',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything, including the 3D chunks and the city map, so every mode works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
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
