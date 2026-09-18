import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import rawExperience from "../config/experience.json" with { type:"json" };
import { parseExperience } from "../src/lib/configSchema.ts";
import { buildRenderReviewPlan } from "../src/platform/autonomy/visualReview.ts";

const baseURL = process.env.FORGE_URL || "http://127.0.0.1:3000";
const experience = parseExperience(rawExperience);
const plan = buildRenderReviewPlan(experience, Number(process.env.FORGE_AUTONOMY_SCENES || 8));
const outputRoot = process.env.FORGE_AUTONOMY_OUTPUT || "test-results/autonomy";
const viewportFor = {
  desktop:{ width:1440, height:1000 },
  mobile:{ width:390, height:844 },
};

async function prepare(page) {
  await page.goto(baseURL,{ waitUntil:"domcontentloaded", timeout:20000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2600);
}

async function seek(page,progress) {
  await page.evaluate((value) => {
    const max = Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    window.scrollTo(0,max*value);
  },progress);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(500);
}

const browser = await chromium.launch({
  headless:true,
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"],
});

const report = {
  version:1,
  generatedAt:new Date().toISOString(),
  project:experience.meta.name,
  baseURL,
  plan,
  captures:[],
  runtimeErrors:[],
};

try {
  await mkdir(outputRoot,{ recursive:true });
  for (const viewport of ["desktop","mobile"]) {
    const context = await browser.newContext({ viewport:viewportFor[viewport], deviceScaleFactor:1 });
    const page = await context.newPage();
    page.on("pageerror",(error) => report.runtimeErrors.push({ viewport,type:"pageerror",message:error.message }));
    page.on("console",(message) => { if (message.type()==="error") report.runtimeErrors.push({ viewport,type:"console",message:message.text() }); });
    await prepare(page);
    for (const capture of plan.captures.filter((item) => item.viewport===viewport)) {
      await seek(page,capture.progress);
      const path = outputRoot + "/" + capture.id + ".png";
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      try {
        await page.screenshot({ path,animations:"disabled",timeout:15000 });
        report.captures.push({ ...capture,path,status:"captured",horizontalOverflow:overflow });
        console.log("AUTONOMY CAPTURE " + capture.id);
      } catch (error) {
        report.captures.push({ ...capture,path,status:"failed",horizontalOverflow:overflow,error:error instanceof Error ? error.message : String(error) });
      }
    }
    await context.close();
  }
  await writeFile(outputRoot + "/review-report.json",JSON.stringify(report,null,2));
  const failures = report.captures.filter((item) => item.status!=="captured" || item.horizontalOverflow);
  console.log("Autonomy capture: " + (report.captures.length-failures.length) + "/" + report.captures.length + " clean captures.");
  if (failures.length || report.runtimeErrors.length) process.exitCode=1;
} finally {
  await browser.close();
}
