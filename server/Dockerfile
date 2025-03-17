FROM python:3.8-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install numpy first with compatible version
RUN pip install --no-cache-dir "numpy>=1.16.0,<1.19.0"

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8000

# Command will be overridden by docker-compose for development
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 