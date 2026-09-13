import { mkdir } from "node:fs/promises";
import { test } from "@playwright/test";

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
  await page.waitForTimeout(350);
}

async function prepare(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.locator("canvas").waitFor({ state: "attached", timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3000);
}

test("NOCTERRA desktop delivery screenshots", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Chromium visual evidence only");
  test.setTimeout(30000);
  await mkdir("test-results/nocterra/desktop", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepare(page);
  for (const [name, progress] of desktopShots) {
    await seek(page, progress);
    await page.screenshot({ path: `test-results/nocterra/desktop/${name}.png`, animations: "disabled" });
  }
});

test("NOCTERRA mobile delivery screenshots", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Chromium visual evidence only");
  test.setTimeout(30000);
  await mkdir("test-results/nocterra/mobile", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  for (const [name, progress] of mobileShots) {
    await seek(page, progress);
    await page.screenshot({ path: `test-results/nocterra/mobile/${name}.png`, animations: "disabled" });
  }
});
