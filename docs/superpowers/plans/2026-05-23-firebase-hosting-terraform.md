# Firebase Hosting + Terraform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision the entire Firebase backend with Terraform and switch to Firebase Hosting so `/__/firebase/init.js` auto-injects the project config — eliminating `firebase-config.js` from the repo.

**Architecture:** Terraform in `terraform/` (local state) provisions GCP project via `project-factory`, then Firebase project/web app/Firestore/Hosting/Identity Platform/WIF+service account in one `apply`. The app swaps `firebase-config.js` for `/__/firebase/init.js`. GitHub Actions deploys on push to `master` via OIDC (keyless).

**Tech Stack:** Terraform ≥ 1.5, hashicorp/google ~> 5.0, hashicorp/google-beta ~> 5.0, terraform-google-modules/project-factory ~> 14.0, firebase-tools CLI, GitHub Actions.

**Important constraints:**
- Do NOT include `terraform apply` as a plan step — provisioning real cloud resources must be done manually by the user.
- Do NOT include `git commit` or `git push` steps — the user manages version control manually.
- `terraform validate` is used as the "test" gate after each Terraform task.

---

### Task 1: Terraform scaffold — providers, variables stub, outputs stub, gitignore

**Files:**
- Create: `terraform/main.tf`
- Create: `terraform/variables.tf`
- Create: `terraform/outputs.tf`
- Create: `terraform/.gitignore`
- Modify: `.gitignore`

- [ ] **Step 1: Create `terraform/.gitignore`**

```
.terraform/
*.tfstate
*.tfstate.backup
.terraform.lock.hcl
terraform.tfvars
```

- [ ] **Step 2: Add Terraform ignores to root `.gitignore`**

Read the current `.gitignore`, then append these lines if not already present:

```
firebase-config.js
.firebaserc
terraform/.terraform/
terraform/*.tfstate
terraform/*.tfstate.backup
terraform/.terraform.lock.hcl
terraform/terraform.tfvars
```

- [ ] **Step 3: Create `terraform/variables.tf`**

```hcl
variable "billing_account_id" {
  description = "GCP billing account ID (format: XXXXXX-XXXXXX-XXXXXX)"
  type        = string
}

variable "project_id" {
  description = "Globally unique GCP project ID (e.g. fitness-cal-abc123)"
  type        = string
}

variable "region" {
  description = "Default GCP region"
  type        = string
  default     = "us-central"
}
```

- [ ] **Step 4: Create `terraform/outputs.tf` (stub — will be filled in Task 6)**

```hcl
# Outputs are defined in Task 6 after all resources exist
```

- [ ] **Step 5: Create `terraform/main.tf` with provider configuration only**

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
```

- [ ] **Step 6: Run `terraform init` to verify providers download**

```bash
cd terraform
terraform init
```

Expected output (last lines):
```
Terraform has been successfully initialized!
```

- [ ] **Step 7: Run `terraform validate`**

```bash
terraform validate
```

Expected:
```
Success! The configuration is valid.
```

---

### Task 2: GCP project via project-factory module

**Files:**
- Modify: `terraform/main.tf`
- Create: `terraform/terraform.tfvars.example`

- [ ] **Step 1: Create `terraform/terraform.tfvars.example`**

This is a template users copy to `terraform.tfvars` and fill in real values. It is committed to the repo; `terraform.tfvars` (with real values) is gitignored.

```hcl
billing_account_id = "XXXXXX-XXXXXX-XXXXXX"
project_id         = "fitness-cal-abc123"
```

- [ ] **Step 2: Add project-factory module to `terraform/main.tf`**

Append after the provider blocks:

```hcl
module "project" {
  source  = "terraform-google-modules/project-factory/google"
  version = "~> 14.0"

  name                = var.project_id
  project_id          = var.project_id
  org_id              = ""
  billing_account     = var.billing_account_id
  random_project_id   = false
  create_project_sa   = false

