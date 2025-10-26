output "bucket_name" {
  description = "Name of the Cloud Storage bucket"
  value       = google_storage_bucket.audio_files.name
}

output "bucket_url" {
  description = "URL of the Cloud Storage bucket"
  value       = "gs://${google_storage_bucket.audio_files.name}"
}

output "function_name" {
  description = "Name of the Cloud Function"
  value       = google_cloudfunctions2_function.audio_analysis.name
}

output "function_url" {
  description = "URL of the Cloud Function"
  value       = google_cloudfunctions2_function.audio_analysis.service_config[0].uri
}

output "webapp_url" {
  description = "URL of the web application"
  value       = google_cloud_run_v2_service.webapp.uri
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.database.name
}

output "function_service_account" {
  description = "Service account email for Cloud Function"
  value       = google_service_account.function_sa.email
}

output "webapp_service_account" {
  description = "Service account email for Cloud Run"
  value       = google_service_account.cloudrun_sa.email
}