import pytest
import tempfile
import json
import zipfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import io

# Import all the components we need to test
from enhanced_file_processor import EnhancedFileProcessor
from grading_v2 import GradingService, GradingResult
from models.rubric import Rubric


class TestSingleGradingWorkflow:
    """End-to-end regression tests for the complete single grading workflow."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for test files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)
    
    @pytest.fixture
    def file_processor(self):
        """Create file processor instance."""
        return EnhancedFileProcessor()
    
    @pytest.fixture
    def grading_service(self):
        """Create mocked grading service."""
        with patch('grading_v2.genai') as mock_genai:
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            service = GradingService("test_api_key")
            yield service, mock_model
    
    def create_test_file(self, temp_dir: Path, filename: str, content: str) -> Path:
        """Helper to create test files."""
        file_path = temp_dir / filename
        file_path.write_text(content, encoding='utf-8')
        return file_path
    
    def test_complete_python_grading_workflow(self, temp_dir, file_processor, grading_service):
        """Test complete workflow: Python file upload → processing → grading."""
        service, mock_model = grading_service
        
        # Step 1: Create Python assignment
        python_code = """
def bubble_sort(arr):
    '''Bubble sort implementation with optimization'''
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

# Test the function
test_array = [64, 34, 25, 12, 22, 11, 90]
sorted_array = bubble_sort(test_array.copy())
print(f"Original: {test_array}")
print(f"Sorted: {sorted_array}")
"""
        py_file = self.create_test_file(temp_dir, "bubble_sort.py", python_code)
        
        # Step 2: Process the file with enhanced file processor
        file_result = file_processor.process_file(py_file)
        
        # Verify file processing
        assert file_result["file_type"] == "python"
        assert file_result["content"] == python_code
        assert "code_analysis" in file_result
        assert len(file_result["code_analysis"]["functions"]) == 1
        assert file_result["code_analysis"]["functions"][0]["name"] == "bubble_sort"
        assert file_result["code_analysis"]["has_main"] is True
        
        # Step 3: Mock AI grading response
        mock_ai_response = """
        {
            "score": 85,
            "total": 100,
            "grading_feedback": "Good implementation of bubble sort with optimization. Code is well-documented and includes test cases. Minor improvements could be made in variable naming.",
            "criteria_scores": [
                {
                    "name": "Correctness & Functionality",
                    "points": 28,
                    "max_points": 30,
                    "feedback": "Algorithm is correctly implemented with proper optimization"
                },
                {
                    "name": "Code Quality & Style",
                    "points": 22,
                    "max_points": 25,
                    "feedback": "Good variable names and structure, follows Python conventions"
                },
                {
                    "name": "Documentation & Comments",
                    "points": 18,
                    "max_points": 20,
                    "feedback": "Has docstring and comments, could be more detailed"
                },
                {
                    "name": "Efficiency & Best Practices",
                    "points": 12,
                    "max_points": 15,
                    "feedback": "Includes optimization flag, good practice"
                },
                {
                    "name": "Structure & Organization",
                    "points": 5,
                    "max_points": 10,
                    "feedback": "Well organized with test cases"
                }
            ],
            "mistakes": {
                "minor1": "Consider using more descriptive variable names like 'array_length' instead of 'n'"
            }
        }
        """
        
        mock_response = Mock()
        mock_response.text = mock_ai_response
        mock_model.generate_content.return_value = mock_response
        
        # Step 4: Grade the code submission
        grading_result = service.grade_code_submission(
            submission_text=file_result["content"],
            file_metadata=file_result["code_analysis"],
            student_name="Test Student",
            strictness=0.5
        )
        
        # Step 5: Verify grading results
        assert grading_result["student_name"] == "Test Student"
        assert grading_result["score"] == 85
        assert grading_result["max_score"] == 100
        assert "bubble sort" in grading_result["feedback"].lower()
        assert len(grading_result["criteria_scores"]) == 5
        assert grading_result["criteria_scores"][0]["name"] == "Correctness & Functionality"
        assert grading_result["criteria_scores"][0]["points"] == 28
    
    def test_complete_document_grading_workflow(self, temp_dir, file_processor, grading_service):
        """Test complete workflow: Document upload → processing → grading."""
        service, mock_model = grading_service
        
        # Step 1: Create academic document
        essay_content = """
        Machine Learning in Healthcare: A Comprehensive Analysis
        
        Introduction
        Machine learning has revolutionized numerous industries, with healthcare being one of the most promising domains for its application. This essay examines the current applications, benefits, and challenges of implementing machine learning technologies in healthcare systems.
        
        Current Applications
        Machine learning is currently being used in various healthcare applications including diagnostic imaging, drug discovery, personalized treatment plans, and predictive analytics. For instance, deep learning algorithms have shown remarkable success in analyzing medical images such as X-rays, MRIs, and CT scans, often achieving accuracy rates comparable to or exceeding those of human radiologists.
        
        Benefits and Advantages
        The implementation of machine learning in healthcare offers several significant advantages. First, it can improve diagnostic accuracy by analyzing vast amounts of data and identifying patterns that might be missed by human analysis. Second, it enables personalized medicine by considering individual patient characteristics and medical history. Third, it can reduce healthcare costs by streamlining processes and reducing the need for redundant tests.
        
        Challenges and Limitations
        Despite its potential, machine learning in healthcare faces several challenges. Data privacy and security concerns are paramount, as medical data is highly sensitive. Additionally, the lack of standardized data formats across different healthcare systems creates interoperability issues. There are also concerns about algorithmic bias and the need for regulatory frameworks to ensure safe implementation.
        
        Conclusion
        Machine learning represents a transformative technology for healthcare, offering unprecedented opportunities to improve patient outcomes and reduce costs. However, successful implementation requires addressing significant challenges related to data privacy, standardization, and regulatory oversight. As these challenges are addressed, we can expect to see continued growth in the adoption of machine learning technologies across the healthcare industry.
        """
        
        doc_file = self.create_test_file(temp_dir, "ml_healthcare_essay.txt", essay_content)
        
        # Step 2: Process the document
        file_result = file_processor.process_file(doc_file)
        
        # Verify document processing
        assert file_result["file_type"] == "document"
        assert file_result["content"] == essay_content
        assert "metadata" in file_result
        assert file_result["metadata"]["word_count"] > 200
        assert file_result["metadata"]["character_count"] > 1000
        
        # Step 3: Mock AI response for document grading
        mock_ai_response = """
        {
            "score": 88,
            "total": 100,
            "grading_feedback": "Excellent essay that demonstrates comprehensive understanding of machine learning in healthcare. Well-structured with clear introduction, body, and conclusion. Good use of specific examples and balanced discussion of benefits and challenges.",
            "criteria_scores": [
                {
                    "name": "Content Quality",
                    "points": 36,
                    "max_points": 40,
                    "feedback": "Demonstrates deep understanding with specific examples and current applications"
                },
                {
                    "name": "Organization & Structure",
                    "points": 23,
                    "max_points": 25,
                    "feedback": "Clear structure with logical flow from introduction through conclusion"
                },
                {
                    "name": "Analysis & Critical Thinking",
                    "points": 17,
                    "max_points": 20,
                    "feedback": "Good analysis of both benefits and challenges, could include more critical evaluation"
                },
                {
                    "name": "Communication & Clarity",
                    "points": 12,
                    "max_points": 15,
                    "feedback": "Clear writing style, good use of examples, minor grammatical improvements needed"
                }
            ]
        }
        """
        
        mock_response = Mock()
        mock_response.text = mock_ai_response
        mock_model.generate_content.return_value = mock_response
        
        # Step 4: Grade the document
        grading_result = service.grade_enhanced_submission(
            submission_text=file_result["content"],
            file_metadata=file_result["metadata"],
            student_name="Jane Doe",
            strictness=0.6
        )
        
        # Step 5: Verify results
        assert grading_result["student_name"] == "Jane Doe"
        assert grading_result["score"] == 88
        assert "machine learning" in grading_result["feedback"].lower()
        assert len(grading_result["criteria_scores"]) == 4
    
    def test_complete_data_analysis_workflow(self, temp_dir, file_processor, grading_service):
        """Test complete workflow: Data file upload → processing → grading."""
        service, mock_model = grading_service
        
        # Step 1: Create CSV data file
        csv_data = """student_id,name,math_score,science_score,english_score,total_score
