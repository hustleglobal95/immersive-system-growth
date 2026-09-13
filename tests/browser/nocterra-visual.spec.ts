import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const desktopShots = [
  ["01-arrival", 0.015],
  ["02-automotive-detail", 0.19],
  ["03-profile", 0.285],
  ["04-residence", 0.445],
  ["05-threshold", 0.535],
  ["06-interior", 0.625],
  ["07-terrace", 0.79],
  ["08-horizon", 0.88],
  ["09-private-presentation", 0.975],
] as const;

const mobileShots = [
  ["01-arrival", 0.015],
  ["02-threshold", 0.535],
  ["03-horizon", 0.88],
  ["04-private-presentation", 0.975],
] as const;

async function seek(page: import("@playwright/test").Page, progress: number) {
  await page.evaluate((value) => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, max * value);
  }, progress);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(260);
}

async function prepare(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 15000 });
  await expect(page.getByText("The 3D view is loading.", { exact: false })).toHaveCount(0, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  expect(errors).toEqual([]);
}

test("NOCTERRA produces delivery evidence at cinematic desktop beats", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One deterministic Chromium evidence set is sufficient");
  await mkdir("test-results/nocterra/desktop", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepare(page);
  for (const [name, progress] of desktopShots) {
    await seek(page, progress);
    await page.screenshot({
      path: `test-results/nocterra/desktop/${name}.png`,
      animations: "disabled",
    });
  }
});

test("NOCTERRA produces delivery evidence at cinematic mobile beats", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One deterministic Chromium evidence set is sufficient");
  await mkdir("test-results/nocterra/mobile", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  for (const [name, progress] of mobileShots) {
    await seek(page, progress);
    await page.screenshot({
      path: `test-results/nocterra/mobile/${name}.png`,
      animations: "disabled",
    });
  }
});
