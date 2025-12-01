"""
Analytics Service for ScorePAL
Computes analytics and statistics from grading results.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from statistics import mean, median, mode, stdev
from collections import Counter
from services.mongodb_service import get_results_collection, get_analytics_collection, get_assignments_collection
from models.analytics_cache import AnalyticsCache, ClassStats, RubricPerformance, StudentRanking
from bson import ObjectId

logger = logging.getLogger(__name__)


async def compute_assignment_analytics(assignment_id: str, use_cache: bool = True) -> Dict[str, Any]:
    """
    Compute class-level analytics for an assignment.
    
    Returns:
        Dictionary containing class statistics, rubric performance, and student rankings
    """
    try:
        # Check cache first
        if use_cache:
            cached = await get_cached_analytics(assignment_id, "assignment")
            if cached and not cached.get("is_stale", False):
                logger.info(f"Using cached analytics for assignment {assignment_id}")
                return cached
        
        # Get all results for this assignment
        results_collection = await get_results_collection()
        cursor = results_collection.find({"assignment_id": assignment_id})
        results = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        
        if not results:
            return {
                "assignment_id": assignment_id,
                "class_stats": {
                    "total_submissions": 0,
                    "graded_submissions": 0
                },
                "rubric_performance": [],
                "student_rankings": []
            }
        
        # Compute class statistics
        scores = [r.get("score", 0) for r in results]
        percentages = [r.get("percentage", 0) for r in results]
        total_points = results[0].get("total_points", 100) if results else 100
        
        class_stats = {
            "total_submissions": len(results),
            "graded_submissions": len([r for r in results if r.get("score") is not None]),
            "average_score": mean(scores) if scores else 0,
            "median_score": median(scores) if scores else 0,
            "highest_score": max(scores) if scores else 0,
            "lowest_score": min(scores) if scores else 0,
            "average_percentage": mean(percentages) if percentages else 0,
            "standard_deviation": stdev(scores) if len(scores) > 1 else 0,
        }
        
        # Calculate mode if possible
        try:
            class_stats["mode_score"] = mode(scores) if scores else None
        except:
            class_stats["mode_score"] = None
        
        # Calculate pass rate (assuming 60% is passing)
        passing_count = len([p for p in percentages if p >= 60])
        class_stats["pass_rate"] = (passing_count / len(percentages) * 100) if percentages else 0
        class_stats["fail_rate"] = 100 - class_stats["pass_rate"]
        
        # Grade distribution
        grade_distribution = Counter([r.get("grade_letter", "F") for r in results])
        class_stats["grade_distribution"] = dict(grade_distribution)
        
        # Compute rubric performance
        rubric_performance = _compute_rubric_performance(results)
        
        # Compute student rankings (anonymized)
        student_rankings = _compute_student_rankings(results)
        
        # Common mistakes
        common_mistakes = _extract_common_mistakes(results)
        
        analytics = {
            "assignment_id": assignment_id,
            "cache_type": "assignment",
            "class_stats": class_stats,
            "rubric_performance": rubric_performance,
            "student_rankings": student_rankings,
            "common_mistakes": common_mistakes,
            "computed_at": datetime.utcnow().isoformat(),
            "data_snapshot_count": len(results)
        }
        
        # Cache the results
        await cache_analytics(assignment_id, "assignment", analytics)
        
        return analytics
    except Exception as e:
        logger.error(f"Error computing assignment analytics: {e}", exc_info=True)
        raise


async def compute_student_analytics(student_id: str, use_cache: bool = True) -> Dict[str, Any]:
    """
    Compute student-level analytics including progress trends and strength/weakness analysis.
    """
    try:
        # Check cache
        if use_cache:
            cached = await get_cached_analytics(student_id, "student")
            if cached and not cached.get("is_stale", False):
                return cached
        
        # Get all results for this student
        results_collection = await get_results_collection()
        cursor = results_collection.find({"student_id": student_id}).sort("graded_at", 1)
        results = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        
        if not results:
            return {
                "student_id": student_id,
                "total_assignments": 0,
                "average_score": 0,
                "progress_trend": [],
                "strength_weakness": {}
            }
        
        # Compute basic stats
        scores = [r.get("score", 0) for r in results]
        percentages = [r.get("percentage", 0) for r in results]
        
        student_stats = {
            "total_assignments": len(results),
            "average_score": mean(scores) if scores else 0,
            "average_percentage": mean(percentages) if percentages else 0,
            "highest_score": max(scores) if scores else 0,
            "lowest_score": min(scores) if scores else 0,
            "improvement": percentages[-1] - percentages[0] if len(percentages) > 1 else 0
        }
        
        # Progress trend over time
        progress_trend = [
            {
                "assignment_id": r.get("assignment_id"),
                "score": r.get("score", 0),
                "percentage": r.get("percentage", 0),
                "graded_at": r.get("graded_at")
            }
            for r in results
        ]
        
        # Strength/weakness analysis based on rubric criteria
        strength_weakness = _analyze_strength_weakness(results)
        
        analytics = {
            "student_id": student_id,
            "cache_type": "student",
            "student_stats": student_stats,
            "progress_trend": progress_trend,
            "strength_weakness": strength_weakness,
            "computed_at": datetime.utcnow().isoformat(),
            "data_snapshot_count": len(results)
        }
        
        # Cache the results
        await cache_analytics(student_id, "student", analytics)
        
        return analytics
    except Exception as e:
        logger.error(f"Error computing student analytics: {e}", exc_info=True)
        raise


async def compute_rubric_analytics(assignment_id: str) -> Dict[str, Any]:
    """Compute rubric performance analytics for an assignment."""
    try:
        results_collection = await get_results_collection()
        cursor = results_collection.find({"assignment_id": assignment_id})
        results = []
        async for doc in cursor:
            results.append(doc)
        
        rubric_performance = _compute_rubric_performance(results)
        
        return {
            "assignment_id": assignment_id,
            "rubric_performance": rubric_performance,
            "computed_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error computing rubric analytics: {e}", exc_info=True)
        raise


async def compute_trend_analytics(student_id: str, time_range_days: int = 90) -> Dict[str, Any]:
    """Compute progress trends for a student over a time range."""
    try:
        results_collection = await get_results_collection()
        cutoff_date = datetime.utcnow() - timedelta(days=time_range_days)
        
        cursor = results_collection.find({
            "student_id": student_id,
            "graded_at": {"$gte": cutoff_date}
        }).sort("graded_at", 1)
        
        results = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        
        trend_data = [
            {
                "date": r.get("graded_at"),
                "score": r.get("score", 0),
                "percentage": r.get("percentage", 0),
                "assignment_id": r.get("assignment_id")
            }
            for r in results
        ]
        
        return {
            "student_id": student_id,
            "time_range_days": time_range_days,
            "trend_data": trend_data,
            "computed_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error computing trend analytics: {e}", exc_info=True)
        raise


def _compute_rubric_performance(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compute performance statistics for each rubric criterion."""
    if not results:
        return []
    
    # Collect all criteria scores
    criteria_scores_map = {}
    
    for result in results:
        criteria_scores = result.get("criteria_scores", [])
        for criterion in criteria_scores:
            criterion_name = criterion.get("criterion_name") or criterion.get("name", "")
            if not criterion_name:
                continue
            
            if criterion_name not in criteria_scores_map:
                criteria_scores_map[criterion_name] = {
                    "scores": [],
                    "max_points": criterion.get("max_points", 0),
                    "descriptions": []
                }
            
            score = criterion.get("score") or criterion.get("points", 0)
            criteria_scores_map[criterion_name]["scores"].append(score)
            if criterion.get("feedback"):
                criteria_scores_map[criterion_name]["descriptions"].append(criterion.get("feedback"))
    
    # Compute statistics for each criterion
    rubric_performance = []
    for criterion_name, data in criteria_scores_map.items():
        scores = data["scores"]
        if not scores:
            continue
        
        avg_score = mean(scores)
        max_points = data["max_points"]
        avg_percentage = (avg_score / max_points * 100) if max_points > 0 else 0
        
        # Determine difficulty level
        if avg_percentage >= 80:
            difficulty = "easy"
        elif avg_percentage >= 60:
            difficulty = "medium"
        else:
            difficulty = "hard"
        
        rubric_performance.append({
            "criterion_name": criterion_name,
            "average_score": avg_score,
            "max_points": max_points,
            "average_percentage": avg_percentage,
            "difficulty_level": difficulty,
            "common_feedback": _extract_common_feedback(data["descriptions"])
        })
    
    return rubric_performance


