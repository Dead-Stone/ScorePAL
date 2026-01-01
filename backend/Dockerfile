FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV, OpenGL, Tesseract, and other libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgtk-3-0 \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libatlas3-base \
    gfortran \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    libpoppler-cpp-dev \
    pkg-config \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Remove any conflicting opencv packages and install headless version

# Install remaining Python dependencies
RUN pip install -r requirements.txt

# Copy application code into /app/backend to preserve package context
COPY . /app/backend

# Set working directory to backend package
WORKDIR /app/backend

# Ensure directories exist
RUN mkdir -p data uploads temp grading_results synced_submissions

# Set PYTHONPATH so "backend" package is discoverable
ENV PYTHONPATH=/app

# Expose default API port
EXPOSE 8000

# Start command using package import so relative imports work
CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]