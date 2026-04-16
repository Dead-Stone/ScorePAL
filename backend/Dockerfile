FROM python:3.11-slim

WORKDIR /app

# Fix apt-get for Render (update package lists, fix any issues)
RUN apt-get update --fix-missing && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install only essential system dependencies (Render-optimized)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    zlib1g-dev \
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev \
    libopenblas-dev \
    liblapack-dev \
    gfortran \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/* && apt-get clean

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with increased pip cache and retries
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app/backend

# Set working directory to backend package
WORKDIR /app/backend

# Ensure directories exist
RUN mkdir -p data uploads temp grading_results synced_submissions

# Set PYTHONPATH so "backend" package is discoverable
ENV PYTHONPATH=/app
ENV PORT=8000

# Expose default API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/docs', timeout=5)" || exit 1

# Start command using package import so relative imports work
CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]