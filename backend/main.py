"""
Main entry point for the ScorePAL API.
This file serves as the entry point for Railway deployment.
"""

import os
import uvicorn
from api import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        reload=False
    ) 