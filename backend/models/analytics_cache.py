"""
Analytics Cache model for ScorePAL MongoDB storage.
Pre-computed analytics for performance optimization.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId


class ClassStats(BaseModel):
    """Class-level statistics for an assignment."""
    total_submissions: int
    graded_submissions: int
    average_score: float
    median_score: float
    mode_score: Optional[float] = None
    highest_score: float
    lowest_score: float
    pass_rate: float  # Percentage of students who passed
    fail_rate: float
    standard_deviation: Optional[float] = None
    grade_distribution: Dict[str, int] = {}  # {"A": 5, "B": 10, ...}


class RubricPerformance(BaseModel):
    """Rubric criterion performance statistics."""
    criterion_name: str
    average_score: float
    max_points: float
    average_percentage: float
    common_feedback: List[str] = []
    difficulty_level: Optional[str] = None  # "easy", "medium", "hard"


class StudentRanking(BaseModel):
    """Student ranking information (anonymized for privacy)."""
    rank: int
    score: float
    percentage: float
    is_anonymized: bool = True


class AnalyticsCache(BaseModel):
    """Analytics cache model for MongoDB."""
    
    id: Optional[str] = Field(default=None, alias="_id")
    assignment_id: str
    cache_type: str  # "assignment", "student", "rubric", "class"
    
    # Assignment-level analytics
    class_stats: Optional[ClassStats] = None
    rubric_performance: List[RubricPerformance] = []
    student_rankings: List[StudentRanking] = []  # Anonymized for privacy
    
    # Student-level analytics (if cache_type is "student")
    student_id: Optional[str] = None
    student_stats: Optional[Dict[str, Any]] = None
    progress_trend: Optional[List[Dict[str, Any]]] = None
    strength_weakness: Optional[Dict[str, Any]] = None
    
    # Rubric-level analytics (if cache_type is "rubric")
    rubric_id: Optional[str] = None
    rubric_stats: Optional[Dict[str, Any]] = None
    
    # Common mistakes and patterns
    common_mistakes: List[Dict[str, Any]] = []
    improvement_areas: List[str] = []
    
    # Computation metadata
    computed_at: datetime = Field(default_factory=datetime.utcnow)
    computation_time_seconds: Optional[float] = None
    data_snapshot_count: int = 0  # Number of results used in computation
    
    # Cache expiration
    expires_at: Optional[datetime] = None
    is_stale: bool = False
    
    # Metadata
    metadata: Dict[str, Any] = {}
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

