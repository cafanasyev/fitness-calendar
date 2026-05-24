# Svelte Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace imperative DOM manipulation in app.js with a Svelte 5 component tree, convert all JS files to ES modules, and migrate Firebase from CDN globals to the modular npm SDK.

**Architecture:** All pure logic moves to `src/lib/` as ES modules with `export` keywords. `firebase.js` splits into `src/lib/schedule.js` (pure helpers) and `src/lib/firebase.js` (Firebase SDK). `app.js` is replaced by `src/App.svelte` orchestrating nine components. All reactive state lives in App.svelte as `$state()` runes.

**Tech Stack:** Svelte 5, Vite 6, Firebase 10 (modular npm SDK)

**Spec:** `docs/superpowers/specs/2026-05-23-svelte-migration-design.md`

---

## File Map

```
CREATE src/lib/progression.js     — PROGRAM, EXERCISES, generatePlan() (exported)
CREATE src/lib/workout-state.js   — canSave, buildActual, applyEditAll (exported)
CREATE src/lib/plan-adjustment.js — computeEffectivePlan (exported)
CREATE src/lib/icons.js           — iconFor, ICONS (exported)
CREATE src/lib/dates.js           — toISO, fromISO, addDays, startOfWeekMonday, sameYMD, fmtDayDate, fmtRange
CREATE src/lib/schedule.js        — LOGGABLE_DAYS_OFFSET, workoutDate, autoSkipPast, getToday
CREATE src/lib/firebase.js        — Firebase init + signIn/out/loadProgress/save* exports
CREATE src/components/Header.svelte
CREATE src/components/Calendar.svelte
CREATE src/components/WeekRow.svelte
CREATE src/components/DayCell.svelte
CREATE src/components/Modal.svelte
CREATE src/components/WorkoutDetails.svelte
CREATE src/components/ExerciseSection.svelte
CREATE src/components/StrengthLog.svelte
CREATE src/components/JumpRopeLog.svelte
CREATE schedule.test.js           — replaces firebase.test.js (drops initEmulatorIfNeeded tests)
MODIFY src/App.svelte             — full app root (replace placeholder)
MODIFY src/main.js                — mount App on #app
MODIFY index.html                 — clean Vite entry, no <script src> tags
MODIFY package.json               — add firebase dependency
MODIFY progression.test.js        — require → import, update path
MODIFY workout-state.test.js      — require → import, update path
MODIFY plan-adjustment.test.js    — require → import, update path
MODIFY Makefile                   — update test target: firebase.test.js → schedule.test.js
DELETE app.js
DELETE progression.js, firebase.js, workout-state.js, plan-adjustment.js, icons.js (root)
DELETE firebase.test.js
```

---

## Task 1: Migrate pure logic files to src/lib/

**Files:**
- Create: `src/lib/progression.js`, `src/lib/workout-state.js`, `src/lib/plan-adjustment.js`, `src/lib/icons.js`
- Modify: `progression.test.js`, `workout-state.test.js`, `plan-adjustment.test.js`

The three test files currently use `require()` which is already broken (package.json has `"type": "module"`). Updating them to ESM also fixes that.

- [ ] **Step 1: Update progression.test.js to use import**

Replace the first two lines of `progression.test.js`:
```js
import assert from 'assert';
import {
  EXERCISES,
  computeBlockSets,
  computeStartReps,
  weekReps,
  restReps,
  generatePlan,
} from './src/lib/progression.js';
```

