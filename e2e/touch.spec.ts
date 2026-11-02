import { expect, test, type Page } from '@playwright/test';

const speed = async (page: Page) =>
  Number(await page.getByTestId('dashboard').getAttribute('data-speed'));

test.describe('mobile touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch flow');

  /** Real touch events (not a mouse), held like a finger on the button. */
  async function touchHold(page: Page, name: string) {
    const button = page.getByRole('button', { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    if (!box) throw new Error(`${name} button not visible`);
    const cdp = await page.context().newCDPSession(page);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    return () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  test('holding the on-screen throttle accelerates; brake and reset stop it', async ({ page }) => {
    await page.goto('/');
    let lift = await touchHold(page, '油門');
    await expect.poll(() => speed(page), { timeout: 5000 }).toBeGreaterThan(20);
    await lift();

    lift = await touchHold(page, '煞車');
    await expect.poll(() => speed(page), { timeout: 8000 }).toBe(0);
    await lift();

    lift = await touchHold(page, '油門');
    await expect.poll(() => speed(page), { timeout: 5000 }).toBeGreaterThan(5);
    await lift();
    await page.getByRole('button', { name: '重置', exact: true }).tap();
    await expect.poll(() => speed(page)).toBe(0);
  });

  test('two fingers: hold the clutch and tap a shift', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('kind-manual').click();
    const gear = page.getByTestId('gear-indicator');
    await expect(gear).toHaveText('N');
    const centre = async (name: string) => {
      const button = page.getByRole('button', { name, exact: true });
      await button.scrollIntoViewIfNeeded();
      const box = await button.boundingBox();
      if (!box) throw new Error(`${name} button not visible`);
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const clutch = { ...(await centre('離合')), id: 1 };
    const up = { ...(await centre('升檔')), id: 2 };
    const cdp = await page.context().newCDPSession(page);
    type Touch = { x: number; y: number; id: number };
    const touch = (type: 'touchStart' | 'touchEnd', touchPoints: Touch[]) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await touch('touchStart', [clutch]);
    await touch('touchStart', [clutch, up]);
    await expect(gear).toHaveText('1');
    // Clutch still held, so idling in gear doesn't stall.
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('stall-banner')).toHaveCount(0);
    await touch('touchEnd', []);
  });

  test('has no horizontal page scroll', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
