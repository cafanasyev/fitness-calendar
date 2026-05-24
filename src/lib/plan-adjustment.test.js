import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { findLastDone, findFirstSkipAfterWeek, computeEffectivePlan } from './plan-adjustment.js';

const EXERCISES = {
  pu: { day: 'mon' },
  pl: { day: 'wed' },
  sq: { day: 'fri' },
  cr: { day: null  },
};

describe('findLastDone', () => {
  test('no history → null', () =>
    assert.strictEqual(findLastDone('pu', 3, {}, EXERCISES), null));

  test('one done week → returns it', () =>
    assert.deepStrictEqual(
      findLastDone('pu', 3, { '2-mon': { status: 'done', actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } } }, EXERCISES),
      { weekN: 2, actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } }
    ));

  test('two done weeks → most recent', () =>
    assert.deepStrictEqual(
      findLastDone('pu', 3, {
        '1-mon': { status: 'done', actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
        '2-mon': { status: 'done', actual: { pu: [9,9,9,9,9,9], cr: [15,15,15] } },
      }, EXERCISES),
      { weekN: 2, actual: { pu: [9,9,9,9,9,9], cr: [15,15,15] } }
    ));

  test('skipped exercise → returns earlier done', () =>
    assert.deepStrictEqual(
      findLastDone('pu', 3, {
        '1-mon': { status: 'done', actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
        '2-mon': { status: 'done', actual: { pu: 'skipped',     cr: [15,15,15] } },
      }, EXERCISES),
      { weekN: 1, actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } }
    ));

  test('beforeWeekN = 0 → null', () =>
    assert.strictEqual(
      findLastDone('pu', 0, { '1-mon': { status: 'done', actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } } }, EXERCISES),
      null
    ));

  test('cr found on mon', () =>
    assert.deepStrictEqual(
      findLastDone('cr', 3, { '2-mon': { status: 'done', actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } } }, EXERCISES),
      { weekN: 2, actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } }
    ));

  test('cr found on wed', () =>
    assert.deepStrictEqual(
      findLastDone('cr', 3, { '2-wed': { status: 'done', actual: { pl: [5,5,5,5,5,5], cr: [17,17,17] } } }, EXERCISES),
      { weekN: 2, actual: { pl: [5,5,5,5,5,5], cr: [17,17,17] } }
    ));

  test('cr found on fri', () =>
    assert.deepStrictEqual(
      findLastDone('cr', 3, { '2-fri': { status: 'done', actual: { sq: [15,15,15,15,15,15], cr: [17,17,17] } } }, EXERCISES),
      { weekN: 2, actual: { sq: [15,15,15,15,15,15], cr: [17,17,17] } }
    ));

  test('cr multiple days same week → most recent day (fri) wins', () =>
    assert.deepStrictEqual(
      findLastDone('cr', 3, {
        '2-mon': { status: 'done', actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
        '2-fri': { status: 'done', actual: { sq: [20,20,20,20,20,20], cr: [20,20,20] } },
      }, EXERCISES),
      { weekN: 2, actual: { sq: [20,20,20,20,20,20], cr: [20,20,20] } }
    ));
});

