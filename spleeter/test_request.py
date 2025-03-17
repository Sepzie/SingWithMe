import requests
import os
from binascii import unhexlify

# Create output directory
os.makedirs('output', exist_ok=True)

# Open the audio file
files = {
    'file': ('song.mp3', open('song.mp3', 'rb'), 'audio/mpeg')
}

# Send POST request to the separation endpoint
response = requests.post('http://localhost:5000/separate', files=files)
data = response.json()

if response.status_code == 200:
    # Save vocals
    with open('output/vocals.wav', 'wb') as f:
        f.write(unhexlify(data['vocals']))
    print("Saved vocals to output/vocals.wav")
    
    # Save accompaniment
    with open('output/accompaniment.wav', 'wb') as f:
        f.write(unhexlify(data['accompaniment']))
    print("Saved accompaniment to output/accompaniment.wav")
else:
    print("Error:", data.get('error', 'Unknown error')) 