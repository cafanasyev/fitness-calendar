export function canSave(exState, exKey) {
  return (exKey in exState) && ('cr' in exState);
}

export function buildActual(exState, exKey) {
  return { [exKey]: exState[exKey], cr: exState.cr };
}

export function applyEditAll(exState, savedActual, exKey) {
  if (!savedActual) return;
  if (exKey in savedActual) exState[exKey] = savedActual[exKey];
  if ('cr' in savedActual) exState.cr = savedActual.cr;
}
