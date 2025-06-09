import pytest
import tempfile
from pathlib import Path
import sys
import os

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

@pytest.fixture(scope="session")
def test_data_dir():
    """Create a session-scoped temporary directory for test data."""
    with tempfile.TemporaryDirectory(prefix="ga_test_") as temp_dir:
        yield Path(temp_dir)

@pytest.fixture
def sample_python_code():
    """Sample Python code for testing."""
    return """
def factorial(n):
    '''Calculate factorial of a number'''
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def is_prime(num):
    '''Check if a number is prime'''
    if num < 2:
        return False
    for i in range(2, int(num ** 0.5) + 1):
        if num % i == 0:
            return False
    return True

if __name__ == "__main__":
    print(f"Factorial of 5: {factorial(5)}")
    print(f"Is 17 prime? {is_prime(17)}")
"""

@pytest.fixture
def sample_java_code():
    """Sample Java code for testing."""
    return """
public class Calculator {
    public static int add(int a, int b) {
        return a + b;
    }
    
    public static int multiply(int a, int b) {
        return a * b;
    }
    
    public static void main(String[] args) {
        System.out.println("2 + 3 = " + add(2, 3));
        System.out.println("4 * 5 = " + multiply(4, 5));
    }
}
"""

@pytest.fixture
def sample_document():
    """Sample document content for testing."""
    return """
# Analysis of Machine Learning Algorithms

## Introduction
Machine learning has become a cornerstone of modern artificial intelligence, 
enabling computers to learn and make decisions without explicit programming.

## Key Algorithms
1. Linear Regression - for predicting continuous values
2. Decision Trees - for classification and regression
3. Neural Networks - for complex pattern recognition

## Applications
Machine learning finds applications in various domains including:
- Healthcare diagnosis
- Financial fraud detection
- Recommendation systems
- Autonomous vehicles

## Conclusion
The field of machine learning continues to evolve, with new algorithms 
and techniques being developed to solve increasingly complex problems.
"""

@pytest.fixture
def sample_csv_data():
    """Sample CSV data for testing."""
    return """student_id,name,math,science,english,total
1,Alice,95,88,92,275
2,Bob,78,85,80,243
3,Charlie,92,90,85,267
4,Diana,88,93,89,270
5,Edward,76,82,75,233"""

@pytest.fixture
def sample_json_data():
    """Sample JSON data for testing."""
    return """{
    "course": "Computer Science 101",
    "semester": "Fall 2023",
    "students": [
        {
            "id": 1,
            "name": "Alice Johnson",
            "assignments": [
                {"name": "Assignment 1", "score": 95},
                {"name": "Assignment 2", "score": 88}
            ]
        },
        {
            "id": 2,
            "name": "Bob Smith", 
            "assignments": [
                {"name": "Assignment 1", "score": 82},
                {"name": "Assignment 2", "score": 90}
            ]
        }
    ],
    "total_assignments": 2
}"""

@pytest.fixture
def mock_ai_response_code():
    """Mock AI response for code grading."""
    return """{
    "score": 88,
    "total": 100,
    "grading_feedback": "Good implementation with proper structure and documentation. Minor improvements could be made in error handling.",
    "criteria_scores": [
        {
            "name": "Correctness & Functionality",
            "points": 28,
            "max_points": 30,
            "feedback": "Functions work correctly with proper logic"
        },
        {
            "name": "Code Quality & Style",
            "points": 23,
            "max_points": 25,
            "feedback": "Good naming conventions and structure"
        },
        {
            "name": "Documentation & Comments",
            "points": 18,
            "max_points": 20,
            "feedback": "Has docstrings, could use more inline comments"
        },
        {
            "name": "Efficiency & Best Practices",
            "points": 12,
            "max_points": 15,
            "feedback": "Generally efficient, could optimize recursive functions"
        },
        {
            "name": "Structure & Organization",
            "points": 7,
            "max_points": 10,
            "feedback": "Well organized with proper main guard"
        }
    ],
    "mistakes": {
        "recursion": "Factorial function could cause stack overflow for large numbers",
        "edge_cases": "Prime function doesn't handle negative numbers explicitly"
    }
}"""

@pytest.fixture
def mock_ai_response_document():
    """Mock AI response for document grading."""
    return """{
    "score": 85,
    "total": 100,
    "grading_feedback": "Well-structured analysis with clear sections and good coverage of key concepts. Could benefit from more detailed examples and deeper analysis.",
    "criteria_scores": [
        {
            "name": "Content Quality",
            "points": 35,
            "max_points": 40,
            "feedback": "Good coverage of ML algorithms with accurate information"
        },
        {
            "name": "Organization & Structure",
            "points": 22,
            "max_points": 25,
            "feedback": "Clear structure with logical flow and good use of headings"
        },
        {
            "name": "Analysis & Critical Thinking",
            "points": 16,
            "max_points": 20,
            "feedback": "Covers applications well, could include more critical analysis"
        },
        {
            "name": "Communication & Clarity",
            "points": 12,
            "max_points": 15,
            "feedback": "Clear writing style, could be more detailed in explanations"
        }
    ]
}"""

# Configure pytest
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    ) 