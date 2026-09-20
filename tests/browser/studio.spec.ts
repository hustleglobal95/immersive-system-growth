import { expect, test } from "@playwright/test";

async function openAdvanced(page:import("@playwright/test").Page,label:RegExp) {
  const advanced=page.locator("details.production-advanced-menu");
  await advanced.locator("> summary").click();
  await advanced.getByRole("button", { name: label }).first().click();
}

test("Build keeps the live experience central and edits the selected scene", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");

  await expect(page.getByRole("button", { name: "Build", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".production-runtime canvas").first()).toBeAttached();
  await expect(page.getByLabel("Headline")).toBeVisible();

  const headline=page.getByLabel("Headline");
  await headline.fill("A directed cinematic scene");
  await expect(headline).toHaveValue("A directed cinematic scene");
  await expect(page.locator(".production-context")).toBeVisible();
});

test("New Project starts from isolated project state", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel("Forge command").fill("new project");
  await page.getByRole("button", { name: "Direct", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Start from zero.", level: 2 })).toBeVisible();

  await page.getByLabel("Project name").fill("Isolation Test");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByText(/created from zero with isolated assets, interactions and visual effects/i)).toBeVisible();

  await expect.poll(async () => page.evaluate(() => {
    const raw=window.localStorage.getItem("forge-studio-v2");
    if(!raw) return null;
    const draft=JSON.parse(raw);
    return {
      id:draft.project?.id,
      scenes:draft.experience?.scenes?.length,
      models:draft.assetManifest?.models?.length,
      textures:draft.assetManifest?.textures?.length,
      hdr:draft.assetManifest?.hdr?.length,
      video:draft.assetManifest?.video?.length,
      graph:draft.interactionGraph?.id,
      cinematicScenes:draft.cinematicSystems?.scenes?.length,
    };
  })).toEqual({
    id:"isolation-test",
    scenes:1,
    models:0,
    textures:0,
    hdr:0,
    video:0,
    graph:"isolation-test-interactions",
    cinematicScenes:0,
  });
});

