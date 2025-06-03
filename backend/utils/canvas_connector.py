"""
Canvas LMS Integration module for ScorePAL.
This module provides functionality to connect to Canvas LMS,
retrieve assignments and submissions, and post grades back to Canvas.
"""

import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import tempfile
import shutil
import re

# Canvas API library
from canvasapi import Canvas
from canvasapi.course import Course
from canvasapi.assignment import Assignment
from canvasapi.submission import Submission
from canvasapi.user import User

logger = logging.getLogger(__name__)

class CanvasConnector:
    """Connector class for Canvas LMS API integration."""
    
    def __init__(self, api_url: str, api_key: str):
        """
        Initialize Canvas connector.
        
        Args:
            api_url: Canvas instance URL (e.g., 'https://canvas.instructure.com')
            api_key: Canvas API key or Bearer token
        """
        # Normalize the API URL - ensure it doesn't end with /api or /api/
        self.api_url = self._normalize_url(api_url)
        self.api_key = api_key
        
        # Determine if the key is a bearer token or an API key
        try:
            if api_key.startswith('Bearer '):
                # This is a bearer token
                token = api_key.replace('Bearer ', '')
                self.canvas = Canvas(self.api_url, token)
                logger.info(f"CanvasConnector initialized with Bearer token for {self.api_url}")
            elif len(api_key) > 50:
                # This is likely a bearer token without prefix
                self.canvas = Canvas(self.api_url, api_key)
                logger.info(f"CanvasConnector initialized with long token for {self.api_url}")
            else:
                # This is likely an API key
                self.canvas = Canvas(self.api_url, api_key)
                logger.info(f"CanvasConnector initialized with API key for {self.api_url}")
        except Exception as e:
            logger.error(f"Error initializing Canvas connector: {str(e)}")
            self.canvas = None
    
    def _normalize_url(self, url: str) -> str:
        """
        Normalize Canvas URL to ensure it has the correct format.
        Removes /api if present at the end of the URL.
        
        Args:
            url: Canvas instance URL
            
        Returns:
            Normalized URL
        """
        # Remove trailing slashes
        url = url.rstrip('/')
        
        # Remove /api at the end if present
        if url.endswith('/api'):
            url = url[:-4]
        
        # Remove /api/v1 if present
        if url.endswith('/api/v1'):
            url = url[:-7]
            
        # Handle URLs that contain /api/ in the middle
        if '/api/' in url:
            url = url.split('/api/')[0]
            
        return url
    
    def test_connection(self) -> bool:
        """Test the Canvas connection."""
        try:
            if not self.canvas:
                logger.error("Canvas connector not properly initialized")
                return False
                
            # Try to get the current user, which should always be accessible
            user = self.canvas.get_current_user()
            logger.info(f"Canvas connection successful. Connected as: {user.name}")
            return True
        except Exception as e:
            logger.error(f"Canvas connection failed: {str(e)}")
            return False
    
    def get_courses(self) -> List[Course]:
        """Get all courses the user has access to."""
        try:
            # Default to only active courses
            courses = list(self.canvas.get_courses(enrollment_state='active'))
            logger.info(f"Retrieved {len(courses)} active courses")
            return courses
        except Exception as e:
            logger.error(f"Error retrieving courses: {str(e)}")
            return []
    
    def get_course(self, course_id: int) -> Optional[Course]:
        """Get a specific course by ID."""
        try:
            course = self.canvas.get_course(course_id)
            logger.info(f"Retrieved course: {course.name} (ID: {course.id})")
            return course
        except Exception as e:
            logger.error(f"Error retrieving course {course_id}: {str(e)}")
            return None
    
    def get_assignments(self, course_id: int) -> List[Assignment]:
        """Get all assignments for a course."""
        try:
            course = self.get_course(course_id)
            if course:
                assignments = list(course.get_assignments())
                logger.info(f"Retrieved {len(assignments)} assignments for course {course_id}")
                return assignments
            return []
        except Exception as e:
            logger.error(f"Error retrieving assignments for course {course_id}: {str(e)}")
            return []
    
    def get_assignment(self, course_id: int, assignment_id: int) -> Optional[Assignment]:
        """Get a specific assignment by ID."""
        try:
            course = self.get_course(course_id)
            if course:
                assignment = course.get_assignment(assignment_id)
                logger.info(f"Retrieved assignment: {assignment.name} (ID: {assignment.id})")
                return assignment
            return None
        except Exception as e:
            logger.error(f"Error retrieving assignment {assignment_id}: {str(e)}")
            return None
    
    def get_submissions(self, course_id: int, assignment_id: int, 
                       include: List[str] = None, per_page: int = 100) -> List[Dict[str, Any]]:
        """
        Get all submissions for an assignment with pagination.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            include: List of additional data to include (e.g., ['user', 'submission_comments'])
            per_page: Number of submissions per page
            
        Returns:
            List of submission dictionaries
        """
        try:
            assignment = self.get_assignment(course_id, assignment_id)
            if not assignment:
                return []
            
            # Set default includes if none provided
            if include is None:
                include = ['user', 'submission_comments', 'rubric_assessment']
            
            # Get all submissions with pagination
            all_submissions = []
            page = 1
            
            while True:
                # Get submissions for current page
                submissions = list(assignment.get_submissions(
                    include=include,
                    per_page=per_page,
                    page=page
                ))
                
                if not submissions:
                    break
                
                # Convert submissions to dictionaries
                for submission in submissions:
                    submission_dict = {
                        'id': submission.id,
                        'user_id': submission.user_id,
                        'assignment_id': submission.assignment_id,
                        'submitted_at': submission.submitted_at,
                        'workflow_state': submission.workflow_state,
                        'grade': submission.grade,
                        'score': submission.score,
                        'submission_type': submission.submission_type,
                        'body': submission.body,
                        'url': submission.url,
                        'attachments': getattr(submission, 'attachments', []),
                        'submission_comments': getattr(submission, 'submission_comments', []),
                        'rubric_assessment': getattr(submission, 'rubric_assessment', None),
                        'user': getattr(submission, 'user', None)
                    }
                    all_submissions.append(submission_dict)
                
                # If we got fewer submissions than per_page, we're on the last page
                if len(submissions) < per_page:
                    break
                
                page += 1
            
            logger.info(f"Retrieved {len(all_submissions)} submissions for assignment {assignment_id}")
            return all_submissions
            
        except Exception as e:
            logger.error(f"Error retrieving submissions for assignment {assignment_id}: {str(e)}")
            return []
    
    def get_submission_details(self, course_id: int, assignment_id: int, 
                             user_id: int) -> Optional[Dict[str, Any]]:
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
            assignment = self.get_assignment(course_id, assignment_id)
            if not assignment:
                return None
            
            # Get the specific submission
            submission = assignment.get_submission(user_id, include=['user', 'submission_comments', 'rubric_assessment'])
            
            # Convert to dictionary
            submission_dict = {
                'id': submission.id,
                'user_id': submission.user_id,
                'assignment_id': submission.assignment_id,
                'submitted_at': submission.submitted_at,
                'workflow_state': submission.workflow_state,
                'grade': submission.grade,
                'score': submission.score,
                'submission_type': submission.submission_type,
                'body': submission.body,
                'url': submission.url,
                'attachments': submission.attachments,
                'submission_comments': submission.submission_comments,
                'rubric_assessment': submission.rubric_assessment,
                'user': submission.user
            }
            
            logger.info(f"Retrieved submission details for user {user_id} on assignment {assignment_id}")
            return submission_dict
            
        except Exception as e:
            logger.error(f"Error retrieving submission details: {str(e)}")
            return None
    
    def download_submission(self, submission: Submission, download_dir: Path) -> Tuple[Optional[Path], Optional[Path]]:
        """
        Download submission file and question paper.
        
        Args:
            submission: Canvas submission object
            download_dir: Directory to download files to
            
        Returns:
            Tuple of (submission_file_path, question_paper_path)
        """
        try:
            # Create temporary directory to store files
            temp_dir = Path(tempfile.mkdtemp())
            os.makedirs(download_dir, exist_ok=True)
            
            # Get submission file
            submission_file = None
            question_paper = None
            
            # Check if submission has attachments
            if hasattr(submission, 'attachments') and submission.attachments:
                for attachment in submission.attachments:
                    file_url = attachment.get('url', '')
                    filename = attachment.get('filename', 'submission.pdf')
                    
                    # Download the file
                    temp_file_path = temp_dir / filename
                    with open(temp_file_path, 'wb') as f:
                        response = self.canvas._Canvas__requester.request(
                            'GET', _url=file_url, _json=False, stream=True
                        )
                        for chunk in response.iter_content(chunk_size=1024):
                            if chunk:
                                f.write(chunk)
                    
                    # Move to download directory
                    final_path = download_dir / filename
                    shutil.copy(temp_file_path, final_path)
                    submission_file = final_path
                    
                    logger.info(f"Downloaded submission file: {final_path}")
            
            # Get assignment details (for question paper)
            if hasattr(submission, 'assignment_id'):
                assignment = self.get_assignment(
                    submission.course_id, submission.assignment_id
                )
                if assignment:
                    # Create question paper from assignment description
                    if hasattr(assignment, 'description'):
                        question_file = download_dir / "question_paper.html"
                        with open(question_file, 'w', encoding='utf-8') as f:
                            f.write(f"<h1>{assignment.name}</h1>\n")
                            f.write(assignment.description)
                        logger.info(f"Created question paper: {question_file}")
                        question_paper = question_file
            
            # Clean up temp directory
            shutil.rmtree(temp_dir)
            
            return submission_file, question_paper
                
        except Exception as e:
            logger.error(f"Error downloading submission: {str(e)}")
            return None, None
    
    def post_grade(self, course_id: int, assignment_id: int, user_id: int, 
                  grade: str, comment: str = None) -> bool:
        """
        Post a grade back to Canvas.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            user_id: Canvas user ID
            grade: Grade to post
            comment: Optional comment to include
            
        Returns:
            Success status
        """
        try:
            assignment = self.get_assignment(course_id, assignment_id)
            if assignment:
                # Prepare the submission update
                submission_dict = {'posted_grade': grade}
                
                # Add comment if provided
                if comment:
                    submission_dict['comment'] = {'text_comment': comment}
                
                # Update the submission
                submission = assignment.update_submission(user_id, **submission_dict)
                logger.info(f"Posted grade {grade} for user {user_id} on assignment {assignment_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error posting grade: {str(e)}")
            return False
    
    def batch_download_submissions(self, course_id: int, assignment_id: int, 
                                 download_dir: Path) -> Dict[int, Dict[str, Any]]:
        """
        Batch download all submissions for an assignment.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            download_dir: Directory to download files to
            
        Returns:
            Dictionary mapping user IDs to submission info
        """
        results = {}
        
        try:
            # Get all submissions
            submissions = self.get_submissions(course_id, assignment_id)
            assignment = self.get_assignment(course_id, assignment_id)
            
            if not assignment:
                logger.error(f"Assignment {assignment_id} not found")
                return results
            
            # Create base assignment directory
            assignment_dir = download_dir / f"assignment_{assignment_id}"
            os.makedirs(assignment_dir, exist_ok=True)
            
            # Create question paper from assignment description
            question_paper_path = None
            if hasattr(assignment, 'description'):
                question_file = assignment_dir / "question_paper.html"
                with open(question_file, 'w', encoding='utf-8') as f:
                    f.write(f"<h1>{assignment.name}</h1>\n")
                    f.write(assignment.description)
                logger.info(f"Created question paper: {question_file}")
                question_paper_path = question_file
            
            # Download each submission
            for submission in submissions:
                try:
                    # Skip submissions without users or not submitted
                    if not hasattr(submission, 'user') or not hasattr(submission, 'workflow_state'):
                        continue
                    
                    if submission.workflow_state != 'submitted':
                        continue
                    
                    # Create user directory
                    user_id = submission.user['id']
                    user_name = submission.user.get('name', f"user_{user_id}")
                    user_dir = assignment_dir / f"user_{user_id}_{user_name.replace(' ', '_')}"
                    os.makedirs(user_dir, exist_ok=True)
                    
                    # Download submission
                    submission_file, _ = self.download_submission(submission, user_dir)
                    
                    if submission_file:
                        results[user_id] = {
                            'user_id': user_id,
                            'user_name': user_name,
                            'submission_file': str(submission_file),
                            'question_paper': str(question_paper_path) if question_paper_path else None,
                            'assignment_name': assignment.name,
                            'assignment_id': assignment_id,
                            'course_id': course_id
                        }
                        logger.info(f"Downloaded submission for user {user_name}")
                        
                except Exception as e:
                    logger.error(f"Error processing submission for user {getattr(submission, 'user_id', 'unknown')}: {str(e)}")
            
            logger.info(f"Downloaded {len(results)} submissions for assignment {assignment_id}")
            return results
            
        except Exception as e:
            logger.error(f"Error batch downloading submissions: {str(e)}")
            return results 