import fs from "node:fs/promises";
import path from "node:path";
import { runDirectorJudge } from "../src/platform/director-intelligence/judgeClient.ts";

const options=args(process.argv.slice(2));
const directorPath=String(options.director || "director-intelligence-report.json");
const capturesPath=String(options.captures || "test-results/autonomy/review-report.json");
const outputPath=String(options.output || "director-judgment.json");

const director=JSON.parse(await fs.readFile(directorPath,"utf8"));
const captureReport=JSON.parse(await fs.readFile(capturesPath,"utf8"));
const report=director.report ?? director;
const captures=[];
for(const capture of captureReport.captures ?? []) {
  if(capture.status!=="captured" || !capture.path) continue;
  const absolute=path.resolve(String(capture.path));
  const data=(await fs.readFile(absolute)).toString("base64");
  const extension=path.extname(absolute).toLowerCase();
  const mimeType=extension===".jpg" || extension===".jpeg" ? "image/jpeg" : extension===".webp" ? "image/webp" : "image/png";
  captures.push({id:String(capture.id),mimeType,data});
}
if(captures.length<2) {
  console.error("Director judgment requires at least two successfully captured rendered states.");
  process.exit(2);
}

const judgment=await runDirectorJudge({
  projectContext:[
    report.brief?.projectName,
    report.brief?.objective,
    report.brief?.audience,
    report.brief?.brandTruth,
  ].filter(Boolean).join(" — "),
  planningDisposition:report.planningDisposition,
  treatment:report.treatment,
  captures,
});
await fs.writeFile(outputPath,JSON.stringify(judgment,null,2)+"\n");
console.log("Director rendered judgment: "+judgment.verdict);
console.log("Confidence semantics: "+judgment.confidenceSemantics);
console.log("Evidence captures: "+(judgment.evidence?.captureIds.length ?? 0));
console.log("Wrote "+outputPath);
if(judgment.status!=="verified") process.exitCode=2;

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
