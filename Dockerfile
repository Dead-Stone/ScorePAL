# ScorePAL Backend - Render Deployment
# This is a wrapper for backend/Dockerfile
FROM python:3.11

WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    zlib1g-dev \
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy entire project
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r backend/requirements.txt && \
    pip cache purge

# Ensure directories exist
RUN mkdir -p backend/data \
    backend/uploads \
    backend/grading_results \
    backend/synced_submissions

# Environment
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

WORKDIR /app/backend

# Start FastAPI
CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
