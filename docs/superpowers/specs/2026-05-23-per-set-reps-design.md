# Per-Set Reps Logging Design

**Date:** 2026-05-23
**Status:** Approved

## Problem

The current log form captures a single sets × reps value per exercise (e.g. "3 sets × 8 reps"). This makes it impossible to record that each set had a different rep count as fatigue builds.

## Goal

Replace the sets × reps inputs with one input row per planned set. Each row is pre-filled with the target rep count. Leaving a row blank means that set wasn't done. Each exercise (primary + crunches) has its own Save / Skip buttons. The workout is saved to Firestore once both exercises are handled.

---

## Data Model

### New `actual` format

`actual[exKey]` is either an array of per-set rep counts (done) or the string `"skipped"`:

```js
{ pu: [8, 8, 7, 6, 5], cr: [15, 15, 14] }   // both done
{ pu: [8, 8, 7, 6, 5], cr: "skipped"  }       // primary done, crunches skipped
{ pu: "skipped",        cr: [15, 15, 14] }    // primary skipped, crunches done
{ pu: "skipped",        cr: "skipped"  }       // both skipped
```

Top-level `status` is always `"done"` for manually logged workouts (same as before). The per-exercise outcome is encoded in `actual`, not `status`.

### Auto-skip (unchanged)

`autoSkipPast` / `saveAutoSkips` continue setting `{ status: "skipped" }` with no `actual`. The display code checks `status === "skipped"` first and shows "Logged: Skipped" — no change needed.

### No migration

No existing logged data to migrate. The old `[sets, reps]` array format is removed entirely.

---

## Form Structure

The `#log-wrapper` div contains two exercise sections separated by a horizontal rule. Each section has:

1. **Header** — icon (`iconFor(ex.name)`), exercise name, plan hint (`plan: N × M`)
2. **Set rows** — one `div.log-set-row` per planned set, pre-filled with target reps
3. **Actions** — Save button (`button.log-ex-save[data-ex=exKey]`) and Skip button (`button.log-ex-skip[data-ex=exKey]`)

Once an exercise is saved or skipped in-memory, its section collapses to a one-line summary:
- Done: badge + rep list (`8 / 8 / 7 / 6 / 5`) + "edit" link (`button.log-ex-edit[data-ex=exKey]`)
- Skipped: badge + "edit" link

The form saves to Firestore and closes the modal automatically when both exercises are handled.

### Pre-fill logic

When building the form inputs for an exercise:
- If `existingActual[exKey]` is an array → pre-fill set rows with those values (remaining rows blank)
- If `existingActual[exKey]` is `"skipped"` or absent → pre-fill all rows with the plan's target rep count

### Blank row handling

A set row is ignored (not counted) if its input is empty or `0` when the user taps Save. The resulting array contains only the non-zero values in order. If all rows are blank, the Save button does nothing (no save).

---

## File Changes

### `app.js`

**`buildStrengthFormHTML(exKey, ex, planWeek, existingActual)`** — new signature. `planWeek` is the full plan week object (has `planWeek[exKey]` = `[plannedSets, plannedReps]` and `planWeek.cr` = `[plannedSets, plannedReps]`). `existingActual` is the existing `actual` object or `null`. Returns the full two-section form HTML string.