def _compute_student_rankings(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compute student rankings (anonymized)."""
    if not results:
        return []
    
    # Sort by percentage descending
    sorted_results = sorted(results, key=lambda x: x.get("percentage", 0), reverse=True)
    
    rankings = []
    for rank, result in enumerate(sorted_results, 1):
        rankings.append({
            "rank": rank,
            "score": result.get("score", 0),
            "percentage": result.get("percentage", 0),
            "is_anonymized": True
        })
    
    return rankings


def _analyze_strength_weakness(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze student's strengths and weaknesses based on rubric criteria."""
    if not results:
        return {"strengths": [], "weaknesses": []}
    
    # Aggregate criterion scores across all assignments
    criterion_averages = {}
    
    for result in results:
        criteria_scores = result.get("criteria_scores", [])
        for criterion in criteria_scores:
            criterion_name = criterion.get("criterion_name") or criterion.get("name", "")
            if not criterion_name:
                continue
            
            score = criterion.get("score") or criterion.get("points", 0)
            max_points = criterion.get("max_points", 0)
            percentage = (score / max_points * 100) if max_points > 0 else 0
            
            if criterion_name not in criterion_averages:
                criterion_averages[criterion_name] = []
            criterion_averages[criterion_name].append(percentage)
    
    # Calculate averages and identify strengths/weaknesses
    strengths = []
    weaknesses = []
    
    for criterion_name, percentages in criterion_averages.items():
        avg_percentage = mean(percentages) if percentages else 0
        
        if avg_percentage >= 80:
            strengths.append({
                "criterion": criterion_name,
                "average_percentage": avg_percentage
            })
        elif avg_percentage < 60:
            weaknesses.append({
                "criterion": criterion_name,
                "average_percentage": avg_percentage
            })
    
    return {
        "strengths": sorted(strengths, key=lambda x: x["average_percentage"], reverse=True),
        "weaknesses": sorted(weaknesses, key=lambda x: x["average_percentage"])
    }


def _extract_common_mistakes(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract common mistakes from results."""
    all_mistakes = []
    for result in results:
        mistakes = result.get("mistakes", [])
        all_mistakes.extend(mistakes)
    
    # Count mistake types
    mistake_counts = Counter([m.get("type") or m.get("description", "Unknown") for m in all_mistakes])
    
    return [
        {"mistake": mistake, "count": count}
        for mistake, count in mistake_counts.most_common(10)
    ]


def _extract_common_feedback(feedbacks: List[str]) -> List[str]:
    """Extract common feedback phrases."""
    # Simple implementation - can be enhanced with NLP
    if not feedbacks:
        return []
    
    # Return most frequent feedback (simplified)
    feedback_counts = Counter(feedbacks)
    return [feedback for feedback, count in feedback_counts.most_common(5)]


async def cache_analytics(entity_id: str, cache_type: str, analytics: Dict[str, Any]):
    """Cache analytics results."""
    try:
        collection = await get_analytics_collection()
        
        # Set expiration (24 hours)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        cache_doc = {
            **analytics,
            "expires_at": expires_at,
            "is_stale": False
        }
        
        # Upsert cache
        await collection.update_one(
            {
                "assignment_id" if cache_type == "assignment" else "student_id": entity_id,
                "cache_type": cache_type
            },
            {"$set": cache_doc},
            upsert=True
        )
    except Exception as e:
        logger.warning(f"Could not cache analytics: {e}")


async def get_cached_analytics(entity_id: str, cache_type: str) -> Optional[Dict[str, Any]]:
    """Get cached analytics if available and not stale."""
    try:
        collection = await get_analytics_collection()
        
        query = {
            "assignment_id" if cache_type == "assignment" else "student_id": entity_id,
            "cache_type": cache_type
        }
        
        cached = await collection.find_one(query)
        if cached:
            cached["id"] = str(cached["_id"])
            del cached["_id"]
            
            # Check if stale
            expires_at = cached.get("expires_at")
            if expires_at and isinstance(expires_at, datetime):
                if expires_at < datetime.utcnow():
                    cached["is_stale"] = True
            
            return cached
        return None
    except Exception as e:
        logger.warning(f"Could not get cached analytics: {e}")
        return None

