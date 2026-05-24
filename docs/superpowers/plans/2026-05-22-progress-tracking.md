# Progress Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Note:** Do not run `git commit` or `git push` — commits are managed manually by the repository owner.

**Goal:** Add Google Sign-In via Firebase and per-workout logging (done/skipped + actual reps for strength days; done/skipped for jump-rope days) with auto-skip for past unlogged days on sign-in.

**Architecture:** `firebase.js` owns all Firebase interactions plus two pure date-helper functions (`workoutDate`, `autoSkipPast`). `app.js` calls into it for auth state and storage; it has no knowledge of Firebase internals. Progress is one Firestore document per user. `firebase.test.js` tests the pure helpers with plain `node`.

**Tech Stack:** Firebase 10.12.2 compat CDN (no bundler needed), Firestore, Google Auth, Node.js `assert` for tests.

---

## File Structure

```
firebase-config.js   — new: FIREBASE_CONFIG constant (project credentials)
firebase.js          — new: LOGGABLE_DAYS_OFFSET, workoutDate(), autoSkipPast(),
                             Firebase init, signIn(), signOut(), onAuthChange(),
                             loadProgress(), saveStartDate(), saveWorkout(), saveAutoSkips()
firebase.test.js     — new: Node.js tests for workoutDate and autoSkipPast
index.html           — modify: Firebase CDN scripts, firebase-config.js script,
                                firebase.js script, auth-control div in header
app.js               — modify: currentStart var, progress state + getWorkout(),
                                updateAuthUI(), setStart() Firestore sync,
                                onAuthChange boot wiring, cell indicators, modal logging
styles.css           — modify: auth UI, cell indicators, modal log section
```

---

### Task 1: firebase-config.js + firebase.js stubs

**Files:**
- Create: `firebase-config.js`
- Create: `firebase.js`

- [ ] **Step 1: Create firebase-config.js**

```js
// firebase-config.js
// Replace these values with your Firebase project config from the Firebase console.
// These keys are safe to commit — security is enforced by Firestore rules, not secrecy.
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
```

- [ ] **Step 2: Create firebase.js with all stubs**

```js
// firebase.js

// Days that can be logged, mapped to their offset in days from the week's Monday.
const LOGGABLE_DAYS_OFFSET = { mon: 0, wed: 2, thu: 3, fri: 4 };

// Returns the calendar Date for a given program week and day.
// startDateISO: ISO string "YYYY-MM-DD" for the Monday of program week 1.
function workoutDate(startDateISO, weekN, dayKey) {
  throw new Error("not implemented");
}

// Returns array of { weekN, dayKey } for loggable days that are strictly before
// `today` (a Date with hours set to 0) and have no entry in `workouts`.
function autoSkipPast(startDateISO, workouts, today) {
  throw new Error("not implemented");
}

// Initialize Firebase — guarded because `firebase` global is absent in Node.js tests.
if (typeof firebase !== "undefined") {
  firebase.initializeApp(FIREBASE_CONFIG);
}

function signIn() {
  throw new Error("not implemented");
}
function signOut() {
  throw new Error("not implemented");
}
function onAuthChange(cb) {
  throw new Error("not implemented");
}
async function loadProgress() {
  throw new Error("not implemented");
}
async function saveStartDate(iso) {
  throw new Error("not implemented");
}
async function saveWorkout(weekN, dayKey, status, actual) {
  throw new Error("not implemented");
}
async function saveAutoSkips(toSkip) {
  throw new Error("not implemented");
}

// Export pure helpers for Node.js testing (Firebase functions not exported —
// they reference the firebase global which doesn't exist in Node).
if (typeof module !== "undefined") {
  module.exports = { workoutDate, autoSkipPast, LOGGABLE_DAYS_OFFSET };
}
```

---

### Task 2: Write failing tests for workoutDate and autoSkipPast

**Files:**
- Create: `firebase.test.js`

- [ ] **Step 1: Create firebase.test.js**

