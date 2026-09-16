import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";

const initial = parseExperience(raw);

test("ForgeEngine exposes registered commands and capability metadata", () => {
  const engine = createExperienceEngine(initial);
  const commands = engine.commands.list();
  assert.ok(commands.includes("scene.duplicate"));
  assert.ok(commands.includes("motion.applyArchetype"));
  assert.ok(commands.includes("motion.resetScene"));
  assert.ok(commands.includes("camera.applyChoreography"));
  assert.ok(engine.capabilities.has("motion"));
  assert.ok(engine.capabilities.has("camera"));
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

test("motion archetypes execute through ForgeEngine and undo restores the authored tracks", () => {
  const engine = createExperienceEngine(initial);
  const first = initial.scenes[0];
  const previousTracks = structuredClone(first.motionTracks);
  const events: string[] = [];
  engine.events.onAny((event) => events.push(event.type));

  const result = engine.dispatchRegistered("motion.applyArchetype", {
    sceneId: first.id,
    archetype: "editorial-reveal",
  });
  assert.equal(result.ok, true);
  assert.ok(engine.getState().scenes[0].motionTracks.length >= previousTracks.length);
  assert.ok(events.includes("motion.applied"));

  assert.equal(engine.undo(), true);
  assert.deepEqual(engine.getState().scenes[0].motionTracks, previousTracks);
});

test("camera choreography executes through ForgeEngine and remains one undoable state change", () => {
  const engine = createExperienceEngine(initial);
  const first = initial.scenes[0];
  const previousTracks = structuredClone(first.motionTracks);
  const result = engine.dispatchRegistered("camera.applyChoreography", {
    sceneId: first.id,
    choreography: "director-precision-push",
  });
  assert.equal(result.ok, true);
  const cameraTracks = engine.getState().scenes[0].motionTracks.filter((track) => track.id.startsWith("engine-camera-"));
  assert.ok(cameraTracks.length >= 3);
  assert.equal(result.events[0]?.type, "camera.choreographyApplied");
  assert.equal(engine.undo(), true);
  assert.deepEqual(engine.getState().scenes[0].motionTracks, previousTracks);
});

test("scene, motion and camera can commit atomically and undo as one operation", () => {
  const engine = createExperienceEngine(initial);
  const first = initial.scenes[0];
  const result = engine.transactionRegistered([
    { type: "scene.rename", input: { sceneId: first.id, label: "Directed Sequence" } },
    { type: "motion.applyArchetype", input: { sceneId: first.id, archetype: "product-hero" } },
    { type: "camera.applyChoreography", input: { sceneId: first.id, choreography: "director-hero-orbit" } },
  ], { transactionId: "directed-sequence" });

  assert.equal(result.ok, true);
  const committed = engine.getState().scenes[0];
  assert.equal(committed.label, "Directed Sequence");
  assert.ok(committed.motionTracks.some((track) => track.id.startsWith("engine-camera-")));
  assert.equal(engine.validate().filter((issue) => issue.level === "error").length, 0);

  assert.equal(engine.undo(), true);
  assert.deepEqual(engine.getState(), initial);
});
