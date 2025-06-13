"""
Main entry point for Railway deployment.
This file serves as the entry point for Railway deployment only.
For local development, use 'py start.py' from the root directory.
"""

import os
import sys
import uvicorn
import importlib.util
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(current_dir))

def load_api_module():
    """Load the api.py file as a module to avoid conflicts with api/ directory."""
    api_file = current_dir / "api.py"
    spec = importlib.util.spec_from_file_location("api_module", api_file)
    api_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(api_module)
    return api_module.app

if __name__ == "__main__":
    # Load the FastAPI app
    app = load_api_module()
    
    # Get port from environment (Railway sets this)
    port = int(os.environ.get("PORT", 8000))
    
    # Start the server
    print(f"Starting ScorePAL API server on port {port}...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=False
    ) 