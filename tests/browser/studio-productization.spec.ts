import { expect, test } from "@playwright/test";

test("Studio is one usable interactive site builder", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");

  await expect(page.locator("main.forge-builder")).toBeVisible();
  await expect(page.getByLabel("Project name")).toBeVisible();
  await expect(page.getByLabel("Website brief")).toBeVisible();
  await expect(page.getByRole("button", { name: "Build Website" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish Website" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Website preview" })).toBeVisible();
  await expect(page.getByLabel("Website sections")).toBeVisible();
  await expect(page.getByLabel("Headline")).toBeVisible();
  await expect(page.getByLabel("Body")).toBeVisible();
  await expect(page.getByLabel("Camera")).toBeVisible();
  await expect(page.getByRole("link", { name: "Advanced" })).toHaveCount(0);
});

test("Build Website never silently no-ops on an incomplete brief", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel("Website brief").fill("watch");
  await page.getByRole("button", { name: "Build Website" }).click();
  await expect(page.getByRole("status")).toContainText("at least one clear sentence");
});

test("main Studio does not expose subsystem dashboards", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByText("Project Vault")).toHaveCount(0);
  await expect(page.getByText("Telemetry")).toHaveCount(0);
  await expect(page.getByText("Search & AI")).toHaveCount(0);
  await expect(page.getByText("SCENE GRAPH")).toHaveCount(0);
  await expect(page.locator("details.production-advanced-menu")).toHaveCount(0);
});

test("Advanced preserves the complete production editor", async ({ page }) => {
  await page.goto("/studio/advanced");
  await expect(page.getByRole("heading", { level: 1, name: /Forge Studio/ })).toBeAttached();
  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ship", exact: true })).toBeVisible();
});

test("Studio exposes the guided product shell and keyboard command palette", async ({ page }) => {
  await page.goto("/studio/advanced");
  await expect(page.getByRole("button", { name: "Open command palette" })).toBeVisible();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
  await expect(page.getByRole("dialog", { name: "Go anywhere. Do anything." })).toBeVisible();
});
