# PowerShell script to run tests

# Activate virtual environment
if (Test-Path "venv") {
    Write-Host "Activating virtual environment..."
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host "Virtual environment not found. Creating one..."
    python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    Write-Host "Installing dependencies..."
    pip install -r requirements.txt
    pip install pytest pytest-asyncio
}

# Run tests
Write-Host "Running basic tests..."
pytest -v

# Provide option to run OpenAI tests
Write-Host ""
$runOpenAI = Read-Host "Do you want to run OpenAI integration tests? (y/n)"

if ($runOpenAI -eq "y" -or $runOpenAI -eq "Y") {
    Write-Host "Running OpenAI integration tests..."
    pytest -v -m openai
}

# Deactivate virtual environment
deactivate 