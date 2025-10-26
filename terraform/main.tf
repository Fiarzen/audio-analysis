terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "storage" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudfunctions" {
  service            = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firestore" {
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "eventarc" {
  service            = "eventarc.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# Cloud Storage bucket for audio files
resource "google_storage_bucket" "audio_files" {
  name          = var.bucket_name
  location      = var.bucket_location
  force_destroy = true  # Allow deletion even with files inside

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.storage]
}

# Firestore database
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "audio-analysis-db"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  lifecycle {
    prevent_destroy = false
  }

  depends_on = [google_project_service.firestore]
}

# Service account for Cloud Function
resource "google_service_account" "function_sa" {
  account_id   = "audio-analysis-function"
  display_name = "Audio Analysis Function Service Account"
}

# Grant permissions to the Cloud Function service account
resource "google_project_iam_member" "function_storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.function_sa.email}"
}

resource "google_project_iam_member" "function_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.function_sa.email}"
}

resource "google_project_iam_member" "function_eventarc_receiver" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.function_sa.email}"
}

# Grant Pub/Sub permissions for Storage to trigger Cloud Function
data "google_project" "project" {
  project_id = var.project_id
}

resource "google_project_iam_member" "gcs_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.project.number}@gs-project-accounts.iam.gserviceaccount.com"

  depends_on = [google_project_service.storage]
}

# Cloud Storage bucket for function source code
resource "google_storage_bucket" "function_source" {
  name          = "${var.project_id}-function-source"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  depends_on = [google_project_service.storage]
}

# Zip the function source code
data "archive_file" "function_source" {
  type        = "zip"
  source_dir  = "${path.module}/../audio-analysis-function"
  output_path = "${path.module}/function-source.zip"
}

# Upload function source to Cloud Storage
resource "google_storage_bucket_object" "function_source" {
  name   = "function-source-${data.archive_file.function_source.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.function_source.output_path
}

# Cloud Function (Gen 2)
resource "google_cloudfunctions2_function" "audio_analysis" {
  name        = "process-audio"
  location    = var.region
  description = "Analyze audio files uploaded to Cloud Storage"

  build_config {
    runtime     = "python311"
    entry_point = "process_audio"
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count = 10
    min_instance_count = 0
    available_memory   = "1Gi"
    timeout_seconds    = 540
    service_account_email = google_service_account.function_sa.email

    environment_variables = {
      BUCKET_NAME = var.bucket_name
    }
  }

  event_trigger {
    trigger_region        = var.bucket_location
    event_type            = "google.cloud.storage.object.v1.finalized"
    retry_policy          = "RETRY_POLICY_DO_NOT_RETRY"
    service_account_email = google_service_account.function_sa.email

    event_filters {
      attribute = "bucket"
      value     = var.bucket_name
    }
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_service.eventarc,
    google_storage_bucket.audio_files,
    google_project_iam_member.gcs_pubsub_publisher
  ]
}

# Service account for Cloud Run
resource "google_service_account" "cloudrun_sa" {
  account_id   = "audio-analysis-webapp"
  display_name = "Audio Analysis Web App Service Account"
}

# Grant permissions to Cloud Run service account
resource "google_project_iam_member" "cloudrun_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

resource "google_project_iam_member" "cloudrun_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Cloud Run service
resource "google_cloud_run_v2_service" "webapp" {
  name     = "audio-analysis-web"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.webapp_image

      ports {
        container_port = 8080
      }

      env {
        name  = "BUCKET_NAME"
        value = var.bucket_name
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    timeout = "300s"
  }

  depends_on = [
    google_project_service.run,
    google_project_service.artifactregistry
  ]
}

# Allow unauthenticated access to Cloud Run
resource "google_cloud_run_v2_service_iam_member" "noauth" {
  location = google_cloud_run_v2_service.webapp.location
  name     = google_cloud_run_v2_service.webapp.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}