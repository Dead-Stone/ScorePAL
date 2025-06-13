"""
App entry point for Railway deployment.
This file exposes the FastAPI app for Railway's auto-detection.
"""

import os
import sys
import importlib.util
from pathlib import Path

# Add current directory to path
current_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(current_dir))

def create_app():
    """Create and return the FastAPI app."""
    # Load the api.py file as a module
    api_file = current_dir / "api.py"
    spec = importlib.util.spec_from_file_location("api_module", api_file)
    api_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(api_module)
    return api_module.app

# Create the app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