```js
// firebase.test.js — run with: node firebase.test.js
const assert = require("assert");
const { workoutDate, autoSkipPast } = require("./firebase.js");

// ---- workoutDate ----
// Start: Monday 2026-01-05
// Week 1 offsets: mon=0→Jan5, wed=2→Jan7, thu=3→Jan8, fri=4→Jan9
// Week 2: mon=7→Jan12, fri=11→Jan16
// Week 3: fri=18→Jan23

assert.deepStrictEqual(workoutDate("2026-01-05", 1, "mon"), new Date(2026, 0, 5),  "w1 mon");
assert.deepStrictEqual(workoutDate("2026-01-05", 1, "wed"), new Date(2026, 0, 7),  "w1 wed");
assert.deepStrictEqual(workoutDate("2026-01-05", 1, "thu"), new Date(2026, 0, 8),  "w1 thu");
assert.deepStrictEqual(workoutDate("2026-01-05", 1, "fri"), new Date(2026, 0, 9),  "w1 fri");
assert.deepStrictEqual(workoutDate("2026-01-05", 2, "mon"), new Date(2026, 0, 12), "w2 mon");
assert.deepStrictEqual(workoutDate("2026-01-05", 2, "fri"), new Date(2026, 0, 16), "w2 fri");
assert.deepStrictEqual(workoutDate("2026-01-05", 3, "fri"), new Date(2026, 0, 23), "w3 fri");

console.log("workoutDate: all tests passed");

// ---- autoSkipPast ----
// today = Jan 8 (Thursday, hours=0). Start = Jan 5 (Monday).
// Past loggable days (strictly before Jan 8): w1-mon (Jan5), w1-wed (Jan7).
// w1-thu = Jan8 = today → NOT strictly before → not skipped.
// w1-fri (Jan9) is future → not skipped.

const today1 = new Date(2026, 0, 8);

const r1 = autoSkipPast("2026-01-05", {}, today1).map(e => e.weekN + "-" + e.dayKey);
assert.deepStrictEqual(r1, ["1-mon", "1-wed"], "two past days skipped");

// An existing entry (any status) must not appear in the result
const r2 = autoSkipPast("2026-01-05", { "1-mon": { status: "done" } }, today1)
  .map(e => e.weekN + "-" + e.dayKey);
assert.deepStrictEqual(r2, ["1-wed"], "existing entry not re-skipped");

// When start is today there are no past days
const r3 = autoSkipPast("2026-01-08", {}, new Date(2026, 0, 8));
assert.strictEqual(r3.length, 0, "no skips when start is today");

// today = Jan 14 (Wed). Past: w1-mon(5), w1-wed(7), w1-thu(8), w1-fri(9), w2-mon(12).
// w2-wed(14) = today → not past.
const r4 = autoSkipPast("2026-01-05", {}, new Date(2026, 0, 14))
  .map(e => e.weekN + "-" + e.dayKey);
assert.deepStrictEqual(r4, ["1-mon","1-wed","1-thu","1-fri","2-mon"], "multi-week skip");

console.log("autoSkipPast: all tests passed");
```

- [ ] **Step 2: Run tests — expect failure**

```
node firebase.test.js
```

Expected output: `Error: not implemented`

---

### Task 3: Implement workoutDate and autoSkipPast

**Files:**
- Modify: `firebase.js`

- [ ] **Step 1: Replace the workoutDate stub**

```js
function workoutDate(startDateISO, weekN, dayKey) {
  const [y, m, d] = startDateISO.split("-").map(Number);
  const result = new Date(y, m - 1, d);
  result.setDate(result.getDate() + (weekN - 1) * 7 + LOGGABLE_DAYS_OFFSET[dayKey]);
  return result;
}
```

- [ ] **Step 2: Replace the autoSkipPast stub**

```js
function autoSkipPast(startDateISO, workouts, today) {
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
```

- [ ] **Step 3: Run tests — expect all pass**

```
node firebase.test.js
```

Expected output:
```
workoutDate: all tests passed
autoSkipPast: all tests passed
```

Also run the progression tests to confirm nothing regressed:

```
node progression.test.js
```

Expected output: all three sections passed.

---

### Task 4: index.html — Firebase CDN + auth-control div

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add Firebase CDN scripts, firebase-config.js, and firebase.js**

Find these lines near the bottom of `index.html`:

