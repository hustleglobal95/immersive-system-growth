import fs from "node:fs/promises";
import path from "node:path";
import { listVaultLearningRecords, listVaultProjects } from "../src/platform/studioVault.ts";
import { evaluateProjectLearning } from "../src/platform/learning/projectLearning.ts";

const options=Object.fromEntries(process.argv.slice(2).filter((arg)=>arg.startsWith("--")).map((arg)=>{
  const [key,...rest]=arg.slice(2).split("=");
  return [key,rest.length ? rest.join("=") : true];
}));
const project=typeof options.project==="string" ? options.project.trim() : "";
const output=typeof options.output==="string" ? path.resolve(options.output) : "";

const projectIds=project
  ? [project]
  : (await listVaultProjects()).map((item)=>item.id);
const records=(await Promise.all(projectIds.map((id)=>listVaultLearningRecords(id)))).flat();
const evaluation=evaluateProjectLearning(records);
const payload={...evaluation,projectIds,evaluatedAt:new Date().toISOString()};

if(output) {
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(output,JSON.stringify(payload,null,2)+"\n","utf8");
  console.log("Project Learning eval written to "+output);
} else {
  console.log(JSON.stringify(payload,null,2));
}
