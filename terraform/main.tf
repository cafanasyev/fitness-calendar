terraform {
  required_version = "~> 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
  billing_project       = var.project_id
}

module "project" {
  source  = "terraform-google-modules/project-factory/google"
  version = "~> 14.0"

  name                = var.project_id
  project_id          = var.project_id
  org_id              = null
  billing_account     = var.billing_account_id
  random_project_id   = false
  create_project_sa   = false
  disable_services_on_destroy = false
  auto_create_network = false

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

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = module.project.project_id

  depends_on = [module.project]
}

resource "google_firebase_web_app" "default" {
  provider     = google-beta
  project      = google_firebase_project.default.project
  display_name = "Fitness Calendar"

  depends_on = [google_firebase_project.default]
}

resource "google_firestore_database" "default" {
  project     = google_firebase_project.default.project
  name        = "(default)"
  location_id = "nam5"
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_firebase_project.default]
}

resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  project  = google_firebase_project.default.project

  source {
    files {
      name    = "firestore.rules"
      content = file("${path.module}/../terraform.rules")
    }
  }

  depends_on = [google_firestore_database.default]
}

resource "google_firebaserules_release" "firestore" {
  provider     = google-beta
  project      = google_firebase_project.default.project
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  depends_on = [google_firebaserules_ruleset.firestore]
}

resource "google_firebase_hosting_site" "default" {
  provider = google-beta
  project  = google_firebase_project.default.project
  site_id  = var.project_id

  depends_on = [google_firebase_project.default]
}

resource "google_identity_platform_config" "default" {
  provider = google-beta
  project  = google_firebase_project.default.project

  depends_on = [google_firebase_project.default]
}

resource "google_service_account" "github_actions" {
  project      = google_firebase_project.default.project
  account_id   = "github-actions-deploy"
  display_name = "GitHub Actions Deploy"
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = google_firebase_project.default.project
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = google_firebase_project.default.project
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == '${var.github_repo}' && assertion.ref == 'refs/heads/master'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

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

resource "google_project_iam_member" "service_usage_viewer" {
  project = google_firebase_project.default.project
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

resource "local_file" "firebaserc" {
  filename = "${path.module}/../.firebaserc"
  content  = jsonencode({
    projects = {
      default = google_firebase_project.default.project
    }
  })
}
