import pytest
from unittest.mock import Mock, patch

# Import prompt modules
import sys
sys.path.append('../prompts')
from code_grading_prompt import get_code_grading_prompt, get_enhanced_general_prompt
from grading_prompt import get_grading_prompt
from answer_key_prompt import get_answer_key_prompt


class TestCodeGradingPrompts:
    """Test cases for code grading prompt generation."""
    
    def test_get_code_grading_prompt_python(self):
        """Test code grading prompt for Python submissions."""
        submission = """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
"""
        
        rubric = {
            "criteria": [
                {"name": "Correctness", "max_points": 30, "description": "Code works correctly"},
                {"name": "Style", "max_points": 20, "description": "Follows Python style guidelines"}
            ],
            "total_points": 50
        }
        
        file_metadata = {
            "language": "python",
            "functions": [{"name": "factorial", "line_start": 2, "line_end": 5}],
            "has_main": True,
            "imports": []
        }
        
        prompt = get_code_grading_prompt(
            submission=submission,
            rubric=rubric,
            file_metadata=file_metadata,
            strictness_level=3
        )
        
        assert isinstance(prompt, str)
        assert len(prompt) > 100
        assert "python" in prompt.lower()
        assert "factorial" in prompt
        assert "correctness" in prompt.lower()
        assert "style" in prompt.lower()
        assert "pep 8" in prompt.lower()  # Should mention Python style guide
    
    def test_get_code_grading_prompt_java(self):
        """Test code grading prompt for Java submissions."""
        submission = """
public class Calculator {
    public static int add(int a, int b) {
        return a + b;
    }
    
    public static void main(String[] args) {
        System.out.println(add(2, 3));
    }
}
"""
        
        rubric = {
            "criteria": [
                {"name": "Functionality", "max_points": 40},
                {"name": "Code Quality", "max_points": 30}
            ],
            "total_points": 70
        }
        
        file_metadata = {
            "language": "java",
            "class_count": 1,
            "method_count": 2,
            "has_main_method": True
        }
        
        prompt = get_code_grading_prompt(
            submission=submission,
            rubric=rubric,
            file_metadata=file_metadata,
            strictness_level=4
        )
        
        assert "java" in prompt.lower()
        assert "calculator" in prompt
        assert "google java style" in prompt.lower()  # Should mention Java style guide
        assert "functionality" in prompt.lower()
    
    def test_get_code_grading_prompt_cpp(self):
        """Test code grading prompt for C++ submissions."""
        submission = """
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    for (int num : numbers) {
        std::cout << num << " ";
    }
    return 0;
}
"""
        
        rubric = {
            "criteria": [{"name": "Implementation", "max_points": 50}],
            "total_points": 50
        }
        
        file_metadata = {
            "language": "cpp",
            "include_count": 2,
            "function_count": 1,
            "has_main_function": True
        }
        
        prompt = get_code_grading_prompt(
            submission=submission,
            rubric=rubric,
            file_metadata=file_metadata,
            strictness_level=2
        )
        
        assert "c++" in prompt.lower()
        assert "google c++ style" in prompt.lower()
        assert "iostream" in prompt
        assert "vector" in prompt
    
    def test_get_code_grading_prompt_javascript(self):
        """Test code grading prompt for JavaScript submissions."""
        submission = """
function calculateSum(arr) {
    return arr.reduce((sum, num) => sum + num, 0);
}

const numbers = [1, 2, 3, 4, 5];
console.log(calculateSum(numbers));
"""
        
        rubric = {
            "criteria": [{"name": "Logic", "max_points": 25}],
            "total_points": 25
        }
        
        file_metadata = {
            "language": "javascript",
            "function_count": 1,
            "uses_modern_syntax": True
        }
        
        prompt = get_code_grading_prompt(
            submission=submission,
            rubric=rubric,
            file_metadata=file_metadata,
            strictness_level=1
        )
        
        assert "javascript" in prompt.lower()
        assert "calculatesum" in prompt
        assert "airbnb javascript style" in prompt.lower()
    
    def test_get_code_grading_prompt_with_empty_metadata(self):
        """Test code grading prompt with minimal metadata."""
        submission = "print('hello world')"
        
        rubric = {
            "criteria": [{"name": "Basic Functionality", "max_points": 10}],
            "total_points": 10
        }
        
        file_metadata = {}  # Empty metadata
        
        prompt = get_code_grading_prompt(
            submission=submission,
            rubric=rubric,
            file_metadata=file_metadata,
            strictness_level=3
        )
        
        assert isinstance(prompt, str)
        assert len(prompt) > 50
        assert "basic functionality" in prompt.lower()
    
    def test_get_code_grading_prompt_strictness_levels(self):
        """Test that different strictness levels produce different prompts."""
        submission = "def test(): pass"
        rubric = {"criteria": [{"name": "Test", "max_points": 10}], "total_points": 10}
        file_metadata = {"language": "python"}
        
        prompts = {}
        for level in range(6):  # 0-5 strictness levels
            prompts[level] = get_code_grading_prompt(
                submission=submission,
                rubric=rubric,
                file_metadata=file_metadata,
                strictness_level=level
            )
        
        # Verify that prompts are different for different strictness levels
        assert len(set(prompts.values())) > 1  # At least some should be different
        
        # Higher strictness should mention stricter evaluation
        assert "strict" in prompts[5].lower() or "rigorous" in prompts[5].lower()


