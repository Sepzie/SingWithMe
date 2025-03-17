# SingWithMe Server

This is the backend server for the SingWithMe application, which processes audio files to extract vocals, create instrumental tracks, and generate timestamped lyrics using OpenAI's Whisper API.

## Features

- Audio file upload and processing
- Vocal separation using Spleeter
- Speech-to-text transcription with OpenAI Whisper API
- Timestamped lyrics generation
- Redis-based job queue and status tracking
- Health check endpoint
- RESTful API for client integration

## Prerequisites

- Python 3.9+
- Redis server
- FFmpeg
- Spleeter API service running (see [Spleeter API setup](#spleeter-api-setup))
- OpenAI API key

## Environment Setup

1. Create a `.env` file in the server directory with the following variables:

```
OPEN_AI_API_KEY=your_openai_api_key
SPLEETER_API_URL=http://localhost:8000
REDIS_URL=redis://redis:6379
```

2. Create a virtual environment and install dependencies:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running the Server

### Development Mode

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --workers 4
```

### Using Docker

```bash
docker-compose up -d
```

## API Endpoints

### Health Check

```
GET /health
```

Returns the health status of the server, including Redis connectivity.

### Upload Audio

```
POST /api/upload
```

Upload an MP3 or WAV file for processing. Returns a job ID for tracking.

### Check Job Status

```
GET /api/status/{job_id}
```

Get the current status of a processing job.

### Get Processed Tracks

```
GET /api/tracks/{job_id}
```

Get the processed vocal track, instrumental track, and timestamped lyrics.

## Testing

The project includes comprehensive tests for both basic functionality and OpenAI integration.

### Running Tests

Use the provided scripts to run tests:

- On Linux/Mac:
  ```bash
  ./run_tests.sh
  ```

- On Windows:
  ```powershell
  .\run_tests.ps1
  ```

### Test Categories

- **Basic Tests**: Test the API endpoints and Redis integration
- **OpenAI Integration Tests**: Test the Whisper API integration (requires API key)

## Spleeter API Setup

The server requires a running Spleeter API service for vocal separation. You can set up the Spleeter API using the following steps:

1. Clone the Spleeter API repository
2. Follow the setup instructions in the Spleeter API README
3. Ensure the service is running on the URL specified in your `.env` file

## Project Structure

```
server/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── .env                 # Environment variables (create this)
├── uploads/             # Directory for uploaded files
├── outputs/             # Directory for processed outputs
├── tests/               # Test directory
│   ├── test_main.py     # API endpoint tests
│   ├── test_openai_integration.py  # OpenAI integration tests
│   └── assets/          # Test assets (audio files, etc.)
├── run_tests.sh         # Bash script for running tests
└── run_tests.ps1        # PowerShell script for running tests
```

## Error Handling

The server includes robust error handling for:

- API connection issues
- File processing errors
- OpenAI API errors
- Redis connection issues

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 