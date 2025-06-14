# Use Python 3.9 with Ubuntu base for better package support
FROM python:3.9-slim

# Install system dependencies for all your packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    cmake \
    pkg-config \
    libfreetype6-dev \
    libfontconfig1-dev \
    libjpeg-dev \
    libpng-dev \
    libopenblas-dev \
    liblapack-dev \
    libhdf5-dev \
    libssl-dev \
    libffi-dev \
    zlib1g-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY backend/requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project
COPY . /app/

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8000

# Expose port
EXPOSE $PORT

# Change to backend directory and start the application
CMD cd backend && uvicorn api:app --host 0.0.0.0 --port $PORT 