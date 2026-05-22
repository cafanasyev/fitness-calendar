# Progression Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 24-entry hardcoded `PLAN` array in `app.js` with a formula-driven generator backed by a compact exercise config.

**Architecture:** Extract all progression logic into `progression.js` as pure functions operating on `PROGRAM` and `EXERCISES` config objects. `app.js` calls `generatePlan()` which returns a drop-in replacement for the old `PLAN` array — no other changes to `app.js` needed. Tests in `progression.test.js` run with plain `node` (no npm, no framework).

**Tech Stack:** Vanilla JS, Node.js built-in `assert` module for tests, no bundler.

---

### Task 1: Create progression.js with config and function stubs

**Files:**
- Create: `progression.js`

- [ ] **Step 1: Create progression.js**

```js
// progression.js

// ---------- Program-level constants ----------

const PROGRAM = {
  numBlocks: 5,           // five formula-generated 4-week blocks (blocks 1-5, weeks 1-20)
                          // block 6 (weeks 21-24) is explicit config in SPECIAL_WEEKS
  activeWeeksPerBlock: 3, // weeks 1-3 of each block are progressive training
                          // week 4 of each block is a rest/deload week (lower sets & reps)
  setJumpAtBlock: 3,      // MACRO PERIODIZATION: sets increase going into block 3.
                          //   blocks 1-2 → initialSets (lower volume phase)
                          //   blocks 3-5 → peakSets   (higher volume phase)
                          // 1-indexed. when sets increase, startReps resets to absorb the load.
  restFraction: 0.58,     // rest week reps = Math.round(blockPeakReps * restFraction)
                          // ~58% of peak keeps the rest week genuinely easy while
                          // maintaining movement pattern.
};

// ---------- Exercise config ----------

const EXERCISES = {
  // Formula exercises: startReps is computed from the formula.
  //
  //   increment:       reps added per active week within any block (MICRO periodization unit).
  //   transitionBonus: extra reps added when starting a new block at the SAME set level.
  //     pu = 1: after a rest week you pick up one rep ahead of where you peaked —
  //             the rest paid off, you're slightly stronger.
  //     pl = 0: pull-ups are harder to recover from; prudent to re-enter at the same
  //             rep count you peaked at rather than advancing.
  //   initialSets / peakSets: set count for the low-volume and high-volume phases.
  //   restSets: sets used on the rest week (always lower than active sets).
  pu: { name: "Push-ups", day: "mon", dayName: "Push", restPeriod: "90 seconds",
        initialReps: 10, increment: 1, transitionBonus: 1,
        initialSets: 6, peakSets: 7, restSets: 4 },
  pl: { name: "Pull-ups", day: "wed", dayName: "Pull", restPeriod: "2 minutes",
        initialReps: 5,  increment: 1, transitionBonus: 0,
        initialSets: 6, peakSets: 7, restSets: 4 },

  // Config exercises: blockStartReps is stored explicitly because inter-block
  // transitions don't follow a single rule.
  //
  //   sq — blockStartReps: [15, 22, 22, 26, 30]
  //     block 1→2: +2 bonus (early phase, lower volume → aggressive rep jump at transition)
  //     block 2→3: MACRO RESET back to 22 (sets jump 6→7; reps pulled back to absorb volume)
  //     block 3→4 and 4→5: +0 (high-volume phase — just continue from previous peak)
  //
  //   cr — blockStartReps: [15, 20, 22, 25, 28]
  //     no set jump (sets always = 3); progression slows each block intentionally because
  //     crunches are an accessory lift — you don't chase infinite reps indefinitely.
  //
  //   increment: within any block, reps still advance by this much each week.
  sq: { name: "Squats",   day: "fri", dayName: "Legs", restPeriod: "90 seconds",
        blockStartReps: [15, 22, 22, 26, 30], increment: 2,
        initialSets: 6, peakSets: 7, restSets: 4 },
  cr: { name: "Crunches", day: null,  dayName: null,   restPeriod: "60 seconds",
        blockStartReps: [15, 20, 22, 25, 28], increment: 2,
        sets: 3,      // constant throughout — no volume phase jump for crunches
        restSets: 2 },
};

// ---------- Block 6: explicit special weeks (formula does not apply) ----------

const SPECIAL_WEEKS = [
  { wk: 21, pu: [4, 10], pl: [4, 5],  sq: [4, 15], cr: [2, 15], label: "Full deload" },
  { wk: 22, test: true,                                            label: "TEST WEEK"  },
  { wk: 23, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain"   },
  { wk: 24, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain"   },
];

// ---------- Formula functions (stubs — implemented in later tasks) ----------

function computeBlockSets(ex, blockIdx) {
  throw new Error("not implemented");
}

function computeStartReps(ex, blockIdx) {
  throw new Error("not implemented");
}

function weekReps(ex, blockIdx, weekInBlock) {
  throw new Error("not implemented");
}

function restReps(ex, blockIdx) {
  throw new Error("not implemented");
}

function generatePlan() {
  throw new Error("not implemented");
}

// ---------- Dual export: browser (global) + Node.js (require) ----------
if (typeof module !== "undefined") {
  module.exports = { PROGRAM, EXERCISES, SPECIAL_WEEKS,
                     computeBlockSets, computeStartReps, weekReps, restReps, generatePlan };
}
```

