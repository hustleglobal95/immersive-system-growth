import type { ExperienceConfig } from "@/src/types/experience";
import { ForgeEngine, type ForgeEngineOptions } from "@/src/core/engine/forgeEngine";
import { CommandRegistry } from "@/src/core/commands/commandRegistry";
import { sceneInvariants } from "@/src/domain/scene/invariants";
import { registerSceneCommands } from "@/src/domain/scene/registerSceneCommands";
import { ReplaceExperienceCommand } from "@/src/domain/project/commands";
import { ApplyMotionArchetypeCommand, ResetSceneMotionCommand } from "@/src/platform/commands/motionCommands";
import { ApplyCameraChoreographyCommand } from "@/src/platform/commands/cameraCommands";
import { motionArchetypeCatalog, type MotionArchetypeName } from "@/src/platform/motionArchetypes";
import { cameraChoreographyCatalog, type CameraChoreographyName } from "@/src/platform/cameraChoreography";
import { createDefaultCapabilityRegistry } from "@/src/platform/defaultCapabilities";

type ExperienceEngineOptions = Pick<
  ForgeEngineOptions<ExperienceConfig>,
  "eventBus" | "historyLimit" | "journalLimit" | "initialJournal" | "initialRevision"
>;

const sceneIdField = { type: "string" as const, minLength: 1, maxLength: 120, description: "Existing Forge scene ID." };

export function createExperienceEngine(initialState: ExperienceConfig, options: ExperienceEngineOptions = {}) {
  const commands = registerSceneCommands(new CommandRegistry<ExperienceConfig>());
  commands.register("experience.replace", (input) => {
    const value = input as { experience: unknown; reason?: string };
    return new ReplaceExperienceCommand({ experience: value.experience, reason: value.reason });
  }, {
    label: "Replace experience",
    description: "Replace the complete ExperienceConfig after full schema and invariant validation.",
    category: "project", impact: "destructive", approval: "required", reversible: true, agentVisible: true,
    inputSchema: {
      type: "object", required: ["experience"],
      properties: {
        experience: { type: "object", allowAdditionalProperties: true, description: "Complete candidate ExperienceConfig object." },
        reason: { type: "string", minLength: 1, maxLength: 240, description: "Optional audit reason for replacing the experience." },
      },
    },
  });
  commands.register("motion.applyArchetype", (input) => {
    const value = input as { sceneId: string; archetype: MotionArchetypeName };
    return new ApplyMotionArchetypeCommand({ sceneId: value.sceneId, archetype: value.archetype });
  }, {
    label: "Apply motion archetype",
    description: "Apply coordinated cinematic motion to unoccupied scene targets while preserving authored tracks.",
    category: "motion", impact: "local", approval: "auto", reversible: true, agentVisible: true,
    inputSchema: {
      type: "object", required: ["sceneId", "archetype"],
      properties: {
        sceneId: sceneIdField,
        archetype: { type: "enum", values: motionArchetypeCatalog.map((item) => item.id), description: "Registered cinematic motion archetype." },
      },
    },
  });
  commands.register("motion.resetScene", (input) => {
    const value = input as { sceneId: string };
    return new ResetSceneMotionCommand({ sceneId: value.sceneId });
  }, {
    label: "Reset scene motion",
    description: "Remove all motion tracks from one scene.",
    category: "motion", impact: "destructive", approval: "review", reversible: true, agentVisible: true,
    inputSchema: { type: "object", required: ["sceneId"], properties: { sceneId: sceneIdField } },
  });
  commands.register("camera.applyChoreography", (input) => {
    const value = input as { sceneId: string; choreography: CameraChoreographyName };
    return new ApplyCameraChoreographyCommand({ sceneId: value.sceneId, choreography: value.choreography });
  }, {
    label: "Apply camera choreography",
    description: "Apply deterministic camera position, target and lens choreography to one scene.",
    category: "camera", impact: "local", approval: "auto", reversible: true, agentVisible: true,
    inputSchema: {
      type: "object", required: ["sceneId", "choreography"],
      properties: {
        sceneId: sceneIdField,
        choreography: { type: "enum", values: cameraChoreographyCatalog.map((item) => item.id), description: "Registered deterministic camera choreography." },
      },
    },
  });
  return new ForgeEngine(initialState, {
    commandRegistry: commands,
    capabilityRegistry: createDefaultCapabilityRegistry(),
    invariants: sceneInvariants,
    eventBus: options.eventBus,
    historyLimit: options.historyLimit ?? 120,
    journalLimit: options.journalLimit,
    initialJournal: options.initialJournal,
    initialRevision: options.initialRevision,
  });
}
