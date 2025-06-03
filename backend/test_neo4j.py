#!/usr/bin/env python3
from utils.neo4j_connector import Neo4jConnector
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Test Neo4j connection and data storage."""
    logger.info("Testing Neo4j connection...")
    
    # Create Neo4j connector
    db = Neo4jConnector()
    
    # Check connection
    if not db.is_connected():
        logger.error("Failed to connect to Neo4j database")
        return
    
    logger.info("Successfully connected to Neo4j database")
    
    # Test storing an assignment
    assignment_name = "Test Assignment"
    question_text = "This is a test question for Neo4j integration"
    
    # Neo4j can't store nested objects directly, so convert to JSON string
    rubric = {
        "criteria": [
            {
                "name": "Content Understanding",
                "max_points": 30,
                "description": "Understanding of core concepts and materials"
            },
            {
                "name": "Analysis",
                "max_points": 25,
                "description": "Critical thinking and analytical skills"
            }
        ],
        "total_points": 55
    }
    
    # Convert rubric to JSON string
    rubric_str = json.dumps(rubric)
    
    logger.info(f"Storing assignment: {assignment_name}")
    assignment_id = db.store_assignment_data(assignment_name, question_text, rubric_str)
    
    if assignment_id:
        logger.info(f"Assignment stored successfully with ID: {assignment_id}")
        
        # Test storing a submission
        student_name = "Test Student"
        submission_text = "This is a test submission for Neo4j integration"
        grade_data = {
            "score": 45,
            "total": 55,
            "grading_feedback": "Good job!"
        }
        
        logger.info(f"Storing submission for student: {student_name}")
        submission_id = db.store_submission(assignment_id, student_name, submission_text, grade_data)
        
        if submission_id:
            logger.info(f"Submission stored successfully with ID: {submission_id}")
        else:
            logger.error("Failed to store submission")
    else:
        logger.error("Failed to store assignment")
    
    # Test retrieving assignments
    logger.info("Retrieving assignments...")
    assignments = db.get_assignments()
    logger.info(f"Retrieved {len(assignments)} assignments")
    
    for assignment in assignments:
        logger.info(f"Assignment ID: {assignment['id']}, Name: {assignment['name']}")
        
        # Test retrieving submissions
        logger.info(f"Retrieving submissions for assignment {assignment['id']}...")
        submissions = db.get_submissions_for_assignment(str(assignment['id']))
        logger.info(f"Retrieved {len(submissions)} submissions")
        
        for submission in submissions:
            logger.info(f"Submission ID: {submission['id']}, Student: {submission['student_name']}, Score: {submission['score']}")
    
    # Close the connection
    db.close()
    logger.info("Neo4j test completed")

if __name__ == "__main__":
    main() 