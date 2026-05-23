export function toISO(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

export function fromISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfWeekMonday(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = r.getDay();
  const diff = (dow === 0 ? -6 : 1 - dow);
  return addDays(r, diff);
}

export function fmtDayDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtRange(a, b) {
  if (a.getMonth() === b.getMonth()) {
    return a.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + "–" + b.getDate();
  }
  return a.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " – " + b.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
