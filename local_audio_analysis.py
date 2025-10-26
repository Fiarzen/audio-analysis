import librosa
import numpy as np
import json
from pathlib import Path

def analyse_audio(file_path):
    """
    analyse an audio file and extract musical features
    
    Args:
        file_path (str): Path to the audio file
        
    Returns:
        dict: Dictionary containing analysis results
    """
    try:
        # Load the audio file
        print(f"Loading {file_path}...")
        y, sr = librosa.load(file_path, duration=60)  # analyse first 60 seconds
        
        # Basic audio properties
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Tempo and beat tracking
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y)[0]
        
        # MFCC (Mel-frequency cepstral coefficients) 
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # Chroma features (for key detection)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        
        # RMS Energy (loudness/energy)
        rms = librosa.feature.rms(y=y)[0]
        
        # Key detection (simplified)
        chroma_mean = np.mean(chroma, axis=1)
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        estimated_key = key_names[np.argmax(chroma_mean)]
        
        # Compile results
        analysis = {
            'file_name': Path(file_path).name,
            'duration_seconds': float(duration),
            'tempo_bpm': float(tempo),
            'estimated_key': estimated_key,
            'features': {
                'spectral_centroid_mean': float(np.mean(spectral_centroids)),
                'spectral_centroid_std': float(np.std(spectral_centroids)),
                'spectral_rolloff_mean': float(np.mean(spectral_rolloff)),
                'zero_crossing_rate_mean': float(np.mean(zero_crossing_rate)),
                'rms_energy_mean': float(np.mean(rms)),
                'rms_energy_std': float(np.std(rms)),
                'mfcc_means': [float(x) for x in np.mean(mfccs, axis=1)],
            },
            'mood_indicators': {
                'energy_level': classify_energy(np.mean(rms), tempo),
                'brightness': classify_brightness(np.mean(spectral_centroids)),
                'rhythmic_stability': classify_rhythm_stability(np.std(zero_crossing_rate))
            }
        }
        
        return analysis
        
    except Exception as e:
        return {'error': str(e), 'file_name': Path(file_path).name}

def classify_energy(rms_mean, tempo):
    """Simple energy classification based on RMS and tempo"""
    energy_score = (rms_mean * 10) + (tempo / 20)
    
    if energy_score > 8:
        return 'High Energy'
    elif energy_score > 5:
        return 'Medium Energy'
    else:
        return 'Low Energy'

def classify_brightness(spectral_centroid_mean):
    """Classify brightness based on spectral centroid"""
    if spectral_centroid_mean > 3000:
        return 'Bright'
    elif spectral_centroid_mean > 1500:
        return 'Balanced'
    else:
        return 'Dark'

def classify_rhythm_stability(zcr_std):
    """Classify rhythmic stability"""
    if zcr_std < 0.01:
        return 'Very Stable'
    elif zcr_std < 0.02:
        return 'Stable'
    else:
        return 'Dynamic'

def analyse_multiple_files(directory_path):
    """analyse all audio files in a directory"""
    audio_extensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac']
    directory = Path(directory_path)
    
    results = []
    
    for file_path in directory.iterdir():
        if file_path.suffix.lower() in audio_extensions:
            print(f"\nAnalyzing: {file_path.name}")
            analysis = analyse_audio(str(file_path))
            results.append(analysis)
            
            # Print summary for each file
            if 'error' not in analysis:
                print(f"  Tempo: {analysis['tempo_bpm']:.1f} BPM")
                print(f"  Key: {analysis['estimated_key']}")
                print(f"  Energy: {analysis['mood_indicators']['energy_level']}")
                print(f"  Brightness: {analysis['mood_indicators']['brightness']}")
            else:
                print(f"  Error: {analysis['error']}")
    
    return results

def save_results(results, output_file='audio_analysis_results.json'):
    """Save analysis results to JSON file"""
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {output_file}")

if __name__ == "__main__":
    # Example usage
    print("Audio Analysis Tool")
    print("==================")
    
    # Option 1: analyse a single file
    # file_path = "path/to/your/audio/file.mp3"
    # result = analyse_audio(file_path)
    # print(json.dumps(result, indent=2))
    
    # Option 2: analyse all files in a directory
    directory_path = input("Enter the path to your music directory: ").strip()
    
    if Path(directory_path).exists():
        results = analyse_multiple_files(directory_path)
        save_results(results)
        
        print(f"\nanalysed {len(results)} files")
        successful = len([r for r in results if 'error' not in r])
        print(f"Successful analyses: {successful}")
        
    else:
        print("Directory not found. Please check the path and try again.")
        
    print("\nNext steps:")
    print("1. Install required packages: pip install librosa numpy")
    print("2. Run this script with your music files")
    print("3. Check the generated JSON file for results")