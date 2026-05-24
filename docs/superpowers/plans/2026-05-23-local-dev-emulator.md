# Local Dev Emulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the app to the Firebase Emulator Suite on localhost so local development uses local Auth + Firestore with no GCP calls, with data persisting between emulator restarts.

**Architecture:** `firebase.js` detects `location.hostname === "localhost"` at load time and calls `useEmulator()` on Auth and Firestore before any SDK calls happen. `firebase.json` declares emulator ports. A Makefile provides shortcut commands for all common project operations.

**Tech Stack:** Firebase Emulator Suite (firebase-tools CLI), GNU Make.

**Constraints:**
- Do NOT run `git commit` or `git push` — the user manages version control manually.
- No new dependencies. No new JS files.

---

### Task 1: Add emulator connection to `firebase.js`

**Files:**
- Modify: `firebase.js` (insert before line 80 — the `module.exports` block)

- [ ] **Step 1: Verify the current test suite passes before touching anything**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && node firebase.test.js
```

Expected:
```
workoutDate: all tests passed
autoSkipPast: all tests passed
```

- [ ] **Step 2: Add the emulator connection block to `firebase.js`**

Insert these 4 lines immediately before the `if (typeof module !== "undefined")` block at the bottom of the file (currently line 80). The final lines of the file should look like this:

```js
  await batch.commit();
}

if (typeof location !== "undefined" && location.hostname === "localhost") {
  firebase.auth().useEmulator("http://localhost:9099");
  firebase.firestore().useEmulator("localhost", 8080);
}

// Export pure helpers for Node.js testing (Firebase functions not exported —
// they reference the firebase global which doesn't exist in Node).
if (typeof module !== "undefined") {
  module.exports = { workoutDate, autoSkipPast, LOGGABLE_DAYS_OFFSET };
}
```

Why this placement: the emulator connection must run before any `firebase.auth()` or `firebase.firestore()` calls in application code. Placing it at module load time (not inside a function) guarantees it runs immediately when `firebase.js` is parsed by the browser, after `/__/firebase/init.js` has already called `initializeApp`.

Why the `typeof location` guard: in Node.js (where tests run), `location` is not defined. This guard silently skips the block so tests continue to work with zero changes.

- [ ] **Step 3: Verify the test suite still passes after the change**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && node firebase.test.js
```

Expected (identical to Step 1):
```
workoutDate: all tests passed
autoSkipPast: all tests passed
```

If tests fail, the emulator block is interfering with Node.js — re-check the `typeof location !== "undefined"` guard is present and correct.

---

### Task 2: Add emulators config to `firebase.json`

**Files:**
- Modify: `firebase.json`

- [ ] **Step 1: Add the `"emulators"` section to `firebase.json`**

The current `firebase.json` has two top-level keys: `"hosting"` and `"firestore"`. Add a third: `"emulators"`.

The complete file after the change:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "terraform/**",
      "node_modules/**",
      "docs/**",
      ".github/**",
      "*.md",
      "*.test.js",
      ".gitignore",
      ".firebaserc",
      "firebase.json",
      "LICENSE",
      "Makefile",
      "terraform.rules"
    ]
  },
  "firestore": {
    "rules": "terraform.rules"
  },
  "emulators": {
    "auth":      { "port": 9099 },
    "firestore": { "port": 8080 },
    "hosting":   { "port": 5000 },
    "ui":        { "enabled": true, "port": 4000 }
  }
}
```

Port assignments:
- `9099` — Auth emulator (Firebase default)
- `8080` — Firestore emulator (Firebase default)
- `5000` — Hosting emulator (Firebase default); serves `index.html` and injects `/__/firebase/init.js` with emulator project config
- `4000` — Emulator UI; browser dashboard for managing test users and inspecting Firestore data

---

### Task 3: Add `emulator-data/` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append `emulator-data/` to `.gitignore`**

The current `.gitignore` ends with the Terraform section. Append a new section:

```
# Firebase emulator
emulator-data/
```

The full file after the change:

```
# Claude Code local config
.claude/

# Firebase
firebase-config.js
.firebaserc

