import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const options=args(process.argv.slice(2));
const baseURL=String(options.url || process.env.FORGE_URL || "http://127.0.0.1:3000");
const route=String(options.route || "/studio/autonomy-runtime");
const variant=String(options.variant || "candidate")==="incumbent" ? "incumbent" : "candidate";
const experiencePath=String(options.experience || (variant==="candidate" ? process.env.FORGE_AUTONOMY_CANDIDATE_PATH : process.env.FORGE_AUTONOMY_INCUMBENT_PATH) || "config/experience.json");
const outputPath=String(options.output || "test-results/autonomy-functional/report.json");
const experience=JSON.parse(await fs.readFile(experiencePath,"utf8"));
const expectedScenes=experience.scenes?.length ?? 0;
const expectedHotspots=experience.hotspots?.length ?? 0;
const expectedCtas=(experience.scenes ?? []).filter((scene)=>scene.copy?.cta).length;

const browser=await chromium.launch({
  headless:true,
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"],
});

const results=[];
const hardGateFailures=[];
const runtimeErrors=[];

try {
  for(const profile of [
    { viewport:"desktop",size:{ width:1440,height:1000 },reducedMotion:false },
    { viewport:"mobile",size:{ width:390,height:844 },reducedMotion:false },
    { viewport:"desktop",size:{ width:1440,height:1000 },reducedMotion:true },
  ]) {
    const context=await browser.newContext({
      viewport:profile.size,
      deviceScaleFactor:1,
      reducedMotion:profile.reducedMotion ? "reduce" : "no-preference",
      isMobile:profile.viewport==="mobile",
      hasTouch:profile.viewport==="mobile",
    });
    const page=await context.newPage();
    page.on("pageerror",(error)=>runtimeErrors.push({ viewport:profile.viewport,reducedMotion:profile.reducedMotion,type:"pageerror",message:error.message }));
    page.on("console",(message)=>{
      if(message.type()==="error" && /uncaught|referenceerror|typeerror|rangeerror|syntaxerror|webgl context lost/i.test(message.text())) {
        runtimeErrors.push({ viewport:profile.viewport,reducedMotion:profile.reducedMotion,type:"console",message:message.text() });
      }
    });

    const url=new URL(route,baseURL);
    url.searchParams.set("variant",variant);
    let response;
    try {
      response=await page.goto(url.toString(),{ waitUntil:"domcontentloaded",timeout:25000 });
    } catch(error) {
      const message=profile.viewport+" runtime navigation failed: "+(error instanceof Error ? error.message : String(error));
      hardGateFailures.push(message);
      results.push({ id:"boot",label:"Experience boots without fatal runtime failure",viewport:profile.viewport,reducedMotion:profile.reducedMotion,passed:false,details:[message] });
      await context.close();
      continue;
    }
    if(response && response.status()===404) {
      const message="Autonomy runtime route returned 404. Start Forge with FORGE_AUTONOMY_PREVIEW=1.";
      hardGateFailures.push(message);
      results.push({ id:"boot",label:"Experience boots without fatal runtime failure",viewport:profile.viewport,reducedMotion:profile.reducedMotion,passed:false,details:[message] });
      await context.close();
      continue;
    }

    const root=page.locator("[data-autonomy-runtime]").first();
    const probe=page.locator("[data-autonomy-probe]").first();
    await root.waitFor({ state:"visible",timeout:15000 });
    await page.waitForFunction(()=>document.querySelector("[data-autonomy-probe]")?.getAttribute("data-profile-ready")==="true",{ timeout:12000 }).catch(()=>{});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(600);

    const sceneCount=await page.locator("[data-autonomy-scene-index]").count();
    const headingCount=await page.locator("[data-autonomy-scene-index] h1,[data-autonomy-scene-index] h2").count();
    const bootPassed=sceneCount===expectedScenes && headingCount===expectedScenes && expectedScenes>0;
    const bootDetails=[
      "Expected scenes: "+expectedScenes+", rendered: "+sceneCount+".",
      "Rendered semantic headings: "+headingCount+".",
      "WebGL status: "+(await probe.getAttribute("data-webgl-status") ?? "unknown")+".",
    ];
    results.push({ id:"boot",label:"Experience boots without fatal runtime failure",viewport:profile.viewport,reducedMotion:profile.reducedMotion,passed:bootPassed,details:bootDetails });
    if(!bootPassed) hardGateFailures.push(profile.viewport+": semantic runtime did not render the expected scene structure.");

    const journeyDetails=[];
    let journeyPassed=true;
    for(let index=0;index<expectedScenes;index++) {
      const locator=page.locator('[data-autonomy-scene-index="'+index+'"]').first();
      await locator.scrollIntoViewIfNeeded();
      await page.evaluate((i)=>{
        const element=document.querySelector('[data-autonomy-scene-index="'+i+'"]');
        if(element instanceof HTMLElement) window.scrollTo({ top:element.offsetTop+Math.min(120,element.offsetHeight*0.1),behavior:"auto" });
      },index);
      await settle(page,profile.reducedMotion ? 120 : 260);
      const active=Number(await probe.getAttribute("data-active-scene"));
      const progress=Number(await probe.getAttribute("data-progress"));
      journeyDetails.push("scene "+index+" -> active "+active+" at "+progress.toFixed(4));
      if(active!==index) journeyPassed=false;
    }
    results.push({ id:"journey",label:"Primary narrative remains traversable",viewport:profile.viewport,reducedMotion:profile.reducedMotion,passed:journeyPassed,details:journeyDetails });
    if(!journeyPassed) hardGateFailures.push(profile.viewport+": forward scene traversal lost synchronization.");

    if(expectedScenes>1) {
      await page.evaluate((index)=>{
        const element=document.querySelector('[data-autonomy-scene-index="'+index+'"]');
        if(element instanceof HTMLElement) window.scrollTo({ top:element.offsetTop+40,behavior:"auto" });
      },expectedScenes-1);
      await settle(page,180);
      const endProgress=Number(await probe.getAttribute("data-progress"));
      await page.evaluate(()=>{
        const element=document.querySelector('[data-autonomy-scene-index="0"]');
        if(element instanceof HTMLElement) window.scrollTo({ top:element.offsetTop,behavior:"auto" });
      });
      await settle(page,profile.reducedMotion ? 120 : 260);
      const reverseProgress=Number(await probe.getAttribute("data-progress"));
      const reverseScene=Number(await probe.getAttribute("data-active-scene"));
      const reversePassed=reverseProgress<endProgress && reverseScene===0;
      results.push({ id:"reverse",label:"Reverse traversal reconstructs an earlier authored state",viewport:profile.viewport,reducedMotion:profile.reducedMotion,passed:reversePassed,details:["End progress "+endProgress.toFixed(4)+", reverse progress "+reverseProgress.toFixed(4)+", active scene "+reverseScene+"."] });
      if(!reversePassed) hardGateFailures.push(profile.viewport+": reverse traversal failed to restore the opening scene.");
    }

    if(profile.viewport==="desktop" && profile.reducedMotion && expectedScenes>1) {
      await page.evaluate(()=>window.scrollTo({ top:0,behavior:"auto" }));
      await settle(page,100);
      await page.keyboard.press("ArrowRight");
      await settle(page,180);
      const keyboardScene=Number(await probe.getAttribute("data-active-scene"));
      const keyboardPassed=keyboardScene===1;
      results.push({ id:"keyboard",label:"Keyboard scene navigation remains operable",viewport:"desktop",reducedMotion:true,passed:keyboardPassed,details:["ArrowRight moved to active scene "+keyboardScene+"."] });
      if(!keyboardPassed) hardGateFailures.push("Reduced-motion keyboard navigation did not advance to the next scene.");
    }

    const ctas=page.locator("[data-autonomy-primary-action]");
    const ctaCount=await ctas.count();
    let ctaPassed=expectedCtas===0 ? true : ctaCount===expectedCtas;
    const ctaDetails=["Expected CTA count "+expectedCtas+", rendered "+ctaCount+".",...(expectedCtas===0 ? ["No CTA is declared in this experience contract; reachability check is not applicable."] : [])];
    if(ctaCount>0) {
      const first=ctas.first();
      const href=await first.getAttribute("href");
      await first.focus();
      const focused=await first.evaluate((element)=>document.activeElement===element);
      ctaPassed=ctaPassed && Boolean(href) && focused;
      ctaDetails.push("First CTA href="+String(href)+", keyboard focus="+focused+".");
    }
    results.push({ id:"primary-action",label:"Primary commercial action is reachable",viewport:profile.viewport,reducedMotion:profile.reducedMotion,passed:ctaPassed,details:ctaDetails });
    if(!ctaPassed) hardGateFailures.push(profile.viewport+": primary action is missing, mismatched, or not keyboard reachable.");

    if(expectedHotspots>0 && !profile.reducedMotion) {
      const details=page.locator("[data-autonomy-hotspot]");
      const hotspotCount=await details.count();
      let hotspotPassed=hotspotCount===expectedHotspots;
      const hotspotDetails=["Expected hotspot count "+expectedHotspots+", rendered "+hotspotCount+"."];
      if(hotspotCount>0) {
        const first=details.first();
        await first.locator("summary").click();
        const open=await first.evaluate((element)=>element instanceof HTMLDetailsElement && element.open);
        hotspotPassed=hotspotPassed && open;
        hotspotDetails.push("First hotspot disclosure opened="+open+".");
      }
      results.push({ id:"interaction",label:"Semantic hotspot interaction remains operable",viewport:profile.viewport,reducedMotion:false,passed:hotspotPassed,details:hotspotDetails });
      if(!hotspotPassed) hardGateFailures.push(profile.viewport+": hotspot interaction is not operable.");
    }

    if(profile.viewport==="mobile") {
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
      const last=page.locator('[data-autonomy-scene-index="'+Math.max(0,expectedScenes-1)+'"]').first();
      await last.scrollIntoViewIfNeeded();
      await settle(page,220);
      const active=Number(await probe.getAttribute("data-active-scene"));
      const mobilePassed=!overflow && active===Math.max(0,expectedScenes-1);
      results.push({ id:"mobile-equivalence",label:"Mobile preserves the defining journey",viewport:"mobile",reducedMotion:false,passed:mobilePassed,details:["Horizontal overflow="+overflow+".","Final active scene="+active+"."] });
      if(!mobilePassed) hardGateFailures.push("Mobile runtime overflowed or could not reach the final scene.");
    }

    if(profile.reducedMotion) {
      const reduced=await probe.getAttribute("data-reduced-motion");
      const mediaPanels=await page.locator(".cinematic-media").count();
      const reducedPassed=reduced==="true" && sceneCount===expectedScenes && headingCount===expectedScenes;
      results.push({ id:"reduced-motion",label:"Reduced motion remains meaningful",viewport:"desktop",reducedMotion:true,passed:reducedPassed,details:["Reduced-motion store state="+String(reduced)+".","Cinematic media layers mounted="+mediaPanels+".","Semantic scenes="+sceneCount+"."] });
      if(!reducedPassed) hardGateFailures.push("Reduced-motion mode did not preserve the semantic journey.");
    }

    await context.close();
  }
} finally {
  await browser.close();
}

