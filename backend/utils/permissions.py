"""
Permission utilities for role-based access control in ScorePAL.
"""

from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from ..models.user import User, UserRole
from motor.motor_asyncio import AsyncIOMotorCollection
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory to require specific user roles.
    
    Usage:
        @app.get("/endpoint")
        async def endpoint(user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))):
            ...
    """
    def role_checker(user: User) -> User:
        if user.role not in allowed_roles and not user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join([r.value for r in allowed_roles])}"
            )
        return user
    return role_checker


def can_view_result(user: User, result: Dict[str, Any]) -> bool:
    """
    Check if a user can view a specific grading result.
    
    Rules:
    - Teachers can view all results for their assignments
    - Students can view only their own results
    - Graders can view results for assignments they're assigned to
    - Admins can view all results
    """
    if user.is_superuser:
        return True
    
    student_id = result.get("student_id")
    student_name = result.get("student_name", "").lower()
    assignment_id = result.get("assignment_id")
    
    if user.role == UserRole.STUDENT:
        # Students can only see their own results
        return (
            (student_id and student_id == user.id) or
            (user.email and student_name == user.email.lower()) or
            (user.first_name and user.last_name and 
             student_name == f"{user.first_name} {user.last_name}".lower())
        )
    
    elif user.role == UserRole.TEACHER:
        # Teachers can see results for their assignments
        # We'll need to check assignment ownership separately
        return True  # Will be filtered by assignment ownership in queries
    
    elif user.role == UserRole.GRADER:
        # Graders can see results for assignments they're assigned to
        # This requires checking grader assignments (to be implemented)
        return True  # Will be filtered by grader assignments in queries
    
    return False


def can_view_analytics(user: User, assignment_id: Optional[str] = None) -> bool:
    """
    Check if a user can view analytics for an assignment.
    
    Rules:
    - Students can view anonymized class analytics for assignments they're enrolled in
    - Teachers can view full analytics for their assignments
    - Graders can view analytics for assignments they're assigned to
    - Admins can view all analytics
    """
    if user.is_superuser:
        return True
    
    if user.role in [UserRole.STUDENT, UserRole.TEACHER, UserRole.GRADER]:
        return True  # Will be filtered by role in queries
    
    return False


async def filter_results_by_role(
    user: User,
    collection: AsyncIOMotorCollection,
    base_query: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Apply role-based filtering to a MongoDB query for grading results.
    
    Returns a filtered query dictionary.
    """
    if base_query is None:
        base_query = {}
    
    if user.is_superuser:
        return base_query
    
    if user.role == UserRole.STUDENT:
        # Students can only see their own results
        student_query = {
            "$or": [
                {"student_id": user.id},
                {"student_name": {"$regex": user.email or "", "$options": "i"}},
            ]
        }
        if user.first_name and user.last_name:
            full_name = f"{user.first_name} {user.last_name}"
            student_query["$or"].append({"student_name": {"$regex": full_name, "$options": "i"}})
        
        return {**base_query, **student_query}
    
    elif user.role == UserRole.TEACHER:
        # Teachers can see results for their assignments
        # We need to join with assignments collection to filter by teacher_id
        # For now, return base_query and filter in application layer
        return base_query
    
    elif user.role == UserRole.GRADER:
        # Graders can see results for assignments they graded (filter by grader_id)
        return {**base_query, "grader_id": user.id}
    
    return base_query


async def filter_assignments_by_role(
    user: User,
    collection: AsyncIOMotorCollection,
    base_query: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Apply role-based filtering to a MongoDB query for assignments.
    
    Returns a filtered query dictionary.
    """
    if base_query is None:
        base_query = {}
    
    if user.is_superuser:
        return base_query
    
    if user.role == UserRole.TEACHER:
        # Teachers can see their own assignments
        return {**base_query, "teacher_id": user.id}
    
    elif user.role == UserRole.GRADER:
        # Graders can see assignments they've graded
        # We need to find assignments where grader_id matches in results
        # This is handled at the application layer by checking results collection
        # For now, return base_query and filter in application layer
        return base_query
    
    elif user.role == UserRole.STUDENT:
        # Students can see published assignments for courses they're enrolled in
        # This requires a course_enrollments collection (to be implemented)
        # For now, return published assignments
        return {**base_query, "status": "published"}
    
    return base_query


async def can_access_assignment(user: User, assignment: Dict[str, Any]) -> bool:
    """
    Check if a user can access a specific assignment.
    
    Rules:
    - Teachers can access their own assignments
    - Students can access published assignments in their courses
    - Graders can access assignments they're assigned to
    - Admins can access all assignments
    """
    if user.is_superuser:
        return True
    
    assignment_teacher_id = assignment.get("teacher_id")
    assignment_status = assignment.get("status")
    
    if user.role == UserRole.TEACHER:
        return assignment_teacher_id == user.id
    
    elif user.role == UserRole.STUDENT:
        return assignment_status == "published"
    
    elif user.role == UserRole.GRADER:
        # Check if grader has graded any submissions for this assignment
        # This is checked by looking for results with grader_id and assignment_id
        # For now, allow access (will be filtered by results in queries)
        return True
    
    return False


def anonymize_student_data(results: List[Dict[str, Any]], current_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Anonymize student data in results for class aggregate views.
    Keep only the current user's data identifiable.
    
    Args:
        results: List of result dictionaries
        current_user_id: ID of the current user (their data won't be anonymized)
    
    Returns:
        List of results with anonymized student names
    """
    anonymized = []
    for i, result in enumerate(results):
        anonymized_result = result.copy()
        
        # Anonymize student information unless it's the current user
        student_id = result.get("student_id")
        if student_id != current_user_id:
            anonymized_result["student_id"] = None
            anonymized_result["student_name"] = f"Student {i + 1}"
            anonymized_result["student_email"] = None
        
        anonymized.append(anonymized_result)
    
    return anonymized


async def filter_by_canvas_course(
    user: User,
    collection: AsyncIOMotorCollection,
    course_id: str,
    base_query: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Filter assignments or results by Canvas course ID.
    
    For teachers, ensures they own assignments in the course.
    For graders, filters results for assignments in the course they've graded.
    
    Args:
        user: Current user
        collection: MongoDB collection (assignments or results)
        course_id: Canvas course ID
        base_query: Base query to extend
    
    Returns:
        Filtered query dictionary
    """
    if base_query is None:
        base_query = {}
    
    if user.is_superuser:
        # Admins can see all
        return {
            **base_query,
            "$or": [
                {"canvas_course_id": course_id},
                {"course_id": course_id}
            ]
        }
    
    if user.role == UserRole.TEACHER:
        # Teachers can see their own assignments in the course
        return {
            **base_query,
            "teacher_id": user.id,
            "$or": [
                {"canvas_course_id": course_id},
                {"course_id": course_id}
            ]
        }
    
    elif user.role == UserRole.GRADER:
        # For results collection, filter by grader_id and course via assignment lookup
        # This requires joining with assignments, handled in application layer
        return {
            **base_query,
            "grader_id": user.id
        }
    
    return base_query

