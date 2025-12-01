"""
App entry point for Railway deployment.
This file exposes the FastAPI app for Railway's auto-detection.
"""

import sys
import importlib.util
from pathlib import Path

current_dir = Path(__file__).parent
root_dir = current_dir.parent

# Ensure both the project root and backend package dir are importable
for path in (root_dir, current_dir):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

api_file = current_dir / "api.py"

module_name = "backend._api_entrypoint"
spec = importlib.util.spec_from_file_location(module_name, api_file)
api_module = importlib.util.module_from_spec(spec)
sys.modules[module_name] = api_module
spec.loader.exec_module(api_module)

app = api_module.app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
