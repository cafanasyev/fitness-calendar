import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateActual } from './workout-validation.js';

describe('validateActual', () => {
  // --- valid inputs ---
  test('null → ok',        () => assert.doesNotThrow(() => validateActual(null)));
  test('undefined → ok',   () => assert.doesNotThrow(() => validateActual(undefined)));
  test('all arrays → ok',  () => assert.doesNotThrow(() => validateActual({ pu: [10,10,10,10,10,10], cr: [15,15,15] })));
  test('all skipped → ok', () => assert.doesNotThrow(() => validateActual({ pu: 'skipped', cr: 'skipped' })));
  test('mixed → ok',       () => assert.doesNotThrow(() => validateActual({ pu: [8,8,8], cr: 'skipped' })));
  test('min rep value 1 → ok',   () => assert.doesNotThrow(() => validateActual({ pu: [1] })));
  test('max rep value 999 → ok', () => assert.doesNotThrow(() => validateActual({ pu: [999] })));

  // --- invalid: non-array, non-skipped ---
  test('string value → throws',  () => assert.throws(() => validateActual({ pu: 'done' }),    /Invalid/));
  test('number value → throws',  () => assert.throws(() => validateActual({ pu: 10 }),        /Invalid/));
  test('null value → throws',    () => assert.throws(() => validateActual({ pu: null }),      /Invalid/));
  test('object value → throws',  () => assert.throws(() => validateActual({ pu: {} }),        /Invalid/));

  // --- invalid: bad reps inside array ---
  test('zero rep → throws',      () => assert.throws(() => validateActual({ pu: [0] }),       /Invalid/));
  test('negative rep → throws',  () => assert.throws(() => validateActual({ pu: [-1] }),      /Invalid/));
  test('rep > 999 → throws',     () => assert.throws(() => validateActual({ pu: [1000] }),    /Invalid/));
  test('float rep → throws',     () => assert.throws(() => validateActual({ pu: [8.5] }),     /Invalid/));
  test('NaN rep → throws',       () => assert.throws(() => validateActual({ pu: [NaN] }),     /Invalid/));
  test('string rep → throws',    () => assert.throws(() => validateActual({ pu: ['10'] }),    /Invalid/));
  test('null rep → throws',      () => assert.throws(() => validateActual({ pu: [null] }),    /Invalid/));

  // --- mixed keys: valid key + invalid key ---
  test('one valid one invalid → throws', () =>
    assert.throws(() => validateActual({ pu: [10,10], cr: [-1] }), /Invalid/));
});
