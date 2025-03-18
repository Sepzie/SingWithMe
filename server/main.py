from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks, Depends, Cookie, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
import os
import uuid
import aiofiles
import json
from typing import Optional, Dict, List, Union
import aiohttp
import redis
from dotenv import load_dotenv
import openai  # Import only the openai module
# from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import asyncio
import subprocess
import sys
from fastapi.staticfiles import StaticFiles
import logging
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
import secrets

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# User models
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    
# User database (in-memory for simplicity, replace with proper database)
users_db = {}

# Check if ffmpeg is available for audio conversion
try:
    ffmpeg_version = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
    print(f"[INFO] ffmpeg is available: {ffmpeg_version.stdout.splitlines()[0]}")
except Exception as e:
    print(f"[WARNING] ffmpeg not found. Audio conversion fallback will not work: {e}")
    print("[WARNING] Please install ffmpeg for better audio compatibility with Whisper API")

# Initialize FastAPI
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage paths
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
TEST_DATA_DIR = "test_data"  # Relative to the app directory

# Create directories
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEST_DATA_DIR, exist_ok=True)

# Add test mode constant
TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"
TEST_JOB_ID = "test-123"

# Mount directories for static file serving
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")
app.mount("/test_data", StaticFiles(directory=TEST_DATA_DIR), name="test_data")

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

class ProcessingStatus(BaseModel):
    state: str
    progress: Optional[float] = None
    error: Optional[str] = None
    message: Optional[str] = None

# Use Redis for job storage
def get_job_status(job_id: str) -> Optional[ProcessingStatus]:
    data = redis_client.get(f"job:{job_id}")
    if data:
        data = json.loads(data)
        return ProcessingStatus(**data)
    return None


def set_job_status(job_id: str, status: ProcessingStatus):
    try:
        # Store status in Redis
        redis_client.set(f"job:{job_id}", status.json())
        print(f"Job {job_id} status updated: {status.state}")
    except Exception as e:
        print(f"Error in set_job_status: {e}")

# Authentication helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(username: str):
    if username in users_db:
        user_dict = users_db[username]
        return UserInDB(**user_dict)

def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except jwt.PyJWTError:
        raise credentials_exception
    user = get_user(token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user

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

# Authentication endpoints
@app.post("/api/auth/register", response_model=User)
async def register(user: UserCreate):
    if user.username in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    hashed_password = get_password_hash(user.password)
    user_id = str(uuid.uuid4())
    user_obj = UserInDB(
        id=user_id,
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        created_at=datetime.utcnow()
    )
    
    # Store in the in-memory db (in a real app, you'd use a database)
    users_db[user.username] = user_obj.dict()
    
    # Return user without the hashed_password
    return User(
        id=user_id,
        username=user.username,
        email=user.email,
        created_at=user_obj.created_at
    )

@app.post("/api/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

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
                # Send the actual request
                async with session.post(f"{SPLEETER_API_URL}/separate", data=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Spleeter processing failed: {error_text}")
                    
                    # Parse the JSON response from Spleeter
                    response_data = await response.json()
                    print(f"[DEBUG] Spleeter response: {response_data}")
                    
                    # Update progress
                    set_job_status(job_id, ProcessingStatus(state="processing", progress=0.5))
                    
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
                    
            except Exception as e:
                print(f"[DEBUG] Error: {str(e)}")
                set_job_status(job_id, ProcessingStatus(state="failed", error=str(e)))
                raise e

        set_job_status(job_id, ProcessingStatus(state="processing", progress=0.7))

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

# helper function to broadcast completed status after delay
async def delayed_status_update(job_id: str):
    await asyncio.sleep(3)  # 3 second delay
    print(f"Setting completed status for test job after 3 seconds")
    set_job_status(job_id, ProcessingStatus(state="completed", progress=1.0))

@app.post("/api/upload")
async def upload_file(
    file: UploadFile, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    if TEST_MODE:
        # Set completed status after 3 seconds
        job_id = TEST_JOB_ID
        set_job_status(TEST_JOB_ID, ProcessingStatus(state="uploaded"))
        asyncio.create_task(delayed_status_update(job_id))
        return {"jobId": TEST_JOB_ID, "userId": current_user.id}
        
    if not file.filename.endswith(('.mp3', '.wav')):
        raise HTTPException(400, "Only MP3 and WAV files are supported")

    job_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{job_id}.mp3")

    await save_upload_file(file, input_path)
    set_job_status(job_id, ProcessingStatus(state="uploaded"))
    
    # Add user ID information to the job in Redis
    project_data = {
        "jobId": job_id,
        "userId": current_user.id,
        "username": current_user.username,
        "filename": file.filename,
        "createdAt": datetime.utcnow().isoformat()
    }
    # Store project data
    redis_client.set(f"project:{job_id}", json.dumps(project_data))
    
    asyncio.create_task(process_audio(job_id, input_path))
    
    return {"jobId": job_id, "userId": current_user.id}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if TEST_MODE:
        return ProcessingStatus(
            state="completed",
            progress=1.0,
            error=None
        )
        
    status = get_job_status(job_id)
    if not status:
        raise HTTPException(404, "Job not found")
    return status

@app.get("/api/tracks/{job_id}")
async def get_tracks(job_id: str):
    if TEST_MODE:
        # List files in test_data directory
        test_files = os.listdir(TEST_DATA_DIR)
        print(f"Available test files: {test_files}")
        
        # Find the first vocal and instrumental files
        vocal_file = "vocals.wav"
        instrumental_file = "accompaniment.wav"
        lyrics_file = "lyrics.json"


        return {
            "vocal": f"/test_data/{vocal_file}",
            "instrumental": f"/test_data/{instrumental_file}",
            "lyrics": json.load(open(os.path.join(TEST_DATA_DIR, lyrics_file)))
        }

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

@app.get("/api/projects")
async def get_user_projects(current_user: User = Depends(get_current_active_user)):
    """Get all projects for the current user."""
    projects = []
    
    # Get all keys matching the project pattern
    for key in redis_client.scan_iter("project:*"):
        project_data = redis_client.get(key)
        if project_data:
            project = json.loads(project_data)
            # Only include projects that belong to the current user
            if project.get("userId") == current_user.id:
                # Get processing status
                job_id = project.get("jobId")
                status = get_job_status(job_id)
                if status:
                    project["status"] = status.state
                    project["progress"] = status.progress
                else:
                    project["status"] = "unknown"
                projects.append(project)
    
    # Sort projects by creation date (newest first)
    projects.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    
    return {"projects": projects}

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
    print("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=5000) 