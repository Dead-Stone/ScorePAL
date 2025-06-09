import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import json
import zipfile
import ast

from enhanced_file_processor import EnhancedFileProcessor, FileType


class TestEnhancedFileProcessor:
    """Test cases for EnhancedFileProcessor class."""
    
    @pytest.fixture
    def processor(self):
        """Create a processor instance for testing."""
        return EnhancedFileProcessor()
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)
    
    def create_test_file(self, temp_dir: Path, filename: str, content: str) -> Path:
        """Helper to create test files."""
        file_path = temp_dir / filename
        file_path.write_text(content, encoding='utf-8')
        return file_path
    
    def test_detect_file_type_python(self, processor, temp_dir):
        """Test Python file type detection."""
        py_file = self.create_test_file(temp_dir, "test.py", "print('hello')")
        file_type = processor._detect_file_type(py_file)
        assert file_type == FileType.PYTHON
    
    def test_detect_file_type_java(self, processor, temp_dir):
        """Test Java file type detection."""
        java_file = self.create_test_file(temp_dir, "Test.java", "public class Test {}")
        file_type = processor._detect_file_type(java_file)
        assert file_type == FileType.JAVA
    
    def test_detect_file_type_cpp(self, processor, temp_dir):
        """Test C++ file type detection."""
        cpp_file = self.create_test_file(temp_dir, "test.cpp", "#include <iostream>")
        file_type = processor._detect_file_type(cpp_file)
        assert file_type == FileType.CPP
    
    def test_detect_file_type_document(self, processor, temp_dir):
        """Test document file type detection."""
        txt_file = self.create_test_file(temp_dir, "test.txt", "This is a text document")
        file_type = processor._detect_file_type(txt_file)
        assert file_type == FileType.DOCUMENT
    
    def test_detect_file_type_data(self, processor, temp_dir):
        """Test data file type detection."""
        csv_file = self.create_test_file(temp_dir, "test.csv", "name,age\nJohn,25")
        file_type = processor._detect_file_type(csv_file)
        assert file_type == FileType.DATA
    
    def test_detect_file_type_unsupported(self, processor, temp_dir):
        """Test unsupported file type detection."""
        unknown_file = self.create_test_file(temp_dir, "test.xyz", "unknown content")
        file_type = processor._detect_file_type(unknown_file)
        assert file_type == FileType.UNSUPPORTED
    
    def test_analyze_python_code_simple(self, processor, temp_dir):
        """Test Python code analysis with simple code."""
        code = """
def hello_world():
    print("Hello, World!")
    return "success"

if __name__ == "__main__":
    hello_world()
"""
        py_file = self.create_test_file(temp_dir, "simple.py", code)
        analysis = processor._analyze_python_code(code, py_file)
        
        assert "functions" in analysis
        assert len(analysis["functions"]) == 1
        assert analysis["functions"][0]["name"] == "hello_world"
        assert analysis["has_main"] is True
        assert analysis["line_count"] == 7
    
    def test_analyze_python_code_with_class(self, processor, temp_dir):
        """Test Python code analysis with classes."""
        code = """
class Calculator:
    def __init__(self):
        self.result = 0
    
    def add(self, x, y):
        return x + y
    
    def multiply(self, x, y):
        return x * y

calc = Calculator()
"""
        py_file = self.create_test_file(temp_dir, "calculator.py", code)
        analysis = processor._analyze_python_code(code, py_file)
        
        assert "classes" in analysis
        assert len(analysis["classes"]) == 1
        assert analysis["classes"][0]["name"] == "Calculator"
        assert len(analysis["classes"][0]["methods"]) == 3  # __init__, add, multiply
        assert analysis["has_main"] is False
    
    def test_analyze_python_code_with_imports(self, processor, temp_dir):
        """Test Python code analysis with imports."""
        code = """
import os
import sys
from pathlib import Path
from typing import List, Dict

def process_files(file_list: List[str]) -> Dict[str, str]:
    return {}
"""
        py_file = self.create_test_file(temp_dir, "imports.py", code)
        analysis = processor._analyze_python_code(code, py_file)
        
        assert "imports" in analysis
        assert len(analysis["imports"]) == 4
        import_names = [imp["module"] for imp in analysis["imports"]]
        assert "os" in import_names
        assert "sys" in import_names
        assert "pathlib" in import_names
        assert "typing" in import_names
    
    def test_analyze_python_code_invalid_syntax(self, processor, temp_dir):
        """Test Python code analysis with syntax errors."""
        code = """
def broken_function(
    print("This has a syntax error"
"""
        py_file = self.create_test_file(temp_dir, "broken.py", code)
        analysis = processor._analyze_python_code(code, py_file)
        
        assert "error" in analysis
        assert "syntax_valid" in analysis
        assert analysis["syntax_valid"] is False
    
    def test_analyze_other_code_java(self, processor):
        """Test analysis of Java code."""
        code = """
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
    
    private void helperMethod() {
        // Helper method
    }
}
"""
        analysis = processor._analyze_other_code(code, "java")
        
        assert "language" in analysis
        assert analysis["language"] == "java"
        assert "class_count" in analysis
        assert analysis["class_count"] == 1
        assert "method_count" in analysis
        assert analysis["method_count"] == 2
        assert "has_main_method" in analysis
        assert analysis["has_main_method"] is True
    
    def test_analyze_other_code_cpp(self, processor):
        """Test analysis of C++ code."""
        code = """
#include <iostream>
#include <vector>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}

void helper_function() {
    // Helper function
}
"""
        analysis = processor._analyze_other_code(code, "cpp")
        
        assert analysis["language"] == "cpp"
        assert analysis["include_count"] == 2
        assert analysis["function_count"] == 2
        assert analysis["has_main_function"] is True
    
    def test_analyze_other_code_javascript(self, processor):
        """Test analysis of JavaScript code."""
        code = """
function greetUser(name) {
    console.log(`Hello, ${name}!`);
}

const calculateSum = (a, b) => {
    return a + b;
};

class User {
    constructor(name) {
        this.name = name;
    }
}
"""
        analysis = processor._analyze_other_code(code, "javascript")
        
        assert analysis["language"] == "javascript"
        assert analysis["function_count"] == 2
        assert analysis["class_count"] == 1
    
    def test_extract_text_content_simple(self, processor, temp_dir):
        """Test text content extraction from simple text file."""
        content = "This is a simple text file with some content."
        txt_file = self.create_test_file(temp_dir, "simple.txt", content)
        
        extracted = processor._extract_text_content(txt_file)
        assert extracted.strip() == content
    
    def test_process_document_file(self, processor, temp_dir):
        """Test processing of document files."""
        content = "This is a document with some academic content about algorithms."
        txt_file = self.create_test_file(temp_dir, "essay.txt", content)
        
        result = processor.process_file(txt_file)
        
        assert result["file_type"] == "document"
        assert result["content"] == content
        assert "metadata" in result
        assert result["metadata"]["word_count"] > 0
        assert result["metadata"]["character_count"] > 0
    
    def test_process_python_file(self, processor, temp_dir):
        """Test processing of Python files."""
        code = """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
"""
        py_file = self.create_test_file(temp_dir, "factorial.py", code)
        
        result = processor.process_file(py_file)
        
        assert result["file_type"] == "python"
        assert result["content"] == code
        assert "code_analysis" in result
        assert "functions" in result["code_analysis"]
        assert len(result["code_analysis"]["functions"]) == 1
        assert result["code_analysis"]["functions"][0]["name"] == "factorial"
    
    def test_process_data_file_csv(self, processor, temp_dir):
        """Test processing of CSV data files."""
        csv_content = """name,age,city
John,25,New York
Jane,30,Los Angeles
Bob,35,Chicago"""
        csv_file = self.create_test_file(temp_dir, "data.csv", csv_content)
        
        result = processor.process_file(csv_file)
        
        assert result["file_type"] == "data"
        assert result["content"] == csv_content
        assert "data_analysis" in result
        assert result["data_analysis"]["format"] == "csv"
        assert result["data_analysis"]["row_count"] == 4  # Including header
        assert result["data_analysis"]["column_count"] == 3
    
    def test_process_data_file_json(self, processor, temp_dir):
        """Test processing of JSON data files."""
        json_data = {
            "users": [
                {"name": "John", "age": 25},
                {"name": "Jane", "age": 30}
            ],
            "metadata": {"version": "1.0"}
        }
        json_content = json.dumps(json_data, indent=2)
        json_file = self.create_test_file(temp_dir, "data.json", json_content)
        
        result = processor.process_file(json_file)
        
        assert result["file_type"] == "data"
        assert result["content"] == json_content
        assert "data_analysis" in result
        assert result["data_analysis"]["format"] == "json"
    
    def test_process_archive_file(self, processor, temp_dir):
        """Test processing of archive (ZIP) files."""
        # Create a ZIP file with multiple files
        zip_path = temp_dir / "test.zip"
        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("file1.txt", "Content of file 1")
            zf.writestr("file2.py", "print('Hello from Python')")
            zf.writestr("subfolder/file3.txt", "Content in subfolder")
        
        result = processor.process_file(zip_path)
        
        assert result["file_type"] == "archive"
        assert "archive_contents" in result
        assert len(result["archive_contents"]) == 3
        
        # Check that files were extracted and processed
        file_names = [item["filename"] for item in result["archive_contents"]]
        assert "file1.txt" in file_names
        assert "file2.py" in file_names
        assert "subfolder/file3.txt" in file_names
    
    def test_process_unsupported_file(self, processor, temp_dir):
        """Test processing of unsupported file types."""
        unknown_file = self.create_test_file(temp_dir, "test.unknown", "some content")
        
        result = processor.process_file(unknown_file)
        
        assert result["file_type"] == "unsupported"
        assert "error" in result
        assert "not supported" in result["error"].lower()
    
    def test_get_file_metadata(self, processor, temp_dir):
        """Test file metadata extraction."""
        content = "Test content for metadata"
        test_file = self.create_test_file(temp_dir, "metadata_test.txt", content)
        
        metadata = processor._get_file_metadata(test_file)
        
        assert "filename" in metadata
        assert metadata["filename"] == "metadata_test.txt"
        assert "extension" in metadata
        assert metadata["extension"] == ".txt"
        assert "size_bytes" in metadata
        assert metadata["size_bytes"] > 0
        assert "created_time" in metadata
        assert "modified_time" in metadata
    
    def test_analyze_csv_data(self, processor):
        """Test CSV data analysis."""
        csv_content = """product,price,quantity
Apple,1.50,100
Banana,0.75,200
Orange,2.00,150"""
        
        analysis = processor._analyze_csv_data(csv_content)
        
        assert analysis["format"] == "csv"
        assert analysis["row_count"] == 4
        assert analysis["column_count"] == 3
        assert "columns" in analysis
        assert "product" in analysis["columns"]
        assert "price" in analysis["columns"]
        assert "quantity" in analysis["columns"]
    
    def test_analyze_json_data(self, processor):
        """Test JSON data analysis."""
        json_data = {
            "students": [
                {"name": "Alice", "grade": 85},
                {"name": "Bob", "grade": 92}
            ],
            "course": "Computer Science",
            "semester": "Fall 2023"
        }
        json_content = json.dumps(json_data)
        
        analysis = processor._analyze_json_data(json_content)
        
        assert analysis["format"] == "json"
        assert analysis["valid_json"] is True
        assert "top_level_keys" in analysis
        assert "students" in analysis["top_level_keys"]
        assert "course" in analysis["top_level_keys"]
    
    def test_error_handling_corrupted_file(self, processor, temp_dir):
        """Test error handling for corrupted or unreadable files."""
        # Create a file with binary content that might cause issues
        binary_file = temp_dir / "corrupted.txt"
        with open(binary_file, 'wb') as f:
            f.write(b'\x00\x01\x02\x03\xff\xfe\xfd')
        
        result = processor.process_file(binary_file)
        
        # Should handle the error gracefully
        assert "error" in result or result["file_type"] == "unsupported"
    
    def test_memory_efficiency_large_content(self, processor, temp_dir):
        """Test memory efficiency with larger content."""
        # Create a reasonably large text file
        large_content = "This is a line of text.\n" * 1000
        large_file = self.create_test_file(temp_dir, "large.txt", large_content)
        
        result = processor.process_file(large_file)
        
        assert result["file_type"] == "document"
        assert len(result["content"]) > 10000
        assert "metadata" in result
    
    @patch('enhanced_file_processor.logger')
    def test_logging_functionality(self, mock_logger, processor, temp_dir):
        """Test that appropriate logging occurs during processing."""
        py_file = self.create_test_file(temp_dir, "test.py", "print('test')")
        
        processor.process_file(py_file)
        
        # Verify that logging was called
        mock_logger.info.assert_called()
        mock_logger.error.assert_not_called()
    
    def test_multiple_file_processing(self, processor, temp_dir):
        """Test processing multiple files of different types."""
        # Create multiple test files
        files = {
            "script.py": "def test(): pass",
            "data.csv": "name,value\ntest,123",
            "document.txt": "This is a text document",
            "config.json": '{"setting": "value"}'
        }
        
        results = {}
        for filename, content in files.items():
            file_path = self.create_test_file(temp_dir, filename, content)
            results[filename] = processor.process_file(file_path)
        
        # Verify all files were processed correctly
        assert results["script.py"]["file_type"] == "python"
        assert results["data.csv"]["file_type"] == "data"
        assert results["document.txt"]["file_type"] == "document"
        assert results["config.json"]["file_type"] == "data"
        
        # Verify each has appropriate analysis
        assert "code_analysis" in results["script.py"]
        assert "data_analysis" in results["data.csv"]
        assert "metadata" in results["document.txt"]
        assert "data_analysis" in results["config.json"] 