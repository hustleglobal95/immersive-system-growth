import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import rawExperience from "../config/experience.json" with { type:"json" };
import { parseExperience } from "../src/lib/configSchema.ts";
import { buildRenderReviewPlan } from "../src/platform/autonomy/visualReview.ts";

const options=args(process.argv.slice(2));
const baseURL=String(options.url || process.env.FORGE_URL || "http://127.0.0.1:3000");
const outputRoot=String(options.output || "test-results/autonomy-candidate");
const previewRoute=String(options.route || "/studio/autonomy-preview");
const candidatePath=String(options.experience || process.env.FORGE_AUTONOMY_EXPERIENCE_PATH || "");
const source=candidatePath ? JSON.parse(await fs.readFile(candidatePath,"utf8")) : rawExperience;
const experience=parseExperience(source);
const plan=buildRenderReviewPlan(experience,Number(process.env.FORGE_AUTONOMY_SCENES || 8));
const viewportFor={ desktop:{ width:1440,height:1000 }, mobile:{ width:390,height:844 } };

const browser=await chromium.launch({
  headless:true,
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"],
});
const report={ version:1,generatedAt:new Date().toISOString(),project:experience.meta.name,baseURL,previewRoute,plan,captures:[],runtimeErrors:[] };

try {
  await fs.mkdir(outputRoot,{ recursive:true });
  for(const viewport of ["desktop","mobile"]) {
    const context=await browser.newContext({ viewport:viewportFor[viewport],deviceScaleFactor:1 });
    const page=await context.newPage();
    page.on("pageerror",(error)=>report.runtimeErrors.push({ viewport,type:"pageerror",message:error.message }));
    page.on("console",(message)=>{ if(message.type()==="error") report.runtimeErrors.push({ viewport,type:"console",message:message.text() }); });
    for(const capture of plan.captures.filter((item)=>item.viewport===viewport)) {
      const url=new URL(previewRoute,baseURL);
      url.searchParams.set("progress",String(capture.progress));
      url.searchParams.set("viewport",viewport);
      const pathOut=path.join(outputRoot,capture.id+".png");
      try {
        const response=await page.goto(url.toString(),{ waitUntil:"domcontentloaded",timeout:20000 });
        if(response && response.status()===404) throw new Error("Autonomy preview route returned 404. Start Forge with FORGE_AUTONOMY_PREVIEW=1.");
        const root=page.locator("[data-autonomy-preview]").first();
        await root.waitFor({ state:"visible",timeout:12000 });
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForTimeout(2200);
        const overflow=await root.evaluate((element)=>element.scrollWidth>element.clientWidth+1);
        await page.locator(".studio-preview__canvas").first().screenshot({ path:pathOut,animations:"disabled",timeout:15000 });
        report.captures.push({ ...capture,path:pathOut,status:"captured",horizontalOverflow:overflow });
        console.log("AUTONOMY CANDIDATE CAPTURE " + capture.id);
      } catch(error) {
        report.captures.push({ ...capture,path:pathOut,status:"failed",horizontalOverflow:false,error:error instanceof Error ? error.message : String(error) });
      }
    }
    await context.close();
  }
  await fs.writeFile(path.join(outputRoot,"review-report.json"),JSON.stringify(report,null,2)+"\n");
  const failures=report.captures.filter((item)=>item.status!=="captured" || item.horizontalOverflow);
  console.log("Candidate capture: " + (report.captures.length-failures.length) + "/" + report.captures.length + " clean captures.");
  if(failures.length || report.runtimeErrors.length) process.exitCode=1;
} finally {
  await browser.close();
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
