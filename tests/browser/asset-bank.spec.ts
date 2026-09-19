import { expect, test } from "@playwright/test";

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
  await page.getByText("Advanced", { exact: true }).click();
  await page.getByRole("button", { name: /Asset tools/ }).click();
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

test("kit replacement requires review, blocks incompatible interactions and supports undo", async ({ page }) => {
  await page.goto("/studio");
  await page.getByText("Advanced", { exact: true }).click();
  await page.getByRole("button", { name: /Asset tools/ }).click();
  await page.getByRole("button", { name: "Review restaurant kit", exact: true }).click();
  await expect(page.getByText(/Applying this kit replaces/)).toBeVisible();
  await page.getByRole("button", { name: "Apply reviewed kit", exact: true }).click();
  await expect(page.getByText(/Existing interactions reference scenes or hotspots outside this kit/)).toBeVisible();
  await page.getByRole("button", { name: "Review burger-showcase kit", exact: true }).click();
  await page.getByRole("button", { name: "Apply reviewed kit", exact: true }).click();
  await expect(page.getByText(/Reference kit applied/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo experience change" })).toBeEnabled();
  await page.getByRole("button", { name: "Undo experience change" }).click();
  await expect(page.getByText("Production schema valid")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("asset bank filters remain usable at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  await page.getByText("Advanced", { exact: true }).click();
  await page.getByRole("button", { name: /Asset tools/ }).click();
  await page.getByRole("combobox", { name: "Preparation", exact: true }).selectOption("prepared");
  await expect(page.getByText("No matching assets. Try fewer filters.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
