# GA_Agentic_v2 Regression Test Suite

This comprehensive test suite provides regression testing for the enhanced single grading functionality of GA_Agentic_v2. The tests ensure that all components work correctly together and that new changes don't break existing functionality.

## 🧪 Test Coverage

### Core Components Tested

1. **Enhanced File Processor** (`test_enhanced_file_processor.py`)
   - File type detection for 40+ file extensions
   - Python, Java, C++, JavaScript, CSS, HTML code analysis
   - Document, CSV, JSON, and archive processing
   - Metadata extraction and error handling

2. **Grading Service** (`test_grading_v2.py`)
   - Code-specific grading for multiple programming languages
   - Enhanced document and data file grading
   - Rate limiting and retry mechanisms
   - Custom rubric integration

3. **API Integration** (`test_api_integration.py`)
   - File upload endpoints
   - Grading request processing
   - Status tracking and result retrieval
   - Error handling and validation

4. **Prompt Generation** (`test_prompts.py`)
   - Language-specific code grading prompts
   - Enhanced general grading prompts
   - Rubric integration and strictness levels
   - Edge case handling

5. **End-to-End Regression** (`test_regression_suite.py`)
   - Complete workflow testing (upload → process → grade)
   - Multi-file project handling
   - Archive extraction and processing
   - Performance testing with larger files

## 🚀 Quick Start

### Prerequisites

```bash
# Install test dependencies
cd backend
python run_tests.py --install-deps
```

### Running Tests

```bash
# Run all tests
python run_tests.py

# Run tests by component
python run_tests.py --component

# Run with coverage report
python run_tests.py --coverage --html

# Run only unit tests
python run_tests.py --unit

# Run only integration tests
python run_tests.py --integration

# Run regression tests (end-to-end)
python run_tests.py --regression

# Verbose output
python run_tests.py --verbose
```

## 📁 Test File Structure

```
backend/tests/
├── __init__.py                    # Test package initialization
├── conftest.py                    # Shared fixtures and configuration
├── pytest.ini                    # Pytest configuration
├── README.md                      # This file
├── test_enhanced_file_processor.py # File processing tests
├── test_grading_v2.py            # Grading service tests
├── test_api_integration.py       # API endpoint tests
├── test_prompts.py               # Prompt generation tests
└── test_regression_suite.py      # End-to-end workflow tests
```

## 🎯 Test Categories

### Unit Tests (`@pytest.mark.unit`)
- Test individual functions and methods
- Mock external dependencies
- Fast execution (< 1 second per test)
- No file I/O or network calls

### Integration Tests (`@pytest.mark.integration`)
- Test component interactions
- Use real file processing
- Test API endpoints with FastAPI TestClient
- Moderate execution time (1-5 seconds per test)

### Regression Tests (`@pytest.mark.regression`)
- End-to-end workflow testing
- Complete user scenarios
- Large file processing
- Slower execution (5+ seconds per test)

## 📊 Test Scenarios Covered

### File Processing Scenarios

#### Programming Languages
- **Python**: Functions, classes, imports, syntax validation
- **Java**: Classes, methods, main method detection
- **C++**: Includes, functions, main function detection
- **JavaScript**: Functions, classes, modern syntax
- **CSS**: Selectors, properties, media queries
- **HTML**: Tags, structure, validation

#### Document Types
- **Text Files**: Word count, character analysis
- **Markdown**: Structure analysis, heading extraction
- **CSV**: Column/row analysis, data validation
- **JSON**: Structure validation, key extraction
- **Archives**: Multi-file extraction and processing

#### Data Analysis
- **CSV Files**: Column detection, data type inference
- **JSON Files**: Schema validation, nested structure analysis
- **Excel Files**: Sheet processing, data extraction

### Grading Scenarios

#### Code Grading
- **Correctness**: Algorithm implementation, logic flow
- **Style**: Language-specific conventions (PEP 8, Google Style)
- **Documentation**: Comments, docstrings, README files
- **Efficiency**: Algorithm complexity, best practices
- **Structure**: Modular design, organization

#### Document Grading
- **Content Quality**: Accuracy, depth, relevance
- **Organization**: Structure, flow, formatting
- **Analysis**: Critical thinking, insights
- **Communication**: Clarity, grammar, style

#### Data Grading
- **Data Quality**: Completeness, consistency, validity
- **Structure**: Format compliance, schema adherence
- **Analysis**: Statistical insights, patterns

### Error Handling Scenarios

