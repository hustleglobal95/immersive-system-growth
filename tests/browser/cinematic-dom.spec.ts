import { test, expect } from "@playwright/test";

test("DOM choreography reverses and reduced motion restores readable baseline", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const openingPanel = page.locator('[data-motion-scene="0"] .story-panel');
  const panelY = () => openingPanel.evaluate((element) => {
    const value=element.style.translate.trim().split(/\s+/)[1] ?? "0";
    return Number.parseFloat(value) || 0;
  });
  await expect.poll(panelY).toBeGreaterThan(5);

  // The current Casa Lumen opening is intentionally settled. Scene 02 carries the first
  // scroll-gated headline entrance, so use one of its generated word boxes to prove seek/reverse.
  const movingWord = page.locator('[data-motion-scene="1"] [data-motion-headline] .forge-split__inner').first();
  const wordY = () => movingWord.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42);
  await expect.poll(wordY).toBeGreaterThan(5);

  await page.locator('a[href="#material"]').first().click();
  await expect.poll(wordY).toBeLessThan(.1);
  await page.locator('a[href="#parti"]').first().click();
  await expect.poll(wordY).toBeGreaterThan(5);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(openingPanel).toBeVisible();
  await expect(openingPanel).toHaveCSS("opacity", "1");
  await expect.poll(() => openingPanel.evaluate((element) => element.style.translate)).toBe("");
  await expect.poll(() => openingPanel.evaluate((element) => element.style.filter)).toBe("");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  // We are still parked in Scene 02 after the reverse-navigation assertion above.
  // Re-enabling motion should therefore restore the active Scene 02 choreography;
  // Scene 01 is intentionally inactive and its sequencer styles remain cleared.
  await expect.poll(wordY).toBeGreaterThan(5);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(panelY).toBeLessThanOrEqual(13.3);
});
