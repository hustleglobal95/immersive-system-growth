import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { loopRunReportSchema } from "../src/platform/loops/loopSchema.ts";
import { readVaultProject, saveVaultProjectWithLearning } from "../src/platform/studioVault.ts";
import { createProjectLearningRecord } from "../src/platform/learning/projectLearning.ts";

const options=args(process.argv.slice(2));
const reportFile=options.report ? path.resolve(String(options.report)) : "";
const actorName=String(options.actor || "").trim();
if(!reportFile) fail("Usage: npm run loop:accept -- --report <run-report.json> --actor <name> --approve");
if(!actorName) fail("--actor is required so Project Vault records who approved the loop result.");
if(options.approve!==true) fail("Human approval is required. Re-run with --approve after inspecting the loop evidence and accepted artifact.");

const report=loopRunReportSchema.parse(JSON.parse(await fs.readFile(reportFile,"utf8")));
if(!report.projectId) fail("This loop was not run from Project Vault, so there is no durable project target to update.");
if(!report.acceptedExperiencePath || report.acceptedImprovements<1) fail("The loop report contains no proven improvement to accept.");
if(!["completed","stopped"].includes(report.status)) fail("Only a completed/stopped loop with a preserved winning artifact may be accepted.");
const snapshot=await readVaultProject(report.projectId);
if(!snapshot) fail("Project Vault no longer contains "+report.projectId+".");
if(report.sourceVersionId && snapshot.versionId!==report.sourceVersionId) fail("Project Vault changed after this loop began. Current "+snapshot.versionId+" != loop baseline "+report.sourceVersionId+". Re-run the loop or reconcile explicitly.");
const acceptedRaw=await fs.readFile(path.resolve(report.acceptedExperiencePath),"utf8");
const experience=JSON.parse(acceptedRaw);
const assetManifest=report.acceptedAssetManifestPath
  ? JSON.parse(await fs.readFile(path.resolve(report.acceptedAssetManifestPath),"utf8"))
  : snapshot.assetManifest;
const interactionGraph=report.acceptedInteractionGraphPath
  ? JSON.parse(await fs.readFile(path.resolve(report.acceptedInteractionGraphPath),"utf8"))
  : snapshot.interactionGraph;
const stateFingerprint=createHash("sha256").update(JSON.stringify({experience,assetManifest,interactionGraph})).digest("hex");
const legacyExperienceFingerprint=createHash("sha256").update(JSON.stringify(experience)).digest("hex");
if(stateFingerprint!==report.currentFingerprint && legacyExperienceFingerprint!==report.currentFingerprint) {
  fail("Accepted loop artifact bundle fingerprint does not match the run report. Evidence or artifact changed after evaluation.");
}

const actor={id:slug(actorName),name:actorName,role:"loop-approver"};
const note=[
  `Run ${report.runId}`,
  `${report.acceptedImprovements} accepted improvement(s)`,
  report.stopReason || "",
].filter(Boolean).join(" · ");
const acceptanceDetail=`${report.definition.label} accepted · ${report.runId}`;
const result=await saveVaultProjectWithLearning({
  experience,
  project:snapshot.project,
  assetManifest,
  interactionGraph,
},actor,`Loop accepted · ${report.definition.label}`,note,(acceptedVersionId)=>createProjectLearningRecord({
  report,
  projectId:report.projectId,
  acceptedVersionId,
  approvedBy:actor,
  creativeStateFingerprint:typeof options["creative-state-fingerprint"]==="string" ? options["creative-state-fingerprint"] : undefined,
  buildPacketFingerprint:typeof options["build-packet-fingerprint"]==="string" ? options["build-packet-fingerprint"] : undefined,
}),acceptanceDetail);

console.log("Loop artifact promoted to Project Vault.");
console.log("Project: "+result.summary.name);
console.log("Version: "+result.entry.versionId);
console.log("Approved by: "+actorName);
console.log("Project learning: "+result.learning.id);

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
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60) || "loop-approver"; }
function fail(message) { console.error(message); process.exit(2); }
