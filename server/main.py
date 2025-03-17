from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import uuid
import aiofiles
import json
from typing import Optional, Dict, List
import aiohttp
import redis
from dotenv import load_dotenv
import openai  # Import only the openai module
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import asyncio
import subprocess
import sys

load_dotenv()

# Check if ffmpeg is available for audio conversion
try:
    ffmpeg_version = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
    print(f"[INFO] ffmpeg is available: {ffmpeg_version.stdout.splitlines()[0]}")
except Exception as e:
    print(f"[WARNING] ffmpeg not found. Audio conversion fallback will not work: {e}")
    print("[WARNING] Please install ffmpeg for better audio compatibility with Whisper API")

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # All active connections
        self.active_connections: List[WebSocket] = []
        # Mapping of job_id to list of connections
        self.job_subscriptions: Dict[str, List[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket client connected. Total connections: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        # Remove from job subscriptions
        for job_id, connections in list(self.job_subscriptions.items()):
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    del self.job_subscriptions[job_id]
        print(f"WebSocket client disconnected. Remaining connections: {len(self.active_connections)}")
    
    def subscribe_to_job(self, job_id: str, websocket: WebSocket):
        if job_id not in self.job_subscriptions:
            self.job_subscriptions[job_id] = []
        if websocket not in self.job_subscriptions[job_id]:
            self.job_subscriptions[job_id].append(websocket)
            print(f"Client subscribed to job {job_id}. Total subscribers: {len(self.job_subscriptions[job_id])}")
            
    async def broadcast_to_job(self, job_id: str, message: dict):
        if job_id in self.job_subscriptions:
            connections = self.job_subscriptions[job_id].copy()
            print(f"Broadcasting to {len(connections)} clients for job {job_id}: {message}")
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending message to client: {str(e)}")
                    # Don't disconnect here, handle in the main loop

# Create connection manager instance
manager = ConnectionManager()

# Configure OpenAI - use the module-level configuration
api_key = os.getenv("OPEN_AI_API_KEY")
openai.api_key = api_key  # Set the API key at the module level

# Create a simple function to call the API
async def transcribe_audio(audio_file_path):
    # This is a blocking operation, so we'll run it in a thread pool
    import asyncio
    loop = asyncio.get_event_loop()
    
    def _transcribe():
        print(f"[DEBUG] Transcribing audio file: {audio_file_path}")
        print(f"[DEBUG] File exists: {os.path.exists(audio_file_path)}")
        print(f"[DEBUG] File size: {os.path.getsize(audio_file_path)} bytes")
        
        # Debug information about the file
        try:
            import wave
            try:
                with wave.open(audio_file_path, 'rb') as wave_file:
                    channels = wave_file.getnchannels()
                    sample_width = wave_file.getsampwidth()
                    frame_rate = wave_file.getframerate()
                    frames = wave_file.getnframes()
                    duration = frames / frame_rate
                    print(f"[DEBUG] WAV file details: channels={channels}, sample_width={sample_width}, frame_rate={frame_rate}, frames={frames}, duration={duration:.2f}s")
            except Exception as wave_err:
                print(f"[DEBUG] Not a valid WAV file or error reading WAV metadata: {str(wave_err)}")
                
                # Try with FFmpeg if available
                import subprocess
                try:
                    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 
                                            'format=duration,size,bit_rate:stream=codec_name,codec_type,sample_rate,channels,bits_per_sample', 
                                            '-of', 'json', audio_file_path], 
                                           capture_output=True, text=True)
                    print(f"[DEBUG] FFprobe result: {result.stdout}")
                except Exception as ffmpeg_err:
                    print(f"[DEBUG] Error running ffprobe: {str(ffmpeg_err)}")
        except ImportError:
            print("[DEBUG] Wave module not available for debugging")
            
        try:
            print("[DEBUG] Opening file for Whisper API...")
            with open(audio_file_path, "rb") as audio_file:
                # Try to read first few bytes to verify file access
                first_bytes = audio_file.read(16)
                audio_file.seek(0)  # Reset to beginning
                print(f"[DEBUG] First 16 bytes of file: {first_bytes.hex()}")
                
                print("[DEBUG] Calling Whisper API...")
                # Use the module-level API
                response = openai.Audio.transcribe(
                    "whisper-1",
                    audio_file,
                    response_format="verbose_json",
                    file_format=os.path.splitext(audio_file_path)[1][1:].lower()  # Extract format from filename
                )
                print("[DEBUG] Whisper API call completed successfully")
                return response
        except Exception as e:
            print(f"[DEBUG] Error in Whisper API call: {type(e).__name__}: {str(e)}")
            raise
    
    # Run the blocking operation in a thread pool
    return await loop.run_in_executor(None, _transcribe)

