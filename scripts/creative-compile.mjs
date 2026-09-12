import fs from "node:fs";
import path from "node:path";
import { compileCreativePlan } from "../src/platform/creativeCompiler.ts";

const directionPath = process.argv[2] || "config/creative-direction.json";
const graphPath = process.argv[3] || "config/interaction-graph.json";
const basePath = process.argv[4] || "config/experience.json";
const out = process.argv[5] || "generated/experience.compiled.json";
const graphOut = process.argv[6] || path.join(path.dirname(out), "interaction-graph.compiled.json");

const direction = JSON.parse(fs.readFileSync(directionPath, "utf8"));
const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
const base = JSON.parse(fs.readFileSync(basePath, "utf8"));
const result = compileCreativePlan(direction, base, graph);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result.experience, null, 2) + "\n");

if (result.interactionGraph) {
  fs.writeFileSync(graphOut, JSON.stringify(result.interactionGraph, null, 2) + "\n");
}

const provenancePath = out.replace(/\.json$/, ".provenance.json");
fs.writeFileSync(
  provenancePath,
  JSON.stringify(
    {
      directionPath,
      graphPath,
      basePath,
      fields: result.provenance,
    },
    null,
    2,
  ) + "\n",
);

console.log("CREATIVE COMPILED " + directionPath + " -> " + out);
console.log("INTERACTION GRAPH COMPILED " + graphPath + " -> " + graphOut);
console.log("PROVENANCE WRITTEN " + provenancePath);
