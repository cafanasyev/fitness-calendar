# Progress Tracking Design

**Date:** 2026-05-22
**Status:** Approved

## Problem

The app currently generates a 24-week plan but has no way to record whether workouts were
completed or what was actually achieved. Progress lives only in the user's head.

## Goal

Add Google Sign-In and per-workout logging: mark each strength day as done (with actual
sets/reps) or skipped; mark each jump-rope day as done or skipped. Start date syncs to
the cloud so it persists across devices. On sign-in, any loggable day in the past with
no entry is automatically marked skipped.

---

## Architecture

Four files touched; no bundler, no new build step.

```
firebase-config.js   — Firebase project credentials (safe to commit; keys are public
                       identifiers — Firestore rules protect the data)
firebase.js          — Firebase init + all auth/storage calls:
                         signIn(), signOut(), onAuthChange(cb),
                         loadProgress(), saveWorkout(weekN, dayKey, status, actual),
                         saveStartDate(iso)
index.html           — Firebase CDN <script> tags + auth button in header
app.js               — wire auth state → re-render; enhance modal with logging UI
```

`firebase.js` is loaded before `app.js` via a `<script>` tag. `app.js` calls into
`firebase.js` functions; `firebase.js` has no dependency on `app.js`.

---

## Data Model

One Firestore document per user at `users/{uid}`:

```js
{
  startDate: "2026-05-22",     // ISO string — synced to cloud, replaces localStorage
  workouts: {
    "1-mon": {                 // key = weekN + "-" + dayKey  e.g. "3-fri"
      status: "done",
      actual: {
        pu: [6, 10],           // primary exercise key for that day: pu (mon), pl (wed), sq (fri)
        cr: [3, 15],           // crunches always paired — always stored as "cr"
      }
    },
    "2-wed": {
      status: "skipped"        // no `actual` field when skipped
    },
    "1-thu": {
      status: "done"           // jump-rope day: done/skipped only — no reps to record
    }
  }
}
```

**Key choice — `weekN-dayKey` not ISO date:** the key is relative to program position,
not calendar date. If the user changes their start date, historical entries still map to
the correct program week.

**Loggable days:** mon, wed, fri (strength) and thu (jump-rope). Tue (walk) and
sat/sun (rest) are not logged — nothing meaningful to record.

---

## UI Changes

### Header

A small auth control sits in the top-right of the header:
- Signed out: "Sign in with Google" button
- Signed in: user's Google photo + name + "Sign out" link

### Calendar cells

Logged workout days get a visual indicator on the cell:
- **Done**: subtle green checkmark in the corner
- **Skipped**: muted "—" indicator

### Modal — strength days (mon/wed/fri), signed-in only

Below the existing exercise list, add a logging section:

**Not yet logged:**
```
Log this workout:
Push-ups:  [6] sets × [10] reps    ← pre-filled with prescribed values, editable
Crunches:  [3] sets × [15] reps

[Save as Done]   [Skip]
```

**Already logged as done:**
```
Logged: Push-ups 6×10 · Crunches 3×15   [Edit]
```

**Already logged as skipped:**
```
Logged: Skipped   [Edit]
```

Edit replaces the logged section with the input form pre-filled with previously saved values.

### Modal — jump-rope day (thu), signed-in only

No reps to record. Below the session description:

**Not yet logged:**
```
[Done]   [Skip]
```

**Already logged:**
```
Logged: Done   [Edit]   /   Logged: Skipped   [Edit]
```

---

## Auth Flow

- **Method:** Google popup (no page redirect — simpler, no extra route needed)
- **Persistence:** Firebase stores the session in IndexedDB automatically — user stays
  signed in across visits and browser restarts
- **Signed-out state:** calendar fully functional and read-only; no logging UI shown in modal
- **On sign-in:** load progress document from Firestore, then auto-skip any loggable day
  (mon/wed/thu/fri) whose calendar date is strictly before today and has no entry —
  write all missing entries as `{ status: "skipped" }` in a single batch write, then
  merge into local state, re-render calendar so logged cells show their indicators
- **On sign-out:** clear local progress state, re-render (calendar stays readable)
- **Start date:** on sign-in, if Firestore has a saved startDate use it (overrides
  localStorage); on change, write to both localStorage and Firestore

---

## firebase.js Public Interface

```js
// Auth
signIn()                          // opens Google popup
signOut()                         // clears session
onAuthChange(cb)                  // cb(user) — user is null when signed out

// Storage (all return Promises)
loadProgress()                    // → { startDate, workouts }
saveStartDate(iso)                // writes startDate field
saveWorkout(weekN, dayKey, status, actual)
  // status: "done" | "skipped"
  // actual: { pu: [sets,reps], cr: [sets,reps] } for strength days when done
  //          null for jump-rope days or when skipped
  // writes to workouts["weekN-dayKey"]

autoSkipPast(startDate, workouts)
  // pure function — given startDate (ISO) and existing workouts map,
  // returns array of { weekN, dayKey } entries that need auto-skipping
  // (loggable days before today with no entry); caller saves them
```

---

## Firebase Setup (manual steps, outside code)

1. Create project at console.firebase.google.com
2. Enable **Authentication → Google** provider
3. Add GitHub Pages domain to **Authorized domains**
4. Create **Firestore database** (production mode)
5. Set Firestore rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth.uid == uid;
       }
     }
   }
   ```
6. Copy the Firebase config object into `firebase-config.js`:
   ```js
   const FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     // ...
   };
   ```

---

## Testing Strategy

`firebase.js` exposes pure functions testable with a mock Firestore — no real network
calls needed in tests. `app.js` modal logic tested by injecting a fake progress store.

Tests run with `node` (same pattern as `progression.test.js`):
- `firebase.test.js` — unit tests for `saveWorkout` key construction and data shape;
  `autoSkipPast` is a pure function and fully unit-testable (given dates, returns entries)
- `app.test.js` — unit tests for modal render logic (pre-fill, save, skip flows,
  jump-rope done/skip, strength done/skip)

No Firebase emulator required — mock the Firestore SDK calls directly.
