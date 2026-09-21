import fs from "node:fs/promises";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";

const options=args(process.argv.slice(2));
const experiencePath=String(options.experience || "config/experience.json");
const profilePath=String(options.profile || "");
const outputRoot=String(options.output || "test-results/autonomy-performance-repair");
const strategy=String(options.strategy || "pixel-pressure");
const experience=parseExperience(JSON.parse(await fs.readFile(experiencePath,"utf8")));
const profile=profilePath ? JSON.parse(await fs.readFile(profilePath,"utf8")) : null;
const summary=profile?.summary;
await fs.mkdir(outputRoot,{recursive:true});

const plan=buildPlan(experience,summary,strategy);
await fs.writeFile(path.join(outputRoot,"repair-plan.json"),JSON.stringify(plan,null,2)+"\n");
if(!plan.changes.length) {
  await fs.writeFile(path.join(outputRoot,"repair-result.json"),JSON.stringify({ok:false,errors:[plan.reason]},null,2)+"\n");
  console.error(plan.reason);
  process.exitCode=2;
} else {
  const candidate=JSON.parse(JSON.stringify(experience));
  for(const change of plan.changes) candidate.runtime[change.key]=change.to;
  const validated=parseExperience(candidate);
  await fs.writeFile(path.join(outputRoot,"repair-result.json"),JSON.stringify({ok:true,errors:[],summary:plan.summary},null,2)+"\n");
  await fs.writeFile(path.join(outputRoot,"candidate-experience.json"),JSON.stringify(validated,null,2)+"\n");
  console.log(plan.summary.join(" "));
}

function buildPlan(experience,summary,strategy) {
  if(!summary || summary.measuredStates<2) return empty(strategy,"Performance evidence is incomplete; no optimization candidate was produced.");
  if(summary.score>=98 && summary.worstRafP95<=18) return empty(strategy,"The incumbent is already inside the conservative headless performance envelope.");
  const runtime=experience.runtime;
  const severe=summary.worstRafP95>28 || summary.score<70 || Number(summary.maxGovernorSeverity ?? 0)>=2;
  const changes=[];
  const add=(key,to,why)=>{
    const from=runtime[key];
    if(Math.abs(Number(from)-Number(to))<1e-6) return;
    changes.push({key,from,to,why});
  };
  if(strategy==="pixel-pressure") {
    const dprStep=severe?.25:.15;
    add("maxDpr",round(Math.max(runtime.minDpr,runtime.maxDpr-dprStep),2),"Reduce peak fill-rate pressure while preserving the authored quality floor.");
    add("maxPixels",Math.max(750000,Math.round(runtime.maxPixels*(severe?.78:.86))),"Bound drawing-buffer pixels for the dominant measured frame-time pressure.");
  } else {
    add("maxDpr",round(Math.max(runtime.minDpr,runtime.maxDpr-(severe?.18:.1)),2),"Apply a smaller DPR reduction for a balanced fidelity/performance candidate.");
    add("maxPixels",Math.max(900000,Math.round(runtime.maxPixels*(severe?.84:.91))),"Trim peak pixel cost without changing scene structure or identity.");
    if(runtime.preloadMb>8) add("preloadMb",round(Math.max(8,runtime.preloadMb*(severe?.8:.9)),1),"Reduce eager preload pressure while retaining a useful warm asset window.");
  }
  const summaryLines=changes.map((change)=>change.key+" "+change.from+" -> "+change.to+".");
  return {
    version:1,
    worker:"performance-repair",
    strategy,
    evidence:{
      score:summary.score,
      worstRafP95:summary.worstRafP95,
      maxCalls:summary.maxCalls,
      maxTriangles:summary.maxTriangles,
      maxDrawingBufferPixels:summary.maxDrawingBufferPixels,
      maxGovernorSeverity:summary.maxGovernorSeverity ?? 0,
      governorTiers:summary.governorTiers ?? [],
      minPixelRatio:summary.minPixelRatio ?? null,
    },
    changes,
    summary:summaryLines,
    reason:changes.length ? "Bounded runtime-budget candidate produced from measured incumbent pressure." : "No bounded runtime-budget change remained available.",
  };
}
function empty(strategy,reason) { return {version:1,worker:"performance-repair",strategy,evidence:null,changes:[],summary:[],reason}; }
function round(value,digits) { const p=10**digits;return Math.round(value*p)/p; }
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
