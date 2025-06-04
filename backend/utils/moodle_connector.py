"""
Moodle LMS Connector for ScorePAL.
Handles connection and API calls to Moodle instances.
"""

import requests
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class MoodleConnector:
    """Connector for Moodle LMS API."""
    
    def __init__(self, moodle_url: str, token: str):
        """
        Initialize Moodle connector.
        
        Args:
            moodle_url: Base URL of the Moodle instance
            token: Moodle web service token
        """
        self.moodle_url = moodle_url.rstrip('/')
        self.token = token
        self.api_url = f"{self.moodle_url}/webservice/rest/server.php"
        
    def test_connection(self) -> bool:
        """
        Test connection to Moodle.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            response = self.call_function("core_webservice_get_site_info", {})
            return response is not None and 'data' in response
        except Exception as e:
            logger.error(f"Moodle connection test failed: {e}")
            return False
    
    def call_function(self, function_name: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Call a Moodle web service function.
        
        Args:
            function_name: Name of the Moodle function to call
            params: Parameters for the function
            
        Returns:
            Response data or None if failed
        """
        try:
            data = {
                'wstoken': self.token,
                'wsfunction': function_name,
                'moodlewsrestformat': 'json',
                **params
            }
            
            response = requests.post(self.api_url, data=data)
            response.raise_for_status()
            
            result = response.json()
            
            if 'exception' in result:
                logger.error(f"Moodle API error: {result['exception']}")
                return None
                
            return {'data': result}
            
        except Exception as e:
            logger.error(f"Error calling Moodle function {function_name}: {e}")
            return None
    
    def get_user_id(self) -> Optional[int]:
        """
        Get the current user's ID.
        
        Returns:
            User ID or None if failed
        """
        try:
            response = self.call_function("core_webservice_get_site_info", {})
            if response and 'data' in response:
                return response['data'].get('userid')
            return None
        except Exception as e:
            logger.error(f"Error getting user ID: {e}")
            return None
    
    def get_courses(self) -> List[Dict[str, Any]]:
        """
        Get courses for the current user.
        
        Returns:
            List of course dictionaries
        """
        try:
            user_id = self.get_user_id()
            if not user_id:
                return []
                
            response = self.call_function("core_enrol_get_users_courses", {
                'userid': user_id
            })
            
            if response and 'data' in response:
                return response['data']
            return []
            
        except Exception as e:
            logger.error(f"Error getting courses: {e}")
            return []
    
    def get_assignments(self, course_id: int) -> List[Dict[str, Any]]:
        """
        Get assignments for a course.
        
        Args:
            course_id: Course ID
            
        Returns:
            List of assignment dictionaries
        """
        try:
            response = self.call_function("mod_assign_get_assignments", {
                'courseids': [course_id]
            })
            
            assignments = []
            if response and 'data' in response and 'courses' in response['data']:
                for course in response['data']['courses']:
                    if course.get('id') == course_id:
                        assignments = course.get('assignments', [])
                        break
                        
            return assignments
            
        except Exception as e:
            logger.error(f"Error getting assignments for course {course_id}: {e}")
            return [] 