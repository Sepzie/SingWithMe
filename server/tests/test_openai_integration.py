import pytest
import os
from dotenv import load_dotenv
from openai import OpenAI
import wave
import numpy as np
import json

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPEN_AI_API_KEY"))

# Mark all tests to be skipped by default
pytestmark = pytest.mark.skip(reason="OpenAI integration tests are skipped by default. Run with --openai flag to enable.")

def create_test_wav(filename: str, duration_seconds: float = 2.0, sample_rate: int = 44100, frequency: float = 440.0, amplitude: float = 0.5):
    """Create a test WAV file with a simple sine wave."""
    t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds))
    samples = amplitude * np.sin(2 * np.pi * frequency * t)
    samples = (samples * 32767).astype(np.int16)

    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 2 bytes per sample
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(samples.tobytes())

@pytest.fixture
def test_audio_file():
    """Create a temporary test audio file."""
    filename = "test_audio.wav"
    create_test_wav(filename)
    yield filename
    # Cleanup
    if os.path.exists(filename):
        os.remove(filename)

@pytest.fixture
def speech_file():
    """Fixture to provide the path to the speech test file."""
    return "tests/assets/speech.wav"

@pytest.mark.skipif(not os.getenv("OPEN_AI_API_KEY"), reason="OpenAI API key not found")
def test_whisper_api_real(test_audio_file):
    """Test actual interaction with Whisper API."""
    try:
        with open(test_audio_file, "rb") as audio:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                response_format="verbose_json"
            )
        
        # Verify response structure
        assert hasattr(response, "segments")
        for segment in response.segments:
            assert hasattr(segment, "start")
            assert hasattr(segment, "end")
            assert hasattr(segment, "text")
            assert isinstance(segment.start, (int, float))
            assert isinstance(segment.end, (int, float))
            assert isinstance(segment.text, str)
            
    except Exception as e:
        pytest.fail(f"Whisper API call failed: {str(e)}")

@pytest.mark.skipif(not os.getenv("OPEN_AI_API_KEY"), reason="OpenAI API key not found")
def test_whisper_api_with_silence():
    """Test how Whisper handles silent audio."""
    filename = "silent_audio.wav"
    create_test_wav(filename, frequency=0.0)  # Create silent audio
    
    try:
        with open(filename, "rb") as audio:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                response_format="verbose_json"
            )
        
        # Even with silence, we should get a valid response structure
        assert hasattr(response, "segments")
        
    finally:
        if os.path.exists(filename):
            os.remove(filename)

@pytest.mark.skipif(not os.getenv("OPEN_AI_API_KEY"), reason="OpenAI API key not found")
def test_whisper_api_with_different_formats():
    """Test Whisper API with different audio formats and parameters."""
    test_cases = [
        {"duration_seconds": 1.0, "sample_rate": 44100},
        {"duration_seconds": 2.0, "sample_rate": 22050},
        {"duration_seconds": 0.5, "sample_rate": 16000}
    ]
    
    for case in test_cases:
        filename = f"test_audio_{case['sample_rate']}.wav"
        create_test_wav(filename, **case)
        
        try:
            with open(filename, "rb") as audio:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio,
                    response_format="verbose_json"
                )
            
            assert hasattr(response, "segments")
            
        finally:
            if os.path.exists(filename):
                os.remove(filename)

@pytest.mark.skipif(not os.getenv("OPEN_AI_API_KEY"), reason="OpenAI API key not found")
def test_whisper_api_with_speech(speech_file):
    """Test Whisper API with actual speech audio."""
    try:
        with open(speech_file, "rb") as audio:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"]
            )
        
        # Save response for debugging and verification
        with open("whisper_response.json", "w") as f:
            json.dump(response.model_dump(), f, indent=2)
        
        # Basic structure verification
        assert hasattr(response, "segments")
        assert len(response.segments) > 0
        
        # Verify each segment
        for segment in response.segments:
            # Required fields
            assert hasattr(segment, "start")
            assert hasattr(segment, "end")
            assert hasattr(segment, "text")
            
            # Type checks
            assert isinstance(segment.start, (int, float))
            assert isinstance(segment.end, (int, float))
            assert isinstance(segment.text, str)
            
            # Logical checks
            assert segment.end > segment.start
            assert len(segment.text.strip()) > 0
            
            # Print segment for manual verification
            print(f"\nSegment {segment.start:.2f}s - {segment.end:.2f}s:")
            print(f"Text: {segment.text}")
            
    except Exception as e:
        pytest.fail(f"Whisper API call failed: {str(e)}")

@pytest.mark.skipif(not os.getenv("OPEN_AI_API_KEY"), reason="OpenAI API key not found")
def test_whisper_api_language_detection(speech_file):
    """Test Whisper API's language detection capabilities."""
    try:
        with open(speech_file, "rb") as audio:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                response_format="verbose_json"
            )
        
        # Verify language detection
        assert hasattr(response, "language")
        print(f"\nDetected language: {response.language}")
        
    except Exception as e:
        pytest.fail(f"Whisper API language detection failed: {str(e)}")

