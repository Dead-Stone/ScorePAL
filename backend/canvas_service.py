"""
Canvas Grading Service for ScorePAL.
This module handles Canvas LMS integration with our grading system.
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
from datetime import datetime

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
                          output_dir: Optional[Path] = None, rubric: Optional[Dict[str, Any]] = None) -> Tuple[bool, str, Dict[str, Any]]:
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
                    
                    # Get submission file path and extract text
                    submission_file = Path(submission_info['submission_file'])
                    question_paper_file = Path(submission_info['question_paper']) if submission_info['question_paper'] else None
                    
                    # Extract text from submission
                    logger.info(f"Extracting text from {submission_file}")
                    submission_text = self.file_preprocessor.extract_text_from_file(submission_file)
                    
                    if not submission_text or len(submission_text.strip()) < 10:
                        logger.warning(f"Extracted text is too short or empty: '{submission_text}'")
                        submission_info['error'] = "Extracted text is too short or empty"
                        results['submissions'][user_id] = submission_info
                        continue
                    
                    # Extract text from question paper
                    question_text = ""
                    if question_paper_file:
                        logger.info(f"Extracting text from question paper {question_paper_file}")
                        question_text = self.file_preprocessor.extract_text_from_file(question_paper_file)
                    
                    # Generate answer key if needed
                    answer_key = self.file_preprocessor._generate_answer_key(question_text, None)
                    
                    # Grade submission
                    logger.info(f"Grading submission for {submission_info['user_name']}")
                    grading_result = self.grading_service.grade_submission(
                        submission_text=submission_text,
                        question_text=question_text,
                        answer_key=answer_key,
                        student_name=submission_info['user_name'],
                        rubric=grading_rubric,
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
                    
                    logger.info(f"Successfully graded submission for {submission_info['user_name']}")
                    
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

    def download_and_organize_submissions(self, course_id: int, assignment_id: int, 
                                        download_dir: str = "synced_submissions") -> Dict[str, Any]:
        """
        Download and organize all submissions for an assignment using the existing synced_submissions structure.
        
        Uses existing folder structure: synced_submissions/course_{course_id}/assignment_{assignment_id}/sync_{timestamp}/
        - downloaded_files/ - contains actual submission files with {user_id}_{filename} format
        - submissions_metadata/ - contains submission_{submission_id}.json files
        - sync_summary.json - contains overall sync information
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            download_dir: Base directory for downloads (default: "synced_submissions")
            
        Returns:
            Dictionary with download results and organization info
        """
        try:
            logger.info(f"Starting organized download for course {course_id}, assignment {assignment_id}")
            
            # Use the Canvas connector's batch download with existing structure
            submissions_dict = self.canvas.batch_download_submissions(
                course_id, assignment_id, download_dir
            )
            
            if not submissions_dict:
                logger.warning("No submissions were downloaded")
                return {
                    'success': False,
                    'message': 'No submissions found or could not download submissions',
                    'submissions_count': 0,
                    'sync_directory': None,
                    'submissions': {}
                }
            
            # Calculate statistics from results
            total_submissions = len(submissions_dict)
            uploaded_files = sum(1 for sub in submissions_dict.values() if sub.get('submission_file'))
            graded_submissions = sum(1 for sub in submissions_dict.values() if sub.get('grade'))
            late_submissions = sum(1 for sub in submissions_dict.values() if sub.get('late', False))
            
            # Get sync directory from first submission
            sync_directory = None
            if submissions_dict:
                first_submission = next(iter(submissions_dict.values()))
                sync_directory = first_submission.get('sync_directory')
            
            result = {
                'success': True,
                'message': f'Successfully downloaded and organized {total_submissions} submissions',
                'submissions_count': total_submissions,
                'sync_directory': sync_directory,
                'statistics': {
                    'total_submissions': total_submissions,
                    'successful_downloads': uploaded_files,
                    'graded_submissions': graded_submissions,
                    'late_submissions': late_submissions
                },
                'submissions': submissions_dict,
                'ready_for_grading': True
            }
            
            logger.info(f"Successfully organized {total_submissions} submissions")
            logger.info(f"Sync directory: {sync_directory}")
            logger.info(f"Statistics: {result['statistics']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error downloading and organizing submissions: {str(e)}")
            return {
                'success': False,
                'message': f'Error downloading submissions: {str(e)}',
                'submissions_count': 0,
                'sync_directory': None,
                'submissions': {},
                'ready_for_grading': False
            }

    def prepare_grading_batch(self, course_id: int, assignment_id: int, 
                            download_dir: str = "synced_submissions") -> Dict[str, Any]:
        """
        Prepare a complete grading batch using the existing synced_submissions structure.
        
        This method:
        1. Downloads and organizes all submissions using existing structure
        2. Reads the sync_summary.json for comprehensive information
        3. Prepares the data structure for automated grading
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            download_dir: Base directory for downloads (default: "synced_submissions")
            
        Returns:
            Complete grading batch ready for processing
        """
        try:
            # First, download and organize submissions
            download_result = self.download_and_organize_submissions(course_id, assignment_id, download_dir)
            
            if not download_result['success']:
                return download_result
            
            # Get assignment details for grading context
            try:
                assignment_data = self.get_assignment_details(course_id, assignment_id)
            except Exception as e:
                logger.warning(f"Could not get assignment details: {e}")
                assignment_data = {'name': f'Assignment {assignment_id}', 'points_possible': 100}
            
            # Read the sync summary for comprehensive information
            sync_summary = None
            sync_directory = download_result.get('sync_directory')
            if sync_directory:
                sync_summary_path = Path(sync_directory) / 'sync_summary.json'
                if sync_summary_path.exists():
                    try:
                        with open(sync_summary_path, 'r', encoding='utf-8') as f:
                            sync_summary = json.load(f)
                        logger.info(f"Loaded sync summary from {sync_summary_path}")
                    except Exception as e:
                        logger.warning(f"Could not read sync summary: {e}")
            
            # Prepare grading batch structure
            grading_batch = {
                'course_id': course_id,
                'assignment_id': assignment_id,
                'assignment_name': assignment_data.get('name', f'Assignment {assignment_id}'),
                'total_points': assignment_data.get('points_possible', 100),
                'download_info': download_result,
                'sync_summary': sync_summary,
                'grading_ready': True,
                'grading_metadata': {
                    'batch_created': str(datetime.now()),
                    'submissions_to_grade': len(download_result['submissions']),
                    'sync_directory': sync_directory,
                    'grading_status': 'ready',
                    'structure_type': 'synced_submissions'
                },
                'student_list': []
            }
            
            # Create student list for grading interface from download results
            for user_id, submission_info in download_result['submissions'].items():
                student_entry = {
                    'user_id': user_id,
                    'name': submission_info['user_name'],
                    'email': submission_info.get('user_email', ''),
                    'submission_file': submission_info.get('submission_file'),
                    'all_files': submission_info.get('all_files', []),
                    'metadata_file': submission_info.get('metadata_file'),
                    'submission_type': submission_info.get('submission_type'),
                    'current_grade': submission_info.get('grade'),
                    'current_score': submission_info.get('score'),
                    'submitted_at': submission_info.get('submitted_at'),
                    'late': submission_info.get('late', False),
                    'workflow_state': submission_info.get('workflow_state'),
                    'grading_status': 'pending'
                }
                grading_batch['student_list'].append(student_entry)
            
            # If we have sync summary, add more detailed information
            if sync_summary:
                grading_batch['sync_job_id'] = sync_summary.get('sync_job_id')
                grading_batch['synced_at'] = sync_summary.get('synced_at')
                grading_batch['total_submissions_found'] = sync_summary.get('total_submissions', 0)
                grading_batch['successful_syncs'] = sync_summary.get('successful_syncs', 0)
                grading_batch['failed_syncs'] = sync_summary.get('failed_syncs', 0)
                grading_batch['no_files'] = sync_summary.get('no_files', 0)
            
            # Save grading batch info to sync directory
            if sync_directory:
                batch_file = Path(sync_directory) / 'grading_batch.json'
                with open(batch_file, 'w', encoding='utf-8') as f:
                    json.dump(grading_batch, f, indent=2, default=str)
                logger.info(f"Saved grading batch info to {batch_file}")
            
            logger.info(f"Prepared grading batch with {len(grading_batch['student_list'])} students")
            return grading_batch
            
        except Exception as e:
            logger.error(f"Error preparing grading batch: {str(e)}")
            return {
                'success': False,
                'message': f'Error preparing grading batch: {str(e)}',
                'grading_ready': False
            }

    def get_latest_sync_for_assignment(self, course_id: int, assignment_id: int, 
                                     base_dir: str = "synced_submissions") -> Dict[str, Any]:
        """
        Get the latest sync directory and information for an assignment.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            base_dir: Base directory containing synced_submissions
            
        Returns:
            Dictionary with latest sync information
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
                    'message': f'No synced submissions found for course {course_id}, assignment {assignment_id}',
                    'sync_directory': None
                }
            
            # Find the latest sync directory
            sync_dirs = [d for d in assignment_path.iterdir() if d.is_dir() and d.name.startswith('sync_')]
            if not sync_dirs:
                return {
                    'success': False,
                    'message': f'No sync directories found for assignment {assignment_id}',
                    'sync_directory': None
                }
            
            # Sort by creation time and get the latest
            latest_sync = max(sync_dirs, key=lambda x: x.stat().st_ctime)
            
            # Read sync summary if available
            sync_summary_path = latest_sync / 'sync_summary.json'
            sync_summary = None
            if sync_summary_path.exists():
                with open(sync_summary_path, 'r', encoding='utf-8') as f:
                    sync_summary = json.load(f)
            
            # Count files in downloaded_files directory
            downloaded_files_dir = latest_sync / 'downloaded_files'
            file_count = len(list(downloaded_files_dir.glob('*'))) if downloaded_files_dir.exists() else 0
            
            # Count metadata files
            metadata_dir = latest_sync / 'submissions_metadata'
            metadata_count = len(list(metadata_dir.glob('submission_*.json'))) if metadata_dir.exists() else 0
            
            return {
                'success': True,
                'sync_directory': str(latest_sync),
                'sync_summary': sync_summary,
                'file_count': file_count,
                'metadata_count': metadata_count,
                'synced_at': sync_summary.get('synced_at') if sync_summary else None,
                'total_submissions': sync_summary.get('total_submissions') if sync_summary else metadata_count
            }
            
        except Exception as e:
            logger.error(f"Error getting latest sync: {str(e)}")
            return {
                'success': False,
                'message': f'Error accessing sync data: {str(e)}',
                'sync_directory': None
            } 