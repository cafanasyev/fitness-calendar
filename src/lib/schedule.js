const LOGGABLE_DAYS_OFFSET = { mon: 0, wed: 2, thu: 3, fri: 4 };

export function workoutDate(startDateISO, weekN, dayKey) {
  const [y, m, d] = startDateISO.split("-").map(Number);
  const result = new Date(y, m - 1, d);
  result.setDate(result.getDate() + (weekN - 1) * 7 + LOGGABLE_DAYS_OFFSET[dayKey]);
  return result;
}

export function getToday(storage, hostname) {
  if (hostname === 'localhost') {
    const stored = storage.getItem('fitness.devToday');
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d)) { d.setHours(0, 0, 0, 0); return d; }
    }
  }
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function autoSkipPast(startDateISO, workouts, today) {
  const toSkip = [];
  for (let weekN = 1; weekN <= 24; weekN++) {
    for (const dayKey of Object.keys(LOGGABLE_DAYS_OFFSET)) {
      if (workouts[weekN + "-" + dayKey]) continue;
      if (workoutDate(startDateISO, weekN, dayKey) < today) {
        toSkip.push({ weekN, dayKey });
      }
    }
  }
  return toSkip;
}
