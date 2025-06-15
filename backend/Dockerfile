FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV, OpenGL, Tesseract, and other libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
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
    libatlas-base-dev \
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

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p temp uploads grading_results synced_submissions

# Expose port
EXPOSE 8000

# Start command - use the correct app module
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"] 