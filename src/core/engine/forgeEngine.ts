import type { ForgeCommand, CommandError } from "@/src/core/commands/command";
import { CommandRegistry } from "@/src/core/commands/commandRegistry";
import type { ForgeApprovalRecord } from "@/src/core/commands/commandPolicy";
import { evaluateCommandPolicy } from "@/src/core/commands/commandPolicy";
import { ForgeEventBus, type ForgeEvent } from "@/src/core/events/eventBus";
import { CapabilityRegistry } from "@/src/core/registry/capabilityRegistry";
import type { ForgeInvariant } from "@/src/core/invariants/invariants";
import { validateInvariants } from "@/src/core/invariants/invariants";
import { runTransaction } from "@/src/core/transactions/transaction";
import type { ForgeJournalEntry, ForgeMutationReceipt, ForgeMutationSource } from "@/src/core/journal/commandJournal";
import { cloneJournal } from "@/src/core/journal/commandJournal";
import { stateFingerprint } from "@/src/core/journal/stateFingerprint";
import type { ForgeCheckpoint } from "@/src/core/checkpoints/checkpoint";
import { createForgeCheckpoint, validateForgeCheckpoint } from "@/src/core/checkpoints/checkpoint";

export interface ForgeEngineOptions<TState> {
  commandRegistry?: CommandRegistry<TState>;
  capabilityRegistry?: CapabilityRegistry;
  eventBus?: ForgeEventBus;
  invariants?: readonly ForgeInvariant<TState>[];
  historyLimit?: number;
  journalLimit?: number;
  initialRevision?: number;
  initialJournal?: readonly ForgeJournalEntry<TState>[];
}

export interface ForgeExecutionOptions {
  transactionId?: string;
  dryRun?: boolean;
  expectedRevision?: number;
  actor?: string;
  source?: ForgeMutationSource;
  approval?: ForgeApprovalRecord;
}

export interface ForgeEngineResult<TState> {
  ok: boolean;
  state: TState;
  events: ForgeEvent[];
  errors: CommandError[];
  dryRun?: boolean;
  revisionBefore: number;
  revisionAfter: number;
  fingerprintBefore: string;
  fingerprintAfter: string;
  receipt: ForgeMutationReceipt;
}

export interface ForgeEngineSnapshot<TState> {
  state: TState;
  canUndo: boolean;
  canRedo: boolean;
  revision: number;
  fingerprint: string;
}

export class ForgeEngine<TState> {
  private state: TState;
  readonly commands: CommandRegistry<TState>;
  readonly capabilities: CapabilityRegistry;
  readonly events: ForgeEventBus;
  private readonly invariants: readonly ForgeInvariant<TState>[];
  private readonly historyLimit: number;
  private readonly journalLimit: number;
  private readonly undoStack: TState[] = [];
  private readonly redoStack: TState[] = [];
  private readonly listeners = new Set<(snapshot: ForgeEngineSnapshot<TState>) => void>();
  private readonly journal: ForgeJournalEntry<TState>[];
  private revision: number;
  private sequence: number;
  private receiptSequence = 0;

  constructor(initialState: TState, options: ForgeEngineOptions<TState> = {}) {
    this.state = structuredClone(initialState);
    this.commands = options.commandRegistry ?? new CommandRegistry<TState>();
    this.capabilities = options.capabilityRegistry ?? new CapabilityRegistry();
    this.events = options.eventBus ?? new ForgeEventBus();
    this.invariants = options.invariants ?? [];
    this.historyLimit = Math.max(1, options.historyLimit ?? 100);
    this.journalLimit = Math.max(1, options.journalLimit ?? 5000);
    this.journal = cloneJournal(options.initialJournal ?? []);
    const lastEntry = this.journal.at(-1);
    this.revision = Math.max(0, options.initialRevision ?? lastEntry?.revisionAfter ?? 0);
    this.sequence = this.journal.reduce((max, entry) => Math.max(max, entry.sequence), 0);

    const violations = validateInvariants(this.state, this.invariants).filter((item) => item.level === "error");
    if (violations.length) throw new Error(`Invalid initial Forge state: ${violations.map((item) => item.message).join("; ")}`);
    if (lastEntry) {
      if (lastEntry.revisionAfter !== this.revision) throw new Error("Initial Forge journal revision does not match engine revision.");
      if (lastEntry.fingerprintAfter !== stateFingerprint(this.state)) throw new Error("Initial Forge journal does not match engine state fingerprint.");
    }
  }

  getState() {
    return structuredClone(this.state);
  }

  getRevision() {
    return this.revision;
  }

  getFingerprint() {
    return stateFingerprint(this.state);
  }

  getJournal() {
    return cloneJournal(this.journal);
  }

  snapshot(): ForgeEngineSnapshot<TState> {
    return {
      state: this.getState(),
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      revision: this.revision,
      fingerprint: this.getFingerprint(),
    };
  }