- [ ] **Step 2: Run the test to confirm it fails (src/lib/progression.js doesn't exist yet)**

```bash
node progression.test.js
```
Expected: Error — `Cannot find module './src/lib/progression.js'`

- [ ] **Step 3: Create src/lib/progression.js**

```js
export const PROGRAM = {
  numBlocks: 5,
  activeWeeksPerBlock: 3,
  setJumpAtBlock: 3,
  restFraction: 0.58,
};

export const EXERCISES = {
  pu: { name: "Push-ups", day: "mon", dayName: "Push", restPeriod: "90 seconds",
        initialReps: 10, increment: 1, transitionBonus: 1,
        initialSets: 6, peakSets: 7, restSets: 4 },
  pl: { name: "Pull-ups", day: "wed", dayName: "Pull", restPeriod: "2 minutes",
        initialReps: 5,  increment: 1, transitionBonus: 0,
        initialSets: 6, peakSets: 7, restSets: 4 },
  sq: { name: "Squats",   day: "fri", dayName: "Legs", restPeriod: "90 seconds",
        blockStartReps: [15, 22, 22, 26, 30], increment: 2,
        initialSets: 6, peakSets: 7, restSets: 4 },
  cr: { name: "Crunches", day: null,  dayName: null,   restPeriod: "60 seconds",
        blockStartReps: [15, 20, 22, 25, 28], increment: 2,
        sets: 3,
        restSets: 2 },
};

export const SPECIAL_WEEKS = [
  { wk: 21, pu: [4, 10], pl: [4, 5],  sq: [4, 15], cr: [2, 15], label: "Full deload" },
  { wk: 22, test: true,                                            label: "TEST WEEK"  },
  { wk: 23, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain"   },
  { wk: 24, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain"   },
];

export function computeBlockSets(ex, blockIdx) {
  if (ex.sets !== undefined) return ex.sets;
  return blockIdx + 1 < PROGRAM.setJumpAtBlock ? ex.initialSets : ex.peakSets;
}

export function computeStartReps(ex, blockIdx) {
  if (ex.blockStartReps) return ex.blockStartReps[blockIdx];
  if (blockIdx === 0) return ex.initialReps;
  const prevSets  = computeBlockSets(ex, blockIdx - 1);
  const currSets  = computeBlockSets(ex, blockIdx);
  const prevStart = computeStartReps(ex, blockIdx - 1);
  const prevEnd   = prevStart + (PROGRAM.activeWeeksPerBlock - 1) * ex.increment;
  if (currSets > prevSets) return prevStart;
  return prevEnd + ex.transitionBonus;
}

export function weekReps(ex, blockIdx, weekInBlock) {
  return computeStartReps(ex, blockIdx) + weekInBlock * ex.increment;
}

export function restReps(ex, blockIdx) {
  const peak = computeStartReps(ex, blockIdx) + (PROGRAM.activeWeeksPerBlock - 1) * ex.increment;
  return Math.round(peak * PROGRAM.restFraction);
}

export function generatePlan() {
  const plan = [];
  for (let b = 0; b < PROGRAM.numBlocks; b++) {
    const baseWeek = b * 4;
    for (let w = 0; w < PROGRAM.activeWeeksPerBlock; w++) {
      const entry = { wk: baseWeek + w + 1, label: null };
      for (const [key, ex] of Object.entries(EXERCISES)) {
        entry[key] = [computeBlockSets(ex, b), weekReps(ex, b, w)];
      }
      plan.push(entry);
    }
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
  plan.push(...SPECIAL_WEEKS);
  return plan;
}
```

- [ ] **Step 4: Run progression.test.js to confirm it passes**

```bash
node progression.test.js
```
Expected: Three `console.log` lines ending with "all tests passed"

- [ ] **Step 5: Update workout-state.test.js**

Replace the first two lines:
```js
import assert from 'assert';
import { canSave, buildActual, applyEditAll } from './src/lib/workout-state.js';
```

- [ ] **Step 6: Create src/lib/workout-state.js**

```js
export function canSave(exState, exKey) {
  return (exKey in exState) && ('cr' in exState);
}

export function buildActual(exState, exKey) {
  return { [exKey]: exState[exKey], cr: exState.cr };
}

export function applyEditAll(exState, savedActual, exKey) {
  if (!savedActual) return;
  if (exKey in savedActual) exState[exKey] = savedActual[exKey];
  if ('cr' in savedActual) exState.cr = savedActual.cr;
}
```

- [ ] **Step 7: Run workout-state.test.js**

```bash
node workout-state.test.js
```
Expected: `All workout-state tests passed.`

- [ ] **Step 8: Update plan-adjustment.test.js**

Replace the first two lines:
```js
import assert from 'assert';
import { findLastDone, findFirstSkipAfterWeek, computeEffectivePlan } from './src/lib/plan-adjustment.js';
```

- [ ] **Step 9: Create src/lib/plan-adjustment.js**

```js
const CR_DAYS = ["fri", "wed", "mon"];

export function findLastDone(exKey, beforeWeekN, workouts, exercises) {
  const days = exKey === "cr" ? CR_DAYS : [exercises[exKey].day];
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

export function findFirstSkipAfterWeek(exKey, afterWeekN, beforeWeekN, workouts, exercises) {
  const days = exKey === "cr" ? CR_DAYS : [exercises[exKey].day];
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

export function computeEffectivePlan(exKey, weekN, workouts, plan, exercises) {
  function planFor(wk) {
    const p = plan.find(q => q.wk === wk);
    if (!p) throw new Error("computeEffectivePlan: no plan entry for week " + wk);
    return p;
  }

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

- [ ] **Step 10: Run plan-adjustment.test.js**

```bash
node plan-adjustment.test.js
```
Expected: Three `console.log` lines ending with "all tests passed."

- [ ] **Step 11: Create src/lib/icons.js**

```js
const SVG = (c) =>
  '<svg viewBox="0 0 100 70" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' +
  c +
  "</svg>";

const FLOOR = '<line x1="2" y1="62" x2="98" y2="62" opacity="0.35" stroke-width="1.5"/>';
const BAR   = '<line x1="2" y1="15" x2="98" y2="15" stroke-width="3"/>';

export const ICONS = {};

ICONS.pushup = SVG(FLOOR + `
  <line x1="85" y1="58" x2="34" y2="40"/>
  <line x1="85" y1="58" x2="88" y2="62"/>
  <circle cx="26" cy="38" r="4.5"/>
  <line x1="34" y1="40" x2="34" y2="62"/>
`);

ICONS.pullup = SVG(BAR + `
  <line x1="40" y1="15" x2="46" y2="22"/>
  <line x1="60" y1="15" x2="54" y2="22"/>
  <circle cx="50" cy="13" r="4.5"/>
  <line x1="50" y1="22" x2="50" y2="42"/>
  <line x1="50" y1="42" x2="44" y2="60"/>
  <line x1="50" y1="42" x2="56" y2="60"/>
`);

ICONS.squat = SVG(FLOOR + `
  <circle cx="50" cy="14" r="4.5"/>
  <line x1="50" y1="18" x2="50" y2="36"/>
  <line x1="50" y1="36" x2="36" y2="46"/>
  <line x1="36" y1="46" x2="38" y2="62"/>
  <line x1="50" y1="36" x2="64" y2="46"/>
  <line x1="64" y1="46" x2="62" y2="62"/>
`);

ICONS.crunch = SVG(FLOOR + `
  <circle cx="18" cy="44" r="4.5"/>
  <line x1="22" y1="48" x2="50" y2="58"/>
  <line x1="50" y1="58" x2="68" y2="40"/>
  <line x1="68" y1="40" x2="82" y2="62"/>
`);

ICONS.jumpRope = SVG(FLOOR + `
  <circle cx="50" cy="20" r="4.5"/>
  <line x1="50" y1="24" x2="50" y2="44"/>
  <line x1="50" y1="28" x2="34" y2="42"/>
  <line x1="50" y1="28" x2="66" y2="42"/>
  <line x1="50" y1="44" x2="44" y2="58"/>
  <line x1="50" y1="44" x2="56" y2="58"/>
  <path d="M 34 42 Q 50 0 66 42" stroke-width="1.5" opacity="0.6"/>
`);

ICONS.walk = SVG(FLOOR + `
  <circle cx="50" cy="14" r="4.5"/>
  <line x1="50" y1="18" x2="50" y2="38"/>
  <line x1="50" y1="38" x2="42" y2="60"/>
  <line x1="50" y1="38" x2="58" y2="58"/>
  <line x1="50" y1="22" x2="42" y2="32"/>
  <line x1="50" y1="22" x2="58" y2="34"/>
`);

export function iconFor(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("push-up"))   return ICONS.pushup;
  if (n.includes("pull-up"))   return ICONS.pullup;
  if (n.includes("squat"))     return ICONS.squat;
  if (n.includes("crunch"))    return ICONS.crunch;
  if (n.includes("jump rope")) return ICONS.jumpRope;
  if (n.includes("walk"))      return ICONS.walk;
  return null;
}
```

---

## Task 2: Add Firebase npm, create dates.js / schedule.js / firebase.js

**Files:**
- Modify: `package.json`
- Create: `src/lib/dates.js`, `src/lib/schedule.js`, `src/lib/firebase.js`, `schedule.test.js`
- Modify: `Makefile`

- [ ] **Step 1: Add firebase to package.json**

In `package.json`, add a `dependencies` section:
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^10.0.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.0.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```
Expected: `node_modules/firebase/` directory created, no errors

- [ ] **Step 3: Create src/lib/dates.js**

