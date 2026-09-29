import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("Zensia renders the full authored coffee-shop experience",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/zensia");

  await expect(page.getByRole("heading",{level:1,name:/A Coffee Experience/i})).toBeVisible();
  await expect(page.locator(".zc-cup-stage")).toBeVisible();
  await expect(page.locator(".zc-steam__strand")).toHaveCount(3);
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toHaveAttribute("href","https://zensia-coffee-llc.square.site/");
  await page.screenshot({path:"test-results/zensia-real-cafe/desktop-hero.png",fullPage:false});

  await page.locator("#coffee").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Exceptional Coffee/i})).toBeVisible();
  await expect(page.locator(".zc-glass")).toBeVisible();
  await page.screenshot({path:"test-results/zensia-real-cafe/desktop-coffee.png",fullPage:false});

  await page.locator("#rack").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/From Our Café/i})).toBeVisible();
  await expect(page.locator(".zc-rack__case")).toBeVisible();
  await page.screenshot({path:"test-results/zensia-real-cafe/desktop-rack.png",fullPage:false});

  await page.locator("#recipes").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Timeless/i})).toBeVisible();
  await expect(page.locator(".zc-recipe-card")).toHaveCount(5);

  await page.locator("#story").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Rooted in/i})).toBeVisible();

  await page.locator("#visit").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Good Coffee/i})).toBeVisible();
  expect(errors).toEqual([]);
});

test("Zensia mobile remains usable without horizontal page overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/zensia-real-cafe/mobile-hero.png",fullPage:false});

  for(const selector of ["#coffee","#rack","#recipes","#story","#visit"]){
    await page.locator(selector).scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
});
