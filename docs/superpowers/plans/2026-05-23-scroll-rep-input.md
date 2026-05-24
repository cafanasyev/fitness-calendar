# Scroll Rep Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the browser's default spin-button arrows on per-set rep inputs with scroll-wheel (desktop) and touch-drag (mobile) gestures.

**Architecture:** Two targeted edits across `styles.css` and `app.js`. CSS hides the native spin buttons and sets `cursor: ns-resize`. A new `applyInputGestures(root)` function attaches `wheel` and `touchmove` listeners to every `.log-set-input` within a container; it is called at three sites in `attachStrengthLogHandlers` — once on initial render and once after each `innerHTML` replacement that creates new inputs.

**Tech Stack:** Vanilla JS, CSS.

---

## File Map

| File | Change |
|------|--------|
| `styles.css` line 236 | Add `cursor: ns-resize; -moz-appearance: textfield;` to `.log-set-input` |
| `styles.css` after line 236 | Add new WebKit spin-button hiding rule |
| `app.js` between lines 269–271 | Insert `applyInputGestures` function |
| `app.js` line 275 | Call `applyInputGestures(wrapper)` after `const exState = {};` |
| `app.js` line 331 | Call `applyInputGestures(section)` after section innerHTML is set in `log-ex-edit` |
| `app.js` line 336 | Call `applyInputGestures(wrapper)` after `applyEditAll` in `log-edit` |

---

### Task 1: Hide spin buttons and set cursor in CSS

**Files:**
- Modify: `styles.css` line 236

There are no unit tests for CSS changes. Confirm baseline tests pass, make the change, confirm they still pass.

- [ ] **Step 1: Confirm baseline tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all 3 test suites pass.

- [ ] **Step 2: Update `.log-set-input` rule**

Current line 236:
```css
.log-set-input { width: 52px; padding: 4px 6px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text); font-size: 13px; text-align: center; }
```

Replace with:
```css
.log-set-input { width: 52px; padding: 4px 6px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text); font-size: 13px; text-align: center; cursor: ns-resize; -moz-appearance: textfield; }
```

- [ ] **Step 3: Add WebKit spin-button hiding rule immediately after line 236**

Insert this new rule after the `.log-set-input` rule:
```css
.log-set-input::-webkit-outer-spin-button,
.log-set-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
```

- [ ] **Step 4: Confirm tests still pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

---

### Task 2: Add `applyInputGestures` and wire it up in `app.js`

**Files:**
- Modify: `app.js` (4 edits)

- [ ] **Step 1: Confirm baseline tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

- [ ] **Step 2: Insert `applyInputGestures` between `buildStrengthFormHTML` and `attachStrengthLogHandlers`**

Read `app.js` lines 269–272 first to confirm you see exactly:
```js
}

function attachStrengthLogHandlers(weekN, dKey, planWeek) {
```

Insert between them (after the closing `}` of `buildStrengthFormHTML`, before `function attachStrengthLogHandlers`):

```js
function applyInputGestures(root) {
  root.querySelectorAll('.log-set-input').forEach(inp => {
    inp.addEventListener('wheel', e => {
      e.preventDefault();
      inp.value = Math.max(1, Math.min(99, (parseInt(inp.value, 10) || 0) + (e.deltaY < 0 ? 1 : -1)));
    }, { passive: false });
    let touchStartY, touchStartVal;
    inp.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
      touchStartVal = parseInt(inp.value, 10) || 0;
    }, { passive: true });
    inp.addEventListener('touchmove', e => {
      e.preventDefault();
      const delta = Math.round((touchStartY - e.touches[0].clientY) / 8);
      inp.value = Math.max(1, Math.min(99, touchStartVal + delta));
    }, { passive: false });
  });
}
```

- [ ] **Step 3: Call `applyInputGestures(wrapper)` on initial render**

In `attachStrengthLogHandlers`, find:
```js
  const exState = {};
```

Add the call immediately after it:
```js
  const exState = {};
  applyInputGestures(wrapper);
```

- [ ] **Step 4: Call `applyInputGestures(section)` after per-exercise edit**

Find the `log-ex-edit` branch in the click handler. It currently ends with:
```js
      section.innerHTML = buildExSectionInnerHTML(key, name, plannedArr, prevVal || null);
```

Add the call immediately after:
```js
      section.innerHTML = buildExSectionInnerHTML(key, name, plannedArr, prevVal || null);
      applyInputGestures(section);
```

- [ ] **Step 5: Call `applyInputGestures(wrapper)` after full form re-render**

Find the `log-edit` branch in the click handler. It currently ends with:
```js
      applyEditAll(exState, prevActual, exKey);
```

Add the call immediately after:
```js
      applyEditAll(exState, prevActual, exKey);
      applyInputGestures(wrapper);
```

- [ ] **Step 6: Confirm tests still pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

- [ ] **Step 7: Smoke test in browser**

With `make dev` running at `http://localhost:5000`, sign in and open a strength day:

1. **Desktop scroll**: hover over a set input, scroll the mouse wheel up/down — value increments/decrements. Spin arrows are not visible.
2. **Desktop type**: click the input and type a number — still works.
3. **Mobile swipe** (or browser DevTools mobile emulation): touch-drag up/down on an input — value changes. Page does not scroll while dragging over the input.
4. **Per-exercise edit**: save one exercise, click its "edit" link, confirm scroll/swipe still works on the restored inputs.
5. **Full form re-render**: save a workout, reopen the day, click "Edit" — confirm scroll/swipe works on the re-rendered inputs.

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| Hide WebKit spin buttons | Task 1 Steps 2–3 |
| Hide Firefox spin buttons (`-moz-appearance`) | Task 1 Step 2 |
| `cursor: ns-resize` on inputs | Task 1 Step 2 |
| `applyInputGestures` function with wheel + touch | Task 2 Step 2 |
| Wire on initial render | Task 2 Step 3 |
| Wire after `log-ex-edit` | Task 2 Step 4 |
| Wire after `log-edit` | Task 2 Step 5 |
