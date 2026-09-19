import { mkdir } from "node:fs/promises";
import { test } from "@playwright/test";
import experience from "../../config/experience.json";

const midpoint=(range:readonly [number,number])=>range[0]+(range[1]-range[0])*.52;
const desktopShots=experience.scenes.map((scene,index)=>[
  `${String(index+1).padStart(2,"0")}-${scene.id}`,
  midpoint(scene.range as [number,number]),
] as const);
const mobileIndexes=Array.from(new Set([0,2,Math.floor(experience.scenes.length/2),experience.scenes.length-2,experience.scenes.length-1]))
  .filter((index)=>index>=0&&index<experience.scenes.length);
const mobileShots=mobileIndexes.map((index)=>{
  const scene=experience.scenes[index];
  return [`${String(index+1).padStart(2,"0")}-${scene.id}`,midpoint(scene.range as [number,number])] as const;
});

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

test("Casa Lumen desktop delivery screenshots", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Chromium visual evidence only");
  test.setTimeout(180000);
  await mkdir("test-results/atelier-maris/desktop", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepare(page);
  for (const [name, progress] of desktopShots) {
    await seek(page, progress);
    await page.screenshot({ path: `test-results/atelier-maris/desktop/${name}.png`, animations: "disabled", timeout:25000 });
  }
});

test("Casa Lumen mobile delivery screenshots", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Chromium visual evidence only");
  test.setTimeout(180000);
  await mkdir("test-results/atelier-maris/mobile", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  for (const [name, progress] of mobileShots) {
    await seek(page, progress);
    await page.screenshot({ path: `test-results/atelier-maris/mobile/${name}.png`, animations: "disabled", timeout:25000 });
  }
});
