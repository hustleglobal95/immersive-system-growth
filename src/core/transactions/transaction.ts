import type { ForgeCommand, CommandError } from "@/src/core/commands/command";
import type { ForgeEvent } from "@/src/core/events/eventBus";

export interface TransactionResult<TState> {
  ok: boolean;
  state: TState;
  events: ForgeEvent[];
  errors: CommandError[];
  inverseCommands: ForgeCommand<TState, unknown, unknown>[];
  affectedIds: string[];
}

export interface TransactionOptions<TState> {
  transactionId?: string;
  validateState?: (state: TState) => CommandError[];
}

export function runTransaction<TState>(
  initialState: TState,
  commands: ForgeCommand<TState, unknown, unknown>[],
  options: TransactionOptions<TState> = {},
): TransactionResult<TState> {
  let state = structuredClone(initialState);
  const events: ForgeEvent[] = [];
  const inverseCommands: ForgeCommand<TState, unknown, unknown>[] = [];
  const affectedIds = new Set<string>();

  for (const command of commands) {
    const validation = command.validate({ state, transactionId: options.transactionId });
    if (validation.length) return { ok: false, state: structuredClone(initialState), events: [], errors: validation, inverseCommands: [], affectedIds: [] };

    const result = command.execute({ state, transactionId: options.transactionId });
    if (!result.ok) return { ok: false, state: structuredClone(initialState), events: [], errors: result.errors, inverseCommands: [], affectedIds: [] };

    state = result.state;
    events.push(...result.events);
    for (const id of result.affectedIds ?? []) affectedIds.add(id);
    if (result.inverse) inverseCommands.unshift(result.inverse);
  }

  const invariantErrors = options.validateState?.(state) ?? [];
  if (invariantErrors.length)
    return { ok: false, state: structuredClone(initialState), events: [], errors: invariantErrors, inverseCommands: [], affectedIds: [] };

  return { ok: true, state, events, errors: [], inverseCommands, affectedIds: [...affectedIds] };
}
