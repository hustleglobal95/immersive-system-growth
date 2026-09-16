import type { ExperienceConfig } from "@/src/types/experience";
import { ForgeEngine } from "@/src/core/engine/forgeEngine";
import { CommandRegistry } from "@/src/core/commands/commandRegistry";
import { sceneInvariants } from "@/src/domain/scene/invariants";
import { registerSceneCommands } from "@/src/domain/scene/registerSceneCommands";
import { ReplaceExperienceCommand } from "@/src/domain/project/commands";
import { ApplyMotionArchetypeCommand, ResetSceneMotionCommand } from "@/src/platform/commands/motionCommands";
import { ApplyCameraChoreographyCommand } from "@/src/platform/commands/cameraCommands";
import type { MotionArchetypeName } from "@/src/platform/motionArchetypes";
import type { CameraChoreographyName } from "@/src/platform/cameraChoreography";
import { createDefaultCapabilityRegistry } from "@/src/platform/defaultCapabilities";

export function createExperienceEngine(initialState: ExperienceConfig) {
  const commands = registerSceneCommands(new CommandRegistry<ExperienceConfig>());
  commands.register("experience.replace", (input) => {
    const value = input as { experience?: unknown; reason?: string };
    return new ReplaceExperienceCommand({ experience: value.experience, reason: value.reason });
  });
  commands.register("motion.applyArchetype", (input) => {
    const value = input as { sceneId?: string; archetype?: string };
    return new ApplyMotionArchetypeCommand({ sceneId: String(value.sceneId ?? ""), archetype: String(value.archetype ?? "") as MotionArchetypeName });
  });
  commands.register("motion.resetScene", (input) => {
    const value = input as { sceneId?: string };
    return new ResetSceneMotionCommand({ sceneId: String(value.sceneId ?? "") });
  });
  commands.register("camera.applyChoreography", (input) => {
    const value = input as { sceneId?: string; choreography?: string };
    return new ApplyCameraChoreographyCommand({ sceneId: String(value.sceneId ?? ""), choreography: String(value.choreography ?? "") as CameraChoreographyName });
  });
  return new ForgeEngine(initialState, {
    commandRegistry: commands,
    capabilityRegistry: createDefaultCapabilityRegistry(),
    invariants: sceneInvariants,
    historyLimit: 120,
  });
}
