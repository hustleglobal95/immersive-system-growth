import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { parseExperience } from '../src/lib/configSchema.ts';
const output='test-results/studio-pro';
await mkdir(output,{recursive:true});
const port=3310, base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,STUDIO_LOCAL_ASSET_UPLOADS:'1',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
let serverLog='',browser,page;
server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
const checks=[],errors=[],captures=[];
const report=async(passed,error)=>writeFile(`${output}/report.json`,JSON.stringify({passed,error,checks,browserErrors:errors,captures,renderer:'Chromium / software GPU',quality:'low',source:process.env.GITHUB_SHA??'local'},null,2));
const pass=async(name)=>{checks.push(name);console.log('PASS:',name);await report(false,'Verification in progress');};
const documentValue=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('forge-studio-v2')).experience);
const snapshot=async(name)=>{await page.screenshot({path:`${output}/${name}.png`,timeout:45000});captures.push(`${name}.png`);};
try{
  let ready=false;
  for(let i=0;i<60;i++){try{const r=await fetch(`${base}/api/health`,{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
  if(!ready)throw new Error('Production server did not start.');
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/studio`,{waitUntil:'domcontentloaded'});
  await page.getByLabel('Preview quality',{exact:true}).selectOption('low');
  await expect(page.locator('.studio-preview')).toHaveAttribute('data-runtime','heliot');
  await page.waitForFunction(()=>document.documentElement.dataset.heliotReady==='true',null,{timeout:60000});
  await expect(page.locator('.studio-preview canvas')).toBeVisible();
  await expect.poll(async()=>Number(await page.getByTestId('studio-render-stats').getAttribute('data-calls'))).toBeGreaterThan(0);
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);
  const viewport=await page.locator('.studio-preview__canvas').boundingBox();
  if(!viewport||viewport.width<500||viewport.height<280)throw new Error('Desktop viewport is too small or collapsed.');
  if(Math.abs(viewport.width/viewport.height-16/9)>.02)throw new Error('Desktop camera viewport is stretched.');
  await pass('Production HELIOT render, real GPU counters, viewport aspect, and no horizontal overflow');
  await snapshot('01-workspace');

  const pointX=page.getByLabel('Point position X',{exact:true});
  await pointX.fill('6');await pointX.press('Tab');await expect(pointX).toHaveValue('6');
  const select=page.getByRole('combobox',{name:/^Selected point/});const count=await select.locator('option').count();
  await page.getByRole('button',{name:'Add waypoint',exact:true}).click();await expect(select.locator('option')).toHaveCount(count+1);
  const handle=page.getByRole('button',{name:'TOP / XZ point 1',exact:true});await handle.scrollIntoViewIfNeeded();const hb=await handle.boundingBox();
  if(!hb)throw new Error('Camera point handle is missing.');
  await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.mouse.move(hb.x+hb.width/2+20,hb.y+hb.height/2,{steps:5});await page.mouse.up();
  await expect(pointX).not.toHaveValue('6');await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(pointX).toHaveValue('6');
  await pass('Waypoint insertion, exact numeric edits, pointer drag, and one-step drag undo');

  await page.getByRole('button',{name:'Orbit / edit view',exact:true}).click();
  await page.getByRole('button',{name:'Frame selected object',exact:true}).click();
  await page.waitForTimeout(500);
  await page.getByRole('button',{name:/^Capture start/}).click();
  const captured=await documentValue();
  if(captured.scenes[0].camera.from.position[0]===6)throw new Error('Visual camera capture did not save the live camera.');
  await page.getByRole('button',{name:'Return to film camera',exact:true}).click();
  await pass('Orbit control, selection framing, and visual capture to authored camera pose');

  await page.getByRole('button',{name:'story',exact:true}).click();
  await page.getByLabel('Scene name',{exact:true}).fill('First light / directed');
  await page.getByLabel('Scene headline',{exact:true}).fill('Made to see differently.');
  await page.getByLabel('Scene headline',{exact:true}).press('Tab');
  await expect.poll(async()=>(await documentValue()).scenes[0].copy.headline).toBe('Made to see differently.');
  await page.getByRole('button',{name:'Add scene',exact:true}).click();
  await expect.poll(async()=>(await documentValue()).scenes.length).toBe(11);
  await page.getByRole('button',{name:'Duplicate scene',exact:true}).click();await expect.poll(async()=>(await documentValue()).scenes.length).toBe(12);
  await page.getByRole('button',{name:'Delete selected scene',exact:true}).click();
  await page.getByRole('dialog',{name:'Delete this scene?'}).getByRole('button',{name:'Delete scene',exact:true}).click();
  await expect.poll(async()=>(await documentValue()).scenes.length).toBe(11);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await documentValue()).scenes.length).toBe(12);
  await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await documentValue()).scenes.length).toBe(11);
  parseExperience(await documentValue());await pass('Scene copy editing, creation, duplication, confirmed deletion, undo and redo');

  await page.keyboard.press('Control+k');await page.getByLabel('Search commands',{exact:true}).fill('First light');
  await page.getByRole('dialog').getByRole('button',{name:/First light \/ directed/}).click();
  await expect(page.locator('.forge-stage__meta strong')).toHaveText('First light / directed');
  await page.getByRole('button',{name:'environment',exact:true}).click();await page.getByRole('button',{name:'Cool gallery',exact:true}).click();
  await expect.poll(async()=>(await documentValue()).scenes[0].world.keyColor).toBe('#d6e5ff');
  await page.getByLabel('exposure value',{exact:true}).fill('1.2');await page.getByLabel('exposure value',{exact:true}).press('Tab');
  await pass('Command search selects scenes; lighting preset and precise exposure edit persist');

  await page.getByRole('button',{name:'camera',exact:true}).click();await page.getByRole('combobox',{name:/^Edit camera/}).selectOption('mobile');
  await expect(page.locator('.studio-preview__viewport')).toHaveAttribute('data-viewport','mobile');
  await page.waitForFunction(()=>{const b=document.querySelector('.studio-preview__canvas')?.getBoundingClientRect();return b&&Math.abs(b.width/b.height-9/16)<.02;});
  await page.getByRole('button',{name:'Toggle composition guides',exact:true}).click();await expect(page.locator('.pro-composition-grid')).toBeVisible();
  await snapshot('02-mobile-framing');
  await page.getByRole('button',{name:'Toggle composition guides',exact:true}).click();
  await page.getByRole('combobox',{name:/^Edit camera/}).selectOption('desktop');
  await pass('Mobile override preview, true portrait canvas, and composition guides');

  await page.getByRole('tab',{name:'library',exact:true}).click();
  await page.locator('input[type="file"][accept=".glb"]').setInputFiles('public/models/reference/product.glb');
  const objectX=page.getByLabel('Position X',{exact:true});await expect(objectX).toBeVisible();await objectX.fill('3');await objectX.press('Tab');
  await expect.poll(async()=>(await documentValue()).assets.some(a=>a.id==='product'&&a.position[0]===3)).toBe(true);
  await page.getByRole('button',{name:'Duplicate object',exact:true}).click();await expect.poll(async()=>(await documentValue()).assets.length).toBe(2);
  const model=(await documentValue()).assets.find(a=>a.id==='product');const loaded=await page.request.get(base+model.url);if(!loaded.ok())throw new Error('Imported GLB is not retrievable.');
  const denied=await page.request.post(base+'/api/studio/assets',{headers:{origin:'https://other.example','Content-Type':'model/gltf-binary'},data:await readFile('public/models/reference/product.glb')});
  if(denied.status()!==403)throw new Error('Cross-origin upload was not rejected.');
  await pass('Local self-contained GLB import, serving, object transform, duplication, and cross-origin denial');

  await page.getByRole('button',{name:'Version history',exact:true}).click();
  await page.getByLabel('Snapshot name',{exact:true}).fill('Directed review');await page.getByRole('button',{name:'Save version',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Version history'}).getByText('Directed review',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.getByRole('button',{name:'story',exact:true}).click();await page.getByLabel('Scene headline',{exact:true}).fill('Temporary direction');
  await page.getByRole('button',{name:'Version history',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Restore',exact:true}).first().click();
  await page.getByRole('button',{name:'story',exact:true}).click();await expect(page.getByLabel('Scene headline',{exact:true})).toHaveValue('Made to see differently.');
  await pass('Named version snapshot and validated restore');

  await page.getByRole('button',{name:'Keyframe sequencer',exact:true}).click();
  await page.getByLabel('Motion target',{exact:true}).selectOption('camera.position');await page.getByRole('button',{name:'Add track',exact:true}).click();
  await page.getByLabel('Keyframe X',{exact:true}).fill('6.25');await page.getByLabel('Keyframe X',{exact:true}).press('Tab');await expect(page.getByLabel('Keyframe X',{exact:true})).toHaveValue('6.25');
  await page.getByRole('button',{name:'Back to workspace',exact:true}).click();
  await page.getByLabel('Preview quality',{exact:true}).selectOption('low');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();
  const download=await downloadPromise;await download.saveAs(`${output}/exported-experience.json`);const exported=parseExperience(JSON.parse(await readFile(`${output}/exported-experience.json`,'utf8')));
  if(exported.scenes.length!==11||exported.scenes[0].world.keyColor!=='#d6e5ff'||!exported.assets.some(a=>a.position[0]===3)||!exported.scenes[0].motionTracks.some(t=>t.target==='camera.position'))throw new Error('Export is missing authored data.');
  await pass('Keyframe creation and round-trip validated export of scenes, lights, models and motion');

  await page.getByLabel('Studio project',{exact:true}).selectOption('NOCTERRA');await expect(page.locator('.studio-preview')).toHaveAttribute('data-runtime','forge');
  await page.getByLabel('Studio project',{exact:true}).selectOption('HELIOT');await expect(page.locator('.studio-preview')).toHaveAttribute('data-runtime','heliot');
  await expect.poll(async()=>(await documentValue()).scenes.length).toBe(11);
  await page.reload({waitUntil:'domcontentloaded'});await page.getByLabel('Preview quality',{exact:true}).selectOption('low');
  await expect.poll(async()=>(await documentValue()).scenes[0].copy.headline).toBe('Made to see differently.');
  await pass('Project switching preserves separate drafts; browser reload restores authored data');

  await page.getByRole('button',{name:'Studio help',exact:true}).click();await expect(page.getByRole('dialog',{name:'From a scene to a story.'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'From a scene to a story.'})).not.toBeVisible();
  await page.getByRole('button',{name:'Focus view',exact:true}).click();await expect(page.locator('.forge-inspector')).not.toBeVisible();await page.getByRole('button',{name:'Exit focus view',exact:true}).click();await expect(page.locator('.forge-inspector')).toBeVisible();
  await pass('Help dialog, Escape dismissal, and distraction-free focus mode');
  await page.getByRole('button',{name:'environment',exact:true}).click();await snapshot('03-light-inspector');
  await page.setViewportSize({width:1280,height:800});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);await snapshot('04-laptop');
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);await expect(page.getByRole('button',{name:'Export JSON',exact:true})).toBeVisible();await snapshot('05-mobile-editor');
  await pass('Laptop and narrow-screen layout without horizontal overflow');
  if(errors.length)throw new Error(errors.join('\n'));
  await report(true,null);
}catch(e){await report(false,String(e));if(page)await page.screenshot({path:`${output}/failure.png`,timeout:15000}).catch(()=>{});throw e;}
finally{await writeFile(`${output}/server.log`,serverLog);if(browser)await browser.close();server.kill('SIGTERM');}