001,Alice Johnson,92,88,85,265
002,Bob Smith,78,82,90,250
003,Charlie Brown,95,91,87,273
004,Diana Prince,89,94,92,275
005,Edward Norton,76,79,83,238
006,Fiona Apple,93,89,88,270
007,George Washington,81,85,79,245
008,Helen Keller,90,92,94,276
009,Ivan Petrov,84,87,81,252
010,Julia Roberts,88,86,89,263"""
        
        csv_file = self.create_test_file(temp_dir, "student_grades.csv", csv_data)
        
        # Step 2: Process the data file
        file_result = file_processor.process_file(csv_file)
        
        # Verify data processing
        assert file_result["file_type"] == "data"
        assert file_result["content"] == csv_data
        assert "data_analysis" in file_result
        assert file_result["data_analysis"]["format"] == "csv"
        assert file_result["data_analysis"]["row_count"] == 11  # Including header
        assert file_result["data_analysis"]["column_count"] == 6
        
        # Step 3: Mock grading response
        mock_ai_response = """
        {
            "score": 92,
            "total": 100,
            "grading_feedback": "Excellent data submission with clean, well-structured CSV format. Data includes appropriate headers and consistent formatting. Good sample size with realistic grade distributions.",
            "criteria_scores": [
                {
                    "name": "Data Quality",
                    "points": 47,
                    "max_points": 50,
                    "feedback": "Clean data with consistent formatting and appropriate data types"
                },
                {
                    "name": "Analysis",
                    "points": 45,
                    "max_points": 50,
                    "feedback": "Good structure with clear column headers and meaningful data relationships"
                }
            ]
        }
        """
        
        mock_response = Mock()
        mock_response.text = mock_ai_response
        mock_model.generate_content.return_value = mock_response
        
        # Step 4: Grade the data submission
        grading_result = service.grade_enhanced_submission(
            submission_text=file_result["content"],
            file_metadata=file_result["data_analysis"],
            student_name="Data Analyst",
            strictness=0.4
        )
        
        # Step 5: Verify results
        assert grading_result["score"] == 92
        assert "csv" in grading_result["feedback"].lower()
        assert len(grading_result["criteria_scores"]) == 2
    
    def test_complete_archive_workflow(self, temp_dir, file_processor, grading_service):
        """Test complete workflow: ZIP archive → extraction → processing → grading."""
        service, mock_model = grading_service
        
        # Step 1: Create a ZIP archive with multiple files
        zip_path = temp_dir / "project.zip"
        with zipfile.ZipFile(zip_path, 'w') as zf:
            # Add Python main file
            main_py = """
