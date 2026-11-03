// Captures the lobby's background and mode-card pictures from the game itself.
//
//   npx vite build && npx vite preview --port 4173 &
//   node scripts/art/capture-art.mjs [http://localhost:4173/]
//
// Uses the real GPU where it can (sharp, fast); writes JPEGs to public/art/.
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:4173/';
const OUT = new URL('../../public/art/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const SIZE = { width: 1280, height: 720 };
const QUALITY = 72;

/** HUDs, button bars and hints drawn over the 3D picture: hidden for clean shots. */
const HIDE = `
  [class*="_hud_"], [class*="raceBar"], [class*="rotateHint"], [class*="_alert_"],
  [class*="navCard"], [class*="minimap"], [class*="_toast_"] { display: none !important; }
  [class*="_stage_"] { border: 0 !important; border-radius: 0 !important; }
`;

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
await mkdir(OUT, { recursive: true });

/** `target`: what to photograph (default: the 3D canvas). */
async function scene(name, setup, { target = 'canvas', settleMs = 3000 } = {}) {
  const page = await browser.newPage({ viewport: SIZE });
  await page.goto(BASE);
  await setup(page);
  await page.addStyleTag({ content: HIDE });
  await page.waitForTimeout(settleMs);
  await page
    .locator(target)
    .first()
    .screenshot({ path: `${OUT}${name}.jpg`, type: 'jpeg', quality: QUALITY });
  console.log('wrote', name);
  await page.close();
}

const click = (page, id) => page.getByTestId(id).click();
async function enterCircuit(page, circuitId) {
  await click(page, 'home-circuit');
  await click(page, `circuit-${circuitId}`);
  for (let i = 0; i < 4; i++) await click(page, 'wizard-next');
  await page.getByTestId('circuit-canvas').waitFor();
  await page.keyboard.press('KeyV'); // chase camera: the bikes in shot
}
async function enterStreet(page, time) {
  await click(page, 'home-street');
  await click(page, `time-${time}`);
  await click(page, 'street-go');
  await page.getByTestId('street-road').waitFor({ timeout: 90_000 });
  await page.keyboard.press('KeyV');
}

await scene('lobby', (p) => enterStreet(p, 'dusk'), { settleMs: 5000 });
await scene('street', (p) => enterStreet(p, 'day'), { settleMs: 5000 });
await scene('circuit', (p) => enterCircuit(p, 'south-bay'));
await scene('room', (p) => enterCircuit(p, 'hill-town'));
await scene('drag', async (p) => {
  await click(p, 'home-drag');
  for (let i = 0; i < 4; i++) await click(p, 'wizard-next');
  await p.getByTestId('race-canvas').waitFor();
});
await scene(
  'simulator',
  async (p) => {
    await click(p, 'home-simulator');
    await p.locator('h1').click();
    await p.keyboard.down('ArrowUp');
    await p.waitForTimeout(2500);
  },
  // Just the bike's own dashboard, revving.
  { target: '[class*="dashboard"]', settleMs: 300 },
);
await browser.close();
