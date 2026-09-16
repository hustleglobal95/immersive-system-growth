import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";

const initial = parseExperience(raw);

test("scene add, rename, move, duplicate and delete share the ForgeEngine command surface", () => {
  const engine = createExperienceEngine(initial);
  const commands = engine.commands.list();
  for (const type of ["scene.add", "scene.rename", "scene.move", "scene.duplicate", "scene.delete"]) assert.ok(commands.includes(type), `${type} should be registered`);

  const first = initial.scenes[0];
  const added = engine.dispatchRegistered("scene.add", { sourceSceneId: first.id, afterSceneId: first.id, label: "New Chapter" });
  assert.equal(added.ok, true);
  const addedId = added.ok ? (added.events[0]?.payload as { sceneId?: string })?.sceneId : undefined;
  assert.ok(addedId);
  assert.equal(engine.getState().scenes[1].label, "New Chapter");
  assert.equal(engine.validate().filter((issue) => issue.level === "error").length, 0);

  const renamed = engine.dispatchRegistered("scene.rename", { sceneId: addedId, label: "Renamed Chapter" });
  assert.equal(renamed.ok, true);
  assert.equal(engine.getState().scenes.find((scene) => scene.id === addedId)?.label, "Renamed Chapter");

  const moved = engine.dispatchRegistered("scene.move", { sceneId: addedId, toIndex: engine.getState().scenes.length - 1 });
  assert.equal(moved.ok, true);
  assert.equal(engine.getState().scenes.at(-1)?.id, addedId);

  const duplicated = engine.dispatchRegistered("scene.duplicate", { sceneId: addedId });
  assert.equal(duplicated.ok, true);
  assert.equal(engine.getState().scenes.length, initial.scenes.length + 2);

  const deleted = engine.dispatchRegistered("scene.delete", { sceneId: addedId });
  assert.equal(deleted.ok, true);
  assert.equal(engine.getState().scenes.some((scene) => scene.id === addedId), false);
  assert.equal(engine.validate().filter((issue) => issue.level === "error").length, 0);
});
