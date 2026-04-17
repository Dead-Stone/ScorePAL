"""
Rubric API for ScorePAL
Handles rubric creation, management, and application with AI generation
Only accessible to teachers and graders
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
import json
from pathlib import Path
from datetime import datetime
import os

from .auth.auth_config import current_active_user, require_roles
from .models.user import User, UserRole

router = APIRouter(prefix="/rubrics", tags=["rubrics"])
logger = logging.getLogger(__name__)

# AI client imports
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

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

class RubricGenerateRequest(BaseModel):
    assignment_type: str
    description: str
    total_points: int = 100
    criteria_count: int = 5
    include_levels: bool = True
    question: Optional[str] = None  # Question/assignment text to use for rubric generation

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


@router.post("/generate")
async def generate_rubric_with_ai(
    request: RubricGenerateRequest,
    user: User = Depends(require_roles(UserRole.TEACHER, UserRole.GRADER, UserRole.ADMIN))
):
    """Generate a rubric using AI based on assignment type and description"""
    try:
        logger.info(f"Generating rubric for assignment type: {request.assignment_type}")
        
        # Build the prompt for AI
        question_section = ""
        if request.question:
            question_section = f"""

Question/Assignment Content:
{request.question}

IMPORTANT: Use the specific question/assignment content above to create criteria that directly align with the requirements, topics, and expectations stated in the assignment. The rubric should evaluate how well students address the specific questions and requirements in the assignment content.
"""
        
        prompt = f"""Generate a detailed grading rubric for the following assignment:

Assignment Type: {request.assignment_type}
Description: {request.description}{question_section}
Total Points: {request.total_points}
Number of Criteria: {request.criteria_count}
Include Performance Levels: {request.include_levels}

Generate a JSON response with the following structure:
{{
    "name": "Rubric name based on assignment type",
    "description": "Brief description of what this rubric evaluates",
    "criteria": [
        {{
            "name": "Criterion name",
            "description": "Detailed description of what this criterion evaluates",
            "max_points": <points as number>,
            "weight": 1.0,
            "levels": [
                {{"name": "Excellent", "points": <max_points>, "description": "Exceeds all expectations"}},
                {{"name": "Good", "points": <80% of max>, "description": "Meets expectations well"}},
                {{"name": "Satisfactory", "points": <60% of max>, "description": "Meets basic requirements"}},
                {{"name": "Needs Improvement", "points": <40% of max>, "description": "Below expectations"}},
                {{"name": "Unsatisfactory", "points": 0, "description": "Does not meet requirements"}}
            ]
        }}
    ]
}}

Make sure:
1. The sum of all criteria max_points equals {request.total_points}
2. Generate exactly {request.criteria_count} criteria
3. Make criteria specific to the assignment type "{request.assignment_type}"
4. Each criterion should have clear, measurable expectations
{"5. Include detailed performance levels for each criterion" if request.include_levels else "5. Do not include levels array"}
{"6. Use the question/assignment content provided above to create criteria that are directly relevant to the specific requirements and topics in the assignment" if request.question else ""}

