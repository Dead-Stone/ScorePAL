"""
Public Grading API Routes for ScorePAL
Handles grading without saving results (for non-logged in users)
"""

import logging
import os
import tempfile
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from ..services.file_preprocessor import FilePreprocessor
from ..multi_agent_grading import MultiAgentGradingSystem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/grade-public", tags=["public-grading"])

# Initialize services
file_preprocessor = FilePreprocessor()
grading_system = MultiAgentGradingSystem()


@router.post("/generate-rubric")
async def generate_rubric_public(
    question_paper: UploadFile = File(...),
    rubric_context: Optional[str] = Form(""),
    total_points: Optional[int] = Form(100)
):
    """
    Generate a rubric from a question paper using AI (public endpoint).
    Returns the generated rubric without saving it.
    """
    try:
        logger.info("Public rubric generation request")
        
        # Validate file type
        question_ext = Path(question_paper.filename).suffix.lower()
        if question_ext not in ['.pdf', '.docx', '.doc', '.txt']:
            raise HTTPException(status_code=400, detail="Question paper must be PDF, DOCX, DOC, or TXT format")
        
        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Save uploaded file temporarily
            question_path = temp_path / f"question{question_ext}"
            with open(question_path, "wb") as f:
                content = await question_paper.read()
                f.write(content)
            
            # Extract text from question paper
            question_text = file_preprocessor.extract_text_from_file(str(question_path))
            if not question_text or len(question_text.strip()) < 10:
                raise HTTPException(status_code=400, detail="Could not extract text from question paper")
            
            # Generate rubric using AI
            from backend.rubric_generation import get_rubric_from_text
            
            context = rubric_context or f"Generate a comprehensive grading rubric for this assignment. Total points should be {total_points}."
            
            rubric = get_rubric_from_text(
                question=question_text,
                rubric_text=context,
                api_key=os.getenv("GEMINI_API_KEY")
            )
            
            # Adjust total points if needed
            if rubric.get('total_points') != total_points:
                scale_factor = total_points / rubric.get('total_points', 100)
                
                if 'sections' in rubric:
                    for section in rubric['sections']:
                        section['max_points'] = int(section['max_points'] * scale_factor)
                        for criterion in section.get('criteria', []):
                            criterion['points'] = int(criterion['points'] * scale_factor)
                            for scale_item in criterion.get('grading_scale', []):
                                scale_item['points'] = int(scale_item['points'] * scale_factor)
                
                rubric['total_points'] = total_points
            
            # Convert sections format to criteria format for compatibility
            criteria_list = []
            if 'sections' in rubric:
                for section in rubric['sections']:
                    for criterion in section.get('criteria', []):
                        criteria_list.append({
                            "name": criterion.get('name', 'Criterion'),
                            "max_points": criterion.get('points', 0),
                            "description": criterion.get('description', '')
                        })
            
            # Return in both formats for compatibility
            return {
                "status": "success",
                "rubric": {
                    "criteria": criteria_list if criteria_list else rubric.get('criteria', []),
                    "total_points": rubric.get('total_points', total_points),
                    "sections": rubric.get('sections', [])
                },
                "raw_rubric": rubric
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in public rubric generation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating rubric: {str(e)}")


@router.post("/grade-single")
async def grade_single_public(
    student_name: str = Form(...),
    assignment_name: str = Form(...),
    question_paper: UploadFile = File(...),
    submission: UploadFile = File(...),
    answer_key: Optional[UploadFile] = File(None),
    strictness: float = Form(0.5),
    rubric_id: Optional[str] = Form(None),
    rubric_json: Optional[str] = Form(None)
):
    """
    Grade a single submission without saving results (public endpoint).
    Returns grading results directly without storing them.
    """
    try:
        logger.info(f"Public grading request for student: {student_name}, assignment: {assignment_name}")
        
        # Validate file types
        question_ext = Path(question_paper.filename).suffix.lower()
        if question_ext not in ['.pdf', '.docx', '.doc']:
            raise HTTPException(status_code=400, detail="Question paper must be PDF or DOCX format")
        
        submission_ext = Path(submission.filename).suffix.lower()
        if submission_ext not in ['.pdf', '.docx', '.doc', '.txt']:
            raise HTTPException(status_code=400, detail="Submission must be PDF, DOCX, or TXT format")
        
        # Validate strictness
        strictness = float(strictness)
        if not 0.0 <= strictness <= 1.0:
            raise HTTPException(status_code=400, detail="Strictness must be between 0.0 and 1.0")
        
        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Save uploaded files temporarily
            question_path = temp_path / f"question{question_ext}"
            submission_path = temp_path / f"submission{submission_ext}"
            
            # Save question paper
            with open(question_path, "wb") as f:
                content = await question_paper.read()
                f.write(content)
            
            # Save submission
            with open(submission_path, "wb") as f:
                content = await submission.read()
                f.write(content)
            
            # Extract text from question paper
            question_text = file_preprocessor.extract_text_from_file(str(question_path))
            if not question_text or len(question_text.strip()) < 10:
                raise HTTPException(status_code=400, detail="Could not extract text from question paper")
            
            # Extract text from submission
            submission_text = file_preprocessor.extract_text_from_file(str(submission_path))
            if not submission_text or len(submission_text.strip()) < 10:
                raise HTTPException(status_code=400, detail="Could not extract text from submission")
            
            # Extract answer key if provided
            answer_key_text = ""
            if answer_key:
                answer_key_ext = Path(answer_key.filename).suffix.lower()
                if answer_key_ext not in ['.pdf', '.docx', '.doc', '.txt']:
                    raise HTTPException(status_code=400, detail="Answer key must be PDF, DOCX, or TXT format")
                
                answer_key_path = temp_path / f"answer_key{answer_key_ext}"
                with open(answer_key_path, "wb") as f:
                    content = await answer_key.read()
                    f.write(content)
                
                answer_key_text = file_preprocessor.extract_text_from_file(str(answer_key_path))
            
            # Default rubric
            default_rubric = {
                "criteria": [
                    {
                        "name": "Content Understanding",
                        "max_points": 30,
                        "description": "Understanding of core concepts and materials"
                    },
                    {
                        "name": "Analysis",
                        "max_points": 25,
                        "description": "Critical thinking and analytical skills"
                    },
                    {
                        "name": "Organization",
                        "max_points": 20,
                        "description": "Structure, flow, and clarity"
                    },
                    {
                        "name": "Evidence",
                        "max_points": 15,
                        "description": "Use of supporting evidence and examples"
                    },
                    {
                        "name": "Language & Mechanics",
                        "max_points": 10,
                        "description": "Grammar, spelling, and writing mechanics"
                    }
                ],
                "total_points": 100
            }
            
            # Load custom rubric if provided
            rubric = default_rubric
            if rubric_json:
                try:
                    import json
                    rubric = json.loads(rubric_json)
                    # Ensure it has the right format
                    if 'criteria' not in rubric:
                        # Convert from sections format if needed
                        if 'sections' in rubric:
                            criteria_list = []
                            for section in rubric['sections']:
                                for criterion in section.get('criteria', []):
                                    criteria_list.append({
                                        "name": criterion.get('name', 'Criterion'),
                                        "max_points": criterion.get('points', 0),
                                        "description": criterion.get('description', '')
                                    })
                            rubric = {
                                "criteria": criteria_list,
                                "total_points": rubric.get('total_points', 100)
                            }
                except Exception as e:
                    logger.warning(f"Could not parse rubric JSON: {e}, using default")
            elif rubric_id:
                try:
                    from rubric_api import RUBRICS, load_rubrics_from_disk
                    if not RUBRICS:
                        load_rubrics_from_disk()
                    
                    if rubric_id in RUBRICS:
                        rubric_obj = RUBRICS[rubric_id]
                        rubric = {
                            "criteria": [
                                {
                                    "name": c.name,
                                    "max_points": c.max_points,
                                    "description": c.description
                                }
                                for c in rubric_obj.criteria
                            ],
                            "total_points": sum(c.max_points for c in rubric_obj.criteria)
                        }
                except Exception as e:
                    logger.warning(f"Could not load rubric {rubric_id}: {e}, using default")
            
            # Grade the submission (without saving)
            logger.info(f"Grading submission for {student_name}")
            grading_result = await grading_system.grade_single(
                submission_text=submission_text,
                question_text=question_text,
                answer_key=answer_key_text,
                student_name=student_name,
                assignment_id=assignment_name,
                rubric=rubric,
                strictness=strictness,
                file_path=str(submission_path)
            )
            
            if not grading_result:
                raise HTTPException(status_code=500, detail="Grading service returned empty result")
            
            # Return result without saving
            return {
                "status": "success",
                "result": grading_result,
                "student_name": student_name,
                "assignment_name": assignment_name,
                "graded_at": grading_result.get("timestamp"),
                "saved": False  # Indicate this was not saved
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in public grading: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error grading submission: {str(e)}")

