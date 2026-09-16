import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";
import { CommandRegistry } from "../src/core/commands/commandRegistry";
import type { ForgeCommand } from "../src/core/commands/command";

const initial = parseExperience(raw);

test("ExperienceEngine exposes a classified machine-readable command catalog", () => {
  const engine = createExperienceEngine(initial);
  const catalog = engine.commands.catalog();
  assert.ok(catalog.length >= 9);
  assert.equal(catalog.find((item) => item.type === "scene.rename")?.approval, "auto");
  assert.equal(catalog.find((item) => item.type === "scene.delete")?.approval, "required");
  assert.equal(catalog.find((item) => item.type === "scene.delete")?.impact, "destructive");
  assert.equal(catalog.find((item) => item.type === "motion.resetScene")?.approval, "review");
  assert.equal(catalog.find((item) => item.type === "camera.applyChoreography")?.agentVisible, true);
});

test("unclassified commands default to conservative hidden required-approval metadata", () => {
  const registry = new CommandRegistry<{ value: number }>();
  const command: ForgeCommand<{ value: number }, unknown, unknown> = {
    type: "test.unclassified",
    input: {},
    validate: () => [],
    execute: ({ state }) => ({ ok: true, state, output: undefined, events: [] }),
  };
  registry.register(command.type, () => command);
  const descriptor = registry.describe(command.type);
  assert.equal(descriptor.approval, "required");
  assert.equal(descriptor.agentVisible, false);
  assert.equal(descriptor.reversible, false);
});

test("AI can commit routine creative commands without approval", () => {
  const engine = createExperienceEngine(initial);
  const scene = initial.scenes[0];
  const result = engine.transactionRegistered([
    { type: "scene.rename", input: { sceneId: scene.id, label: "AI Directed" } },
    { type: "motion.applyArchetype", input: { sceneId: scene.id, archetype: "editorial-reveal" } },
    { type: "camera.applyChoreography", input: { sceneId: scene.id, choreography: "director-precision-push" } },
  ], { source: "ai", actor: "director-agent", expectedRevision: 0 });

  assert.equal(result.ok, true);
  assert.equal(result.revisionAfter, 1);
  assert.equal(engine.getState().scenes[0].label, "AI Directed");
});

test("AI destructive command commits fail closed without approval and do not partially mutate", () => {
  const engine = createExperienceEngine(initial);
  const scene = initial.scenes[0];
  const before = engine.getFingerprint();
  const result = engine.transactionRegistered([
    { type: "scene.rename", input: { sceneId: scene.id, label: "Should Not Commit" } },
    { type: "scene.delete", input: { sceneId: initial.scenes[1].id } },
  ], { source: "ai", actor: "director-agent", expectedRevision: 0 });

  assert.equal(result.ok, false);
  assert.equal(result.errors[0]?.code, "engine.approval.required");
  assert.equal(engine.getRevision(), 0);
  assert.equal(engine.getFingerprint(), before);
  assert.equal(engine.getState().scenes[0].label, scene.label);
  assert.equal(engine.getJournal().length, 0);
});

test("protected commands remain available to AI as dry-runs without approval", () => {
  const engine = createExperienceEngine(initial);
  const target = initial.scenes[1];
  const result = engine.dispatchRegistered("scene.delete", { sceneId: target.id }, {
    source: "ai",
    actor: "director-agent",
    dryRun: true,
    expectedRevision: 0,
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.state.scenes.length, initial.scenes.length - 1);
  assert.equal(engine.getState().scenes.length, initial.scenes.length);
  assert.equal(engine.getRevision(), 0);
  assert.equal(engine.getJournal().length, 0);
});

test("explicit approval authorizes protected AI commands and is retained in audit evidence", () => {
  const engine = createExperienceEngine(initial);
  const target = initial.scenes[1];
  const approval = {
    by: "Kevin",
    commandTypes: ["scene.delete"],
    reason: "Remove redundant chapter",
  };
  const result = engine.dispatchRegistered("scene.delete", { sceneId: target.id }, {
    source: "ai",
    actor: "director-agent",
    expectedRevision: 0,
    approval,
  });

  assert.equal(result.ok, true);
  assert.equal(result.receipt.approval?.by, "Kevin");
  assert.deepEqual(result.receipt.approval?.commandTypes, ["scene.delete"]);
  assert.equal(engine.getJournal()[0]?.approval?.reason, "Remove redundant chapter");
  assert.equal(engine.getState().scenes.some((scene) => scene.id === target.id), false);
});

test("approval must cover every protected command in a transaction", () => {
  const engine = createExperienceEngine(initial);
  const result = engine.transactionRegistered([
    { type: "motion.resetScene", input: { sceneId: initial.scenes[0].id } },
    { type: "scene.delete", input: { sceneId: initial.scenes[1].id } },
  ], {
    source: "ai",
    approval: { by: "Kevin", commandTypes: ["motion.resetScene"] },
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "engine.approval.required" && error.details?.commandType === "scene.delete"), true);
  assert.equal(engine.getRevision(), 0);
});

test("Studio-originated explicit human actions are not blocked by the headless approval policy", () => {
  const engine = createExperienceEngine(initial);
  const target = initial.scenes[1];
  const result = engine.dispatchRegistered("scene.delete", { sceneId: target.id }, {
    source: "studio",
    actor: "human-user",
  });
  assert.equal(result.ok, true);
  assert.equal(engine.getRevision(), 1);
});
