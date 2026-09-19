import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { loopDefinition as getLoopDefinition } from "../src/platform/loops/loopRegistry.ts";
import { loopDefinitionSchema, loopRunReportSchema } from "../src/platform/loops/loopSchema.ts";
import { compactLoopContext, evaluateLoopStop, learningCandidate, selectTournamentWinner } from "../src/platform/loops/loopRunner.ts";
import { createLoopRunReport, repairPlanSignature } from "../src/platform/loops/loopEvidence.ts";
import { appendVaultJournal, readVaultProject } from "../src/platform/studioVault.ts";
import { parseExperience } from "../src/lib/configSchema.ts";

const options=args(process.argv.slice(2));
const loopId=String(options.loop || "visual-polish");
const baseDefinition=getLoopDefinition(loopId);
if(!baseDefinition) fail("Unknown loop: " + loopId + ". Run npm run loop:list.");
if(!baseDefinition.executable) fail(baseDefinition.label + " has a typed loop contract but no production-safe repair worker yet.");

const maxCycles=positiveInt(options.cycles,baseDefinition.budgets.maxCycles,1,8);
const maxCandidates=positiveInt(options.candidates,baseDefinition.budgets.maxCandidatesPerCycle,1,5);
const definition=loopDefinitionSchema.parse({
  ...baseDefinition,
  budgets:{
    ...baseDefinition.budgets,
    maxCycles,
    maxCandidatesPerCycle:maxCandidates,
    maxCandidateAttempts:Math.min(baseDefinition.budgets.maxCandidateAttempts,maxCycles*maxCandidates),
  },
});
const stamp=new Date().toISOString().replace(/[-:.TZ]/g,"").slice(0,14);
const workRoot=path.resolve(String(options.output || path.join("test-results","forge-loops",stamp+"-"+loopId)));
const port=Number(options.port || process.env.FORGE_AUTONOMY_PORT || 3101);
const baseURL="http://127.0.0.1:"+port;
const currentIncumbentPath=path.join(workRoot,"current-incumbent.json");
const currentCandidatePath=path.join(workRoot,"current-candidate.json");
const reportPath=path.join(workRoot,"run-report.json");
const acceptedPath=path.join(workRoot,"accepted-experience.json");
const projectId=options.project ? String(options.project) : undefined;

if(!process.env.FORGE_VISUAL_CRITIC_URL) fail("FORGE_VISUAL_CRITIC_URL is required. Loop Engine fails closed without pairwise visual evidence.");

await fs.mkdir(workRoot,{recursive:true});
const source=await resolveSource({ projectId,experiencePath:options.experience ? String(options.experience) : undefined,workRoot });
await fs.writeFile(currentIncumbentPath,JSON.stringify(source.experience,null,2)+"\n");
await fs.writeFile(currentCandidatePath,JSON.stringify(source.experience,null,2)+"\n");
const baselineFingerprint=fingerprint(source.experience);
let report=createLoopRunReport({
  runId:"loop-"+stamp+"-"+loopId,
  definition,
  projectId,
  sourceVersionId:source.versionId,
  source:source.label,
  baselineFingerprint,
});
await writeReport();
await recordVaultStart().catch((error)=>console.warn("Vault loop start journal skipped: "+(error instanceof Error ? error.message : String(error))));

const server=spawn(process.platform==="win32" ? "npm.cmd" : "npm",["run","dev","--","--hostname","127.0.0.1","--port",String(port)],{
  stdio:["ignore","pipe","pipe"],
  env:{
    ...process.env,
    FORGE_AUTONOMY_PREVIEW:"1",
    FORGE_AUTONOMY_INCUMBENT_PATH:currentIncumbentPath,
    FORGE_AUTONOMY_CANDIDATE_PATH:currentCandidatePath,
  },
});
let serverLog="";
server.stdout.on("data",(chunk)=>{ serverLog+=String(chunk); if(process.env.FORGE_LOOP_VERBOSE==="1") process.stdout.write(chunk); });
server.stderr.on("data",(chunk)=>{ serverLog+=String(chunk); if(process.env.FORGE_LOOP_VERBOSE==="1") process.stderr.write(chunk); });

