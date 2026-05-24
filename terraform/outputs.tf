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
