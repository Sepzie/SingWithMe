#!/bin/bash

# Activate virtual environment
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate || source venv/Scripts/activate
else
    echo "Virtual environment not found. Creating one..."
    python -m venv venv
    source venv/bin/activate || source venv/Scripts/activate
    
    echo "Installing dependencies..."
    pip install -r requirements.txt
    pip install pytest pytest-asyncio
fi

# Run tests
echo "Running basic tests..."
pytest -v

# Provide option to run OpenAI tests
echo ""
echo "Do you want to run OpenAI integration tests? (y/n)"
read -r run_openai

if [ "$run_openai" = "y" ] || [ "$run_openai" = "Y" ]; then
    echo "Running OpenAI integration tests..."
    pytest -v -m openai
fi

# Deactivate virtual environment
deactivate 