  activate_apis = [
    "cloudresourcemanager.googleapis.com",
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com",
    "firebasehosting.googleapis.com",
    "firebaserules.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
  ]
}
```

- [ ] **Step 3: Run `terraform init` to download the project-factory module**

```bash
cd terraform
terraform init
```

Expected output:
```
Initializing modules...
Downloading registry.terraform.io/terraform-google-modules/project-factory/google 14.x.x for project...
...
Terraform has been successfully initialized!
```

- [ ] **Step 4: Run `terraform validate`**

```bash
terraform validate
```

Expected:
```
Success! The configuration is valid.
```

---

### Task 3: Firebase core resources — Firebase project, web app, Firestore DB, security rules

**Files:**
- Modify: `terraform/main.tf`
- Create: `terraform.rules`

- [ ] **Step 1: Create `terraform.rules` at project root**

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

- [ ] **Step 2: Add Firebase project resource to `terraform/main.tf`**

Append after the `module "project"` block:

```hcl
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = module.project.project_id

  depends_on = [module.project]
}
```

- [ ] **Step 3: Add Firebase web app resource**

Append after `google_firebase_project`:

```hcl
resource "google_firebase_web_app" "default" {
  provider     = google-beta
  project      = google_firebase_project.default.project
  display_name = "Fitness Calendar"

  depends_on = [google_firebase_project.default]
}
```

- [ ] **Step 4: Add Firestore database resource**

Append after `google_firebase_web_app`:

```hcl
resource "google_firestore_database" "default" {
  project     = google_firebase_project.default.project
  name        = "(default)"
  location_id = "nam5"
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_firebase_project.default]
}
```

- [ ] **Step 5: Add Firestore security rules resources**

Append after `google_firestore_database`:

```hcl
resource "google_firebaserules_ruleset" "firestore" {
  project = google_firebase_project.default.project

  source {
    files {
      name    = "firestore.rules"
      content = file("${path.module}/../terraform.rules")
    }
  }

  depends_on = [google_firestore_database.default]
}

resource "google_firebaserules_release" "firestore" {
  project      = google_firebase_project.default.project
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  depends_on = [google_firebaserules_ruleset.firestore]
}
```

- [ ] **Step 6: Run `terraform validate`**

```bash
cd terraform
terraform validate
```

Expected:
```
Success! The configuration is valid.
```

---

### Task 4: Firebase Hosting site and Identity Platform

**Files:**
- Modify: `terraform/main.tf`

- [ ] **Step 1: Add Firebase Hosting site resource to `terraform/main.tf`**

Append after `google_firebaserules_release`:

```hcl
resource "google_firebase_hosting_site" "default" {
  provider = google-beta
  project  = google_firebase_project.default.project
  site_id  = var.project_id

  depends_on = [google_firebase_project.default]
}
```

- [ ] **Step 2: Add Identity Platform config resource**

Append after `google_firebase_hosting_site`:

```hcl
resource "google_identity_platform_config" "default" {
  provider = google-beta
  project  = google_firebase_project.default.project

  depends_on = [google_firebase_project.default]
}
```

- [ ] **Step 3: Run `terraform validate`**

```bash
cd terraform
terraform validate
```

Expected:
```
Success! The configuration is valid.
```

---

### Task 5: Workload Identity Federation + service account + IAM bindings

**Files:**
- Modify: `terraform/main.tf`

- [ ] **Step 1: Add service account resource to `terraform/main.tf`**

Append after `google_identity_platform_config`:

```hcl
resource "google_service_account" "github_actions" {
  project      = google_firebase_project.default.project
  account_id   = "github-actions-deploy"
  display_name = "GitHub Actions Deploy"
}
```

- [ ] **Step 2: Add Workload Identity Pool**

Append after `google_service_account`:

```hcl
resource "google_iam_workload_identity_pool" "github" {
  project                   = google_firebase_project.default.project
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
}
```

- [ ] **Step 3: Add Workload Identity Pool Provider**

Append after `google_iam_workload_identity_pool`:

```hcl
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = google_firebase_project.default.project
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == 'cafanasyev/fitness-calendar'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
```

- [ ] **Step 4: Add IAM bindings — Firebase Hosting Admin + Firebase Rules Admin for service account**

Append after `google_iam_workload_identity_pool_provider`:

```hcl
resource "google_project_iam_member" "hosting_admin" {
  project = google_firebase_project.default.project
  role    = "roles/firebasehosting.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "rules_admin" {
  project = google_firebase_project.default.project
  role    = "roles/firebaserules.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}
```

- [ ] **Step 5: Allow WIF to impersonate the service account**

Append after the IAM members:

```hcl
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/cafanasyev/fitness-calendar"
}
```

- [ ] **Step 6: Run `terraform validate`**

```bash
cd terraform
terraform validate
```

Expected:
```
Success! The configuration is valid.
```

---

### Task 6: Outputs + `.firebaserc` generation via `local_file`

**Files:**
- Modify: `terraform/outputs.tf`
- Modify: `terraform/main.tf`

- [ ] **Step 1: Replace the stub `terraform/outputs.tf` with full outputs**

```hcl
output "project_id" {
  description = "GCP project ID — use as FIREBASE_PROJECT_ID GitHub variable"
  value       = google_firebase_project.default.project
}

