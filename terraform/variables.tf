variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
  default     = "dynamic-hub-471412-r1"
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "europe-west1"
}

variable "bucket_name" {
  description = "Name of the Cloud Storage bucket for audio files"
  type        = string
  default     = "audio-files-dynamic-hub-471412-r1"
}

variable "bucket_location" {
  description = "Location of the Cloud Storage bucket"
  type        = string
  default     = "eu"
}

variable "firestore_location" {
  description = "Location of the Firestore database"
  type        = string
  default     = "eur3"
}

variable "webapp_image" {
  description = "Docker image for the web application (will be built and pushed)"
  type        = string
  default     = "europe-west1-docker.pkg.dev/dynamic-hub-471412-r1/audio-analysis/webapp:latest"
}