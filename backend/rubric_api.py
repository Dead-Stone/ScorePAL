"""
Rubric API for ScorePAL
Handles rubric creation, management, and application
Only accessible to teachers and graders
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
import json
from pathlib import Path
from datetime import datetime

from auth.auth_config import current_active_user, require_roles
from models.user import User, UserRole

router = APIRouter(prefix="/rubrics", tags=["rubrics"])
logger = logging.getLogger(__name__)

# Pydantic models
class GradingLevel(BaseModel):
    level: str
    points: float
    description: str

class GradingCriteria(BaseModel):
    name: str
    description: str
    max_points: float
    weight: float = 1.0
    levels: Optional[List[GradingLevel]] = None

class Rubric(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    criteria: List[GradingCriteria]
    total_points: float
    strictness: Optional[float] = 0.5
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class RubricCreate(BaseModel):
    name: str
    description: Optional[str] = None
    criteria: List[GradingCriteria]
    strictness: Optional[float] = 0.5

class RubricUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    criteria: Optional[List[GradingCriteria]] = None
    strictness: Optional[float] = None

# In-memory storage for rubrics (replace with database in production)
RUBRICS: Dict[str, Rubric] = {}

def load_rubrics_from_disk():
    """Load rubrics from disk storage"""
    try:
        rubric_file = Path("data/rubrics.json")
        if rubric_file.exists():
            with open(rubric_file, 'r') as f:
                data = json.load(f)
                for rubric_data in data:
                    # Handle both old and new formats
                    if 'criteria' in rubric_data:
                        for criterion in rubric_data['criteria']:
                            if 'levels' not in criterion:
                                criterion['levels'] = None
                    rubric = Rubric(**rubric_data)
                    RUBRICS[rubric.id] = rubric
            logger.info(f"Loaded {len(RUBRICS)} rubrics from disk")
    except Exception as e:
        logger.error(f"Error loading rubrics from disk: {e}")

def save_rubrics_to_disk():
    """Save rubrics to disk storage"""
    try:
        rubric_file = Path("data/rubrics.json")
        rubric_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(rubric_file, 'w') as f:
            json.dump([rubric.dict() for rubric in RUBRICS.values()], f, indent=2)
        logger.info(f"Saved {len(RUBRICS)} rubrics to disk")
    except Exception as e:
        logger.error(f"Error saving rubrics to disk: {e}")

# Load existing rubrics on startup
load_rubrics_from_disk()

@router.get("/", response_model=List[Rubric])
async def get_rubrics(user: User = Depends(require_roles(UserRole.TEACHER, UserRole.GRADER, UserRole.ADMIN))):
    """Get all available rubrics (teachers and graders only)"""
    return list(RUBRICS.values())

@router.get("/{rubric_id}", response_model=Rubric)
async def get_rubric(rubric_id: str, user: User = Depends(require_roles(UserRole.TEACHER, UserRole.GRADER, UserRole.ADMIN))):
    """Get a specific rubric by ID (teachers and graders only)"""
    if rubric_id not in RUBRICS:
        raise HTTPException(status_code=404, detail="Rubric not found")
    return RUBRICS[rubric_id]

@router.post("/", response_model=Rubric, status_code=201)
async def create_rubric(rubric: RubricCreate, user: User = Depends(require_roles(UserRole.TEACHER, UserRole.GRADER, UserRole.ADMIN))):
    """Create a new rubric (teachers and graders only)"""
    try:
        # Calculate total points
        total_points = sum(criterion.max_points for criterion in rubric.criteria)
        
        # Create rubric with ID and timestamps
        rubric_dict = rubric.dict()
        new_rubric = Rubric(
            id=f"rubric_{len(RUBRICS) + 1}",
            name=rubric_dict.get("name"),
            description=rubric_dict.get("description"),
            criteria=rubric_dict.get("criteria", []),
            total_points=total_points,
            strictness=rubric_dict.get("strictness", 0.5),
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        RUBRICS[new_rubric.id] = new_rubric
        save_rubrics_to_disk()
        
        logger.info(f"Created rubric: {new_rubric.name}")
        return new_rubric
        
    except Exception as e:
        logger.error(f"Error creating rubric: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{rubric_id}", response_model=Rubric)
async def update_rubric(rubric_id: str, rubric_update: RubricUpdate, user: User = Depends(require_roles(UserRole.TEACHER, UserRole.GRADER, UserRole.ADMIN))):
    """Update an existing rubric (teachers and graders only)"""
    if rubric_id not in RUBRICS:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    try:
        existing_rubric = RUBRICS[rubric_id]
        
        # Update fields
        update_data = rubric_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing_rubric, field, value)
        
        # Recalculate total points if criteria changed
        if 'criteria' in update_data:
            existing_rubric.total_points = sum(criterion.max_points for criterion in existing_rubric.criteria)
        
        existing_rubric.updated_at = datetime.now().isoformat()
        
        save_rubrics_to_disk()
        
        logger.info(f"Updated rubric: {existing_rubric.name}")
        return existing_rubric
        
    except Exception as e:
        logger.error(f"Error updating rubric: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{rubric_id}")
async def delete_rubric(rubric_id: str, user: User = Depends(require_roles(UserRole.TEACHER, UserRole.GRADER, UserRole.ADMIN))):
    """Delete a rubric (teachers and graders only)"""
    if rubric_id not in RUBRICS:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    try:
        rubric_name = RUBRICS[rubric_id].name
        del RUBRICS[rubric_id]
        save_rubrics_to_disk()
        
        logger.info(f"Deleted rubric: {rubric_name}")
        return {"message": f"Rubric '{rubric_name}' deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting rubric: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{rubric_id}/apply")
async def apply_rubric(rubric_id: str, submission_data: Dict[str, Any], user: User = Depends(require_roles(UserRole.TEACHER, UserRole.GRADER, UserRole.ADMIN))):
    """Apply a rubric to grade a submission (teachers and graders only)"""
    if rubric_id not in RUBRICS:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    try:
        rubric = RUBRICS[rubric_id]
        submission_text = submission_data.get("submission_text", "")
        question_text = submission_data.get("question_text", "")
        answer_key = submission_data.get("answer_key", "")
        
        # Simple grading logic (replace with AI grading in production)
        grading_result = {
            "rubric_id": rubric_id,
            "rubric_name": rubric.name,
            "total_points": rubric.total_points,
            "criteria_scores": [],
            "overall_score": 0,
            "feedback": []
        }
        
        # Calculate scores for each criterion (simplified)
        for criterion in rubric.criteria:
            # This is a placeholder - replace with actual grading logic
            score = criterion.max_points * 0.8  # Example: 80% score
            grading_result["criteria_scores"].append({
                "name": criterion.name,
                "description": criterion.description,
                "score": score,
                "max_points": criterion.max_points,
                "feedback": f"Good work on {criterion.name.lower()}"
            })
            grading_result["overall_score"] += score
        
        grading_result["feedback"].append(f"Overall performance: {grading_result['overall_score']:.1f}/{rubric.total_points:.1f} points")
        
        return grading_result
        
    except Exception as e:
        logger.error(f"Error applying rubric: {e}")
        raise HTTPException(status_code=500, detail=str(e))
