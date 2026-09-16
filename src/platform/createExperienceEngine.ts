import type { ExperienceConfig } from "@/src/types/experience";
import { ForgeEngine } from "@/src/core/engine/forgeEngine";
import { CommandRegistry } from "@/src/core/commands/commandRegistry";
import { sceneInvariants } from "@/src/domain/scene/invariants";
import { registerSceneCommands } from "@/src/domain/scene/registerSceneCommands";
import { createDefaultCapabilityRegistry } from "@/src/platform/defaultCapabilities";

export function createExperienceEngine(initialState: ExperienceConfig) {
  const commands = registerSceneCommands(new CommandRegistry<ExperienceConfig>());
  return new ForgeEngine(initialState, {
    commandRegistry: commands,
    capabilityRegistry: createDefaultCapabilityRegistry(),
    invariants: sceneInvariants,
    historyLimit: 120,
  });
}
