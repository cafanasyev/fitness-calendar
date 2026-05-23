# Rest Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-exercise rest timer to ExerciseSection that counts down from 90 s, shows an inline chip + progress bar, plays three ascending tones on completion, and survives the modal being closed and reopened.

**Architecture:** Timer state lives in a Svelte 5 module-level `$state` in `src/lib/timer.svelte.js` — outside any component — so it persists while the page is open regardless of modal lifecycle. `ExerciseSection` imports the store directly, adds a Rest button when idle, and replaces it with a countdown chip + progress bar when active.

**Tech Stack:** Svelte 5 runes (`.svelte.js` module state), Web Audio API (built-in, no npm)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/timer.svelte.js` | Timer state, startTimer, cancelTimer, playDone |
| Modify | `src/components/ExerciseSection.svelte` | Rest button, countdown chip, progress bar |
| Modify | `src/styles.css` | CSS for rest button, timer chip, progress bar |

---

### Task 1: Create `src/lib/timer.svelte.js`

**Files:**
- Create: `src/lib/timer.svelte.js`

The `.svelte.js` extension is required — it tells Vite/Svelte to process Svelte runes (`$state`) outside a `.svelte` file. Without it, `$state` is a syntax error.

- [ ] **Step 1: Create the file**

```js
// src/lib/timer.svelte.js
let state = $state({ exKey: null, seconds: 0, duration: 0, active: false });
let _interval = null;

function playDone() {
  const ctx = new AudioContext();
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.2;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

export function startTimer(exKey, duration = 90) {
  cancelTimer();
  state.exKey = exKey;
  state.seconds = duration;
  state.duration = duration;
  state.active = true;
  _interval = setInterval(() => {
    state.seconds--;
    if (state.seconds <= 0) {
      cancelTimer();
      playDone();
    }
  }, 1000);
}

export function cancelTimer() {
  clearInterval(_interval);
  _interval = null;
  state.active = false;
}

export { state as timerState };
```

- [ ] **Step 2: Verify Vite resolves the file**

Start the dev server (if not already running):
```bash
npm run dev
```

Open the browser console. No import errors expected yet — just confirming Vite starts clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/timer.svelte.js
git commit -m "feat: add rest timer store (timer.svelte.js)"
```

---

### Task 2: Wire timer into `ExerciseSection.svelte`

**Files:**
- Modify: `src/components/ExerciseSection.svelte`
- Modify: `src/styles.css`

- [ ] **Step 1: Add imports and derived values to the script block**

The current script block ends at line 56 (`</script>`). Add imports and derived values after the existing `let inputs = $state(...)` block:

```js
// add at top of <script>, alongside the existing import { untrack } from 'svelte':
import { timerState, startTimer, cancelTimer } from '../lib/timer.svelte.js';
```

Then add these derived values after the `let inputs` declaration (before the `gestureAction` function):

```js
const timerActive = $derived(timerState.active && timerState.exKey === exKey);
const timerPct    = $derived(timerActive ? (timerState.seconds / timerState.duration) * 100 : 0);
const timerLabel  = $derived(
  Math.floor(timerState.seconds / 60) + ':' + String(timerState.seconds % 60).padStart(2, '0')
);
```

- [ ] **Step 2: Replace the actions row in the template**

Current actions row (lines 86–92):
```html
  <div class="log-ex-actions">
    <button class="log-ex-save" aria-disabled={disabled} onclick={() => guard(() => {
      const reps = inputs.filter(v => v > 0);
      if (reps.length) onSave(exKey, reps);
    })}>Save</button>
    <button class="log-ex-skip" aria-disabled={disabled} onclick={() => guard(() => onSkip(exKey))}>Skip</button>
  </div>
```

Replace with:
```html
  <div class="log-ex-actions">
    <button class="log-ex-save" aria-disabled={disabled} onclick={() => guard(() => {
      const reps = inputs.filter(v => v > 0);
      if (reps.length) onSave(exKey, reps);
    })}>Save</button>
    <button class="log-ex-skip" aria-disabled={disabled} onclick={() => guard(() => onSkip(exKey))}>Skip</button>
    {#if timerActive}
      <div class="log-ex-timer-chip">
        <span class="log-ex-timer-label">{timerLabel}</span>
        <span class="log-ex-timer-sep">|</span>
        <button class="log-ex-timer-cancel" onclick={cancelTimer}>✕</button>
      </div>
    {:else}
      <button class="log-ex-rest" aria-disabled={disabled} onclick={() => guard(() => startTimer(exKey))}>⏱ Rest 90s</button>
    {/if}
  </div>
  {#if timerActive}
    <div class="log-ex-timer-bar-track">
      <div class="log-ex-timer-bar" style="width: {timerPct}%"></div>
    </div>
  {/if}
```

- [ ] **Step 3: Add CSS to `src/styles.css`**

Append after the existing `.log-ex-*` rules (after line ~258):

```css
.log-ex-rest { margin-left: auto; color: #4caf82; border-color: #2d5a3d; background: #1e3a2a; font-size: 13px; }
.log-ex-rest:hover { background: #253f30; border-color: #4caf82; }
.log-ex-timer-chip { margin-left: auto; display: flex; align-items: center; gap: 6px; background: #1e3a2a; border: 1px solid #2d5a3d; border-radius: 6px; padding: 5px 10px; font-variant-numeric: tabular-nums; }
.log-ex-timer-label { color: #4caf82; font-size: 15px; font-weight: 700; }
.log-ex-timer-sep { color: #2d5a3d; font-size: 12px; }
.log-ex-timer-cancel { background: none; border: none; color: #888; font-size: 11px; cursor: pointer; padding: 0; }
.log-ex-timer-cancel:hover { color: #ccc; background: none; border-color: transparent; }
.log-ex-timer-bar-track { margin-top: 6px; height: 3px; background: #2a2f3a; border-radius: 2px; overflow: hidden; }
.log-ex-timer-bar { height: 100%; background: #4caf82; border-radius: 2px; transition: width 1s linear; }
```

- [ ] **Step 4: Manual smoke test**

Open the app in the browser (`npm run dev` if not running). Open any past workout day modal.

1. Confirm "⏱ Rest 90s" button appears to the right of Skip.
2. Tap "Rest 90s" — button should be replaced by a green chip showing `1:30` with a `✕` and a thin green progress bar below.
3. Wait a few seconds — confirm the number counts down and the bar shrinks.
4. Tap ✕ — confirm chip disappears and "⏱ Rest 90s" returns.
5. Start the timer again, close the modal (tap X), reopen the same modal — confirm the countdown continues from wherever it left off.
6. Let the timer reach 0 — confirm three pleasant ascending tones play and the Rest button returns.
7. Open a **future** workout day modal — confirm tapping "⏱ Rest 90s" shows the toast and does not start the timer.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExerciseSection.svelte src/styles.css
git commit -m "feat: rest timer in ExerciseSection with countdown chip, progress bar, and sound"
```
