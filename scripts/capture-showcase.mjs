import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import experience from "../config/experience.json" with { type: "json" };

const baseURL = process.env.FORGE_URL || "http://127.0.0.1:3000";
const midpoint = (range) => range[0] + (range[1] - range[0]) * 0.52;
const desktopShots = experience.scenes.map((scene, index) => [
  `${String(index + 1).padStart(2, "0")}-${scene.id}`,
  midpoint(scene.range),
]);
const mobileIndexes = Array.from(new Set([0, 2, Math.floor(experience.scenes.length / 2), experience.scenes.length - 2, experience.scenes.length - 1])).filter((index) => index >= 0 && index < experience.scenes.length);
const mobileShots = mobileIndexes.map((index) => {
  const scene = experience.scenes[index];
  return [`${String(index + 1).padStart(2, "0")}-${scene.id}`, midpoint(scene.range)];
});

async function seek(page, progress) {
  await page.evaluate((value) => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, max * value);
  }, progress);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(650);
}

async function prepare(page) {
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 20000 });
  const marketplace = await page.locator(".dw-site").count() > 0;
  if (!marketplace) await page.locator("canvas").first().waitFor({ state: "attached", timeout: 12000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(marketplace ? 2400 : 4200);
  return marketplace;
}

async function captureScreenshot(page,path) {
  let lastError;
  for(let attempt=1;attempt<=3;attempt++) {
    try {
      await page.screenshot({ path, animations:"disabled", caret:"hide", timeout:25000 });
      return;
    } catch(error) {
      lastError=error;
      if(attempt===3) break;
      console.warn(`Screenshot retry for ${path} after transient timeout.`);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForTimeout(650);
    }
  }
  throw lastError;
}

async function captureSet(browser, label, viewport, shots) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const outputDir = `test-results/showcase/${label}`;
  await mkdir(outputDir, { recursive: true });
  const marketplace = await prepare(page);
  const sectionIds = ["find", "communities", "plans", "personalize", "life", "difference", "tour"];
  if (marketplace) shots = sectionIds.map((id, index) => [`${String(index + 1).padStart(2, "0")}-${id}`, id]);
  const captures = [];
  for (const [name, progress] of shots) {
    if (marketplace) {
      await page.evaluate((id) => {
        const element = document.getElementById(id);
        window.scrollTo({ top: id === "find" ? 0 : (element?.getBoundingClientRect().top ?? 0) + window.scrollY - 92, behavior: "instant" });
      }, progress);
      await page.waitForTimeout(1100);
    } else await seek(page, progress);
    const path = `${outputDir}/${name}.png`;
    try {
      await captureScreenshot(page,path);
      captures.push({ name, progress, path, status: "captured" });
      console.log(`CAPTURED ${label}/${name}`);
    } catch (error) {
      captures.push({ name, progress, path, status: "failed", error: error instanceof Error ? error.message : String(error) });
      console.error(`FAILED ${label}/${name}`, error);
    }
  }
  await context.close();
  return { label, viewport, captures, pageErrors, consoleErrors };
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});

try {
  await mkdir("test-results/showcase", { recursive: true });
  const desktop = await captureSet(browser, "desktop", { width: 1440, height: 1000 }, desktopShots);
  const mobile = await captureSet(browser, "mobile", { width: 390, height: 844 }, mobileShots);
  const report = { generatedAt: new Date().toISOString(), project: experience.meta.name, baseURL, desktop, mobile };
  await writeFile("test-results/showcase/capture-report.json", JSON.stringify(report, null, 2));
  const failures = [...desktop.captures, ...mobile.captures].filter((capture) => capture.status !== "captured");
  const runtimeErrors = [...desktop.pageErrors, ...mobile.pageErrors];
  console.log(`Showcase capture complete: ${desktop.captures.length + mobile.captures.length - failures.length}/${desktop.captures.length + mobile.captures.length} screenshots captured.`);
  if (failures.length || runtimeErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
