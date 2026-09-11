import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";

function glbNodes(file) {
  const data = fs.readFileSync(file);
  if (data.readUInt32LE(0) !== 0x46546c67) throw new Error(file + ": invalid GLB magic");
  const jsonLength = data.readUInt32LE(12);
  if (data.readUInt32LE(16) !== 0x4e4f534a) throw new Error(file + ": missing GLB JSON chunk");
  const json = JSON.parse(data.subarray(20, 20 + jsonLength).toString("utf8").trim());
  return new Set((json.nodes ?? []).map((node) => node.name).filter(Boolean));
}

const configs = [
  "config/experience.json",
  ...fs.readdirSync("recipes").filter((file) => file.endsWith(".json")).map((file) => path.join("recipes", file)),
];
const errors = [];
for (const filename of configs) {
  const config = parseExperience(JSON.parse(fs.readFileSync(filename, "utf8")));
  if (!config.productRig || !config.heroModel.startsWith("/")) continue;
  const model = path.join("public", config.heroModel);
  if (!fs.existsSync(model)) {
    errors.push(filename + ": missing product rig model " + model);
    continue;
  }
  const names = glbNodes(model);
  for (const required of config.productRig.nodes)
    if (!names.has(required)) errors.push(filename + ": GLB is missing required node " + required);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Product rig audit passed for " + configs.length + " configurations.");
}
