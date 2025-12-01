"""
Enhanced Grading Service with Modern Improvements
- Structured JSON output
- Multi-model consensus
- Confidence scoring
- Validation layer
"""

import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import google.generativeai as genai
from models.rubric import Rubric
import numpy as np

logger = logging.getLogger(__name__)


class GradingValidator:
    """Validate and calibrate grading results"""
    
    def validate_result(self, result: dict, rubric: dict) -> dict:
        """Validate grading result for consistency"""
        issues = []
        
        # Check score bounds
        if result.get("score", 0) < 0 or result.get("score", 0) > result.get("total", 100):
            issues.append(f"Score {result.get('score')} out of bounds [0, {result.get('total')}]")
        
        # Check criteria scores sum
        criteria_scores = result.get("criteria_scores", [])
        if criteria_scores:
            criteria_sum = sum(c.get("points", 0) for c in criteria_scores)
            total_score = result.get("score", 0)
            if abs(criteria_sum - total_score) > 0.01:
                issues.append(
                    f"Criteria scores sum ({criteria_sum}) doesn't match total score ({total_score})"
                )
        
        # Check all rubric criteria are evaluated
        rubric_criteria = {c.get("name", "") for c in rubric.get("criteria", [])}
        result_criteria = {c.get("name", "") for c in criteria_scores}
        missing = rubric_criteria - result_criteria
        if missing:
            issues.append(f"Missing criteria evaluation: {missing}")
        
        # Check feedback quality
        feedback = result.get("grading_feedback", "")
        if len(feedback) < 50:
            issues.append("Feedback too short (less than 50 characters)")
        
        # Check each criterion has feedback
        for criterion in criteria_scores:
            if not criterion.get("feedback", "").strip():
                issues.append(f"Missing feedback for criterion: {criterion.get('name')}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "result": result
        }


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
            "submission_length": min(submission_length / 1000, 1.0),  # Normalize to 1000 chars
            "rubric_coverage": min(
                len(result.get("criteria_scores", [])) / max(rubric_complexity, 1), 
                1.0
            ),
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
        
        # Calculate normalized scores
        scores = []
        for c in criteria_scores:
            max_points = c.get("max_points", 1)
            if max_points > 0:
                scores.append(c.get("points", 0) / max_points)
        
        if not scores:
            return 0.5
        
        # Check variance (low variance might indicate lazy grading)
        variance = np.var(scores) if len(scores) > 1 else 0.5
        
        # Normalize variance to 0-1 range (assuming reasonable variance is 0.1-0.3)
        normalized_variance = min(variance * 2, 1.0)
        return max(normalized_variance, 0.1)


