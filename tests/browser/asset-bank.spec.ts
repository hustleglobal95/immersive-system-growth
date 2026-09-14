import { expect, test } from "@playwright/test";
import { parseExperience } from "../../src/lib/configSchema";
import { parseInteractionGraph } from "../../src/lib/interactionGraph";

test("catalog API bounds responses, validates queries and resolves kit dependencies", async ({ request }) => {
  const response = await request.get("/api/asset-bank?limit=48");
  expect(response.ok()).toBeTruthy();
  const bank = await response.json();
  expect(bank.catalogTotal).toBeGreaterThanOrEqual(2382);
  expect(bank.items).toHaveLength(48);
  expect((await request.get("/api/asset-bank?limit=1000")).status()).toBe(400);
  expect((await request.get("/api/asset-bank?kit=..%2Fsecret")).status()).toBe(400);
  expect((await request.get("/api/asset-bank?kit=missing")).status()).toBe(404);
  const kit = await (await request.get("/api/asset-bank?kit=forge-burger-showcase-kit")).json();
  expect(kit.assets[0].files.some((f: { url: string }) => f.url === kit.experience.heroModel)).toBeTruthy();
});

test("Studio searches sources, exports provenance and inserts with undo and draft persistence", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "bank", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Asset bank", level: 2, exact: true })).toBeVisible();
  await expect(page.getByText("2382 matching entries", { exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Preparation", exact: true }).selectOption("source");
  await expect(page.getByText("2375 matching entries", { exact: true })).toBeVisible();
  await page.locator('button[aria-pressed="false"]').filter({ hasText: "Needs preparation" }).first().click();
  await expect(page.getByRole("button", { name: "Insert asset into scene" })).toHaveCount(0);
  await page.getByRole("button", { name: "Add to shortlist", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export shortlist (1)", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("asset-bank-selection.json");
  await page.getByRole("combobox", { name: "Preparation", exact: true }).selectOption("reference");
  await page.getByLabel("Search assets").fill("burger");
  await expect(page.getByText("1 matching entries", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Burger reference model/ }).click();
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/models/reference/burger.glb") && response.ok()),
    page.getByRole("button", { name: "Open 3D preview", exact: true }).click(),
  ]);
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByText(/3D preview unavailable/)).toHaveCount(0);
  await page.getByRole("button", { name: "Close 3D preview", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Insert asset into scene", exact: true }).click();
  await expect(page.getByText(/Burger reference model added to/)).toBeVisible();
  const hasInserted = () => page.evaluate(() => JSON.parse(localStorage.getItem("forge-studio-v2")!).experience.assets.some((a: { id: string }) => a.id === "bank-forge-burger"));
  await expect.poll(hasInserted).toBe(true);
  await page.getByRole("button", { name: "Undo experience change" }).click();
  await expect.poll(hasInserted).toBe(false);
  await page.getByRole("button", { name: "Insert asset into scene", exact: true }).click();
  await expect.poll(hasInserted).toBe(true);
  await page.reload();
  await expect(page.getByText("Production schema valid")).toBeVisible();
  await expect.poll(hasInserted).toBe(true);
});

test("kit replacement requires review, blocks incompatible interactions and supports undo", async ({ page, request }) => {
  // Use explicit compatible/incompatible fixtures, not whichever showcase is active.
  const burgerResponse = await request.get("/api/asset-bank?kit=forge-burger-showcase-kit");
  const restaurantResponse = await request.get("/api/asset-bank?kit=forge-restaurant-kit");
  expect(burgerResponse.ok()).toBeTruthy();
  expect(restaurantResponse.ok()).toBeTruthy();
  const burger = parseExperience((await burgerResponse.json()).experience);
  const restaurant = parseExperience((await restaurantResponse.json()).experience);
  const boundScene = burger.scenes.find(scene => !restaurant.scenes.some(other => other.id === scene.id));
  expect(boundScene, "Fixture needs a scene present in burger but absent from restaurant").toBeDefined();
  const baseline = parseExperience({ ...burger, meta: { ...burger.meta, name: "Kit replacement fixture" } });
  const graph = parseInteractionGraph({
    version: 1, id: "kit-replacement-fixture", initialState: "idle", states: ["idle"], variables: {},
    nodes: [{ id: "bound-scene", kind: "trigger", label: "Required fixture scene", position: { x: 40, y: 80 }, event: "scene-enter", sceneId: boundScene!.id, states: ["idle"] }],
    edges: [], mobileSubstitutions: [],
  });
  await page.goto("/studio");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("forge-studio-v2") !== null)).toBe(true);
  await page.evaluate(({ experience, interactionGraph }) => {
    const draft = JSON.parse(localStorage.getItem("forge-studio-v2")!);
    localStorage.setItem("forge-studio-v2", JSON.stringify({ ...draft, experience, interactionGraph }));
  }, { experience: baseline, interactionGraph: graph });
  await page.reload();
  await expect(page.locator(".forge-workspace__project")).toContainText(baseline.meta.name);
  await page.getByRole("button", { name: "bank", exact: true }).click();
  const savedExperience = () => page.evaluate(() => JSON.parse(localStorage.getItem("forge-studio-v2")!).experience);
  await page.getByRole("button", { name: "Review restaurant kit", exact: true }).click();
  await expect(page.getByText(/Applying this kit replaces/)).toBeVisible();
  await page.getByRole("button", { name: "Apply reviewed kit", exact: true }).click();
  await expect(page.getByText(/Existing interactions reference scenes or hotspots outside this kit/)).toBeVisible();
  await expect.poll(savedExperience).toEqual(baseline);
  await expect(page.getByRole("button", { name: "Undo experience change" })).toBeDisabled();
  await page.getByRole("button", { name: "Review burger-showcase kit", exact: true }).click();
  await page.getByRole("button", { name: "Apply reviewed kit", exact: true }).click();
  await expect(page.getByText(/Reference kit applied/)).toBeVisible();
  await expect.poll(async () => (await savedExperience()).meta.name).toBe(burger.meta.name);
  await expect(page.getByRole("button", { name: "Undo experience change" })).toBeEnabled();
  await page.getByRole("button", { name: "Undo experience change" }).click();
  await expect.poll(savedExperience).toEqual(baseline);
  await expect(page.getByText("Production schema valid")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("asset bank filters remain usable at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  await page.getByRole("button", { name: "bank", exact: true }).click();
  await page.getByRole("combobox", { name: "Preparation", exact: true }).selectOption("prepared");
  await expect(page.getByText("No matching assets. Try fewer filters.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
