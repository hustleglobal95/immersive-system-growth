import { expect, test } from "@playwright/test";

test("Studio defaults to one simple Build Edit Finish workflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");

  await expect(page.locator("main.simple-forge")).toBeVisible();
  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();
  await expect(page.getByLabel("Website brief")).toBeVisible();
  await expect(page.getByRole("button", { name: "Build Website" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Website preview" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Advanced" })).toBeVisible();
  await expect(page.locator("details.production-advanced-menu")).toHaveCount(0);
});

test("Edit exposes direct website controls without subsystem navigation", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit the website." })).toBeVisible();
  await expect(page.getByLabel("Section name")).toBeVisible();
  await expect(page.getByLabel("Headline")).toBeVisible();
  await expect(page.getByLabel("Body")).toBeVisible();
  await expect(page.getByText("Camera", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish Website" })).toBeVisible();
});

test("Finish shows release blockers directly", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("heading", { name: /This website can ship|Finish the blockers/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish Website" })).toBeVisible();
  await expect(page.getByText("Project Vault")).toHaveCount(0);
  await expect(page.getByText("Telemetry")).toHaveCount(0);
  await expect(page.getByText("Search & AI")).toHaveCount(0);
});

test("Advanced preserves the complete production editor", async ({ page }) => {
  await page.goto("/studio/advanced");
  await expect(page.getByRole("heading", { level: 1, name: /Forge Studio/ })).toBeAttached();
  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ship", exact: true })).toBeVisible();
  await expect(page.locator("details.production-advanced-menu > summary")).toBeVisible();
});
