# Adaptive Plan Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-adjust each exercise's planned reps for the upcoming session based on the user's most recent logged performance, computed on-the-fly from `progress.workouts` with no persisted plan data.

**Architecture:** A new `plan-adjustment.js` file exposes three pure functions (`findLastDone`, `findFirstSkipAfterWeek`, `computeEffectivePlan`) that scan `progress.workouts` to compute an adjusted `[sets, reps]` pair. In `openModal`, `app.js` calls `computeEffectivePlan` for the main exercise and for crunches, wraps the results in an `effectivePlanWeek` object spread from `planWeek`, and passes it through the plan-hint, form-builder, and log-handler code paths. Test weeks and "no history" cases fall back to the base plan unchanged.

**Tech Stack:** Vanilla JS, Node.js built-in `assert` for tests (same pattern as `workout-state.test.js`).

---

## File Map

| File | Change |
|------|--------|
| `plan-adjustment.js` | New: `findLastDone`, `findFirstSkipAfterWeek`, `computeEffectivePlan` + dual Node.js export |
| `plan-adjustment.test.js` | New: unit tests for all three functions |
| `app.js` | `openModal`: hoist `exKey`/`ex`, compute `effectivePlanWeek`, use it in plan-hint / form / handlers |
| `index.html` | Add `<script src="plan-adjustment.js"></script>` before `app.js` |
| `Makefile` | Append `&& node plan-adjustment.test.js` to `test` target |

---

### Task 1: `findLastDone` — tests and implementation

**Files:**
- Create: `plan-adjustment.test.js`
- Create: `plan-adjustment.js`

Background: `progress.workouts` is keyed by `"weekN-dayKey"` (e.g. `"3-mon"`). Each entry looks like `{ status: "done", actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } }`. An individual exercise can be skipped within a session: `{ status: "done", actual: { pu: "skipped", cr: [15,15,15] } }`. `findLastDone` must return only entries where the exercise's `actual` value is an array (not `"skipped"` and not missing). For `cr` (which has no fixed day — `exercises.cr.day = null`), scan all three strength days (`mon`, `wed`, `fri`) for each candidate week.

- [ ] **Step 1: Confirm baseline tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all three existing suites pass.

- [ ] **Step 2: Create `plan-adjustment.test.js` with `findLastDone` tests**

Create `/mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.test.js`:

```js
const assert = require("assert");
const { findLastDone, findFirstSkipAfterWeek, computeEffectivePlan } = require("./plan-adjustment.js");

const EXERCISES = {
  pu: { day: "mon" },
  pl: { day: "wed" },
  sq: { day: "fri" },
  cr: { day: null  },
};

// --- findLastDone ---

// no history → null
assert.strictEqual(
  findLastDone("pu", 3, {}, EXERCISES),
  null,
  "no history → null"
);

// one done week → returns it
assert.deepStrictEqual(
  findLastDone("pu", 3, {
    "2-mon": { status: "done", actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
  }, EXERCISES),
  { weekN: 2, actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
  "one done week → returns it"
);

// two done weeks → most recent
assert.deepStrictEqual(
  findLastDone("pu", 3, {
    "1-mon": { status: "done", actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
    "2-mon": { status: "done", actual: { pu: [9,9,9,9,9,9], cr: [15,15,15] } },
  }, EXERCISES),
  { weekN: 2, actual: { pu: [9,9,9,9,9,9], cr: [15,15,15] } },
  "two done weeks → most recent"
);

// skipped exercise → skip over it, return earlier done
assert.deepStrictEqual(
  findLastDone("pu", 3, {
    "1-mon": { status: "done", actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
    "2-mon": { status: "done", actual: { pu: "skipped",     cr: [15,15,15] } },
  }, EXERCISES),
  { weekN: 1, actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
  "skipped exercise → skip over it"
);

// beforeWeekN = 0 → nothing to scan → null
assert.strictEqual(
  findLastDone("pu", 0, {
    "1-mon": { status: "done", actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
  }, EXERCISES),
  null,
  "beforeWeekN = 0 → null"
);

// cr searches wed
assert.deepStrictEqual(
  findLastDone("cr", 3, {
    "2-wed": { status: "done", actual: { pl: [5,5,5,5,5,5], cr: [17,17,17] } },
  }, EXERCISES),
  { weekN: 2, actual: { pl: [5,5,5,5,5,5], cr: [17,17,17] } },
  "cr found on wed"
);

// cr searches fri
assert.deepStrictEqual(
  findLastDone("cr", 3, {
    "2-fri": { status: "done", actual: { sq: [15,15,15,15,15,15], cr: [17,17,17] } },
  }, EXERCISES),
  { weekN: 2, actual: { sq: [15,15,15,15,15,15], cr: [17,17,17] } },
  "cr found on fri"
);

console.log("findLastDone: all tests passed.");
```

