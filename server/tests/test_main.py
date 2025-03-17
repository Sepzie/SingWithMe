import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
import json
import os
import sys

# Add the parent directory to the Python path so we can import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

@pytest.fixture
def mock_redis():
    with patch('main.redis_client') as mock:
        yield mock

@pytest.fixture
def mock_background_tasks():
    with patch('fastapi.BackgroundTasks.add_task') as mock:
        yield mock

@pytest.fixture
def test_audio_file():
    return {
        'file': ('test.mp3', b'mock audio data', 'audio/mpeg')
    }

def test_health_check(mock_redis):
    """Test the health check endpoint with Redis mocked."""
    # Mock Redis ping to return True (healthy)
    mock_redis.ping.return_value = True
    
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
    
    # Test when Redis is down
    mock_redis.ping.return_value = False
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json() == {"status": "unhealthy", "details": "Redis connection failed"}

def test_upload_invalid_file():
    response = client.post(
        "/api/upload",
        files={'file': ('test.txt', b'not an audio file', 'text/plain')}
    )
    assert response.status_code == 400
    assert "Only MP3 and WAV files are supported" in response.json()['detail']

def test_upload_valid_file(mock_redis, mock_background_tasks, test_audio_file):
    """Test basic file upload functionality."""
    # Mock the background task
    mock_background_tasks.return_value = None
    
    # Mock Redis set operation
    mock_redis.set.return_value = True
    
    # Test file upload
    response = client.post("/api/upload", files=test_audio_file)
    assert response.status_code == 200
    assert 'jobId' in response.json()
    
    # Verify Redis was called to store initial job status
    mock_redis.set.assert_called_once()
    # Verify background task was added
    mock_background_tasks.assert_called_once()

def test_get_nonexistent_job(mock_redis):
    mock_redis.get.return_value = None
    response = client.get("/api/status/nonexistent-job")
    assert response.status_code == 404
    assert "Job not found" in response.json()['detail']

def test_get_job_status(mock_redis):
    """Test getting job status."""
    mock_redis.get.return_value = json.dumps({
        "state": "processing",
        "progress": 0.5,
        "error": None
    })
    response = client.get("/api/status/test-job")
    assert response.status_code == 200
    data = response.json()
    assert data['state'] == "processing"
    assert data['progress'] == 0.5
    assert data['error'] is None 