SPLEETER_API_URL = os.getenv("SPLEETER_API_URL", "http://localhost:8000")

# Configure Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
redis_client = redis.from_url(REDIS_URL)

# Storage paths
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

class ProcessingStatus(BaseModel):
    state: str
    progress: Optional[float] = None
    error: Optional[str] = None

# Use Redis for job storage
def get_job_status(job_id: str) -> Optional[ProcessingStatus]:
    data = redis_client.get(f"job:{job_id}")
    if data:
        data = json.loads(data)
        return ProcessingStatus(**data)
    return None

def set_job_status(job_id: str, status: ProcessingStatus):
    redis_client.set(f"job:{job_id}", status.json())
    
    # Notify WebSocket clients about the update
    if status.state == "completed" or status.state == "failed":
        event_type = "processing_complete" if status.state == "completed" else "processing_error"
        print(f"Job {job_id} {status.state}. Sending {event_type} event to WebSocket clients.")
        asyncio.create_task(manager.broadcast_to_job(
            job_id, 
            {
                "event": event_type,
                "jobId": job_id,
                "status": json.loads(status.json())
            }
        ))
    else:
        # Send progress updates
        print(f"Job {job_id} progress update: {status.progress}. Sending status_update event.")
        asyncio.create_task(manager.broadcast_to_job(
            job_id, 
            {
                "event": "status_update",
                "jobId": job_id,
                "status": json.loads(status.json())
            }
        ))

@app.get("/health")
async def health_check():
    """Check the health of the service and its dependencies."""
    try:
        # Check Redis connection
        redis_healthy = redis_client.ping()
        if not redis_healthy:
            return JSONResponse(
                status_code=503,
                content={"status": "unhealthy", "details": "Redis connection failed"}
            )
        
        return {"status": "healthy"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "details": str(e)}
        )

async def save_upload_file(upload_file: UploadFile, destination: str):
    async with aiofiles.open(destination, 'wb') as out_file:
        content = await upload_file.read()
        await out_file.write(content)