- [ ] **Step 3: Run to verify it fails**

```bash
node /mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.test.js
```

Expected: `Cannot find module './plan-adjustment.js'`

- [ ] **Step 4: Create `plan-adjustment.js` with `findLastDone` and stubs**

Create `/mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.js`:

```js
function findLastDone(exKey, beforeWeekN, workouts, exercises) {
  const days = exKey === "cr" ? ["mon", "wed", "fri"] : [exercises[exKey].day];
  for (let w = beforeWeekN; w >= 1; w--) {
    for (const d of days) {
      const entry = workouts[w + "-" + d];
      if (entry && entry.actual && Array.isArray(entry.actual[exKey])) {
        return { weekN: w, actual: entry.actual };
      }
    }
  }
  return null;
}

function findFirstSkipAfterWeek(exKey, afterWeekN, beforeWeekN, workouts, exercises) {
  throw new Error("not implemented");
}

function computeEffectivePlan(exKey, weekN, workouts, plan, exercises) {
  throw new Error("not implemented");
}

if (typeof module !== "undefined") {
  module.exports = { findLastDone, findFirstSkipAfterWeek, computeEffectivePlan };
}
```

- [ ] **Step 5: Run to verify `findLastDone` tests pass**

```bash
node /mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.test.js
```

Expected: `findLastDone: all tests passed.`

---

### Task 2: `findFirstSkipAfterWeek` — tests and implementation

**Files:**
- Modify: `plan-adjustment.test.js`
- Modify: `plan-adjustment.js`

Background: This function scans from `afterWeekN + 1` up to `beforeWeekN - 1` (exclusive on both ends). It looks for an entry where `actual[exKey] === "skipped"` (a string, not an array). For `cr`, it scans all three strength days per week, same as `findLastDone`. Returns the week number of the **first** (lowest) matching week, or `null`.

- [ ] **Step 1: Append `findFirstSkipAfterWeek` tests to the test file**

Append to `/mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.test.js`:

```js
// --- findFirstSkipAfterWeek ---

// no skip → null
assert.strictEqual(
  findFirstSkipAfterWeek("pu", 1, 4, {}, EXERCISES),
  null,
  "no skip → null"
);

// one skip → returns its weekN
assert.strictEqual(
  findFirstSkipAfterWeek("pu", 1, 4, {
    "2-mon": { status: "done", actual: { pu: "skipped", cr: [15,15,15] } },
  }, EXERCISES),
  2,
  "skip at week 2 → 2"
);

// multiple skips → returns earliest (lowest weekN)
assert.strictEqual(
  findFirstSkipAfterWeek("pu", 1, 5, {
    "3-mon": { status: "done", actual: { pu: "skipped", cr: [15,15,15] } },
    "2-mon": { status: "done", actual: { pu: "skipped", cr: [15,15,15] } },
  }, EXERCISES),
  2,
  "multiple skips → earliest"
);

// done entry (not skipped) is ignored
assert.strictEqual(
  findFirstSkipAfterWeek("pu", 1, 4, {
    "2-mon": { status: "done", actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
  }, EXERCISES),
  null,
  "done entry is not a skip"
);

// cr skip found on any strength day
assert.strictEqual(
  findFirstSkipAfterWeek("cr", 1, 4, {
    "2-fri": { status: "done", actual: { sq: [15,15,15,15,15,15], cr: "skipped" } },
  }, EXERCISES),
  2,
  "cr skip found on fri"
);

// boundary: afterWeekN+1 > beforeWeekN-1 → empty range → null
assert.strictEqual(
  findFirstSkipAfterWeek("pu", 1, 2, {
    "1-mon": { status: "done", actual: { pu: "skipped", cr: [15,15,15] } },
    "2-mon": { status: "done", actual: { pu: "skipped", cr: [15,15,15] } },
  }, EXERCISES),
  null,
  "empty range (afterWeekN=1, beforeWeekN=2) → null"
);

console.log("findFirstSkipAfterWeek: all tests passed.");
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
node /mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.test.js
```

