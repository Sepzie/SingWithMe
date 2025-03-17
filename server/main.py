from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import uuid
import aiofiles
import json
from typing import Optional
import aiohttp
import redis
from dotenv import load_dotenv
import openai  # Import only the openai module

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure OpenAI - use the module-level configuration
api_key = os.getenv("OPEN_AI_API_KEY")
openai.api_key = api_key  # Set the API key at the module level

# Create a simple function to call the API
async def transcribe_audio(audio_file_path):
    # This is a blocking operation, so we'll run it in a thread pool
    import asyncio
    loop = asyncio.get_event_loop()
    
    def _transcribe():
        with open(audio_file_path, "rb") as audio_file:
            # Use the module-level API
            return openai.Audio.transcribe(
                "whisper-1",
                audio_file,
                response_format="verbose_json"
            )
    
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
                    
                    # Save the vocals file
                    vocals_path = os.path.join(job_output_dir, "vocals.wav")
                    with open(vocals_path, 'wb') as f:
                        f.write(await response.read())
            except aiohttp.ClientError as e:
                raise Exception(f"Connection to Spleeter service failed: {str(e)}")

        set_job_status(job_id, ProcessingStatus(state="processing", progress=0.5))

        # Process vocals with Whisper API
        try:
            # Use our async function to transcribe the audio
            transcript = await transcribe_audio(os.path.join(job_output_dir, "vocals.wav"))
            
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000) 