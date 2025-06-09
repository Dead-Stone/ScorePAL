"""
Canvas Grading Service for ScorePAL.
This module handles Canvas LMS integration with our grading system.
"""

import os
import logging
import tempfile
import shutil
import requests
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import json
import re
from datetime import datetime
import uuid

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
                'id': str(course.id),  # Convert to string for frontend compatibility
                'name': course.name,
                'course_code': getattr(course, 'course_code', ''),
                'enrollment_term_id': str(getattr(course, 'enrollment_term_id', '')),  # Convert to string
                'workflow_state': getattr(course, 'workflow_state', 'available'),
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
                'id': str(assignment.id),  # Convert to string for frontend compatibility
                'name': assignment.name,
                'description': getattr(assignment, 'description', ''),
                'course_id': str(course_id),  # Convert to string for frontend compatibility
                'due_at': getattr(assignment, 'due_at', None),
                'points_possible': getattr(assignment, 'points_possible', 0),
                'submission_types': getattr(assignment, 'submission_types', []),
                'workflow_state': getattr(assignment, 'workflow_state', 'unpublished')
            }
            for assignment in assignments
        ]
    
    def get_submissions_for_assignment(self, course_id: int, assignment_id: int, 
                                     include: List[str] = None, per_page: int = 50) -> Dict[str, Any]:
        """
        Get all submissions for an assignment with pagination and user enrichment.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            include: List of additional data to include
            per_page: Number of submissions per page (default 50 for SJSU API)
            
        Returns:
            Dictionary containing submissions and metadata
        """
        try:
            # Use direct API access to avoid permissions issues
            submissions = self.canvas.get_submissions_direct(
                course_id, 
                assignment_id,
                include=include,
                per_page=per_page
            )
            
            # Enrich submissions with user data if not already included
            if submissions and not submissions[0].get('user'):
                logger.info("Enriching submissions with user data...")
                submissions = self.canvas.enrich_submissions_with_users(submissions, course_id)
            
            # Try to get assignment details, but don't fail if we can't
            assignment_info = {
                'id': assignment_id,
                'name': f'Assignment {assignment_id}',
                'points_possible': 40,  # Default for SJSU format
                'due_date': ''
            }
            
            try:
                assignment = self.canvas.get_assignment(course_id, assignment_id)
                if assignment:
                    assignment_info = {
                        'id': assignment.id,
                        'name': assignment.name,
                        'points_possible': getattr(assignment, 'points_possible', 40),
                        'due_date': getattr(assignment, 'due_at', '')
                    }
            except Exception as assignment_error:
                logger.warning(f"Could not get assignment details (using defaults): {assignment_error}")
            
            # Process submissions to match expected format for frontend
            processed_submissions = []
            for submission in submissions:
                processed_submission = {
                    'id': submission.get('id'),
                    'user_id': submission.get('user_id'),
                    'assignment_id': submission.get('assignment_id'),
                    'submitted_at': submission.get('submitted_at'),
                    'workflow_state': submission.get('workflow_state'),
                    'grade': submission.get('grade'),
                    'score': submission.get('score'),
                    'entered_grade': submission.get('entered_grade'),
                    'entered_score': submission.get('entered_score'),
                    'submission_type': submission.get('submission_type'),
                    'body': submission.get('body'),
                    'url': submission.get('url'),
                    'attempt': submission.get('attempt'),
                    'late': submission.get('late', False),
                    'missing': submission.get('missing', False),
                    'excused': submission.get('excused', False),
                    'graded_at': submission.get('graded_at'),
                    'preview_url': submission.get('preview_url'),
                    'attachments': submission.get('attachments', []),
                    'user': submission.get('user', {})
                }
                
                # Ensure user information is present
                if not processed_submission['user'] and processed_submission['user_id']:
                    processed_submission['user'] = {
                        'id': processed_submission['user_id'],
                        'name': f"User {processed_submission['user_id']}",
                        'email': '',
                        'avatar_url': ''
                    }
                
                processed_submissions.append(processed_submission)
            
            return {
                'success': True,
                'message': f'Retrieved {len(processed_submissions)} submissions',
                'assignment': assignment_info,
                'submissions': processed_submissions
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
                          output_dir: Optional[Path] = None, rubric: Optional[Dict[str, Any]] = None, 
                          strictness: float = 0.5) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Process an assignment from Canvas.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            output_dir: Custom output directory (optional)
            rubric: Custom rubric to use for grading (optional)
            
        Returns:
            Tuple of (success, message, results_dict)
        """
        try:
            # Create temporary directory if no output dir specified
            temp_dir = None
            if output_dir is None:
                temp_dir = tempfile.mkdtemp()
                output_dir = Path(temp_dir)
            
            # Ensure output_dir is a Path object
            output_dir = Path(output_dir) if isinstance(output_dir, str) else output_dir
            
            # Make sure output directory exists
            os.makedirs(output_dir, exist_ok=True)
            
            # Get assignment and course details
            course = self.canvas.get_course(course_id)
            assignment = self.canvas.get_assignment(course_id, assignment_id)
            
            if not course or not assignment:
                return False, "Course or assignment not found", {}
            
            logger.info(f"Processing assignment '{assignment.name}' from course '{course.name}'")
            
            # Download all submissions with enhanced logging
            logger.info(f"Starting batch download of submissions from Canvas API")
            submissions_info = self.canvas.batch_download_submissions(
                course_id, assignment_id, output_dir
            )
            
            logger.info(f"Canvas API returned {len(submissions_info)} submissions that could be processed")
            
            if not submissions_info:
                # Try to get raw submission data for diagnostics
                try:
                    raw_submissions = self.canvas.get_submissions(course_id, assignment_id)
                    submission_count = len(raw_submissions)
                    submission_types = {}
                    for sub in raw_submissions:
                        sub_type = sub.get('submission_type', 'none')
                        submission_types[sub_type] = submission_types.get(sub_type, 0) + 1
                    
                    diagnostic_message = (
                        f"Found {submission_count} raw submissions, but none could be downloaded. "
                        f"Submission types: {submission_types}"
                    )
                    logger.warning(diagnostic_message)
                    return False, f"No submissions found or could not download submissions. {diagnostic_message}", {}
                except Exception as e:
                    logger.error(f"Error getting diagnostic info: {str(e)}")
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
            
            # Use provided rubric or default rubric
            grading_rubric = rubric if rubric else {
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
            
            if rubric:
                logger.info(f"Using custom rubric with {len(rubric['criteria'])} criteria and {rubric['total_points']} total points")
            else:
                logger.info("Using default rubric")
            
            # Extract text and grade each submission
            total_score = 0
            for user_id, submission_info in submissions_info.items():
                try:
                    logger.info(f"Processing submission from {submission_info['user_name']} (type: {submission_info.get('submission_type', 'unknown')})")
                    
                    # Extract text from all submission files in the new structure
                    submission_text = ""
                    files_processed = []
                    
                    # Check if submission has files
                    if submission_info.get('files') and len(submission_info['files']) > 0:
                        for file_info in submission_info['files']:
                            if file_info.get('download_status') == 'success' and file_info.get('absolute_path'):
                                file_path = Path(file_info['absolute_path'])
                                if file_path.exists():
                                    logger.info(f"Extracting text from {file_path}")
                                    try:
                                        file_text = self.file_preprocessor.extract_text_from_file(file_path)
                                        if file_text and len(file_text.strip()) > 10:
                                            submission_text += f"\n=== {file_info['original_name']} ===\n{file_text}\n"
                                            files_processed.append(file_info['original_name'])
                                    except Exception as file_error:
                                        logger.warning(f"Error extracting text from {file_path}: {str(file_error)}")
                    
                    # If no files were processed successfully, skip this submission
                    if not submission_text or len(submission_text.strip()) < 10:
                        logger.warning(f"No valid text extracted from submission files. Files: {[f.get('original_name') for f in submission_info.get('files', [])]}")
                        submission_info['error'] = "No valid text could be extracted from submission files"
                        submission_info['files_processed'] = files_processed
                        results['submissions'][user_id] = submission_info
                        continue
                    
                    # Extract text from question paper (if available in metadata directory)
                    question_text = ""
                    try:
                        # Look for question paper in the assignment metadata directory
                        metadata_file_path = Path(submission_info.get('metadata_file', ''))
                        if metadata_file_path.exists():
                            assignment_dir = metadata_file_path.parent.parent.parent  # Go up to assignment directory
                            question_paper_file = assignment_dir / "metadata" / "question_paper.html"
                            if question_paper_file.exists():
                                logger.info(f"Extracting text from question paper {question_paper_file}")
                                question_text = self.file_preprocessor.extract_text_from_file(question_paper_file)
                    except Exception as question_error:
                        logger.warning(f"Could not extract question paper text: {str(question_error)}")
                    
                    # Generate answer key if not available
                    if not answer_key and question_text:
                        try:
                            logger.info("Generating answer key from question text...")
                            answer_key = self.file_preprocessor._generate_answer_key(question_text, None)
                            
                            # Save the generated answer key
                            with open(answer_key_file, 'w', encoding='utf-8') as f:
                                f.write(answer_key)
                            logger.info("Answer key generated and saved")
                        except Exception as e:
                            logger.warning(f"Could not generate answer key: {e}")
                            answer_key = "No answer key available"
                    
                    # Grade submission
                    logger.info(f"Grading submission for {submission_info['user_name']}")
                    grading_result = self.grading_service.grade_submission(
                        submission_text=submission_text,
                        question_text=question_text,
                        answer_key=answer_key,
                        student_name=submission_info['user_name'],
                        rubric=grading_rubric,
                        strictness=strictness
                    )
                    
                    # Store results
                    submission_info['grading_result'] = grading_result
                    submission_info['files_processed'] = files_processed
                    submission_info['total_files'] = len(submission_info.get('files', []))
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
                    
                    logger.info(f"Successfully graded submission for {submission_info['user_name']} (processed {len(files_processed)} files)")
                    
                except Exception as e:
                    user_name = submission_info.get('user_name', 'unknown')
                    logger.error(f"Error processing submission for user {user_name}: {str(e)}")
                    submission_info['error'] = str(e)
                    submission_info['files_processed'] = files_processed if 'files_processed' in locals() else []
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

    def download_and_organize_submissions(self, course_id: int, assignment_id: int, 
                                        download_dir: str = "submissions") -> Dict[str, Any]:
        """
        Download and organize all submissions for an assignment using the new cloud-ready structure.
        
        Creates structure: submissions/course_{course_id}/assignment_{assignment_id}/
        - metadata/ - assignment info, sync data, question paper
        - submissions/student_{user_id}/ - individual student folders with files and metadata
        - batch_results/ - grading batch information and results
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            download_dir: Base directory for downloads (default: "submissions")
            
        Returns:
            Dictionary with download results and organization info
        """
        try:
            logger.info(f"Starting cloud-ready download for course {course_id}, assignment {assignment_id}")
            
            # Use the Canvas connector's batch download with new structure
            submissions_dict = self.canvas.batch_download_submissions(
                course_id, assignment_id, download_dir
            )
            
            if not submissions_dict:
                logger.warning("No submissions were downloaded")
                return {
                    'success': False,
                    'message': 'No submissions found or could not download submissions',
                    'submissions_count': 0,
                    'assignment_directory': None,
                    'submissions': {}
                }
            
            # Calculate statistics from results
            total_submissions = len(submissions_dict)
            successful_downloads = sum(1 for sub in submissions_dict.values() if sub.get('download_status') == 'success')
            graded_submissions = sum(1 for sub in submissions_dict.values() if sub.get('grade'))
            late_submissions = sum(1 for sub in submissions_dict.values() if sub.get('late', False))
            
            # Get assignment directory from first submission
            assignment_directory = None
            if submissions_dict:
                first_submission = next(iter(submissions_dict.values()))
                abs_dir = first_submission.get('absolute_directory', '')
                if abs_dir:
                    # Get assignment directory (parent of student directory)
                    assignment_directory = str(Path(abs_dir).parent.parent)
            
            result = {
                'success': True,
                'message': f'Successfully downloaded and organized {total_submissions} submissions',
                'submissions_count': total_submissions,
                'assignment_directory': assignment_directory,
                'statistics': {
                    'total_submissions': total_submissions,
                    'successful_downloads': successful_downloads,
                    'graded_submissions': graded_submissions,
                    'late_submissions': late_submissions
                },
                'submissions': submissions_dict,
                'ready_for_grading': True,
                'cloud_ready': True
            }
            
            logger.info(f"Successfully organized {total_submissions} submissions")
            logger.info(f"Assignment directory: {assignment_directory}")
            logger.info(f"Statistics: {result['statistics']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error downloading and organizing submissions: {str(e)}")
            return {
                'success': False,
                'message': f'Error downloading submissions: {str(e)}',
                'submissions_count': 0,
                'assignment_directory': None,
                'submissions': {},
                'ready_for_grading': False
            }

    def prepare_grading_batch(self, course_id: int, assignment_id: int, 
                            download_dir: str = "submissions") -> Dict[str, Any]:
        """
        Prepare a complete grading batch using the new cloud-ready structure.
        
        This method:
        1. Downloads and organizes all submissions using new structure
        2. Reads metadata files for comprehensive information
        3. Prepares the data structure for automated grading
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            download_dir: Base directory for downloads (default: "submissions")
            
        Returns:
            Complete grading batch ready for processing
        """
        try:
            # First, download and organize submissions
            download_result = self.download_and_organize_submissions(course_id, assignment_id, download_dir)
            
            if not download_result['success']:
                return download_result
            
            # Get assignment directory and read metadata
            assignment_directory = download_result.get('assignment_directory')
            assignment_info = None
            sync_info = None
            
            if assignment_directory:
                metadata_dir = Path(assignment_directory) / "metadata"
                
                # Read assignment info
                assignment_info_file = metadata_dir / "assignment_info.json"
                if assignment_info_file.exists():
                    try:
                        with open(assignment_info_file, 'r', encoding='utf-8') as f:
                            assignment_info = json.load(f)
                        logger.info(f"Loaded assignment info from {assignment_info_file}")
                    except Exception as e:
                        logger.warning(f"Could not read assignment info: {e}")
                
                # Read sync info
                sync_info_file = metadata_dir / "sync_info.json"
                if sync_info_file.exists():
                    try:
                        with open(sync_info_file, 'r', encoding='utf-8') as f:
                            sync_info = json.load(f)
                        logger.info(f"Loaded sync info from {sync_info_file}")
                    except Exception as e:
                        logger.warning(f"Could not read sync info: {e}")
            
            # Use assignment info if available, otherwise fallback
            if assignment_info:
                assignment_name = assignment_info.get('assignment_name', f'Assignment {assignment_id}')
                total_points = assignment_info.get('points_possible', 100)
            else:
                assignment_name = f'Assignment {assignment_id}'
                total_points = 100
            
            # Prepare grading batch structure
            grading_batch = {
                'course_id': course_id,
                'assignment_id': assignment_id,
                'assignment_name': assignment_name,
                'total_points': total_points,
                'download_info': download_result,
                'assignment_info': assignment_info,
                'sync_info': sync_info,
                'grading_ready': True,
                'grading_metadata': {
                    'batch_created': str(datetime.now()),
                    'submissions_to_grade': len(download_result['submissions']),
                    'assignment_directory': assignment_directory,
                    'grading_status': 'ready',
                    'structure_type': 'cloud_ready_v2',
                    'cloud_ready': True
                },
                'student_list': []
            }
            
            # Create student list for grading interface from download results
            for user_id, submission_info in download_result['submissions'].items():
                student_entry = {
                    'user_id': user_id,
                    'name': submission_info['user_name'],
                    'email': submission_info.get('user_email', ''),
                    'student_directory': submission_info.get('student_directory'),
                    'absolute_directory': submission_info.get('absolute_directory'),
                    'files': submission_info.get('files', []),
                    'metadata_file': submission_info.get('metadata_file'),
                    'results_file': submission_info.get('results_file'),
                    'submission_type': submission_info.get('submission_type'),
                    'current_grade': submission_info.get('grade'),
                    'current_score': submission_info.get('score'),
                    'submitted_at': submission_info.get('submitted_at'),
                    'late': submission_info.get('late', False),
                    'workflow_state': submission_info.get('workflow_state'),
                    'download_status': submission_info.get('download_status'),
                    'grading_status': 'pending',
                    'selected_for_grading': False
                }
                grading_batch['student_list'].append(student_entry)
            
            # If we have sync info, add more detailed information
            if sync_info:
                grading_batch['sync_id'] = sync_info.get('sync_id')
                grading_batch['synced_at'] = sync_info.get('synced_at')
                grading_batch['successful_downloads'] = sync_info.get('successful_downloads', 0)
                grading_batch['failed_downloads'] = sync_info.get('failed_downloads', 0)
                grading_batch['no_files'] = sync_info.get('no_files', 0)
            
            # Update batch info file
            if assignment_directory:
                batch_results_dir = Path(assignment_directory) / "batch_results"
                batch_file = batch_results_dir / 'grading_batch.json'
                
                # Read existing batch info and update it
                existing_batch = {}
                if batch_file.exists():
                    try:
                        with open(batch_file, 'r', encoding='utf-8') as f:
                            existing_batch = json.load(f)
                    except Exception as e:
                        logger.warning(f"Could not read existing batch file: {e}")
                
                # Update with new grading batch info
                existing_batch.update({
                    'total_students': len(grading_batch['student_list']),
                    'batch_updated': str(datetime.now()),
                    'grading_batch_prepared': True
                })
                
                with open(batch_file, 'w', encoding='utf-8') as f:
                    json.dump(existing_batch, f, indent=2, default=str)
                logger.info(f"Updated grading batch info in {batch_file}")
            
            logger.info(f"Prepared grading batch with {len(grading_batch['student_list'])} students")
            return grading_batch
            
        except Exception as e:
            logger.error(f"Error preparing grading batch: {str(e)}")
            return {
                'success': False,
                'message': f'Error preparing grading batch: {str(e)}',
                'grading_ready': False
            }

    def select_students_for_grading(self, course_id: int, assignment_id: int, 
                                  student_ids: List[int], base_dir: str = "submissions") -> Dict[str, Any]:
        """
        Select specific students for grading and update the selection file.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            student_ids: List of user IDs to select for grading
            base_dir: Base directory containing submissions
            
        Returns:
            Dictionary with selection results
        """
        try:
            # Build path to assignment directory
            if not base_dir.startswith('backend'):
                assignment_path = Path("backend") / base_dir / f"course_{course_id}" / f"assignment_{assignment_id}"
            else:
                assignment_path = Path(base_dir) / f"course_{course_id}" / f"assignment_{assignment_id}"
            
            # Create directory structure if it doesn't exist
            batch_results_dir = assignment_path / "batch_results"
            batch_results_dir.mkdir(parents=True, exist_ok=True)
            
            selected_file = batch_results_dir / "selected_students.json"
            
            # Get student information from Canvas for selected IDs
            selected_students = []
            
            try:
                # Get submissions from Canvas to get student info
                submissions_result = self.get_submissions_for_assignment(course_id, assignment_id, include=['user'])
                
                if submissions_result.get('success'):
                    all_submissions = submissions_result.get('submissions', [])
                    
                    # Create student info for selected IDs
                    for user_id in student_ids:
                        # Find submission for this user
                        user_submission = None
                        for submission in all_submissions:
                            if submission.get('user_id') == user_id:
                                user_submission = submission
                                break
                        
                        if user_submission:
                            user_info = user_submission.get('user', {})
                            selected_students.append({
                                'user_id': user_id,
                                'user_name': user_info.get('name', f'User_{user_id}'),
                                'user_email': user_info.get('email', ''),
                                'submission_type': user_submission.get('submission_type'),
                                'workflow_state': user_submission.get('workflow_state'),
                                'submitted_at': user_submission.get('submitted_at'),
                                'selected_at': str(datetime.now())
                            })
                        else:
                            # Create basic entry even if no submission found
                            selected_students.append({
                                'user_id': user_id,
                                'user_name': f'User_{user_id}',
                                'user_email': '',
                                'submission_type': None,
                                'workflow_state': 'unsubmitted',
                                'submitted_at': None,
                                'selected_at': str(datetime.now())
                            })
                else:
                    # Fallback: create basic entries for all selected students
                    for user_id in student_ids:
                        selected_students.append({
                            'user_id': user_id,
                            'user_name': f'User_{user_id}',
                            'user_email': '',
                            'submission_type': None,
                            'workflow_state': 'unknown',
                            'submitted_at': None,
                            'selected_at': str(datetime.now())
                        })
                        
            except Exception as canvas_error:
                logger.warning(f"Could not fetch student info from Canvas: {canvas_error}")
                # Fallback: create basic entries for all selected students
                for user_id in student_ids:
                    selected_students.append({
                        'user_id': user_id,
                        'user_name': f'User_{user_id}',
                        'user_email': '',
                        'submission_type': None,
                        'workflow_state': 'unknown',
                        'submitted_at': None,
                        'selected_at': str(datetime.now())
                    })
            
            # Save selection information
            selection_info = {
                'assignment_id': assignment_id,
                'selected_students': selected_students,
                'selection_timestamp': str(datetime.now()),
                'total_selected': len(selected_students)
            }
            
            with open(selected_file, 'w', encoding='utf-8') as f:
                json.dump(selection_info, f, indent=2, default=str)
            
            logger.info(f"Selected {len(selected_students)} students for grading: {[s['user_id'] for s in selected_students]}")
            return {
                'success': True,
                'message': f'Successfully selected {len(selected_students)} students for grading',
                'selected_students': selected_students,
                'selection_file': str(selected_file)
            }
            
        except Exception as e:
            logger.error(f"Error selecting students for grading: {str(e)}")
            return {
                'success': False,
                'message': f'Error selecting students: {str(e)}',
                'selected_students': []
            }

    def get_grading_results(self, course_id: int, assignment_id: int, 
                          base_dir: str = "submissions") -> Dict[str, Any]:
        """
        Get grading results for all students in an assignment with enhanced formatting for display.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            base_dir: Base directory containing submissions
            
        Returns:
            Dictionary with grading results formatted for table display
        """
        try:
            # Build path to assignment directory
            if not base_dir.startswith('backend'):
                assignment_path = Path("backend") / base_dir / f"course_{course_id}" / f"assignment_{assignment_id}"
            else:
                assignment_path = Path(base_dir) / f"course_{course_id}" / f"assignment_{assignment_id}"
            
            if not assignment_path.exists():
                return {
                    'success': False,
                    'message': f'Assignment directory not found: {assignment_path}',
                    'results': []
                }
            
            # Read assignment info
            assignment_info = {}
            metadata_dir = assignment_path / "metadata"
            assignment_info_file = metadata_dir / "assignment_info.json"
            if assignment_info_file.exists():
                with open(assignment_info_file, 'r', encoding='utf-8') as f:
                    assignment_info = json.load(f)
            
            # Read selected students
            selected_students = {}
            batch_results_dir = assignment_path / "batch_results"
            selected_file = batch_results_dir / "selected_students.json"
            if selected_file.exists():
                with open(selected_file, 'r', encoding='utf-8') as f:
                    selection_data = json.load(f)
                    for student in selection_data.get('selected_students', []):
                        selected_students[student['user_id']] = student
            
            # Collect results from all student directories
            results = []
            submissions_dir = assignment_path / "submissions"
            total_points = assignment_info.get('points_possible', 100)
            
            if submissions_dir.exists():
                for student_dir in submissions_dir.iterdir():
                    if student_dir.is_dir() and student_dir.name.startswith('student_'):
                        try:
                            # Read student metadata
                            metadata_file = student_dir / "metadata.json"
                            grading_results_file = student_dir / "grading_results.json"
                            
                            if metadata_file.exists():
                                with open(metadata_file, 'r', encoding='utf-8') as f:
                                    metadata = json.load(f)
                                
                                # Read grading results if available
                                grading_results = {}
                                if grading_results_file.exists():
                                    with open(grading_results_file, 'r', encoding='utf-8') as f:
                                        grading_results = json.load(f)
                                
                                user_id = metadata.get('user_id')
                                
                                # Determine grading status and scores
                                ai_score = grading_results.get('ai_score', 0)
                                final_score = grading_results.get('final_score', ai_score)
                                current_score = metadata.get('score', final_score)
                                
                                # Calculate percentage
                                if total_points > 0:
                                    percentage = round((final_score / total_points) * 100, 1)
                                else:
                                    percentage = 0
                                
                                # Determine status
                                grading_status = grading_results.get('grading_status', 'not_graded')
                                if grading_status == 'not_graded' and metadata.get('download_status') == 'success':
                                    status = 'ready'
                                elif grading_status == 'graded':
                                    status = 'graded'
                                elif grading_status == 'failed':
                                    status = 'failed'
                                elif grading_status == 'updating_coming_soon':
                                    status = 'updating_coming_soon'
                                elif metadata.get('download_status') == 'failed':
                                    status = 'download_failed'
                                else:
                                    status = 'pending'
                                
                                # Get letter grade
                                if percentage >= 90:
                                    letter_grade = 'A'
                                elif percentage >= 80:
                                    letter_grade = 'B'
                                elif percentage >= 70:
                                    letter_grade = 'C'
                                elif percentage >= 60:
                                    letter_grade = 'D'
                                else:
                                    letter_grade = 'F'
                                
                                # Format feedback for display
                                ai_feedback = grading_results.get('ai_feedback', 'No feedback available')
                                feedback_preview = ai_feedback[:150] + "..." if len(ai_feedback) > 150 else ai_feedback
                                
                                # Get files information
                                files_info = []
                                files_dir = student_dir / "files"
                                if files_dir.exists():
                                    for file in files_dir.iterdir():
                                        if file.is_file():
                                            files_info.append({
                                                'name': file.name,
                                                'size': file.stat().st_size,
                                                'type': file.suffix.lower()
                                            })
                                
                                result_entry = {
                                    'student_id': user_id,
                                    'student_name': metadata.get('user_name', f'Student {user_id}'),
                                    'student_email': metadata.get('user_email', ''),
                                    'score': final_score,
                                    'percentage': percentage,
                                    'letter_grade': letter_grade,
                                    'total_points': total_points,
                                    'status': status,
                                    'grading_status': grading_status,
                                    'feedback': ai_feedback,
                                    'feedback_preview': feedback_preview,
                                    'submission_type': metadata.get('submission_type', 'unknown'),
                                    'submitted_at': metadata.get('submitted_at'),
                                    'files_count': len(files_info),
                                    'files_info': files_info,
                                    'late': metadata.get('late', False),
                                    'missing': metadata.get('missing', False),
                                    'download_status': metadata.get('download_status', 'unknown'),
                                    'grading_timestamp': grading_results.get('grading_timestamp'),
                                    'rubric_scores': grading_results.get('rubric_scores', {}),
                                    'criteria_scores': grading_results.get('criteria_scores', []),
                                    'selected_for_grading': user_id in selected_students,
                                    'canvas_grade': metadata.get('grade'),
                                    'canvas_score': metadata.get('score'),
                                    'error_message': grading_results.get('error_message'),
                                    'student_directory': str(student_dir.relative_to(assignment_path.parent.parent))
                                }
                                
                                # Add selection info if available
                                if user_id in selected_students:
                                    result_entry['selection_info'] = selected_students[user_id]
                                
                                results.append(result_entry)
                                
                        except Exception as e:
                            logger.error(f"Error reading results for {student_dir.name}: {e}")
                            continue
            
            # Sort results by student name
            results.sort(key=lambda x: x.get('student_name', ''))
            
            # Calculate summary statistics
            total_students = len(results)
            graded_count = sum(1 for r in results if r.get('status') == 'graded')
            failed_count = sum(1 for r in results if r.get('status') == 'failed')
            ready_count = sum(1 for r in results if r.get('status') == 'ready')
            selected_count = sum(1 for r in results if r.get('selected_for_grading'))
            
            # Calculate grade distribution
            grade_distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
            total_score = 0
            graded_students = [r for r in results if r.get('status') == 'graded']
            
            for result in graded_students:
                grade_distribution[result['letter_grade']] += 1
                total_score += result['score']
            
            average_score = round(total_score / len(graded_students), 2) if graded_students else 0
            average_percentage = round((average_score / total_points) * 100, 1) if total_points > 0 else 0
            
            summary = {
                'total_students': total_students,
                'graded_students': graded_count,
                'failed_students': failed_count,
                'ready_students': ready_count,
                'selected_students': selected_count,
                'pending_students': total_students - graded_count - failed_count,
                'assignment_name': assignment_info.get('assignment_name', f'Assignment {assignment_id}'),
                'total_points': total_points,
                'average_score': average_score,
                'average_percentage': average_percentage,
                'grade_distribution': grade_distribution,
                'highest_score': max([r['score'] for r in graded_students], default=0),
                'lowest_score': min([r['score'] for r in graded_students], default=0)
            }
            
            logger.info(f"Retrieved grading results for {total_students} students ({graded_count} graded)")
            return {
                'success': True,
                'message': f'Retrieved results for {total_students} students ({graded_count} graded)',
                'assignment_directory': str(assignment_path),
                'summary': summary,
                'results': results
            }
            
        except Exception as e:
            logger.error(f"Error getting grading results: {str(e)}")
            return {
                'success': False,
                'message': f'Error retrieving grading results: {str(e)}',
                'results': []
            }

    def get_students_list_with_files(self, course_id: int, assignment_id: int, 
                                   base_dir: str = "submissions") -> Dict[str, Any]:
        """
        Extract and load all student data with their files for displaying in students list.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            base_dir: Base directory containing submissions
            
        Returns:
            Dictionary with all students data including files information
        """
        try:
            # Build path to assignment directory
            if not base_dir.startswith('backend'):
                assignment_path = Path("backend") / base_dir / f"course_{course_id}" / f"assignment_{assignment_id}"
            else:
                assignment_path = Path(base_dir) / f"course_{course_id}" / f"assignment_{assignment_id}"
            
            if not assignment_path.exists():
                return {
                    'success': False,
                    'message': f'Assignment directory not found: {assignment_path}',
                    'students': []
                }
            
            # Read assignment info
            assignment_info = {}
            metadata_dir = assignment_path / "metadata"
            assignment_info_file = metadata_dir / "assignment_info.json"
            if assignment_info_file.exists():
                with open(assignment_info_file, 'r', encoding='utf-8') as f:
                    assignment_info = json.load(f)
            
            # Read existing selection data
            selected_students_set = set()
            batch_results_dir = assignment_path / "batch_results"
            selected_file = batch_results_dir / "selected_students.json"
            if selected_file.exists():
                try:
                    with open(selected_file, 'r', encoding='utf-8') as f:
                        selection_data = json.load(f)
                        for student in selection_data.get('selected_students', []):
                            selected_students_set.add(student['user_id'])
                except Exception as e:
                    logger.warning(f"Could not read selection file: {e}")
            
            # Extract all student data
            students = []
            submissions_dir = assignment_path / "submissions"
            
            if submissions_dir.exists():
                for student_dir in submissions_dir.iterdir():
                    if student_dir.is_dir() and student_dir.name.startswith('student_'):
                        try:
                            # Read student metadata
                            metadata_file = student_dir / "metadata.json"
                            grading_results_file = student_dir / "grading_results.json"
                            
                            if metadata_file.exists():
                                with open(metadata_file, 'r', encoding='utf-8') as f:
                                    metadata = json.load(f)
                                
                                # Read grading results if available
                                grading_results = {}
                                if grading_results_file.exists():
                                    with open(grading_results_file, 'r', encoding='utf-8') as f:
                                        grading_results = json.load(f)
                                
                                user_id = metadata.get('user_id')
                                
                                # Process files information
                                files_info = []
                                for file_data in metadata.get('files', []):
                                    file_info = {
                                        'original_name': file_data.get('original_name'),
                                        'file_path': file_data.get('file_path'),
                                        'absolute_path': file_data.get('absolute_path'),
                                        'file_size': file_data.get('file_size', 0),
                                        'file_size_mb': round(file_data.get('file_size', 0) / (1024 * 1024), 2),
                                        'download_status': file_data.get('download_status'),
                                        'submission_type': file_data.get('submission_type'),
                                        'canvas_file_id': file_data.get('canvas_file_id')
                                    }
                                    files_info.append(file_info)
                                
                                # Create comprehensive student entry
                                student_entry = {
                                    'user_id': user_id,
                                    'user_name': metadata.get('user_name'),
                                    'user_email': metadata.get('user_email'),
                                    'submission_id': metadata.get('submission_id'),
                                    'submission_type': metadata.get('submission_type'),
                                    'submitted_at': metadata.get('submitted_at'),
                                    'late': metadata.get('late', False),
                                    'missing': metadata.get('missing', False),
                                    'workflow_state': metadata.get('workflow_state'),
                                    'current_grade': metadata.get('grade'),
                                    'current_score': metadata.get('score'),
                                    'entered_grade': metadata.get('entered_grade'),
                                    'entered_score': metadata.get('entered_score'),
                                    'attempt': metadata.get('attempt', 1),
                                    'download_status': metadata.get('download_status'),
                                    'download_timestamp': metadata.get('download_timestamp'),
                                    
                                    # Files information
                                    'files': files_info,
                                    'files_count': len(files_info),
                                    'total_files_size_mb': round(sum(f.get('file_size', 0) for f in metadata.get('files', [])) / (1024 * 1024), 2),
                                    
                                    # Grading information
                                    'grading_status': grading_results.get('grading_status', 'not_graded'),
                                    'ai_feedback': grading_results.get('ai_feedback'),
                                    'ai_score': grading_results.get('ai_score'),
                                    'final_grade': grading_results.get('final_grade'),
                                    'final_score': grading_results.get('final_score'),
                                    'grading_timestamp': grading_results.get('grading_timestamp'),
                                    'feedback_comments': grading_results.get('feedback_comments', []),
                                    'rubric_scores': grading_results.get('rubric_scores', {}),
                                    
                                    # Selection information
                                    'selected_for_grading': user_id in selected_students_set,
                                    'selection_timestamp': grading_results.get('selection_timestamp'),
                                    
                                    # Directory information
                                    'student_directory': str(student_dir.relative_to(assignment_path.parent.parent)),
                                    'absolute_directory': str(student_dir.absolute()),
                                    'metadata_file': str(metadata_file.absolute()),
                                    'results_file': str(grading_results_file.absolute())
                                }
                                
                                students.append(student_entry)
                                
                        except Exception as e:
                            logger.error(f"Error processing student directory {student_dir.name}: {e}")
                            continue
            
            # Sort students by name
            students.sort(key=lambda x: x.get('user_name', ''))
            
            # Calculate statistics
            total_students = len(students)
            students_with_files = sum(1 for s in students if s['files_count'] > 0)
            selected_students = sum(1 for s in students if s['selected_for_grading'])
            graded_students = sum(1 for s in students if s['grading_status'] != 'not_graded')
            late_submissions = sum(1 for s in students if s['late'])
            
            statistics = {
                'total_students': total_students,
                'students_with_files': students_with_files,
                'selected_students': selected_students,
                'graded_students': graded_students,
                'pending_students': total_students - graded_students,
                'late_submissions': late_submissions,
                'assignment_name': assignment_info.get('assignment_name', f'Assignment {assignment_id}'),
                'total_points': assignment_info.get('points_possible', 100)
            }
            
            logger.info(f"Extracted data for {total_students} students with {students_with_files} having files")
            return {
                'success': True,
                'message': f'Successfully extracted data for {total_students} students',
                'assignment_directory': str(assignment_path),
                'assignment_info': assignment_info,
                'statistics': statistics,
                'students': students
            }
            
        except Exception as e:
            logger.error(f"Error extracting student data: {str(e)}")
            return {
                'success': False,
                'message': f'Error extracting student data: {str(e)}',
                'students': []
            }

    def grade_selected_students_only(self, course_id: int, assignment_id: int, 
                                   base_dir: str = "submissions", strictness: float = 0.5) -> Dict[str, Any]:
        """
        Grade only the students that have been selected for grading with improved error handling.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            base_dir: Base directory containing submissions
            
        Returns:
            Dictionary with grading results
        """
        try:
            # Build path to assignment directory
            if not base_dir.startswith('backend'):
                assignment_path = Path("backend") / base_dir / f"course_{course_id}" / f"assignment_{assignment_id}"
            else:
                assignment_path = Path(base_dir) / f"course_{course_id}" / f"assignment_{assignment_id}"
            
            if not assignment_path.exists():
                return {
                    'success': False,
                    'message': f'Assignment directory not found: {assignment_path}',
                    'results': {}
                }
            
            # Read assignment info
            assignment_info = {}
            metadata_dir = assignment_path / "metadata"
            assignment_info_file = metadata_dir / "assignment_info.json"
            if assignment_info_file.exists():
                with open(assignment_info_file, 'r', encoding='utf-8') as f:
                    assignment_info = json.load(f)
            
            # Get selected students
            batch_results_dir = assignment_path / "batch_results"
            selected_file = batch_results_dir / "selected_students.json"
            
            if not selected_file.exists():
                return {
                    'success': False,
                    'message': 'No students selected for grading. Please select students first.',
                    'results': {}
                }
            
            with open(selected_file, 'r', encoding='utf-8') as f:
                selection_data = json.load(f)
            
            selected_students = selection_data.get('selected_students', [])
            if not selected_students:
                return {
                    'success': False,
                    'message': 'No students in selection list.',
                    'results': {}
                }
            
            # Read answer key if available
            answer_key_file = metadata_dir / "answer_key.txt"
            answer_key = ""
            if answer_key_file.exists():
                with open(answer_key_file, 'r', encoding='utf-8') as f:
                    answer_key = f.read().strip()
            
            # Read question paper if available  
            question_file = metadata_dir / "question_paper.html"
            question_text = assignment_info.get('description', 'No question description available')
            if question_file.exists():
                with open(question_file, 'r', encoding='utf-8') as f:
                    question_text = f.read().strip()
            
            logger.info(f"Starting grading for {len(selected_students)} selected students")
            
            # Process each selected student
            grading_results = {}
            successful_grades = 0
            failed_grades = 0
            
            for i, student in enumerate(selected_students):
                user_id = student['user_id']
                user_name = student['user_name']
                
                try:
                    logger.info(f"Processing student {i+1}/{len(selected_students)}: {user_name} (ID: {user_id})")
                    
                    # Find student directory
                    student_dir = assignment_path / "submissions" / f"student_{user_id}"
                    if not student_dir.exists():
                        logger.warning(f"Student directory not found: {student_dir}")
                        failed_grades += 1
                        continue
                    
                    # Read metadata
                    metadata_file = student_dir / "metadata.json"
                    if not metadata_file.exists():
                        logger.warning(f"Metadata file not found for student {user_id}")
                        failed_grades += 1
                        continue
                    
                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                    
                    # Check if already graded successfully
                    grading_results_file = student_dir / "grading_results.json"
                    if grading_results_file.exists():
                        with open(grading_results_file, 'r', encoding='utf-8') as f:
                            existing_results = json.load(f)
                        
                        if existing_results.get('grading_status') == 'graded':
                            logger.info(f"Student {user_name} already graded successfully, skipping")
                            grading_results[user_id] = existing_results
                            successful_grades += 1
                            continue
                    
                    # Extract text from submitted files using Canvas URLs
                    submission_text = ""
                    gradeable_files = []
                    non_pdf_files = []
                    
                    # Get file information from metadata
                    files_data = metadata.get('files', [])
                    
                    if files_data:
                        for file_data in files_data:
                            file_name = file_data.get('filename', '')
                            file_url = file_data.get('url', '')
                            file_type = file_data.get('content-type', '').lower()
                            
                            # Check if it's a PDF file
                            is_pdf = (
                                file_type == 'application/pdf' or 
                                file_name.lower().endswith('.pdf')
                            )
                            
                            if is_pdf:
                                gradeable_files.append({
                                    'name': file_name,
                                    'url': file_url,
                                    'type': 'pdf'
                                })
                            else:
                                non_pdf_files.append({
                                    'name': file_name,
                                    'url': file_url,
                                    'type': file_type
                                })
                    
                    # Process gradeable files (PDFs only for now)
                    if gradeable_files:
                        for file_info in gradeable_files:
                            try:
                                # Download file content from Canvas URL
                                logger.info(f"Downloading {file_info['name']} from Canvas URL")
                                
                                # Use Canvas API to download file
                                headers = {'Authorization': f'Bearer {self.canvas_api_key}'}
                                
                                response = requests.get(file_info['url'], headers=headers, timeout=30)
                                
                                if response.status_code == 200:
                                    # Save file temporarily and extract text
                                    temp_file_path = student_dir / "temp_files" / file_info['name']
                                    temp_file_path.parent.mkdir(exist_ok=True)
                                    
                                    with open(temp_file_path, 'wb') as f:
                                        f.write(response.content)
                                    
                                    # Extract text from PDF
                                    extracted_text = self.file_preprocessor.extract_text_from_file(temp_file_path)
                                    if extracted_text:
                                        submission_text += f"\n--- {file_info['name']} ---\n{extracted_text}\n"
                                    
                                    # Clean up temp file
                                    temp_file_path.unlink(missing_ok=True)
                                    
                                else:
                                    logger.warning(f"Failed to download {file_info['name']}: HTTP {response.status_code}")
                                    
                            except Exception as e:
                                logger.warning(f"Could not process file {file_info['name']}: {e}")
                    
                    # Handle non-PDF files
                    if non_pdf_files and not gradeable_files:
                        logger.info(f"Student {user_name} has only non-PDF files. Grading not supported yet.")
                        
                        # Save "updating coming soon" result
                        updating_result = {
                            'grading_status': 'updating_coming_soon',
                            'error_message': 'Non-PDF file grading not yet supported',
                            'ai_feedback': f'Grading for {", ".join([f["name"] for f in non_pdf_files])} coming soon. Currently only PDF files are supported.',
                            'ai_score': 0,
                            'final_score': 0,
                            'final_grade': 'Pending',
                            'grading_timestamp': datetime.now().isoformat(),
                            'selected_for_grading': True,
                            'file_types': [f['type'] for f in non_pdf_files],
                            'files_info': non_pdf_files
                        }
                        
                        with open(grading_results_file, 'w', encoding='utf-8') as f:
                            json.dump(updating_result, f, indent=2)
                        
                        grading_results[user_id] = updating_result
                        logger.info(f"Marked {user_name} as 'updating coming soon' due to non-PDF files")
                        continue
                    
                    elif non_pdf_files and gradeable_files:
                        # Mixed file types - note in feedback
                        submission_text += f"\n--- NOTE ---\nNon-PDF files not graded: {', '.join([f['name'] for f in non_pdf_files])}\n"
                    
                    if not submission_text.strip():
                        logger.warning(f"No extractable text found for student {user_name}")
                        # Save failure result
                        failure_result = {
                            'grading_status': 'failed',
                            'error_message': 'No extractable text found in submission',
                            'ai_feedback': 'Unable to grade: No readable text found in submitted files',
                            'ai_score': 0,
                            'final_score': 0,
                            'final_grade': 'F',
                            'grading_timestamp': datetime.now().isoformat(),
                            'selected_for_grading': True
                        }
                        
                        with open(grading_results_file, 'w', encoding='utf-8') as f:
                            json.dump(failure_result, f, indent=2)
                        
                        grading_results[user_id] = failure_result
                        failed_grades += 1
                        continue
                    
                    # Generate answer key if not available
                    if not answer_key and question_text:
                        try:
                            logger.info("Generating answer key from question text...")
                            answer_key = self.file_preprocessor._generate_answer_key(question_text, None)
                            
                            # Save the generated answer key
                            with open(answer_key_file, 'w', encoding='utf-8') as f:
                                f.write(answer_key)
                            logger.info("Answer key generated and saved")
                        except Exception as e:
                            logger.warning(f"Could not generate answer key: {e}")
                            answer_key = "No answer key available"
                    
                    # Grade the submission with retry logic handled by GradingService
                    logger.info(f"Grading submission for {user_name}...")
                    grade_result = self.grading_service.grade_submission(
                        submission_text=submission_text,
                        question_text=question_text,
                        answer_key=answer_key,
                        student_name=user_name,
                        strictness=strictness
                    )
                    
                    # Save grading results
                    grading_result = {
                        'grading_status': 'graded',
                        'ai_feedback': grade_result.get('feedback', 'No feedback provided'),
                        'ai_score': grade_result.get('score', 0),
                        'final_score': grade_result.get('score', 0),
                        'final_grade': grade_result.get('grade_letter', 'F'),
                        'grading_timestamp': datetime.now().isoformat(),
                        'selected_for_grading': True,
                        'criteria_scores': grade_result.get('criteria_scores', []),
                        'mistakes': grade_result.get('mistakes', []),
                        'percentage': grade_result.get('percentage', 0)
                    }
                    
                    with open(grading_results_file, 'w', encoding='utf-8') as f:
                        json.dump(grading_result, f, indent=2)
                    
                    grading_results[user_id] = grading_result
                    successful_grades += 1
                    
                    logger.info(f"Successfully graded {user_name}: {grade_result.get('score', 0)} points")
                    
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Error grading student {user_name}: {error_msg}")
                    
                    # Save failure result
                    failure_result = {
                        'grading_status': 'failed',
                        'error_message': error_msg,
                        'ai_feedback': f'Grading failed: {error_msg}',
                        'ai_score': 0,
                        'final_score': 0,
                        'final_grade': 'F',
                        'grading_timestamp': datetime.now().isoformat(),
                        'selected_for_grading': True
                    }
                    
                    try:
                        with open(grading_results_file, 'w', encoding='utf-8') as f:
                            json.dump(failure_result, f, indent=2)
                    except:
                        pass  # Don't fail if we can't save the failure result
                    
                    grading_results[user_id] = failure_result
                    failed_grades += 1
                    
                    # Check if this is a rate limit error and break early if needed
                    if "rate limit" in error_msg.lower() or "429" in error_msg:
                        logger.warning("Rate limit detected, stopping grading process")
                        break
            
            # Save overall grading results summary
            summary_result = {
                'grading_completed': True,
                'total_selected': len(selected_students),
                'successful_grades': successful_grades,
                'failed_grades': failed_grades,
                'completion_timestamp': datetime.now().isoformat(),
                'assignment_info': assignment_info
            }
            
            summary_file = batch_results_dir / "grading_summary.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary_result, f, indent=2)
            
            logger.info(f"Grading completed: {successful_grades} successful, {failed_grades} failed")
            return {
                'success': True,
                'message': f'Grading completed: {successful_grades} successful, {failed_grades} failed out of {len(selected_students)} selected students',
                'results': grading_results,
                'summary': summary_result
            }
            
        except Exception as e:
            logger.error(f"Error in grade_selected_students_only: {str(e)}")
            return {
                'success': False,
                'message': f'Error during grading: {str(e)}',
                'results': {}
            }

    def update_student_selection(self, course_id: int, assignment_id: int, 
                               student_ids: List[int], action: str = "select",
                               base_dir: str = "submissions") -> Dict[str, Any]:
        """
        Update student selection (add or remove students from selection).
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            student_ids: List of user IDs to update
            action: "select" or "deselect"
            base_dir: Base directory containing submissions
            
        Returns:
            Dictionary with updated selection results
        """
        try:
            # Build path to assignment directory
            if not base_dir.startswith('backend'):
                assignment_path = Path("backend") / base_dir / f"course_{course_id}" / f"assignment_{assignment_id}"
            else:
                assignment_path = Path(base_dir) / f"course_{course_id}" / f"assignment_{assignment_id}"
            
            if not assignment_path.exists():
                return {
                    'success': False,
                    'message': f'Assignment directory not found: {assignment_path}',
                    'selected_students': []
                }
            
            batch_results_dir = assignment_path / "batch_results"
            selected_file = batch_results_dir / "selected_students.json"
            
            # Read existing selection
            selection_data = {
                'assignment_id': assignment_id,
                'selected_students': [],
                'selection_timestamp': str(datetime.now()),
                'total_selected': 0
            }
            
            existing_selected = {}
            if selected_file.exists():
                with open(selected_file, 'r', encoding='utf-8') as f:
                    selection_data = json.load(f)
                    for student in selection_data.get('selected_students', []):
                        existing_selected[student['user_id']] = student
            
            # Update selection based on action
            submissions_dir = assignment_path / "submissions"
            
            for user_id in student_ids:
                student_dir = submissions_dir / f"student_{user_id}"
                if student_dir.exists():
                    metadata_file = student_dir / "metadata.json"
                    results_file = student_dir / "grading_results.json"
                    
                    if metadata_file.exists():
                        try:
                            with open(metadata_file, 'r', encoding='utf-8') as f:
                                metadata = json.load(f)
                            
                            if action == "select":
                                # Add to selection
                                existing_selected[user_id] = {
                                    'user_id': user_id,
                                    'user_name': metadata.get('user_name', f'User_{user_id}'),
                                    'user_email': metadata.get('user_email', ''),
                                    'submission_type': metadata.get('submission_type'),
                                    'files_count': len(metadata.get('files', [])),
                                    'download_status': metadata.get('download_status'),
                                    'student_directory': str(student_dir.relative_to(assignment_path.parent.parent)),
                                    'selected_at': str(datetime.now())
                                }
                                
                                # Update grading results
                                if results_file.exists():
                                    with open(results_file, 'r', encoding='utf-8') as f:
                                        results = json.load(f)
                                    results['selected_for_grading'] = True
                                    results['selection_timestamp'] = str(datetime.now())
                                    with open(results_file, 'w', encoding='utf-8') as f:
                                        json.dump(results, f, indent=2, default=str)
                                        
                            elif action == "deselect":
                                # Remove from selection
                                if user_id in existing_selected:
                                    del existing_selected[user_id]
                                
                                # Update grading results
                                if results_file.exists():
                                    with open(results_file, 'r', encoding='utf-8') as f:
                                        results = json.load(f)
                                    results['selected_for_grading'] = False
                                    results['selection_timestamp'] = None
                                    with open(results_file, 'w', encoding='utf-8') as f:
                                        json.dump(results, f, indent=2, default=str)
                                        
                        except Exception as e:
                            logger.error(f"Error updating selection for student {user_id}: {e}")
                            continue
            
            # Update selection file
            selection_data['selected_students'] = list(existing_selected.values())
            selection_data['total_selected'] = len(existing_selected)
            selection_data['selection_timestamp'] = str(datetime.now())
            
            with open(selected_file, 'w', encoding='utf-8') as f:
                json.dump(selection_data, f, indent=2, default=str)
            
            logger.info(f"Updated selection: {action}ed {len(student_ids)} students. Total selected: {len(existing_selected)}")
            return {
                'success': True,
                'message': f'Successfully {action}ed {len(student_ids)} students',
                'selected_students': selection_data['selected_students'],
                'total_selected': len(existing_selected),
                'action': action
            }
            
        except Exception as e:
            logger.error(f"Error updating student selection: {str(e)}")
            return {
                'success': False,
                'message': f'Error updating selection: {str(e)}',
                'selected_students': []
            }

    def get_selection_status(self, course_id: int, assignment_id: int, 
                           base_dir: str = "submissions") -> Dict[str, Any]:
        """
        Get current selection status for an assignment.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            base_dir: Base directory containing submissions
            
        Returns:
            Dictionary with current selection status
        """
        try:
            # Build path to assignment directory
            if not base_dir.startswith('backend'):
                assignment_path = Path("backend") / base_dir / f"course_{course_id}" / f"assignment_{assignment_id}"
            else:
                assignment_path = Path(base_dir) / f"course_{course_id}" / f"assignment_{assignment_id}"
            
            # Read selection data
            batch_results_dir = assignment_path / "batch_results"
            selected_file = batch_results_dir / "selected_students.json"
            
            if not selected_file.exists():
                logger.info(f"No selection file found at {selected_file}")
                return {
                    'success': True,
                    'message': 'No selection file found. No students currently selected.',
                    'selected_students': [],
                    'total_selected': 0,
                    'selection_timestamp': None
                }
            
            with open(selected_file, 'r', encoding='utf-8') as f:
                selection_data = json.load(f)
            
            selected_students = selection_data.get('selected_students', [])
            logger.info(f"Found selection file with {len(selected_students)} selected students: {[s.get('user_id') for s in selected_students]}")
            
            return {
                'success': True,
                'message': f'Found {len(selected_students)} selected students',
                'selected_students': selected_students,
                'total_selected': len(selected_students),
                'selection_timestamp': selection_data.get('selection_timestamp'),
                'assignment_id': selection_data.get('assignment_id')
            }
            
        except Exception as e:
            logger.error(f"Error getting selection status: {str(e)}")
            return {
                'success': False,
                'message': f'Error getting selection status: {str(e)}',
                'selected_students': []
            } 