class TestEnhancedGeneralPrompts:
    """Test cases for enhanced general grading prompts."""
    
    def test_get_enhanced_general_prompt_document(self):
        """Test enhanced prompt for document submissions."""
        submission = """
        This is a comprehensive essay about machine learning algorithms.
        It covers supervised learning, unsupervised learning, and reinforcement learning.
        The essay discusses various applications and provides examples.
        """
        
        rubric = {
            "criteria": [
                {"name": "Content Quality", "max_points": 40},
                {"name": "Organization", "max_points": 30},
                {"name": "Writing Style", "max_points": 30}
            ],
            "total_points": 100
        }
        
        file_metadata = {
            "file_type": "document",
            "word_count": 250,
            "character_count": 1200,
            "language": "en"
        }
        
        prompt = get_enhanced_general_prompt(
            submission=submission,
            rubric=rubric,
            file_metadata=file_metadata,
            strictness_level=3
        )
        
        assert "document" in prompt.lower()
        assert "essay" in prompt or "writing" in prompt.lower()
        assert "content quality" in prompt.lower()
        assert "organization" in prompt.lower()
        assert str(file_metadata["word_count"]) in prompt
    
    def test_get_enhanced_general_prompt_data_csv(self):
        """Test enhanced prompt for CSV data submissions."""
        submission = """
        name,age,department,salary
        Alice,25,Engineering,75000
        Bob,30,Marketing,65000
        Charlie,35,Engineering,85000
        """
        
        rubric = {
            "criteria": [
                {"name": "Data Quality", "max_points": 50},
                {"name": "Analysis", "max_points": 50}
            ],
            "total_points": 100
        }
        
        file_metadata = {
            "file_type": "data",
            "format": "csv",
            "row_count": 4,
            "column_count": 4,
            "columns": ["name", "age", "department", "salary"]
        }
        
        prompt = get_enhanced_general_prompt(
            submission=submission,
            rubric=rubric,
            file_metadata=file_metadata,
            strictness_level=2
        )
        
        assert "csv" in prompt.lower()
        assert "data" in prompt.lower()
        assert "4 columns" in prompt or "4 rows" in prompt
        assert "alice" in prompt.lower()
    
    def test_get_enhanced_general_prompt_json_data(self):
        """Test enhanced prompt for JSON data submissions."""
        submission = """
        {
            "students": [
                {"name": "Alice", "grade": 85, "courses": ["Math", "Science"]},
                {"name": "Bob", "grade": 92, "courses": ["English", "History"]}
            ],
            "semester": "Fall 2023",
            "total_students": 2
        }
        """
        
        rubric = {
            "criteria": [{"name": "Data Structure", "max_points": 100}],
            "total_points": 100
        }
        
        file_metadata = {
            "file_type": "data",
            "format": "json",
            "valid_json": True,
            "top_level_keys": ["students", "semester", "total_students"]
        }
        
        prompt = get_enhanced_general_prompt(
            submission=submission,
            rubric=rubric,
            file_metadata=file_metadata,
            strictness_level=4
        )
        
        assert "json" in prompt.lower()
        assert "students" in prompt
        assert "valid_json" in prompt or "valid json" in prompt.lower()
    
    def test_get_enhanced_general_prompt_notebook(self):
        """Test enhanced prompt for notebook submissions."""
        submission = """
        # Data Analysis Notebook
        
        ## Import Libraries
        import pandas as pd
        import numpy as np
        
        ## Load Data
        data = pd.read_csv('dataset.csv')
        
        ## Analysis
        print(data.describe())
        """
        
        rubric = {
            "criteria": [
                {"name": "Code Quality", "max_points": 40},
                {"name": "Analysis", "max_points": 60}
            ],
            "total_points": 100
        }
        
        file_metadata = {
            "file_type": "notebook",
            "cell_count": 4,
            "code_cells": 3,
            "markdown_cells": 1
        }
        
        prompt = get_enhanced_general_prompt(
            submission=submission,
            rubric=rubric,
            file_metadata=file_metadata,
            strictness_level=3
        )
        
        assert "notebook" in prompt.lower()
        assert "cells" in prompt
        assert "pandas" in prompt or "data analysis" in prompt.lower()


