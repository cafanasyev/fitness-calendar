# Adaptive Plan Design

## Goal

Auto-adjust each exercise's planned reps for the upcoming session based on actual logged performance. No plan data is persisted — the adjustment is always computed on the fly from `progress.workouts`.

## Rules

1. **Underperformance** — if actual total reps < base planned total, next session reduces reps proportionally.
2. **Overperformance** — if actual total reps > base planned total, next session increases reps proportionally.
3. **Skip** — if a session was explicitly skipped, the next session shows the same effective plan as the skipped one (plan does not ramp while skipping).
4. **Per-exercise independence** — each exercise adjusts separately. Squats do not affect push-ups, etc.
5. **Crunches are independent** — `cr` has its own adjustment derived from the most recent crunch log across any strength day.
6. **No history** — if no prior workout has been logged for this exercise, show the base plan unchanged.
7. **Test weeks** (`planWeek.test === true`) — no adjustment applied; show base plan as-is.
8. **Sets always follow the base plan** — only reps per set are adjusted. Macro periodization (6→7 sets at block 3) is preserved.

## Formula

```
delta = round((actualTotal - basePlannedTotal) / baseSets)

effectiveReps = anchorBaseReps + delta
effectiveSets = basePlan[exKey][0]        // always from base plan
effectiveReps = max(1, effectiveReps)     // never below 1
```

Where:
- `actualTotal` = `sum(actual[exKey])` — sum of all logged reps across all sets. Variable reps per set and partially-completed sets (fewer reps logged than planned) are handled naturally by summing.
- `basePlannedTotal` = `basePlan_M[exKey][0] × basePlan_M[exKey][1]` — base plan total for the week the last done session occurred
- `baseSets` = `basePlan_M[exKey][0]` — set count from the last done session's base plan
- `anchorBaseReps`:
  - If no skips since last done: `basePlan_N[exKey][1]` (current week's base reps — full periodization)
  - If skips exist since last done: `basePlan_S[exKey][1]` where S = first skip week after last done (plan frozen at that point)

## Algorithms

### `findLastDone(exKey, beforeWeekN, progress, exercises)`

Scans weeks from `beforeWeekN` down to 1. For each week, checks `progress.workouts[w + "-" + dKey]` where:
- For regular exercises (`exKey = 'pu'`, `'pl'`, `'sq'`): `dKey = exercises[exKey].day`
- For `exKey = 'cr'`: scan all three strength days (`'mon'`, `'wed'`, `'fri'`) per week

Returns `{ weekN, actual }` for the most recent entry where `actual[exKey]` is an array (i.e., not `"skipped"` and not null/undefined). Returns `null` if none found.

### `findFirstSkipAfterWeek(exKey, afterWeekN, beforeWeekN, progress, exercises)`

Scans weeks from `afterWeekN + 1` up to `beforeWeekN - 1`. For each week, checks the same `progress.workouts` key(s) as above.

Returns the week number of the **first** entry where `actual[exKey] === "skipped"`. Returns `null` if none found.

Because `findLastDone` already identifies the most recent done, there is guaranteed to be no done session between `afterWeekN` and `beforeWeekN` — so no done-session guard is needed inside this function.

### `computeEffectivePlan(exKey, weekN, progress, plan, exercises)`

```
lastDone = findLastDone(exKey, weekN - 1, progress, exercises)
if not lastDone: return planFor(plan, weekN)[exKey]   // base plan

basePlanLastDone = planFor(plan, lastDone.weekN)[exKey]
actualTotal      = sum(lastDone.actual[exKey])
delta            = round((actualTotal - basePlanLastDone[0] * basePlanLastDone[1]) / basePlanLastDone[0])

firstSkip = findFirstSkipAfterWeek(exKey, lastDone.weekN, weekN, progress, exercises)
anchorReps = firstSkip
  ? planFor(plan, firstSkip)[exKey][1]
  : planFor(plan, weekN)[exKey][1]

effectiveReps = max(1, anchorReps + delta)
effectiveSets = planFor(plan, weekN)[exKey][0]
return [effectiveSets, effectiveReps]
```

Where `planFor(plan, wk)` = `plan.find(p => p.wk === wk)` — matches the pattern used in `app.js`. The `PLAN` array is searched by `.wk` property, not by index.

## Integration in `app.js`

In `openModal`, after `const planWeek = PLAN.find(p => p.wk === weekN)` and inside the `if (currentUser && isStrength && planWeek && !planWeek.test)` block, compute `effectivePlanWeek`:

```js
const effectivePlanWeek = {
  ...planWeek,
  [exKey]: computeEffectivePlan(exKey, weekN, progress.workouts, PLAN, EXERCISES),
  cr:      computeEffectivePlan('cr',  weekN, progress.workouts, PLAN, EXERCISES),
};
```

Then replace all uses of `planWeek[exKey]` and `planWeek.cr` inside that block (plan hint, `buildStrengthFormHTML`, `attachStrengthLogHandlers`) with `effectivePlanWeek`.

The top-level `planWeek` (used for non-strength days, tag rendering, etc.) is unchanged.

## File Map

| File | Change |
|------|--------|
| `plan-adjustment.js` | New file: `findLastDone`, `findFirstSkipAfterWeek`, `computeEffectivePlan` + dual Node.js export |
| `plan-adjustment.test.js` | New file: unit tests for all three functions |
| `app.js` | `openModal`: compute `effectivePlanWeek`, use it in hint + form |
| `index.html` | Add `<script src="plan-adjustment.js"></script>` before `app.js` |
| `Makefile` | Add `node plan-adjustment.test.js` to test target |

## Edge Cases

| Case | Behaviour |
|------|-----------|
| `actual[exKey] = "skipped"` | Skipped workout — `findLastDone` skips over it |
| `actual[exKey]` is array with fewer elements than planned sets | Only completed sets are summed; partial completion is captured in `actualTotal` |
| `actual[exKey]` array with mixed reps (e.g. `[8, 5, 3]`) | Sum = 16, handled naturally |
| No history at all | Returns base plan |
| `planWeek.test === true` | Skip adjustment entirely — caller guards on `!planWeek.test` already |
| Week 1 (no prior weeks to scan) | `findLastDone` returns null → base plan |
