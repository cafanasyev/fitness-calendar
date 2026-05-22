// ---------- Phase definitions ----------
const PHASE_NOTES = [
  "6 sets per workout",
  "more reps per set",
  "7 sets per workout + mid-test",
  "more reps",
  "peak",
  "test + maintain",
];
const WEEKS_PER_BLOCK = PROGRAM.activeWeeksPerBlock + 1;
const PHASES = PHASE_NOTES.map((desc, i) => {
  const n = i + 1;
  const startWk = i * WEEKS_PER_BLOCK + 1;
  const endWk   = startWk + WEEKS_PER_BLOCK - 1;
  return { n, name: "Block " + n, color: "var(--p" + n + ")", note: "Weeks " + startWk + "–" + endWk + " · " + desc };
});
function phaseOf(weekN) {
  return PHASES[Math.ceil(weekN / WEEKS_PER_BLOCK) - 1];
}

// ---------- The plan ----------
const PLAN = generatePlan();

// ---------- Build a workout for one day ----------
function workoutForDay(p, day, label) {
  const isRest = label && /rest|deload/i.test(label);
  const [key, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === day);
  const [sets, reps] = p[key];
  return {
    tag: isRest ? "deload" : "strength-a",
    title: ex.dayName + " day" + (label ? " — " + label : ""),
    summary: ex.name + " · Crunches",
    details: [
      ["Warm-up", "5 minutes light movement — arm swings, leg swings, easy push-ups"],
      [ex.name, sets + " sets of " + reps + " reps · rest " + ex.restPeriod],
      ["Crunches", p.cr[0] + " sets of " + p.cr[1] + " reps · rest " + EXERCISES.cr.restPeriod],
      ["Cool-down", "5 minutes stretching"],
    ],
    note: isRest
      ? "Easy week. Recovery."
      : "Stop each set when form gets ugly. Don't grind ugly reps."
  };
}

function jumpRopeDay() {
  return { tag: "car", title: "Jump rope OR walk",
    summary: "15 min jump rope · or 30–40 min brisk walk",
    details: [
      ["Jump rope", "15 minutes — alternate two-foot bounce and alternating-foot stride. Light feet, knees soft."],
      ["Or — Walk", "30–40 minutes brisk pace"],
    ],
    note: "Pick whichever you feel like." };
}
function walkDay() {
  return { tag: "mob", title: "Walk OR rest",
    summary: "20–30 min easy walk · or full rest",
    details: [
      ["Easy walk", "20–30 minutes, normal pace, anywhere outside"],
    ],
    note: "If you're tired, rest. If you feel fine, walk." };
}
function restDay() {
  return { tag: "rest", title: "Rest",
    summary: "Sleep well. Eat well. Recover.",
    details: [], note: "" };
}

// ---------- Week builders ----------
const WEEKS = {};
for (const p of PLAN) {
  if (p.test) {
    WEEKS[p.wk] = {
      mon_override: { tag: "test", title: "TEST — Push-ups",
        summary: "Max push-ups in one set.",
        details: [
          ["Warm-up", "10 minutes light movement"],
          ["Push-up max", "One unbroken set. Go until you can't do another. Write down the number."],
          ["Cool-down", "5 minutes"],
        ] },
      tue_override: restDay(),
      wed_override: { tag: "test", title: "TEST — Pull-ups",
        summary: "Max pull-ups in one set.",
        details: [
          ["Warm-up", "10 minutes light movement"],
          ["Pull-up max", "Hang from bar, pull until chin is over the bar. Max reps. Write down the number."],
          ["Cool-down", "5 minutes"],
        ] },
      thu_override: restDay(),
      fri_override: { tag: "test", title: "TEST — Squats",
        summary: "Max squats in 2 minutes.",
        details: [
          ["Warm-up", "10 minutes light movement"],
          ["Squat test", "Do as many squats as you can in 2 minutes. Full depth. Write down the number."],
          ["Cool-down", "5 minutes"],
        ] },
      sat_override: { tag: "test", title: "TEST — Crunches",
        summary: "Max crunches in 2 minutes.",
        details: [
          ["Warm-up", "5 minutes light movement"],
          ["Crunch test", "Do as many crunches as you can in 2 minutes. Write down the number."],
        ] },
      sun_override: restDay(),
    };
  } else {
    WEEKS[p.wk] = {
      mon: workoutForDay(p, "mon", p.label),
      tue_override: walkDay(),
      wed: workoutForDay(p, "wed", p.label),
      thu_override: jumpRopeDay(),
      fri: workoutForDay(p, "fri", p.label),
      sat_override: restDay(),
      sun_override: restDay(),
    };
  }
}

