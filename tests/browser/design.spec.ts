import { test, expect } from "@playwright/test";

test("design directions, catalog and inquiry are operable without cinematic machinery", async ({ page }, info) => {
  const fonts: string[] = [];
  page.on("request", r => { if (/\.woff2/.test(r.url())) fonts.push(r.url()); });
  await page.goto("/design");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Room to live. Space to feel.");
  await expect(page.locator("canvas")).toHaveCount(0);
  for (const [id, name] of [["editorial", "Luxury editorial"], ["architectural", "Architectural minimal"], ["commercial", "Modern commercial"]]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".ds-root")).toHaveAttribute("data-direction", id);
    await expect(page.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: info.outputPath(`${id}-desktop.png`), animations: "disabled" });
  }
  expect(new Set(fonts).size).toBeGreaterThanOrEqual(3);
  expect(fonts.every(url => url.startsWith("http://127.0.0.1:3000/"))).toBe(true);
  await page.getByLabel("Search fonts").fill("cormorant");
  await expect(page.getByRole("link", { name: "Cormorant Garamond", exact: true })).toBeVisible();
  await page.getByLabel("Category", { exact: false }).selectOption("Mono");
  await expect(page.getByText("No matches.", { exact: false })).toBeVisible();
  await page.getByLabel("Your name", { exact: true }).fill("Sample visitor");
  await page.getByLabel("Email address", { exact: true }).fill("sample@example.com");
  await page.getByLabel("What would you like to create?").fill("A new collection website.");
  await page.getByRole("button", { name: "Send inquiry" }).click();
  await expect(page.getByText("Preview complete.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("Sample visitor");
});

test("320px reflow survives text-spacing overrides and missing fonts", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(/\.woff2/, route => route.abort());
  await page.goto("/design");
  await page.addStyleTag({ content: ".ds-root * { line-height:1.5!important; letter-spacing:.12em!important; word-spacing:.16em!important; } .ds-root p { margin-bottom:2em!important; }" });
  for (const name of ["Luxury editorial", "Architectural minimal", "Modern commercial"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const overflow = await page.locator(".ds-root").evaluate(root => [...root.querySelectorAll("h1,h2,h3,p,input,select,textarea,button,summary,svg")].filter(el => {
      const box = el.getBoundingClientRect();
      const clippedText = !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && el.scrollWidth > el.clientWidth + 2;
      return box.width > 0 && (box.right > innerWidth + 1 || box.left < -1 || clippedText);
    }).map(el => el.tagName + ":" + el.textContent?.slice(0,50)));
    expect(overflow).toEqual([]);
  }
  await page.locator(".ds-hero").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("mobile-spacing-fallback.png") });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("design preview is readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/design");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".ds-font-list li")).toHaveCount(117);
  await expect(page.getByRole("button", { name: "Send inquiry" })).toBeDisabled();
  await context.close();
});
