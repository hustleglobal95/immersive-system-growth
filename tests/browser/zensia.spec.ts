import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("Zensia matches the approved cafe-world direction and interaction contract",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));

  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1,name:/A Coffee Experience/i})).toBeVisible();
  await expect(page.locator(".zc-hero .zc-slice__plate")).toBeVisible();
  await expect(page.locator(".zc-cup-interaction")).toBeVisible();
  await expect(page.locator(".zc-steam-ribbon")).toHaveCount(3);
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toHaveAttribute("href","https://zensia-coffee-llc.square.site/");
  await page.screenshot({path:"test-results/zensia-coffee-experience/desktop-hero.png",fullPage:false});

  await page.locator("#zc-coffee").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Exceptional Coffee/i})).toBeVisible();
  await expect(page.locator(".zc-coffee-stream")).toBeVisible();
  await expect(page.locator(".zc-coffee-fill")).toBeVisible();
  await page.waitForTimeout(450);
  await page.screenshot({path:"test-results/zensia-coffee-experience/desktop-coffee.png",fullPage:false});

  await page.locator("#zc-rack").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/From Our Café/i})).toBeVisible();
  await expect(page.getByRole("list",{name:"Coffee rack"}).getByRole("listitem")).toHaveCount(18);
  await page.screenshot({path:"test-results/zensia-coffee-experience/desktop-rack.png",fullPage:false});

  await page.locator("#zc-recipes").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Timeless/i})).toBeVisible();
  await expect(page.getByRole("list",{name:"Coffee recipes"}).getByRole("listitem")).toHaveCount(5);

  await page.locator("#zc-story").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Rooted in/i})).toBeVisible();

  await page.locator("#zc-visit").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Good Coffee/i})).toBeVisible();
  await expect(page.getByRole("link",{name:/Order online/i}).last()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Zensia remains authored on mobile without horizontal overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/zensia-coffee-experience/mobile-hero.png",fullPage:false});

  for(const selector of ["#zc-coffee","#zc-rack","#zc-recipes","#zc-story","#zc-visit"]){
    await page.locator(selector).scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
});

test("Zensia remains readable without JavaScript",async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.getByRole("heading",{name:/From Our Café/i})).toBeVisible();
  await expect(page.getByRole("heading",{name:/Timeless/i})).toBeVisible();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toBeVisible();
  await context.close();
});
