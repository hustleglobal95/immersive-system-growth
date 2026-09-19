import { expect, test } from "@playwright/test";

test("production interaction graph follows Casa Lumen scene state and inquiry lifecycle", async ({ page }) => {
  await page.goto("/lab");
  const hud = page.locator(".debug-hud");
  await expect(hud).toBeVisible();
  await expect(hud).toContainText("interaction");
  await expect(hud).toContainText("observing");

  await page.locator("#threshold").scrollIntoViewIfNeeded();
  await expect(hud).toContainText("Threshold");
  await expect(hud).toContainText("inside");
  await expect(hud).toContainText("cross-threshold");

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("forge:interaction-event", {
      detail: { type: "hotspot-open", target: "stone-joint" },
    }));
  });
  await expect(hud).toContainText("open-detail");
  await expect(hud).toContainText("graph guardok");

  await page.locator("#material").scrollIntoViewIfNeeded();
  await expect(hud).toContainText("Material");
  await expect(hud).toContainText("material-study");
  await expect(hud).toContainText("enter-material");

  await page.locator("#horizon").scrollIntoViewIfNeeded();
  await expect(hud).toContainText("Horizon");
  await expect(hud).toContainText("reach-horizon");

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("forge:interaction-event", {
      detail: { type: "click", target: "cta-inquiry" },
    }));
  });
  await expect(hud).toContainText("inquiry");
  await expect(hud).toContainText("request-inquiry");
  await expect(hud).toContainText("graph guardok");
});
