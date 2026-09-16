import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { projectId } from "../src/core/ids";
import { ForgeEventBus, forgeEvent } from "../src/core/events/eventBus";
import { CapabilityRegistry } from "../src/core/registry/capabilityRegistry";
import { MigrationRegistry, type VersionedProject } from "../src/core/migrations/migrations";
import { runTransaction } from "../src/core/transactions/transaction";
import { validateInvariants } from "../src/core/invariants/invariants";
import { sceneInvariants } from "../src/domain/scene/invariants";
import { DuplicateSceneCommand, MoveSceneCommand, RenameSceneCommand } from "../src/domain/scene/commands";

const experience = parseExperience(raw);

test("typed Forge identifiers reject empty and unsafe values", () => {
  assert.equal(projectId("forge-project"), "forge-project");
  assert.throws(() => projectId(""));
  assert.throws(() => projectId("bad id with spaces"));
});

test("event bus supports typed channels and global observers", () => {
  const bus = new ForgeEventBus();
  const seen: string[] = [];
  const disposeOne = bus.on("scene.created", (event) => seen.push(`typed:${String(event.payload)}`));
  const disposeAll = bus.onAny((event) => seen.push(`all:${event.type}`));
  bus.emit(forgeEvent("scene.created", "hero"));
  disposeOne();
  disposeAll();
  bus.emit(forgeEvent("scene.created", "ignored"));
  assert.deepEqual(seen, ["typed:hero", "all:scene.created"]);
});

test("capability registry is version-aware", () => {
  const registry = new CapabilityRegistry();
  registry.register({ id: "motion", version: 1, commands: ["motion.applyArchetype"] });
  registry.register({ id: "camera", version: 1 });
  registry.register({ id: "motion", version: 2, commands: ["motion.applyArchetype", "motion.resetScene"] });
  assert.equal(registry.get("motion")?.version, 2);
  assert.deepEqual(registry.list().map((item) => item.id), ["camera", "motion"]);
  assert.throws(() => registry.register({ id: "motion", version: 1 }));
});

test("migration registry applies ordered deterministic migrations and preserves input on failure", () => {
  type Project = VersionedProject & { name?: string; ready?: boolean };
  const registry = new MigrationRegistry<Project>(3)
    .register(1, (input) => ({ ...input, schemaVersion: 2, name: input.name ?? "Untitled" }))
    .register(2, (input) => ({ ...input, schemaVersion: 3, ready: true }));
  const source: Project = { schemaVersion: 1 };
  const migrated = registry.migrate(source);
  assert.equal(migrated.project.schemaVersion, 3);
  assert.deepEqual(migrated.applied, [1, 2]);
  assert.equal(migrated.project.ready, true);
  assert.equal(source.schemaVersion, 1);

  const broken = new MigrationRegistry<Project>(2).register(1, (input) => ({ ...input, schemaVersion: 1 }));
  const failed = broken.migrate(source);
  assert(failed.error);
  assert.equal(failed.project.schemaVersion, 1);
  assert.deepEqual(failed.applied, []);
});

test("scene commands are deterministic and keep timeline invariants valid", () => {
  const first = experience.scenes[0];
  const duplicate = new DuplicateSceneCommand({ sceneId: first.id });
  const duplicated = duplicate.execute({ state: experience, transactionId: "test" });
  assert.equal(duplicated.ok, true);
  if (!duplicated.ok) return;
  assert.equal(duplicated.state.scenes.length, experience.scenes.length + 1);
  assert.equal(validateInvariants(duplicated.state, sceneInvariants).length, 0);

  const copyId = duplicated.output.sceneId;
  const moved = new MoveSceneCommand({ sceneId: copyId, toIndex: duplicated.state.scenes.length - 1 }).execute({ state: duplicated.state });
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  assert.equal(moved.state.scenes.at(-1)?.id, copyId);
  assert.equal(validateInvariants(moved.state, sceneInvariants).length, 0);
});

test("transactions rollback all prior commands when a later command fails", () => {
  const first = experience.scenes[0];
  const result = runTransaction(experience, [
    new RenameSceneCommand({ sceneId: first.id, label: "Changed" }),
    new MoveSceneCommand({ sceneId: "missing-scene", toIndex: 0 }),
  ], {
    transactionId: "rollback-test",
    validateState: (state) => validateInvariants(state, sceneInvariants).map((item) => ({ code: item.code, message: item.message, path: item.path })),
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.state, experience);
  assert.equal(result.events.length, 0);
});

test("successful transactions return inverse commands as one undo group", () => {
  const first = experience.scenes[0];
  const result = runTransaction(experience, [
    new RenameSceneCommand({ sceneId: first.id, label: "Directed Opening" }),
    new DuplicateSceneCommand({ sceneId: first.id }),
  ], {
    transactionId: "commit-test",
    validateState: (state) => validateInvariants(state, sceneInvariants).map((item) => ({ code: item.code, message: item.message, path: item.path })),
  });
  assert.equal(result.ok, true);
  assert.equal(result.events.length, 2);
  assert.equal(result.inverseCommands.length, 2);
  assert.equal(result.state.scenes[0].label, "Directed Opening");
});
