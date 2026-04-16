"""
Settings API Routes for ScorePAL
Handles user settings including Canvas API key management
With caching for faster Canvas API responses
Optimized with async HTTP calls and parallel execution
"""

import logging
import asyncio
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import requests
import httpx
from models.user import User
from models.user_settings import UserSettings, UserSettingsUpdate, CanvasKeyTestResponse
from auth.auth_config import current_active_user, require_teacher_or_admin, require_grader_or_admin
from services.mongodb_service import get_user_settings_collection
from bson import ObjectId
from utils.cache_service import (
    cache, 
    CACHE_TTL_CONFIG, 
    CACHE_TTL_COURSES, 
    CACHE_TTL_DETAILS,
    CACHE_TTL_STUDENTS,
    CACHE_TTL_SUBMISSIONS,
    invalidate_user_canvas_cache
)

# Async HTTP client settings for Canvas API
CANVAS_TIMEOUT = 15.0  # 15 second timeout for async calls
CANVAS_MAX_CONNECTIONS = 20  # Maximum concurrent connections


async def async_canvas_get(url: str, headers: Dict[str, str], timeout: float = CANVAS_TIMEOUT) -> Dict[str, Any]:
    """Make async GET request to Canvas API with proper error handling."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(url, headers=headers)
        return {
            "status_code": response.status_code,
            "data": response.json() if response.status_code == 200 else None,
            "text": response.text,
            "headers": dict(response.headers)
        }


async def parallel_canvas_requests(requests_config: List[Dict[str, Any]], headers: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    Execute multiple Canvas API requests in parallel.
    
    Args:
        requests_config: List of dicts with 'url' and optional 'key' for result mapping
        headers: Authorization headers for Canvas API
        
    Returns:
        List of response dicts in the same order as requests_config
    """
    async with httpx.AsyncClient(timeout=CANVAS_TIMEOUT, limits=httpx.Limits(max_connections=CANVAS_MAX_CONNECTIONS)) as client:
        async def fetch(config):
            url = config.get("url")
            try:
                response = await client.get(url, headers=headers)
                return {
                    "key": config.get("key"),
                    "status_code": response.status_code,
                    "data": response.json() if response.status_code == 200 else None,
                    "text": response.text if response.status_code != 200 else None,
                    "headers": dict(response.headers)
                }
            except Exception as e:
                logger.error(f"Error fetching {url}: {e}")
                return {
                    "key": config.get("key"),
                    "status_code": 500,
                    "data": None,
                    "text": str(e),
                    "headers": {}
                }
        
        tasks = [fetch(config) for config in requests_config]
        return await asyncio.gather(*tasks)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


async def get_user_settings(user: User) -> Optional[dict]:
    """Get user settings from database."""
    try:
        if not user or not user.id:
            logger.warning("User or user.id is None")
            return None
        collection = await get_user_settings_collection()
        user_id = str(user.id)  # Ensure it's a string
        settings = await collection.find_one({"user_id": user_id})
        if settings:
            settings["id"] = str(settings["_id"])
            del settings["_id"]
        return settings
    except Exception as e:
        logger.error(f"Error getting user settings: {e}", exc_info=True)
        return None


@router.post("/canvas/cache/clear")
async def clear_canvas_cache(
    user: User = Depends(current_active_user)
):
    """
    Clear Canvas API cache for the current user.
    Use this when you need to force refresh data from Canvas.
    """
    user_id = str(user.id)
    invalidate_user_canvas_cache(user_id)
    # Also clear course-specific caches
    cache.clear_prefix(f"canvas_courses_{user_id}")
    cache.clear_prefix(f"canvas_details_{user_id}")
    cache.clear_prefix(f"canvas_students_{user_id}")
    logger.info(f"Cleared Canvas cache for user {user_id}")
    return {"status": "success", "message": "Canvas cache cleared"}


