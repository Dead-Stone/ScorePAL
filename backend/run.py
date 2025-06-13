#!/usr/bin/env python3
"""
Simple entry point for Railway deployment.
"""

import subprocess
import sys
import os

if __name__ == "__main__":
    # Set the PORT environment variable if not set
    if "PORT" not in os.environ:
        os.environ["PORT"] = "8000"
    
    # Run the main.py file
    subprocess.run([sys.executable, "main.py"]) 