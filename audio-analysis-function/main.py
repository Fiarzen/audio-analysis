import functions_framework
from google.cloud import storage
from google.cloud import firestore
import librosa
import numpy as np
import tempfile
import os
from datetime import datetime

# Initialize clients
storage_client = storage.Client()
db = firestore.Client()

def analyze_audio(file_path):
    """
    Analyze an audio file and extract musical features
    """
    try:
        # Load the audio file (analyze first 60 seconds)
        y, sr = librosa.load(file_path, duration=60)
        
        # Basic audio properties
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Tempo and beat tracking
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y)[0]
        
        # MFCC
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # Chroma features (for key detection)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        
        # RMS Energy
        rms = librosa.feature.rms(y=y)[0]
        
        # Key detection
        chroma_mean = np.mean(chroma, axis=1)
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        estimated_key = key_names[np.argmax(chroma_mean)]
        
        # Compile results
        analysis = {
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
        raise Exception(f"Analysis failed: {str(e)}")

def classify_energy(rms_mean, tempo):
    """Simple energy classification"""
    energy_score = (rms_mean * 10) + (tempo / 20)
    
    if energy_score > 8:
        return 'High Energy'
    elif energy_score > 5:
        return 'Medium Energy'
    else:
        return 'Low Energy'

def classify_brightness(spectral_centroid_mean):
    """Classify brightness"""
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

@functions_framework.cloud_event
def process_audio(cloud_event):
    """
    Cloud Function triggered by Cloud Storage when a file is uploaded
    """
    data = cloud_event.data
    
    bucket_name = data["bucket"]
    file_name = data["name"]
    
    print(f"Processing file: {file_name} from bucket: {bucket_name}")
    
    # Skip if not an audio file
    audio_extensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac']
    if not any(file_name.lower().endswith(ext) for ext in audio_extensions):
        print(f"Skipping non-audio file: {file_name}")
        return
    
    try:
        # Download the file to a temporary location
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_name)
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_name)[1]) as temp_file:
            temp_path = temp_file.name
            blob.download_to_filename(temp_path)
            print(f"Downloaded to temporary file: {temp_path}")
        
        # Analyze the audio
        print("Starting audio analysis...")
        analysis_result = analyze_audio(temp_path)
        
        # Clean up temporary file
        os.unlink(temp_path)
        
        # Add metadata
        analysis_result['file_name'] = file_name
        analysis_result['bucket_name'] = bucket_name
        analysis_result['processed_at'] = datetime.utcnow().isoformat()
        analysis_result['file_size_bytes'] = blob.size
        
        # Store results in Firestore
        doc_id = file_name.replace('/', '_').replace('.', '_')
        db.collection('audio_analyses').document(doc_id).set(analysis_result)
        
        print(f"Analysis complete and stored in Firestore: {doc_id}")
        print(f"Results: Tempo={analysis_result['tempo_bpm']:.1f} BPM, Key={analysis_result['estimated_key']}")
        
    except Exception as e:
        error_msg = f"Error processing {file_name}: {str(e)}"
        print(error_msg)
        
        # Store error in Firestore
        doc_id = file_name.replace('/', '_').replace('.', '_')
        db.collection('audio_analyses').document(doc_id).set({
            'file_name': file_name,
            'error': str(e),
            'processed_at': datetime.utcnow().isoformat()
        })
        
        raise Exception(error_msg)