```html
<script src="icons.js"></script>
<script src="progression.js"></script>
<script src="app.js"></script>
```

Replace with:

```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script src="firebase-config.js"></script>
<script src="icons.js"></script>
<script src="progression.js"></script>
<script src="firebase.js"></script>
<script src="app.js"></script>
```

- [ ] **Step 2: Add auth-control div inside the header controls**

Find:

```html
    <button id="todayBtn">Today</button>
  </div>
```

Replace with:

```html
    <button id="todayBtn">Today</button>
    <div id="auth-control"></div>
  </div>
```

---

### Task 5: firebase.js — auth functions

**Files:**
- Modify: `firebase.js`

- [ ] **Step 1: Replace the signIn, signOut, onAuthChange stubs**

```js
function signIn() {
  return firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
}
function signOut() {
  return firebase.auth().signOut();
}
function onAuthChange(cb) {
  firebase.auth().onAuthStateChanged(cb);
}
```

---

### Task 6: firebase.js — storage functions

**Files:**
- Modify: `firebase.js`

- [ ] **Step 1: Replace the four storage stubs**

```js
function _userDoc() {
  return firebase.firestore()
    .collection("users")
    .doc(firebase.auth().currentUser.uid);
}

async function loadProgress() {
  const doc = await _userDoc().get();
  if (!doc.exists) {
    // First sign-in: create the document so update() calls never fail.
    await _userDoc().set({ workouts: {} });
    return { startDate: null, workouts: {} };
  }
  const data = doc.data();
  return { startDate: data.startDate || null, workouts: data.workouts || {} };
}

async function saveStartDate(iso) {
  await _userDoc().update({ startDate: iso });
}

async function saveWorkout(weekN, dayKey, status, actual) {
  const entry = { status };
  if (actual) entry.actual = actual;
  // Dot-notation key updates only that entry without touching other workouts.
  await _userDoc().update({ [`workouts.${weekN}-${dayKey}`]: entry });
}

async function saveAutoSkips(toSkip) {
  if (!toSkip.length) return;
  const batch = firebase.firestore().batch();
  const ref = _userDoc();
  for (const { weekN, dayKey } of toSkip) {
    batch.update(ref, { [`workouts.${weekN}-${dayKey}`]: { status: "skipped" } });
  }
  await batch.commit();
}
```

---

### Task 7: app.js + styles.css — state, auth wiring, start date sync

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Add auth + progress state after `const PLAN = generatePlan();`**

```js
// ---------- Auth + progress state ----------
let currentUser = null;
let progress = { workouts: {} };
function getWorkout(weekN, dayKey) {
  return progress.workouts[weekN + "-" + dayKey] || null;
}
```

- [ ] **Step 2: Change `const start` to `let currentStart` in the boot section**

Find (near the bottom of app.js):

```js
const start = defaultStart();
document.getElementById("startDate").value = toISO(start);
render(start);
scrollToToday();
```

Replace with:

```js
let currentStart = defaultStart();
document.getElementById("startDate").value = toISO(currentStart);
render(currentStart);
scrollToToday();
```

- [ ] **Step 3: Update setStart to track currentStart and sync to Firestore**

Find:

```js
function setStart(d) {
  localStorage.setItem("fitness.startDate", toISO(d));
  document.getElementById("startDate").value = toISO(d);
  render(d);
  scrollToToday();
}
```

Replace with:

```js
function setStart(d) {
  currentStart = d;
  localStorage.setItem("fitness.startDate", toISO(d));
  document.getElementById("startDate").value = toISO(d);
  if (currentUser) saveStartDate(toISO(d));
  render(d);
  scrollToToday();
}
```

- [ ] **Step 4: Add updateAuthUI — add after the scrollToToday function**

```js
function updateAuthUI(user) {
  const el = document.getElementById("auth-control");
  if (user) {
    el.innerHTML =
      '<div class="auth-user">' +
      (user.photoURL ? '<img src="' + escapeHtml(user.photoURL) + '" alt="">' : '') +
      '<span>' + escapeHtml(user.displayName || user.email || "") + '</span>' +
      '<button id="signOutBtn">Sign out</button>' +
      '</div>';
    document.getElementById("signOutBtn").addEventListener("click", signOut);
  } else {
    el.innerHTML = '<button id="signInBtn">Sign in with Google</button>';
    document.getElementById("signInBtn").addEventListener("click", signIn);
  }
}
```

