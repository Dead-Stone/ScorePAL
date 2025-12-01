# ScorePAL Modernization & Improvement Plan
## Making Grading Seamless, Smooth, and Highly Accurate

### Executive Summary
This document outlines comprehensive improvements to ScorePAL using cutting-edge technologies and best practices to achieve:
- **Higher Accuracy**: Multi-model consensus, calibration, and validation
- **Seamless Experience**: Real-time updates, streaming, better UX
- **Better Performance**: Optimized parallelization, caching, async patterns
- **Reliability**: Robust error handling, retry mechanisms, quality checks

---

## 1. AI/ML Improvements

### 1.1 Structured Output with Function Calling
**Current Issue**: JSON extraction via regex is fragile and error-prone
**Solution**: Use Gemini's native structured output capabilities

```python
# New approach using structured outputs
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import google.generativeai as genai

class EnhancedGradingService:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            generation_config={
                "temperature": 0.3,  # Lower for more consistent grading
                "top_p": 0.95,
                "top_k": 40,
                "response_mime_type": "application/json",  # Force JSON output
                "response_schema": self._get_grading_schema()  # Structured schema
            }
        )
    
    def _get_grading_schema(self) -> dict:
        """Define JSON schema for grading results"""
        return {
            "type": "object",
            "properties": {
                "score": {"type": "number", "minimum": 0},
                "total": {"type": "number", "minimum": 0},
                "criteria_scores": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "points": {"type": "number", "minimum": 0},
                            "max_points": {"type": "number", "minimum": 0},
                            "feedback": {"type": "string"}
                        },
                        "required": ["name", "points", "max_points", "feedback"]
                    }
                },
                "grading_feedback": {"type": "string"},
                "confidence_score": {"type": "number", "minimum": 0, "maximum": 1}
            },
            "required": ["score", "total", "criteria_scores", "grading_feedback"]
        }
```

### 1.2 Multi-Model Consensus Grading
**Current Issue**: Single model can have biases or errors
**Solution**: Use multiple models and consensus mechanism

```python
class ConsensusGradingService:
    """Grade using multiple models and reach consensus"""
    
    def __init__(self, api_key: str):
        self.models = {
            "gemini-2.0-flash": genai.GenerativeModel("gemini-2.0-flash-exp"),
            "gemini-1.5-pro": genai.GenerativeModel("gemini-1.5-pro"),
            # Add Claude or GPT-4 as fallback if needed
        }
        self.weights = {
            "gemini-2.0-flash": 0.5,
            "gemini-1.5-pro": 0.5
        }
    
    async def grade_with_consensus(self, submission_data: dict) -> dict:
        """Grade using multiple models and combine results"""
        tasks = [
            self._grade_with_model(name, model, submission_data)
            for name, model in self.models.items()
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors
        valid_results = [r for r in results if not isinstance(r, Exception)]
        
        if not valid_results:
            raise ValueError("All models failed")
        
        # Calculate consensus
        return self._calculate_consensus(valid_results)
    
    def _calculate_consensus(self, results: list) -> dict:
        """Calculate weighted consensus from multiple model results"""
        # Weighted average for scores
        total_score = sum(
            r["score"] * self.weights.get(r["model"], 0.5)
            for r in results
        ) / sum(self.weights.values())
        
        # Combine feedback intelligently
        combined_feedback = self._merge_feedback([r["grading_feedback"] for r in results])
        
        # Use most detailed criteria scores
        best_criteria = max(results, key=lambda x: len(x.get("criteria_scores", [])))
        
        return {
            "score": round(total_score, 2),
            "total": results[0]["total"],
            "criteria_scores": best_criteria["criteria_scores"],
            "grading_feedback": combined_feedback,
            "consensus_confidence": self._calculate_confidence(results),
            "model_agreement": self._calculate_agreement(results)
        }
```

### 1.3 Calibration and Validation Layer
**Current Issue**: No validation of grading consistency
**Solution**: Add calibration checks and validation

