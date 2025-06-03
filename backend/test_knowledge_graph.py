#!/usr/bin/env python3
"""
Test script for the Knowledge Graph functionality.
This script demonstrates how to build and query a knowledge graph for assignments.
"""

import logging
import json
from utils.knowledge_graph import KnowledgeGraph

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Test the Knowledge Graph functionality."""
    logger.info("Testing Knowledge Graph functionality...")
    
    # Create Knowledge Graph instance
    kg = KnowledgeGraph()
    
    # Check connection
    if not kg.is_connected():
        logger.error("Failed to connect to Neo4j database")
        return
    
    logger.info("Successfully connected to Neo4j database for Knowledge Graph")
    
    # Sample assignment data
    assignment_id = "kg_test_assignment_001"
    assignment_name = "Knowledge Graph in Computer Science"
    question_text = """
    Explain the concept of knowledge graphs in computer science. 
    Discuss their applications in artificial intelligence, semantic web, and information retrieval. 
    Include examples of how knowledge graphs are used in real-world systems like Google's Knowledge Graph 
    and how they relate to other data structures like ontologies and semantic networks.
    Analyze the benefits and limitations of knowledge graphs compared to traditional relational databases.
    """
    
    rubric = {
        "criteria": [
            {
                "name": "Understanding of Knowledge Graphs",
                "max_points": 30,
                "description": "Demonstrates clear understanding of knowledge graph concepts and structure"
            },
            {
                "name": "Applications Analysis",
                "max_points": 25,
                "description": "Thoroughly analyzes applications in AI, semantic web, and information retrieval"
            },
            {
                "name": "Examples and Case Studies",
                "max_points": 20,
                "description": "Provides relevant examples and case studies of knowledge graph implementations"
            },
            {
                "name": "Comparative Analysis",
                "max_points": 15,
                "description": "Effectively compares knowledge graphs with traditional databases"
            },
            {
                "name": "Quality of Writing",
                "max_points": 10,
                "description": "Well-organized, clear, and concise writing"
            }
        ],
        "total_points": 100
    }
    
    course = "Computer Science 401: Advanced Data Structures"
    subject = "Computer Science"
    
    # Create the assignment knowledge graph
    logger.info(f"Creating knowledge graph for assignment: {assignment_name}")
    success = kg.create_assignment_knowledge_graph(
        assignment_id=assignment_id,
        assignment_name=assignment_name,
        question_text=question_text,
        rubric=rubric,
        course=course,
        subject=subject
    )
    
    if not success:
        logger.error("Failed to create assignment knowledge graph")
        return
    
    logger.info("Assignment knowledge graph created successfully")
    
    # Sample student submissions
    submissions = [
        {
            "id": "kg_test_submission_001",
            "student_name": "Alice Johnson",
            "text": """
            Knowledge graphs are a powerful way to represent information in a structured format using nodes and edges.
            They are widely used in AI applications to provide context and relationships between entities.
            Google's Knowledge Graph enhances search results by showing relevant information about people, places, and things.
            Knowledge graphs differ from relational databases by focusing on relationships rather than tables and rows.
            They support semantic queries and can integrate data from multiple sources more effectively.
            """,
            "grade_data": {
                "score": 85,
                "total": 100,
                "grading_feedback": "Good understanding of knowledge graphs but could include more examples.",
                "criterion_scores": {
                    "Understanding of Knowledge Graphs": 28,
                    "Applications Analysis": 20,
                    "Examples and Case Studies": 15,
                    "Comparative Analysis": 13,
                    "Quality of Writing": 9
                }
            }
        },
        {
            "id": "kg_test_submission_002",
            "student_name": "Bob Smith",
            "text": """
            Knowledge graphs store information as a network of entities and relationships.
            They are used in semantic web applications and help computers understand the meaning of data.
            Examples include Google's Knowledge Graph and Facebook's Social Graph.
            Relational databases use tables while knowledge graphs use nodes and edges.
            Knowledge graphs are good for complex queries but may be slower than traditional databases.
            """,
            "grade_data": {
                "score": 75,
                "total": 100,
                "grading_feedback": "Basic understanding demonstrated but analysis lacks depth.",
                "criterion_scores": {
                    "Understanding of Knowledge Graphs": 24,
                    "Applications Analysis": 18,
                    "Examples and Case Studies": 15,
                    "Comparative Analysis": 10,
                    "Quality of Writing": 8
                }
            }
        },
        {
            "id": "kg_test_submission_003",
            "student_name": "Charlie Davis",
            "text": """
            Knowledge graphs represent knowledge in a graph structure with nodes as entities and edges as relationships.
            In artificial intelligence, they provide machines with contextual understanding of the world.
            Google's Knowledge Graph enhances search results with relevant information panels.
            Knowledge graphs are similar to ontologies but focus more on instance data rather than class definitions.
            Unlike relational databases, knowledge graphs excel at handling complex, interconnected data and support 
            semantic reasoning. However, they may not be as efficient for simple, structured data operations.
            """,
            "grade_data": {
                "score": 92,
                "total": 100,
                "grading_feedback": "Excellent analysis with good examples and clear comparisons.",
                "criterion_scores": {
                    "Understanding of Knowledge Graphs": 29,
                    "Applications Analysis": 23,
                    "Examples and Case Studies": 18,
                    "Comparative Analysis": 14,
                    "Quality of Writing": 8
                }
            }
        }
    ]
    
    # Add submissions to the knowledge graph
    for submission in submissions:
        logger.info(f"Adding submission from {submission['student_name']} to knowledge graph")
        success = kg.add_submission_to_knowledge_graph(
            submission_id=submission["id"],
            assignment_id=assignment_id,
            student_name=submission["student_name"],
            submission_text=submission["text"],
            grade_data=submission["grade_data"]
        )
        
        if not success:
            logger.error(f"Failed to add submission from {submission['student_name']} to knowledge graph")
    
    # Get the complete knowledge graph for the assignment
    logger.info(f"Retrieving knowledge graph for assignment: {assignment_name}")
    graph_data = kg.get_assignment_knowledge_graph(assignment_id)
    
    logger.info(f"Knowledge graph contains {len(graph_data['nodes'])} nodes and {len(graph_data['relationships'])} relationships")
    
    # Print node types summary
    node_types = {}
    for node in graph_data["nodes"]:
        for label in node["labels"]:
            node_types[label] = node_types.get(label, 0) + 1
    
    logger.info("Node types in the knowledge graph:")
    for node_type, count in node_types.items():
        logger.info(f"  - {node_type}: {count}")
    
    # Print relationship types summary
    relationship_types = {}
    for rel in graph_data["relationships"]:
        relationship_types[rel["type"]] = relationship_types.get(rel["type"], 0) + 1
    
    logger.info("Relationship types in the knowledge graph:")
    for rel_type, count in relationship_types.items():
        logger.info(f"  - {rel_type}: {count}")
    
    # Get concepts from the knowledge graph
    concepts = [
        node["properties"]["name"] 
        for node in graph_data["nodes"] 
        if "Concept" in node["labels"]
    ]
    
    logger.info(f"Concepts identified in the knowledge graph: {', '.join(concepts[:5])}...")
    
    # Analyze a specific concept
    if concepts:
        concept_to_analyze = concepts[0]
        logger.info(f"Analyzing concept: {concept_to_analyze}")
        concept_data = kg.get_concept_relationships(concept_to_analyze)
        
        logger.info(f"Concept '{concept_to_analyze}' appears in {len(concept_data['submissions'])} submissions")
        if concept_data['related_concepts']:
            logger.info(f"Related concepts: {', '.join([c['name'] for c in concept_data['related_concepts'][:3]])}")
    
    # Get student knowledge profiles
    student_name = "Charlie Davis"
    logger.info(f"Getting knowledge profile for student: {student_name}")
    profile = kg.get_student_knowledge_profile(student_name)
    
    if profile:
        logger.info(f"Student has completed {profile['assignments_completed']} assignments with an overall score of {profile['overall_score_percentage']:.1f}%")
        if profile['knowledge_concepts']:
            logger.info(f"Top concepts mastered: {', '.join([c['name'] for c in profile['knowledge_concepts'][:3]])}")
    
    # Get class performance by concept
    logger.info(f"Analyzing class performance by concept for course: {course}")
    class_performance = kg.get_class_performance_by_concept(course)
    
    if class_performance and class_performance.get('concept_performance'):
        top_concepts = class_performance['concept_performance'][:3]
        logger.info(f"Top performing concepts: {', '.join([f'{c['name']} ({c['average_score']:.1f}%)' for c in top_concepts])}")
    
    # Close the connection
    kg.close()
    logger.info("Knowledge Graph test completed")

if __name__ == "__main__":
    main() 