import type { ForgeEvent } from "@/src/core/events/eventBus";

export interface CommandError {
  code: string;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface CommandContext<TState> {
  state: TState;
  transactionId?: string;
}

export interface CommandSuccess<TState, TOutput = unknown> {
  ok: true;
  state: TState;
  output: TOutput;
  events: ForgeEvent[];
  inverse?: ForgeCommand<TState, unknown, unknown>;
  affectedIds?: string[];
}

export interface CommandFailure<TState> {
  ok: false;
  state: TState;
  errors: CommandError[];
}

export type CommandResult<TState, TOutput = unknown> = CommandSuccess<TState, TOutput> | CommandFailure<TState>;

export interface ForgeCommand<TState, TInput = unknown, TOutput = unknown> {
  readonly type: string;
  readonly input: TInput;
  validate(context: CommandContext<TState>): CommandError[];
  execute(context: CommandContext<TState>): CommandResult<TState, TOutput>;
}

export function commandFailure<TState>(state: TState, code: string, message: string, details?: Record<string, unknown>): CommandFailure<TState> {
  return { ok: false, state, errors: [{ code, message, details }] };
}
