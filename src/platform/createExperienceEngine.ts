import type { ExperienceConfig } from "@/src/types/experience";
import { ForgeEngine } from "@/src/core/engine/forgeEngine";
import { CommandRegistry } from "@/src/core/commands/commandRegistry";
import { sceneInvariants } from "@/src/domain/scene/invariants";
import { registerSceneCommands } from "@/src/domain/scene/registerSceneCommands";
import { ReplaceExperienceCommand } from "@/src/domain/project/commands";
import { createDefaultCapabilityRegistry } from "@/src/platform/defaultCapabilities";

export function createExperienceEngine(initialState: ExperienceConfig) {
  const commands = registerSceneCommands(new CommandRegistry<ExperienceConfig>());
  commands.register("experience.replace", (input) => {
    const value = input as { experience?: unknown; reason?: string };
    return new ReplaceExperienceCommand({ experience: value.experience, reason: value.reason });
  });
  return new ForgeEngine(initialState, {
    commandRegistry: commands,
    capabilityRegistry: createDefaultCapabilityRegistry(),
    invariants: sceneInvariants,
    historyLimit: 120,
  });
}
