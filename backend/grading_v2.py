#grading_v2.py
from datetime import datetime
import logging
import re
import google.generativeai as genai
from typing import Dict, Any, List, Optional, Union
import json
from prompts.answer_key_prompt import get_answer_key_prompt
from prompts.grading_prompt import get_grading_prompt 
from prompts.code_grading_prompt import get_enhanced_general_prompt, get_code_grading_prompt
from prompts.image_prompt import get_image_description_prompt
from models.rubric import Rubric, GradingCriteria
from accuracy_system import AccuracyEnhancer
import time
import random

# Initialize logger
logger = logging.getLogger(__name__)

class GradingResult:
    """Class to store and format grading results."""
    
    def __init__(
        self,
        student_name: str,
        score: float,
        max_score: float,
        feedback: str,
        criteria_scores: Optional[List[Dict[str, Any]]] = None,
        mistakes: Optional[List[Dict[str, Any]]] = None,
        timestamp: Optional[str] = None,
        model_self_assessment: Optional[Dict[str, Any]] = None,
        accuracy_metrics: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a grading result.
        
        Args:
            student_name: Name of the student
            score: Points earned
            max_score: Maximum possible points
            feedback: Overall feedback on the submission
            criteria_scores: Optional list of scores for each criterion
            mistakes: Optional list of identified mistakes
            timestamp: Optional timestamp when graded
            model_self_assessment: Optional self-assessment from the AI model
            accuracy_metrics: Optional accuracy metrics from post-processing
        """
        self.student_name = student_name
        self.score = score
        self.max_score = max_score
        self.feedback = feedback
        self.criteria_scores = criteria_scores or []
        self.mistakes = mistakes or []
        self.timestamp = timestamp or datetime.now().isoformat()
        self.model_self_assessment = model_self_assessment or {}
        self.accuracy_metrics = accuracy_metrics or {}
    
    @property
    def percentage(self) -> float:
        """Calculate percentage score."""
        if self.max_score > 0:
            return (self.score / self.max_score) * 100
        return 0.0
    
    @property
    def grade_letter(self) -> str:
        """Convert percentage to letter grade."""
        percentage = self.percentage
        if percentage >= 90:
            return "A"
        elif percentage >= 80:
            return "B"
        elif percentage >= 70:
            return "C"
        elif percentage >= 60:
            return "D"
        else:
            return "F"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "student_name": self.student_name,
            "score": self.score,
            "max_score": self.max_score,
            "percentage": self.percentage,
            "grade_letter": self.grade_letter,
            "feedback": self.feedback,
            "criteria_scores": self.criteria_scores,
            "mistakes": self.mistakes,
            "timestamp": self.timestamp,
            "model_self_assessment": self.model_self_assessment,
            "accuracy_metrics": self.accuracy_metrics
        }
    
    def get_tabular_data(self) -> Dict[str, Any]:
        """Get data formatted for tabular display."""
        headers = ["Criterion", "Points", "Max Points", "Percentage", "Feedback"]
        rows = []
        
        for criterion in self.criteria_scores:
            rows.append({
                "Criterion": criterion.get("name", ""),
                "Points": criterion.get("points", 0),
                "Max Points": criterion.get("max_points", 0),
                "Percentage": f"{(criterion.get('points', 0) / criterion.get('max_points', 1)) * 100:.1f}%",
                "Feedback": criterion.get("feedback", "")
            })
        
        # Add summary row
        rows.append({
            "Criterion": "TOTAL",
            "Points": self.score,
            "Max Points": self.max_score,
            "Percentage": f"{self.percentage:.1f}%",
            "Feedback": self.grade_letter
        })
        
        return {
            "headers": headers,
            "rows": rows,
            "student_name": self.student_name,
            "overall_feedback": self.feedback
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GradingResult':
        """Create a GradingResult from a dictionary."""
        return cls(
            student_name=data.get("student_name", ""),
            score=data.get("score", 0),
            max_score=data.get("max_score", 100),
            feedback=data.get("feedback", ""),
            criteria_scores=data.get("criteria_scores", []),
            mistakes=data.get("mistakes", []),
            timestamp=data.get("timestamp"),
            model_self_assessment=data.get("model_self_assessment", {}),
            accuracy_metrics=data.get("accuracy_metrics", {})
        )


class GradingService:
    def __init__(self, api_key: str):
        self.model = genai.GenerativeModel("gemini-2.0-flash")
        genai.configure(api_key=api_key)
        self.max_retries = 3
        self.base_delay = 1  # Base delay in seconds
        self.accuracy_enhancer = AccuracyEnhancer(self)
        self.multi_agent_service = None  # Initialize on first use
        
    def _handle_rate_limit(self, attempt: int, error_message: str) -> int:
        """
        Handle rate limiting with exponential backoff.
        
        Args:
            attempt: Current attempt number (0-based)
            error_message: Error message from API
            
        Returns:
            Delay in seconds before next attempt
        """
        # Extract retry delay from error message if present
        retry_delay_match = re.search(r'retry_delay\s*{\s*seconds:\s*(\d+)', error_message)
        if retry_delay_match:
            suggested_delay = int(retry_delay_match.group(1))
        else:
            # Calculate exponential backoff: base_delay * 2^attempt + jitter
            suggested_delay = self.base_delay * (2 ** attempt) + random.uniform(0, 1)
        
        # Cap the delay at 120 seconds
        delay = min(suggested_delay, 120)
        
        logger.warning(f"Rate limit hit on attempt {attempt + 1}. Waiting {delay} seconds before retry...")
        time.sleep(delay)
        
        return delay

    def _make_api_call_with_retry(self, prompt: str) -> str:
        """
        Make API call with retry logic for rate limiting.
        
        Args:
            prompt: The prompt to send to the API
            
        Returns:
            The API response text
            
        Raises:
            Exception: If all retries are exhausted
        """
        for attempt in range(self.max_retries):
            try:
                response = self.model.generate_content(prompt)
                return response.text
                
            except Exception as e:
                error_str = str(e)
                
                # Check if it's a rate limit error (429)
                if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                    if attempt < self.max_retries - 1:  # Not the last attempt
                        self._handle_rate_limit(attempt, error_str)
                        continue
                    else:
                        logger.error(f"Rate limit retries exhausted after {self.max_retries} attempts")
                        raise Exception(f"API rate limit exceeded after {self.max_retries} attempts. Please try again later.")
                else:
                    # Not a rate limit error, re-raise immediately
                    logger.error(f"Non-rate-limit API error: {error_str}")
                    raise e
        
        # Should not reach here, but just in case
        raise Exception(f"API call failed after {self.max_retries} attempts")

    def _parse_grading_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the AI grading response and extract JSON data.
        
        Args:
            response: Raw response text from the AI model
            
        Returns:
            Dictionary containing parsed grading data
            
        Raises:
            ValueError: If no valid JSON is found in the response
            json.JSONDecodeError: If JSON parsing fails
        """
        # Extract JSON content from the response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON content found in the response")

        json_content = json_match.group(0)
        response_data = json.loads(json_content)
        
        # Extract self_assessment if provided by the model
        if 'self_assessment' in response_data:
            self_assessment = response_data['self_assessment']
            logger.info(f"Model self-assessment: {self_assessment.get('overall_confidence', 0.0):.2f} confidence")
            
            # Store self-assessment for later use
            response_data['model_self_assessment'] = self_assessment
        
        return response_data

    def _validate_and_fix_scores(self, result_data: Dict[str, Any], rubric_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and fix score calculation issues in grading results.
        
        Args:
            result_data: Raw grading result data from AI
            rubric_dict: The rubric used for grading
            
        Returns:
            Fixed result data with correct scores and feedback
        """
        # Get the rubric total points
        max_score = rubric_dict.get("total_points", 100)
        criteria = rubric_dict.get("criteria", [])
        
        # Calculate score from criteria if available, otherwise validate existing score
        if "criteria_scores" in result_data and result_data["criteria_scores"]:
            # Always calculate total from criteria scores for accuracy
            total_points = sum(c.get("points", 0) for c in result_data["criteria_scores"])
            result_data["score"] = min(total_points, max_score)
        else:
            # If no criteria scores, validate the existing score
            score = result_data.get("score", 0)
            if score > max_score or score < 0:
                result_data["score"] = min(max(score, 0), max_score)
        
        # Ensure total field is set correctly
        result_data["total"] = max_score
        
        # Validate criteria scores
        if "criteria_scores" not in result_data or not result_data["criteria_scores"]:
            # Generate criteria scores from rubric if missing
            criteria_scores = []
            current_score = result_data.get("score", 0)
            
            for criterion in criteria:
                criterion_max = criterion.get("max_points", 0)
                # Proportional allocation of score
                if max_score > 0:
                    criterion_score = min(
                        (current_score * criterion_max) / max_score,
                        criterion_max
                    )
                else:
                    criterion_score = 0
                
                criteria_scores.append({
                    "name": criterion.get("name", ""),
                    "points": round(criterion_score, 1),
                    "max_points": criterion_max,
                    "feedback": f"Score based on overall performance"
                })
            
            result_data["criteria_scores"] = criteria_scores
            
            # Recalculate total score from generated criteria to ensure consistency
            total_from_criteria = sum(c["points"] for c in criteria_scores)
            result_data["score"] = total_from_criteria
        else:
            # Validate existing criteria scores and recalculate total
            total_from_criteria = 0
            for criterion in result_data["criteria_scores"]:
                points = criterion.get("points", 0)
                max_points = criterion.get("max_points", 0)
                
                # Fix invalid scores
                if points > max_points:
                    criterion["points"] = max_points
                elif points < 0:
                    criterion["points"] = 0
                
                total_from_criteria += criterion["points"]
            
            # Update total score to match criteria sum
            result_data["score"] = min(total_from_criteria, max_score)
        
        # Ensure feedback is available
        if not result_data.get("grading_feedback") and not result_data.get("feedback"):
            # Generate basic feedback based on score
            score = result_data.get("score", 0)
            percentage = (score / max_score * 100) if max_score > 0 else 0
            
            if percentage >= 90:
                feedback = "Excellent work! Strong performance across all criteria."
            elif percentage >= 80:
                feedback = "Good work with some areas for improvement."
            elif percentage >= 70:
                feedback = "Satisfactory work, but several areas need attention."
            elif percentage >= 60:
                feedback = "Below expectations, significant improvements needed."
            else:
                feedback = "Poor performance, substantial revision required."
            
            result_data["grading_feedback"] = feedback
        
        return result_data

    def grade_submission(self, 
                         submission_text: str, 
                         question_text: str, 
                         answer_key: str, 
                         student_name: str = "Student",
                         rubric: Optional[Union[Dict[str, Any], Rubric]] = None,
                         strictness: float = 0.5) -> Dict[str, Any]:
        """
        Grade a student submission based on the provided rubric and strictness level.
        
        Args:
            submission_text: The student's submission text
            question_text: The original question/prompt
            answer_key: The answer key or model answer
            student_name: The name of the student (default: "Student")
            rubric: Optional rubric for grading (Dict or Rubric object)
            strictness: Grading strictness from 0.0 (lenient) to 1.0 (strict)
            
        Returns:
            Dictionary with grading results
        """
        try:
            # If no rubric is provided, use a default one
            if rubric is None:
                rubric_obj = Rubric.create_default()
                rubric_dict = rubric_obj.to_dict()
            elif isinstance(rubric, Rubric):
                rubric_obj = rubric
                rubric_dict = rubric.to_dict()
            else:
                rubric_dict = rubric
                # Try to convert the dict to a Rubric object
                try:
                    rubric_obj = Rubric.from_dict(rubric_dict)
                except Exception as e:
                    logging.warning(f"Could not convert rubric dict to Rubric object: {e}")
                    rubric_obj = Rubric.create_default()
            
            # Ensure strictness is between 0 and 1
            strictness = max(0.0, min(1.0, strictness))
            
            # Generate grading prompt
            prompt = get_grading_prompt(
                question_text=question_text, 
                answer_key=answer_key, 
                submission=submission_text, 
                rubric=rubric_dict,
                strictness_level=int(strictness * 5)  # Convert to 0-5 scale
            )
            
            # Generate response
            response = self._make_api_call_with_retry(prompt)
            
            # Parse JSON response
            response_data = self._parse_grading_response(response)
            
            # Validate and fix the scores
            response_data = self._validate_and_fix_scores(response_data, rubric_dict)
            
            # Create GradingResult object with proper validation
            result = GradingResult(
                student_name=student_name,
                score=float(response_data.get("score", 0)),
                max_score=float(response_data.get("total", rubric_dict.get("total_points", 100))),
                feedback=response_data.get("grading_feedback", response_data.get("feedback", "No feedback available")),
                criteria_scores=response_data.get("criteria_scores", []),
                mistakes=[{"description": v} for k, v in response_data.get("mistakes", {}).items()]
            )
            
            return result.to_dict()
            
        except json.JSONDecodeError as e:
            logging.error(f"JSON decoding error: {e}")
            logging.error(f"Raw response: {response}")
            raise
        except Exception as e:
            logging.error(f"Grading error: {e}")
            raise

    def batch_grade(self, submissions: Dict[str, str], question_text: str, answer_key: str, 
                   rubric: Optional[Union[Dict[str, Any], Rubric]] = None,
                   strictness: float = 0.5) -> Dict[str, Any]:
        """
        Grade multiple submissions in batch.
        
        Args:
            submissions: Dictionary mapping student names to their submissions
            question_text: The original question/prompt
            answer_key: The answer key or model answer
            rubric: Optional rubric for grading
            strictness: Grading strictness from 0.0 (lenient) to 1.0 (strict)
            
        Returns:
            Dictionary with all grading results
        """
        results = {}
        for student_name, submission in submissions.items():
            try:
                if not submission.strip():  # Skip empty submissions
                    logging.warning(f"Submission for {student_name} is empty. Skipping.")
                    results[student_name] = self._create_error_result(student_name)
                    continue

                result = self.grade_submission(
                    submission_text=submission,
                    question_text=question_text,
                    answer_key=answer_key,
                    student_name=student_name,
                    rubric=rubric,
                    strictness=strictness
                )
                results[student_name] = result
            except Exception as e:
                logging.error(f"Error grading {student_name}: {e}")
                results[student_name] = self._create_error_result(student_name)
        
        logging.info(f"Grading completed for {len(results)} submissions.")
        return results

    def generate_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a summary of grading results.
        
        Args:
            results: Dictionary mapping student names to their grading results
            
        Returns:
            Dictionary with summary statistics and formatted results for display
        """
        # Extract actual result dictionaries if we got GradingResult objects
        processed_results = {}
        for student_name, result in results.items():
            if isinstance(result, GradingResult):
                processed_results[student_name] = result.to_dict()
            else:
                processed_results[student_name] = result
        
        # Calculate summary statistics
        total_submissions = len(processed_results)
        if total_submissions == 0:
            return {
                "batch_info": {
                    "id": f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    "timestamp": datetime.now().isoformat(),
                    "total_submissions": 0
                },
                "summary_stats": {
                    "average_score": 0,
                    "average_percentage": 0,
                    "passing_count": 0,
                    "submission_count": 0,
                    "grade_distribution": {}
                },
                "student_results": {},
                "tabular_data": {
                    "headers": [],
                    "rows": []
                }
            }
        
        # Calculate grade distribution and other stats
        total_score = 0
        total_percentage = 0
        grade_distribution = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
        passing_count = 0
        
        for result in processed_results.values():
            score = result.get('score', 0)
            max_score = result.get('max_score', 100)
            percentage = (score / max_score * 100) if max_score > 0 else 0
            
            total_score += score
            total_percentage += percentage
            
            # Determine letter grade
            if percentage >= 90:
                grade_distribution["A"] += 1
            elif percentage >= 80:
                grade_distribution["B"] += 1
            elif percentage >= 70:
                grade_distribution["C"] += 1
                passing_count += 1
            elif percentage >= 60:
                grade_distribution["D"] += 1
            else:
                grade_distribution["F"] += 1
        
        average_score = total_score / total_submissions
        average_percentage = total_percentage / total_submissions
        
        # Prepare tabular data
        headers = ["Student", "Score", "Max Score", "Percentage", "Grade"]
        rows = []
        
        for student_name, result in processed_results.items():
            score = result.get('score', 0)
            max_score = result.get('max_score', 100)
            percentage = (score / max_score * 100) if max_score > 0 else 0
            
            # Determine letter grade
            grade = "F"
            if percentage >= 90:
                grade = "A"
            elif percentage >= 80:
                grade = "B"
            elif percentage >= 70:
                grade = "C"
            elif percentage >= 60:
                grade = "D"
            
            rows.append({
                "Student": student_name,
                "Score": score,
                "Max Score": max_score,
                "Percentage": f"{percentage:.1f}%",
                "Grade": grade
            })
        
        # Sort rows by score (descending)
        rows = sorted(rows, key=lambda x: x["Score"], reverse=True)
        
        summary = {
            "batch_info": {
                "id": f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "timestamp": datetime.now().isoformat(),
                "total_submissions": total_submissions
            },
            "summary_stats": {
                "average_score": average_score,
                "average_percentage": average_percentage,
                "passing_count": passing_count,
                "submission_count": total_submissions,
                "grade_distribution": grade_distribution
            },
            "student_results": processed_results,
            "tabular_data": {
                "headers": headers,
                "rows": rows
            }
        }
        
        return summary

    def _create_error_result(self, student_name: str = "Student") -> Dict[str, Any]:
        """Create a default error result when grading fails."""
        result = GradingResult(
            student_name=student_name,
            score=0,
            max_score=100,
            feedback="Error occurred during grading",
            criteria_scores=[],
            mistakes=[{"description": "Grading failed"}]
        )
        return result.to_dict()
        
    def get_rubric_from_text(self, rubric_text: str) -> dict:
        """
        Generate a grading rubric from the given text using Gemini API.
        
        Args:
            rubric_text: Text description of the rubric
            
        Returns:
            Dictionary representation of the rubric
        """
        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            prompt="""
            You are an expert in educational assessment and rubric design. Your task is to generate a detailed grading rubric in JSON format based on the given criteria. The rubric should be structured with clear sections, each containing multiple criteria with assigned points, descriptions, and response levels for detailed assessment.

            **Instructions:**
            - Output the rubric as a structured JSON object.
            - Include a "total_points" field representing the sum of all section points.
            - Each section should have:
            - A "name" field for the section title.
            - A "max_points" field specifying the maximum points for that section.
            - A "criteria" array containing individual grading criteria.
            - Each criterion should include:
            - A "name" field specifying the criterion.
            - A "points" field denoting the maximum assigned points.
            - A "description" field explaining what the criterion assesses.
            - A "grading_scale" array specifying different performance levels, each containing:
                - A "level" field for the performance category (e.g., "Excellent", "Good", "Fair", "Poor").
                - A "points" field indicating the score associated with that level.
                - A "description" field detailing what is expected at that level.

            **Example Structure:**
            {
            "total_points": 100,
            "sections": [
                {
                "name": "Content Knowledge",
                "max_points": 25,
                "criteria": [
                    {
                    "name": "Accuracy of Information",
                    "points": 10,
                    "description": "The response demonstrates accurate and well-researched knowledge relevant to the topic.",
                    "grading_scale": [
                        {
                        "level": "Excellent",
                        "points": 10,
                        "description": "All information is accurate, well-researched, and well-articulated."
                        },
                        {
                        "level": "Good",
                        "points": 7,
                        "description": "Most information is accurate, with minor inaccuracies that do not affect understanding."
                        },
                        {
                        "level": "Fair",
                        "points": 5,
                        "description": "Some information is inaccurate or lacks supporting evidence."
                        },
                        {
                        "level": "Poor",
                        "points": 2,
                        "description": "Information is mostly incorrect or lacks necessary depth."
                        }
                    ]
                    },
                    {
                    "name": "Depth of Analysis",
                    "points": 15,
                    "description": "Provides in-depth analysis with supporting examples and critical insights.",
                    "grading_scale": [
                        {
                        "level": "Excellent",
                        "points": 15,
                        "description": "Strong analytical depth with critical insights and multiple relevant examples."
                        },
                        {
                        "level": "Good",
                        "points": 10,
                        "description": "Adequate analysis with relevant examples, though some areas need improvement."
                        },
                        {
                        "level": "Fair",
                        "points": 7,
                        "description": "Basic analysis with limited depth and few supporting examples."
                        },
                        {
                        "level": "Poor",
                        "points": 3,
                        "description": "Minimal analysis with little to no supporting evidence."
                        }
                    ]
                    }
                ]
                },
                {
                "name": "Organization & Structure",
                "max_points": 20,
                "criteria": [
                    {
                    "name": "Logical Flow",
                    "points": 10,
                    "description": "Ideas are clearly structured and transitions effectively guide the reader through the content.",
                    "grading_scale": [
                        {
                        "level": "Excellent",
                        "points": 10,
                        "description": "Logical and seamless flow between ideas with strong transitions."
                        },
                        {
                        "level": "Good",
                        "points": 7,
                        "description": "Ideas are generally well-structured, but transitions could be improved."
                        },
                        {
                        "level": "Fair",
                        "points": 5,
                        "description": "Some organization is evident, but ideas jump around and lack clear transitions."
                        },
                        {
                        "level": "Poor",
                        "points": 2,
                        "description": "Lacks clear organization, making comprehension difficult."
                        }
                    ]
                    }
                ]
                }
            ]
            }
            ```
            - Ensure that the total points across all sections sum up to the value defined in the "total_points" field.
            - The rubric should be applicable to all educational submissions as per their course work.
            - Adapt the rubric to fit different complexity levels and educational standards.
            - Include detailed descriptions for each criterion to guide accurate assessment."""+f"Now, generate a JSON rubric tailored to the following context: {rubric_text}"
            
            response = self._make_api_call_with_retry(prompt)
            # Extract JSON from the response text
            start_index = response.find('{')
            end_index = response.rfind('}') + 1
            json_text = response[start_index:end_index]
            rubric_dict = json.loads(json_text)
            
            # Convert to our Rubric model format
            try:
                # Extract criteria from sections
                criteria_list = []
                for section in rubric_dict.get("sections", []):
                    section_name = section.get("name", "")
                    for criterion in section.get("criteria", []):
                        criterion["section"] = section_name
                        criteria_list.append(criterion)
                
                # Create Rubric object
                criteria = []
                for criterion_data in criteria_list:
                    # Extract levels from grading_scale
                    levels = []
                    for level in criterion_data.get("grading_scale", []):
                        levels.append({
                            "level": level.get("level", ""),
                            "points": level.get("points", 0),
                            "description": level.get("description", "")
                        })
                    
                    criteria.append(GradingCriteria(
                        name=criterion_data.get("name", ""),
                        description=criterion_data.get("description", ""),
                        max_points=criterion_data.get("points", 0),
                        levels=levels
                    ))
                
                rubric = Rubric(
                    name="Generated Rubric",
                    description=rubric_text[:100] + "...",
                    criteria=criteria
                )
                
                # Return both the original dict and our model
                return {
                    "original": rubric_dict,
                    "model": rubric.to_dict()
                }
                
            except Exception as e:
                logging.error(f"Error converting to Rubric model: {e}")
                return rubric_dict
                
        except Exception as e:
            logging.error(f"Error generating rubric from text: {e}")
            raise
    
    def grade_code_submission(self, 
                             submission_text: str,
                             file_metadata: Dict[str, Any],
                             student_name: str = "Student",
                             rubric: Optional[Union[Dict[str, Any], Rubric]] = None,
                             strictness: float = 0.5) -> Dict[str, Any]:
        """
        Grade a code submission using specialized code evaluation criteria.
        
        Args:
            submission_text: The code submission content with analysis
            file_metadata: Metadata about the file including language and analysis
            student_name: Name of the student
            rubric: Optional rubric for grading (will use default code rubric if None)
            strictness: Grading strictness level (0.0 to 1.0)
            
        Returns:
            Dictionary containing grading results
        """
        try:
            # Use default code rubric if none provided
            if rubric is None:
                rubric = self._get_default_code_rubric()
            
            # Ensure we have a proper rubric format
            if isinstance(rubric, Rubric):
                rubric_dict = rubric.to_grading_dict()
            else:
                rubric_dict = rubric
            
            # Convert strictness to level (0-5)
            strictness_level = int(strictness * 5)
            
            # Generate specialized code grading prompt
            prompt = get_code_grading_prompt(
                submission=submission_text,
                rubric=rubric_dict,
                file_metadata=file_metadata,
                strictness_level=strictness_level
            )
            
            # Get AI evaluation
            response = self._make_api_call_with_retry(prompt)
            
            # Parse JSON response
            result_data = self._parse_grading_response(response)
            
            # Validate and fix the scores
            result_data = self._validate_and_fix_scores(result_data, rubric_dict)
            
            # Apply accuracy enhancements for code
            result_data = self.accuracy_enhancer.enhance_grading_accuracy(result_data, rubric_dict)
            
            # Create GradingResult object with proper validation
            result = GradingResult(
                student_name=student_name,
                score=float(result_data.get("score", 0)),
                max_score=float(result_data.get("total", rubric_dict.get("total_points", 100))),
                feedback=result_data.get("grading_feedback", result_data.get("feedback", "No feedback available")),
                criteria_scores=result_data.get("criteria_scores", []),
                mistakes=[{"description": v} for k, v in result_data.get("mistakes", {}).items()],
                model_self_assessment=result_data.get("model_self_assessment", {}),
                accuracy_metrics=result_data.get("accuracy_metrics", {})
            )
            
            return result.to_dict()
            
        except Exception as e:
            logger.error(f"Error grading code submission: {e}")
            result = GradingResult(
                student_name=student_name,
                score=0,
                max_score=100,
                feedback=f"Error occurred during code grading: {str(e)}",
                criteria_scores=[],
                mistakes=[{"description": "Code grading failed"}]
            )
            return result.to_dict()
    
    def grade_enhanced_submission(self,
                                 submission_text: str,
                                 file_metadata: Dict[str, Any],
                                 student_name: str = "Student",
                                 rubric: Optional[Union[Dict[str, Any], Rubric]] = None,
                                 strictness: float = 0.5) -> Dict[str, Any]:
        """
        Grade a submission using enhanced file-type-aware evaluation.
        
        Args:
            submission_text: The submission content with analysis
            file_metadata: Metadata about the file type and content
            student_name: Name of the student
            rubric: Optional rubric for grading
            strictness: Grading strictness level (0.0 to 1.0)
            
        Returns:
            Dictionary containing grading results
        """
        try:
            # Use default rubric if none provided
            if rubric is None:
                rubric = self._get_default_general_rubric()
            
            # Ensure we have a proper rubric format
            if isinstance(rubric, Rubric):
                rubric_dict = rubric.to_grading_dict()
            else:
                rubric_dict = rubric
            
            # Convert strictness to level (0-5)
            strictness_level = int(strictness * 5)
            
            # Generate enhanced grading prompt
            prompt = get_enhanced_general_prompt(
                submission=submission_text,
                rubric=rubric_dict,
                file_metadata=file_metadata,
                strictness_level=strictness_level
            )
            
            # Get AI evaluation
            response = self._make_api_call_with_retry(prompt)
            
            # Parse JSON response
            result_data = self._parse_grading_response(response)
            
            # Validate and fix the scores
            result_data = self._validate_and_fix_scores(result_data, rubric_dict)
            
            # Apply accuracy enhancements for general content
            result_data = self.accuracy_enhancer.enhance_grading_accuracy(result_data, rubric_dict)
            
            # Create GradingResult object with proper validation
            result = GradingResult(
                student_name=student_name,
                score=float(result_data.get("score", 0)),
                max_score=float(result_data.get("total", rubric_dict.get("total_points", 100))),
                feedback=result_data.get("grading_feedback", result_data.get("feedback", "No feedback available")),
                criteria_scores=result_data.get("criteria_scores", []),
                mistakes=[{"description": v} for k, v in result_data.get("mistakes", {}).items()],
                model_self_assessment=result_data.get("model_self_assessment", {}),
                accuracy_metrics=result_data.get("accuracy_metrics", {})
            )
            
            return result.to_dict()
            
        except Exception as e:
            logger.error(f"Error grading enhanced submission: {e}")
            result = GradingResult(
                student_name=student_name,
                score=0,
                max_score=100,
                feedback=f"Error occurred during enhanced grading: {str(e)}",
                criteria_scores=[],
                mistakes=[{"description": "Enhanced grading failed"}]
            )
            return result.to_dict()
    
    def _get_default_code_rubric(self) -> Dict[str, Any]:
        """Get default rubric for code assignments."""
        return {
            "criteria": [
                {
                    "name": "Correctness & Functionality",
                    "max_points": 30,
                    "description": "Code solves the problem correctly and handles edge cases"
                },
                {
                    "name": "Code Quality & Style",
                    "max_points": 25,
                    "description": "Follows coding conventions, proper naming, and formatting"
                },
                {
                    "name": "Documentation & Comments",
                    "max_points": 20,
                    "description": "Adequate comments and self-documenting code"
                },
                {
                    "name": "Efficiency & Best Practices",
                    "max_points": 15,
                    "description": "Efficient algorithms and follows language best practices"
                },
                {
                    "name": "Structure & Organization",
                    "max_points": 10,
                    "description": "Logical organization and modular design"
                }
            ],
            "total_points": 100
        }

    async def grade_submission_multi_agent(self,
                                         submission_text: str,
                                         file_metadata: Dict[str, Any],
                                         student_name: str = "Student",
                                         rubric: Optional[Union[Dict[str, Any], Rubric]] = None,
                                         strictness: float = 0.5) -> Dict[str, Any]:
        """
        Grade a submission using multi-agent analysis with three independent AI agents.
        
        Args:
            submission_text: The submission content with all files dumped
            file_metadata: Metadata about the file type and analysis
            student_name: Name of the student
            rubric: Optional rubric for grading
            strictness: Grading strictness level (0.0 to 1.0)
            
        Returns:
            Dictionary containing consensus grading results from multiple agents
        """
        try:
            # Initialize multi-agent service if not already done
            if self.multi_agent_service is None:
                from multi_agent_grading import MultiAgentGradingService
                self.multi_agent_service = MultiAgentGradingService(genai.DEFAULT_API_KEY or "")
                logger.info("Initialized Multi-Agent Grading Service")
            
            # Use default rubric if none provided
            if rubric is None:
                file_type = file_metadata.get('file_type', 'unknown')
                if file_type == 'code' or file_metadata.get('language'):
                    rubric = self._get_default_code_rubric()
                else:
                    rubric = self._get_default_general_rubric()
            
            # Ensure we have a proper rubric format
            if isinstance(rubric, Rubric):
                rubric_dict = rubric.to_grading_dict()
            else:
                rubric_dict = rubric
            
            logger.info(f"Starting multi-agent grading for {student_name}")
            
            # Grade with multi-agent system
            result = await self.multi_agent_service.grade_submission_multi_agent(
                submission_text=submission_text,
                file_metadata=file_metadata,
                rubric=rubric_dict,
                student_name=student_name
            )
            
            logger.info(f"Multi-agent grading completed for {student_name} - Score: {result.get('score', 0):.1f}/{result.get('max_score', 100):.1f}")
            return result
            
        except Exception as e:
            logger.error(f"Error in multi-agent grading: {e}")
            # Fallback to single agent grading
            logger.info("Falling back to single-agent grading")
            return self.grade_enhanced_submission(
                submission_text, file_metadata, student_name, rubric, strictness
            )
    
    def _get_default_general_rubric(self) -> Dict[str, Any]:
        """Get default rubric for general assignments."""
        return {
            "criteria": [
                {
                    "name": "Content Quality",
                    "max_points": 40,
                    "description": "Accuracy, depth, and relevance of content"
                },
                {
                    "name": "Organization & Structure",
                    "max_points": 25,
                    "description": "Logical flow and clear organization"
                },
                {
                    "name": "Analysis & Critical Thinking",
                    "max_points": 20,
                    "description": "Depth of analysis and critical insights"
                },
                {
                    "name": "Communication & Clarity",
                    "max_points": 15,
                    "description": "Clear communication and proper presentation"
                }
            ],
            "total_points": 100
        }