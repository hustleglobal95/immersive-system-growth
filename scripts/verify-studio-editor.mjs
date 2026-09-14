import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { parseExperience } from '../src/lib/configSchema.ts';
const output = 'test-results/studio-editor';
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000'], { stdio: ['ignore','pipe','pipe'] });
let log = ''; server.stdout.on('data', d => log += d); server.stderr.on('data', d => log += d);
let browser, page;
const errors = [], checks = [], captures = [], captureWarnings = [];
function report(phase, error) {
  writeFileSync(`${output}/report.json`, JSON.stringify({ passed: phase === 'passed', phase, error, sourceRevision: process.env.GITHUB_SHA ?? null, renderQuality: 'low', renderer: 'SwiftShader', checks, browserErrors: errors, captures, captureWarnings }, null, 2));
}
const passed = name => { checks.push(name); console.log(`PASS: ${name}`); report('running'); };
async function bounded(promise, ms, label) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms); })]); }
  finally { clearTimeout(timer); }
}
async function assertViewport() {
  await page.waitForFunction(() => {
    const viewport = document.querySelector('.studio-preview__viewport');
    const frame = viewport?.querySelector('.studio-preview__canvas');
    const canvas = frame?.querySelector('canvas');
    if (!frame || !canvas) return false;
    const bounds = frame.getBoundingClientRect();
    const rendered = canvas.getBoundingClientRect();
    const kind = viewport.dataset.viewport;
    const ratio = kind === 'mobile' ? 9 / 16 : kind === 'tablet' ? 4 / 3 : 16 / 9;
    return bounds.width > 0 && bounds.height > 0 && rendered.height > 0 && canvas.height > 0
      && Math.abs(bounds.width / bounds.height - ratio) < .015
      && Math.abs(rendered.width / rendered.height - ratio) < .015
      && Math.abs(canvas.width / canvas.height - ratio) < .015
      && Math.abs(rendered.width - bounds.width) < 2
      && (kind !== 'mobile' || bounds.width <= 320.5);
  }, null, { timeout: 60000 });
}
async function capture(name) {
  await assertViewport();
  await page.waitForFunction(() => document.documentElement.dataset.heliotReady === 'true', null, { timeout: 60000 });
  await bounded(page.evaluate(() => window.scrollTo(0, 0)), 10000, 'Position screenshot');
  // Capture the actual view. A software-GPU surface readback can stall, so allow
  // one view-readback fallback without changing the scene or its quality.
  for (const fromSurface of [true, false]) {
    let session;
    try {
      session = await page.context().newCDPSession(page);
      const shot = await bounded(session.send('Page.captureScreenshot', {
        format: 'png', fromSurface, captureBeyondViewport: false,
      }), 35000, `${name} (${fromSurface ? 'surface' : 'view'})`);
      await writeFile(`${output}/${name}.png`, Buffer.from(shot.data, 'base64'));
      captures.push(`${name}.png`);
      return;
    } catch (error) {
      captureWarnings.push(`${name}: ${String(error)}`);
    } finally {
      if (session) await bounded(session.detach(), 3000, 'Detach screenshot session').catch(() => {});
      report('running');
    }
  }
}

