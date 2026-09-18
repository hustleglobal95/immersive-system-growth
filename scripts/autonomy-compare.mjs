import fs from "node:fs/promises";
import path from "node:path";
import { buildPairwiseCriticRequests, pairwiseJudgmentFromResponse } from "../src/platform/autonomy/visualDirector.ts";
import { forcedOptimizationDecision } from "../src/platform/autonomy/forcedOptimization.ts";

const options=args(process.argv.slice(2));
const incumbentReportPath=String(options.incumbent || "test-results/autonomy/review-report.json");
const candidateReportPath=String(options.candidate || "test-results/autonomy-candidate/review-report.json");
const outputPath=String(options.output || "test-results/autonomy-candidate/comparison-report.json");
const criticUrl=process.env.FORGE_VISUAL_CRITIC_URL;
const criticToken=process.env.FORGE_VISUAL_CRITIC_TOKEN;
if(!criticUrl) {
  console.error("FORGE_VISUAL_CRITIC_URL is required for pairwise visual acceptance. Forge fails closed without a comparative judge.");
  process.exit(2);
}
const incumbent=JSON.parse(await fs.readFile(incumbentReportPath,"utf8"));
const candidate=JSON.parse(await fs.readFile(candidateReportPath,"utf8"));
const projectContext=String(options.context || process.env.FORGE_AUTONOMY_CONTEXT || incumbent.project || candidate.project || "Forge experience");
const incumbentId=String(options["incumbent-id"] || "incumbent");
const candidateId=String(options["candidate-id"] || "candidate");
const judgments=[];
const incumbentById=new Map((incumbent.captures ?? []).map((item)=>[item.id,item]));
const candidateById=new Map((candidate.captures ?? []).map((item)=>[item.id,item]));
const expectedIds=[...new Set((candidate.plan?.captures ?? []).map((item)=>item.id))].sort();
const common=[...incumbentById.keys()].filter((id)=>candidateById.has(id)).sort();
const missingMatchedCaptures=expectedIds.filter((id)=>!incumbentById.has(id) || !candidateById.has(id));

for(const captureId of common) {
  const left=incumbentById.get(captureId);
  const right=candidateById.get(captureId);
  if(left.status!=="captured" || right.status!=="captured") continue;
  const requests=buildPairwiseCriticRequests({ captureId,incumbentId,candidateId,projectContext });
  for(let round=0;round<requests.length;round++) {
    const request=requests[round];
    const firstCapture=request.firstId===incumbentId ? left : right;
    const secondCapture=request.secondId===incumbentId ? left : right;
    const [firstImage,secondImage]=await Promise.all([
      fs.readFile(path.resolve(String(firstCapture.path))).then((buffer)=>buffer.toString("base64")),
      fs.readFile(path.resolve(String(secondCapture.path))).then((buffer)=>buffer.toString("base64")),
    ]);
    const response=await fetch(criticUrl,{
      method:"POST",
      headers:{
        "content-type":"application/json",
        ...(criticToken ? { authorization:"Bearer " + criticToken } : {}),
      },
      body:JSON.stringify({
        ...request,
        firstImage:{ mimeType:"image/png",data:firstImage },
        secondImage:{ mimeType:"image/png",data:secondImage },
      }),
    });
    if(!response.ok) throw new Error("Pairwise critic failed for " + captureId + " round " + (round+1) + ": HTTP " + response.status);
    const payload=await response.json();
    judgments.push(pairwiseJudgmentFromResponse({ judgeId:captureId+"-round-"+(round+1),request,response:payload,candidateId }));
  }
}

const candidateHardGateFailures=[...new Set([
  ...hardGateFailures(candidate),
  ...judgments.flatMap((item)=>item.hardGateFailures),
  ...missingMatchedCaptures.map((id)=>id + ": missing matched A/B capture"),
])];
const decision=forcedOptimizationDecision({ incumbentId,candidateId,judgments,candidateHardGateFailures });
await fs.mkdir(path.dirname(outputPath),{ recursive:true });
await fs.writeFile(outputPath,JSON.stringify({ version:1,projectContext,expectedCaptureCount:expectedIds.length,commonCaptureCount:common.length,missingMatchedCaptures,candidateHardGateFailures,decision },null,2)+"\n");
console.log("Pairwise decision: " + decision.winner + " / accepted=" + decision.accepted + " / agreement=" + decision.agreement);
console.log(decision.reason);
if(!decision.accepted) process.exitCode=1;

function hardGateFailures(report) {
  const failures=[];
  for(const capture of report.captures ?? []) {
    if(capture.status!=="captured") failures.push(capture.id + ": capture failed");
    if(capture.horizontalOverflow) failures.push(capture.id + ": horizontal overflow");
  }
  for(const error of report.runtimeErrors ?? []) failures.push("runtime: " + String(error.message || error.type || "error"));
  return failures;
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
