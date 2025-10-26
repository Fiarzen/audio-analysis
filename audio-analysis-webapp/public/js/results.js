// DOM elements
const loadingContainer = document.getElementById("loadingContainer");
const resultsContainer = document.getElementById("resultsContainer");
const emptyContainer = document.getElementById("emptyContainer");

async function loadResults() {
  try {
    const response = await fetch("/api/results");
    const data = await response.json();

    loadingContainer.style.display = "none";

    if (data.length === 0) {
      emptyContainer.style.display = "block";
    } else {
      resultsContainer.style.display = "grid";
      renderResults(data);
    }
  } catch (error) {
    loadingContainer.style.display = "none";
    resultsContainer.innerHTML =
      '<div class="error-message">Failed to load results: ' +
      error.message +
      "</div>";
    resultsContainer.style.display = "block";
  }
}

function renderResults(results) {
  resultsContainer.innerHTML = results
    .map((result) => {
      if (result.error) {
        return createErrorCard(result);
      }
      return createResultCard(result);
    })
    .join("");
}

function createResultCard(result) {
  const mood = result.mood_indicators || {};
  const energyClass = (mood.energy_level || "").toLowerCase().replace(" ", "-");
  const brightnessClass = (mood.brightness || "").toLowerCase();

  return `
        <div class="result-card">
            <div class="file-name">${escapeHtml(result.file_name)}</div>
            
            <div class="metric">
                <span class="metric-label">Tempo</span>
                <span class="metric-value">${result.tempo_bpm?.toFixed(1) || "N/A"} BPM</span>
            </div>
            
            <div class="metric">
                <span class="metric-label">Key</span>
                <span class="metric-value">${result.estimated_key || "N/A"}</span>
            </div>
            
            <div class="metric">
                <span class="metric-label">Duration</span>
                <span class="metric-value">${formatDuration(result.duration_seconds)}</span>
            </div>
            
            ${
              result.features
                ? `
            <div class="metric">
                <span class="metric-label">Brightness</span>
                <span class="metric-value">${result.features.spectral_centroid_mean?.toFixed(0) || "N/A"} Hz</span>
            </div>
            `
                : ""
            }
            
            <div class="mood-badges">
                ${mood.energy_level ? `<span class="badge ${energyClass}">${mood.energy_level}</span>` : ""}
                ${mood.brightness ? `<span class="badge ${brightnessClass}">${mood.brightness}</span>` : ""}
                ${mood.rhythmic_stability ? `<span class="badge">${mood.rhythmic_stability}</span>` : ""}
            </div>
            
            ${
              result.processed_at
                ? `
            <div class="timestamp">Analyzed: ${formatTimestamp(result.processed_at)}</div>
            `
                : ""
            }
        </div>
    `;
}

function createErrorCard(result) {
  return `
        <div class="result-card">
            <div class="file-name">${escapeHtml(result.file_name)}</div>
            <div class="error-message">
                <strong>Analysis Failed:</strong><br>
                ${escapeHtml(result.error)}
            </div>
            ${
              result.processed_at
                ? `
            <div class="timestamp">Attempted: ${formatTimestamp(result.processed_at)}</div>
            `
                : ""
            }
        </div>
    `;
}

function formatDuration(seconds) {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTimestamp(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Load results on page load
loadResults();

// Auto-refresh every 10 seconds to catch new analyses
setInterval(loadResults, 10000);
