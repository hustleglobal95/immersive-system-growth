import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";

const initial = parseExperience(raw);

test("ForgeEngine exposes registered commands and capability metadata", () => {
  const engine = createExperienceEngine(initial);
  assert.ok(engine.commands.list().includes("scene.duplicate"));
  assert.ok(engine.capabilities.has("motion"));
  assert.ok(engine.capabilities.has("structure"));
});

test("ForgeEngine registered dispatch emits events and supports undo/redo", () => {
  const engine = createExperienceEngine(initial);
  const first = initial.scenes[0];
  const events: string[] = [];
  engine.events.onAny((event) => events.push(event.type));

  const renamed = engine.dispatchRegistered("scene.rename", { sceneId: first.id, label: "Engine Opening" });
  assert.equal(renamed.ok, true);
  assert.equal(engine.getState().scenes[0].label, "Engine Opening");
  assert.deepEqual(events, ["scene.renamed"]);
  assert.equal(engine.snapshot().canUndo, true);

  assert.equal(engine.undo(), true);
  assert.equal(engine.getState().scenes[0].label, first.label);
  assert.equal(engine.snapshot().canRedo, true);

  assert.equal(engine.redo(), true);
  assert.equal(engine.getState().scenes[0].label, "Engine Opening");
});

test("ForgeEngine dry-run returns projected state without committing", () => {
  const engine = createExperienceEngine(initial);
  const first = initial.scenes[0];
  const preview = engine.dispatchRegistered("scene.duplicate", { sceneId: first.id }, { dryRun: true, transactionId: "preview" });
  assert.equal(preview.ok, true);
  assert.equal(preview.dryRun, true);
  assert.equal(preview.state.scenes.length, initial.scenes.length + 1);
  assert.equal(engine.getState().scenes.length, initial.scenes.length);
  assert.equal(engine.snapshot().canUndo, false);
});

test("ForgeEngine transaction is one history operation and rolls back invalid command batches", () => {
  const engine = createExperienceEngine(initial);
  const first = initial.scenes[0];
  const good = engine.transactionRegistered([
    { type: "scene.rename", input: { sceneId: first.id, label: "Transaction Opening" } },
    { type: "scene.duplicate", input: { sceneId: first.id } },
  ], { transactionId: "good" });
  assert.equal(good.ok, true);
  assert.equal(engine.getState().scenes.length, initial.scenes.length + 1);
  assert.equal(engine.undo(), true);
  assert.deepEqual(engine.getState(), initial);

  const before = engine.getState();
  const failed = engine.transactionRegistered([
    { type: "scene.rename", input: { sceneId: first.id, label: "Should Roll Back" } },
    { type: "scene.move", input: { sceneId: "missing", toIndex: 0 } },
  ], { transactionId: "bad" });
  assert.equal(failed.ok, false);
  assert.deepEqual(engine.getState(), before);
});