- [ ] **Step 5: Wire onAuthChange in the boot section — add after the `startDate` change listener**

```js
onAuthChange(async (user) => {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    progress = await loadProgress();
    if (progress.startDate) {
      // Cloud start date takes precedence — keeps multiple devices in sync.
      currentStart = fromISO(progress.startDate);
      localStorage.setItem("fitness.startDate", progress.startDate);
      document.getElementById("startDate").value = progress.startDate;
    } else {
      // First sign-in: persist the local start date to Firestore.
      await saveStartDate(toISO(currentStart));
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const toSkip = autoSkipPast(toISO(currentStart), progress.workouts, today);
    if (toSkip.length) {
      await saveAutoSkips(toSkip);
      for (const { weekN, dayKey } of toSkip) {
        progress.workouts[weekN + "-" + dayKey] = { status: "skipped" };
      }
    }
    render(currentStart);
    scrollToToday();
  } else {
    progress = { workouts: {} };
    render(currentStart);
  }
});
```

- [ ] **Step 6: Add auth UI styles — append to styles.css**

```css
/* Auth control */
.auth-user {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; color: var(--text-muted);
}
.auth-user img { width: 22px; height: 22px; border-radius: 50%; }
```

---

### Task 8: app.js + styles.css — calendar cell progress indicators

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Mark logged days in the render function**

In `render`, find:

```js
      const dEl = document.createElement("div");
      dEl.className = "day";
      if (sameYMD(dDate, today)) dEl.classList.add("today");
      else if (dDate < today) dEl.classList.add("past");
      const tagClass = (s.tag || "").startsWith("strength") ? "" : s.tag;
```

Replace with:

```js
      const dEl = document.createElement("div");
      dEl.className = "day";
      if (sameYMD(dDate, today)) dEl.classList.add("today");
      else if (dDate < today) dEl.classList.add("past");
      const logged = getWorkout(wn, dKey);
      if (logged) dEl.classList.add("logged-" + logged.status);
      const tagClass = (s.tag || "").startsWith("strength") ? "" : s.tag;
```

- [ ] **Step 2: Add indicator styles — append to styles.css**

```css
/* Calendar cell progress indicators */
.day.logged-done::after {
  content: "✓";
  position: absolute; top: 6px; right: 8px;
  color: #4ade80; font-size: 12px; font-weight: 700;
  pointer-events: none;
}
.day.logged-skipped::after {
  content: "–";
  position: absolute; top: 6px; right: 8px;
  color: var(--text-dim); font-size: 12px;
  pointer-events: none;
}
```

---

### Task 9: app.js + styles.css — strength day modal logging

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Add buildStrengthFormHTML — add before the openModal function**

```js
function buildStrengthFormHTML(exKey, ex, primary, cr) {
  return '<div class="log-section">' +
    '<div class="log-label">Log this workout</div>' +
    '<div class="log-inputs">' +
    '<label>' + escapeHtml(ex.name) + ': ' +
    '<input class="log-sets" type="number" value="' + primary[0] + '" min="1"> sets × ' +
    '<input class="log-reps" type="number" value="' + primary[1] + '" min="1"> reps</label>' +
    '<label>Crunches: ' +
    '<input class="log-cr-sets" type="number" value="' + cr[0] + '" min="1"> sets × ' +
    '<input class="log-cr-reps" type="number" value="' + cr[1] + '" min="1"> reps</label>' +
    '</div>' +
    '<div class="log-actions">' +
    '<button class="log-save">Save as Done</button> <button class="log-skip">Skip</button>' +
    '</div></div>';
}
```

- [ ] **Step 2: Add attachStrengthLogHandlers — add after buildStrengthFormHTML**

