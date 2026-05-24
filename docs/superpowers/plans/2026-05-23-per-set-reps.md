# Per-Set Reps Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single sets × reps input with one input row per planned set for each exercise, add per-exercise Save/Skip buttons, and update the logged display to show individual set counts.

**Architecture:** All changes are in `app.js` and `styles.css`. `buildStrengthFormHTML` gets a new signature; a new `buildExSectionInnerHTML` helper builds each exercise section. `attachStrengthLogHandlers` is rewritten with per-exercise save/skip/edit state. The `actual` field in Firestore changes from `{ [exKey]: [sets, reps], cr: [sets, reps] }` to `{ [exKey]: [rep1, rep2, ...] | "skipped", cr: [...] | "skipped" }`.

**Tech Stack:** Vanilla JS, CSS custom properties, Firebase Firestore.

---

## File Map

| File | Change |
|------|--------|
| `styles.css` | Append per-set CSS rules after line 213 |
| `app.js` lines 237–251 | Replace `buildStrengthFormHTML` + add `buildExSectionInnerHTML` |
| `app.js` lines 253–284 | Replace `attachStrengthLogHandlers` |
| `app.js` lines 337–352 | Replace `openModal` logged display block |

---

### Task 1: Add CSS rules for per-set log form

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Confirm baseline tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all 7 test suites pass.

- [ ] **Step 2: Append CSS rules to the end of `styles.css`**

The file currently ends at line 213 with `}`. Append after that line:

```css

/* Per-set rep logging */
.log-ex-section { margin-bottom: 4px; }
.log-ex-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.log-ex-icon { width: 36px; height: 26px; color: var(--accent); flex-shrink: 0; }
.log-ex-icon svg { width: 100%; height: 100%; }
.log-ex-name { font-weight: 600; font-size: 13px; }
.log-ex-plan { margin-left: auto; color: var(--text-dim); font-size: 11px; }
.log-set-rows { display: flex; flex-direction: column; gap: 5px; padding-left: 44px; margin-bottom: 10px; }
.log-set-row { display: flex; align-items: center; gap: 8px; }
.log-set-num { color: var(--text-muted); font-size: 12px; width: 36px; flex-shrink: 0; }
.log-set-input { width: 52px; padding: 4px 6px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text); font-size: 13px; text-align: center; }
.log-set-unit { color: var(--text-muted); font-size: 12px; }
.log-ex-actions { display: flex; gap: 6px; padding-left: 44px; }
.log-ex-sep { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
.log-ex-done { display: flex; align-items: center; gap: 8px; padding-left: 44px; margin-bottom: 4px; }
.log-badge-done { background: #4ade8022; color: #4ade80; border: 1px solid #4ade8044; border-radius: 4px; padding: 1px 7px; font-size: 11px; font-weight: 600; }
.log-badge-skipped { background: var(--bg-elev); color: var(--text-muted); border: 1px solid var(--border); border-radius: 4px; padding: 1px 7px; font-size: 11px; }
.log-ex-reps { color: var(--text); font-size: 12px; }
.log-ex-edit { color: var(--accent); font-size: 11px; text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0; margin-left: auto; }
.log-ex-done-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.log-ex-icon-sm { width: 24px; height: 17px; color: var(--text-muted); flex-shrink: 0; }
.log-ex-icon-sm svg { width: 100%; height: 100%; }
.log-ex-name-sm { color: var(--text-muted); font-size: 12px; min-width: 64px; }
```

- [ ] **Step 3: Confirm tests still pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

---

### Task 2: Replace `buildStrengthFormHTML` with per-set form builder

**Files:**
- Modify: `app.js` lines 237–251

The new implementation adds a `buildExSectionInnerHTML` helper (returns the inner HTML for one exercise section — no outer wrapper) and rewrites `buildStrengthFormHTML` to use it. The old signature `(exKey, ex, primary, cr)` becomes `(exKey, ex, planWeek, existingActual)`.

- [ ] **Step 1: Replace lines 237–251 in `app.js`**

