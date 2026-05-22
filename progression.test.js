// progression.test.js — run with: node progression.test.js
const assert = require("assert");
const {
  EXERCISES,
  computeBlockSets,
  computeStartReps,
  weekReps,
  restReps,
  generatePlan,
} = require("./progression.js");

// ---- computeBlockSets ----
// pu/pl/sq: blocks 0-1 → initialSets=6, blocks 2-4 → peakSets=7
// cr: constant sets=3 throughout

assert.strictEqual(computeBlockSets(EXERCISES.pu, 0), 6, "pu block 0 sets");
assert.strictEqual(computeBlockSets(EXERCISES.pu, 1), 6, "pu block 1 sets");
assert.strictEqual(computeBlockSets(EXERCISES.pu, 2), 7, "pu block 2 sets (set jump)");
assert.strictEqual(computeBlockSets(EXERCISES.pu, 3), 7, "pu block 3 sets");
assert.strictEqual(computeBlockSets(EXERCISES.pu, 4), 7, "pu block 4 sets");

assert.strictEqual(computeBlockSets(EXERCISES.pl, 0), 6, "pl block 0 sets");
assert.strictEqual(computeBlockSets(EXERCISES.pl, 2), 7, "pl block 2 sets");

assert.strictEqual(computeBlockSets(EXERCISES.sq, 0), 6, "sq block 0 sets");
assert.strictEqual(computeBlockSets(EXERCISES.sq, 2), 7, "sq block 2 sets");

assert.strictEqual(computeBlockSets(EXERCISES.cr, 0), 3, "cr block 0 sets (constant)");
assert.strictEqual(computeBlockSets(EXERCISES.cr, 4), 3, "cr block 4 sets (constant)");

// ---- computeStartReps ----
// Push-ups (initialReps=10, increment=1, transitionBonus=1):
//   b0: 10               — initial value
//   b1: 12 + 1 = 13      — prevEnd(12) + transitionBonus(1), same sets
//   b2: 13               — MACRO RESET: sets jumped 6→7, reset to prevStart(13)
//   b3: 15 + 1 = 16      — prevEnd(15) + transitionBonus(1), same sets
//   b4: 18 + 1 = 19      — prevEnd(18) + transitionBonus(1), same sets
assert.strictEqual(computeStartReps(EXERCISES.pu, 0), 10, "pu startReps b0");
assert.strictEqual(computeStartReps(EXERCISES.pu, 1), 13, "pu startReps b1");
assert.strictEqual(computeStartReps(EXERCISES.pu, 2), 13, "pu startReps b2 (macro reset)");
assert.strictEqual(computeStartReps(EXERCISES.pu, 3), 16, "pu startReps b3");
assert.strictEqual(computeStartReps(EXERCISES.pu, 4), 19, "pu startReps b4");

// Pull-ups (initialReps=5, increment=1, transitionBonus=0):
//   b0: 5
//   b1: 7 + 0 = 7        — prevEnd(7), no bonus
//   b2: 7                — MACRO RESET: sets jumped 6→7, reset to prevStart(7)
//   b3: 9 + 0 = 9        — prevEnd(9)
//   b4: 11 + 0 = 11      — prevEnd(11)
assert.strictEqual(computeStartReps(EXERCISES.pl, 0),  5, "pl startReps b0");
assert.strictEqual(computeStartReps(EXERCISES.pl, 1),  7, "pl startReps b1");
assert.strictEqual(computeStartReps(EXERCISES.pl, 2),  7, "pl startReps b2 (macro reset)");
assert.strictEqual(computeStartReps(EXERCISES.pl, 3),  9, "pl startReps b3");
assert.strictEqual(computeStartReps(EXERCISES.pl, 4), 11, "pl startReps b4");

// Squats and crunches: explicit blockStartReps array
assert.strictEqual(computeStartReps(EXERCISES.sq, 0), 15, "sq startReps b0");
assert.strictEqual(computeStartReps(EXERCISES.sq, 1), 22, "sq startReps b1");
assert.strictEqual(computeStartReps(EXERCISES.sq, 2), 22, "sq startReps b2");
assert.strictEqual(computeStartReps(EXERCISES.sq, 3), 26, "sq startReps b3");
assert.strictEqual(computeStartReps(EXERCISES.sq, 4), 30, "sq startReps b4");

assert.strictEqual(computeStartReps(EXERCISES.cr, 0), 15, "cr startReps b0");
assert.strictEqual(computeStartReps(EXERCISES.cr, 1), 20, "cr startReps b1");
assert.strictEqual(computeStartReps(EXERCISES.cr, 2), 22, "cr startReps b2");
assert.strictEqual(computeStartReps(EXERCISES.cr, 3), 25, "cr startReps b3");
assert.strictEqual(computeStartReps(EXERCISES.cr, 4), 28, "cr startReps b4");

console.log("computeBlockSets + computeStartReps: all tests passed");