for(const error of runtimeErrors) hardGateFailures.push(error.viewport+" runtime "+error.type+": "+error.message);
const uniqueFailures=[...new Set(hardGateFailures)];
const report={
  version:1,
  variant,
  project:experience.meta?.name ?? "Forge experience",
  results,
  hardGateFailures:uniqueFailures,
  runtimeErrors,
  passed:uniqueFailures.length===0 && results.every((item)=>item.passed),
};
await fs.mkdir(path.dirname(outputPath),{ recursive:true });
await fs.writeFile(outputPath,JSON.stringify(report,null,2)+"\n");
console.log("Functional verification: "+results.filter((item)=>item.passed).length+"/"+results.length+" scenarios passed.");
if(uniqueFailures.length) {
  console.error(uniqueFailures.map((item)=>"- "+item).join("\n"));
  process.exitCode=1;
}

async function settle(page,delay) {
  await page.evaluate(()=>new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.waitForTimeout(delay);
}
function args(argv) {
  const out={};
  for(let i=0;i<argv.length;i++) {
    const arg=argv[i];
    if(!arg.startsWith("--")) continue;
    const key=arg.slice(2);
    const next=argv[i+1];
    if(next && !next.startsWith("--")) { out[key]=next;i++; }
    else out[key]=true;
  }
  return out;
}
