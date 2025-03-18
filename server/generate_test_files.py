import numpy as np
import wave
import os

def generate_sine_wave(frequency, duration, sample_rate=44100):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    return np.sin(2 * np.pi * frequency * t)

def save_wav(filename, audio_data, sample_rate=44100):
    with wave.open(filename, 'w') as wav_file:
        # Set parameters
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 2 bytes per sample
        wav_file.setframerate(sample_rate)
        
        # Convert float audio to int16
        audio_data = (audio_data * 32767).astype(np.int16)
        wav_file.writeframes(audio_data.tobytes())

def main():
    # Create test_data directory if it doesn't exist
    test_data_dir = os.path.join(os.path.dirname(__file__), "test_data")
    os.makedirs(test_data_dir, exist_ok=True)
    
    # Generate a test vocal track (440 Hz tone)
    vocal_data = generate_sine_wave(440, duration=8)
    save_wav(os.path.join(test_data_dir, "test_vocals.wav"), vocal_data)
    
    # Generate a test instrumental track (880 Hz tone)
    instrumental_data = generate_sine_wave(880, duration=8)
    save_wav(os.path.join(test_data_dir, "test_instrumental.wav"), instrumental_data)
    
    print("Test files generated successfully!")

if __name__ == "__main__":
    main() 