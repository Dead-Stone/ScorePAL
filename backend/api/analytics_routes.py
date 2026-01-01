"""
Analytics API Routes for ScorePAL
Provides analytics endpoints with role-based access control.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from models.user import User, UserRole
from auth.auth_config import current_active_user
from services.analytics_service import (
    compute_assignment_analytics,
    compute_student_analytics,
    compute_rubric_analytics,
    compute_trend_analytics,
    compute_teacher_analytics,
    compute_grader_analytics,
    compute_grader_assignment_analytics,
    compute_canvas_course_analytics
)
from services.mongodb_service import get_results_collection, get_assignments_collection
from utils.permissions import require_role, can_view_analytics, anonymize_student_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/assignment/{assignment_id}")
async def get_assignment_analytics(
    assignment_id: str,
    use_cache: bool = Query(True, description="Use cached analytics if available"),
    user: User = Depends(current_active_user)
):
    """
    Get analytics for a specific assignment.
    
    - Students: Anonymized class aggregates only
    - Teachers: Full analytics with student names
    - Graders: Assignment-specific analytics (no cross-assignment data)
    """
    try:
        # Check permissions
        if not can_view_analytics(user, assignment_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get analytics
        analytics = await compute_assignment_analytics(assignment_id, use_cache=use_cache)
        
        # Apply role-based filtering
        if user.role == UserRole.STUDENT:
            # Anonymize student rankings and remove individual student data
            if "student_rankings" in analytics:
                # Already anonymized in computation
                pass
            # Remove any student-specific data
            analytics.pop("student_details", None)
        elif user.role == UserRole.GRADER:
            # Graders see assignment analytics but not cross-assignment comparisons
            # This is already handled at the assignment level
            pass
        
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting assignment analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving analytics: {str(e)}")


@router.get("/student/{student_id}")
async def get_student_analytics(
    student_id: str,
    use_cache: bool = Query(True, description="Use cached analytics if available"),
    user: User = Depends(current_active_user)
):
    """
    Get analytics for a specific student.
    
    - Students: Can only view their own analytics
    - Teachers: Can view any student's analytics
    - Graders: Cannot view student analytics (assignment-level only)
    """
    try:
        # Check permissions
        if user.role == UserRole.STUDENT and student_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied: Can only view your own analytics")
        
        if user.role == UserRole.GRADER:
            raise HTTPException(status_code=403, detail="Access denied: Graders can only view assignment analytics")
        
        # Get analytics
        analytics = await compute_student_analytics(student_id, use_cache=use_cache)
        
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving student analytics: {str(e)}")


@router.get("/student/{student_id}/assignments")
async def get_student_assignment_history(
    student_id: str,
    limit: int = Query(50, ge=1, le=500),
    user: User = Depends(current_active_user)
):
    """
    Get a student's assignment history with scores.
    
    - Students: Can only view their own history
    - Teachers: Can view any student's history
    - Graders: Cannot access
    """
    try:
        # Check permissions
        if user.role == UserRole.STUDENT and student_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if user.role == UserRole.GRADER:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get results for student
        results_collection = await get_results_collection()
        cursor = results_collection.find({"student_id": student_id}).sort("graded_at", -1).limit(limit)
        
        assignments = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            assignments.append({
                "assignment_id": doc.get("assignment_id"),
                "score": doc.get("score", 0),
                "total_points": doc.get("total_points", 100),
                "percentage": doc.get("percentage", 0),
                "grade_letter": doc.get("grade_letter"),
                "graded_at": doc.get("graded_at")
            })
        
        return {
            "student_id": student_id,
            "assignments": assignments,
            "count": len(assignments)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student assignment history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving assignment history: {str(e)}")


@router.get("/class/{assignment_id}")
async def get_class_analytics(
    assignment_id: str,
    include_anonymized: bool = Query(True, description="Include anonymized class data for students"),
    user: User = Depends(current_active_user)
):
    """
    Get class aggregate analytics for an assignment.
    
    - Students: Anonymized class aggregates
    - Teachers: Full class analytics with student names
    - Graders: Assignment-specific class analytics
    """
    try:
        # Get assignment analytics
        analytics = await compute_assignment_analytics(assignment_id)
        
        # Apply role-based filtering
        if user.role == UserRole.STUDENT:
            if not include_anonymized:
                # Return only student's own data
                results_collection = await get_results_collection()
                student_result = await results_collection.find_one({
                    "assignment_id": assignment_id,
                    "student_id": user.id
                })
                
                if student_result:
                    student_result["id"] = str(student_result["_id"])
                    del student_result["_id"]
                    return {
                        "assignment_id": assignment_id,
                        "student_result": student_result,
                        "class_average": analytics.get("class_stats", {}).get("average_score", 0)
                    }
                else:
                    return {
                        "assignment_id": assignment_id,
                        "message": "No result found for this assignment"
                    }
            else:
                # Return anonymized class data
                if "student_rankings" in analytics:
                    # Rankings are already anonymized
                    pass
        elif user.role == UserRole.TEACHER:
            # Teachers see full data - no changes needed
            pass
        elif user.role == UserRole.GRADER:
            # Graders see assignment analytics but anonymized student data
            if "student_rankings" in analytics:
                # Already anonymized
                pass
        
        return analytics
    except Exception as e:
        logger.error(f"Error getting class analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving class analytics: {str(e)}")


@router.get("/rubric/{rubric_id}")
async def get_rubric_analytics(
    rubric_id: str,
    user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    """
    Get rubric performance analytics across all assignments using this rubric.
    
    Only accessible to teachers and admins.
    """
    try:
        # Find all assignments using this rubric
        assignments_collection = await get_assignments_collection()
        cursor = assignments_collection.find({"rubric_id": rubric_id})
        
        assignment_ids = []
        async for doc in cursor:
            assignment_ids.append(str(doc["_id"]))
        
        if not assignment_ids:
            return {
                "rubric_id": rubric_id,
                "message": "No assignments found using this rubric",
                "analytics": {}
            }
        
        # Get analytics for each assignment
        rubric_analytics = []
        for assignment_id in assignment_ids:
            try:
                analytics = await compute_rubric_analytics(assignment_id)
                rubric_analytics.append({
                    "assignment_id": assignment_id,
                    "rubric_performance": analytics.get("rubric_performance", [])
                })
            except Exception as e:
                logger.warning(f"Could not compute analytics for assignment {assignment_id}: {e}")
        
        return {
            "rubric_id": rubric_id,
            "assignment_count": len(assignment_ids),
            "analytics": rubric_analytics
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting rubric analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving rubric analytics: {str(e)}")


@router.get("/trends/{student_id}")
async def get_student_trends(
    student_id: str,
    time_range_days: int = Query(90, ge=1, le=365, description="Number of days to look back"),
    user: User = Depends(current_active_user)
):
    """
    Get progress trends for a student over time.
    
    - Students: Can only view their own trends
    - Teachers: Can view any student's trends
    - Graders: Cannot access
    """
    try:
        # Check permissions
        if user.role == UserRole.STUDENT and student_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if user.role == UserRole.GRADER:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get trend analytics
        trends = await compute_trend_analytics(student_id, time_range_days)
        
        return trends
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student trends: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving trends: {str(e)}")


# Teacher Analytics Routes
@router.get("/teacher/overview")
async def get_teacher_overview(
    use_cache: bool = Query(True, description="Use cached analytics if available"),
    include_canvas: bool = Query(False, description="Include Canvas data if API key is configured"),
    user: User = Depends(current_active_user)
):
    """
    Get teacher dashboard overview with aggregated stats across all assignments and courses.
    Optionally includes Canvas course/assignment data if Canvas API key is configured.
    
    Only accessible to teachers and admins.
    """
    try:
        # Check if user is teacher or admin
        if user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Access denied: Teachers and admins only")
        
        analytics = await compute_teacher_analytics(user.id, use_cache=use_cache)
        
        # Optionally include Canvas data
        canvas_data = None
        if include_canvas:
            try:
                from api.settings_routes import get_user_settings
                settings = await get_user_settings(user)
                
                if settings and settings.get("canvas_api_key") and settings.get("canvas_key_valid"):
                    # Fetch Canvas courses
                    canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
                    api_key = settings.get("canvas_api_key")
                    
                    canvas_url = canvas_url.rstrip('/')
                    if not canvas_url.startswith('http'):
                        canvas_url = f"https://{canvas_url}"
                    
                    import requests
                    headers = {
                        "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
                        "Content-Type": "application/json"
                    }
                    
                    # Get courses
                    courses_response = requests.get(
                        f"{canvas_url}/api/v1/courses?per_page=100&include[]=total_scores",
                        headers=headers,
                        timeout=10
                    )
                    
                    if courses_response.status_code == 200:
                        courses = courses_response.json()
                        canvas_data = {
                            "courses": courses,
                            "total_courses": len(courses)
                        }
            except Exception as e:
                logger.warning(f"Could not fetch Canvas data: {e}")
                canvas_data = None
        
        return {
            **analytics,
            "canvas_data": canvas_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting teacher overview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving teacher analytics: {str(e)}")


@router.get("/teacher/courses")
async def get_teacher_courses(
    user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    """
    Get list of all courses with stats for a teacher.
    
    Only accessible to teachers and admins.
    """
    try:
        analytics = await compute_teacher_analytics(user.id)
        return {
            "courses": analytics.get("courses", []),
            "total_courses": len(analytics.get("courses", []))
        }
    except Exception as e:
        logger.error(f"Error getting teacher courses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving courses: {str(e)}")


@router.get("/teacher/course/{course_id}")
async def get_teacher_course_analytics(
    course_id: str,
    user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    """
    Get course-level analytics for a specific Canvas course.
    
    Only accessible to teachers and admins.
    """
    try:
        # Use Canvas course analytics
        analytics = await compute_canvas_course_analytics(course_id)
        return analytics
    except Exception as e:
        logger.error(f"Error getting course analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving course analytics: {str(e)}")


@router.get("/teacher/assignments")
async def get_teacher_assignments(
    user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    """
    Get all assignments with comparison stats for a teacher.
    
    Only accessible to teachers and admins.
    """
    try:
        analytics = await compute_teacher_analytics(user.id)
        return {
            "assignments": analytics.get("assignments", []),
            "total_assignments": len(analytics.get("assignments", []))
        }
    except Exception as e:
        logger.error(f"Error getting teacher assignments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving assignments: {str(e)}")


# Grader Analytics Routes
@router.get("/grader/overview")
async def get_grader_overview(
    use_cache: bool = Query(True, description="Use cached analytics if available"),
    include_canvas: bool = Query(False, description="Include Canvas data if API key is configured"),
    user: User = Depends(current_active_user)
):
    """
    Get grader dashboard overview with efficiency and quality metrics.
    Optionally includes Canvas course/assignment data if Canvas API key is configured.
    
    Accessible to graders, teachers, and admins.
    """
    try:
        # Allow graders, teachers, and admins (teachers also grade)
        if user.role not in [UserRole.GRADER, UserRole.TEACHER, UserRole.ADMIN] and not user.is_superuser:
            raise HTTPException(status_code=403, detail="Access denied: Graders, teachers, and admins only")
        
        analytics = await compute_grader_analytics(user.id, use_cache=use_cache)
        
        # Optionally include Canvas data
        canvas_data = None
        if include_canvas:
            try:
                from api.settings_routes import get_user_settings
                settings = await get_user_settings(user)
                
                if settings and settings.get("canvas_api_key") and settings.get("canvas_key_valid"):
                    # Fetch Canvas courses
                    canvas_url = settings.get("canvas_url") or "https://canvas.instructure.com"
                    api_key = settings.get("canvas_api_key")
                    
                    canvas_url = canvas_url.rstrip('/')
                    if not canvas_url.startswith('http'):
                        canvas_url = f"https://{canvas_url}"
                    
                    import requests
                    headers = {
                        "Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer") else api_key,
                        "Content-Type": "application/json"
                    }
                    
                    # Get courses
                    courses_response = requests.get(
                        f"{canvas_url}/api/v1/courses?per_page=100&include[]=total_scores",
                        headers=headers,
                        timeout=10
                    )
                    
                    if courses_response.status_code == 200:
                        courses = courses_response.json()
                        canvas_data = {
                            "courses": courses[:10],  # Limit to 10 for overview
                            "total_courses": len(courses)
                        }
            except Exception as e:
                logger.warning(f"Could not fetch Canvas data: {e}")
                canvas_data = None
        
        return {
            **analytics,
            "canvas_data": canvas_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grader overview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving grader analytics: {str(e)}")


@router.get("/grader/assignments")
async def get_grader_assignments(
    user: User = Depends(current_active_user)
):
    """
    Get list of all assignments graded by this grader with quick stats.
    
    Accessible to graders, teachers, and admins.
    """
    try:
        # Allow graders, teachers, and admins
        if user.role not in [UserRole.GRADER, UserRole.TEACHER, UserRole.ADMIN] and not user.is_superuser:
            raise HTTPException(status_code=403, detail="Access denied: Graders, teachers, and admins only")
        
        analytics = await compute_grader_analytics(user.id)
        return {
            "assignments": analytics.get("assignments", []),
            "total_assignments": len(analytics.get("assignments", []))
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grader assignments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving assignments: {str(e)}")


@router.get("/grader/assignment/{assignment_id}")
async def get_grader_assignment_analytics(
    assignment_id: str,
    user: User = Depends(current_active_user)
):
    """
    Get per-assignment drill-down analytics for a specific assignment graded by this grader.
    
    Accessible to graders, teachers, and admins.
    """
    try:
        # Allow graders, teachers, and admins
        if user.role not in [UserRole.GRADER, UserRole.TEACHER, UserRole.ADMIN] and not user.is_superuser:
            raise HTTPException(status_code=403, detail="Access denied: Graders, teachers, and admins only")
        
        analytics = await compute_grader_assignment_analytics(user.id, assignment_id)
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grader assignment analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving assignment analytics: {str(e)}")


# Canvas Comparison Routes
@router.get("/canvas/course/{course_id}/comparison")
async def get_canvas_course_comparison(
    course_id: str,
    user: User = Depends(current_active_user)
):
    """
    Get Canvas course comparison view with all assignments and student progress.
    
    Accessible to teachers (for their courses) and admins.
    """
    try:
        # Check if user is teacher and owns this course
        if user.role == UserRole.TEACHER:
            # Verify teacher owns assignments in this course
            assignments_collection = await get_assignments_collection()
            assignment_count = await assignments_collection.count_documents({
                "teacher_id": user.id,
                "$or": [
                    {"canvas_course_id": course_id},
                    {"course_id": course_id}
                ]
            })
            if assignment_count == 0:
                raise HTTPException(status_code=403, detail="Access denied: You don't have access to this course")
        
        if user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        analytics = await compute_canvas_course_analytics(course_id)
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Canvas course comparison: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving course comparison: {str(e)}")

