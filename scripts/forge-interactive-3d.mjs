import fs from "node:fs/promises";
import path from "node:path";
import { parseInteractive3DBlueprint } from "../src/platform/interactive3dBlueprint.ts";
import { evaluateInteractive3DBlueprintPolicy } from "../src/platform/interactive3dPolicy.ts";
import { compileInteractive3DBlueprint } from "../src/platform/interactive3dCompiler.ts";

const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith("--")) || "validate";
const options = Object.fromEntries(
  args
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => arg.slice(2).split(/=(.*)/s, 2)),
);
const blueprintPath = String(
  options.blueprint || "config/interactive3d-blueprint.example.json",
);
const outputPath = String(options.output || "").trim();
const raw = JSON.parse(await fs.readFile(path.resolve(blueprintPath), "utf8"));
const blueprint = parseInteractive3DBlueprint(raw);

if (command === "validate") {
  const report = evaluateInteractive3DBlueprintPolicy(blueprint);
  const payload = {
    blueprint: blueprintPath,
    status: report.passed ? "pass" : "fail",
    blockers: report.blockers,
    warnings: report.warnings,
    safeRepairPaths: report.safeRepairPaths,
  };
  await emit(payload);
  if (!report.passed) process.exitCode = 1;
} else if (command === "compile") {
  const plan = compileInteractive3DBlueprint(blueprint);
  await emit(plan);
} else {
  throw new Error("Unknown interactive 3D command: " + command + ". Use validate or compile.");
}

async function emit(value) {
  const text = JSON.stringify(value, null, 2) + "\n";
  if (!outputPath) {
    process.stdout.write(text);
    return;
  }
  const target = path.resolve(outputPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, text, "utf8");
  console.log("Interactive 3D output written to " + outputPath);
}
