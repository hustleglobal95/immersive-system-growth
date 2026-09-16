import type { ForgeCommand } from "@/src/core/commands/command";
import type { CommandRegistry } from "@/src/core/commands/commandRegistry";
import type { ForgeMutationSource } from "@/src/core/journal/commandJournal";

export interface ForgeApprovalRecord {
  by: string;
  commandTypes: string[];
  reason?: string;
  at?: string;
}

export interface ForgeCommandPolicyContext {
  source?: ForgeMutationSource;
  dryRun?: boolean;
  approval?: ForgeApprovalRecord;
}

export interface ForgeCommandPolicyDecision {
  allowed: boolean;
  errors: Array<{ code: string; message: string; details?: Record<string, unknown> }>;
  requiredApprovals: string[];
}

export function evaluateCommandPolicy<TState>(
  registry: CommandRegistry<TState>,
  commands: readonly ForgeCommand<TState, unknown, unknown>[],
  context: ForgeCommandPolicyContext,
): ForgeCommandPolicyDecision {
  const source = context.source;
  const headless = source === "ai" || source === "cli" || source === "replay" || Boolean(source?.startsWith("custom:"));
  if (!headless || source === "replay") return { allowed: true, errors: [], requiredApprovals: [] };

  const approved = new Set(context.approval?.commandTypes ?? []);
  const errors: ForgeCommandPolicyDecision["errors"] = [];
  const requiredApprovals = new Set<string>();

  for (const command of commands) {
    const descriptor = registry.describe(command.type);
    if (!descriptor.agentVisible && source === "ai") {
      errors.push({
        code: "engine.command.notAgentVisible",
        message: `Command ${command.type} is not exposed for autonomous AI execution.`,
        details: { commandType: command.type },
      });
      continue;
    }

    if (descriptor.approval === "auto") continue;
    if (context.dryRun) continue;
    requiredApprovals.add(command.type);
    if (!approved.has(command.type)) {
      errors.push({
        code: "engine.approval.required",
        message: `${descriptor.label} requires explicit approval before ${source} execution.`,
        details: {
          commandType: command.type,
          approval: descriptor.approval,
          impact: descriptor.impact,
          reversible: descriptor.reversible,
        },
      });
    }
  }

  if (context.approval && !context.approval.by.trim()) {
    errors.push({ code: "engine.approval.invalid", message: "Approval records must identify who approved the command." });
  }

  return { allowed: errors.length === 0, errors, requiredApprovals: [...requiredApprovals].sort() };
}
