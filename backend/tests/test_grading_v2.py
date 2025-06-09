import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from grading_v2 import GradingService, GradingResult
from models.rubric import Rubric


class TestGradingResult:
    """Test cases for GradingResult class."""
    
    def test_grading_result_creation(self):
        """Test basic GradingResult creation."""
        result = GradingResult(
            student_name="John Doe",
            score=85.0,
            max_score=100.0,
            feedback="Good work overall",
            criteria_scores=[
                {"name": "Content", "points": 40, "max_points": 50, "feedback": "Good content"},
                {"name": "Organization", "points": 45, "max_points": 50, "feedback": "Well organized"}
            ],
            mistakes=[{"description": "Minor formatting issue"}]
        )
        
        assert result.student_name == "John Doe"
        assert result.score == 85.0
        assert result.max_score == 100.0
        assert result.percentage == 85.0
        assert result.grade_letter == "B"
        assert len(result.criteria_scores) == 2
        assert len(result.mistakes) == 1
    
    def test_percentage_calculation(self):
        """Test percentage calculation."""
        result = GradingResult("Student", 90, 100, "Good")
        assert result.percentage == 90.0
        
        result = GradingResult("Student", 0, 100, "Poor")
        assert result.percentage == 0.0
        
        result = GradingResult("Student", 100, 0, "Invalid")
        assert result.percentage == 0.0
    
    def test_grade_letter_assignment(self):
        """Test grade letter assignment based on percentage."""
        test_cases = [
            (95, "A"), (90, "A"), (89, "B"), (85, "B"), (80, "B"),
            (79, "C"), (75, "C"), (70, "C"), (69, "D"), (60, "D"),
            (59, "F"), (0, "F")
        ]
        
        for score, expected_grade in test_cases:
            result = GradingResult("Student", score, 100, "Test")
            assert result.grade_letter == expected_grade
    
    def test_to_dict_conversion(self):
        """Test conversion to dictionary."""
        result = GradingResult(
            student_name="Jane Smith",
            score=78.5,
            max_score=100.0,
            feedback="Needs improvement",
            criteria_scores=[{"name": "Test", "points": 78.5, "max_points": 100}]
        )
        
        dict_result = result.to_dict()
        
        assert dict_result["student_name"] == "Jane Smith"
        assert dict_result["score"] == 78.5
        assert dict_result["percentage"] == 78.5
        assert dict_result["grade_letter"] == "C"
        assert "timestamp" in dict_result
    
    def test_from_dict_creation(self):
        """Test creation from dictionary."""
        data = {
            "student_name": "Test Student",
            "score": 92.0,
            "max_score": 100.0,
            "feedback": "Excellent work",
            "criteria_scores": [],
            "mistakes": [],
            "timestamp": "2023-01-01T12:00:00"
        }
        
        result = GradingResult.from_dict(data)
        
        assert result.student_name == "Test Student"
        assert result.score == 92.0
        assert result.grade_letter == "A"
        assert result.timestamp == "2023-01-01T12:00:00"


