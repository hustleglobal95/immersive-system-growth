import type { ExperienceConfig } from "@/src/types/experience";
import { CommandRegistry } from "@/src/core/commands/commandRegistry";
import { DuplicateSceneCommand, MoveSceneCommand, RenameSceneCommand, deleteSceneCommand } from "@/src/domain/scene/commands";

export function registerSceneCommands(registry: CommandRegistry<ExperienceConfig>) {
  registry
    .register("scene.rename", (input) => {
      const value = input as { sceneId?: string; label?: string };
      return new RenameSceneCommand({ sceneId: String(value.sceneId ?? ""), label: String(value.label ?? "") });
    })
    .register("scene.move", (input) => {
      const value = input as { sceneId?: string; toIndex?: number };
      return new MoveSceneCommand({ sceneId: String(value.sceneId ?? ""), toIndex: Number(value.toIndex) });
    })
    .register("scene.duplicate", (input) => {
      const value = input as { sceneId?: string };
      return new DuplicateSceneCommand({ sceneId: String(value.sceneId ?? "") });
    })
    .register("scene.delete", (input) => {
      const value = input as { sceneId?: string };
      return deleteSceneCommand(String(value.sceneId ?? ""));
    });
  return registry;
}
