import { expect, test } from "@playwright/test";

test("Studio edits a recipe in the browser and applies portable presets", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recipe editor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start from a visual system" })).toBeVisible();
  await page.getByLabel("Recipe search").fill("restaurant");
  await expect(page.getByRole("heading", { name: "Restaurant journey", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Select recipe" }).click();
  await page.getByRole("button", { name: "Use selected recipe" }).click();
  await expect(page.getByText("Restaurant journey recipe loaded into the draft.")).toBeVisible();
  await page.getByLabel("Recipe headline").fill("A directed restaurant story");
  await page.getByLabel("Recipe motion preset").selectOption("cinematic-focus");
  await expect(page.getByText("Applied cinematic-focus")).toBeVisible();
  await expect(page.getByText("Production schema valid")).toBeVisible();
});

test("Studio edits NOCTERRA timelines and inspects GLB nodes without mounting the cinematic runtime", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Project control" })).toBeVisible();
  await expect(page.getByText("Production schema valid")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);

  await page.getByRole("button", { name: "timeline", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visual timeline" })).toBeVisible();
  await page.getByRole("listitem", { name: /Automotive Detail/ }).click();
  await expect(page.getByRole("heading", { name: "Automotive Detail" })).toBeVisible();
  await page.getByLabel("Navigation label").fill("Coachwork detail");
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await page.getByRole("button", { name: "model", exact: true }).click();
  await page.getByLabel("Select a binary glTF model").setInputFiles("public/models/reference/burger.glb");
  await expect(page.locator(".node-list strong").filter({ hasText: "top-bun" })).toBeVisible();
  await expect(page.getByText("9 mapped")).toBeVisible();
  await expect(page.getByText("Production guidance")).toBeVisible();
  await expect(page.getByText("Triangles")).toBeVisible();
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
  await expect(page.getByLabel("Publish secret")).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Open review pull request" })).toBeDisabled();
  await page.getByRole("button", { name: "telemetry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Telemetry policy" })).toBeVisible();
  await expect(page.getByLabel("Sample rate")).toBeVisible();
});

test("Studio Pro composes a validated template, spatially directed scene and live runtime", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "templates", exact: true }).click();
  await expect(page.locator(".template-grid article")).toHaveCount(6);
  const restaurant = page.locator(".template-grid article").filter({ hasText: "Restaurant journey" });
  await restaurant.getByRole("button", { name: "Apply template" }).click();
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await page.getByRole("button", { name: "director", exact: true }).click();
  await expect(page.getByRole("img", { name: "Camera top path" })).toBeVisible();
  await expect(page.locator(".studio-preview__canvas canvas")).toHaveCount(1);
  await expect(page.getByTestId("director-spatial-status")).toContainText("Live geometry ready", { timeout: 15_000 });
  await page.getByRole("button", { name: "Auto-direct camera" }).click();
  await expect(page.getByLabel("Spatial camera diagnostics")).toBeVisible();
  await expect(page.getByText(/Spatial source: (live|mixed)/)).toBeVisible();
  await page.getByLabel("Path preset").selectOption("orbit");
  await page.locator(".director-range").filter({ hasText: "Exposure" }).locator("input").fill("1.2");
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await page.getByRole("button", { name: "layers", exact: true }).click();
  const addMedia = page.getByRole("button", { name: "Add reference media" });
  if (await addMedia.count()) await addMedia.click();
  await page.getByRole("button", { name: "Add color flash" }).click();
  await expect(page.locator(".layer-stack li")).toHaveCount(1);

  await page.getByRole("button", { name: "preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Live experience preview" })).toBeVisible();
  await expect(page.locator(".studio-preview__canvas canvas")).toHaveCount(1);
  await page.getByLabel("Live preview progress").fill("0.5");
  await expect(page.locator(".studio-preview__transport output")).toHaveText("0.500");
});

test("Motion sequencer authors curves, grouped history, responsive overrides and record gizmos", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "sequence", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Motion sequencer", level: 2 })).toBeVisible();
  await expect(page.locator(".sequencer-toolbar").getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByLabel("Playback range start")).toHaveValue("0");
  await page.getByLabel("Motion preset").selectOption("copy-rise");
  await expect(page.locator(".sequencer-row")).toHaveCount(2);

  await page.getByRole("button", { name: /Copy opacity key at 0 percent/ }).click();
  await page.getByLabel("Keyframe easing").selectOption("cubic");
  await expect(page.getByRole("img", { name: "Cubic Bezier curve editor" })).toBeVisible();
  await page.getByRole("button", { name: "Cinematic", exact: true }).click();
  await expect(page.getByLabel("Curve x1")).toHaveValue("0.16");
  await page.getByLabel("Curve x1").fill("0.2");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByLabel("Live preview progress").fill("0.09");
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await expect(page.getByRole("button", { name: /Copy opacity key at 50 percent/ })).toBeVisible();
  await page.getByRole("button", { name: "Undo motion edit" }).click();
  await expect(page.getByRole("button", { name: /Copy opacity key at 50 percent/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Redo motion edit" }).click();
  await expect(page.getByRole("button", { name: /Copy opacity key at 50 percent/ })).toBeVisible();

  await page.getByLabel("Motion target").selectOption("camera.position");
  await page.getByRole("button", { name: "Add track" }).click();
  await expect(page.locator(".sequencer-row")).toHaveCount(3);
  await page.getByRole("button", { name: "Enable gizmo" }).click();
  await expect(page.getByRole("button", { name: "Recording gizmo" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".studio-preview__canvas canvas")).toHaveCount(1);

  await page.getByLabel("Motion viewport").selectOption("mobile");
  await page.getByRole("button", { name: "Add track" }).click();
  await expect(page.locator(".sequencer-row")).toHaveCount(4);
  await expect(page.getByText("Production schema valid")).toBeVisible();
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

test("Interaction graph authors and simulates deterministic branching", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "interactions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Interaction graph", level: 2 })).toBeVisible();
  await expect(page.getByRole("application", { name: "Interaction node graph" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter automotive detail trigger" })).toBeVisible();
  await page.getByRole("button", { name: "Enter automotive detail trigger" }).click();
  await page.getByRole("button", { name: "Run selected trigger" }).click();
  await expect(page.getByTestId("interaction-sim-state")).toHaveText("inspecting");
  await expect(page.getByText("mark-engaged", { exact: true })).toBeVisible();
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await page.getByRole("button", { name: "Request private presentation trigger" }).click();
  await page.getByRole("button", { name: "Run selected trigger" }).click();
  await expect(page.getByTestId("interaction-sim-state")).toHaveText("inquiry");
  await expect(page.getByText(/emit-inquiry: emit/)).toBeVisible();
});

test("Studio authors deterministic visual systems for live preview", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "visuals", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visual systems", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: /NOCTERRA ambient field/ })).toBeVisible();
  await page.getByRole("button", { name: /NOCTERRA material glints/ }).click();
  await expect(page.getByRole("slider", { name: "Instance count" })).toBeVisible();
  await page.getByRole("slider", { name: "Instance count" }).fill("72");
  await expect(page.getByText("Runtime preview updated.")).toBeVisible();
  await expect(page.getByText("Deterministic sample")).toBeVisible();
  await expect(page.getByText("Quality budget")).toBeVisible();
});