Expected: error `not implemented` thrown from `findFirstSkipAfterWeek`.

- [ ] **Step 3: Implement `findFirstSkipAfterWeek` in `plan-adjustment.js`**

Replace:
```js
function findFirstSkipAfterWeek(exKey, afterWeekN, beforeWeekN, workouts, exercises) {
  throw new Error("not implemented");
}
```

With:
```js
function findFirstSkipAfterWeek(exKey, afterWeekN, beforeWeekN, workouts, exercises) {
  const days = exKey === "cr" ? ["mon", "wed", "fri"] : [exercises[exKey].day];
  for (let w = afterWeekN + 1; w <= beforeWeekN - 1; w++) {
    for (const d of days) {
      const entry = workouts[w + "-" + d];
      if (entry && entry.actual && entry.actual[exKey] === "skipped") {
        return w;
      }
    }
  }
  return null;
}
```

- [ ] **Step 4: Run to verify all tests pass so far**

```bash
node /mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.test.js
```

Expected:
```
findLastDone: all tests passed.
findFirstSkipAfterWeek: all tests passed.
```

---

### Task 3: `computeEffectivePlan` — tests and implementation

**Files:**
- Modify: `plan-adjustment.test.js`
- Modify: `plan-adjustment.js`

Background: The formula is:
```
delta            = Math.round((actualTotal - baseSets * baseReps) / baseSets)
effectiveReps    = Math.max(1, anchorReps + delta)
effectiveSets    = planFor(weekN)[exKey][0]   // always from the current week's base plan
```
Where `baseSets`/`baseReps` come from the plan for the week when `lastDone` occurred, and `anchorReps` is either the current week's base reps (no skip) or the first-skip week's base reps (skip exists). `computeEffectivePlan` calls `findLastDone(exKey, weekN - 1, ...)` — note `weekN - 1`, not `weekN`, so it searches weeks strictly before `weekN`.

- [ ] **Step 1: Append `computeEffectivePlan` tests to the test file**

Append to `/mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.test.js`:

