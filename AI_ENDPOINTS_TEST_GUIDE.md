# AI Endpoints Test Guide

## Prerequisites
1. Backend server must be running on `http://localhost:8010`
2. You need a valid authentication token (login first)

## Available AI Endpoints

### 1. Rubric Generation
**Endpoint:** `POST /rubrics/generate`  
**Auth Required:** Yes (Teacher/Grader/Admin)  
**Description:** Generates a rubric using AI based on assignment details

**Request Body:**
```json
{
  "assignment_type": "Essay",
  "description": "A 1000-word essay on climate change",
  "total_points": 100,
  "criteria_count": 5,
  "include_levels": true,
  "question": "Write a comprehensive essay..."
}
```

**Test Command:**
```bash
python test_ai_endpoints.py
```

### 2. Student AI Assistant
**Endpoint:** `POST /api/student-assistant`  
**Auth Required:** Yes (Student)  
**Description:** AI-powered study assistant for students

**Request Body:**
```json
{
  "message": "What are my recent grades?",
  "context": {
    "courses": [],
    "stats": {"average_score": 85},
    "insights": [],
    "resultsCount": 5
  },
  "conversationId": "test_conv"
}
```

### 3. Public Rubric Generation
**Endpoint:** `POST /api/grade-public/generate-rubric`  
**Auth Required:** No  
**Description:** Generate rubric from uploaded question paper (public endpoint)

**Request:** Multipart form data
- `question_paper`: File (PDF, DOCX, DOC, TXT)
- `rubric_context`: String (optional)
- `total_points`: Integer (optional, default: 100)

### 4. Public Grading
**Endpoint:** `POST /api/grade-public/grade-single`  
**Auth Required:** No  
**Description:** Grade a single submission without saving (public endpoint)

**Request:** Multipart form data
- `student_name`: String
- `assignment_name`: String
- `question_paper`: File
- `submission`: File
- `answer_key`: File (optional)
- `strictness`: Float (0.0-1.0)
- `rubric_id`: String (optional)
- `rubric_json`: String (optional)

### 5. Get Available AI Providers
**Endpoint:** `GET /api/settings/ai/providers/available`  
**Auth Required:** Optional  
**Description:** Get list of available AI providers and their status

### 6. Get Rubrics List
**Endpoint:** `GET /rubrics`  
**Auth Required:** Yes (Teacher/Grader/Admin)  
**Description:** Get all available rubrics

## Running Tests

1. **Start the backend server:**
   ```bash
   python start.py
   ```

2. **Run the test script:**
   ```bash
   python test_ai_endpoints.py
   ```

3. **Or test manually with curl:**
   ```bash
   # Health check
   curl http://localhost:8010/health
   
   # Get rubrics (with auth token)
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8010/rubrics
   
   # Generate rubric (with auth token)
   curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"assignment_type":"Essay","description":"Test","total_points":100,"criteria_count":5,"include_levels":true}' \
     http://localhost:8010/rubrics/generate
   ```

## Expected Results

- ✅ Health check should return 200
- ✅ AI providers endpoint should list available providers
- ✅ Rubrics list should return array of rubrics
- ✅ Rubric generation should return a valid rubric structure
- ✅ Student AI assistant should respond with helpful message

## Troubleshooting

1. **Backend not running:** Start with `python start.py`
2. **Authentication failed:** Check credentials in test script
3. **AI endpoints failing:** Verify API keys are set in environment:
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY` (optional)
   - `ANTHROPIC_API_KEY` (optional)
4. **Connection refused:** Ensure backend is on port 8010