# Terraform
terraform/.terraform/
terraform/*.tfstate
terraform/*.tfstate.backup
terraform/terraform.tfvars

# Firebase emulator
emulator-data/
```

`emulator-data/` is created by `firebase emulators:start --export-on-exit=./emulator-data`. It stores local Auth users and Firestore documents between dev sessions. It is machine-local state — committing it would be equivalent to committing a dev database dump.

---

### Task 4: Create `Makefile`

**Files:**
- Create: `Makefile`

- [ ] **Step 1: Create `Makefile` at the project root**

```makefile
.PHONY: install auth tf-init tf-apply dev deploy

install:
	npm install -g firebase-tools

auth:
	gcloud auth login
	gcloud auth application-default login

tf-init:
	cd terraform && terraform init

tf-apply:
	cd terraform && terraform apply

dev:
	firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data

deploy:
	firebase deploy
```

**CRITICAL: The indentation inside each target MUST be a TAB character, not spaces.** Makefiles require tabs. If you use spaces, `make` will fail with `*** missing separator` error.

Target descriptions:
- `install` — installs firebase-tools globally via npm (run once on a new machine)
- `auth` — authenticates the gcloud CLI for both API calls and Application Default Credentials (required before `terraform apply`)
- `tf-init` — initialises Terraform, downloads providers and modules (run once, or after adding new providers)
- `tf-apply` — provisions GCP infrastructure (creates project, Firebase, Firestore, Hosting, WIF)
- `dev` — starts the Firebase Emulator Suite with persistence; first run creates `emulator-data/`, subsequent runs restore it
- `deploy` — deploys the app to Firebase Hosting and publishes Firestore rules

- [ ] **Step 2: Verify `make` can parse the file**

```bash
cd /mnt/990Pro2TB/code/js/fitness-calendar && make --dry-run dev
```

Expected output (dry-run prints the command without executing it):
```
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
```

If you see `*** missing separator. Stop.`, the indentation is spaces, not tabs — fix it.

---

### Task 5: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the entire `README.md`**

```markdown
# Fitness Calendar

Personal 6-month bodyweight workout calendar. Hosted on Firebase Hosting.

URL: `https://<project-id>.web.app`

---

## Setup

### 1. Prerequisites

Install tools:
- [Terraform](https://developer.hashicorp.com/terraform/install)
- gcloud CLI: [install guide](https://cloud.google.com/sdk/docs/install)

```sh
make install   # installs firebase-tools
make auth      # authenticates gcloud
```

### 2. Provision infrastructure

```sh
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform/terraform.tfvars — fill in billing_account_id and project_id
make tf-init
make tf-apply
```

`make tf-apply` creates the GCP project, enables Firebase, sets up Firestore, Hosting, and Workload Identity Federation for GitHub Actions.

### 3. Enable Google Sign-In (one manual step)

Firebase Console → your project → **Authentication → Sign-in method → Google → Enable**

This step cannot be automated. Firebase auto-creates the OAuth client when you first enable Google Sign-In in the console; automating it would require storing the OAuth client credentials in Terraform, which introduces secrets and defeats the purpose.

### 4. Add GitHub Actions secrets and variable

From `terraform output`, copy and add to **GitHub → Settings → Secrets and variables → Actions**:

Secrets:
- `WIF_PROVIDER` — value of `terraform output wif_provider`
- `WIF_SERVICE_ACCOUNT` — value of `terraform output wif_service_account`

Variable (not secret — it's not sensitive):
- `FIREBASE_PROJECT_ID` — value of `terraform output project_id`

### 5. Deploy

**Automatic:** Push to `master` — GitHub Actions runs and deploys.

**Manual:**
```sh
firebase login   # first time only
make deploy
```

---

## Local development

```sh
make dev
```

- App: `http://localhost:5000`
- Emulator UI: `http://localhost:4000` — create test users, inspect Firestore data

First run starts with no data and saves state to `emulator-data/` on exit (gitignored).
Subsequent runs restore the previous session's data automatically.

`/__/firebase/init.js` and the emulator connection are handled automatically — no config needed.

---

## Files

- `index.html` — the page
- `styles.css` — styling
- `app.js` — workout data + render logic
- `firebase.js` — Firebase auth + Firestore storage
- `icons.js` — exercise icons
- `progression.js` — progression schedule
- `terraform/` — infrastructure as code
- `terraform.rules` — Firestore security rules
- `firebase.json` — Firebase Hosting + Firestore + emulator config
- `Makefile` — common project commands
- `.github/workflows/deploy.yml` — CI/CD pipeline
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| `firebase.js` localhost detection + `useEmulator()` calls | Task 1 |
| Node.js test guard (`typeof location`) | Task 1 |
| `firebase.json` emulators section with all 4 ports | Task 2 |
| `emulator-data/` in `.gitignore` | Task 3 |
| Makefile with all 6 targets | Task 4 |
| README updated with `make` commands + local dev section | Task 5 |

All requirements covered.

### Placeholder scan

No TBD/TODO/placeholder text found.

### Type consistency

- Port numbers consistent: `9099` (Auth), `8080` (Firestore), `5000` (Hosting), `4000` (UI) used in both Task 2 (`firebase.json`) and Task 1 (the `useEmulator` calls).
- `--import=./emulator-data --export-on-exit=./emulator-data` path matches the `.gitignore` entry `emulator-data/` in Task 3 and the `dev` Makefile target in Task 4.
