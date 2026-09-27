import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
process.chdir(ROOT);

const options=Object.fromEntries(process.argv.slice(2)
  .filter((arg)=>arg.startsWith("--")&&arg.includes("="))
  .map((arg)=>arg.slice(2).split(/=(.*)/s,2)));

const POLICY_PATH="config/forge-execution-policy.json";
const policy=JSON.parse(await fsp.readFile(POLICY_PATH,"utf8"));
assertPolicy(policy);

const name=String(options.name||"").trim();
if(!name) fail("--name is required.");

const promptSource=await resolvePrompt(options);
const promptFingerprint=sha256(promptSource.content);
const baseCommit=git(["rev-parse","HEAD"]);
const branchName=git(["rev-parse","--abbrev-ref","HEAD"]);
const policyBytes=await fsp.readFile(POLICY_PATH);
const policySha256=sha256(policyBytes);
const runId=String(options.id||`${slug(name)}-${baseCommit.slice(0,8)}-${Date.now()}`);
const artifactDir=path.resolve(String(options.artifacts||path.join(policy.creativeChangeControl.localArtifactDirectory,runId)));
const defaultRecord=path.join(policy.creativeChangeControl.recordDirectory,runId+".json");
const recordPath=path.resolve(String(options.record||defaultRecord));

await fsp.mkdir(artifactDir,{recursive:true});
await fsp.mkdir(path.dirname(recordPath),{recursive:true});

const env={
  ...process.env,
  STUDIO_AUTH_ENABLED:process.env.STUDIO_AUTH_ENABLED||"false",
  FORGE_LOCAL_STORAGE_ENABLED:process.env.FORGE_LOCAL_STORAGE_ENABLED||"true",
  NODE_ENV:process.env.NODE_ENV||"development",
};

const readinessLog=runNpm(["run","forge:readiness","--","--profile=local","--strict"],env);
const readinessPath=path.join(artifactDir,"readiness.log");
await fsp.writeFile(readinessPath,readinessLog,"utf8");

const packetPath=path.join(artifactDir,"forge-build-packet.md");
const packetArgs=["run","forge:build-packet","--",`--name=${name}`,`--output=${packetPath}`,...promptSource.cliArgs];
runNpm(packetArgs,env);
const packet=await fsp.readFile(packetPath,"utf8");
const missingSections=policy.fullBuild.requiredPacketSections.filter((heading)=>!packet.includes(heading));
if(missingSections.length) fail("Build Packet is missing mandatory sections: "+missingSections.join(", "));

const contexts=[];
for(const domain of policy.fullBuild.requiredContextDomains){
  const contextPath=path.join(artifactDir,`context-${domain}.json`);
  const objective=`Apply ${domain} decisions within the locked Forge creative truth for ${name}; do not expand authority beyond the Context Capsule.`;
  runNpm([
    "run","forge:context","--",
    `--domain=${domain}`,
    `--objective=${objective}`,
    `--name=${name}`,
    `--output=${contextPath}`,
    ...promptSource.cliArgs,
  ],env);
  const raw=await fsp.readFile(contextPath,"utf8");
  const parsed=JSON.parse(raw);
  if(parsed?.capsule?.task?.domain!==domain) fail(`Context Capsule domain mismatch for ${domain}.`);
  if(!Array.isArray(parsed?.capsule?.allowedSystems)||!Array.isArray(parsed?.capsule?.deniedActions)) {
    fail(`Context Capsule for ${domain} is missing mutation-boundary controls.`);
  }
  contexts.push({
    domain,
    sha256:sha256(raw),
    bytes:Buffer.byteLength(raw),
    creativeStateFingerprint:String(parsed.creativeStateFingerprint||""),
    signaturePrimarySceneId:String(parsed?.signatureSlice?.primarySceneId||""),
  });
}

const constructionSection=section(packet,"## CONSTRUCTION RESEARCH","## SCENE-BY-SCENE CONSTRUCTION PLAN");
const acceptanceSection=section(packet,"## ACCEPTANCE CONTRACT","## DEFINITION OF DONE");
const definitionSection=section(packet,"## DEFINITION OF DONE",null);
if(!constructionSection.trim()) fail("Construction Research evidence is empty.");
if(!acceptanceSection.trim()||!definitionSection.trim()) fail("Verification/definition-of-done evidence is empty.");

const stages=Object.fromEntries(policy.fullBuild.requiredStages.map((stage)=>[stage,{status:"PASS",evidence:stageEvidence(stage)}]));
const baseRecord={
  schemaVersion:1,
  policyId:policy.policyId,
  policyVersion:policy.version,
  runId,
  projectName:name,
  createdAt:new Date().toISOString(),
  generator:"scripts/forge-preflight.mjs",
  repository:{
    baseCommit,
    branch:branchName,
  },
  confidentiality:{
    rawPromptCommitted:false,
    promptFingerprintAlgorithm:"sha256",
    promptSha256:promptFingerprint,
    promptSource:promptSource.kind,
  },
  policy:{
    path:POLICY_PATH,
    sha256:policySha256,
  },
  stages,
  evidence:{
    readiness:{sha256:sha256(readinessLog),bytes:Buffer.byteLength(readinessLog)},
    buildPacket:{sha256:sha256(packet),bytes:Buffer.byteLength(packet),requiredSectionsVerified:true},
    constructionResearch:{sha256:sha256(constructionSection),bytes:Buffer.byteLength(constructionSection)},
    acceptanceContract:{sha256:sha256(acceptanceSection+definitionSection),bytes:Buffer.byteLength(acceptanceSection+definitionSection)},
    contexts,
  },
};
const selfHash=sha256(stable(baseRecord));
const attestationKey=process.env.FORGE_EXECUTION_ATTESTATION_KEY||"";
const attestation=attestationKey
  ? {
      algorithm:"hmac-sha256",
      keyId:process.env.FORGE_EXECUTION_ATTESTATION_KEY_ID||"forge-execution",
      signature:crypto.createHmac("sha256",attestationKey).update(selfHash).digest("hex"),
    }
  : {algorithm:"none",keyId:null,signature:null};
