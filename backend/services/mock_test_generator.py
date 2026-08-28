"""
Mock Test Generator Service
Creates mock tests based on course curriculum from Canvas or sample course data
"""

import logging
import random
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

# Sample course curricula with realistic content
SAMPLE_COURSES = {
    "cs101": {
        "name": "Introduction to Computer Science",
        "code": "CS 101",
        "description": "Fundamentals of programming, algorithms, and data structures",
        "topics": [
            "Programming Fundamentals",
            "Variables and Data Types",
            "Control Structures (if/else, loops)",
            "Functions and Procedures",
            "Arrays and Lists",
            "Object-Oriented Programming",
            "Basic Algorithms",
            "Problem Solving"
        ],
        "assignments": [
            {
                "name": "Hello World Program",
                "description": "Write your first program that prints 'Hello, World!'",
                "points": 10,
                "type": "programming"
            },
            {
                "name": "Calculator Application",
                "description": "Create a simple calculator that performs basic arithmetic operations",
                "points": 50,
                "type": "programming"
            },
            {
                "name": "Array Manipulation",
                "description": "Write functions to manipulate arrays: find max, min, average",
                "points": 75,
                "type": "programming"
            },
            {
                "name": "Midterm Exam",
                "description": "Comprehensive exam covering programming fundamentals",
                "points": 100,
                "type": "exam"
            }
        ]
    },
    "ds201": {
        "name": "Data Science Fundamentals",
        "code": "DS 201",
        "description": "Introduction to data analysis, visualization, and machine learning",
        "topics": [
            "Data Collection and Cleaning",
            "Exploratory Data Analysis",
            "Statistical Analysis",
            "Data Visualization",
            "Machine Learning Basics",
            "Regression Analysis",
            "Classification Algorithms",
            "Data Ethics"
        ],
        "assignments": [
            {
                "name": "Data Cleaning Project",
                "description": "Clean and preprocess a messy dataset",
                "points": 100,
                "type": "project"
            },
            {
                "name": "Exploratory Data Analysis",
                "description": "Perform EDA on a real-world dataset and create visualizations",
                "points": 150,
                "type": "project"
            },
            {
                "name": "Linear Regression Model",
                "description": "Build and evaluate a linear regression model",
                "points": 200,
                "type": "project"
            },
            {
                "name": "Final Project",
                "description": "Complete data science project from start to finish",
                "points": 300,
                "type": "project"
            }
        ]
    },
    "math301": {
        "name": "Linear Algebra",
        "code": "MATH 301",
        "description": "Vector spaces, matrices, eigenvalues, and linear transformations",
        "topics": [
            "Vector Spaces",
            "Matrix Operations",
            "Systems of Linear Equations",
            "Determinants",
            "Eigenvalues and Eigenvectors",
            "Linear Transformations",
            "Orthogonality",
            "Applications"
        ],
        "assignments": [
            {
                "name": "Vector Operations",
                "description": "Solve problems involving vector addition, subtraction, and scalar multiplication",
                "points": 50,
                "type": "homework"
            },
            {
                "name": "Matrix Algebra",
                "description": "Perform matrix operations: multiplication, inversion, transpose",
                "points": 75,
                "type": "homework"
            },
            {
                "name": "Eigenvalue Problems",
                "description": "Find eigenvalues and eigenvectors for given matrices",
                "points": 100,
                "type": "homework"
            },
            {
                "name": "Final Exam",
                "description": "Comprehensive exam covering all course topics",
                "points": 200,
                "type": "exam"
            }
        ]
    },
    "eng101": {
        "name": "Composition and Rhetoric",
        "code": "ENG 101",
        "description": "Academic writing, argumentation, and critical thinking",
        "topics": [
            "Thesis Development",
            "Argument Structure",
            "Evidence and Citations",
            "Rhetorical Analysis",
            "Persuasive Writing",
            "Research Methods",
            "Peer Review",
            "Revision Strategies"
        ],
        "assignments": [
            {
                "name": "Argumentative Essay",
                "description": "Write a 5-page argumentative essay on a topic of your choice",
                "points": 100,
                "type": "essay"
            },
            {
                "name": "Rhetorical Analysis",
                "description": "Analyze the rhetorical strategies used in a published article",
                "points": 150,
                "type": "essay"
            },
            {
                "name": "Research Paper",
                "description": "Write a 10-page research paper with proper citations",
                "points": 200,
                "type": "essay"
            }
        ]
    },
    "bio202": {
        "name": "Cell Biology",
        "code": "BIO 202",
        "description": "Structure and function of cells, cellular processes, and molecular biology",
        "topics": [
            "Cell Structure",
            "Membrane Transport",
            "Cellular Respiration",
            "Photosynthesis",
            "Cell Division",
            "Protein Synthesis",
            "Genetic Regulation",
            "Cellular Communication"
        ],
        "assignments": [
            {
                "name": "Cell Structure Lab Report",
                "description": "Observe and document cell structures using microscopy",
                "points": 75,
                "type": "lab"
            },
            {
                "name": "Metabolism Analysis",
                "description": "Analyze cellular respiration and energy production",
                "points": 100,
                "type": "lab"
            },
            {
                "name": "Final Lab Project",
                "description": "Independent research project on a cellular process",
                "points": 200,
                "type": "project"
            }
        ]
    }
}


