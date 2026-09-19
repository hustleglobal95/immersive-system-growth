import { expect, test } from "@playwright/test";

test("Studio exposes the guided product shell and keyboard command palette", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");

  await expect(page.getByRole("heading", { level: 1, name: /Forge Studio/ })).toBeAttached();
  await expect(page.locator(".studio-intelligence-dock")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Guided Build/ })).toBeVisible();

  await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
  await expect(page.getByRole("dialog", { name: "Go anywhere. Do anything." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Creative Agent", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Go anywhere. Do anything." })).toHaveCount(0);

  await page.getByText("Assist", { exact: true }).click();
  await expect(page.getByRole("link", { name: /Creative Agent/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Director/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Asset Creator/ })).toBeVisible();
});

test("Guided Build remains reachable and its project escape hatch stays visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/studio");
  await page.getByRole("button", { name: /Guided Build/ }).click();
  await expect(page.getByRole("dialog", { name: "Build the project without learning the machinery." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a different project" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Build the project without learning the machinery." })).toHaveCount(0);
});

test("Ship is guided by default and owner credentials stay behind Advanced", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Ship", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review, hand off and publish" })).toBeVisible();
  await expect(page.getByText("GUIDED SHIP")).toBeVisible();
  await expect(page.getByLabel("Owner publish secret")).toHaveCount(0);
  await expect(page.getByText("Actions / Deploy client experience / Run workflow")).toHaveCount(0);

  await page.getByRole("button", { name: "Advanced setup" }).click();
  await expect(page.getByLabel("Owner publish secret")).toHaveAttribute("type", "password");
  await expect(page.getByText("Actions / Deploy client experience / Run workflow")).toBeVisible();
});
