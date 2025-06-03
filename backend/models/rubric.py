"""
Rubric model for ScorePAL grading system.
"""

from typing import Dict, List, Optional, Union, Any
from datetime import datetime

class GradingCriteria:
    """A single grading criterion within a rubric."""
    
    def __init__(
        self,
        name: str,
        description: str,
        max_points: int,
        weight: float = 1.0,
        levels: Optional[List[Dict[str, Any]]] = None
    ):
        """
        Initialize a grading criterion.
        
        Args:
            name: Name of the criterion (e.g., "Content Understanding")
            description: Description of what this criterion evaluates
            max_points: Maximum points possible for this criterion
            weight: Weight of this criterion in the overall grade (default: 1.0)
            levels: Optional list of scoring levels with descriptions
        """
        self.name = name
        self.description = description
        self.max_points = max_points
        self.weight = weight
        self.levels = levels or []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "name": self.name,
            "description": self.description,
            "max_points": self.max_points,
            "weight": self.weight,
            "levels": self.levels
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GradingCriteria':
        """Create a GradingCriteria from a dictionary."""
        return cls(
            name=data.get("name", ""),
            description=data.get("description", ""),
            max_points=data.get("max_points", 0),
            weight=data.get("weight", 1.0),
            levels=data.get("levels", [])
        )


class Rubric:
    """A rubric containing multiple grading criteria."""
    
    def __init__(
        self,
        name: str,
        description: str,
        criteria: List[GradingCriteria],
        strictness: float = 0.5,
        id: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        """
        Initialize a grading rubric.
        
        Args:
            name: Name of the rubric
            description: Description of the rubric
            criteria: List of grading criteria
            strictness: Grading strictness from 0.0 (lenient) to 1.0 (strict)
            id: Optional unique identifier
            created_at: Optional creation timestamp
            updated_at: Optional last update timestamp
        """
        self.name = name
        self.description = description
        self.criteria = criteria
        self.strictness = max(0.0, min(1.0, strictness))  # Ensure between 0 and 1
        self.id = id or f"rubric_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.created_at = created_at or datetime.now().isoformat()
        self.updated_at = updated_at or self.created_at
    
    @property
    def total_points(self) -> int:
        """Calculate the total possible points for this rubric."""
        return sum(criterion.max_points for criterion in self.criteria)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "criteria": [criterion.to_dict() for criterion in self.criteria],
            "strictness": self.strictness,
            "total_points": self.total_points,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Rubric':
        """Create a Rubric from a dictionary."""
        criteria = [
            GradingCriteria.from_dict(criterion_data) 
            for criterion_data in data.get("criteria", [])
        ]
        
        return cls(
            name=data.get("name", ""),
            description=data.get("description", ""),
            criteria=criteria,
            strictness=data.get("strictness", 0.5),
            id=data.get("id"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )
    
    @classmethod
    def create_default(cls) -> 'Rubric':
        """Create a default rubric for assignments."""
        criteria = [
            GradingCriteria(
                name="Content Understanding",
                description="Demonstrates understanding of the core concepts and materials",
                max_points=25,
                levels=[
                    {"level": "Excellent", "points": 25, "description": "Exceptional understanding and application of concepts"},
                    {"level": "Good", "points": 20, "description": "Strong understanding of most concepts"},
                    {"level": "Satisfactory", "points": 15, "description": "Adequate understanding of basic concepts"},
                    {"level": "Needs Improvement", "points": 10, "description": "Limited understanding of concepts"},
                    {"level": "Unsatisfactory", "points": 5, "description": "Minimal understanding of key concepts"}
                ]
            ),
            GradingCriteria(
                name="Critical Analysis",
                description="Applies critical thinking and analytical skills",
                max_points=25,
                levels=[
                    {"level": "Excellent", "points": 25, "description": "Sophisticated analysis with original insights"},
                    {"level": "Good", "points": 20, "description": "Thoughtful analysis with some insights"},
                    {"level": "Satisfactory", "points": 15, "description": "Basic analysis with few insights"},
                    {"level": "Needs Improvement", "points": 10, "description": "Limited analysis, mostly description"},
                    {"level": "Unsatisfactory", "points": 5, "description": "No meaningful analysis"}
                ]
            ),
            GradingCriteria(
                name="Organization & Structure",
                description="Work is well-organized with logical flow",
                max_points=20,
                levels=[
                    {"level": "Excellent", "points": 20, "description": "Exceptional organization, enhances understanding"},
                    {"level": "Good", "points": 16, "description": "Clear organization with logical flow"},
                    {"level": "Satisfactory", "points": 12, "description": "Adequate organization with some issues"},
                    {"level": "Needs Improvement", "points": 8, "description": "Disorganized in several areas"},
                    {"level": "Unsatisfactory", "points": 4, "description": "Severely disorganized, hard to follow"}
                ]
            ),
            GradingCriteria(
                name="Evidence & Support",
                description="Uses appropriate evidence to support arguments",
                max_points=20,
                levels=[
                    {"level": "Excellent", "points": 20, "description": "Comprehensive, relevant evidence throughout"},
                    {"level": "Good", "points": 16, "description": "Strong evidence in most areas"},
                    {"level": "Satisfactory", "points": 12, "description": "Adequate evidence in some areas"},
                    {"level": "Needs Improvement", "points": 8, "description": "Limited evidence, weak support"},
                    {"level": "Unsatisfactory", "points": 4, "description": "Minimal or no supporting evidence"}
                ]
            ),
            GradingCriteria(
                name="Communication",
                description="Clarity, precision, and effectiveness of communication",
                max_points=10,
                levels=[
                    {"level": "Excellent", "points": 10, "description": "Exceptionally clear and effective communication"},
                    {"level": "Good", "points": 8, "description": "Clear communication with minor issues"},
                    {"level": "Satisfactory", "points": 6, "description": "Generally clear but with some issues"},
                    {"level": "Needs Improvement", "points": 4, "description": "Unclear in many areas"},
                    {"level": "Unsatisfactory", "points": 2, "description": "Very unclear throughout"}
                ]
            )
        ]
        
        return cls(
            name="Default Assignment Rubric",
            description="A standard rubric for evaluating written assignments",
            criteria=criteria,
            strictness=0.5
        ) 