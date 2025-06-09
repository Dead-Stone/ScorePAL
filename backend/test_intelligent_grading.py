"""
Test script for Intelligent Grading Router with Multi-Format Support

This script tests the intelligent grading router's ability to handle
PDF, DOC, TXT, and code files automatically selecting the best approach.

Author: AI Grading System  
Date: 2024
"""

import asyncio
import logging
import os
import tempfile
from pathlib import Path
from typing import List
import json

# Import our intelligent grading system
from intelligent_grading_router import IntelligentGradingRouter
from document_processor import DocumentProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_test_files() -> List[Path]:
    """Create test files of different types for testing."""
    test_files = []
    temp_dir = Path(tempfile.mkdtemp())
    
    # 1. Python code file
    python_file = temp_dir / "fibonacci.py"
    python_content = '''def fibonacci(n):
    """Calculate the nth Fibonacci number."""
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n-1) + fibonacci(n-2)

def fibonacci_iterative(n):
    """More efficient iterative version."""
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

# Test the functions
if __name__ == "__main__":
    print("Fibonacci sequence (first 10 numbers):")
    for i in range(10):
        print(f"F({i}) = {fibonacci_iterative(i)}")
'''
    python_file.write_text(python_content)
    test_files.append(python_file)
    
    # 2. JavaScript code file
    js_file = temp_dir / "sorting.js"
    js_content = '''/**
 * Implementation of various sorting algorithms
 */

function bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                // Swap elements
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}

function quickSort(arr) {
    if (arr.length <= 1) {
        return arr;
    }
    
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);
    const right = arr.filter(x => x > pivot);
    
    return [...quickSort(left), ...middle, ...quickSort(right)];
}

// Test the algorithms
const testArray = [64, 34, 25, 12, 22, 11, 90];
console.log("Original:", testArray);
console.log("Bubble Sort:", bubbleSort([...testArray]));
console.log("Quick Sort:", quickSort([...testArray]));
'''
    js_file.write_text(js_content)
    test_files.append(js_file)
    
    # 3. Text document file
    text_file = temp_dir / "essay.txt"
    text_content = '''The Impact of Artificial Intelligence on Education

Introduction:
Artificial Intelligence (AI) has emerged as a transformative force across various industries, 
and education is no exception. The integration of AI technologies in educational systems 
promises to revolutionize how we teach and learn, offering personalized experiences and 
enhanced educational outcomes.

Main Points:

1. Personalized Learning:
AI enables the creation of adaptive learning systems that can adjust to individual student 
needs, learning pace, and preferences. These systems can identify knowledge gaps and provide 
targeted interventions to help students succeed.

2. Automated Assessment:
AI-powered grading systems can provide immediate feedback on assignments, freeing up teachers 
to focus on more complex educational tasks. These systems can evaluate not just multiple-choice 
questions but also essays and complex problem-solving tasks.

3. Intelligent Tutoring Systems:
AI tutors can provide 24/7 support to students, answering questions and providing explanations 
when human teachers are not available. These systems can adapt their teaching style to match 
each student's learning preferences.

4. Predictive Analytics:
AI can analyze student performance data to predict which students might struggle and identify 
them early for intervention. This proactive approach can significantly improve student 
retention and success rates.

Challenges:

While AI offers many benefits, there are also challenges to consider:
- Privacy and data security concerns
- The need for teacher training and adaptation
- Ensuring equity and access to AI-powered educational tools
- Maintaining the human element in education

Conclusion:
AI has the potential to significantly enhance education by providing personalized learning 
experiences, automated assessment, and predictive insights. However, successful implementation 
requires careful consideration of the challenges and ensuring that AI complements rather than 
replaces human educators.
'''
    text_file.write_text(text_content)
    test_files.append(text_file)
    
    # 4. Markdown documentation file
    md_file = temp_dir / "README.md"
    md_content = '''# Project Documentation

## Overview
This project demonstrates various programming concepts and algorithms.

## Files Included

### Code Files
- `fibonacci.py` - Recursive and iterative Fibonacci implementations
- `sorting.js` - Bubble sort and quicksort algorithms

### Documentation
- `essay.txt` - Essay on AI in education
- `README.md` - This documentation file

## Usage Instructions

1. **Python Fibonacci Calculator**
   ```python
   python fibonacci.py
   ```
   This will output the first 10 Fibonacci numbers.

2. **JavaScript Sorting Demo**
   ```javascript
   node sorting.js
   ```
   This will demonstrate bubble sort and quicksort algorithms.

## Code Quality Assessment

### Strengths
- Clear function documentation
- Efficient iterative implementation for Fibonacci
- Multiple algorithm implementations for comparison
- Proper error handling and edge cases

### Areas for Improvement
- Could add more comprehensive test cases
- Error handling could be more robust
- Could implement additional sorting algorithms
- Consider adding performance benchmarks

## Learning Objectives
- Understanding recursive vs iterative approaches
- Comparing time complexity of different algorithms
- Writing clean, documented code
- Implementing classical computer science algorithms
'''
    md_file.write_text(md_content)
    test_files.append(md_file)
    
    logger.info(f"Created {len(test_files)} test files in {temp_dir}")
    return test_files


