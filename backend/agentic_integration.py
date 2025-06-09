"""
Agentic Integration Layer
This module provides integration between the multi-agentic framework and existing API endpoints.
"""

import asyncio
import logging
import os
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

from agentic_framework import (
    AgenticGradingSystem, 
    get_agentic_system, 
    start_agentic_system,
    stop_agentic_system
)
from canvas_service import CanvasGradingService
from config import get_settings

logger = logging.getLogger(__name__)

class AgenticCanvasService:
    """
    Agentic wrapper for Canvas grading operations.
    This class provides the same interface as CanvasGradingService but uses the agentic framework.
    """
    
    def __init__(self, canvas_url: str, canvas_api_key: str, gemini_api_key: str):
        self.canvas_url = canvas_url
        self.canvas_api_key = canvas_api_key
        self.gemini_api_key = gemini_api_key
        
        # Create traditional canvas service for basic operations
        self.canvas_service = CanvasGradingService(canvas_url, canvas_api_key, gemini_api_key)
        
        # Initialize agentic system
        self.agentic_system = None
        self.workflow_status = {}
        
        # Expose grading_service from the traditional service
        self.grading_service = self.canvas_service.grading_service
        
        # Expose canvas connector from the traditional service
        self.canvas = self.canvas_service.canvas
        
    async def initialize_agentic_system(self):
        """Initialize the agentic system"""
        if self.agentic_system is None:
            self.agentic_system = get_agentic_system(self.gemini_api_key, self.canvas_service)
            if self.agentic_system:
                # Start the system in background
                asyncio.create_task(self.agentic_system.start())
                logger.info("Agentic system initialized and started")
    
    def test_connection(self) -> bool:
        """Test Canvas connection using traditional service"""
        return self.canvas_service.test_connection()
    
    def get_available_courses(self) -> List[Dict[str, Any]]:
        """Get available courses using traditional service"""
        return self.canvas_service.get_available_courses()
    
    def get_assignments_for_course(self, course_id: int) -> List[Dict[str, Any]]:
        """Get assignments for course using traditional service"""
        return self.canvas_service.get_assignments_for_course(course_id)
    
    def get_submissions_for_assignment(self, course_id: int, assignment_id: int, 
                                     include: List[str] = None, per_page: int = 50) -> Dict[str, Any]:
        """Get submissions using traditional service"""
        return self.canvas_service.get_submissions_for_assignment(course_id, assignment_id, include, per_page)
    
    def download_and_organize_submissions(self, course_id: int, assignment_id: int, 
                                        download_dir: str = "submissions") -> Dict[str, Any]:
        """Download and organize submissions using traditional service"""
        return self.canvas_service.download_and_organize_submissions(course_id, assignment_id, download_dir)
    
    def prepare_grading_batch(self, course_id: int, assignment_id: int, 
                            download_dir: str = "submissions") -> Dict[str, Any]:
        """Prepare grading batch using traditional service"""
        return self.canvas_service.prepare_grading_batch(course_id, assignment_id, download_dir)
    
    def get_students_list_with_files(self, course_id: int, assignment_id: int, 
                                   base_dir: str = "submissions") -> Dict[str, Any]:
        """Get students list using traditional service"""
        return self.canvas_service.get_students_list_with_files(course_id, assignment_id, base_dir)
    
    def get_grading_results(self, course_id: int, assignment_id: int, 
                          base_dir: str = "submissions") -> Dict[str, Any]:
        """Get grading results using traditional service"""
        return self.canvas_service.get_grading_results(course_id, assignment_id, base_dir)
    
    async def grade_selected_students_agentic(self, course_id: int, assignment_id: int, 
                                            base_dir: str = "submissions", strictness: float = 0.5) -> Dict[str, Any]:
        """
        Grade selected students using the agentic framework.
        This is the main method that leverages the multi-agent system.
        """
        try:
            # Initialize agentic system if not already done
            await self.initialize_agentic_system()
            
            if not self.agentic_system:
                # Fallback to traditional method
                logger.warning("Agentic system not available, falling back to traditional grading")
                return self.canvas_service.grade_selected_students_only(course_id, assignment_id, base_dir)
            
            # First check for selected students in the default submissions directory
            default_assignment_path = Path("backend/submissions") / f"course_{course_id}" / f"assignment_{assignment_id}"
            default_batch_results_dir = default_assignment_path / "batch_results"
            default_selected_file = default_batch_results_dir / "selected_students.json"
            
            selected_students = []
            
            # Try to read from default submissions directory first
            if default_selected_file.exists():
                logger.info(f"Reading selection from default directory: {default_selected_file}")
                try:
                    import json
                    with open(default_selected_file, 'r', encoding='utf-8') as f:
                        selection_data = json.load(f)
                    selected_students = selection_data.get('selected_students', [])
                    logger.info(f"Found {len(selected_students)} selected students in default directory")
                except Exception as e:
                    logger.warning(f"Error reading default selection file: {e}")
            
            # If no students found in default directory, try the job directory
            if not selected_students:
                assignment_path = Path(base_dir) / f"course_{course_id}" / f"assignment_{assignment_id}"
                batch_results_dir = assignment_path / "batch_results"
                selected_file = batch_results_dir / "selected_students.json"
                
                if selected_file.exists():
                    logger.info(f"Reading selection from job directory: {selected_file}")
                    try:
                        with open(selected_file, 'r', encoding='utf-8') as f:
                            selection_data = json.load(f)
                        selected_students = selection_data.get('selected_students', [])
                        logger.info(f"Found {len(selected_students)} selected students in job directory")
                    except Exception as e:
                        logger.warning(f"Error reading job selection file: {e}")
            
            if not selected_students:
                return {
                    'success': False,
                    'message': 'No students selected for grading. Please select students first.',
                    'results': {}
                }
            
            # Read assignment metadata
            metadata_dir = assignment_path / "metadata"
            assignment_info_file = metadata_dir / "assignment_info.json"
            assignment_info = {}
            
            if assignment_info_file.exists():
                with open(assignment_info_file, 'r', encoding='utf-8') as f:
                    assignment_info = json.load(f)
            
            # Read question text and answer key
            question_file = metadata_dir / "question_paper.html"
            question_text = assignment_info.get('description', 'No question description available')
            
            if question_file.exists():
                try:
                    with open(question_file, 'r', encoding='utf-8') as f:
                        question_text = f.read().strip()
                except Exception as e:
                    logger.warning(f"Could not read question file: {e}")
            
            answer_key_file = metadata_dir / "answer_key.txt"
            answer_key = ""
            if answer_key_file.exists():
                try:
                    with open(answer_key_file, 'r', encoding='utf-8') as f:
                        answer_key = f.read().strip()
                except Exception as e:
                    logger.warning(f"Could not read answer key: {e}")
            
            # Get Canvas submissions directly with URLs for selected students only
            logger.info(f"Fetching Canvas submissions for {len(selected_students)} selected students")
            selected_user_ids = [student['user_id'] for student in selected_students]
            
            # Get submissions data from Canvas
            submissions_result = self.canvas_service.get_submissions_for_assignment(
                course_id, assignment_id, include=['attachments']
            )
            
            submissions_data = []
            if submissions_result.get('success'):
                all_submissions = submissions_result.get('submissions', [])
                
                # Filter to only selected students
                for submission in all_submissions:
                    user_id = submission.get('user_id')
                    if user_id in selected_user_ids:
                        user_name = submission.get('user', {}).get('name', f'Student {user_id}')
                        
                        # Get attachments with URLs
                        attachments = submission.get('attachments', [])
                        
                        submissions_data.append({
                            'user_id': user_id,
                            'user_name': user_name,
                            'attachments': attachments,
                            'submission_data': submission
                        })
                        logger.info(f"Added submission for {user_name} with {len(attachments)} attachments")
                
                logger.info(f"Prepared {len(submissions_data)} submissions for agentic processing")
            else:
                logger.error(f"Failed to fetch submissions: {submissions_result.get('message')}")
                return {
                    'success': False,
                    'message': f"Failed to fetch submissions: {submissions_result.get('message')}",
                    'results': {}
                }
            
            # Create a basic rubric if none exists
            rubric = {
                "criteria": [
                    {
                        "name": "Technical Accuracy",
                        "max_points": 40,
                        "description": "Correctness of concepts and calculations"
                    },
                    {
                        "name": "Problem Analysis",
                        "max_points": 25,
                        "description": "Understanding and approach to solving problems"
                    },
                    {
                        "name": "Completeness",
                        "max_points": 20,
                        "description": "All parts of the assignment are addressed"
                    },
                    {
                        "name": "Clarity",
                        "max_points": 15,
                        "description": "Clear explanations and organization"
                    }
                ],
                "total_points": 100
            }
            
            # Start agentic grading workflow
            logger.info(f"Starting agentic grading workflow for {len(submissions_data)} students")
            
            workflow_id = await self.agentic_system.start_grading_workflow('canvas_grading', {
                'course_id': course_id,
                'assignment_id': assignment_id,
                'selected_students': [s['user_id'] for s in submissions_data],
                'question_text': question_text,
                'answer_key': answer_key,
                'rubric': rubric,
                'strictness': strictness,
                'submissions_data': submissions_data,
                'assignment_path': str(assignment_path)
            })
            
            # Store workflow info
            self.workflow_status[workflow_id] = {
                'course_id': course_id,
                'assignment_id': assignment_id,
                'started_at': datetime.now().isoformat(),
                'status': 'in_progress'
            }
            
            # Wait for workflow completion (with timeout)
            timeout = 600  # 10 minutes
            start_time = datetime.now()
            
            while (datetime.now() - start_time).total_seconds() < timeout:
                workflow_status = self.agentic_system.get_workflow_status(workflow_id)
                
                if workflow_status.get('status') == 'completed':
                    # Process and save results
                    final_result = workflow_status.get('final_result', {})
                    
                    # Save grading results to student directories
                    successful_grades = 0
                    failed_grades = 0
                    
                    for user_id, result in final_result.items():
                        student_dir = assignment_path / "submissions" / f"student_{user_id}"
                        grading_results_file = student_dir / "grading_results.json"
                        
                        try:
                            grading_result = {
                                'grading_status': result.get('status', 'completed'),
                                'ai_feedback': result.get('grading_result', {}).get('feedback', 'No feedback'),
                                'ai_score': result.get('grading_result', {}).get('score', 0),
                                'final_score': result.get('grading_result', {}).get('score', 0),
                                'final_grade': result.get('grading_result', {}).get('grade_letter', 'F'),
                                'grading_timestamp': result.get('graded_at', datetime.now().isoformat()),
                                'selected_for_grading': True,
                                'agentic_workflow_id': workflow_id,
                                'criteria_scores': result.get('grading_result', {}).get('criteria_scores', []),
                                'mistakes': result.get('grading_result', {}).get('mistakes', []),
                                'percentage': result.get('grading_result', {}).get('percentage', 0)
                            }
                            
                            with open(grading_results_file, 'w', encoding='utf-8') as f:
                                json.dump(grading_result, f, indent=2)
                            
                            if result.get('status') == 'completed':
                                successful_grades += 1
                            else:
                                failed_grades += 1
                                
                        except Exception as e:
                            logger.error(f"Error saving results for student {user_id}: {e}")
                            failed_grades += 1
                    
                    return {
                        'success': True,
                        'message': f'Agentic grading completed: {successful_grades} successful, {failed_grades} failed',
                        'results': {
                            'successful_grades': successful_grades,
                            'failed_grades': failed_grades,
                            'total_students': len(submissions_data),
                            'workflow_id': workflow_id,
                            'grading_method': 'agentic'
                        }
                    }
                
                elif workflow_status.get('status') == 'failed':
                    error_msg = workflow_status.get('error', 'Unknown error')
                    logger.error(f"Agentic workflow failed: {error_msg}")
                    
                    # Fallback to traditional grading
                    logger.info("Falling back to traditional grading method")
                    return self.canvas_service.grade_selected_students_only(course_id, assignment_id, base_dir, strictness)
                
                # Wait before checking again
                await asyncio.sleep(5)
            
            # Timeout reached
            logger.warning(f"Agentic workflow {workflow_id} timed out")
            return {
                'success': False,
                'message': 'Grading workflow timed out',
                'results': {}
            }
            
        except Exception as e:
            logger.error(f"Agentic grading failed: {e}")
            # Fallback to traditional grading
            logger.info("Falling back to traditional grading method due to error")
            return self.canvas_service.grade_selected_students_only(course_id, assignment_id, base_dir, strictness)
    
    def grade_selected_students_only(self, course_id: int, assignment_id: int, 
                                   base_dir: str = "submissions", strictness: float = 0.5) -> Dict[str, Any]:
        """
        Grade selected students - this method uses agentic approach with fallback to traditional.
        """
        try:
            # Use agentic approach by default
            import asyncio
            logger.info(f"Using agentic approach to grade selected students for course {course_id}, assignment {assignment_id}")
            return asyncio.run(self.grade_selected_students_agentic(course_id, assignment_id, base_dir, strictness))
        except Exception as e:
            logger.warning(f"Agentic grading failed, falling back to traditional: {e}")
            # Fallback to traditional method if agentic fails
            return self.canvas_service.grade_selected_students_only(course_id, assignment_id, base_dir, strictness)

    def post_grades_to_canvas(self, course_id: int, assignment_id: int, 
                            grades: Dict[str, Dict[str, Any]]) -> tuple:
        """Post grades to Canvas using traditional service"""
        return self.canvas_service.post_grades_to_canvas(course_id, assignment_id, grades)
    
    def select_students_for_grading(self, course_id: int, assignment_id: int, 
                                  student_ids: List[int], base_dir: str = "submissions") -> Dict[str, Any]:
        """Select specific students for grading using traditional service"""
        return self.canvas_service.select_students_for_grading(course_id, assignment_id, student_ids, base_dir)
    
    def update_student_selection(self, course_id: int, assignment_id: int, 
                               student_ids: List[int], action: str = "select",
                               base_dir: str = "submissions") -> Dict[str, Any]:
        """Update student selection using traditional service"""
        return self.canvas_service.update_student_selection(course_id, assignment_id, student_ids, action, base_dir)
    
    def get_selection_status(self, course_id: int, assignment_id: int, 
                           base_dir: str = "submissions") -> Dict[str, Any]:
        """Get selection status using traditional service"""
        return self.canvas_service.get_selection_status(course_id, assignment_id, base_dir)
    
    async def process_submissions(self, course_id, assignment_id, output_dir):
        """Process submissions using traditional service"""
        if hasattr(self.canvas_service, 'process_submissions'):
            return await self.canvas_service.process_submissions(course_id, assignment_id, output_dir)
        else:
            # Fallback implementation
            return False, "process_submissions method not available", {}
    
    def process_assignment(self, course_id: int, assignment_id: int, 
                          output_dir: Optional[Path] = None, rubric: Optional[Dict[str, Any]] = None):
        """Process an assignment from Canvas using traditional service"""
        return self.canvas_service.process_assignment(course_id, assignment_id, output_dir, rubric)
    
    def get_submission_details(self, course_id: int, assignment_id: int, user_id: int) -> Dict[str, Any]:
        """Get detailed information about a specific submission using traditional service"""
        return self.canvas_service.get_submission_details(course_id, assignment_id, user_id)
    
    async def download_submission_files(self, submission_data, output_dir):
        """Download submission files using traditional service"""
        return await self.canvas_service.download_submission_files(submission_data, output_dir)
    
    def test_connection(self) -> bool:
        """Test connection to Canvas using traditional service"""
        return self.canvas_service.test_connection()
    
    def get_available_courses(self) -> List[Dict[str, Any]]:
        """Get list of available courses using traditional service"""
        return self.canvas_service.get_available_courses()
    
    def get_assignments_for_course(self, course_id: int) -> List[Dict[str, Any]]:
        """Get assignments for a course using traditional service"""
        return self.canvas_service.get_assignments_for_course(course_id)
    
    def get_submissions_for_assignment(self, course_id: int, assignment_id: int, **kwargs):
        """Get submissions for an assignment using traditional service"""
        return self.canvas_service.get_submissions_for_assignment(course_id, assignment_id, **kwargs)
    
    def download_and_organize_submissions(self, course_id: int, assignment_id: int, **kwargs):
        """Download and organize submissions using traditional service"""
        return self.canvas_service.download_and_organize_submissions(course_id, assignment_id, **kwargs)
    
    def prepare_grading_batch(self, course_id: int, assignment_id: int, **kwargs):
        """Prepare grading batch using traditional service"""
        return self.canvas_service.prepare_grading_batch(course_id, assignment_id, **kwargs)
    
    def get_students_list_with_files(self, course_id: int, assignment_id: int, **kwargs):
        """Get students list with files using traditional service"""
        return self.canvas_service.get_students_list_with_files(course_id, assignment_id, **kwargs)
    
    def get_grading_results(self, course_id: int, assignment_id: int, **kwargs):
        """Get grading results using traditional service"""
        return self.canvas_service.get_grading_results(course_id, assignment_id, **kwargs)
    
    def post_grades_to_canvas(self, course_id: int, assignment_id: int, **kwargs):
        """Post grades to Canvas using traditional service"""
        return self.canvas_service.post_grades_to_canvas(course_id, assignment_id, **kwargs)

