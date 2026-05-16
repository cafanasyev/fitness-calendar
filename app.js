// ---------- Phase definitions ----------
const PHASES = [
  { n: 1, name: "Block 1",  color: "var(--p1)", note: "Weeks 1–4 · 6 sets per workout" },
  { n: 2, name: "Block 2",  color: "var(--p2)", note: "Weeks 5–8 · more reps per set" },
  { n: 3, name: "Block 3",  color: "var(--p3)", note: "Weeks 9–12 · 7 sets per workout + mid-test" },
  { n: 4, name: "Block 4",  color: "var(--p4)", note: "Weeks 13–16 · more reps" },
  { n: 5, name: "Block 5",  color: "var(--p5)", note: "Weeks 17–20 · peak" },
  { n: 6, name: "Block 6",  color: "var(--p6)", note: "Weeks 21–24 · test + maintain" },
];
function phaseOf(weekN) {
  if (weekN <= 4)  return PHASES[0];
  if (weekN <= 8)  return PHASES[1];
  if (weekN <= 12) return PHASES[2];
  if (weekN <= 16) return PHASES[3];
  if (weekN <= 20) return PHASES[4];
  return PHASES[5];
}

// ---------- The plan ----------
// SPLIT: Mon = Push day, Wed = Pull day, Fri = Legs day.
// Each big muscle group hit ONCE per week — full week of rest.
// Crunches added to every workout (low-stress muscle, recovers fast).
const PLAN = [
  // wk | pushUps | pullUps | squats | crunches | label
  { wk: 1,  pu: [6, 10], pl: [6, 5],  sq: [6, 15], cr: [3, 15], label: null },
  { wk: 2,  pu: [6, 11], pl: [6, 6],  sq: [6, 17], cr: [3, 17], label: null },
  { wk: 3,  pu: [6, 12], pl: [6, 7],  sq: [6, 20], cr: [3, 20], label: null },
  { wk: 4,  pu: [4, 7],  pl: [4, 3],  sq: [4, 12], cr: [2, 12], label: "Rest week" },

  { wk: 5,  pu: [6, 13], pl: [6, 7],  sq: [6, 22], cr: [3, 20], label: null },
  { wk: 6,  pu: [6, 14], pl: [6, 8],  sq: [6, 24], cr: [3, 22], label: null },
  { wk: 7,  pu: [6, 15], pl: [6, 9],  sq: [6, 26], cr: [3, 24], label: null },
  { wk: 8,  pu: [4, 8],  pl: [4, 4],  sq: [4, 14], cr: [2, 14], label: "Rest week" },

  { wk: 9,  pu: [7, 13], pl: [7, 7],  sq: [7, 22], cr: [3, 22], label: null },
  { wk: 10, pu: [7, 14], pl: [7, 8],  sq: [7, 24], cr: [3, 24], label: null },
  { wk: 11, pu: [7, 15], pl: [7, 9],  sq: [7, 26], cr: [3, 25], label: null },
  { wk: 12, pu: [4, 8],  pl: [4, 4],  sq: [4, 12], cr: [2, 12], label: "Rest + mid-test" },

  { wk: 13, pu: [7, 16], pl: [7, 9],  sq: [7, 26], cr: [3, 25], label: null },
  { wk: 14, pu: [7, 17], pl: [7, 10], sq: [7, 28], cr: [3, 27], label: null },
  { wk: 15, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: null },
  { wk: 16, pu: [4, 11], pl: [4, 6],  sq: [4, 17], cr: [2, 17], label: "Rest week" },

  { wk: 17, pu: [7, 19], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: null },
  { wk: 18, pu: [7, 20], pl: [7, 12], sq: [7, 32], cr: [3, 30], label: null },
  { wk: 19, pu: [7, 20], pl: [7, 13], sq: [7, 35], cr: [3, 30], label: null },
  { wk: 20, pu: [4, 12], pl: [4, 6],  sq: [4, 18], cr: [2, 18], label: "Rest week" },

  { wk: 21, pu: [4, 10], pl: [4, 5],  sq: [4, 15], cr: [2, 15], label: "Full deload" },
  { wk: 22, test: true,                                              label: "TEST WEEK" },
  { wk: 23, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain" },
  { wk: 24, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain" },
];

// ---------- Build a workout for one day ----------
function workoutForDay(p, day, label) {
  const isRest = label && /rest|deload/i.test(label);
  let exName, sets, reps, rest, dayName;
  if (day === "mon") {
    exName = "Push-ups";  sets = p.pu[0]; reps = p.pu[1]; rest = "90 seconds"; dayName = "Push";
  } else if (day === "wed") {
    exName = "Pull-ups";  sets = p.pl[0]; reps = p.pl[1]; rest = "2 minutes";  dayName = "Pull";
  } else {
    exName = "Squats";    sets = p.sq[0]; reps = p.sq[1]; rest = "90 seconds"; dayName = "Legs";
  }
  return {
    tag: isRest ? "deload" : "strength-a",
    title: dayName + " day" + (label ? " — " + label : ""),
    summary: exName + " · Crunches",
    details: [
      ["Warm-up", "5 minutes light movement — arm swings, leg swings, easy push-ups"],
      [exName, sets + " sets of " + reps + " reps · rest " + rest],
      ["Crunches", p.cr[0] + " sets of " + p.cr[1] + " reps · rest 60 seconds"],
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

// ---------- Off-day templates (fallbacks) ----------
function tuesday() { return walkDay(); }
function thursday() { return jumpRopeDay(); }
function saturday() { return restDay(); }
function sunday() { return restDay(); }

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
    tue: w.tue_override || tuesday(),
    wed: w.wed_override || w.wed,
    thu: w.thu_override || thursday(weekN),
    fri: w.fri_override || w.fri,
    sat: w.sat_override || saturday(),
    sun: w.sun_override || sunday(),
  };
}

function render(startMonday) {
  const cal = document.getElementById("cal");
  cal.innerHTML = "";
  const today = new Date(); today.setHours(0,0,0,0);
  let currentPhase = 0;
  for (let wn = 1; wn <= 24; wn++) {
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
  if (t === "strength-a") return "Workout";
  if (t === "strength-b") return "Workout";
  if (t === "strength-c") return "Workout";
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
