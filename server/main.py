from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import shutil
from pathlib import Path
import uuid
import logging
from spleeter.separator import Separator

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
UPLOAD_DIR = Path("/app/uploads")
OUTPUT_DIR = Path("/app/outputs")

# Create directories if they don't exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Initialize Spleeter separator
separator = Separator('spleeter:2stems')

@app.post("/separate")
async def separate_audio(file: UploadFile = File(...)):
    try:
        # Generate unique ID for this process
        process_id = str(uuid.uuid4())
        
        # Create process-specific directories
        process_upload_dir = UPLOAD_DIR / process_id
        process_output_dir = OUTPUT_DIR / process_id
        
        # Ensure directories exist with proper permissions
        process_upload_dir.mkdir(parents=True, exist_ok=True)
        process_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save uploaded file
        input_path = process_upload_dir / file.filename
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"File saved: {input_path}")

        try:
            # Process the audio file
            separator.separate_to_file(
                str(input_path),
                str(process_output_dir),
                filename_format='{instrument}.wav',
                codec='wav'
            )

            # Find the vocals file
            vocals_file = process_output_dir / "vocals.wav"
            if not vocals_file.exists():
                raise HTTPException(status_code=500, detail="Separation failed: No vocals file generated")

            logger.info(f"Processing complete. Output file: {vocals_file}")

            # Ensure the file exists before trying to send it
            if not vocals_file.is_file():
                raise HTTPException(status_code=500, detail="Output file not found after processing")

            return FileResponse(
                str(vocals_file),
                media_type="audio/wav",
                filename=f"vocals_{file.filename.replace('.mp3', '.wav')}"
            )

        except Exception as e:
            logger.error(f"Error during separation: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Separation failed: {str(e)}")

    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Cleanup
        try:
            if process_upload_dir.exists():
                shutil.rmtree(process_upload_dir)
            if process_output_dir.exists():
                shutil.rmtree(process_output_dir)
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "upload_dir": str(UPLOAD_DIR), "output_dir": str(OUTPUT_DIR)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 