/** Storage failures must not destroy the last recoverable Studio document. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type DraftLoad<T> =
  | { kind: 'empty' }
  | { kind: 'loaded'; value: T }
  | { kind: 'unreadable'; raw: string }
  | { kind: 'unavailable' };

export function loadDraft<T>(getStorage: () => DraftStorage, key: string, decode: (raw: string) => T): DraftLoad<T> {
  let raw: string | null;
  try { raw = getStorage().getItem(key); }
  catch { return { kind: 'unavailable' }; }
  if (raw === null) return { kind: 'empty' };
  try { return { kind: 'loaded', value: decode(raw) }; }
  catch { return { kind: 'unreadable', raw }; }
}

export const storageUnavailableMessage = 'Changes are only in memory: browser storage is unavailable or full. Export JSON before leaving.';
export const storageRecoveryMessage = 'The saved browser draft could not be opened. Its original contents are preserved and autosave is paused. Export a recovery copy before using Reset draft.';

export function persistDraft(getStorage: () => DraftStorage, key: string, value: unknown, recoveryLocked = false): string {
  if (recoveryLocked) return storageRecoveryMessage;
  try {
    const raw = JSON.stringify(value);
    if (raw === undefined) return storageUnavailableMessage;
    getStorage().setItem(key, raw);
    return '';
  } catch { return storageUnavailableMessage; }
}
