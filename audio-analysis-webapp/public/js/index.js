// DOM elements
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const uploadBtn = document.getElementById("uploadBtn");
const message = document.getElementById("message");
const spinner = document.getElementById("spinner");

let selectedFile = null;

// Click to select file
uploadArea.addEventListener("click", () => fileInput.click());

// File selected
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

// Drag and drop events
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragging");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragging");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragging");

  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

function handleFile(file) {
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  fileInfo.classList.add("show");
  uploadBtn.disabled = false;
  message.classList.remove("show");
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append("file", selectedFile);

  uploadBtn.disabled = true;
  spinner.classList.add("show");
  message.classList.remove("show");

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    spinner.classList.remove("show");

    if (response.ok) {
      message.textContent = data.message + " Redirecting to results...";
      message.className = "message success show";

      // Redirect to results after 2 seconds
      setTimeout(() => {
        window.location.href = "/results";
      }, 2000);
    } else {
      message.textContent = data.error || "Upload failed";
      message.className = "message error show";
      uploadBtn.disabled = false;
    }
  } catch (error) {
    spinner.classList.remove("show");
    message.textContent = "Network error: " + error.message;
    message.className = "message error show";
    uploadBtn.disabled = false;
  }
});
