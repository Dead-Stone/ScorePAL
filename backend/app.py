"""
App entry point for Railway/local deployment.
Loads the FastAPI app from main.py via importlib to avoid the naming conflict
between backend/main.py (module file) and backend/api/ (package directory).
"""

import os
import sys
import importlib.util
from pathlib import Path

current_dir = Path(__file__).parent
root_dir = current_dir.parent

# Ensure project root is on sys.path so 'backend' is importable as a package
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

api_file = current_dir / "main.py"

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
