import { spawn } from "node:child_process";

console.log("Starting Forge Studio as Local owner. No password is required for this local process.");
console.log("Open Forge at http://localhost:3000/studio (or the alternate port Next.js prints if 3000 is busy).");
const child=spawn(process.platform==="win32"?"npm.cmd":"npm",["run","dev"],{
  stdio:"inherit",
  env:{...process.env,STUDIO_AUTH_ENABLED:"false",FORGE_LOCAL_STORAGE_ENABLED:"true"},
});
child.on("exit",(code,signal)=>{
  if(signal) process.kill(process.pid,signal);
  process.exit(code ?? 0);
});
