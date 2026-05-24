# Modal Plan Hint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the redundant exercise plan list in the workout modal with a single compact hint line, and strip the duplicate "Log this workout" label and per-section plan hints from the log form.

**Architecture:** Three targeted edits across `styles.css` and `app.js`. No new functions, no data-model changes. The `<ol>` exercise list is conditionally replaced with a `<div class="plan-hint">` when the log form is shown. Two redundant HTML strings are removed from the form builder functions.

**Tech Stack:** Vanilla JS, CSS custom properties.

---

## File Map

| File | Change |
|------|--------|
| `styles.css` | Append `.plan-hint` rule |
| `app.js` lines 374–388 | Replace ol block + move `isStrength` declaration earlier; add compact hint branch |
| `app.js` line 263 | Remove `log-label` div from `buildStrengthFormHTML` |
| `app.js` lines 252–253 | Remove `log-ex-plan` span from `buildExSectionInnerHTML` |

---

### Task 1: Add `.plan-hint` CSS rule

**Files:**
- Modify: `styles.css`

There are no unit tests for CSS. Confirm baseline tests pass, make the change, confirm they still pass.

- [ ] **Step 1: Confirm baseline tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all 7 test suites pass.

- [ ] **Step 2: Append rule to `styles.css`**

The file currently ends at line 248 (`.log-ex-name-sm { ... }`). Append after it:

```css
.plan-hint { color: var(--text-dim); font-size: 12px; margin-bottom: 14px; }
```

- [ ] **Step 3: Confirm tests still pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

---

### Task 2: Replace `<ol>` with compact hint in `openModal`

**Files:**
- Modify: `app.js` lines 374–388

This is the core change. The `<ol>` exercise list is currently rendered unconditionally for any workout with `s.details`. After this task, it only renders when the log form is NOT shown. When the log form IS shown (logged-in user, strength day, non-test week), a compact one-line plan hint is rendered instead.

- [ ] **Step 1: Find the exact block to replace**

Read `app.js` lines 374–389. You should see exactly this:

```js
  if (s.details && s.details.length) {
    html += '<ol style="margin-top:14px">';
    for (const [name, prescription] of s.details) {
      const icon = (typeof iconFor === "function") ? iconFor(name) : null;
      const iconHtml = icon
        ? '<div class="ex-icon">' + icon + '</div>'
        : '<div class="ex-icon empty"></div>';
      html += '<li>' + iconHtml + '<div class="ex-row"><div class="ex-n">' + escapeHtml(name) + '</div>' + (prescription ? '<div class="ex-p">' + escapeHtml(prescription) + '</div>' : '') + '</div></li>';
    }
    html += '</ol>';
  }
  if (s.note) html += '<div class="note">' + escapeHtml(s.note) + '</div>';

  const isStrength = (s.tag || "").startsWith("strength") || s.tag === "deload";
  if (currentUser && isStrength && planWeek && !planWeek.test) {
```

Replace the entire block above (lines 374–388, up to and including the `if (currentUser && isStrength...` opening line) with:

```js
  const isStrength = (s.tag || "").startsWith("strength") || s.tag === "deload";
  if (currentUser && isStrength && planWeek && !planWeek.test) {
    const [exKey, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === dKey);
    const [puS, puR] = planWeek[exKey];
    const [crS, crR] = planWeek.cr;
    html += '<div class="plan-hint">' +
      escapeHtml(ex.name) + ' ' + puS + '×' + puR +
      ' · Crunches ' + crS + '×' + crR +
      '</div>';
  } else if (s.details && s.details.length) {
    html += '<ol style="margin-top:14px">';
    for (const [name, prescription] of s.details) {
      const icon = (typeof iconFor === "function") ? iconFor(name) : null;
      const iconHtml = icon
        ? '<div class="ex-icon">' + icon + '</div>'
        : '<div class="ex-icon empty"></div>';
      html += '<li>' + iconHtml + '<div class="ex-row"><div class="ex-n">' + escapeHtml(name) + '</div>' + (prescription ? '<div class="ex-p">' + escapeHtml(prescription) + '</div>' : '') + '</div></li>';
    }
    html += '</ol>';
  }
  if (s.note) html += '<div class="note">' + escapeHtml(s.note) + '</div>';

  if (currentUser && isStrength && planWeek && !planWeek.test) {
```

