#!/usr/bin/env python3
"""
Image Extraction API for ScorePAL
Handles image extraction from PDFs and other documents
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Dict, Any, List, Optional
import logging
import os
import tempfile
from pathlib import Path
import json
from datetime import datetime

from ..image_extraction_service import ImageExtractionService

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize image extraction service
image_service = ImageExtractionService()

# In-memory storage for extraction sessions (replace with database in production)
EXTRACTION_SESSIONS: Dict[str, Dict[str, Any]] = {}

@router.get("/health")
async def health_check():
    """Health check for image extraction service"""
    return {
        "status": "healthy",
        "service": "image_extraction",
        "timestamp": datetime.now().isoformat(),
        "available_models": image_service.available_models
    }

@router.post("/extract")
async def extract_images(
    file: UploadFile = File(...),
    save_images: bool = Form(False),
    generate_summaries: bool = Form(True)
):
    """Extract images from uploaded file"""
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
            raise HTTPException(
                status_code=400, 
                detail="Only PDF, DOC, and DOCX files are supported"
            )
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Extract images
            images = image_service.extract_images_from_file(temp_file_path)
            
            # Generate summaries if requested
            summaries = []
            if generate_summaries and images:
                summaries = image_service.generate_image_summaries(images)
            
            # Save session data
            session_id = f"session_{len(EXTRACTION_SESSIONS) + 1}"
            session_data = {
                "file_name": file.filename,
                "file_size": len(content),
                "images_extracted": len(images),
                "extraction_time": datetime.now().isoformat(),
                "images": images,
                "summaries": summaries
            }
            
            if save_images:
                # Save images to disk
                saved_paths = image_service.save_images_to_disk(images, session_id)
                session_data["saved_paths"] = saved_paths
            
            EXTRACTION_SESSIONS[session_id] = session_data
            
            return {
                "status": "success",
                "session_id": session_id,
                "images_extracted": len(images),
                "summaries_generated": len(summaries),
                "session_data": session_data
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Error extracting images: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}")
async def get_extraction_session(session_id: str):
    """Get extraction session data"""
    if session_id not in EXTRACTION_SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return EXTRACTION_SESSIONS[session_id]

@router.delete("/sessions/{session_id}")
async def delete_extraction_session(session_id: str):
    """Delete extraction session and associated data"""
    if session_id not in EXTRACTION_SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        session_data = EXTRACTION_SESSIONS[session_id]
        
        # Clean up saved images if they exist
        if "saved_paths" in session_data:
            for path in session_data["saved_paths"]:
                if os.path.exists(path):
                    os.unlink(path)
        
        # Remove session
        del EXTRACTION_SESSIONS[session_id]
        
        return {"message": f"Session {session_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def list_extraction_sessions():
    """List all extraction sessions"""
    sessions = []
    for session_id, data in EXTRACTION_SESSIONS.items():
        sessions.append({
            "session_id": session_id,
            "file_name": data.get("file_name"),
            "images_extracted": data.get("images_extracted", 0),
            "extraction_time": data.get("extraction_time"),
            "has_summaries": bool(data.get("summaries"))
        })
    
    return {"sessions": sessions}

@router.post("/analyze")
async def analyze_images(
    file: UploadFile = File(...),
    analysis_type: str = Form("general")
):
    """Analyze images using AI vision models"""
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp')):
            raise HTTPException(
                status_code=400, 
                detail="Only image files are supported for analysis"
            )
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Analyze image
            analysis = image_service.analyze_image(temp_file_path, analysis_type)
            
            return {
                "status": "success",
                "file_name": file.filename,
                "analysis_type": analysis_type,
                "analysis": analysis
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Error analyzing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def get_available_models():
    """Get available AI vision models"""
    return {
        "available_models": image_service.available_models,
        "default_model": image_service.default_model,
        "model_status": image_service.get_rate_limit_status()
    } 