```js
// --- computeEffectivePlan ---

const PLAN = [
  { wk: 1, pu: [6, 10], pl: [6,  5], sq: [6, 15], cr: [3, 15] },
  { wk: 2, pu: [6, 11], pl: [6,  6], sq: [6, 17], cr: [3, 17] },
  { wk: 3, pu: [6, 12], pl: [6,  7], sq: [6, 19], cr: [3, 19] },
  { wk: 4, pu: [4,  7], pl: [4,  4], sq: [4, 11], cr: [2, 11] },
  { wk: 5, pu: [6, 10], pl: [6,  5], sq: [6, 15], cr: [3, 15] },
];

// no history → base plan unchanged
assert.deepStrictEqual(
  computeEffectivePlan("pu", 2, {}, PLAN, EXERCISES),
  [6, 11],
  "no history → base plan"
);

// exact performance (actual total = base total) → delta = 0, base reps
// week 1: [6,10]=60; actual [10×6]=60; delta=round(0/6)=0; anchor=11; eff=11
assert.deepStrictEqual(
  computeEffectivePlan("pu", 2, {
    "1-mon": { status: "done", actual: { pu: [10,10,10,10,10,10], cr: [15,15,15] } },
  }, PLAN, EXERCISES),
  [6, 11],
  "exact performance → base reps"
);

// underperformance → reduced reps
// week 1: [6,10]=60; actual [8×6]=48; delta=round((48-60)/6)=-2; anchor=11; eff=9
assert.deepStrictEqual(
  computeEffectivePlan("pu", 2, {
    "1-mon": { status: "done", actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
  }, PLAN, EXERCISES),
  [6, 9],
  "underperformance → reduced reps"
);

// overperformance → increased reps
// week 1: [6,10]=60; actual [12×6]=72; delta=round((72-60)/6)=2; anchor=11; eff=13
assert.deepStrictEqual(
  computeEffectivePlan("pu", 2, {
    "1-mon": { status: "done", actual: { pu: [12,12,12,12,12,12], cr: [15,15,15] } },
  }, PLAN, EXERCISES),
  [6, 13],
  "overperformance → increased reps"
);

// skip between lastDone and current → anchorReps frozen at first skip week
// lastDone=wk1; firstSkip=wk2; current=wk3
// delta=round((48-60)/6)=-2; anchorReps=planFor(2).pu[1]=11; eff=max(1,11-2)=9
// effectiveSets=planFor(3).pu[0]=6
assert.deepStrictEqual(
  computeEffectivePlan("pu", 3, {
    "1-mon": { status: "done", actual: { pu: [8,8,8,8,8,8], cr: [15,15,15] } },
    "2-mon": { status: "done", actual: { pu: "skipped",     cr: [15,15,15] } },
  }, PLAN, EXERCISES),
  [6, 9],
  "skip present → anchor frozen at skip week"
);

// reps never below 1
// week 1: [6,10]=60; actual=[2]=2; delta=round((2-60)/6)=round(-9.67)=-10; eff=max(1,11-10)=1
assert.deepStrictEqual(
  computeEffectivePlan("pu", 2, {
    "1-mon": { status: "done", actual: { pu: [2], cr: [15,15,15] } },
  }, PLAN, EXERCISES),
  [6, 1],
  "reps clamped to minimum 1"
);

// effectiveSets always follows base plan (even when set count changes between weeks)
// week 3 done: [6,12]=72; actual [12×6]=72; delta=0; anchor=planFor(4).pu[1]=7; eff=7
// effectiveSets=planFor(4).pu[0]=4
assert.deepStrictEqual(
  computeEffectivePlan("pu", 4, {
    "3-mon": { status: "done", actual: { pu: [12,12,12,12,12,12], cr: [15,15,15] } },
  }, PLAN, EXERCISES),
  [4, 7],
  "effectiveSets always from base plan"
);

// cr independence — most recent cr entry across any strength day
// cr on wed wk1: plan [3,15]=45; actual [17×3]=51; delta=round((51-45)/3)=2
// anchorReps=planFor(2).cr[1]=17; eff=19; effectiveSets=3
assert.deepStrictEqual(
  computeEffectivePlan("cr", 2, {
    "1-wed": { status: "done", actual: { pl: [5,5,5,5,5,5], cr: [17,17,17] } },
  }, PLAN, EXERCISES),
  [3, 19],
  "cr uses entry from any strength day"
);

console.log("computeEffectivePlan: all tests passed.");
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
node /mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.test.js
```

Expected: error `not implemented` from `computeEffectivePlan`.

- [ ] **Step 3: Implement `computeEffectivePlan` in `plan-adjustment.js`**

Replace:
```js
function computeEffectivePlan(exKey, weekN, workouts, plan, exercises) {
  throw new Error("not implemented");
}
```

