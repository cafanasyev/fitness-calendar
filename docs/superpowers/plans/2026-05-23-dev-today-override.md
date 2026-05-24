# Dev Today Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a localhost-only date input in the header that overrides "today" across the entire app for testing date-dependent behaviour, persisting across page reloads via `localStorage`.

**Architecture:** A pure `getToday(storage, hostname)` function in `firebase.js` replaces the three hardcoded `new Date()` "today" constructions in `app.js`. A `renderDevWidget()` function appends a `#dev-today` input to `.controls` and is called only on `localhost`. Production is completely unaffected.

**Tech Stack:** Vanilla JS, localStorage, CSS.

---

## File Map

| File | Change |
|------|--------|
| `firebase.js` | Add `getToday` function; export it |
| `firebase.test.js` | Add 4 unit tests for `getToday` |
| `app.js` | Replace 3 hardcoded `new Date()` today constructions; add `renderDevWidget` |
| `styles.css` | Add `#dev-today` styles at end of file |

---

### Task 1: Add `getToday` to `firebase.js` (TDD)

**Files:**
- Modify: `firebase.js` (add function before `signIn`, add to `module.exports`)
- Modify: `firebase.test.js` (add 4 tests after `initEmulatorIfNeeded` tests)

- [ ] **Step 1: Verify the baseline test suite passes**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && node firebase.test.js
```

Expected:
```
workoutDate: all tests passed
autoSkipPast: all tests passed
initEmulatorIfNeeded: all tests passed
```

If anything fails, stop — do not proceed until the baseline is green.

- [ ] **Step 2: Add the failing `getToday` tests to `firebase.test.js`**

The current file ends at line 98 with `console.log("initEmulatorIfNeeded: all tests passed");`. Append the following block after that line:

```js
// ---- getToday ----

const { getToday } = require("./firebase.js");

const mockStorage = val => ({ getItem: () => val });

// non-localhost — always returns real today
{
  const d = getToday(mockStorage("2026-01-01"), "fitness-cal.web.app");
  const real = new Date(); real.setHours(0, 0, 0, 0);
  assert.strictEqual(d.toDateString(), real.toDateString(), "non-localhost: real today");
}

// localhost, valid stored date — returns override with hours zeroed
{
  const d = getToday(mockStorage("2026-06-15"), "localhost");
  assert.deepStrictEqual(d, new Date(2026, 5, 15), "localhost valid: returns stored date");
  assert.strictEqual(d.getHours(), 0, "localhost valid: hours zeroed");
}

// localhost, no stored value — returns real today
{
  const d = getToday(mockStorage(null), "localhost");
  const real = new Date(); real.setHours(0, 0, 0, 0);
  assert.strictEqual(d.toDateString(), real.toDateString(), "localhost no stored: real today");
}

// localhost, invalid stored value — returns real today (no crash)
{
  const d = getToday(mockStorage("not-a-date"), "localhost");
  const real = new Date(); real.setHours(0, 0, 0, 0);
  assert.strictEqual(d.toDateString(), real.toDateString(), "localhost invalid stored: real today");
}

console.log("getToday: all tests passed");
```

Note: `getToday` is destructured from a separate `require` because the existing top-of-file destructure will need to be updated in Step 4. This separate require keeps the diff minimal and avoids needing to touch the existing line.

- [ ] **Step 3: Run tests — verify they fail with "getToday is not a function"**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && node firebase.test.js
```

Expected: crashes with `TypeError: getToday is not a function` (or similar). This confirms the test is exercising real code, not a stale import.

- [ ] **Step 4: Add `getToday` to `firebase.js`**

Insert the following function immediately before the `function signIn()` line (currently line 30):

```js
function getToday(storage, hostname) {
  if (hostname === "localhost") {
    const stored = storage.getItem("fitness.devToday");
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d)) { d.setHours(0, 0, 0, 0); return d; }
    }
  }
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
```

Then update the `module.exports` line at the bottom of `firebase.js` (currently the last line of the file) to include `getToday`:

```js
module.exports = { workoutDate, autoSkipPast, LOGGABLE_DAYS_OFFSET, initEmulatorIfNeeded, getToday };
```

- [ ] **Step 5: Run tests — verify all pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && node firebase.test.js
```

Expected:
```
workoutDate: all tests passed
autoSkipPast: all tests passed
initEmulatorIfNeeded: all tests passed
getToday: all tests passed
```

- [ ] **Step 6: Run the full test suite**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: same 4 pass lines plus progression tests passing. No failures.

---

### Task 2: Replace hardcoded `new Date()` today constructions in `app.js`

**Files:**
- Modify: `app.js` (3 replacements; no new functions yet)

There are exactly 3 places in `app.js` where "today" is computed by calling `new Date()` and then zeroing the hours. All three must be replaced with `getToday(localStorage, location.hostname)`.

`getToday` is already available as a browser global via `firebase.js` (loaded before `app.js` via `<script>` tags in `index.html`). No import statement is needed.

- [ ] **Step 1: Replace line 173 — inside `render`**

Find this exact text in `app.js`:
```js
  const today = new Date(); today.setHours(0,0,0,0);
```
(It is the first line of the `render` function body, after `cal.innerHTML = "";`.)

Replace with:
```js
  const today = getToday(localStorage, location.hostname);
