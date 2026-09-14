import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDraft, persistDraft, storageRecoveryMessage, storageUnavailableMessage, type DraftStorage } from '../src/studio/draftStorage';

function memory(initial: string | null = null) {
  let value = initial;
  let writes = 0;
  const storage: DraftStorage = { getItem: () => value, setItem: (_key, next) => { value = next; writes++; } };
  return { storage, value: () => value, writes: () => writes };
}

test('draft storage hydrates valid data without a write', () => {
  const m = memory('{"version":1}');
  assert.deepEqual(loadDraft(() => m.storage, 'draft', JSON.parse), { kind: 'loaded', value: { version: 1 } });
  assert.equal(m.writes(), 0);
});
test('draft storage distinguishes empty from malformed JSON', () => {
  assert.deepEqual(loadDraft(() => memory().storage, 'draft', JSON.parse), { kind: 'empty' });
  const m = memory('');
  assert.deepEqual(loadDraft(() => m.storage, 'draft', JSON.parse), { kind: 'unreadable', raw: '' });
  assert.equal(m.value(), '');
});
test('schema rejection preserves the exact original draft', () => {
  const raw = '{ "futureSchema": 99 }\n';
  const m = memory(raw);
  assert.deepEqual(loadDraft(() => m.storage, 'draft', () => { throw new Error('schema mismatch'); }), { kind: 'unreadable', raw });
  assert.equal(m.value(), raw);
  assert.equal(m.writes(), 0);
});
test('recovery lock blocks even a valid replacement', () => {
  const m = memory('broken original');
  assert.equal(persistDraft(() => m.storage, 'draft', { valid: true }, true), storageRecoveryMessage);
  assert.equal(m.value(), 'broken original');
  assert.equal(m.writes(), 0);
});
test('denied storage getter does not escape into React', () => {
  const denied = () => { throw new Error('SecurityError'); };
  assert.deepEqual(loadDraft(denied, 'draft', JSON.parse), { kind: 'unavailable' });
  assert.equal(persistDraft(denied, 'draft', {}), storageUnavailableMessage);
});
test('full storage retains the existing draft and reports memory-only changes', () => {
  const original = '{"saved":true}';
  const storage: DraftStorage = { getItem: () => original, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(persistDraft(() => storage, 'draft', { changed: true }), storageUnavailableMessage);
  assert.equal(storage.getItem('draft'), original);
});
test('successful retry persists the new draft and clears the warning', () => {
  const m = memory();
  assert.equal(persistDraft(() => m.storage, 'draft', { changed: true }), '');
  assert.equal(m.value(), '{"changed":true}');
});
