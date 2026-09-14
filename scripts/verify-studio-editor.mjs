import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { parseExperience } from '../src/lib/configSchema.ts';
const output = 'test-results/studio-editor';
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000'], { stdio: ['ignore','pipe','pipe'] });
let log = ''; server.stdout.on('data', d => log += d); server.stderr.on('data', d => log += d);
let browser, page;
const errors = [], checks = [], captures = [], captureWarnings = [];
const passed = name => { checks.push(name); console.log(`PASS: ${name}`); };
async function capture(name) {
  let session;
  try {
    await page.evaluate(() => window.scrollTo(0,0));
    session = await page.context().newCDPSession(page);
    const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    await writeFile(`${output}/${name}.png`, Buffer.from(shot.data,'base64'));
    captures.push(`${name}.png`);
  } catch (error) { captureWarnings.push(`${name}: ${String(error)}`); }
  finally { await session?.detach().catch(()=>{}); }
}
try {
  let ready = false;
  for (let i=0;i<60;i++) { try { const response = await fetch('http://127.0.0.1:3000/api/health'); if (response.ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r,500)); }
  if (!ready) throw new Error('Production server failed to start.');
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding'] });
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3000/studio', { waitUntil: 'domcontentloaded' });
  // Exercise the supported low-quality renderer on a software GPU, not a mocked canvas.
  // The production default remains unchanged. This is functional QA, not hardware FPS certification.
  await page.getByLabel('Preview quality', { exact: true }).selectOption('low');
  await page.getByLabel('Studio project', { exact: true }).selectOption('HELIOT');
  await expect(page.locator('.studio-preview')).toHaveAttribute('data-runtime','heliot');
  await expect(page.locator('.studio-preview canvas')).toBeVisible({ timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.heliotReady === 'true', null, { timeout: 60000 });
  passed('production HELIOT world at low quality');
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
  passed('mobile preview framing');
  await page.getByRole('combobox', { name: /^Edit camera/ }).selectOption('desktop');
  await page.locator('.builder-library summary').click();
  await page.getByLabel('Hosted GLB path').fill('/models/heliot/heliot-01-low.glb');
  await page.getByRole('button', { name: 'Add model URL', exact: true }).click();
  const objectX = page.getByLabel('Position X', { exact: true });
  await expect(objectX).toBeVisible(); await objectX.fill('3'); await objectX.press('Tab'); await expect(objectX).toHaveValue('3');
  passed('model placement and object transform');
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
  await page.getByRole('button', { name: 'camera', exact: true }).click();
  await capture('studio-workspace');
  await page.getByRole('button', { name: 'Orbit / edit view', exact: true }).click();
  await capture('studio-camera-editor');
  await page.getByRole('button', { name: 'Return to film camera', exact: true }).click();
  await page.getByRole('combobox', { name: /^Edit camera/ }).selectOption('mobile');
  await capture('studio-mobile-framing');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  await writeFile(`${output}/report.json`, JSON.stringify({ passed: true, renderQuality: 'low', renderer: 'SwiftShader', checks, browserErrors: errors, captures, captureWarnings },null,2));
} catch (error) {
  await writeFile(`${output}/report.json`, JSON.stringify({ passed: false, error: String(error), checks, browserErrors: errors, captures, captureWarnings },null,2));
  if (page) { await page.screenshot({ path: `${output}/failure.png`, timeout: 10000 }).catch(()=>{}); await writeFile(`${output}/page.html`,await page.content()).catch(()=>{}); }
  throw error;
} finally { await writeFile(`${output}/server.log`,log); await browser?.close(); server.kill('SIGTERM'); }
