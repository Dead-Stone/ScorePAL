"""
Assignment model for ScorePAL MongoDB storage.
Represents assignments created by teachers.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId
from enum import Enum


class AssignmentStatus(str, Enum):
    """Assignment status enumeration."""
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    ARCHIVED = "archived"


class Assignment(BaseModel):
    """Assignment model for MongoDB."""
    
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    description: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    teacher_id: str  # User ID of the teacher who created it
    rubric_id: Optional[str] = None
    rubric: Optional[Dict[str, Any]] = None  # Embedded rubric for quick access
    
    # Assignment settings
    total_points: float = 100.0
    due_date: Optional[datetime] = None
    allow_late_submissions: bool = False
    late_penalty_percentage: float = 0.0
    
    # Status and metadata
    status: AssignmentStatus = AssignmentStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Canvas integration
    canvas_assignment_id: Optional[str] = None
    canvas_course_id: Optional[str] = None
    
    # Assignment type
    assignment_type: str = "single"  # "single" or "batch"
    
    # File references
    question_file_path: Optional[str] = None
    answer_key_file_path: Optional[str] = None
    
    # Grading settings
    strictness: float = 0.5
    auto_grade: bool = False
    
    # Metadata
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
        use_enum_values = True


class AssignmentCreate(BaseModel):
    """Schema for creating a new assignment."""
    name: str
    description: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    rubric_id: Optional[str] = None
    rubric: Optional[Dict[str, Any]] = None
    total_points: float = 100.0
    due_date: Optional[datetime] = None
    allow_late_submissions: bool = False
    late_penalty_percentage: float = 0.0
    assignment_type: str = "single"
    strictness: float = 0.5
    tags: List[str] = []


class AssignmentUpdate(BaseModel):
    """Schema for updating an assignment."""
    name: Optional[str] = None
    description: Optional[str] = None
    rubric_id: Optional[str] = None
    rubric: Optional[Dict[str, Any]] = None
    total_points: Optional[float] = None
    due_date: Optional[datetime] = None
    allow_late_submissions: Optional[bool] = None
    late_penalty_percentage: Optional[float] = None
    status: Optional[AssignmentStatus] = None
    strictness: Optional[float] = None
    tags: Optional[List[str]] = None

