import { test, expect } from "@playwright/test";
const sizes = [
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [844, 390],
  [360, 740],
] as const;

test("semantic story and final CTA survive without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "A house set into a forty-metre fall to the sea." })).toBeVisible();
  await page.locator("#enquire").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link", { name: "Enquire about a commission" })).toBeVisible();
  await context.close();
});

test("production canvas stays persistent across scroll, reverse and quality controls", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/lab");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByText("The 3D view is loading.", { exact: false })).toHaveCount(0);
  const canvas = await page.locator("canvas").elementHandle();
  const sceneNavigation = page.getByRole("navigation", { name: "Experience scenes" });
  for (const id of ["threshold", "material", "horizon", "approach"]) {
    const sceneLink = sceneNavigation.locator(`a[href="#${id}"]`);
    await sceneLink.click();
    await expect(sceneLink).toHaveAttribute("aria-current", "step");
  }
  await expect(page.getByLabel("Scene lab controls")).toBeVisible();
  expect(await canvas?.evaluate((element) => element.isConnected)).toBe(true);
  await page.getByLabel("Quality", { exact: true }).selectOption("low");
  await expect(page.getByLabel("Quality", { exact: true })).toHaveValue("low");
  await page.getByLabel("Free camera", { exact: true }).check();
  await page.getByLabel("Show authoring guides", { exact: true }).check();
  await expect(page.getByLabel("Show authoring guides", { exact: true })).toBeChecked();
  await page.locator("#approach").scrollIntoViewIfNeeded();
  expect(await canvas?.evaluate((element) => element.isConnected)).toBe(true);
  expect(errors).toEqual([]);
});

test("reduced motion, final conversion and no horizontal overflow across viewport matrix", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.locator("#enquire").scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: "Enquire about a commission" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await expect(page.locator(".experience-root")).toHaveAttribute("data-reduced-motion", "true");
});

test("missing GLB preserves semantic content and exposes retry", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("click", (event) => {
      if ((event.target as HTMLElement)?.closest("button")?.textContent === "Retry 3D") {
        document.documentElement.dataset.retryRequested = "true";
      }
    }, true);
  });
  await page.route("**/models/**/*.glb", async (route) => {
    const retryRequested = await page.evaluate(() => document.documentElement.dataset.retryRequested === "true");
    await (retryRequested ? route.continue() : route.abort());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "A house set into a forty-metre fall to the sea." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry 3D" })).toBeVisible();
  await page.getByRole("button", { name: "Retry 3D" }).click();
  await expect(page.getByRole("button", { name: "Retry 3D" })).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.locator("#enquire").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link", { name: "Enquire about a commission" })).toBeVisible();
});

test("WebGL failure leaves Casa Lumen content and details usable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "A house set into a forty-metre fall to the sea." })).toBeVisible();
  await page.locator("#material").scrollIntoViewIfNeeded();
  await page.getByText("Honed travertine", { exact: true }).click();
  await expect(page.getByText("Open-pore travertine", { exact: false })).toBeVisible();
});

test("range keyboard does not invoke global scene shortcut", async ({ page }) => {
  await page.goto("/lab");
  const slider = page.getByRole("slider").first();
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toBeFocused();
  expect(Number(await slider.inputValue())).toBeLessThan(0.1);
});

test("context restoration does not remove the document", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "WebGL loss extension is renderer-dependent");
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);
  const supported = await page.locator("canvas").evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
    const extension = gl?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext();
    setTimeout(() => extension.restoreContext(), 300);
    return true;
  });
  test.skip(!supported, "Context loss extension unavailable");
  await expect(page.getByRole("heading", { level: 1, name: "A house set into a forty-metre fall to the sea." })).toBeVisible();
  await expect(page.getByText("The 3D view was interrupted.", { exact: false })).toHaveCount(0);
});