```python
class GradingValidator:
    """Validate and calibrate grading results"""
    
    def __init__(self):
        self.calibration_data = []  # Store calibration examples
    
    def validate_result(self, result: dict, rubric: dict) -> dict:
        """Validate grading result for consistency"""
        issues = []
        
        # Check score bounds
        if result["score"] < 0 or result["score"] > result["total"]:
            issues.append("Score out of bounds")
        
        # Check criteria scores sum
        criteria_sum = sum(c["points"] for c in result.get("criteria_scores", []))
        if abs(criteria_sum - result["score"]) > 0.01:
            issues.append(f"Criteria scores don't match total: {criteria_sum} vs {result['score']}")
        
        # Check all rubric criteria are evaluated
        rubric_criteria = {c["name"] for c in rubric.get("criteria", [])}
        result_criteria = {c["name"] for c in result.get("criteria_scores", [])}
        missing = rubric_criteria - result_criteria
        if missing:
            issues.append(f"Missing criteria evaluation: {missing}")
        
        # Check feedback quality
        if len(result.get("grading_feedback", "")) < 50:
            issues.append("Feedback too short")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "result": result
        }
    
    def calibrate_strictness(self, rubric: dict, sample_submissions: list) -> float:
        """Calibrate strictness based on sample submissions"""
        # Use sample submissions to determine optimal strictness
        # This could use historical data or test submissions
        pass
```

### 1.4 Few-Shot Learning with Similar Submissions
**Current Issue**: Generic prompts don't adapt to assignment type
**Solution**: Use similar past submissions as examples

```python
class AdaptivePrompting:
    """Generate prompts using similar past submissions"""
    
    def __init__(self, knowledge_graph):
        self.kg = knowledge_graph
    
    def get_few_shot_examples(self, assignment_id: str, rubric: dict, n=3) -> list:
        """Get similar past submissions as few-shot examples"""
        # Query knowledge graph for similar assignments
        similar_assignments = self.kg.find_similar_assignments(
            assignment_id, 
            similarity_threshold=0.7
        )
        
        examples = []
        for assignment in similar_assignments[:n]:
            # Get graded submissions with high confidence
            submissions = self.kg.get_well_graded_submissions(
                assignment["id"],
                min_confidence=0.8
            )
            
            for sub in submissions[:1]:  # One per assignment
                examples.append({
                    "question": assignment["question"],
                    "submission": sub["text"],
                    "score": sub["score"],
                    "feedback": sub["feedback"]
                })
        
        return examples
```

---

## 2. Architecture Improvements

### 2.1 Async/Await Throughout
**Current Issue**: Mix of sync and async code causes blocking
**Solution**: Full async implementation with proper concurrency

```python
# New async grading service
import asyncio
from typing import AsyncGenerator
import aiohttp

class AsyncGradingService:
    """Fully async grading service"""
    
    def __init__(self, api_key: str, max_concurrent: int = 20):
        self.api_key = api_key
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()
    
    async def grade_submission_async(
        self, 
        submission_data: dict
    ) -> dict:
        """Grade a single submission asynchronously"""
        async with self.semaphore:  # Rate limiting
            try:
                # Use async Gemini API calls
                response = await self._call_gemini_async(submission_data)
                return self._parse_response(response)
            except Exception as e:
                logger.error(f"Grading error: {e}")
                raise
    
    async def grade_batch_streaming(
        self,
        submissions: dict
    ) -> AsyncGenerator[dict, None]:
        """Stream grading results as they complete"""
        tasks = {
            student: self.grade_submission_async({
                "student_name": student,
                "submission": submission,
                **submission_data
            })
            for student, submission in submissions.items()
        }
        
        # Process as they complete
        for coro in asyncio.as_completed(tasks.values()):
            result = await coro
            yield result
```

### 2.2 Redis-Based Caching and Queue System
**Current Issue**: No caching, inefficient task management
**Solution**: Redis for caching and Celery for task queues

