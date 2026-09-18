import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { buildMotionReviewPlan, analyzeMotionQuality } from "../src/platform/autonomy/motionQuality.ts";
import { buildMotionSequenceCriticRequest, parseMotionSequenceResponse } from "../src/platform/autonomy/motionDirector.ts";

const options=args(process.argv.slice(2));
const baseURL=String(options.url || process.env.FORGE_URL || "http://127.0.0.1:3000");
const route=String(options.route || "/studio/autonomy-preview");
const variant=String(options.variant || "candidate")==="incumbent" ? "incumbent" : "candidate";
const experiencePath=String(options.experience || (variant==="candidate" ? process.env.FORGE_AUTONOMY_CANDIDATE_PATH : process.env.FORGE_AUTONOMY_INCUMBENT_PATH) || "config/experience.json");
const outputPath=String(options.output || "test-results/autonomy-motion/report.json");
const samplesPerScene=Number(options.samples || process.env.FORGE_MOTION_SAMPLES || 10);
const experience=JSON.parse(await fs.readFile(experiencePath,"utf8"));
const motionCriticUrl=process.env.FORGE_MOTION_CRITIC_URL;
const motionCriticToken=process.env.FORGE_MOTION_CRITIC_TOKEN;
const projectContext=String(options.context || process.env.FORGE_AUTONOMY_CONTEXT || experience.meta?.description || experience.meta?.name || "Forge experience");
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
    await page.waitForFunction(()=>Boolean(window.__FORGE_AUTONOMY_REVIEW__),null,{ timeout:12000 });
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

    const deterministic=analyzeMotionQuality({ plan,forward,reverse,viewport:profile.viewport });
    const sequenceFindings=[];
    if(motionCriticUrl) {
      const sceneIds=[...new Set(plan.points.filter((point)=>point.kind==="sample").map((point)=>point.sceneId))];
      for(const sceneId of sceneIds) {
        const scenePoints=plan.points.filter((point)=>point.kind==="sample" && point.sceneId===sceneId);
        const selected=selectSequencePoints(scenePoints,5);
        const images=[];
        for(const point of selected) {
          await page.evaluate(async (value)=>{
            const bridge=window.__FORGE_AUTONOMY_REVIEW__;
            if(!bridge) throw new Error("Autonomy review bridge is unavailable.");
            bridge.seek(value);
            await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            await new Promise((resolve)=>setTimeout(resolve,40));
          },point.progress);
          const buffer=await page.locator(".studio-preview__canvas").first().screenshot({ animations:"disabled",timeout:15000 });
          images.push({ progress:point.progress,mimeType:"image/png",data:buffer.toString("base64") });
        }
        const request=buildMotionSequenceCriticRequest({
          sceneId,
          viewport:profile.viewport,
          projectContext,
          progresses:selected.map((point)=>point.progress),
          deterministicMetrics:deterministic.metrics,
        });
        const response=await fetch(motionCriticUrl,{
          method:"POST",
          headers:{
            "content-type":"application/json",
            ...(motionCriticToken ? { authorization:"Bearer "+motionCriticToken } : {}),
          },
          body:JSON.stringify({ ...request,images }),
        });
        if(!response.ok) throw new Error("Motion critic request failed for "+sceneId+" / "+profile.viewport+": HTTP "+response.status);
        const parsed=parseMotionSequenceResponse(await response.json());
        sequenceFindings.push(...parsed.findings);
      }
    }
    const sequencePenalty=sequenceFindings.reduce((sum,finding)=>sum+(finding.severity==="blocker"?25:finding.severity==="major"?8:finding.severity==="minor"?2:0),0);
    const report={
      ...deterministic,
      qualityScore:Math.max(0,deterministic.qualityScore-sequencePenalty),
      sequenceCriticConnected:Boolean(motionCriticUrl),
      sequenceFindings,
      hardGateFailures:[
        ...deterministic.hardGateFailures,
        ...sequenceFindings.filter((finding)=>finding.severity==="blocker" && finding.confidence>=0.7).map((finding)=>finding.sceneId+": "+finding.finding),
      ],
    };
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
  if(!options["allow-failures"]) process.exitCode=1;
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


function selectSequencePoints(points,count) {
  if(points.length<=count) return points;
  const chosen=[];
  for(let i=0;i<count;i++) chosen.push(points[Math.round((i/(count-1))*(points.length-1))]);
  return [...new Map(chosen.map((point)=>[point.id,point])).values()];
}
