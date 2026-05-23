export function validateActual(actual) {
  if (actual == null) return;
  for (const val of Object.values(actual)) {
    if (val !== 'skipped') {
      if (!Array.isArray(val) || val.some(r => !Number.isInteger(r) || r < 1 || r > 999))
        throw new Error('Invalid workout data');
    }
  }
}
