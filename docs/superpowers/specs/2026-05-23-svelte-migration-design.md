# Svelte Migration Design

## Goal

Replace the imperative DOM manipulation in `app.js` with a Svelte 5 component tree, convert all JS files to ES modules, and migrate Firebase from CDN globals to the modular npm SDK.

## Motivation

`app.js` builds all HTML via string concatenation (`html +=`, `innerHTML`). The modal alone is ~90 lines of template strings. There is no reactive state — saves trigger full `render()` calls. This migration replaces all of that with Svelte's declarative templates and `$state()` reactivity.

---

## File Structure

### Files moved and refactored (pure logic — no DOM)

| From | To | Change |
|---|---|---|
| `progression.js` | `src/lib/progression.js` | add `export` to each declaration, remove `module.exports` block |
| `workout-state.js` | `src/lib/workout-state.js` | same |
| `plan-adjustment.js` | `src/lib/plan-adjustment.js` | same |
| `icons.js` | `src/lib/icons.js` | same; remove `window.iconFor` / `window.ICONS` assignments |

### Firebase split

Current `firebase.js` contains two independent concerns:

- **Pure date/schedule helpers** (`LOGGABLE_DAYS_OFFSET`, `workoutDate`, `autoSkipPast`, `getToday`) — no Firebase dependency, Node-testable
- **Firebase SDK operations** (`signIn`, `signOut`, `onAuthChange`, `loadProgress`, `saveStartDate`, `saveWorkout`, `saveAutoSkips`, emulator init)

These split into two files:

| From | To |
|---|---|
| `firebase.js` (pure helpers) | `src/lib/schedule.js` |
| `firebase.js` (SDK operations) | `src/lib/firebase.js` |

### Deleted

- `app.js` — replaced entirely by Svelte components

### New files

```
src/
  main.js
  App.svelte
  components/
    Header.svelte
    Calendar.svelte
    WeekRow.svelte
    DayCell.svelte
    Modal.svelte
    WorkoutDetails.svelte
    StrengthLog.svelte
    ExerciseSection.svelte
    JumpRopeLog.svelte
```

### Updated

- `index.html` — stripped to minimal Vite entry (no `<script src>` tags)
- `*.test.js` — `require()` → `import`, paths updated to `src/lib/`
- `firebase.test.js` → renamed `schedule.test.js`
- `Makefile` — `test` target: replace `firebase.test.js` with `schedule.test.js`
- `package.json` — add `firebase` (v10) to dependencies

---

## Firebase Migration

### Initialization (`src/lib/firebase.js`)

Config is fetched from `/__/firebase/init.json` using top-level await. Firebase Hosting serves this endpoint in production; the Vite proxy (`/__` → `http://localhost:5000`) serves it from the emulator in dev. No config file, no env vars.

