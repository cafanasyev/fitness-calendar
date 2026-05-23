const CR_DAYS = ["fri", "wed", "mon"];

export function findLastDone(exKey, beforeWeekN, workouts, exercises) {
  const days = exKey === "cr" ? CR_DAYS : [exercises[exKey].day];
  for (let w = beforeWeekN; w >= 1; w--) {
    for (const d of days) {
      const entry = workouts[w + "-" + d];
      if (entry && entry.actual && Array.isArray(entry.actual[exKey])) {
        return { weekN: w, actual: entry.actual };
      }
    }
  }
  return null;
}

export function findFirstSkipAfterWeek(exKey, afterWeekN, beforeWeekN, workouts, exercises) {
  const days = exKey === "cr" ? CR_DAYS : [exercises[exKey].day];
  for (let w = afterWeekN + 1; w <= beforeWeekN - 1; w++) {
    for (const d of days) {
      const entry = workouts[w + "-" + d];
      if (entry && entry.actual && entry.actual[exKey] === "skipped") {
        return w;
      }
    }
  }
  return null;
}

export function computeEffectivePlan(exKey, weekN, workouts, plan, exercises) {
  function planFor(wk) {
    const p = plan.find(q => q.wk === wk);
    if (!p) throw new Error("computeEffectivePlan: no plan entry for week " + wk);
    return p;
  }

  const lastDone = findLastDone(exKey, weekN - 1, workouts, exercises);
  if (!lastDone) return planFor(weekN)[exKey];

  const basePlan       = planFor(lastDone.weekN)[exKey];
  const actualTotal    = lastDone.actual[exKey].reduce((s, v) => s + v, 0);
  const delta          = Math.round((actualTotal - basePlan[0] * basePlan[1]) / basePlan[0]);

  const firstSkip  = findFirstSkipAfterWeek(exKey, lastDone.weekN, weekN, workouts, exercises);
  const anchorReps = firstSkip ? planFor(firstSkip)[exKey][1] : planFor(weekN)[exKey][1];

  return [planFor(weekN)[exKey][0], Math.max(1, anchorReps + delta)];
}