def main():
    from calculator import Calculator
    calc = Calculator()
    print(f"2 + 3 = {calc.add(2, 3)}")
    print(f"10 - 4 = {calc.subtract(10, 4)}")

if __name__ == "__main__":
    main()
"""
            zf.writestr("main.py", main_py)
            
            # Add calculator module
            calc_py = """
class Calculator:
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b
    
    def multiply(self, a, b):
        return a * b
    
    def divide(self, a, b):
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
"""
            zf.writestr("calculator.py", calc_py)
            
            # Add README
            readme = """
# Calculator Project

This is a simple calculator implementation in Python.

## Files:
- main.py: Main application file
- calculator.py: Calculator class implementation

## Usage:
python main.py
"""
            zf.writestr("README.md", readme)
        
        # Step 2: Process the archive
        file_result = file_processor.process_file(zip_path)
        
        # Verify archive processing
        assert file_result["file_type"] == "archive"
        assert "archive_contents" in file_result
        assert len(file_result["archive_contents"]) == 3
        
        # Check that all files were processed
        file_names = [item["filename"] for item in file_result["archive_contents"]]
        assert "main.py" in file_names
        assert "calculator.py" in file_names
        assert "README.md" in file_names
        
        # Step 3: Mock grading response for project
        mock_ai_response = """
        {
            "score": 89,
            "total": 100,
            "grading_feedback": "Well-structured Python project with good modular design. Includes proper main function, separate calculator class, and documentation. Code is clean and follows Python conventions.",
            "criteria_scores": [
                {
                    "name": "Correctness & Functionality",
                    "points": 27,
                    "max_points": 30,
                    "feedback": "Calculator functions work correctly with proper error handling"
                },
                {
                    "name": "Code Quality & Style",
                    "points": 23,
                    "max_points": 25,
                    "feedback": "Clean code structure with good class design"
                },
                {
                    "name": "Documentation & Comments",
                    "points": 16,
                    "max_points": 20,
                    "feedback": "Includes README file, could use more inline comments"
                },
                {
                    "name": "Efficiency & Best Practices",
                    "points": 13,
                    "max_points": 15,
                    "feedback": "Good modular design and proper main guard"
                },
                {
                    "name": "Structure & Organization",
                    "points": 10,
                    "max_points": 10,
                    "feedback": "Excellent project structure with separate modules"
                }
            ]
        }
        """
        
        mock_response = Mock()
        mock_response.text = mock_ai_response
        mock_model.generate_content.return_value = mock_response
        
        # Step 4: Grade the project (simulate grading the main Python file)
        main_file_content = None
        for item in file_result["archive_contents"]:
            if item["filename"] == "main.py":
                main_file_content = item["content"]
                break
        
        assert main_file_content is not None
        
        grading_result = service.grade_code_submission(
            submission_text=main_file_content,
            file_metadata={"language": "python", "project_files": file_names},
            student_name="Project Student"
        )
        
        # Step 5: Verify results
        assert grading_result["score"] == 89
        assert "modular" in grading_result["feedback"].lower()
        assert len(grading_result["criteria_scores"]) == 5
    
    def test_error_handling_workflow(self, temp_dir, file_processor):
        """Test error handling throughout the workflow."""
        
        # Test 1: Unsupported file type
        unsupported_file = self.create_test_file(temp_dir, "test.unknown", "unknown content")
        result = file_processor.process_file(unsupported_file)
        assert result["file_type"] == "unsupported"
        assert "error" in result
        
        # Test 2: Empty file
        empty_file = self.create_test_file(temp_dir, "empty.txt", "")
        result = file_processor.process_file(empty_file)
        # Should handle gracefully
        assert "file_type" in result
        
        # Test 3: Corrupted archive
        fake_zip = self.create_test_file(temp_dir, "fake.zip", "not a real zip file")
        result = file_processor.process_file(fake_zip)
        # Should detect it's not a real archive and handle appropriately
        assert "error" in result or result["file_type"] != "archive"
    
    def test_performance_with_large_files(self, temp_dir, file_processor):
        """Test performance with reasonably large files."""
        
        # Create a larger Python file
        large_python_code = """
