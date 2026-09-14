import { expect, test } from '@playwright/test';

test('HELIOT reports a completed render without keeping an idle editor animating', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/studio');
  await page.getByLabel('Preview quality', { exact: true }).selectOption('low');
  await page.getByLabel('Studio project', { exact: true }).selectOption('HELIOT');
  await expect(page.locator('.studio-preview')).toHaveAttribute('data-runtime', 'heliot');
  await page.waitForFunction(() => document.documentElement.dataset.heliotReady === 'true', null, { timeout: 60000 });
  const stats = page.getByTestId('studio-render-stats');
  await expect.poll(async () => Number(await stats.getAttribute('data-calls')), { timeout: 60000 }).toBeGreaterThan(0);
  await expect.poll(async () => Number(await stats.getAttribute('data-triangles'))).toBeGreaterThan(0);
  // Observe frame count over a real interval. Publishing diagnostics must not
  // create a self-sustaining store-update -> invalidate -> diagnostics loop.
  const idleFrames = () => page.evaluate(async () => {
    const count = () => JSON.parse(document.documentElement.dataset.heliotRenderBudget || '{}').frames ?? 0;
    const before = count();
    await new Promise(resolve => setTimeout(resolve, 500));
    return count() - before;
  });
  await expect.poll(idleFrames, { timeout: 15000, intervals: [500, 1000] }).toBeLessThanOrEqual(2);
});