// ---- weekReps ----
// weekReps(ex, blockIdx, weekInBlock) = startReps(b) + weekInBlock * increment

// Push-ups block 0 (startReps=10, increment=1): weeks → 10, 11, 12
assert.strictEqual(weekReps(EXERCISES.pu, 0, 0), 10, "pu b0 w0");
assert.strictEqual(weekReps(EXERCISES.pu, 0, 1), 11, "pu b0 w1");
assert.strictEqual(weekReps(EXERCISES.pu, 0, 2), 12, "pu b0 w2");

// Push-ups block 2 (set-jump block, macro reset, startReps=13): weeks → 13, 14, 15
assert.strictEqual(weekReps(EXERCISES.pu, 2, 0), 13, "pu b2 w0");
assert.strictEqual(weekReps(EXERCISES.pu, 2, 1), 14, "pu b2 w1");
assert.strictEqual(weekReps(EXERCISES.pu, 2, 2), 15, "pu b2 w2");

// Push-ups block 4 (peak block, startReps=19): weeks → 19, 20, 21
assert.strictEqual(weekReps(EXERCISES.pu, 4, 0), 19, "pu b4 w0");
assert.strictEqual(weekReps(EXERCISES.pu, 4, 1), 20, "pu b4 w1");
assert.strictEqual(weekReps(EXERCISES.pu, 4, 2), 21, "pu b4 w2");

// Pull-ups block 0 (startReps=5, increment=1): 5, 6, 7
assert.strictEqual(weekReps(EXERCISES.pl, 0, 0), 5, "pl b0 w0");
assert.strictEqual(weekReps(EXERCISES.pl, 0, 2), 7, "pl b0 w2");

// Squats block 0 (startReps=15, increment=2): 15, 17, 19
assert.strictEqual(weekReps(EXERCISES.sq, 0, 0), 15, "sq b0 w0");
assert.strictEqual(weekReps(EXERCISES.sq, 0, 1), 17, "sq b0 w1");
assert.strictEqual(weekReps(EXERCISES.sq, 0, 2), 19, "sq b0 w2");

// Squats block 1 (startReps=22, increment=2): 22, 24, 26
assert.strictEqual(weekReps(EXERCISES.sq, 1, 0), 22, "sq b1 w0");
assert.strictEqual(weekReps(EXERCISES.sq, 1, 2), 26, "sq b1 w2");

// Crunches block 0 (startReps=15, increment=2): 15, 17, 19
assert.strictEqual(weekReps(EXERCISES.cr, 0, 0), 15, "cr b0 w0");
assert.strictEqual(weekReps(EXERCISES.cr, 0, 2), 19, "cr b0 w2");

// ---- restReps ----
// restReps(ex, blockIdx) = Math.round((startReps + 2*increment) * restFraction)
// restFraction = 0.58

// Push-ups rest weeks:
//   b0: end=12, 12*0.58=6.96  → 7
//   b1: end=15, 15*0.58=8.70  → 9
//   b2: end=15, 15*0.58=8.70  → 9
//   b3: end=18, 18*0.58=10.44 → 10
//   b4: end=21, 21*0.58=12.18 → 12
assert.strictEqual(restReps(EXERCISES.pu, 0),  7, "pu restReps b0");
assert.strictEqual(restReps(EXERCISES.pu, 1),  9, "pu restReps b1");
assert.strictEqual(restReps(EXERCISES.pu, 2),  9, "pu restReps b2");
assert.strictEqual(restReps(EXERCISES.pu, 3), 10, "pu restReps b3");
assert.strictEqual(restReps(EXERCISES.pu, 4), 12, "pu restReps b4");

// Pull-ups rest weeks:
//   b0: end=7,  7*0.58=4.06  → 4
//   b1: end=9,  9*0.58=5.22  → 5
//   b2: end=9,  9*0.58=5.22  → 5
//   b3: end=11, 11*0.58=6.38 → 6
//   b4: end=13, 13*0.58=7.54 → 8
assert.strictEqual(restReps(EXERCISES.pl, 0), 4, "pl restReps b0");
assert.strictEqual(restReps(EXERCISES.pl, 1), 5, "pl restReps b1");
assert.strictEqual(restReps(EXERCISES.pl, 2), 5, "pl restReps b2");
assert.strictEqual(restReps(EXERCISES.pl, 3), 6, "pl restReps b3");
assert.strictEqual(restReps(EXERCISES.pl, 4), 8, "pl restReps b4");

// Squats rest weeks (blockStartReps=[15,22,22,26,30], increment=2):
//   b0: end=19, 19*0.58=11.02 → 11
//   b1: end=26, 26*0.58=15.08 → 15
//   b2: end=26, 26*0.58=15.08 → 15
//   b3: end=30, 30*0.58=17.40 → 17
//   b4: end=34, 34*0.58=19.72 → 20
assert.strictEqual(restReps(EXERCISES.sq, 0), 11, "sq restReps b0");
assert.strictEqual(restReps(EXERCISES.sq, 1), 15, "sq restReps b1");
assert.strictEqual(restReps(EXERCISES.sq, 2), 15, "sq restReps b2");
assert.strictEqual(restReps(EXERCISES.sq, 3), 17, "sq restReps b3");
assert.strictEqual(restReps(EXERCISES.sq, 4), 20, "sq restReps b4");

