import { expect, test } from "@playwright/test";

test("production interaction graph follows scene state and custom events", async ({ page }) => {
  await page.goto("/lab");
  const hud = page.locator(".debug-hud");
  await expect(hud).toBeVisible();
  await expect(hud).toContainText("interaction");
  await expect(hud).toContainText("idle");

  await page.locator("#ingredients").scrollIntoViewIfNeeded();
  await expect(hud).toContainText("Ingredients");
  await expect(hud).toContainText("exploring");
  await expect(hud).toContainText("enter-ingredients");

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("forge:interaction", {
      detail: { name: "inspect-product", target: "product-inspect", payload: { source: "browser-test" } },
    }));
  });

  await expect(hud).toContainText("detail");
  await expect(hud).toContainText("inspect-product");
  await expect(hud).toContainText("graph guardok");
});
