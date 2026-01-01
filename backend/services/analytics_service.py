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
        
        # Build query based on cache type
        if cache_type == "assignment":
            query = {"assignment_id": entity_id, "cache_type": cache_type}
        elif cache_type in ["teacher", "grader"]:
            query = {f"{cache_type}_id": entity_id, "cache_type": cache_type}
        else:
            query = {"student_id": entity_id, "cache_type": cache_type}
        
        # Upsert cache
        await collection.update_one(
            query,
            {"$set": cache_doc},
            upsert=True
        )
    except Exception as e:
        logger.warning(f"Could not cache analytics: {e}")


async def get_cached_analytics(entity_id: str, cache_type: str) -> Optional[Dict[str, Any]]:
    """Get cached analytics if available and not stale."""
    try:
        collection = await get_analytics_collection()
        
        # Build query based on cache type
        if cache_type == "assignment":
            query = {"assignment_id": entity_id, "cache_type": cache_type}
        elif cache_type in ["teacher", "grader"]:
            query = {f"{cache_type}_id": entity_id, "cache_type": cache_type}
        else:
            query = {"student_id": entity_id, "cache_type": cache_type}
        
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


async def compute_teacher_analytics(teacher_id: str, use_cache: bool = True) -> Dict[str, Any]:
    """
    Compute teacher-level analytics aggregating all assignments and courses.
    
    Returns:
        Dictionary containing overview stats, course breakdowns, assignments, and trends
    """
    try:
        # Check cache
        if use_cache:
            cached = await get_cached_analytics(teacher_id, "teacher")
            if cached and not cached.get("is_stale", False):
                logger.info(f"Using cached analytics for teacher {teacher_id}")
                return cached
        
        # Get all assignments for this teacher
        assignments_collection = await get_assignments_collection()
        assignments_cursor = assignments_collection.find({"teacher_id": teacher_id})
        assignments = []
        async for doc in assignments_cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            assignments.append(doc)
        
        if not assignments:
            return {
                "teacher_id": teacher_id,
                "overview": {
                    "total_assignments": 0,
                    "total_submissions": 0,
                    "average_score": 0,
                    "active_courses": 0,
                    "total_students": 0
                },
                "courses": [],
                "assignments": [],
                "trends": [],
                "rubric_effectiveness": []
            }
        
        # Get all results for these assignments
        results_collection = await get_results_collection()
        assignment_ids = [a["id"] for a in assignments]
        results_cursor = results_collection.find({"assignment_id": {"$in": assignment_ids}})
        results = []
        async for doc in results_cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        
        # Compute overview stats
        total_submissions = len(results)
        scores = [r.get("score", 0) for r in results] if results else []
        percentages = [r.get("percentage", 0) for r in results] if results else []
        average_score = mean(scores) if scores else 0
        
        # Get unique students
        unique_students = set()
        for r in results:
            student_id = r.get("student_id")
            if student_id:
                unique_students.add(student_id)
            else:
                # Fallback to student_name if student_id not available
                unique_students.add(r.get("student_name", ""))
        
        # Group by Canvas course
        courses_map = {}
        for assignment in assignments:
            course_id = assignment.get("canvas_course_id") or assignment.get("course_id") or "uncategorized"
            course_name = assignment.get("course_name") or f"Course {course_id}"
            
            if course_id not in courses_map:
                courses_map[course_id] = {
                    "course_id": course_id,
                    "course_name": course_name,
                    "assignment_ids": [],
                    "results": []
                }
            courses_map[course_id]["assignment_ids"].append(assignment["id"])
        
        # Assign results to courses
        for result in results:
            assignment_id = result.get("assignment_id")
            for course_id, course_data in courses_map.items():
                if assignment_id in course_data["assignment_ids"]:
                    course_data["results"].append(result)
                    break
        
        # Compute course-level stats
        courses = []
        for course_id, course_data in courses_map.items():
            course_results = course_data["results"]
            course_scores = [r.get("score", 0) for r in course_results] if course_results else []
            course_percentages = [r.get("percentage", 0) for r in course_results] if course_results else []
            
            courses.append({
                "course_id": course_id,
                "course_name": course_data["course_name"],
                "assignment_count": len(course_data["assignment_ids"]),
                "average_score": mean(course_scores) if course_scores else 0,
                "average_percentage": mean(course_percentages) if course_percentages else 0,
                "total_submissions": len(course_results),
                "pass_rate": (len([p for p in course_percentages if p >= 60]) / len(course_percentages) * 100) if course_percentages else 0
            })
        
        # Compute assignment-level stats
        assignment_stats = []
        for assignment in assignments:
            assignment_id = assignment["id"]
            assignment_results = [r for r in results if r.get("assignment_id") == assignment_id]
            assignment_scores = [r.get("score", 0) for r in assignment_results] if assignment_results else []
            assignment_percentages = [r.get("percentage", 0) for r in assignment_results] if assignment_results else []
            
            # Get most recent grading date
            graded_dates = [r.get("graded_at") for r in assignment_results if r.get("graded_at")]
            latest_graded = max(graded_dates) if graded_dates else None
            
            assignment_stats.append({
                "assignment_id": assignment_id,
                "name": assignment.get("name", "Unnamed Assignment"),
                "course_name": assignment.get("course_name") or courses_map.get(assignment.get("canvas_course_id") or assignment.get("course_id") or "uncategorized", {}).get("course_name", "Uncategorized"),
                "submissions_count": len(assignment_results),
                "average_score": mean(assignment_scores) if assignment_scores else 0,
                "average_percentage": mean(assignment_percentages) if assignment_percentages else 0,
                "pass_rate": (len([p for p in assignment_percentages if p >= 60]) / len(assignment_percentages) * 100) if assignment_percentages else 0,
                "graded_at": latest_graded.isoformat() if latest_graded and hasattr(latest_graded, 'isoformat') else (latest_graded if latest_graded else None),
                "status": assignment.get("status", "draft")
            })
        
        # Compute time-based trends (last 90 days)
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        recent_results = [r for r in results if r.get("graded_at") and 
                         (isinstance(r.get("graded_at"), datetime) and r.get("graded_at") >= cutoff_date or
                          isinstance(r.get("graded_at"), str))]
        
        # Group by date
        trends_by_date = {}
        for result in recent_results:
            graded_at = result.get("graded_at")
            if isinstance(graded_at, datetime):
                date_key = graded_at.date().isoformat()
            elif isinstance(graded_at, str):
                try:
                    date_key = datetime.fromisoformat(graded_at.replace('Z', '+00:00')).date().isoformat()
                except:
                    continue
            else:
                continue
            
            if date_key not in trends_by_date:
                trends_by_date[date_key] = {"submissions": 0, "scores": []}
            
            trends_by_date[date_key]["submissions"] += 1
            trends_by_date[date_key]["scores"].append(result.get("percentage", 0))
        
        trends = [
            {
                "date": date,
                "submissions_graded": data["submissions"],
                "average_score": mean(data["scores"]) if data["scores"] else 0
            }
            for date, data in sorted(trends_by_date.items())
        ]
        
        # Compute rubric effectiveness
        rubric_usage = Counter()
        rubric_scores = {}
        for assignment in assignments:
            rubric_id = assignment.get("rubric_id")
            if rubric_id:
                rubric_usage[rubric_id] += 1
                if rubric_id not in rubric_scores:
                    rubric_scores[rubric_id] = []
                
                # Get average score for this assignment
                assignment_results = [r for r in results if r.get("assignment_id") == assignment["id"]]
                if assignment_results:
                    avg_score = mean([r.get("percentage", 0) for r in assignment_results])
                    rubric_scores[rubric_id].append(avg_score)
        
        rubric_effectiveness = [
            {
                "rubric_id": rubric_id,
                "usage_count": count,
                "average_performance": mean(rubric_scores.get(rubric_id, [])) if rubric_scores.get(rubric_id) else 0
            }
            for rubric_id, count in rubric_usage.most_common()
        ]
        
        analytics = {
            "teacher_id": teacher_id,
            "cache_type": "teacher",
            "overview": {
                "total_assignments": len(assignments),
                "total_submissions": total_submissions,
                "average_score": average_score,
                "average_percentage": mean(percentages) if percentages else 0,
                "active_courses": len(courses),
                "total_students": len(unique_students)
            },
            "courses": courses,
            "assignments": assignment_stats,
            "trends": trends,
            "rubric_effectiveness": rubric_effectiveness,
            "computed_at": datetime.utcnow().isoformat(),
            "data_snapshot_count": len(results)
        }
        
        # Cache the results
        await cache_analytics(teacher_id, "teacher", analytics)
        
        return analytics
    except Exception as e:
        logger.error(f"Error computing teacher analytics: {e}", exc_info=True)
        raise


