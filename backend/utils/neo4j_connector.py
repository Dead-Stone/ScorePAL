import os
import logging
import json
from typing import Dict, Any, List, Optional
from neo4j import GraphDatabase
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Neo4jConnector:
    """
    Neo4j database connector for the grading system.
    Handles connections and CRUD operations for storing grading data.
    """
    
    def __init__(self):
        """Initialize the Neo4j connector with credentials from environment variables."""
        self.uri = os.getenv("NEO4J_URI")
        self.username = os.getenv("NEO4J_USERNAME")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.database = os.getenv("NEO4J_DATABASE", "neo4j")
        
        if not all([self.uri, self.username, self.password]):
            logger.warning("Neo4j credentials not found in environment variables. Database operations will be unavailable.")
            self._driver = None
        else:
            try:
                self._driver = GraphDatabase.driver(
                    self.uri, 
                    auth=(self.username, self.password)
                )
                # Test connection
                with self._driver.session(database=self.database) as session:
                    result = session.run("RETURN 1 AS test")
                    test_value = result.single()["test"]
                    if test_value == 1:
                        logger.info("Successfully connected to Neo4j database")
                    else:
                        logger.error("Neo4j connection test failed")
                        self._driver = None
            except Exception as e:
                logger.error(f"Failed to connect to Neo4j: {str(e)}")
                self._driver = None
    
    def close(self):
        """Close the Neo4j connection."""
        if self._driver:
            self._driver.close()
            logger.info("Neo4j connection closed")
    
    def is_connected(self) -> bool:
        """Check if connected to Neo4j database."""
        return self._driver is not None
    
    def store_assignment_data(self, 
                             assignment_name: str, 
                             question_text: str,
                             rubric: Any) -> Optional[str]:
        """
        Store assignment data in Neo4j.
        
        Args:
            assignment_name: Name of the assignment
            question_text: Text of the question
            rubric: Rubric for grading (can be a dict or JSON string)
            
        Returns:
            Assignment ID if successful, None otherwise
        """
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return None
        
        try:
            # If rubric is a dict, convert to JSON string
            if isinstance(rubric, dict):
                rubric = json.dumps(rubric)
                
            with self._driver.session(database=self.database) as session:
                result = session.run(
                    """
                    CREATE (a:Assignment {
                        name: $name,
                        question_text: $question_text,
                        rubric: $rubric,
                        created_at: datetime()
                    })
                    RETURN id(a) AS assignment_id
                    """,
                    name=assignment_name,
                    question_text=question_text,
                    rubric=rubric
                )
                
                record = result.single()
                if record:
                    assignment_id = record["assignment_id"]
                    logger.info(f"Assignment stored with ID: {assignment_id}")
                    return str(assignment_id)
                return None
        except Exception as e:
            logger.error(f"Error storing assignment data: {str(e)}")
            return None
    
    def store_submission(self, 
                        assignment_id: str,
                        student_name: str,
                        submission_text: str,
                        grade_data: Dict[str, Any]) -> Optional[str]:
        """
        Store a student submission and its grading data.
        
        Args:
            assignment_id: ID of the assignment
            student_name: Name of the student
            submission_text: Text of the submission
            grade_data: Grading data including score, feedback, etc.
            
        Returns:
            Submission ID if successful, None otherwise
        """
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return None
        
        try:
            with self._driver.session(database=self.database) as session:
                result = session.run(
                    """
                    MATCH (a:Assignment) WHERE id(a) = $assignment_id
                    CREATE (s:Submission {
                        student_name: $student_name,
                        submission_text: $submission_text,
                        score: $score,
                        total: $total,
                        grading_feedback: $feedback,
                        submitted_at: datetime()
                    })
                    CREATE (s)-[:BELONGS_TO]->(a)
                    RETURN id(s) AS submission_id
                    """,
                    assignment_id=int(assignment_id),
                    student_name=student_name,
                    submission_text=submission_text,
                    score=grade_data.get('score', 0),
                    total=grade_data.get('total', 100),
                    feedback=grade_data.get('grading_feedback', '')
                )
                
                record = result.single()
                if record:
                    submission_id = record["submission_id"]
                    logger.info(f"Submission stored with ID: {submission_id}")
                    return str(submission_id)
                return None
        except Exception as e:
            logger.error(f"Error storing submission data: {str(e)}")
            return None
    
    def get_assignments(self) -> List[Dict[str, Any]]:
        """Retrieve all assignments from the database."""
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return []
        
        try:
            with self._driver.session(database=self.database) as session:
                result = session.run(
                    """
                    MATCH (a:Assignment)
                    RETURN id(a) AS id, a.name AS name, a.created_at AS created_at
                    ORDER BY a.created_at DESC
                    """
                )
                
                assignments = [
                    {
                        "id": record["id"],
                        "name": record["name"],
                        "created_at": record["created_at"]
                    }
                    for record in result
                ]
                
                return assignments
        except Exception as e:
            logger.error(f"Error retrieving assignments: {str(e)}")
            return []
    
    def get_submissions_for_assignment(self, assignment_id: str) -> List[Dict[str, Any]]:
        """Retrieve all submissions for a specific assignment."""
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return []
        try:
            with self._driver.session(database=self.database) as session:
                # Try to use integer id if possible, else use uuid property
                try:
                    assignment_id_int = int(assignment_id)
                    query = """
                        MATCH (s:Submission)-[:BELONGS_TO]->(a:Assignment)
                        WHERE id(a) = $assignment_id
                        RETURN id(s) AS id, s.student_name AS student_name, 
                               s.score AS score, s.total AS total,
                               s.submitted_at AS submitted_at
                        ORDER BY s.student_name
                    """
                    params = {"assignment_id": assignment_id_int}
                except ValueError:
                    query = """
                        MATCH (s:Submission)-[:BELONGS_TO]->(a:Assignment)
                        WHERE a.uuid = $assignment_id
                        RETURN id(s) AS id, s.student_name AS student_name, 
                               s.score AS score, s.total AS total,
                               s.submitted_at AS submitted_at
                        ORDER BY s.student_name
                    """
                    params = {"assignment_id": assignment_id}
                result = session.run(query, **params)
                submissions = [
                    {
                        "id": record["id"],
                        "student_name": record["student_name"],
                        "score": record["score"],
                        "total": record["total"],
                        "submitted_at": record["submitted_at"]
                    }
                    for record in result
                ]
                return submissions
        except Exception as e:
            logger.error(f"Error retrieving submissions for assignment {assignment_id}: {str(e)}")
            return []
    
    def get_assignment(self, assignment_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific assignment by ID."""
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return None
        try:
            with self._driver.session(database=self.database) as session:
                try:
                    assignment_id_int = int(assignment_id)
                    query = """
                        MATCH (a:Assignment)
                        WHERE id(a) = $assignment_id
                        RETURN id(a) AS id, a.name AS name, a.question_text AS question_text,
                               a.rubric AS rubric, a.created_at AS created_at
                    """
                    params = {"assignment_id": assignment_id_int}
                except ValueError:
                    query = """
                        MATCH (a:Assignment)
                        WHERE a.uuid = $assignment_id
                        RETURN id(a) AS id, a.name AS name, a.question_text AS question_text,
                               a.rubric AS rubric, a.created_at AS created_at
                    """
                    params = {"assignment_id": assignment_id}
                result = session.run(query, **params)
                record = result.single()
                if record:
                    assignment = {
                        "id": record["id"],
                        "name": record["name"],
                        "question_text": record["question_text"],
                        "created_at": record["created_at"]
                    }
                    # Parse rubric JSON if it exists
                    if record["rubric"]:
                        try:
                            assignment["rubric"] = json.loads(record["rubric"])
                        except json.JSONDecodeError:
                            assignment["rubric"] = record["rubric"]
                    return assignment
                return None
        except Exception as e:
            logger.error(f"Error retrieving assignment {assignment_id}: {str(e)}")
            return None
            
    def get_submission(self, submission_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific submission by ID."""
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return None
        
        try:
            with self._driver.session(database=self.database) as session:
                result = session.run(
                    """
                    MATCH (s:Submission)
                    WHERE id(s) = $submission_id
                    MATCH (s)-[:BELONGS_TO]->(a:Assignment)
                    RETURN id(s) AS id, s.student_name AS student_name, 
                           s.score AS score, s.total AS total,
                           s.grading_feedback AS feedback, s.submitted_at AS submitted_at,
                           id(a) AS assignment_id, a.name AS assignment_name
                    """,
                    submission_id=int(submission_id)
                )
                
                record = result.single()
                if record:
                    return {
                        "id": record["id"],
                        "student_name": record["student_name"],
                        "score": record["score"],
                        "total": record["total"],
                        "feedback": record["feedback"],
                        "submitted_at": record["submitted_at"],
                        "assignment_id": record["assignment_id"],
                        "assignment_name": record["assignment_name"]
                    }
                return None
        except Exception as e:
            logger.error(f"Error retrieving submission {submission_id}: {str(e)}")
            return None
            
    def get_grading_results(self, assignment_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve all grading results for an assignment.
        
        Args:
            assignment_id: ID of the assignment
            
        Returns:
            Dictionary with grading results if found, None otherwise
        """
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return None
            
        try:
            # Get the assignment details
            assignment = self.get_assignment(assignment_id)
            if not assignment:
                logger.error(f"Assignment {assignment_id} not found in Neo4j")
                return None
                
            # Get all submissions for this assignment
            submissions = self.get_submissions_for_assignment(assignment_id)
            if not submissions:
                logger.error(f"No submissions found for assignment {assignment_id}")
                return None
                
            # Prepare student results
            student_results = {}
            for submission in submissions:
                student_name = submission.get("student_name", "Unknown")
                score = submission.get("score", 0)
                total = submission.get("total", 100)
                
                # Calculate percentage and letter grade
                percentage = (score / total * 100) if total > 0 else 0
                if percentage >= 90:
                    grade_letter = "A"
                elif percentage >= 80:
                    grade_letter = "B"
                elif percentage >= 70:
                    grade_letter = "C"
                elif percentage >= 60:
                    grade_letter = "D"
                else:
                    grade_letter = "F"
                    
                student_results[student_name] = {
                    "score": score,
                    "total": total,
                    "percentage": percentage,
                    "grade_letter": grade_letter,
                    "grading_feedback": submission.get("feedback", ""),
                    "criteria_scores": [],  # Neo4j doesn't store criteria details currently
                    "mistakes": {}  # Neo4j doesn't store mistake details currently
                }
                
            # Calculate summary statistics
            total_score = sum(result["score"] for result in student_results.values())
            average_score = total_score / len(student_results) if student_results else 0
            passing_count = sum(1 for result in student_results.values() if result["score"] >= 60)
            failing_count = len(student_results) - passing_count
                
            # Prepare the final result
            return {
                "id": assignment_id,
                "assignment_name": assignment.get("name", "Unknown Assignment"),
                "timestamp": datetime.now().isoformat(),
                "status": "graded",
                "summary_stats": {
                    "submission_count": len(submissions),
                    "average_score": average_score,
                    "passing_count": passing_count,
                    "failing_count": failing_count
                },
                "student_results": student_results
            }
        except Exception as e:
            logger.error(f"Error retrieving grading results for assignment {assignment_id}: {str(e)}")
            return None 