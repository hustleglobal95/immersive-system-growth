import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { buildMotionReviewPlan, analyzeMotionQuality } from "../src/platform/autonomy/motionQuality.ts";

const options=args(process.argv.slice(2));
const baseURL=String(options.url || process.env.FORGE_URL || "http://127.0.0.1:3000");
const route=String(options.route || "/studio/autonomy-preview");
const variant=String(options.variant || "candidate")==="incumbent" ? "incumbent" : "candidate";
const experiencePath=String(options.experience || (variant==="candidate" ? process.env.FORGE_AUTONOMY_CANDIDATE_PATH : process.env.FORGE_AUTONOMY_INCUMBENT_PATH) || "config/experience.json");
const outputPath=String(options.output || "test-results/autonomy-motion/report.json");
const samplesPerScene=Number(options.samples || process.env.FORGE_MOTION_SAMPLES || 10);
const experience=JSON.parse(await fs.readFile(experiencePath,"utf8"));
const plan=buildMotionReviewPlan(experience,samplesPerScene);
const browser=await chromium.launch({
  headless:true,
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"],
});

const viewportReports=[];
const runtimeErrors=[];

try {
  for(const profile of [
    { viewport:"desktop",size:{ width:1440,height:1000 } },
    { viewport:"mobile",size:{ width:390,height:844 } },
  ]) {
    const context=await browser.newContext({ viewport:profile.size,deviceScaleFactor:1,isMobile:profile.viewport==="mobile",hasTouch:profile.viewport==="mobile" });
    const page=await context.newPage();
    page.on("pageerror",(error)=>runtimeErrors.push({ viewport:profile.viewport,type:"pageerror",message:error.message }));
    page.on("console",(message)=>{
      if(message.type()==="error" && /uncaught|referenceerror|typeerror|rangeerror|syntaxerror|webgl context lost/i.test(message.text())) {
        runtimeErrors.push({ viewport:profile.viewport,type:"console",message:message.text() });
      }
    });
    const url=new URL(route,baseURL);
    url.searchParams.set("progress","0");
    url.searchParams.set("viewport",profile.viewport);
    url.searchParams.set("variant",variant);
    const response=await page.goto(url.toString(),{ waitUntil:"domcontentloaded",timeout:25000 });
    if(response && response.status()===404) throw new Error("Autonomy preview route returned 404. Start Forge with FORGE_AUTONOMY_PREVIEW=1.");
    await page.locator("[data-autonomy-preview]").waitFor({ state:"visible",timeout:15000 });
    await page.waitForFunction(()=>Boolean(window.__FORGE_AUTONOMY_REVIEW__),{ timeout:12000 });
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(800);

    const forward=[];
    for(const point of plan.points) {
      forward.push({ point,snapshot:await seekAndSnapshot(page,point.progress,profile.viewport) });
    }
    const reverse=[];
    for(const point of [...plan.points].reverse()) {
      reverse.push({ point,snapshot:await seekAndSnapshot(page,point.progress,profile.viewport) });
    }
    reverse.reverse();

    const report=analyzeMotionQuality({ plan,forward,reverse,viewport:profile.viewport });
    viewportReports.push(report);
    await context.close();
  }
} finally {
  await browser.close();
}

const runtimeFailures=runtimeErrors.map((error)=>error.viewport+" runtime "+error.type+": "+error.message);
const hardGateFailures=[...new Set([
  ...viewportReports.flatMap((report)=>report.hardGateFailures.map((failure)=>report.viewport+": "+failure)),
  ...runtimeFailures,
])];
const qualityScore=viewportReports.length
  ? Number((viewportReports.reduce((sum,report)=>sum+report.qualityScore,0)/viewportReports.length).toFixed(1))
  : 0;
const report={
  version:1,
  variant,
  project:experience.meta?.name ?? "Forge experience",
  samplesPerScene:plan.samplesPerScene,
  qualityScore,
  viewportReports,
  runtimeErrors,
  hardGateFailures,
  passed:hardGateFailures.length===0,
};
await fs.mkdir(path.dirname(outputPath),{ recursive:true });
await fs.writeFile(outputPath,JSON.stringify(report,null,2)+"\n");
console.log("Motion quality: "+qualityScore+"/100 across "+viewportReports.length+" viewports.");
for(const item of viewportReports) {
  console.log(item.viewport+": "+item.qualityScore+"/100, reverse="+item.reversible+", boundaries="+item.metrics.boundaryCount);
}
if(hardGateFailures.length) {
  console.error(hardGateFailures.map((item)=>"- "+item).join("\n"));
  process.exitCode=1;
}

async function seekAndSnapshot(page,progress,viewport) {
  const snapshot=await page.evaluate(async (value)=>{
    const bridge=window.__FORGE_AUTONOMY_REVIEW__;
    if(!bridge) throw new Error("Autonomy review bridge is unavailable.");
    bridge.seek(value);
    await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await new Promise((resolve)=>setTimeout(resolve,40));
    return bridge.snapshot();
  },progress);
  return { ...snapshot,viewport };
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
