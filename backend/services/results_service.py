"""
Results Service for ScorePAL
Handles saving and retrieving grading results from MongoDB.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from bson import ObjectId
from ..models.grading_result import GradingResult, GradingResultCreate, CriterionScore
from ..services.mongodb_service import get_results_collection, get_submissions_collection
import json

logger = logging.getLogger(__name__)


async def save_grading_result(
    result_data: Dict[str, Any],
    submission_id: Optional[str] = None,
    assignment_id: Optional[str] = None,
    student_id: Optional[str] = None,
    student_name: str = "",
    grader_id: Optional[str] = None,
    grader_name: Optional[str] = None
) -> str:
    """
    Save a grading result to MongoDB.
    
    Args:
        result_data: Dictionary containing grading result data
        submission_id: Optional submission ID
        assignment_id: Optional assignment ID
        student_id: Optional student user ID
        student_name: Student name
        grader_id: Optional grader user ID
        grader_name: Optional grader name
    
    Returns:
        The ID of the saved result
    """
    try:
        collection = await get_results_collection()
        
        # Extract data from result_data
        score = result_data.get("score", 0)
        max_score = result_data.get("max_score", result_data.get("total_points", 100))
        percentage = result_data.get("percentage", (score / max_score * 100) if max_score > 0 else 0)
        
        # Convert criteria_scores to CriterionScore objects if needed
        criteria_scores = []
        for criterion in result_data.get("criteria_scores", []):
            if isinstance(criterion, dict):
                criteria_scores.append(CriterionScore(
                    criterion_name=criterion.get("name", criterion.get("criterion_name", "")),
                    criterion_description=criterion.get("description", ""),
                    score=criterion.get("points", criterion.get("score", 0)),
                    max_points=criterion.get("max_points", 0),
                    weight=criterion.get("weight", 1.0),
                    feedback=criterion.get("feedback"),
                    level=criterion.get("level")
                ).dict())
            else:
                criteria_scores.append(criterion)
        
        # Create grading result document
        result_doc = {
            "submission_id": submission_id or result_data.get("submission_id", ""),
            "assignment_id": assignment_id or result_data.get("assignment_id", ""),
            "student_id": student_id or result_data.get("student_id"),
            "student_name": student_name or result_data.get("student_name", ""),
            "grader_id": grader_id or result_data.get("grader_id"),
            "grader_name": grader_name or result_data.get("grader_name"),
            "grading_method": result_data.get("grading_method", "ai"),
            "score": score,
            "total_points": max_score,
            "percentage": percentage,
            "grade_letter": result_data.get("grade_letter") or _calculate_grade_letter(percentage),
            "criteria_scores": criteria_scores,
            "rubric_used": result_data.get("rubric"),
            "rubric_id": result_data.get("rubric_id"),
            "overall_feedback": result_data.get("feedback") or result_data.get("overall_feedback"),
            "detailed_feedback": result_data.get("detailed_feedback"),
            "strengths": result_data.get("strengths", []),
            "weaknesses": result_data.get("weaknesses", []),
            "suggestions": result_data.get("suggestions", []),
            "mistakes": result_data.get("mistakes", []),
            "graded_at": datetime.utcnow(),
            "grading_time_seconds": result_data.get("grading_time_seconds"),
            "ai_model_used": result_data.get("ai_model_used"),
            "strictness": result_data.get("strictness", 0.5),
            "is_final": result_data.get("is_final", True),
            "is_regrade": result_data.get("is_regrade", False),
            "regrade_reason": result_data.get("regrade_reason"),
            "previous_result_id": result_data.get("previous_result_id"),
            "question_text": result_data.get("question_text"),
            "answer_key_text": result_data.get("answer_key"),
            "submission_text": result_data.get("submission_text"),
            "canvas_grade_posted": result_data.get("canvas_grade_posted", False),
            "metadata": result_data.get("metadata", {})
        }
        
        # Upsert by submission_id so the same submission can be regraded infinitely
        # without hitting unique index errors on submission_id.
        existing_doc = None
        submission_key = result_doc.get("submission_id")

        if submission_key:
            existing_doc = await collection.find_one({"submission_id": submission_key})

        if existing_doc:
            # Treat this as a regrade: update existing document with new result data
            result_id = str(existing_doc["_id"])
            # Preserve original _id
            await collection.update_one(
                {"_id": existing_doc["_id"]},
                {"$set": result_doc},
            )
            logger.info(f"Updated existing grading result {result_id} for submission {submission_key}")
        else:
            # First grading for this submission – insert new document
            result = await collection.insert_one(result_doc)
            result_id = str(result.inserted_id)
            logger.info(f"Inserted new grading result {result_id} for submission {submission_key}")
        
        # Update submission with grading_result_id if submission_id exists
        if submission_id:
            try:
                submissions_collection = await get_submissions_collection()
                await submissions_collection.update_one(
                    {"_id": ObjectId(submission_id) if ObjectId.is_valid(submission_id) else submission_id},
                    {"$set": {"grading_result_id": result_id, "status": "graded"}}
                )
            except Exception as e:
                logger.warning(f"Could not update submission with result ID: {e}")
        
        return result_id
        
    except Exception as e:
        logger.error(f"Error saving grading result to MongoDB: {e}", exc_info=True)
        raise


async def get_grading_result(result_id: str) -> Optional[Dict[str, Any]]:
    """Get a grading result by ID."""
    try:
        collection = await get_results_collection()
        result = await collection.find_one({"_id": ObjectId(result_id) if ObjectId.is_valid(result_id) else result_id})
        if result:
            result["id"] = str(result["_id"])
            del result["_id"]
        return result
    except Exception as e:
        logger.error(f"Error getting grading result: {e}", exc_info=True)
        return None


async def get_results_by_assignment(assignment_id: str) -> List[Dict[str, Any]]:
    """Get all grading results for an assignment."""
    try:
        collection = await get_results_collection()
        cursor = collection.find({"assignment_id": assignment_id}).sort("graded_at", -1)
        results = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        return results
    except Exception as e:
        logger.error(f"Error getting results by assignment: {e}", exc_info=True)
        return []


async def get_results_by_student(student_id: str) -> List[Dict[str, Any]]:
    """Get all grading results for a student."""
    try:
        collection = await get_results_collection()
        cursor = collection.find({"student_id": student_id}).sort("graded_at", -1)
        results = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        return results
    except Exception as e:
        logger.error(f"Error getting results by student: {e}", exc_info=True)
        return []


async def get_result_by_submission(submission_id: str) -> Optional[Dict[str, Any]]:
    """Get grading result by submission ID."""
    try:
        collection = await get_results_collection()
        result = await collection.find_one({"submission_id": submission_id})
        if result:
            result["id"] = str(result["_id"])
            del result["_id"]
        return result
    except Exception as e:
        logger.error(f"Error getting result by submission: {e}", exc_info=True)
        return None


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


async def save_canvas_job_metadata(
    job_id: str,
    status: str,
    course_id: Optional[int] = None,
    assignment_id: Optional[int] = None,
    created_at: Optional[datetime] = None,
    completed_at: Optional[datetime] = None,
    error: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """Save or update canvas grading job metadata in MongoDB."""
    try:
        from services.mongodb_service import get_canvas_jobs_collection
        collection = await get_canvas_jobs_collection()
        
        job_doc = {
            "job_id": job_id,
            "status": status,
            "type": "canvas_assignment",
            "created_at": created_at or datetime.utcnow(),
            "course_id": course_id,
            "assignment_id": assignment_id,
            "metadata": metadata or {}
        }
        
        if completed_at:
            job_doc["completed_at"] = completed_at
        if error:
            job_doc["error"] = error
        
        await collection.update_one(
            {"job_id": job_id},
            {"$set": job_doc},
            upsert=True
        )
        
        logger.info(f"Saved canvas job metadata for job {job_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving canvas job metadata: {e}", exc_info=True)
        return False


async def get_canvas_job_metadata(job_id: str) -> Optional[Dict[str, Any]]:
    """Get canvas grading job metadata from MongoDB."""
    try:
        from services.mongodb_service import get_canvas_jobs_collection
        collection = await get_canvas_jobs_collection()
        job = await collection.find_one({"job_id": job_id})
        
        if job:
            job["id"] = str(job.get("_id", ""))
            if "_id" in job:
                del job["_id"]
        return job
    except Exception as e:
        logger.error(f"Error getting canvas job metadata: {e}", exc_info=True)
        return None


async def get_canvas_job_results(job_id: str) -> List[Dict[str, Any]]:
    """Get all grading results for a canvas job from MongoDB."""
    try:
        collection = await get_results_collection()
        cursor = collection.find({
            "metadata.grading_job_id": job_id
        }).sort("graded_at", -1)
        
        results = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        return results
    except Exception as e:
        logger.error(f"Error getting canvas job results: {e}", exc_info=True)
        return []