```js
export function toISO(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

export function fromISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfWeekMonday(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = r.getDay();
  const diff = (dow === 0 ? -6 : 1 - dow);
  return addDays(r, diff);
}

export function sameYMD(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

export function fmtDayDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtRange(a, b) {
  if (a.getMonth() === b.getMonth()) {
    return a.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + "–" + b.getDate();
  }
  return a.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " – " + b.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
```

- [ ] **Step 4: Create src/lib/schedule.js**

```js
export const LOGGABLE_DAYS_OFFSET = { mon: 0, wed: 2, thu: 3, fri: 4 };

export function workoutDate(startDateISO, weekN, dayKey) {
  const [y, m, d] = startDateISO.split("-").map(Number);
  const result = new Date(y, m - 1, d);
  result.setDate(result.getDate() + (weekN - 1) * 7 + LOGGABLE_DAYS_OFFSET[dayKey]);
  return result;
}

export function autoSkipPast(startDateISO, workouts, today) {
  const toSkip = [];
  for (let weekN = 1; weekN <= 24; weekN++) {
    for (const dayKey of Object.keys(LOGGABLE_DAYS_OFFSET)) {
      if (workouts[weekN + "-" + dayKey]) continue;
      if (workoutDate(startDateISO, weekN, dayKey) < today) {
        toSkip.push({ weekN, dayKey });
      }
    }
  }
  return toSkip;
}

export function getToday(storage, hostname) {
  if (hostname === "localhost") {
    const stored = storage.getItem("fitness.devToday");
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d)) { d.setHours(0, 0, 0, 0); return d; }
    }
  }
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
```

- [ ] **Step 5: Create schedule.test.js**

```js
import assert from 'assert';
import { workoutDate, autoSkipPast, getToday } from './src/lib/schedule.js';

// ---- workoutDate ----
assert.deepStrictEqual(workoutDate("2026-01-05", 1, "mon"), new Date(2026, 0, 5),  "w1 mon");
assert.deepStrictEqual(workoutDate("2026-01-05", 1, "wed"), new Date(2026, 0, 7),  "w1 wed");
assert.deepStrictEqual(workoutDate("2026-01-05", 1, "thu"), new Date(2026, 0, 8),  "w1 thu");
assert.deepStrictEqual(workoutDate("2026-01-05", 1, "fri"), new Date(2026, 0, 9),  "w1 fri");
assert.deepStrictEqual(workoutDate("2026-01-05", 2, "mon"), new Date(2026, 0, 12), "w2 mon");
assert.deepStrictEqual(workoutDate("2026-01-05", 2, "fri"), new Date(2026, 0, 16), "w2 fri");
assert.deepStrictEqual(workoutDate("2026-01-05", 3, "fri"), new Date(2026, 0, 23), "w3 fri");
console.log("workoutDate: all tests passed");

// ---- autoSkipPast ----
const today1 = new Date(2026, 0, 8);
const r1 = autoSkipPast("2026-01-05", {}, today1).map(e => e.weekN + "-" + e.dayKey);
assert.deepStrictEqual(r1, ["1-mon", "1-wed"], "two past days skipped");

const r2 = autoSkipPast("2026-01-05", { "1-mon": { status: "done" } }, today1)
  .map(e => e.weekN + "-" + e.dayKey);
assert.deepStrictEqual(r2, ["1-wed"], "existing entry not re-skipped");

const r3 = autoSkipPast("2026-01-08", {}, new Date(2026, 0, 8));
assert.strictEqual(r3.length, 0, "no skips when start is today");

const r4 = autoSkipPast("2026-01-05", {}, new Date(2026, 0, 14))
  .map(e => e.weekN + "-" + e.dayKey);
assert.deepStrictEqual(r4, ["1-mon","1-wed","1-thu","1-fri","2-mon"], "multi-week skip");
console.log("autoSkipPast: all tests passed");

// ---- getToday ----
const mockStorage = val => ({ getItem: () => val });

{
  const d = getToday(mockStorage("2026-01-01"), "fitness-cal.web.app");
  const real = new Date(); real.setHours(0, 0, 0, 0);
  assert.strictEqual(d.toDateString(), real.toDateString(), "non-localhost: real today");
}
{
  const d = getToday(mockStorage("2026-06-15"), "localhost");
  assert.deepStrictEqual(d, new Date(2026, 5, 15), "localhost valid: returns stored date");
}
{
  const d = getToday(mockStorage(null), "localhost");
  const real = new Date(); real.setHours(0, 0, 0, 0);
  assert.strictEqual(d.toDateString(), real.toDateString(), "localhost no stored: real today");
}
{
  const d = getToday(mockStorage("not-a-date"), "localhost");
  const real = new Date(); real.setHours(0, 0, 0, 0);
  assert.strictEqual(d.toDateString(), real.toDateString(), "localhost invalid stored: real today");
}
console.log("getToday: all tests passed");
```

- [ ] **Step 6: Run schedule.test.js**

```bash
node schedule.test.js
```
Expected: Three "all tests passed" lines

- [ ] **Step 7: Create src/lib/firebase.js**

```js
import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator,
  GoogleAuthProvider, signInWithPopup, signOut as _signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator,
  doc, getDoc, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';

const config = await fetch('/__/firebase/init.json').then(r => r.json());
const app  = initializeApp(config);
const auth = getAuth(app);
const db   = getFirestore(app);

if (location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export function signIn() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOut() {
  return _signOut(auth);
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}

function _userDoc() {
  return doc(db, 'users', auth.currentUser.uid);
}

export async function loadProgress() {
  const snap = await getDoc(_userDoc());
  if (!snap.exists()) {
    await setDoc(_userDoc(), { workouts: {} });
    return { startDate: null, workouts: {} };
  }
  const data = snap.data();
  return { startDate: data.startDate || null, workouts: data.workouts || {} };
}

export async function saveStartDate(iso) {
  await updateDoc(_userDoc(), { startDate: iso });
}

export async function saveWorkout(weekN, dayKey, status, actual) {
  const entry = { status };
  if (actual) entry.actual = actual;
  await updateDoc(_userDoc(), { [`workouts.${weekN}-${dayKey}`]: entry });
}

export async function saveAutoSkips(toSkip) {
  if (!toSkip.length) return;
  const batch = writeBatch(db);
  const ref = _userDoc();
  for (const { weekN, dayKey } of toSkip) {
    batch.update(ref, { [`workouts.${weekN}-${dayKey}`]: { status: 'skipped' } });
  }
  await batch.commit();
}
```

- [ ] **Step 8: Update Makefile test target**

