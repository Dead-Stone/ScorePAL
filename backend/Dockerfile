# ScorePAL Backend - Optimized for Render Docker Deployment
FROM python:3.11

WORKDIR /app

# Install minimal system dependencies required for backend
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

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt && \
    pip cache purge

# Copy backend code
COPY . /app/backend

# Ensure required directories exist
RUN mkdir -p /app/backend/data \
    /app/backend/uploads \
    /app/backend/grading_results \
    /app/backend/synced_submissions

# Set working directory
WORKDIR /app/backend

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start FastAPI application
CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]