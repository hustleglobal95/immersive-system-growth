import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { parseExperience } from "../src/lib/configSchema.ts";
import { buildRenderReviewPlan } from "../src/platform/autonomy/visualReview.ts";

const options=args(process.argv.slice(2));
const baseURL=String(options.url || process.env.FORGE_URL || "http://127.0.0.1:3000");
const previewRoute=String(options.route || "/studio/autonomy-preview");
const variant=String(options.variant || "candidate")==="incumbent" ? "incumbent" : "candidate";
const experiencePath=String(options.experience || "config/experience.json");
const outputPath=String(options.output || "test-results/autonomy-performance.json");
const source=parseExperience(JSON.parse(await fs.readFile(experiencePath,"utf8")));
const plan=buildRenderReviewPlan(source,Number(process.env.FORGE_AUTONOMY_SCENES || 8));
const viewportFor={ desktop:{ width:1440,height:1000 },mobile:{ width:390,height:844 } };
const report={ version:1,generatedAt:new Date().toISOString(),variant,source:experiencePath,states:[],summary:null };

const browser=await chromium.launch({
  headless:true,
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"],
});
try {
  for(const viewport of ["desktop","mobile"]) {
    const context=await browser.newContext({ viewport:viewportFor[viewport],deviceScaleFactor:1 });
    const page=await context.newPage();
    const captures=representative(plan.captures.filter((item)=>item.viewport===viewport),4);
    for(const capture of captures) {
      const url=new URL(previewRoute,baseURL);
      url.searchParams.set("progress",String(capture.progress));
      url.searchParams.set("viewport",viewport);
      url.searchParams.set("variant",variant);
      try {
        const response=await page.goto(url.toString(),{ waitUntil:"domcontentloaded",timeout:20000 });
        if(response && response.status()===404) throw new Error("Autonomy preview route returned 404.");
        await page.locator("[data-autonomy-preview]").waitFor({ state:"visible",timeout:12000 });
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForTimeout(900);
        await page.waitForFunction(()=>Boolean(window.__FORGE_RENDER_STATS__),null,{timeout:8000});
        const sample=await page.evaluate(async()=>{
          const intervals=[];
          let previous=performance.now();
          await new Promise((resolve)=>{
            const tick=(now)=>{
              intervals.push(now-previous);
              previous=now;
              if(intervals.length>=90) resolve();
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });
          const sorted=[...intervals].sort((a,b)=>a-b);
          const percentile=(p)=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))] ?? 0;
          return {
            rafMean:intervals.reduce((sum,value)=>sum+value,0)/Math.max(1,intervals.length),
            rafP95:percentile(.95),
            rafP99:percentile(.99),
            renderer:window.__FORGE_RENDER_STATS__ ?? null,
          };
        });
        report.states.push({ id:capture.id,viewport,progress:capture.progress,status:"measured",...sample });
      } catch(error) {
        report.states.push({ id:capture.id,viewport,progress:capture.progress,status:"failed",error:error instanceof Error ? error.message : String(error) });
      }
    }
    await context.close();
  }
  report.summary=summarize(report.states);
  await fs.mkdir(path.dirname(outputPath),{recursive:true});
  await fs.writeFile(outputPath,JSON.stringify(report,null,2)+"\n");
  console.log("Performance profile score: "+report.summary.score.toFixed(1)+"/100 · worst p95 "+report.summary.worstRafP95.toFixed(1)+"ms");
  if(report.summary.measuredStates<2) process.exitCode=2;
} finally {
  await browser.close();
}

function representative(items,max) {
  if(items.length<=max) return items;
  const indexes=[0,Math.floor((items.length-1)/3),Math.floor(((items.length-1)*2)/3),items.length-1];
  return [...new Map(indexes.map((index)=>[items[index].id,items[index]])).values()];
}
function summarize(states) {
  const measured=states.filter((item)=>item.status==="measured" && item.renderer);
  const worstRafP95=Math.max(0,...measured.map((item)=>item.rafP95));
  const meanRaf=measured.reduce((sum,item)=>sum+item.rafMean,0)/Math.max(1,measured.length);
  const maxCalls=Math.max(0,...measured.map((item)=>item.renderer.calls));
  const maxTriangles=Math.max(0,...measured.map((item)=>item.renderer.triangles));
  const maxPrograms=Math.max(0,...measured.map((item)=>item.renderer.programs));
  const maxDrawingBufferPixels=Math.max(0,...measured.map((item)=>item.renderer.drawingBufferPixels));
  const framePenalty=Math.max(0,worstRafP95-16.7)*1.8;
  const callPenalty=Math.max(0,maxCalls-120)*.05;
  const trianglePenalty=Math.max(0,maxTriangles-750000)/90000;
  const pixelPenalty=Math.max(0,maxDrawingBufferPixels-2500000)/350000;
  const score=Math.max(0,Math.min(100,100-framePenalty-callPenalty-trianglePenalty-pixelPenalty));
  return {
    measuredStates:measured.length,
    failedStates:states.length-measured.length,
    meanRaf,
    worstRafP95,
    maxCalls,
    maxTriangles,
    maxPrograms,
    maxDrawingBufferPixels,
    score,
    evidenceClass:"relative-headless",
    note:"Headless renderer evidence is suitable for incumbent/candidate comparison, not a substitute for physical-device GPU profiling.",
  };
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