---

### Task 2: Write tests for computeBlockSets and computeStartReps

**Files:**
- Create: `progression.test.js`

- [ ] **Step 1: Create progression.test.js**

```js
// progression.test.js — run with: node progression.test.js
const assert = require("assert");
const {
  EXERCISES,
  computeBlockSets,
  computeStartReps,
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
```

- [ ] **Step 2: Run tests — expect failure**

```
node progression.test.js
```

Expected output: `Error: not implemented`

---

### Task 3: Implement computeBlockSets and computeStartReps

**Files:**
- Modify: `progression.js`

- [ ] **Step 1: Replace the computeBlockSets stub**

```js
function computeBlockSets(ex, blockIdx) {
  // Crunches have a fixed set count throughout (ex.sets is defined)
  if (ex.sets !== undefined) return ex.sets;
  // Other exercises: low-volume phase (blocks 1-2) vs high-volume phase (blocks 3-5)
  // setJumpAtBlock is 1-indexed; blockIdx is 0-indexed
  return blockIdx + 1 < PROGRAM.setJumpAtBlock ? ex.initialSets : ex.peakSets;
}
```

- [ ] **Step 2: Replace the computeStartReps stub**

```js
function computeStartReps(ex, blockIdx) {
  // Config exercises (squats, crunches) store per-block start reps explicitly
  if (ex.blockStartReps) return ex.blockStartReps[blockIdx];
  // Formula exercises (push-ups, pull-ups)
  if (blockIdx === 0) return ex.initialReps;
  const prevSets  = computeBlockSets(ex, blockIdx - 1);
  const currSets  = computeBlockSets(ex, blockIdx);
  const prevStart = computeStartReps(ex, blockIdx - 1);
  const prevEnd   = prevStart + 2 * ex.increment;
  if (currSets > prevSets) {
    // MACRO RESET: sets increased — reps drop back to where the previous block *started*
    // (not where it peaked) to compensate for the higher volume load.
    return prevStart;
  }
  // MICRO CONTINUATION: same set level — carry forward from previous block's peak,
  // plus transitionBonus (may be 0).
  return prevEnd + ex.transitionBonus;
}
```

- [ ] **Step 3: Run tests — expect pass**

```
node progression.test.js
```

Expected output: `computeBlockSets + computeStartReps: all tests passed`

---

### Task 4: Write tests for weekReps and restReps

**Files:**
- Modify: `progression.test.js`

- [ ] **Step 1: Update the require and append assertions**

Replace the require at the top of `progression.test.js`:

```js
const {
  EXERCISES,
  computeBlockSets,
  computeStartReps,
  weekReps,
  restReps,
} = require("./progression.js");
```