@pytest.mark.skipif(not os.getenv("OPEN_AI_API_KEY"), reason="OpenAI API key not found")
def test_whisper_api_word_timestamps(speech_file):
    """Test Whisper API's word-level timestamp capabilities."""
    try:
        with open(speech_file, "rb") as audio:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"]  # Request both word and segment timestamps
            )
            
            # First verify we got a response
            assert response is not None, "No response received from Whisper API"
            
            # Print raw response for debugging
            print("\nRaw response type:", type(response))
            print("\nRaw response attributes:", dir(response))
            
            # Convert response to dict if it's not already
            try:
                response_data = response.model_dump() if hasattr(response, 'model_dump') else response
                print("\nResponse data type after conversion:", type(response_data))
            except Exception as e:
                print(f"\nError converting response: {str(e)}")
                response_data = response
            
            # Save the response for debugging
            with open("whisper_debug_response.json", "w") as f:
                if isinstance(response_data, dict):
                    json.dump(response_data, f, indent=2)
                else:
                    json.dump({"raw_response": str(response_data)}, f, indent=2)
            
            # Basic validation
            assert hasattr(response, "text"), "Response missing 'text' field"
            assert isinstance(response.text, str), "Text field is not a string"
            print(f"\nTranscribed text: {response.text}")
            
            # Check for timestamps
            if hasattr(response, "segments") and response.segments:
                print("\nSegments found in response")
                for segment in response.segments:
                    print(f"\nSegment: {segment.start:.2f}s - {segment.end:.2f}s")
                    print(f"Text: {segment.text}")
                    
                    if hasattr(segment, "words") and segment.words:
                        print("Words in segment:")
                        for word in segment.words:
                            print(f"  {word.word}: {word.start:.2f}s - {word.end:.2f}s")
            else:
                print("\nNo segments found in response")
            
    except Exception as e:
        pytest.fail(f"Whisper API word timestamps test failed: {str(e)}\nResponse data: {response_data if 'response_data' in locals() else 'No response data available'}")

def test_initial_transcription():
    """Initial test to get transcription and timestamps for manual verification."""
    speech_file = "tests/assets/speech.wav"
    
    try:
        with open(speech_file, "rb") as audio:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"]
            )
        
        # Save full response for future reference
        with open("tests/assets/reference_response.json", "w") as f:
            json.dump(response.model_dump(), f, indent=2)
        
        # Print segments for manual verification
        print("\nTranscription segments:")
        print("=" * 50)
        for segment in response.segments:
            print(f"\nTimestamp: {segment.start:.2f}s - {segment.end:.2f}s")
            print(f"Text: {segment.text}")
            
            # Print word-level timestamps if available
            if hasattr(segment, 'words'):
                print("\nWord timestamps:")
                for word in segment.words:
                    print(f"  {word.word}: {word.start:.2f}s - {word.end:.2f}s")
        
        print("\nDetected language:", getattr(response, 'language', 'Not specified'))
        print("\nFull response saved to: tests/assets/reference_response.json")
        
    except Exception as e:
        pytest.fail(f"Whisper API call failed: {str(e)}")

def test_whisper_against_reference():
    """Compare Whisper transcription against saved reference to ensure consistency."""
    speech_file = "tests/assets/speech.wav"
    reference_file = "tests/assets/reference_response.json"
    
    # Load reference response
    with open(reference_file, "r") as f:
        reference = json.load(f)
    
    try:
        with open(speech_file, "rb") as audio:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"]
            )
            current = response.model_dump()
            
            # Compare key attributes
            assert current["language"] == reference["language"], "Language detection changed"
            assert current["text"].strip() == reference["text"].strip(), "Main transcription text changed"
            
            # Compare segments (allowing small timing differences)
            assert len(current["segments"]) == len(reference["segments"]), "Number of segments changed"
            
            for curr_seg, ref_seg in zip(current["segments"], reference["segments"]):
                # Text should match exactly
                assert curr_seg["text"].strip() == ref_seg["text"].strip(), f"Segment text mismatch: {curr_seg['text']} != {ref_seg['text']}"
                
                # Timings should be close (within 0.1 seconds)
                assert abs(curr_seg["start"] - ref_seg["start"]) < 0.1, f"Start time diverged too much: {curr_seg['start']} vs {ref_seg['start']}"
                assert abs(curr_seg["end"] - ref_seg["end"]) < 0.1, f"End time diverged too much: {curr_seg['end']} vs {ref_seg['end']}"
                
    except Exception as e:
        pytest.fail(f"Whisper API comparison failed: {str(e)}")

def test_whisper_basic_transcription(speech_file):
    """Basic test of Whisper transcription."""
    try:
        with open(speech_file, "rb") as audio:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                response_format="text"  # Simple text response for basic testing
            )
            
            assert response is not None
            assert isinstance(response, str)
            assert len(response) > 0
            print(f"\nTranscribed text: {response}")
            
    except Exception as e:
        pytest.fail(f"Whisper API basic transcription failed: {str(e)}")

def test_whisper_detailed_transcription(speech_file):
    """Test Whisper transcription with detailed output."""
    try:
        with open(speech_file, "rb") as audio:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"]
            )
            
            # Save response for reference
            with open("tests/assets/reference_response.json", "w") as f:
                json.dump(response.model_dump(), f, indent=2)
            
            print(f"\nTranscribed text: {response.text}")
            print(f"Language detected: {response.language}")
            
            if hasattr(response, "segments"):
                for segment in response.segments:
                    print(f"\nSegment {segment.start:.2f}s - {segment.end:.2f}s:")
                    print(f"Text: {segment.text}")
            
    except Exception as e:
        pytest.fail(f"Whisper API detailed transcription failed: {str(e)}")

def pytest_configure(config):
    """Add the openai marker."""
    config.addinivalue_line("markers", "openai: mark test as an OpenAI integration test")

if __name__ == "__main__":
    pytest.main(["-v"]) 