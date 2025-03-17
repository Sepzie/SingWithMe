# SingWithMe

SingWithMe is an application that processes audio files to extract vocals, create instrumental tracks, and generate timestamped lyrics using vocal separation and speech recognition technologies.

## Architecture

The application consists of three main components:

1. **Main Server**: FastAPI application that handles file uploads, job management, and integration with OpenAI's Whisper API
2. **Spleeter Service**: Separate service for vocal separation using Deezer's Spleeter library
3. **Redis**: For job queue management and status tracking

## Features

- Audio file upload and processing
- Vocal separation from instrumental tracks
- Speech-to-text transcription with timestamped lyrics
- Job status tracking and management
- RESTful API for client integration

## Prerequisites

- Docker and Docker Compose
- OpenAI API key
- 4GB+ RAM (8GB+ recommended)

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/SingWithMe.git
cd SingWithMe
```

2. Create a `.env` file in the root directory:
```
OPEN_AI_API_KEY=your_openai_api_key
```

3. Start the services:
```bash
docker-compose up -d
```

4. Access the services:
   - Main API: http://localhost:5000
   - Spleeter Service: http://localhost:8000

## API Endpoints

### Main Server (port 5000)

- `GET /health`: Check server health
- `POST /api/upload`: Upload an audio file for processing
- `GET /api/status/{job_id}`: Check job status
- `GET /api/tracks/{job_id}`: Get processed tracks and lyrics

### Spleeter Service (port 8000)

- `GET /health`: Check service health
- `POST /separate`: Separate vocals from an audio file

## Development

For development, the Docker Compose configuration mounts the source code directories into the containers and enables auto-reload, so you can make changes to the code without rebuilding the containers.

### Running Tests

```bash
cd server
./run_tests.sh  # Linux/Mac
.\run_tests.ps1  # Windows
```

## Project Structure

```
SingWithMe/
├── docker-compose.yml      # Main Docker Compose configuration
├── server/                 # Main FastAPI application
│   ├── main.py             # Main application code
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Docker configuration
│   ├── tests/              # Test directory
│   └── README.md           # Server documentation
├── spleeter_service/       # Spleeter service for vocal separation
│   ├── main.py             # Spleeter service code
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Docker configuration
│   └── README.md           # Spleeter service documentation
└── README.md               # Main documentation
```

## License

[MIT License](LICENSE)

## Acknowledgements

- [OpenAI Whisper](https://github.com/openai/whisper) for speech recognition
- [Deezer Spleeter](https://github.com/deezer/spleeter) for audio source separation
- [FastAPI](https://fastapi.tiangolo.com/) for the API framework 