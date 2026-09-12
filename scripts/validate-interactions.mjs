import fs from "node:fs";
import path from "node:path";
import { parseInteractionGraph } from "../src/lib/interactionGraph.ts";

const file = path.resolve(process.cwd(), process.argv[2] || "config/interaction-graph.json");

try {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const graph = parseInteractionGraph(raw);
  console.log(`VALID ${path.relative(process.cwd(), file)}: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.states.length} states`);
} catch (error) {
  console.error(`INVALID ${path.relative(process.cwd(), file)}`);
  if (error && typeof error === "object" && "issues" in error) {
    for (const issue of error.issues ?? []) {
      console.error(`- ${(issue.path ?? []).join(".") || "graph"}: ${issue.message ?? "Invalid value"}`);
    }
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(1);
}
