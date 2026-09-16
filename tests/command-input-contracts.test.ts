import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";

const initial = parseExperience(raw);

function fresh() {
  return createExperienceEngine(initial);
}

test("every agent-visible Experience command exposes a machine-readable input schema", () => {
  const engine = fresh();
  const agentCommands = engine.commands.catalog({ agentVisibleOnly: true });
  assert.ok(agentCommands.length >= 9);
  assert.equal(agentCommands.every((command) => command.inputSchema?.type === "object"), true);
  const camera = engine.commands.describe("camera.applyChoreography");
  const field = camera.inputSchema?.properties.choreography;
  assert.equal(field?.type, "enum");
  if (field?.type === "enum") assert.ok(field.values.includes("director-precision-push"));
});

test("missing required input fails through the normal atomic command path", () => {
  const engine = fresh();
  const before = engine.getFingerprint();
  const result = engine.dispatchRegistered("scene.rename", { label: "Missing scene" }, { source: "ai" });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0]?.code, "command.input.required");
  assert.equal(result.errors[0]?.path, "input.sceneId");
  assert.equal(engine.getRevision(), 0);
  assert.equal(engine.getFingerprint(), before);
});

test("unknown input properties are rejected rather than silently ignored", () => {
  const engine = fresh();
  const sceneId = initial.scenes[0].id;
  const result = engine.dispatchRegistered("scene.rename", {
    sceneId,
    label: "Valid label",
    accidentalField: true,
  }, { source: "ai" });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "command.input.unknownField"), true);
  assert.equal(engine.getRevision(), 0);
});

test("integer and lower-bound contracts reject malformed scene ordering commands", () => {
  const engine = fresh();
  const sceneId = initial.scenes[0].id;
  const decimal = engine.dispatchRegistered("scene.move", { sceneId, toIndex: 1.5 }, { source: "ai" });
  assert.equal(decimal.ok, false);
  assert.equal(decimal.errors.some((error) => error.code === "command.input.integer"), true);

  const negative = engine.dispatchRegistered("scene.move", { sceneId, toIndex: -1 }, { source: "ai" });
  assert.equal(negative.ok, false);
  assert.equal(negative.errors.some((error) => error.code === "command.input.minimum"), true);
  assert.equal(engine.getRevision(), 0);
});

test("motion and camera enums reject values outside their registered catalogs", () => {
  const engine = fresh();
  const sceneId = initial.scenes[0].id;
  const motion = engine.dispatchRegistered("motion.applyArchetype", { sceneId, archetype: "invented-motion" }, { source: "ai" });
  assert.equal(motion.ok, false);
  assert.equal(motion.errors.some((error) => error.code === "command.input.enum"), true);

  const camera = engine.dispatchRegistered("camera.applyChoreography", { sceneId, choreography: "teleport-camera" }, { source: "ai" });
  assert.equal(camera.ok, false);
  assert.equal(camera.errors.some((error) => error.code === "command.input.enum"), true);
  assert.equal(engine.getRevision(), 0);
});

test("string contracts reject empty identifiers before domain validation", () => {
  const engine = fresh();
  const result = engine.dispatchRegistered("scene.duplicate", { sceneId: "" }, { source: "ai" });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "command.input.minLength"), true);
  assert.equal(engine.getRevision(), 0);
});

test("valid schema-checked input reaches the domain command and commits normally", () => {
  const engine = fresh();
  const sceneId = initial.scenes[0].id;
  const result = engine.dispatchRegistered("scene.rename", { sceneId, label: "Schema Directed" }, {
    source: "ai",
    expectedRevision: 0,
  });
  assert.equal(result.ok, true);
  assert.equal(engine.getRevision(), 1);
  assert.equal(engine.getState().scenes[0].label, "Schema Directed");
});

test("protected whole-experience replacement can be schema-inspected with dry-run", () => {
  const engine = fresh();
  const missing = engine.dispatchRegistered("experience.replace", {}, { source: "ai", dryRun: true });
  assert.equal(missing.ok, false);
  assert.equal(missing.errors[0]?.code, "command.input.required");

  const candidate = structuredClone(initial);
  candidate.meta.name = "Replacement Preview";
  const valid = engine.dispatchRegistered("experience.replace", { experience: candidate, reason: "Preview replacement" }, {
    source: "ai",
    dryRun: true,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.state.meta.name, "Replacement Preview");
  assert.equal(engine.getRevision(), 0);
});
