import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";
import { replayForgeJournal } from "../src/core/journal/replay";
import type { ExperienceConfig } from "../src/types/experience";

const initial = parseExperience(raw);
const validateState = (state: ExperienceConfig) => createExperienceEngine(state)
  .validate()
  .filter((issue) => issue.level === "error")
  .map((issue) => ({ code: issue.code, message: issue.message, path: issue.path, details: issue.details }));

test("ExperienceEngine resumes at a checkpoint revision and preserves optimistic concurrency", () => {
  const first = createExperienceEngine(initial);
  const sceneId = initial.scenes[0].id;
  first.dispatchRegistered("scene.rename", { sceneId, label: "Revision One" }, { expectedRevision: 0 });
  const checkpoint = first.createCheckpoint("After first edit", "r1");

  const resumed = createExperienceEngine(checkpoint.state, { initialRevision: checkpoint.revision });
  assert.equal(resumed.getRevision(), 1);
  assert.equal(resumed.getFingerprint(), checkpoint.fingerprint);

  const stale = resumed.dispatchRegistered("scene.rename", { sceneId, label: "Stale" }, { expectedRevision: 0 });
  assert.equal(stale.ok, false);
  assert.equal(stale.errors[0]?.code, "engine.revision.conflict");
  assert.equal(resumed.getRevision(), 1);

  const accepted = resumed.dispatchRegistered("scene.rename", { sceneId, label: "Revision Two" }, { expectedRevision: 1 });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.revisionAfter, 2);
  assert.equal(resumed.getRevision(), 2);
});

test("a journal window can replay from a matching checkpoint instead of revision zero", () => {
  const first = createExperienceEngine(initial);
  const sceneId = initial.scenes[0].id;
  first.dispatchRegistered("scene.rename", { sceneId, label: "Checkpoint Base" });
  const checkpoint = first.createCheckpoint("Replay base", "replay-base");

  const resumed = createExperienceEngine(checkpoint.state, { initialRevision: checkpoint.revision });
  resumed.dispatchRegistered("motion.applyArchetype", { sceneId, archetype: "editorial-reveal" }, { expectedRevision: 1 });
  resumed.dispatchRegistered("camera.applyChoreography", { sceneId, choreography: "director-precision-push" }, { expectedRevision: 2 });
  const window = resumed.getJournal();

  assert.equal(window[0]?.revisionBefore, checkpoint.revision);
  const replay = replayForgeJournal(checkpoint.state, window, resumed.commands, {
    initialRevision: checkpoint.revision,
    validateState,
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.revision, resumed.getRevision());
  assert.equal(replay.fingerprint, resumed.getFingerprint());
  assert.deepEqual(replay.state, resumed.getState());
});
