import requests
import os
import json

# URL of the Spleeter service
SPLEETER_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint of the Spleeter service."""
    response = requests.get(f"{SPLEETER_URL}/health")
    print(f"Health check status: {response.status_code}")
    print(f"Response: {response.json()}")

def test_separate():
    """Test the separate endpoint with an audio file."""
    # Path to the audio file
    audio_file = "song.mp3"  # Make sure this file exists in the same directory
    
    if not os.path.exists(audio_file):
        print(f"Error: Audio file '{audio_file}' not found.")
        return
    
    # Prepare the file for upload
    files = {
        'file': (audio_file, open(audio_file, 'rb'), 'audio/mpeg')
    }
    
    # Send the POST request
    try:
        response = requests.post(f"{SPLEETER_URL}/separate", files=files)
        
        # Check the response
        print(f"Separation status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Separation ID: {result.get('separation_id')}")
            print(f"Timing: {result.get('timing')}")
            print(f"Files: {result.get('files')}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Request failed: {str(e)}")
    finally:
        # Close the file
        files['file'][1].close()

if __name__ == "__main__":
    print("Testing Spleeter service...")
    test_health()
    print("\nTesting separation...")
    test_separate() 