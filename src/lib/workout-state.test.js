import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { canSave, buildActual, applyEditAll } from './workout-state.js';

describe('canSave', () => {
  test('empty state → false',             () => assert.strictEqual(canSave({}, 'pu'), false));
  test('only cr → false',                 () => assert.strictEqual(canSave({ cr: 'skipped' }, 'pu'), false));
  test('only exKey → false',              () => assert.strictEqual(canSave({ pu: [8,8] }, 'pu'), false));
  test('both present → true',            () => assert.strictEqual(canSave({ pu: [8,8], cr: 'skipped' }, 'pu'), true));
  test('skipped exKey + cr → true',      () => assert.strictEqual(canSave({ pu: 'skipped', cr: [15,15] }, 'pu'), true));
  test('pl exKey → true',                () => assert.strictEqual(canSave({ pl: [5,5,5], cr: [15,15,15] }, 'pl'), true));
  test('sq only → false',                () => assert.strictEqual(canSave({ sq: 'skipped' }, 'sq'), false));
});

describe('buildActual', () => {
  test('correct shape', () =>
    assert.deepStrictEqual(buildActual({ pu: [8,8,8], cr: [15,15,15] }, 'pu'), { pu: [8,8,8], cr: [15,15,15] }));
  test('skipped exKey value', () =>
    assert.deepStrictEqual(buildActual({ pu: 'skipped', cr: [15,15] }, 'pu'), { pu: 'skipped', cr: [15,15] }));
  test('pl exKey', () =>
    assert.deepStrictEqual(buildActual({ pl: [5,5,5,5,5,5], cr: [17,17,17] }, 'pl'), { pl: [5,5,5,5,5,5], cr: [17,17,17] }));
  test('sq + skipped cr', () =>
    assert.deepStrictEqual(buildActual({ sq: [20,20,20,20,20,20], cr: 'skipped' }, 'sq'), { sq: [20,20,20,20,20,20], cr: 'skipped' }));
});

describe('applyEditAll', () => {
  test('populates both keys', () => {
    const s = {};
    applyEditAll(s, { pu: [8,8,8], cr: [15,15,15] }, 'pu');
    assert.deepStrictEqual(s, { pu: [8,8,8], cr: [15,15,15] });
  });
  test('null leaves state empty', () => {
    const s = {};
    applyEditAll(s, null, 'pu');
    assert.deepStrictEqual(s, {});
  });
  test('missing exKey only sets cr', () => {
    const s = {};
    applyEditAll(s, { cr: [15,15,15] }, 'pu');
    assert.deepStrictEqual(s, { cr: [15,15,15] });
  });
  test('missing cr only sets exKey', () => {
    const s = {};
    applyEditAll(s, { pu: [8,8,8] }, 'pu');
    assert.deepStrictEqual(s, { pu: [8,8,8] });
  });
  test('preserves skipped values', () => {
    const s = {};
    applyEditAll(s, { pu: 'skipped', cr: 'skipped' }, 'pu');
    assert.deepStrictEqual(s, { pu: 'skipped', cr: 'skipped' });
  });
  test('overwrites existing state', () => {
    const s = { pu: [10,10], cr: [20,20] };
    applyEditAll(s, { pu: [8,8,8], cr: [15,15,15] }, 'pu');
    assert.deepStrictEqual(s, { pu: [8,8,8], cr: [15,15,15] });
  });
  test('after applyEditAll + skip cr, canSave returns true', () => {
    const s = {};
    applyEditAll(s, { pu: [8,8,8], cr: [15,15,15] }, 'pu');
    s.cr = 'skipped';
    assert.strictEqual(canSave(s, 'pu'), true);
  });
});
