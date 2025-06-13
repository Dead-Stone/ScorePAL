#!/usr/bin/env python3
"""
Image Extraction API endpoints for ScorePAL
Provides REST API endpoints for extracting images from documents and generating AI summaries.
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
import logging

from image_extraction_service import ImageExtractionService
from config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/image-extraction", tags=["Image Extraction"])

# Initialize settings
settings = get_settings()

@router.post("/extract")
async def extract_images_from_document(
    file: UploadFile = File(...),
    context: Optional[str] = Form(None)
) -> Dict:
    """
    Extract images from uploaded PDF/DOCX document and generate AI summaries.
    
    Args:
        file: Uploaded document file (PDF or DOCX)
        context: Optional context for AI analysis (e.g., "Math homework submission")
        
    Returns:
        Dictionary containing extraction results and session information
    """
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ['.pdf', '.docx']:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file_ext}. Only PDF and DOCX files are supported."
            )
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            # Save uploaded file
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Initialize image extraction service
            service = ImageExtractionService(gemini_api_key=settings.gemini_api_key)
            
            # Extract and analyze images
            result = service.extract_and_analyze_images(
                temp_file_path,
                context=context or f"Image extraction from {file.filename}"
            )
            
            # Add original filename to result
            result['original_filename'] = file.filename
            result['file_size'] = len(content)
            
            return result
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {temp_file_path}: {e}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting images: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/sessions")
async def list_extraction_sessions() -> Dict:
    """
    List all image extraction sessions.
    
    Returns:
        Dictionary containing list of extraction sessions
    """
    try:
        from image_extraction_service import IMAGE_EXTRACTION_DIR
        
        if not IMAGE_EXTRACTION_DIR.exists():
            return {"sessions": [], "total": 0}
        
        sessions = []
        for session_dir in IMAGE_EXTRACTION_DIR.glob("*_images"):
            if session_dir.is_dir():
                # Read metadata if available
                metadata_file = session_dir / "metadata.json"
                if metadata_file.exists():
                    import json
                    try:
                        with open(metadata_file, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)
                        
                        sessions.append({
                            'session_id': metadata.get('session_id', session_dir.name),
                            'original_file': metadata.get('original_file', 'Unknown'),
                            'timestamp': metadata.get('timestamp', 'Unknown'),
                            'total_images': metadata.get('total_images', 0),
                            'extraction_summary': metadata.get('extraction_summary', {})
                        })
                    except Exception as e:
                        logger.warning(f"Failed to read metadata for {session_dir.name}: {e}")
                        sessions.append({
                            'session_id': session_dir.name,
                            'original_file': 'Unknown',
                            'timestamp': 'Unknown',
                            'total_images': 0,
                            'extraction_summary': {}
                        })
        
        # Sort by timestamp (newest first)
        sessions.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return {
            "sessions": sessions,
            "total": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"Error listing extraction sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/sessions/{session_id}")
async def get_extraction_session(session_id: str) -> Dict:
    """
    Get detailed information about a specific extraction session.
    
    Args:
        session_id: ID of the extraction session
        
    Returns:
        Dictionary containing detailed session information
    """
    try:
        from image_extraction_service import IMAGE_EXTRACTION_DIR
        
        session_dir = IMAGE_EXTRACTION_DIR / session_id
        if not session_dir.exists():
            raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
        
        # Read metadata
        metadata_file = session_dir / "metadata.json"
        if not metadata_file.exists():
            raise HTTPException(status_code=404, detail=f"Session metadata not found: {session_id}")
        
        import json
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # Add file paths for images
        images_dir = session_dir / "images"
        summaries_dir = session_dir / "summaries"
        
        for image_info in metadata.get('images', []):
            image_filename = image_info.get('filename', '')
            summary_filename = f"image_{image_info.get('image_index', 1)}_summary.txt"
            
            image_info['image_path'] = str(images_dir / image_filename) if image_filename else None
            image_info['summary_path'] = str(summaries_dir / summary_filename)
        
        return metadata
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting extraction session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/sessions/{session_id}/summary/{image_index}")
async def get_image_summary(session_id: str, image_index: int) -> Dict:
    """
    Get the AI summary for a specific image in an extraction session.
    
    Args:
        session_id: ID of the extraction session
        image_index: Index of the image (1-based)
        
    Returns:
        Dictionary containing the image summary
    """
    try:
        from image_extraction_service import IMAGE_EXTRACTION_DIR
        
        session_dir = IMAGE_EXTRACTION_DIR / session_id
        if not session_dir.exists():
            raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
        
        # Read summary file
        summaries_dir = session_dir / "summaries"
        summary_file = summaries_dir / f"image_{image_index}_summary.txt"
        
        if not summary_file.exists():
            raise HTTPException(status_code=404, detail=f"Summary not found for image {image_index}")
        
        with open(summary_file, 'r', encoding='utf-8') as f:
            summary_text = f.read()
        
        return {
            "session_id": session_id,
            "image_index": image_index,
            "summary": summary_text,
            "summary_length": len(summary_text)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting image summary {session_id}/{image_index}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/sessions/{session_id}")
async def delete_extraction_session(session_id: str) -> Dict:
    """
    Delete an extraction session and all its data.
    
    Args:
        session_id: ID of the extraction session to delete
        
    Returns:
        Dictionary confirming deletion
    """
    try:
        from image_extraction_service import IMAGE_EXTRACTION_DIR
        import shutil
        
        session_dir = IMAGE_EXTRACTION_DIR / session_id
        if not session_dir.exists():
            raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
        
        # Delete the entire session directory
        shutil.rmtree(session_dir)
        
        return {
            "message": f"Session {session_id} deleted successfully",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting extraction session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/health")
async def health_check() -> Dict:
    """
    Health check endpoint for the image extraction service.
    
    Returns:
        Dictionary containing service status
    """
    try:
        # Test service initialization
        service = ImageExtractionService(gemini_api_key=settings.gemini_api_key)
        
        from image_extraction_service import IMAGE_EXTRACTION_DIR
        
        return {
            "status": "healthy",
            "gemini_configured": service.model is not None,
            "data_directory": str(IMAGE_EXTRACTION_DIR),
            "data_directory_exists": IMAGE_EXTRACTION_DIR.exists(),
            "supported_formats": [".pdf", ".docx"]
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        } 