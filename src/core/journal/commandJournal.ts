import type { CommandError } from "@/src/core/commands/command";
import type { ForgeApprovalRecord } from "@/src/core/commands/commandPolicy";
import type { ForgeEvent } from "@/src/core/events/eventBus";

export type ForgeMutationSource = "studio" | "cli" | "ai" | "system" | "replay" | `custom:${string}`;

export interface ForgeJournalCommand {
  type: string;
  input: unknown;
}

export type ForgeJournalOperation = "transaction" | "replace" | "undo" | "redo" | "checkpoint-restore";

export interface ForgeJournalEntry<TState = unknown> {
  id: string;
  sequence: number;
  operation: ForgeJournalOperation;
  revisionBefore: number;
  revisionAfter: number;
  fingerprintBefore: string;
  fingerprintAfter: string;
  transactionId?: string;
  actor?: string;
  source?: ForgeMutationSource;
  approval?: ForgeApprovalRecord;
  commands?: ForgeJournalCommand[];
  snapshot?: TState;
  events: Array<Pick<ForgeEvent, "type" | "payload">>;
  createdAt: string;
}

export interface ForgeMutationReceipt {
  id: string;
  accepted: boolean;
  dryRun: boolean;
  revisionBefore: number;
  revisionAfter: number;
  fingerprintBefore: string;
  fingerprintAfter: string;
  transactionId?: string;
  actor?: string;
  source?: ForgeMutationSource;
  approval?: ForgeApprovalRecord;
  affectedIds: string[];
  eventTypes: string[];
  errors: CommandError[];
}

export function cloneJournal<TState>(entries: readonly ForgeJournalEntry<TState>[]) {
  return structuredClone(entries) as ForgeJournalEntry<TState>[];
}
