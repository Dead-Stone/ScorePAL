import os
import zipfile
import json
import logging
import fitz  # PyMuPDF
import re
import shutil
import atexit
from typing import Dict, Any, List, Optional
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a constant for the extraction directory
EXTRACTION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extracted_files")

# Function to clean up the extraction directory
def cleanup_extraction_dir():
    """Clean up the extraction directory when the program exits."""
    if os.path.exists(EXTRACTION_DIR):
        try:
            shutil.rmtree(EXTRACTION_DIR)
            logger.info(f"Successfully cleaned up extraction directory: {EXTRACTION_DIR}")
        except Exception as e:
            logger.error(f"Error cleaning up extraction directory: {e}")

# Register the cleanup function to run when the program exits
atexit.register(cleanup_extraction_dir)

def extract_submissions(zip_path: str) -> Dict[str, str]:
    """
    Extract student submissions from a zip file using a simplified approach with numbered students.
    
    Args:
        zip_path: Path to the zip file containing student submissions.
        
    Returns:
        Dictionary mapping student IDs to their submission text.
    """
    submissions = {}
    
    # Create a simple extraction directory
    extraction_path = os.path.join(EXTRACTION_DIR, "current_extraction")
    
    # If directory exists, clean it first
    if os.path.exists(extraction_path):
        try:
            shutil.rmtree(extraction_path)
            logger.info(f"Cleaned up previous extraction directory: {extraction_path}")
        except Exception as e:
            logger.error(f"Error cleaning up previous extraction: {e}")
    
    # Create fresh directory
    os.makedirs(extraction_path, exist_ok=True)
    logger.info(f"Created extraction directory: {extraction_path}")
    
    try:
        # Extract the zip file
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extraction_path)
        
        # Simple counter for submissions
        student_counter = 1
        file_count = 0
        
        # List to store file paths for processing
        file_list = []
        
        # First, collect all file paths
        for root, _, files in os.walk(extraction_path):
            for file in files:
                file_path = os.path.join(root, file)
                _, file_ext = os.path.splitext(file)
                
                # Skip non-document files
                if file_ext.lower() in ['.pdf', '.txt', '.docx']:
                    file_list.append(file_path)
                    file_count += 1
        
        logger.info(f"Found {file_count} document files to process")
        
        # Process each file
        for file_path in file_list:
            try:
                # Get the base filename without path or extension
                file_name = os.path.basename(file_path)
                name_base, file_ext = os.path.splitext(file_name)
                
                # Extract text from the file
                submission_text = _extract_text_from_file(file_path)
                
                if submission_text and len(submission_text.strip()) > 10:  # Ensure we have meaningful content
                    # Take the first 15 characters of the filename for the student ID
                    name_prefix = name_base[:15]
                    # Clean it up
                    name_prefix = re.sub(r'[^a-zA-Z0-9_]', '', name_prefix)
                    
                    # Create the student ID with format: Student_1_nameprefix
                    student_id = f"Student_{student_counter}_{name_prefix}"
                    
                    submissions[student_id] = submission_text
                    logger.info(f"Successfully processed submission for: {student_id}")
                    
                    # Increment for next student
                    student_counter += 1
                else:
                    logger.warning(f"Empty or invalid content in: {file_path}")
            
            except Exception as e:
                logger.error(f"Error processing file {file_path}: {e}")
        
        logger.info(f"Processed {file_count} files, extracted {len(submissions)} submissions")
        
        return submissions
    
    except Exception as e:
        logger.error(f"Error extracting submissions: {e}")
        return {}

def _extract_text_from_file(file_path: str) -> str:
    """Extract text from a file based on its extension."""
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    
    try:
        if ext == '.pdf':
            return _extract_text_from_pdf(file_path)
        elif ext == '.txt':
            return _extract_text_from_txt(file_path)
        elif ext == '.docx':
            return _extract_text_from_docx(file_path)
        else:
            logger.warning(f"Unsupported file extension: {ext}")
            return ""
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        return ""

def _extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    try:
        text = ""
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text() + "\n\n"
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF {file_path}: {e}")
        return ""

def _extract_text_from_txt(file_path: str) -> str:
    """Extract text from a text file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        logger.error(f"Error extracting text from TXT {file_path}: {e}")
        return ""

def _extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX file."""
    try:
        import docx
        doc = docx.Document(file_path)
        return "\n\n".join(paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip())
    except ImportError:
        logger.error("python-docx not installed, cannot process DOCX files")
        return ""
    except Exception as e:
        logger.error(f"Error extracting text from DOCX {file_path}: {e}")
        return ""

# Additional helper function for batch preprocessing
def preprocess_batch(submissions: Dict[str, str]) -> Dict[str, str]:
    """Perform any necessary preprocessing on the batch of submissions."""
    preprocessed = {}
    
    for student, submission in submissions.items():
        # Clean up the submission text
        cleaned = _clean_submission_text(submission)
        if cleaned:
            preprocessed[student] = cleaned
    
    return preprocessed

def _clean_submission_text(text: str) -> str:
    """Clean up submission text by removing unwanted elements."""
    if not text:
        return ""
    
    # Remove excessive whitespace
    cleaned = re.sub(r'\s+', ' ', text)
    
    # Remove any page numbers like "(2)" or "Page 2 of 4"
    cleaned = re.sub(r'\(?\d+\)?\s*(?:of\s*\d+)?', ' ', cleaned)
    
    # Remove header/footer text (assuming common patterns)
    cleaned = re.sub(r'Header\s*\|.*?\|', '', cleaned)
    cleaned = re.sub(r'Footer\s*\|.*?\|', '', cleaned)
    
    return cleaned.strip()

# Create a function to manually clean up the extraction directory
def manually_cleanup_extraction_dir():
    """
    Manually clean up the extraction directory.
    This can be called explicitly if needed.
    """
    cleanup_extraction_dir()

# Ensure extraction directory exists when module is imported
os.makedirs(EXTRACTION_DIR, exist_ok=True)