class MockTestGenerator:
    """Generate mock tests based on course curriculum"""
    
    def __init__(self):
        self.sample_courses = SAMPLE_COURSES
    
    def get_sample_course(self, course_id: str) -> Optional[Dict[str, Any]]:
        """Get sample course data by ID"""
        return self.sample_courses.get(course_id.lower())
    
    def list_sample_courses(self) -> List[Dict[str, Any]]:
        """List all available sample courses"""
        return [
            {
                "id": course_id,
                "name": course["name"],
                "code": course["code"],
                "description": course["description"],
                "topic_count": len(course["topics"]),
                "assignment_count": len(course["assignments"])
            }
            for course_id, course in self.sample_courses.items()
        ]
    
    def generate_test_from_course(
        self,
        course_id: str,
        test_type: str = "comprehensive",
        num_questions: int = 10,
        difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """
        Generate a mock test based on course curriculum
        
        Args:
            course_id: Course identifier (e.g., 'cs101', 'ds201')
            test_type: Type of test ('comprehensive', 'topic_focused', 'assignment_based')
            num_questions: Number of questions to generate
            difficulty: Difficulty level ('easy', 'medium', 'hard')
        """
        course = self.get_sample_course(course_id)
        if not course:
            raise ValueError(f"Course {course_id} not found")
        
        questions = []
        
        if test_type == "comprehensive":
            questions = self._generate_comprehensive_questions(
                course, num_questions, difficulty
            )
        elif test_type == "topic_focused":
            questions = self._generate_topic_focused_questions(
                course, num_questions, difficulty
            )
        elif test_type == "assignment_based":
            questions = self._generate_assignment_based_questions(
                course, num_questions, difficulty
            )
        
        return {
            "test_id": f"test_{course_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "course_id": course_id,
            "course_name": course["name"],
            "course_code": course["code"],
            "test_type": test_type,
            "difficulty": difficulty,
            "total_questions": len(questions),
            "total_points": sum(q.get("points", 1) for q in questions),
            "time_limit_minutes": self._calculate_time_limit(len(questions), difficulty),
            "questions": questions,
            "created_at": datetime.now().isoformat()
        }
    
    def _generate_comprehensive_questions(
        self,
        course: Dict[str, Any],
        num_questions: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate questions covering all course topics"""
        questions = []
        topics = course["topics"]
        assignments = course["assignments"]
        
        # Distribute questions across topics
        questions_per_topic = max(1, num_questions // len(topics))
        remaining = num_questions % len(topics)
        
        question_id = 1
        for i, topic in enumerate(topics):
            topic_questions = questions_per_topic + (1 if i < remaining else 0)
            
            for j in range(topic_questions):
                question = self._create_question(
                    topic=topic,
                    course_name=course["name"],
                    question_num=question_id,
                    difficulty=difficulty,
                    question_type=self._select_question_type(course["code"])
                )
                questions.append(question)
                question_id += 1
        
        return questions[:num_questions]  # Ensure exact count
    
    def _generate_topic_focused_questions(
        self,
        course: Dict[str, Any],
        num_questions: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate questions focused on specific topics"""
        questions = []
        selected_topics = random.sample(
            course["topics"],
            min(3, len(course["topics"]))
        )
        
        questions_per_topic = num_questions // len(selected_topics)
        remaining = num_questions % len(selected_topics)
        
        question_id = 1
        for i, topic in enumerate(selected_topics):
            topic_questions = questions_per_topic + (1 if i < remaining else 0)
            
            for j in range(topic_questions):
                question = self._create_question(
                    topic=topic,
                    course_name=course["name"],
                    question_num=question_id,
                    difficulty=difficulty,
                    question_type=self._select_question_type(course["code"])
                )
                questions.append(question)
                question_id += 1
        
        return questions[:num_questions]
    
    def _generate_assignment_based_questions(
        self,
        course: Dict[str, Any],
        num_questions: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate questions based on course assignments"""
        questions = []
        assignments = course["assignments"]
        
        questions_per_assignment = max(1, num_questions // len(assignments))
        remaining = num_questions % len(assignments)
        
        question_id = 1
        for i, assignment in enumerate(assignments):
            assignment_questions = questions_per_assignment + (1 if i < remaining else 0)
            
            for j in range(assignment_questions):
                question = self._create_question(
                    topic=assignment["name"],
                    course_name=course["name"],
                    question_num=question_id,
                    difficulty=difficulty,
                    question_type=assignment["type"],
                    assignment_context=assignment
                )
                questions.append(question)
                question_id += 1
        
        return questions[:num_questions]
    
    def _create_question(
        self,
        topic: str,
        course_name: str,
        question_num: int,
        difficulty: str,
        question_type: str,
        assignment_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Create a single question based on topic and difficulty"""
        
        # Base points based on difficulty
        points_map = {"easy": 5, "medium": 10, "hard": 15}
        points = points_map.get(difficulty, 10)
        
        # Question templates based on type
        if question_type in ["programming", "project"]:
            question_text = self._generate_programming_question(topic, difficulty)
        elif question_type == "exam":
            question_text = self._generate_exam_question(topic, difficulty)
        elif question_type == "essay":
            question_text = self._generate_essay_question(topic, difficulty)
        elif question_type == "lab":
            question_text = self._generate_lab_question(topic, difficulty)
        else:
            question_text = self._generate_general_question(topic, difficulty)
        
        return {
            "id": question_num,
            "question": question_text,
            "type": question_type,
            "topic": topic,
            "points": points,
            "difficulty": difficulty,
            "options": self._generate_options(topic, question_type) if question_type != "essay" else None,
            "correct_answer": self._generate_correct_answer(topic, question_type),
            "explanation": self._generate_explanation(topic, question_type)
        }
    
    def _generate_programming_question(self, topic: str, difficulty: str) -> str:
        """Generate programming-related question"""
        templates = {
            "easy": [
                f"Explain the basic concept of {topic} in programming.",
                f"What is the purpose of {topic}?",
                f"Describe how {topic} is used in a program."
            ],
            "medium": [
                f"Write a function that demonstrates {topic}. Include error handling.",
                f"Explain the difference between {topic} and provide code examples.",
                f"Design an algorithm that uses {topic} to solve a problem."
            ],
            "hard": [
                f"Implement an optimized solution using {topic} with time complexity analysis.",
                f"Design a system that leverages {topic} with proper design patterns.",
                f"Create a comprehensive solution for {topic} with unit tests."
            ]
        }
        return random.choice(templates.get(difficulty, templates["medium"]))
    
    def _generate_exam_question(self, topic: str, difficulty: str) -> str:
        """Generate exam-style question"""
        templates = {
            "easy": [
                f"Define {topic} and provide one example.",
                f"What are the key characteristics of {topic}?",
                f"List three applications of {topic}."
            ],
            "medium": [
                f"Compare and contrast {topic} with related concepts.",
                f"Explain how {topic} relates to the broader course material.",
                f"Analyze a scenario involving {topic} and provide solutions."
            ],
            "hard": [
                f"Synthesize knowledge of {topic} to solve a complex problem.",
                f"Evaluate different approaches to {topic} and recommend the best solution.",
                f"Design a comprehensive solution that integrates {topic} with other concepts."
            ]
        }
        return random.choice(templates.get(difficulty, templates["medium"]))
    
    def _generate_essay_question(self, topic: str, difficulty: str) -> str:
        """Generate essay question"""
        templates = {
            "easy": [
                f"Write a brief essay explaining {topic}.",
                f"Describe the importance of {topic} in academic writing."
            ],
            "medium": [
                f"Analyze the role of {topic} in effective communication.",
                f"Argue for or against a position related to {topic}."
            ],
            "hard": [
                f"Write a comprehensive analysis of {topic} with multiple perspectives.",
                f"Critically evaluate {topic} and propose improvements."
            ]
        }
        return random.choice(templates.get(difficulty, templates["medium"]))
    
    def _generate_lab_question(self, topic: str, difficulty: str) -> str:
        """Generate lab-related question"""
        templates = {
            "easy": [
                f"Describe the procedure for {topic} in a laboratory setting.",
                f"What safety precautions are needed for {topic}?"
            ],
            "medium": [
                f"Explain the methodology for {topic} and expected results.",
                f"Analyze the data from a {topic} experiment."
            ],
            "hard": [
                f"Design an experiment to investigate {topic} with proper controls.",
                f"Interpret complex results from {topic} and draw conclusions."
            ]
        }
        return random.choice(templates.get(difficulty, templates["medium"]))
    
    def _generate_general_question(self, topic: str, difficulty: str) -> str:
        """Generate general question"""
        templates = {
            "easy": f"What is {topic}?",
            "medium": f"Explain {topic} and provide examples.",
            "hard": f"Analyze {topic} in depth and discuss its implications."
        }
        return templates.get(difficulty, templates["medium"])
    
    def _select_question_type(self, course_code: str) -> str:
        """Select appropriate question type based on course"""
        if "CS" in course_code or "DS" in course_code:
            return random.choice(["programming", "exam"])
        elif "MATH" in course_code:
            return random.choice(["exam", "homework"])
        elif "ENG" in course_code:
            return "essay"
        elif "BIO" in course_code:
            return random.choice(["lab", "exam"])
        else:
            return "exam"
    
    def _generate_options(self, topic: str, question_type: str) -> List[str]:
        """Generate multiple choice options"""
        if question_type in ["essay", "programming"]:
            return None
        
        # Generate realistic options
        correct = f"Correct answer related to {topic}"
        options = [
            correct,
            f"Incorrect option A about {topic}",
            f"Incorrect option B related to {topic}",
            f"Incorrect option C regarding {topic}"
        ]
        random.shuffle(options)
        return options
    
    def _generate_correct_answer(self, topic: str, question_type: str) -> str:
        """Generate correct answer"""
        if question_type == "essay":
            return f"Essay response should cover key aspects of {topic}..."
        elif question_type == "programming":
            return f"Code solution demonstrating {topic}"
        else:
            return f"Correct answer: {topic} is..."
    
    def _generate_explanation(self, topic: str, question_type: str) -> str:
        """Generate explanation for the answer"""
        return f"This answer is correct because it properly addresses {topic} and demonstrates understanding of the concept."
    
    def _calculate_time_limit(self, num_questions: int, difficulty: str) -> int:
        """Calculate time limit in minutes"""
        base_time = {"easy": 1, "medium": 2, "hard": 3}
        return num_questions * base_time.get(difficulty, 2)
    
    def generate_test_from_canvas_course(
        self,
        canvas_course_data: Dict[str, Any],
        test_type: str = "comprehensive",
        num_questions: int = 10,
        difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """
        Generate test from actual Canvas course data
        
        Args:
            canvas_course_data: Course data from Canvas API
            test_type: Type of test
            num_questions: Number of questions
            difficulty: Difficulty level
        """
        # Extract course information
        course_name = canvas_course_data.get("name", "Unknown Course")
        course_code = canvas_course_data.get("course_code", "")
        assignments = canvas_course_data.get("assignments", [])
        
        # Extract topics from assignments
        topics = []
        for assignment in assignments:
            name = assignment.get("name", "")
            description = assignment.get("description", "")
            if name:
                topics.append(name)
            # Extract keywords from description
            if description:
                # Simple keyword extraction (can be enhanced)
                keywords = description.split()[:5]
                topics.extend(keywords)
        
        # Create course structure
        course = {
            "name": course_name,
            "code": course_code,
            "description": canvas_course_data.get("public_description", ""),
            "topics": list(set(topics))[:10],  # Limit to 10 unique topics
            "assignments": [
                {
                    "name": a.get("name", ""),
                    "description": a.get("description", "")[:200],
                    "points": a.get("points_possible", 100),
                    "type": self._infer_assignment_type(a)
                }
                for a in assignments[:10]  # Limit to 10 assignments
            ]
        }
        
        # Generate test using the course structure
        return self.generate_test_from_course(
            course_id="canvas_course",
            test_type=test_type,
            num_questions=num_questions,
            difficulty=difficulty
        )
    
    def _infer_assignment_type(self, assignment: Dict[str, Any]) -> str:
        """Infer assignment type from Canvas assignment data"""
        name = assignment.get("name", "").lower()
        description = assignment.get("description", "").lower()
        submission_types = assignment.get("submission_types", [])
        
        if "exam" in name or "test" in name or "quiz" in name:
            return "exam"
        elif "essay" in name or "paper" in name or "write" in name:
            return "essay"
        elif "lab" in name or "experiment" in name:
            return "lab"
        elif "code" in name or "program" in name or "online_upload" in submission_types:
            return "programming"
        elif "project" in name:
            return "project"
        else:
            return "homework"


# Global instance
mock_test_generator = MockTestGenerator()


