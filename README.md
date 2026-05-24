# Fitness Calendar

Personal 6-month bodyweight workout calendar. Hosted on Firebase Hosting.

URL: `https://<project-id>.web.app`

---

## Setup

### 1. Prerequisites

Install tools:
- [Node.js 24+](https://nodejs.org/)
- [Terraform](https://developer.hashicorp.com/terraform/install)
- gcloud CLI: [install guide](https://docs.cloud.google.com/sdk/docs/install-sdk)

```sh
make install   # installs firebase-tools globally and npm dependencies
make auth      # authenticates gcloud
```

### 2. Provision infrastructure

```sh
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform/terraform.tfvars:
#   billing_account_id — find at console.cloud.google.com/billing
#   project_id         — pick a globally unique name (e.g. fitness-cal-yourname); Terraform creates it
#   github_repo        — your github account name and repository name (e.g. john/fitness-calendar-abcd)
make tf-init
make tf-apply
```

`make tf-apply` creates the GCP project, enables Firebase, sets up Firestore, Hosting, and Workload Identity Federation for GitHub Actions.

### 3. Enable Google Sign-In (one manual step)

Firebase Console → your project → **Authentication → Sign-in method → Google → Enable**

This step cannot be automated. Firebase auto-creates the OAuth client when you first enable Google Sign-In in the console; automating it would require storing the OAuth client credentials in Terraform, which introduces secrets and defeats the purpose.

### 4. Add GitHub Actions secrets and variable

From `terraform output`, copy and add to **GitHub → Settings → Secrets and variables → Actions**:

Variables (not secrets — none of these are sensitive):
- `WIF_PROVIDER` — value of `terraform output wif_provider`
- `WIF_SERVICE_ACCOUNT` — value of `terraform output wif_service_account`
- `FIREBASE_PROJECT_ID` — value of `terraform output project_id`

### 5. Deploy

**Automatic:** Push to `master` — GitHub Actions runs and deploys.

**Manual:**
```sh
firebase login   # first time only
make deploy      # runs `vite build` then `firebase deploy`
```

---

## Local development

Run two terminals:

**Run Vite dev server and local dev Firebase emulators:**
```sh
make dev-ui
make dev-firebase
```

- App: `http://localhost:5173` (Vite dev server)
- Emulator UI: `http://localhost:4000` — create test users, inspect Firestore data

The Vite dev server proxies `/__/` to the Firebase hosting emulator (port 5000), so `/__/firebase/init.js` SDK auto-config works without any manual setup.

First run starts with no data and saves state to `emulator-data/` on exit (gitignored).
Subsequent runs restore the previous session's data automatically.

---