**Important:** The block ends with `if (currentUser && isStrength && planWeek && !planWeek.test) {` — this is the OPENING of the existing log form block (lines 388–418). Do NOT replace what's inside that block. The replacement text ends right at that opening `{` — the body of the log form block (`const logged = getWorkout(...)`, etc.) stays exactly as-is.

`[exKey, ex]` is declared in two separate block scopes (once above for the hint, once inside the log form block at line 390) — JavaScript allows this because they are different `if` block scopes.

- [ ] **Step 2: Confirm tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

- [ ] **Step 3: Smoke test in browser**

With `make dev` running at `http://localhost:5000`, sign in and open a strength day (Mon/Wed/Thu/Fri) that is **not yet logged**. Verify:
- The compact hint appears directly below the workout title: e.g. `Push-ups 5×8 · Crunches 3×15`
- The `<ol>` exercise list is gone
- The per-set log form still appears below (with icons, set rows, Save/Skip buttons)

Open a **rest day** or **jump rope day** — verify the `<ol>` exercise list still renders normally.

---

### Task 3: Remove `log-label` and `log-ex-plan` from form builders

**Files:**
- Modify: `app.js` line 263 (`buildStrengthFormHTML`)
- Modify: `app.js` lines 252–253 (`buildExSectionInnerHTML`)

Two small removals. The "Log this workout" label above the form and the "plan: N × M" right-aligned text inside each exercise section header are now redundant — the compact hint above covers both.

- [ ] **Step 1: Remove `log-label` from `buildStrengthFormHTML`**

Find this exact block in `buildStrengthFormHTML` (lines 261–271):

```js
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

Replace with (remove the `log-label` line):

```js
function buildStrengthFormHTML(exKey, ex, planWeek, existingActual) {
  const ea = existingActual || {};
  return '<div class="log-ex-section" data-ex="' + exKey + '">' +
      buildExSectionInnerHTML(exKey, ex.name, planWeek[exKey], ea[exKey]) +
    '</div>' +
    '<hr class="log-ex-sep">' +
    '<div class="log-ex-section" data-ex="cr">' +
      buildExSectionInnerHTML('cr', 'Crunches', planWeek.cr, ea.cr) +
    '</div>';
}
```

- [ ] **Step 2: Remove `log-ex-plan` span from `buildExSectionInnerHTML`**

Find this exact block in `buildExSectionInnerHTML` (lines 250–253):

```js
  return '<div class="log-ex-header">' + iconHtml +
    '<span class="log-ex-name">' + escapeHtml(name) + '</span>' +
    '<span class="log-ex-plan">plan: ' + plannedSets + ' × ' + plannedReps + '</span>' +
    '</div>' +
```

Replace with (remove the `log-ex-plan` span):

```js
  return '<div class="log-ex-header">' + iconHtml +
    '<span class="log-ex-name">' + escapeHtml(name) + '</span>' +
    '</div>' +
```

- [ ] **Step 3: Confirm tests pass**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make test
```

Expected: all tests pass.

- [ ] **Step 4: Smoke test — all three log states**

With `make dev` running at `http://localhost:5000`, sign in and verify:

1. **Unlogged day** — open a strength day with no log entry. Should see: compact hint + exercise sections without "Log this workout" label and without "plan: N × M" hints in each section header.
2. **Logged/done day** — open a day previously saved with per-set reps. Should see: compact hint + the done card (icon + name + reps rows + Edit button).
3. **Skipped day** — open a day that was skipped. Should see: compact hint + "Logged: Skipped" + Edit button.
4. **Non-strength day** — open a jump rope or rest day. Should see: the `<ol>` exercise list unchanged (no compact hint).

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| Add `.plan-hint` CSS rule | Task 1 |
| Compact hint replaces `<ol>` for logged-in strength days | Task 2 |
| Hint appears in all three log states (unlogged, done, skipped) | Task 2 (hint is rendered before log wrapper regardless of state) |
| `<ol>` unchanged for non-strength/non-logged-in | Task 2 (else branch) |
| Remove "Log this workout" label | Task 3 Step 1 |
| Remove "plan: N × M" per-section hints | Task 3 Step 2 |
