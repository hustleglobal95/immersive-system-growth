import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";
import { replayForgeJournal } from "../src/core/journal/replay";
import { stateFingerprint } from "../src/core/journal/stateFingerprint";
import { validateForgeCheckpoint } from "../src/core/checkpoints/checkpoint";
import type { ExperienceConfig } from "../src/types/experience";

const initial = parseExperience(raw);

const validateState = (state: ExperienceConfig) => createExperienceEngine(state)
  .validate()
  .filter((issue) => issue.level === "error")
  .map((issue) => ({ code: issue.code, message: issue.message, path: issue.path, details: issue.details }));

test("state fingerprints are stable across object key ordering", () => {
  const left = { beta: 2, alpha: { y: [3, 4], x: 1 } };
  const right = { alpha: { x: 1, y: [3, 4] }, beta: 2 };
  assert.equal(stateFingerprint(left), stateFingerprint(right));
  assert.notEqual(stateFingerprint(left), stateFingerprint({ ...right, beta: 3 }));
});

test("ForgeEngine rejects stale writes without changing revision or journal", () => {
  const engine = createExperienceEngine(initial);
  const scene = initial.scenes[0];
  const accepted = engine.dispatchRegistered("scene.rename", {
    sceneId: scene.id,
    label: "Revision One",
  }, { expectedRevision: 0, actor: "agent-a", source: "ai", transactionId: "first" });

  assert.equal(accepted.ok, true);
  assert.equal(accepted.revisionBefore, 0);
  assert.equal(accepted.revisionAfter, 1);
  assert.equal(engine.getRevision(), 1);
  assert.equal(engine.getJournal().length, 1);
  assert.equal(accepted.receipt.actor, "agent-a");
  assert.equal(accepted.receipt.source, "ai");

  const stale = engine.dispatchRegistered("scene.rename", {
    sceneId: scene.id,
    label: "Stale Overwrite",
  }, { expectedRevision: 0, actor: "agent-b", source: "ai", transactionId: "stale" });

  assert.equal(stale.ok, false);
  assert.equal(stale.errors[0]?.code, "engine.revision.conflict");
  assert.equal(stale.revisionBefore, 1);
  assert.equal(stale.revisionAfter, 1);
  assert.equal(engine.getRevision(), 1);
  assert.equal(engine.getState().scenes[0].label, "Revision One");
  assert.equal(engine.getJournal().length, 1);
});

test("dry-run returns a projected fingerprint without mutating history, revision or journal", () => {
  const engine = createExperienceEngine(initial);
  const scene = initial.scenes[0];
  const result = engine.dispatchRegistered("scene.duplicate", { sceneId: scene.id }, {
    dryRun: true,
    expectedRevision: 0,
    source: "ai",
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.revisionBefore, 0);
  assert.equal(result.revisionAfter, 0);
  assert.notEqual(result.fingerprintAfter, result.fingerprintBefore);
  assert.equal(result.receipt.dryRun, true);
  assert.equal(engine.getRevision(), 0);
  assert.equal(engine.getJournal().length, 0);
  assert.equal(engine.snapshot().canUndo, false);
});

test("multi-command transactions create one revision and one replayable journal entry", () => {
  const engine = createExperienceEngine(initial);
  const scene = initial.scenes[0];
  const result = engine.transactionRegistered([
    { type: "scene.rename", input: { sceneId: scene.id, label: "Directed Opening" } },
    { type: "motion.applyArchetype", input: { sceneId: scene.id, archetype: "editorial-reveal" } },
    { type: "camera.applyChoreography", input: { sceneId: scene.id, choreography: "director-precision-push" } },
  ], { expectedRevision: 0, actor: "director-agent", source: "ai", transactionId: "directed-opening" });

  assert.equal(result.ok, true);
  assert.equal(engine.getRevision(), 1);
  const journal = engine.getJournal();
  assert.equal(journal.length, 1);
  assert.equal(journal[0].operation, "transaction");
  assert.equal(journal[0].commands?.length, 3);
  assert.equal(journal[0].revisionBefore, 0);
  assert.equal(journal[0].revisionAfter, 1);
  assert.ok(result.receipt.affectedIds.includes(scene.id));

  const replay = replayForgeJournal(initial, journal, engine.commands, { validateState });
  assert.equal(replay.ok, true);
  assert.equal(replay.revision, 1);
  assert.equal(replay.fingerprint, engine.getFingerprint());
  assert.deepEqual(replay.state, engine.getState());
});

test("undo and redo remain replayable through state journal entries", () => {
  const engine = createExperienceEngine(initial);
  const scene = initial.scenes[0];
  engine.dispatchRegistered("scene.rename", { sceneId: scene.id, label: "Temporary" });
  assert.equal(engine.undo(), true);
  assert.equal(engine.redo(), true);

  const journal = engine.getJournal();
  assert.deepEqual(journal.map((entry) => entry.operation), ["transaction", "undo", "redo"]);
  const replay = replayForgeJournal(initial, journal, engine.commands, { validateState });
  assert.equal(replay.ok, true);
  assert.equal(replay.revision, 3);
  assert.equal(replay.fingerprint, engine.getFingerprint());
});

test("checkpoints validate integrity and restore as a revisioned operation", () => {
  const engine = createExperienceEngine(initial);
  const scene = initial.scenes[0];
  const checkpoint = engine.createCheckpoint("Original opening", "opening-baseline");
  assert.equal(checkpoint.revision, 0);
  assert.equal(validateForgeCheckpoint(checkpoint).fingerprint, checkpoint.fingerprint);

  engine.dispatchRegistered("scene.rename", { sceneId: scene.id, label: "Changed" });
  assert.equal(engine.getRevision(), 1);
  assert.equal(engine.restoreCheckpoint(checkpoint, { expectedRevision: 1, source: "studio" }), true);
  assert.equal(engine.getRevision(), 2);
  assert.deepEqual(engine.getState(), initial);
  assert.equal(engine.getJournal().at(-1)?.operation, "checkpoint-restore");

  const tampered = structuredClone(checkpoint);
  tampered.state.scenes[0].label = "Tampered";
  assert.throws(() => validateForgeCheckpoint(tampered), /integrity validation/);
});

test("journal replay fails closed when a recorded fingerprint is tampered", () => {
  const engine = createExperienceEngine(initial);
  const scene = initial.scenes[0];
  engine.dispatchRegistered("scene.rename", { sceneId: scene.id, label: "Verified" });
  const journal = engine.getJournal();
  journal[0].fingerprintAfter = "forge1:0000000000000000";

  const replay = replayForgeJournal(initial, journal, engine.commands, { validateState });
  assert.equal(replay.ok, false);
  assert.equal(replay.errors[0]?.code, "journal.replayDiverged");
});
