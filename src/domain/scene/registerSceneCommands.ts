import type { ExperienceConfig } from "@/src/types/experience";
import { CommandRegistry } from "@/src/core/commands/commandRegistry";
import { AddSceneCommand, DuplicateSceneCommand, MoveSceneCommand, RenameSceneCommand, deleteSceneCommand } from "@/src/domain/scene/commands";

export function registerSceneCommands(registry: CommandRegistry<ExperienceConfig>) {
  registry
    .register("scene.add", (input) => {
      const value = input as { sourceSceneId?: string; afterSceneId?: string; label?: string };
      return new AddSceneCommand({ sourceSceneId: value.sourceSceneId, afterSceneId: value.afterSceneId, label: value.label });
    }, {
      label: "Add scene",
      description: "Create a new scene from a valid source structure and rebalance timeline ranges.",
      category: "structure",
      impact: "project",
      approval: "auto",
      reversible: true,
      agentVisible: true,
    })
    .register("scene.rename", (input) => {
      const value = input as { sceneId?: string; label?: string };
      return new RenameSceneCommand({ sceneId: String(value.sceneId ?? ""), label: String(value.label ?? "") });
    }, {
      label: "Rename scene",
      description: "Rename one scene without changing its motion, camera or structure.",
      category: "structure",
      impact: "local",
      approval: "auto",
      reversible: true,
      agentVisible: true,
    })
    .register("scene.move", (input) => {
      const value = input as { sceneId?: string; toIndex?: number };
      return new MoveSceneCommand({ sceneId: String(value.sceneId ?? ""), toIndex: Number(value.toIndex) });
    }, {
      label: "Move scene",
      description: "Reorder a scene and normalize all timeline ranges.",
      category: "structure",
      impact: "project",
      approval: "auto",
      reversible: true,
      agentVisible: true,
    })
    .register("scene.duplicate", (input) => {
      const value = input as { sceneId?: string };
      return new DuplicateSceneCommand({ sceneId: String(value.sceneId ?? "") });
    }, {
      label: "Duplicate scene",
      description: "Duplicate a scene with its authored camera, material and motion state.",
      category: "structure",
      impact: "project",
      approval: "auto",
      reversible: true,
      agentVisible: true,
    })
    .register("scene.delete", (input) => {
      const value = input as { sceneId?: string };
      return deleteSceneCommand(String(value.sceneId ?? ""));
    }, {
      label: "Delete scene",
      description: "Remove a scene and rebalance timeline ranges.",
      category: "structure",
      impact: "destructive",
      approval: "required",
      reversible: true,
      agentVisible: true,
    });
  return registry;
}
