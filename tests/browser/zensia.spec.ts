import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("Zensia renders the persistent cup-led coffee shop experience",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));

  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1,name:/A coffee experience/i})).toBeVisible();
  await expect(page.locator(".zc-canvas canvas")).toBeVisible();
  await expect(page.getByText("Move your pointer. Scroll to pour.")).toBeVisible();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toHaveAttribute("href","https://zensia-coffee-llc.square.site/");
  await page.screenshot({path:"test-results/zensia-coffee-experience/desktop-hero.png",fullPage:false});

  await page.locator("#zc-coffee").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Exceptional coffee/i})).toBeVisible();
  await expect(page.locator(".zc-pour-glass")).toBeVisible();
  await expect(page.locator(".zc-product")).toHaveCount(4);
  await page.waitForTimeout(500);
  await page.screenshot({path:"test-results/zensia-coffee-experience/desktop-pour.png",fullPage:false});

  await page.locator("#zc-rack").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/coffee rack/i})).toBeVisible();
  await expect(page.locator(".zc-rack-item--bag")).toHaveCount(4);
  await expect(page.locator(".zc-rack-item--drink")).toHaveCount(5);
  await expect(page.getByText("Flat White",{exact:true})).toBeVisible();
  await expect(page.getByText("Affogato Coffee",{exact:true})).toBeVisible();
  await page.screenshot({path:"test-results/zensia-coffee-experience/desktop-rack.png",fullPage:false});

  await page.locator("#zc-recipes").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Timeless/i})).toBeVisible();
  await expect(page.locator(".zc-recipe-card")).toHaveCount(4);

  await page.locator("#zc-story").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Rooted in/i})).toBeVisible();

  await page.locator("#zc-visit").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Good coffee/i})).toBeVisible();
  await expect(page.getByRole("link",{name:/Order online/i}).last()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Zensia cup experience remains usable on mobile without overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/zensia");

  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.locator(".zc-canvas canvas")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/zensia-coffee-experience/mobile-hero.png",fullPage:false});

  await page.locator("#zc-coffee").scrollIntoViewIfNeeded();
  await expect(page.locator(".zc-product")).toHaveCount(4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);

  await page.locator("#zc-rack").scrollIntoViewIfNeeded();
  await expect(page.getByText("Cold Brew",{exact:true}).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);

  await page.locator("#zc-visit").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link",{name:/Order online/i}).last()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test("Zensia remains readable without JavaScript",async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.getByRole("heading",{name:/coffee rack/i})).toBeVisible();
  await expect(page.getByRole("heading",{name:/Timeless/i})).toBeVisible();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toBeVisible();
  await context.close();
});
