import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("Zensia renders the 3D cup journey, coffee rack, full menu and commerce path",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/zensia");

  await expect(page.getByRole("heading",{level:1})).toContainText("Coffee");
  await expect(page.locator(".zi-cup-canvas")).toBeVisible();
  await expect(page.locator(".zi-cup-stage")).toBeVisible();
  await expect(page.locator(".zi-cup-orbit")).toBeVisible();
  await page.screenshot({path:"test-results/zensia-imagination/desktop-hero.png",fullPage:false});

  await page.locator(".zi-kinetic").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/A cup can/i})).toBeVisible();
  await expect(page.locator(".zi-cup-stage")).toBeVisible();
  await page.screenshot({path:"test-results/zensia-imagination/desktop-cup-journey.png",fullPage:false});

  await page.locator("#zi-coffee").scrollIntoViewIfNeeded();
  const products=page.getByRole("group",{name:"Choose a Zensia coffee product"}).getByRole("button");
  await expect(products).toHaveCount(4);
  await products.nth(1).click();
  await expect(products.nth(1)).toHaveAttribute("aria-pressed","true");
  await expect(page.getByAltText("Zensia Zen at Home Colombian coffee")).toBeVisible();

  await page.locator(".zi-recipes").scrollIntoViewIfNeeded();
  await expect(page.locator(".zi-recipe")).toHaveCount(3);

  await page.locator("#zi-menu").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/Find your pause/i})).toBeVisible();
  await expect(page.locator(".zim-menu__fallback")).toBeVisible();
  const categories=page.getByRole("group",{name:"Menu categories"}).getByRole("button");
  await expect(categories).toHaveCount(6);
  await expect(page.locator(".zim-menu__item")).toHaveCount(7);

  await page.getByRole("button",{name:"Cold Beverages: 13 items"}).click();
  await expect(page.locator(".zim-menu__item")).toHaveCount(13);
  await page.getByRole("button",{name:"Fruit Slush/Juice"}).click();
  await expect(page.locator(".zim-menu__photo-stage")).toBeVisible();
  await expect(page.locator(".zim-menu__variant-row").getByRole("button")).toHaveCount(7);
  await page.getByRole("button",{name:"Passion Fruit",exact:true}).click();
  await expect(page.locator(".zim-menu__selected-variant")).toHaveText("Passion Fruit");
  await page.screenshot({path:"test-results/zensia-imagination/desktop-full-menu.png",fullPage:false});

  await page.locator("#zi-visit").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toHaveAttribute("href","https://zensia-coffee-llc.square.site/");
  expect(errors).toEqual([]);
});

test("Zensia keeps the cup, rack and immersive menu usable on mobile without overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/zensia");

  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.locator(".zi-cup-canvas")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/zensia-imagination/mobile-hero.png",fullPage:false});

  await page.locator(".zi-kinetic").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/A cup can/i})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);

  await page.locator("#zi-coffee").scrollIntoViewIfNeeded();
  await expect(page.locator(".zi-rack__product")).toHaveCount(4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);

  await page.locator("#zi-menu").scrollIntoViewIfNeeded();
  await page.getByRole("button",{name:"Empanadas: 6 items"}).click();
  await expect(page.locator(".zim-menu__item")).toHaveCount(6);
  await expect(page.getByRole("button",{name:"Corn Spinach"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/zensia-imagination/mobile-full-menu.png",fullPage:false});
});

test("Zensia remains readable without JavaScript",async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toBeVisible();
  await expect(page.getByText("Passion Fruit Delight",{exact:true})).toBeVisible();
  await context.close();
});