Append at the bottom of `progression.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — expect failure on new assertions**

```
node progression.test.js
```

Expected output: `Error: not implemented` (from weekReps stub)

---

### Task 5: Implement weekReps and restReps

**Files:**
- Modify: `progression.js`

- [ ] **Step 1: Replace the weekReps stub**

```js
function weekReps(ex, blockIdx, weekInBlock) {
  // Linear ramp: each active week adds one increment over the previous week.
  // weekInBlock = 0 (first active week), 1, 2 (peak week of block)
  return computeStartReps(ex, blockIdx) + weekInBlock * ex.increment;
}
```

- [ ] **Step 2: Replace the restReps stub**

```js
function restReps(ex, blockIdx) {
  // Peak = last active week of the block
  const peak = computeStartReps(ex, blockIdx) + 2 * ex.increment;
  // Rest week targets ~58% of peak — easy enough for recovery while keeping the pattern.
  return Math.round(peak * PROGRAM.restFraction);
}
```

- [ ] **Step 3: Run full test suite — expect all pass**

```
node progression.test.js
```

Expected output:
```
computeBlockSets + computeStartReps: all tests passed
weekReps + restReps: all tests passed
```

---

### Task 6: Write the generatePlan integration test

**Files:**
- Modify: `progression.test.js`

- [ ] **Step 1: Update the require and append integration assertions**

Replace the require at the top of `progression.test.js`:

```js
const {
  EXERCISES,
  computeBlockSets,
  computeStartReps,
  weekReps,
  restReps,
  generatePlan,
} = require("./progression.js");
```

Append at the bottom of `progression.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — expect failure on new assertions**

```
node progression.test.js
```

Expected output: `Error: not implemented` (from generatePlan stub)

---

### Task 7: Implement generatePlan

**Files:**
- Modify: `progression.js`

- [ ] **Step 1: Replace the generatePlan stub**

```js
function generatePlan() {
  const plan = [];
  for (let b = 0; b < PROGRAM.numBlocks; b++) {
    const baseWeek = b * 4;
    // 3 active weeks
    for (let w = 0; w < PROGRAM.activeWeeksPerBlock; w++) {
      const entry = { wk: baseWeek + w + 1, label: null };
      for (const [key, ex] of Object.entries(EXERCISES)) {
        entry[key] = [computeBlockSets(ex, b), weekReps(ex, b, w)];
      }
      plan.push(entry);
    }
    // 1 rest week — block 3 (0-indexed: b=2) gets the mid-test label
    const isBlockThree = (b === PROGRAM.setJumpAtBlock - 1);
    const restEntry = {
      wk: baseWeek + 4,
      label: isBlockThree ? "Rest + mid-test" : "Rest week",
    };
    for (const [key, ex] of Object.entries(EXERCISES)) {
      restEntry[key] = [ex.restSets, restReps(ex, b)];
    }
    plan.push(restEntry);
  }
  // Block 6: deload, test week, maintain ×2 — kept explicit, no formula applies
  plan.push(...SPECIAL_WEEKS);
  return plan;
}
```

- [ ] **Step 2: Run the full test suite — expect all pass**

```
node progression.test.js
```

Expected output:
```
computeBlockSets + computeStartReps: all tests passed
weekReps + restReps: all tests passed
generatePlan: all tests passed
```

---

### Task 8: Wire up app.js and index.html

**Files:**
- Modify: `index.html`
- Modify: `app.js`

- [ ] **Step 1: Read index.html to find the script tag location**

Read `index.html` and locate the `<script src="app.js">` line.

- [ ] **Step 2: Add progression.js script tag before app.js in index.html**

Add `<script src="progression.js"></script>` immediately before the existing `<script src="app.js"></script>` line.

- [ ] **Step 3: In app.js, replace the PLAN array with a generatePlan() call**

Delete lines 23–54 (the entire `const PLAN = [ ... ]` block including all 24 entries) and replace with:

```js
const PLAN = generatePlan();
```

- [ ] **Step 4: Open the app in a browser and verify**

Open `index.html` in a browser. Verify:
- All 24 weeks render across 6 phase banners
- Week 9 shows 7 sets in the workout modal (the set-jump week)
- Clicking any day opens the modal with correct sets × reps for all four exercises
- No console errors
