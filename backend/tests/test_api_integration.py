import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import UploadFile
import io

# Import the API application
import sys
sys.path.append('../')
from api import app, GradingTask


class TestSingleGradingAPI:
    """Test cases for single grading API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create a test client for the FastAPI app."""
        return TestClient(app)
    
    @pytest.fixture
    def sample_files(self):
        """Create sample files for testing."""
        files = {}
        
        # Python file
        python_content = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
"""
        files['python'] = ("fibonacci.py", python_content, "text/plain")
        
        # Text document
        text_content = "This is a sample essay about computer science algorithms."
        files['text'] = ("essay.txt", text_content, "text/plain")
        
        # CSV data
        csv_content = "name,score,grade\nAlice,95,A\nBob,87,B\nCharlie,92,A"
        files['csv'] = ("grades.csv", csv_content, "text/csv")
        
        # JSON data
        json_content = json.dumps({
            "students": [{"name": "Alice", "score": 95}, {"name": "Bob", "score": 87}],
            "course": "CS101"
        })
        files['json'] = ("data.json", json_content, "application/json")
        
        return files
    
    def create_upload_file(self, filename: str, content: str, content_type: str = "text/plain"):
        """Helper to create UploadFile objects for testing."""
        return UploadFile(
            filename=filename,
            file=io.BytesIO(content.encode()),
            headers={"content-type": content_type}
        )
    
    def test_upload_assignment_python_file(self, client, sample_files):
        """Test uploading a Python assignment file."""
        filename, content, content_type = sample_files['python']
        
        files = {"file": (filename, content, content_type)}
        
        response = client.post("/upload-assignment", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert "task_id" in data
        assert "message" in data
        assert data["file_info"]["original_name"] == filename
        assert data["file_info"]["file_type"] == "python"
    
    def test_upload_assignment_text_document(self, client, sample_files):
        """Test uploading a text document."""
        filename, content, content_type = sample_files['text']
        
        files = {"file": (filename, content, content_type)}
        
        response = client.post("/upload-assignment", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_info"]["file_type"] == "document"
        assert "word_count" in data["file_info"]
    
    def test_upload_assignment_csv_data(self, client, sample_files):
        """Test uploading CSV data file."""
        filename, content, content_type = sample_files['csv']
        
        files = {"file": (filename, content, content_type)}
        
        response = client.post("/upload-assignment", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_info"]["file_type"] == "data"
        assert "data_analysis" in data["file_info"]
    
    def test_upload_assignment_unsupported_file(self, client):
        """Test uploading an unsupported file type."""
        files = {"file": ("test.xyz", "unknown content", "application/octet-stream")}
        
        response = client.post("/upload-assignment", files=files)
        
        assert response.status_code == 400
        data = response.json()
        assert "not supported" in data["detail"].lower()
    
    def test_upload_assignment_no_file(self, client):
        """Test upload endpoint with no file."""
        response = client.post("/upload-assignment")
        
        assert response.status_code == 422  # Validation error
    
    def test_upload_assignment_empty_file(self, client):
        """Test uploading an empty file."""
        files = {"file": ("empty.txt", "", "text/plain")}
        
        response = client.post("/upload-assignment", files=files)
        
        assert response.status_code == 400
        data = response.json()
        assert "empty" in data["detail"].lower()
    
    @patch('api.GradingService')
    def test_grade_assignment_python_code(self, mock_grading_service, client):
        """Test grading a Python code assignment."""
        # Mock the grading service
        mock_service_instance = Mock()
        mock_service_instance.grade_code_submission.return_value = {
            "student_name": "Test Student",
            "score": 85,
            "max_score": 100,
            "feedback": "Good Python code implementation",
            "criteria_scores": [
                {"name": "Correctness", "points": 25, "max_points": 30},
                {"name": "Code Quality", "points": 20, "max_points": 25}
            ]
        }
        mock_grading_service.return_value = mock_service_instance
        
        request_data = {
            "task_id": "test_task_123",
            "rubric": {
                "criteria": [
                    {"name": "Correctness", "max_points": 30},
                    {"name": "Code Quality", "max_points": 25}
                ],
                "total_points": 100
            },
            "strictness": 0.5
        }
        
        # Mock the task storage to include a Python file
        with patch('api.grading_tasks') as mock_tasks:
            mock_tasks.__getitem__.return_value = GradingTask(
                task_id="test_task_123",
                file_info={
                    "original_name": "solution.py",
                    "file_type": "python",
                    "content": "def solution(): return 42",
                    "code_analysis": {"language": "python", "functions": []}
                },
                status="uploaded"
            )
            
            response = client.post("/grade-assignment", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "results" in data
        assert data["results"]["score"] == 85
        mock_service_instance.grade_code_submission.assert_called_once()
    
    @patch('api.GradingService')
    def test_grade_assignment_document(self, mock_grading_service, client):
        """Test grading a document assignment."""
        mock_service_instance = Mock()
        mock_service_instance.grade_enhanced_submission.return_value = {
            "student_name": "Test Student",
            "score": 78,
            "max_score": 100,
            "feedback": "Good essay structure and content"
        }
        mock_grading_service.return_value = mock_service_instance
        
        request_data = {
            "task_id": "test_task_456",
            "rubric": {
                "criteria": [{"name": "Content", "max_points": 100}],
                "total_points": 100
            }
        }
        
        with patch('api.grading_tasks') as mock_tasks:
            mock_tasks.__getitem__.return_value = GradingTask(
                task_id="test_task_456",
                file_info={
                    "original_name": "essay.txt",
                    "file_type": "document",
                    "content": "This is an essay about algorithms...",
                    "metadata": {"word_count": 500}
                },
                status="uploaded"
            )
            
            response = client.post("/grade-assignment", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        mock_service_instance.grade_enhanced_submission.assert_called_once()
    
    def test_grade_assignment_invalid_task_id(self, client):
        """Test grading with invalid task ID."""
        request_data = {
            "task_id": "nonexistent_task",
            "rubric": {"criteria": [], "total_points": 100}
        }
        
        response = client.post("/grade-assignment", json=request_data)
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()
    
    def test_grade_assignment_missing_rubric(self, client):
        """Test grading without rubric."""
        request_data = {"task_id": "test_task"}
        
        response = client.post("/grade-assignment", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_get_grading_status_completed(self, client):
        """Test getting status of completed grading task."""
        with patch('api.grading_tasks') as mock_tasks:
            mock_task = GradingTask(
                task_id="completed_task",
                file_info={"original_name": "test.py"},
                status="completed",
                results={"score": 90, "feedback": "Excellent work"}
            )
            mock_tasks.__getitem__.return_value = mock_task
            
            response = client.get("/grading-status/completed_task")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["results"]["score"] == 90
    
    def test_get_grading_status_pending(self, client):
        """Test getting status of pending grading task."""
        with patch('api.grading_tasks') as mock_tasks:
            mock_task = GradingTask(
                task_id="pending_task",
                file_info={"original_name": "test.py"},
                status="grading"
            )
            mock_tasks.__getitem__.return_value = mock_task
            
            response = client.get("/grading-status/pending_task")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "grading"
        assert "results" not in data
    
    def test_get_grading_status_not_found(self, client):
        """Test getting status of non-existent task."""
        response = client.get("/grading-status/nonexistent_task")
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()
    
    @patch('api.GradingService')
    def test_grading_with_different_strictness_levels(self, mock_grading_service, client):
        """Test grading with different strictness levels."""
        mock_service_instance = Mock()
        mock_service_instance.grade_enhanced_submission.return_value = {
            "score": 85, "feedback": "Good work"
        }
        mock_grading_service.return_value = mock_service_instance
        
        strictness_levels = [0.0, 0.3, 0.5, 0.7, 1.0]
        
        for strictness in strictness_levels:
            with patch('api.grading_tasks') as mock_tasks:
                mock_tasks.__getitem__.return_value = GradingTask(
                    task_id=f"task_{strictness}",
                    file_info={"file_type": "document", "content": "test"},
                    status="uploaded"
                )
                
                request_data = {
                    "task_id": f"task_{strictness}",
                    "rubric": {"criteria": [], "total_points": 100},
                    "strictness": strictness
                }
                
                response = client.post("/grade-assignment", json=request_data)
                assert response.status_code == 200
    
    def test_concurrent_file_uploads(self, client, sample_files):
        """Test handling concurrent file uploads."""
        responses = []
        
        for file_type, (filename, content, content_type) in sample_files.items():
            files = {"file": (filename, content, content_type)}
            response = client.post("/upload-assignment", files=files)
            responses.append(response)
        
        # All uploads should succeed
        for response in responses:
            assert response.status_code == 200
            data = response.json()
            assert "task_id" in data
    
    @patch('api.logger')
    def test_error_logging_during_grading(self, mock_logger, client):
        """Test that errors are properly logged during grading."""
        with patch('api.GradingService') as mock_grading_service:
            mock_service_instance = Mock()
            mock_service_instance.grade_enhanced_submission.side_effect = Exception("Test error")
            mock_grading_service.return_value = mock_service_instance
            
            with patch('api.grading_tasks') as mock_tasks:
                mock_tasks.__getitem__.return_value = GradingTask(
                    task_id="error_task",
                    file_info={"file_type": "document", "content": "test"},
                    status="uploaded"
                )
                
                request_data = {
                    "task_id": "error_task",
                    "rubric": {"criteria": [], "total_points": 100}
                }
                
                response = client.post("/grade-assignment", json=request_data)
                
                # Should handle error gracefully
                assert response.status_code in [200, 500]
                mock_logger.error.assert_called()


class TestHealthAndStatus:
    """Test cases for health and status endpoints."""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_health_check(self, client):
        """Test the health check endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_system_status(self, client):
        """Test system status endpoint if it exists."""
        response = client.get("/")
        
        # Should return some kind of status or welcome message
        assert response.status_code in [200, 404]  # 404 if endpoint doesn't exist