Find this exact block (lines 237–251):
```js
function buildStrengthFormHTML(exKey, ex, primary, cr) {
  return '<div class="log-section">' +
    '<div class="log-label">Log this workout</div>' +
    '<div class="log-inputs">' +
    '<label>' + escapeHtml(ex.name) + ': ' +
    '<input class="log-sets" type="number" value="' + primary[0] + '" min="1"> sets × ' +
    '<input class="log-reps" type="number" value="' + primary[1] + '" min="1"> reps</label>' +
    '<label>Crunches: ' +
    '<input class="log-cr-sets" type="number" value="' + cr[0] + '" min="1"> sets × ' +
    '<input class="log-cr-reps" type="number" value="' + cr[1] + '" min="1"> reps</label>' +
    '</div>' +
    '<div class="log-actions">' +
    '<button class="log-save">Save as Done</button> <button class="log-skip">Skip</button>' +
    '</div></div>';
}
```

Replace with:

```js
function buildExSectionInnerHTML(key, name, plannedArr, prefillVal) {
  const [plannedSets, plannedReps] = plannedArr;
  const icon = (typeof iconFor === "function") ? iconFor(name) : null;
  const iconHtml = icon ? '<div class="log-ex-icon">' + icon + '</div>' : '';
  let rows = '';
  for (let i = 0; i < plannedSets; i++) {
    const v = Array.isArray(prefillVal) ? (prefillVal[i] || '') : plannedReps;
    rows += '<div class="log-set-row">' +
      '<span class="log-set-num">Set ' + (i + 1) + '</span>' +
      '<input type="number" class="log-set-input" value="' + v + '" min="1" placeholder="—">' +
      '<span class="log-set-unit">reps</span>' +
      '</div>';
  }
  return '<div class="log-ex-header">' + iconHtml +
    '<span class="log-ex-name">' + escapeHtml(name) + '</span>' +
    '<span class="log-ex-plan">plan: ' + plannedSets + ' × ' + plannedReps + '</span>' +
    '</div>' +
    '<div class="log-set-rows">' + rows + '</div>' +
    '<div class="log-ex-actions">' +
      '<button class="log-ex-save" data-ex="' + key + '">Save</button>' +
      ' <button class="log-ex-skip" data-ex="' + key + '">Skip</button>' +
    '</div>';
}

function buildStrengthFormHTML(exKey, ex, planWeek, existingActual) {
  const ea = existingActual || {};
  return '<div class="log-label">Log this workout</div>' +
    '<div class="log-ex-section" data-ex="' + exKey + '">' +
      buildExSectionInnerHTML(exKey, ex.name, planWeek[exKey], ea[exKey]) +
    '</div>' +
    '<hr class="log-ex-sep">' +
    '<div class="log-ex-section" data-ex="cr">' +
      buildExSectionInnerHTML('cr', 'Crunches', planWeek.cr, ea.cr) +
    '</div>';
}
```

- [ ] **Step 2: Update the two `buildStrengthFormHTML` call sites in `openModal`**

In `openModal`, find these two lines (currently around lines 343 and 351):

Line ~343 (inside the `!a || !a[exKey] || !a.cr` fallback):
```js
        logInner = buildStrengthFormHTML(exKey, ex, planWeek[exKey], planWeek.cr);
```

Line ~351 (the unlogged `else` branch):
```js
      logInner = buildStrengthFormHTML(exKey, ex, planWeek[exKey], planWeek.cr);
```

Replace **both** with:
```js
      logInner = buildStrengthFormHTML(exKey, ex, planWeek, null);
```

Note: the call site inside `attachStrengthLogHandlers` (line ~281) uses the old signature but will be replaced entirely in Task 3 — leave it for now.

- [ ] **Step 3: Confirm tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

- [ ] **Step 4: Smoke test — form renders with per-set rows**

With `make dev` running (`http://localhost:5000`), sign in and open an unlogged strength day (Mon/Wed/Thu/Fri). Verify:
- Exercise name appears with its icon (push-up stick figure, pull-up, or squat)
- "plan: N × M" hint on the right
- N input rows, each pre-filled with the target rep count
- Below a separator: Crunches section with its own icon and rows
- (Save/Skip buttons are not yet wired — Task 3 handles that)

---

### Task 3: Rewrite `attachStrengthLogHandlers`

**Files:**
- Modify: `app.js` lines 253–284

