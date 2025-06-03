import os
import logging
import json
from typing import Dict, Any, List, Optional, Tuple, Set
from neo4j import GraphDatabase
from dotenv import load_dotenv
import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from pathlib import Path
import datetime

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to download NLTK resources if not already present
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('wordnet')

class KnowledgeGraph:
    """
    Knowledge Graph utilities for ScorePAL.
    Handles connections to Neo4j and knowledge graph operations.
    Also provides local storage backup for knowledge graph data.
    """
    
    def __init__(self):
        """Initialize the Knowledge Graph connector."""
        # Get Neo4j credentials from environment variables if not provided
        self.uri = os.getenv("NEO4J_URI")
        self.username = os.getenv("NEO4J_USERNAME")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.database = os.getenv("NEO4J_DATABASE", "neo4j")
        self.use_neo4j = os.getenv("USE_NEO4J", "true").lower() == "true"
        self._driver = None
        
        # Set up local storage for KG data
        self.storage_path = Path(os.getenv("KG_STORAGE_PATH", "data/knowledge_graph"))
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        self.assignments_path = self.storage_path / "assignments"
        self.concepts_path = self.storage_path / "concepts"
        self.students_path = self.storage_path / "students"
        self.submissions_path = self.storage_path / "submissions"
        
        for path in [self.assignments_path, self.concepts_path, self.students_path, self.submissions_path]:
            path.mkdir(exist_ok=True)
            
        # Connect to Neo4j if credentials are provided and use_neo4j is true
        if self.use_neo4j and self.uri and self.username and self.password:
            try:
                self._driver = GraphDatabase.driver(
                    self.uri, auth=(self.username, self.password)
                )
                logger.info("Neo4j connection initialized")
            except Exception as e:
                logger.error(f"Error connecting to Neo4j: {e}")
                self._driver = None
        else:
            logger.warning("Neo4j connection not configured. Using local storage only.")
        
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
    
    def close(self):
        """Close the Neo4j connection."""
        if self._driver:
            self._driver.close()
            self._driver = None
            logger.info("Neo4j connection closed")
    
    def is_connected(self) -> bool:
        """Check if connected to Neo4j."""
        if not self.use_neo4j:
            return False
            
        if not self._driver:
            return False
            
        try:
            with self._driver.session(database=self.database) as session:
                result = session.run("RETURN 1 as test")
                return result.single()["test"] == 1
        except Exception as e:
            logger.error(f"Error checking Neo4j connection: {e}")
            return False

    def _extract_key_concepts(self, text: str) -> List[str]:
        """
        Extract key concepts from text using NLP techniques.
        
        Args:
            text: The text to extract concepts from
            
        Returns:
            List of extracted key concepts
        """
        # Tokenize and clean the text
        tokens = word_tokenize(text.lower())
        
        # Remove stopwords and short words, lemmatize
        filtered_tokens = [
            self.lemmatizer.lemmatize(token) 
            for token in tokens 
            if token.isalpha() and token not in self.stop_words and len(token) > 3
        ]
        
        # Count word frequencies
        word_freq = {}
        for token in filtered_tokens:
            word_freq[token] = word_freq.get(token, 0) + 1
        
        # Extract top concepts based on frequency
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        # Return top 10 concepts or fewer if there aren't enough
        return [word for word, freq in sorted_words[:10]]
    
    def _extract_domain_concepts(self, question_text: str, submissions: List[str] = None) -> List[str]:
        """
        Extract domain-specific concepts from question and submissions.
        
        Args:
            question_text: The assignment question text
            submissions: Optional list of submission texts
            
        Returns:
            List of domain concepts
        """
        # Start with concepts from the question
        concepts = set(self._extract_key_concepts(question_text))
        
        # Add concepts from submissions if provided
        if submissions:
            for submission in submissions:
                submission_concepts = self._extract_key_concepts(submission)
                concepts.update(submission_concepts)
        
        return list(concepts)
    
    def create_assignment_knowledge_graph(
        self,
        assignment_id: str,
        assignment_name: str,
        question_text: str,
        rubric: Dict[str, Any],
        course: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> bool:
        """Create a knowledge graph for an assignment."""
        try:
            # Always save to local storage
            assignment_data = {
                "id": assignment_id,
                "name": assignment_name,
                "question_text": question_text,
                "rubric": rubric,
                "course": course,
                "subject": subject,
                "created_at": datetime.datetime.now().isoformat()
            }
            
            # Save to local storage
            with open(self.assignments_path / f"{assignment_id}.json", 'w') as f:
                json.dump(assignment_data, f, indent=2)
            
            logger.info(f"Assignment {assignment_id} saved to local storage")
            
            # If Neo4j is connected, also save there
            if self.is_connected():
                with self._driver.session(database=self.database) as session:
                    # Create the assignment node
                    result = session.run(
                        """
                        MERGE (a:Assignment {id: $id})
                        SET a.name = $name,
                            a.question_text = $question_text,
                            a.created_at = datetime(),
                            a.course = $course,
                            a.subject = $subject
                        RETURN a.id as id
                        """,
                        id=assignment_id,
                        name=assignment_name,
                        question_text=question_text,
                        course=course,
                        subject=subject,
                    )
                    
                    # Create rubric criteria nodes
                    if rubric and "criteria" in rubric:
                        for criterion in rubric["criteria"]:
                            session.run(
                                """
                                MATCH (a:Assignment {id: $assignment_id})
                                MERGE (c:RubricCriterion {name: $name, assignment_id: $assignment_id})
                                SET c.description = $description,
                                    c.max_points = $max_points
                                MERGE (c)-[:BELONGS_TO]->(a)
                                """,
                                assignment_id=assignment_id,
                                name=criterion["name"],
                                description=criterion.get("description", ""),
                                max_points=criterion.get("max_points", 0)
                            )
                
                logger.info(f"Assignment {assignment_id} added to Neo4j Knowledge Graph")
            
            return True
        except Exception as e:
            logger.error(f"Error creating assignment knowledge graph: {e}")
            return False

    def add_submission_to_knowledge_graph(
        self,
        submission_id: str,
        assignment_id: str,
        student_name: str,
        submission_text: str,
        grade_data: Dict[str, Any],
    ) -> bool:
        """Add a submission to the knowledge graph."""
        try:
            # Always save to local storage
            submission_data = {
                "id": submission_id,
                "assignment_id": assignment_id,
                "student_name": student_name,
                "submission_text": submission_text,
                "grade_data": grade_data,
                "submitted_at": datetime.datetime.now().isoformat()
            }
            
            # Save to local storage
            with open(self.submissions_path / f"{submission_id}.json", 'w') as f:
                json.dump(submission_data, f, indent=2)
                
            # Also save to student folder
            student_folder = self.students_path / student_name.replace(" ", "_").lower()
            student_folder.mkdir(exist_ok=True)
            
            with open(student_folder / f"{submission_id}.json", 'w') as f:
                json.dump(submission_data, f, indent=2)
            
            logger.info(f"Submission {submission_id} saved to local storage")
            
            # If Neo4j is connected, also save there
            if self.is_connected():
                # Extract score and criteria scores
                score = grade_data.get("score", 0)
                total = grade_data.get("total", 100)
                feedback = grade_data.get("grading_feedback", "")
                criterion_scores = grade_data.get("criterion_scores", {})
                
                with self._driver.session(database=self.database) as session:
                    # Create the student node if it doesn't exist
                    session.run(
                        """
                        MERGE (s:Student {name: $name})
                        """,
                        name=student_name,
                    )
                    
                    # Create the submission node and link to assignment and student
                    session.run(
                        """
                        MATCH (a:Assignment {id: $assignment_id})
                        MATCH (s:Student {name: $student_name})
                        CREATE (sub:Submission {id: $submission_id})
                        SET sub.text = $submission_text,
                            sub.score = $score,
                            sub.total = $total,
                            sub.percentage = $percentage,
                            sub.feedback = $feedback,
                            sub.submitted_at = datetime()
                        CREATE (s)-[:SUBMITTED]->(sub)
                        CREATE (sub)-[:BELONGS_TO]->(a)
                        """,
                        assignment_id=assignment_id,
                        student_name=student_name,
                        submission_id=submission_id,
                        submission_text=submission_text,
                        score=score,
                        total=total,
                        percentage=(score / total * 100) if total > 0 else 0,
                        feedback=feedback,
                    )
                    
                    # Add criterion scores
                    for criterion_name, criterion_score in criterion_scores.items():
                        session.run(
                            """
                            MATCH (sub:Submission {id: $submission_id})
                            MATCH (c:RubricCriterion {name: $criterion_name, assignment_id: $assignment_id})
                            MERGE (sub)-[r:SCORED_ON]->(c)
                            SET r.score = $score
                            """,
                            submission_id=submission_id,
                            criterion_name=criterion_name,
                            assignment_id=assignment_id,
                            score=criterion_score
                        )
                
                logger.info(f"Submission {submission_id} added to Neo4j Knowledge Graph")
            
            return True
        except Exception as e:
            logger.error(f"Error adding submission to knowledge graph: {e}")
            return False
            
    def save_grading_result(self, assignment_id: str, student_name: str, result_data: Dict[str, Any]) -> bool:
        """
        Save a grading result to local storage.
        This is a simplified method for just storing the result without Neo4j.
        """
        try:
            # Generate a unique result ID
            result_id = f"{assignment_id}_{student_name.replace(' ', '_').lower()}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Prepare the result data
            result_with_metadata = {
                "id": result_id,
                "assignment_id": assignment_id,
                "student_name": student_name,
                "result": result_data,
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            # Create the results directory if it doesn't exist
            results_path = self.storage_path / "grading_results"
            results_path.mkdir(exist_ok=True)
            
            # Save the result
            with open(results_path / f"{result_id}.json", 'w') as f:
                json.dump(result_with_metadata, f, indent=2)
                
            # Also save to the assignment directory
            assignment_results_path = results_path / assignment_id
            assignment_results_path.mkdir(exist_ok=True)
            
            with open(assignment_results_path / f"{student_name.replace(' ', '_').lower()}.json", 'w') as f:
                json.dump(result_with_metadata, f, indent=2)
            
            logger.info(f"Grading result {result_id} saved to local storage")
            return True
        except Exception as e:
            logger.error(f"Error saving grading result: {e}")
            return False
            
    def get_recent_grading_results(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get the most recent grading results from local storage.
        """
        try:
            results_path = self.storage_path / "grading_results"
            if not results_path.exists():
                return []
                
            # Get all result files
            result_files = list(results_path.glob("*.json"))
            
            # Sort by modification time (most recent first)
            result_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            
            # Limit the number of results
            result_files = result_files[:limit]
            
            # Load the results
            results = []
            for file_path in result_files:
                with open(file_path, 'r') as f:
                    results.append(json.load(f))
                    
            return results
        except Exception as e:
            logger.error(f"Error getting recent grading results: {e}")
            return []
    
    def get_assignment_knowledge_graph(self, assignment_id: str) -> Dict[str, Any]:
        """
        Get the knowledge graph for a specific assignment.
        
        Args:
            assignment_id: ID of the assignment
            
        Returns:
            Dictionary with nodes and relationships representing the knowledge graph
        """
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return {"nodes": [], "relationships": []}
        
        try:
            with self._driver.session(database=self.database) as session:
                # Get all nodes and relationships for this assignment
                result = session.run(
                    """
                    MATCH (a:Assignment {id: $assignment_id})
                    OPTIONAL MATCH (a)-[r1]->(n1)
                    OPTIONAL MATCH (n2)-[r2]->(a)
                    OPTIONAL MATCH (sub:Submission)-[r3:BELONGS_TO]->(a)
                    OPTIONAL MATCH (s:Student)-[r4:SUBMITTED]->(sub)
                    OPTIONAL MATCH (sub)-[r5]->(c:Concept)
                    RETURN a, r1, n1, n2, r2, sub, r3, s, r4, r5, c
                    """,
                    assignment_id=assignment_id
                )
                
                # Process results into nodes and relationships
                nodes = {}
                relationships = []
                
                for record in result:
                    # Process all the nodes in the result
                    for node_key in ['a', 'n1', 'n2', 'sub', 's', 'c']:
                        if record[node_key] is not None and record[node_key].id not in nodes:
                            node = record[node_key]
                            node_data = dict(node.items())
                            nodes[node.id] = {
                                "id": node.id,
                                "labels": list(node.labels),
                                "properties": node_data
                            }
                    
                    # Process all relationships
                    for rel_key in ['r1', 'r2', 'r3', 'r4', 'r5']:
                        if record[rel_key] is not None:
                            rel = record[rel_key]
                            relationships.append({
                                "id": rel.id,
                                "type": rel.type,
                                "start_node": rel.start_node.id,
                                "end_node": rel.end_node.id,
                                "properties": dict(rel.items())
                            })
                
                return {
                    "nodes": list(nodes.values()),
                    "relationships": relationships
                }
                
        except Exception as e:
            logger.error(f"Error retrieving assignment knowledge graph: {str(e)}")
            return {"nodes": [], "relationships": []}
    
    def get_concept_relationships(self, concept_name: str) -> Dict[str, Any]:
        """
        Get all relationships for a specific concept.
        
        Args:
            concept_name: Name of the concept
            
        Returns:
            Dictionary with related assignments, submissions, and other concepts
        """
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return {}
        
        try:
            with self._driver.session(database=self.database) as session:
                # Get assignments covering this concept
                result = session.run(
                    """
                    MATCH (a:Assignment)-[:COVERS]->(c:Concept {name: $concept_name})
                    RETURN a.id as assignment_id, a.name as assignment_name
                    """,
                    concept_name=concept_name
                )
                
                assignments = [
                    {"id": record["assignment_id"], "name": record["assignment_name"]}
                    for record in result
                ]
                
                # Get submissions mentioning this concept
                result = session.run(
                    """
                    MATCH (sub:Submission)-[:MENTIONS]->(c:Concept {name: $concept_name})
                    MATCH (s:Student)-[:SUBMITTED]->(sub)
                    RETURN sub.id as submission_id, s.name as student_name, sub.score as score
                    """,
                    concept_name=concept_name
                )
                
                submissions = [
                    {
                        "id": record["submission_id"], 
                        "student_name": record["student_name"],
                        "score": record["score"]
                    }
                    for record in result
                ]
                
                # Get related concepts (concepts that appear in the same assignments)
                result = session.run(
                    """
                    MATCH (c1:Concept {name: $concept_name})
                    MATCH (a:Assignment)-[:COVERS]->(c1)
                    MATCH (a)-[:COVERS]->(c2:Concept)
                    WHERE c1 <> c2
                    RETURN c2.name as related_concept, count(*) as strength
                    ORDER BY strength DESC
                    """,
                    concept_name=concept_name
                )
                
                related_concepts = [
                    {"name": record["related_concept"], "strength": record["strength"]}
                    for record in result
                ]
                
                return {
                    "concept": concept_name,
                    "assignments": assignments,
                    "submissions": submissions,
                    "related_concepts": related_concepts
                }
                
        except Exception as e:
            logger.error(f"Error retrieving concept relationships: {str(e)}")
            return {}
    
    def get_student_knowledge_profile(self, student_name: str) -> Dict[str, Any]:
        """
        Get a student's knowledge profile based on their submissions.
        
        Args:
            student_name: Name of the student
            
        Returns:
            Dictionary with the student's knowledge profile
        """
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return {}
        
        try:
            with self._driver.session(database=self.database) as session:
                # Get concepts the student has demonstrated knowledge of
                result = session.run(
                    """
                    MATCH (s:Student {name: $student_name})-[:SUBMITTED]->(sub:Submission)-[:MENTIONS]->(c:Concept)
                    WITH c, count(sub) as frequency, avg(sub.score) as avg_score
                    RETURN c.name as concept, frequency, avg_score
                    ORDER BY avg_score DESC, frequency DESC
                    """,
                    student_name=student_name
                )
                
                concepts = [
                    {
                        "name": record["concept"],
                        "frequency": record["frequency"],
                        "average_score": record["avg_score"]
                    }
                    for record in result
                ]
                
                # Get assignments the student has completed
                result = session.run(
                    """
                    MATCH (s:Student {name: $student_name})-[:SUBMITTED]->(sub:Submission)-[:BELONGS_TO]->(a:Assignment)
                    RETURN a.id as assignment_id, a.name as assignment_name, sub.score as score, sub.total as total
                    ORDER BY sub.submitted_at DESC
                    """,
                    student_name=student_name
                )
                
                assignments = [
                    {
                        "id": record["assignment_id"],
                        "name": record["assignment_name"],
                        "score": record["score"],
                        "total": record["total"]
                    }
                    for record in result
                ]
                
                # Calculate overall performance
                total_score = sum(assignment["score"] for assignment in assignments)
                total_possible = sum(assignment["total"] for assignment in assignments)
                overall_percentage = (total_score / total_possible * 100) if total_possible > 0 else 0
                
                return {
                    "student": student_name,
                    "overall_score_percentage": overall_percentage,
                    "assignments_completed": len(assignments),
                    "assignments": assignments,
                    "knowledge_concepts": concepts
                }
                
        except Exception as e:
            logger.error(f"Error retrieving student knowledge profile: {str(e)}")
            return {}
    
    def get_class_performance_by_concept(self, course: str = None) -> Dict[str, Any]:
        """
        Analyze class performance across different concepts.
        
        Args:
            course: Optional course name to filter by
            
        Returns:
            Dictionary with concept performance data
        """
        if not self.is_connected():
            logger.error("Not connected to Neo4j database")
            return {}
        
        try:
            with self._driver.session(database=self.database) as session:
                # Build the query based on whether a course is specified
                query = """
                MATCH (sub:Submission)-[:MENTIONS]->(c:Concept)
                MATCH (sub)-[:BELONGS_TO]->(a:Assignment)
                """
                
                if course:
                    query += "MATCH (a)-[:PART_OF]->(course:Course {name: $course})\n"
                
                query += """
                WITH c, avg(sub.score) as avg_score, count(sub) as num_submissions
                RETURN c.name as concept, avg_score, num_submissions
                ORDER BY avg_score DESC
                """
                
                params = {}
                if course:
                    params["course"] = course
                
                result = session.run(query, **params)
                
                concepts = [
                    {
                        "name": record["concept"],
                        "average_score": record["avg_score"],
                        "number_of_submissions": record["num_submissions"]
                    }
                    for record in result
                ]
                
                return {
                    "course": course if course else "All Courses",
                    "concept_performance": concepts
                }
                
        except Exception as e:
            logger.error(f"Error retrieving class performance by concept: {str(e)}")
            return {} 