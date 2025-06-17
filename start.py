"""
ScorePAL - AI-Powered Academic Grading Assistant
Main Application Startup Script

@author: Mohana Moganti (@Dead-Stone)
@license: MIT
@repository: https://github.com/Dead-Stone/ScorePAL
"""

#!/usr/bin/env python
"""
Entry point for the application.
This script starts both the backend and frontend servers.
"""

import os
import sys
import subprocess
import time
import webbrowser
import signal
from pathlib import Path
from dotenv import load_dotenv

# Get the absolute paths
ROOT_DIR = Path(__file__).parent.absolute()
BACKEND_DIR = ROOT_DIR / 'backend'
FRONTEND_DIR = ROOT_DIR / 'frontend'

# Add the project root to Python path
sys.path.append(str(ROOT_DIR))

def setup_environment():
    """Set up the environment for ScorePAL."""
    print("Setting up environment...")
    
    # Check if .env file exists in the root directory
    root_env_file = ROOT_DIR / '.env'
    backend_env_file = BACKEND_DIR / '.env'
    
    # Load environment variables from both files if they exist
    if root_env_file.exists():
        print(f"Loading environment from {root_env_file}")
        load_dotenv(root_env_file)
    
    if backend_env_file.exists():
        print(f"Loading environment from {backend_env_file}")
        load_dotenv(backend_env_file, override=True)  # Backend env overrides root env
    
    # If neither .env file exists, create them
    if not root_env_file.exists() and not backend_env_file.exists():
        # Check if Neo4j credentials file exists
        neo4j_file = ROOT_DIR / 'Neo4j-f8d136eb-Created-2025-05-27.txt'
        if neo4j_file.exists():
            print("Neo4j credentials file found, setting up environment...")
            # Create root .env
            with open(root_env_file, 'w') as f:
                f.write("# Environment variables for ScorePAL\n\n")
                f.write("# Gemini API Key (Required)\n")
                f.write("GEMINI_API_KEY=your_api_key_here\n\n")
                f.write("# Neo4j credentials\n")
                f.write("USE_NEO4J=true\n")
                f.write("NEO4J_URI=neo4j+s://f8d136eb.databases.neo4j.io\n")
                f.write("NEO4J_USERNAME=neo4j\n")
                f.write("NEO4J_PASSWORD=r7iSoxxeoi3CiS8L4KVZ1KEaMB2neN8WfyIKbhr5ob4\n")
                f.write("NEO4J_DATABASE=neo4j\n\n")
                f.write("# OCR and PDF processing settings\n")
                f.write("TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata\n")
                f.write("POPPLER_PATH=/usr/bin\n\n")
                f.write("# App settings\n")
                f.write("DEBUG=true\n")
                f.write("LOG_LEVEL=INFO\n")
            
            # Create backend .env with backend-specific settings
            with open(backend_env_file, 'w') as f:
                f.write("# Backend-specific environment variables\n\n")
                f.write("# API settings\n")
                f.write("API_HOST=0.0.0.0\n")
                f.write("API_PORT=8000\n")
                f.write("API_WORKERS=1\n")
                f.write("API_RELOAD=true\n\n")
                f.write("# Database settings\n")
                f.write("DATABASE_URL=sqlite:///./data/database.db\n")
                f.write("DATABASE_ECHO=false\n\n")
                f.write("# File storage settings\n")
                f.write("UPLOAD_DIR=data/uploads\n")
                f.write("TEMP_DIR=data/temp_uploads\n")
                f.write("PROCESSED_DIR=data/processed_uploads\n")
        else:
            print("No .env files or Neo4j credentials found. Creating default .env files...")
            # Create root .env
            with open(root_env_file, 'w') as f:
                f.write("# Environment variables for ScorePAL\n\n")
                f.write("# Gemini API Key (Required)\n")
                f.write("GEMINI_API_KEY=your_api_key_here\n\n")
                f.write("# Neo4j credentials (Optional)\n")
                f.write("USE_NEO4J=false\n")
                f.write("# NEO4J_URI=neo4j+s://example.databases.neo4j.io\n")
                f.write("# NEO4J_USERNAME=neo4j\n")
                f.write("# NEO4J_PASSWORD=your_password_here\n")
                f.write("# NEO4J_DATABASE=neo4j\n\n")
                f.write("# OCR and PDF processing settings\n")
                f.write("TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata\n")
                f.write("POPPLER_PATH=/usr/bin\n\n")
                f.write("# App settings\n")
                f.write("DEBUG=true\n")
                f.write("LOG_LEVEL=INFO\n")
            
            # Create backend .env
            with open(backend_env_file, 'w') as f:
                f.write("# Backend-specific environment variables\n\n")
                f.write("# API settings\n")
                f.write("API_HOST=0.0.0.0\n")
                f.write("API_PORT=8000\n")
                f.write("API_WORKERS=1\n")
                f.write("API_RELOAD=true\n\n")
                f.write("# Database settings\n")
                f.write("DATABASE_URL=sqlite:///./data/database.db\n")
                f.write("DATABASE_ECHO=false\n\n")
                f.write("# File storage settings\n")
                f.write("UPLOAD_DIR=data/uploads\n")
                f.write("TEMP_DIR=data/temp_uploads\n")
                f.write("PROCESSED_DIR=data/processed_uploads\n")
            
            print("Please edit the .env files with your credentials and restart the application.")
            print(f"Edit the files at:\n{root_env_file}\n{backend_env_file}")
            sys.exit(1)

