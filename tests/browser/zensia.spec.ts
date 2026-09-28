import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("Zensia upgrade uses a real coffee-product hero, commerce actions and responsive product switching", async ({ page }) => {
  const errors:string[]=[];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/zensia");

  await expect(page.getByRole("heading",{level:1})).toContainText("Coffee");
  await expect(page.getByText("with room to stay.")).toBeVisible();
  await expect(page.getByAltText("Zensia Zen at Home Colombian coffee")).toBeVisible();
  await page.screenshot({path:"test-results/zensia-brewns/desktop-hero.png",fullPage:false});

  const selectors=page.getByRole("group",{name:"Choose a Zensia coffee product"}).getByRole("button");
  await expect(selectors).toHaveCount(4);
  await selectors.nth(2).click();
  await expect(selectors.nth(2)).toHaveAttribute("aria-pressed","true");

  await page.locator("#z2-coffee").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading",{name:/One origin/i})).toBeVisible();
  await expect(page.locator(".z2-profile")).toHaveCount(4);

  await page.locator("#z2-visit").scrollIntoViewIfNeeded();
  await page.screenshot({path:"test-results/zensia-brewns/desktop-visit.png",fullPage:false});
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toHaveAttribute("href","https://zensia-coffee-llc.square.site/");
  await expect(page.getByRole("link",{name:/View menu/i}).first()).toHaveAttribute("href","https://www.zensiacoffee.com/actual-menu");
  await expect(page.getByRole("link",{name:/Join Calm Club/i}).first()).toHaveAttribute("href","https://profile.squareup.com/loyalty/MLX5PRMQ9XZ02");
  expect(errors).toEqual([]);
});

test("Zensia upgrade is deliberately composed on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/zensia");

  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await page.screenshot({path:"test-results/zensia-brewns/mobile-hero.png",fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await page.locator("#z2-coffee").scrollIntoViewIfNeeded();
  await expect(page.locator(".z2-profile")).toHaveCount(4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await page.locator("#z2-visit").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("Zensia upgrade keeps the essential story readable without JavaScript", async ({ browser }) => {
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto("/zensia");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.getByRole("link",{name:/Order online/i}).first()).toBeVisible();
  await expect(page.locator(".z2-profile")).toHaveCount(4);
  await context.close();
});
