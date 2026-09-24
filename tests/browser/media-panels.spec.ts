import { test, expect } from "@playwright/test";

test("Weekley media previews overlap, reverse, and respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/lab");
  await page.getByLabel("Preview media transitions (illustrations)").check();
  const first = page.locator('[data-media-panel="0"]');
  await expect(first).toHaveCSS("visibility", "visible");
  expect(await page.locator("[data-media-panel]").count()).toBeLessThanOrEqual(3);

  await page.locator("#personalize").scrollIntoViewIfNeeded();
  await expect(page.locator('[data-media-panel="3"]')).toHaveCSS("visibility", "visible");

  await page.locator("#find").scrollIntoViewIfNeeded();
  await expect(first).toHaveCSS("visibility", "visible");

  await page.getByLabel("Reduced motion", { exact: true }).check();
  await expect(page.locator(".cinematic-media")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
