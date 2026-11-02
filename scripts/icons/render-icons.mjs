// Renders public/icon.svg into the PNG app icons the PWA manifest and iOS need.
// Run after editing the SVG: node scripts/icons/render-icons.mjs
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const svg = await readFile(new URL('../../public/icon.svg', import.meta.url), 'utf8');
const out = (name) =>
  new URL(`../../public/${name}`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1');

// [file, size, inner scale]: maskable icons keep the art inside the 80 % safe circle.
const ICONS = [
  ['pwa-192.png', 192, 1],
  ['pwa-512.png', 512, 1],
  ['pwa-maskable-512.png', 512, 0.78],
  ['apple-touch-icon.png', 180, 1],
  ['favicon-32.png', 32, 1],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, scale] of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * scale);
  await page.setContent(
    `<body style="margin:0;background:#0d0f12;display:grid;place-items:center;width:${size}px;height:${size}px">
       <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
     </body>`,
  );
  await page.screenshot({ path: out(file), omitBackground: false });
  console.log('wrote', file);
}
await browser.close();
