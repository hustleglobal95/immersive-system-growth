import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('unreadable Studio drafts stay intact and can be exported for recovery', async ({ page }) => {
  const raw = '{"future-schema":42,"unfinished":';
  await page.addInitScript(value => localStorage.setItem('forge-studio-v2', value), raw);
  await page.goto('/studio');
  await expect(page.getByTestId('studio-storage-warning')).toContainText('original contents are preserved');
  await expect(page.getByRole('button', { name: 'Export recovery copy' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('forge-studio-v2'))).toBe(raw);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export recovery copy' }).click();
  const recovery = await downloaded;
  expect(recovery.suggestedFilename()).toBe('forge-draft-recovery.json');
  const path = await recovery.path();
  expect(path).not.toBeNull();
  expect(await readFile(path!, 'utf8')).toBe(raw);
  // Neither exporting nor rendering the workspace may overwrite the original.
  expect(await page.evaluate(() => localStorage.getItem('forge-studio-v2'))).toBe(raw);
});

test('storage write failures keep the editor usable and JSON export available', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key === 'forge-studio-v2') throw new DOMException('Test quota', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  });
  await page.goto('/studio');
  await expect(page.getByTestId('studio-storage-warning')).toContainText('Changes are only in memory');
  await page.getByRole('button', { name: 'bank', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Asset bank', level: 2, exact: true })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe('experience.json');
  expect(errors).toEqual([]);
});
