import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_directory_structure(base_dir: str = None) -> dict:
    """
    Ensures that the necessary directory structure exists for the application.
    Creates directories if they don't exist.
    
    Args:
        base_dir: Base directory path. If None, uses the current directory.
        
    Returns:
        Dictionary with paths to all required directories
    """
    if base_dir is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    base_path = Path(base_dir)
    
    # Define all required directories with a more structured approach
    directories = {
        # Root directories
        "data": base_path / "data",
        
        # Upload directories
        "uploads": base_path / "data" / "uploads",
        "temp_uploads": base_path / "data" / "temp_uploads",
        "processed_uploads": base_path / "data" / "processed_uploads",
        
        # Upload subdirectories by type
        "question_papers": base_path / "data" / "uploads" / "question_papers",
        "answer_keys": base_path / "data" / "uploads" / "answer_keys",
        "submissions": base_path / "data" / "uploads" / "submissions",
        
        # Processing directories
        "extracted_submissions": base_path / "data" / "processed_uploads" / "extracted_submissions",
        "extracted_images": base_path / "data" / "processed_uploads" / "extracted_images",
        
        # Results and metadata
        "grading_results": base_path / "data" / "grading_results",
        "metadata": base_path / "data" / "metadata",
        
        # System directories
        "logs": base_path / "logs",
        "database": base_path / "database",
        "cache": base_path / "cache"
    }
    
    # Create directories if they don't exist
    for name, path in directories.items():
        os.makedirs(path, exist_ok=True)
        logger.info(f"Ensured directory exists: {path}")
    
    return directories

def cleanup_temp_directories(directories: dict = None) -> None:
    """
    Cleans up temporary directories to free space.
    
    Args:
        directories: Dictionary with directory paths. If None, gets directories from ensure_directory_structure()
    """
    if directories is None:
        directories = ensure_directory_structure()
    
    temp_dirs = [
        directories["temp_uploads"],
        directories["uploads"]
    ]
    
    import shutil
    for temp_dir in temp_dirs:
        try:
            if os.path.exists(temp_dir):
                for item in os.listdir(temp_dir):
                    item_path = os.path.join(temp_dir, item)
                    if os.path.isfile(item_path):
                        os.remove(item_path)
                    elif os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                logger.info(f"Cleaned up directory: {temp_dir}")
        except Exception as e:
            logger.error(f"Error cleaning up directory {temp_dir}: {str(e)}") 