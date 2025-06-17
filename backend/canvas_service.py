"""
ScorePAL - AI-Powered Academic Grading Assistant
Canvas LMS Integration Service

@author: Mohana Moganti (@Dead-Stone)
@license: MIT
@repository: https://github.com/Dead-Stone/ScorePAL
"""

import os
import logging
import tempfile
import shutil
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import json
import re
import requests

from utils.canvas_connector import CanvasConnector
from preprocessing_v2 import FilePreprocessor
from grading_v2 import GradingService

logger = logging.getLogger(__name__)

class CanvasGradingService:
    """Service to process Canvas assignments and integrate with grading system."""
    
    def __init__(self, canvas_url: str, canvas_api_key: str, gemini_api_key: str):
        """
        Initialize Canvas grading service.
        
        Args:
            canvas_url: Canvas instance URL
            canvas_api_key: Canvas API key
            gemini_api_key: Gemini API key for grading
        """
        self.canvas = CanvasConnector(canvas_url, canvas_api_key)
        self.file_preprocessor = FilePreprocessor()
        self.grading_service = GradingService(api_key=gemini_api_key)
        self.canvas_api_key = canvas_api_key
        logger.info("CanvasGradingService initialized")
    
    def test_connection(self) -> bool:
        """Test the Canvas connection."""
        return self.canvas.test_connection()
    
    def get_available_courses(self) -> List[Dict[str, Any]]:
        """Get all available courses."""
        courses = self.canvas.get_courses()
        return [
            {
                'id': course.id,
                'name': course.name,
                'code': getattr(course, 'course_code', ''),
                'start_date': getattr(course, 'start_at', ''),
                'end_date': getattr(course, 'end_at', '')
            }
            for course in courses
        ]
    
    def get_assignments_for_course(self, course_id: int) -> List[Dict[str, Any]]:
        """Get all assignments for a course."""
        assignments = self.canvas.get_assignments(course_id)
        return [
            {
                'id': assignment.id,
                'name': assignment.name,
                'due_date': getattr(assignment, 'due_at', ''),
                'points_possible': getattr(assignment, 'points_possible', 0),
                'submission_types': getattr(assignment, 'submission_types', [])
            }
            for assignment in assignments
        ]
    
    def get_submissions_for_assignment(self, course_id: int, assignment_id: int, 
                                     include: List[str] = None, per_page: int = 100) -> Dict[str, Any]:
        """
        Get all submissions for an assignment with pagination.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            include: List of additional data to include
            per_page: Number of submissions per page
            
        Returns:
            Dictionary containing submissions and metadata
        """
        try:
            # Get assignment details
            assignment = self.canvas.get_assignment(course_id, assignment_id)
            if not assignment:
                return {
                    'success': False,
                    'message': 'Assignment not found',
                    'submissions': []
                }
            
            # Get submissions with pagination
            submissions = self.canvas.get_submissions(
                course_id, 
                assignment_id,
                include=include,
                per_page=per_page
            )
            
            return {
                'success': True,
                'message': f'Retrieved {len(submissions)} submissions',
                'assignment': {
                    'id': assignment.id,
                    'name': assignment.name,
                    'points_possible': getattr(assignment, 'points_possible', 0),
                    'due_date': getattr(assignment, 'due_at', '')
                },
                'submissions': submissions
            }
            
        except Exception as e:
            logger.error(f"Error getting submissions: {str(e)}")
            return {
                'success': False,
                'message': f'Error getting submissions: {str(e)}',
                'submissions': []
            }
    
    def get_submission_details(self, course_id: int, assignment_id: int, 
                             user_id: int) -> Dict[str, Any]:
        """
        Get detailed information about a specific submission.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            user_id: Canvas user ID
            
        Returns:
            Dictionary containing submission details
        """
        try:
            # Get submission details
            submission = self.canvas.get_submission_details(course_id, assignment_id, user_id)
            if not submission:
                return {
                    'success': False,
                    'message': 'Submission not found',
                    'submission': None
                }
            
            return {
                'success': True,
                'message': 'Submission details retrieved successfully',
                'submission': submission
            }
            
        except Exception as e:
            logger.error(f"Error getting submission details: {str(e)}")
            return {
                'success': False,
                'message': f'Error getting submission details: {str(e)}',
                'submission': None
            }
    
    def process_assignment(self, course_id: int, assignment_id: int, 
                          output_dir: Optional[Path] = None) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Process an assignment from Canvas.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            output_dir: Custom output directory (optional)
            
        Returns:
            Tuple of (success, message, results_dict)
        """
        try:
            # Create temporary directory if no output dir specified
            temp_dir = None
            if output_dir is None:
                temp_dir = tempfile.mkdtemp()
                output_dir = Path(temp_dir)
            
            # Make sure output directory exists
            os.makedirs(output_dir, exist_ok=True)
            
            # Get assignment and course details
            course = self.canvas.get_course(course_id)
            assignment = self.canvas.get_assignment(course_id, assignment_id)
            
            if not course or not assignment:
                return False, "Course or assignment not found", {}
            
            logger.info(f"Processing assignment '{assignment.name}' from course '{course.name}'")
            
            # Download all submissions
            submissions_info = self.canvas.batch_download_submissions(
                course_id, assignment_id, output_dir
            )
            
            if not submissions_info:
                return False, "No submissions found or could not download submissions", {}
            
            # Process submissions
            results = {
                'course': {
                    'id': course.id,
                    'name': course.name
                },
                'assignment': {
                    'id': assignment.id,
                    'name': assignment.name
                },
                'submissions': {},
                'summary': {
                    'total_submissions': len(submissions_info),
                    'processed_submissions': 0,
                    'graded_submissions': 0,
                    'average_score': 0,
                    'min_score': 100,
                    'max_score': 0
                }
            }
            
            # Use default rubric
            default_rubric = {
                "criteria": [
                    {
                        "name": "Content Understanding",
                        "max_points": 30,
                        "description": "Understanding of core concepts and materials"
                    },
                    {
                        "name": "Analysis",
                        "max_points": 25,
                        "description": "Critical thinking and analytical skills"
                    },
                    {
                        "name": "Organization",
                        "max_points": 20,
                        "description": "Structure, flow, and clarity"
                    },
                    {
                        "name": "Evidence",
                        "max_points": 15,
                        "description": "Use of supporting evidence and examples"
                    },
                    {
                        "name": "Language & Mechanics",
                        "max_points": 10,
                        "description": "Grammar, spelling, and writing mechanics"
                    }
                ],
                "total_points": 100
            }
            
            # Extract text and grade each submission
            total_score = 0
            for user_id, submission_info in submissions_info.items():
                try:
                    # Get submission file path and extract text
                    submission_file = Path(submission_info['submission_file'])
                    question_paper_file = Path(submission_info['question_paper']) if submission_info['question_paper'] else None
                    
                    # Extract text from submission
                    submission_text = self.file_preprocessor.extract_text_from_file(submission_file)
                    
                    # Extract text from question paper
                    question_text = ""
                    if question_paper_file:
                        question_text = self.file_preprocessor.extract_text_from_file(question_paper_file)
                    
                    # Generate answer key if needed
                    answer_key = self.file_preprocessor._generate_answer_key(question_text, None)
                    
                    # Grade submission
                    grading_result = self.grading_service.grade_submission(
                        submission_text=submission_text,
                        question_text=question_text,
                        answer_key=answer_key,
                        student_name=submission_info['user_name'],
                        rubric=default_rubric,
                        strictness=0.5  # Default moderate strictness
                    )
                    
                    # Store results
                    submission_info['grading_result'] = grading_result
                    results['submissions'][user_id] = submission_info
                    
                    # Update summary statistics
                    results['summary']['processed_submissions'] += 1
                    
                    if 'score' in grading_result:
                        score = grading_result['score']
                        results['summary']['graded_submissions'] += 1
                        total_score += score
                        
                        if score < results['summary']['min_score']:
                            results['summary']['min_score'] = score
                        
                        if score > results['summary']['max_score']:
                            results['summary']['max_score'] = score
                    
                    logger.info(f"Processed submission for {submission_info['user_name']}")
                    
                except Exception as e:
                    logger.error(f"Error processing submission for user {submission_info['user_name']}: {str(e)}")
                    submission_info['error'] = str(e)
                    results['submissions'][user_id] = submission_info
            
            # Calculate average score
            if results['summary']['graded_submissions'] > 0:
                results['summary']['average_score'] = total_score / results['summary']['graded_submissions']
            
            # Save results
            results_file = output_dir / "grading_results.json"
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"Assignment processing complete. Results saved to {results_file}")
            
            return True, "Assignment processed successfully", results
            
        except Exception as e:
            logger.error(f"Error processing assignment: {str(e)}")
            return False, f"Error processing assignment: {str(e)}", {}
        
        finally:
            # Clean up temporary directory if we created one
            if temp_dir:
                shutil.rmtree(temp_dir)
    
    def post_grades_to_canvas(self, course_id: int, assignment_id: int, 
                            grades: Dict[str, Dict[str, Any]]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Post grades back to Canvas.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            grades: Dictionary mapping user IDs to grade information
            
        Returns:
            Tuple of (success, message, results_dict)
        """
        results = {
            'success': [],
            'failed': []
        }
        
        try:
            for user_id, grade_info in grades.items():
                try:
                    # Get grade and comment
                    grade = grade_info.get('grade', '')
                    comment = grade_info.get('comment', '')
                    
                    # Convert numeric grades to string
                    if isinstance(grade, (int, float)):
                        grade = str(grade)
                    
                    # Post grade to Canvas
                    success = self.canvas.post_grade(
                        course_id, assignment_id, user_id, grade, comment
                    )
                    
                    if success:
                        results['success'].append({
                            'user_id': user_id,
                            'grade': grade,
                            'comment': comment
                        })
                        logger.info(f"Posted grade {grade} for user {user_id}")
                    else:
                        results['failed'].append({
                            'user_id': user_id,
                            'grade': grade,
                            'comment': comment,
                            'error': 'Failed to post grade'
                        })
                        logger.error(f"Failed to post grade for user {user_id}")
                        
                except Exception as e:
                    results['failed'].append({
                        'user_id': user_id,
                        'grade': grade_info.get('grade', ''),
                        'comment': grade_info.get('comment', ''),
                        'error': str(e)
                    })
                    logger.error(f"Error posting grade for user {user_id}: {str(e)}")
            
            # Return results
            success_count = len(results['success'])
            failed_count = len(results['failed'])
            total_count = success_count + failed_count
            
            if failed_count == 0:
                return True, f"Successfully posted {success_count} grades to Canvas", results
            elif success_count == 0:
                return False, f"Failed to post all {failed_count} grades to Canvas", results
            else:
                return True, f"Posted {success_count} of {total_count} grades to Canvas ({failed_count} failed)", results
                
        except Exception as e:
            logger.error(f"Error posting grades to Canvas: {str(e)}")
            return False, f"Error posting grades to Canvas: {str(e)}", results

    async def download_submission_files(self, submission_data, output_dir):
        """Download files attached to a submission."""
        try:
            if not os.path.exists(output_dir):
                os.makedirs(output_dir, exist_ok=True)
            
            downloaded_files = []
            
            # Check if the submission has attachments
            if "attachments" in submission_data and submission_data["attachments"]:
                for attachment in submission_data["attachments"]:
                    file_url = attachment["url"]
                    file_name = attachment["filename"]
                    display_name = attachment["display_name"]
                    content_type = attachment.get("content-type", "application/octet-stream")
                    
                    # Create a safe filename
                    safe_name = re.sub(r'[^\w\-_\. ]', '_', display_name)
                    file_path = os.path.join(output_dir, safe_name)
                    
                    logger.info(f"Downloading file: {display_name} from {file_url}")
                    
                    try:
                        # Download the file with authorization
                        headers = {"Authorization": self.canvas_api_key}
                        response = requests.get(file_url, headers=headers, stream=True)
                        
                        if response.status_code == 200:
                            with open(file_path, 'wb') as f:
                                for chunk in response.iter_content(chunk_size=8192):
                                    f.write(chunk)
                        
                            downloaded_files.append({
                                "path": file_path,
                                "name": display_name,
                                "type": content_type,
                                "size": attachment.get("size", 0)
                            })
                            logger.info(f"Successfully downloaded: {file_path}")
                        else:
                            logger.error(f"Failed to download file {display_name}: Status code {response.status_code}")
                    except Exception as download_err:
                        logger.error(f"Error downloading individual file {display_name}: {str(download_err)}")
            
            return downloaded_files
        except Exception as e:
            logger.error(f"Error downloading submission files: {str(e)}")
            return []

    async def process_submissions(self, course_id, assignment_id, output_dir):
        """Process all submissions for an assignment and download their files."""
        try:
            # Create the output directory
            submissions_dir = os.path.join(output_dir, "submissions")
            os.makedirs(submissions_dir, exist_ok=True)
            
            # Get all submissions for this assignment
            url = f"{self.canvas_url}/api/v1/courses/{course_id}/assignments/{assignment_id}/submissions"
            headers = {"Authorization": self.canvas_api_key}
            params = {"include": ["attachments"]}
            
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code != 200:
                logger.error(f"Failed to get submissions: {response.status_code} - {response.text}")
                return False, f"Failed to get submissions: {response.status_code}", {}
            
            submissions_data = response.json()
            logger.info(f"Retrieved {len(submissions_data)} submissions")
            
            # Save raw submissions data for reference
            with open(os.path.join(output_dir, "submissions_data.json"), "w") as f:
                json.dump(submissions_data, f, indent=2)
            
            # Process each submission
            processed_submissions = {}
            
            for submission in submissions_data:
                user_id = submission.get("user_id")
                submission_id = submission.get("id")
                
                if not user_id or not submission_id:
                    continue
                
                # Create a directory for this submission
                user_dir = os.path.join(submissions_dir, f"user_{user_id}")
                os.makedirs(user_dir, exist_ok=True)
                
                # Save submission metadata
                with open(os.path.join(user_dir, "metadata.json"), "w") as f:
                    json.dump(submission, f, indent=2)
                
                # Download attached files
                files = await self.download_submission_files(submission, user_dir)
                
                # Process the submission
                processed_submissions[str(user_id)] = {
                    "submission_id": submission_id,
                    "user_id": user_id,
                    "grade": submission.get("grade"),
                    "score": submission.get("score"),
                    "submitted_at": submission.get("submitted_at"),
                    "files": files,
                    "status": "downloaded" if files else "no_files",
                    "directory": user_dir
                }
            
            return True, f"Successfully processed {len(processed_submissions)} submissions", processed_submissions
        except Exception as e:
            logger.error(f"Error processing submissions: {str(e)}")
            return False, f"Error processing submissions: {str(e)}", {} 