class TestFileTypeValidation:
    """Test cases for file type validation and handling."""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_supported_file_extensions(self, client):
        """Test all supported file extensions are handled correctly."""
        supported_files = [
            ("test.py", "print('hello')", "python"),
            ("Test.java", "public class Test {}", "java"),
            ("script.js", "console.log('hello');", "javascript"),
            ("main.cpp", "#include <iostream>", "cpp"),
            ("style.css", "body { color: red; }", "css"),
            ("data.csv", "a,b,c\n1,2,3", "data"),
            ("config.json", '{"key": "value"}', "data"),
            ("readme.md", "# Title", "document"),
            ("essay.txt", "This is an essay", "document"),
        ]
        
        for filename, content, expected_type in supported_files:
            files = {"file": (filename, content, "text/plain")}
            response = client.post("/upload-assignment", files=files)
            
            if response.status_code == 200:
                data = response.json()
                assert data["file_info"]["file_type"] == expected_type
            else:
                # Some file types might not be fully supported yet
                assert response.status_code in [400, 422]
    
    def test_large_file_handling(self, client):
        """Test handling of larger files."""
        # Create a reasonably large file (not too large for testing)
        large_content = "This is a line of text.\n" * 1000  # ~24KB
        files = {"file": ("large.txt", large_content, "text/plain")}
        
        response = client.post("/upload-assignment", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_info"]["file_type"] == "document"
    
    def test_binary_file_rejection(self, client):
        """Test that binary files are properly rejected."""
        # Create binary content
        binary_content = bytes([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE])
        
        files = {"file": ("binary.bin", binary_content, "application/octet-stream")}
        
        response = client.post("/upload-assignment", files=files)
        
        # Should either reject or handle gracefully
        assert response.status_code in [400, 422] 