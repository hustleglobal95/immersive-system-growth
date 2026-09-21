import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { loopDefinition as getLoopDefinition } from "../src/platform/loops/loopRegistry.ts";
import { loopDefinitionSchema, loopRunReportSchema } from "../src/platform/loops/loopSchema.ts";
import { compactLoopContext, evaluateLoopStop, learningCandidate, selectTournamentWinner } from "../src/platform/loops/loopRunner.ts";
import { createLoopRunReport, repairPlanSignature } from "../src/platform/loops/loopEvidence.ts";
import { appendVaultJournal, readVaultProject, saveVaultLoopCandidate } from "../src/platform/studioVault.ts";
import { parseExperience } from "../src/lib/configSchema.ts";
import { parseAssetManifest } from "../src/platform/assetManifestSchema.ts";
import { parseInteractionGraph } from "../src/lib/interactionGraph.ts";
import { parseCinematicSystems } from "../src/lib/cinematic/schema.ts";
import { cinematicSystems as productionCinematicSystems } from "../src/lib/cinematic/config.ts";
import { projectStateFingerprint } from "../src/platform/control-plane/projectState.ts";

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
const currentIncumbentManifestPath=path.join(workRoot,"current-incumbent-asset-manifest.json");
const currentCandidateManifestPath=path.join(workRoot,"current-candidate-asset-manifest.json");
const currentIncumbentGraphPath=path.join(workRoot,"current-incumbent-interaction-graph.json");
const currentCandidateGraphPath=path.join(workRoot,"current-candidate-interaction-graph.json");
const reportPath=path.join(workRoot,"run-report.json");
const acceptedPath=path.join(workRoot,"accepted-experience.json");
const acceptedManifestPath=path.join(workRoot,"accepted-asset-manifest.json");
const acceptedGraphPath=path.join(workRoot,"accepted-interaction-graph.json");
const projectId=options.project ? String(options.project) : undefined;
const proposalId=options["proposal-id"] ? String(options["proposal-id"]) : undefined;
const selectionKey=options["selection-key"] ? String(options["selection-key"]) : undefined;
const proposalBaseline=options["baseline-fingerprint"] ? String(options["baseline-fingerprint"]) : undefined;
const directorJudgmentPath=options["director-judgment"] ? path.resolve(String(options["director-judgment"])) : "";
const controlPlane=proposalId ? {
  proposalId,
  selectionKey:String(selectionKey || ""),
  baselineFingerprint:String(proposalBaseline || ""),
  intent:String(options.context || ""),
} : undefined;
if(controlPlane && (
  !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(controlPlane.proposalId)
  || !controlPlane.selectionKey
  || !/^[a-f0-9]{16,128}$/.test(controlPlane.baselineFingerprint)
  || !controlPlane.intent
)) {
  fail("Control Plane Loop runs require valid --proposal-id, --selection-key, --baseline-fingerprint and --context values.");
}

const reviewOnly=!process.env.FORGE_VISUAL_CRITIC_URL && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN;
if(reviewOnly) {
  console.warn("No comparative visual judge is configured. Forge will generate and verify candidates for human review, but it will not select or promote a visual winner. Configure FORGE_VISUAL_CRITIC_URL or AI Gateway credentials for automatic comparison.");
}