class TestGradingService:
    """Test cases for GradingService class."""
    
    @pytest.fixture
    def mock_genai(self):
        """Mock Google Generative AI."""
        with patch('grading_v2.genai') as mock:
            mock_model = Mock()
            mock.GenerativeModel.return_value = mock_model
            yield mock, mock_model
    
    @pytest.fixture
    def grading_service(self, mock_genai):
        """Create a GradingService instance for testing."""
        _, mock_model = mock_genai
        return GradingService("test_api_key")
    
    def test_grading_service_initialization(self, mock_genai):
        """Test GradingService initialization."""
        mock_genai_module, mock_model = mock_genai
        
        service = GradingService("test_api_key")
        
        mock_genai_module.configure.assert_called_once_with(api_key="test_api_key")
        mock_genai_module.GenerativeModel.assert_called_once_with("gemini-2.0-flash")
        assert service.max_retries == 3
        assert service.base_delay == 1
    
    def test_parse_grading_response_valid_json(self, grading_service):
        """Test parsing valid JSON response."""
        response = 'Some text before {"score": 85, "feedback": "Good work"} some text after'
        
        result = grading_service._parse_grading_response(response)
        
        assert result["score"] == 85
        assert result["feedback"] == "Good work"
    
    def test_parse_grading_response_no_json(self, grading_service):
        """Test parsing response with no JSON."""
        response = "This is just plain text with no JSON content"
        
        with pytest.raises(ValueError, match="No JSON content found"):
            grading_service._parse_grading_response(response)
    
    def test_parse_grading_response_invalid_json(self, grading_service):
        """Test parsing response with invalid JSON."""
        response = 'Some text {"score": 85, "feedback": "incomplete json'
        
        with pytest.raises(json.JSONDecodeError):
            grading_service._parse_grading_response(response)
    
    @patch('grading_v2.time.sleep')
    def test_handle_rate_limit(self, mock_sleep, grading_service):
        """Test rate limit handling."""
        error_message = "Rate limit exceeded. Please try again later."
        
        delay = grading_service._handle_rate_limit(0, error_message)
        
        assert delay >= 1
        mock_sleep.assert_called_once()
    
    @patch('grading_v2.time.sleep')
    def test_handle_rate_limit_with_suggested_delay(self, mock_sleep, grading_service):
        """Test rate limit handling with suggested delay in error message."""
        error_message = "Rate limit exceeded. retry_delay { seconds: 30 }"
        
        delay = grading_service._handle_rate_limit(0, error_message)
        
        assert delay == 30
        mock_sleep.assert_called_once_with(30)
    
    def test_make_api_call_with_retry_success(self, grading_service, mock_genai):
        """Test successful API call without retries."""
        _, mock_model = mock_genai
        mock_response = Mock()
        mock_response.text = "Response text"
        mock_model.generate_content.return_value = mock_response
        
        result = grading_service._make_api_call_with_retry("test prompt")
        
        assert result == "Response text"
        mock_model.generate_content.assert_called_once_with("test prompt")
    
    @patch('grading_v2.time.sleep')
    def test_make_api_call_with_retry_rate_limit(self, mock_sleep, grading_service, mock_genai):
        """Test API call with rate limit retry."""
        _, mock_model = mock_genai
        mock_response = Mock()
        mock_response.text = "Success response"
        
        # First call raises rate limit error, second succeeds
        mock_model.generate_content.side_effect = [
            Exception("429 Rate limit exceeded"),
            mock_response
        ]
        
        result = grading_service._make_api_call_with_retry("test prompt")
        
        assert result == "Success response"
        assert mock_model.generate_content.call_count == 2
        mock_sleep.assert_called_once()
    
    def test_make_api_call_with_retry_non_rate_limit_error(self, grading_service, mock_genai):
        """Test API call with non-rate-limit error."""
        _, mock_model = mock_genai
        mock_model.generate_content.side_effect = Exception("Server error")
        
        with pytest.raises(Exception, match="Server error"):
            grading_service._make_api_call_with_retry("test prompt")
    
    @patch('grading_v2.get_grading_prompt')
    def test_grade_submission_success(self, mock_get_prompt, grading_service, mock_genai):
        """Test successful submission grading."""
        _, mock_model = mock_genai
        
        # Mock the prompt generation
        mock_get_prompt.return_value = "Generated prompt"
        
        # Mock the API response
        mock_response = Mock()
        mock_response.text = 'Response with {"score": 88, "total": 100, "grading_feedback": "Good work", "mistakes": {"error1": "Minor issue"}}'
        mock_model.generate_content.return_value = mock_response
        
        result = grading_service.grade_submission(
            submission_text="Student answer",
            question_text="What is 2+2?",
            answer_key="4",
            student_name="John Doe"
        )
        
        assert result["student_name"] == "John Doe"
        assert result["score"] == 88.0
        assert result["max_score"] == 100.0
        assert result["feedback"] == "Good work"
        assert len(result["mistakes"]) == 1
    
    @patch('grading_v2.get_code_grading_prompt')
    def test_grade_code_submission_python(self, mock_get_prompt, grading_service, mock_genai):
        """Test Python code submission grading."""
        _, mock_model = mock_genai
        
        mock_get_prompt.return_value = "Code grading prompt"
        mock_response = Mock()
        mock_response.text = '{"score": 92, "total": 100, "grading_feedback": "Well-written Python code", "criteria_scores": []}'
        mock_model.generate_content.return_value = mock_response
        
        file_metadata = {
            "language": "python",
            "functions": [{"name": "calculate", "line_start": 1, "line_end": 5}],
            "classes": [],
            "imports": [{"module": "math", "line": 1}]
        }
        
        result = grading_service.grade_code_submission(
            submission_text="def calculate(x): return x * 2",
            file_metadata=file_metadata,
            student_name="Alice"
        )
        
        assert result["student_name"] == "Alice"
        assert result["score"] == 92
        mock_get_prompt.assert_called_once()
    
    @patch('grading_v2.get_enhanced_general_prompt')
    def test_grade_enhanced_submission(self, mock_get_prompt, grading_service, mock_genai):
        """Test enhanced submission grading."""
        _, mock_model = mock_genai
        
        mock_get_prompt.return_value = "Enhanced grading prompt"
        mock_response = Mock()
        mock_response.text = '{"score": 85, "total": 100, "grading_feedback": "Good document analysis"}'
        mock_model.generate_content.return_value = mock_response
        
        file_metadata = {
            "file_type": "document",
            "word_count": 500,
            "language": "en"
        }
        
        result = grading_service.grade_enhanced_submission(
            submission_text="This is a comprehensive essay about algorithms...",
            file_metadata=file_metadata,
            student_name="Bob"
        )
        
        assert result["student_name"] == "Bob"
        assert result["score"] == 85
        mock_get_prompt.assert_called_once()
    
    def test_get_default_code_rubric(self, grading_service):
        """Test default code rubric generation."""
        rubric = grading_service._get_default_code_rubric()
        
        assert "criteria" in rubric
        assert "total_points" in rubric
        assert rubric["total_points"] == 100
        assert len(rubric["criteria"]) == 5
        
        criteria_names = [c["name"] for c in rubric["criteria"]]
        assert "Correctness & Functionality" in criteria_names
        assert "Code Quality & Style" in criteria_names
        assert "Documentation & Comments" in criteria_names
    
    def test_get_default_general_rubric(self, grading_service):
        """Test default general rubric generation."""
        rubric = grading_service._get_default_general_rubric()
        
        assert "criteria" in rubric
        assert "total_points" in rubric
        assert rubric["total_points"] == 100
        assert len(rubric["criteria"]) == 4
        
        criteria_names = [c["name"] for c in rubric["criteria"]]
        assert "Content Quality" in criteria_names
        assert "Organization & Structure" in criteria_names
        assert "Analysis & Critical Thinking" in criteria_names
    
    def test_batch_grade_multiple_submissions(self, grading_service):
        """Test batch grading of multiple submissions."""
        with patch.object(grading_service, 'grade_submission') as mock_grade:
            mock_grade.return_value = {
                "student_name": "Student",
                "score": 80,
                "max_score": 100,
                "feedback": "Good work"
            }
            
            submissions = {
                "Alice": "Answer 1",
                "Bob": "Answer 2",
                "Charlie": "Answer 3"
            }
            
            results = grading_service.batch_grade(
                submissions=submissions,
                question_text="Test question",
                answer_key="Test answer"
            )
            
            assert len(results) == 3
            assert "Alice" in results
            assert "Bob" in results
            assert "Charlie" in results
            assert mock_grade.call_count == 3
    
    def test_batch_grade_with_empty_submission(self, grading_service):
        """Test batch grading with empty submissions."""
        submissions = {
            "Alice": "Good answer",
            "Bob": "",  # Empty submission
            "Charlie": "   "  # Whitespace only
        }
        
        with patch.object(grading_service, 'grade_submission') as mock_grade:
            mock_grade.return_value = {"score": 80}
            
            with patch.object(grading_service, '_create_error_result') as mock_error:
                mock_error.return_value = {"score": 0, "error": "Empty submission"}
                
                results = grading_service.batch_grade(
                    submissions=submissions,
                    question_text="Test question",
                    answer_key="Test answer"
                )
                
                assert len(results) == 3
                mock_grade.assert_called_once()  # Only called for Alice
                assert mock_error.call_count == 2  # Called for Bob and Charlie
    
    def test_error_handling_in_code_grading(self, grading_service, mock_genai):
        """Test error handling in code grading."""
        _, mock_model = mock_genai
        mock_model.generate_content.side_effect = Exception("API Error")
        
        result = grading_service.grade_code_submission(
            submission_text="def test(): pass",
            file_metadata={"language": "python"},
            student_name="TestStudent"
        )
        
        assert result["student_name"] == "TestStudent"
        assert result["score"] == 0
        assert "Error occurred during code grading" in result["feedback"]
    
    def test_error_handling_in_enhanced_grading(self, grading_service, mock_genai):
        """Test error handling in enhanced grading."""
        _, mock_model = mock_genai
        mock_model.generate_content.side_effect = Exception("API Error")
        
        result = grading_service.grade_enhanced_submission(
            submission_text="Document content",
            file_metadata={"file_type": "document"},
            student_name="TestStudent"
        )
        
        assert result["student_name"] == "TestStudent"
        assert result["score"] == 0
        assert "Error occurred during enhanced grading" in result["feedback"]
    
    def test_strictness_level_conversion(self, grading_service):
        """Test strictness level conversion from float to integer."""
        with patch.object(grading_service, '_make_api_call_with_retry') as mock_api:
            mock_api.return_value = '{"score": 80}'
            
            with patch('grading_v2.get_code_grading_prompt') as mock_prompt:
                mock_prompt.return_value = "prompt"
                
                grading_service.grade_code_submission(
                    submission_text="code",
                    file_metadata={},
                    strictness=0.8
                )
                
                # Verify strictness was converted to integer (0.8 * 5 = 4)
                mock_prompt.assert_called_once()
                args = mock_prompt.call_args[1]
                assert args['strictness_level'] == 4
    
    def test_rubric_handling_with_rubric_object(self, grading_service):
        """Test grading with Rubric object instead of dictionary."""
        rubric = Rubric.create_default()
        
        with patch.object(grading_service, '_make_api_call_with_retry') as mock_api:
            mock_api.return_value = '{"score": 85}'
            
            with patch('grading_v2.get_code_grading_prompt') as mock_prompt:
                mock_prompt.return_value = "prompt"
                
                result = grading_service.grade_code_submission(
                    submission_text="code",
                    file_metadata={},
                    rubric=rubric
                )
                
                mock_prompt.assert_called_once()
                # Should have called to_grading_dict() on the rubric
                assert result is not None
    
    @patch('grading_v2.logger')
    def test_logging_in_error_scenarios(self, mock_logger, grading_service, mock_genai):
        """Test that appropriate logging occurs during errors."""
        _, mock_model = mock_genai
        mock_model.generate_content.side_effect = Exception("Test error")
        
        grading_service.grade_code_submission(
            submission_text="code",
            file_metadata={}
        )
        
        mock_logger.error.assert_called()
        error_call = mock_logger.error.call_args[0][0]
        assert "Error grading code submission" in error_call 