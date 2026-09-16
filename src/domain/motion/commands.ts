import type { ForgeCommand, CommandContext, CommandResult } from "@/src/core/commands/command";
import { commandFailure } from "@/src/core/commands/command";
import { forgeEvent } from "@/src/core/events/eventBus";
import { createMotionArchetype, isMotionArchetypeName, type MotionArchetypeName } from "@/src/platform/motionArchetypes";
import type { ExperienceConfig, MotionTrack } from "@/src/types/experience";

const PREFIX = "engine-auto";

function namespaceTrack(track: MotionTrack, prefix: string): MotionTrack {
  return { ...track, id: `${prefix}-${track.id}`, keyframes: track.keyframes.map((key) => ({ ...key, id: `${prefix}-${key.id}` })) } as MotionTrack;
}

class ReplaceSceneMotionCommand implements ForgeCommand<ExperienceConfig, { sceneId: string; tracks: MotionTrack[] }, { sceneId: string }> {
  readonly type = "motion.replaceScene";
  constructor(readonly input: { sceneId: string; tracks: MotionTrack[] }) {}
  validate({ state }: CommandContext<ExperienceConfig>) {
    return state.scenes.some((scene) => scene.id === this.input.sceneId) ? [] : [{ code: "scene.notFound", message: `Scene ${this.input.sceneId} was not found.` }];
  }
  execute({ state, transactionId }: CommandContext<ExperienceConfig>): CommandResult<ExperienceConfig, { sceneId: string }> {
    const index = state.scenes.findIndex((scene) => scene.id === this.input.sceneId);
    if (index < 0) return commandFailure(state, "scene.notFound", `Scene ${this.input.sceneId} was not found.`);
    const previous = structuredClone(state.scenes[index].motionTracks);
    const next = structuredClone(state);
    next.scenes[index].motionTracks = structuredClone(this.input.tracks);
    return {
      ok: true,
      state: next,
      output: { sceneId: this.input.sceneId },
      events: [forgeEvent("motion.replaced", { sceneId: this.input.sceneId, trackCount: this.input.tracks.length }, transactionId)],
      inverse: new ReplaceSceneMotionCommand({ sceneId: this.input.sceneId, tracks: previous }) as ForgeCommand<ExperienceConfig, unknown, unknown>,
      affectedIds: [this.input.sceneId],
    };
  }
}

export class ApplyMotionArchetypeCommand implements ForgeCommand<ExperienceConfig, { sceneId: string; archetype: MotionArchetypeName }, { sceneId: string; addedTracks: number }> {
  readonly type = "motion.applyArchetype";
  constructor(readonly input: { sceneId: string; archetype: MotionArchetypeName }) {}
  validate({ state }: CommandContext<ExperienceConfig>) {
    const errors = [];
    if (!state.scenes.some((scene) => scene.id === this.input.sceneId)) errors.push({ code: "scene.notFound", message: `Scene ${this.input.sceneId} was not found.` });
    if (!isMotionArchetypeName(this.input.archetype)) errors.push({ code: "motion.archetype.invalid", message: `Unknown motion archetype ${this.input.archetype}.` });
    return errors;
  }
  execute({ state, transactionId }: CommandContext<ExperienceConfig>): CommandResult<ExperienceConfig, { sceneId: string; addedTracks: number }> {
    const sceneIndex = state.scenes.findIndex((scene) => scene.id === this.input.sceneId);
    if (sceneIndex < 0) return commandFailure(state, "scene.notFound", `Scene ${this.input.sceneId} was not found.`);
    if (!isMotionArchetypeName(this.input.archetype)) return commandFailure(state, "motion.archetype.invalid", `Unknown motion archetype ${this.input.archetype}.`);
    const previous = structuredClone(state.scenes[sceneIndex].motionTracks);
    const created = createMotionArchetype(this.input.archetype, state, sceneIndex);
    const authored = previous.filter((track) => !track.id.startsWith(`${PREFIX}-`));
    const occupied = new Set(authored.map((track) => `${track.viewport}:${track.target}`));
    const additions = created
      .filter((track) => !occupied.has(`${track.viewport}:${track.target}`))
      .map((track) => namespaceTrack(track, `${PREFIX}-${this.input.archetype}`));
    const next = structuredClone(state);
    next.scenes[sceneIndex].motionTracks = [...authored, ...additions];
    return {
      ok: true,
      state: next,
      output: { sceneId: this.input.sceneId, addedTracks: additions.length },
      events: [forgeEvent("motion.applied", { sceneId: this.input.sceneId, archetype: this.input.archetype, addedTracks: additions.length }, transactionId)],
      inverse: new ReplaceSceneMotionCommand({ sceneId: this.input.sceneId, tracks: previous }) as ForgeCommand<ExperienceConfig, unknown, unknown>,
      affectedIds: [this.input.sceneId],
    };
  }
}

export class ResetSceneMotionCommand implements ForgeCommand<ExperienceConfig, { sceneId: string }, { sceneId: string }> {
  readonly type = "motion.resetScene";
  constructor(readonly input: { sceneId: string }) {}
  validate({ state }: CommandContext<ExperienceConfig>) {
    return state.scenes.some((scene) => scene.id === this.input.sceneId) ? [] : [{ code: "scene.notFound", message: `Scene ${this.input.sceneId} was not found.` }];
  }
  execute({ state, transactionId }: CommandContext<ExperienceConfig>): CommandResult<ExperienceConfig, { sceneId: string }> {
    const index = state.scenes.findIndex((scene) => scene.id === this.input.sceneId);
    if (index < 0) return commandFailure(state, "scene.notFound", `Scene ${this.input.sceneId} was not found.`);
    const previous = structuredClone(state.scenes[index].motionTracks);
    const next = structuredClone(state);
    next.scenes[index].motionTracks = [];
    return {
      ok: true,
      state: next,
      output: { sceneId: this.input.sceneId },
      events: [forgeEvent("motion.reset", { sceneId: this.input.sceneId }, transactionId)],
      inverse: new ReplaceSceneMotionCommand({ sceneId: this.input.sceneId, tracks: previous }) as ForgeCommand<ExperienceConfig, unknown, unknown>,
      affectedIds: [this.input.sceneId],
    };
  }
}