  subscribe(listener: (snapshot: ForgeEngineSnapshot<TState>) => void) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  replaceState(next: TState, options: { clearHistory?: boolean; actor?: string; source?: ForgeMutationSource; reason?: string } = {}) {
    const violations = validateInvariants(next, this.invariants).filter((item) => item.level === "error");
    if (violations.length) throw new Error(`Cannot replace Forge state: ${violations.map((item) => item.message).join("; ")}`);
    const before = structuredClone(this.state);
    const fingerprintBefore = stateFingerprint(before);
    const replacement = structuredClone(next);
    const fingerprintAfter = stateFingerprint(replacement);
    if (fingerprintBefore === fingerprintAfter) return;

    const revisionBefore = this.revision;
    this.state = replacement;
    this.revision++;
    if (options.clearHistory ?? true) {
      this.undoStack.length = 0;
      this.redoStack.length = 0;
    }
    this.appendJournal({
      operation: "replace",
      revisionBefore,
      revisionAfter: this.revision,
      fingerprintBefore,
      fingerprintAfter,
      actor: options.actor,
      source: options.source,
      snapshot: this.getState(),
      events: [],
      transactionId: options.reason ? `replace:${options.reason}` : undefined,
    });
    this.publish();
  }

  dispatch(command: ForgeCommand<TState, unknown, unknown>, options: ForgeExecutionOptions = {}): ForgeEngineResult<TState> {
    return this.run([command], options);
  }

  dispatchRegistered(type: string, input: unknown, options: ForgeExecutionOptions = {}) {
    return this.dispatch(this.commands.create(type, input), options);
  }

  transaction(commands: ForgeCommand<TState, unknown, unknown>[], options: ForgeExecutionOptions = {}): ForgeEngineResult<TState> {
    return this.run(commands, options);
  }

  transactionRegistered(items: Array<{ type: string; input: unknown }>, options: ForgeExecutionOptions = {}) {
    return this.transaction(items.map((item) => this.commands.create(item.type, item.input)), options);
  }

  createCheckpoint(label: string, id?: string): ForgeCheckpoint<TState> {
    return createForgeCheckpoint(this.state, this.revision, label, { id });
  }

  restoreCheckpoint(checkpoint: ForgeCheckpoint<TState>, options: { expectedRevision?: number; actor?: string; source?: ForgeMutationSource } = {}) {
    validateForgeCheckpoint(checkpoint);
    if (typeof options.expectedRevision === "number" && options.expectedRevision !== this.revision) {
      throw new Error(`Cannot restore checkpoint: expected revision ${options.expectedRevision}, current revision is ${this.revision}.`);
    }
    const violations = validateInvariants(checkpoint.state, this.invariants).filter((item) => item.level === "error");
    if (violations.length) throw new Error(`Cannot restore checkpoint: ${violations.map((item) => item.message).join("; ")}`);

    const before = structuredClone(this.state);
    const fingerprintBefore = stateFingerprint(before);
    const next = structuredClone(checkpoint.state);
    const fingerprintAfter = stateFingerprint(next);
    if (fingerprintBefore === fingerprintAfter) return false;

    const revisionBefore = this.revision;
    this.undoStack.push(before);
    this.trimHistory();
    this.redoStack.length = 0;
    this.state = next;
    this.revision++;
    this.appendJournal({
      operation: "checkpoint-restore",
      revisionBefore,
      revisionAfter: this.revision,
      fingerprintBefore,
      fingerprintAfter,
      actor: options.actor,
      source: options.source,
      snapshot: this.getState(),
      events: [],
      transactionId: `checkpoint:${checkpoint.id}`,
    });
    this.publish();
    return true;
  }

  undo() {
    const previous = this.undoStack.pop();
    if (!previous) return false;
    const fingerprintBefore = this.getFingerprint();
    const revisionBefore = this.revision;
    this.redoStack.push(structuredClone(this.state));
    this.state = previous;
    this.revision++;
    const fingerprintAfter = this.getFingerprint();
    this.appendJournal({
      operation: "undo",
      revisionBefore,
      revisionAfter: this.revision,
      fingerprintBefore,
      fingerprintAfter,
      snapshot: this.getState(),
      events: [],
      source: "system",
    });
    this.publish();
    return true;
  }

  redo() {
    const next = this.redoStack.pop();
    if (!next) return false;
    const fingerprintBefore = this.getFingerprint();
    const revisionBefore = this.revision;
    this.undoStack.push(structuredClone(this.state));
    this.trimHistory();
    this.state = next;
    this.revision++;
    const fingerprintAfter = this.getFingerprint();
    this.appendJournal({
      operation: "redo",
      revisionBefore,
      revisionAfter: this.revision,
      fingerprintBefore,
      fingerprintAfter,
      snapshot: this.getState(),
      events: [],
      source: "system",
    });
    this.publish();
    return true;
  }

  validate() {
    return validateInvariants(this.state, this.invariants);
  }

