import { expect, test } from "@playwright/test";

test("Forge opens as a canvas-first website editor", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");

  await expect(page.locator("main.forge-next")).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Editor modes"}).getByRole("button",{name:"Design",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.locator(".forge-next__layers")).toBeVisible();
  await expect(page.locator(".forge-next__inspector")).toBeVisible();
  await expect(page.locator(".forge-next__canvas")).toBeVisible();
  await expect(page.locator(".forge-next__timeline")).toBeVisible();
  await expect(page.locator(".forge-next__canvas canvas").first()).toBeAttached();
});

test("Forge exposes the website authoring modes directly", async ({ page }) => {
  await page.goto("/studio");
  const nav=page.getByRole("navigation",{name:"Editor modes"});
  for(const name of ["Design","References","Motion","Interact","Assets","Effects"]) {
    await expect(nav.getByRole("button",{name,exact:true})).toBeVisible();
  }
  await expect(page.locator("main.production-studio")).toHaveCount(0);
  await expect(page.locator("details.production-advanced-menu")).toHaveCount(0);
});

test("AI Build opens from the canvas and stages a candidate", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button",{name:"AI Build",exact:true}).click();
  await expect(page.locator(".forge-next__ai-drawer")).toBeVisible();
  await expect(page.locator("#interactive-3d-build")).toBeVisible();
  await expect(page.getByLabel("AI website brief")).toBeVisible();
  await expect(page.getByRole("button",{name:"Build 3D direction",exact:true})).toBeVisible();
});

test("Command palette navigates the new Forge editor", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button",{name:"Open command palette"}).click();
  const palette=page.locator(".forge-next__command");
  await expect(palette).toBeVisible();
  await palette.getByRole("button",{name:"References",exact:true}).click();
  await expect(page.getByRole("heading",{name:"References",level:1})).toBeVisible();
});