```python
# New caching layer
import redis.asyncio as redis
import json
import hashlib

class GradingCache:
    """Cache grading results and intermediate data"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis = redis.from_url(redis_url)
        self.ttl = 3600 * 24 * 7  # 7 days
    
    def _cache_key(self, submission_text: str, rubric: dict) -> str:
        """Generate cache key from submission and rubric"""
        content = f"{submission_text}{json.dumps(rubric, sort_keys=True)}"
        return f"grading:{hashlib.sha256(content.encode()).hexdigest()}"
    
    async def get_cached_result(
        self, 
        submission_text: str, 
        rubric: dict
    ) -> dict | None:
        """Get cached grading result"""
        key = self._cache_key(submission_text, rubric)
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        return None
    
    async def cache_result(
        self, 
        submission_text: str, 
        rubric: dict, 
        result: dict
    ):
        """Cache grading result"""
        key = self._cache_key(submission_text, rubric)
        await self.redis.setex(
            key, 
            self.ttl, 
            json.dumps(result)
        )

# Celery task queue for background processing
from celery import Celery
from celery.result import AsyncResult

celery_app = Celery(
    'scorepal',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

@celery_app.task(bind=True, max_retries=3)
def grade_submission_task(self, submission_data: dict):
    """Celery task for grading with retry logic"""
    try:
        service = GradingService(api_key=os.getenv("GEMINI_API_KEY"))
        result = service.grade_submission(**submission_data)
        return result
    except Exception as exc:
        # Exponential backoff retry
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
```

### 2.3 WebSocket for Real-Time Updates
**Current Issue**: Polling for results is inefficient
**Solution**: WebSocket streaming for real-time progress

```python
# FastAPI WebSocket endpoint
from fastapi import WebSocket, WebSocketDisconnect
import json

@app.websocket("/ws/grading/{job_id}")
async def grading_progress(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time grading updates"""
    await websocket.accept()
    
    try:
        # Subscribe to grading progress
        async for update in grading_service.stream_progress(job_id):
            await websocket.send_json({
                "type": "progress",
                "data": update
            })
        
        # Send completion
        await websocket.send_json({
            "type": "complete",
            "job_id": job_id
        })
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from job {job_id}")

# Frontend WebSocket client
class GradingProgressClient {
    constructor(jobId) {
        this.ws = new WebSocket(`ws://localhost:8010/ws/grading/${jobId}`);
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleUpdate(data);
        };
    }
    
    handleUpdate(data) {
        switch(data.type) {
            case 'progress':
                this.updateProgressBar(data.data);
                break;
            case 'complete':
                this.showResults(data.job_id);
                break;
        }
    }
}
```

### 2.4 Database Optimization with PostgreSQL
**Current Issue**: SQLite doesn't scale well
**Solution**: PostgreSQL with proper indexing and connection pooling

```python
# PostgreSQL with async support
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import asyncpg

# Connection pool
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/scorepal",
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)