#### File Processing Errors
- Unsupported file types
- Corrupted files
- Empty files
- Encoding issues
- Large file handling

#### API Errors
- Invalid file uploads
- Missing parameters
- Rate limiting
- Network timeouts
- Authentication issues

#### Grading Errors
- AI API failures
- Invalid JSON responses
- Missing rubric criteria
- Edge case handling

## 🔧 Advanced Usage

### Running Specific Test Files

```bash
# Test file processor only
pytest tests/test_enhanced_file_processor.py -v

# Test grading service only
pytest tests/test_grading_v2.py -v

# Test with specific markers
pytest -m "unit and not slow" -v

# Test with coverage for specific module
pytest tests/test_grading_v2.py --cov=grading_v2 --cov-report=html
```

### Custom Test Configuration

Edit `pytest.ini` to modify test behavior:

```ini
[tool:pytest]
testpaths = tests
addopts = -v --tb=short --strict-markers
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
```

### Environment Variables for Testing

```bash
# Set test mode
export TESTING=true

# Use test API keys
export GEMINI_API_KEY=test_key

# Set test data directory
export TEST_DATA_DIR=/tmp/test_data
```

## 📈 Coverage Goals

The test suite aims for:
- **Line Coverage**: > 90%
- **Branch Coverage**: > 85%
- **Function Coverage**: > 95%

Generate coverage reports:

```bash
# Terminal coverage report
python run_tests.py --coverage

# HTML coverage report
python run_tests.py --coverage --html
# View: open htmlcov/index.html
```

## 🐛 Debugging Failed Tests

### Common Issues and Solutions

1. **Import Errors**
   ```bash
   # Ensure backend directory is in Python path
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"
   ```

2. **Missing Dependencies**
   ```bash
   # Install test dependencies
   python run_tests.py --install-deps
   ```

3. **File Path Issues**
   ```bash
   # Run from backend directory
   cd backend
   python run_tests.py
   ```

4. **Mock Failures**
   - Check that external services are properly mocked
   - Verify mock return values match expected format

### Debug Mode

```bash
# Run with debug output
pytest tests/test_file.py -v -s --tb=long

# Run single test with debugging
pytest tests/test_file.py::TestClass::test_method -v -s
```

## 🎯 Best Practices for Adding Tests

### Test Naming Convention
```python
def test_[component]_[scenario]_[expected_result]():
    """
    Test that [component] [does something] when [condition].
    
    Expected: [expected behavior]
    """
```

### Test Structure
```python
def test_example():
    # Arrange: Set up test data
    input_data = create_test_data()
    
    # Act: Execute the functionality
    result = function_under_test(input_data)
    
    # Assert: Verify the results
    assert result.status == "success"
    assert result.data == expected_data
```

### Using Fixtures
```python
@pytest.fixture
def sample_code():
    return "def hello(): return 'world'"

def test_code_processing(sample_code):
    result = process_code(sample_code)
    assert result["type"] == "python"
```

## 🔄 Continuous Integration

### Pre-commit Testing
```bash
# Run before committing
python run_tests.py --unit --regression
```

### CI Pipeline Integration
```yaml
# .github/workflows/test.yml
- name: Run regression tests
  run: |
    cd backend
    python run_tests.py --coverage --html
```

## 📝 Test Results Interpretation

### Success Indicators
- ✅ All tests pass
- 📊 High coverage percentage
- 🚀 Fast execution time
- 📋 Clear test output

### Failure Investigation
1. **Read the error message carefully**
2. **Check the stack trace for the root cause**
3. **Verify test data and mocks**
4. **Run individual tests for debugging**
5. **Check for recent code changes**

## 🆘 Troubleshooting

### Common Error Messages

**"ModuleNotFoundError: No module named 'enhanced_file_processor'"**
- Solution: Run tests from the backend directory

**"fixture 'temp_dir' not found"**
- Solution: Check that conftest.py is in the tests directory

**"FAILED tests/test_file.py::test_name - AssertionError"**
- Solution: Review the specific assertion that failed

**"Collection failed: import errors"**
- Solution: Check import statements and dependencies

For additional help, check the test logs and error messages, or refer to the main project documentation.

---

## 📞 Support

If you encounter issues with the test suite:

1. Check this README for common solutions
2. Review the test logs for specific error messages
3. Verify all dependencies are installed
4. Ensure you're running from the correct directory
5. Check that all required environment variables are set

The test suite is designed to be comprehensive and reliable. Regular execution helps ensure the system maintains high quality and prevents regressions. 