"""
Grading Result model for ScorePAL MongoDB storage.
Represents the results of grading a submission.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId


class CriterionScore(BaseModel):
    """Score for a single rubric criterion."""
    criterion_name: str
    criterion_description: Optional[str] = None
    score: float
    max_points: float
    weight: float = 1.0
    feedback: Optional[str] = None
    level: Optional[str] = None  # "Excellent", "Good", etc.


class GradingResult(BaseModel):
    """Grading result model for MongoDB."""
    
    id: Optional[str] = Field(default=None, alias="_id")
    submission_id: str
    assignment_id: str
    student_id: Optional[str] = None
    student_name: str
    
    # Grader information
    grader_id: Optional[str] = None  # User ID of grader (teacher/grader)
    grader_name: Optional[str] = None
    grading_method: str = "ai"  # "ai", "manual", "hybrid"
    
    # Scores
    score: float
    total_points: float
    percentage: float
    grade_letter: Optional[str] = None  # "A", "B", "C", etc.
    
    # Rubric breakdown
    criteria_scores: List[CriterionScore] = []
    rubric_used: Optional[Dict[str, Any]] = None  # Snapshot of rubric at grading time
    rubric_id: Optional[str] = None
    
    # Feedback
    overall_feedback: Optional[str] = None
    detailed_feedback: Optional[str] = None
    strengths: List[str] = []
    weaknesses: List[str] = []
    suggestions: List[str] = []
    
    # Mistakes and deductions
    mistakes: List[Dict[str, Any]] = []  # List of identified mistakes
    
    # Grading metadata
    graded_at: datetime = Field(default_factory=datetime.utcnow)
    grading_time_seconds: Optional[float] = None
    ai_model_used: Optional[str] = None
    strictness: float = 0.5
    
    # Status
    is_final: bool = True
    is_regrade: bool = False
    regrade_reason: Optional[str] = None
    previous_result_id: Optional[str] = None  # If this is a regrade
    
    # File references
    question_text: Optional[str] = None
    answer_key_text: Optional[str] = None
    submission_text: Optional[str] = None
    
    # Canvas integration
    canvas_grade_posted: bool = False
    canvas_grade_posted_at: Optional[datetime] = None
    
    # Metadata
    metadata: Dict[str, Any] = {}
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class GradingResultCreate(BaseModel):
    """Schema for creating a grading result."""
    submission_id: str
    assignment_id: str
    student_id: Optional[str] = None
    student_name: str
    grader_id: Optional[str] = None
    grader_name: Optional[str] = None
    grading_method: str = "ai"
    score: float
    total_points: float
    percentage: float
    grade_letter: Optional[str] = None
    criteria_scores: List[Dict[str, Any]] = []
    rubric_used: Optional[Dict[str, Any]] = None
    rubric_id: Optional[str] = None
    overall_feedback: Optional[str] = None
    detailed_feedback: Optional[str] = None
    strengths: List[str] = []
    weaknesses: List[str] = []
    suggestions: List[str] = []
    mistakes: List[Dict[str, Any]] = []
    ai_model_used: Optional[str] = None
    strictness: float = 0.5


class GradingResultUpdate(BaseModel):
    """Schema for updating a grading result."""
    score: Optional[float] = None
    percentage: Optional[float] = None
    grade_letter: Optional[str] = None
    criteria_scores: Optional[List[Dict[str, Any]]] = None
    overall_feedback: Optional[str] = None
    detailed_feedback: Optional[str] = None
    is_final: Optional[bool] = None
    canvas_grade_posted: Optional[bool] = None