Return ONLY valid JSON, no markdown or explanation."""

        generated_rubric = None
        
        # Try Gemini first
        if GEMINI_AVAILABLE:
            gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if gemini_key:
                try:
                    genai.configure(api_key=gemini_key)
                    model = genai.GenerativeModel('gemini-1.5-flash')
                    response = model.generate_content(prompt)
                    response_text = response.text.strip()
                    
                    # Clean up response
                    if response_text.startswith("```json"):
                        response_text = response_text[7:]
                    if response_text.startswith("```"):
                        response_text = response_text[3:]
                    if response_text.endswith("```"):
                        response_text = response_text[:-3]
                    
                    generated_rubric = json.loads(response_text.strip())
                    logger.info("Rubric generated successfully with Gemini")
                except Exception as e:
                    logger.warning(f"Gemini generation failed: {e}")
        
        # Try OpenAI as fallback
        if generated_rubric is None and OPENAI_AVAILABLE:
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key:
                try:
                    client = openai.OpenAI(api_key=openai_key)
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are an expert educator who creates detailed grading rubrics. Always respond with valid JSON only."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.7,
                        max_tokens=2000
                    )
                    response_text = response.choices[0].message.content.strip()
                    
                    # Clean up response
                    if response_text.startswith("```json"):
                        response_text = response_text[7:]
                    if response_text.startswith("```"):
                        response_text = response_text[3:]
                    if response_text.endswith("```"):
                        response_text = response_text[:-3]
                    
                    generated_rubric = json.loads(response_text.strip())
                    logger.info("Rubric generated successfully with OpenAI")
                except Exception as e:
                    logger.warning(f"OpenAI generation failed: {e}")
        
        # If AI generation failed, create a template-based rubric
        if generated_rubric is None:
            logger.info("Using template-based rubric generation")
            generated_rubric = generate_template_rubric(request)
        
        # Validate and normalize the rubric
        validated_rubric = validate_generated_rubric(generated_rubric, request)
        
        return {"rubric": validated_rubric, "generated_by": "ai" if generated_rubric != generate_template_rubric(request) else "template"}
        
    except Exception as e:
        logger.error(f"Error generating rubric: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate rubric: {str(e)}")


def generate_template_rubric(request: RubricGenerateRequest) -> Dict:
    """Generate a template-based rubric when AI is not available"""
    points_per_criterion = request.total_points // request.criteria_count
    remainder = request.total_points % request.criteria_count
    
    # Define criteria templates based on assignment type
    templates = {
        "essay": [
            ("Thesis & Argument", "Clear thesis statement with well-developed supporting arguments and evidence"),
            ("Content & Analysis", "Depth of analysis, critical thinking, and use of relevant examples"),
            ("Organization", "Logical flow, paragraph structure, and effective transitions"),
            ("Writing Quality", "Grammar, spelling, punctuation, and academic style"),
            ("Citations & Sources", "Proper use and integration of sources with correct citation format"),
        ],
        "programming": [
            ("Functionality", "Program runs correctly and produces expected output for all test cases"),
            ("Code Quality", "Clean, readable code with proper naming conventions and structure"),
            ("Algorithm Efficiency", "Optimal time and space complexity for the given problem"),
            ("Documentation", "Clear comments, docstrings, and README documentation"),
            ("Error Handling", "Proper handling of edge cases and error conditions"),
        ],
        "presentation": [
            ("Content Knowledge", "Demonstrates thorough understanding and mastery of the topic"),
            ("Organization", "Clear introduction, body, and conclusion with logical flow"),
            ("Delivery", "Confident speaking, appropriate pace, and audience engagement"),
            ("Visual Aids", "Professional slides with effective use of graphics and text"),
            ("Q&A Response", "Ability to answer questions and engage in discussion"),
        ],
        "lab_report": [
            ("Introduction & Hypothesis", "Clear background, purpose, and testable hypothesis"),
            ("Methodology", "Detailed, reproducible experimental procedures"),
            ("Data Collection", "Accurate measurements with proper units and precision"),
            ("Analysis & Results", "Correct data analysis with appropriate graphs/tables"),
            ("Conclusion", "Sound interpretation of results and suggestions for improvement"),
        ],
        "project": [
            ("Planning & Design", "Well-defined goals, timeline, and project scope"),
            ("Implementation", "Quality of execution and technical skills demonstrated"),
            ("Innovation", "Creativity and originality in approach and solutions"),
            ("Teamwork", "Effective collaboration and communication within team"),
            ("Final Deliverable", "Completeness and quality of final product/presentation"),
        ],
    }
    
    # Get template or use generic
    criteria_templates = templates.get(request.assignment_type, [
        (f"Criterion {i+1}", f"Evaluation criterion {i+1} for this assignment")
        for i in range(request.criteria_count)
    ])
    
    # Ensure we have enough criteria
    while len(criteria_templates) < request.criteria_count:
        idx = len(criteria_templates) + 1
        criteria_templates.append((f"Additional Criterion {idx}", f"Additional evaluation criterion {idx}"))
    
    criteria = []
    for i in range(request.criteria_count):
        name, description = criteria_templates[i]
        pts = points_per_criterion + (1 if i < remainder else 0)
        
        criterion = {
            "name": name,
            "description": description,
            "max_points": pts,
            "weight": 1.0,
        }
        
        if request.include_levels:
            criterion["levels"] = [
                {"name": "Excellent", "points": pts, "description": "Exceeds all expectations"},
                {"name": "Good", "points": int(pts * 0.8), "description": "Meets expectations well"},
                {"name": "Satisfactory", "points": int(pts * 0.6), "description": "Meets basic requirements"},
                {"name": "Needs Improvement", "points": int(pts * 0.4), "description": "Below expectations"},
                {"name": "Unsatisfactory", "points": 0, "description": "Does not meet requirements"},
            ]
        
        criteria.append(criterion)
    
    return {
        "name": f"{request.assignment_type.replace('_', ' ').title()} Rubric",
        "description": request.description,
        "criteria": criteria,
    }


def validate_generated_rubric(rubric: Dict, request: RubricGenerateRequest) -> Dict:
    """Validate and normalize AI-generated rubric"""
    # Ensure required fields
    if "name" not in rubric:
        rubric["name"] = f"{request.assignment_type.replace('_', ' ').title()} Rubric"
    
    if "description" not in rubric:
        rubric["description"] = request.description
    
    if "criteria" not in rubric or not isinstance(rubric["criteria"], list):
        return generate_template_rubric(request)
    
    # Normalize criteria
    total_points = 0
    for criterion in rubric["criteria"]:
        if "max_points" not in criterion:
            criterion["max_points"] = request.total_points // len(rubric["criteria"])
        if "weight" not in criterion:
            criterion["weight"] = 1.0
        if "description" not in criterion:
            criterion["description"] = ""
        total_points += criterion["max_points"]
    
    # Adjust points to match requested total
    if total_points != request.total_points and len(rubric["criteria"]) > 0:
        diff = request.total_points - total_points
        rubric["criteria"][0]["max_points"] += diff
        
        # Update levels if present
        if "levels" in rubric["criteria"][0]:
            for level in rubric["criteria"][0]["levels"]:
                if level["name"] == "Excellent":
                    level["points"] = rubric["criteria"][0]["max_points"]
    
    return rubric