```js
function buildStrengthFormHTML(exKey, ex, planWeek, existingActual) {
  function sectionHTML(key, name, plannedArr, existingVal) {
    const [plannedSets, plannedReps] = plannedArr;
    const icon = (typeof iconFor === "function") ? iconFor(name) : null;
    const iconHtml = icon ? '<div class="log-ex-icon">' + icon + '</div>' : '';
    let rows = '';
    for (let i = 0; i < plannedSets; i++) {
      const prefill = Array.isArray(existingVal) ? (existingVal[i] || '') : plannedReps;
      rows += '<div class="log-set-row">' +
        '<span class="log-set-num">Set ' + (i + 1) + '</span>' +
        '<input type="number" class="log-set-input" value="' + prefill + '" min="1" placeholder="—">' +
        '<span class="log-set-unit">reps</span>' +
        '</div>';
    }
    return '<div class="log-ex-section" data-ex="' + key + '">' +
      '<div class="log-ex-header">' + iconHtml +
        '<span class="log-ex-name">' + escapeHtml(name) + '</span>' +
        '<span class="log-ex-plan">plan: ' + plannedSets + ' × ' + plannedReps + '</span>' +
      '</div>' +
      '<div class="log-set-rows">' + rows + '</div>' +
      '<div class="log-ex-actions">' +
        '<button class="log-ex-save" data-ex="' + key + '">Save</button>' +
        '<button class="log-ex-skip" data-ex="' + key + '">Skip</button>' +
      '</div>' +
      '</div>';
  }
  const ea = existingActual || {};
  return '<div class="log-label">Log this workout</div>' +
    sectionHTML(exKey, ex.name, planWeek[exKey], ea[exKey]) +
    '<hr class="log-ex-sep">' +
    sectionHTML('cr', 'Crunches', planWeek.cr, ea.cr);
}
```

**`attachStrengthLogHandlers(weekN, dKey, planWeek)`** — replaces all existing logic. Tracks in-memory state `exState = {}`. When both keys are present in `exState`, saves to Firestore and closes.

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
    const detail = Array.isArray(val) ? ' <span class="log-ex-reps">' + val.join(' / ') + '</span>' : '';
    section.innerHTML = '<div class="log-ex-header">' + iconHtml +
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
      delete exState[key];
      const ea = {};
      if (key in exState) ea[key] = exState[key]; // won't be set (just deleted), but keep pattern
      // Re-render just this section
      const section = wrapper.querySelector('.log-ex-section[data-ex="' + key + '"]');
      const existingVal = (progress.workouts[weekN + "-" + dKey] && progress.workouts[weekN + "-" + dKey].actual)
        ? progress.workouts[weekN + "-" + dKey].actual[key]
        : null;
      const [plannedArr, name] = key === "cr"
        ? [planWeek.cr, "Crunches"]
        : [planWeek[exKey], ex.name];
      const icon = (typeof iconFor === "function") ? iconFor(name) : null;
      const iconHtml = icon ? '<div class="log-ex-icon">' + icon + '</div>' : '';
      const [plannedSets, plannedReps] = plannedArr;
      let rows = '';
      for (let i = 0; i < plannedSets; i++) {
        const prefill = Array.isArray(existingVal) ? (existingVal[i] || '') : plannedReps;
        rows += '<div class="log-set-row">' +
          '<span class="log-set-num">Set ' + (i + 1) + '</span>' +
          '<input type="number" class="log-set-input" value="' + prefill + '" min="1" placeholder="—">' +
          '<span class="log-set-unit">reps</span>' +
          '</div>';
      }
      section.innerHTML = '<div class="log-ex-header">' + iconHtml +
        '<span class="log-ex-name">' + escapeHtml(name) + '</span>' +
        '<span class="log-ex-plan">plan: ' + plannedSets + ' × ' + plannedReps + '</span>' +
        '</div>' +
        '<div class="log-set-rows">' + rows + '</div>' +
        '<div class="log-ex-actions">' +
          '<button class="log-ex-save" data-ex="' + key + '">Save</button>' +
          '<button class="log-ex-skip" data-ex="' + key + '">Skip</button>' +
        '</div>';
    }
  });
}
```

**`openModal` display logic** — replace the `isStrength` logged/unlogged branch with:

```js
// When logged.status === "skipped" (auto-skip, no actual):
logInner = '<div class="log-section"><span class="log-status">Logged: Skipped</span>' +
  ' <button class="log-edit">Edit</button></div>';

