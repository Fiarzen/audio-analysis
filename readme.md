# Audio Analysis Setup Guide

## Prerequisites

1. **Python 3.8+** installed on your system
2. **Audio files** (MP3, WAV, FLAC, M4A, or AAC format)

## Installation Steps

### 1. Create a Virtual Environment (Recommended)
```bash
python -m venv audio_analysis_env

# On Windows:
audio_analysis_env\Scripts\activate

# On macOS/Linux:
source audio_analysis_env/bin/activate
```

### 2. Install Required Packages
```bash
pip install librosa numpy pathlib
```

**Note:** `librosa` might take a few minutes to install as it has several dependencies including `scipy`, `scikit-learn`, and audio processing libraries.

### 3. Test Your Installation
Create a small test script to verify everything works:
```python
import librosa
import numpy as np
print("All packages installed successfully!")
```

## Running the Analysis

1. **Prepare your audio files**: Put some music files in a folder
2. **Run the script**: Execute the Python script and enter your music folder path
3. **Check results**: Look for the generated `audio_analysis_results.json` file

## What the Analysis Provides

### Basic Information
- **Duration**: Length of the track
- **Tempo**: Beats per minute (BPM)
- **Estimated Key**: Musical key (C, D, E, etc.)

### Audio Features
- **Spectral Centroid**: Brightness indicator (higher = brighter sound)
- **RMS Energy**: Overall loudness/energy level
- **Zero Crossing Rate**: Measure of how "noisy" vs "tonal" the audio is
- **MFCCs**: Audio fingerprint (useful for similarity matching later)

### Mood Indicators
- **Energy Level**: High/Medium/Low based on tempo and RMS
- **Brightness**: Bright/Balanced/Dark based on spectral content
- **Rhythmic Stability**: How consistent the rhythm is

## Example Output
```json
{
  "file_name": "example_song.mp3",
  "duration_seconds": 240.5,
  "tempo_bpm": 128.4,
  "estimated_key": "C",
  "mood_indicators": {
    "energy_level": "High Energy",
    "brightness": "Bright",
    "rhythmic_stability": "Stable"
  }
}
```

## Common Issues and Solutions

### Installation Problems
- **Windows**: You might need to install Microsoft C++ Build Tools
- **macOS**: Install Xcode Command Line Tools: `xcode-select --install`
- **Linux**: Install system audio libraries: `sudo apt-get install libsndfile1`

### Audio File Issues
- **Unsupported format**: Convert files to MP3/WAV using online converters
- **Corrupted files**: librosa will show an error message for unreadable files
- **Very long files**: The script analyzes only the first 60 seconds by default

## Next Steps

Once this works locally:
1. **Experiment** with different music genres to see how features vary
2. **Modify** the analysis parameters (duration, number of MFCCs, etc.)
3. **Add** new features like mood classification or genre prediction
4. **Prepare** for Google Cloud deployment

## Files You Need

1. The main Python script (audio_analysis.py)
2. A folder with some music files for testing
3. This requirements file for reference

Start with 3-5 songs from different genres to see how the analysis varies!