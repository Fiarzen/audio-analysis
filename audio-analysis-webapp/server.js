require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const { Firestore } = require("@google-cloud/firestore");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const BUCKET_NAME =
  process.env.BUCKET_NAME || "audio-files-dynamic-hub-471412-r1";
const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".flac", ".m4a", ".aac"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Initialize Google Cloud clients with explicit project ID
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "dynamic-hub-471412-r1";

let storage, firestore;
try {
  storage = new Storage({ projectId });
  firestore = new Firestore({
    projectId,
    ignoreUndefinedProperties: true,
  });
  console.log(`Connected to Google Cloud project: ${projectId}`);
} catch (error) {
  console.error("Error initializing Google Cloud clients:", error);
  process.exit(1);
}

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Use MP3, WAV, FLAC, M4A, or AAC"));
    }
  },
});

// Middleware
app.use(express.static("public"));
app.use(express.json());

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/results", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "results.html"));
});

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Generate unique filename in uploads folder
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const ext = path.extname(req.file.originalname);
    const filename = `uploads/${timestamp}_${randomString}${ext}`;

    // Upload to Cloud Storage
    const bucket = storage.bucket(BUCKET_NAME);
    const blob = bucket.file(filename);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on("error", (err) => {
      console.error("Upload error:", err);
      res.status(500).json({ error: `Upload failed: ${err.message}` });
    });

    blobStream.on("finish", () => {
      const docId = filename.replace(/\//g, "_").replace(/\./g, "_");
      res.json({
        success: true,
        filename: filename,
        message: "File uploaded successfully! Analysis will begin shortly.",
        doc_id: docId,
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all results
app.get("/api/results", async (req, res) => {
  try {
    console.log("Fetching results from Firestore...");
    const snapshot = await firestore.collection("audio_analyses").get();
    console.log(`Found ${snapshot.size} documents`);

    const results = [];
    snapshot.forEach((doc) => {
      try {
        const data = doc.data();
        // Convert any Timestamp objects to ISO strings
        if (
          data.processed_at &&
          typeof data.processed_at.toDate === "function"
        ) {
          data.processed_at = data.processed_at.toDate().toISOString();
        }
        results.push({
          id: doc.id,
          ...data,
        });
      } catch (err) {
        console.error(`Error processing document ${doc.id}:`, err);
        // Skip documents that can't be processed
      }
    });

    // Sort by processed_at (most recent first)
    results.sort((a, b) => {
      const dateA = a.processed_at || "";
      const dateB = b.processed_at || "";
      return dateB.localeCompare(dateA);
    });

    console.log(`Returning ${results.length} results`);
    res.json(results);
  } catch (error) {
    console.error("Error fetching results:", error);
    // Return empty array instead of error to allow page to load
    res.json([]);
  }
});

// Get specific result
app.get("/api/result/:docId", async (req, res) => {
  try {
    const doc = await firestore
      .collection("audio_analyses")
      .doc(req.params.docId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "Analysis not found yet. Please wait a moment.",
      });
    }

    res.json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}`);
});
