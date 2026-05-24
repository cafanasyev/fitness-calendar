# Modal Plan Hint Design

## Goal

Remove the duplication in the workout modal where exercise names, icons, and rep targets appear twice — once in a static plan list and again as headers in the per-set log form. Replace the plan list with a single compact hint line for logged-in users on strength days.

## Context

The modal currently renders two sections for strength days when the user is logged in:

1. **Plan list** (`<ol>`) — icon + exercise name + prescription (e.g. "5 × 8 reps") per exercise
2. **Log form** (`#log-wrapper`) — icon + exercise name + "plan: N × M" hint + per-set input rows + Save/Skip buttons per exercise

Both sections show the same exercise names and plan targets. The fix is to replace the `<ol>` with a compact one-line summary and clean up the redundant labels in the log form.

## Design

### Compact plan hint

For logged-in users on strength days (non-test weeks), replace the `<ol>` with:

```
Push-ups 5×8 · Crunches 3×15
```

Rendered as a `<div class="plan-hint">` directly below the workout `<h2>`. The content is derived from `planWeek[exKey]` and `planWeek.cr` — both `[sets, reps]` tuples — so the format is always consistent (`N×M`, no "reps" suffix).

The hint appears in all three log states: unlogged (form shown), done (logged card shown), and skipped ("Logged: Skipped" shown).

### Log form cleanup

With plan info already shown in the hint above, two redundant elements are removed from the log form:

- The `<div class="log-label">Log this workout</div>` header inside `buildStrengthFormHTML`
- The `<span class="log-ex-plan">plan: N × M</span>` right-aligned text in each exercise section header inside `buildExSectionInnerHTML`

### What stays the same

- For non-logged-in users, test weeks (`planWeek.test === true`), or non-strength workout types: the `<ol>` renders as before — no change
- The log form structure (icons, set rows, save/skip/edit buttons, collapsed state) is unchanged

## File Map

| File | Change |
|------|--------|
| `styles.css` | Add `.plan-hint` rule |
| `app.js` `openModal` | Move `isStrength` before the `<ol>` block; conditionally render hint or `<ol>` |
| `app.js` `buildStrengthFormHTML` | Remove `<div class="log-label">Log this workout</div>` |
| `app.js` `buildExSectionInnerHTML` | Remove `<span class="log-ex-plan">` from exercise header |

## CSS

```css
.plan-hint { color: var(--text-dim); font-size: 12px; margin-bottom: 14px; }
```

## Logic change in `openModal`

Move `const isStrength = ...` declaration to before the `<ol>` block. The rendering becomes:

```js
const isStrength = (s.tag || "").startsWith("strength") || s.tag === "deload";
const showLogForm = currentUser && isStrength && planWeek && !planWeek.test;

if (showLogForm) {
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
    // ... existing ol item rendering unchanged ...
  }
  html += '</ol>';
}
```

The existing `if (currentUser && isStrength && planWeek && !planWeek.test)` block below (which builds `logInner` and appends `#log-wrapper`) re-declares `const [exKey, ex]` inside its own block scope — both lookups are cheap and this keeps each block self-contained. No structural reordering of the note block (`if (s.note)`) is needed.
