"""
Knowledge Graph API routes for ScorePAL.
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from utils.knowledge_graph import KnowledgeGraph

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/knowledge-graph", tags=["knowledge-graph"])

# Models for request and response
class AssignmentKnowledgeGraphRequest(BaseModel):
    assignment_id: str
    assignment_name: str
    question_text: str
    rubric: Dict[str, Any]
    course: Optional[str] = None
    subject: Optional[str] = None

class SubmissionKnowledgeGraphRequest(BaseModel):
    submission_id: str
    assignment_id: str
    student_name: str
    submission_text: str
    grade_data: Dict[str, Any]

class ConceptRelationshipsRequest(BaseModel):
    concept_name: str

class StudentKnowledgeProfileRequest(BaseModel):
    student_name: str

class ClassPerformanceRequest(BaseModel):
    course: Optional[str] = None

# Dependency for Knowledge Graph
def get_knowledge_graph():
    """Dependency to get a Knowledge Graph instance."""
    kg = KnowledgeGraph()
    try:
        yield kg
    finally:
        kg.close()

@router.post("/assignments", status_code=201)
async def create_assignment_graph(
    request: AssignmentKnowledgeGraphRequest,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Create a knowledge graph for an assignment."""
    if not kg.is_connected():
        raise HTTPException(status_code=503, detail="Neo4j database connection not available")
    
    success = kg.create_assignment_knowledge_graph(
        assignment_id=request.assignment_id,
        assignment_name=request.assignment_name,
        question_text=request.question_text,
        rubric=request.rubric,
        course=request.course,
        subject=request.subject
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create assignment knowledge graph")
    
    return {"message": f"Knowledge graph created for assignment: {request.assignment_name}"}

@router.post("/submissions", status_code=201)
async def add_submission_to_graph(
    request: SubmissionKnowledgeGraphRequest,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Add a submission to the knowledge graph."""
    if not kg.is_connected():
        raise HTTPException(status_code=503, detail="Neo4j database connection not available")
    
    success = kg.add_submission_to_knowledge_graph(
        submission_id=request.submission_id,
        assignment_id=request.assignment_id,
        student_name=request.student_name,
        submission_text=request.submission_text,
        grade_data=request.grade_data
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add submission to knowledge graph")
    
    return {"message": f"Submission added to knowledge graph for student: {request.student_name}"}

@router.get("/assignments/{assignment_id}")
async def get_assignment_graph(
    assignment_id: str,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Get the knowledge graph for a specific assignment."""
    if not kg.is_connected():
        raise HTTPException(status_code=503, detail="Neo4j database connection not available")
    
    graph_data = kg.get_assignment_knowledge_graph(assignment_id)
    
    if not graph_data["nodes"]:
        raise HTTPException(status_code=404, detail=f"No knowledge graph found for assignment: {assignment_id}")
    
    return graph_data

@router.get("/concepts/{concept_name}")
async def get_concept_relationships(
    concept_name: str,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Get relationships for a specific concept."""
    if not kg.is_connected():
        raise HTTPException(status_code=503, detail="Neo4j database connection not available")
    
    concept_data = kg.get_concept_relationships(concept_name)
    
    if not concept_data:
        raise HTTPException(status_code=404, detail=f"No data found for concept: {concept_name}")
    
    return concept_data

@router.get("/students/{student_name}")
async def get_student_profile(
    student_name: str,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Get a student's knowledge profile."""
    if not kg.is_connected():
        raise HTTPException(status_code=503, detail="Neo4j database connection not available")
    
    profile = kg.get_student_knowledge_profile(student_name)
    
    if not profile:
        raise HTTPException(status_code=404, detail=f"No profile found for student: {student_name}")
    
    return profile

@router.get("/performance")
async def get_class_performance(
    course: str = None,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Get class performance by concept."""
    if not kg.is_connected():
        raise HTTPException(status_code=503, detail="Neo4j database connection not available")
    
    performance = kg.get_class_performance_by_concept(course)
    
    if not performance:
        raise HTTPException(status_code=404, detail="No performance data found")
    
    return performance

@router.get("/analytics")
async def get_analytics_data(
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Get comprehensive analytics data from the Knowledge Graph."""
    if not kg.is_connected():
        raise HTTPException(status_code=503, detail="Neo4j database connection not available")
    
    try:
        # Get all assignments from the Knowledge Graph
        with kg._driver.session(database=kg.database) as session:
            # Get assignment count
            result = session.run(
                """
                MATCH (a:Assignment)
                RETURN count(a) as assignment_count
                """
            )
            assignment_count = result.single()["assignment_count"]
            
            # Get submission count
            result = session.run(
                """
                MATCH (s:Submission)
                RETURN count(s) as submission_count
                """
            )
            submission_count = result.single()["submission_count"]
            
            # Get average score
            result = session.run(
                """
                MATCH (s:Submission)
                RETURN avg(s.score) as avg_score
                """
            )
            record = result.single()
            avg_score = record["avg_score"] if record and record["avg_score"] is not None else 0
            
            # Get pass rate (submissions with score >= 60%)
            result = session.run(
                """
                MATCH (s:Submission)
                WITH count(s) as total,
                     sum(CASE WHEN s.score >= 60 THEN 1 ELSE 0 END) as passing
                RETURN 
                    total,
                    passing,
                    CASE WHEN total > 0 THEN toFloat(passing) / total ELSE 0 END as pass_rate
                """
            )
            record = result.single()
            pass_rate = record["pass_rate"] if record else 0
            
            # Get recent assignments (last 6 months)
            result = session.run(
                """
                MATCH (a:Assignment)
                WHERE a.created_at >= datetime() - duration('P6M')
                RETURN a.id as id, a.name as name, a.created_at as created_at
                ORDER BY a.created_at DESC
                LIMIT 10
                """
            )
            recent_assignments = [
                {
                    "id": record["id"],
                    "name": record["name"],
                    "created_at": record["created_at"]
                }
                for record in result
            ]
            
            # Get top concepts
            result = session.run(
                """
                MATCH (c:Concept)<-[:MENTIONS]-(s:Submission)
                WITH c.name as concept, count(s) as mention_count, avg(s.score) as avg_score
                RETURN concept, mention_count, avg_score
                ORDER BY mention_count DESC, avg_score DESC
                LIMIT 10
                """
            )
            top_concepts = [
                {
                    "name": record["concept"],
                    "mention_count": record["mention_count"],
                    "average_score": record["avg_score"]
                }
                for record in result
            ]
            
            # Get recent submissions
            result = session.run(
                """
                MATCH (s:Student)-[:SUBMITTED]->(sub:Submission)-[:BELONGS_TO]->(a:Assignment)
                RETURN 
                    s.name as student_name,
                    a.id as assignment_id,
                    a.name as assignment_name,
                    sub.id as submission_id,
                    sub.score as score,
                    sub.total as total,
                    sub.submitted_at as submitted_at
                ORDER BY sub.submitted_at DESC
                LIMIT 10
                """
            )
            recent_submissions = [
                {
                    "student_name": record["student_name"],
                    "assignment_id": record["assignment_id"],
                    "assignment_name": record["assignment_name"],
                    "submission_id": record["submission_id"],
                    "score": record["score"],
                    "total": record["total"],
                    "submitted_at": record["submitted_at"]
                }
                for record in result
            ]
            
            # Get score distribution
            result = session.run(
                """
                MATCH (s:Submission)
                WITH 
                    CASE 
                        WHEN s.score < 10 THEN '0-10%'
                        WHEN s.score < 20 THEN '11-20%'
                        WHEN s.score < 30 THEN '21-30%'
                        WHEN s.score < 40 THEN '31-40%'
                        WHEN s.score < 50 THEN '41-50%'
                        WHEN s.score < 60 THEN '51-60%'
                        WHEN s.score < 70 THEN '61-70%'
                        WHEN s.score < 80 THEN '71-80%'
                        WHEN s.score < 90 THEN '81-90%'
                        ELSE '91-100%'
                    END as range,
                    count(s) as count
                RETURN range, count
                ORDER BY range
                """
            )
            score_distribution = [
                {
                    "range": record["range"],
                    "count": record["count"]
                }
                for record in result
            ]
            
        return {
            "summary": {
                "total_assignments": assignment_count,
                "total_submissions": submission_count,
                "average_score": avg_score,
                "pass_rate": pass_rate
            },
            "recent_assignments": recent_assignments,
            "top_concepts": top_concepts,
            "recent_submissions": recent_submissions,
            "score_distribution": score_distribution
        }
    except Exception as e:
        logger.error(f"Error getting analytics data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting analytics data: {str(e)}") 