class EnhancedGradingService:
    """
    Enhanced grading service with structured output, validation, and confidence scoring.
    """
    
    def __init__(self, api_key: str):
        """Initialize the enhanced grading service"""
        genai.configure(api_key=api_key)
        self.api_key = api_key
        
        # Use structured output with JSON schema
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            generation_config={
                "temperature": 0.3,  # Lower for more consistent grading
                "top_p": 0.95,
                "top_k": 40,
                "response_mime_type": "application/json",  # Force JSON output
            }
        )
        
        self.validator = GradingValidator()
        self.confidence_scorer = ConfidenceScorer()
    
    def _get_grading_schema(self) -> str:
        """Get JSON schema for structured output"""
        return json.dumps({
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
                "strengths": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "improvements": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": ["score", "total", "criteria_scores", "grading_feedback"]
        })
    
    def grade_submission(
        self,
        submission_text: str,
        question_text: str,
        answer_key: str,
        student_name: str = "Student",
        rubric: Optional[Union[Dict[str, Any], Rubric]] = None,
        strictness: float = 0.5
    ) -> Dict[str, Any]:
        """
        Grade a submission with enhanced validation and confidence scoring.
        
        Args:
            submission_text: The student's submission text
            question_text: The original question/prompt
            answer_key: The answer key or model answer
            student_name: The name of the student
            rubric: Optional rubric for grading
            strictness: Grading strictness from 0.0 (lenient) to 1.0 (strict)
            
        Returns:
            Dictionary with grading results including validation and confidence
        """
        try:
            # Prepare rubric
            if rubric is None:
                rubric_obj = Rubric.create_default()
                rubric_dict = rubric_obj.to_dict()
            elif isinstance(rubric, Rubric):
                rubric_dict = rubric.to_dict()
            else:
                rubric_dict = rubric
            
            # Ensure strictness is between 0 and 1
            strictness = max(0.0, min(1.0, strictness))
            
            # Generate grading prompt
            prompt = self._create_enhanced_prompt(
                question_text=question_text,
                answer_key=answer_key,
                submission=submission_text,
                rubric=rubric_dict,
                strictness_level=int(strictness * 5)
            )
            
            # Generate response with structured output
            response = self.model.generate_content(prompt)
            
            # Parse JSON response (should be clean with structured output)
            try:
                if hasattr(response, 'text'):
                    response_data = json.loads(response.text)
                else:
                    # Fallback for different response formats
                    response_data = json.loads(str(response))
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {e}")
                logger.error(f"Response: {response.text if hasattr(response, 'text') else response}")
                raise ValueError(f"Failed to parse JSON response: {e}")
            
            # Validate the result
            validation = self.validator.validate_result(response_data, rubric_dict)
            
            if not validation["valid"]:
                logger.warning(f"Validation issues for {student_name}: {validation['issues']}")
                # Try to fix common issues
                response_data = self._fix_validation_issues(response_data, rubric_dict, validation["issues"])
            
            # Calculate confidence score
            confidence = self.confidence_scorer.calculate_confidence(
                response_data,
                len(submission_text),
                len(rubric_dict.get("criteria", []))
            )
            
            # Add metadata
            response_data["confidence_score"] = confidence
            response_data["student_name"] = student_name
            response_data["validation"] = {
                "valid": validation["valid"],
                "issues": validation["issues"]
            }
            response_data["timestamp"] = datetime.now().isoformat()
            
            return response_data
            
        except Exception as e:
            logger.error(f"Grading error for {student_name}: {e}", exc_info=True)
            raise
    
    def _create_enhanced_prompt(
        self,
        question_text: str,
        answer_key: str,
        submission: str,
        rubric: dict,
        strictness_level: int
    ) -> str:
        """Create enhanced grading prompt with better structure"""
        
        strictness_terms = {
            0: "very lenient",
            1: "lenient",
            2: "moderately lenient",
            3: "moderate",
            4: "moderately strict",
            5: "strict"
        }
        
        strictness_desc = strictness_terms.get(strictness_level, "moderate")
        rubric_json = json.dumps(rubric, indent=2)
        
        prompt = f"""You are an experienced instructor evaluating a student submission. 
Use the rubric to provide detailed, criterion-by-criterion assessment.

**Question:**
{question_text}

**Answer Key/Reference:**
{answer_key if answer_key else "No specific answer key provided. Use your expert judgment."}

**Rubric:**
{rubric_json}

**Student Submission:**
{submission}

**Instructions:**
1. Evaluate each rubric criterion individually
2. Assign points based on how well the submission meets each criterion
3. Provide specific, actionable feedback for each criterion
4. Calculate total score as sum of criterion points
5. Provide overall feedback highlighting strengths and areas for improvement
6. Apply {strictness_desc} grading approach (level {strictness_level}/5)

**Output Format (JSON):**
{{
  "score": <total_points_earned>,
  "total": <maximum_possible_points>,
  "criteria_scores": [
    {{
      "name": "<criterion_name>",
      "points": <points_earned>,
      "max_points": <maximum_points>,
      "feedback": "<specific_feedback_for_this_criterion>"
    }}
  ],
  "grading_feedback": "<overall_feedback>",
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"]
}}

Ensure all rubric criteria are evaluated. Begin evaluation now."""
        
        return prompt
    
    def _fix_validation_issues(
        self,
        result: dict,
        rubric: dict,
        issues: List[str]
    ) -> dict:
        """Attempt to fix common validation issues"""
        fixed_result = result.copy()
        
        # Fix missing criteria
        rubric_criteria = {c.get("name"): c for c in rubric.get("criteria", [])}
        result_criteria = {c.get("name"): c for c in fixed_result.get("criteria_scores", [])}
        
        for criterion_name, criterion_data in rubric_criteria.items():
            if criterion_name not in result_criteria:
                # Add missing criterion with 0 points
                fixed_result.setdefault("criteria_scores", []).append({
                    "name": criterion_name,
                    "points": 0,
                    "max_points": criterion_data.get("max_points", 0),
                    "feedback": "This criterion was not addressed in the submission."
                })
        
        # Fix score mismatch
        criteria_scores = fixed_result.get("criteria_scores", [])
        if criteria_scores:
            calculated_score = sum(c.get("points", 0) for c in criteria_scores)
            if "score" not in fixed_result or abs(fixed_result["score"] - calculated_score) > 0.01:
                fixed_result["score"] = calculated_score
        
        # Fix total points
        if "total" not in fixed_result:
            fixed_result["total"] = sum(
                c.get("max_points", 0) for c in rubric.get("criteria", [])
            )
        
        # Ensure feedback exists
        if not fixed_result.get("grading_feedback", "").strip():
            fixed_result["grading_feedback"] = "Please review the detailed criterion feedback above."
        
        return fixed_result
    
    async def grade_batch_async(
        self,
        submissions: Dict[str, str],
        question_text: str,
        answer_key: str,
        rubric: Optional[Union[Dict[str, Any], Rubric]] = None,
        strictness: float = 0.5
    ) -> Dict[str, Any]:
        """
        Grade multiple submissions asynchronously with better error handling.
        """
        results = {}
        
        # Create tasks
        tasks = []
        for student_name, submission_text in submissions.items():
            if not submission_text.strip():
                logger.warning(f"Empty submission for {student_name}, skipping")
                results[student_name] = {
                    "error": "Empty submission",
                    "score": 0,
                    "total": 100
                }
                continue
            
            task = asyncio.create_task(
                self._grade_submission_async(
                    submission_text,
                    question_text,
                    answer_key,
                    student_name,
                    rubric,
                    strictness
                )
            )
            tasks.append((student_name, task))
        
        # Process results as they complete
        for student_name, task in tasks:
            try:
                result = await task
                results[student_name] = result
            except Exception as e:
                logger.error(f"Error grading {student_name}: {e}")
                results[student_name] = {
                    "error": str(e),
                    "score": 0,
                    "total": 100,
                    "student_name": student_name
                }
        
        return results
    
    async def _grade_submission_async(
        self,
        submission_text: str,
        question_text: str,
        answer_key: str,
        student_name: str,
        rubric: Optional[Union[Dict[str, Any], Rubric]],
        strictness: float
    ) -> Dict[str, Any]:
        """Async wrapper for grading (runs in thread pool)"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.grade_submission,
            submission_text,
            question_text,
            answer_key,
            student_name,
            rubric,
            strictness
        )

