import { spawn } from "node:child_process";

console.log("Starting Forge Studio in local-owner mode (Studio auth disabled for this process only).");
const child=spawn(process.platform==="win32"?"npm.cmd":"npm",["run","dev"],{
  stdio:"inherit",
  env:{...process.env,STUDIO_AUTH_ENABLED:"false"},
});
child.on("exit",(code,signal)=>{
  if(signal) process.kill(process.pid,signal);
  process.exit(code ?? 0);
});
