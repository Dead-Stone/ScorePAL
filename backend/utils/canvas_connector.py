"""
Canvas LMS Integration module for ScorePAL.
This module provides functionality to connect to Canvas LMS,
retrieve assignments and submissions, and post grades back to Canvas.
"""

import os
import logging
from typing import Dict, List, Optional, Any, Tuple, Union
from pathlib import Path
import tempfile
import shutil
import re
import requests
import json
from datetime import datetime

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
            api_url: Canvas instance URL (e.g., 'https://sjsu.instructure.com')
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
            
            # Check submission type and handle accordingly
            submission_type = getattr(submission, 'submission_type', None)
            logger.info(f"Processing submission of type: {submission_type}")
            
            # Handle file attachments
            if hasattr(submission, 'attachments') and submission.attachments:
                for attachment in submission.attachments:
                    try:
                        # Handle both dictionary and File object formats
                        if hasattr(attachment, 'items'):  # Dictionary
                            file_url = attachment.get('url', '')
                            filename = attachment.get('filename', 'submission.pdf')
                            display_name = attachment.get('display_name', filename)
                        else:  # File object or other formats
                            file_url = getattr(attachment, 'url', '')
                            filename = getattr(attachment, 'filename', 'submission.pdf')
                            display_name = getattr(attachment, 'display_name', filename)
                        
                        if not file_url:
                            logger.warning(f"No URL found for attachment: {filename}")
                            continue
                        
                        # Use display name for better file organization
                        safe_filename = re.sub(r'[^\w\s.-]', '', display_name)
                        if not safe_filename.strip():
                            safe_filename = filename
                        
                        # Download the file
                        temp_file_path = temp_dir / safe_filename
                        with open(temp_file_path, 'wb') as f:
                            response = self.canvas._Canvas__requester.request(
                                'GET', _url=file_url, _json=False, stream=True
                            )
                            for chunk in response.iter_content(chunk_size=1024):
                                if chunk:
                                    f.write(chunk)
                        
                        # Move to download directory
                        final_path = download_dir / safe_filename
                        shutil.copy(temp_file_path, final_path)
                        submission_file = final_path
                        
                        logger.info(f"Downloaded submission file attachment: {final_path}")
                        break  # For now, just download the first attachment
                        
                    except Exception as attachment_error:
                        logger.error(f"Error processing attachment: {str(attachment_error)}")
                        continue
            
            # Handle online text entry
            elif submission_type == 'online_text_entry' and hasattr(submission, 'body') and submission.body:
                # Save the text as a file
                body_content = submission.body
                text_file = download_dir / "online_text_submission.html"
                with open(text_file, 'w', encoding='utf-8') as f:
                    f.write("<html><head><title>Text Submission</title></head><body>")
                    f.write(body_content)
                    f.write("</body></html>")
                submission_file = text_file
                logger.info(f"Saved online text submission: {text_file}")
            
            # Handle online URL
            elif submission_type == 'online_url' and hasattr(submission, 'url') and submission.url:
                # Save the URL as a file
                url_content = submission.url
                url_file = download_dir / "online_url_submission.txt"
                with open(url_file, 'w', encoding='utf-8') as f:
                    f.write(f"Submission URL: {url_content}\n")
                submission_file = url_file
                logger.info(f"Saved online URL submission: {url_file}")
            
            # Handle other submission types or missing attachments
            else:
                # Create a placeholder file with submission metadata
                metadata_file = download_dir / "submission_metadata.json"
                
                # Extract all available submission data
                submission_data = {
                    'id': getattr(submission, 'id', None),
                    'user_id': getattr(submission, 'user_id', None),
                    'assignment_id': getattr(submission, 'assignment_id', None),
                    'submitted_at': getattr(submission, 'submitted_at', None),
                    'workflow_state': getattr(submission, 'workflow_state', None),
                    'grade': getattr(submission, 'grade', None),
                    'score': getattr(submission, 'score', None),
                    'submission_type': submission_type,
                    'body': getattr(submission, 'body', None),
                    'url': getattr(submission, 'url', None),
                }
                
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(submission_data, f, indent=2, default=str)
                
                submission_file = metadata_file
                logger.info(f"Created submission metadata file: {metadata_file}")
            
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
                                 download_dir: Union[str, Path] = "synced_submissions") -> Dict[int, Dict[str, Any]]:
        """
        Batch download all submissions for an assignment using the existing synced_submissions structure.
        
        Uses existing folder structure: synced_submissions/course_{course_id}/assignment_{assignment_id}/sync_{timestamp}/
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            download_dir: Base directory to download files to (default: "synced_submissions")
            
        Returns:
            Dictionary mapping user IDs to submission info
        """
        results = {}
        
        try:
            # Use existing synced_submissions structure
            if isinstance(download_dir, str) and not download_dir.startswith('backend'):
                base_dir = Path("backend") / download_dir
            else:
                base_dir = Path(download_dir) if isinstance(download_dir, str) else download_dir
            
            # Create organized folder structure following existing pattern
            course_dir = base_dir / f"course_{course_id}"
            assignment_dir = course_dir / f"assignment_{assignment_id}"
            
            # Create sync directory with timestamp
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            sync_dir = assignment_dir / f"sync_{timestamp}"
            
            # Create directories
            downloaded_files_dir = sync_dir / "downloaded_files"
            submissions_metadata_dir = sync_dir / "submissions_metadata"
            os.makedirs(downloaded_files_dir, exist_ok=True)
            os.makedirs(submissions_metadata_dir, exist_ok=True)
            
            # Get all submissions with detailed information using direct API
            submissions = self.get_submissions_direct(course_id, assignment_id, 
                                                     include=['user', 'submission_comments', 'rubric_assessment'])
            
            # Log the total number of submissions found
            logger.info(f"Found {len(submissions)} total submissions for assignment {assignment_id}")
            
            # Log submission workflow states and types
            workflow_states = {}
            submission_types = {}
            for sub in submissions:
                state = sub.get('workflow_state', 'unknown')
                sub_type = sub.get('submission_type', 'none')
                workflow_states[state] = workflow_states.get(state, 0) + 1
                submission_types[sub_type] = submission_types.get(sub_type, 0) + 1
            
            logger.info(f"Submission workflow states: {workflow_states}")
            logger.info(f"Submission types: {submission_types}")
            
            # Get assignment details
            try:
                assignment = self.get_assignment(course_id, assignment_id)
                assignment_name = assignment.name if assignment else f"Assignment_{assignment_id}"
            except Exception as e:
                logger.warning(f"Could not get assignment details: {e}")
                assignment_name = f"Assignment_{assignment_id}"
                assignment = None
            
            # Define acceptable workflow states for downloading
            acceptable_states = ['submitted', 'graded', 'pending_review']
            
            # Get user information to enrich submissions
            try:
                user_dict = self.get_users_for_course(course_id)
                logger.info(f"Retrieved {len(user_dict)} users for course {course_id}")
            except Exception as e:
                logger.warning(f"Could not retrieve users for course: {e}")
                user_dict = {}
            
            # Process each submission
            processed_submissions = []
            successful_syncs = 0
            failed_syncs = 0
            no_files = 0
            
            for submission in submissions:
                try:
                    user_id = submission.get('user_id')
                    submission_id = submission.get('id')
                    
                    if not user_id:
                        logger.warning("Skipping submission without user_id")
                        continue
                    
                    # Get user information
                    user_info = user_dict.get(user_id, {})
                    user_name = user_info.get('name', f"User_{user_id}")
                    
                    # Get workflow state and submission info
                    workflow_state = submission.get('workflow_state', '')
                    submission_type = submission.get('submission_type', 'none')
                    
                    logger.info(f"Processing submission from {user_name}, "
                               f"type: {submission_type}, state: {workflow_state}")
                    
                    # Initialize submission metadata following existing format
                    submission_metadata = {
                        'user_id': user_id,
                        'user_name': user_name,
                        'submission_id': submission_id,
                        'submitted_at': submission.get('submitted_at'),
                        'workflow_state': workflow_state,
                        'late': submission.get('late', False),
                        'missing': submission.get('missing', False),
                        'score': submission.get('score'),
                        'grade': submission.get('grade'),
                        'attachments': [],
                        'downloaded_files': [],
                        'sync_status': 'pending'
                    }
                    
                    # Skip submissions that are not in acceptable states
                    if workflow_state not in acceptable_states:
                        logger.info(f"Skipping submission with workflow state '{workflow_state}'")
                        submission_metadata['sync_status'] = 'skipped'
                        no_files += 1
                    elif submission_type == 'online_upload' and submission.get('attachments'):
                        # Download attachments following existing naming convention
                        for attachment in submission['attachments']:
                            try:
                                display_name = attachment.get('display_name', '')
                                file_url = attachment.get('url', '')
                                file_id = attachment.get('id')
                                uuid = attachment.get('uuid', '')
                                
                                if not file_url:
                                    logger.warning(f"No URL for attachment: {display_name}")
                                    continue
                                
                                # Create filename following existing pattern: {user_id}_{display_name}
                                safe_filename = re.sub(r'[^\w\s.-]', '', display_name)
                                if not safe_filename.strip():
                                    safe_filename = f"attachment_{file_id}"
                                
                                # Clean filename to match existing pattern
                                safe_filename = safe_filename.replace(' ', '_').replace('(', '').replace(')', '')
                                filename = f"{user_id}_{safe_filename}"
                                
                                file_path = downloaded_files_dir / filename
                                
                                # Download file using requests
                                headers = {}
                                if self.api_key.startswith('Bearer '):
                                    headers['Authorization'] = self.api_key
                                else:
                                    headers['Authorization'] = f'Bearer {self.api_key}'
                                
                                response = requests.get(file_url, headers=headers, stream=True)
                                if response.status_code == 200:
                                    with open(file_path, 'wb') as f:
                                        for chunk in response.iter_content(chunk_size=1024):
                                            if chunk:
                                                f.write(chunk)
                                    
                                    # Add to metadata following existing format
                                    attachment_info = {
                                        'id': file_id,
                                        'name': display_name,
                                        'uuid': uuid,
                                        'url': file_url,
                                        'download_status': 'success',
                                        'local_path': str(file_path.absolute())
                                    }
                                    submission_metadata['attachments'].append(attachment_info)
                                    submission_metadata['downloaded_files'].append(str(file_path.absolute()))
                                    
                                    logger.info(f"Downloaded attachment: {file_path}")
                                    
                                else:
                                    logger.warning(f"Failed to download attachment: {response.status_code}")
                                    attachment_info = {
                                        'id': file_id,
                                        'name': display_name,
                                        'uuid': uuid,
                                        'url': file_url,
                                        'download_status': 'failed',
                                        'local_path': None
                                    }
                                    submission_metadata['attachments'].append(attachment_info)
                                    
                            except Exception as attachment_error:
                                logger.error(f"Error downloading attachment: {str(attachment_error)}")
                                failed_syncs += 1
                                continue
                        
                        # Set sync status based on results
                        if submission_metadata['downloaded_files']:
                            submission_metadata['sync_status'] = 'synced'
                            successful_syncs += 1
                        else:
                            submission_metadata['sync_status'] = 'no_files'
                            no_files += 1
                    else:
                        # No attachments or different submission type
                        submission_metadata['sync_status'] = 'no_files'
                        no_files += 1
                    
                    # Save individual submission metadata
                    metadata_file = submissions_metadata_dir / f"submission_{submission_id}.json"
                    with open(metadata_file, 'w', encoding='utf-8') as f:
                        json.dump(submission_metadata, f, indent=2, default=str)
                    
                    # Add to processed submissions
                    processed_submissions.append(submission_metadata)
                    
                    # Add to results if successful
                    if submission_metadata['sync_status'] == 'synced':
                        results[user_id] = {
                            'user_id': user_id,
                            'user_name': user_name,
                            'user_email': user_info.get('email', ''),
                            'submission_file': submission_metadata['downloaded_files'][0] if submission_metadata['downloaded_files'] else None,
                            'all_files': submission_metadata['downloaded_files'],
                            'sync_directory': str(sync_dir),
                            'metadata_file': str(metadata_file),
                            'assignment_name': assignment_name,
                            'assignment_id': assignment_id,
                            'course_id': course_id,
                            'submission_type': submission_type,
                            'workflow_state': workflow_state,
                            'grade': submission.get('grade'),
                            'score': submission.get('score'),
                            'submitted_at': submission.get('submitted_at'),
                            'late': submission.get('late', False),
                            'missing': submission.get('missing', False)
                        }
                        logger.info(f"Successfully processed submission for {user_name}")
                    
                except Exception as e:
                    user_name = submission.get('user', {}).get('name', 'unknown') if submission.get('user') else 'unknown'
                    logger.error(f"Error processing submission for user {user_name}: {str(e)}")
                    failed_syncs += 1
            
            # Create sync summary following existing format
            import uuid
            sync_summary = {
                'sync_job_id': str(uuid.uuid4()),
                'course_id': course_id,
                'assignment_id': assignment_id,
                'synced_at': datetime.now().isoformat(),
                'total_submissions': len(submissions),
                'successful_syncs': successful_syncs,
                'failed_syncs': failed_syncs,
                'no_files': no_files,
                'sync_directory': str(sync_dir.absolute()),
                'submissions': processed_submissions
            }
            
            # Save sync summary
            summary_file = sync_dir / 'sync_summary.json'
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(sync_summary, f, indent=2, default=str)
            
            logger.info(f"Successfully downloaded {successful_syncs} submissions for assignment {assignment_id}")
            logger.info(f"Files organized in: {sync_dir}")
            logger.info(f"Sync summary saved to: {summary_file}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error batch downloading submissions: {str(e)}")
            return results
    
    def get_submissions_direct(self, course_id: int, assignment_id: int, 
                             include: List[str] = None, per_page: int = 50) -> List[Dict[str, Any]]:
        """
        Get all submissions for an assignment directly via API without requiring course permissions.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID
            include: List of additional data to include (e.g., ['user', 'submission_comments'])
            per_page: Number of submissions per page (default 50 to match SJSU API)
            
        Returns:
            List of submission dictionaries
        """
        try:
            # Build the API URL directly - using the exact format as SJSU Canvas
            url = f'{self.api_url}/api/v1/courses/{course_id}/assignments/{assignment_id}/submissions'
            
            # Prepare headers - handle both Bearer token and API key formats
            if self.api_key.startswith('Bearer '):
                headers = {'Authorization': self.api_key}
            else:
                headers = {'Authorization': f'Bearer {self.api_key}'}
            
            # Prepare query parameters - match SJSU format
            params = {
                'per_page': per_page,
                'page': 1
            }
            
            # Add include parameters if provided
            if include:
                for item in include:
                    params[f'include[]'] = item
            
            all_submissions = []
            page = 1
            
            while True:
                params['page'] = page
                
                logger.info(f"Fetching submissions page {page} from: {url}")
                
                # Make direct API request
                response = requests.get(url, headers=headers, params=params)
                
                if response.status_code == 200:
                    submissions_data = response.json()
                    
                    if not submissions_data:
                        break
                    
                    logger.info(f"Retrieved {len(submissions_data)} submissions on page {page}")
                    
                    # Process each submission - handle the exact SJSU API format
                    for submission in submissions_data:
                        submission_dict = {
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
                            'cached_due_date': submission.get('cached_due_date'),
                            'late': submission.get('late', False),
                            'missing': submission.get('missing', False),
                            'seconds_late': submission.get('seconds_late', 0),
                            'excused': submission.get('excused', False),
                            'graded_at': submission.get('graded_at'),
                            'grader_id': submission.get('grader_id'),
                            'grade_matches_current_submission': submission.get('grade_matches_current_submission'),
                            'preview_url': submission.get('preview_url'),
                            'attachments': submission.get('attachments', []),
                            'submission_comments': submission.get('submission_comments', []),
                            'rubric_assessment': submission.get('rubric_assessment'),
                            'user': submission.get('user')
                        }
                        
                        # Process attachments to include all relevant information
                        if submission_dict['attachments']:
                            processed_attachments = []
                            for attachment in submission_dict['attachments']:
                                processed_attachment = {
                                    'id': attachment.get('id'),
                                    'folder_id': attachment.get('folder_id'),
                                    'display_name': attachment.get('display_name'),
                                    'filename': attachment.get('filename'),
                                    'content_type': attachment.get('content-type'),
                                    'url': attachment.get('url'),
                                    'size': attachment.get('size'),
                                    'created_at': attachment.get('created_at'),
                                    'updated_at': attachment.get('updated_at'),
                                    'mime_class': attachment.get('mime_class'),
                                    'preview_url': attachment.get('preview_url'),
                                    'thumbnail_url': attachment.get('thumbnail_url'),
                                    'uuid': attachment.get('uuid')
                                }
                                processed_attachments.append(processed_attachment)
                            submission_dict['attachments'] = processed_attachments
                        
                        all_submissions.append(submission_dict)
                    
                    # If we got fewer submissions than per_page, we're on the last page
                    if len(submissions_data) < per_page:
                        break
                    
                    page += 1
                else:
                    logger.error(f"Error fetching submissions: {response.status_code} - {response.text}")
                    # Try to log the response details for debugging
                    try:
                        error_data = response.json()
                        logger.error(f"Error response data: {error_data}")
                    except:
                        logger.error(f"Could not parse error response as JSON")
                    break
            
            logger.info(f"Retrieved {len(all_submissions)} total submissions for assignment {assignment_id} (direct API)")
            return all_submissions
            
        except Exception as e:
            logger.error(f"Error retrieving submissions directly for assignment {assignment_id}: {str(e)}")
            return []
    
    def get_users_for_course(self, course_id: int, per_page: int = 100) -> Dict[int, Dict[str, Any]]:
        """
        Get all users for a course directly via API.
        
        Args:
            course_id: Canvas course ID
            per_page: Number of users per page
            
        Returns:
            Dictionary mapping user IDs to user information
        """
        try:
            # Build the API URL directly
            url = f'{self.api_url}/api/v1/courses/{course_id}/users'
            
            # Prepare headers
            if self.api_key.startswith('Bearer '):
                headers = {'Authorization': self.api_key}
            else:
                headers = {'Authorization': f'Bearer {self.api_key}'}
            
            # Prepare query parameters
            params = {
                'per_page': per_page,
                'page': 1,
                'include[]': ['avatar_url', 'email']
            }
            
            all_users = {}
            page = 1
            
            while True:
                params['page'] = page
                
                logger.info(f"Fetching users page {page} from: {url}")
                
                # Make direct API request
                response = requests.get(url, headers=headers, params=params)
                
                if response.status_code == 200:
                    users_data = response.json()
                    
                    if not users_data:
                        break
                    
                    logger.info(f"Retrieved {len(users_data)} users on page {page}")
                    
                    # Process each user
                    for user in users_data:
                        user_id = user.get('id')
                        if user_id:
                            all_users[user_id] = {
                                'id': user_id,
                                'name': user.get('name', f'User {user_id}'),
                                'sortable_name': user.get('sortable_name', ''),
                                'short_name': user.get('short_name', ''),
                                'email': user.get('email', ''),
                                'avatar_url': user.get('avatar_url', ''),
                                'login_id': user.get('login_id', ''),
                                'sis_user_id': user.get('sis_user_id', '')
                            }
                    
                    # If we got fewer users than per_page, we're on the last page
                    if len(users_data) < per_page:
                        break
                    
                    page += 1
                else:
                    logger.error(f"Error fetching users: {response.status_code} - {response.text}")
                    break
            
            logger.info(f"Retrieved {len(all_users)} total users for course {course_id}")
            return all_users
            
        except Exception as e:
            logger.error(f"Error retrieving users for course {course_id}: {str(e)}")
            return {}
    
    def enrich_submissions_with_users(self, submissions: List[Dict[str, Any]], 
                                    course_id: int) -> List[Dict[str, Any]]:
        """
        Enrich submission data with user information.
        
        Args:
            submissions: List of submission dictionaries
            course_id: Canvas course ID
            
        Returns:
            List of enriched submission dictionaries
        """
        try:
            # Get all users for the course
            users = self.get_users_for_course(course_id)
            
            # Enrich each submission with user data
            enriched_submissions = []
            for submission in submissions:
                user_id = submission.get('user_id')
                
                # Add user information if available
                if user_id and user_id in users:
                    submission['user'] = users[user_id]
                elif user_id:
                    # Create minimal user info if not found
                    submission['user'] = {
                        'id': user_id,
                        'name': f'User {user_id}',
                        'email': '',
                        'avatar_url': ''
                    }
                
                enriched_submissions.append(submission)
            
            logger.info(f"Enriched {len(enriched_submissions)} submissions with user data")
            return enriched_submissions
            
        except Exception as e:
            logger.error(f"Error enriching submissions with user data: {str(e)}")
            return submissions 