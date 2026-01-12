# Mock Test Generator

## Overview

The Mock Test Generator creates comprehensive mock tests based on course curriculum. It can generate tests from:
1. **Sample Courses** - Pre-defined course structures (CS, Data Science, Math, English, Biology)
2. **Canvas Courses** - Real course data from Canvas LMS API

## Sample Courses Available

### 1. CS 101 - Introduction to Computer Science
- **Topics**: Programming Fundamentals, Variables, Control Structures, Functions, Arrays, OOP, Algorithms
- **Assignments**: Hello World, Calculator App, Array Manipulation, Midterm Exam
- **Course ID**: `cs101`

### 2. DS 201 - Data Science Fundamentals
- **Topics**: Data Collection, EDA, Statistical Analysis, Visualization, Machine Learning, Regression, Classification
- **Assignments**: Data Cleaning, EDA Project, Linear Regression Model, Final Project
- **Course ID**: `ds201`

### 3. MATH 301 - Linear Algebra
- **Topics**: Vector Spaces, Matrix Operations, Linear Equations, Determinants, Eigenvalues, Transformations
- **Assignments**: Vector Operations, Matrix Algebra, Eigenvalue Problems, Final Exam
- **Course ID**: `math301`

### 4. ENG 101 - Composition and Rhetoric
- **Topics**: Thesis Development, Argument Structure, Evidence, Rhetorical Analysis, Research Methods
- **Assignments**: Argumentative Essay, Rhetorical Analysis, Research Paper
- **Course ID**: `eng101`

### 5. BIO 202 - Cell Biology
- **Topics**: Cell Structure, Membrane Transport, Cellular Respiration, Photosynthesis, Cell Division
- **Assignments**: Cell Structure Lab, Metabolism Analysis, Final Lab Project
- **Course ID**: `bio202`

## API Endpoints

### 1. List Sample Courses
```
GET /api/mock-tests/sample-courses
```
Returns list of all available sample courses.

**Response:**
```json
{
  "status": "success",
  "courses": [
    {
      "id": "cs101",
      "name": "Introduction to Computer Science",
      "code": "CS 101",
      "description": "Fundamentals of programming...",
      "topic_count": 8,
      "assignment_count": 4
    }
  ]
}
```

### 2. Get Sample Course Details
```
GET /api/mock-tests/sample-courses/{course_id}
```
Get detailed information about a specific sample course.

**Example:**
```
GET /api/mock-tests/sample-courses/cs101
```

### 3. Generate Mock Test
```
POST /api/mock-tests/generate
```
Generate a mock test based on course curriculum.

**Request Body:**
```json
{
  "course_id": "cs101",  // OR "canvas_course_id": 12345
  "test_type": "comprehensive",  // "comprehensive", "topic_focused", "assignment_based"
  "num_questions": 10,
  "difficulty": "medium"  // "easy", "medium", "hard"
}
```

**Response:**
```json
{
  "status": "success",
  "test": {
    "test_id": "test_cs101_20241201_120000",
    "course_id": "cs101",
    "course_name": "Introduction to Computer Science",
    "course_code": "CS 101",
    "test_type": "comprehensive",
    "difficulty": "medium",
    "total_questions": 10,
    "total_points": 100,
    "time_limit_minutes": 20,
    "questions": [
      {
        "id": 1,
        "question": "Explain the basic concept of Programming Fundamentals in programming.",
        "type": "programming",
        "topic": "Programming Fundamentals",
        "points": 10,
        "difficulty": "medium",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Correct answer: Programming Fundamentals is...",
        "explanation": "This answer is correct because..."
      }
    ],
    "created_at": "2024-12-01T12:00:00"
  }
}
```

### 4. Quick Test Generation
```
GET /api/mock-tests/generate/quick?course_id=cs101&num_questions=10&difficulty=medium
```
Quick endpoint with default settings.

## Test Types

### 1. Comprehensive
- Covers all topics in the course
- Questions distributed evenly across all topics
- Best for final exams or comprehensive assessments

### 2. Topic Focused
- Focuses on 2-3 specific topics
- More in-depth questions on selected topics
- Best for unit tests or topic-specific assessments

### 3. Assignment Based
- Questions based on course assignments
- Aligned with actual coursework
- Best for practice tests or assignment reviews

## Difficulty Levels

### Easy
- Basic concepts and definitions
- Simple applications
- 1 minute per question
- 5 points per question

### Medium
- Moderate complexity
- Requires understanding and application
- 2 minutes per question
- 10 points per question

### Hard
- Complex problems
- Requires synthesis and evaluation
- 3 minutes per question
- 15 points per question

## Using Canvas Courses

To generate tests from real Canvas courses:

1. **Configure Canvas API Key** in Settings
2. **Use Canvas Course ID** instead of sample course ID:

```json
{
  "canvas_course_id": 12345,
  "test_type": "comprehensive",
  "num_questions": 15,
  "difficulty": "medium"
}
```

The system will:
- Fetch course data from Canvas
- Extract topics from assignments
- Generate questions based on actual course content

## Question Types

Questions are automatically selected based on course type:
- **CS/DS Courses**: Programming and exam questions
- **Math Courses**: Exam and homework questions
- **English Courses**: Essay questions
- **Biology Courses**: Lab and exam questions

## Example Usage

### Generate a comprehensive test for CS 101:
```bash
curl -X POST http://localhost:8000/api/mock-tests/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "course_id": "cs101",
    "test_type": "comprehensive",
    "num_questions": 20,
    "difficulty": "medium"
  }'
```

### Generate a quick test:
```bash
curl "http://localhost:8000/api/mock-tests/generate/quick?course_id=ds201&num_questions=15&difficulty=hard" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Integration with Grading System

Generated tests can be:
1. **Exported** as JSON for use in other systems
2. **Imported** into Canvas as quizzes
3. **Used** with ScorePAL's grading system
4. **Saved** for future reference

## Future Enhancements

- Support for more question types (multiple choice, true/false, matching)
- AI-generated questions based on course content
- Adaptive difficulty based on student performance
- Integration with Canvas quiz creation
- Export to various formats (PDF, Word, etc.)


