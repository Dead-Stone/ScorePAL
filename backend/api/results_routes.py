"""
Results API Routes for ScorePAL
Handles retrieval and management of grading results with role-based access.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime

from models.user import User, UserRole
from auth.auth_config import current_active_user
from services.results_service import (
    get_grading_result,
    get_results_by_assignment,
    get_results_by_student,
    get_result_by_submission,
    save_grading_result
)
from services.mongodb_service import get_results_collection
from utils.permissions import (
    require_role,
    can_view_result,
    filter_results_by_role,
    anonymize_student_data
)
from bson import ObjectId

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/results", tags=["results"])


@router.get("")
async def list_results(
    assignment_id: Optional[str] = Query(None, description="Filter by assignment ID"),
    student_id: Optional[str] = Query(None, description="Filter by student ID"),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    user: User = Depends(current_active_user)
):
    """
    List grading results with role-based filtering.
    
    - Students: Only their own results
    - Teachers: All results for their assignments
    - Graders: Results for assignments they're assigned to
    """
    try:
        collection = await get_results_collection()
        
        # Build base query
        base_query = {}
        if assignment_id:
            base_query["assignment_id"] = assignment_id
        if student_id:
            base_query["student_id"] = student_id
        
        # Apply role-based filtering
        filtered_query = await filter_results_by_role(user, collection, base_query)
        
        # Execute query
        cursor = collection.find(filtered_query).sort("graded_at", -1).skip(skip).limit(limit)
        results = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            
            # Check if user can view this specific result
            if can_view_result(user, doc):
                # Anonymize for students if not their own result
                if user.role == UserRole.STUDENT and doc.get("student_id") != user.id:
                    doc = anonymize_student_data([doc], user.id)[0]
                
                results.append(doc)
        
        return {
            "results": results,
            "count": len(results),
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error listing results: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving results: {str(e)}")


@router.get("/{result_id}")
async def get_result(
    result_id: str,
    user: User = Depends(current_active_user)
):
    """Get a specific grading result by ID."""
    try:
        result = await get_grading_result(result_id)
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Check permissions
        if not can_view_result(user, result):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Anonymize if needed
        if user.role == UserRole.STUDENT and result.get("student_id") != user.id:
            result = anonymize_student_data([result], user.id)[0]
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting result: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving result: {str(e)}")


@router.get("/assignment/{assignment_id}")
async def get_assignment_results(
    assignment_id: str,
    include_anonymized: bool = Query(False, description="Include anonymized class data for students"),
    user: User = Depends(current_active_user)
):
    """
    Get all results for a specific assignment.
    
    - Students: Only their own result + anonymized class aggregates if include_anonymized=True
    - Teachers: All results
    - Graders: All results for this assignment
    """
    try:
        results = await get_results_by_assignment(assignment_id)
        
        if user.role == UserRole.STUDENT:
            # Filter to only student's own result
            student_results = [r for r in results if r.get("student_id") == user.id]
            
            if include_anonymized:
                # Add anonymized class data
                other_results = [r for r in results if r.get("student_id") != user.id]
                anonymized = anonymize_student_data(other_results, user.id)
                student_results.extend(anonymized)
            
            return {
                "assignment_id": assignment_id,
                "results": student_results,
                "count": len(student_results)
            }
        else:
            # Teachers and graders see all results
            return {
                "assignment_id": assignment_id,
                "results": results,
                "count": len(results)
            }
    except Exception as e:
        logger.error(f"Error getting assignment results: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving assignment results: {str(e)}")


@router.get("/student/{student_id}")
async def get_student_results(
    student_id: str,
    user: User = Depends(current_active_user)
):
    """
    Get all results for a specific student.
    
    - Students: Can only view their own results
    - Teachers: Can view any student's results
    - Graders: Can view results for students in their assigned assignments
    """
    try:
        # Check permissions
        if user.role == UserRole.STUDENT and student_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied: Can only view your own results")
        
        results = await get_results_by_student(student_id)
        
        return {
            "student_id": student_id,
            "results": results,
            "count": len(results)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student results: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving student results: {str(e)}")


@router.get("/assignment/{assignment_id}/student/{student_id}")
async def get_student_assignment_result(
    assignment_id: str,
    student_id: str,
    user: User = Depends(current_active_user)
):
    """Get a specific student's result for a specific assignment."""
    try:
        # Check permissions
        if user.role == UserRole.STUDENT and student_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        collection = await get_results_collection()
        result = await collection.find_one({
            "assignment_id": assignment_id,
            "student_id": student_id
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        result["id"] = str(result["_id"])
        del result["_id"]
        
        if not can_view_result(user, result):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student assignment result: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving result: {str(e)}")


@router.post("/{result_id}/regrade")
async def request_regrade(
    result_id: str,
    reason: Optional[str] = None,
    user: User = Depends(require_role(UserRole.STUDENT))
):
    """
    Request a regrade of a result (students only).
    
    This creates a new result with is_regrade=True and links to the previous result.
    """
    try:
        # Get the original result
        original_result = await get_grading_result(result_id)
        if not original_result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Check if student owns this result
        if original_result.get("student_id") != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create regrade request (this would typically trigger a grading job)
        # For now, we'll just mark it as a regrade request
        regrade_result = {
            **original_result,
            "is_regrade": True,
            "regrade_reason": reason or "Student requested regrade",
            "previous_result_id": result_id,
            "status": "pending_regrade"
        }
        
        # Save regrade request
        new_result_id = await save_grading_result(
            result_data=regrade_result,
            submission_id=original_result.get("submission_id"),
            assignment_id=original_result.get("assignment_id"),
            student_id=user.id,
            student_name=original_result.get("student_name", ""),
            grader_id=original_result.get("grader_id")
        )
        
        return {
            "message": "Regrade requested successfully",
            "regrade_result_id": new_result_id,
            "status": "pending"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting regrade: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error requesting regrade: {str(e)}")


@router.put("/{result_id}")
async def update_result(
    result_id: str,
    update_data: Dict[str, Any],
    user: User = Depends(require_role(UserRole.TEACHER, UserRole.GRADER))
):
    """
    Update a grading result (teachers and graders only).
    
    Allows updating scores, feedback, and other result fields.
    """
    try:
        collection = await get_results_collection()
        
        # Get existing result
        existing = await collection.find_one({"_id": ObjectId(result_id) if ObjectId.is_valid(result_id) else result_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Check permissions (teachers can update any result, graders only their assigned ones)
        # For now, allow all teachers/graders to update
        
        # Prepare update
        update_doc = {
            "$set": {
                "updated_at": datetime.utcnow()
            }
        }
        
        # Update allowed fields
        allowed_fields = ["score", "percentage", "grade_letter", "criteria_scores", 
                         "overall_feedback", "detailed_feedback", "is_final", "canvas_grade_posted"]
        for field in allowed_fields:
            if field in update_data:
                update_doc["$set"][field] = update_data[field]
        
        # Recalculate percentage if score changed
        if "score" in update_data and "total_points" not in update_data:
            total_points = existing.get("total_points", 100)
            score = update_data["score"]
            update_doc["$set"]["percentage"] = (score / total_points * 100) if total_points > 0 else 0
            update_doc["$set"]["grade_letter"] = _calculate_grade_letter(update_doc["$set"]["percentage"])
        
        # Execute update
        await collection.update_one(
            {"_id": ObjectId(result_id) if ObjectId.is_valid(result_id) else result_id},
            update_doc
        )
        
        # Return updated result
        updated = await get_grading_result(result_id)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating result: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating result: {str(e)}")


def _calculate_grade_letter(percentage: float) -> str:
    """Calculate letter grade from percentage."""
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    else:
        return "F"

