# Local Dev Emulator Design

**Date:** 2026-05-23
**Status:** Approved

## Problem

The app connects to real GCP services (Firebase Auth + Firestore) even during local development. Every test sign-in or data change hits production, which is slow, requires a live internet connection, and risks polluting real user data.

## Goal

Connect to the Firebase Emulator Suite when running on `localhost` so local development and debugging use local services with no GCP calls. Data persists between emulator restarts. A Makefile provides shortcut commands for all common project operations.

---

## Architecture

**Switching mechanism:** Automatic `localhost` detection in `firebase.js`. No flags, no config — the check is physically impossible to trigger from Firebase Hosting (production), so production is unaffected.

**Persistence:** `--import` / `--export-on-exit` flags on `firebase emulators:start`. First run starts fresh and creates `emulator-data/` on exit. Subsequent runs restore previous state. `emulator-data/` is gitignored — local state only, not shared.

**Emulated services:** Auth (port 9099) + Firestore (port 8080) + Hosting (port 5000) + Emulator UI (port 4000).

---

## File Changes

### `firebase.js`

Add emulator connection block immediately before the `module.exports` line:

```js
if (typeof location !== "undefined" && location.hostname === "localhost") {
  firebase.auth().useEmulator("http://localhost:9099");
  firebase.firestore().useEmulator("localhost", 8080);
}
```

`typeof location !== "undefined"` guards against Node.js (where `location` doesn't exist), so `firebase.test.js` continues to pass unchanged.

### `firebase.json`

Add `"emulators"` section:

```json
"emulators": {
  "auth":      { "port": 9099 },
  "firestore": { "port": 8080 },
  "hosting":   { "port": 5000 },
  "ui":        { "enabled": true, "port": 4000 }
}
```

### `Makefile`

New file at project root:

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

### `.gitignore`

Add:
```
emulator-data/
```

### `README.md`

Replace the **Local development** section:

```markdown
## Local development

```sh
make dev
```

- App: `http://localhost:5000`
- Emulator UI: `http://localhost:4000` — create test users, inspect Firestore data

First run starts with no data; on exit the state is saved to `emulator-data/` (gitignored).
Subsequent runs restore the previous session's data automatically.
```

Update the **Setup** section to use Makefile targets:

```markdown
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
```

---

## Testing

`firebase.test.js` tests only `workoutDate`, `autoSkipPast`, and `LOGGABLE_DAYS_OFFSET` — pure functions that don't reference `firebase` or `location`. The `typeof location !== "undefined"` guard ensures the emulator connection block is silently skipped in Node.js. No test changes required; run `node firebase.test.js` to verify.