output "hosting_default_url" {
  description = "Default Firebase Hosting URL"
  value       = "https://${var.project_id}.web.app"
}

output "wif_provider" {
  description = "Workload Identity provider resource name — use as WIF_PROVIDER GitHub secret"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "wif_service_account" {
  description = "Service account email — use as WIF_SERVICE_ACCOUNT GitHub secret"
  value       = google_service_account.github_actions.email
}
```

- [ ] **Step 2: Add `local_file` resource to generate `.firebaserc` at project root**

Append to `terraform/main.tf`:

```hcl
resource "local_file" "firebaserc" {
  filename = "${path.module}/../.firebaserc"
  content  = jsonencode({
    projects = {
      default = google_firebase_project.default.project
    }
  })
}
```

- [ ] **Step 3: Run `terraform validate`**

```bash
cd terraform
terraform validate
```

Expected:
```
Success! The configuration is valid.
```

---

### Task 7: `firebase.json`

**Files:**
- Create: `firebase.json`

- [ ] **Step 1: Create `firebase.json` at project root**

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
  }
}
```

- [ ] **Step 2: Verify the ignore list covers all non-app files**

Manually check that `terraform.rules`, `terraform/`, `docs/`, `.github/`, `*.md`, `*.test.js`, `Makefile` are all in the ignore list. The app files that SHOULD be deployed: `index.html`, `styles.css`, `app.js`, `firebase.js`, `icons.js`, `progression.js`.

---

### Task 8: App changes — swap `firebase-config.js` for `/__/firebase/init.js`, update `.gitignore`

**Files:**
- Modify: `index.html`
- Delete: `firebase-config.js`
- Modify: `.gitignore`

- [ ] **Step 1: Replace the `firebase-config.js` script tag in `index.html`**

Find this line in `index.html`:
```html
<script src="firebase-config.js"></script>
```

Replace with:
```html
<script src="/__/firebase/init.js"></script>
```

The `/__/firebase/init.js` path is reserved by Firebase Hosting and auto-serves the registered web app's config. It is only available when served via Firebase Hosting or `firebase serve` locally.

- [ ] **Step 2: Delete `firebase-config.js`**

```bash
rm /mnt/990Pro2TB/code/js/fitness-calendar/firebase-config.js
```

- [ ] **Step 3: Verify `firebase-config.js` is listed in `.gitignore`**

Check `.gitignore` contains `firebase-config.js`. This was added in Task 1 Step 2 — confirm it's there. If not, add it now.

- [ ] **Step 4: Confirm `index.html` load order is correct**

The script tags in `index.html` body should end with this order:
```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script src="/__/firebase/init.js"></script>
<script src="icons.js"></script>
<script src="progression.js"></script>
<script src="firebase.js"></script>
<script src="app.js"></script>
```

`/__/firebase/init.js` initializes the Firebase app (replaces the old `firebase-config.js` + `firebase.initializeApp()` call). `firebase.js` then uses the already-initialized `firebase` global.

- [ ] **Step 5: Update `firebase.js` to remove the manual `initializeApp` call**

In `firebase.js`, find the block that initializes Firebase:
```js
if (typeof firebase !== "undefined") firebase.initializeApp(FIREBASE_CONFIG);
```

Remove that line entirely. Firebase Hosting's `/__/firebase/init.js` calls `initializeApp` automatically before any app scripts run.

Also remove any reference to `FIREBASE_CONFIG` if the variable is no longer used.

---

### Task 9: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/` and `workflows/` directories if they don't exist**

```bash
mkdir -p /mnt/990Pro2TB/code/js/fitness-calendar/.github/workflows
```

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Deploy to Firebase Hosting
        run: firebase deploy --only hosting,firestore:rules --project ${{ vars.FIREBASE_PROJECT_ID }}
```

- [ ] **Step 3: Verify `permissions` block**

The workflow MUST have `id-token: write` permission — this is required for OIDC token exchange with Google's WIF. `contents: read` is the minimum for `actions/checkout`. Without `id-token: write`, the `auth` step will fail with a permissions error.

---

### Task 10: README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the contents of `README.md`**

```markdown
# Fitness Calendar

Personal 6-month bodyweight workout calendar. Hosted on Firebase Hosting.

URL: `https://<project-id>.web.app`

---

## Setup

### 1. Prerequisites

Install tools:
- [Terraform](https://developer.hashicorp.com/terraform/install)
- Firebase CLI: `npm install -g firebase-tools`
- gcloud CLI: [install guide](https://cloud.google.com/sdk/docs/install)

Authenticate:
```sh
gcloud auth login
gcloud auth application-default login
```

### 2. Provision infrastructure

```sh
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — fill in billing_account_id and project_id
terraform init
terraform apply
```

`terraform apply` creates the GCP project, enables Firebase, sets up Firestore, Hosting, and Workload Identity Federation for GitHub Actions.

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
firebase deploy
```

---

## Local development

`/__/firebase/init.js` only works when served from Firebase Hosting. For local dev, use the Firebase emulator:

```sh
firebase serve
# or
firebase emulators:start --only hosting
```

This serves the app at `http://localhost:5000` with the real Firebase project config injected.

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
- `firebase.json` — Firebase Hosting + Firestore config
- `.github/workflows/deploy.yml` — CI/CD pipeline
```

---

## Self-Review

### Spec Coverage

| Spec requirement | Task |
|-----------------|------|
| Terraform scaffold, local state, providers | Task 1 |
| project-factory module, API enablement | Task 2 |
| Firebase project, web app, Firestore DB, rules | Task 3 |
| Firebase Hosting site, Identity Platform | Task 4 |
| WIF pool + provider, service account, IAM | Task 5 |
| outputs.tf complete, .firebaserc via local_file | Task 6 |
| firebase.json with correct ignore list | Task 7 |
| index.html swap, firebase-config.js deleted, .gitignore | Task 8 |
| GitHub Actions workflow with OIDC | Task 9 |
| README with setup steps, manual step documented | Task 10 |

All spec requirements covered.

### Placeholder scan

No TBD/TODO/placeholder text found.

### Type consistency

- `google_firebase_project.default.project` used consistently as the project reference across all resources.
- `google_iam_workload_identity_pool.github.name` used correctly in `google_service_account_iam_member.wif_binding`.
- `google_iam_workload_identity_pool.github.workload_identity_pool_id` used correctly in the provider resource.

### Noted gaps fixed

- `terraform.rules` must be in `firebase.json` ignore list (it's at project root and would be served otherwise) — added in Task 7.
- `Makefile` added to ignore list in Task 7 (present in project root).
- Task 8 includes removing the manual `firebase.initializeApp(FIREBASE_CONFIG)` call from `firebase.js` since `/__/firebase/init.js` handles initialization automatically.
