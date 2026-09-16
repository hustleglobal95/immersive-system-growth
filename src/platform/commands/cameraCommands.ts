import type { ForgeCommand, CommandContext, CommandError, CommandResult } from "@/src/core/commands/command";
import { commandFailure } from "@/src/core/commands/command";
import { forgeEvent } from "@/src/core/events/eventBus";
import {
  createCameraChoreography,
  isCameraChoreographyName,
  type CameraChoreographyName,
} from "@/src/platform/cameraChoreography";
import { ReplaceSceneMotionCommand } from "@/src/platform/commands/motionCommands";
import type { ExperienceConfig, MotionTrack } from "@/src/types/experience";

const PREFIX = "engine-camera";

function namespaceTrack(track: MotionTrack, prefix: string): MotionTrack {
  return { ...track, id: `${prefix}-${track.id}`, keyframes: track.keyframes.map((key) => ({ ...key, id: `${prefix}-${key.id}` })) } as MotionTrack;
}

export class ApplyCameraChoreographyCommand implements ForgeCommand<ExperienceConfig, { sceneId: string; choreography: CameraChoreographyName }, { sceneId: string; addedTracks: number }> {
  readonly type = "camera.applyChoreography";
  constructor(readonly input: { sceneId: string; choreography: CameraChoreographyName }) {}

  validate({ state }: CommandContext<ExperienceConfig>): CommandError[] {
    const errors: CommandError[] = [];
    if (!state.scenes.some((scene) => scene.id === this.input.sceneId)) errors.push({ code: "scene.notFound", message: `Scene ${this.input.sceneId} was not found.` });
    if (!isCameraChoreographyName(this.input.choreography)) errors.push({ code: "camera.choreography.invalid", message: `Unknown camera choreography ${this.input.choreography}.` });
    return errors;
  }

  execute({ state, transactionId }: CommandContext<ExperienceConfig>): CommandResult<ExperienceConfig, { sceneId: string; addedTracks: number }> {
    const sceneIndex = state.scenes.findIndex((scene) => scene.id === this.input.sceneId);
    if (sceneIndex < 0) return commandFailure(state, "scene.notFound", `Scene ${this.input.sceneId} was not found.`);
    if (!isCameraChoreographyName(this.input.choreography)) return commandFailure(state, "camera.choreography.invalid", `Unknown camera choreography ${this.input.choreography}.`);

    const previous = structuredClone(state.scenes[sceneIndex].motionTracks);
    const created = createCameraChoreography(this.input.choreography, state, sceneIndex);
    const authored = previous.filter((track) => !track.id.startsWith(`${PREFIX}-`));
    const cameraTargets = new Set(created.map((track) => `${track.viewport}:${track.target}`));
    const kept = authored.filter((track) => !cameraTargets.has(`${track.viewport}:${track.target}`));
    const additions = created.map((track) => namespaceTrack(track, `${PREFIX}-${this.input.choreography}`));
    const next = structuredClone(state);
    next.scenes[sceneIndex].motionTracks = [...kept, ...additions];

    return {
      ok: true,
      state: next,
      output: { sceneId: this.input.sceneId, addedTracks: additions.length },
      events: [forgeEvent("camera.choreographyApplied", { sceneId: this.input.sceneId, choreography: this.input.choreography, addedTracks: additions.length }, transactionId)],
      inverse: new ReplaceSceneMotionCommand({ sceneId: this.input.sceneId, tracks: previous }) as ForgeCommand<ExperienceConfig, unknown, unknown>,
      affectedIds: [this.input.sceneId],
    };
  }
}