// Crunches rest weeks (blockStartReps=[15,20,22,25,28], increment=2):
//   b0: end=19, 19*0.58=11.02 → 11
//   b1: end=24, 24*0.58=13.92 → 14
//   b2: end=26, 26*0.58=15.08 → 15
//   b3: end=29, 29*0.58=16.82 → 17
//   b4: end=32, 32*0.58=18.56 → 19
assert.strictEqual(restReps(EXERCISES.cr, 0), 11, "cr restReps b0");
assert.strictEqual(restReps(EXERCISES.cr, 1), 14, "cr restReps b1");
assert.strictEqual(restReps(EXERCISES.cr, 2), 15, "cr restReps b2");
assert.strictEqual(restReps(EXERCISES.cr, 3), 17, "cr restReps b3");
assert.strictEqual(restReps(EXERCISES.cr, 4), 19, "cr restReps b4");

console.log("weekReps + restReps: all tests passed");

// ---- generatePlan integration ----
const plan = generatePlan();

// 24 total weeks
assert.strictEqual(plan.length, 24, "plan has 24 weeks");

// Helper to find a week by number
const wk = n => plan.find(p => p.wk === n);

// Week 1: first active week of block 1 (b=0, w=0, sets=6)
assert.deepStrictEqual(wk(1).pu, [6, 10], "wk1 push-ups");
assert.deepStrictEqual(wk(1).pl, [6,  5], "wk1 pull-ups");
assert.deepStrictEqual(wk(1).sq, [6, 15], "wk1 squats");
assert.deepStrictEqual(wk(1).cr, [3, 15], "wk1 crunches");
assert.strictEqual(wk(1).label, null,     "wk1 label");

// Week 4: rest week of block 1 (b=0)
assert.deepStrictEqual(wk(4).pu, [4,  7], "wk4 push-ups rest");
assert.deepStrictEqual(wk(4).pl, [4,  4], "wk4 pull-ups rest");
assert.deepStrictEqual(wk(4).sq, [4, 11], "wk4 squats rest");
assert.deepStrictEqual(wk(4).cr, [2, 11], "wk4 crunches rest");
assert.strictEqual(wk(4).label, "Rest week", "wk4 label");

// Week 9: first active week of block 3 (b=2, w=0) — the set-jump week
assert.deepStrictEqual(wk(9).pu, [7, 13], "wk9 push-ups (set jump)");
assert.deepStrictEqual(wk(9).pl, [7,  7], "wk9 pull-ups (set jump)");
assert.deepStrictEqual(wk(9).sq, [7, 22], "wk9 squats (set jump)");
assert.deepStrictEqual(wk(9).cr, [3, 22], "wk9 crunches");
assert.strictEqual(wk(9).label, null, "wk9 label");

// Week 12: rest week of block 3 — special label
assert.strictEqual(wk(12).label, "Rest + mid-test", "wk12 label");
assert.deepStrictEqual(wk(12).pu, [4,  9], "wk12 push-ups rest");
assert.deepStrictEqual(wk(12).pl, [4,  5], "wk12 pull-ups rest");
assert.deepStrictEqual(wk(12).sq, [4, 15], "wk12 squats rest");
assert.deepStrictEqual(wk(12).cr, [2, 15], "wk12 crunches rest");

// Week 19: peak active week (b=4, w=2)
assert.deepStrictEqual(wk(19).pu, [7, 21], "wk19 push-ups peak");
assert.deepStrictEqual(wk(19).pl, [7, 13], "wk19 pull-ups peak");
assert.deepStrictEqual(wk(19).sq, [7, 34], "wk19 squats peak");
assert.deepStrictEqual(wk(19).cr, [3, 32], "wk19 crunches peak");

// Week 22: test week — explicit entry, no exercise values
assert.strictEqual(wk(22).test,  true,         "wk22 is test week");
assert.strictEqual(wk(22).label, "TEST WEEK",  "wk22 label");
assert.strictEqual(wk(22).pu,    undefined,    "wk22 has no exercise values");

// Week 23: maintain week — explicit entry
assert.deepStrictEqual(wk(23).pu, [7, 18], "wk23 push-ups maintain");
assert.deepStrictEqual(wk(23).pl, [7, 11], "wk23 pull-ups maintain");
assert.deepStrictEqual(wk(23).sq, [7, 30], "wk23 squats maintain");
assert.deepStrictEqual(wk(23).cr, [3, 28], "wk23 crunches maintain");
assert.strictEqual(wk(23).label, "Maintain", "wk23 label");

console.log("generatePlan: all tests passed");