```js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator,
         GoogleAuthProvider, signInWithPopup, signOut as _signOut,
         onAuthStateChanged } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator,
         doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

const config = await fetch('/__/firebase/init.json').then(r => r.json());
const app  = initializeApp(config);
const auth = getAuth(app);
const db   = getFirestore(app);

if (location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

### Exported API

Identical function signatures to the current global functions in `app.js`:

```js
export function signIn()
export function signOut()
export function onAuthChange(cb)   // cb(user)
export async function loadProgress()   // → { startDate, workouts }
export async function saveStartDate(iso)
export async function saveWorkout(weekN, dayKey, status, actual)
export async function saveAutoSkips(toSkip)
```

### `index.html` cleanup

Remove:
- `<script src="https://www.gstatic.com/firebasejs/...firebase-app-compat.js">`
- `<script src="https://www.gstatic.com/firebasejs/...firebase-auth-compat.js">`
- `<script src="https://www.gstatic.com/firebasejs/...firebase-firestore-compat.js">`
- `<script src="/__/firebase/init.js">`
- All other `<script src="...">` tags

The `/__` proxy in `vite.config.js` stays — still needed for `/__/firebase/init.json`.

Final `index.html`:

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

---

## Svelte Component Design

### State (`App.svelte`)

All app-level state lives in `App.svelte` as Svelte 5 `$state()` runes:

```js
let currentUser  = $state(null);
let progress     = $state({ workouts: {} });
let currentStart = $state(defaultStart());
let modal        = $state(null); // { weekN, dKey, dDate, session, phase } | null
```

After `saveWorkout` succeeds, `progress.workouts[key]` is updated in place — Svelte's fine-grained reactivity re-renders only the affected day cell and modal, not the full calendar.

### Component hierarchy

```
App.svelte
├── Header.svelte
│     props:     currentUser, currentStart
│     callbacks: onStartChange(date), onSignIn(), onSignOut()
│     renders:   date picker, auth UI (avatar + sign-out or sign-in button),
│                phase legend, devToday widget (localhost only)
│
├── Calendar.svelte
│     props:     plan, weeks, progress, currentStart, currentUser, today
│     callback:  onDayClick(weekN, dKey, dDate, session, phase)
│     renders:   phase banners between phases, WeekRow per week
│
│   └── WeekRow.svelte
│         props:    weekN, phase, weekStart, sessions, progress, currentUser, today
│         callback: onDayClick
│
│       └── DayCell.svelte
│             props:    weekN, dKey, date, session, logged, isToday, isPast
│             callback: onClick
│             renders:  tag badge, title, summary; logged-done / logged-skipped CSS class
│
└── Modal.svelte   (rendered only when modal ≠ null)
      props:     data (weekN, dKey, dDate, session, phase), progress, currentUser
      callbacks: onClose(), onSaved(weekN, dKey, status, actual)
      renders:   scrim + modal container; delegates content to sub-components

    ├── WorkoutDetails.svelte
    │     props: session, phase, weekN, effectivePlanWeek, exKey, ex
    │     renders: plan hint (sets × reps) when effectivePlanWeek is non-null
    │              (strength day + logged in); <ol> prescription list otherwise
    │
    ├── StrengthLog.svelte
    │     props:    weekN, dKey, exKey, ex, effectivePlanWeek, logged
    │     callback: onSaved(weekN, dKey, status, actual)
    │     state:    exState (which exercises have been saved this session)
    │     renders:  two ExerciseSection components (main exercise + crunches);
    │               collapses to done/skipped badge after save; edit re-opens
    │
    │   └── ExerciseSection.svelte
    │         props:    exKey, name, plannedArr, prefillVal
    │         callback: onSave(key, reps[]), onSkip(key), onEdit(key)
    │         renders:  set-by-set number inputs with wheel + touch gesture handlers;
    │                   Save and Skip buttons
    │
    └── JumpRopeLog.svelte
          props:    weekN, dKey, logged
          callback: onSaved(weekN, dKey, status, null)
          renders:  Done / Skip buttons; or logged status + Edit button
```

### Data flow

1. On auth change → `App` calls `loadProgress()`, sets `progress` and `currentStart`
2. `App` derives `today` from `getToday()` and passes to `Calendar`
3. Day click → `Calendar` calls `onDayClick` → `App` sets `modal = { weekN, dKey, dDate, session, phase }`
4. Modal mounts → `Modal` computes `effectivePlanWeek` via `computeEffectivePlan()`
5. User saves/skips → `Modal` calls `saveWorkout()`, then `onSaved()` → `App` updates `progress.workouts[key]`
6. `$state` reactivity: `DayCell` re-renders with new logged class; modal closes

### Gesture handlers

`ExerciseSection.svelte` owns the wheel and touch-swipe handlers on number inputs (currently in `applyInputGestures` in `app.js`). They are attached in Svelte's `use:action` or directly in `onMount`. The deduplication guard (`dataset.gesturesAttached`) is not needed — Svelte mounts/unmounts DOM cleanly.

---

## Tests

Since `package.json` has `"type": "module"`, existing `require()` calls are already broken. This migration fixes them.

| File | Change |
|---|---|
| `progression.test.js` | `require('./progression.js')` → `import { ... } from './src/lib/progression.js'` |
| `workout-state.test.js` | same pattern |
| `plan-adjustment.test.js` | same pattern |
| `firebase.test.js` | renamed `schedule.test.js`; imports from `./src/lib/schedule.js`; `initEmulatorIfNeeded` test dropped (now internal) |

Makefile `test` target:
```
node progression.test.js && node workout-state.test.js && node plan-adjustment.test.js && node schedule.test.js
```

---

## Out of scope

- No UI changes — visual output is identical to the current app
- No Firestore schema changes
- No CSS changes (`styles.css` untouched)
- No CI/CD changes
- Firebase hosting `firebase.json` already updated to `"public": "dist"` (done in setup)