// When logged.status === "done" with actual:
// Show per-exercise rows. actual[exKey] is array or "skipped".
const a = logged.actual;
const puReps = Array.isArray(a[exKey]) ? a[exKey].join(' / ') : 'skipped';
const crReps = Array.isArray(a.cr) ? a.cr.join(' / ') : 'skipped';
logInner = '<div class="log-section">' +
  '<div class="log-ex-done-row">' +
    (iconFor ? '<div class="log-ex-icon-sm">' + iconFor(ex.name) + '</div>' : '') +
    '<span class="log-ex-name-sm">' + escapeHtml(ex.name) + '</span>' +
    '<span class="log-ex-reps">' + puReps + '</span>' +
  '</div>' +
  '<div class="log-ex-done-row">' +
    (iconFor ? '<div class="log-ex-icon-sm">' + iconFor("Crunches") + '</div>' : '') +
    '<span class="log-ex-name-sm">Crunches</span>' +
    '<span class="log-ex-reps">' + crReps + '</span>' +
  '</div>' +
  '<button class="log-edit">Edit</button>' +
  '</div>';

// "Edit" click re-renders the form pre-filled with existing actual:
// wrapper.innerHTML = '<div id="log-wrapper">' + buildStrengthFormHTML(exKey, ex, planWeek, logged.actual) + '</div>';
// then re-attach handlers
```

**`log-edit` handler in `openModal`** — when the top-level "Edit" button is clicked (already-logged state), re-render:

```js
} else if (e.target.classList.contains("log-edit")) {
  const prev = progress.workouts[weekN + "-" + dKey];
  wrapper.innerHTML = buildStrengthFormHTML(exKey, ex, planWeek, prev && prev.actual ? prev.actual : null);
  attachStrengthLogHandlers(weekN, dKey, planWeek);
}
```

Wait — `attachStrengthLogHandlers` adds a new click listener on `wrapper`. Since `wrapper.innerHTML` is replaced, the old listener is gone. Re-calling `attachStrengthLogHandlers` after replacing `innerHTML` is correct.

### `styles.css`

Add after the last rule:

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
.log-ex-reps { color: var(--text-muted); font-size: 12px; }
.log-ex-edit { color: var(--accent); font-size: 11px; text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0; margin-left: auto; }
.log-ex-done-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.log-ex-icon-sm { width: 24px; height: 17px; color: var(--text-muted); flex-shrink: 0; }
.log-ex-icon-sm svg { width: 100%; height: 100%; }
.log-ex-name-sm { color: var(--text-muted); font-size: 12px; min-width: 64px; }
```

---

## Behaviour Notes

- `autoSkipPast` / `saveAutoSkips` are unchanged. They produce `{ status: "skipped" }` with no `actual`, which the display code handles first (shows "Logged: Skipped").
- No changes to `firebase.js`, `progression.js`, or `firebase.test.js`.
- The new form logic is browser-only; no Node.js-testable pure functions are introduced.
- `buildStrengthFormHTML` is called from three places: initial render (unlogged), `log-edit` click, and the `!a[exKey]` fallback. All three now pass `existingActual`.

---

## Self-Review

### Placeholder scan
No TBD/TODO found. All code blocks are complete.

### Internal consistency
- `data-ex` attribute used consistently on sections, save buttons, skip buttons, and edit buttons.
- `collapseSection(key, name, val)` helper used for both save and skip paths.
- `maybeSave()` called after both collapse paths — consistent trigger point.
- CSS variable names (`var(--accent)`, `var(--text-muted)`, etc.) match the existing `:root` definitions in `styles.css`.

### Scope check
Single feature, two files (`app.js`, `styles.css`). Focused.

### Ambiguity check
- "Blank row = set not counted" — enforced by `.filter(n => n > 0)` in the save handler.
- "Pre-fill from plan when editing a previously skipped exercise" — handled: `Array.isArray(existingVal) ? existingVal[i] || '' : plannedReps`.
- Top-level `status` is always `"done"` for manual logs regardless of per-exercise outcomes.