In `Makefile`, change the `test` target to:
```makefile
test:
	node schedule.test.js && node progression.test.js && node workout-state.test.js && node plan-adjustment.test.js
```

- [ ] **Step 9: Run full test suite**

```bash
make test
```
Expected: All four test files pass with no errors

---

## Task 3: Scaffold App.svelte, update index.html and main.js

**Files:**
- Modify: `index.html`, `src/main.js`
- Modify: `src/App.svelte` (replace placeholder content)

This task creates the complete App.svelte with all state, helpers, and handlers. The template is a placeholder — components get wired in Tasks 4–8.

- [ ] **Step 1: Update index.html**

Replace the entire contents of `index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fitness Program — 6 Months</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Update src/main.js**

```js
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app') });
```

- [ ] **Step 3: Write src/App.svelte**

```svelte
<script>
  import { PROGRAM, EXERCISES, generatePlan } from './lib/progression.js';
  import { addDays, toISO, fromISO, startOfWeekMonday } from './lib/dates.js';
  import { autoSkipPast } from './lib/schedule.js';
  import {
    signIn, signOut, onAuthChange,
    loadProgress, saveStartDate, saveAutoSkips, saveWorkout,
  } from './lib/firebase.js';
  import { computeEffectivePlan } from './lib/plan-adjustment.js';

  // ---------- Static data ----------
  const PHASE_NOTES = [
    "6 sets per workout",
    "more reps per set",
    "7 sets per workout + mid-test",
    "more reps",
    "peak",
    "test + maintain",
  ];
  const WEEKS_PER_BLOCK = PROGRAM.activeWeeksPerBlock + 1;
  const PHASES = PHASE_NOTES.map((desc, i) => {
    const n = i + 1;
    const startWk = i * WEEKS_PER_BLOCK + 1;
    const endWk   = startWk + WEEKS_PER_BLOCK - 1;
    return { n, name: "Block " + n, color: "var(--p" + n + ")", note: "Weeks " + startWk + "–" + endWk + " · " + desc };
  });
  function phaseOf(weekN) {
    return PHASES[Math.ceil(weekN / WEEKS_PER_BLOCK) - 1];
  }
  const PLAN = generatePlan();

  function workoutForDay(p, day, label) {
    const isRest = label && /rest|deload/i.test(label);
    const [key, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === day);
    const [sets, reps] = p[key];
    return {
      tag: isRest ? "deload" : "strength-a",
      title: ex.dayName + " day" + (label ? " — " + label : ""),
      summary: ex.name + " · Crunches",
      details: [
        ["Warm-up", "5 minutes light movement — arm swings, leg swings, easy push-ups"],
        [ex.name, sets + " sets of " + reps + " reps · rest " + ex.restPeriod],
        ["Crunches", p.cr[0] + " sets of " + p.cr[1] + " reps · rest " + EXERCISES.cr.restPeriod],
        ["Cool-down", "5 minutes stretching"],
      ],
      note: isRest ? "Easy week. Recovery." : "Stop each set when form gets ugly. Don't grind ugly reps."
    };
  }
  function jumpRopeDay() {
    return { tag: "car", title: "Jump rope OR walk",
      summary: "15 min jump rope · or 30–40 min brisk walk",
      details: [
        ["Jump rope", "15 minutes — alternate two-foot bounce and alternating-foot stride. Light feet, knees soft."],
        ["Or — Walk", "30–40 minutes brisk pace"],
      ],
      note: "Pick whichever you feel like." };
  }
  function walkDay() {
    return { tag: "mob", title: "Walk OR rest",
      summary: "20–30 min easy walk · or full rest",
      details: [["Easy walk", "20–30 minutes, normal pace, anywhere outside"]],
      note: "If you're tired, rest. If you feel fine, walk." };
  }
  function restDay() {
    return { tag: "rest", title: "Rest", summary: "Sleep well. Eat well. Recover.", details: [], note: "" };
  }

  const WEEKS = {};
  for (const p of PLAN) {
    if (p.test) {
      WEEKS[p.wk] = {
        mon_override: { tag: "test", title: "TEST — Push-ups", summary: "Max push-ups in one set.",
          details: [
            ["Warm-up", "10 minutes light movement"],
            ["Push-up max", "One unbroken set. Go until you can't do another. Write down the number."],
            ["Cool-down", "5 minutes"],
          ] },
        tue_override: restDay(),
        wed_override: { tag: "test", title: "TEST — Pull-ups", summary: "Max pull-ups in one set.",
          details: [
            ["Warm-up", "10 minutes light movement"],
            ["Pull-up max", "Hang from bar, pull until chin is over the bar. Max reps. Write down the number."],
            ["Cool-down", "5 minutes"],
          ] },
        thu_override: restDay(),
        fri_override: { tag: "test", title: "TEST — Squats", summary: "Max squats in 2 minutes.",
          details: [
            ["Warm-up", "10 minutes light movement"],
            ["Squat test", "Do as many squats as you can in 2 minutes. Full depth. Write down the number."],
            ["Cool-down", "5 minutes"],
          ] },
        sat_override: { tag: "test", title: "TEST — Crunches", summary: "Max crunches in 2 minutes.",
          details: [
            ["Warm-up", "5 minutes light movement"],
            ["Crunch test", "Do as many crunches as you can in 2 minutes. Write down the number."],
          ] },
        sun_override: restDay(),
      };
    } else {
      WEEKS[p.wk] = {
        mon: workoutForDay(p, "mon", p.label),
        tue_override: walkDay(),
        wed: workoutForDay(p, "wed", p.label),
        thu_override: jumpRopeDay(),
        fri: workoutForDay(p, "fri", p.label),
        sat_override: restDay(),
        sun_override: restDay(),
      };
    }
  }

  function buildWeekSessions(weekN) {
    const w = WEEKS[weekN];
    return {
      mon: w.mon_override || w.mon,
      tue: w.tue_override || walkDay(),
      wed: w.wed_override || w.wed,
      thu: w.thu_override || jumpRopeDay(),
      fri: w.fri_override || w.fri,
      sat: w.sat_override || restDay(),
      sun: w.sun_override || restDay(),
    };
  }

  // ---------- Reactive state ----------
  let currentUser  = $state(null);
  let progress     = $state({ workouts: {} });
  let devToday     = $state(localStorage.getItem('fitness.devToday') || '');
  let modal        = $state(null); // { weekN, dKey, dDate, session, phase, planWeek, effectivePlanWeek, exEntry }

  let today = $derived.by(() => {
    if (location.hostname === 'localhost' && devToday) {
      const d = new Date(devToday);
      if (!isNaN(d)) { d.setHours(0, 0, 0, 0); return d; }
    }
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });

  function defaultStart() {
    const saved = localStorage.getItem('fitness.startDate');
    if (saved) return fromISO(saved);
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    if (dow === 1) return d;
    const daysToMon = (8 - dow) % 7;
    return addDays(d, daysToMon === 0 ? 7 : daysToMon);
  }

  let currentStart = $state(defaultStart());

  function setStart(d) {
    currentStart = d;
    localStorage.setItem('fitness.startDate', toISO(d));
    if (currentUser) saveStartDate(toISO(d)).catch(() => {});
    scrollToToday();
  }

  function scrollToToday() {
    setTimeout(() => {
      const el = document.querySelector('.day.today') || document.querySelector('.phase-banner');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  function handleDayClick(weekN, dKey, dDate, session, phase) {
    const planWeek = PLAN.find(p => p.wk === weekN);
    const isStrength = (session.tag || '').startsWith('strength') || session.tag === 'deload';
    let exEntry = null;
    let effectivePlanWeek = null;
    if (currentUser && isStrength && planWeek && !planWeek.test) {
      exEntry = Object.entries(EXERCISES).find(([, e]) => e.day === dKey);
      const exKey = exEntry[0];
      effectivePlanWeek = {
        ...planWeek,
        [exKey]: computeEffectivePlan(exKey, weekN, progress.workouts, PLAN, EXERCISES),
        cr:      computeEffectivePlan('cr',  weekN, progress.workouts, PLAN, EXERCISES),
      };
    }
    modal = { weekN, dKey, dDate, session, phase, planWeek, effectivePlanWeek, exEntry };
  }

  function handleModalClose() {
    modal = null;
  }

  async function handleWorkoutSaved(weekN, dKey, status, actual) {
    await saveWorkout(weekN, dKey, status, actual);
    const entry = { status };
    if (actual) entry.actual = actual;
    progress.workouts[weekN + '-' + dKey] = entry;
    modal = null;
  }

  // ---------- Boot ----------
  onAuthChange(async (user) => {
    currentUser = user;
    if (user) {
      progress = await loadProgress();
      if (progress.startDate) {
        currentStart = fromISO(progress.startDate);
        localStorage.setItem('fitness.startDate', progress.startDate);
      } else {
        await saveStartDate(toISO(currentStart));
      }
      const toSkip = autoSkipPast(toISO(currentStart), progress.workouts, today);
      if (toSkip.length) {
        await saveAutoSkips(toSkip);
        for (const { weekN, dayKey } of toSkip) {
          progress.workouts[weekN + '-' + dayKey] = { status: 'skipped' };
        }
      }
      scrollToToday();
    } else {
      progress = { workouts: {} };
    }
  });
</script>

<p>Loading…</p>
```

- [ ] **Step 4: Start dev server and verify no console errors**

Run `make emulators` in one terminal, then `make dev` in another.

Open `http://localhost:5173`. Expected: page loads with "Loading…" text, no console errors.

---

## Task 4: Header.svelte

**Files:**
- Create: `src/components/Header.svelte`
- Modify: `src/App.svelte` (add import, replace `<p>Loading…</p>` with `<Header>` + calendar placeholder)

- [ ] **Step 1: Create src/components/Header.svelte**

```svelte
<script>
  import { toISO } from '../lib/dates.js';

  let {
    currentUser,
    currentStart,
    phases,
    devToday,
    onStartChange,
    signIn,
    signOut,
    onTodayClick,
    onDevTodayChange,
  } = $props();
</script>

<header>
  <div>
    <h1>6-Month Bodyweight Program</h1>
    <div class="sub">Push-ups · Pull-ups · Squats · Crunches · Jump rope</div>
  </div>
  <div class="controls">
    <div class="legend">
      {#each phases as p}
        <span><span class="swatch" style="background:{p.color}"></span>B{p.n}</span>
      {/each}
    </div>
    <label for="startDate">Week 1 Mon:</label>
    <input
      type="date"
      id="startDate"
      value={toISO(currentStart)}
      onchange={e => onStartChange(e.target.value)}
    />
    <button onclick={onTodayClick}>Today</button>
    <div class="auth-control">
      {#if currentUser}
        <div class="auth-user">
          {#if currentUser.photoURL && /^https:\/\//.test(currentUser.photoURL)}
            <img src={currentUser.photoURL} alt="" />
          {/if}
          <span>{currentUser.displayName || currentUser.email || ''}</span>
          <button onclick={signOut}>Sign out</button>
        </div>
      {:else}
        <button onclick={signIn}>Sign in with Google</button>
      {/if}
    </div>
    {#if location.hostname === 'localhost'}
      <div id="dev-today">
        <label for="devTodayInput">Dev today:</label>
        <input
          type="date"
          id="devTodayInput"
          value={devToday}
          onchange={e => onDevTodayChange(e.target.value)}
        />
      </div>
    {/if}
  </div>
</header>
```

- [ ] **Step 2: Add Header to App.svelte**

Add this import to the top of the `<script>` block in `src/App.svelte` (after the existing imports):
```js
import Header from './components/Header.svelte';
```

Replace the `<p>Loading…</p>` template with:
```svelte
<Header
  {currentUser}
  {currentStart}
  phases={PHASES}
  {devToday}
  onStartChange={d => setStart(startOfWeekMonday(fromISO(d)))}
  {signIn}
  {signOut}
  onTodayClick={scrollToToday}
  onDevTodayChange={v => {
    devToday = v;
    if (v) localStorage.setItem('fitness.devToday', v);
    else localStorage.removeItem('fitness.devToday');
  }}
/>
<main id="cal">
  <p>Calendar coming…</p>
</main>
<footer>Click any day to see the full prescription. The schedule auto-shifts based on your Week 1 Monday.</footer>
```

- [ ] **Step 3: Verify in browser**

Reload `http://localhost:5173`. Expected: header with title, legend swatches, date input, Today button, and Sign in button are all visible. Sign in should work (auth popup opens). No console errors.

---

## Task 5: Calendar.svelte, WeekRow.svelte, DayCell.svelte

**Files:**
- Create: `src/components/Calendar.svelte`, `src/components/WeekRow.svelte`, `src/components/DayCell.svelte`
- Modify: `src/App.svelte` (add Calendar import, replace calendar placeholder)

- [ ] **Step 1: Create src/components/DayCell.svelte**

```svelte
<script>
  import { fmtDayDate } from '../lib/dates.js';

  const DAY_NAMES = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

  let { weekN, dKey, date, session, logged, isToday, isPast, onClick } = $props();

  function tagLabel(t) {
    if (!t) return "";
    if (t.startsWith("strength")) return "Workout";
    if (t === "mob")    return "Walk";
    if (t === "car")    return "Jump rope";
    if (t === "rest")   return "Rest";
    if (t === "test")   return "Test";
    if (t === "deload") return "Easy week";
    return t;
  }

  let tagClass = $derived(session.tag && !session.tag.startsWith("strength") ? session.tag : "");
</script>

<div
  class="day"
  class:today={isToday}
  class:past={isPast}
  class:logged-done={logged?.status === 'done'}
  class:logged-skipped={logged?.status === 'skipped'}
  onclick={onClick}
  role="button"
  tabindex="0"
  onkeydown={e => e.key === 'Enter' && onClick()}
>
  <div class="head">
    <span class="dn">{DAY_NAMES[dKey]}</span>
    <span class="dd">{fmtDayDate(date)}</span>
  </div>
  <span class="tag {tagClass}">{tagLabel(session.tag)}</span>
  <div class="ttl">{session.title}</div>
  {#if session.summary}
    <div class="sum">{session.summary}</div>
  {/if}
</div>
```

- [ ] **Step 2: Create src/components/WeekRow.svelte**

```svelte
<script>
  import { addDays, fmtRange } from '../lib/dates.js';
  import DayCell from './DayCell.svelte';

  const DAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];

  let { weekN, phase, weekStart, sessions, progress, today, onDayClick } = $props();
  let weekEnd = $derived(addDays(weekStart, 6));
</script>

<div class="week" style="--phase-c:{phase.color}">
  <div class="week-label">
    <span class="wk">Week</span>
    <span class="wn">{weekN}</span>
    <span class="wd">{fmtRange(weekStart, weekEnd)}</span>
  </div>
  {#each DAY_KEYS as dKey, i}
    {@const date = addDays(weekStart, i)}
    <DayCell
      {weekN}
      {dKey}
      {date}
      session={sessions[dKey]}
      logged={progress.workouts[weekN + '-' + dKey] || null}
      isToday={date.getFullYear()===today.getFullYear() && date.getMonth()===today.getMonth() && date.getDate()===today.getDate()}
      isPast={date < today}
      onClick={() => onDayClick(weekN, dKey, date, sessions[dKey], phase)}
    />
  {/each}
</div>
```

- [ ] **Step 3: Create src/components/Calendar.svelte**

```svelte
<script>
  import { addDays } from '../lib/dates.js';
  import WeekRow from './WeekRow.svelte';

  let { plan, buildWeekSessions, progress, currentStart, today, phaseOf, onDayClick } = $props();
</script>

{#each plan as p}
  {@const phase = phaseOf(p.wk)}
  {@const prevPhase = p.wk > 1 ? phaseOf(p.wk - 1) : null}
  {#if !prevPhase || prevPhase.n !== phase.n}
    <div class="phase-banner" style="--phase-c:{phase.color}">
      <span class="num">Block {phase.n}</span>
      <h2>{phase.name}</h2>
      <span class="note">{phase.note}</span>
    </div>
  {/if}
  <WeekRow
    weekN={p.wk}
    {phase}
    weekStart={addDays(currentStart, (p.wk - 1) * 7)}
    sessions={buildWeekSessions(p.wk)}
    {progress}
    {today}
    {onDayClick}
  />
{/each}
```

- [ ] **Step 4: Add Calendar to App.svelte**

Add this import to the `<script>` block:
```js
import Calendar from './components/Calendar.svelte';
```

Replace `<p>Calendar coming…</p>` inside `<main id="cal">` with:
```svelte
<Calendar
  plan={PLAN}
  {buildWeekSessions}
  {progress}
  {currentStart}
  {today}
  {phaseOf}
  onDayClick={handleDayClick}
/>
```

- [ ] **Step 5: Verify calendar in browser**

Reload `http://localhost:5173`. Expected: full 24-week calendar grid renders with phase banners, day tiles showing tag/title/summary. Clicking a day does nothing yet (modal not wired). Today is highlighted. Past days have the `past` class. Logged days (if signed in) show `logged-done` / `logged-skipped` classes.

---

## Task 6: Modal.svelte and WorkoutDetails.svelte

**Files:**
- Create: `src/components/Modal.svelte`, `src/components/WorkoutDetails.svelte`
- Modify: `src/App.svelte` (add Modal import, add `{#if modal}` block)

- [ ] **Step 1: Create src/components/WorkoutDetails.svelte**

```svelte
<script>
  import { iconFor } from '../lib/icons.js';

  let { session, phase, weekN, effectivePlanWeek, exKey, ex } = $props();

  const isStrengthWithPlan = effectivePlanWeek != null && exKey != null;
</script>

{#if isStrengthWithPlan}
  {@const [puS, puR] = effectivePlanWeek[exKey]}
  {@const [crS, crR] = effectivePlanWeek.cr}
  <div class="plan-hint">
    {ex.name} {puS}×{puR} · Crunches {crS}×{crR}
  </div>
{:else if session.details && session.details.length}
  <ol style="margin-top:14px">
    {#each session.details as [name, prescription]}
      {@const icon = iconFor(name)}
      <li>
        {#if icon}
          <div class="ex-icon">{@html icon}</div>
        {:else}
          <div class="ex-icon empty"></div>
        {/if}
        <div class="ex-row">
          <div class="ex-n">{name}</div>
          {#if prescription}
            <div class="ex-p">{prescription}</div>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{/if}
```

- [ ] **Step 2: Create src/components/Modal.svelte**

```svelte
<script>
  import WorkoutDetails from './WorkoutDetails.svelte';

  let { data, progress, currentUser, onClose, onSaved } = $props();

  const { weekN, dKey, dDate, session, phase, planWeek, effectivePlanWeek, exEntry } = data;
  const exKey = exEntry ? exEntry[0] : null;
  const ex    = exEntry ? exEntry[1] : null;
  const isStrength = (session.tag || '').startsWith('strength') || session.tag === 'deload';

  const fullDay = dDate.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const logged = $derived(progress.workouts[weekN + '-' + dKey] || null);

  $effect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="scrim open" onclick={e => { if (e.target === e.currentTarget) onClose(); }}>
  <div class="modal" style="--phase-c:{phase.color}">
    <button class="x" aria-label="Close" onclick={onClose}>×</button>
    <div class="meta">
      <span class="pill" style="background:{phase.color}">Block {phase.n} · Week {weekN}</span>
      {fullDay}
    </div>
    <h2>{session.title}</h2>

    <WorkoutDetails
      {session}
      {phase}
      {weekN}
      {effectivePlanWeek}
      {exKey}
      {ex}
    />

    {#if session.note}
      <div class="note">{session.note}</div>
    {/if}

    <div id="log-wrapper">
      <!-- StrengthLog and JumpRopeLog added in Tasks 7–8 -->
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add Modal to App.svelte**

Add this import to the `<script>` block:
```js
import Modal from './components/Modal.svelte';
```

After the closing `</main>` tag (before `<footer>`), add:
```svelte
{#if modal}
  <Modal
    data={modal}
    {progress}
    {currentUser}
    onClose={handleModalClose}
    onSaved={handleWorkoutSaved}
  />
{/if}
```

- [ ] **Step 4: Verify modal in browser**

Click any day. Expected: modal opens with date header, phase pill, session title, details (plan hint for strength days when signed in, ol list otherwise), note text, close button (×). Clicking scrim or pressing Escape closes the modal.

---

## Task 7: ExerciseSection.svelte and StrengthLog.svelte

**Files:**
- Create: `src/components/ExerciseSection.svelte`, `src/components/StrengthLog.svelte`
- Modify: `src/components/Modal.svelte` (replace log-wrapper placeholder)

- [ ] **Step 1: Create src/components/ExerciseSection.svelte**

```svelte
<script>
  import { iconFor } from '../lib/icons.js';

  let { exKey, name, plannedArr, prefillVal, onSave, onSkip } = $props();

  const [plannedSets, plannedReps] = plannedArr;
  const icon = iconFor(name);

  let inputs = $state(
    Array.from({ length: plannedSets }, (_, i) =>
      Array.isArray(prefillVal) ? (prefillVal[i] ?? plannedReps) : plannedReps
    )
  );

  function gestureAction(node, idx) {
    node.addEventListener('wheel', e => {
      e.preventDefault();
      inputs[idx] = Math.max(1, Math.min(99, inputs[idx] + (e.deltaY < 0 ? 1 : -1)));
    }, { passive: false });

    let touchStartY, touchStartVal;
    node.addEventListener('touchstart', e => {
      touchStartY   = e.touches[0].clientY;
      touchStartVal = inputs[idx];
    }, { passive: true });
    node.addEventListener('touchmove', e => {
      if (touchStartY === undefined) return;
      e.preventDefault();
      const delta = Math.round((touchStartY - e.touches[0].clientY) / 8);
      inputs[idx] = Math.max(1, Math.min(99, touchStartVal + delta));
    }, { passive: false });
  }
</script>

<div class="log-ex-section" data-ex={exKey}>
  <div class="log-ex-header">
    {#if icon}
      <div class="log-ex-icon">{@html icon}</div>
    {/if}
    <span class="log-ex-name">{name}</span>
  </div>
  <div class="log-set-rows">
    {#each inputs as _, i}
      <div class="log-set-row">
        <span class="log-set-num">Set {i + 1}</span>
        <input
          type="number"
          class="log-set-input"
          bind:value={inputs[i]}
          min="1"
          placeholder="—"
          use:gestureAction={i}
        />
        <span class="log-set-unit">reps</span>
      </div>
    {/each}
  </div>
  <div class="log-scroll-hint">↕ scroll · swipe · tap to type</div>
  <div class="log-ex-actions">
    <button class="log-ex-save" onclick={() => {
      const reps = inputs.filter(v => v > 0);
      if (reps.length) onSave(exKey, reps);
    }}>Save</button>
    <button class="log-ex-skip" onclick={() => onSkip(exKey)}>Skip</button>
  </div>
</div>
```

- [ ] **Step 2: Create src/components/StrengthLog.svelte**

```svelte
<script>
  import { canSave, buildActual, applyEditAll } from '../lib/workout-state.js';
  import { iconFor } from '../lib/icons.js';
  import ExerciseSection from './ExerciseSection.svelte';

  let { weekN, dKey, exKey, ex, effectivePlanWeek, logged, onSaved } = $props();

  // exState tracks which exercises have been saved in this session
  let exState = $state({});
  // view: 'form' | 'done' | 'skipped'
  let view = $state(
    logged?.status === 'done' && logged?.actual ? 'done'
    : logged?.status === 'skipped' ? 'skipped'
    : 'form'
  );

  // Pre-fill exState if we're editing an already-logged workout
  if (view !== 'form') {
    applyEditAll(exState, logged?.actual || null, exKey);
  }

  function handleSave(key, reps) {
    exState[key] = reps;
    if (canSave(exState, exKey)) {
      const actual = buildActual(exState, exKey);
      onSaved(weekN, dKey, 'done', actual);
    } else {
      view = 'form'; // wait for both exercises
    }
  }

  function handleSkip(key) {
    exState[key] = 'skipped';
    if (canSave(exState, exKey)) {
      const actual = buildActual(exState, exKey);
      // status is 'done' even if exercises are individually skipped — the workout happened
      onSaved(weekN, dKey, 'done', actual);
    }
  }

  function handleEdit() {
    exState = {};
    view = 'form';
  }

  function collapsedBadge(key) {
    const val = exState[key];
    if (val === 'skipped') return { badge: 'skipped', detail: '' };
    if (Array.isArray(val)) return { badge: 'done', detail: val.join(' / ') };
    return null;
  }

  const crName = 'Crunches';
</script>

<div id="log-wrapper">
  {#if view === 'form'}
    {#if exKey in exState}
      {@const c = collapsedBadge(exKey)}
      <div class="log-ex-section" data-ex={exKey}>
        <div class="log-ex-header">
          {#if iconFor(ex.name)}<div class="log-ex-icon">{@html iconFor(ex.name)}</div>{/if}
          <span class="log-ex-name">{ex.name}</span>
        </div>
        <div class="log-ex-done">
          <span class="log-badge-{c.badge}">{c.badge}</span>
          {#if c.detail}<span class="log-ex-reps">{c.detail}</span>{/if}
          <button class="log-ex-edit" onclick={() => { delete exState[exKey]; exState = { ...exState }; }}>edit</button>
        </div>
      </div>
    {:else}
      <ExerciseSection
        {exKey}
        name={ex.name}
        plannedArr={effectivePlanWeek[exKey]}
        prefillVal={null}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    {/if}
    <hr class="log-ex-sep" />
    {#if 'cr' in exState}
      {@const c = collapsedBadge('cr')}
      <div class="log-ex-section" data-ex="cr">
        <div class="log-ex-header">
          {#if iconFor(crName)}<div class="log-ex-icon">{@html iconFor(crName)}</div>{/if}
          <span class="log-ex-name">{crName}</span>
        </div>
        <div class="log-ex-done">
          <span class="log-badge-{c.badge}">{c.badge}</span>
          {#if c.detail}<span class="log-ex-reps">{c.detail}</span>{/if}
          <button class="log-ex-edit" onclick={() => { delete exState.cr; exState = { ...exState }; }}>edit</button>
        </div>
      </div>
    {:else}
      <ExerciseSection
        exKey="cr"
        name={crName}
        plannedArr={effectivePlanWeek.cr}
        prefillVal={null}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    {/if}

  {:else}
    {#if logged?.status === 'skipped' && !logged?.actual}
      <div class="log-section">
        <span class="log-status">Logged: Skipped</span>
        <button class="log-edit" onclick={handleEdit}>Edit</button>
      </div>
    {:else}
      {@const a = logged?.actual || {}}
      <div class="log-section">
        <div class="log-ex-done-row">
          {#if iconFor(ex.name)}<div class="log-ex-icon-sm">{@html iconFor(ex.name)}</div>{/if}
          <span class="log-ex-name-sm">{ex.name}</span>
          <span class="log-ex-reps">{Array.isArray(a[exKey]) ? a[exKey].join(' / ') : 'skipped'}</span>
        </div>
        <div class="log-ex-done-row">
          {#if iconFor(crName)}<div class="log-ex-icon-sm">{@html iconFor(crName)}</div>{/if}
          <span class="log-ex-name-sm">{crName}</span>
          <span class="log-ex-reps">{Array.isArray(a.cr) ? a.cr.join(' / ') : 'skipped'}</span>
        </div>
        <button class="log-edit" onclick={handleEdit}>Edit</button>
      </div>
    {/if}
  {/if}
</div>
```

- [ ] **Step 3: Add StrengthLog to Modal.svelte**

Add this import at the top of Modal.svelte's `<script>`:
```js
import StrengthLog from './StrengthLog.svelte';
```

Replace `<div id="log-wrapper"><!-- ... --></div>` with:
```svelte
{#if currentUser && isStrength && planWeek && !planWeek.test}
  <StrengthLog
    {weekN}
    {dKey}
    {exKey}
    {ex}
    {effectivePlanWeek}
    {logged}
    {onSaved}
  />
{/if}
```

- [ ] **Step 4: Verify strength logging in browser**

Sign in, click a strength day (Mon/Wed/Fri). Expected: plan hint visible, two exercise sections with set inputs appear. Wheel/swipe on inputs changes values. Clicking Save on one exercise collapses it to "done" badge. Saving both closes the modal and day cell shows `logged-done` class. Clicking the day again shows done summary with Edit button. Clicking Edit re-opens the form.

---

## Task 8: JumpRopeLog.svelte

**Files:**
- Create: `src/components/JumpRopeLog.svelte`
- Modify: `src/components/Modal.svelte`

- [ ] **Step 1: Create src/components/JumpRopeLog.svelte**

```svelte
<script>
  let { weekN, dKey, logged, onSaved } = $props();

  const isDone    = logged?.status === 'done';
  const isSkipped = logged?.status === 'skipped';
  let editing = $state(false);
</script>

<div id="log-wrapper">
  {#if (isDone || isSkipped) && !editing}
    <div class="log-section">
      <span class="log-status">Logged: {isDone ? 'Done' : 'Skipped'}</span>
      <button class="log-edit" onclick={() => { editing = true; }}>Edit</button>
    </div>
  {:else}
    <div class="log-section">
      <div class="log-actions">
        <button class="log-save" onclick={() => onSaved(weekN, dKey, 'done', null)}>Done</button>
        <button class="log-skip" onclick={() => onSaved(weekN, dKey, 'skipped', null)}>Skip</button>
      </div>
    </div>
  {/if}
</div>
```

- [ ] **Step 2: Add JumpRopeLog to Modal.svelte**

Add this import at the top of Modal.svelte's `<script>`:
```js
import JumpRopeLog from './JumpRopeLog.svelte';
```

After the StrengthLog block (or after the `{/if}` that closes it), add:
```svelte
{#if currentUser && session.tag === 'car'}
  <JumpRopeLog
    {weekN}
    {dKey}
    {logged}
    {onSaved}
  />
{/if}
```

- [ ] **Step 3: Verify cardio logging in browser**

Click a Thursday (Jump rope) day while signed in. Expected: Done and Skip buttons appear. Clicking Done closes modal and marks the day as logged. Clicking the day again shows "Logged: Done" with Edit button. Clicking Edit shows Done/Skip again.

---

## Task 9: Cleanup

**Files:**
- Delete: `app.js`, `progression.js`, `firebase.js`, `workout-state.js`, `plan-adjustment.js`, `icons.js` (root files)
- Delete: `firebase.test.js`
- Run tests, build

- [ ] **Step 1: Run the full test suite**

```bash
make test
```
Expected: All four test files pass — no failures

- [ ] **Step 2: Verify app in browser (full smoke test)**

With `make emulators` and `make dev` running:
1. Open `http://localhost:5173`
2. Calendar renders all 24 weeks with phase banners
3. Sign in with Google (emulator account) — data loads, today scrolls into view
4. Click a strength day (Mon/Wed/Fri of a non-test week) — plan hint shows, log form opens, can save/skip each exercise, modal closes on completion, day shows logged-done class
5. Click the same day again — shows done summary with reps, Edit button works
6. Click a Thursday — Jump rope form, Done/Skip works
7. Date picker changes the calendar start date
8. Dev today widget changes which day is highlighted as "today"
9. Escape key and scrim click close the modal
10. Sign out — calendar still renders, strength days show prescription list instead of log form

- [ ] **Step 3: Delete root JS files no longer needed**

```bash
rm app.js progression.js firebase.js workout-state.js plan-adjustment.js icons.js firebase.test.js
```

- [ ] **Step 4: Run tests again to confirm nothing broke**

```bash
make test
```
Expected: All four test files still pass

- [ ] **Step 5: Build for production**

```bash
npm run build
```
Expected: `dist/` directory created with `index.html`, `assets/index-*.js`, `assets/index-*.css`. No build errors.

- [ ] **Step 6: Preview the production build**

```bash
npm run preview
```
Open `http://localhost:4173`. Expected: app loads and behaves identically to dev mode (Firebase SDK initialises via the emulator proxy). Note: auth may not work in preview mode unless emulators are still running.
