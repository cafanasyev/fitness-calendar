<script>
  import { PROGRAM, EXERCISES, generatePlan } from './lib/progression.js';
  import { addDays, toISO, fromISO, startOfWeekMonday } from './lib/dates.js';
  import { autoSkipPast } from './lib/schedule.js';
  let fb = $state(null);
  import { computeEffectivePlan } from './lib/plan-adjustment.js';
  import Header from './components/Header.svelte';
  import Calendar from './components/Calendar.svelte';
  import Modal from './components/Modal.svelte';

  // ---------- Static data ----------
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
  const PLAN = generatePlan();

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
        [ex.name, sets + " sets of " + reps + " reps · rest " + ex.restSeconds + "s"],
        ["Crunches", p.cr[0] + " sets of " + p.cr[1] + " reps · rest " + EXERCISES.cr.restSeconds + "s"],
        ["Cool-down", "5 minutes stretching"],
      ],
      note: isRest ? "Easy week. Recovery." : "Stop each set when form gets ugly. Don't grind ugly reps."
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
      details: [["Easy walk", "20–30 minutes, normal pace, anywhere outside"]],
      note: "If you're tired, rest. If you feel fine, walk." };
  }
  function restDay() {
    return { tag: "rest", title: "Rest", summary: "Sleep well. Eat well. Recover.", details: [], note: "" };
  }

  const WEEKS = {};
  for (const p of PLAN) {
    if (p.test) {
      WEEKS[p.wk] = {
        mon_override: { tag: "test", title: "TEST — Push-ups", summary: "Max push-ups in one set.",
          details: [
            ["Warm-up", "10 minutes light movement"],
            ["Push-up max", "One unbroken set. Go until you can't do another. Write down the number."],
            ["Cool-down", "5 minutes"],
          ] },
        tue_override: restDay(),
        wed_override: { tag: "test", title: "TEST — Pull-ups", summary: "Max pull-ups in one set.",
          details: [
            ["Warm-up", "10 minutes light movement"],
            ["Pull-up max", "Hang from bar, pull until chin is over the bar. Max reps. Write down the number."],
            ["Cool-down", "5 minutes"],
          ] },
        thu_override: restDay(),
        fri_override: { tag: "test", title: "TEST — Squats", summary: "Max squats in 2 minutes.",
          details: [
            ["Warm-up", "10 minutes light movement"],
            ["Squat test", "Do as many squats as you can in 2 minutes. Full depth. Write down the number."],
            ["Cool-down", "5 minutes"],
          ] },
        sat_override: { tag: "test", title: "TEST — Crunches", summary: "Max crunches in 2 minutes.",
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

  // ---------- Reactive state ----------
  let currentUser  = $state(null);
  let progress     = $state({ workouts: {} });
  let devToday     = $state(localStorage.getItem('fitness.devToday') || '');
  let modal        = $state(null); // { weekN, dKey, dDate, session, phase, planWeek, effectivePlanWeek, exEntry }

  let today = $derived.by(() => {
    if (location.hostname === 'localhost' && devToday) {
      const d = new Date(devToday);
      if (!isNaN(d)) { d.setHours(0, 0, 0, 0); return d; }
    }
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });

  function defaultStart() {
    const saved = localStorage.getItem('fitness.startDate');
    if (saved) return fromISO(saved);
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    if (dow === 1) return d;
    const daysToMon = (8 - dow) % 7;
    return addDays(d, daysToMon);
  }

  let currentStart = $state(defaultStart());

  function setStart(d) {
    currentStart = d;
    localStorage.setItem('fitness.startDate', toISO(d));
    if (currentUser) fb?.saveStartDate(toISO(d)).catch(() => {});
    scrollToToday();
  }

  function scrollToToday() {
    setTimeout(() => {
      const el = document.querySelector('.day.today') || document.querySelector('.phase-banner');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  function handleDayClick(weekN, dKey, dDate, session, phase) {
    const planWeek = PLAN.find(p => p.wk === weekN);
    const isStrength = (session.tag || '').startsWith('strength') || session.tag === 'deload';
    let exEntry = null;
    let effectivePlanWeek = null;
    if (currentUser && isStrength && planWeek && !planWeek.test) {
      exEntry = Object.entries(EXERCISES).find(([, e]) => e.day === dKey) || null;
      if (exEntry) {
        const exKey = exEntry[0];
        effectivePlanWeek = {
          ...planWeek,
          [exKey]: computeEffectivePlan(exKey, weekN, progress.workouts, PLAN, EXERCISES),
          cr:      computeEffectivePlan('cr',  weekN, progress.workouts, PLAN, EXERCISES),
        };
      }
    }
    modal = { weekN, dKey, dDate, session, phase, planWeek, effectivePlanWeek, exEntry, crEx: EXERCISES.cr, isFuture: dDate > today };
  }

  function handleModalClose() {
    modal = null;
  }

  async function handleWorkoutSaved(weekN, dKey, status, actual) {
    await fb.saveWorkout(weekN, dKey, status, actual);
    const entry = { status };
    if (actual) entry.actual = actual;
    progress.workouts[weekN + '-' + dKey] = entry;
    modal = null;
  }

  // ---------- Boot ----------
  $effect(() => {
    import('./lib/firebase.js').then(m => {
      fb = m;
      m.onAuthChange(async (user) => {
        currentUser = user;
        if (user) {
          progress = await m.loadProgress();
          if (progress.startDate) {
            currentStart = fromISO(progress.startDate);
            localStorage.setItem('fitness.startDate', progress.startDate);
          } else {
            await m.saveStartDate(toISO(currentStart));
          }
          const startISO = progress.startDate || toISO(currentStart);
          const toSkip = autoSkipPast(startISO, progress.workouts, today);
          if (toSkip.length) {
            await m.saveAutoSkips(toSkip);
            for (const { weekN, dayKey } of toSkip) {
              progress.workouts[weekN + '-' + dayKey] = { status: 'skipped' };
            }
          }
          scrollToToday();
        } else {
          progress = { workouts: {} };
        }
      });
    });
  });
</script>

<Header
  {currentUser}
  {currentStart}
  phases={PHASES}
  {devToday}
  onStartChange={d => setStart(startOfWeekMonday(fromISO(d)))}
  signIn={() => fb?.signIn()}
  signOut={() => fb?.signOut()}
  onTodayClick={scrollToToday}
  onDevTodayChange={v => {
    devToday = v;
    if (v) localStorage.setItem('fitness.devToday', v);
    else localStorage.removeItem('fitness.devToday');
  }}
/>
<main id="cal">
  <Calendar
    plan={PLAN}
    {buildWeekSessions}
    {progress}
    {currentStart}
    {today}
    {phaseOf}
    onDayClick={handleDayClick}
  />
</main>
{#if modal}
  <Modal
    data={modal}
    {progress}
    {currentUser}
    onClose={handleModalClose}
    onSaved={handleWorkoutSaved}
  />
{/if}
<footer>Click any day to see the full prescription. The schedule auto-shifts based on your Week 1 Monday.</footer>
