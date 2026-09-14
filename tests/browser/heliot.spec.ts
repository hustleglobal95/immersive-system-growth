import { test, expect } from '@playwright/test';

test('HELIOT preserves its canvas, chapter navigation and reverse scrolling', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/heliot');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Light.Held still.');
  await expect(page.locator('.heliot-act')).toHaveCount(10);
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.waitForFunction(() => document.documentElement.dataset.heliotReady === 'true');
  const canvas = await page.locator('canvas').elementHandle();
  for (const id of ['optical-path', 'convergence', 'form', 'first-light']) {
    await page.evaluate(id => document.getElementById(id)!.scrollIntoView({behavior:'instant'}), id);
    await expect(page.locator(`#${id} h1, #${id} h2`)).toBeInViewport();
    expect(await canvas!.evaluate(element => element.isConnected)).toBe(true);
  }
  await page.getByRole('button', {name:'Index +'}).click();
  await expect(page.getByRole('navigation', {name:'All ten chapters'}).getByRole('link')).toHaveCount(10);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name:'Index +'})).toBeFocused();
  expect(errors).toEqual([]);
});

test('HELIOT keyboard inspection, finish, aperture and export work end to end', async ({ page }) => {
  await page.goto('/heliot');
  await page.evaluate(() => document.getElementById('aperture')!.scrollIntoView({behavior:'instant'}));
  const aperture = page.getByRole('slider', {name:'Aperture',exact:true});
  await aperture.focus(); await aperture.press('End');
  await expect(aperture).toHaveAttribute('aria-valuetext', 'f/8');
  await page.evaluate(() => document.getElementById('perspective')!.scrollIntoView({behavior:'instant'}));
  await page.getByRole('button', {name:'Titanium',exact:true}).click();
  await expect(page.getByRole('button', {name:'Titanium',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Rotate right',exact:true}).click();
  await expect(page.getByRole('slider',{name:'Instrument rotation'})).not.toHaveAttribute('aria-valuenow','0');
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await expect(page.getByRole('slider',{name:'Instrument rotation'})).toHaveAttribute('aria-valuenow','0');
  await page.evaluate(() => document.getElementById('keep-light')!.scrollIntoView({behavior:'instant'}));
  const [download] = await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Save your edition'}).click()]);
  expect(download.suggestedFilename()).toBe('heliot-01-your-edition.json');
  const stream = await download.createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString())).toMatchObject({finish:'Titanium',aperture:8,relativeLightPercent:3});
});

test('HELIOT mobile and reduced motion keep all content and controls accessible', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/heliot');
  await expect(page.locator('.heliot')).toHaveAttribute('data-motion','reduced');
  for (const id of ['first-light','aperture','perspective','keep-light']) {
    await page.evaluate(id => document.getElementById(id)!.scrollIntoView({behavior:'instant'}),id);
    await expect(page.locator(`#${id} h1, #${id} h2`)).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await expect(page.getByRole('button',{name:'Save your edition'})).toBeInViewport();
});

test('HELIOT remains readable without JavaScript and recovers visually without WebGL', async ({ browser, page }) => {
  const context=await browser.newContext({javaScriptEnabled:false}); const staticPage=await context.newPage();
  await staticPage.goto('/heliot');
  await expect(staticPage.locator('.heliot-act')).toHaveCount(10);
  await expect(staticPage.getByRole('heading',{level:1})).toBeVisible();
  await context.close();
  await page.addInitScript(() => {
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this: HTMLCanvasElement,type: string,...args: unknown[]) { if(type==='webgl'||type==='webgl2') return null; return original.apply(this,[type,...args] as Parameters<typeof original>); } as typeof original;
  });
  await page.goto('/heliot');
  await expect(page.locator('.heliot')).toHaveAttribute('data-fallback','true');
  await expect(page.locator('.heliot-static-lens')).toBeVisible();
});