await fs.mkdir(workRoot,{recursive:true});
const source=await resolveSource({
  projectId,
  experiencePath:options.experience ? String(options.experience) : undefined,
  manifestPath:options.manifest ? String(options.manifest) : undefined,
  graphPath:options.graph ? String(options.graph) : undefined,
  cinematicPath:options.cinematic ? String(options.cinematic) : undefined,
  workRoot,
});
await fs.writeFile(currentIncumbentPath,JSON.stringify(source.experience,null,2)+"\n");
await fs.writeFile(currentCandidatePath,JSON.stringify(source.experience,null,2)+"\n");
await fs.writeFile(currentIncumbentManifestPath,JSON.stringify(source.assetManifest,null,2)+"\n");
await fs.writeFile(currentCandidateManifestPath,JSON.stringify(source.assetManifest,null,2)+"\n");
await fs.writeFile(currentIncumbentGraphPath,JSON.stringify(source.interactionGraph,null,2)+"\n");
await fs.writeFile(currentCandidateGraphPath,JSON.stringify(source.interactionGraph,null,2)+"\n");
const sourceState={
  experience:source.experience,
  assetManifest:source.assetManifest,
  interactionGraph:source.interactionGraph,
  cinematicSystems:source.cinematicSystems,
};
if(controlPlane) {
  const actualControlPlaneBaseline=projectStateFingerprint(sourceState);
  if(actualControlPlaneBaseline!==controlPlane.baselineFingerprint) {
    fail("Control Plane proposal baseline does not match the current Loop source. Save the intended working state to Vault and prepare the proposal again.");
  }
}
const baselineFingerprint=fingerprint(sourceState);
let report=createLoopRunReport({
  runId:"loop-"+stamp+"-"+loopId,
  definition,
  projectId,
  sourceVersionId:source.versionId,
  controlPlane,
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
    STUDIO_AUTH_ENABLED:"false",
    ENABLE_STUDIO_IN_PROD:"true",
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
    const incumbentPerformancePath=path.join(cycleRoot,"incumbent-performance.json");
    const incumbentAssetProfilePath=path.join(cycleRoot,"incumbent-assets.json");
    await fs.mkdir(cycleRoot,{recursive:true});
    const incumbentRaw=parseExperience(JSON.parse(await fs.readFile(currentIncumbentPath,"utf8")));
    const incumbentManifest=parseAssetManifest(JSON.parse(await fs.readFile(currentIncumbentManifestPath,"utf8")));
    const incumbentGraph=parseInteractionGraph(JSON.parse(await fs.readFile(currentIncumbentGraphPath,"utf8")));
    const incumbentFingerprint=fingerprint({experience:incumbentRaw,assetManifest:incumbentManifest,interactionGraph:incumbentGraph});
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
    if(definition.verifiers.includes("performance")) {
      await mustRun(process.execPath,[
        "--import","tsx","scripts/autonomy-performance-profile.mjs",
        "--url",baseURL,"--experience",currentIncumbentPath,"--variant","incumbent","--output",incumbentPerformancePath,
      ]);
    }
    if(definition.verifiers.includes("assets")) {
      await mustRun(process.execPath,[
        "--import","tsx","scripts/autonomy-asset-profile.mjs",
        "--experience",currentIncumbentPath,"--manifest",currentIncumbentManifestPath,"--output",incumbentAssetProfilePath,
      ]);
    }
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
      const candidateAssetManifestOutputPath=path.join(reviewRoot,"candidate-asset-manifest.json");
      const candidateInteractionGraphOutputPath=path.join(reviewRoot,"candidate-interaction-graph.json");
      const candidateCaptureRoot=path.join(candidateRoot,"capture");
      const functionalPath=path.join(candidateRoot,"functional.json");
      const motionPath=path.join(candidateRoot,"motion.json");
      const comparisonPath=path.join(candidateRoot,"comparison.json");
      const candidatePerformancePath=path.join(candidateRoot,"performance.json");
      const candidateAssetProfilePath=path.join(candidateRoot,"assets.json");
      const candidateAccessibilityPath=path.join(candidateRoot,"accessibility.json");
      report.candidateAttempts++;
      const evidence={
        id:candidateId,
        strategyId:strategy.id,
        functionalPassed:null,
        motionScore:null,
        hardGateFailures:[],
        performanceScoreBefore:null,
        performanceScoreAfter:null,
        rafP95Before:null,
        rafP95After:null,
        accessibilityPassed:null,
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
        const worker=definition.worker==="performance-repair"
          ? await run(process.execPath,[
              "--import","tsx","scripts/autonomy-performance-repair.mjs",
              "--experience",currentIncumbentPath,
              "--profile",incumbentPerformancePath,
              "--output",reviewRoot,
              "--strategy",strategy.id,
            ])
          : definition.worker==="asset-repair"
            ? await run(process.execPath,[
                "--import","tsx","scripts/autonomy-asset-repair.mjs",
                "--experience",currentIncumbentPath,
                "--manifest",currentIncumbentManifestPath,
                "--output",reviewRoot,
                "--strategy",strategy.id,
              ])
            : definition.worker==="construction"
              ? await run(process.execPath,[
                  "--import","tsx","scripts/autonomy-construction.mjs",
                  "--experience",currentIncumbentPath,
                  "--manifest",currentIncumbentManifestPath,
                  "--output",reviewRoot,
                  "--strategy",strategy.id,
                  "--context",[
                    String(options.context || source.context || ""),
                    "Construction objective: "+definition.objective,
                    "Candidate direction: "+strategy.instruction,
                  ].filter(Boolean).join("\n"),
                ])
              : await run(process.execPath,[
                "--import","tsx","scripts/autonomy-visual-director.mjs",
                "--report",path.join(incumbentRoot,"review-report.json"),
                "--experience",currentIncumbentPath,
                "--output",reviewRoot,
                "--context",context,
                "--allowed-commands",definition.allowedRepairCommands.join(","),
                ...(directorJudgmentPath ? ["--director-judgment",directorJudgmentPath] : []),
              ]);
        const repairPlan=await readJson(path.join(reviewRoot,"repair-plan.json"),null);
        evidence.repairSignature=repairPlanSignature(repairPlan);
        evidence.repairSummary=Array.isArray(repairPlan?.summary) ? repairPlan.summary.slice(0,8).map((item)=>String(item).slice(0,400)) : [];
        evidence.repairCommandTypes=Array.isArray(repairPlan?.commands)
          ? [...new Set(repairPlan.commands.map((command)=>String(command?.type || "")).filter(Boolean))].slice(0,7)
          : [];
        if(worker.code!==0 || !(await exists(candidateExperiencePath))) {
          const repairResult=await readJson(path.join(reviewRoot,"repair-result.json"),{});
          evidence.reason=boundedReason(repairResult.errors?.join("; ") || definition.label+" repair worker did not produce a safe candidate.");
          evidence.hardGateFailures=boundedFailures([evidence.reason]);
          cycle.candidates.push(evidence);
          await writeReportWithCyclePreview(cycle);
          continue;
        }

        const candidateRaw=parseExperience(JSON.parse(await fs.readFile(candidateExperiencePath,"utf8")));
        const candidateManifest=(await exists(candidateAssetManifestOutputPath))
          ? parseAssetManifest(JSON.parse(await fs.readFile(candidateAssetManifestOutputPath,"utf8")))
          : incumbentManifest;
        const candidateGraph=(await exists(candidateInteractionGraphOutputPath))
          ? parseInteractionGraph(JSON.parse(await fs.readFile(candidateInteractionGraphOutputPath,"utf8")))
          : incumbentGraph;
        const candidateFingerprint=fingerprint({
          experience:candidateRaw,
          assetManifest:candidateManifest,
          interactionGraph:candidateGraph,
        });
        evidence.fingerprint=candidateFingerprint;
        evidence.candidatePath=candidateExperiencePath;
        if(await exists(candidateAssetManifestOutputPath)) evidence.candidateAssetManifestPath=candidateAssetManifestOutputPath;
        if(await exists(candidateInteractionGraphOutputPath)) evidence.candidateInteractionGraphPath=candidateInteractionGraphOutputPath;
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
        await fs.writeFile(currentCandidateManifestPath,JSON.stringify(candidateManifest,null,2)+"\n");
        await fs.writeFile(currentCandidateGraphPath,JSON.stringify(candidateGraph,null,2)+"\n");

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
        const comparison=reviewOnly
          ? { code:0,stdout:"",stderr:"" }
          : await run(process.execPath,[
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
        const comparisonReport=reviewOnly ? {} : await readJson(comparisonPath,{});
        evidence.functionalPassed=functionalReport.passed ?? functional.code===0;
        if(definition.verifiers.includes("performance")) {
          const perf=await run(process.execPath,[
            "--import","tsx","scripts/autonomy-performance-profile.mjs",
            "--url",baseURL,"--experience",currentCandidatePath,"--variant","candidate","--output",candidatePerformancePath,
          ]);
          const incumbentPerformance=await readJson(incumbentPerformancePath,{});
          const candidatePerformance=await readJson(candidatePerformancePath,{});
          if(perf.code!==0 || !candidatePerformance.summary) {
            evidence.hardGateFailures=boundedFailures([...evidence.hardGateFailures,"Candidate performance profiling failed."]);
          } else {
            const incumbentScore=Number(incumbentPerformance.summary?.score ?? 0);
            const candidateScore=Number(candidatePerformance.summary?.score ?? 0);
            const incumbentP95=Number(incumbentPerformance.summary?.worstRafP95 ?? Infinity);
            const candidateP95=Number(candidatePerformance.summary?.worstRafP95 ?? Infinity);
            evidence.performanceScoreBefore=Number.isFinite(incumbentScore) ? incumbentScore : null;
            evidence.performanceScoreAfter=Number.isFinite(candidateScore) ? candidateScore : null;
            evidence.rafP95Before=Number.isFinite(incumbentP95) ? incumbentP95 : null;
            evidence.rafP95After=Number.isFinite(candidateP95) ? candidateP95 : null;
            if(definition.worker==="performance-repair") {
              if(!(candidateScore>=incumbentScore+1 || candidateP95<=incumbentP95-0.75)) {
                evidence.hardGateFailures=boundedFailures([...evidence.hardGateFailures,
                  "Performance candidate did not establish a measurable renderer/frame-time improvement over the incumbent."
                ]);
              } else {
                evidence.repairSummary=[...evidence.repairSummary,
                  `Performance score ${incumbentScore.toFixed(1)} -> ${candidateScore.toFixed(1)}; p95 ${incumbentP95.toFixed(1)}ms -> ${candidateP95.toFixed(1)}ms.`
                ].slice(0,8);
              }
            } else if(candidateScore<incumbentScore-3 && candidateP95>incumbentP95+1.5) {
              evidence.hardGateFailures=boundedFailures([...evidence.hardGateFailures,
                `Performance regressed materially: score ${incumbentScore.toFixed(1)} -> ${candidateScore.toFixed(1)}, p95 ${incumbentP95.toFixed(1)}ms -> ${candidateP95.toFixed(1)}ms.`
              ]);
            }
          }
        }
        if(definition.verifiers.includes("accessibility")) {
          const accessibility=await run(process.execPath,[
            "--import","tsx","scripts/autonomy-accessibility-verify.mjs",
            "--url",baseURL,"--experience",currentCandidatePath,"--variant","candidate","--output",candidateAccessibilityPath,
          ]);
          const accessibilityReport=await readJson(candidateAccessibilityPath,{});
          evidence.accessibilityPassed=accessibilityReport.passed===true;
          if(accessibility.code!==0 || accessibilityReport.passed!==true) {
            evidence.hardGateFailures=boundedFailures([
              ...evidence.hardGateFailures,
              ...(accessibilityReport.hardGateFailures ?? ["Candidate accessibility verification failed."]),
            ]);
          }
        }
        if(definition.verifiers.includes("assets")) {
          const assetRun=await run(process.execPath,[
            "--import","tsx","scripts/autonomy-asset-profile.mjs",
            "--experience",currentCandidatePath,"--manifest",currentCandidateManifestPath,"--output",candidateAssetProfilePath,
          ]);
          const incumbentAssets=await readJson(incumbentAssetProfilePath,{});
          const candidateAssets=await readJson(candidateAssetProfilePath,{});
          evidence.assetScoreBefore=typeof incumbentAssets.intelligence?.score==="number" ? incumbentAssets.intelligence.score : null;
          evidence.assetScoreAfter=typeof candidateAssets.intelligence?.score==="number" ? candidateAssets.intelligence.score : null;
          evidence.referencedAssetBytesBefore=Number.isInteger(incumbentAssets.referencedBytes) ? incumbentAssets.referencedBytes : null;
          evidence.referencedAssetBytesAfter=Number.isInteger(candidateAssets.referencedBytes) ? candidateAssets.referencedBytes : null;
          if(assetRun.code!==0 || !candidateAssets.intelligence) {
            evidence.hardGateFailures=boundedFailures([...evidence.hardGateFailures,"Candidate asset verification failed."]);
          } else if(definition.worker==="construction" && candidateAssets.intelligence.findings?.some((finding)=>finding.severity==="blocker")) {
            evidence.hardGateFailures=boundedFailures([
              ...evidence.hardGateFailures,
              ...candidateAssets.intelligence.findings.filter((finding)=>finding.severity==="blocker").map((finding)=>"Asset blocker: "+finding.title+" — "+finding.detail),
            ]);
          } else if(definition.worker==="asset-repair") {
            const healthGain=(evidence.assetScoreAfter ?? -Infinity)-(evidence.assetScoreBefore ?? -Infinity);
            const byteGain=(evidence.referencedAssetBytesBefore ?? 0)-(evidence.referencedAssetBytesAfter ?? 0);
            if(!(healthGain>=0.5 || byteGain>0)) {
              evidence.hardGateFailures=boundedFailures([...evidence.hardGateFailures,
                "Asset Quality candidate did not establish a measurable manifest-health or referenced-byte improvement."
              ]);
            } else {
              evidence.repairSummary=[...evidence.repairSummary,
                `Asset health ${Number(evidence.assetScoreBefore ?? 0).toFixed(1)} -> ${Number(evidence.assetScoreAfter ?? 0).toFixed(1)}; referenced bytes ${evidence.referencedAssetBytesBefore ?? 0} -> ${evidence.referencedAssetBytesAfter ?? 0}.`
              ].slice(0,8);
            }
          }
        }
        evidence.motionScore=typeof motionReport.qualityScore==="number" ? motionReport.qualityScore : null;
        evidence.hardGateFailures=boundedFailures([
          ...evidence.hardGateFailures,
          ...(functionalReport.hardGateFailures ?? []),
          ...(motionReport.hardGateFailures ?? []),
          ...(comparisonReport.candidateHardGateFailures ?? []),
        ]);
        evidence.comparisonAccepted=Boolean(comparisonReport.decision?.accepted);
        evidence.comparisonWinner=comparisonReport.decision?.winner ?? null;
        evidence.preferenceAgreement=typeof comparisonReport.decision?.agreement==="number" ? comparisonReport.decision.agreement : null;
        evidence.reason=boundedReason(
          reviewOnly
            ? "Candidate completed deterministic verification and awaits human visual review; automatic visual comparison is unavailable."
            : comparisonReport.decision?.reason || (comparison.code===0 ? "Comparison completed." : "Candidate did not beat the incumbent.")
        );
        if(definition.worker==="asset-repair" && !evidence.hardGateFailures.length) {
          const healthGain=(evidence.assetScoreAfter ?? -Infinity)-(evidence.assetScoreBefore ?? -Infinity);
          const byteGain=(evidence.referencedAssetBytesBefore ?? 0)-(evidence.referencedAssetBytesAfter ?? 0);
          const visualWinner=comparisonReport.decision?.winner;
          if((healthGain>=0.5 || byteGain>0) && visualWinner!=="incumbent" && visualWinner!=="invalid") {
            evidence.comparisonAccepted=true;
            evidence.comparisonWinner="candidate";
            evidence.preferenceAgreement=1;
            evidence.reason=boundedReason(
              `Asset objective improved with no visual winner against the candidate. Manifest health delta ${healthGain.toFixed(1)}; referenced-byte delta ${byteGain}.`
            );
          }
        }
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
      if(winner.candidateAssetManifestPath) await fs.copyFile(winner.candidateAssetManifestPath,currentIncumbentManifestPath);
      if(winner.candidateInteractionGraphPath) await fs.copyFile(winner.candidateInteractionGraphPath,currentIncumbentGraphPath);
      report.currentFingerprint=winner.fingerprint || fingerprint({
        experience:JSON.parse(await fs.readFile(currentIncumbentPath,"utf8")),
        assetManifest:JSON.parse(await fs.readFile(currentIncumbentManifestPath,"utf8")),
        interactionGraph:JSON.parse(await fs.readFile(currentIncumbentGraphPath,"utf8")),
      });
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

    if(reviewOnly) {
      cycle.stopReason="Human-review mode completed one candidate tournament. No candidate was auto-selected because comparative visual judgment is not configured.";
      finish("completed",cycle.stopReason);
      await writeReport();
      break;
    }

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
    await fs.copyFile(currentIncumbentManifestPath,acceptedManifestPath);
    await fs.copyFile(currentIncumbentGraphPath,acceptedGraphPath);
    report.acceptedExperiencePath=acceptedPath;
    report.acceptedAssetManifestPath=acceptedManifestPath;
    report.acceptedInteractionGraphPath=acceptedGraphPath;
  }
  report.learningCandidate=learningCandidate(report);
  report.endedAt=new Date().toISOString();
  await writeReport();
  if(report.acceptedImprovements>0 && controlPlane) {
    await persistVerifiedCandidate().catch((error)=>console.warn("Vault verified-candidate persistence failed: "+(error instanceof Error ? error.message : String(error))));
  }
  await recordVaultSummary().catch((error)=>console.warn("Vault loop journal skipped: "+(error instanceof Error ? error.message : String(error))));

  console.log("\nFORGE LOOP "+report.status.toUpperCase());
  console.log(report.stopReason || "Complete.");
  console.log("Accepted improvements: "+report.acceptedImprovements);
  console.log("Evidence: "+reportPath);
  if(report.acceptedExperiencePath) {
    console.log("Human-review experience: "+report.acceptedExperiencePath);
    console.log("Human-review asset manifest: "+report.acceptedAssetManifestPath);
    console.log("Human-review interaction graph: "+report.acceptedInteractionGraphPath);
  }
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
async function resolveSource({ projectId,experiencePath,manifestPath,graphPath,cinematicPath,workRoot }) {
  if(projectId) {
    const snapshot=await readVaultProject(projectId);
    if(!snapshot) fail("Project Vault does not contain project "+projectId+". Save a checkpoint before running a project loop.");
    await fs.writeFile(path.join(workRoot,"vault-source-experience.json"),JSON.stringify(snapshot.experience,null,2)+"\n");
    await fs.writeFile(path.join(workRoot,"vault-source-asset-manifest.json"),JSON.stringify(snapshot.assetManifest,null,2)+"\n");
    await fs.writeFile(path.join(workRoot,"vault-source-interaction-graph.json"),JSON.stringify(snapshot.interactionGraph,null,2)+"\n");
    await fs.writeFile(path.join(workRoot,"vault-source-cinematic-systems.json"),JSON.stringify(snapshot.cinematicSystems,null,2)+"\n");
    return {
      experience:snapshot.experience,
      assetManifest:snapshot.assetManifest,
      interactionGraph:snapshot.interactionGraph,
      cinematicSystems:snapshot.cinematicSystems,
      label:"Project Vault "+projectId+" @ "+snapshot.versionId,
      versionId:snapshot.versionId,
      context:snapshot.project.name+". "+snapshot.experience.meta.description,
    };
  }
  const file=path.resolve(experiencePath || "config/experience.json");
  const manifestFile=path.resolve(manifestPath || "config/asset-manifest.json");
  const graphFile=path.resolve(graphPath || "config/interaction-graph.json");
  const cinematicFile=path.resolve(cinematicPath || "config/cinematic-systems.json");
  const experience=parseExperience(JSON.parse(await fs.readFile(file,"utf8")));
  const assetManifest=parseAssetManifest(JSON.parse(await fs.readFile(manifestFile,"utf8")));
  const interactionGraph=parseInteractionGraph(JSON.parse(await fs.readFile(graphFile,"utf8")));
  const cinematicSystems=parseCinematicSystems(await readJson(cinematicFile,productionCinematicSystems));
  return {
    experience,
    assetManifest,
    interactionGraph,
    cinematicSystems,
    label:file,
    context:(experience.meta?.name || "Forge experience")+". "+(experience.meta?.description || ""),
  };
}
async function recordVaultStart() {
  if(!projectId) return;
  const snapshot=await readVaultProject(projectId);
  if(!snapshot) return;
  await appendVaultJournal(projectId,{ id:"forge-loop",name:"Forge Loop Engine",role:"automation" },"loop-run",definition.label+" started · run "+report.runId);
}
async function persistVerifiedCandidate() {
  if(!projectId || !controlPlane || report.acceptedImprovements<1) return;
  const experience=parseExperience(JSON.parse(await fs.readFile(currentIncumbentPath,"utf8")));
  const assetManifest=parseAssetManifest(JSON.parse(await fs.readFile(currentIncumbentManifestPath,"utf8")));
  const interactionGraph=parseInteractionGraph(JSON.parse(await fs.readFile(currentIncumbentGraphPath,"utf8")));
  const acceptedCycle=[...report.cycles].reverse().find((cycle)=>cycle.acceptedCandidateId);
  const evidence=acceptedCycle?.candidates.find((candidate)=>candidate.id===acceptedCycle.acceptedCandidateId);
  const candidateState={experience,assetManifest,interactionGraph,cinematicSystems:source.cinematicSystems};
  await saveVaultLoopCandidate({
    version:1,
    runId:report.runId,
    loopId:report.loopId,
    projectId,
    sourceVersionId:report.sourceVersionId,
    proposalId:controlPlane.proposalId,
    selectionKey:controlPlane.selectionKey,
    baselineFingerprint:controlPlane.baselineFingerprint,
    fingerprint:projectStateFingerprint(candidateState),
    repairSummary:(evidence?.repairSummary ?? []).slice(0,8),
    preferenceAgreement:typeof evidence?.preferenceAgreement==="number" ? evidence.preferenceAgreement : null,
    ...candidateState,
    savedAt:new Date().toISOString(),
  });
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