async def process_audio(job_id: str, input_path: str):
    try:
        # Create output directory for this job
        job_output_dir = os.path.join(OUTPUT_DIR, job_id)
        os.makedirs(job_output_dir, exist_ok=True)

        # Update job status
        set_job_status(job_id, ProcessingStatus(state="processing", progress=0.1))

        # Send file to Spleeter service
        async with aiohttp.ClientSession() as session:
            # Prepare the file for upload
            data = aiohttp.FormData()
            data.add_field('file',
                          open(input_path, 'rb'),
                          filename=os.path.basename(input_path),
                          content_type='audio/mpeg')

            # Send request to Spleeter service
            try:
                async with session.post(f"{SPLEETER_API_URL}/separate", data=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Spleeter processing failed: {error_text}")
                    
                    # Parse the JSON response from Spleeter
                    response_data = await response.json()
                    print(f"[DEBUG] Spleeter response: {response_data}")
                    
                    # Get the separation ID and file URLs
                    separation_id = response_data.get('separation_id')
                    files = response_data.get('files', {})
                    
                    if not separation_id or not files:
                        raise Exception("Invalid response from Spleeter service - missing separation_id or files")
                    
                    print(f"[DEBUG] Spleeter separation ID: {separation_id} (Server job ID: {job_id})")
                    
                    # Download vocals file
                    vocals_url = files.get('vocals')
                    if vocals_url:
                        vocals_path = os.path.join(job_output_dir, "vocals.wav")
                        async with session.get(f"{SPLEETER_API_URL}{vocals_url}") as vocals_response:
                            if vocals_response.status == 200:
                                vocals_data = await vocals_response.read()
                                print(f"[DEBUG] Downloaded vocals, size: {len(vocals_data)} bytes")
                                with open(vocals_path, 'wb') as f:
                                    f.write(vocals_data)
                                
                                # Verify the saved file
                                if os.path.exists(vocals_path):
                                    print(f"[DEBUG] Vocals file saved at: {vocals_path}, size: {os.path.getsize(vocals_path)} bytes")
                                    
                                    # Check if it looks like a valid audio file
                                    try:
                                        with open(vocals_path, 'rb') as f:
                                            header = f.read(12)  # Read first 12 bytes
                                            print(f"[DEBUG] Vocals file header: {header.hex()}")
                                            
                                            # Basic check for WAV header
                                            if header.startswith(b'RIFF') and b'WAVE' in header:
                                                print(f"[DEBUG] Vocals file appears to have valid WAV header")
                                            else:
                                                print(f"[DEBUG] WARNING: Vocals file doesn't have expected WAV header!")
                                    except Exception as e:
                                        print(f"[DEBUG] Error checking vocals file header: {str(e)}")
                                else:
                                    print(f"[DEBUG] ERROR: Vocals file not found after saving!")
                            else:
                                error_text = await vocals_response.text()
                                raise Exception(f"Failed to download vocals from Spleeter: {error_text}")
                    else:
                        raise Exception("Vocals URL not found in Spleeter response")
                    
                    # Download accompaniment file
                    accompaniment_url = files.get('accompaniment')
                    if accompaniment_url:
                        accompaniment_path = os.path.join(job_output_dir, "accompaniment.wav")
                        async with session.get(f"{SPLEETER_API_URL}{accompaniment_url}") as accompaniment_response:
                            if accompaniment_response.status == 200:
                                accompaniment_data = await accompaniment_response.read()
                                print(f"[DEBUG] Downloaded accompaniment, size: {len(accompaniment_data)} bytes")
                                with open(accompaniment_path, 'wb') as f:
                                    f.write(accompaniment_data)
                                print(f"[DEBUG] Accompaniment file saved at: {accompaniment_path}")
                            else:
                                error_text = await accompaniment_response.text()
                                print(f"[WARNING] Failed to download accompaniment from Spleeter: {error_text}")
                                # Don't fail the entire job if only accompaniment fails
                    else:
                        print(f"[WARNING] Accompaniment URL not found in Spleeter response")
                    
            except aiohttp.ClientError as e:
                raise Exception(f"Connection to Spleeter service failed: {str(e)}")

        set_job_status(job_id, ProcessingStatus(state="processing", progress=0.5))

        # Process vocals with Whisper API
        try:
            vocals_path = os.path.join(job_output_dir, "vocals.wav")
            
            # Add a conversion step as a fallback if the original file has issues
            try:
                print(f"[DEBUG] Attempting to convert audio file to ensure compatibility...")
                import subprocess
                mp3_path = os.path.join(job_output_dir, "vocals_converted.mp3")
                
                # Use ffmpeg to convert the file to MP3 format
                result = subprocess.run([
                    'ffmpeg', '-y', '-i', vocals_path, 
                    '-ar', '44100',  # 44.1kHz sample rate 
                    '-ac', '1',      # Mono
                    '-c:a', 'libmp3lame', 
                    '-b:a', '128k',  # 128kbps bitrate
                    mp3_path
                ], capture_output=True, text=True)
                
                if os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 0:
                    print(f"[DEBUG] Successfully converted audio to MP3: {mp3_path}, size: {os.path.getsize(mp3_path)} bytes")
                    print(f"[DEBUG] ffmpeg stdout: {result.stdout}")
                    print(f"[DEBUG] ffmpeg stderr: {result.stderr}")
                    
                    # Use the converted file for transcription
                    transcript = await transcribe_audio(mp3_path)
                else:
                    print(f"[DEBUG] Conversion failed, falling back to original file")
                    print(f"[DEBUG] ffmpeg stdout: {result.stdout}")
                    print(f"[DEBUG] ffmpeg stderr: {result.stderr}")
                    transcript = await transcribe_audio(vocals_path)
            except Exception as conv_e:
                print(f"[DEBUG] Error in conversion attempt: {str(conv_e)}")
                # Fall back to original method if conversion fails
                transcript = await transcribe_audio(vocals_path)
            
            # Convert response to dict for easier handling
            if isinstance(transcript, dict):
                transcript_data = transcript
            else:
                # Fallback for different response types
                transcript_data = transcript
        except Exception as e:
            raise Exception(f"Whisper API transcription failed: {str(e)}")

        # Format lyrics with timestamps
        lyrics = []
        
        # Handle different response formats
        if "segments" in transcript_data:
            # Dictionary format
            for segment in transcript_data["segments"]:
                lyrics.append({
                    "startTime": segment["start"],
                    "endTime": segment["end"],
                    "text": segment["text"]
                })
        else:
            # Fallback if no segments found
            raise Exception("No segments found in transcription response")

        # Save lyrics
        with open(os.path.join(job_output_dir, "lyrics.json"), "w") as f:
            json.dump(lyrics, f)

        set_job_status(job_id, ProcessingStatus(state="completed", progress=1.0))

    except Exception as e:
        set_job_status(job_id, ProcessingStatus(state="failed", error=str(e)))
        raise

@app.post("/api/upload")
async def upload_file(file: UploadFile, background_tasks: BackgroundTasks):
    if not file.filename.endswith(('.mp3', '.wav')):
        raise HTTPException(400, "Only MP3 and WAV files are supported")

    job_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{job_id}.mp3")

    await save_upload_file(file, input_path)
    set_job_status(job_id, ProcessingStatus(state="uploaded"))
    
    background_tasks.add_task(process_audio, job_id, input_path)
    
    return {"jobId": job_id}

@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    status = get_job_status(job_id)
    if not status:
        raise HTTPException(404, "Job not found")
    return status

@app.get("/api/tracks/{job_id}")
async def get_tracks(job_id: str):
    status = get_job_status(job_id)
    if not status:
        raise HTTPException(404, "Job not found")
    
    if status.state != "completed":
        raise HTTPException(400, "Processing not completed")

    job_output_dir = os.path.join(OUTPUT_DIR, job_id)
    
    return {
        "vocal": f"/output/{job_id}/vocals.wav",
        "instrumental": f"/output/{job_id}/accompaniment.wav",
        "lyrics": json.load(open(os.path.join(job_output_dir, "lyrics.json")))
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Wait for messages from the client
            data = await websocket.receive_json()
            print(f"Received WebSocket message: {data}")
            
            # Handle subscription requests - check for both formats
            if "subscribe" in data:
                # Original format: {"subscribe": true, "jobId": "..."}
                job_id = data.get("jobId")
                if job_id:
                    manager.subscribe_to_job(job_id, websocket)
                    
                    # Send current status immediately if available
                    status = get_job_status(job_id)
                    if status:
                        await websocket.send_json({
                            "event": "status_update",
                            "jobId": job_id,
                            "status": json.loads(status.json())
                        })
            elif isinstance(data, dict) and data.get("type") == "subscribe":
                # Alternative format: {"type": "subscribe", "jobId": "..."}
                job_id = data.get("jobId")
                if job_id:
                    manager.subscribe_to_job(job_id, websocket)
                    
                    # Send current status immediately if available
                    status = get_job_status(job_id)
                    if status:
                        await websocket.send_json({
                            "event": "status_update",
                            "jobId": job_id,
                            "status": json.loads(status.json())
                        })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket)

@app.get("/api/docs", include_in_schema=False)
async def get_documentation():
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",
        title="SingWithMe API"
    )

@app.get("/api/openapi.json", include_in_schema=False)
async def get_openapi_schema():
    return get_openapi(
        title="SingWithMe API",
        version="1.0.0",
        description="API for audio processing, vocal separation, and lyrics transcription",
        routes=app.routes,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000) 