With:
```js
function computeEffectivePlan(exKey, weekN, workouts, plan, exercises) {
  function planFor(wk) { return plan.find(p => p.wk === wk); }

  const lastDone = findLastDone(exKey, weekN - 1, workouts, exercises);
  if (!lastDone) return planFor(weekN)[exKey];

  const basePlan       = planFor(lastDone.weekN)[exKey];
  const actualTotal    = lastDone.actual[exKey].reduce((s, v) => s + v, 0);
  const delta          = Math.round((actualTotal - basePlan[0] * basePlan[1]) / basePlan[0]);

  const firstSkip  = findFirstSkipAfterWeek(exKey, lastDone.weekN, weekN, workouts, exercises);
  const anchorReps = firstSkip ? planFor(firstSkip)[exKey][1] : planFor(weekN)[exKey][1];

  return [planFor(weekN)[exKey][0], Math.max(1, anchorReps + delta)];
}
```

- [ ] **Step 4: Run to verify all tests pass**

```bash
node /mnt/990Pro2TB/code/js/fitness-calendar/plan-adjustment.test.js
```

Expected:
```
findLastDone: all tests passed.
findFirstSkipAfterWeek: all tests passed.
computeEffectivePlan: all tests passed.
```

- [ ] **Step 5: Run full test suite (existing tests still pass)**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all existing suites pass (make test does not yet include `plan-adjustment.test.js` — that's added in Task 4).

---

### Task 4: Wire into `app.js`, `index.html`, `Makefile`

**Files:**
- Modify: `index.html` (1 edit)
- Modify: `Makefile` (1 edit)
- Modify: `app.js` (4 edits in `openModal`)

Background: In `openModal`, there are three separate `if (currentUser && isStrength && planWeek && !planWeek.test)` blocks. Currently each one redeclares `const [exKey, ex] = ...` and uses `planWeek` directly. The plan is to: (1) add `let exKey, ex, effectivePlanWeek;` before the first block, (2) in the first block change `const [exKey, ex] =` to `[exKey, ex] =` (no `const`) and compute `effectivePlanWeek` using the two `computeEffectivePlan` calls, (3) in the second block remove the now-duplicate `[exKey, ex]` declaration and replace `planWeek` with `effectivePlanWeek` in `buildStrengthFormHTML`, (4) in the third block replace `planWeek` with `effectivePlanWeek` in `attachStrengthLogHandlers`.

- [ ] **Step 1: Add script tag to `index.html`**

In `/mnt/990Pro2TB/code/js/fitness-calendar/index.html`, find:
```html
<script src="workout-state.js"></script>
<script src="app.js"></script>
```

Replace with:
```html
<script src="workout-state.js"></script>
<script src="plan-adjustment.js"></script>
<script src="app.js"></script>
```

- [ ] **Step 2: Update `Makefile` test target**

In `/mnt/990Pro2TB/code/js/fitness-calendar/Makefile`, find:
```
	node firebase.test.js && node progression.test.js && node workout-state.test.js
```

Replace with:
```
	node firebase.test.js && node progression.test.js && node workout-state.test.js && node plan-adjustment.test.js
```

- [ ] **Step 3: Hoist `exKey`/`ex`/`effectivePlanWeek` and update the plan-hint block**

In `/mnt/990Pro2TB/code/js/fitness-calendar/app.js`, find:
```js
  const isStrength = (s.tag || "").startsWith("strength") || s.tag === "deload";
  if (currentUser && isStrength && planWeek && !planWeek.test) {
    const [exKey, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === dKey);
    const [puS, puR] = planWeek[exKey];
    const [crS, crR] = planWeek.cr;
```

Replace with:
```js
  const isStrength = (s.tag || "").startsWith("strength") || s.tag === "deload";
  let exKey, ex, effectivePlanWeek;
  if (currentUser && isStrength && planWeek && !planWeek.test) {
    [exKey, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === dKey);
    effectivePlanWeek = {
      ...planWeek,
      [exKey]: computeEffectivePlan(exKey, weekN, progress.workouts, PLAN, EXERCISES),
      cr:      computeEffectivePlan('cr',  weekN, progress.workouts, PLAN, EXERCISES),
    };
    const [puS, puR] = effectivePlanWeek[exKey];
    const [crS, crR] = effectivePlanWeek.cr;
```

- [ ] **Step 4: Remove duplicate `[exKey, ex]` declaration from the log-section block**

In `app.js`, find:
```js
    const logged = getWorkout(weekN, dKey);
    const [exKey, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === dKey);
    let logInner;
```

Replace with:
```js
    const logged = getWorkout(weekN, dKey);
    let logInner;
```

- [ ] **Step 5: Use `effectivePlanWeek` in `buildStrengthFormHTML` call**

In `app.js`, find:
```js
      logInner = buildStrengthFormHTML(exKey, ex, planWeek, null);
```

Replace with:
```js
      logInner = buildStrengthFormHTML(exKey, ex, effectivePlanWeek, null);
```

- [ ] **Step 6: Use `effectivePlanWeek` in `attachStrengthLogHandlers` call**

In `app.js`, find:
```js
    attachStrengthLogHandlers(weekN, dKey, planWeek);
```

Replace with:
```js
    attachStrengthLogHandlers(weekN, dKey, effectivePlanWeek);
```

- [ ] **Step 7: Run full test suite**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all four suites pass including `plan-adjustment.test.js`.

- [ ] **Step 8: Smoke test in browser**

With `make dev` running at `http://localhost:5000`, sign in and open a strength day:

1. **No history (week 1 or no logged workouts):** plan hint shows base plan values unchanged (e.g., "Push-ups 6×10 · Crunches 3×15" for week 1).
2. **Underperformance:** log push-ups at 8 reps per set when plan is 10 (6 sets → actual 48 vs planned 60, delta = -2). Close and open the next week's push day: hint should show `6×9` (not `6×11`).
3. **Overperformance:** log at 12 reps per set (actual 72, delta = +2). Next week: hint shows `6×13`.
4. **Skip:** within a logged session, skip push-ups (save with pu=skipped). Open the following week: hint should show anchorReps from the skip week, not the later week (plan frozen at skip point).
5. **Test week (week 22):** open any strength day — shows base plan as-is (no adjustment applied).
6. **Form inputs:** the per-set inputs in the logging form should be prefilled with the effective reps, not the base plan reps.

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| `findLastDone` algorithm | Task 1 |
| `findFirstSkipAfterWeek` algorithm | Task 2 |
| `computeEffectivePlan` formula | Task 3 |
| `cr` scans all three strength days | Tasks 1, 2, 3 (test + impl) |
| delta = round((actual − base) / baseSets) | Task 3 |
| anchorReps frozen at first skip week | Task 3 |
| reps clamped to minimum 1 | Task 3 |
| effectiveSets always from base plan | Task 3 |
| Plan-hint uses effective plan | Task 4 Step 3 |
| `buildStrengthFormHTML` uses effective plan | Task 4 Step 5 |
| `attachStrengthLogHandlers` uses effective plan | Task 4 Step 6 |
| `index.html` script tag | Task 4 Step 1 |
| `Makefile` test target | Task 4 Step 2 |
| Test weeks → no adjustment (existing `!planWeek.test` guard preserved) | Task 4 (guard unchanged) |
| No history → base plan | Task 3 |
| Per-exercise independence (`exKey` and `cr` computed separately) | Task 4 Step 3 |
| Dual Node.js export | Task 1 Step 4 |

All spec requirements covered.

### Placeholder scan

No placeholders. All test cases have exact numeric values with derivation comments. All implementation steps show complete code.

### Type consistency

- `findLastDone` → `{ weekN: number, actual: object } | null`; used as `lastDone.weekN` and `lastDone.actual[exKey]` in Task 3 ✓
- `findFirstSkipAfterWeek` → `number | null`; used as `firstSkip ? planFor(firstSkip)[exKey][1] : ...` in Task 3 ✓
- `computeEffectivePlan` → `[number, number]` (sets, reps); matches the `planWeek[exKey]` shape expected by `buildStrengthFormHTML` and `attachStrengthLogHandlers` ✓
- `effectivePlanWeek` spreads `planWeek` and overrides `[exKey]` and `cr` with `[sets, reps]` arrays — compatible with all three callers ✓
