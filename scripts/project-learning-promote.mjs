import fs from "node:fs/promises";
import path from "node:path";
import { createEmptyMemoryGraph } from "../src/platform/director-intelligence/memory.ts";
import { evaluateProjectLearning, promoteProjectLearningPattern } from "../src/platform/learning/projectLearning.ts";
import { listVaultLearningRecords, listVaultProjects } from "../src/platform/studioVault.ts";

const options=args(process.argv.slice(2));
const patternKey=String(options.pattern || "").trim();
const approvedBy=String(options["approved-by"] || "").trim();
if(!patternKey) fail("Usage: npm run learning:promote -- --pattern <loop:strategy> --approved-by <name> --approve");
if(!approvedBy) fail("--approved-by is required so Forge records human creative authority.");
if(options.approve!==true) fail("Explicit human approval is required. Re-run with --approve after reviewing npm run learning:eval.");

const projects=await listVaultProjects();
const records=(await Promise.all(projects.map((project)=>listVaultLearningRecords(project.id)))).flat();
const evaluation=evaluateProjectLearning(records);
const pattern=evaluation.patterns.find((item)=>item.key===patternKey);
if(!pattern) fail("Learning pattern was not found in current Project Vault evidence.");
if(pattern.status!=="review-ready") {
  fail(`Pattern ${patternKey} is still a hypothesis (${pattern.projects} project(s), ${pattern.samples} sample(s)). It cannot enter Forge Creative Memory yet.`);
}

const memoryPath=path.join("forge-intelligence","projects","forge-learning.memory.json");
let graph=createEmptyMemoryGraph();
try { graph=JSON.parse(await fs.readFile(memoryPath,"utf8")); }
catch(error) {
  if(!(error && typeof error==="object" && "code" in error && error.code==="ENOENT")) throw error;
}
const before=graph.nodes.length;
const next=promoteProjectLearningPattern({graph,pattern,approvedBy});
if(next.nodes.length===before) {
  console.log("Learning pattern is already present in Forge Creative Memory: "+patternKey);
  process.exit(0);
}
await fs.mkdir(path.dirname(memoryPath),{recursive:true});
await fs.writeFile(memoryPath,JSON.stringify(next,null,2)+"\n","utf8");
console.log("Promoted Project Learning pattern into Forge Creative Memory.");
console.log("Pattern: "+patternKey);
console.log("Evidence: "+pattern.projects+" independent projects · "+pattern.samples+" accepted winners");
console.log("Approved by: "+approvedBy);
console.log("Memory: "+memoryPath);

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