def install_dependencies():
    """Install Python dependencies."""
    print("Installing Python dependencies...")
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], cwd=BACKEND_DIR)

def install_frontend_dependencies():
    """Install frontend dependencies."""
    # Check if node_modules directory exists
    node_modules_dir = FRONTEND_DIR / 'node_modules'
    if not node_modules_dir.exists():
        print("Installing frontend dependencies...")
        
        # Check if npm is available
        try:
            # Try to find npm in PATH first
            npm_cmd = "npm"
            if os.name == 'nt':  # Windows
                npm_cmd = "npm.cmd"
            
            subprocess.run([npm_cmd, '--version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            # If not found in PATH, try with hardcoded path for Windows
            if os.name == 'nt':
                npm_cmd = "C:\\Program Files\\nodejs\\npm.cmd"
                try:
                    subprocess.run([npm_cmd, '--version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                except (subprocess.CalledProcessError, FileNotFoundError):
                    print("Error: npm is not available. Please install Node.js and npm.")
                    sys.exit(1)
            else:
                print("Error: npm is not available. Please install Node.js and npm.")
                sys.exit(1)
        
        # Install dependencies
        subprocess.run([npm_cmd, 'install'], cwd=FRONTEND_DIR)
    else:
        print("Frontend dependencies already installed.")

def start_backend():
    """Start the FastAPI backend server."""
    print("Starting backend server...")
    # Add the project root to PYTHONPATH for the subprocess
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT_DIR)
    return subprocess.Popen(
        [sys.executable, 'api.py'], 
        cwd=BACKEND_DIR,
        env=env
    )

def start_frontend():
    """Start the Next.js frontend server."""
    print("Starting frontend server...")
    
    # Determine npm command
    npm_cmd = "npm"
    if os.name == 'nt':  # Windows
        npm_cmd = "npm.cmd"
    
    # First ensure node_modules is up to date
    try:
        print("Checking frontend dependencies...")
        subprocess.run(
            [npm_cmd, 'install'], 
            cwd=FRONTEND_DIR,
            check=True
        )
        print("Frontend dependencies successfully installed.")
    except subprocess.CalledProcessError as e:
        print(f"Warning: There was an issue installing frontend dependencies: {e}")
    
    # Then start the development server
    return subprocess.Popen(
        [npm_cmd, 'run', 'dev'], 
        cwd=FRONTEND_DIR,
    )

def open_browser():
    """Open the browser to the frontend URL."""
    url = "http://localhost:3000"
    print(f"Opening browser at {url}...")
    webbrowser.open(url)

def handle_exit(backend_proc, frontend_proc):
    """Handle script exit and cleanup."""
    def signal_handler(sig, frame):
        print("\nShutting down...")
        if backend_proc:
            print("Stopping backend server...")
            backend_proc.terminate()
        if frontend_proc:
            print("Stopping frontend server...")
            frontend_proc.terminate()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

def main():
    """Main function."""
    # Setup environment
    setup_environment()
    
    # Install dependencies
    install_dependencies()
    install_frontend_dependencies()
    
    # Start both servers
    backend_proc = start_backend()
    time.sleep(2)  # Wait for backend to start
    
    frontend_proc = start_frontend()
    time.sleep(5)  # Wait for frontend to start
    
    # Open browser
    open_browser()
    
    # Handle exit
    handle_exit(backend_proc, frontend_proc)
    
    # Keep the script running
    print("ScorePAL is running! Press Ctrl+C to stop.")
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main() 