try {
  await waitFor(baseURL+"/studio/autonomy-preview?progress=0&viewport=desktop&variant=incumbent",60_000);

  for(let cycleNumber=1;cycleNumber<=definition.budgets.maxCycles;cycleNumber++) {
    const preStop=evaluateLoopStop(report);
    if(preStop) { finish(preStop.status,preStop.reason); break; }

    const cycleRoot=path.join(workRoot,"cycle-"+String(cycleNumber).padStart(2,"0"));
    const incumbentRoot=path.join(cycleRoot,"incumbent");
    const incumbentMotionPath=path.join(cycleRoot,"incumbent-motion.json");
    await fs.mkdir(cycleRoot,{recursive:true});
    const incumbentRaw=JSON.parse(await fs.readFile(currentIncumbentPath,"utf8"));
    const incumbentFingerprint=fingerprint(incumbentRaw);
    const cycle={
      cycle:cycleNumber,
      startedAt:new Date().toISOString(),
      incumbentFingerprint,
      candidates:[],
      noProgress:false,
    };

    console.log("\nLOOP "+definition.label+" · cycle "+cycleNumber+"/"+definition.budgets.maxCycles);
    await mustRun(process.execPath,[
      "--import","tsx","scripts/autonomy-candidate-capture.mjs",
      "--url",baseURL,"--experience",currentIncumbentPath,"--output",incumbentRoot,"--variant","incumbent",
    ]);
    await mustRun(process.execPath,[
      "--import","tsx","scripts/autonomy-motion-review.mjs",
      "--url",baseURL,"--experience",currentIncumbentPath,"--variant","incumbent","--output",incumbentMotionPath,"--allow-failures",
    ]);
    const seenFingerprints=new Map();
    const priorRepairs=report.cycles.flatMap((item)=>item.candidates.flatMap((candidate)=>candidate.repairSummary ?? []));
    const unresolved=report.cycles.flatMap((item)=>item.candidates.flatMap((candidate)=>candidate.hardGateFailures)).slice(-12);
    const strategies=definition.strategies.slice(0,definition.budgets.maxCandidatesPerCycle);

    for(let index=0;index<strategies.length;index++) {
      if(report.candidateAttempts>=definition.budgets.maxCandidateAttempts) break;
      const elapsed=Date.now()-Date.parse(report.startedAt);
      if(elapsed>=definition.budgets.maxWallTimeMs) break;

      const strategy=strategies[index];
      const candidateId="c"+cycleNumber+"-"+String(index+1).padStart(2,"0")+"-"+strategy.id;
      const candidateRoot=path.join(cycleRoot,candidateId);
      const reviewRoot=path.join(candidateRoot,"repair");
      const candidateExperiencePath=path.join(reviewRoot,"candidate-experience.json");
      const candidateCaptureRoot=path.join(candidateRoot,"capture");
      const functionalPath=path.join(candidateRoot,"functional.json");
      const motionPath=path.join(candidateRoot,"motion.json");
      const comparisonPath=path.join(candidateRoot,"comparison.json");
      report.candidateAttempts++;
      const evidence={
        id:candidateId,
        strategyId:strategy.id,
        functionalPassed:null,
        motionScore:null,
        hardGateFailures:[],
        comparisonAccepted:false,
        comparisonWinner:null,
        preferenceAgreement:null,
        reason:"",
      };

      console.log("  candidate "+candidateId+" · "+strategy.label);
      try {
        const context=compactLoopContext({
          definition,
          cycle:cycleNumber,
          strategyId:strategy.id,
          projectContext:String(options.context || source.context || ""),
          unresolved,
          priorRepairs,
        });
        const director=await run(process.execPath,[
          "--import","tsx","scripts/autonomy-visual-director.mjs",
          "--report",path.join(incumbentRoot,"review-report.json"),
          "--experience",currentIncumbentPath,
          "--output",reviewRoot,
          "--context",context,
          "--allowed-commands",definition.allowedRepairCommands.join(","),
        ]);
        const repairPlan=await readJson(path.join(reviewRoot,"repair-plan.json"),null);
        evidence.repairSignature=repairPlanSignature(repairPlan);
        evidence.repairSummary=Array.isArray(repairPlan?.summary) ? repairPlan.summary.slice(0,8).map((item)=>String(item).slice(0,400)) : [];
        if(director.code!==0 || !(await exists(candidateExperiencePath))) {
          const repairResult=await readJson(path.join(reviewRoot,"repair-result.json"),{});
          evidence.reason=boundedReason(repairResult.errors?.join("; ") || "Visual repair worker did not produce a safe candidate.");
          evidence.hardGateFailures=boundedFailures([evidence.reason]);
          cycle.candidates.push(evidence);
          await writeReportWithCyclePreview(cycle);
          continue;
        }

        const candidateRaw=parseExperience(JSON.parse(await fs.readFile(candidateExperiencePath,"utf8")));
        const candidateFingerprint=fingerprint(candidateRaw);
        evidence.fingerprint=candidateFingerprint;
        evidence.candidatePath=candidateExperiencePath;
        if(candidateFingerprint===incumbentFingerprint) {
          evidence.duplicateOf="incumbent";
          evidence.reason="Candidate fingerprint is identical to the incumbent.";
          cycle.candidates.push(evidence);
          await writeReportWithCyclePreview(cycle);
          continue;
        }
        if(seenFingerprints.has(candidateFingerprint)) {
          evidence.duplicateOf=seenFingerprints.get(candidateFingerprint);
          evidence.reason="Candidate duplicates another strategy in this cycle.";
          cycle.candidates.push(evidence);
          await writeReportWithCyclePreview(cycle);
          continue;
        }
        seenFingerprints.set(candidateFingerprint,candidateId);
        await fs.copyFile(candidateExperiencePath,currentCandidatePath);

        await mustRun(process.execPath,[
          "--import","tsx","scripts/autonomy-candidate-capture.mjs",
          "--url",baseURL,"--experience",currentCandidatePath,"--output",candidateCaptureRoot,"--variant","candidate",
        ]);
        const functional=await run(process.execPath,[
          "--import","tsx","scripts/autonomy-functional-verify.mjs",
          "--url",baseURL,"--experience",currentCandidatePath,"--variant","candidate","--output",functionalPath,
        ]);
        const motion=await run(process.execPath,[
          "--import","tsx","scripts/autonomy-motion-review.mjs",
          "--url",baseURL,"--experience",currentCandidatePath,"--variant","candidate","--output",motionPath,
        ]);
        const comparison=await run(process.execPath,[
          "--import","tsx","scripts/autonomy-compare.mjs",
          "--incumbent",path.join(incumbentRoot,"review-report.json"),
          "--candidate",path.join(candidateCaptureRoot,"review-report.json"),
          "--output",comparisonPath,
          "--functional",functionalPath,
          "--incumbent-motion",incumbentMotionPath,
          "--candidate-motion",motionPath,
          "--max-motion-regression",String(definition.acceptance.maxMotionRegression),
          "--context",context,
        ]);

        const functionalReport=await readJson(functionalPath,{});
        const motionReport=await readJson(motionPath,{});
        const comparisonReport=await readJson(comparisonPath,{});
        evidence.functionalPassed=functionalReport.passed ?? functional.code===0;
        evidence.motionScore=typeof motionReport.qualityScore==="number" ? motionReport.qualityScore : null;
        evidence.hardGateFailures=boundedFailures([
          ...(functionalReport.hardGateFailures ?? []),
          ...(motionReport.hardGateFailures ?? []),
          ...(comparisonReport.candidateHardGateFailures ?? []),
        ]);
        evidence.comparisonAccepted=Boolean(comparisonReport.decision?.accepted);
        evidence.comparisonWinner=comparisonReport.decision?.winner ?? null;
        evidence.preferenceAgreement=typeof comparisonReport.decision?.agreement==="number" ? comparisonReport.decision.agreement : null;
        evidence.reason=boundedReason(comparisonReport.decision?.reason || (comparison.code===0 ? "Comparison completed." : "Candidate did not beat the incumbent."));
      } catch(error) {
        evidence.reason=boundedReason(error instanceof Error ? error.message : String(error));
        evidence.hardGateFailures=boundedFailures([...evidence.hardGateFailures,evidence.reason]);
      }
      cycle.candidates.push(evidence);
      await writeReportWithCyclePreview(cycle);
    }

    const winner=selectTournamentWinner(cycle.candidates,definition);
    if(winner?.candidatePath) {
      await fs.copyFile(winner.candidatePath,currentIncumbentPath);
      report.currentFingerprint=winner.fingerprint || fingerprint(JSON.parse(await fs.readFile(currentIncumbentPath,"utf8")));
      report.acceptedImprovements++;
      report.noProgressStreak=0;
      cycle.acceptedCandidateId=winner.id;
      cycle.acceptedFingerprint=report.currentFingerprint;
      console.log("  ACCEPT "+winner.id+" · agreement="+winner.preferenceAgreement);
    } else {
      cycle.noProgress=true;
      report.noProgressStreak++;
      console.log("  HOLD incumbent · no candidate proved improvement");
    }
    cycle.endedAt=new Date().toISOString();
    report.cycles.push(cycle);

    const stop=evaluateLoopStop(report);
    if(stop) {
      cycle.stopReason=stop.reason;
      finish(stop.status,stop.reason);
      await writeReport();
      break;
    }
    await writeReport();
  }

  if(report.status==="running") finish("completed","Loop cycle plan completed with the strongest verified incumbent preserved.");
  if(report.acceptedImprovements>0) {
    await fs.copyFile(currentIncumbentPath,acceptedPath);
    report.acceptedExperiencePath=acceptedPath;
  }
  report.learningCandidate=learningCandidate(report);
  report.endedAt=new Date().toISOString();
  await writeReport();
  await recordVaultSummary().catch((error)=>console.warn("Vault loop journal skipped: "+(error instanceof Error ? error.message : String(error))));

  console.log("\nFORGE LOOP "+report.status.toUpperCase());
  console.log(report.stopReason || "Complete.");
  console.log("Accepted improvements: "+report.acceptedImprovements);
  console.log("Evidence: "+reportPath);
  if(report.acceptedExperiencePath) console.log("Human-review candidate: "+report.acceptedExperiencePath);
  if(report.status==="escalated") process.exitCode=2;
  else if(report.status==="failed") process.exitCode=2;
} catch(error) {
  report.status="failed";
  report.stopReason=boundedReason(error instanceof Error ? error.message : String(error),1000);
  report.endedAt=new Date().toISOString();
  await writeReport().catch(()=>{});
  console.error(report.stopReason);
  process.exitCode=2;
} finally {
  if(server.exitCode===null) server.kill("SIGTERM");
  await new Promise((resolve)=>setTimeout(resolve,400));
  if(server.exitCode===null) server.kill("SIGKILL");
  if(process.exitCode && serverLog) await fs.writeFile(path.join(workRoot,"server.log"),serverLog).catch(()=>{});
}

