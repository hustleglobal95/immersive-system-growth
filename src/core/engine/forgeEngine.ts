import type { ForgeCommand, CommandError } from "@/src/core/commands/command";
import { CommandRegistry } from "@/src/core/commands/commandRegistry";
import { ForgeEventBus, type ForgeEvent } from "@/src/core/events/eventBus";
import { CapabilityRegistry } from "@/src/core/registry/capabilityRegistry";
import type { ForgeInvariant } from "@/src/core/invariants/invariants";
import { validateInvariants } from "@/src/core/invariants/invariants";
import { runTransaction } from "@/src/core/transactions/transaction";

export interface ForgeEngineOptions<TState> {
  commandRegistry?: CommandRegistry<TState>;
  capabilityRegistry?: CapabilityRegistry;
  eventBus?: ForgeEventBus;
  invariants?: readonly ForgeInvariant<TState>[];
  historyLimit?: number;
}

export interface ForgeEngineResult<TState> {
  ok: boolean;
  state: TState;
  events: ForgeEvent[];
  errors: CommandError[];
  dryRun?: boolean;
}

export interface ForgeEngineSnapshot<TState> {
  state: TState;
  canUndo: boolean;
  canRedo: boolean;
}

export class ForgeEngine<TState> {
  private state: TState;
  readonly commands: CommandRegistry<TState>;
  readonly capabilities: CapabilityRegistry;
  readonly events: ForgeEventBus;
  private readonly invariants: readonly ForgeInvariant<TState>[];
  private readonly historyLimit: number;
  private readonly undoStack: TState[] = [];
  private readonly redoStack: TState[] = [];
  private readonly listeners = new Set<(snapshot: ForgeEngineSnapshot<TState>) => void>();

  constructor(initialState: TState, options: ForgeEngineOptions<TState> = {}) {
    this.state = structuredClone(initialState);
    this.commands = options.commandRegistry ?? new CommandRegistry<TState>();
    this.capabilities = options.capabilityRegistry ?? new CapabilityRegistry();
    this.events = options.eventBus ?? new ForgeEventBus();
    this.invariants = options.invariants ?? [];
    this.historyLimit = Math.max(1, options.historyLimit ?? 100);
    const violations = validateInvariants(this.state, this.invariants).filter((item) => item.level === "error");
    if (violations.length) throw new Error(`Invalid initial Forge state: ${violations.map((item) => item.message).join("; ")}`);
  }

  getState() {
    return structuredClone(this.state);
  }

  snapshot(): ForgeEngineSnapshot<TState> {
    return { state: this.getState(), canUndo: this.undoStack.length > 0, canRedo: this.redoStack.length > 0 };
  }

  subscribe(listener: (snapshot: ForgeEngineSnapshot<TState>) => void) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  replaceState(next: TState, options: { clearHistory?: boolean } = {}) {
    const violations = validateInvariants(next, this.invariants).filter((item) => item.level === "error");
    if (violations.length) throw new Error(`Cannot replace Forge state: ${violations.map((item) => item.message).join("; ")}`);
    this.state = structuredClone(next);
    if (options.clearHistory ?? true) {
      this.undoStack.length = 0;
      this.redoStack.length = 0;
    }
    this.publish();
  }

  dispatch(command: ForgeCommand<TState, unknown, unknown>, options: { transactionId?: string; dryRun?: boolean } = {}): ForgeEngineResult<TState> {
    return this.run([command], options);
  }

  dispatchRegistered(type: string, input: unknown, options: { transactionId?: string; dryRun?: boolean } = {}) {
    return this.dispatch(this.commands.create(type, input), options);
  }

  transaction(commands: ForgeCommand<TState, unknown, unknown>[], options: { transactionId?: string; dryRun?: boolean } = {}): ForgeEngineResult<TState> {
    return this.run(commands, options);
  }

  transactionRegistered(items: Array<{ type: string; input: unknown }>, options: { transactionId?: string; dryRun?: boolean } = {}) {
    return this.transaction(items.map((item) => this.commands.create(item.type, item.input)), options);
  }

  undo() {
    const previous = this.undoStack.pop();
    if (!previous) return false;
    this.redoStack.push(structuredClone(this.state));
    this.state = previous;
    this.publish();
    return true;
  }

  redo() {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(structuredClone(this.state));
    this.trimHistory();
    this.state = next;
    this.publish();
    return true;
  }

  validate() {
    return validateInvariants(this.state, this.invariants);
  }

  private run(commands: ForgeCommand<TState, unknown, unknown>[], options: { transactionId?: string; dryRun?: boolean }): ForgeEngineResult<TState> {
    const before = structuredClone(this.state);
    const result = runTransaction(this.state, commands, {
      transactionId: options.transactionId,
      validateState: (state) => validateInvariants(state, this.invariants)
        .filter((item) => item.level === "error")
        .map((item) => ({ code: item.code, message: item.message, path: item.path, details: item.details })),
    });
    if (!result.ok) return { ok: false, state: this.getState(), events: [], errors: result.errors, dryRun: options.dryRun };
    if (options.dryRun) return { ok: true, state: structuredClone(result.state), events: result.events, errors: [], dryRun: true };

    this.undoStack.push(before);
    this.trimHistory();
    this.redoStack.length = 0;
    this.state = structuredClone(result.state);
    for (const event of result.events) this.events.emit(event);
    this.publish();
    return { ok: true, state: this.getState(), events: result.events, errors: [] };
  }

  private trimHistory() {
    if (this.undoStack.length > this.historyLimit) this.undoStack.splice(0, this.undoStack.length - this.historyLimit);
    if (this.redoStack.length > this.historyLimit) this.redoStack.splice(0, this.redoStack.length - this.historyLimit);
  }

  private publish() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
