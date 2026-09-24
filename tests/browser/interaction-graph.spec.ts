import { expect, test, type Page } from "@playwright/test";

async function dispatchInteraction(page: Page, target: string) {
  await page.evaluate((interactionTarget) => {
    window.dispatchEvent(new CustomEvent("forge:interaction-event", {
      detail: { type: "click", target: interactionTarget },
    }));
  }, target);
}

test("production interaction graph follows the Weekley marketplace lifecycle", async ({ page }) => {
  await page.goto("/lab");
  const hud = page.locator(".debug-hud");
  await expect(hud).toBeVisible();
  await expect(hud).toContainText("interaction");
  await expect(hud).toContainText("browsing");

  await dispatchInteraction(page, "market-search");
  await expect(hud).toContainText("market-search");
  await expect(hud).toContainText("run-home-search");
  await expect(hud).toContainText("browsing");
  await expect(hud).toContainText("graph guardok");

  await dispatchInteraction(page, "compare-community");
  await expect(hud).toContainText("compare-community");
  await expect(hud).toContainText("compare-market");
  await expect(hud).toContainText("comparing");
  await expect(hud).toContainText("graph guardok");

  await dispatchInteraction(page, "select-gallery");
  await expect(hud).toContainText("select-gallery");
  await expect(hud).toContainText("select-home-gallery");
  await expect(hud).toContainText("personalizing");
  await expect(hud).toContainText("graph guardok");

  await dispatchInteraction(page, "schedule-tour");
  await expect(hud).toContainText("schedule-tour");
  await expect(hud).toContainText("request-tour");
  await expect(hud).toContainText("tour-intent");
  await expect(hud).toContainText("graph guardok");
});
