import { expect, test } from "@playwright/test";

test("Studio edits timelines and inspects GLB nodes without mounting the cinematic runtime", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Project control" })).toBeVisible();
  await expect(page.getByText("Production schema valid")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);

  await page.getByRole("button", { name: "timeline", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visual timeline" })).toBeVisible();
  await page.getByRole("listitem", { name: /Ingredients/ }).click();
  await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
  await page.getByLabel("Navigation label").fill("Ingredient proof");
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await page.getByRole("button", { name: "model", exact: true }).click();
  await page.getByLabel("Select a binary glTF model").setInputFiles("public/models/reference/burger.glb");
  await expect(page.getByText("top-bun", { exact: true })).toBeVisible();
  await expect(page.getByText("9 mapped")).toBeVisible();
});

test("Studio exposes content, deployment and real-device telemetry controls", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "integrations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "CMS and commerce" })).toBeVisible();
  await page.getByRole("button", { name: "Add static source" }).click();
  await page.getByRole("button", { name: "Validate and apply" }).click();
  await expect(page.getByText("Configuration applied.")).toBeVisible();

  await page.getByRole("button", { name: "publish", exact: true }).click();
  await expect(page.getByText("Actions / Deploy client experience / Run workflow")).toBeVisible();
  await page.getByRole("button", { name: "telemetry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Telemetry policy" })).toBeVisible();
  await expect(page.getByLabel("Sample rate")).toBeVisible();
});
