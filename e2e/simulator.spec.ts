import { expect, test, type Page } from '@playwright/test';

const speed = async (page: Page) =>
  Number(await page.getByTestId('dashboard').getAttribute('data-speed'));
const rpm = async (page: Page) =>
  Number(await page.getByTestId('dashboard').getAttribute('data-rpm'));

test.describe('desktop keyboard', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard flow');

  test('select bike → change rollers → hold ↑ → speed rises', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('bike-select').selectOption('sym-jet-sl-125');
    await expect(page.getByTestId('roller-set')).toHaveValue('12');
    await page.getByTestId('roller-set').selectOption('10');
    await expect(page.getByTestId('roller-set')).toHaveValue('10');

    // Give focus back to the page so arrow keys drive the bike, not the <select>.
    await page.locator('h1').click();
    expect(await speed(page)).toBe(0);

    await page.keyboard.down('ArrowUp');
    await expect.poll(() => speed(page), { timeout: 5000 }).toBeGreaterThan(30);
    expect(await rpm(page)).toBeGreaterThan(4000);
    await page.keyboard.up('ArrowUp');

    await page.keyboard.down('ArrowDown');
    await expect.poll(() => speed(page), { timeout: 8000 }).toBe(0);
    await page.keyboard.up('ArrowDown');
  });

  test('Space times a launch; R resets', async ({ page }) => {
    await page.goto('/');
    await page.locator('h1').click();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('timer-phase')).toHaveAttribute('data-phase', 'armed');

    await page.keyboard.down('ArrowUp');
    await expect(page.getByTestId('timer-phase')).toHaveAttribute('data-phase', 'running');
    const split60 = page.getByTestId('timer-splits').getByText('0–60 km/h').locator('..');
    await expect(split60).not.toContainText('—', {
      timeout: 10_000,
    });
    await page.keyboard.up('ArrowUp');

    await page.keyboard.press('KeyR');
    await expect.poll(() => speed(page)).toBe(0);
  });
});

test.describe('mobile touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch flow');

  test('holding the on-screen throttle accelerates', async ({ page }) => {
    await page.goto('/');
    const throttle = page.getByRole('button', { name: '油門' });
    await throttle.scrollIntoViewIfNeeded();
    const box = await throttle.boundingBox();
    if (!box) throw new Error('throttle button not visible');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(() => speed(page), { timeout: 5000 }).toBeGreaterThan(20);
    await page.mouse.up();
  });

  test('has no horizontal page scroll', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('manual bike', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard flow');

  test('clutch → 1st → rev → release clutch → upshift', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('kind-manual').click();
    await page.getByTestId('bike-select').selectOption('kawasaki-ninja-400');
    await page.locator('h1').click();
    const gear = page.getByTestId('gear-indicator');
    await expect(gear).toHaveText('N');

    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowRight');
    await expect(gear).toHaveText('1');
    await page.keyboard.down('ArrowUp');
    await expect.poll(() => rpm(page)).toBeGreaterThan(6000);
    await page.keyboard.up('Shift');

    await expect.poll(() => speed(page), { timeout: 5000 }).toBeGreaterThan(30);
    await expect(page.getByTestId('stall-banner')).toHaveCount(0);

    const before = await rpm(page);
    await page.keyboard.press('ArrowRight');
    await expect(gear).toHaveText('2');
    await expect.poll(() => rpm(page)).toBeLessThan(before);
    await page.keyboard.up('ArrowUp');
  });

  test('dumping the clutch at idle stalls; Enter restarts in neutral', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('kind-manual').click();
    await page.locator('h1').click();
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('stall-banner')).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('gear-indicator')).toHaveText('N');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('stall-banner')).toHaveCount(0);
  });
});

test.describe('drag race', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard flow');
  // Headless Chromium renders WebGL on the CPU; a smaller canvas keeps the
  // real-time race smooth enough that UI waits don't time out.
  test.use({ viewport: { width: 900, height: 700 } });

  /** Garage: custom track at `distance` m, keep the bike, stock tune, novice opponent. */
  async function enterRace(page: Page, distance: number) {
    await page.goto('/');
    await page.getByTestId('mode-race').click();
    await page.getByTestId('discipline-drag').click();
    await page.getByTestId('track-custom').click();
    await page.getByTestId('race-distance').fill(String(distance));
    await page.getByTestId('wizard-next').click(); // → bike
    await page.getByTestId('wizard-next').click(); // → tune
    await page.getByTestId('wizard-next').click(); // → opponent
    await page.getByTestId('opponent-skill-novice').click();
    await page.getByTestId('wizard-next').click(); // → race
    await expect(page.getByTestId('race-canvas')).toBeVisible();
    await page.locator('h1').click();
  }

  test('garage → stage → tree → launch on green → result', async ({ page }) => {
    await enterRace(page, 201);
    await page.keyboard.press('Space');
    await expect(page.getByTestId('race-hint')).toContainText('注意燈號');
    await expect(page.getByTestId('race-hint')).toHaveCount(0, { timeout: 6000 });
    // React like a person: under 0.1 s after green counts as a jump start.
    await page.waitForTimeout(300);
    await page.keyboard.down('ArrowUp');
    await expect(page.getByTestId('race-hint')).toContainText('起步反應');

    await expect(page.getByTestId('race-result')).toBeVisible({ timeout: 30_000 });
    await page.keyboard.up('ArrowUp');
    await expect(page.getByTestId('race-result')).toContainText('SYM JET SL 125');

    await page.keyboard.press('Space');
    await expect(page.getByTestId('race-result')).toHaveCount(0);
    await expect(page.getByTestId('race-hint')).toHaveText('已就位。按 Space 開始倒數');

    await page.getByTestId('back-to-garage').click();
    await expect(page.getByTestId('tune-estimate')).toBeVisible();
  });

  test('jumping the start is a red-light loss', async ({ page }) => {
    await enterRace(page, 100);
    await page.keyboard.press('Space');
    await page.keyboard.down('ArrowUp');
    await expect(page.getByTestId('race-result')).toContainText('搶跑', { timeout: 30_000 });
    await page.keyboard.up('ArrowUp');
  });
});

