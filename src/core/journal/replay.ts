import type { CommandError } from "@/src/core/commands/command";
import type { CommandRegistry } from "@/src/core/commands/commandRegistry";
import { runTransaction } from "@/src/core/transactions/transaction";
import type { ForgeJournalEntry } from "@/src/core/journal/commandJournal";
import { stateFingerprint } from "@/src/core/journal/stateFingerprint";

export interface ForgeReplayOptions<TState> {
  validateState?: (state: TState) => CommandError[];
  initialRevision?: number;
}

export interface ForgeReplayResult<TState> {
  ok: boolean;
  state: TState;
  revision: number;
  fingerprint: string;
  appliedEntries: number;
  errors: CommandError[];
}

export function replayForgeJournal<TState>(
  initialState: TState,
  entries: readonly ForgeJournalEntry<TState>[],
  registry: CommandRegistry<TState>,
  options: ForgeReplayOptions<TState> = {},
): ForgeReplayResult<TState> {
  let state = structuredClone(initialState);
  let revision = Math.max(0, options.initialRevision ?? 0);
  let appliedEntries = 0;

  for (const entry of entries) {
    const before = stateFingerprint(state);
    if (entry.revisionBefore !== revision) {
      return failure(state, revision, appliedEntries, "journal.revisionMismatch", `Journal entry ${entry.id} expected revision ${entry.revisionBefore}, replay is at ${revision}.`);
    }
    if (entry.fingerprintBefore !== before) {
      return failure(state, revision, appliedEntries, "journal.fingerprintMismatch", `Journal entry ${entry.id} does not match the current replay fingerprint.`);
    }

    if (entry.operation === "transaction") {
      const commands = entry.commands ?? [];
      try {
        const result = runTransaction(
          state,
          commands.map((command) => registry.create(command.type, command.input)),
          { transactionId: entry.transactionId, validateState: options.validateState },
        );
        if (!result.ok) return { ok: false, state, revision, fingerprint: before, appliedEntries, errors: result.errors };
        state = result.state;
      } catch (error) {
        return failure(state, revision, appliedEntries, "journal.commandUnavailable", error instanceof Error ? error.message : "Replay could not create a journal command.");
      }
    } else {
      if (typeof entry.snapshot === "undefined") {
        return failure(state, revision, appliedEntries, "journal.snapshotMissing", `Journal entry ${entry.id} requires a state snapshot.`);
      }
      const candidate = structuredClone(entry.snapshot);
      const validation = options.validateState?.(candidate) ?? [];
      if (validation.length) return { ok: false, state, revision, fingerprint: before, appliedEntries, errors: validation };
      state = candidate;
    }

    const after = stateFingerprint(state);
    if (after !== entry.fingerprintAfter) {
      return failure(state, revision, appliedEntries, "journal.replayDiverged", `Journal entry ${entry.id} replayed to ${after}, expected ${entry.fingerprintAfter}.`);
    }
    if (entry.revisionAfter <= entry.revisionBefore) {
      return failure(state, revision, appliedEntries, "journal.invalidRevision", `Journal entry ${entry.id} must advance the revision.`);
    }
    revision = entry.revisionAfter;
    appliedEntries++;
  }

  return { ok: true, state, revision, fingerprint: stateFingerprint(state), appliedEntries, errors: [] };
}

function failure<TState>(
  state: TState,
  revision: number,
  appliedEntries: number,
  code: string,
  message: string,
): ForgeReplayResult<TState> {
  return {
    ok: false,
    state: structuredClone(state),
    revision,
    fingerprint: stateFingerprint(state),
    appliedEntries,
    errors: [{ code, message }],
  };
}