AsyncSessionLocal = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Optimized queries with indexes
class GradingResultRepository:
    async def get_results_by_assignment(
        self, 
        assignment_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> list:
        """Get results with pagination and proper indexing"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(GradingResult)
                .where(GradingResult.assignment_id == assignment_id)
                .order_by(GradingResult.score.desc())
                .limit(limit)
                .offset(offset)
            )
            return result.scalars().all()
```

---

## 3. Preprocessing Improvements

### 3.1 Advanced OCR with Layout Analysis
**Current Issue**: Basic OCR loses structure
**Solution**: Use modern OCR with layout understanding

```python
# Using PaddleOCR or EasyOCR for better accuracy
import paddleocr
from PIL import Image
import cv2

class AdvancedOCRProcessor:
    """Advanced OCR with layout analysis"""
    
    def __init__(self):
        self.ocr = paddleocr.PaddleOCR(
            use_angle_cls=True, 
            lang='en',
            use_gpu=True  # If available
        )
    
    def extract_with_layout(self, image_path: str) -> dict:
        """Extract text with layout information"""
        result = self.ocr.ocr(image_path, cls=True)
        
        # Organize by layout regions
        layout = {
            "title": [],
            "body": [],
            "figures": [],
            "tables": []
        }
        
        for line in result[0]:
            bbox, (text, confidence) = line
            # Classify based on position and formatting
            region = self._classify_region(bbox, text)
            layout[region].append({
                "text": text,
                "confidence": confidence,
                "bbox": bbox
            })
        
        return layout
    
    def _classify_region(self, bbox: list, text: str) -> str:
        """Classify text region based on position and content"""
        # Use heuristics or ML model to classify
        if len(text) < 50 and text.isupper():
            return "title"
        # Add more classification logic
        return "body"
```

### 3.2 Document Understanding with Vision Models
**Current Issue**: Images in PDFs are ignored
**Solution**: Use vision models for document understanding

```python
class DocumentVisionProcessor:
    """Process documents using vision models"""
    
    def __init__(self, api_key: str):
        self.vision_model = genai.GenerativeModel("gemini-2.0-flash-exp")
    
    async def extract_document_content(self, pdf_path: str) -> dict:
        """Extract content including images using vision"""
        import fitz  # PyMuPDF
        
        doc = fitz.open(pdf_path)
        content = {
            "text": "",
            "images": [],
            "tables": []
        }
        
        for page_num, page in enumerate(doc):
            # Extract text
            content["text"] += page.get_text()
            
            # Extract and analyze images
            image_list = page.get_images()
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                # Analyze image with vision model
                image_analysis = await self._analyze_image(image_bytes)
                content["images"].append({
                    "page": page_num + 1,
                    "analysis": image_analysis
                })
        
        return content
    
    async def _analyze_image(self, image_bytes: bytes) -> str:
        """Analyze image content using vision model"""
        import PIL.Image
        import io
        
        image = PIL.Image.open(io.BytesIO(image_bytes))
        
        response = self.vision_model.generate_content([
            "Describe this image in detail, including any text, diagrams, or figures.",
            image
        ])
        
        return response.text
```

### 3.3 Smart Text Cleaning and Normalization
**Current Issue**: Extracted text has formatting issues
**Solution**: Advanced text cleaning pipeline

```python
import re
from typing import List
import unicodedata

class TextNormalizer:
    """Normalize and clean extracted text"""
    
    def __init__(self):
        self.cleaning_rules = [
            self._remove_extra_whitespace,
            self._fix_line_breaks,
            self._normalize_unicode,
            self._fix_common_ocr_errors,
            self._preserve_structure
        ]
    
    def normalize(self, text: str) -> str:
        """Apply all normalization rules"""
        for rule in self.cleaning_rules:
            text = rule(text)
        return text
    
    def _fix_common_ocr_errors(self, text: str) -> str:
        """Fix common OCR mistakes"""
        replacements = {
            r'\b0\b': 'O',  # Zero to O in words
            r'rn': 'm',  # Common OCR error
            r'vv': 'w',
            # Add more based on your data
        }
        
        for pattern, replacement in replacements.items():
            text = re.sub(pattern, replacement, text)
        
        return text
    
    def _preserve_structure(self, text: str) -> str:
        """Preserve document structure (paragraphs, lists)"""
        # Detect and preserve lists
        lines = text.split('\n')
        normalized_lines = []
        
        for line in lines:
            # Detect list items
            if re.match(r'^\s*[-•*]\s+', line):
                normalized_lines.append(line.strip())
            # Detect numbered lists
            elif re.match(r'^\s*\d+[.)]\s+', line):
                normalized_lines.append(line.strip())
            # Preserve paragraphs
            elif line.strip():
                normalized_lines.append(line.strip())
            else:
                normalized_lines.append('')
        
        return '\n'.join(normalized_lines)
```

---

## 4. Performance Optimizations

### 4.1 Batch API Calls with Batching
**Current Issue**: One API call per submission is slow
**Solution**: Batch multiple submissions in single API call

```python
class BatchGradingService:
    """Grade multiple submissions in a single API call"""
    
    async def grade_batch_single_call(
        self,
        submissions: dict,
        question_text: str,
        rubric: dict
    ) -> dict:
        """Grade multiple submissions in one API call"""
        
        # Create batch prompt
        batch_prompt = self._create_batch_prompt(
            submissions, 
            question_text, 
            rubric
        )
        
        # Single API call
        response = await self.model.generate_content_async(batch_prompt)
        
        # Parse batch results
        return self._parse_batch_response(response, list(submissions.keys()))
    
    def _create_batch_prompt(
        self, 
        submissions: dict, 
        question_text: str, 
        rubric: dict
    ) -> str:
        """Create prompt for batch grading"""
        prompt = f"""Grade the following {len(submissions)} submissions.
        
Question: {question_text}
Rubric: {json.dumps(rubric, indent=2)}

Submissions:
"""
        for i, (student, submission) in enumerate(submissions.items(), 1):
            prompt += f"""
Submission {i} - Student: {student}
{submission}
---
"""
        
        prompt += """
Return a JSON array with grading results for each submission in order.
"""
        return prompt
```

### 4.2 Streaming Responses
**Current Issue**: Users wait for all results
**Solution**: Stream results as they're ready

```python
@app.post("/grade-batch-streaming")
async def grade_batch_streaming(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Stream grading results as they complete"""
    
    async def generate():
        async for result in grading_service.grade_batch_streaming(submissions):
            yield f"data: {json.dumps(result)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
```

### 4.3 Connection Pooling and Rate Limiting
**Current Issue**: API rate limits cause failures
**Solution**: Smart rate limiting with exponential backoff

```python
from aiolimiter import AsyncLimiter
import asyncio

class RateLimitedGradingService:
    """Grading service with intelligent rate limiting"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        # Gemini allows 60 requests per minute
        self.rate_limiter = AsyncLimiter(max_rate=50, time_period=60)
        self.retry_limiter = AsyncLimiter(max_rate=10, time_period=60)
    
    async def grade_with_retry(
        self, 
        submission_data: dict,
        max_retries: int = 3
    ) -> dict:
        """Grade with automatic retry and rate limiting"""
        
        for attempt in range(max_retries):
            try:
                async with self.rate_limiter:
                    return await self._grade_submission(submission_data)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                
                # Exponential backoff
                wait_time = 2 ** attempt
                await asyncio.sleep(wait_time)
                
                # Use retry limiter for retries
                async with self.retry_limiter:
                    continue
```

---

## 5. Quality Assurance

### 5.1 Confidence Scoring
**Current Issue**: No indication of grading confidence
**Solution**: Add confidence scores to all results

```python
class ConfidenceScorer:
    """Calculate confidence scores for grading results"""
    
    def calculate_confidence(
        self, 
        result: dict, 
        submission_length: int,
        rubric_complexity: int
    ) -> float:
        """Calculate confidence score (0-1)"""
        
        factors = {
            "submission_length": min(submission_length / 1000, 1.0),
            "rubric_coverage": len(result.get("criteria_scores", [])) / rubric_complexity,
            "feedback_quality": min(len(result.get("grading_feedback", "")) / 200, 1.0),
            "score_distribution": self._check_score_distribution(result)
        }
        
        # Weighted average
        confidence = (
            factors["submission_length"] * 0.3 +
            factors["rubric_coverage"] * 0.3 +
            factors["feedback_quality"] * 0.2 +
            factors["score_distribution"] * 0.2
        )
        
        return round(confidence, 2)
    
    def _check_score_distribution(self, result: dict) -> float:
        """Check if score distribution makes sense"""
        criteria_scores = result.get("criteria_scores", [])
        if not criteria_scores:
            return 0.5
        
        # Check for uniform distribution (suspicious)
        scores = [c["points"] / c["max_points"] for c in criteria_scores]
        variance = np.var(scores)
        
        # Low variance might indicate lazy grading
        return min(variance * 2, 1.0)
```

### 5.2 Anomaly Detection
**Current Issue**: Outliers and errors go unnoticed
**Solution**: Detect anomalies in grading results

```python
from sklearn.ensemble import IsolationForest
import numpy as np

class GradingAnomalyDetector:
    """Detect anomalies in grading results"""
    
    def __init__(self):
        self.detector = IsolationForest(contamination=0.1)
    
    def detect_anomalies(self, results: list) -> list:
        """Detect anomalous grading results"""
        if len(results) < 10:
            return []  # Need enough data
        
        # Extract features
        features = []
        for result in results:
            features.append([
                result["score"] / result["total"],
                len(result.get("grading_feedback", "")),
                len(result.get("criteria_scores", [])),
                # Add more features
            ])
        
        # Detect anomalies
        predictions = self.detector.fit_predict(features)
        
        anomalies = [
            results[i] for i, pred in enumerate(predictions) 
            if pred == -1
        ]
        
        return anomalies
```

### 5.3 Human-in-the-Loop Validation
**Current Issue**: No way to improve from feedback
**Solution**: Allow human review and learning

```python
class HumanFeedbackLoop:
    """Learn from human corrections"""
    
    def __init__(self, knowledge_graph):
        self.kg = knowledge_graph
    
    async def submit_correction(
        self,
        submission_id: str,
        ai_grade: dict,
        human_grade: dict,
        feedback: str
    ):
        """Store human correction for learning"""
        
        correction = {
            "submission_id": submission_id,
            "ai_grade": ai_grade,
            "human_grade": human_grade,
            "difference": human_grade["score"] - ai_grade["score"],
            "feedback": feedback,
            "timestamp": datetime.now().isoformat()
        }
        
        # Store in knowledge graph
        await self.kg.store_correction(correction)
        
        # Update model calibration if needed
        if abs(correction["difference"]) > 10:
            await self._trigger_recalibration()
    
    async def get_similar_cases(self, submission: dict) -> list:
        """Get similar cases with human corrections"""
        # Find similar submissions that were corrected
        return await self.kg.find_corrected_similar_submissions(submission)
```

---

## 6. User Experience Improvements

### 6.1 Progressive Web App (PWA)
**Current Issue**: Requires constant internet
**Solution**: Make it a PWA with offline support

```javascript
// service-worker.js
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('scorepal-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/static/css/main.css',
                '/static/js/main.js',
                // Cache essential files
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
```

### 6.2 Real-Time Collaboration
**Current Issue**: No collaboration features
**Solution**: Add real-time collaboration for team grading

```python
# WebSocket for real-time collaboration
@app.websocket("/ws/collaborate/{assignment_id}")
async def collaborate_grading(
    websocket: WebSocket, 
    assignment_id: str,
    user_id: str
):
    await websocket.accept()
    
    # Join collaboration room
    await collaboration_manager.join(assignment_id, user_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "grade_update":
                # Broadcast to other graders
                await collaboration_manager.broadcast(
                    assignment_id,
                    user_id,
                    data
                )
    except WebSocketDisconnect:
        await collaboration_manager.leave(assignment_id, user_id)
```

### 6.3 Smart Suggestions
**Current Issue**: No guidance for graders
**Solution**: AI-powered suggestions during grading

```python
class GradingAssistant:
    """Provide suggestions during grading"""
    
    async def suggest_feedback(
        self,
        submission: str,
        criterion: dict,
        current_score: float
    ) -> list:
        """Suggest feedback phrases based on submission"""
        
        prompt = f"""Based on this submission and criterion, suggest 3 feedback phrases:
        
Submission: {submission[:500]}
Criterion: {criterion['name']} - {criterion['description']}
Current Score: {current_score}/{criterion['max_points']}

Suggest constructive feedback phrases."""
        
        response = await self.model.generate_content(prompt)
        return self._parse_suggestions(response.text)
```

---

## 7. Implementation Priority

### Phase 1: Critical Improvements (Week 1-2)
1. ✅ Structured JSON output (eliminates parsing errors)
2. ✅ Async/await refactoring (better performance)
3. ✅ Redis caching (faster repeated grading)
4. ✅ Confidence scoring (quality indicator)

### Phase 2: Accuracy Improvements (Week 3-4)
1. ✅ Multi-model consensus
2. ✅ Validation layer
3. ✅ Advanced OCR
4. ✅ Document vision processing

### Phase 3: User Experience (Week 5-6)
1. ✅ WebSocket real-time updates
2. ✅ Streaming responses
3. ✅ Progressive Web App
4. ✅ Better error handling

### Phase 4: Advanced Features (Week 7-8)
1. ✅ Human-in-the-loop
2. ✅ Anomaly detection
3. ✅ Collaboration features
4. ✅ Smart suggestions

---

## 8. Technology Stack Updates

### Recommended Additions:
- **Redis**: Caching and task queues
- **PostgreSQL**: Production database
- **Celery**: Background task processing
- **WebSockets**: Real-time updates
- **PaddleOCR/EasyOCR**: Better OCR
- **scikit-learn**: Anomaly detection
- **FastAPI WebSockets**: Real-time communication
- **PWA**: Offline support

### API Improvements:
- Use Gemini 2.0 Flash Experimental (better structured output)
- Consider Claude 3.5 Sonnet as backup model
- Implement proper retry logic with exponential backoff

---

## 9. Metrics to Track

1. **Accuracy Metrics**:
   - Inter-rater reliability (vs human graders)
   - Confidence score distribution
   - Anomaly detection rate

2. **Performance Metrics**:
   - Average grading time per submission
   - API call success rate
   - Cache hit rate

3. **User Experience Metrics**:
   - Time to first result
   - User satisfaction scores
   - Error rate

---

## Conclusion

These improvements will transform ScorePAL into a production-ready, highly accurate grading system. The key is implementing them incrementally, starting with the critical improvements that provide the most immediate value.

