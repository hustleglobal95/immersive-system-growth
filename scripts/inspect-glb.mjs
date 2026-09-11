import fs from "node:fs";
import path from "node:path";
import { inspectGlb } from "../src/platform/glbInspector.ts";

const target = process.argv[2];
if (!target) {
  console.error("Usage: npm run glb:inspect -- path/to/model.glb");
  process.exit(1);
}
const absolute = path.resolve(target);
if (path.extname(absolute).toLowerCase() !== ".glb") {
  console.error("Inspector accepts .glb files only");
  process.exit(1);
}
const file = fs.readFileSync(absolute);
const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
const report = inspectGlb(buffer);
console.log(JSON.stringify({ file: path.relative(process.cwd(), absolute), ...report }, null, 2));
