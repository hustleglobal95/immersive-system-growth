import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldNumber } from '../src/studio/pro/EditableFields';
test('incomplete numeric typing does not become zero or NaN in a project', () => {
  for (const text of ['', ' ', '-', '.', '1e', 'NaN', 'Infinity']) assert.equal(fieldNumber(text), null, text);
});
test('negative and fractional camera values remain precise', () => {
  assert.equal(fieldNumber('-5.05'), -5.05); assert.equal(fieldNumber('-.125'), -.125); assert.equal(fieldNumber('0'), 0);
});
test('blur normalization respects bounded controls', () => {
  assert.equal(fieldNumber('100', 15, 90), 90); assert.equal(fieldNumber('3', 15, 90), 15);
  assert.equal(fieldNumber('72', 15, 90), 72); assert.equal(fieldNumber('', 15, 90), null);
});
