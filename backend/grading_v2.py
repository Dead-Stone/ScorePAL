"""
ScorePAL - AI-Powered Academic Grading Assistant
AI Grading Service with Google Gemini Integration

@author: Mohana Moganti (@Dead-Stone)
@license: MIT
@repository: https://github.com/Dead-Stone/ScorePAL
"""

#grading_v2.py
from datetime import datetime
import logging
import re
import google.generativeai as genai
from typing import Dict, Any, List, Optional, Union
import json
from prompts.answer_key_prompt import get_answer_key_prompt
from prompts.grading_prompt import get_grading_prompt 
from prompts.image_prompt import get_image_description_prompt
from models.rubric import Rubric, GradingCriteria
import os

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
        timestamp: Optional[str] = None
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
        """
        self.student_name = student_name
        self.score = score
        self.max_score = max_score
        self.feedback = feedback
        self.criteria_scores = criteria_scores or []
        self.mistakes = mistakes or []
        self.timestamp = timestamp or datetime.now().isoformat()
    
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
            "timestamp": self.timestamp
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
            timestamp=data.get("timestamp")
        )


class GradingService:
    def __init__(self, api_key: str):
        self.model = genai.GenerativeModel("gemini-2.0-flash")
        genai.configure(api_key=api_key)

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
            response = self.model.generate_content(prompt)
            
            # Extract JSON content from the response
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON content found in the response")

            json_content = json_match.group(0)
            response_data = json.loads(json_content)
            
            # Create detailed criteria scores if not present
            if "criteria_scores" not in response_data and "criteria" in rubric_dict:
                criteria_scores = []
                for criterion in rubric_dict.get("criteria", []):
                    criterion_name = criterion.get("name", "")
                    criterion_max = criterion.get("max_points", 0)
                    
                    # Look for this criterion in the response
                    criterion_score = 0
                    criterion_feedback = ""
                    
                    for mistake in response_data.get("mistakes", {}).values():
                        if criterion_name.lower() in mistake.lower():
                            criterion_feedback = mistake
                            break
                    
                    criteria_scores.append({
                        "name": criterion_name,
                        "points": criterion_score,
                        "max_points": criterion_max,
                        "feedback": criterion_feedback
                    })
                
                response_data["criteria_scores"] = criteria_scores
            
            # Format the result
            result = GradingResult(
                student_name=student_name,
                score=float(response_data.get("score", 0)),
                max_score=float(response_data.get("total", 100)),
                feedback=response_data.get("grading_feedback", ""),
                criteria_scores=response_data.get("criteria_scores", []),
                mistakes=[{"description": v} for k, v in response_data.get("mistakes", {}).items()]
            )
            
            return result.to_dict()
            
        except json.JSONDecodeError as e:
            logging.error(f"JSON decoding error: {e}")
            logging.error(f"Raw response: {response.text}")
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
            
            response = model.generate_content(prompt)
            # Extract JSON from the response text
            start_index = response.text.find('{')
            end_index = response.text.rfind('}') + 1
            json_text = response.text[start_index:end_index]
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