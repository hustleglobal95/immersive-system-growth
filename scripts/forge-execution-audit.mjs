import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
process.chdir(ROOT);
const options=Object.fromEntries(process.argv.slice(2)
  .filter((arg)=>arg.startsWith("--")&&arg.includes("="))
  .map((arg)=>arg.slice(2).split(/=(.*)/s,2)));
const changedMode=process.argv.includes("--changed");
const policyPath="config/forge-execution-policy.json";
const policy=JSON.parse(fs.readFileSync(policyPath,"utf8"));
const policySha256=sha256(fs.readFileSync(policyPath));
const governed=policy.creativeChangeControl.governedPathPatterns.map((value)=>new RegExp(value));
const recordDir=policy.creativeChangeControl.recordDirectory;\nconst protectedGovernance=new Set(policy.governanceChangeControl?.protectedPaths||[]);

const explicitRecord=options.record?path.resolve(String(options.record)):null;
const recordFiles=explicitRecord
  ? [explicitRecord]
  : fs.existsSync(recordDir)
    ? fs.readdirSync(recordDir).filter((name)=>name.endsWith(".json")).map((name)=>path.resolve(recordDir,name))
    : [];

const validations=recordFiles.map(validateRecord);
const invalid=validations.filter((item)=>!item.valid);
if(invalid.length){
  console.error("Forge execution audit FAILED:");
  for(const item of invalid) for(const reason of item.reasons) console.error("- "+path.relative(ROOT,item.path)+": "+reason);
  process.exit(1);
}

if(changedMode) enforceChangedFiles(validations);

console.log("Forge execution audit PASS");
console.log("- policy "+policy.policyId+" v"+policy.version);
console.log("- valid execution records: "+validations.length);
if(changedMode) console.log("- changed creative paths require current-branch preflight evidence");

function validateRecord(file){
  const reasons=[];
  let record;
  try{record=JSON.parse(fs.readFileSync(file,"utf8"));}catch(error){
    return {path:file,valid:false,reasons:["invalid JSON: "+error.message],record:null};
  }
  if(record.schemaVersion!==1) reasons.push("unsupported schemaVersion");
  if(record.policyId!==policy.policyId||record.policyVersion!==policy.version) reasons.push("policy identity/version mismatch");
  if(record.policy?.sha256!==policySha256) reasons.push("policy hash does not match current policy");
  const base=stripAttestation(record);
  if(record.selfHash!==sha256(stable(base))) reasons.push("selfHash mismatch");
  for(const stage of policy.fullBuild.requiredStages){
    if(record.stages?.[stage]?.status!=="PASS") reasons.push("required stage not PASS: "+stage);
  }
  const domains=new Set((record.evidence?.contexts||[]).map((item)=>item.domain));
  for(const domain of policy.fullBuild.requiredContextDomains){
    if(!domains.has(domain)) reasons.push("missing Context Capsule evidence: "+domain);
  }
  if(record.confidentiality?.rawPromptCommitted!==false) reasons.push("record must not commit raw prompt");
  if(!/^[a-f0-9]{64}$/.test(record.confidentiality?.promptSha256||"")) reasons.push("invalid prompt fingerprint");
  if(record.attestation?.algorithm==="hmac-sha256"){
    const key=process.env.FORGE_EXECUTION_ATTESTATION_KEY||"";
    if(key){
      const expected=crypto.createHmac("sha256",key).update(record.selfHash).digest("hex");
      if(!safeEqual(expected,record.attestation.signature||"")) reasons.push("HMAC attestation mismatch");
    } else if(process.env.FORGE_EXECUTION_REQUIRE_ATTESTATION==="true") {
      reasons.push("attestation key required but unavailable");
    }
  } else if(process.env.FORGE_EXECUTION_REQUIRE_ATTESTATION==="true") {
    reasons.push("signed execution attestation required");
  }
  return {path:file,valid:reasons.length===0,reasons,record};
}

function enforceChangedFiles(validations){
  const baseRef=String(options.base||process.env.FORGE_EXECUTION_BASE_REF||resolveBaseRef());
  if(!baseRef){
    console.log("Forge execution changed-file enforcement skipped: no PR/base ref available.");
    return;
  }
  const mergeBase=git(["merge-base",baseRef,"HEAD"]);
  const changed=git(["diff","--name-only",mergeBase+"...HEAD"]).split("\n").filter(Boolean);
  const creative=changed.filter(isGoverned);
  if(!creative.length){
    console.log("No governed creative paths changed.");
    return;
  }
  const changedRecords=new Set(changed.filter((file)=>file.startsWith(recordDir+"/")&&file.endsWith(".json")).map((file)=>path.resolve(file)));
  const candidates=validations.filter((item)=>changedRecords.has(item.path)&&item.valid);
  if(!candidates.length) failChanged(creative,["No valid Forge execution record was added or updated in this change set."]);

  const eligible=candidates.filter((item)=>recordCoversBranch(item.record,mergeBase));
  if(!eligible.length) failChanged(creative,["Execution record exists, but its preflight base was not established before governed creative changes."]);

  const latest=eligible.sort((a,b)=>Date.parse(b.record.createdAt)-Date.parse(a.record.createdAt))[0];
  console.log("Governed creative paths:");
  for(const file of creative) console.log("- "+file);
  console.log("Accepted execution record: "+path.relative(ROOT,latest.path));
}

function recordCoversBranch(record,mergeBase){
  const baseCommit=record?.repository?.baseCommit;
  if(!/^[a-f0-9]{40}$/.test(baseCommit||"")) return false;
  if(!isAncestor(baseCommit,"HEAD")) return false;
  if(!isAncestor(mergeBase,baseCommit)) return false;
  const preflightChanges=git(["diff","--name-only",mergeBase+"..."+baseCommit]).split("\n").filter(Boolean);
  return !preflightChanges.some(isGoverned);
}

function isGoverned(file){
  return governed.some((pattern)=>pattern.test(file));
}

function resolveBaseRef(){
  if(process.env.GITHUB_BASE_REF){
    const origin="origin/"+process.env.GITHUB_BASE_REF;
    if(refExists(origin)) return origin;
    if(refExists(process.env.GITHUB_BASE_REF)) return process.env.GITHUB_BASE_REF;
  }
  return "";
}

function refExists(ref){
  try{execFileSync("git",["rev-parse","--verify",ref],{cwd:ROOT,stdio:"ignore"});return true;}catch{return false;}
}

function isAncestor(ancestor,descendant){
  try{execFileSync("git",["merge-base","--is-ancestor",ancestor,descendant],{cwd:ROOT,stdio:"ignore"});return true;}catch{return false;}
}

function failChanged(files,reasons){
  console.error("Forge execution changed-file gate FAILED.");
  console.error("Governed creative paths changed:");
  for(const file of files) console.error("- "+file);
  for(const reason of reasons) console.error("- "+reason);
  process.exit(1);
}

function stripAttestation(record){
  const clone=structuredClone(record);
  delete clone.selfHash;
  delete clone.attestation;
  return clone;
}

function stable(value){
  if(Array.isArray(value)) return "["+value.map(stable).join(",")+"]";
  if(value&&typeof value==="object") {
    return "{"+Object.keys(value).sort().map((key)=>JSON.stringify(key)+":"+stable(value[key])).join(",")+"}";
  }
  return JSON.stringify(value);
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeEqual(a,b){
  const left=Buffer.from(String(a));
  const right=Buffer.from(String(b));
  return left.length===right.length&&crypto.timingSafeEqual(left,right);
}

function git(args){
  return execFileSync("git",args,{cwd:ROOT,encoding:"utf8"}).trim();
}
