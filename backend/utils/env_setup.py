import os
import logging
from dotenv import load_dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_environment(env_file: str = None) -> bool:
    """
    Load environment variables from .env file and validate required variables.
    
    Args:
        env_file: Optional path to .env file
        
    Returns:
        True if all required variables are set, False otherwise
    """
    # Try to load from specified file
    if env_file and Path(env_file).exists():
        load_dotenv(env_file)
        logger.info(f"Loaded environment variables from {env_file}")
    # Try to load from .env in current directory
    elif Path(".env").exists():
        load_dotenv()
        logger.info("Loaded environment variables from .env")
    # Try to load from parent directory
    elif Path("../.env").exists():
        load_dotenv("../.env")
        logger.info("Loaded environment variables from ../.env")
    else:
        logger.warning("No .env file found. Using system environment variables.")
    
    # Check required variables
    required_vars = [
        "GEMINI_API_KEY",
    ]
    
    # Check Neo4j variables if enabled
    if os.getenv("USE_NEO4J", "False").lower() == "true":
        required_vars.extend([
            "NEO4J_URI",
            "NEO4J_USERNAME",
            "NEO4J_PASSWORD",
            "NEO4J_DATABASE"
        ])
    
    # Check if all required variables are set
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        return False
    
    return True

def create_env_file(
    gemini_api_key: str = None,
    neo4j_uri: str = None,
    neo4j_username: str = None,
    neo4j_password: str = None,
    neo4j_database: str = None,
    output_file: str = ".env"
) -> bool:
    """
    Create a .env file with the provided credentials.
    
    Args:
        gemini_api_key: Google Gemini API key
        neo4j_uri: Neo4j database URI
        neo4j_username: Neo4j username
        neo4j_password: Neo4j password
        neo4j_database: Neo4j database name
        output_file: Output file path
        
    Returns:
        True if file created successfully, False otherwise
    """
    try:
        with open(output_file, 'w') as f:
            f.write("# Environment variables for ScorePAL\n\n")
            
            # Gemini API key
            if gemini_api_key:
                f.write(f"GEMINI_API_KEY={gemini_api_key}\n")
            else:
                f.write("# GEMINI_API_KEY=your_api_key_here\n")
            
            # Neo4j credentials
            f.write("\n# Neo4j credentials\n")
            f.write(f"USE_NEO4J={'true' if all([neo4j_uri, neo4j_username, neo4j_password]) else 'false'}\n")
            if neo4j_uri:
                f.write(f"NEO4J_URI={neo4j_uri}\n")
            else:
                f.write("# NEO4J_URI=neo4j+s://example.databases.neo4j.io\n")
                
            if neo4j_username:
                f.write(f"NEO4J_USERNAME={neo4j_username}\n")
            else:
                f.write("# NEO4J_USERNAME=neo4j\n")
                
            if neo4j_password:
                f.write(f"NEO4J_PASSWORD={neo4j_password}\n")
            else:
                f.write("# NEO4J_PASSWORD=your_password_here\n")
                
            if neo4j_database:
                f.write(f"NEO4J_DATABASE={neo4j_database}\n")
            else:
                f.write("# NEO4J_DATABASE=neo4j\n")
            
            # OCR settings
            f.write("\n# OCR and PDF processing settings\n")
            f.write("TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata\n")
            f.write("POPPLER_PATH=/usr/bin\n")
            
            # App settings
            f.write("\n# App settings\n")
            f.write("DEBUG=false\n")
            f.write("LOG_LEVEL=INFO\n")
        
        logger.info(f"Created environment file at {output_file}")
        return True
    except Exception as e:
        logger.error(f"Failed to create environment file: {str(e)}")
        return False

def update_env_var(key: str, value: str, env_file: str = ".env") -> bool:
    """
    Update a specific environment variable in the .env file.
    
    Args:
        key: Environment variable key
        value: Environment variable value
        env_file: Path to .env file
        
    Returns:
        True if updated successfully, False otherwise
    """
    try:
        # Load current .env content
        env_content = {}
        if Path(env_file).exists():
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        env_content[k.strip()] = v.strip()
        
        # Update or add the variable
        env_content[key] = value
        
        # Write back to file
        with open(env_file, 'w') as f:
            for k, v in env_content.items():
                f.write(f"{k}={v}\n")
        
        # Also update in current environment
        os.environ[key] = value
        
        logger.info(f"Updated environment variable: {key}")
        return True
    except Exception as e:
        logger.error(f"Failed to update environment variable {key}: {str(e)}")
        return False 