import fs from "node:fs/promises";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { buildCaptureCriticRequest, parseVisualDirectorResponse } from "../src/platform/autonomy/visualDirector.ts";
import { planVisualRepairs, applyVisualRepairPlan } from "../src/platform/autonomy/repairPlanner.ts";

const options=args(process.argv.slice(2));
const reportPath=String(options.report || "test-results/autonomy/review-report.json");
const experiencePath=String(options.experience || "config/experience.json");
const outputRoot=String(options.output || "test-results/autonomy-review");
const criticUrl=process.env.FORGE_VISUAL_CRITIC_URL;
const criticToken=process.env.FORGE_VISUAL_CRITIC_TOKEN;
const report=JSON.parse(await fs.readFile(reportPath,"utf8"));
const experience=parseExperience(JSON.parse(await fs.readFile(experiencePath,"utf8")));
const projectContext=String(options.context || process.env.FORGE_AUTONOMY_CONTEXT || (experience.meta.name + ". " + experience.meta.description));
const findings=[...deterministicFindings(report)];

if(criticUrl) {
  for(const capture of report.captures ?? []) {
    if(capture.status!=="captured") continue;
    const imagePath=path.resolve(String(capture.path));
    const imageData=(await fs.readFile(imagePath)).toString("base64");
    const request=buildCaptureCriticRequest({ capture,projectContext });
    const response=await fetch(criticUrl,{
      method:"POST",
      headers:{
        "content-type":"application/json",
        ...(criticToken ? { authorization:"Bearer " + criticToken } : {}),
      },
      body:JSON.stringify({
        ...request,
        image:{ mimeType:"image/png",data:imageData },
      }),
    });
    if(!response.ok) throw new Error("Visual critic request failed for " + capture.id + ": HTTP " + response.status);
    const payload=await response.json();
    const parsed=parseVisualDirectorResponse(payload,capture.id);
    findings.push(...parsed.findings);
  }
}

await fs.mkdir(outputRoot,{ recursive:true });
const normalized=dedupeFindings(findings);
const rawPlan=planVisualRepairs({ findings:normalized,reviewPlan:report.plan,experience });
const allowedRaw=String(options["allowed-commands"] || "").trim();
const allowed=allowedRaw ? new Set(allowedRaw.split(",").map((item)=>item.trim()).filter(Boolean)) : null;
const allowedCommands=allowed ? rawPlan.commands.filter((command)=>allowed.has(command.type)) : rawPlan.commands;
const plan=allowed ? {
  ...rawPlan,
  commands:allowedCommands,
  affectedSceneIds:[...new Set(allowedCommands.map((command)=>String(command.input.sceneId)))],
  summary:[
    ...rawPlan.summary,
    `Loop policy allowed ${[...allowed].join(", ")}; ${rawPlan.commands.length-allowedCommands.length} command(s) were withheld.`,
  ],
} : rawPlan;
const result=applyVisualRepairPlan(experience,plan);
await fs.writeFile(path.join(outputRoot,"visual-findings.json"),JSON.stringify({ version:1,projectContext,criticConnected:Boolean(criticUrl),findings:normalized },null,2)+"\n");
await fs.writeFile(path.join(outputRoot,"repair-plan.json"),JSON.stringify(plan,null,2)+"\n");
await fs.writeFile(path.join(outputRoot,"repair-result.json"),JSON.stringify({ ...result,candidate:undefined },null,2)+"\n");
if(result.ok) await fs.writeFile(path.join(outputRoot,"candidate-experience.json"),JSON.stringify(result.candidate,null,2)+"\n");

console.log("Visual Director findings: " + normalized.length);
console.log(plan.summary.join(" "));
if(!criticUrl) console.log("No FORGE_VISUAL_CRITIC_URL configured: only deterministic runtime/layout findings were used.");
if(!result.ok) {
  console.error("No safe candidate produced: " + result.errors.join(" "));
  process.exitCode=2;
} else {
  console.log("Candidate written to " + path.join(outputRoot,"candidate-experience.json"));
}

function deterministicFindings(captureReport) {
  const rows=[];
  const captures=captureReport.captures ?? [];
  for(const capture of captures) {
    if(capture.status!=="captured") {
      rows.push({
        critic:"performance",
        captureId:capture.id,
        severity:"blocker",
        finding:"The required review frame could not be rendered.",
        evidence:[capture.error || "Capture failed."],
        affectedSystems:["runtime","capture"],
        repair:"Resolve the render/capture failure before visual refinement.",
        confidence:1,
      });
    }
    if(capture.horizontalOverflow) {
      rows.push({
        critic:capture.viewport==="mobile" ? "mobile" : "composition",
        captureId:capture.id,
        severity:"blocker",
        finding:"The rendered viewport has horizontal overflow.",
        evidence:["document.scrollWidth exceeded the viewport width at this capture state."],
        affectedSystems:["layout","mobile"],
        repair:"Remove the overflow before this candidate can replace the incumbent.",
        confidence:1,
      });
    }
  }
  for(const error of captureReport.runtimeErrors ?? []) {
    const fallback=captures.find((capture)=>capture.viewport===error.viewport) ?? captures[0];
    if(!fallback) continue;
    rows.push({
      critic:"performance",
      captureId:fallback.id,
      severity:"blocker",
      finding:"A runtime error occurred during visual review.",
      evidence:[String(error.message || error.type || "Runtime error")],
      affectedSystems:["runtime"],
      repair:"Fix the runtime failure before accepting any visual candidate.",
      confidence:1,
    });
  }
  return rows;
}

function dedupeFindings(rows) {
  const seen=new Set();
  return rows.filter((row)=>{
    const key=[row.critic,row.captureId,row.finding].join("|");
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
