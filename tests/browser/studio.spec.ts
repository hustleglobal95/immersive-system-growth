import { expect, test } from "@playwright/test";

async function openAdvanced(page:import("@playwright/test").Page,label:RegExp) {
  await page.locator("details.production-advanced-menu > summary").click();
  await page.getByRole("button", { name: label }).click();
}

test("Build keeps the live experience central and edits the selected scene", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");

  await expect(page.getByRole("button", { name: "Build", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".production-runtime canvas")).toHaveCount(1);
  await expect(page.getByLabel("Headline")).toBeVisible();

  const headline=page.getByLabel("Headline");
  await headline.fill("A directed cinematic scene");
  await expect(headline).toHaveValue("A directed cinematic scene");
  await expect(page.locator(".production-context")).toBeVisible();
});

test("Build prepares a reversible fast proposal before applying motion", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Add scene" }).click();
  await page.getByLabel("Forge command").fill("editorial reveal");
  await page.getByRole("button", { name: "Direct", exact: true }).click();

  const review=page.getByLabel("Forge proposal review");
  await expect(review).toBeVisible();
  await expect(review.getByRole("button", { name: "Current" })).toBeVisible();
  await expect(review.getByRole("button", { name: "Candidate" })).toHaveAttribute("aria-pressed", "true");
  await expect(review.getByRole("button", { name: "Accept candidate" })).toBeVisible();

  await review.getByRole("button", { name: "Accept candidate" }).click();
  await expect(review.getByRole("button", { name: "Revert accepted change" })).toBeVisible();
  await review.getByRole("button", { name: "Revert accepted change" }).click();
  await expect(page.getByText(/reverted/i)).toBeVisible();
});

test("Advanced Sequencer preserves expert motion control", async ({ page }) => {
  await page.goto("/studio");
  await openAdvanced(page,/Sequencer/);
  await expect(page.getByRole("heading", { name: "Motion sequencer", level: 2 })).toBeVisible();
  await expect(page.locator(".sequencer-toolbar").getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByLabel("Playback range start")).toBeVisible();
  await page.getByRole("button", { name: /Back to Studio/ }).click();
  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeVisible();
});

test("Advanced Interactions preserves deterministic graph authoring", async ({ page }) => {
  await page.goto("/studio");
  await openAdvanced(page,/Interactions/);
  await expect(page.getByRole("heading", { name: "Interaction graph", level: 2 })).toBeVisible();
  await expect(page.getByRole("application", { name: "Interaction node graph" })).toBeVisible();
  await page.getByRole("button", { name: "Add trigger" }).click();
  await expect(page.locator("button.production-status")).toBeVisible();
});

test("Advanced Asset tools expose Asset Intelligence, bank and model inspection", async ({ page }) => {
  await page.goto("/studio");
  await openAdvanced(page,/Asset tools/);
  await expect(page.getByText("ASSET INTELLIGENCE")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asset bank", level: 2, exact: true })).toBeVisible();
  await expect(page.getByText(/manifest health/i)).toBeVisible();
});

test("Review makes Project Health the readiness control room", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.getByText("REVIEW / PROJECT HEALTH")).toBeVisible();
  await expect(page.getByText("WHAT NEEDS ATTENTION")).toBeVisible();
  await expect(page.getByText("RECOMMENDED")).toBeVisible();
});

test("Ship honors Project Health and keeps protected publishing guided", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Ship", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review, checkpoint and release." })).toBeVisible();
  await expect(page.getByText("GUIDED SHIP")).toBeVisible();
  await expect(page.getByText("Project Health", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Owner publish secret")).toHaveCount(0);

  await page.getByRole("button", { name: "Advanced setup" }).click();
  await expect(page.getByLabel("Owner publish secret")).toHaveAttribute("type", "password");
});

test("Advanced Telemetry remains available without permanent navigation", async ({ page }) => {
  await page.goto("/studio");
  await openAdvanced(page,/Telemetry/);
  await expect(page.getByRole("heading", { name: "Telemetry policy" })).toBeVisible();
  await expect(page.getByLabel("Sample rate")).toBeVisible();
});
