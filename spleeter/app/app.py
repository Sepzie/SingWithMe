from flask import Flask, request, jsonify, send_file
from spleeter.separator import Separator
import os
import uuid
import time

app = Flask(__name__)

# Configure folders for uploads and separated files
UPLOAD_FOLDER = '/audio'
OUTPUT_FOLDER = '/output'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'flac', 'm4a'}

# Create necessary directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/separate', methods=['POST'])
def separate_audio():
    start_time = time.time()
    timing = {}
    input_path = None
    
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    try:
        # Generate unique ID for this separation
        separation_id = str(uuid.uuid4())
        
        # Save uploaded file
        save_start = time.time()
        input_path = os.path.join(UPLOAD_FOLDER, f"{separation_id}.wav")
        file.save(input_path)
        timing['file_save'] = f"{time.time() - save_start:.2f}s"
        
        # Initialize separator
        init_start = time.time()
        separator = Separator('spleeter:2stems')
        timing['model_init'] = f"{time.time() - init_start:.2f}s"
        
        # Create output directory
        output_path = os.path.join(OUTPUT_FOLDER, separation_id)
        os.makedirs(output_path, exist_ok=True)
        
        # Perform separation
        separation_start = time.time()
        separator.separate_to_file(input_path, output_path)
        timing['separation'] = f"{time.time() - separation_start:.2f}s"
        
        # Clean up input file
        if os.path.exists(input_path):
            os.remove(input_path)
        
        timing['total'] = f"{time.time() - start_time:.2f}s"
        
        return jsonify({
            "status": "success",
            "message": "Audio separation completed",
            "separation_id": separation_id,
            "timing": timing,
            "files": {
                "vocals": f"/download/{separation_id}/vocals.wav",
                "accompaniment": f"/download/{separation_id}/accompaniment.wav"
            }
        })
        
    except Exception as e:
        app.logger.error(f"Error during separation: {str(e)}")
        if input_path and os.path.exists(input_path):
            os.remove(input_path)
        return jsonify({"error": str(e)}), 500

@app.route('/download/<separation_id>/<filename>')
def download_file(separation_id, filename):
    if not filename.endswith('.wav'):
        filename = f"{filename}.wav"
    
    # Check both the direct path and nested path
    file_path = os.path.join(OUTPUT_FOLDER, separation_id, filename)
    nested_path = os.path.join(OUTPUT_FOLDER, separation_id, separation_id, filename)
    
    if os.path.exists(nested_path):
        return send_file(nested_path, as_attachment=True, download_name=filename)
    elif os.path.exists(file_path):
        return send_file(file_path, as_attachment=True, download_name=filename)
    
    return jsonify({"error": "File not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 