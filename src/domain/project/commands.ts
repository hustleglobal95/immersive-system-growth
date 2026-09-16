import type { ForgeCommand, CommandContext, CommandResult } from "@/src/core/commands/command";
import { commandFailure } from "@/src/core/commands/command";
import { forgeEvent } from "@/src/core/events/eventBus";
import { parseExperience } from "@/src/lib/configSchema";
import type { ExperienceConfig } from "@/src/types/experience";

export class ReplaceExperienceCommand implements ForgeCommand<ExperienceConfig, { experience: unknown; reason?: string }, { name: string }> {
  readonly type = "experience.replace";
  constructor(readonly input: { experience: unknown; reason?: string }) {}

  validate() {
    try {
      parseExperience(this.input.experience);
      return [];
    } catch (error) {
      return [{ code: "experience.invalid", message: error instanceof Error ? error.message : "Experience replacement failed validation." }];
    }
  }

  execute({ state, transactionId }: CommandContext<ExperienceConfig>): CommandResult<ExperienceConfig, { name: string }> {
    let next: ExperienceConfig;
    try {
      next = parseExperience(structuredClone(this.input.experience));
    } catch (error) {
      return commandFailure(state, "experience.invalid", error instanceof Error ? error.message : "Experience replacement failed validation.");
    }
    return {
      ok: true,
      state: next,
      output: { name: next.meta.name },
      events: [forgeEvent("experience.replaced", { name: next.meta.name, reason: this.input.reason }, transactionId)],
      inverse: new ReplaceExperienceCommand({ experience: structuredClone(state), reason: "undo" }) as ForgeCommand<ExperienceConfig, unknown, unknown>,
    };
  }
}