// ---------- Date helpers ----------
function toISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function fromISO(s) {
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeekMonday(d) {
  const r = new Date(d); r.setHours(0,0,0,0);
  const dow = r.getDay();
  const diff = (dow === 0 ? -6 : 1 - dow);
  return addDays(r, diff);
}
function sameYMD(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function fmtDayDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtRange(a, b) {
  const sameMonth = a.getMonth() === b.getMonth();
  if (sameMonth) {
    return a.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + "–" + b.getDate();
  }
  return a.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " – " + b.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---------- Render ----------
const DAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function buildWeekSessions(weekN) {
  const w = WEEKS[weekN];
  return {
    mon: w.mon_override || w.mon,
    tue: w.tue_override || walkDay(),
    wed: w.wed_override || w.wed,
    thu: w.thu_override || jumpRopeDay(),
    fri: w.fri_override || w.fri,
    sat: w.sat_override || restDay(),
    sun: w.sun_override || restDay(),
  };
}

function render(startMonday) {
  const cal = document.getElementById("cal");
  cal.innerHTML = "";
  const today = new Date(); today.setHours(0,0,0,0);
  let currentPhase = 0;
  for (let wn = 1; wn <= PLAN.length; wn++) {
    const phase = phaseOf(wn);
    if (phase.n !== currentPhase) {
      currentPhase = phase.n;
      const banner = document.createElement("div");
      banner.className = "phase-banner";
      banner.style.setProperty("--phase-c", phase.color);
      banner.innerHTML = '<span class="num">Block ' + phase.n + '</span><h2>' + phase.name + '</h2><span class="note">' + phase.note + '</span>';
      cal.appendChild(banner);
    }
    const weekStart = addDays(startMonday, (wn - 1) * 7);
    const weekEnd = addDays(weekStart, 6);

    const row = document.createElement("div");
    row.className = "week";
    row.style.setProperty("--phase-c", phase.color);

    const lbl = document.createElement("div");
    lbl.className = "week-label";
    lbl.innerHTML = '<span class="wk">Week</span><span class="wn">' + wn + '</span><span class="wd">' + fmtRange(weekStart, weekEnd) + '</span>';
    row.appendChild(lbl);

    const sessions = buildWeekSessions(wn);
    for (let i = 0; i < 7; i++) {
      const dKey = DAY_KEYS[i];
      const dDate = addDays(weekStart, i);
      const s = sessions[dKey];
      const dEl = document.createElement("div");
      dEl.className = "day";
      if (sameYMD(dDate, today)) dEl.classList.add("today");
      else if (dDate < today) dEl.classList.add("past");
      const tagClass = (s.tag || "").startsWith("strength") ? "" : s.tag;
      dEl.innerHTML =
        '<div class="head"><span class="dn">' + DAY_NAMES[i] + '</span><span class="dd">' + fmtDayDate(dDate) + '</span></div>' +
        '<span class="tag ' + tagClass + '">' + tagLabel(s.tag) + '</span>' +
        '<div class="ttl">' + escapeHtml(s.title) + '</div>' +
        (s.summary ? '<div class="sum">' + escapeHtml(s.summary) + '</div>' : '');
      dEl.addEventListener("click", () => openModal(wn, dKey, dDate, s, phase));
      row.appendChild(dEl);
    }
    cal.appendChild(row);
  }
}

function tagLabel(t) {
  if (!t) return "";
  if (t.startsWith("strength")) return "Workout";
  if (t === "mob")    return "Walk";
  if (t === "car")    return "Jump rope";
  if (t === "play")   return "Play";
  if (t === "rest")   return "Rest";
  if (t === "test")   return "Test";
  if (t === "deload") return "Easy week";
  return t;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}

function openModal(weekN, dKey, dDate, s, phase) {
  const m = document.getElementById("modal");
  const scrim = document.getElementById("scrim");
  const fullDay = dDate.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  let html = '<button class="x" aria-label="Close">×</button>';
  html += '<div class="meta"><span class="pill" style="background:' + phase.color + '">Block ' + phase.n + ' · Week ' + weekN + '</span>' + escapeHtml(fullDay) + '</div>';
  html += '<h2>' + escapeHtml(s.title) + '</h2>';
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
  m.innerHTML = html;
  m.style.setProperty("--phase-c", phase.color);
  scrim.classList.add("open");
  m.querySelector(".x").addEventListener("click", closeModal);
}
function closeModal() { document.getElementById("scrim").classList.remove("open"); }
document.getElementById("scrim").addEventListener("click", e => { if (e.target.id === "scrim") closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// ---------- Legend ----------
function renderLegend() {
  const el = document.getElementById("legend");
  el.innerHTML = PHASES.map(p =>
    '<span><span class="swatch" style="background:' + p.color + '"></span>B' + p.n + '</span>'
  ).join("");
}

// ---------- Boot ----------
function defaultStart() {
  const saved = localStorage.getItem("fitness.startDate");
  if (saved) return fromISO(saved);
  const today = new Date(); today.setHours(0,0,0,0);
  const dow = today.getDay();
  if (dow === 1) return today;
  const daysToMon = (8 - dow) % 7;
  return addDays(today, daysToMon === 0 ? 7 : daysToMon);
}
function setStart(d) {
  localStorage.setItem("fitness.startDate", toISO(d));
  document.getElementById("startDate").value = toISO(d);
  render(d);
  scrollToToday();
}
function scrollToToday() {
  setTimeout(() => {
    const el = document.querySelector(".day.today") || document.querySelector(".phase-banner");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
}

renderLegend();
const start = defaultStart();
document.getElementById("startDate").value = toISO(start);
render(start);
scrollToToday();

document.getElementById("startDate").addEventListener("change", e => {
  const d = fromISO(e.target.value);
  setStart(startOfWeekMonday(d));
});
document.getElementById("todayBtn").addEventListener("click", scrollToToday);
