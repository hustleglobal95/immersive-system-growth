import { expect, test } from "@playwright/test";

test("production interaction graph follows NOCTERRA scene state and inquiry lifecycle", async ({ page }) => {
  await page.goto("/lab");
  const hud = page.locator(".debug-hud");
  await expect(hud).toBeVisible();
  await expect(hud).toContainText("interaction");
  await expect(hud).toContainText("idle");

  await page.locator("#detail").scrollIntoViewIfNeeded();
  await expect(hud).toContainText("Automotive Detail");
  await expect(hud).toContainText("inspecting");
  await expect(hud).toContainText("enter-detail");

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("forge:interaction-event", {
      detail: { type: "hotspot-open", target: "coachwork" },
    }));
  });
  await expect(hud).toContainText("open-hotspot");
  await expect(hud).toContainText("graph guardok");

  await page.locator("#threshold").scrollIntoViewIfNeeded();
  await expect(hud).toContainText("Threshold");
  await expect(hud).toContainText("enter-threshold");

  await page.locator("#horizon").scrollIntoViewIfNeeded();
  await expect(hud).toContainText("Horizon");
  await expect(hud).toContainText("enter-horizon");

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("forge:interaction-event", {
      detail: { type: "click", target: "cta-private-presentation" },
    }));
  });
  await expect(hud).toContainText("inquiry");
  await expect(hud).toContainText("request-private");
  await expect(hud).toContainText("graph guardok");
});