test.describe('circuit race', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard flow');
  test.use({ viewport: { width: 900, height: 700 } });

  test('lights out → throttle → camera toggle → steering keys lean the bike', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mode-race').click();
    await page.getByTestId('discipline-circuit').click();
    await page.getByTestId('circuit-practice-park').click();
    for (let i = 0; i < 4; i++) await page.getByTestId('wizard-next').click();
    await expect(page.getByTestId('circuit-canvas')).toBeVisible();
    await page.locator('h1').click();

    await page.keyboard.press('Space');
    await expect(page.getByTestId('circuit-hint')).toHaveCount(0, { timeout: 12_000 });
    await page.waitForTimeout(300);
    await page.keyboard.down('ArrowUp');
    await expect(page.getByTestId('circuit-hint')).toContainText('起步反應');
    const speed = async () => Number(await page.getByTestId('circuit-speed').textContent());
    await expect.poll(speed, { timeout: 10_000 }).toBeGreaterThan(40);

    await expect(page.getByTestId('camera-toggle')).toContainText('切到第一人稱');
    await page.keyboard.press('KeyV');
    await expect(page.getByTestId('camera-toggle')).toContainText('切到第三人稱');

    await page.keyboard.down('ArrowLeft');
    await expect
      .poll(async () => (await page.getByLabel(/壓車角/).getAttribute('aria-label')) ?? '', {
        timeout: 5000,
      })
      .not.toBe('壓車角 0 度');
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowUp');
  });

  test('going under the red lights is a jump start, served on the grid', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mode-race').click();
    await page.getByTestId('discipline-circuit').click();
    for (let i = 0; i < 4; i++) await page.getByTestId('wizard-next').click();
    await expect(page.getByTestId('circuit-canvas')).toBeVisible();
    await page.locator('h1').click();

    await page.keyboard.press('Space');
    await expect(page.getByTestId('start-lights')).toHaveAttribute('data-lit', '2', {
      timeout: 5000,
    });
    await page.keyboard.down('ArrowUp');
    await expect(page.getByTestId('circuit-hint')).toContainText('偷跑', { timeout: 10_000 });
    await page.keyboard.up('ArrowUp');
  });
});

test.describe('street mode', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard flow');
  test.use({ viewport: { width: 900, height: 700 } });
  test.setTimeout(180_000);

  test('pick a bike and conditions, ride off into the city', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mode-street').click();
    // Bikes are grouped by body style and displacement.
    await page.getByTestId('style-maxi-scooter').click();
    await page.getByTestId('band-to249').click();
    await page.getByTestId('street-bike-yamaha-nmax-155').click();
    await page.getByTestId('time-dusk').click();
    await page.getByTestId('traffic-none').click();
    await page.getByTestId('street-go').click();
    await expect(page.getByTestId('street-canvas')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('street-district')).not.toBeEmpty({ timeout: 30_000 });
    await expect(page.getByTestId('street-road')).toHaveText('建楠路');
    await page.locator('h1').click();
    await page.keyboard.down('ArrowUp');
    const speed = async () => Number(await page.getByTestId('street-speed').textContent());
    await expect.poll(speed, { timeout: 30_000 }).toBeGreaterThan(20);
    await page.keyboard.up('ArrowUp');
    await page.getByTestId('street-back').click();
    await expect(page.getByTestId('street-go')).toBeVisible();
  });

  test('open the big map, search a landmark and navigate there', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mode-street').click();
    await page.getByTestId('traffic-none').click();
    await page.getByTestId('street-go').click();
    await expect(page.getByTestId('street-road')).toHaveText('建楠路', { timeout: 30_000 });
    await page.locator('h1').click();
    await page.keyboard.press('KeyM');
    await expect(page.getByTestId('street-map')).toBeVisible();
    await page.getByTestId('map-search').fill('右昌國民中學');
    await page.getByTestId('map-results').getByText('高雄市立右昌國民中學').click();
    await expect(page.getByTestId('map-route')).toContainText('km');
    await page.getByTestId('map-start').click();
    await expect(page.getByTestId('street-map')).toBeHidden();
    await expect(page.getByTestId('nav-card')).toBeVisible();
    await expect(page.getByTestId('nav-text')).not.toBeEmpty();
    await page.getByTestId('nav-cancel').click();
    await expect(page.getByTestId('nav-card')).toBeHidden();
  });
});