```js
function attachStrengthLogHandlers(weekN, dKey, planWeek) {
  const m = document.getElementById("modal");
  const wrapper = m.querySelector("#log-wrapper");
  const [exKey, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === dKey);

  // Single delegated listener handles save, skip, and edit via button class checks.
  wrapper.addEventListener("click", async (e) => {
    if (e.target.classList.contains("log-save")) {
      const actual = {
        [exKey]: [
          parseInt(wrapper.querySelector(".log-sets").value),
          parseInt(wrapper.querySelector(".log-reps").value),
        ],
        cr: [
          parseInt(wrapper.querySelector(".log-cr-sets").value),
          parseInt(wrapper.querySelector(".log-cr-reps").value),
        ],
      };
      await saveWorkout(weekN, dKey, "done", actual);
      progress.workouts[weekN + "-" + dKey] = { status: "done", actual };
      closeModal();
      render(currentStart);
    }
    if (e.target.classList.contains("log-skip")) {
      await saveWorkout(weekN, dKey, "skipped", null);
      progress.workouts[weekN + "-" + dKey] = { status: "skipped" };
      closeModal();
      render(currentStart);
    }
    if (e.target.classList.contains("log-edit")) {
      const prev = progress.workouts[weekN + "-" + dKey];
      const fillPrimary = (prev && prev.actual) ? prev.actual[exKey] : planWeek[exKey];
      const fillCr      = (prev && prev.actual) ? prev.actual.cr     : planWeek.cr;
      // Replace inner HTML — the listener on wrapper still fires for the new buttons.
      wrapper.innerHTML = buildStrengthFormHTML(exKey, ex, fillPrimary, fillCr);
    }
  });
}
```

- [ ] **Step 3: Modify openModal to add strength log section and wire handlers**

At the very start of `openModal`, add a PLAN lookup after the existing variable declarations:

```js
  const planWeek = PLAN.find(p => p.wk === weekN);
```

Then find:

```js
  if (s.note) html += '<div class="note">' + escapeHtml(s.note) + '</div>';
  m.innerHTML = html;
```

Replace with:

```js
  if (s.note) html += '<div class="note">' + escapeHtml(s.note) + '</div>';

  const isStrength = s.tag.startsWith("strength") || s.tag === "deload";
  if (currentUser && isStrength && planWeek && !planWeek.test) {
    const logged = getWorkout(weekN, dKey);
    const [exKey, ex] = Object.entries(EXERCISES).find(([, e]) => e.day === dKey);
    let logInner;
    if (logged && logged.status === "skipped") {
      logInner = '<div class="log-section"><span class="log-status">Logged: Skipped</span>' +
        ' <button class="log-edit">Edit</button></div>';
    } else if (logged && logged.status === "done") {
      const a = logged.actual;
      logInner = '<div class="log-section"><span class="log-status">Logged: ' +
        escapeHtml(ex.name) + ' ' + a[exKey][0] + '×' + a[exKey][1] +
        ' · Crunches ' + a.cr[0] + '×' + a.cr[1] +
        '</span> <button class="log-edit">Edit</button></div>';
    } else {
      logInner = buildStrengthFormHTML(exKey, ex, planWeek[exKey], planWeek.cr);
    }
    html += '<div id="log-wrapper">' + logInner + '</div>';
  }

  m.innerHTML = html;
```

Then find:

```js
  m.querySelector(".x").addEventListener("click", closeModal);
```

After it, add:

```js
  if (currentUser && isStrength && planWeek && !planWeek.test) {
    attachStrengthLogHandlers(weekN, dKey, planWeek);
  }
```

- [ ] **Step 4: Add log section styles — append to styles.css**

```css
/* Modal log section */
.log-section {
  margin-top: 16px; padding-top: 14px;
  border-top: 1px solid var(--border);
}
.log-label {
  font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-muted);
  margin-bottom: 10px;
}
.log-inputs {
  display: flex; flex-direction: column; gap: 8px;
  margin-bottom: 12px; font-size: 13px; color: var(--text);
}
.log-inputs input[type="number"] {
  width: 52px; padding: 4px 6px; text-align: center;
  background: var(--bg-card); color: var(--text);
  border: 1px solid var(--border); border-radius: 5px;
  font: inherit; font-size: 13px;
}
.log-inputs input[type="number"]:focus {
  outline: none; border-color: var(--accent);
}
.log-actions { display: flex; gap: 8px; }
.log-save {
  background: #4ade80 !important; color: #0b0d12 !important;
  border-color: #4ade80 !important; font-weight: 600;
}
.log-save:hover { background: #22c55e !important; border-color: #22c55e !important; }
.log-status { font-size: 13px; color: var(--text-muted); }
.log-edit {
  background: none !important; border: none !important;
  color: var(--accent) !important; font-size: 12px;
  padding: 0 0 0 8px; text-decoration: underline; cursor: pointer;
}
```

