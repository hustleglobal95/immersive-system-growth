import test from "node:test";
import assert from "node:assert/strict";
import rawExperience from "@/config/experience.json";
import rawGraph from "@/config/interaction-graph.json";
import rawDirection from "@/config/creative-direction.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { compileCreativePlan } from "@/src/platform/creativeCompiler";
import { parseCreativePlan } from "@/src/platform/creativePlanSchema";

test("creative plan compiles motion and interaction runtime contracts together", () => {
  const plan = parseCreativePlan(rawDirection);
  const result = compileCreativePlan(plan, rawExperience, rawGraph);
  assert.ok(result.interactionGraph);
  assert.ok(result.experience.scenes.some((scene) => scene.motionTracks.some((track) => track.id.startsWith("creative-"))));
  assert.ok(result.interactionGraph.nodes.some((node) => node.id.startsWith("creative-trigger-")));
  assert.equal(parseExperience(result.experience).scenes.length, parseExperience(rawExperience).scenes.length);
  assert.equal(parseInteractionGraph(result.interactionGraph).nodes.length, result.interactionGraph.nodes.length);
  assert.ok(Object.keys(result.provenance).some((key) => key.includes("motionTracks")));
});

test("creative compilation is repeatable and preserves non-creative authored tracks", () => {
  const first = compileCreativePlan(rawDirection, rawExperience, rawGraph);
  const second = compileCreativePlan(rawDirection, first.experience, first.interactionGraph);
  assert.deepEqual(second.experience, first.experience);
  assert.deepEqual(second.interactionGraph, first.interactionGraph);
});
