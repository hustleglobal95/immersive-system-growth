import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const options=args(process.argv.slice(2));
const experiencePath=String(options.experience || "config/experience.json");
const workRoot=String(options.output || "test-results/autonomy-loop");
const port=Number(options.port || process.env.FORGE_AUTONOMY_PORT || 3101);
const baseURL="http://127.0.0.1:" + port;
const incumbentRoot=path.join(workRoot,"incumbent");
const reviewRoot=path.join(workRoot,"review");
const candidatePath=path.join(reviewRoot,"candidate-experience.json");
const candidateRoot=path.join(workRoot,"candidate");
const comparisonPath=path.join(workRoot,"comparison-report.json");
const incumbentMotionPath=path.join(workRoot,"incumbent-motion","report.json");
const candidateFunctionalPath=path.join(workRoot,"candidate-functional","report.json");
const candidateMotionPath=path.join(workRoot,"candidate-motion","report.json");
const acceptedPath=path.join(workRoot,"accepted-experience.json");

if(!process.env.FORGE_VISUAL_CRITIC_URL) {
  console.error("FORGE_VISUAL_CRITIC_URL is required. The repair loop will not self-approve without a comparative visual judge.");
  process.exit(2);
}

await fs.mkdir(workRoot,{ recursive:true });
const server=spawn(process.platform==="win32" ? "npm.cmd" : "npm",["run","dev","--","--hostname","127.0.0.1","--port",String(port)],{
  stdio:["ignore","pipe","pipe"],
  env:{
    ...process.env,
    FORGE_AUTONOMY_PREVIEW:"1",
    FORGE_AUTONOMY_INCUMBENT_PATH:path.resolve(experiencePath),
    FORGE_AUTONOMY_CANDIDATE_PATH:path.resolve(candidatePath),
  },
});
let serverLog="";
server.stdout.on("data",(chunk)=>{ serverLog+=String(chunk); if(process.env.FORGE_AUTONOMY_VERBOSE==="1") process.stdout.write(chunk); });
server.stderr.on("data",(chunk)=>{ serverLog+=String(chunk); if(process.env.FORGE_AUTONOMY_VERBOSE==="1") process.stderr.write(chunk); });

try {
  await waitFor(baseURL + "/studio/autonomy-preview?progress=0&viewport=desktop&variant=incumbent",60_000);

  await run(process.execPath,[
    "--import","tsx","scripts/autonomy-candidate-capture.mjs",
    "--url",baseURL,
    "--experience",experiencePath,
    "--output",incumbentRoot,
    "--variant","incumbent",
  ]);

  await run(process.execPath,[
    "--import","tsx","scripts/autonomy-motion-review.mjs",
    "--url",baseURL,
    "--experience",experiencePath,
    "--variant","incumbent",
    "--output",incumbentMotionPath,
  ]);

  await run(process.execPath,[
    "--import","tsx","scripts/autonomy-visual-director.mjs",
    "--report",path.join(incumbentRoot,"review-report.json"),
    "--experience",experiencePath,
    "--output",reviewRoot,
    ...(options.context ? ["--context",String(options.context)] : []),
  ]);

  await fs.access(candidatePath);

  await run(process.execPath,[
    "--import","tsx","scripts/autonomy-candidate-capture.mjs",
    "--url",baseURL,
    "--experience",candidatePath,
    "--output",candidateRoot,
    "--variant","candidate",
  ]);

  await run(process.execPath,[
    "--import","tsx","scripts/autonomy-functional-verify.mjs",
    "--url",baseURL,
    "--experience",candidatePath,
    "--variant","candidate",
    "--output",candidateFunctionalPath,
  ]);

  await run(process.execPath,[
    "--import","tsx","scripts/autonomy-motion-review.mjs",
    "--url",baseURL,
    "--experience",candidatePath,
    "--variant","candidate",
    "--output",candidateMotionPath,
  ]);

  await run(process.execPath,[
    "--import","tsx","scripts/autonomy-compare.mjs",
    "--incumbent",path.join(incumbentRoot,"review-report.json"),
    "--candidate",path.join(candidateRoot,"review-report.json"),
    "--output",comparisonPath,
    "--functional",candidateFunctionalPath,
    "--incumbent-motion",incumbentMotionPath,
    "--candidate-motion",candidateMotionPath,
    ...(options.context ? ["--context",String(options.context)] : []),
  ]);

  const comparison=JSON.parse(await fs.readFile(comparisonPath,"utf8"));
  if(!comparison.decision?.accepted) {
    console.error("Candidate was not accepted. Incumbent remains authoritative.");
    process.exitCode=1;
  } else {
    await fs.copyFile(candidatePath,acceptedPath);
    console.log("VISUAL DIRECTOR ACCEPTED candidate -> " + acceptedPath);
  }
} finally {
  if(server.exitCode===null) server.kill("SIGTERM");
  await new Promise((resolve)=>setTimeout(resolve,400));
  if(server.exitCode===null) server.kill("SIGKILL");
  if(process.exitCode && serverLog) await fs.writeFile(path.join(workRoot,"candidate-server.log"),serverLog);
}

async function waitFor(url,timeoutMs) {
  const started=Date.now();
  let lastError="";
  while(Date.now()-started<timeoutMs) {
    if(server.exitCode!==null) throw new Error("Autonomy preview server exited before becoming ready.");
    try {
      const response=await fetch(url);
      if(response.ok) return;
      lastError="HTTP " + response.status;
    } catch(error) {
      lastError=error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve)=>setTimeout(resolve,500));
  }
  throw new Error("Timed out waiting for autonomy preview: " + lastError);
}

async function run(command,argv) {
  await new Promise((resolve,reject)=>{
    const child=spawn(command,argv,{ stdio:"inherit",env:process.env });
    child.on("error",reject);
    child.on("exit",(code)=>code===0 ? resolve() : reject(new Error(command + " exited with code " + code)));
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
