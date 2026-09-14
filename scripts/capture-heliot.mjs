import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3000'], { stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 80; i++) {
  try { if ((await fetch('http://127.0.0.1:3000/api/health')).ok) break; } catch {}
  await new Promise(resolve => setTimeout(resolve, 250));
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
  headless: true,
  args: ['--no-sandbox', '--no-zygote', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
fs.mkdirSync('generated/heliot', { recursive: true });
const report = [];
for (const [name, width, height] of [['desktop',1440,1000],['mobile',390,844]]) {
  const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('Browser:',m.text());});page.on('requestfailed',r=>console.log('Request failed:',r.url(),r.failure()));
  await page.goto('http://127.0.0.1:3000/heliot');
  await page.waitForFunction(()=>document.documentElement.dataset.heliotReady==='true',{},{timeout:15000}).catch(async () => console.log('Readiness diagnostics', errors, await page.locator('.heliot-readiness').textContent()));
  await page.evaluate(()=>document.fonts.ready);
  for (const [act, fraction] of [['first-light',0],['form',.2],['surface',.15],['separation',.5],['optical-path',.2],['aperture',.2],['perspective',.2],['convergence',.2],['signature',.2],['keep-light',.05]]) {
    if (process.env.CAPTURE_ACT && process.env.CAPTURE_ACT !== act) continue;
    await page.evaluate(({act,fraction})=>{const el=document.getElementById(act);window.scrollTo({top:el.offsetTop+el.offsetHeight*fraction,behavior:'instant'});},{act,fraction});
    await page.waitForTimeout(1500);
    await page.screenshot({path:`generated/heliot/${name}-${act}.png`});
  }
  report.push({name,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),renderBudget:await page.evaluate(()=>document.documentElement.dataset.heliotRenderBudget)});
  await page.close();
}
await browser.close();server.kill();console.log(JSON.stringify(report,null,2));