@router.get("/canvas")
async def get_canvas_settings(
    user: User = Depends(current_active_user)
):
    """
    Get user's Canvas API settings.
    Returns API key status (not the actual key) and Canvas URL.
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings:
            return {
                "canvas_key_configured": False,
                "canvas_url": None,
                "canvas_key_valid": False
            }
        
        return {
            "canvas_key_configured": settings.get("canvas_key_configured", False),
            "canvas_url": settings.get("canvas_url"),
            "canvas_key_valid": settings.get("canvas_key_valid", False),
            "canvas_key_last_tested": settings.get("canvas_key_last_tested")
        }
    except Exception as e:
        logger.error(f"Error getting Canvas settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving settings: {str(e)}")


@router.put("/canvas")
async def update_canvas_settings(
    settings_update: UserSettingsUpdate,
    user: User = Depends(current_active_user)
):
    """
    Update user's Canvas API key and URL.
    """
    try:
        collection = await get_user_settings_collection()
        
        # Check if user has a different LMS configured and clear it
        existing_settings = await collection.find_one({"user_id": user.id})
        if existing_settings and existing_settings.get("lms_type") and existing_settings.get("lms_type") != "canvas":
            # Clear other LMS configuration
            await collection.update_one(
                {"user_id": user.id},
                {
                    "$unset": {
                        "moodle_api_key": "",
                        "moodle_url": "",
                        "moodle_key_configured": "",
                        "blackboard_api_key": "",
                        "blackboard_url": "",
                        "blackboard_key_configured": "",
                    }
                }
            )
        
        # Prepare update data
        update_data = {
            "updated_at": datetime.utcnow(),
            "lms_type": "canvas"  # Set LMS type to canvas
        }
        
        if settings_update.canvas_api_key is not None:
            update_data["canvas_api_key"] = settings_update.canvas_api_key
            update_data["canvas_key_configured"] = bool(settings_update.canvas_api_key)
            # Reset validation status when key is updated
            update_data["canvas_key_valid"] = False
            update_data["canvas_key_last_tested"] = None
        
        if settings_update.canvas_url is not None:
            update_data["canvas_url"] = settings_update.canvas_url
        
        # Upsert settings
        result = await collection.update_one(
            {"user_id": user.id},
            {
                "$set": update_data,
                "$setOnInsert": {
                    "user_id": user.id,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return {
            "status": "success",
            "message": "Canvas settings updated successfully",
            "canvas_key_configured": update_data.get("canvas_key_configured", False)
        }
    except Exception as e:
        logger.error(f"Error updating Canvas settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")


@router.delete("/canvas")
async def delete_canvas_settings(
    user: User = Depends(current_active_user)
):
    """
    Delete user's Canvas API settings and clear LMS type.
    """
    try:
        collection = await get_user_settings_collection()
        
        # Clear Canvas settings and LMS type
        await collection.update_one(
            {"user_id": user.id},
            {
                "$unset": {
                    "canvas_api_key": "",
                    "canvas_url": "",
                    "canvas_key_configured": "",
                    "canvas_key_valid": "",
                    "canvas_key_last_tested": "",
                    "lms_type": ""
                }
            }
        )
        
        return {
            "status": "success",
            "message": "Canvas settings deleted successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting Canvas settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting settings: {str(e)}")


@router.post("/canvas/test")
async def test_canvas_key(
    user: User = Depends(current_active_user)
) -> CanvasKeyTestResponse:
    """
    Test the user's Canvas API key by making a test API call.
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            return CanvasKeyTestResponse(
                valid=False,
                message="Canvas API key not configured"
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        # Test the API key by fetching user info
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        test_url = f"{canvas_url}/api/v1/users/self"
        
        try:
            response = requests.get(test_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                user_info = response.json()
                
                # Try to get user's enrollments to determine their role
                enrollments_url = f"{canvas_url}/api/v1/users/self/enrollments?per_page=10"
                enrollments_response = requests.get(enrollments_url, headers=headers, timeout=10)
                roles = []
                if enrollments_response.status_code == 200:
                    enrollments = enrollments_response.json()
                    roles = list(set([e.get("type") for e in enrollments if e.get("type")]))
                
                # Update settings with validation status
                collection = await get_user_settings_collection()
                await collection.update_one(
                    {"user_id": user.id},
                    {
                        "$set": {
                            "canvas_key_valid": True,
                            "canvas_key_last_tested": datetime.utcnow(),
                            "lms_type": "canvas"  # Ensure LMS type is set
                        }
                    }
                )
                
                role_info = f" (Roles: {', '.join(roles)})" if roles else ""
                
                return CanvasKeyTestResponse(
                    valid=True,
                    message=f"Canvas API key is valid{role_info}",
                    user_info={
                        "id": user_info.get("id"),
                        "name": user_info.get("name"),
                        "email": user_info.get("primary_email"),
                        "roles": roles,
                        "canvas_user_id": user_info.get("id")
                    }
                )
            else:
                error_msg = f"Invalid API key (Status: {response.status_code})"
                if response.status_code == 401:
                    error_msg = "Invalid API key or unauthorized access"
                
                # Update settings with validation status
                collection = await get_user_settings_collection()
                await collection.update_one(
                    {"user_id": user.id},
                    {
                        "$set": {
                            "canvas_key_valid": False,
                            "canvas_key_last_tested": datetime.utcnow()
                        }
                    }
                )
                
                return CanvasKeyTestResponse(
                    valid=False,
                    message=error_msg
                )
        except requests.exceptions.RequestException as e:
            logger.error(f"Canvas API request failed: {e}")
            return CanvasKeyTestResponse(
                valid=False,
                message=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except Exception as e:
        logger.error(f"Error testing Canvas key: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error testing API key: {str(e)}")


@router.get("/canvas/data/courses")
async def get_canvas_courses(
    user: User = Depends(current_active_user),
    refresh: bool = False
):
    """
    Get user's Canvas courses using their stored API key.
    Returns all courses the API key user has access to (teacher, TA, grader, etc.).
    The courses returned depend on the Canvas role of the API key owner.
    Results are cached for faster subsequent requests.
    OPTIMIZED: Uses async HTTP for faster response.
    """
    try:
        user_id = str(user.id)
        cache_key = f"canvas_courses_{user_id}"
        
        # Check cache first (unless refresh requested)
        if not refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.debug(f"Canvas courses cache HIT for user {user_id}")
                return cached_data
        
        logger.debug(f"Canvas courses cache MISS for user {user_id}")
        
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        # Fetch courses using async HTTP - get all courses the user has access to
        all_courses = []
        page = 1
        per_page = 100
        
        try:
            async with httpx.AsyncClient(timeout=CANVAS_TIMEOUT) as client:
                while True:
                    courses_url = f"{canvas_url}/api/v1/courses?per_page={per_page}&page={page}&include[]=total_scores"
                    response = await client.get(courses_url, headers=headers)
                    
                    if response.status_code == 200:
                        courses = response.json()
                        if not courses:  # No more courses
                            break
                        all_courses.extend(courses)
                        
                        # Check if there are more pages
                        link_header = response.headers.get('Link', '')
                        if 'rel="next"' not in link_header:
                            break
                        
                        page += 1
                    elif response.status_code == 404:
                        # No more pages
                        break
                    else:
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=f"Canvas API error: {response.text}"
                        )
            
            result = {
                "status": "success",
                "courses": all_courses,
                "count": len(all_courses)
            }
            
            # Cache the result
            cache.set(cache_key, result, CACHE_TTL_COURSES)
            logger.debug(f"Cached {len(all_courses)} courses for user {user_id}")
            
            return result
        except httpx.RequestError as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Canvas courses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching courses: {str(e)}")


@router.get("/canvas/data/courses/{course_id}/assignments")
async def get_canvas_assignments(
    course_id: int,
    refresh: bool = False,
    user: User = Depends(current_active_user)
):
    """
    Get assignments for a Canvas course using stored API key.
    OPTIMIZED: Uses async HTTP and caching for faster response.
    """
    try:
        user_id = str(user.id)
        cache_key = f"canvas_assignments_{user_id}_{course_id}"
        
        # Check cache first (unless refresh requested)
        if not refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.debug(f"Canvas assignments cache HIT for course {course_id}")
                return cached_data
        
        logger.debug(f"Canvas assignments cache MISS for course {course_id}")
        
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        # Fetch assignments using async HTTP
        assignments_url = f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=100"
        
        try:
            response = await async_canvas_get(assignments_url, headers)
            
            if response["status_code"] == 200:
                assignments = response["data"]
                result = {
                    "status": "success",
                    "assignments": assignments,
                    "count": len(assignments)
                }
                # Cache the result
                cache.set(cache_key, result, CACHE_TTL_DETAILS)
                return result
            else:
                raise HTTPException(
                    status_code=response["status_code"],
                    detail=f"Canvas API error: {response['text']}"
                )
        except httpx.RequestError as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Canvas assignments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching assignments: {str(e)}")


@router.get("/canvas/data/courses/{course_id}/assignments/{assignment_id}/submissions")
async def get_canvas_submissions(
    course_id: int,
    assignment_id: int,
    include: Optional[str] = None,
    per_page: int = 100,
    refresh: bool = False,
    user: User = Depends(current_active_user)
):
    """
    Get submissions for a Canvas assignment using stored API key.
    Works for teachers, TAs, and graders based on their Canvas permissions.
    OPTIMIZED: Uses async HTTP and caching for faster response.
    """
    try:
        user_id = str(user.id)
        cache_key = f"canvas_submissions_{user_id}_{course_id}_{assignment_id}_{include or 'none'}"
        
        # Check cache first (unless refresh requested)
        if not refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.debug(f"Canvas submissions cache HIT for assignment {assignment_id}")
                return cached_data
        
        logger.debug(f"Canvas submissions cache MISS for assignment {assignment_id}")
        
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        # Build submissions URL - always include user data
        submissions_url = f"{canvas_url}/api/v1/courses/{course_id}/assignments/{assignment_id}/submissions?per_page={per_page}&include[]=user"
        if include:
            submissions_url += f"&include[]={include}"
        
        try:
            response = await async_canvas_get(submissions_url, headers)
            
            if response["status_code"] == 200:
                raw_submissions = response["data"]
                
                # Format submissions to include user_name for frontend
                formatted_submissions = []
                for submission in raw_submissions:
                    # Extract user name from Canvas user object
                    user_obj = submission.get('user', {})
                    user_name = None
                    if isinstance(user_obj, dict):
                        # Canvas returns user.name or user.display_name
                        user_name = user_obj.get('name') or user_obj.get('display_name') or user_obj.get('sortable_name')
                    elif hasattr(user_obj, 'name'):
                        user_name = getattr(user_obj, 'name', None) or getattr(user_obj, 'display_name', None)
                    
                    # Fallback to user_id if name not available
                    if not user_name:
                        sub_user_id = submission.get('user_id')
                        user_name = f"User {sub_user_id}" if sub_user_id else "Unknown"
                    
                    formatted_submission = {
                        'user_id': submission.get('user_id'),
                        'user_name': user_name,
                        'submission_id': submission.get('id'),
                        'submitted_at': submission.get('submitted_at'),
                        'workflow_state': submission.get('workflow_state'),
                        'score': submission.get('score'),
                        'grade': submission.get('grade'),
                        'graded_at': submission.get('graded_at'),
                        'late': submission.get('late', False),
                        'missing': submission.get('missing', False),
                        'attachments': submission.get('attachments', []),
                        'body': submission.get('body'),
                        'url': submission.get('url'),
                    }
                    formatted_submissions.append(formatted_submission)
                
                result = {
                    "status": "success",
                    "submissions": formatted_submissions,
                    "count": len(formatted_submissions)
                }
                
                # Cache the result
                cache.set(cache_key, result, CACHE_TTL_SUBMISSIONS)
                return result
            else:
                raise HTTPException(
                    status_code=response["status_code"],
                    detail=f"Canvas API error: {response['text']}"
                )
        except httpx.RequestError as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Canvas submissions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching submissions: {str(e)}")


@router.get("/canvas/data/user/profile")
async def get_canvas_user_profile(
    user: User = Depends(current_active_user)
):
    """
    Get the Canvas user profile for the API key owner.
    This shows what role/permissions the API key has in Canvas.
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        # Get user profile
        profile_url = f"{canvas_url}/api/v1/users/self/profile"
        
        try:
            response = requests.get(profile_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                profile = response.json()
                return {
                    "status": "success",
                    "profile": profile
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Canvas API error: {response.text}"
                )
        except requests.exceptions.RequestException as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Canvas user profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching profile: {str(e)}")


@router.get("/canvas/data/courses/{course_id}/enrollments")
async def get_canvas_course_enrollments(
    course_id: int,
    user: User = Depends(current_active_user)
):
    """
    Get enrollments for a Canvas course.
    Shows what roles/users are enrolled in the course.
    Useful for graders to see their enrollment status.
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        # Get enrollments
        enrollments_url = f"{canvas_url}/api/v1/courses/{course_id}/enrollments?per_page=100"
        
        try:
            response = requests.get(enrollments_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                enrollments = response.json()
                return {
                    "status": "success",
                    "enrollments": enrollments,
                    "count": len(enrollments)
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Canvas API error: {response.text}"
                )
        except requests.exceptions.RequestException as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Canvas enrollments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching enrollments: {str(e)}")


@router.get("/canvas/data/courses/{course_id}/details")
async def get_canvas_course_details(
    course_id: int,
    include_submissions: bool = True,
    refresh: bool = False,
    user: User = Depends(current_active_user)
):
    """
    Get comprehensive course details including assignments with submission scores.
    This provides a complete overview of course performance.
    OPTIMIZED: Uses parallel async requests for 3-5x faster loading.
    """
    try:
        user_id = str(user.id)
        cache_key = f"canvas_details_{user_id}_{course_id}_{include_submissions}"
        
        # Check cache first (unless refresh requested)
        if not refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.debug(f"Canvas course details cache HIT for course {course_id}")
                return cached_data
        
        logger.debug(f"Canvas course details cache MISS for course {course_id} - fetching from Canvas API")
        
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        try:
            # OPTIMIZATION: Fetch course info, assignments, and students in PARALLEL
            initial_requests = [
                {"key": "course", "url": f"{canvas_url}/api/v1/courses/{course_id}?include[]=total_students&include[]=term"},
                {"key": "assignments", "url": f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=100&include[]=submission"},
                {"key": "students", "url": f"{canvas_url}/api/v1/courses/{course_id}/users?enrollment_type[]=student&per_page=100&include[]=email&include[]=avatar_url"}
            ]
            
            initial_results = await parallel_canvas_requests(initial_requests, headers)
            
            # Process initial results
            results_map = {r["key"]: r for r in initial_results}
            
            # Handle course info
            course_result = results_map.get("course", {})
            if course_result.get("status_code") == 403:
                error_detail = "Access denied"
                if course_result.get("text"):
                    try:
                        error_data = eval(course_result["text"]) if course_result["text"] else {}
                        error_detail = error_data.get("message", error_detail)
                    except:
                        error_detail = course_result["text"][:200]
                
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied to course {course_id}. Your Canvas API key may not have permission to access this course. "
                           f"Please ensure: 1) You are enrolled in this course as a Teacher, TA, or Designer, "
                           f"2) Your API key has the necessary permissions, 3) The course is not hidden or unpublished. "
                           f"Error: {error_detail}"
                )
            
            if course_result.get("status_code") != 200:
                raise HTTPException(
                    status_code=course_result.get("status_code", 500),
                    detail=f"Failed to fetch course: {course_result.get('text', 'Unknown error')}"
                )
            
            course_info = course_result.get("data", {})
            
            # Handle assignments
            assignments_result = results_map.get("assignments", {})
            if assignments_result.get("status_code") == 403:
                logger.warning(f"Access denied to assignments for course {course_id}. Returning course info only.")
                return {
                    "status": "partial",
                    "message": "Course info retrieved, but assignments are not accessible with current permissions.",
                    "course_info": course_info,
                    "assignments": [],
                    "total_submissions": 0,
                    "total_graded": 0,
                    "average_score": None,
                    "all_scores": []
                }
            
            if assignments_result.get("status_code") != 200:
                raise HTTPException(
                    status_code=assignments_result.get("status_code", 500),
                    detail=f"Failed to fetch assignments: {assignments_result.get('text', 'Unknown error')}"
                )
            
            assignments = assignments_result.get("data", [])
            
            # Handle students
            students_result = results_map.get("students", {})
            students = []
            if students_result.get("status_code") == 200:
                students = students_result.get("data", [])
            elif students_result.get("status_code") == 403:
                logger.warning(f"Access denied to students list for course {course_id}. Student details will be limited.")
            else:
                logger.warning(f"Failed to fetch students for course {course_id}: {students_result.get('status_code')}")
            
            # OPTIMIZATION: Fetch ALL submissions in PARALLEL (instead of one-by-one per assignment)
            assignments_with_scores = []
            total_submissions = 0
            total_graded = 0
            all_scores = []
            
            if include_submissions and assignments:
                # Build parallel requests for all assignment submissions
                submission_requests = [
                    {
                        "key": str(assignment.get("id")),
                        "url": f"{canvas_url}/api/v1/courses/{course_id}/assignments/{assignment.get('id')}/submissions?per_page=100&include[]=user"
                    }
                    for assignment in assignments
                ]
                
                # Fetch all submissions in parallel - this is the KEY optimization
                submission_results = await parallel_canvas_requests(submission_requests, headers)
                
                # Create a map of assignment_id -> submissions
                submissions_map = {}
                for result in submission_results:
                    assignment_id = result.get("key")
                    if result.get("status_code") == 200:
                        submissions_map[assignment_id] = result.get("data", [])
                    elif result.get("status_code") == 403:
                        logger.warning(f"Access denied to submissions for assignment {assignment_id} in course {course_id}")
                        submissions_map[assignment_id] = None  # Mark as forbidden
                    else:
                        submissions_map[assignment_id] = []
                
                # Process assignments with pre-fetched submissions
                for assignment in assignments:
                    assignment_id = str(assignment.get("id"))
                    assignment_data = {
                        "id": assignment.get("id"),
                        "name": assignment.get("name"),
                        "description": assignment.get("description", "")[:200] if assignment.get("description") else "",
                        "due_at": assignment.get("due_at"),
                        "points_possible": assignment.get("points_possible"),
                        "grading_type": assignment.get("grading_type"),
                        "published": assignment.get("published", False),
                        "submission_types": assignment.get("submission_types", []),
                        "submissions": [],
                        "statistics": {
                            "submissions_count": 0,
                            "graded_count": 0,
                            "average_score": None,
                            "high_score": None,
                            "low_score": None,
                            "pass_rate": None
                        }
                    }
                    
                    submissions_data = submissions_map.get(assignment_id)
                    
                    # Skip if forbidden
                    if submissions_data is None:
                        assignments_with_scores.append(assignment_data)
                        continue
                    
                    assignment_scores = []
                    
                    for sub in submissions_data:
                        # Only count submitted work
                        if sub.get("workflow_state") != "unsubmitted":
                            total_submissions += 1
                            assignment_data["statistics"]["submissions_count"] += 1
                            
                            submission_info = {
                                "id": sub.get("id"),
                                "user_id": sub.get("user_id"),
                                "user_name": sub.get("user", {}).get("name") if sub.get("user") else None,
                                "submitted_at": sub.get("submitted_at"),
                                "graded_at": sub.get("graded_at"),
                                "score": sub.get("score"),
                                "grade": sub.get("grade"),
                                "workflow_state": sub.get("workflow_state"),
                                "late": sub.get("late", False),
                                "missing": sub.get("missing", False),
                                "excused": sub.get("excused", False)
                            }
                            
                            # Calculate percentage if graded
                            if sub.get("score") is not None and assignment.get("points_possible"):
                                percentage = (sub.get("score") / assignment.get("points_possible")) * 100
                                submission_info["percentage"] = round(percentage, 2)
                                assignment_scores.append(percentage)
                                all_scores.append(percentage)
                                total_graded += 1
                                assignment_data["statistics"]["graded_count"] += 1
                            
                            assignment_data["submissions"].append(submission_info)
                    
                    # Calculate assignment statistics
                    if assignment_scores:
                        assignment_data["statistics"]["average_score"] = round(sum(assignment_scores) / len(assignment_scores), 2)
                        assignment_data["statistics"]["high_score"] = round(max(assignment_scores), 2)
                        assignment_data["statistics"]["low_score"] = round(min(assignment_scores), 2)
                        passing = len([s for s in assignment_scores if s >= 60])
                        assignment_data["statistics"]["pass_rate"] = round((passing / len(assignment_scores)) * 100, 2)
                    
                    assignments_with_scores.append(assignment_data)
            else:
                # No submissions requested - just format assignments
                for assignment in assignments:
                    assignment_data = {
                        "id": assignment.get("id"),
                        "name": assignment.get("name"),
                        "description": assignment.get("description", "")[:200] if assignment.get("description") else "",
                        "due_at": assignment.get("due_at"),
                        "points_possible": assignment.get("points_possible"),
                        "grading_type": assignment.get("grading_type"),
                        "published": assignment.get("published", False),
                        "submission_types": assignment.get("submission_types", []),
                        "submissions": [],
                        "statistics": {
                            "submissions_count": 0,
                            "graded_count": 0,
                            "average_score": None,
                            "high_score": None,
                            "low_score": None,
                            "pass_rate": None
                        }
                    }
                    assignments_with_scores.append(assignment_data)
            
            # Build student details with their performance
            student_details = []
            student_performance_map = {}
            
            # Create a map of student performance from submissions
            for assignment in assignments_with_scores:
                for submission in assignment.get("submissions", []):
                    uid = submission.get("user_id")
                    if uid:
                        if uid not in student_performance_map:
                            student_performance_map[uid] = {
                                "submissions": [],
                                "total_points": 0,
                                "total_possible": 0,
                                "assignments_completed": 0
                            }
                        student_performance_map[uid]["submissions"].append({
                            "assignment_id": assignment.get("id"),
                            "assignment_name": assignment.get("name"),
                            "score": submission.get("score"),
                            "points_possible": assignment.get("points_possible"),
                            "percentage": submission.get("percentage"),
                            "grade": submission.get("grade"),
                            "submitted_at": submission.get("submitted_at"),
                            "graded_at": submission.get("graded_at")
                        })
                        if submission.get("score") is not None:
                            student_performance_map[uid]["total_points"] += submission.get("score", 0)
                            student_performance_map[uid]["total_possible"] += assignment.get("points_possible", 0)
                            student_performance_map[uid]["assignments_completed"] += 1
            
            # Combine student info with performance
            for student in students:
                uid = student.get("id")
                performance = student_performance_map.get(uid, {
                    "submissions": [],
                    "total_points": 0,
                    "total_possible": 0,
                    "assignments_completed": 0
                })
                
                student_details.append({
                    "id": uid,
                    "name": student.get("name"),
                    "email": student.get("email"),
                    "avatar_url": student.get("avatar_url"),
                    "total_points": performance["total_points"],
                    "total_possible": performance["total_possible"],
                    "overall_percentage": round((performance["total_points"] / performance["total_possible"] * 100), 2) if performance["total_possible"] > 0 else None,
                    "assignments_completed": performance["assignments_completed"],
                    "total_assignments": len(assignments),
                    "submissions": performance["submissions"]
                })
            
            result = {
                "status": "success",
                "course_info": {
                    "id": course_info.get("id"),
                    "name": course_info.get("name"),
                    "course_code": course_info.get("course_code"),
                    "term": course_info.get("term", {}).get("name") if course_info.get("term") else None,
                    "total_students": len(students) if students else course_info.get("total_students"),
                    "workflow_state": course_info.get("workflow_state")
                },
                "assignments": assignments_with_scores,
                "students": student_details,
                "total_submissions": total_submissions,
                "total_graded": total_graded,
                "average_score": round(sum(all_scores) / len(all_scores), 2) if all_scores else None,
                "all_scores": all_scores
            }
            
            # Cache the result
            cache.set(cache_key, result, CACHE_TTL_DETAILS)
            logger.debug(f"Cached course details for course {course_id}")
            
            return result
            
        except httpx.RequestError as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Canvas course details: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching course details: {str(e)}")


@router.get("/canvas/data/courses/{course_id}/test-access")
async def test_course_access(
    course_id: int,
    user: User = Depends(current_active_user)
):
    """
    Test if the current user's Canvas API key can access a specific course.
    Returns detailed permission information.
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        test_results = {
            "course_id": course_id,
            "can_access_course": False,
            "can_access_assignments": False,
            "can_access_students": False,
            "can_access_submissions": False,
            "errors": [],
            "recommendations": []
        }
        
        # Test 1: Can access course info
        try:
            course_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}?include[]=total_students&include[]=term",
                headers=headers,
                timeout=10
            )
            if course_response.status_code == 200:
                test_results["can_access_course"] = True
                course_info = course_response.json()
                test_results["course_name"] = course_info.get("name")
                test_results["course_code"] = course_info.get("course_code")
            elif course_response.status_code == 403:
                test_results["errors"].append(f"Course access denied (403): {course_response.text[:200]}")
                test_results["recommendations"].append("Ensure you are enrolled in this course as a Teacher, TA, or Designer")
            else:
                test_results["errors"].append(f"Course access failed ({course_response.status_code}): {course_response.text[:200]}")
        except Exception as e:
            test_results["errors"].append(f"Course access test failed: {str(e)}")
        
        # Test 2: Can access assignments
        try:
            assignments_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=1",
                headers=headers,
                timeout=10
            )
            if assignments_response.status_code == 200:
                test_results["can_access_assignments"] = True
            elif assignments_response.status_code == 403:
                test_results["errors"].append("Assignments access denied (403)")
                test_results["recommendations"].append("Your API key may not have permission to view assignments")
            else:
                test_results["errors"].append(f"Assignments access failed ({assignments_response.status_code})")
        except Exception as e:
            test_results["errors"].append(f"Assignments access test failed: {str(e)}")
        
        # Test 3: Can access students
        try:
            students_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/users?enrollment_type[]=student&per_page=1",
                headers=headers,
                timeout=10
            )
            if students_response.status_code == 200:
                test_results["can_access_students"] = True
            elif students_response.status_code == 403:
                test_results["errors"].append("Students list access denied (403)")
                test_results["recommendations"].append("Your API key needs 'Read course roster' permission")
            else:
                test_results["errors"].append(f"Students access failed ({students_response.status_code})")
        except Exception as e:
            test_results["errors"].append(f"Students access test failed: {str(e)}")
        
        # Test 4: Can access submissions (if we have assignments)
        if test_results["can_access_assignments"]:
            try:
                # Get first assignment
                assignments_response = requests.get(
                    f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=1",
                    headers=headers,
                    timeout=10
                )
                if assignments_response.status_code == 200:
                    assignments = assignments_response.json()
                    if assignments:
                        assignment_id = assignments[0].get("id")
                        submissions_response = requests.get(
                            f"{canvas_url}/api/v1/courses/{course_id}/assignments/{assignment_id}/submissions?per_page=1",
                            headers=headers,
                            timeout=10
                        )
                        if submissions_response.status_code == 200:
                            test_results["can_access_submissions"] = True
                        elif submissions_response.status_code == 403:
                            test_results["errors"].append("Submissions access denied (403)")
                            test_results["recommendations"].append("Your API key may not have permission to view student submissions")
            except Exception as e:
                test_results["errors"].append(f"Submissions access test failed: {str(e)}")
        
        # Overall status
        test_results["overall_access"] = (
            test_results["can_access_course"] and 
            test_results["can_access_assignments"]
        )
        
        return {
            "status": "success" if test_results["overall_access"] else "partial",
            "test_results": test_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing course access: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error testing course access: {str(e)}")


@router.get("/canvas/data/courses/{course_id}/students")
async def get_canvas_course_students(
    course_id: int,
    include_performance: bool = True,
    refresh: bool = False,
    user: User = Depends(current_active_user)
):
    """
    Get list of students in a Canvas course with their details and performance.
    Uses Canvas API endpoint: GET /api/v1/courses/:course_id/users?enrollment_type[]=student
    OPTIMIZED: Uses parallel async HTTP calls and caching for faster response.
    """
    try:
        user_id = str(user.id)
        cache_key = f"canvas_students_{user_id}_{course_id}_{include_performance}"
        
        # Check cache first (unless refresh requested)
        if not refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.debug(f"Canvas students cache HIT for course {course_id}")
                return cached_data
        
        logger.debug(f"Canvas students cache MISS for course {course_id}")
        
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        try:
            # OPTIMIZATION: Fetch all data in parallel
            if include_performance:
                # Fetch students, assignments, enrollments, and submissions in parallel
                parallel_requests = [
                    {"key": "students", "url": f"{canvas_url}/api/v1/courses/{course_id}/users?enrollment_type[]=student&per_page=100&include[]=email&include[]=avatar_url&include[]=enrollments"},
                    {"key": "assignments", "url": f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=100"},
                    {"key": "enrollments", "url": f"{canvas_url}/api/v1/courses/{course_id}/enrollments?type[]=StudentEnrollment&per_page=100&include[]=current_points&include[]=final_points"},
                    {"key": "submissions", "url": f"{canvas_url}/api/v1/courses/{course_id}/students/submissions?per_page=100&include[]=assignment"}
                ]
                
                results = await parallel_canvas_requests(parallel_requests, headers)
                results_map = {r["key"]: r for r in results}
            else:
                # Just fetch students
                students_result = await async_canvas_get(
                    f"{canvas_url}/api/v1/courses/{course_id}/users?enrollment_type[]=student&per_page=100&include[]=email&include[]=avatar_url&include[]=enrollments",
                    headers
                )
                results_map = {"students": students_result}
            
            # Process students result
            students_result = results_map.get("students", {})
            if students_result.get("status_code") == 403:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. Your Canvas API key may not have permission to view students in this course. Required permission: Read course roster."
                )
            
            if students_result.get("status_code") != 200:
                raise HTTPException(
                    status_code=students_result.get("status_code", 500),
                    detail=f"Failed to fetch students: {students_result.get('text', 'Unknown error')}"
                )
            
            students = students_result.get("data", [])
            
            student_details = []
            
            if include_performance:
                # Process assignments
                assignments_result = results_map.get("assignments", {})
                all_assignments = []
                total_course_points = 0
                if assignments_result.get("status_code") == 200:
                    all_assignments = assignments_result.get("data", [])
                    # Calculate total possible points from all published assignments
                    total_course_points = sum(
                        a.get("points_possible", 0) or 0 
                        for a in all_assignments 
                        if a.get("published", False) and a.get("points_possible")
                    )
                
                # Process enrollments
                enrollments_result = results_map.get("enrollments", {})
                enrollment_grades = {}
                if enrollments_result.get("status_code") == 200:
                    enrollments = enrollments_result.get("data", [])
                    logger.info(f"Retrieved {len(enrollments)} enrollments for course {course_id}")
                    for enrollment in enrollments:
                        uid = enrollment.get("user_id")
                        if uid:
                            grades = enrollment.get("grades", {})
                            enrollment_grades[uid] = {
                                "current_score": grades.get("current_score"),
                                "final_score": grades.get("final_score"),
                                "current_grade": grades.get("current_grade"),
                                "final_grade": grades.get("final_grade"),
                                "current_points": grades.get("current_points"),
                                "final_points": grades.get("final_points")
                            }
                elif enrollments_result.get("status_code") == 403:
                    logger.warning(f"Access denied to enrollments for course {course_id}")
                else:
                    logger.warning(f"Failed to fetch enrollments: {enrollments_result.get('status_code')} - {enrollments_result.get('text', '')[:200]}")
                
                # Process submissions
                student_performance = {}
                # Track assignments seen per student to avoid double-counting points_possible
                student_assignments_seen = {}
                
                if submissions_result.get("status_code") == 200:
                    all_submissions = submissions_result.get("data", [])
                    logger.info(f"Retrieved {len(all_submissions)} submissions for course {course_id}")
                    
                    # Group submissions by student
                    for submission in all_submissions:
                        sub_user_id = submission.get("user_id")
                        if sub_user_id not in student_performance:
                            student_performance[sub_user_id] = {
                                "total_points": 0,
                                "total_possible": 0,
                                "submissions_count": 0,
                                "graded_count": 0,
                                "assignments": []
                            }
                            student_assignments_seen[sub_user_id] = set()
                        
                        assignment = submission.get("assignment", {})
                        assignment_id = assignment.get("id")
                        points_possible = assignment.get("points_possible", 0) or 0
                        score = submission.get("score")
                        
                        # Only add points_possible once per assignment per student
                        if assignment_id and assignment_id not in student_assignments_seen[sub_user_id] and points_possible > 0:
                            student_performance[sub_user_id]["total_possible"] += points_possible
                            student_assignments_seen[sub_user_id].add(assignment_id)
                        
                        if score is not None:
                            student_performance[sub_user_id]["total_points"] += score
                            student_performance[sub_user_id]["graded_count"] += 1
                        
                        # Only count as submission if it's actually submitted
                        if submission.get("workflow_state") != "unsubmitted":
                            student_performance[sub_user_id]["submissions_count"] += 1
                        
                        student_performance[sub_user_id]["assignments"].append({
                            "assignment_id": assignment_id,
                            "assignment_name": assignment.get("name"),
                            "score": score,
                            "points_possible": points_possible,
                            "percentage": round((score / points_possible * 100), 2) if score is not None and points_possible > 0 else None,
                            "grade": submission.get("grade"),
                            "submitted_at": submission.get("submitted_at"),
                            "graded_at": submission.get("graded_at")
                        })
                elif submissions_result.get("status_code") == 403:
                    logger.warning(f"Access denied to submissions for course {course_id}. Will use enrollment grades only.")
                else:
                    logger.warning(f"Failed to fetch submissions: {submissions_result.get('status_code')} - {submissions_result.get('text', '')[:200]}")
                
                # Merge enrollment grades with submission data (prefer enrollment grades for overall)
                for user_id, enrollment_data in enrollment_grades.items():
                    if user_id not in student_performance:
                        student_performance[user_id] = {
                            "total_points": 0,
                            "total_possible": 0,
                            "submissions_count": 0,
                            "graded_count": 0,
                            "assignments": []
                        }
                    
                    # Use enrollment grades if available (more accurate)
                    if enrollment_data.get("current_points") is not None:
                        student_performance[user_id]["total_points"] = enrollment_data.get("current_points", 0)
                    if enrollment_data.get("final_points") is not None:
                        student_performance[user_id]["total_possible"] = enrollment_data.get("final_points", 0)
                
                # Combine student info with performance
                for student in students:
                    user_id = student.get("id")
                    performance = student_performance.get(user_id, {
                        "total_points": 0,
                        "total_possible": 0,
                        "submissions_count": 0,
                        "graded_count": 0,
                        "assignments": []
                    })
                    
                    # Get enrollment grade data if available
                    enrollment_data = enrollment_grades.get(user_id, {})
                    
                    # Prefer enrollment grades (from Canvas gradebook) over calculated from submissions
                    # current_points and final_points are the actual points earned/possible
                    # current_score is already a percentage
                    
                    # Get points from enrollment (most accurate)
                    enrollment_points = enrollment_data.get("current_points")
                    enrollment_possible = enrollment_data.get("final_points")
                    enrollment_score = enrollment_data.get("current_score")  # This is a percentage
                    
                    # Determine total possible points first
                    if enrollment_possible is not None and enrollment_possible > 0:
                        total_possible = enrollment_possible
                    elif total_course_points > 0:
                        total_possible = total_course_points
                    else:
                        total_possible = performance["total_possible"]
                    
                    # Determine total points - check if enrollment_points is actually a percentage
                    total_points = None
                    if enrollment_points is not None:
                        # Check if enrollment_points looks like a percentage (<= 100 when total_possible is much larger)
                        if enrollment_possible and enrollment_possible > 100 and enrollment_points <= 100:
                            # enrollment_points appears to be a percentage, calculate actual points
                            if enrollment_score is not None:
                                total_points = (enrollment_score / 100) * total_possible
                            else:
                                total_points = (enrollment_points / 100) * total_possible
                        else:
                            # enrollment_points is actual points
                            total_points = enrollment_points
                    else:
                        total_points = performance["total_points"]
                    
                    # Calculate percentage - prefer enrollment score, then calculate from points
                    overall_percentage = None
                    if enrollment_score is not None:
                        # enrollment_score is already a percentage
                        overall_percentage = round(enrollment_score, 2)
                    elif total_possible and total_possible > 0 and total_points is not None:
                        overall_percentage = round((total_points / total_possible * 100), 2)
                    
                    student_details.append({
                        "id": user_id,
                        "name": student.get("name"),
                        "email": student.get("email"),
                        "avatar_url": student.get("avatar_url"),
                        "total_points": total_points,
                        "total_possible": total_possible,
                        "overall_percentage": overall_percentage,
                        "current_grade": enrollment_data.get("current_grade"),
                        "final_grade": enrollment_data.get("final_grade"),
                        "submissions_count": performance["submissions_count"],
                        "graded_count": performance["graded_count"],
                        "assignments": performance["assignments"]
                    })
            else:
                # Just return student info without performance
                student_details = [
                    {
                        "id": student.get("id"),
                        "name": student.get("name"),
                        "email": student.get("email"),
                        "avatar_url": student.get("avatar_url")
                    }
                    for student in students
                ]
            
            return {
                "status": "success",
                "students": student_details,
                "total_students": len(student_details)
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching students: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching students: {str(e)}")


@router.get("/canvas/data/student/courses")
async def get_student_courses(
    user: User = Depends(current_active_user)
):
    """
    Get courses for the current student user.
    Returns courses where the user is enrolled as a student.
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        try:
            # Get user's profile to get their Canvas user ID
            profile_response = requests.get(
                f"{canvas_url}/api/v1/users/self/profile",
                headers=headers,
                timeout=30
            )
            
            if profile_response.status_code != 200:
                error_detail = f"Failed to fetch user profile (Status {profile_response.status_code})"
                try:
                    error_data = profile_response.json()
                    if isinstance(error_data, dict) and "message" in error_data:
                        error_detail = error_data["message"]
                except:
                    error_detail = profile_response.text[:200] if profile_response.text else error_detail
                
                logger.error(f"Canvas profile API error: {error_detail}")
                raise HTTPException(
                    status_code=profile_response.status_code,
                    detail=error_detail
                )
            
            user_profile = profile_response.json()
            canvas_user_id = user_profile.get("id")
            
            if not canvas_user_id:
                logger.error("Canvas user ID not found in profile response")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to retrieve Canvas user ID from profile"
                )
            
            # Get all courses for the user, including concluded/past courses
            # Canvas API: state[] parameter can be: available, completed, created, deleted, or all
            # Try with state[]=all first to get all courses including concluded ones
            courses_response = requests.get(
                f"{canvas_url}/api/v1/users/{canvas_user_id}/courses?per_page=100&include[]=total_scores&include[]=enrollments&state[]=all",
                headers=headers,
                timeout=30
            )
            
            # If state[]=all doesn't work, try individual states
            if courses_response.status_code != 200:
                logger.warning(f"Failed with state[]=all, trying individual states. Status: {courses_response.status_code}")
                courses_response = requests.get(
                    f"{canvas_url}/api/v1/users/{canvas_user_id}/courses?per_page=100&include[]=total_scores&include[]=enrollments&state[]=available&state[]=completed&state[]=created",
                    headers=headers,
                    timeout=30
                )
            
            if courses_response.status_code != 200:
                error_detail = f"Failed to fetch courses (Status {courses_response.status_code})"
                try:
                    error_data = courses_response.json()
                    if isinstance(error_data, dict):
                        if "message" in error_data:
                            error_detail = error_data["message"]
                        elif "errors" in error_data:
                            error_detail = str(error_data["errors"])
                except:
                    error_detail = courses_response.text[:200] if courses_response.text else error_detail
                
                logger.error(f"Canvas courses API error: {error_detail}")
                raise HTTPException(
                    status_code=courses_response.status_code,
                    detail=f"Canvas API error: {error_detail}. Please check your Canvas API key permissions."
                )
            
            all_courses = courses_response.json()
            
            # Filter to only include courses where user is enrolled as a student
            # Check enrollments if included, otherwise include all (students typically only see their courses)
            courses = []
            for course in all_courses:
                enrollments = course.get("enrollments", [])
                if enrollments:
                    # Check if user has a student enrollment
                    has_student_enrollment = any(
                        e.get("type") == "StudentEnrollment" and 
                        e.get("user_id") == canvas_user_id
                        for e in enrollments
                    )
                    if has_student_enrollment:
                        courses.append(course)
                else:
                    # If enrollments not included, include the course
                    # (for students, Canvas typically only returns their courses anyway)
                    courses.append(course)
            
            # Log for debugging
            logger.info(f"Found {len(courses)} courses for Canvas user {canvas_user_id} (from {len(all_courses)} total)")
            
            return {
                "status": "success",
                "courses": courses,
                "count": len(courses),
                "canvas_user_id": canvas_user_id,
                "total_fetched": len(all_courses),
                "message": f"Found {len(courses)} student courses. If courses are missing, they may be concluded or unpublished."
            }
            
        except HTTPException:
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Canvas API request failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student courses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching courses: {str(e)}")


@router.get("/canvas/data/student/courses/{course_id}/performance")
async def get_student_course_performance(
    course_id: int,
    include_comparison: bool = True,
    user: User = Depends(current_active_user)
):
    """
    Get student's performance data for a specific course.
    Includes their grades, assignments, and optionally anonymized class comparison.
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        try:
            # Get user's Canvas ID
            profile_response = requests.get(
                f"{canvas_url}/api/v1/users/self/profile",
                headers=headers,
                timeout=30
            )
            
            if profile_response.status_code != 200:
                raise HTTPException(
                    status_code=profile_response.status_code,
                    detail=f"Failed to fetch user profile: {profile_response.text}"
                )
            
            canvas_user_id = profile_response.json().get("id")
            
            # Get course info
            course_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}?include[]=total_students&include[]=term",
                headers=headers,
                timeout=30
            )
            
            if course_response.status_code != 200:
                raise HTTPException(
                    status_code=course_response.status_code,
                    detail=f"Failed to fetch course: {course_response.text}"
                )
            
            course_info = course_response.json()
            
            # Get all assignments
            assignments_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=100&include[]=submission",
                headers=headers,
                timeout=30
            )
            
            assignments = []
            if assignments_response.status_code == 200:
                assignments = assignments_response.json()
            
            # Get student's submissions for this course
            submissions_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/students/submissions?student_ids[]={canvas_user_id}&per_page=100&include[]=assignment&include[]=user",
                headers=headers,
                timeout=30
            )
            
            student_submissions = []
            student_assignments = []
            student_total_points = 0
            student_total_possible = 0
            student_scores = []
            
            if submissions_response.status_code == 200:
                student_submissions = submissions_response.json()
                
                # Process submissions and match with assignments
                for assignment in assignments:
                    if not assignment.get("published"):
                        continue
                    
                    assignment_submissions = [s for s in student_submissions if s.get("assignment_id") == assignment.get("id")]
                    submission = assignment_submissions[0] if assignment_submissions else None
                    
                    points_possible = assignment.get("points_possible", 0)
                    score = submission.get("score") if submission else None
                    
                    assignment_data = {
                        "id": assignment.get("id"),
                        "name": assignment.get("name"),
                        "due_at": assignment.get("due_at"),
                        "points_possible": points_possible,
                        "score": score,
                        "percentage": round((score / points_possible) * 100, 2) if score is not None and points_possible else None,
                        "grade": submission.get("grade") if submission else None,
                        "submitted_at": submission.get("submitted_at") if submission else None,
                        "graded_at": submission.get("graded_at") if submission else None,
                        "workflow_state": submission.get("workflow_state") if submission else "unsubmitted",
                        "late": submission.get("late", False) if submission else False,
                        "missing": submission.get("missing", False) if submission else False,
                    }
                    
                    if score is not None:
                        student_total_points += score
                        student_scores.append(assignment_data["percentage"])
                    
                    if points_possible:
                        student_total_possible += points_possible
                    
                    student_assignments.append(assignment_data)
            
            # Calculate student overall percentage
            student_overall_percentage = round(
                (student_total_points / student_total_possible) * 100, 2
            ) if student_total_possible > 0 else None
            
            # Get class comparison data (anonymized)
            comparison_data = None
            if include_comparison:
                try:
                    # Get all submissions for class statistics (anonymized)
                    class_submissions_response = requests.get(
                        f"{canvas_url}/api/v1/courses/{course_id}/students/submissions?per_page=100",
                        headers=headers,
                        timeout=30
                    )
                    
                    if class_submissions_response.status_code == 200:
                        all_submissions = class_submissions_response.json()
                        
                        # Calculate class statistics per assignment
                        assignment_stats = {}
                        for assignment in assignments:
                            if not assignment.get("published"):
                                continue
                            
                            assignment_id = assignment.get("id")
                            assignment_subs = [s for s in all_submissions if s.get("assignment_id") == assignment_id]
                            
                            scores = []
                            for sub in assignment_subs:
                                if sub.get("score") is not None and assignment.get("points_possible"):
                                    percentage = (sub.get("score") / assignment.get("points_possible")) * 100
                                    scores.append(percentage)
                            
                            if scores:
                                assignment_stats[assignment_id] = {
                                    "average": round(sum(scores) / len(scores), 2),
                                    "high": round(max(scores), 2),
                                    "low": round(min(scores), 2),
                                    "count": len(scores)
                                }
                        
                        # Calculate overall class statistics
                        all_percentages = []
                        for sub in all_submissions:
                            assignment = next((a for a in assignments if a.get("id") == sub.get("assignment_id")), None)
                            if assignment and sub.get("score") is not None and assignment.get("points_possible"):
                                percentage = (sub.get("score") / assignment.get("points_possible")) * 100
                                all_percentages.append(percentage)
                        
                        class_average = round(sum(all_percentages) / len(all_percentages), 2) if all_percentages else None
                        class_high = max(all_percentages) if all_percentages else None
                        class_low = min(all_percentages) if all_percentages else None
                        
                        # Calculate student's percentile rank
                        if student_overall_percentage is not None and all_percentages:
                            sorted_percentages = sorted(all_percentages, reverse=True)
                            rank = next((i for i, p in enumerate(sorted_percentages) if p <= student_overall_percentage), len(sorted_percentages))
                            percentile = round((len(sorted_percentages) - rank) / len(sorted_percentages) * 100, 1)
                        else:
                            percentile = None
                        
                        comparison_data = {
                            "class_average": class_average,
                            "class_high": class_high,
                            "class_low": class_low,
                            "student_percentile": percentile,
                            "total_students": len(set([s.get("user_id") for s in all_submissions])),
                            "assignment_stats": assignment_stats
                        }
                except Exception as e:
                    logger.warning(f"Could not fetch comparison data: {e}")
                    comparison_data = None
            
            return {
                "status": "success",
                "course_info": {
                    "id": course_info.get("id"),
                    "name": course_info.get("name"),
                    "course_code": course_info.get("course_code"),
                    "term": course_info.get("term", {}).get("name") if course_info.get("term") else None,
                },
                "student_assignments": student_assignments,
                "student_total_points": student_total_points,
                "student_total_possible": student_total_possible,
                "student_overall_percentage": student_overall_percentage,
                "student_average": round(sum(student_scores) / len(student_scores), 2) if student_scores else None,
                "comparison": comparison_data
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student performance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching performance: {str(e)}")


@router.get("/canvas/data/courses/{course_id}/students/{student_id}/grades")
async def get_student_grades(
    course_id: int,
    student_id: int,
    include_analytics: bool = False,
    user: User = Depends(current_active_user)
):
    """
    Get comprehensive grade information for a specific student in a course.
    Uses multiple Canvas API endpoints to provide complete grade details.
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        student_data = {
            "student_id": student_id,
            "course_id": course_id,
            "grades": {},
            "submissions": [],
            "assignments": [],
            "analytics": None
        }
        
        try:
            # 1. Get enrollment information with grades
            enrollments_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/enrollments?user_id={student_id}&type[]=StudentEnrollment&include[]=current_points&include[]=final_points",
                headers=headers,
                timeout=30
            )
            
            if enrollments_response.status_code == 200:
                enrollments = enrollments_response.json()
                if enrollments:
                    enrollment = enrollments[0]
                    grades = enrollment.get("grades", {})
                    student_data["grades"] = {
                        "current_score": grades.get("current_score"),
                        "final_score": grades.get("final_score"),
                        "current_grade": grades.get("current_grade"),
                        "final_grade": grades.get("final_grade"),
                        "unposted_current_score": grades.get("unposted_current_score"),
                        "unposted_final_score": grades.get("unposted_final_score"),
                        "unposted_current_grade": grades.get("unposted_current_grade"),
                        "unposted_final_grade": grades.get("unposted_final_grade"),
                        "current_points": grades.get("current_points"),
                        "final_points": grades.get("final_points"),
                        "html_url": grades.get("html_url")
                    }
                    student_data["enrollment_status"] = enrollment.get("enrollment_state")
                    student_data["enrollment_type"] = enrollment.get("type")
            
            # 2. Get all submissions for this student
            submissions_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/students/submissions?student_ids[]={student_id}&per_page=100&include[]=assignment&include[]=user&include[]=submission_comments",
                headers=headers,
                timeout=30
            )
            
            if submissions_response.status_code == 200:
                submissions = submissions_response.json()
                student_data["submissions"] = [
                    {
                        "submission_id": sub.get("id"),
                        "assignment_id": sub.get("assignment_id"),
                        "assignment_name": sub.get("assignment", {}).get("name") if sub.get("assignment") else None,
                        "score": sub.get("score"),
                        "grade": sub.get("grade"),
                        "points_possible": sub.get("assignment", {}).get("points_possible") if sub.get("assignment") else None,
                        "percentage": round((sub.get("score") / sub.get("assignment", {}).get("points_possible") * 100), 2) if sub.get("score") is not None and sub.get("assignment", {}).get("points_possible") else None,
                        "submitted_at": sub.get("submitted_at"),
                        "graded_at": sub.get("graded_at"),
                        "workflow_state": sub.get("workflow_state"),
                        "late": sub.get("late", False),
                        "missing": sub.get("missing", False),
                        "excused": sub.get("excused", False),
                        "comments_count": len(sub.get("submission_comments", [])) if sub.get("submission_comments") else 0
                    }
                    for sub in submissions
                ]
            
            # 3. Get all assignments to calculate what's missing
            assignments_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=100&include[]=submission",
                headers=headers,
                timeout=30
            )
            
            if assignments_response.status_code == 200:
                assignments = assignments_response.json()
                submission_ids = {sub["assignment_id"] for sub in student_data["submissions"]}
                
                student_data["assignments"] = []
                for a in assignments:
                    if not a.get("published", False):
                        continue
                    assignment_id = a.get("id")
                    submission = next((s for s in student_data["submissions"] if s["assignment_id"] == assignment_id), None)
                    
                    assignment_data = {
                        "assignment_id": assignment_id,
                        "assignment_name": a.get("name"),
                        "name": a.get("name"),
                        "points_possible": a.get("points_possible"),
                        "due_at": a.get("due_at"),
                        "submitted": assignment_id in submission_ids,
                        "graded": submission is not None and submission.get("score") is not None,
                    }
                    
                    if submission:
                        assignment_data.update({
                            "score": submission.get("score"),
                            "grade": submission.get("grade"),
                            "percentage": submission.get("percentage"),
                            "submitted_at": submission.get("submitted_at"),
                            "graded_at": submission.get("graded_at"),
                            "late": submission.get("late", False),
                            "missing": submission.get("missing", False),
                        })
                    else:
                        assignment_data.update({
                            "score": None,
                            "grade": None,
                            "percentage": None,
                            "submitted_at": None,
                            "graded_at": None,
                            "late": False,
                            "missing": not assignment_data["submitted"],
                        })
                    
                    student_data["assignments"].append(assignment_data)
            
            # 4. Get analytics data if requested
            if include_analytics:
                try:
                    analytics_response = requests.get(
                        f"{canvas_url}/api/v1/courses/{course_id}/analytics/users/{student_id}/assignments",
                        headers=headers,
                        timeout=30
                    )
                    
                    if analytics_response.status_code == 200:
                        student_data["analytics"] = analytics_response.json()
                except Exception as e:
                    logger.warning(f"Could not fetch analytics data: {e}")
            
            # Calculate summary statistics
            graded_submissions = [s for s in student_data["submissions"] if s.get("score") is not None]
            if graded_submissions:
                student_data["summary"] = {
                    "total_assignments": len(student_data["assignments"]),
                    "submitted_count": len([a for a in student_data["assignments"] if a.get("submitted")]),
                    "graded_count": len(graded_submissions),
                    "average_score": round(sum(s.get("percentage", 0) for s in graded_submissions) / len(graded_submissions), 2) if graded_submissions else None,
                    "total_points_earned": sum(s.get("score", 0) for s in graded_submissions),
                    "total_points_possible": sum(s.get("points_possible", 0) for s in graded_submissions if s.get("points_possible"))
                }
            
            return {
                "status": "success",
                "student_data": student_data
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student grades: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching student grades: {str(e)}")


@router.get("/canvas/data/courses/{course_id}/analytics/board")
async def get_canvas_analytics_board(
    course_id: int,
    include_student_details: bool = True,
    include_assignment_analytics: bool = True,
    include_engagement: bool = True,
    user: User = Depends(current_active_user)
):
    """
    Get comprehensive analytics board data for a course.
    Accessible to: Teachers, Admins, and Graders only.
    Students should use the student-specific endpoints.
    """
    # Restrict access to teachers, admins, and graders
    if user.role not in ['teacher', 'admin', 'grader']:
        raise HTTPException(
            status_code=403,
            detail="Access denied. This endpoint is only available to teachers, admins, and graders. Students should use the student dashboard."
        )
    """
    Get comprehensive analytics board data for a course.
    Aggregates data from multiple Canvas API endpoints:
    - Course info (GET /api/v1/courses/:id)
    - Students list (GET /api/v1/courses/:id/users)
    - Enrollments with grades (GET /api/v1/courses/:id/enrollments)
    - Assignments (GET /api/v1/courses/:id/assignments)
    - Submissions (GET /api/v1/courses/:id/students/submissions)
    - Student analytics (GET /api/v1/courses/:id/analytics/users/:id/assignments) - optional
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        analytics_data = {
            "course_id": course_id,
            "course_info": {},
            "overview": {},
            "students": [],
            "assignments": [],
            "grade_distribution": {},
            "submission_trends": {},
            "engagement_metrics": {}
        }
        
        try:
            # 1. Get Course Information
            course_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}?include[]=total_students&include[]=term&include[]=syllabus_body&include[]=course_image",
                headers=headers,
                timeout=30
            )
            
            if course_response.status_code == 200:
                course_info = course_response.json()
                analytics_data["course_info"] = {
                    "id": course_info.get("id"),
                    "name": course_info.get("name"),
                    "course_code": course_info.get("course_code"),
                    "term": course_info.get("term", {}).get("name") if course_info.get("term") else None,
                    "total_students": course_info.get("total_students"),
                    "workflow_state": course_info.get("workflow_state"),
                    "start_at": course_info.get("start_at"),
                    "end_at": course_info.get("end_at")
                }
            
            # 2. Get All Students (GET /api/v1/courses/:id/users)
            students_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/users?enrollment_type[]=student&per_page=100&include[]=email&include[]=avatar_url&include[]=enrollments",
                headers=headers,
                timeout=30
            )
            
            students = []
            if students_response.status_code == 200:
                students = students_response.json()
            
            # 3. Get All Enrollments with Grades (GET /api/v1/courses/:id/enrollments)
            enrollments_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/enrollments?type[]=StudentEnrollment&per_page=100&include[]=current_points&include[]=final_points",
                headers=headers,
                timeout=30
            )
            
            enrollments_map = {}
            if enrollments_response.status_code == 200:
                enrollments = enrollments_response.json()
                for enrollment in enrollments:
                    user_id = enrollment.get("user_id")
                    if user_id:
                        enrollments_map[user_id] = enrollment
            
            # 4. Get All Assignments (GET /api/v1/courses/:id/assignments)
            assignments_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=100&include[]=submission",
                headers=headers,
                timeout=30
            )
            
            assignments = []
            if assignments_response.status_code == 200:
                assignments = assignments_response.json()
            
            # 5. Get All Submissions (GET /api/v1/courses/:id/students/submissions)
            submissions_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/students/submissions?per_page=100&include[]=assignment&include[]=user",
                headers=headers,
                timeout=30
            )
            
            all_submissions = []
            if submissions_response.status_code == 200:
                all_submissions = submissions_response.json()
            
            # Process data for analytics
            total_students = len(students)
            total_assignments = len([a for a in assignments if a.get("published", False)])
            
            # Calculate overview statistics
            total_submissions = len([s for s in all_submissions if s.get("workflow_state") != "unsubmitted"])
            graded_submissions = len([s for s in all_submissions if s.get("score") is not None])
            
            # Calculate grade distribution
            student_scores = []
            student_percentages = []
            
            for enrollment in enrollments_map.values():
                grades = enrollment.get("grades", {})
                current_score = grades.get("current_score")
                if current_score is not None:
                    student_scores.append(current_score)
                    # Calculate percentage if we have points
                    current_points = grades.get("current_points")
                    final_points = grades.get("final_points")
                    if final_points and final_points > 0:
                        percentage = (current_points / final_points * 100) if current_points else 0
                        student_percentages.append(percentage)
            
            # Grade distribution buckets
            grade_distribution = {
                "A": len([s for s in student_percentages if s >= 90]),
                "B": len([s for s in student_percentages if 80 <= s < 90]),
                "C": len([s for s in student_percentages if 70 <= s < 80]),
                "D": len([s for s in student_percentages if 60 <= s < 70]),
                "F": len([s for s in student_percentages if s < 60])
            }
            
            analytics_data["overview"] = {
                "total_students": total_students,
                "total_assignments": total_assignments,
                "total_submissions": total_submissions,
                "graded_submissions": graded_submissions,
                "ungraded_submissions": total_submissions - graded_submissions,
                "average_score": round(sum(student_percentages) / len(student_percentages), 2) if student_percentages else None,
                "median_score": round(sorted(student_percentages)[len(student_percentages) // 2], 2) if student_percentages else None,
                "high_score": round(max(student_percentages), 2) if student_percentages else None,
                "low_score": round(min(student_percentages), 2) if student_percentages else None,
                "grading_progress": round((graded_submissions / total_submissions * 100), 2) if total_submissions > 0 else 0
            }
            
            analytics_data["grade_distribution"] = grade_distribution
            
            # Process students with detailed information
            if include_student_details:
                student_analytics = []
                for student in students:
                    user_id = student.get("id")
                    enrollment = enrollments_map.get(user_id, {})
                    grades = enrollment.get("grades", {})
                    
                    # Get student's submissions
                    student_subs = [s for s in all_submissions if s.get("user_id") == user_id]
                    graded_subs = [s for s in student_subs if s.get("score") is not None]
                    
                    student_analytics.append({
                        "student_id": user_id,
                        "name": student.get("name"),
                        "email": student.get("email"),
                        "avatar_url": student.get("avatar_url"),
                        "current_score": grades.get("current_score"),
                        "final_score": grades.get("final_score"),
                        "current_grade": grades.get("current_grade"),
                        "final_grade": grades.get("final_grade"),
                        "current_points": grades.get("current_points"),
                        "final_points": grades.get("final_points"),
                        "submissions_count": len([s for s in student_subs if s.get("workflow_state") != "unsubmitted"]),
                        "graded_count": len(graded_subs),
                        "average_score": round(sum(s.get("score", 0) for s in graded_subs) / len(graded_subs), 2) if graded_subs else None,
                        "total_points_earned": sum(s.get("score", 0) for s in graded_subs),
                        "total_points_possible": sum(s.get("assignment", {}).get("points_possible", 0) for s in graded_subs if s.get("assignment"))
                    })
                
                analytics_data["students"] = student_analytics
            
            # Process assignments with analytics
            if include_assignment_analytics:
                assignment_analytics = []
                for assignment in assignments:
                    if not assignment.get("published", False):
                        continue
                    
                    assignment_id = assignment.get("id")
                    assignment_subs = [s for s in all_submissions if s.get("assignment_id") == assignment_id]
                    submitted_subs = [s for s in assignment_subs if s.get("workflow_state") != "unsubmitted"]
                    graded_subs = [s for s in submitted_subs if s.get("score") is not None]
                    
                    scores = [s.get("score") for s in graded_subs if s.get("score") is not None]
                    points_possible = assignment.get("points_possible", 0)
                    percentages = [(s / points_possible * 100) for s in scores] if points_possible > 0 else []
                    
                    assignment_analytics.append({
                        "assignment_id": assignment_id,
                        "name": assignment.get("name"),
                        "points_possible": points_possible,
                        "due_at": assignment.get("due_at"),
                        "submissions_count": len(submitted_subs),
                        "graded_count": len(graded_subs),
                        "average_score": round(sum(percentages) / len(percentages), 2) if percentages else None,
                        "median_score": round(sorted(percentages)[len(percentages) // 2], 2) if percentages else None,
                        "high_score": round(max(percentages), 2) if percentages else None,
                        "low_score": round(min(percentages), 2) if percentages else None,
                        "submission_rate": round((len(submitted_subs) / total_students * 100), 2) if total_students > 0 else 0,
                        "grading_progress": round((len(graded_subs) / len(submitted_subs) * 100), 2) if submitted_subs else 0
                    })
                
                analytics_data["assignments"] = assignment_analytics
            
            # Submission trends (by date)
            if include_engagement:
                submission_dates = {}
                for submission in all_submissions:
                    submitted_at = submission.get("submitted_at")
                    if submitted_at:
                        date = submitted_at[:10]  # Extract date part
                        submission_dates[date] = submission_dates.get(date, 0) + 1
                
                analytics_data["submission_trends"] = {
                    "by_date": submission_dates,
                    "total_days_active": len(submission_dates),
                    "average_per_day": round(sum(submission_dates.values()) / len(submission_dates), 2) if submission_dates else 0
                }
                
                # Engagement metrics
                late_submissions = len([s for s in all_submissions if s.get("late", False)])
                missing_submissions = len([s for s in all_submissions if s.get("missing", False)])
                
                analytics_data["engagement_metrics"] = {
                    "late_submissions": late_submissions,
                    "missing_submissions": missing_submissions,
                    "on_time_rate": round(((total_submissions - late_submissions) / total_submissions * 100), 2) if total_submissions > 0 else 0,
                    "completion_rate": round((total_submissions / (total_assignments * total_students) * 100), 2) if total_assignments > 0 and total_students > 0 else 0
                }
            
            return {
                "status": "success",
                "analytics": analytics_data
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analytics board: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching analytics board: {str(e)}")


@router.get("/canvas/data/courses/{course_id}/gradebook")
async def get_canvas_gradebook(
    course_id: int,
    user: User = Depends(current_active_user)
):
    """
    Get gradebook summary for a course - all students with all their assignment scores.
    Useful for comparison and analytics.
    """
    try:
        settings = await get_user_settings(user)
        
        if not settings or not settings.get("canvas_api_key"):
            raise HTTPException(
                status_code=400,
                detail="Canvas API key not configured. Please configure it in settings."
            )
        
        canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
        api_key = settings.get("canvas_api_key")
        
        # Normalize URL
        canvas_url = canvas_url.rstrip('/')
        if not canvas_url.startswith('http'):
            canvas_url = f"https://{canvas_url}"
        
        headers = {
            "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
            "Content-Type": "application/json"
        }
        
        try:
            # Get course info
            course_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}",
                headers=headers,
                timeout=30
            )
            
            if course_response.status_code != 200:
                raise HTTPException(
                    status_code=course_response.status_code,
                    detail=f"Failed to fetch course: {course_response.text}"
                )
            
            course_info = course_response.json()
            
            # Get all students enrolled
            students_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/users?enrollment_type[]=student&per_page=100",
                headers=headers,
                timeout=30
            )
            
            students = []
            if students_response.status_code == 200:
                students = students_response.json()
            
            # Get all assignments
            assignments_response = requests.get(
                f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=100",
                headers=headers,
                timeout=30
            )
            
            assignments = []
            if assignments_response.status_code == 200:
                assignments = assignments_response.json()
            
            # Build gradebook structure
            gradebook = []
            assignment_headers = [
                {"id": a.get("id"), "name": a.get("name"), "points_possible": a.get("points_possible")}
                for a in assignments if a.get("published")
            ]
            
            for student in students:
                student_record = {
                    "student_id": student.get("id"),
                    "student_name": student.get("name"),
                    "email": student.get("email"),
                    "scores": {},
                    "total_points": 0,
                    "total_possible": 0,
                    "overall_percentage": None
                }
                
                # Get all submissions for this student
                submissions_response = requests.get(
                    f"{canvas_url}/api/v1/courses/{course_id}/students/submissions?student_ids[]={student.get('id')}&per_page=100",
                    headers=headers,
                    timeout=30
                )
                
                if submissions_response.status_code == 200:
                    submissions = submissions_response.json()
                    
                    for sub in submissions:
                        assignment_id = sub.get("assignment_id")
                        assignment = next((a for a in assignments if a.get("id") == assignment_id), None)
                        
                        if assignment and assignment.get("published"):
                            score = sub.get("score")
                            points_possible = assignment.get("points_possible", 0)
                            
                            student_record["scores"][assignment_id] = {
                                "score": score,
                                "points_possible": points_possible,
                                "percentage": round((score / points_possible) * 100, 2) if score is not None and points_possible else None,
                                "grade": sub.get("grade"),
                                "late": sub.get("late", False),
                                "missing": sub.get("missing", False)
                            }
                            
                            if score is not None:
                                student_record["total_points"] += score
                            if points_possible:
                                student_record["total_possible"] += points_possible
                
                # Calculate overall percentage
                if student_record["total_possible"] > 0:
                    student_record["overall_percentage"] = round(
                        (student_record["total_points"] / student_record["total_possible"]) * 100, 2
                    )
                
                gradebook.append(student_record)
            
            # Sort by overall percentage (highest first)
            gradebook.sort(key=lambda x: x.get("overall_percentage") or 0, reverse=True)
            
            # Calculate class statistics
            percentages = [s.get("overall_percentage") for s in gradebook if s.get("overall_percentage") is not None]
            class_statistics = {
                "total_students": len(students),
                "students_with_grades": len(percentages),
                "class_average": round(sum(percentages) / len(percentages), 2) if percentages else None,
                "class_high": max(percentages) if percentages else None,
                "class_low": min(percentages) if percentages else None,
                "pass_rate": round((len([p for p in percentages if p >= 60]) / len(percentages)) * 100, 2) if percentages else None
            }
            
            return {
                "status": "success",
                "course": {
                    "id": course_info.get("id"),
                    "name": course_info.get("name"),
                    "course_code": course_info.get("course_code")
                },
                "assignment_headers": assignment_headers,
                "statistics": class_statistics,
                "gradebook": gradebook
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Canvas API request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Canvas: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Canvas gradebook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching gradebook: {str(e)}")

