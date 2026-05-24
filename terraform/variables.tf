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
  default     = "us-central1"
}

variable "github_repo" {
  description = "GitHub repository in owner/name format (e.g. yourname/fitness-calendar)"
  type        = string
}
