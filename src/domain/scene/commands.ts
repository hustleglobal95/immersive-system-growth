import type { ForgeCommand, CommandContext, CommandError, CommandResult } from "@/src/core/commands/command";
import { commandFailure } from "@/src/core/commands/command";
import { forgeEvent } from "@/src/core/events/eventBus";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

function normalizeRanges(scenes: SceneDefinition[]): SceneDefinition[] {
  const length = Math.max(1, scenes.length);
  return scenes.map((scene, index) => ({ ...scene, range: [index / length, (index + 1) / length] as [number, number] }));
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function uniqueSceneId(experience: ExperienceConfig, base: string) {
  const used = new Set(experience.scenes.map((scene) => scene.id));
  const root = slug(base) || "scene";
  let value = root;
  let count = 2;
  while (used.has(value)) value = `${root}-${count++}`;
  return value;
}

function success<T>(state: ExperienceConfig, output: T, events: ReturnType<typeof forgeEvent>[], inverse?: ForgeCommand<ExperienceConfig, unknown, unknown>, affectedIds?: string[]): CommandResult<ExperienceConfig, T> {
  return { ok: true, state, output, events, inverse, affectedIds };
}

export class AddSceneCommand implements ForgeCommand<ExperienceConfig, { sourceSceneId?: string; afterSceneId?: string; label?: string }, { sceneId: string; index: number }> {
  readonly type = "scene.add";
  constructor(readonly input: { sourceSceneId?: string; afterSceneId?: string; label?: string } = {}) {}
  validate({ state }: CommandContext<ExperienceConfig>): CommandError[] {
    const errors: CommandError[] = [];
    if (!state.scenes.length) errors.push({ code: "scene.source.missing", message: "A source scene is required to create a new scene." });
    if (this.input.sourceSceneId && !state.scenes.some((scene) => scene.id === this.input.sourceSceneId)) errors.push({ code: "scene.source.notFound", message: `Source scene ${this.input.sourceSceneId} was not found.` });
    if (this.input.afterSceneId && !state.scenes.some((scene) => scene.id === this.input.afterSceneId)) errors.push({ code: "scene.anchor.notFound", message: `Anchor scene ${this.input.afterSceneId} was not found.` });
    return errors;
  }
  execute({ state, transactionId }: CommandContext<ExperienceConfig>): CommandResult<ExperienceConfig, { sceneId: string; index: number }> {
    if (!state.scenes.length) return commandFailure(state, "scene.source.missing", "A source scene is required to create a new scene.");
    const source = this.input.sourceSceneId
      ? state.scenes.find((scene) => scene.id === this.input.sourceSceneId)
      : state.scenes.at(-1);
    if (!source) return commandFailure(state, "scene.source.notFound", `Source scene ${this.input.sourceSceneId ?? ""} was not found.`);
    const afterIndex = this.input.afterSceneId
      ? state.scenes.findIndex((scene) => scene.id === this.input.afterSceneId)
      : state.scenes.length - 1;
    if (afterIndex < 0) return commandFailure(state, "scene.anchor.notFound", `Anchor scene ${this.input.afterSceneId ?? ""} was not found.`);

    const created = structuredClone(source);
    const nextOrdinal = state.scenes.length + 1;
    created.id = uniqueSceneId(state, `scene-${nextOrdinal}`);
    created.label = this.input.label?.trim() || `Scene ${nextOrdinal}`;
    created.copy = {
      ...created.copy,
      eyebrow: `${String(nextOrdinal).padStart(2, "0")} / NEW SCENE`,
      headline: "Direct this moment.",
      body: "Define the purpose, camera, motion and interaction for this scene.",
    };
    created.motionTracks = [];
    created.blocks = [];
    const scenes = [...structuredClone(state.scenes)];
    const index = afterIndex + 1;
    scenes.splice(index, 0, created);
    const next = { ...structuredClone(state), scenes: normalizeRanges(scenes) };
    return success(next, { sceneId: created.id, index }, [forgeEvent("scene.created", { sceneId: created.id, index, sourceSceneId: source.id }, transactionId)], new DeleteSceneCommand({ sceneId: created.id }) as ForgeCommand<ExperienceConfig, unknown, unknown>, [created.id]);
  }
}

export class RenameSceneCommand implements ForgeCommand<ExperienceConfig, { sceneId: string; label: string }, { sceneId: string }> {
  readonly type = "scene.rename";
  constructor(readonly input: { sceneId: string; label: string }) {}
  validate({ state }: CommandContext<ExperienceConfig>): CommandError[] {
    const errors: CommandError[] = [];
    if (!state.scenes.some((scene) => scene.id === this.input.sceneId)) errors.push({ code: "scene.notFound", message: `Scene ${this.input.sceneId} was not found.` });
    if (!this.input.label.trim()) errors.push({ code: "scene.label.empty", message: "Scene label cannot be empty." });
    return errors;
  }
  execute({ state, transactionId }: CommandContext<ExperienceConfig>) {
    const scene = state.scenes.find((item) => item.id === this.input.sceneId);
    if (!scene) return commandFailure(state, "scene.notFound", `Scene ${this.input.sceneId} was not found.`);
    const previous = scene.label;
    const next = structuredClone(state);
    next.scenes = next.scenes.map((item) => item.id === this.input.sceneId ? { ...item, label: this.input.label.trim() } : item);
    return success(next, { sceneId: this.input.sceneId }, [forgeEvent("scene.renamed", { sceneId: this.input.sceneId, label: this.input.label.trim() }, transactionId)], new RenameSceneCommand({ sceneId: this.input.sceneId, label: previous }) as ForgeCommand<ExperienceConfig, unknown, unknown>, [this.input.sceneId]);
  }
}

export class MoveSceneCommand implements ForgeCommand<ExperienceConfig, { sceneId: string; toIndex: number }, { sceneId: string; fromIndex: number; toIndex: number }> {
  readonly type = "scene.move";
  constructor(readonly input: { sceneId: string; toIndex: number }) {}
  validate({ state }: CommandContext<ExperienceConfig>): CommandError[] {
    const fromIndex = state.scenes.findIndex((scene) => scene.id === this.input.sceneId);
    const errors: CommandError[] = [];
    if (fromIndex < 0) errors.push({ code: "scene.notFound", message: `Scene ${this.input.sceneId} was not found.` });
    if (!Number.isInteger(this.input.toIndex) || this.input.toIndex < 0 || this.input.toIndex >= state.scenes.length) errors.push({ code: "scene.index.invalid", message: `Scene target index ${this.input.toIndex} is invalid.` });
    return errors;
  }
  execute({ state, transactionId }: CommandContext<ExperienceConfig>) {
    const fromIndex = state.scenes.findIndex((scene) => scene.id === this.input.sceneId);
    if (fromIndex < 0) return commandFailure(state, "scene.notFound", `Scene ${this.input.sceneId} was not found.`);
    if (this.input.toIndex < 0 || this.input.toIndex >= state.scenes.length) return commandFailure(state, "scene.index.invalid", `Scene target index ${this.input.toIndex} is invalid.`);
    const scenes = [...structuredClone(state.scenes)];
    const [scene] = scenes.splice(fromIndex, 1);
    scenes.splice(this.input.toIndex, 0, scene);
    const next = { ...structuredClone(state), scenes: normalizeRanges(scenes) };
    return success(next, { sceneId: this.input.sceneId, fromIndex, toIndex: this.input.toIndex }, [forgeEvent("scene.reordered", { sceneId: this.input.sceneId, fromIndex, toIndex: this.input.toIndex }, transactionId)], new MoveSceneCommand({ sceneId: this.input.sceneId, toIndex: fromIndex }) as ForgeCommand<ExperienceConfig, unknown, unknown>, [this.input.sceneId]);
  }
}

class DeleteSceneCommand implements ForgeCommand<ExperienceConfig, { sceneId: string; allowLast?: boolean }, { sceneId: string }> {
  readonly type = "scene.delete";
  constructor(readonly input: { sceneId: string; allowLast?: boolean }) {}
  validate({ state }: CommandContext<ExperienceConfig>): CommandError[] {
    const errors: CommandError[] = [];
    if (!state.scenes.some((scene) => scene.id === this.input.sceneId)) errors.push({ code: "scene.notFound", message: `Scene ${this.input.sceneId} was not found.` });
    if (!this.input.allowLast && state.scenes.length <= 1) errors.push({ code: "scene.minimum", message: "A Forge experience must keep at least one scene." });
    return errors;
  }
  execute({ state, transactionId }: CommandContext<ExperienceConfig>) {
    const index = state.scenes.findIndex((scene) => scene.id === this.input.sceneId);
    if (index < 0) return commandFailure(state, "scene.notFound", `Scene ${this.input.sceneId} was not found.`);
    if (!this.input.allowLast && state.scenes.length <= 1) return commandFailure(state, "scene.minimum", "A Forge experience must keep at least one scene.");
    const removed = structuredClone(state.scenes[index]);
    const scenes = normalizeRanges(state.scenes.filter((scene) => scene.id !== this.input.sceneId).map((scene) => structuredClone(scene)));
    const next = { ...structuredClone(state), scenes };
    return success(next, { sceneId: this.input.sceneId }, [forgeEvent("scene.deleted", { sceneId: this.input.sceneId, index }, transactionId)], new RestoreSceneCommand({ scene: removed, index }) as ForgeCommand<ExperienceConfig, unknown, unknown>, [this.input.sceneId]);
  }
}

class RestoreSceneCommand implements ForgeCommand<ExperienceConfig, { scene: SceneDefinition; index: number }, { sceneId: string }> {
  readonly type = "scene.restore";
  constructor(readonly input: { scene: SceneDefinition; index: number }) {}
  validate({ state }: CommandContext<ExperienceConfig>): CommandError[] {
    if (state.scenes.some((scene) => scene.id === this.input.scene.id)) return [{ code: "scene.id.duplicate", message: `Scene ${this.input.scene.id} already exists.` }];
    return [];
  }
  execute({ state, transactionId }: CommandContext<ExperienceConfig>) {
    if (state.scenes.some((scene) => scene.id === this.input.scene.id)) return commandFailure(state, "scene.id.duplicate", `Scene ${this.input.scene.id} already exists.`);
    const scenes = [...structuredClone(state.scenes)];
    scenes.splice(Math.max(0, Math.min(this.input.index, scenes.length)), 0, structuredClone(this.input.scene));
    const next = { ...structuredClone(state), scenes: normalizeRanges(scenes) };
    return success(next, { sceneId: this.input.scene.id }, [forgeEvent("scene.restored", { sceneId: this.input.scene.id, index: this.input.index }, transactionId)], new DeleteSceneCommand({ sceneId: this.input.scene.id, allowLast: true }) as ForgeCommand<ExperienceConfig, unknown, unknown>, [this.input.scene.id]);
  }
}

export class DuplicateSceneCommand implements ForgeCommand<ExperienceConfig, { sceneId: string }, { sceneId: string }> {
  readonly type = "scene.duplicate";
  constructor(readonly input: { sceneId: string }) {}
  validate({ state }: CommandContext<ExperienceConfig>): CommandError[] {
    return state.scenes.some((scene) => scene.id === this.input.sceneId) ? [] : [{ code: "scene.notFound", message: `Scene ${this.input.sceneId} was not found.` }];
  }
  execute({ state, transactionId }: CommandContext<ExperienceConfig>) {
    const index = state.scenes.findIndex((scene) => scene.id === this.input.sceneId);
    if (index < 0) return commandFailure(state, "scene.notFound", `Scene ${this.input.sceneId} was not found.`);
    const source = structuredClone(state.scenes[index]);
    source.id = uniqueSceneId(state, `${source.id}-copy`);
    source.label = `${source.label} Copy`;
    const scenes = [...structuredClone(state.scenes)];
    scenes.splice(index + 1, 0, source);
    const next = { ...structuredClone(state), scenes: normalizeRanges(scenes) };
    return success(next, { sceneId: source.id }, [forgeEvent("scene.duplicated", { sourceSceneId: this.input.sceneId, sceneId: source.id, index: index + 1 }, transactionId)], new DeleteSceneCommand({ sceneId: source.id }) as ForgeCommand<ExperienceConfig, unknown, unknown>, [source.id]);
  }
}

export function deleteSceneCommand(sceneId: string) { return new DeleteSceneCommand({ sceneId }); }
