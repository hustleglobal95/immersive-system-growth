import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("Zensia imagination pass renders the kinetic hero and commerce path",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toContainText("Coffee");
  await expect(page.getByAltText("Zensia Zen at Home Colombian coffee")).toBeVisible();
  await expect(page.locator(".zi-object-field")).toBeVisible();
  await expect(page.locator(".zi-orbit--outer")).toBeVisible();
  await expect(page.locator(".zi-seal")).toBeVisible();
  await page.screenshot({path:"test-results/zensia-imagination/desktop-hero.png",fullPage:false});

  const selectors=page.getByRole("group",{name:"Choose a Zensia coffee product"}).getByRole("button");
  await expect(selectors).toHaveCount(4);
  await selectors.nth(1).click();
  await expect(selectors.nth(1)).toHaveAttribute("aria-pressed","true");

  await page.locator(".zi-kinetic").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/A cup can/i})).toBeVisible();
  await expect(page.locator(".zi-kinetic__tile")).toHaveCount(2);
  await page.screenshot({path:"test-results/zensia-imagination/desktop-kinetic.png",fullPage:false});

  await page.locator("#zi-visit").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toHaveAttribute("href","https://zensia-coffee-llc.square.site/");
  expect(errors).toEqual([]);
});

test("Zensia imagination pass keeps the kinetic language on mobile without overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.locator(".zi-object-field")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/zensia-imagination/mobile-hero.png",fullPage:false});

  await page.locator(".zi-kinetic").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/A cup can/i})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);

  await page.locator("#zi-visit").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test("Zensia imagination pass remains readable without JavaScript",async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toBeVisible();
  await context.close();
});
