# SonicForge AI - Production Dockerfile for Hosted Demucs Neural Engine
# Compatible with Hugging Face Spaces (Docker Space), Render, RunPod, Modal, and AWS EC2

FROM python:3.10-slim

# Install system audio dependencies (ffmpeg, libsndfile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOST=0.0.0.0 \
    PORT=7860 \
    DOCKER=1

# Copy dependency specifications first for layer caching
COPY requirements.txt .

# Install dependencies (CPU-optimized PyTorch by default for lightweight container; CUDA if running with nvidia-docker)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download Demucs htdemucs model weights so startup inference is instantaneous
RUN python -c "import demucs.pretrained; demucs.pretrained.get_model('htdemucs')" || true

# Copy application code
COPY server.py .

# Create storage directories
RUN mkdir -p storage/jobs && chmod -R 777 storage

# Expose standard port (7860 for Hugging Face Spaces, or overridden via $PORT on Render/Cloud)
EXPOSE 7860

# Launch server
CMD ["sh", "-c", "python -m uvicorn server:app --host 0.0.0.0 --port ${PORT:-7860}"]