The rewrite tracks per-exercise state in `exState`. Each exercise has its own Save/Skip/edit buttons. `maybeSave()` fires to Firestore only when both exercises are handled. The top-level `log-edit` button (from the already-logged card) re-renders the full form using the existing delegated listener — no second `attachStrengthLogHandlers` call needed.

- [ ] **Step 1: Replace lines 253–284 in `app.js`**

Find this entire block (lines 253–284):
```js
function attachStrengthLogHandlers(weekN, dKey, planWeek) {
  const m = document.getElementById("modal");
  const wrapper = m.querySelector("#log-wrapper");
  const [exKey, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === dKey);

  // Single delegated listener handles save, skip, and edit via button class checks.
  wrapper.addEventListener("click", async (e) => {
    if (e.target.classList.contains("log-save")) {
      const sets  = parseInt(wrapper.querySelector(".log-sets").value, 10);
      const reps  = parseInt(wrapper.querySelector(".log-reps").value, 10);
      const crSets = parseInt(wrapper.querySelector(".log-cr-sets").value, 10);
      const crReps = parseInt(wrapper.querySelector(".log-cr-reps").value, 10);
      if (!sets || !reps || !crSets || !crReps) return;
      const actual = { [exKey]: [sets, reps], cr: [crSets, crReps] };
      await saveWorkout(weekN, dKey, "done", actual);
      progress.workouts[weekN + "-" + dKey] = { status: "done", actual };
      closeModal();
      render(currentStart);
    } else if (e.target.classList.contains("log-skip")) {
      await saveWorkout(weekN, dKey, "skipped", null);
      progress.workouts[weekN + "-" + dKey] = { status: "skipped" };
      closeModal();
      render(currentStart);
    } else if (e.target.classList.contains("log-edit")) {
      const prev = progress.workouts[weekN + "-" + dKey];
      const fillPrimary = (prev && prev.actual && prev.actual[exKey]) ? prev.actual[exKey] : planWeek[exKey];
      const fillCr      = (prev && prev.actual && prev.actual.cr)     ? prev.actual.cr     : planWeek.cr;
      // Replace inner HTML — the listener on wrapper still fires for the new buttons.
      wrapper.innerHTML = buildStrengthFormHTML(exKey, ex, fillPrimary, fillCr);
    }
  });
}
```

Replace with:

```js
function attachStrengthLogHandlers(weekN, dKey, planWeek) {
  const m = document.getElementById("modal");
  const wrapper = m.querySelector("#log-wrapper");
  const [exKey, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === dKey);
  const exState = {};

  function collapseSection(key, name, val) {
    const section = wrapper.querySelector('.log-ex-section[data-ex="' + key + '"]');
    const icon = (typeof iconFor === "function") ? iconFor(name) : null;
    const iconHtml = icon ? '<div class="log-ex-icon">' + icon + '</div>' : '';
    const badge = val === "skipped"
      ? '<span class="log-badge-skipped">skipped</span>'
      : '<span class="log-badge-done">done</span>';
    const detail = Array.isArray(val)
      ? ' <span class="log-ex-reps">' + val.join(' / ') + '</span>'
      : '';
    section.innerHTML =
      '<div class="log-ex-header">' + iconHtml +
        '<span class="log-ex-name">' + escapeHtml(name) + '</span>' +
      '</div>' +
      '<div class="log-ex-done">' + badge + detail +
        ' <button class="log-ex-edit" data-ex="' + key + '">edit</button>' +
      '</div>';
  }

  async function maybeSave() {
    if (!(exKey in exState) || !('cr' in exState)) return;
    const actual = { [exKey]: exState[exKey], cr: exState.cr };
    await saveWorkout(weekN, dKey, "done", actual);
    progress.workouts[weekN + "-" + dKey] = { status: "done", actual };
    closeModal();
    render(currentStart);
  }

  wrapper.addEventListener("click", async (e) => {
    const btn = e.target;
    if (btn.classList.contains("log-ex-save")) {
      const key = btn.dataset.ex;
      const section = wrapper.querySelector('.log-ex-section[data-ex="' + key + '"]');
      const reps = Array.from(section.querySelectorAll(".log-set-input"))
        .map(inp => parseInt(inp.value, 10))
        .filter(n => n > 0);
      if (!reps.length) return;
      const name = key === "cr" ? "Crunches" : ex.name;
      exState[key] = reps;
      collapseSection(key, name, reps);
      await maybeSave();
    } else if (btn.classList.contains("log-ex-skip")) {
      const key = btn.dataset.ex;
      const name = key === "cr" ? "Crunches" : ex.name;
      exState[key] = "skipped";
      collapseSection(key, name, "skipped");
      await maybeSave();
    } else if (btn.classList.contains("log-ex-edit")) {
      const key = btn.dataset.ex;
      const prevVal = exState[key];
      delete exState[key];
      const name = key === "cr" ? "Crunches" : ex.name;
      const plannedArr = key === "cr" ? planWeek.cr : planWeek[exKey];
      const section = wrapper.querySelector('.log-ex-section[data-ex="' + key + '"]');
      section.innerHTML = buildExSectionInnerHTML(key, name, plannedArr, prevVal || null);
    } else if (btn.classList.contains("log-edit")) {
      const prev = progress.workouts[weekN + "-" + dKey];
      wrapper.innerHTML = buildStrengthFormHTML(exKey, ex, planWeek, prev && prev.actual ? prev.actual : null);
      // Delegated listener on wrapper still covers the new buttons — no re-attach needed.
    }
  });
}
```