function finish(status,reason) {
  report.status=status;
  report.stopReason=reason;
}
async function writeReport() {
  await fs.writeFile(reportPath,JSON.stringify(loopRunReportSchema.parse(report),null,2)+"\n");
}
async function writeReportWithCyclePreview(cycle) {
  const preview={...report,cycles:[...report.cycles,{...cycle,endedAt:cycle.endedAt ?? new Date().toISOString()}]};
  await fs.writeFile(reportPath,JSON.stringify(loopRunReportSchema.parse(preview),null,2)+"\n");
}
async function resolveSource({ projectId,experiencePath,workRoot }) {
  if(projectId) {
    const snapshot=await readVaultProject(projectId);
    if(!snapshot) fail("Project Vault does not contain project "+projectId+". Save a checkpoint before running a project loop.");
    const file=path.join(workRoot,"vault-source-experience.json");
    await fs.writeFile(file,JSON.stringify(snapshot.experience,null,2)+"\n");
    return {
      experience:snapshot.experience,
      label:"Project Vault "+projectId+" @ "+snapshot.versionId,
      versionId:snapshot.versionId,
      context:snapshot.project.name+". "+snapshot.experience.meta.description,
    };
  }
  const file=path.resolve(experiencePath || "config/experience.json");
  const experience=parseExperience(JSON.parse(await fs.readFile(file,"utf8")));
  return { experience,label:file,context:(experience.meta?.name || "Forge experience")+". "+(experience.meta?.description || "") };
}
async function recordVaultStart() {
  if(!projectId) return;
  const snapshot=await readVaultProject(projectId);
  if(!snapshot) return;
  await appendVaultJournal(projectId,{ id:"forge-loop",name:"Forge Loop Engine",role:"automation" },"loop-run",definition.label+" started · run "+report.runId);
}
async function recordVaultSummary() {
  if(!projectId) return;
  const snapshot=await readVaultProject(projectId);
  if(!snapshot) return;
  const action=report.status==="escalated" ? "loop-escalate" : report.acceptedImprovements ? "loop-candidate" : "loop-stop";
  const detail=[
    report.loopId,
    report.stopReason,
    report.acceptedImprovements+" proven candidate improvement(s)",
    report.cycles.length+" cycle(s)",
    "run "+report.runId,
  ].filter(Boolean).join(" · ");
  await appendVaultJournal(projectId,{ id:"forge-loop",name:"Forge Loop Engine",role:"automation" },action,detail);
}
async function waitFor(url,timeoutMs) {
  const started=Date.now();
  let lastError="";
  while(Date.now()-started<timeoutMs) {
    if(server.exitCode!==null) throw new Error("Loop preview server exited before becoming ready.");
    try {
      const response=await fetch(url);
      if(response.ok) return;
      lastError="HTTP "+response.status;
    } catch(error) {
      lastError=error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve)=>setTimeout(resolve,500));
  }
  throw new Error("Timed out waiting for Loop preview: "+lastError);
}
async function mustRun(command,argv) {
  const result=await run(command,argv);
  if(result.code!==0) throw new Error(path.basename(argv.find((item)=>String(item).includes(".mjs")) || command)+" exited with code "+result.code);
  return result;
}
async function run(command,argv) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,argv,{stdio:"inherit",env:process.env});
    child.on("error",reject);
    child.on("exit",(code)=>resolve({code:code ?? 1}));
  });
}
async function readJson(file,fallback) {
  try { return JSON.parse(await fs.readFile(file,"utf8")); } catch { return fallback; }
}
async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
function fingerprint(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function unique(values) { return [...new Set(values.filter(Boolean).map(String))]; }
function boundedFailures(values) { return unique(values).map((value)=>value.slice(0,600)).slice(0,100); }
function boundedReason(value,max=2000) { return String(value || "").slice(0,max); }
function positiveInt(value,fallback,min,max) {
  const parsed=Number(value ?? fallback);
  return Number.isInteger(parsed) ? Math.max(min,Math.min(max,parsed)) : fallback;
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
function fail(message) { console.error(message); process.exit(2); }