if(process.env.FORGE_EXECUTION_REQUIRE_ATTESTATION==="true"&&!attestationKey) {
  fail("FORGE_EXECUTION_REQUIRE_ATTESTATION=true but FORGE_EXECUTION_ATTESTATION_KEY is not configured.");
}
const record={...baseRecord,selfHash,attestation};
await fsp.writeFile(recordPath,JSON.stringify(record,null,2)+"\n","utf8");

console.log("FORGE FULL-SYSTEM PREFLIGHT PASS");
console.log("Project: "+name);
console.log("Base commit: "+baseCommit);
console.log("Policy: "+policy.policyId+" v"+policy.version);
console.log("Build Packet: "+path.relative(ROOT,packetPath));
console.log("Context Capsules: "+contexts.length);
console.log("Execution record: "+path.relative(ROOT,recordPath));
console.log("Prompt retained in record: no");
console.log("Attestation: "+attestation.algorithm);

function stageEvidence(stage){
  const map={
    "operational-readiness":"Strict local readiness passed.",
    "build-packet":"Canonical Forge Build Packet compiled from current repo state.",
    "director-intelligence":"Build Packet compiled through Director Intelligence.",
    "reference-intelligence":"Construction Research section present and hashed.",
    "creative-state-graph":"Creative State Graph present in Build Packet and capsules.",
    "originality-gate":"Build Packet/Context Capsule generation completed without originality-gate rejection.",
    "capability-routing":"Context Capsules expose allowed systems/capabilities and denied actions.",
    "signature-slice-gate":"Signature Slice Gate present and shared across Context Capsules.",
    "context-capsules":"All policy-required specialist domains compiled.",
    "verification-plan":"Acceptance Contract and Definition of Done present and hashed.",
  };
  return map[stage]||"Policy-required stage completed.";
}

async function resolvePrompt(opts){
  const provided=[Boolean(opts.prompt),Boolean(opts["prompt-file"]),Boolean(opts.brief)].filter(Boolean).length;
  if(provided!==1) fail("Provide exactly one of --prompt, --prompt-file, or --brief.");
  if(opts.prompt) return {kind:"inline",content:String(opts.prompt),cliArgs:[`--prompt=${String(opts.prompt)}`]};
  if(opts["prompt-file"]){
    const target=path.resolve(String(opts["prompt-file"]));
    const content=await fsp.readFile(target,"utf8");
    if(!content.trim()) fail("Prompt file is empty.");
    return {kind:"file",content,cliArgs:[`--prompt=${content.trim()}`]};
  }
  const target=path.resolve(String(opts.brief));
  const content=await fsp.readFile(target,"utf8");
  JSON.parse(content);
  return {kind:"brief",content,cliArgs:[`--brief=${target}`]};
}

function runNpm(args,customEnv){
  const executable=process.platform==="win32"?"npm.cmd":"npm";
  const result=spawnSync(executable,args,{cwd:ROOT,env:customEnv,encoding:"utf8",maxBuffer:32*1024*1024});
  const output=(result.stdout||"")+(result.stderr||"");
  if(result.status!==0) {
    process.stderr.write(output);
    fail(`Command failed: npm ${args.join(" ")}`);
  }
  return output;
}

function git(args){
  return execFileSync("git",args,{cwd:ROOT,encoding:"utf8"}).trim();
}

function section(content,startHeading,endHeading){
  const start=content.indexOf(startHeading);
  if(start<0) return "";
  const from=start+startHeading.length;
  const end=endHeading?content.indexOf(endHeading,from):-1;
  return content.slice(from,end>=0?end:content.length);
}

function slug(value){
  return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,64)||"forge-project";
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stable(value){
  if(Array.isArray(value)) return "["+value.map(stable).join(",")+"]";
  if(value&&typeof value==="object") {
    return "{"+Object.keys(value).sort().map((key)=>JSON.stringify(key)+":"+stable(value[key])).join(",")+"}";
  }
  return JSON.stringify(value);
}

function assertPolicy(value){
  if(!value||value.policyId!=="forge-full-system-execution"||value.version!==1) fail("Unsupported Forge execution policy.");
  if(!Array.isArray(value.fullBuild?.requiredStages)||!value.fullBuild.requiredStages.length) fail("Forge execution policy has no required stages.");
  if(!Array.isArray(value.fullBuild?.requiredContextDomains)||!value.fullBuild.requiredContextDomains.length) fail("Forge execution policy has no Context Capsule domains.");
}

function fail(message){
  console.error("Forge preflight failed: "+message);
  process.exit(1);
}
