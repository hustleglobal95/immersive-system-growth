import { spawn } from "node:child_process";

const forwarded=process.argv.slice(2);
const has=(name)=>forwarded.includes(name);
const args=[
  "--import","tsx","scripts/loop-run.mjs",
  "--loop","visual-polish",
  ...(!has("--cycles") ? ["--cycles","1"] : []),
  ...(!has("--candidates") ? ["--candidates","1"] : []),
  ...forwarded,
];
const child=spawn(process.execPath,args,{stdio:"inherit",env:process.env});
child.on("error",(error)=>{ console.error(error); process.exitCode=2; });
child.on("exit",(code)=>{ process.exitCode=code ?? 1; });
