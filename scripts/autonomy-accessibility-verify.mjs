import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const options=args(process.argv.slice(2));
const baseURL=String(options.url || process.env.FORGE_URL || "http://127.0.0.1:3000");
const route=String(options.route || "/studio/autonomy-runtime");
const variant=String(options.variant || "candidate")==="incumbent" ? "incumbent" : "candidate";
const experiencePath=String(options.experience || (variant==="candidate" ? process.env.FORGE_AUTONOMY_CANDIDATE_PATH : process.env.FORGE_AUTONOMY_INCUMBENT_PATH) || "config/experience.json");
const outputPath=String(options.output || "test-results/autonomy-accessibility.json");
const experience=JSON.parse(await fs.readFile(experiencePath,"utf8"));
const browser=await chromium.launch({
  headless:true,
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"],
});
const checks=[];
const hardGateFailures=[];

try {
  const context=await browser.newContext({
    viewport:{width:1440,height:1000},
    deviceScaleFactor:1,
    reducedMotion:"reduce",
  });
  const page=await context.newPage();
  const runtimeErrors=[];
  page.on("pageerror",(error)=>runtimeErrors.push(error.message));
  const url=new URL(route,baseURL);
  url.searchParams.set("variant",variant);
  const response=await page.goto(url.toString(),{waitUntil:"domcontentloaded",timeout:25000});
  if(response && response.status()===404) throw new Error("Autonomy runtime route returned 404.");
  const root=page.locator("[data-autonomy-runtime]").first();
  const probe=page.locator("[data-autonomy-probe]").first();
  await root.waitFor({state:"visible",timeout:15000});
  await page.waitForFunction(()=>document.querySelector("[data-autonomy-probe]")?.getAttribute("data-profile-ready")==="true",null,{timeout:12000}).catch(()=>{});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(500);

  const semantic=await page.evaluate(()=>{
    const isNamed=(element)=>{
      const aria=element.getAttribute("aria-label")?.trim();
      const labelledBy=element.getAttribute("aria-labelledby")?.trim();
      const title=element.getAttribute("title")?.trim();
      const text=(element.textContent || "").trim();
      const alt=element instanceof HTMLInputElement ? element.getAttribute("placeholder")?.trim() : "";
      return Boolean(aria || labelledBy || title || text || alt);
    };
    const controls=[...document.querySelectorAll("a[href],button,input:not([type=hidden]),textarea,select,summary")];
    const unnamed=controls.filter((element)=>!isNamed(element)).map((element)=>element.outerHTML.slice(0,180));
    const images=[...document.querySelectorAll("img")];
    const missingAlt=images.filter((image)=>!image.hasAttribute("alt")).map((image)=>image.getAttribute("src") || "img");
    const ids=[...document.querySelectorAll("[id]")].map((element)=>element.id).filter(Boolean);
    const duplicateIds=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
    const hiddenFocusable=controls.filter((element)=>{
      if(element.closest('[aria-hidden="true"]')) return true;
      const style=getComputedStyle(element);
      return style.visibility==="hidden" && !element.hasAttribute("disabled");
    }).map((element)=>element.outerHTML.slice(0,180));
    const headings=[...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((element)=>({
      level:Number(element.tagName.slice(1)),
      text:(element.textContent || "").trim(),
    }));
    const emptyHeadings=headings.filter((item)=>!item.text);
    const mainCount=document.querySelectorAll("main,[role=main]").length;
    return {controlCount:controls.length,unnamed,missingAlt,duplicateIds,hiddenFocusable,headings,emptyHeadings,mainCount};
  });

  const semanticPassed=semantic.unnamed.length===0 && semantic.missingAlt.length===0 && semantic.duplicateIds.length===0 && semantic.emptyHeadings.length===0 && semantic.mainCount>=1;
  checks.push({id:"semantic",passed:semanticPassed,details:semantic});
  if(!semanticPassed) hardGateFailures.push("Semantic accessibility contract failed: accessible names, image alt text, unique IDs, headings and main landmark are required.");

  const reduced=await probe.getAttribute("data-reduced-motion");
  const sceneCount=await page.locator("[data-autonomy-scene-index]").count();
  const reducedPassed=reduced==="true" && sceneCount===(experience.scenes?.length ?? 0);
  checks.push({id:"reduced-motion",passed:reducedPassed,details:{storeState:reduced,sceneCount}});
  if(!reducedPassed) hardGateFailures.push("Reduced-motion mode did not preserve the complete semantic scene journey.");

  const tabbable=page.locator('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),textarea:not([disabled]),select:not([disabled]),summary');
  const tabbableCount=await tabbable.count();
  let keyboardPassed=true;
  let focusedTag=null;
  if(tabbableCount>0) {
    await page.keyboard.press("Tab");
    const focus=await page.evaluate(()=>{
      const element=document.activeElement;
      if(!(element instanceof HTMLElement) || element===document.body) return null;
      return {tag:element.tagName.toLowerCase(),text:(element.textContent || element.getAttribute("aria-label") || "").trim().slice(0,100)};
    });
    keyboardPassed=Boolean(focus);
    focusedTag=focus;
  }
  checks.push({id:"keyboard-focus",passed:keyboardPassed,details:{tabbableCount,focused:focusedTag}});
  if(!keyboardPassed) hardGateFailures.push("Keyboard focus could not enter an available interactive control.");

  const primary=page.locator("[data-autonomy-primary-action]");
  const primaryCount=await primary.count();
  let primaryPassed=true;
  if(primaryCount>0) {
    await primary.first().focus();
    primaryPassed=await primary.first().evaluate((element)=>document.activeElement===element);
  }
  checks.push({id:"primary-action-focus",passed:primaryPassed,details:{primaryCount}});
  if(!primaryPassed) hardGateFailures.push("Primary action could not receive keyboard focus.");

  if(runtimeErrors.length) {
    hardGateFailures.push(...runtimeErrors.map((message)=>"Accessibility runtime error: "+message));
  }
  await context.close();
} finally {
  await browser.close();
}

const uniqueFailures=[...new Set(hardGateFailures)];
const report={
  version:1,
  generatedAt:new Date().toISOString(),
  variant,
  project:experience.meta?.name ?? "Forge experience",
  checks,
  hardGateFailures:uniqueFailures,
  passed:uniqueFailures.length===0 && checks.every((check)=>check.passed),
};
await fs.mkdir(path.dirname(outputPath),{recursive:true});
await fs.writeFile(outputPath,JSON.stringify(report,null,2)+"\n");
console.log("Accessibility verification: "+checks.filter((check)=>check.passed).length+"/"+checks.length+" gates passed.");
if(!report.passed) {
  console.error(uniqueFailures.map((failure)=>"- "+failure).join("\n"));
  process.exitCode=1;
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
