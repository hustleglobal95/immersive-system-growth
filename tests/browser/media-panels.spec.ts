import { test,expect } from "@playwright/test";
test("media preview overlaps, reverses, and respects reduced motion",async({page})=>{
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.goto("/lab");
  await page.getByLabel("Preview media transitions (illustrations)").check();
  const first=page.locator('[data-media-panel="0"]');
  await expect(first).toHaveCSS("visibility","visible");
  expect(await page.locator("[data-media-panel]").count()).toBeLessThanOrEqual(3);
  await page.locator('a[href="#threshold"]').click();
  await expect(page.locator('[data-media-panel="2"]')).toHaveCSS("visibility","visible");
  await page.locator('a[href="#arrival"]').click();
  await expect(first).toHaveCSS("visibility","visible");
  await page.getByLabel("Reduced motion",{exact:true}).check();
  await expect(page.locator(".cinematic-media")).toHaveCount(0);
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
});