report('running');
try {
  let ready = false;
  for (let i=0;i<60;i++) { try { const response = await fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(2000) }); if (response.ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r,500)); }
  if (!ready) throw new Error('Production server failed to start.');
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding'] });
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3000/studio', { waitUntil: 'domcontentloaded' });
  // Exercise the actual low-quality renderer on a software GPU. This is not hardware FPS certification.
  await page.getByLabel('Preview quality', { exact: true }).selectOption('low');
  await page.getByLabel('Studio project', { exact: true }).selectOption('HELIOT');
  await expect(page.locator('.studio-preview')).toHaveAttribute('data-runtime','heliot');
  await expect(page.locator('.studio-preview canvas')).toBeVisible({ timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.heliotReady === 'true', null, { timeout: 60000 });
  await assertViewport();
  passed('production HELIOT world and desktop canvas aspect');
  await page.locator('.pro-advanced-camera > summary').click();
  const select = page.getByRole('combobox', { name: /^Selected point/ });
  await expect(select).toBeVisible();
  const before = await select.locator('option').count();
  if (before < 2) throw new Error('Camera is missing its start/end points.');
  await page.getByRole('button', { name: 'Add waypoint', exact: true }).click();
  await expect(select.locator('option')).toHaveCount(before + 1);
  passed('camera waypoint insert');
  const pointX = page.getByLabel('Point position X', { exact: true });
  await pointX.fill('6'); await pointX.press('Tab'); await expect(pointX).toHaveValue('6');
  passed('camera numeric edit');
  await page.getByRole('button', { name: 'Save snapshot', exact: true }).click();
  const saved = await page.evaluate(() => { const key=Object.keys(localStorage).find(k=>k.startsWith('forge-workspace-project:HELIOT')); return JSON.parse(localStorage.getItem(key)); });
  parseExperience(saved);
  if (saved.scenes[0].camera.from.position[0] !== 6) throw new Error('Snapshot does not contain camera edit.');
  passed('validated local snapshot');
  const circle = page.getByRole('button', { name: 'TOP / XZ point 1', exact: true });
  await circle.scrollIntoViewIfNeeded();
  const box = await circle.boundingBox(); if (!box) throw new Error('No draggable camera handle.');
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down(); await page.mouse.move(box.x+box.width/2+15,box.y+box.height/2,{ steps: 5 }); await page.mouse.up();
  await expect(pointX).not.toHaveValue('6');
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(pointX).toHaveValue('6');
  passed('grouped camera drag undo');
  await page.getByRole('button', { name: 'Orbit / edit view', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Return to film camera', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to film camera', exact: true }).click();
  passed('orbit view and film camera return');
  const range = page.getByLabel('Global cinematic progress', { exact: true });
  await range.focus(); await range.press('Home'); for(let i=0;i<23;i++) await range.press('ArrowRight');
  await expect(range).toHaveValue('0.023');
  passed('exact timeline seek');
  await page.getByLabel('Studio project', { exact: true }).selectOption('NOCTERRA');
  await expect(page.locator('.studio-preview')).toHaveAttribute('data-runtime','forge');
  await page.getByLabel('Studio project', { exact: true }).selectOption('HELIOT');
  await expect(page.getByLabel('Point position X', { exact: true })).toHaveValue('6');
  passed('project draft recovery');
  await page.getByRole('button', { name: 'environment', exact: true }).click();
  await page.getByRole('button', { name: 'Cool gallery', exact: true }).click();
  await page.getByRole('button', { name: 'camera', exact: true }).click();
  await page.getByRole('combobox', { name: /^Edit camera/ }).selectOption('mobile');
  await expect(page.locator('.studio-preview__viewport')).toHaveAttribute('data-viewport','mobile');
  await assertViewport();
  passed('mobile preview framing and actual 9:16 canvas');
  await page.getByRole('combobox', { name: /^Edit camera/ }).selectOption('desktop');
  await page.locator('.builder-library summary').click();
  await page.getByLabel('Hosted GLB path').fill('/models/heliot/heliot-01-low.glb');
  await page.getByRole('button', { name: 'Add model URL', exact: true }).click();
  const objectX = page.getByLabel('Position X', { exact: true });
  await expect(objectX).toBeVisible(); await objectX.fill('3'); await objectX.press('Tab'); await expect(objectX).toHaveValue('3');
  passed('model placement and numeric object transform');
  await page.getByRole('button', { name: 'Keyframe sequencer', exact: true }).click();
  await page.getByLabel('Preview quality', { exact: true }).selectOption('low');
  await page.getByLabel('Motion target', { exact: true }).selectOption('camera.position');
  await page.getByRole('button', { name: 'Add track', exact: true }).click();
  await page.getByLabel('Keyframe X', { exact: true }).fill('6.25');
  await page.getByLabel('Keyframe X', { exact: true }).press('Tab');
  await expect(page.getByLabel('Keyframe X', { exact: true })).toHaveValue('6.25');
  passed('keyframe track creation and editing');
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  await page.getByLabel('Preview quality', { exact: true }).selectOption('low');
  await page.getByRole('button', { name: 'Review & export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(`${output}/exported-experience.json`);
  const exported = parseExperience(JSON.parse(await readFile(`${output}/exported-experience.json`,'utf8')));
  if (exported.scenes[0].world.keyColor !== '#d6e5ff') throw new Error('Lighting preset missing in exported scene.');
  if (!exported.assets.some(a => a.url === '/models/heliot/heliot-01-low.glb' && a.position[0] === 3)) throw new Error('Edited model missing from export.');
  const track = exported.scenes[0].motionTracks.find(t => t.target === 'camera.position');
  if (!track || track.keyframes[0].value[0] !== 6.25) throw new Error('Edited camera keyframe missing from export.');
  passed('validated JSON export including assets, lighting and keyframes');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  if (await page.getByRole('button', { name: 'Close dialog', exact: true }).count()) await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'camera', exact: true }).click();
  await capture('studio-workspace');
  await page.getByRole('button', { name: 'Orbit / edit view', exact: true }).click();
  await capture('studio-camera-editor');
  await page.getByRole('button', { name: 'Return to film camera', exact: true }).click();
  await page.getByRole('combobox', { name: /^Edit camera/ }).selectOption('mobile');
  await capture('studio-mobile-framing');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  if (captures.length !== 3) throw new Error(`Only ${captures.length}/3 required screenshots captured: ${captureWarnings.join('; ')}`);
  report('passed');
} catch (error) {
  report('failed', String(error));
  if (page) {
    await page.screenshot({ path: `${output}/failure.png`, timeout: 10000 }).catch(()=>{});
    await bounded(page.content(), 10000, 'Failure DOM capture').then(html => writeFile(`${output}/page.html`, html)).catch(()=>{});
  }
  throw error;
} finally {
  await writeFile(`${output}/server.log`,log);
  if (browser) await bounded(browser.close(), 10000, 'Browser shutdown').catch(()=>{});
  server.kill('SIGTERM');
}