  private run(commands: ForgeCommand<TState, unknown, unknown>[], options: ForgeExecutionOptions): ForgeEngineResult<TState> {
    const before = structuredClone(this.state);
    const revisionBefore = this.revision;
    const fingerprintBefore = stateFingerprint(before);

    if (typeof options.expectedRevision === "number" && options.expectedRevision !== revisionBefore) {
      const errors: CommandError[] = [{
        code: "engine.revision.conflict",
        message: `Expected Forge revision ${options.expectedRevision}, current revision is ${revisionBefore}.`,
        details: { expectedRevision: options.expectedRevision, currentRevision: revisionBefore },
      }];
      return this.failureResult(before, errors, options, revisionBefore, fingerprintBefore);
    }

    const policy = evaluateCommandPolicy(this.commands, commands, {
      source: options.source,
      dryRun: options.dryRun,
      approval: options.approval,
    });
    if (!policy.allowed) return this.failureResult(before, policy.errors, options, revisionBefore, fingerprintBefore);

    const result = runTransaction(this.state, commands, {
      transactionId: options.transactionId,
      validateState: (state) => validateInvariants(state, this.invariants)
        .filter((item) => item.level === "error")
        .map((item) => ({ code: item.code, message: item.message, path: item.path, details: item.details })),
    });
    if (!result.ok) return this.failureResult(before, result.errors, options, revisionBefore, fingerprintBefore);

    const fingerprintAfter = stateFingerprint(result.state);
    const approval = normalizeApproval(options.approval);
    if (options.dryRun) {
      const receipt = this.receipt({
        accepted: true,
        dryRun: true,
        revisionBefore,
        revisionAfter: revisionBefore,
        fingerprintBefore,
        fingerprintAfter,
        transactionId: options.transactionId,
        actor: options.actor,
        source: options.source,
        approval,
        affectedIds: result.affectedIds,
        eventTypes: result.events.map((event) => event.type),
        errors: [],
      });
      return {
        ok: true,
        state: structuredClone(result.state),
        events: result.events,
        errors: [],
        dryRun: true,
        revisionBefore,
        revisionAfter: revisionBefore,
        fingerprintBefore,
        fingerprintAfter,
        receipt,
      };
    }

    this.undoStack.push(before);
    this.trimHistory();
    this.redoStack.length = 0;
    this.state = structuredClone(result.state);
    this.revision++;
    const revisionAfter = this.revision;
    const journalEntry = this.appendJournal({
      operation: "transaction",
      revisionBefore,
      revisionAfter,
      fingerprintBefore,
      fingerprintAfter,
      transactionId: options.transactionId,
      actor: options.actor,
      source: options.source,
      approval,
      commands: commands.map((command) => ({ type: command.type, input: structuredClone(command.input) })),
      events: result.events.map((event) => ({ type: event.type, payload: structuredClone(event.payload) })),
    });
    for (const event of result.events) this.events.emit(event);
    this.publish();

    const receipt = this.receipt({
      accepted: true,
      dryRun: false,
      revisionBefore,
      revisionAfter,
      fingerprintBefore,
      fingerprintAfter,
      transactionId: options.transactionId ?? journalEntry.transactionId,
      actor: options.actor,
      source: options.source,
      approval,
      affectedIds: result.affectedIds,
      eventTypes: result.events.map((event) => event.type),
      errors: [],
    });
    return {
      ok: true,
      state: this.getState(),
      events: result.events,
      errors: [],
      revisionBefore,
      revisionAfter,
      fingerprintBefore,
      fingerprintAfter,
      receipt,
    };
  }

  private failureResult(
    state: TState,
    errors: CommandError[],
    options: ForgeExecutionOptions,
    revision: number,
    fingerprint: string,
  ): ForgeEngineResult<TState> {
    const receipt = this.receipt({
      accepted: false,
      dryRun: Boolean(options.dryRun),
      revisionBefore: revision,
      revisionAfter: revision,
      fingerprintBefore: fingerprint,
      fingerprintAfter: fingerprint,
      transactionId: options.transactionId,
      actor: options.actor,
      source: options.source,
      approval: normalizeApproval(options.approval),
      affectedIds: [],
      eventTypes: [],
      errors: structuredClone(errors),
    });
    return {
      ok: false,
      state: structuredClone(state),
      events: [],
      errors,
      dryRun: options.dryRun,
      revisionBefore: revision,
      revisionAfter: revision,
      fingerprintBefore: fingerprint,
      fingerprintAfter: fingerprint,
      receipt,
    };
  }

  private receipt(input: Omit<ForgeMutationReceipt, "id">): ForgeMutationReceipt {
    return { id: `receipt-${++this.receiptSequence}`, ...input };
  }

  private appendJournal(input: Omit<ForgeJournalEntry<TState>, "id" | "sequence" | "createdAt">) {
    const sequence = ++this.sequence;
    const entry: ForgeJournalEntry<TState> = {
      id: `journal-${sequence}`,
      sequence,
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.journal.push(entry);
    if (this.journal.length > this.journalLimit) this.journal.splice(0, this.journal.length - this.journalLimit);
    return entry;
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

function normalizeApproval(approval?: ForgeApprovalRecord): ForgeApprovalRecord | undefined {
  if (!approval) return undefined;
  return {
    ...structuredClone(approval),
    commandTypes: [...new Set(approval.commandTypes)].sort(),
    at: approval.at ?? new Date().toISOString(),
  };
}