def fibonacci(n):
    '''Calculate fibonacci number using dynamic programming'''
    if n <= 1:
        return n
    
    dp = [0] * (n + 1)
    dp[1] = 1
    
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    
    return dp[n]

""" * 100  # Repeat to make it larger
        
        large_file = self.create_test_file(temp_dir, "large_fibonacci.py", large_python_code)
        
        # Should process without issues
        result = file_processor.process_file(large_file)
        assert result["file_type"] == "python"
        assert "code_analysis" in result
        assert len(result["content"]) > 10000
    
    def test_multiple_file_types_batch(self, temp_dir, file_processor):
        """Test processing multiple different file types in sequence."""
        
        # Create various file types
        test_files = {
            "script.py": ("print('Python script')", "python"),
            "document.txt": ("This is a text document", "document"),
            "data.csv": ("col1,col2\nval1,val2", "data"),
            "config.json": ('{"setting": "value"}', "data"),
            "style.css": ("body { color: red; }", "css"),
            "page.html": ("<html><body>Hello</body></html>", "html")
        }
        
        results = {}
        for filename, (content, expected_type) in test_files.items():
            file_path = self.create_test_file(temp_dir, filename, content)
            result = file_processor.process_file(file_path)
            results[filename] = result
            
            # Verify each file was processed correctly
            if expected_type != "unsupported":
                assert result["file_type"] == expected_type
            assert "content" in result
            assert result["content"] == content
        
        # Verify all files were processed
        assert len(results) == len(test_files)
    
    def test_rubric_integration_workflow(self, temp_dir, file_processor, grading_service):
        """Test workflow with custom rubric integration."""
        service, mock_model = grading_service
        
        # Create a custom rubric
        custom_rubric = Rubric(
            name="Custom Code Rubric",
            description="Custom rubric for code evaluation",
            criteria=[
                {"name": "Algorithm Efficiency", "max_points": 25, "description": "How efficient is the algorithm"},
                {"name": "Code Readability", "max_points": 25, "description": "How readable is the code"},
                {"name": "Error Handling", "max_points": 25, "description": "How well are errors handled"},
                {"name": "Testing", "max_points": 25, "description": "Quality of test cases"}
            ],
            total_points=100
        )
        
        # Create test file
        code = """
