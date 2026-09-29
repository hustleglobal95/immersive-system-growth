import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("Zensia renders the approved reference as the visual source of truth",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));

  await page.goto("/zensia");
  await expect(page.locator(".zc-reference__image")).toBeVisible();
  await expect(page.locator(".zc-steam__strand")).toHaveCount(3);
  await expect(page.locator(".zc-cup-focus")).toBeVisible();
  await expect(page.locator(".zc-pour-accent")).toBeVisible();
  await expect(page.getByRole("link",{name:"Order online"}).first()).toHaveAttribute("href","https://zensia-coffee-llc.square.site/");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/zensia-coffee-experience/desktop-reference.png",fullPage:true});
  expect(errors).toEqual([]);
});

test("Zensia reference remains aligned on mobile",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/zensia");
  await expect(page.locator(".zc-reference__image")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/zensia-coffee-experience/mobile-reference.png",fullPage:true});
});

test("Zensia keeps functional hotspot navigation",async({page})=>{
  await page.goto("/zensia");
  await expect(page.getByRole("link",{name:"Coffee"})).toHaveAttribute("href","#coffee");
  await expect(page.getByRole("link",{name:"Menu"})).toHaveAttribute("href","https://www.zensiacoffee.com/actual-menu");
  await expect(page.getByRole("link",{name:"Recipes"})).toHaveAttribute("href","#recipes");
  await expect(page.getByRole("link",{name:"Story"})).toHaveAttribute("href","#story");
  await expect(page.getByRole("link",{name:"Visit"})).toHaveAttribute("href","#visit");
});
