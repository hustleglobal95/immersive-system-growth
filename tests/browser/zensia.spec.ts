import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("Zensia preserves one spatial canvas, clear conversion actions and the calm-mode signature interaction", async ({ page }) => {
  const errors:string[]=[];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toContainText("When the city shouts");
  await expect(page.locator(".zensia-scene")).toHaveCount(6);
  await expect(page.locator("canvas")).toHaveCount(1);

  await page.getByRole("button",{name:"Index"}).click();
  await expect(page.getByRole("navigation",{name:"Experience chapters"}).getByRole("link")).toHaveCount(6);
  await page.getByRole("link",{name:/04 Pause/}).click();

  const calm=page.getByRole("button",{name:"Enter calm mode"});
  await calm.scrollIntoViewIfNeeded();
  await calm.click();
  await expect(page.locator(".zensia")).toHaveAttribute("data-calm","true");
  await expect(page.getByRole("button",{name:"Return to city pace"})).toHaveAttribute("aria-pressed","true");

  await page.locator("#zensia-visit").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link",{name:"Order online"})).toHaveAttribute("href","https://zensia-coffee-llc.square.site/");
  await expect(page.getByRole("link",{name:"View menu"})).toHaveAttribute("href","https://www.zensiacoffee.com/actual-menu");
  await expect(page.getByRole("link",{name:"Join Calm Club"})).toHaveAttribute("href","https://profile.squareup.com/loyalty/MLX5PRMQ9XZ02");
  expect(errors).toEqual([]);
});

test("Zensia mobile and reduced-motion modes preserve the narrative and avoid horizontal overflow", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/zensia");
  for(const id of ["zensia-threshold","zensia-origin","zensia-ritual","zensia-pause","zensia-stay","zensia-visit"]){
    await page.evaluate(id => document.getElementById(id)!.scrollIntoView({behavior:"instant"}),id);
    await expect(page.locator(`#${id}`)).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await expect(page.getByRole("link",{name:"Order online"})).toBeVisible();
});

test("Zensia keeps its essential story readable without JavaScript", async ({ browser }) => {
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.locator(".zensia-scene")).toHaveCount(6);
  await expect(page.getByRole("link",{name:"Order online"})).toBeVisible();
  await context.close();
});
