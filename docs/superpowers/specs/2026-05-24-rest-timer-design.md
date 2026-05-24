# Rest Timer Design

## Goal

Add a per-exercise rest timer to ExerciseSection that starts on tap, counts down with a progress bar, plays a short sound on completion, and survives the modal being closed and reopened.

## Architecture

Timer state lives in a module-level Svelte 5 `$state` in `src/lib/timer.svelte.js`. Because it is module-level (outside any component), it persists for the lifetime of the page regardless of whether the modal is open. ExerciseSection imports the store directly — no prop drilling required.

Sound is generated via the Web Audio API at the moment of completion — no audio files, no dependencies.

## Tech Stack

- Svelte 5 module-level `$state` (reactive store pattern)
- Web Audio API (built-in browser API)
- No new npm dependencies

---

## Components

### `src/lib/timer.svelte.js` (new)

Holds all timer state and logic.

**State shape:**
```js
{ exKey: string | null, seconds: number, duration: number, active: boolean }
```

- `exKey` — which exercise the timer belongs to (used to match in ExerciseSection)
- `seconds` — current remaining seconds, decremented by the interval
- `duration` — the value `seconds` started at (used to compute progress bar width)
- `active` — whether the timer is currently running

**Exports:**
- `timerState` — the reactive state object (read-only for consumers)
- `startTimer(exKey, duration = 90)` — cancels any running timer, sets new state, starts interval
- `cancelTimer()` — clears interval, sets `active = false`

**Interval:** `setInterval` at 1000ms. On each tick, decrements `seconds`. When `seconds <= 0`, calls `cancelTimer()` then `playDone()`.

**`playDone()`** — internal, not exported. Uses Web Audio API to play 3 ascending sine tones (C5 523Hz, E5 659Hz, G5 784Hz), one every 200ms, each fading out in 150ms at amplitude 0.3.

### `src/components/ExerciseSection.svelte` (modified)

Imports `timerState`, `startTimer`, `cancelTimer` from `timer.svelte.js`.

**Derived values (inside component):**
```js
const timerActive = $derived(timerState.active && timerState.exKey === exKey);
const timerPct = $derived(timerActive ? timerState.seconds / timerState.duration * 100 : 0);
const timerLabel = $derived(
  Math.floor(timerState.seconds / 60) + ':' + String(timerState.seconds % 60).padStart(2, '0')
);
```

**Actions row — idle state:**
```
[Save]  [Skip]  [⏱ Rest 90s]
```

**Actions row — timer active (`timerActive === true`):**
```
[Save]  [Skip]  [1:23 | ✕]
━━━━━━━░░░░░░░  ← full-width progress bar below actions row
```

The Rest button is replaced by the countdown chip. The chip contains the formatted time, a `|` separator, and a `✕` cancel button. The progress bar is a separate `<div>` below the actions row, width bound to `timerPct + '%'`, transitioning with `transition: width 1s linear`.

**Tap "Rest 90s":** calls `startTimer(exKey, 90)`.
**Tap ✕:** calls `cancelTimer()`.

The `guard()` pattern (disabled-state check) applies to the Rest button: if `disabled` (future day), it fires the toast and does not start the timer.

---

## Data Flow

```
User taps "Rest 90s"
  → startTimer(exKey, 90)
  → timerState = { exKey, seconds: 90, duration: 90, active: true }
  → setInterval fires every 1s
    → timerState.seconds--
    → ExerciseSection re-renders countdown chip and progress bar
  → seconds hits 0
    → cancelTimer() → timerState.active = false
    → playDone() → 3 ascending tones
  → ExerciseSection shows Rest button again

User taps ✕
  → cancelTimer() → timerState.active = false
  → ExerciseSection shows Rest button again

User closes modal mid-timer
  → Modal and ExerciseSection destroyed
  → timerState still active (module-level)
  → User reopens modal
    → ExerciseSection mounts, reads timerState
    → timerActive = true → shows live countdown (possibly different second value)
```

---

## Error Handling

- `AudioContext` creation can fail silently on some browsers (e.g., before user gesture). `playDone` is called only after user has already tapped "Rest 90s" — a user gesture — so autoplay policy is satisfied.
- If `seconds` goes below 0 due to tab sleep / timer drift, the check is `<= 0`, which handles it correctly.
- Only one timer can be active at a time. `startTimer` always calls `cancelTimer` first, so starting a second exercise's timer automatically cancels the first.

---

## Testing

Unit tests are not practical for the timer (setInterval, AudioContext). Manual test plan:

1. Open any exercise modal → tap "Rest 90s" → confirm button becomes `1:30 | ✕` with progress bar
2. Wait a few seconds → confirm countdown decrements and bar shrinks
3. Tap ✕ → confirm timer disappears and "Rest 90s" button returns
4. Start timer → close modal → reopen → confirm countdown is still running (at updated time)
5. Let timer reach zero → confirm sound plays and button returns
6. Open a future-day modal → confirm "Rest 90s" fires toast and does not start timer
