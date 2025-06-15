# Use Python 3.9 slim for smaller base image
FROM python:3.9-slim

# Install system dependencies in one layer and clean up
RUN apt-get update && apt-get install -y \
    # Essential build tools
    gcc g++ \
    # Image processing libraries
    libfreetype6-dev libjpeg-dev libpng-dev \
    # Math libraries
    libopenblas-dev liblapack-dev \
    # OpenCV and OpenGL dependencies
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
    libtiff-dev \
    libatlas-base-dev \
    gfortran \
    # Other dependencies
    libssl-dev libffi-dev zlib1g-dev \
    # Cleanup in same layer to reduce size
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy requirements and install Python packages
COPY backend/requirements.txt ./requirements.txt

# Install OpenCV headless version first to avoid conflicts
RUN pip install --no-cache-dir opencv-python-headless>=4.8.0

RUN pip install --no-cache-dir -r requirements.txt \
    # Remove pip cache to reduce image size
    && pip cache purge \
    # Remove unnecessary files
    && find /usr/local/lib/python3.9/site-packages -name "*.pyc" -delete \
    && find /usr/local/lib/python3.9/site-packages -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Copy only the backend directory
COPY backend/ ./backend/

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8000

# Expose port
EXPOSE $PORT

# Set working directory to backend and start the application
WORKDIR /app/backend
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"] 