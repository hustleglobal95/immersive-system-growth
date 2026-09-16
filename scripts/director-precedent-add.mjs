import fs from "node:fs/promises";
import path from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npm run director:precedent:add -- <precedent.json>");
  process.exit(1);
}
const precedent = JSON.parse(await fs.readFile(inputPath, "utf8"));
for (const key of ["id", "title", "industries", "mediums", "designIssues", "concept", "principles", "formalDevices", "strongestDecision", "transferableLessons", "doNotCopy"]) {
  if (precedent[key] === undefined) throw new Error(`Precedent is missing required field: ${key}`);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(precedent.id)) throw new Error("Precedent id must be a slug.");
if (!Array.isArray(precedent.transferableLessons) || precedent.transferableLessons.length === 0) throw new Error("Precedent needs at least one transferable lesson.");
if (!Array.isArray(precedent.doNotCopy) || precedent.doNotCopy.length === 0) throw new Error("Precedent must explicitly state what not to copy.");
precedent.evidence ??= [];
const outputPath = path.join("forge-intelligence", "precedents", `${precedent.id}.json`);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(precedent, null, 2) + "\n", { flag: "wx" }).catch((error) => {
  if (error?.code === "EEXIST") throw new Error(`Precedent already exists: ${precedent.id}`);
  throw error;
});
console.log(`Added precedent ${precedent.id} to ${outputPath}.`);