```

- [ ] **Step 2: Replace line 399 — inside `defaultStart`**

Find this exact text in `app.js`:
```js
  const today = new Date(); today.setHours(0,0,0,0);
```
(It is inside the `defaultStart` function, executed when no saved start date exists.)

Replace with:
```js
  const today = getToday(localStorage, location.hostname);
```

- [ ] **Step 3: Replace line 462 — inside `onAuthChange` callback**

Find this exact text in `app.js`:
```js
    const today = new Date(); today.setHours(0, 0, 0, 0);
```
(Note the space after the comma — `0, 0, 0, 0` vs `0,0,0,0` above. Match exactly.)

Replace with:
```js
    const today = getToday(localStorage, location.hostname);
```

- [ ] **Step 4: Verify no remaining hardcoded today constructions**

```bash
grep -n "new Date(); today.setHours" /mnt/990Pro2TB/code/js/fitness-calendar/app.js
```

Expected: no output (all three replaced).

- [ ] **Step 5: Smoke-test in the browser**

Start the emulator if not already running:
```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make dev
```

Open `http://localhost:5000`. Sign in. Verify the calendar renders and today's cell is still highlighted correctly. No console errors.

---

### Task 3: Add `renderDevWidget` to `app.js` and styles to `styles.css`

**Files:**
- Modify: `app.js` (add `renderDevWidget` function + `if (location.hostname === "localhost")` call)
- Modify: `styles.css` (append `#dev-today` styles)

- [ ] **Step 1: Add styles for `#dev-today` to the end of `styles.css`**

Append after the last line of `styles.css` (currently line 213):

```css

#dev-today {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  opacity: 0.55;
  border-left: 1px solid currentColor;
  padding-left: 0.8rem;
  margin-left: 0.4rem;
}
#dev-today label { font-size: 0.8em; }
```

- [ ] **Step 2: Add `renderDevWidget` to `app.js` before the `onAuthChange` call**

The bottom of `app.js` currently ends with (lines 472–476):

```js
  } else {
    progress = { workouts: {} };
    render(currentStart);
  }
});
```

Insert the following block between the closing `});` of `onAuthChange` and the end of the file. (The file currently ends at line 476 with `});` — append after that line.)

```js

function renderDevWidget() {
  const wrapper = document.createElement("div");
  wrapper.id = "dev-today";
  const label = document.createElement("label");
  label.htmlFor = "devTodayInput";
  label.textContent = "Dev today:";
  const input = document.createElement("input");
  input.type = "date";
  input.id = "devTodayInput";
  const stored = localStorage.getItem("fitness.devToday");
  input.value = stored || toISO(new Date());
  input.addEventListener("change", () => {
    if (input.value) {
      localStorage.setItem("fitness.devToday", input.value);
    } else {
      localStorage.removeItem("fitness.devToday");
    }
    render(currentStart);
    scrollToToday();
  });
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  document.querySelector(".controls").appendChild(wrapper);
}

if (location.hostname === "localhost") renderDevWidget();
```

- [ ] **Step 3: Verify widget appears on localhost**

With the emulator running, hard-refresh `http://localhost:5000`. The header controls area should show a muted "Dev today:" label followed by a date input, visually separated by a left border.

- [ ] **Step 4: Test the override flow**

1. Change the date input to a future date (e.g., 2026-12-25). The calendar should re-render with that date's cell highlighted as "today" (yellow/`--today` colour).
2. Reload the page — the input should still show 2026-12-25 (persisted in `localStorage`).
3. Clear the input (select all → delete). The calendar should re-render with the real current date highlighted.

- [ ] **Step 5: Verify production is unaffected**

The `if (location.hostname === "localhost") renderDevWidget();` guard means the widget never appears outside localhost. No production verification step needed beyond code review — the guard is the entire mechanism.

- [ ] **Step 6: Run the full test suite one final time**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass (the `getToday` tests from Task 1 remain green).

---

## Self-Review

### Spec Coverage

| Spec requirement | Task |
|-----------------|------|
| `getToday(storage, hostname)` pure function in `firebase.js` | Task 1 |
| Non-localhost returns real today | Task 1, test 1 |
| Localhost + valid stored → override, hours zeroed | Task 1, test 2 |
| Localhost + no stored → real today | Task 1, test 3 |
| Localhost + invalid stored → real today, no crash | Task 1, test 4 |
| Export `getToday` via `module.exports` | Task 1 Step 4 |
| Replace `new Date()` today at line 173 (`render`) | Task 2 Step 1 |
| Replace `new Date()` today at line 399 (`defaultStart`) | Task 2 Step 2 |
| Replace `new Date()` today at line 462 (`onAuthChange`) | Task 2 Step 3 |
| `renderDevWidget()` injected into `.controls`, localhost only | Task 3 Step 2 |
| `localStorage` key `"fitness.devToday"` | Task 3 Step 2 |
| Clearing input removes key → real today restored | Task 3 Step 4 |
| `#dev-today` styles (opacity, border, label font-size) | Task 3 Step 1 |
| No `index.html` changes | Confirmed — widget injected by JS |
| 4 unit tests for `getToday` | Task 1 Step 2 |

All requirements covered. No placeholders. Type consistency: `getToday` named consistently across all tasks.
