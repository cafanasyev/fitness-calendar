import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, computeBlockSets, computeStartReps, weekReps, restReps, generatePlan } from './progression.js';

describe('computeBlockSets', () => {
  test('pu/pl/sq blocks 0-1 → initialSets=6', () => {
    assert.strictEqual(computeBlockSets(EXERCISES.pu, 0), 6);
    assert.strictEqual(computeBlockSets(EXERCISES.pu, 1), 6);
    assert.strictEqual(computeBlockSets(EXERCISES.pl, 0), 6);
    assert.strictEqual(computeBlockSets(EXERCISES.sq, 0), 6);
  });
  test('pu/pl/sq blocks 2-4 → peakSets=7', () => {
    assert.strictEqual(computeBlockSets(EXERCISES.pu, 2), 7);
    assert.strictEqual(computeBlockSets(EXERCISES.pu, 3), 7);
    assert.strictEqual(computeBlockSets(EXERCISES.pu, 4), 7);
    assert.strictEqual(computeBlockSets(EXERCISES.pl, 2), 7);
    assert.strictEqual(computeBlockSets(EXERCISES.sq, 2), 7);
  });
  test('cr constant sets=3 throughout', () => {
    assert.strictEqual(computeBlockSets(EXERCISES.cr, 0), 3);
    assert.strictEqual(computeBlockSets(EXERCISES.cr, 4), 3);
  });
});

describe('computeStartReps', () => {
  test('push-ups all blocks', () => {
    assert.strictEqual(computeStartReps(EXERCISES.pu, 0), 10);
    assert.strictEqual(computeStartReps(EXERCISES.pu, 1), 13);
    assert.strictEqual(computeStartReps(EXERCISES.pu, 2), 13, 'macro reset at set-jump block');
    assert.strictEqual(computeStartReps(EXERCISES.pu, 3), 16);
    assert.strictEqual(computeStartReps(EXERCISES.pu, 4), 19);
  });
  test('pull-ups all blocks', () => {
    assert.strictEqual(computeStartReps(EXERCISES.pl, 0),  5);
    assert.strictEqual(computeStartReps(EXERCISES.pl, 1),  7);
    assert.strictEqual(computeStartReps(EXERCISES.pl, 2),  7, 'macro reset at set-jump block');
    assert.strictEqual(computeStartReps(EXERCISES.pl, 3),  9);
    assert.strictEqual(computeStartReps(EXERCISES.pl, 4), 11);
  });
  test('squats use blockStartReps', () => {
    assert.deepStrictEqual(
      [0,1,2,3,4].map(b => computeStartReps(EXERCISES.sq, b)),
      [15, 22, 22, 26, 30]
    );
  });
  test('crunches use blockStartReps', () => {
    assert.deepStrictEqual(
      [0,1,2,3,4].map(b => computeStartReps(EXERCISES.cr, b)),
      [15, 20, 22, 25, 28]
    );
  });
});

describe('weekReps', () => {
  test('push-ups block 0 increments by 1', () => {
    assert.strictEqual(weekReps(EXERCISES.pu, 0, 0), 10);
    assert.strictEqual(weekReps(EXERCISES.pu, 0, 1), 11);
    assert.strictEqual(weekReps(EXERCISES.pu, 0, 2), 12);
  });
  test('push-ups block 2 (set-jump) increments from reset', () => {
    assert.strictEqual(weekReps(EXERCISES.pu, 2, 0), 13);
    assert.strictEqual(weekReps(EXERCISES.pu, 2, 1), 14);
    assert.strictEqual(weekReps(EXERCISES.pu, 2, 2), 15);
  });
  test('push-ups block 4 (peak)', () => {
    assert.strictEqual(weekReps(EXERCISES.pu, 4, 0), 19);
    assert.strictEqual(weekReps(EXERCISES.pu, 4, 1), 20);
    assert.strictEqual(weekReps(EXERCISES.pu, 4, 2), 21);
  });
  test('squats increment by 2', () => {
    assert.strictEqual(weekReps(EXERCISES.sq, 0, 0), 15);
    assert.strictEqual(weekReps(EXERCISES.sq, 0, 1), 17);
    assert.strictEqual(weekReps(EXERCISES.sq, 0, 2), 19);
  });
});