def safe_divide(a, b):
    try:
        if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
            raise TypeError("Arguments must be numbers")
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
    except Exception as e:
        print(f"Error: {e}")
        return None

# Test cases
test_cases = [
    (10, 2, 5.0),
    (10, 0, None),
    ("10", 2, None),
    (10.5, 2.5, 4.2)
]

for a, b, expected in test_cases:
    result = safe_divide(a, b)
    print(f"safe_divide({a}, {b}) = {result}, expected: {expected}")
"""
        
        py_file = self.create_test_file(temp_dir, "safe_divide.py", code)
        
        # Process file
        file_result = file_processor.process_file(py_file)
        
        # Mock grading with custom rubric
        mock_ai_response = """
        {
            "score": 95,
            "total": 100,
            "grading_feedback": "Excellent implementation with comprehensive error handling and thorough testing.",
            "criteria_scores": [
                {"name": "Algorithm Efficiency", "points": 23, "max_points": 25, "feedback": "Simple and efficient approach"},
                {"name": "Code Readability", "points": 25, "max_points": 25, "feedback": "Very clear and well-structured"},
                {"name": "Error Handling", "points": 25, "max_points": 25, "feedback": "Comprehensive error handling"},
                {"name": "Testing", "points": 22, "max_points": 25, "feedback": "Good test cases covering edge cases"}
            ]
        }
        """
        
        mock_response = Mock()
        mock_response.text = mock_ai_response
        mock_model.generate_content.return_value = mock_response
        
        # Grade with custom rubric
        grading_result = service.grade_code_submission(
            submission_text=file_result["content"],
            file_metadata=file_result["code_analysis"],
            student_name="Advanced Student",
            rubric=custom_rubric,
            strictness=0.7
        )
        
        # Verify custom rubric was used
        assert grading_result["score"] == 95
        assert len(grading_result["criteria_scores"]) == 4
        criteria_names = [c["name"] for c in grading_result["criteria_scores"]]
        assert "Algorithm Efficiency" in criteria_names
        assert "Error Handling" in criteria_names
        assert "Testing" in criteria_names 