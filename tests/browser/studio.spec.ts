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

test("Mask Lab authors all presets and renders deterministic DOM and WebGL previews", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "masks", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mask reveal laboratory" })).toBeVisible();
  await page.getByRole("button", { name: "Add reference image" }).click();
  await expect(page.locator(".mask-preset-grid button")).toHaveCount(8);
  await page.getByRole("button", { name: "film burn" }).click();
  const slider = page.getByLabel("Reveal progress");
  await slider.fill("0.35");
  const domMask = await page.locator(".mask-preview--dom img").evaluate((element) => getComputedStyle(element).maskImage || getComputedStyle(element).webkitMaskImage);
  expect(domMask).toContain("gradient");
  await expect(page.getByText(/WEBGL LIVE|CSS FALLBACK/)).toBeVisible();
  const start = await page.locator(".mask-preview--webgl canvas").evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) return null;
    const pixel = new Uint8Array(4);
    gl.readPixels(480, 270, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return [...pixel];
  });
  await slider.fill("0.8");
  const end = await page.locator(".mask-preview--webgl canvas").evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) return null;
    const pixel = new Uint8Array(4);
    gl.readPixels(480, 270, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return [...pixel];
  });
  if (start && end) expect(end).not.toEqual(start);
  await expect(page.getByText("Production schema valid")).toBeVisible();
});
