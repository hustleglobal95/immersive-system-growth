import { mkdir } from "node:fs/promises";
import { test, type Page } from "@playwright/test";

const desktopShots = ["find", "communities", "plans", "personalize", "difference", "tour"] as const;
const mobileShots = ["find", "communities", "personalize", "tour"] as const;

async function prepare(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.locator(".dw-site").waitFor({ state: "attached", timeout: 10000 });
  await page.evaluate(async () => {
    // Some official image hosts can leave a request pending in CI. Capture the
    // rendered page after a short grace period instead of waiting indefinitely.
    await Promise.race([
      Promise.all([
        document.fonts.ready,
        ...[...document.images].map((image) => image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            })),
      ]),
      new Promise<void>((resolve) => window.setTimeout(resolve, 12000)),
    ]);
  });
}

async function captureSection(page: Page, id: string, path: string) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path, animations: "disabled", timeout: 60000 });
}

test("David Weekley desktop delivery screenshots", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Chromium visual evidence only");
  test.setTimeout(300000);
  await mkdir("test-results/david-weekley/desktop", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepare(page);
  for (const [index, id] of desktopShots.entries()) {
    await captureSection(page, id, `test-results/david-weekley/desktop/${String(index + 1).padStart(2, "0")}-${id}.png`);
  }
});

test("David Weekley mobile delivery screenshots", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Chromium visual evidence only");
  test.setTimeout(180000);
  await mkdir("test-results/david-weekley/mobile", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  for (const [index, id] of mobileShots.entries()) {
    await captureSection(page, id, `test-results/david-weekley/mobile/${String(index + 1).padStart(2, "0")}-${id}.png`);
  }
});