async def compute_grader_analytics(grader_id: str, use_cache: bool = True) -> Dict[str, Any]:
    """
    Compute grader-level analytics for overview dashboard.
    
    Returns:
        Dictionary containing efficiency metrics, quality metrics, and assignment list
    """
    try:
        # Check cache
        if use_cache:
            cached = await get_cached_analytics(grader_id, "grader")
            if cached and not cached.get("is_stale", False):
                logger.info(f"Using cached analytics for grader {grader_id}")
                return cached
        
        # Get all results graded by this grader
        results_collection = await get_results_collection()
        results_cursor = results_collection.find({"grader_id": grader_id})
        results = []
        async for doc in results_cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        
        if not results:
            return {
                "grader_id": grader_id,
                "cache_type": "grader",
                "overview": {
                    "total_assignments_graded": 0,
                    "total_submissions_graded": 0,
                    "average_grading_time": 0.0,
                    "efficiency_score": 0.0,
                    "quality_score": 0.0
                },
                "assignments": [],
                "efficiency_trends": [],
                "computed_at": datetime.utcnow().isoformat(),
                "data_snapshot_count": 0
            }
        
        # Get unique assignments
        unique_assignments = set(r.get("assignment_id") for r in results if r.get("assignment_id"))
        
        # Compute efficiency metrics
        grading_times = [r.get("grading_time_seconds", 0) for r in results if r.get("grading_time_seconds")]
        average_grading_time = mean(grading_times) if grading_times else 0
        
        # Calculate efficiency score (submissions per hour)
        total_time_hours = sum(grading_times) / 3600 if grading_times else 1
        submissions_per_hour = len(results) / total_time_hours if total_time_hours > 0 else len(results)
        
        # Compute quality metrics (rubric consistency)
        # Check variance in rubric application
        rubric_consistency_scores = []
        for assignment_id in unique_assignments:
            assignment_results = [r for r in results if r.get("assignment_id") == assignment_id]
            if len(assignment_results) > 1:
                percentages = [r.get("percentage", 0) for r in assignment_results]
                if percentages:
                    # Lower standard deviation = more consistent
                    consistency = 100 - min(stdev(percentages) if len(percentages) > 1 else 0, 50)
                    rubric_consistency_scores.append(consistency)
        
        quality_score = mean(rubric_consistency_scores) if rubric_consistency_scores else 100
        
        # Compute assignment-level stats
        assignment_map = {}
        for result in results:
            assignment_id = result.get("assignment_id")
            if assignment_id not in assignment_map:
                assignment_map[assignment_id] = {
                    "assignment_id": assignment_id,
                    "assignment_name": "Unknown Assignment",
                    "submissions_graded": 0,
                    "scores": [],
                    "grading_times": [],
                    "graded_dates": []
                }
            
            assignment_map[assignment_id]["submissions_graded"] += 1
            assignment_map[assignment_id]["scores"].append(result.get("percentage", 0))
            if result.get("grading_time_seconds"):
                assignment_map[assignment_id]["grading_times"].append(result.get("grading_time_seconds"))
            if result.get("graded_at"):
                assignment_map[assignment_id]["graded_dates"].append(result.get("graded_at"))
        
        # Get assignment names
        assignments_collection = await get_assignments_collection()
        for assignment_id in assignment_map.keys():
            assignment_doc = await assignments_collection.find_one({"_id": ObjectId(assignment_id) if ObjectId.is_valid(assignment_id) else assignment_id})
            if assignment_doc:
                assignment_map[assignment_id]["assignment_name"] = assignment_doc.get("name", "Unknown Assignment")
        
        assignments = []
        for assignment_id, data in assignment_map.items():
            latest_graded = max(data["graded_dates"]) if data["graded_dates"] else None
            assignments.append({
                "assignment_id": assignment_id,
                "assignment_name": data["assignment_name"],
                "submissions_graded": data["submissions_graded"],
                "average_score": mean(data["scores"]) if data["scores"] else 0,
                "grading_time_total": sum(data["grading_times"]) if data["grading_times"] else 0,
                "average_grading_time": mean(data["grading_times"]) if data["grading_times"] else 0,
                "graded_at": latest_graded.isoformat() if latest_graded and hasattr(latest_graded, 'isoformat') else (latest_graded if latest_graded else None)
            })
        
        # Compute efficiency trends (last 30 days)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        recent_results = [r for r in results if r.get("graded_at") and 
                         (isinstance(r.get("graded_at"), datetime) and r.get("graded_at") >= cutoff_date or
                          isinstance(r.get("graded_at"), str))]
        
        # Group by date
        efficiency_by_date = {}
        for result in recent_results:
            graded_at = result.get("graded_at")
            if isinstance(graded_at, datetime):
                date_key = graded_at.date().isoformat()
            elif isinstance(graded_at, str):
                try:
                    date_key = datetime.fromisoformat(graded_at.replace('Z', '+00:00')).date().isoformat()
                except:
                    continue
            else:
                continue
            
            if date_key not in efficiency_by_date:
                efficiency_by_date[date_key] = {"submissions": 0, "time_seconds": 0}
            
            efficiency_by_date[date_key]["submissions"] += 1
            if result.get("grading_time_seconds"):
                efficiency_by_date[date_key]["time_seconds"] += result.get("grading_time_seconds")
        
        efficiency_trends = [
            {
                "date": date,
                "submissions_per_hour": (data["submissions"] / (data["time_seconds"] / 3600)) if data["time_seconds"] > 0 else data["submissions"]
            }
            for date, data in sorted(efficiency_by_date.items())
        ]
        
        analytics = {
            "grader_id": grader_id,
            "cache_type": "grader",
            "overview": {
                "total_assignments_graded": len(unique_assignments),
                "total_submissions_graded": len(results),
                "average_grading_time": average_grading_time,
                "efficiency_score": submissions_per_hour,
                "quality_score": quality_score
            },
            "assignments": assignments,
            "efficiency_trends": efficiency_trends,
            "computed_at": datetime.utcnow().isoformat(),
            "data_snapshot_count": len(results)
        }
        
        # Cache the results
        await cache_analytics(grader_id, "grader", analytics)
        
        return analytics
    except Exception as e:
        logger.error(f"Error computing grader analytics: {e}", exc_info=True)
        raise


