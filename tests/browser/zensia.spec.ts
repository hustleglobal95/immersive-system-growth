import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("Zensia preserves one spatial canvas, clear conversion actions and a reversible pace-controlled signature interaction", async ({ page }) => {
  const errors:string[]=[];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toContainText("When the city shouts");
  await expect(page.locator(".zensia-scene")).toHaveCount(6);
  await expect(page.locator("canvas")).toHaveCount(1);

  await page.getByRole("button",{name:"Index"}).click();
  await expect(page.getByRole("navigation",{name:"Experience chapters"}).getByRole("link")).toHaveCount(6);
  await page.getByRole("link",{name:/04 Pause/}).click();

  const pace=page.getByRole("slider",{name:"Change the pace from city rush to stay"});
  await pace.scrollIntoViewIfNeeded();
  await page.screenshot({path:"test-results/zensia-repair/desktop-signature-before.png",fullPage:false});
  await pace.fill("100");
  await expect(page.locator(".zensia")).toHaveAttribute("data-calm","true");
  await expect(page.locator(".zensia")).toHaveAttribute("data-pace-zone","stay");
  await expect(page.getByText("The room has changed pace.")).toBeVisible();
  await page.waitForTimeout(1450);
  await page.screenshot({path:"test-results/zensia-repair/desktop-signature-after.png",fullPage:false});
  await pace.fill("0");
  await expect(page.locator(".zensia")).toHaveAttribute("data-calm","false");
  await expect(page.locator(".zensia")).toHaveAttribute("data-pace-zone","rush");
  await pace.fill("100");
  await expect(page.locator(".zensia")).toHaveAttribute("data-pace-zone","stay");

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
    if(id==="zensia-pause"){
      const pace=page.getByRole("slider",{name:"Change the pace from city rush to stay"});
      await page.screenshot({path:"test-results/zensia-repair/mobile-signature-before.png",fullPage:false});
      await pace.fill("100");
      await expect(page.locator(".zensia")).toHaveAttribute("data-pace-zone","stay");
      await page.screenshot({path:"test-results/zensia-repair/mobile-signature-after.png",fullPage:false});
    }
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
