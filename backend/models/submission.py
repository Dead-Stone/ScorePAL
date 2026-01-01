"""
Submission model for ScorePAL MongoDB storage.
Represents student submissions for assignments.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId
from enum import Enum


class SubmissionStatus(str, Enum):
    """Submission status enumeration."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    GRADED = "graded"
    RETURNED = "returned"
    LATE = "late"


class Submission(BaseModel):
    """Submission model for MongoDB."""
    
    id: Optional[str] = Field(default=None, alias="_id")
    assignment_id: str
    student_id: Optional[str] = None  # User ID if student is registered
    student_name: str  # Name for unregistered students or Canvas submissions
    student_email: Optional[str] = None
    
    # File information
    files: List[Dict[str, Any]] = []  # List of file metadata: {path, name, type, size}
    submission_text: Optional[str] = None  # Extracted text content
    file_count: int = 0
    
    # Submission metadata
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    status: SubmissionStatus = SubmissionStatus.SUBMITTED
    is_late: bool = False
    late_days: int = 0
    
    # Canvas integration
    canvas_submission_id: Optional[str] = None
    canvas_user_id: Optional[str] = None
    canvas_attempt: Optional[int] = None
    
    # Processing metadata
    extraction_method: Optional[str] = None  # "pdf", "ocr", "text", etc.
    extraction_confidence: Optional[float] = None
    processed_at: Optional[datetime] = None
    
    # Grading reference
    grading_result_id: Optional[str] = None  # Reference to GradingResult
    
    # Metadata
    metadata: Dict[str, Any] = {}
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
        use_enum_values = True


class SubmissionCreate(BaseModel):
    """Schema for creating a new submission."""
    assignment_id: str
    student_id: Optional[str] = None
    student_name: str
    student_email: Optional[str] = None
    files: List[Dict[str, Any]] = []
    submission_text: Optional[str] = None
    canvas_submission_id: Optional[str] = None
    canvas_user_id: Optional[str] = None


class SubmissionUpdate(BaseModel):
    """Schema for updating a submission."""
    files: Optional[List[Dict[str, Any]]] = None
    submission_text: Optional[str] = None
    status: Optional[SubmissionStatus] = None
    grading_result_id: Optional[str] = None

