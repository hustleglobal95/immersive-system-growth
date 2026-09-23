import { test, expect } from "@playwright/test";

test("marketplace search, comparison and personalization work across viewports", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  await expect(page.locator("body")).toHaveAttribute("data-project", "weekley-marketplace");
  await expect(page.getByRole("heading", { name: /Find the home your life fits into/i })).toBeVisible();
  await expect(page.locator(".story-panel")).toHaveCount(0);

  await page.locator(".dw-search select").first().selectOption("Houston");
  await page.getByRole("button", { name: /Show my paths/i }).click();
  await expect(page.getByText(/Showing Houston pathways/i)).toBeVisible();
  await expect(page.locator(".dw-market-card")).toHaveCount(1);

  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.locator(".dw-compare")).toContainText("1 item selected");

  await page.locator('[data-forge-interaction="select-palette"]').filter({ hasText: "Quiet coast" }).click();
  await expect(page.locator(".dw-room__label")).toContainText("Quiet coast");
  await expect(page.locator(".dw-personalize__visual")).toHaveAttribute("data-palette", "coast");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".dw-site")).toBeVisible();
  await expect(page.locator(".dw-hero__content")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole("button", { name: /Menu/i });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.locator("#dw-navigation")).toHaveClass(/is-open/);
  await expect(page.locator("#dw-navigation").getByRole("link", { name: "Find a home" })).toBeVisible();
});
