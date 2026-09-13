import { test, expect } from "@playwright/test";

test("DOM choreography reverses and reduced motion restores readable baseline", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const heading = page.locator('[data-motion-scene="0"] h1');
  const y = () => heading.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42);
  await expect.poll(y).toBeGreaterThan(5);
  await page.locator('a[href="#horizon"]').first().click();
  await expect.poll(y).toBeLessThan(.1);
  await page.locator('a[href="#arrival"]').first().click();
  await expect.poll(y).toBeGreaterThan(5);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(y).toBe(0);
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(y).toBeGreaterThan(5);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(y).toBeLessThanOrEqual(10.1);
});