test("Build prepares a reversible fast proposal before applying motion", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Add scene" }).click();
  await expect(page.getByLabel("Headline")).toHaveValue("Direct this moment.");
  await page.getByLabel("Forge command").fill("editorial reveal");
  await page.getByRole("button", { name: "Direct", exact: true }).click();

  const review=page.getByLabel("Forge proposal review");
  await expect(review).toBeVisible();
  await expect(review.getByRole("button", { name: "Current", exact: true })).toBeVisible();
  await expect(review.getByRole("button", { name: "Candidate", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(review.getByRole("button", { name: "Accept candidate", exact: true })).toBeVisible();

  await review.getByRole("button", { name: "Accept candidate", exact: true }).click();
  await expect(review.getByRole("button", { name: "Revert accepted change", exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Revert accepted change", exact: true }).click();
  await expect(page.getByText(/reverted/i)).toBeVisible();
});

test("Build Animate provides direct motion authoring before the expert sequencer", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "＋ Scene" }).click();
  await page.getByRole("button", { name: "Animate", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Make something move.", level: 2 })).toBeVisible();
  await expect(page.getByLabel("Animate motion recipe")).toBeVisible();
  await page.getByLabel("Animate motion recipe").selectOption("editorial-reveal");
  await page.getByRole("button", { name: "Apply to scene" }).click();
  await expect(page.getByText(/Editorial reveal applied/)).toBeVisible();

  await page.getByLabel("Animate target").selectOption("hero.scale");
  await page.getByRole("button", { name: "Add property track" }).click();
  await expect(page.getByText(/Hero scale added/)).toBeVisible();
  await page.getByLabel("Animate Start value").fill("0.8");
  await expect(page.getByLabel("Animate Start value")).toHaveValue("0.8");

  await page.getByLabel("Animate preview progress").fill("0.5");
  await expect(page.getByText("50%")).toBeVisible();

  await page.getByRole("button", { name: "Open full Sequencer" }).click();
  await expect(page.getByRole("heading", { name: "Motion sequencer", level: 2 })).toBeVisible();
});

test("Build camera inspector directly edits shots and hands off to targeted Animate", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  const tree=page.locator(".production-tree");
  await tree.getByRole("button", { name: /Camera/ }).first().click();

  await expect(page.getByLabel("Camera path")).toBeVisible();
  await page.getByLabel("Camera path").selectOption("orbit");
  await expect(page.getByLabel("Camera path")).toHaveValue("orbit");
  await page.getByLabel("Camera start FOV").fill("47");
  await expect(page.getByLabel("Camera start FOV")).toHaveValue("47");

  await page.getByRole("button", { name: "Animate camera", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Make something move.", level: 2 })).toBeVisible();
  await expect(page.getByLabel("Animate target")).toHaveValue("camera.position");
});

test("Build environment inspector directly edits lighting and atmosphere", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.locator(".production-tree").getByRole("button", { name: /Environment/ }).click();

  await page.getByLabel("Environment exposure").fill("1.35");
  await page.getByLabel("Environment bloom").fill("0.45");
  await page.getByLabel("Environment key color").fill("#ffaa66");
  await expect(page.getByLabel("Environment exposure")).toHaveValue("1.35");
  await expect(page.getByLabel("Environment bloom")).toHaveValue("0.45");
  await expect(page.getByLabel("Environment key color")).toHaveValue("#ffaa66");

  await page.getByRole("button", { name: "Animate exposure", exact: true }).click();
  await expect(page.getByLabel("Animate target")).toHaveValue("world.exposure");
});

test("Build media inspector directly edits presentation when media exists", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  const media=page.locator(".production-tree").getByRole("button", { name: /Media/ });
  await expect(media).toBeVisible();
  await media.click();

  await page.getByLabel("Media transition").selectOption("dissolve");
  await page.getByLabel("Media desktop position X").fill("42");
  await page.getByLabel("Media mobile position Y").fill("58");
  await expect(page.getByLabel("Media transition")).toHaveValue("dissolve");
  await expect(page.getByLabel("Media desktop position X")).toHaveValue("42");
  await expect(page.getByLabel("Media mobile position Y")).toHaveValue("58");

  await page.getByRole("button", { name: "Animate reveal", exact: true }).click();
  await expect(page.getByLabel("Animate target")).toHaveValue("media.reveal");
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

test("Advanced Visual effects authors cursor reveal and visual physics without permanent navigation", async ({ page }) => {
  await page.goto("/studio");
  await openAdvanced(page,/Visual effects/);
  await expect(page.getByRole("heading", { name: "Visual Effects", level: 2 })).toBeVisible();
  await expect(page.getByText("LIVE DRAFT")).toBeVisible();
  const preset=page.getByLabel("Preset");
  await preset.selectOption("cursor");
  await expect(page.getByLabel("Cursor mode")).toBeVisible();
  await page.getByLabel("Cursor mode").selectOption("fluid");
  await expect(page.getByLabel("Fluid resolution")).toBeVisible();
  await expect(page.getByLabel("Curl")).toBeVisible();
  await expect(page.getByLabel("Splat force")).toBeVisible();

  await preset.selectOption("physics");
  await expect(page.getByLabel("Warp mode")).toBeVisible();
  await page.getByLabel("Warp mode").selectOption("shockwave");
  await expect(page.getByLabel("Refraction mode")).toBeVisible();
  await page.getByLabel("Refraction mode").selectOption("liquid");
  await expect(page.getByLabel("Transition effect")).toBeVisible();
  await page.getByLabel("Transition effect").selectOption("slats");
  await expect(page.getByLabel("Transition target")).toBeVisible();
  await expect.poll(async()=>page.evaluate(()=>{
    const raw=window.localStorage.getItem("forge-studio-v2");
    if(!raw) return false;
    const draft=JSON.parse(raw);
    return draft.cinematicSystems?.scenes?.some((scene:{warp?:{mode?:string}})=>scene.warp?.mode==="shockwave") ?? false;
  })).toBe(true);

  await page.getByRole("button", { name: /Back to Studio/ }).click();
  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeVisible();
  await page.reload();
  await openAdvanced(page,/Visual effects/);
  await expect(page.getByLabel("Warp mode")).toHaveValue("shockwave");
  await expect(page.getByLabel("Transition effect")).toHaveValue("slats");
});


test("Mission Control promotes project-wide outcomes without adding navigation", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("forge-studio-guide-brief-v1", "Create a flagship mechanical watch launch that feels precise, warm, engineered and unforgettable.");
    window.localStorage.setItem("forge-studio-guided-first-run-v1", "seen");
  });
  await page.goto("/studio");

  await expect(page.getByText("FORGE / MISSION CONTROL")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guide", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copilot", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Autopilot", exact: true })).toBeVisible();
  await expect(page.getByText(/NEXT OUTCOME/)).toBeVisible();
  await expect(page.getByText("SIGNATURE MOMENT")).toBeVisible();

  await page.getByRole("button", { name: "Autopilot", exact: true }).click();
  await expect(page.getByRole("button", { name: "Autopilot", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Build", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Review", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ship", exact: true })).toBeVisible();
});