---

### Task 10: app.js — jump-rope modal logging

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add attachJumpRopeLogHandlers — add after attachStrengthLogHandlers**

```js
function attachJumpRopeLogHandlers(weekN, dKey) {
  const m = document.getElementById("modal");
  const wrapper = m.querySelector("#log-wrapper");

  wrapper.addEventListener("click", async (e) => {
    if (e.target.classList.contains("log-save")) {
      await saveWorkout(weekN, dKey, "done", null);
      progress.workouts[weekN + "-" + dKey] = { status: "done" };
      closeModal();
      render(currentStart);
    }
    if (e.target.classList.contains("log-skip")) {
      await saveWorkout(weekN, dKey, "skipped", null);
      progress.workouts[weekN + "-" + dKey] = { status: "skipped" };
      closeModal();
      render(currentStart);
    }
    if (e.target.classList.contains("log-edit")) {
      wrapper.innerHTML =
        '<div class="log-section"><div class="log-actions">' +
        '<button class="log-save">Done</button> <button class="log-skip">Skip</button>' +
        '</div></div>';
      // Delegated listener on wrapper already covers the new buttons.
    }
  });
}
```

- [ ] **Step 2: Add jump-rope log section into openModal**

In `openModal`, after the strength block (the block ending with `attachStrengthLogHandlers`), add the jump-rope block.

In the `html`-building section (before `m.innerHTML = html`), after the strength `if` block, add:

```js
  if (currentUser && s.tag === "car") {
    const logged = getWorkout(weekN, dKey);
    let logInner;
    if (logged) {
      logInner = '<div class="log-section"><span class="log-status">Logged: ' +
        (logged.status === "done" ? "Done" : "Skipped") +
        '</span> <button class="log-edit">Edit</button></div>';
    } else {
      logInner =
        '<div class="log-section"><div class="log-actions">' +
        '<button class="log-save">Done</button> <button class="log-skip">Skip</button>' +
        '</div></div>';
    }
    html += '<div id="log-wrapper">' + logInner + '</div>';
  }
```

In the handler-wiring section (after `m.innerHTML = html`), after the strength handler call, add:

```js
  if (currentUser && s.tag === "car") {
    attachJumpRopeLogHandlers(weekN, dKey);
  }
```

- [ ] **Step 3: Verify the final structure of openModal**

The complete order inside `openModal` must be:

```
1.  Build html string:
      button.x  →  meta  →  h2  →  ol  →  note
      → strength log wrapper (if applicable)
      → jump-rope log wrapper (if applicable)
2.  m.innerHTML = html
3.  m.style.setProperty("--phase-c", phase.color)
4.  scrim.classList.add("open")
5.  m.querySelector(".x").addEventListener("click", closeModal)
6.  attachStrengthLogHandlers(...)  if strength day
7.  attachJumpRopeLogHandlers(...)  if jump-rope day
```

Only one of steps 6 or 7 will execute for any given day (the tags are mutually exclusive).

---

## Firebase Project Setup (one-time manual steps — do before browser testing)

1. Go to `console.firebase.google.com` → Create project
2. **Authentication → Sign-in method** → Enable Google provider
3. **Authentication → Settings → Authorized domains** → Add your GitHub Pages domain (e.g. `username.github.io`); also add `localhost` for local testing
4. **Firestore Database** → Create database → Production mode → choose nearest region
5. **Firestore → Rules** → publish:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth.uid == uid;
       }
     }
   }
   ```
6. **Project settings → Your apps → Add web app** → Register → copy the config object into `firebase-config.js`