async def compute_grader_assignment_analytics(grader_id: str, assignment_id: str) -> Dict[str, Any]:
    """
    Compute per-assignment analytics for a specific grader.
    
    Returns:
        Dictionary containing assignment-specific stats, student breakdown, and rubric analysis
    """
    try:
        # Get all results for this assignment graded by this grader
        results_collection = await get_results_collection()
        results_cursor = results_collection.find({
            "grader_id": grader_id,
            "assignment_id": assignment_id
        })
        results = []
        async for doc in results_cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        
        if not results:
            return {
                "grader_id": grader_id,
                "assignment_id": assignment_id,
                "assignment_name": "Unknown Assignment",
                "overview": {
                    "submissions_graded": 0,
                    "average_score": 0,
                    "total_grading_time": 0
                },
                "student_performance": [],
                "rubric_breakdown": [],
                "common_mistakes": [],
                "grading_timeline": []
            }
        
        # Get assignment details
        assignments_collection = await get_assignments_collection()
        assignment_doc = await assignments_collection.find_one({"_id": ObjectId(assignment_id) if ObjectId.is_valid(assignment_id) else assignment_id})
        assignment_name = assignment_doc.get("name", "Unknown Assignment") if assignment_doc else "Unknown Assignment"
        
        # Compute overview stats
        scores = [r.get("score", 0) for r in results]
        percentages = [r.get("percentage", 0) for r in results]
        grading_times = [r.get("grading_time_seconds", 0) for r in results if r.get("grading_time_seconds")]
        
        # Student performance breakdown
        student_performance = []
        for result in results:
            student_performance.append({
                "student_id": result.get("student_id"),
                "student_name": result.get("student_name", "Unknown"),
                "score": result.get("score", 0),
                "percentage": result.get("percentage", 0),
                "grade_letter": result.get("grade_letter"),
                "graded_at": result.get("graded_at").isoformat() if result.get("graded_at") and hasattr(result.get("graded_at"), 'isoformat') else result.get("graded_at"),
                "feedback_provided": bool(result.get("overall_feedback") or result.get("detailed_feedback"))
            })
        
        # Rubric breakdown
        rubric_breakdown = _compute_rubric_performance(results)
        
        # Common mistakes
        common_mistakes = _extract_common_mistakes(results)
        
        # Grading timeline
        grading_timeline = []
        for result in sorted(results, key=lambda x: x.get("graded_at") or datetime.min):
            grading_timeline.append({
                "student_name": result.get("student_name", "Unknown"),
                "graded_at": result.get("graded_at").isoformat() if result.get("graded_at") and hasattr(result.get("graded_at"), 'isoformat') else result.get("graded_at"),
                "grading_time_seconds": result.get("grading_time_seconds", 0),
                "score": result.get("percentage", 0)
            })
        
        analytics = {
            "grader_id": grader_id,
            "assignment_id": assignment_id,
            "assignment_name": assignment_name,
            "overview": {
                "submissions_graded": len(results),
                "average_score": mean(scores) if scores else 0,
                "average_percentage": mean(percentages) if percentages else 0,
                "total_grading_time": sum(grading_times) if grading_times else 0,
                "average_grading_time": mean(grading_times) if grading_times else 0
            },
            "student_performance": student_performance,
            "rubric_breakdown": rubric_breakdown,
            "common_mistakes": common_mistakes,
            "grading_timeline": grading_timeline,
            "computed_at": datetime.utcnow().isoformat()
        }
        
        return analytics
    except Exception as e:
        logger.error(f"Error computing grader assignment analytics: {e}", exc_info=True)
        raise