describe('restReps', () => {
  test('push-ups all blocks', () => {
    assert.deepStrictEqual([0,1,2,3,4].map(b => restReps(EXERCISES.pu, b)), [7, 9, 9, 10, 12]);
  });
  test('pull-ups all blocks', () => {
    assert.deepStrictEqual([0,1,2,3,4].map(b => restReps(EXERCISES.pl, b)), [4, 5, 5, 6, 8]);
  });
  test('squats all blocks', () => {
    assert.deepStrictEqual([0,1,2,3,4].map(b => restReps(EXERCISES.sq, b)), [11, 15, 15, 17, 20]);
  });
  test('crunches all blocks', () => {
    assert.deepStrictEqual([0,1,2,3,4].map(b => restReps(EXERCISES.cr, b)), [11, 14, 15, 17, 19]);
  });
});

describe('generatePlan', () => {
  const plan = generatePlan();
  const wk = n => plan.find(p => p.wk === n);

  test('produces 24 weeks', () => assert.strictEqual(plan.length, 24));

  test('week 1 (block 1, week 1)', () => {
    assert.deepStrictEqual(wk(1).pu, [6, 10]);
    assert.deepStrictEqual(wk(1).pl, [6,  5]);
    assert.deepStrictEqual(wk(1).sq, [6, 15]);
    assert.deepStrictEqual(wk(1).cr, [3, 15]);
    assert.strictEqual(wk(1).label, null);
  });
  test('week 4 (rest week)', () => {
    assert.deepStrictEqual(wk(4).pu, [4,  7]);
    assert.deepStrictEqual(wk(4).pl, [4,  4]);
    assert.deepStrictEqual(wk(4).sq, [4, 11]);
    assert.deepStrictEqual(wk(4).cr, [2, 11]);
    assert.strictEqual(wk(4).label, 'Rest week');
  });
  test('week 9 (set-jump block)', () => {
    assert.deepStrictEqual(wk(9).pu, [7, 13]);
    assert.deepStrictEqual(wk(9).pl, [7,  7]);
    assert.deepStrictEqual(wk(9).sq, [7, 22]);
    assert.deepStrictEqual(wk(9).cr, [3, 22]);
  });
  test('week 12 (mid-test rest)', () => {
    assert.strictEqual(wk(12).label, 'Rest + mid-test');
    assert.deepStrictEqual(wk(12).pu, [4,  9]);
    assert.deepStrictEqual(wk(12).pl, [4,  5]);
    assert.deepStrictEqual(wk(12).sq, [4, 15]);
    assert.deepStrictEqual(wk(12).cr, [2, 15]);
  });
  test('week 19 (peak)', () => {
    assert.deepStrictEqual(wk(19).pu, [7, 21]);
    assert.deepStrictEqual(wk(19).pl, [7, 13]);
    assert.deepStrictEqual(wk(19).sq, [7, 34]);
    assert.deepStrictEqual(wk(19).cr, [3, 32]);
  });
  test('week 21 (full deload, SPECIAL_WEEKS)', () => {
    assert.deepStrictEqual(wk(21).pu, [4, 10]);
    assert.deepStrictEqual(wk(21).pl, [4,  5]);
    assert.deepStrictEqual(wk(21).sq, [4, 15]);
    assert.deepStrictEqual(wk(21).cr, [2, 15]);
    assert.strictEqual(wk(21).label, 'Full deload');
  });
  test('week 22 (test week)', () => {
    assert.strictEqual(wk(22).test, true);
    assert.strictEqual(wk(22).label, 'TEST WEEK');
    assert.strictEqual(wk(22).pu, undefined);
  });
  test('week 23 (maintain)', () => {
    assert.deepStrictEqual(wk(23).pu, [7, 18]);
    assert.deepStrictEqual(wk(23).pl, [7, 11]);
    assert.deepStrictEqual(wk(23).sq, [7, 30]);
    assert.deepStrictEqual(wk(23).cr, [3, 28]);
    assert.strictEqual(wk(23).label, 'Maintain');
  });
  test('week 24 matches week 23', () => {
    assert.deepStrictEqual(wk(24).pu, wk(23).pu);
    assert.deepStrictEqual(wk(24).pl, wk(23).pl);
    assert.deepStrictEqual(wk(24).sq, wk(23).sq);
    assert.deepStrictEqual(wk(24).cr, wk(23).cr);
    assert.strictEqual(wk(24).label, 'Maintain');
  });
  test('pu reps increase within each block', () => {
    for (let b = 0; b < 5; b++) {
      const base = b * 4;
      for (let w = 0; w < 2; w++) {
        assert.ok(wk(base + w + 2).pu[1] > wk(base + w + 1).pu[1],
          `pu reps increase from wk${base+w+1} to wk${base+w+2}`);
      }
    }
  });
});