describe('findFirstSkipAfterWeek', () => {
  test('no skip → null', () =>
    assert.strictEqual(findFirstSkipAfterWeek('pu', 1, 4, {}, EXERCISES), null));

  test('skip at week 2 → 2', () =>
    assert.strictEqual(
      findFirstSkipAfterWeek('pu', 1, 4, { '2-mon': { status: 'done', actual: { pu: 'skipped', cr: [15,15,15] } } }, EXERCISES),
      2
    ));

  test('multiple skips → earliest', () =>
    assert.strictEqual(
      findFirstSkipAfterWeek('pu', 1, 5, {
        '3-mon': { status: 'done', actual: { pu: 'skipped', cr: [15,15,15] } },
        '2-mon': { status: 'done', actual: { pu: 'skipped', cr: [15,15,15] } },
      }, EXERCISES),
      2
    ));

  test('done entry is not a skip', () =>
    assert.strictEqual(
      findFirstSkipAfterWeek('pu', 1, 4, { '2-mon': { status: 'done', actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } } }, EXERCISES),
      null
    ));

  test('cr skip found on fri', () =>
    assert.strictEqual(
      findFirstSkipAfterWeek('cr', 1, 4, { '2-fri': { status: 'done', actual: { sq: [15,15,15,15,15,15], cr: 'skipped' } } }, EXERCISES),
      2
    ));

  test('empty range → null', () =>
    assert.strictEqual(
      findFirstSkipAfterWeek('pu', 1, 2, {
        '1-mon': { status: 'done', actual: { pu: 'skipped', cr: [15,15,15] } },
        '2-mon': { status: 'done', actual: { pu: 'skipped', cr: [15,15,15] } },
      }, EXERCISES),
      null
    ));
});

const PLAN = [
  { wk: 1, pu: [6, 10], pl: [6,  5], sq: [6, 15], cr: [3, 15] },
  { wk: 2, pu: [6, 11], pl: [6,  6], sq: [6, 17], cr: [3, 17] },
  { wk: 3, pu: [6, 12], pl: [6,  7], sq: [6, 19], cr: [3, 19] },
  { wk: 4, pu: [4,  7], pl: [4,  4], sq: [4, 11], cr: [2, 11] },
  { wk: 5, pu: [6, 10], pl: [6,  5], sq: [6, 15], cr: [3, 15] },
];

describe('computeEffectivePlan', () => {
  test('no history → base plan', () =>
    assert.deepStrictEqual(computeEffectivePlan('pu', 2, {}, PLAN, EXERCISES), [6, 11]));

  test('exact performance → base reps', () =>
    assert.deepStrictEqual(
      computeEffectivePlan('pu', 2, { '1-mon': { status: 'done', actual: { pu: [10,10,10,10,10,10], cr: [15,15,15] } } }, PLAN, EXERCISES),
      [6, 11]
    ));

  test('underperformance → reduced reps', () =>
    assert.deepStrictEqual(
      computeEffectivePlan('pu', 2, { '1-mon': { status: 'done', actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } } }, PLAN, EXERCISES),
      [6, 9]
    ));

  test('overperformance → increased reps', () =>
    assert.deepStrictEqual(
      computeEffectivePlan('pu', 2, { '1-mon': { status: 'done', actual: { pu: [12,12,12,12,12,12], cr: [15,15,15] } } }, PLAN, EXERCISES),
      [6, 13]
    ));

  test('skip between lastDone and current → anchor frozen at skip week', () =>
    assert.deepStrictEqual(
      computeEffectivePlan('pu', 3, {
        '1-mon': { status: 'done', actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
        '2-mon': { status: 'done', actual: { pu: 'skipped',     cr: [15,15,15] } },
      }, PLAN, EXERCISES),
      [6, 9]
    ));

  test('reps clamped to minimum 1', () =>
    assert.deepStrictEqual(
      computeEffectivePlan('pu', 2, { '1-mon': { status: 'done', actual: { pu: [2], cr: [15,15,15] } } }, PLAN, EXERCISES),
      [6, 1]
    ));

  test('effectiveSets always from base plan', () =>
    assert.deepStrictEqual(
      computeEffectivePlan('pu', 4, { '3-mon': { status: 'done', actual: { pu: [12,12,12,12,12,12], cr: [15,15,15] } } }, PLAN, EXERCISES),
      [4, 7]
    ));

  test('cr uses entry from any strength day', () =>
    assert.deepStrictEqual(
      computeEffectivePlan('cr', 2, { '1-wed': { status: 'done', actual: { pl: [5,5,5,5,5,5], cr: [17,17,17] } } }, PLAN, EXERCISES),
      [3, 19]
    ));

  test('unknown weekN throws descriptive error', () =>
    assert.throws(() => computeEffectivePlan('pu', 99, {}, PLAN, EXERCISES), /week 99/));
});
