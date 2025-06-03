"""
Configuration module for ScorePAL API.
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
from pathlib import Path
import tempfile

# Get the absolute paths
ROOT_DIR = Path(__file__).parent.parent.absolute()
BACKEND_DIR = Path(__file__).parent.absolute()

# Load environment variables from both files if they exist
root_env_file = ROOT_DIR / '.env'
backend_env_file = BACKEND_DIR / '.env'

if root_env_file.exists():
    load_dotenv(root_env_file)

if backend_env_file.exists():
    load_dotenv(backend_env_file, override=True)  # Backend env overrides root env

class Settings(BaseSettings):
    """Application settings."""
    
    # API settings
    api_title: str = "ScorePAL API"
    api_description: str = "API for the ScorePAL grading system"
    api_version: str = "1.0.0"
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    api_workers: int = int(os.getenv("API_WORKERS", "1"))
    api_reload: bool = os.getenv("API_RELOAD", "true").lower() == "true"
    
    # Canvas LMS settings
    canvas_url: str = os.getenv("CANVAS_URL", "https://canvas.instructure.com")
    canvas_api_key: str = os.getenv("CANVAS_API_KEY", "")
    
    # AI API keys
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    
    # Database settings
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/database.db")
    database_echo: bool = os.getenv("DATABASE_ECHO", "false").lower() == "true"
    neo4j_uri: str = os.getenv("NEO4J_URI", "")
    neo4j_user: str = os.getenv("NEO4J_USERNAME", "")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "")
    neo4j_database: str = os.getenv("NEO4J_DATABASE", "neo4j")
    use_neo4j: bool = os.getenv("USE_NEO4J", "false").lower() == "true"
    
    # File storage settings
    upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads")
    temp_dir: str = os.getenv("TEMP_DIR", os.path.join(tempfile.gettempdir(), "canvas_grading"))
    processed_dir: str = os.getenv("PROCESSED_DIR", "data/processed_uploads")
    
    # OCR and PDF processing settings
    tessdata_prefix: str = os.getenv("TESSDATA_PREFIX", "/usr/share/tesseract-ocr/4.00/tessdata")
    poppler_path: str = os.getenv("POPPLER_PATH", "/usr/bin")
    
    # App settings
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    model_config = {
        "env_file": [str(root_env_file), str(backend_env_file)],
        "case_sensitive": False,
        "extra": "ignore"
    }

    def model_post_init(self, __context):
        """Create directories after model initialization."""
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.temp_dir, exist_ok=True)

@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings.
    
    Returns:
        Settings object with application configuration
    """
    return Settings() 