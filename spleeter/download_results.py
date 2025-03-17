import requests
import os

# The separation ID from the previous response
separation_id = '0690b1fc-23bb-4512-ad27-5d775bca72f4'

# Create output directory if it doesn't exist
os.makedirs('output', exist_ok=True)

# Download both stems
for stem in ['vocals', 'accompaniment']:
    url = f'http://localhost:5000/download/{separation_id}/{stem}'
    response = requests.get(url)
    
    if response.status_code == 200:
        output_path = f'output/{stem}.wav'
        with open(output_path, 'wb') as f:
            f.write(response.content)
        print(f'Downloaded {stem} to {output_path}')
    else:
        print(f'Failed to download {stem}: {response.text}') 