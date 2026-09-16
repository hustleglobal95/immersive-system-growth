import { stateFingerprint } from "@/src/core/journal/stateFingerprint";

export interface ForgeCheckpoint<TState> {
  id: string;
  label: string;
  revision: number;
  fingerprint: string;
  state: TState;
  createdAt: string;
}

export function createForgeCheckpoint<TState>(
  state: TState,
  revision: number,
  label: string,
  options: { id?: string; createdAt?: string } = {},
): ForgeCheckpoint<TState> {
  const snapshot = structuredClone(state);
  const safeLabel = label.trim() || `Revision ${revision}`;
  return {
    id: options.id ?? `checkpoint-r${revision}-${slug(safeLabel) || "state"}`,
    label: safeLabel,
    revision,
    fingerprint: stateFingerprint(snapshot),
    state: snapshot,
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
}

export function validateForgeCheckpoint<TState>(checkpoint: ForgeCheckpoint<TState>) {
  const fingerprint = stateFingerprint(checkpoint.state);
  if (fingerprint !== checkpoint.fingerprint) {
    throw new Error(`Checkpoint ${checkpoint.id} failed integrity validation.`);
  }
  return checkpoint;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}