async def test_intelligent_grading():
    """Test the intelligent grading router."""
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY not set")
            return
        
        # Initialize router
        router = IntelligentGradingRouter(api_key)
        
        # Create test files
        temp_dir = Path(tempfile.mkdtemp())
        
        # Python file
        python_file = temp_dir / "test.py"
        python_file.write_text('''def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
''')
        
        # Text file
        text_file = temp_dir / "essay.txt"
        text_file.write_text('''This is a test essay about artificial intelligence.
It demonstrates the capabilities of AI in education.
The essay shows understanding of key concepts.
''')
        
        print("=== Testing Single Code File ===")
        result1 = await router.route_and_grade([python_file])
        print(f"Strategy: {result1['routing_info']['strategy_used']}")
        print(f"Score: {result1.get('score', 0)}")
        
        print("\n=== Testing Multiple Files ===")
        result2 = await router.route_and_grade([python_file, text_file])
        print(f"Strategy: {result2['routing_info']['strategy_used']}")
        print(f"Score: {result2.get('score', 0)}")
        
        # Test document processor
        processor = DocumentProcessor()
        print(f"\nSupported extensions: {processor.get_supported_extensions()}")
        
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir)
        
        print("\n✅ Tests completed successfully!")
        
    except Exception as e:
        logger.error(f"Test failed: {e}")


async def test_file_type_detection():
    """Test file type detection and routing logic."""
    logger.info("\n" + "="*60)
    logger.info("FILE TYPE DETECTION TEST")
    logger.info("="*60)
    
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY environment variable not set")
            return
        
        router = IntelligentGradingRouter(api_key)
        
        # Create test files
        test_files = create_test_files()
        
        # Test individual file analysis
        for file_path in test_files:
            analysis = await router._analyze_submission([file_path])
            strategy, reason = router._select_strategy(analysis)
            
            print(f"\nFile: {file_path.name}")
            print(f"  Detected Types: {list(analysis['file_types'])}")
            print(f"  Has Code: {analysis['has_code']}")
            print(f"  Has Documents: {analysis['has_documents']}")
            print(f"  Complexity: {analysis['complexity_level']}")
            print(f"  Recommended Strategy: {strategy.value}")
            print(f"  Reason: {reason}")
        
        # Test combination analysis
        print(f"\nAll Files Combined:")
        combined_analysis = await router._analyze_submission(test_files)
        combined_strategy, combined_reason = router._select_strategy(combined_analysis)
        
        print(f"  File Count: {combined_analysis['file_count']}")
        print(f"  All Types: {list(combined_analysis['file_types'])}")
        print(f"  Has Code: {combined_analysis['has_code']}")
        print(f"  Has Documents: {combined_analysis['has_documents']}")
        print(f"  Complexity: {combined_analysis['complexity_level']}")
        print(f"  Recommended Strategy: {combined_strategy.value}")
        print(f"  Reason: {combined_reason}")
        
        # Cleanup
        import shutil
        shutil.rmtree(test_files[0].parent)
        
    except Exception as e:
        logger.error(f"File type detection test failed: {e}", exc_info=True)


if __name__ == "__main__":
    print("Starting Intelligent Grading Router Tests...")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run the tests
    asyncio.run(test_intelligent_grading())
    asyncio.run(test_file_type_detection())
    
    print("\nAll tests completed!") 