# Dev Today Override Design

**Date:** 2026-05-23
**Status:** Approved

## Problem

Testing date-dependent behaviour (past-day highlighting, auto-skip, "today" cell marker) requires waiting for real calendar days to pass. There is no way to simulate a different date locally.

## Goal

On `localhost` only: show a date input in the header controls that overrides "today" for the entire app. The override persists across page reloads via `localStorage`. Clearing the input restores real today. Production is unaffected.

---

## Architecture

**`getToday(storage, hostname)`** — pure function added to `firebase.js`, exported for testing. Takes `localStorage` and `location.hostname` as parameters (no globals). On `localhost` reads `storage.getItem("fitness.devToday")`; falls back to real `new Date()` for non-localhost, missing value, or invalid date.

**`app.js`** — replaces the three hardcoded `new Date(); setHours(0,0,0,0)` "today" constructions (lines 173, 399, 462) with `getToday(localStorage, location.hostname)`. Adds `renderDevWidget()` which appends a `#dev-today` div to `.controls`; called once at boot only on `localhost`.

**`styles.css`** — minimal styles for `#dev-today`: muted opacity, left border separator, smaller label font — visually distinct from real UI controls.

**`firebase.test.js`** — four unit tests for `getToday` covering: non-localhost returns real date; localhost with valid stored value returns that date with hours zeroed; localhost with no stored value returns real today; localhost with invalid stored value returns real today.

---

## File Changes

### `firebase.js`

Add `getToday` before `signIn()`:

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

Add to `module.exports`:
```js
module.exports = { workoutDate, autoSkipPast, LOGGABLE_DAYS_OFFSET, initEmulatorIfNeeded, getToday };
```

### `app.js`

**Three replacements** — each `new Date(); today.setHours(0,0,0,0)` becomes `getToday(localStorage, location.hostname)`:

Line 173 (inside `render`):
```js
// before
const today = new Date(); today.setHours(0,0,0,0);
// after
const today = getToday(localStorage, location.hostname);
```

Line 399 (inside `defaultStart`):
```js
// before
const today = new Date(); today.setHours(0,0,0,0);
// after
const today = getToday(localStorage, location.hostname);
```

Line 462 (inside `onAuthChange` callback):
```js
// before
const today = new Date(); today.setHours(0, 0, 0, 0);
// after
const today = getToday(localStorage, location.hostname);
```

**`renderDevWidget()`** — appended to `.controls`, only called on `localhost`:

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

Place `renderDevWidget` definition in the Boot section, just before the `onAuthChange` call at the bottom of the file.

### `styles.css`

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

### `firebase.test.js`

Add after the `initEmulatorIfNeeded` tests:

```js
const { ..., getToday } = require("./firebase.js");

// ---- getToday ----

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

---

## Behaviour Notes

- `localStorage` key `"fitness.devToday"` stores an ISO date string (`"YYYY-MM-DD"`), consistent with the `"fitness.startDate"` key already in use.
- Clearing the input removes the key → real today restored on next render.
- The "Today" button (`scrollToToday`) scrolls to the `.today` cell, which is set based on `getToday()` — so it correctly scrolls to the dev date.
- No changes to `index.html` — the widget is injected by JS.