- [ ] **Step 2: Confirm tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

- [ ] **Step 3: Smoke test — save both exercises**

With `make dev` running (`http://localhost:5000`), sign in. Open an unlogged strength day.

1. The form shows two sections. Change some inputs (e.g. enter lower reps in later sets, leave the last row blank).
2. Click **Save** on the primary exercise. The section collapses to a "done" badge + the reps joined by ` / `. An "edit" link appears.
3. Click **Save** on the crunches section. The modal closes.
4. The day cell should now show the logged-done state. Open it again — the display is handled in Task 4.

- [ ] **Step 4: Smoke test — skip**

Open a different unlogged strength day. Click **Skip** on the primary exercise (collapses to "skipped" badge). Click **Skip** on crunches. Modal closes.

- [ ] **Step 5: Smoke test — edit a section mid-form**

Open an unlogged strength day. Enter some values. Click **Save** on the primary exercise — collapses with your values. Click **edit** on the collapsed primary section. It should re-expand showing your just-entered values pre-filled. Change a rep count. Click **Save** again. The section collapses with the new values. Save crunches. Modal closes.

- [ ] **Step 6: Smoke test — edit from logged state**

After step 3 has left a logged day: open that day. It currently shows the old `×` format (Task 4 updates this) **or** the blank form fallback. Click **Edit**. The full per-set form re-opens, pre-filled with the previously saved values. Change a value and save both — modal closes. Confirm the workout was re-saved (open again, check values match).

---

### Task 4: Update `openModal` logged display

**Files:**
- Modify: `app.js` lines 337–352

Replace the display block so logged workouts show per-exercise icon + name + reps-per-set summary.

- [ ] **Step 1: Replace lines 337–352 in `app.js`**

Find this exact block (lines 337–352):
```js
    if (logged && logged.status === "skipped") {
      logInner = '<div class="log-section"><span class="log-status">Logged: Skipped</span>' +
        ' <button class="log-edit">Edit</button></div>';
    } else if (logged && logged.status === "done") {
      const a = logged.actual;
      if (!a || !a[exKey] || !a.cr) {
        logInner = buildStrengthFormHTML(exKey, ex, planWeek, null);
      } else {
        logInner = '<div class="log-section"><span class="log-status">Logged: ' +
          escapeHtml(ex.name) + ' ' + (parseInt(a[exKey][0], 10) || 0) + '×' + (parseInt(a[exKey][1], 10) || 0) +
          ' · Crunches ' + (parseInt(a.cr[0], 10) || 0) + '×' + (parseInt(a.cr[1], 10) || 0) +
          '</span> <button class="log-edit">Edit</button></div>';
      }
    } else {
      logInner = buildStrengthFormHTML(exKey, ex, planWeek, null);
    }
```

Replace with:

```js
    if (logged && logged.status === "skipped") {
      logInner = '<div class="log-section"><span class="log-status">Logged: Skipped</span>' +
        ' <button class="log-edit">Edit</button></div>';
    } else if (logged && logged.status === "done" && logged.actual) {
      const a = logged.actual;
      const puReps = Array.isArray(a[exKey]) ? a[exKey].join(' / ') : 'skipped';
      const crReps = Array.isArray(a.cr)     ? a.cr.join(' / ')     : 'skipped';
      const puIcon = (typeof iconFor === "function") ? iconFor(ex.name)    : null;
      const crIcon = (typeof iconFor === "function") ? iconFor("Crunches") : null;
      logInner = '<div class="log-section">' +
        '<div class="log-ex-done-row">' +
          (puIcon ? '<div class="log-ex-icon-sm">' + puIcon + '</div>' : '') +
          '<span class="log-ex-name-sm">' + escapeHtml(ex.name) + '</span>' +
          '<span class="log-ex-reps">' + puReps + '</span>' +
        '</div>' +
        '<div class="log-ex-done-row">' +
          (crIcon ? '<div class="log-ex-icon-sm">' + crIcon + '</div>' : '') +
          '<span class="log-ex-name-sm">Crunches</span>' +
          '<span class="log-ex-reps">' + crReps + '</span>' +
        '</div>' +
        '<button class="log-edit">Edit</button>' +
        '</div>';
    } else {
      logInner = buildStrengthFormHTML(exKey, ex, planWeek, null);
    }
```

- [ ] **Step 2: Confirm tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

- [ ] **Step 3: Smoke test — logged card display**

Open a day you logged in Task 3 smoke tests. Verify the modal shows:
- Two rows, each with a small icon + exercise name + reps separated by ` / ` (e.g. "8 / 8 / 7 / 6 / 5")
- An "Edit" button

Click **Edit**. The full per-set form opens, pre-filled with the saved values. Change some values, save both. Close and re-open — verify the new values display correctly.

- [ ] **Step 4: Smoke test — auto-skipped day**

Use the dev-today widget in the header to set today to a date a few weeks in the future and reload. Several past days auto-skip. Open one — verify it still shows "Logged: Skipped" with an Edit button (the `status === "skipped"` branch is unchanged).

- [ ] **Step 5: Run full test suite**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all 7 test suites pass.

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| CSS for all new classes | Task 1 |
| Per-set rows pre-filled with target reps | Task 2 (`buildExSectionInnerHTML`) |
| Icon + name + plan hint per exercise section | Task 2 |
| `buildStrengthFormHTML` new signature | Task 2 |
| `buildExSectionInnerHTML` helper | Task 2 |
| Per-exercise Save/Skip buttons with `data-ex` | Task 2 |
| Blank row = set not counted (`.filter(n => n > 0)`) | Task 3 |
| Section collapses after save/skip | Task 3 (`collapseSection`) |
| `maybeSave` fires Firestore when both handled | Task 3 |
| `log-ex-edit` re-expands section pre-filled with prevVal | Task 3 |
| `log-edit` re-renders full form without re-attaching listener | Task 3 |
| `actual` format: array or `"skipped"` per key | Tasks 3–4 |
| Logged card shows per-exercise icon + reps | Task 4 |
| Auto-skip display unchanged (`status === "skipped"`) | Task 4 (first branch) |
| No changes to `firebase.js`, `progression.js`, tests | All tasks — confirmed |

### Placeholder scan
No TBD/TODO found. All code blocks complete.

### Type consistency
- `buildExSectionInnerHTML(key, name, plannedArr, prefillVal)` — defined in Task 2, called in Task 2 (`buildStrengthFormHTML`) and Task 3 (`log-ex-edit` handler). Same signature throughout.
- `collapseSection(key, name, val)` — defined and called only within Task 3's `attachStrengthLogHandlers`.
- `exState[key]` holds `[rep1, rep2, ...]` (array) or `"skipped"` (string) — consistent with how `a[exKey]` is read in Task 4 (`Array.isArray` check).
- `planWeek[exKey]` returns `[plannedSets, plannedReps]` — destructured consistently in `buildExSectionInnerHTML`.