class TestTraditionalGradingPrompts:
    """Test cases for traditional grading prompts."""
    
    def test_get_grading_prompt_basic(self):
        """Test basic grading prompt generation."""
        question_text = "What is the capital of France?"
        answer_key = "The capital of France is Paris."
        submission = "Paris is the capital of France."
        
        rubric = {
            "criteria": [{"name": "Accuracy", "max_points": 10}],
            "total_points": 10
        }
        
        prompt = get_grading_prompt(
            question_text=question_text,
            answer_key=answer_key,
            submission=submission,
            rubric=rubric,
            strictness_level=3
        )
        
        assert question_text in prompt
        assert answer_key in prompt
        assert submission in prompt
        assert "accuracy" in prompt.lower()
    
    def test_get_grading_prompt_with_multiple_criteria(self):
        """Test grading prompt with multiple criteria."""
        question_text = "Explain the process of photosynthesis."
        answer_key = "Photosynthesis is the process by which plants convert sunlight into energy..."
        submission = "Plants use sunlight to make food through photosynthesis..."
        
        rubric = {
            "criteria": [
                {"name": "Scientific Accuracy", "max_points": 50},
                {"name": "Completeness", "max_points": 30},
                {"name": "Clarity", "max_points": 20}
            ],
            "total_points": 100
        }
        
        prompt = get_grading_prompt(
            question_text=question_text,
            answer_key=answer_key,
            submission=submission,
            rubric=rubric,
            strictness_level=4
        )
        
        assert "scientific accuracy" in prompt.lower()
        assert "completeness" in prompt.lower()
        assert "clarity" in prompt.lower()
        assert "50" in prompt  # Max points for first criterion
    
    def test_get_answer_key_prompt(self):
        """Test answer key generation prompt."""
        question_text = """
        Write a Python function that calculates the factorial of a given number.
        The function should handle edge cases and be efficient.
        """
        
        prompt = get_answer_key_prompt(question_text)
        
        assert isinstance(prompt, str)
        assert len(prompt) > 100
        assert question_text in prompt
        assert "answer key" in prompt.lower() or "solution" in prompt.lower()
        assert "python" in prompt.lower()
        assert "factorial" in prompt.lower()


class TestPromptEdgeCases:
    """Test edge cases and error handling in prompt generation."""
    
    def test_empty_submission(self):
        """Test prompts with empty submissions."""
        prompt = get_code_grading_prompt(
            submission="",
            rubric={"criteria": [], "total_points": 10},
            file_metadata={},
            strictness_level=3
        )
        
        assert isinstance(prompt, str)
        assert len(prompt) > 0
    
    def test_very_long_submission(self):
        """Test prompts with very long submissions."""
        long_submission = "print('hello')\n" * 1000
        
        prompt = get_code_grading_prompt(
            submission=long_submission,
            rubric={"criteria": [{"name": "Test", "max_points": 10}], "total_points": 10},
            file_metadata={"language": "python"},
            strictness_level=2
        )
        
        assert isinstance(prompt, str)
        # Should handle long submissions gracefully
        assert len(prompt) > 100
    
    def test_special_characters_in_submission(self):
        """Test prompts with special characters."""
        submission = """
        def test():
            print("Hello 'world' with "quotes"")
            return {"key": "value", "number": 42}
        """
        
        prompt = get_code_grading_prompt(
            submission=submission,
            rubric={"criteria": [], "total_points": 10},
            file_metadata={},
            strictness_level=3
        )
        
        assert isinstance(prompt, str)
        assert "quotes" in prompt or "Hello" in prompt
    
    def test_invalid_strictness_level(self):
        """Test prompts with invalid strictness levels."""
        # Should handle out-of-range strictness levels gracefully
        for invalid_level in [-1, 10, 100]:
            prompt = get_code_grading_prompt(
                submission="test",
                rubric={"criteria": [], "total_points": 10},
                file_metadata={},
                strictness_level=invalid_level
            )
            
            assert isinstance(prompt, str)
            assert len(prompt) > 0
    
    def test_missing_rubric_criteria(self):
        """Test prompts with missing or malformed rubric."""
        prompt = get_enhanced_general_prompt(
            submission="test content",
            rubric={},  # Empty rubric
            file_metadata={"file_type": "document"},
            strictness_level=3
        )
        
        assert isinstance(prompt, str)
        assert len(prompt) > 0 