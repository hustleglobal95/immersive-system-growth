import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseURL = process.env.NOCTERRA_URL || "http://127.0.0.1:3000";

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
];

const mobileShots = [
  ["01-arrival", 0.015],
  ["02-threshold", 0.535],
  ["03-horizon", 0.88],
  ["04-private-presentation", 0.975],
];

async function seek(page, progress) {
  await page.evaluate((value) => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, max * value);
  }, progress);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(400);
}

async function prepare(page) {
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.locator("canvas").waitFor({ state: "attached", timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3500);
}

async function captureSet(browser, label, viewport, shots) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  const outputDir = `test-results/nocterra/${label}`;
  await mkdir(outputDir, { recursive: true });
  await prepare(page);

  const captures = [];
  for (const [name, progress] of shots) {
    await seek(page, progress);
    const path = `${outputDir}/${name}.png`;
    try {
      await page.screenshot({ path, animations: "disabled", timeout: 10000 });
      captures.push({ name, progress, path, status: "captured" });
      console.log(`CAPTURED ${label}/${name}`);
    } catch (error) {
      captures.push({ name, progress, path, status: "failed", error: error instanceof Error ? error.message : String(error) });
      console.error(`FAILED ${label}/${name}`, error);
    }
  }

  await context.close();
  return { label, viewport, captures, errors };
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});

try {
  await mkdir("test-results/nocterra", { recursive: true });
  const desktop = await captureSet(browser, "desktop", { width: 1440, height: 1000 }, desktopShots);
  const mobile = await captureSet(browser, "mobile", { width: 390, height: 844 }, mobileShots);
  const report = { generatedAt: new Date().toISOString(), baseURL, desktop, mobile };
  await writeFile("test-results/nocterra/capture-report.json", JSON.stringify(report, null, 2));
  const failures = [...desktop.captures, ...mobile.captures].filter((capture) => capture.status !== "captured");
  console.log(`NOCTERRA capture complete: ${13 - failures.length}/13 screenshots captured.`);
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
