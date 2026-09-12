import fs from "node:fs";
import path from "node:path";
import { compileCreativeDirection } from "../src/platform/creativeCompiler.ts";
const root=process.cwd(); const directionPath=process.argv[2]||"config/creative-direction.json"; const basePath=process.argv[3]||"config/experience.json"; const out=process.argv[4]||"generated/experience.compiled.json";
const result=compileCreativeDirection(JSON.parse(fs.readFileSync(directionPath,"utf8")),JSON.parse(fs.readFileSync(basePath,"utf8")));
fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(result.experience,null,2)+"\n"); fs.writeFileSync(out.replace(/\.json$/,".provenance.json"),JSON.stringify({directionPath,basePath,fields:result.provenance},null,2)+"\n");
console.log(`CREATIVE COMPILED ${directionPath} -> ${out}`);