async def compute_canvas_course_analytics(course_id: str) -> Dict[str, Any]:
    """
    Compute Canvas course-level analytics for comparison.
    
    Returns:
        Dictionary containing all assignments in course, cross-assignment comparison, and student progress
    """
    try:
        # Get all assignments for this Canvas course
        assignments_collection = await get_assignments_collection()
        assignments_cursor = assignments_collection.find({
            "$or": [
                {"canvas_course_id": course_id},
                {"course_id": course_id}
            ]
        })
        assignments = []
        async for doc in assignments_cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            assignments.append(doc)
        
        if not assignments:
            return {
                "course_id": course_id,
                "course_name": "Unknown Course",
                "assignments": [],
                "comparison": {},
                "student_progress": []
            }
        
        # Get course name from first assignment
        course_name = assignments[0].get("course_name") or f"Course {course_id}"
        
        # Get all results for these assignments
        results_collection = await get_results_collection()
        assignment_ids = [a["id"] for a in assignments]
        results_cursor = results_collection.find({"assignment_id": {"$in": assignment_ids}})
        results = []
        async for doc in results_cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            results.append(doc)
        
        # Compute assignment-level comparison
        assignment_comparison = []
        for assignment in assignments:
            assignment_id = assignment["id"]
            assignment_results = [r for r in results if r.get("assignment_id") == assignment_id]
            assignment_scores = [r.get("score", 0) for r in assignment_results] if assignment_results else []
            assignment_percentages = [r.get("percentage", 0) for r in assignment_results] if assignment_results else []
            
            assignment_comparison.append({
                "assignment_id": assignment_id,
                "assignment_name": assignment.get("name", "Unnamed"),
                "submissions_count": len(assignment_results),
                "average_score": mean(assignment_scores) if assignment_scores else 0,
                "average_percentage": mean(assignment_percentages) if assignment_percentages else 0,
                "median_percentage": median(assignment_percentages) if len(assignment_percentages) > 1 else (assignment_percentages[0] if assignment_percentages else 0),
                "pass_rate": (len([p for p in assignment_percentages if p >= 60]) / len(assignment_percentages) * 100) if assignment_percentages else 0,
                "standard_deviation": stdev(assignment_percentages) if len(assignment_percentages) > 1 else 0
            })
        
        # Compute student progress across assignments
        student_progress_map = {}
        for result in results:
            student_id = result.get("student_id") or result.get("student_name", "unknown")
            assignment_id = result.get("assignment_id")
            
            if student_id not in student_progress_map:
                student_progress_map[student_id] = {
                    "student_id": result.get("student_id"),
                    "student_name": result.get("student_name", "Unknown"),
                    "assignments": []
                }
            
            student_progress_map[student_id]["assignments"].append({
                "assignment_id": assignment_id,
                "assignment_name": next((a.get("name") for a in assignments if a["id"] == assignment_id), "Unknown"),
                "score": result.get("score", 0),
                "percentage": result.get("percentage", 0),
                "graded_at": result.get("graded_at").isoformat() if result.get("graded_at") and hasattr(result.get("graded_at"), 'isoformat') else result.get("graded_at")
            })
        
        # Calculate progress metrics for each student
        student_progress = []
        for student_id, data in student_progress_map.items():
            assignments_list = sorted(data["assignments"], key=lambda x: x.get("graded_at") or "")
            percentages = [a["percentage"] for a in assignments_list]
            
            student_progress.append({
                "student_id": data["student_id"],
                "student_name": data["student_name"],
                "total_assignments": len(assignments_list),
                "average_percentage": mean(percentages) if percentages else 0,
                "improvement": (percentages[-1] - percentages[0]) if len(percentages) > 1 else 0,
                "assignments": assignments_list
            })
        
        # Course-level trends
        course_trends = []
        for assignment in sorted(assignments, key=lambda x: x.get("created_at") or datetime.min):
            assignment_results = [r for r in results if r.get("assignment_id") == assignment["id"]]
            if assignment_results:
                avg_percentage = mean([r.get("percentage", 0) for r in assignment_results])
                course_trends.append({
                    "assignment_id": assignment["id"],
                    "assignment_name": assignment.get("name", "Unnamed"),
                    "average_percentage": avg_percentage,
                    "submissions_count": len(assignment_results),
                    "created_at": assignment.get("created_at").isoformat() if assignment.get("created_at") and hasattr(assignment.get("created_at"), 'isoformat') else assignment.get("created_at")
                })
        
        analytics = {
            "course_id": course_id,
            "course_name": course_name,
            "assignments": assignment_comparison,
            "comparison": {
                "total_assignments": len(assignments),
                "total_submissions": len(results),
                "overall_average": mean([a["average_percentage"] for a in assignment_comparison]) if assignment_comparison else 0,
                "best_performing_assignment": max(assignment_comparison, key=lambda x: x["average_percentage"]) if assignment_comparison else None,
                "most_challenging_assignment": min(assignment_comparison, key=lambda x: x["average_percentage"]) if assignment_comparison else None
            },
            "student_progress": student_progress,
            "course_trends": course_trends,
            "computed_at": datetime.utcnow().isoformat()
        }
        
        return analytics
    except Exception as e:
        logger.error(f"Error computing Canvas course analytics: {e}", exc_info=True)
        raise
