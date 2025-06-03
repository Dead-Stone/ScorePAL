"""
Canvas Grading Service for ScorePAL.
This module handles Canvas LMS integration with our grading system.
"""

import logging
import requests
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class CanvasGradingService:
    """Service to process Canvas assignments and integrate with grading system."""
    
    def __init__(self, canvas_url, canvas_api_key, gemini_api_key):
        """Initialize CanvasGradingService."""
        self.canvas_url = canvas_url.rstrip('/')
        self.canvas_api_key = canvas_api_key
        self.gemini_api_key = gemini_api_key
        
        # Set up headers for Canvas API requests
        self.headers = {
            'Authorization': f'Bearer {self.canvas_api_key}' if not self.canvas_api_key.startswith('Bearer') else self.canvas_api_key,
            'Content-Type': 'application/json'
        }
        
        logger.info("CanvasGradingService initialized")
        
    def test_connection(self) -> bool:
        """Test the Canvas connection."""
        try:
            response = requests.get(f'{self.canvas_url}/api/v1/users/self', headers=self.headers)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Canvas connection test failed: {e}")
            return False
            
    def get_submissions_for_assignment(self, course_id: int, assignment_id: int, include: List[str] = None) -> Dict[str, Any]:
        """
        Get submissions for a specific assignment from Canvas API.
        
        Args:
            course_id: Canvas course ID
            assignment_id: Canvas assignment ID  
            include: List of additional data to include (e.g., ['user', 'attachments'])
            
        Returns:
            Dictionary with success status and submissions data
        """
        try:
            # Build the API URL
            url = f'{self.canvas_url}/api/v1/courses/{course_id}/assignments/{assignment_id}/submissions'
            
            # Add query parameters
            params = {}
            if include:
                params['include[]'] = include
                
            # Make the API request
            response = requests.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                submissions_data = response.json()
                
                # Format submissions for our frontend
                formatted_submissions = []
                for submission in submissions_data:
                    formatted_submission = {
                        'id': submission.get('id'),
                        'user_id': submission.get('user_id'),
                        'assignment_id': submission.get('assignment_id'),
                        'grade': submission.get('grade'),
                        'score': submission.get('score'),
                        'submitted_at': submission.get('submitted_at'),
                        'workflow_state': submission.get('workflow_state'),
                        'late': submission.get('late', False),
                        'missing': submission.get('missing', False),
                        'graded_at': submission.get('graded_at'),
                        'preview_url': submission.get('preview_url'),
                        'attachments': submission.get('attachments', []),
                        'user': submission.get('user', {'id': submission.get('user_id'), 'name': f"User {submission.get('user_id')}"})
                    }
                    formatted_submissions.append(formatted_submission)
                
                # Get course and assignment info
                course_info = self.get_course_info(course_id)
                assignment_info = self.get_assignment_info(course_id, assignment_id)
                
                return {
                    'success': True,
                    'submissions': formatted_submissions,
                    'course': course_info,
                    'assignment': assignment_info,
                    'total_count': len(formatted_submissions)
                }
            else:
                logger.error(f"Canvas API error: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'Canvas API error: {response.status_code}',
                    'submissions': []
                }
                
        except Exception as e:
            logger.error(f"Error fetching submissions: {e}")
            return {
                'success': False,
                'message': f'Error fetching submissions: {str(e)}',
                'submissions': []
            }
            
    def get_course_info(self, course_id: int) -> Dict[str, Any]:
        """Get course information from Canvas API."""
        try:
            url = f'{self.canvas_url}/api/v1/courses/{course_id}'
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                course_data = response.json()
                return {
                    'id': course_data.get('id'),
                    'name': course_data.get('name', 'Unknown Course')
                }
            else:
                return {'id': course_id, 'name': 'Unknown Course'}
        except Exception as e:
            logger.error(f"Error fetching course info: {e}")
            return {'id': course_id, 'name': 'Unknown Course'}
            
    def get_assignment_info(self, course_id: int, assignment_id: int) -> Dict[str, Any]:
        """Get assignment information from Canvas API."""
        try:
            url = f'{self.canvas_url}/api/v1/courses/{course_id}/assignments/{assignment_id}'
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                assignment_data = response.json()
                return {
                    'id': assignment_data.get('id'),
                    'name': assignment_data.get('name', 'Unknown Assignment')
                }
            else:
                return {'id': assignment_id, 'name': 'Unknown Assignment'}
        except Exception as e:
            logger.error(f"Error fetching assignment info: {e}")
            return {'id': assignment_id, 'name': 'Unknown Assignment'} 