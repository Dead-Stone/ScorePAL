from fastapi import APIRouter, HTTPException, Body
from typing import Dict, List, Any, Optional
from models.rubric import Rubric, GradingCriteria
from rubric_generation import get_rubric_from_text
import json
import os
import logging
import uuid
from datetime import datetime
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter()

# In-memory store for rubrics (in a production app, this would be a database)
# This will be initialized with sample rubrics on startup
RUBRICS = {}

# Directory for storing rubrics
RUBRICS_DIR = Path("data/rubrics")
RUBRICS_DIR.mkdir(parents=True, exist_ok=True)

def load_rubrics_from_disk():
    """Load saved rubrics from disk"""
    try:
        if not RUBRICS_DIR.exists():
            logger.warning(f"Rubrics directory {RUBRICS_DIR} does not exist, creating it")
            RUBRICS_DIR.mkdir(parents=True, exist_ok=True)
            return
            
        count = 0
        for rubric_file in RUBRICS_DIR.glob("*.json"):
            try:
                with open(rubric_file, 'r') as f:
                    rubric_data = json.load(f)
                    rubric = Rubric.from_dict(rubric_data)
                    RUBRICS[rubric.id] = rubric
                    count += 1
            except Exception as e:
                logger.error(f"Error loading rubric from {rubric_file}: {e}")
        
        logger.info(f"Loaded {count} rubrics from disk")
        
        # If no rubrics were loaded, add the default one
        if not RUBRICS:
            default_rubric = Rubric.create_default()
            RUBRICS[default_rubric.id] = default_rubric
            save_rubric_to_disk(default_rubric)
            logger.info("Created default rubric")
    except Exception as e:
        logger.error(f"Error loading rubrics: {e}")

def save_rubric_to_disk(rubric: Rubric):
    """Save a rubric to disk"""
    try:
        rubric_path = RUBRICS_DIR / f"{rubric.id}.json"
        with open(rubric_path, 'w') as f:
            json.dump(rubric.to_dict(), f, indent=2)
        logger.info(f"Saved rubric {rubric.id} to disk")
    except Exception as e:
        logger.error(f"Error saving rubric {rubric.id} to disk: {e}")

@router.get("/rubrics")
async def get_rubrics():
    """Get all available rubrics"""
    try:
        # Make sure rubrics are loaded
        if not RUBRICS:
            load_rubrics_from_disk()
            
        return {
            "status": "success",
            "rubrics": [rubric.to_dict() for rubric in RUBRICS.values()]
        }
    except Exception as e:
        logger.error(f"Error getting rubrics: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting rubrics: {str(e)}")

