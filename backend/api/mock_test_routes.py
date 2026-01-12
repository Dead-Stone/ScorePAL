"""
Mock Test API Routes
Generate mock tests based on course curriculum
"""

import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from pydantic import BaseModel
from auth.auth_config import current_active_user
from models.user import User
from services.mock_test_generator import mock_test_generator
from services.mongodb_service import get_user_settings_collection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mock-tests", tags=["mock-tests"])


class TestGenerationRequest(BaseModel):
    course_id: Optional[str] = None
    canvas_course_id: Optional[int] = None
    test_type: str = "comprehensive"  # comprehensive, topic_focused, assignment_based
    num_questions: int = 10
    difficulty: str = "medium"  # easy, medium, hard


@router.get("/sample-courses")
async def list_sample_courses(
    user: User = Depends(current_active_user)
):
    """List all available sample courses for mock test generation"""
    try:
        courses = mock_test_generator.list_sample_courses()
        return {
            "status": "success",
            "courses": courses
        }
    except Exception as e:
        logger.error(f"Error listing sample courses: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error listing courses: {str(e)}"
        )


@router.get("/sample-courses/{course_id}")
async def get_sample_course(
    course_id: str,
    user: User = Depends(current_active_user)
):
    """Get details of a specific sample course"""
    try:
        course = mock_test_generator.get_sample_course(course_id)
        if not course:
            raise HTTPException(
                status_code=404,
                detail=f"Course {course_id} not found"
            )
        
        return {
            "status": "success",
            "course": course
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sample course: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error getting course: {str(e)}"
        )


@router.post("/generate")
async def generate_mock_test(
    request: TestGenerationRequest = Body(...),
    user: User = Depends(current_active_user)
):
    """
    Generate a mock test based on course curriculum
    
    Can use either:
    - Sample course (course_id: 'cs101', 'ds201', etc.)
    - Canvas course (canvas_course_id: actual Canvas course ID)
    """
    try:
        # Validate request
        if not request.course_id and not request.canvas_course_id:
            raise HTTPException(
                status_code=400,
                detail="Either course_id or canvas_course_id must be provided"
            )
        
        if request.num_questions < 1 or request.num_questions > 50:
            raise HTTPException(
                status_code=400,
                detail="Number of questions must be between 1 and 50"
            )
        
        if request.difficulty not in ["easy", "medium", "hard"]:
            raise HTTPException(
                status_code=400,
                detail="Difficulty must be 'easy', 'medium', or 'hard'"
            )
        
        if request.test_type not in ["comprehensive", "topic_focused", "assignment_based"]:
            raise HTTPException(
                status_code=400,
                detail="Test type must be 'comprehensive', 'topic_focused', or 'assignment_based'"
            )
        
        # Generate from sample course
        if request.course_id:
            test = mock_test_generator.generate_test_from_course(
                course_id=request.course_id,
                test_type=request.test_type,
                num_questions=request.num_questions,
                difficulty=request.difficulty
            )
        
        # Generate from Canvas course
        elif request.canvas_course_id:
            # Fetch Canvas course data
            settings = await get_user_settings(user)
            if not settings or not settings.get("canvas_api_key"):
                raise HTTPException(
                    status_code=400,
                    detail="Canvas API key not configured. Please configure it in settings."
                )
            
            import requests
            canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
            canvas_url = canvas_url.rstrip('/')
            if not canvas_url.startswith('http'):
                canvas_url = f"https://{canvas_url}"
            
            headers = {
                "Authorization": f"Bearer {settings.get('canvas_api_key')}",
                "Content-Type": "application/json"
            }
            
            # Fetch course data
            course_response = requests.get(
                f"{canvas_url}/api/v1/courses/{request.canvas_course_id}",
                headers=headers,
                timeout=30
            )
            
            if course_response.status_code != 200:
                raise HTTPException(
                    status_code=course_response.status_code,
                    detail=f"Failed to fetch Canvas course: {course_response.text}"
                )
            
            course_data = course_response.json()
            
            # Fetch assignments
            assignments_response = requests.get(
                f"{canvas_url}/api/v1/courses/{request.canvas_course_id}/assignments",
                headers=headers,
                timeout=30
            )
            
            assignments = []
            if assignments_response.status_code == 200:
                assignments = assignments_response.json()
            
            course_data["assignments"] = assignments
            
            # Generate test
            test = mock_test_generator.generate_test_from_canvas_course(
                canvas_course_data=course_data,
                test_type=request.test_type,
                num_questions=request.num_questions,
                difficulty=request.difficulty
            )
        
        return {
            "status": "success",
            "test": test
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating mock test: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating test: {str(e)}"
        )


@router.get("/generate/quick")
async def generate_quick_test(
    course_id: str = Query(..., description="Sample course ID (e.g., cs101, ds201)"),
    num_questions: int = Query(10, ge=1, le=50),
    difficulty: str = Query("medium", regex="^(easy|medium|hard)$"),
    user: User = Depends(current_active_user)
):
    """Quick endpoint to generate a test with default settings"""
    try:
        test = mock_test_generator.generate_test_from_course(
            course_id=course_id,
            test_type="comprehensive",
            num_questions=num_questions,
            difficulty=difficulty
        )
        
        return {
            "status": "success",
            "test": test
        }
    except Exception as e:
        logger.error(f"Error generating quick test: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating test: {str(e)}"
        )


async def get_user_settings(user: User):
    """Helper to get user settings"""
    try:
        collection = await get_user_settings_collection()
        user_id = str(user.id)
        settings = await collection.find_one({"user_id": user_id})
        if settings:
            settings["id"] = str(settings["_id"])
            del settings["_id"]
        return settings
    except Exception as e:
        logger.error(f"Error getting user settings: {e}")
        return None