# Factory function to create agentic or traditional canvas service
def create_canvas_service(canvas_url: str, canvas_api_key: str, gemini_api_key: str, 
                         use_agentic: bool = True) -> CanvasGradingService:
    """
    Create a Canvas service instance.
    
    Args:
        canvas_url: Canvas URL
        canvas_api_key: Canvas API key
        gemini_api_key: Gemini API key
        use_agentic: Whether to use agentic framework (default True)
    
    Returns:
        Canvas service instance (agentic or traditional)
    """
    if use_agentic:
        return AgenticCanvasService(canvas_url, canvas_api_key, gemini_api_key)
    else:
        return CanvasGradingService(canvas_url, canvas_api_key, gemini_api_key)

# Global agentic system management
async def initialize_global_agentic_system():
    """Initialize the global agentic system"""
    settings = get_settings()
    if settings.gemini_api_key:
        await start_agentic_system(settings.gemini_api_key)
        logger.info("Global agentic system initialized")

async def shutdown_global_agentic_system():
    """Shutdown the global agentic system"""
    await stop_agentic_system()
    logger.info("Global agentic system shutdown")

# Agentic workflow status tracking
class WorkflowManager:
    """Manages agentic workflows and their status"""
    
    def __init__(self):
        self.workflows = {}
    
    def add_workflow(self, workflow_id: str, workflow_info: Dict[str, Any]):
        """Add a workflow to tracking"""
        self.workflows[workflow_id] = workflow_info
    
    def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """Get workflow status"""
        agentic_system = get_agentic_system()
        if agentic_system:
            return agentic_system.get_workflow_status(workflow_id)
        return {'error': 'Agentic system not available'}
    
    def get_all_workflows(self) -> Dict[str, Any]:
        """Get all tracked workflows"""
        return self.workflows

# Global workflow manager
workflow_manager = WorkflowManager() 