@router.get("/rubrics/{rubric_id}")
async def get_rubric(rubric_id: str):
    """Get a specific rubric by ID"""
    try:
        if rubric_id not in RUBRICS:
            raise HTTPException(status_code=404, detail=f"Rubric with ID {rubric_id} not found")
            
        return {
            "status": "success",
            "rubric": RUBRICS[rubric_id].to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting rubric {rubric_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting rubric: {str(e)}")

@router.post("/rubrics")
async def create_rubric(rubric_data: Dict[str, Any] = Body(...)):
    """Create a new rubric"""
    try:
        # Generate a new ID if not provided
        if "id" not in rubric_data:
            rubric_data["id"] = f"rubric_{uuid.uuid4().hex[:8]}"
            
        # Set timestamps
        now = datetime.now().isoformat()
        rubric_data["created_at"] = now
        rubric_data["updated_at"] = now
        
        # Create the rubric object
        rubric = Rubric.from_dict(rubric_data)
        
        # Store the rubric
        RUBRICS[rubric.id] = rubric
        save_rubric_to_disk(rubric)
        
        return {
            "status": "success",
            "message": "Rubric created successfully",
            "rubric": rubric.to_dict()
        }
    except Exception as e:
        logger.error(f"Error creating rubric: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating rubric: {str(e)}")

@router.post("/generate-rubric")
async def generate_rubric(data: Dict[str, Any] = Body(...)):
    """Generate a rubric using AI based on the provided context"""
    try:
        # Extract parameters
        context = data.get("context", "")
        question = data.get("question", "")
        name = data.get("name", "Generated Rubric")
        
        if not context:
            context = "Create a detailed grading rubric with specific criteria and point allocations."
            
        # Generate the rubric using the AI with API key from environment
        generated_data = get_rubric_from_text(question, context)
        
        # Create a proper Rubric object
        criteria_list = []
        
        if "sections" in generated_data:
            # Process sections into criteria
            for section in generated_data.get("sections", []):
                section_name = section.get("name", "")
                
                for criterion in section.get("criteria", []):
                    criterion_name = criterion.get("name", "")
                    full_name = f"{section_name}: {criterion_name}" if section_name else criterion_name
                    
                    criteria_list.append(GradingCriteria(
                        name=full_name,
                        description=criterion.get("description", ""),
                        max_points=criterion.get("points", 0),
                        levels=criterion.get("grading_scale", [])
                    ))
        
        # Fallback if no criteria were created
        if not criteria_list:
            # Create a default criterion
            criteria_list.append(GradingCriteria(
                name="Content Quality",
                description="Overall quality of the submission",
                max_points=20,
                levels=[
                    {"level": "Excellent", "points": 20, "description": "Outstanding work"},
                    {"level": "Good", "points": 15, "description": "Strong work with minor issues"},
                    {"level": "Satisfactory", "points": 10, "description": "Acceptable work"},
                    {"level": "Poor", "points": 5, "description": "Needs significant improvement"}
                ]
            ))
        
        # Create the rubric
        rubric_id = f"rubric_{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        
        rubric = Rubric(
            id=rubric_id,
            name=name,
            description=f"Generated rubric: {context[:100]}{'...' if len(context) > 100 else ''}",
            criteria=criteria_list,
            created_at=now,
            updated_at=now
        )
        
        # Store the rubric
        RUBRICS[rubric.id] = rubric
        save_rubric_to_disk(rubric)
        
        return {
            "status": "success",
            "message": "Rubric generated successfully",
            "rubric": rubric.to_dict()
        }
    except Exception as e:
        logger.error(f"Error generating rubric: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating rubric: {str(e)}")

@router.put("/rubrics/{rubric_id}")
async def update_rubric(rubric_id: str, rubric_data: Dict[str, Any] = Body(...)):
    """Update an existing rubric"""
    try:
        if rubric_id not in RUBRICS:
            raise HTTPException(status_code=404, detail=f"Rubric with ID {rubric_id} not found")
            
        # Preserve the original ID and created_at timestamp
        original_rubric = RUBRICS[rubric_id]
        rubric_data["id"] = rubric_id
        rubric_data["created_at"] = original_rubric.created_at
        rubric_data["updated_at"] = datetime.now().isoformat()
        
        # Create the updated rubric object
        updated_rubric = Rubric.from_dict(rubric_data)
        
        # Store the updated rubric
        RUBRICS[rubric_id] = updated_rubric
        save_rubric_to_disk(updated_rubric)
        
        return {
            "status": "success",
            "message": "Rubric updated successfully",
            "rubric": updated_rubric.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating rubric {rubric_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating rubric: {str(e)}")

@router.delete("/rubrics/{rubric_id}")
async def delete_rubric(rubric_id: str):
    """Delete a rubric by ID"""
    try:
        if rubric_id not in RUBRICS:
            raise HTTPException(status_code=404, detail=f"Rubric with ID {rubric_id} not found")
            
        # Delete from memory
        del RUBRICS[rubric_id]
        
        # Delete from disk
        rubric_path = RUBRICS_DIR / f"{rubric_id}.json"
        if rubric_path.exists():
            rubric_path.unlink()
            
        return {
            "status": "success",
            "message": f"Rubric {rubric_id} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting rubric {rubric_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting rubric: {str(e)}")

# Initialize by loading existing rubrics
load_rubrics_from_disk() 