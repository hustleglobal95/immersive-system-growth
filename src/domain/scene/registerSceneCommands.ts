import type { ExperienceConfig } from "@/src/types/experience";
import { CommandRegistry } from "@/src/core/commands/commandRegistry";
import { AddSceneCommand, DuplicateSceneCommand, MoveSceneCommand, RenameSceneCommand, deleteSceneCommand } from "@/src/domain/scene/commands";

const sceneIdField = { type: "string" as const, minLength: 1, maxLength: 120, description: "Existing Forge scene ID." };

export function registerSceneCommands(registry: CommandRegistry<ExperienceConfig>) {
  registry
    .register("scene.add", (input) => {
      const value = input as { sourceSceneId?: string; afterSceneId?: string; label?: string };
      return new AddSceneCommand({ sourceSceneId: value.sourceSceneId, afterSceneId: value.afterSceneId, label: value.label });
    }, {
      label: "Add scene",
      description: "Create a new scene from a valid source structure and rebalance timeline ranges.",
      category: "structure", impact: "project", approval: "auto", reversible: true, agentVisible: true,
      inputSchema: {
        type: "object",
        properties: {
          sourceSceneId: { ...sceneIdField, description: "Optional scene whose valid production structure should be cloned." },
          afterSceneId: { ...sceneIdField, description: "Optional scene after which the new scene should be inserted." },
          label: { type: "string", minLength: 1, maxLength: 100, description: "Optional label for the new scene." },
        },
      },
    })
    .register("scene.rename", (input) => {
      const value = input as { sceneId: string; label: string };
      return new RenameSceneCommand({ sceneId: value.sceneId, label: value.label });
    }, {
      label: "Rename scene",
      description: "Rename one scene without changing its motion, camera or structure.",
      category: "structure", impact: "local", approval: "auto", reversible: true, agentVisible: true,
      inputSchema: {
        type: "object", required: ["sceneId", "label"],
        properties: {
          sceneId: sceneIdField,
          label: { type: "string", minLength: 1, maxLength: 100, description: "New human-readable scene label." },
        },
      },
    })
    .register("scene.move", (input) => {
      const value = input as { sceneId: string; toIndex: number };
      return new MoveSceneCommand({ sceneId: value.sceneId, toIndex: value.toIndex });
    }, {
      label: "Move scene",
      description: "Reorder a scene and normalize all timeline ranges.",
      category: "structure", impact: "project", approval: "auto", reversible: true, agentVisible: true,
      inputSchema: {
        type: "object", required: ["sceneId", "toIndex"],
        properties: {
          sceneId: sceneIdField,
          toIndex: { type: "integer", minimum: 0, description: "Zero-based destination index in the scene list." },
        },
      },
    })
    .register("scene.duplicate", (input) => {
      const value = input as { sceneId: string };
      return new DuplicateSceneCommand({ sceneId: value.sceneId });
    }, {
      label: "Duplicate scene",
      description: "Duplicate a scene with its authored camera, material and motion state.",
      category: "structure", impact: "project", approval: "auto", reversible: true, agentVisible: true,
      inputSchema: { type: "object", required: ["sceneId"], properties: { sceneId: sceneIdField } },
    })
    .register("scene.delete", (input) => {
      const value = input as { sceneId: string };
      return deleteSceneCommand(value.sceneId);
    }, {
      label: "Delete scene",
      description: "Remove a scene and rebalance timeline ranges.",
      category: "structure", impact: "destructive", approval: "required", reversible: true, agentVisible: true,
      inputSchema: { type: "object", required: ["sceneId"], properties: { sceneId: sceneIdField } },
    });
  return registry;
}
