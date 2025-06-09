import os
import re
import json
import logging
import uuid
import requests
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from fastapi import APIRouter, HTTPException, status, Request, Form, Body, Depends, BackgroundTasks
from pydantic import BaseModel, Field, root_validator, validator

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from canvas_service import CanvasGradingService
from config import get_settings
from utils.canvas_connector import CanvasConnector
from grading_v2 import GradingService
from preprocessing_v2 import FilePreprocessor, extract_text_from_pdf
from utils.directory_utils import ensure_directory_structure

# Import rubric functionality directly
from rubric_api import RUBRICS, load_rubrics_from_disk

# Add agentic framework imports
from agentic_integration import (
    AgenticCanvasService, 
    create_canvas_service, 
    workflow_manager,
    initialize_global_agentic_system,
    shutdown_global_agentic_system
)

settings = get_settings()
directories = ensure_directory_structure()  # Get directories dictionary

# Set up logging
logger = logging.getLogger(__name__)

# Create the router with the correct prefix
router = APIRouter()  # No prefix here - it will be added when included in the app

# Global Canvas service instance
canvas_service_global = None

def get_canvas_service(canvas_api_key: str = None, canvas_url: str = None, gemini_api_key: str = None, use_agentic: bool = True) -> CanvasGradingService:
    """Get the Canvas grading service (agentic or traditional)."""
    # Use provided parameters or fall back to settings
    api_key = canvas_api_key or settings.canvas_api_key
    url = canvas_url or settings.canvas_url
    gemini_key = gemini_api_key or settings.gemini_api_key
    
    return create_canvas_service(
        canvas_url=url,
        canvas_api_key=api_key,
        gemini_api_key=gemini_key,
        use_agentic=use_agentic
    )

@router.get("/status")
async def get_canvas_status():
    """
    Get Canvas connection status.
    Returns connection status and any cached connection info.
    """
    try:
        # Check if Canvas service is available and properly initialized
        global canvas_service_global
        
        if not canvas_service_global:
            return {
                "status": "error",
                "connected": False,
                "canvas_url": "https://sjsu.instructure.com",
                "message": "Canvas not initialized. Please configure API key in settings."
            }
        
        # Test the actual connection
        try:
            connection_test = canvas_service_global.test_connection()
            if connection_test:
                return {
                    "status": "success",
                    "connected": True,
                    "canvas_url": "https://sjsu.instructure.com",
                    "message": "Canvas connection is active"
                }
            else:
                return {
                    "status": "error",
                    "connected": False,
                    "canvas_url": "https://sjsu.instructure.com",
                    "message": "Canvas connection failed. Please check API key in settings."
                }
        except Exception as test_error:
            return {
                "status": "error",
                "connected": False,
                "canvas_url": "https://sjsu.instructure.com",
                "message": f"Canvas connection test failed: {str(test_error)}"
            }
            
    except Exception as e:
        logger.error(f"Error getting Canvas status: {e}")
        return {
            "status": "error",
            "connected": False,
            "message": f"Error getting Canvas status: {str(e)}"
        }

@router.post("/connect")
async def connect_to_canvas(request: Request):
    """
    Connect to Canvas LMS and verify the connection.
    Expected request body: {"api_key": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        
        if not api_key:
            raise HTTPException(
                status_code=400, 
                detail="API key is required"
            )
        
        # Use hardcoded SJSU Canvas URL since that's what the frontend expects
        canvas_url = "https://sjsu.instructure.com"
        
        # Clean up the API key (remove Bearer prefix if present)
        clean_api_key = api_key.replace("Bearer ", "").strip()
        
        # Create a Canvas connector and test the connection
        canvas = CanvasConnector(canvas_url, clean_api_key)
        connection_successful = canvas.test_connection()
        
        if connection_successful:
            return {
                "status": "success",
                "message": "Successfully connected to Canvas LMS"
            }
        else:
            return {
                "status": "error",
                "message": "Failed to connect to Canvas LMS. Please check your credentials."
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting to Canvas: {e}")
        raise HTTPException(status_code=500, detail=f"Error connecting to Canvas: {str(e)}")

@router.post("/initialize")
async def initialize_canvas(request: Request):
    """
    Initialize Canvas integration with user-provided credentials.
    Stores the credentials in memory for the session.
    Accepts both form data and JSON data.
    """
    try:
        global canvas_service_global
        
        logger.info("Canvas initialization started")
        
        api_key = None
        content_type = request.headers.get("content-type", "").lower()
        logger.info(f"Request content type: {content_type}")
        
        # Handle form data requests
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            logger.info("Processing form data request")
            try:
                form_data = await request.form()
                logger.info(f"Form data keys: {list(form_data.keys())}")
                api_key = form_data.get("api_key")
                if api_key:
                    logger.info("API key found in form data")
                else:
                    logger.warning("API key not found in form data")
            except Exception as e:
                logger.error(f"Error processing form data: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Error processing form data: {str(e)}"
                }
        
        # Handle JSON requests
        elif "application/json" in content_type:
            logger.info("Processing JSON request")
            try:
                raw_body = await request.body()
                if raw_body:
                    body_text = raw_body.decode('utf-8').strip()
                    logger.info(f"Request body length: {len(body_text)}")
                    
                    if body_text:
                        try:
                            json_data = json.loads(body_text)
                            logger.info(f"Successfully parsed JSON: {json_data}")
                            api_key = json_data.get("api_key")
                            if api_key:
                                logger.info("API key found in JSON data")
                            else:
                                logger.warning("API key not found in JSON data")
                        except json.JSONDecodeError as json_err:
                            logger.error(f"JSON decode error: {json_err}")
                            return {
                                "status": "error",
                                "message": f"Invalid JSON format: {str(json_err)}"
                            }
                    else:
                        logger.warning("Empty JSON body received")
                        return {
                            "status": "error",
                            "message": "Empty request body"
                        }
                else:
                    logger.warning("No request body received")
                    return {
                        "status": "error",
                        "message": "No request body received"
                    }
            except Exception as e:
                logger.error(f"Error processing JSON request: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Error processing request: {str(e)}"
                }
        
        else:
            logger.error(f"Unsupported content type: {content_type}")
            return {
                "status": "error",
                "message": f"Unsupported content type: {content_type}. Use application/json or application/x-www-form-urlencoded"
            }
        
        # Validate API key
        if not api_key:
            logger.error("API key is required but not provided")
            return {
                "status": "error",
                "message": "API key is required"
            }
        
        # Use hardcoded SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Clean up the API key (remove Bearer prefix if present)
        clean_api_key = str(api_key).replace("Bearer ", "").strip()
        logger.info(f"Using API key (length: {len(clean_api_key)})")
        
        if len(clean_api_key) == 0:
            logger.error("Empty API key provided after cleaning")
            return {
                "status": "error",
                "message": "API key cannot be empty"
            }
        
        logger.info(f"Connecting to Canvas at: {canvas_url}")
        
        # Get Gemini API key from environment
        gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        
        # Create the Canvas service instance and update global variable (using agentic framework)
        canvas_service_global = create_canvas_service(
            canvas_url=canvas_url,
            canvas_api_key=clean_api_key,
            gemini_api_key=gemini_api_key,
            use_agentic=True
        )
        
        # Make sure to update the global variable
        globals()['canvas_service_global'] = canvas_service_global
        
        # Test the connection
        connection_successful = canvas_service_global.test_connection()
        
        if connection_successful:
            logger.info("Successfully initialized Canvas service")
            return {
                "status": "success",
                "message": "Successfully initialized Canvas LMS"
            }
        else:
            logger.error("Canvas connection test failed")
            canvas_service_global = None  # Reset on failure
            return {
                "status": "error",
                "message": "Failed to connect to Canvas LMS. Please check your credentials."
            }
    except Exception as e:
        logger.error(f"Error initializing Canvas: {str(e)}", exc_info=True)
        canvas_service_global = None  # Reset on error
        return {
            "status": "error",
            "message": f"Error initializing Canvas: {str(e)}"
        }

@router.get("/courses")
async def get_courses():
    """
    Get Canvas courses (simplified endpoint for frontend).
    This should use stored credentials or session-based authentication.
    """
    try:
        global canvas_service_global
        
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas not initialized. Please configure API key in settings."
            }
        
        # Use direct Canvas API call to get TA courses (matching the working approach)
        canvas_url = "https://sjsu.instructure.com"
        
        # Extract API key from canvas service
        api_key = canvas_service_global.canvas_api_key
        if api_key.startswith("Bearer "):
            clean_api_key = api_key.replace("Bearer ", "").strip()
        else:
            clean_api_key = api_key.strip()
        
        logger.info("Fetching TA courses from Canvas API...")
        
        # Fetch all TA courses with pagination (same logic as get_ta_courses)
        all_courses = []
        headers = {"Authorization": f"Bearer {clean_api_key}"}
        
        page = 1
        per_page = 50
        
        while True:
            url = f"{canvas_url}/api/v1/courses?enrollment_type=ta&per_page={per_page}&page={page}"
            logger.info(f"Fetching courses from page {page}: {url}")
            
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Canvas API error: {response.status_code} - {response.text}")
                return {
                    "status": "error",
                    "message": f"Failed to fetch courses from Canvas: {response.status_code}"
                }
            
            page_courses = response.json()
            
            # If no courses returned, we've reached the end
            if not page_courses:
                logger.info(f"No more courses found on page {page}, stopping pagination")
                break
                
            all_courses.extend(page_courses)
            logger.info(f"Fetched {len(page_courses)} courses on page {page}, {len(all_courses)} total so far")
            
            # If we got fewer than per_page results, this is likely the last page
            if len(page_courses) < per_page:
                logger.info(f"Got {len(page_courses)} < {per_page} courses, assuming this is the last page")
                break
            
            page += 1
            
            # Safety break to prevent infinite loops
            if len(all_courses) > 1000:  # Reasonable limit
                logger.warning("Reached course limit of 1000, stopping pagination")
                break
        
        logger.info(f"Finished fetching courses. Total courses retrieved: {len(all_courses)}")
        
        # Transform Canvas API response to our expected format
        formatted_courses = []
        for course in all_courses:
            formatted_course = {
                'id': str(course.get('id', '')),
                'name': course.get('name', ''),
                'course_code': course.get('course_code', ''),
                'enrollment_term_id': str(course.get('enrollment_term_id', '')),
                'workflow_state': course.get('workflow_state', 'available'),
                'start_date': course.get('start_at', ''),
                'end_date': course.get('end_at', '')
            }
            formatted_courses.append(formatted_course)
        
        return {
            "status": "success",
            "courses": formatted_courses,
            "message": f"Successfully loaded {len(formatted_courses)} courses"
        }
    except Exception as e:
        logger.error(f"Error getting Canvas courses: {e}")
        return {
            "status": "error",
            "message": f"Error getting Canvas courses: {str(e)}"
        }

@router.get("/courses/{course_id}/assignments")
async def get_course_assignments(course_id: str):
    """
    Get assignments for a specific course (simplified endpoint for frontend).
    This should use stored credentials or session-based authentication.
    """
    try:
        global canvas_service_global
        
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas not initialized. Please configure API key in settings."
            }
        
        # Get assignments using the Canvas service
        assignments = canvas_service_global.get_assignments_for_course(int(course_id))
        
        return {
            "status": "success",
            "assignments": assignments,
            "message": f"Successfully loaded {len(assignments)} assignments"
        }
    except Exception as e:
        logger.error(f"Error getting Canvas assignments: {e}")
        return {
            "status": "error",
            "message": f"Error getting Canvas assignments: {str(e)}"
        }

@router.post("/grade")
async def grade_canvas_assignment_simple(request: Request):
    """
    Start grading job for Canvas assignment (simplified endpoint for frontend).
    Expected body: {"assignment_id": "123"}
    """
    try:
        body = await request.json()
        assignment_id = body.get("assignment_id")
        
        if not assignment_id:
            return {
                "status": "error",
                "message": "Assignment ID is required"
            }
        
        # For now, return a basic response - implement proper grading logic later
        return {
            "status": "success",
            "message": f"Grading job started for assignment {assignment_id}",
            "job_id": f"job_{assignment_id}_{int(datetime.now().timestamp())}"
        }
    except Exception as e:
        logger.error(f"Error starting Canvas grading: {e}")
        return {
            "status": "error",
            "message": f"Error starting Canvas grading: {str(e)}"
        }

@router.post("/get-ta-courses")
async def get_ta_courses(request: Request):
    """
    Get TA courses from Canvas API with pagination support.
    Expected request body: {"api_key": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        
        if not api_key:
            raise HTTPException(
                status_code=400, 
                detail="API key is required"
            )
        
        # Use hardcoded SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Clean up the API key (remove Bearer prefix if present)
        clean_api_key = api_key.replace("Bearer ", "").strip()
        
        # Create a Canvas connector
        canvas = CanvasConnector(canvas_url, clean_api_key)
        
        # Fetch all TA courses with page-based pagination
        all_courses = []
        headers = {"Authorization": f"Bearer {clean_api_key}"}
        
        page = 1
        per_page = 50
        
        while True:
            url = f"{canvas_url}/api/v1/courses?enrollment_type=ta&per_page={per_page}&page={page}"
            logger.info(f"Fetching courses from page {page}: {url}")
            
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Canvas API error: {response.status_code} - {response.text}")
                return {
                    "status": "error",
                    "message": f"Failed to fetch courses from Canvas: {response.status_code}"
                }
            
            page_courses = response.json()
            
            # If no courses returned, we've reached the end
            if not page_courses:
                logger.info(f"No more courses found on page {page}, stopping pagination")
                break
                
            all_courses.extend(page_courses)
            logger.info(f"Fetched {len(page_courses)} courses on page {page}, {len(all_courses)} total so far")
            
            # If we got fewer than per_page results, this is likely the last page
            if len(page_courses) < per_page:
                logger.info(f"Got {len(page_courses)} < {per_page} courses, assuming this is the last page")
                break
            
            page += 1
            
            # Safety break to prevent infinite loops
            if len(all_courses) > 1000:  # Reasonable limit
                logger.warning("Reached course limit of 1000, stopping pagination")
                break
        
        logger.info(f"Finished fetching courses. Total courses retrieved: {len(all_courses)}")
        
        return {
            "status": "success",
            "courses": all_courses,
            "total_count": len(all_courses)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching TA courses: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching TA courses: {str(e)}")

@router.post("/get-assignments")
async def get_assignments(request: Request):
    """
    Get assignments for a specific course from Canvas API with pagination support.
    Expected request body: {"api_key": "...", "course_id": 123}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        
        if not api_key or not course_id:
            raise HTTPException(
                status_code=400, 
                detail="API key and course ID are required"
            )
        
        # Use hardcoded SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Clean up the API key (remove Bearer prefix if present)
        clean_api_key = api_key.replace("Bearer ", "").strip()
        
        # Fetch all assignments with page-based pagination
        all_assignments = []
        headers = {"Authorization": f"Bearer {clean_api_key}"}
        
        page = 1
        per_page = 50
        
        while True:
            url = f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page={per_page}&page={page}"
            logger.info(f"Fetching assignments from page {page}: {url}")
            
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Canvas API error: {response.status_code} - {response.text}")
                return {
                    "status": "error",
                    "message": f"Failed to fetch assignments from Canvas: {response.status_code}"
                }
            
            page_assignments = response.json()
            
            # If no assignments returned, we've reached the end
            if not page_assignments:
                logger.info(f"No more assignments found on page {page}, stopping pagination")
                break
                
            all_assignments.extend(page_assignments)
            logger.info(f"Fetched {len(page_assignments)} assignments on page {page}, {len(all_assignments)} total so far")
            
            # Log assignment details for debugging
            for assignment in page_assignments:
                logger.info(f"Assignment found: ID={assignment.get('id')}, Name='{assignment.get('name')}', State={assignment.get('workflow_state')}")
            
            # If we got fewer than per_page results, this is likely the last page
            if len(page_assignments) < per_page:
                logger.info(f"Got {len(page_assignments)} < {per_page} assignments, assuming this is the last page")
                break
            
            page += 1
            
            # Safety break to prevent infinite loops
            if len(all_assignments) > 1000:  # Reasonable limit
                logger.warning("Reached assignment limit of 1000, stopping pagination")
                break
        
        logger.info(f"Finished fetching assignments for course {course_id}. Total assignments retrieved: {len(all_assignments)}")
        
        # Log all assignments with their IDs and names for debugging assignment selection issues
        logger.info("=== ALL ASSIGNMENTS FOR DEBUGGING ===")
        for i, assignment in enumerate(all_assignments):
            assignment_id = assignment.get('id')
            assignment_name = assignment.get('name', '')
            workflow_state = assignment.get('workflow_state', '')
            logger.info(f"Assignment #{i+1}: ID={assignment_id}, Name='{assignment_name}', State={workflow_state}")
        logger.info("=== END ASSIGNMENT LIST ===")
        
        return {
            "status": "success",
            "assignments": all_assignments,
            "total_count": len(all_assignments),
            "pagination_info": {
                "per_page": per_page,
                "total_pages": page - 1,
                "fetched_all": True
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching assignments: {str(e)}")

@router.post("/get-submissions")
async def get_canvas_submissions(request: Request):
    """
    Get submissions for a Canvas assignment with pagination support.
    Updated to handle SJSU Canvas API format properly.
    Expected request body: {"api_key": "...", "course_id": "...", "assignment_id": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        
        if not all([api_key, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="API key, course ID, and assignment ID are required"
            )
        
        # Use SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Clean up the API key (remove Bearer prefix if present)
        clean_api_key = api_key.replace("Bearer ", "").strip()
        
        # Create Canvas service to use the enhanced submission fetching
        canvas_service = CanvasGradingService(
            canvas_url=canvas_url,
            canvas_api_key=clean_api_key,
            gemini_api_key=""  # Not needed for just fetching submissions
        )
        
        # Use the Canvas service method which handles user enrichment
        result = canvas_service.get_submissions_for_assignment(
            int(course_id), 
            int(assignment_id),
            include=["user", "submission_comments", "attachments"],
            per_page=50
        )
        
        if result["success"]:
            submissions = result["submissions"]
            assignment_info = result["assignment"]
            
            # Transform submissions to match expected frontend format
            transformed_submissions = []
            for submission in submissions:
                # Ensure user information is available
                user_info = submission.get("user", {})
                if not user_info and submission.get("user_id"):
                    user_info = {
                        "id": submission["user_id"],
                        "name": f"User {submission['user_id']}",
                        "email": "",
                        "avatar_url": ""
                    }
                
                transformed_submission = {
                    "id": submission.get("id"),
                    "user_id": submission.get("user_id"),
                    "assignment_id": submission.get("assignment_id"),
                    "submitted_at": submission.get("submitted_at"),
                    "workflow_state": submission.get("workflow_state"),
                    "grade": submission.get("grade"),
                    "score": submission.get("score"),
                    "entered_grade": submission.get("entered_grade"),
                    "entered_score": submission.get("entered_score"),
                    "submission_type": submission.get("submission_type"),
                    "body": submission.get("body"),
                    "url": submission.get("url"),
                    "attempt": submission.get("attempt"),
                    "late": submission.get("late", False),
                    "missing": submission.get("missing", False),
                    "excused": submission.get("excused", False),
                    "graded_at": submission.get("graded_at"),
                    "preview_url": submission.get("preview_url"),
                    "attachments": submission.get("attachments", []),
                    "user": user_info
                }
                transformed_submissions.append(transformed_submission)
            
            logger.info(f"Successfully retrieved {len(transformed_submissions)} submissions for assignment {assignment_id}")
            
            return {
                "status": "success",
                "submissions": transformed_submissions,
                "assignment": assignment_info,
                "total_count": len(transformed_submissions)
            }
        else:
            logger.error(f"Failed to retrieve submissions: {result['message']}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve submissions: {result['message']}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Canvas submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching Canvas submissions: {str(e)}")

@router.post("/process-canvas-data")
async def process_canvas_data(data: dict):
    """Process submission data from Canvas."""
    try:
        # Validate the submission data
        if not data or not isinstance(data, list):
            return {"status": "error", "message": "Invalid submission data"}
        
        # Create a temporary directory to store the submissions
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = os.path.join(settings.temp_dir, f"canvas_submissions_{timestamp}")
        os.makedirs(output_dir, exist_ok=True)
        
        # Save the raw submission data
        with open(os.path.join(output_dir, "raw_submissions.json"), "w") as f:
            json.dump(data, f, indent=2)
        
        # Process each submission
        processed_submissions = {}
        submissions_dir = os.path.join(output_dir, "submissions")
        os.makedirs(submissions_dir, exist_ok=True)
        
        for submission in data:
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
            
            # Extract attachment URLs
            attachments = submission.get("attachments", [])
            file_info = []
            
            for attachment in attachments:
                file_info.append({
                    "id": attachment.get("id"),
                    "name": attachment.get("display_name"),
                    "url": attachment.get("url"),
                    "content_type": attachment.get("content-type"),
                    "size": attachment.get("size")
                })
            
            # Process the submission
            processed_submissions[str(user_id)] = {
                "submission_id": submission_id,
                "user_id": user_id,
                "grade": submission.get("grade"),
                "score": submission.get("score"),
                "submitted_at": submission.get("submitted_at"),
                "files": file_info,
                "status": "ready_for_download" if file_info else "no_files",
                "directory": user_dir
            }
        
        return {
            "status": "success", 
            "message": f"Successfully processed {len(processed_submissions)} submissions",
            "output_directory": output_dir,
            "submissions": processed_submissions
        }
    except Exception as e:
        logger.error(f"Error processing Canvas data: {str(e)}")
        return {"status": "error", "message": f"Error processing Canvas data: {str(e)}"}

@router.post("/download-submission-files")
async def download_submission_files(data: dict):
    """Download files for Canvas submissions."""
    try:
        submissions = data.get("submissions", {})
        output_dir = data.get("output_directory", "")
        
        if not submissions or not output_dir:
            return {"status": "error", "message": "Missing submissions or output directory"}
        
        # Ensure the output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        canvas_service = get_canvas_service()
        downloaded_files = {}
        
        for user_id, submission in submissions.items():
            user_dir = submission.get("directory", "")
            
            if not user_dir:
                continue
                
            # Ensure the user directory exists
            os.makedirs(user_dir, exist_ok=True)
            
            # Download the files
            for file_info in submission.get("files", []):
                file_url = file_info.get("url")
                file_name = file_info.get("name")
                
                if not file_url or not file_name:
                    continue
                
                # Create a safe filename
                safe_name = re.sub(r'[^\w\-_\. ]', '_', file_name)
                file_path = os.path.join(user_dir, safe_name)
                
                try:
                    # Download the file
                    response = requests.get(file_url, stream=True)
                    
                    if response.status_code == 200:
                        with open(file_path, 'wb') as f:
                            for chunk in response.iter_content(chunk_size=8192):
                                f.write(chunk)
                        
                        # Update the file info
                        file_info["path"] = file_path
                        file_info["downloaded"] = True
                        
                        # Track the downloaded file
                        if user_id not in downloaded_files:
                            downloaded_files[user_id] = []
                        
                        downloaded_files[user_id].append({
                            "path": file_path,
                            "name": file_name
                        })
                    else:
                        file_info["downloaded"] = False
                        file_info["error"] = f"Failed to download: Status code {response.status_code}"
                except Exception as e:
                    file_info["downloaded"] = False
                    file_info["error"] = str(e)
            
            # Update the submission status
            submission["status"] = "files_downloaded"
        
        return {
            "status": "success",
            "message": f"Downloaded files for {len(downloaded_files)} submissions",
            "output_directory": output_dir,
            "submissions": submissions,
            "downloaded_files": downloaded_files
        }
    except Exception as e:
        logger.error(f"Error downloading submission files: {str(e)}")
        return {"status": "error", "message": f"Error downloading submission files: {str(e)}"}

@router.post("/prepare-submissions-for-grading")
async def prepare_submissions_for_grading(data: dict):
    """Prepare submissions for grading."""
    try:
        submissions = data.get("submissions", {})
        output_dir = data.get("output_directory", "")
        
        if not submissions or not output_dir:
            return {"status": "error", "message": "Missing submissions or output directory"}
        
        # Prepare each submission for grading
        submissions_for_grading = []
        
        for user_id, submission in submissions.items():
            user_dir = submission.get("directory", "")
            
            if not user_dir or submission.get("status") != "files_downloaded":
                continue
            
            files = []
            for file_info in submission.get("files", []):
                if file_info.get("downloaded", False) and "path" in file_info:
                    files.append(file_info["path"])
            
            if files:
                submissions_for_grading.append({
                    "user_id": user_id,
                    "submission_id": submission.get("submission_id"),
                    "files": files,
                    "submitted_at": submission.get("submitted_at"),
                    "directory": user_dir
                })
        
        return {
            "status": "success",
            "message": f"Prepared {len(submissions_for_grading)} submissions for grading",
            "output_directory": output_dir,
            "submissions": submissions,
            "submissions_for_grading": submissions_for_grading
        }
    except Exception as e:
        logger.error(f"Error preparing submissions for grading: {str(e)}")
        return {"status": "error", "message": f"Error preparing submissions for grading: {str(e)}"}

@router.post("/fetch-canvas-submissions")
async def fetch_canvas_submissions(course_id: str = Form(...), assignment_id: str = Form(...)):
    """Fetch submissions directly from Canvas API."""
    try:
        # Get the Canvas service
        canvas_service = get_canvas_service()
        
        # Create a temporary directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = os.path.join(settings.temp_dir, f"canvas_submissions_{timestamp}")
        os.makedirs(output_dir, exist_ok=True)
        
        # Process the submissions
        success, message, submissions = await canvas_service.process_submissions(
            course_id=course_id,
            assignment_id=assignment_id,
            output_dir=output_dir
        )
        
        if not success:
            return {"status": "error", "message": message}
        
        return {
            "status": "success",
            "message": message,
            "output_directory": output_dir,
            "submissions": submissions
        }
    except Exception as e:
        logger.error(f"Error fetching Canvas submissions: {str(e)}")
        return {"status": "error", "message": f"Error fetching Canvas submissions: {str(e)}"}

@router.post("/grade-assignment")
async def grade_assignment(data: dict):
    """Grade submission files that have been prepared."""
    try:
        submissions = data.get("submissions_for_grading", [])
        output_dir = data.get("output_directory", "")
        
        if not submissions or not output_dir:
            return {"status": "error", "message": "Missing submissions or output directory"}
        
        # Get services
        canvas_service = get_canvas_service()
        file_preprocessor = FilePreprocessor()
        
        # Process each submission for grading
        grading_results = []
        
        for submission in submissions:
            user_id = submission.get("user_id")
            submission_id = submission.get("submission_id")
            files = submission.get("files", [])
            
            if not files:
                continue
                
            # Process each file in the submission
            submission_texts = []
            for file_path in files:
                try:
                    extracted_text = file_preprocessor.extract_text_from_file(file_path)
                    if extracted_text:
                        submission_texts.append({
                            "file_path": file_path,
                            "text": extracted_text
                        })
                except Exception as e:
                    logger.error(f"Error extracting text from {file_path}: {str(e)}")
            
            # Combine all texts from this submission
            combined_text = "\n\n".join([item["text"] for item in submission_texts])
            
            # Grade the submission
            try:
                grading_result = await canvas_service.grading_service.grade_submission_text(
                    submission_text=combined_text,
                    student_id=user_id,
                    submission_id=submission_id
                )
                
                # Save the grading result
                result_path = os.path.join(submission.get("directory", ""), "grading_result.json")
                with open(result_path, "w") as f:
                    json.dump(grading_result, f, indent=2)
                
                grading_results.append({
                    "user_id": user_id,
                    "submission_id": submission_id,
                    "grade": grading_result.get("score"),
                    "feedback": grading_result.get("feedback"),
                    "result_path": result_path
                })
                
            except Exception as e:
                logger.error(f"Error grading submission for user {user_id}: {str(e)}")
                grading_results.append({
                    "user_id": user_id,
                    "submission_id": submission_id,
                    "error": str(e)
                })
        
        # Save overall results
        results_path = os.path.join(output_dir, "grading_results.json")
        with open(results_path, "w") as f:
            json.dump(grading_results, f, indent=2)
        
        return {
            "status": "success",
            "message": f"Graded {len(grading_results)} submissions",
            "output_directory": output_dir,
            "results": grading_results,
            "results_path": results_path
        }
    except Exception as e:
        logger.error(f"Error grading submissions: {str(e)}")
        return {"status": "error", "message": f"Error grading submissions: {str(e)}"}

@router.post("/grade-selected-submissions")
async def grade_selected_submissions(request: Request):
    """
    Grade only selected submissions with specified rubric.
    
    Expected request body: {
        "sync_job_id": "...",
        "selected_user_ids": [...],
        "rubric_id": "...", (optional)
        "strictness": 0.5
    }
    """
    try:
        # Parse request body
        body = await request.json()
        sync_job_id = body.get("sync_job_id")
        selected_user_ids = body.get("selected_user_ids", [])
        rubric_id = body.get("rubric_id")
        strictness = body.get("strictness", 0.5)
        
        if not sync_job_id or not selected_user_ids:
            raise HTTPException(
                status_code=400, 
                detail="Sync job ID and selected user IDs are required"
            )
        
        logger.info(f"Starting grading for {len(selected_user_ids)} selected submissions")
        
        # Find the sync directory
        base_sync_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "synced_submissions")
        
        # Search for the sync job directory
        sync_summary_file = None
        for root, dirs, files in os.walk(base_sync_dir):
            if "sync_summary.json" in files:
                summary_path = os.path.join(root, "sync_summary.json")
                try:
                    with open(summary_path, 'r', encoding='utf-8') as f:
                        summary_data = json.load(f)
                        if summary_data.get("sync_job_id") == sync_job_id:
                            sync_summary_file = summary_path
                            break
                except:
                    continue
        
        if not sync_summary_file:
            raise HTTPException(status_code=404, detail="Sync job not found")
        
        # Load sync summary
        with open(sync_summary_file, 'r', encoding='utf-8') as f:
            sync_summary = json.load(f)
        
        sync_output_dir = sync_summary["sync_directory"]
        
        # Load rubric if specified
        rubric = None
        if rubric_id:
            try:
                # Ensure rubrics are loaded from disk
                if not RUBRICS:
                    load_rubrics_from_disk()
                
                # Get the rubric directly from the in-memory store
                if rubric_id in RUBRICS:
                    rubric_obj = RUBRICS[rubric_id]
                    # Convert to the format expected by the grading service
                    rubric = {
                        "criteria": []
                    }
                    total_points = 0
                    for criterion in rubric_obj.criteria:
                        rubric["criteria"].append({
                            "name": criterion.name,
                            "max_points": criterion.max_points,
                            "description": criterion.description
                        })
                        total_points += criterion.max_points
                    
                    rubric["total_points"] = total_points
                    logger.info(f"Successfully loaded custom rubric '{rubric_obj.name}' with {len(rubric['criteria'])} criteria and {total_points} total points")
                else:
                    logger.warning(f"Rubric {rubric_id} not found in RUBRICS store")
            except Exception as e:
                logger.warning(f"Could not load rubric {rubric_id}: {str(e)}")
                # Will fall back to default rubric
        
        # Create grading results directory at top level for easy access
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        grading_job_id = str(uuid.uuid4())
        
        # Create top-level folder for this grading attempt
        base_results_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "grading_results")
        attempt_folder_name = f"grading_attempt_{timestamp}_{grading_job_id[:8]}"
        output_dir = os.path.join(base_results_dir, attempt_folder_name)
        
        # Create subdirectories for organized storage
        submissions_dir = os.path.join(output_dir, "submissions")
        downloads_dir = os.path.join(output_dir, "downloaded_files")
        results_dir = os.path.join(output_dir, "results")
        logs_dir = os.path.join(output_dir, "logs")
        metadata_dir = os.path.join(output_dir, "metadata")
        
        os.makedirs(submissions_dir, exist_ok=True)
        os.makedirs(downloads_dir, exist_ok=True)
        os.makedirs(results_dir, exist_ok=True)
        os.makedirs(logs_dir, exist_ok=True)
        os.makedirs(metadata_dir, exist_ok=True)
        
        # Initialize grading service
        grading_service = GradingService(api_key=settings.gemini_api_key)
        file_preprocessor = FilePreprocessor()
        
        # Filter submissions to include ALL selected ones, not just synced ones
        selected_submissions = []
        for submission_data in sync_summary["submissions"]:
            if submission_data.get("user_id") in selected_user_ids:
                selected_submissions.append(submission_data)
        
        if not selected_submissions:
            return {
                "status": "error",
                "message": "No valid submissions found for the selected users"
            }
        
        logger.info(f"Found {len(selected_submissions)} valid submissions to grade")
        
        # Grade selected submissions (simplified sequential processing for now)
        grading_results = []
        
        for idx, submission_data in enumerate(selected_submissions):
            try:
                user_id = submission_data.get("user_id")
                user_name = submission_data.get("user_name")
                downloaded_files = submission_data.get("downloaded_files", [])
                
                logger.info(f"Processing submission {idx + 1}/{len(selected_submissions)} for user {user_id}")
                
                if not downloaded_files:
                    # Determine rubric name for display
                    rubric_name = "default"
                    if rubric_id and rubric_id in RUBRICS:
                        rubric_name = f"{RUBRICS[rubric_id].name} (ID: {rubric_id})"
                    elif rubric_id:
                        rubric_name = f"Custom (ID: {rubric_id})"
                    
                    # Get total points for proper display
                    total_points = 100  # default
                    if rubric:
                        total_points = rubric.get("total_points", 100)
                    
                    # Check submission status to provide better feedback
                    workflow_state = submission_data.get("workflow_state", "unknown")
                    sync_status = submission_data.get("sync_status", "unknown")
                    
                    # Determine appropriate feedback based on submission state
                    if workflow_state == "unsubmitted":
                        feedback = "Student has not submitted any work for this assignment"
                        status = "not_submitted"
                    elif workflow_state == "graded" and submission_data.get("score") is not None:
                        # Already graded submission - maintain existing grade if available
                        existing_score = submission_data.get("score", 0)
                        existing_grade = submission_data.get("grade", "0")
                        feedback = f"Previously graded submission (Canvas grade: {existing_grade}). No new files to grade."
                        status = "previously_graded"
                        # Try to maintain existing score if reasonable
                        if existing_score and existing_score > 0:
                            # Convert existing score to percentage if possible
                            percentage = min(100, (existing_score / total_points) * 100) if total_points > 0 else 0
                        else:
                            percentage = 0.0
                    elif sync_status == "no_files":
                        feedback = "Submission exists but contains no file attachments to grade"
                        status = "no_files"
                        percentage = 0.0
                    else:
                        feedback = "No readable files available for AI grading"
                        status = "no_readable_files"
                        percentage = 0.0
                    
                    grading_results.append({
                        "user_id": user_id,
                        "user_name": user_name,
                        "status": status,
                        "raw_score": int(percentage * total_points / 100) if 'percentage' in locals() else 0,
                        "total_points": total_points,
                        "percentage": percentage if 'percentage' in locals() else 0.0,
                        "grade": percentage if 'percentage' in locals() else 0.0,
                        "score_display": f"{int(percentage * total_points / 100) if 'percentage' in locals() else 0}/{total_points}",
                        "percentage_display": f"{percentage if 'percentage' in locals() else 0.0:.1f}%",
                        "feedback": feedback,
                        "files_processed": 0,
                        "rubric_used": rubric_name,
                        "workflow_state": workflow_state,
                        "sync_status": sync_status
                    })
                    continue
                
                # Extract text from downloaded files
                submission_texts = []
                for file_path in downloaded_files:
                    try:
                        logger.info(f"Extracting text from {file_path}")
                        if file_path.lower().endswith('.pdf'):
                            extracted_text = extract_text_from_pdf(file_path)
                        else:
                            extracted_text = file_preprocessor.extract_text_from_file(file_path)
                        
                        if extracted_text and extracted_text.strip():
                            submission_texts.append({
                                "file_name": os.path.basename(file_path),
                                "content": extracted_text.strip()
                            })
                            logger.info(f"Successfully extracted {len(extracted_text)} characters from {os.path.basename(file_path)}")
                    except Exception as e:
                        logger.error(f"Error extracting text from {file_path}: {str(e)}")
                
                if submission_texts:
                    # Combine all file contents
                    combined_content = "\n\n".join([
                        f"File: {item['file_name']}\n{item['content']}" 
                        for item in submission_texts
                    ])
                    
                    logger.info(f"Combined content length: {len(combined_content)} characters")
                    
                    # Use provided rubric or create default
                    if rubric:
                        grading_rubric = rubric
                        logger.info(f"Using custom rubric with {len(rubric['criteria'])} criteria, total points: {rubric.get('total_points', 'unknown')}")
                    else:
                        grading_rubric = {
                            "criteria": [
                                {
                                    "name": "Technical Accuracy",
                                    "max_points": 40,
                                    "description": "Correctness of concepts and calculations"
                                },
                                {
                                    "name": "Problem Analysis", 
                                    "max_points": 25,
                                    "description": "Understanding and approach to solving"
                                },
                                {
                                    "name": "Completeness",
                                    "max_points": 20,
                                    "description": "All parts of assignment addressed"
                                },
                                {
                                    "name": "Clarity and Organization",
                                    "max_points": 15,
                                    "description": "Clear explanations and organization"
                                }
                            ],
                            "total_points": 100
                        }
                        logger.info("Using default rubric with 4 criteria, total points: 100")
                    
                    logger.info(f"Starting AI grading for user {user_id}")
                    
                    # Grade using the grading service
                    grade_result = grading_service.grade_submission(
                        submission_text=combined_content,
                        question_text="Assignment submission - Please analyze and evaluate the work",
                        answer_key="Evaluate based on assignment requirements and rubric criteria",
                        student_name=user_name,
                        rubric=grading_rubric,
                        strictness=strictness
                    )
                    
                    raw_score = grade_result.get("score", 0)
                    max_possible = grading_rubric.get("total_points", 100)
                    percentage = (raw_score / max_possible * 100) if max_possible > 0 else 0
                    
                    logger.info(f"Grading completed for user {user_id}, score: {raw_score}/{max_possible} ({percentage:.1f}%)")
                    
                    # Determine rubric name for display
                    rubric_name = "default"
                    if rubric_id and rubric_id in RUBRICS:
                        rubric_name = f"{RUBRICS[rubric_id].name} (ID: {rubric_id})"
                    elif rubric_id:
                        rubric_name = f"Custom (ID: {rubric_id})"
                    
                    grading_results.append({
                        "user_id": user_id,
                        "user_name": user_name,
                        "status": "graded",
                        "raw_score": raw_score,
                        "total_points": max_possible,
                        "percentage": round(percentage, 1),
                        "grade": round(percentage, 1),  # Just the percentage for display
                        "score_display": f"{raw_score}/{max_possible}",
                        "percentage_display": f"{percentage:.1f}%",
                        "feedback": grade_result.get("feedback", ""),
                        "files_processed": len(submission_texts),
                        "rubric_used": rubric_name
                    })
                else:
                    # Determine rubric name for display
                    rubric_name = "default"
                    if rubric_id and rubric_id in RUBRICS:
                        rubric_name = f"{RUBRICS[rubric_id].name} (ID: {rubric_id})"
                    elif rubric_id:
                        rubric_name = f"Custom (ID: {rubric_id})"
                    
                    # Get total points for proper display
                    total_points = grading_rubric.get("total_points", 100)
                    
                    grading_results.append({
                        "user_id": user_id,
                        "user_name": user_name,
                        "status": "no_readable_content",
                        "raw_score": 0,
                        "total_points": total_points,
                        "percentage": 0.0,
                        "grade": 0.0,
                        "score_display": f"0/{total_points}",
                        "percentage_display": "0.0%",
                        "feedback": "No readable content could be extracted from submitted files",
                        "files_processed": 0,
                        "rubric_used": rubric_name
                    })
                    
            except Exception as e:
                logger.error(f"Error grading submission for user {user_id}: {str(e)}")
                
                # Determine rubric name for display
                rubric_name = "default"
                if rubric_id and rubric_id in RUBRICS:
                    rubric_name = f"{RUBRICS[rubric_id].name} (ID: {rubric_id})"
                elif rubric_id:
                    rubric_name = f"Custom (ID: {rubric_id})"
                
                # Get total points for proper display (use rubric if available, otherwise default)
                total_points = 100
                if 'grading_rubric' in locals():
                    total_points = grading_rubric.get("total_points", 100)
                elif rubric:
                    total_points = rubric.get("total_points", 100)
                
                grading_results.append({
                    "user_id": user_id,
                    "user_name": user_name,
                    "status": "error",
                    "raw_score": 0,
                    "total_points": total_points,
                    "percentage": 0.0,
                    "grade": 0.0,
                    "score_display": f"0/{total_points}",
                    "percentage_display": "0.0%",
                    "feedback": f"Error during grading: {str(e)}",
                    "files_processed": 0,
                    "rubric_used": rubric_name
                })
        
        # Save results with the same comprehensive structure as before
        # Determine rubric name for job info
        job_rubric_name = "default"
        if rubric_id and rubric_id in RUBRICS:
            job_rubric_name = f"{RUBRICS[rubric_id].name} (ID: {rubric_id})"
        elif rubric_id:
            job_rubric_name = f"Custom (ID: {rubric_id})"
        
        results_data = {
            "job_info": {
                "grading_job_id": grading_job_id,
                "attempt_folder": attempt_folder_name,
                "sync_job_id": sync_job_id,
                "course_id": sync_summary["course_id"],
                "assignment_id": sync_summary["assignment_id"],
                "graded_at": datetime.now().isoformat(),
                "rubric_used": job_rubric_name,
                "strictness": strictness,
                "selected_students": selected_user_ids
            },
            "summary": {
                "total_selected": len(selected_user_ids),
                "successfully_graded": len([r for r in grading_results if r.get("status") == "graded"]),
                "failed_gradings": len([r for r in grading_results if r.get("status") == "error"]),
                "no_files": len([r for r in grading_results if r.get("status") in ["no_files", "not_submitted", "no_readable_files"]]),
                "previously_graded": len([r for r in grading_results if r.get("status") == "previously_graded"]),
                "no_content": len([r for r in grading_results if r.get("status") == "no_readable_content"]),
                "processed_all": len(grading_results),
                "average_score": None
            },
            "folder_structure": {
                "base_directory": output_dir,
                "submissions": submissions_dir,
                "downloads": downloads_dir,
                "results": results_dir,
                "logs": logs_dir,
                "metadata": metadata_dir
            },
            "context": {
                "canvas_course": sync_summary.get("course_id"),
                "canvas_assignment": sync_summary.get("assignment_id"),
                "sync_timestamp": sync_summary.get("synced_at"),
                "total_submissions_available": sync_summary.get("total_submissions"),
                "sync_success_rate": f"{sync_summary.get('successful_syncs', 0)}/{sync_summary.get('total_submissions', 0)}"
            },
            "results": grading_results
        }
        
        # Calculate summary statistics
        successful_results = [r for r in grading_results if r.get("status") == "graded" and r.get("percentage") is not None and r.get("percentage") != 0]
        if successful_results and len(successful_results) > 0:
            total_percentage = sum(r["percentage"] for r in successful_results)
            average_percentage = total_percentage / len(successful_results)
            results_data["summary"]["average_score"] = round(average_percentage, 1)
            results_data["summary"]["average_raw_score"] = round(sum(r["raw_score"] for r in successful_results) / len(successful_results), 1)
        else:
            results_data["summary"]["average_score"] = 0.0
            results_data["summary"]["average_raw_score"] = 0.0
        
        # Save all the result files
        results_file = os.path.join(results_dir, "grading_results.json")
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, indent=2)
        
        # Save attempt metadata for easy browsing
        attempt_metadata = {
            "folder_name": attempt_folder_name,
            "grading_job_id": grading_job_id,
            "timestamp": timestamp,
            "readable_date": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
            "course_id": sync_summary["course_id"],
            "assignment_id": sync_summary["assignment_id"],
            "ai_graded": len([r for r in grading_results if r.get("status") == "graded"]),
            "status_graded": len([r for r in grading_results if r.get("status") in ["not_submitted", "previously_graded", "no_files", "no_readable_files"]]),
            "total_processed": len(grading_results),
            "total_selected": len(selected_user_ids),
            "rubric_used": job_rubric_name,
            "strictness": strictness,
            "average_percentage": None,
            "average_raw_score": None,
            "rubric_total_points": None,
            "processing_rate": f"{len(grading_results)}/{len(selected_user_ids)}"
        }
        
        if successful_results:
            attempt_metadata["average_percentage"] = round(sum(r["percentage"] for r in successful_results) / len(successful_results), 1)
            attempt_metadata["average_raw_score"] = round(sum(r["raw_score"] for r in successful_results) / len(successful_results), 1)
            # Get rubric total points from first successful result
            attempt_metadata["rubric_total_points"] = successful_results[0].get("total_points", 100)
        
        metadata_file = os.path.join(metadata_dir, "attempt_info.json")
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(attempt_metadata, f, indent=2)
        
        # Save individual student results
        for result in grading_results:
            student_file = os.path.join(submissions_dir, f"student_{result['user_id']}_result.json")
            with open(student_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2)
        
        # Save CSV export
        csv_file = os.path.join(results_dir, "grading_results.csv")
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            import csv
            writer = csv.writer(f)
            writer.writerow([
                "User ID", "User Name", "Status", "Raw Score", "Total Points", 
                "Percentage", "Score Display", "Files Processed", "Rubric Used", "Feedback Preview"
            ])
            
            for result in grading_results:
                feedback_preview = result.get("feedback", "")[:100] + "..." if len(result.get("feedback", "")) > 100 else result.get("feedback", "")
                writer.writerow([
                    result.get("user_id", ""),
                    result.get("user_name", ""),
                    result.get("status", ""),
                    result.get("raw_score", 0),
                    result.get("total_points", 100),
                    result.get("percentage_display", "0.0%"),
                    result.get("score_display", "0/100"),
                    result.get("files_processed", 0),
                    result.get("rubric_used", ""),
                    feedback_preview
                ])
        
        # Create a comprehensive README file for this attempt
        readme_file = os.path.join(output_dir, "README.md")
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(f"# Canvas Grading Attempt\n\n")
            f.write(f"**Folder:** `{attempt_folder_name}`\n")
            f.write(f"**Generated:** {datetime.now().strftime('%B %d, %Y at %I:%M %p')}\n\n")
            
            f.write(f"## Grading Summary\n\n")
            f.write(f"- **Job ID:** {grading_job_id}\n")
            f.write(f"- **Course ID:** {sync_summary['course_id']}\n")
            f.write(f"- **Assignment ID:** {sync_summary['assignment_id']}\n")
            f.write(f"- **Students Selected:** {len(selected_user_ids)}\n")
            f.write(f"- **Successfully Graded:** {len(successful_results)}\n")
            f.write(f"- **Failed/Errors:** {len([r for r in grading_results if r.get('status') == 'error'])}\n")
            f.write(f"- **No Files:** {len([r for r in grading_results if r.get('status') == 'no_files'])}\n")
            f.write(f"- **No Content:** {len([r for r in grading_results if r.get('status') == 'no_readable_content'])}\n")
            f.write(f"- **Rubric Used:** {job_rubric_name}\n")
            f.write(f"- **Strictness:** {strictness} ({int(strictness * 100)}%)\n")
            
            if successful_results:
                avg_percentage = sum(r["percentage"] for r in successful_results) / len(successful_results)
                avg_raw_score = sum(r["raw_score"] for r in successful_results) / len(successful_results)
                rubric_total = successful_results[0].get("total_points", 100)
                f.write(f"- **Rubric Total Points:** {rubric_total}\n")
                f.write(f"- **Average Raw Score:** {avg_raw_score:.1f}/{rubric_total}\n")
                f.write(f"- **Average Percentage:** {avg_percentage:.1f}%\n")
            
            f.write(f"\n## Folder Structure\n\n")
            f.write(f"```\n")
            f.write(f"{attempt_folder_name}/\n")
            f.write(f"├── README.md (this file)\n")
            f.write(f"├── metadata/\n")
            f.write(f"│   └── attempt_info.json (quick summary)\n")
            f.write(f"├── results/\n")
            f.write(f"│   ├── grading_results.json (complete data)\n")
            f.write(f"│   └── grading_results.csv (Excel-ready)\n")
            f.write(f"├── submissions/\n")
            f.write(f"│   └── student_[ID]_result.json (individual results)\n")
            f.write(f"├── downloaded_files/\n")
            f.write(f"│   └── [student files]\n")
            f.write(f"└── logs/\n")
            f.write(f"    └── [processing logs]\n")
            f.write(f"```\n\n")
            
            f.write(f"## Quick Access\n\n")
            f.write(f"- **📊 View in Excel:** Open `results/grading_results.csv`\n")
            f.write(f"- **📋 Complete Data:** View `results/grading_results.json`\n")
            f.write(f"- **👥 Individual Results:** Browse `submissions/` folder\n")
            f.write(f"- **📁 Student Files:** Check `downloaded_files/` folder\n")
            f.write(f"- **ℹ️ Quick Summary:** View `metadata/attempt_info.json`\n\n")
            
            if successful_results:
                f.write(f"## Grade Distribution\n\n")
                grade_ranges = {"A (90-100%)": 0, "B (80-89%)": 0, "C (70-79%)": 0, "D (60-69%)": 0, "F (0-59%)": 0}
                for result in successful_results:
                    percentage = result["percentage"]
                    if percentage >= 90:
                        grade_ranges["A (90-100%)"] += 1
                    elif percentage >= 80:
                        grade_ranges["B (80-89%)"] += 1
                    elif percentage >= 70:
                        grade_ranges["C (70-79%)"] += 1
                    elif percentage >= 60:
                        grade_ranges["D (60-69%)"] += 1
                    else:
                        grade_ranges["F (0-59%)"] += 1
                
                for grade, count in grade_ranges.items():
                    f.write(f"- **{grade}:** {count} students\n")
            
            f.write(f"\n## Context Information\n\n")
            f.write(f"- **Sync Job ID:** {sync_job_id}\n")
            f.write(f"- **Original Sync:** {sync_summary.get('synced_at', 'Unknown')}\n")
            f.write(f"- **Total Available Submissions:** {sync_summary.get('total_submissions', 'Unknown')}\n")
            f.write(f"- **Sync Success Rate:** {sync_summary.get('successful_syncs', 0)}/{sync_summary.get('total_submissions', 0)}\n\n")
            
            f.write(f"---\n")
            f.write(f"*Generated by ScorePAL Canvas Grading System*\n")
        
        # Create a top-level index file for all attempts (if it doesn't exist)
        index_file = os.path.join(base_results_dir, "grading_attempts_index.json")
        attempts_index = []
        
        # Load existing index if it exists
        if os.path.exists(index_file):
            try:
                with open(index_file, 'r', encoding='utf-8') as f:
                    attempts_index = json.load(f)
            except:
                attempts_index = []
        
        # Add this attempt to the index
        attempts_index.append(attempt_metadata)
        
        # Sort by timestamp (newest first)
        attempts_index.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Save updated index
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(attempts_index, f, indent=2)
        
        logger.info(f"Grading completed for {len(selected_user_ids)} selected submissions")
        logger.info(f"Results saved to top-level folder: {attempt_folder_name}")
        
        return {
            "status": "success",
            "message": f"Successfully graded {len(successful_results)} of {len(selected_user_ids)} selected submissions",
            "grading_job_id": grading_job_id,
            "results": grading_results,
            "output_directory": output_dir
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in grade selected submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error grading selected submissions: {str(e)}")

@router.post("/test-file-extraction")
async def test_file_extraction(request: Request):
    """
    Test endpoint to verify file extraction capabilities
    """
    try:
        body = await request.json()
        test_file_path = body.get("file_path")
        
        if not test_file_path:
            return {"status": "error", "message": "file_path is required"}
        
        # Initialize file preprocessor
        file_preprocessor = FilePreprocessor()
        
        # Test extraction
        try:
            if test_file_path.lower().endswith('.pdf'):
                extracted_text = extract_text_from_pdf(test_file_path)
            else:
                extracted_text = file_preprocessor.extract_text_from_file(test_file_path)
            
            return {
                "status": "success",
                "file_path": test_file_path,
                "extracted_length": len(extracted_text) if extracted_text else 0,
                "preview": extracted_text[:500] + "..." if extracted_text and len(extracted_text) > 500 else extracted_text
            }
        except Exception as e:
            return {
                "status": "error",
                "file_path": test_file_path,
                "error": str(e)
            }
    
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def process_submission_chunk(
    chunk_submissions: List[Dict], 
    chunk_id: int,
    canvas_url: str, 
    clean_api_key: str, 
    output_dir: str,
    downloads_dir: str,
    submissions_dir: str,
    results_dir: str,
    grading_service: GradingService,
    file_preprocessor: FilePreprocessor
) -> List[Dict]:
    """
    Process a chunk of submissions in parallel.
    Each worker handles up to 10 submissions.
    """
    logger.info(f"Worker {chunk_id}: Starting to process {len(chunk_submissions)} submissions")
    chunk_results = []
    
    for submission in chunk_submissions:
        try:
            user_id = submission.get("user_id")
            # Handle user information properly
            user_info = submission.get("user", {})
            if hasattr(user_info, 'name'):
                user_name = getattr(user_info, 'name', f"User {user_id}")
            else:
                user_name = user_info.get("name", f"User {user_id}") if isinstance(user_info, dict) else f"User {user_id}"
            
            attachments = submission.get("attachments", [])
            
            if not attachments:
                chunk_results.append({
                    "user_id": user_id,
                    "user_name": user_name,
                    "status": "no_files",
                    "grade": 0,
                    "total_points": 100,
                    "percentage": 0,
                    "deductions": [{"reason": "No files submitted", "points": 100}],
                    "feedback": "No submission files found.",
                    "worker_id": chunk_id
                })
                continue
            
            # Download files for this submission
            submission_texts = []
            downloaded_files = []
            
            for attachment in attachments:
                # Handle Canvas File objects properly - use getattr for objects, get for dicts
                if hasattr(attachment, 'id'):
                    # This is a Canvas File object
                    file_id = getattr(attachment, 'id', None)
                    file_name = getattr(attachment, 'display_name', None) or getattr(attachment, 'filename', 'file')
                    file_uuid = getattr(attachment, 'uuid', None)
                    file_url = getattr(attachment, 'url', None)
                else:
                    # This is a dictionary
                    file_id = attachment.get("id")
                    file_name = attachment.get("display_name", attachment.get("filename", "file"))
                    file_uuid = attachment.get("uuid")
                    file_url = attachment.get("url")
                
                logger.info(f"Worker {chunk_id}: Processing attachment: file_id={file_id}, file_name={file_name}, uuid={file_uuid}")
                
                if file_id:
                    if file_uuid:
                        # Use the existing UUID from Canvas
                        download_url = f"{canvas_url}/files/{file_id}/download?download_frd=1&verifier={file_uuid}"
                    else:
                        # Fallback: try direct URL or generate UUID if needed
                        logger.warning(f"Worker {chunk_id}: No UUID found for attachment {file_id}, trying alternative download")
                        # Try the direct file URL first
                        download_url = file_url
                        if not download_url:
                            # Last resort: generate a UUID
                            fallback_uuid = str(uuid.uuid4()).replace("-", "")[:32]
                            download_url = f"{canvas_url}/files/{file_id}/download?download_frd=1&verifier={fallback_uuid}"
                    
                    # Download the file
                    if download_url:
                        try:
                            headers = {"Authorization": f"Bearer {clean_api_key}"}
                            file_response = requests.get(download_url, headers=headers)
                            
                            if file_response.status_code == 200:
                                # Save file to organized downloads directory
                                safe_filename = re.sub(r'[^\w\-_\.]', '_', file_name)
                                file_path = os.path.join(downloads_dir, f"{user_id}_{safe_filename}")
                                with open(file_path, 'wb') as f:
                                    f.write(file_response.content)
                                
                                downloaded_files.append(file_path)
                                
                                # Extract text from various file types using our preprocessor
                                try:
                                    extracted_text = None
                                    
                                    # Handle different file types
                                    if file_name.lower().endswith(('.pdf',)):
                                        # Extract text from PDF
                                        extracted_text = extract_text_from_pdf(file_path)
                                    elif file_name.lower().endswith(('.docx', '.doc')):
                                        # Extract text from Word documents
                                        extracted_text = file_preprocessor.extract_text_from_file(file_path)
                                    elif file_name.lower().endswith(('.txt', '.md', '.py', '.java', '.cpp', '.c', '.js', '.html', '.css', '.rtf')):
                                        # Handle text-based files
                                        try:
                                            with open(file_path, 'r', encoding='utf-8') as f:
                                                extracted_text = f.read()
                                        except UnicodeDecodeError:
                                            # Try with different encoding
                                            try:
                                                with open(file_path, 'r', encoding='latin-1') as f:
                                                    extracted_text = f.read()
                                            except:
                                                logger.warning(f"Worker {chunk_id}: Could not read text from {file_name}")
                                    elif file_name.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
                                        # Extract text from images using OCR
                                        extracted_text = file_preprocessor.extract_text_from_file(file_path)
                                    else:
                                        # Try generic extraction
                                        extracted_text = file_preprocessor.extract_text_from_file(file_path)
                                    
                                    # Add extracted text if successful
                                    if extracted_text and extracted_text.strip():
                                        submission_texts.append({
                                            "file_name": file_name,
                                            "content": extracted_text.strip()
                                        })
                                        logger.info(f"Worker {chunk_id}: Successfully extracted text from {file_name} ({len(extracted_text)} characters)")
                                    else:
                                        logger.warning(f"Worker {chunk_id}: No text extracted from {file_name}")
                                        
                                except Exception as e:
                                    logger.error(f"Worker {chunk_id}: Error extracting text from {file_name}: {str(e)}")
                                
                                logger.info(f"Worker {chunk_id}: Downloaded file: {file_name} for user {user_id}")
                            else:
                                logger.warning(f"Worker {chunk_id}: Failed to download file {file_id}: {file_response.status_code}")
                                
                        except Exception as e:
                            logger.error(f"Worker {chunk_id}: Error downloading file {file_id}: {str(e)}")
                    else:
                        logger.warning(f"Worker {chunk_id}: No download URL available for attachment {file_id}")
            
            # Grade the submission if we have content
            if submission_texts:
                # Combine all file contents
                combined_content = "\n\n".join([
                    f"File: {item['file_name']}\n{item['content']}" 
                    for item in submission_texts
                ])
                
                # Create a comprehensive grading prompt
                grading_prompt = f"""
                Please grade this student submission for a networking homework assignment.
                
                Submission content:
                {combined_content}
                
                Please provide:
                1. Overall grade out of 100 points
                2. Detailed breakdown of deductions with specific reasons
                3. Constructive feedback
                4. Areas for improvement
                
                Consider the following criteria:
                - Technical accuracy
                - Completeness of solution
                - Code quality (if applicable)
                - Understanding demonstrated
                - Following instructions
                
                Format your response as a structured evaluation with specific point deductions.
                """
                
                # Create a proper rubric for networking assignment
                rubric = {
                    "criteria": [
                        {
                            "name": "Technical Accuracy",
                            "max_points": 40,
                            "description": "Correctness of networking concepts, protocols, and calculations"
                        },
                        {
                            "name": "Problem Analysis",
                            "max_points": 25,
                            "description": "Understanding of the problem and approach to solving it"
                        },
                        {
                            "name": "Completeness",
                            "max_points": 20,
                            "description": "All parts of the assignment are addressed"
                        },
                        {
                            "name": "Clarity and Organization",
                            "max_points": 15,
                            "description": "Clear explanations and well-organized presentation"
                        }
                    ],
                    "total_points": 100
                }
                
                # Grade using the grading service
                grade_result = grading_service.grade_submission(
                    submission_text=combined_content,
                    question_text="Networking homework assignment - Please analyze and solve the given networking problems",
                    answer_key="Evaluate based on correct application of networking concepts, protocols, and problem-solving approach",
                    student_name=user_name,
                    rubric=rubric,
                    strictness=0.5
                )
                
                # Parse the grading result to extract detailed information
                total_score = grade_result.get("score", 0)
                feedback = grade_result.get("feedback", "No feedback provided")
                
                # Extract deductions from feedback (simple parsing)
                deductions = []
                remaining_points = 100 - total_score
                
                if remaining_points > 0:
                    # Try to extract specific deductions from feedback
                    deduction_patterns = [
                        r"(-?\d+)\s*points?\s*(?:deducted|lost|off)?\s*(?:for|due to)?\s*([^.]+)",
                        r"deduct(?:ed|ion)?\s*(-?\d+)\s*points?\s*(?:for|due to)?\s*([^.]+)",
                        r"([^.]+):\s*(-?\d+)\s*points?"
                    ]
                    
                    found_deductions = False
                    for pattern in deduction_patterns:
                        matches = re.findall(pattern, feedback, re.IGNORECASE)
                        for match in matches:
                            if len(match) == 2:
                                try:
                                    points = abs(int(match[0]))
                                    reason = match[1].strip()
                                    deductions.append({
                                        "reason": reason,
                                        "points": points
                                    })
                                    found_deductions = True
                                except ValueError:
                                    continue
                    
                    # If no specific deductions found, create a general one
                    if not found_deductions and remaining_points > 0:
                        deductions.append({
                            "reason": "General deductions based on grading criteria",
                            "points": remaining_points
                        })
                
                chunk_results.append({
                    "user_id": user_id,
                    "user_name": user_name,
                    "status": "graded",
                    "grade": total_score,
                    "total_points": 100,
                    "percentage": total_score,
                    "deductions": deductions,
                    "feedback": feedback,
                    "files_processed": len(submission_texts),
                    "downloaded_files": [os.path.basename(f) for f in downloaded_files],
                    "extracted_content_length": sum(len(item['content']) for item in submission_texts),
                    "processed_file_types": list(set(os.path.splitext(f)[1].lower() for f in downloaded_files)),
                    "worker_id": chunk_id
                })
            else:
                chunk_results.append({
                    "user_id": user_id,
                    "user_name": user_name,
                    "status": "no_readable_content",
                    "grade": 0,
                    "total_points": 100,
                    "percentage": 0,
                    "deductions": [{"reason": "No readable content in submitted files", "points": 100}],
                    "feedback": f"Files were submitted but no readable content could be extracted. Downloaded files: {', '.join([os.path.basename(f) for f in downloaded_files])}",
                    "files_processed": 0,
                    "downloaded_files": [os.path.basename(f) for f in downloaded_files],
                    "extracted_content_length": 0,
                    "processed_file_types": list(set(os.path.splitext(f)[1].lower() for f in downloaded_files)) if downloaded_files else [],
                    "worker_id": chunk_id
                })
                
        except Exception as e:
            logger.error(f"Worker {chunk_id}: Error processing submission for user {submission.get('user_id', 'unknown')}: {str(e)}")
            chunk_results.append({
                "user_id": submission.get("user_id"),
                "user_name": f"User {submission.get('user_id', 'unknown')}",
                "status": "error",
                "grade": 0,
                "total_points": 100,
                "percentage": 0,
                "deductions": [{"reason": f"Processing error: {str(e)}", "points": 100}],
                "feedback": f"An error occurred while processing this submission: {str(e)}",
                "worker_id": chunk_id
            })
    
    logger.info(f"Worker {chunk_id}: Completed processing {len(chunk_results)} submissions")
    return chunk_results 

@router.post("/sync-submissions")
async def sync_submissions(request: Request):
    """
    Sync submissions from Canvas - download and store submission data without grading.
    
    Expected request body: {
        "api_key": "...", 
        "course_id": "...", 
        "assignment_id": "...",
        "force_sync": false (optional - set to true to overwrite existing data)
    }
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        force_sync = body.get("force_sync", False)
        
        if not all([api_key, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="API key, course ID, and assignment ID are required"
            )
        
        # Check for existing sync data unless force_sync is true
        base_sync_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "synced_submissions")
        existing_sync = None
        
        if not force_sync and os.path.exists(base_sync_dir):
            # Look for existing sync data for this course/assignment
            for root, dirs, files in os.walk(base_sync_dir):
                if "sync_summary.json" in files:
                    summary_path = os.path.join(root, "sync_summary.json")
                    try:
                        with open(summary_path, 'r', encoding='utf-8') as f:
                            summary_data = json.load(f)
                            if (summary_data.get("course_id") == course_id and 
                                summary_data.get("assignment_id") == assignment_id):
                                existing_sync = summary_data
                                logger.info(f"Found existing sync data from {summary_data.get('synced_at')}")
                                break
                    except:
                        continue
        
        # If we found existing data and force_sync is False, return the existing data
        if existing_sync and not force_sync:
            return {
                "status": "success",
                "message": f"Using existing sync data from {existing_sync.get('synced_at')}. Use force_sync=true to refresh.",
                "sync_job_id": existing_sync.get("sync_job_id"),
                "sync_directory": existing_sync.get("sync_directory"),
                "summary": existing_sync,
                "is_existing_data": True
            }
        
        # Generate sync job ID
        sync_job_id = str(uuid.uuid4())
        
        # Log if we're overwriting existing data
        if existing_sync and force_sync:
            logger.info(f"Force sync requested - will overwrite existing data from {existing_sync.get('synced_at')}")
        elif not existing_sync:
            logger.info("No existing sync data found - performing fresh sync")
        
        # Create organized output directory structure for sync
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_sync_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "synced_submissions")
        sync_output_dir = os.path.join(base_sync_dir, f"course_{course_id}", f"assignment_{assignment_id}", f"sync_{timestamp}")
        
        # Create subdirectories
        submissions_metadata_dir = os.path.join(sync_output_dir, "submissions_metadata")
        downloads_dir = os.path.join(sync_output_dir, "downloaded_files")
        
        os.makedirs(submissions_metadata_dir, exist_ok=True)
        os.makedirs(downloads_dir, exist_ok=True)
        
        canvas_url = "https://sjsu.instructure.com"
        clean_api_key = api_key.replace("Bearer ", "").strip()
        
        # Create Canvas connector
        canvas = CanvasConnector(canvas_url, clean_api_key)
        
        # Get submissions with attachments
        submissions = canvas.get_submissions(
            course_id=int(course_id), 
            assignment_id=int(assignment_id),
            include=["attachments", "user"]
        )
        
        if not submissions:
            return {
                "status": "error",
                "message": "No submissions found for this assignment"
            }
        
        # Initialize file preprocessor for file downloads
        file_preprocessor = FilePreprocessor()
        
        # Process and download files for each submission
        synced_submissions = []
        
        for submission in submissions:
            try:
                user_id = submission.get("user_id")
                user_info = submission.get("user", {})
                if hasattr(user_info, 'name'):
                    user_name = getattr(user_info, 'name', f"User {user_id}")
                else:
                    user_name = user_info.get("name", f"User {user_id}") if isinstance(user_info, dict) else f"User {user_id}"
                
                attachments = submission.get("attachments", [])
                
                # Create submission metadata
                submission_data = {
                    "user_id": user_id,
                    "user_name": user_name,
                    "submission_id": submission.get("id"),
                    "submitted_at": submission.get("submitted_at"),
                    "workflow_state": submission.get("workflow_state"),
                    "late": submission.get("late", False),
                    "missing": submission.get("missing", False),
                    "score": submission.get("score"),
                    "grade": submission.get("grade"),
                    "attachments": [],
                    "downloaded_files": [],
                    "sync_status": "no_files" if not attachments else "pending"
                }
                
                # Download files if present
                if attachments:
                    for attachment in attachments:
                        # Handle Canvas File objects properly
                        if hasattr(attachment, 'id'):
                            file_id = getattr(attachment, 'id', None)
                            file_name = getattr(attachment, 'display_name', None) or getattr(attachment, 'filename', 'file')
                            file_uuid = getattr(attachment, 'uuid', None)
                            file_url = getattr(attachment, 'url', None)
                        else:
                            file_id = attachment.get("id")
                            file_name = attachment.get("display_name", attachment.get("filename", "file"))
                            file_uuid = attachment.get("uuid")
                            file_url = attachment.get("url")
                        
                        attachment_data = {
                            "id": file_id,
                            "name": file_name,
                            "uuid": file_uuid,
                            "url": file_url,
                            "download_status": "pending"
                        }
                        
                        # Download the file
                        if file_id:
                            try:
                                if file_uuid:
                                    download_url = f"{canvas_url}/files/{file_id}/download?download_frd=1&verifier={file_uuid}"
                                else:
                                    download_url = file_url
                                
                                if download_url:
                                    headers = {"Authorization": f"Bearer {clean_api_key}"}
                                    file_response = requests.get(download_url, headers=headers)
                                    
                                    if file_response.status_code == 200:
                                        # Save file to downloads directory
                                        safe_filename = re.sub(r'[^\w\-_\.]', '_', file_name)
                                        file_path = os.path.join(downloads_dir, f"{user_id}_{safe_filename}")
                                        
                                        with open(file_path, 'wb') as f:
                                            f.write(file_response.content)
                                        
                                        attachment_data["local_path"] = file_path
                                        attachment_data["download_status"] = "success"
                                        submission_data["downloaded_files"].append(file_path)
                                    else:
                                        attachment_data["download_status"] = "failed"
                                        attachment_data["error"] = f"HTTP {file_response.status_code}"
                                        
                            except Exception as e:
                                attachment_data["download_status"] = "failed"
                                attachment_data["error"] = str(e)
                        
                        submission_data["attachments"].append(attachment_data)
                    
                    # Update sync status
                    successful_downloads = len([f for f in submission_data["attachments"] if f["download_status"] == "success"])
                    if successful_downloads > 0:
                        submission_data["sync_status"] = "synced"
                    else:
                        submission_data["sync_status"] = "failed"
                
                # Save individual submission metadata
                submission_file = os.path.join(submissions_metadata_dir, f"submission_{user_id}.json")
                with open(submission_file, 'w', encoding='utf-8') as f:
                    json.dump(submission_data, f, indent=2)
                
                synced_submissions.append(submission_data)
                
                logger.info(f"Synced submission for user {user_id} ({submission_data['sync_status']})")
                
            except Exception as e:
                logger.error(f"Error syncing submission for user {submission.get('user_id', 'unknown')}: {str(e)}")
                # Still add error submission for tracking
                synced_submissions.append({
                    "user_id": submission.get("user_id"),
                    "user_name": f"User {submission.get('user_id', 'unknown')}",
                    "sync_status": "error",
                    "error": str(e)
                })
        
        # Save sync summary
        sync_summary = {
            "sync_job_id": sync_job_id,
            "course_id": course_id,
            "assignment_id": assignment_id,
            "synced_at": datetime.now().isoformat(),
            "total_submissions": len(submissions),
            "successful_syncs": len([s for s in synced_submissions if s.get("sync_status") == "synced"]),
            "failed_syncs": len([s for s in synced_submissions if s.get("sync_status") in ["failed", "error"]]),
            "no_files": len([s for s in synced_submissions if s.get("sync_status") == "no_files"]),
            "sync_directory": sync_output_dir,
            "submissions": synced_submissions
        }
        
        # Save summary file
        summary_file = os.path.join(sync_output_dir, "sync_summary.json")
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(sync_summary, f, indent=2)
        
        logger.info(f"Sync completed: {sync_summary['successful_syncs']}/{sync_summary['total_submissions']} submissions synced successfully")
        
        # Create descriptive message based on sync type
        sync_type = "Force synced" if (existing_sync and force_sync) else "Synced"
        message = f"{sync_type} {sync_summary['successful_syncs']} of {sync_summary['total_submissions']} submissions"
        
        return {
            "status": "success",
            "message": message,
            "sync_job_id": sync_job_id,
            "sync_directory": sync_output_dir,
            "summary": sync_summary,
            "is_existing_data": False,
            "was_forced": force_sync and existing_sync is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in sync submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error syncing submissions: {str(e)}") 

@router.post("/courses/{course_id}/assignments/{assignment_id}/grade")
async def grade_canvas_assignment(
    course_id: int,
    assignment_id: int,
    request: Request,
    background_tasks: BackgroundTasks
):
    """Grade a Canvas assignment using ScorePAL with rubric support."""
    try:
        global canvas_service_global
        
        # First check if Canvas is initialized
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas not initialized. Please initialize with credentials first."
            }
        
        # Get rubric_id, selected_students, and strictness from request body
        rubric_id = "default"
        selected_students = None
        strictness = 0.5  # Default strictness level (moderate)
        try:
            body = await request.json()
            rubric_id = body.get('rubric_id', 'default')
            selected_students = body.get('selected_students', [])
            strictness = float(body.get('strictness', 0.5))  # Accept strictness from request
            # Ensure strictness is within valid range
            strictness = max(0.0, min(1.0, strictness))
        except:
            # If no body or JSON parsing fails, use defaults
            pass
        
        # If students are selected, save the selection first
        if selected_students and len(selected_students) > 0:
            logger.info(f"Saving selection for {len(selected_students)} students: {selected_students}")
            
            # Convert selected_students from strings to integers if needed
            selected_student_ids = []
            for student_id in selected_students:
                try:
                    selected_student_ids.append(int(student_id))
                except (ValueError, TypeError):
                    logger.warning(f"Invalid student ID: {student_id}")
            
            if selected_student_ids:
                logger.info(f"Converted student IDs: {selected_student_ids}")
                # Save to both default submissions directory and job directory
                selection_result = canvas_service_global.select_students_for_grading(
                    course_id, assignment_id, selected_student_ids, "submissions"
                )
                logger.info(f"Selection result: {selection_result}")
                if not selection_result.get('success'):
                    logger.warning(f"Failed to save student selection: {selection_result.get('message')}")
                else:
                    logger.info(f"Successfully saved selection for {len(selected_student_ids)} students")
            else:
                logger.warning("No valid student IDs found in selection")
        else:
            logger.info("No students selected for grading")
        
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Create output directory using directories dictionary
        output_dir = directories["grading_results"] / job_id
        os.makedirs(output_dir, exist_ok=True)
        
        # Store job metadata
        metadata = {
            "id": job_id,
            "type": "canvas_assignment",
            "course_id": course_id,
            "assignment_id": assignment_id,
            "rubric_id": rubric_id,
            "strictness": strictness,
            "status": "queued",
            "created_at": datetime.now().isoformat(),
            "output_dir": str(output_dir)
        }
        
        # Save metadata
        metadata_path = output_dir / "metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        
        # Start the grading task in the background
        # We'll use the actual canvas_service_global instance from the current module
        background_tasks.add_task(
            process_canvas_assignment,
            job_id=job_id,
            course_id=course_id,
            assignment_id=assignment_id,
            rubric_id=rubric_id,
            strictness=strictness,
            output_dir=output_dir
        )
        
        return {
            "status": "success",
            "message": "Grading job started",
            "job_id": job_id
        }
    except Exception as e:
        logger.error(f"Error starting Canvas grading job: {str(e)}")
        return {
            "status": "error",
            "message": f"Error starting Canvas grading job: {str(e)}"
        }

async def process_canvas_assignment(
    job_id: str,
    course_id: int,
    assignment_id: int,
    rubric_id: str,
    strictness: float,
    output_dir: Path
):
    """Process a Canvas assignment in the background with rubric support."""
    try:
        global canvas_service_global
        
        # Update job status (create a simple status update function)
        update_job_status(job_id, "processing", output_dir)
        
        # Process the assignment using the global Canvas service
        if not canvas_service_global:
            update_job_status(job_id, "failed", output_dir, "Canvas service not initialized")
            return
        
        # Try to get assignment and course info, but don't fail if we can't
        assignment_info = {
            "id": assignment_id,
            "name": f"Assignment {assignment_id}",
            "description": "",
            "points_possible": 0
        }
        
        course_info = {
            "id": course_id,
            "name": f"Course {course_id}",
            "course_code": ""
        }
        
        try:
            # Try to get assignment details
            assignment = canvas_service_global.canvas.get_assignment(course_id, assignment_id)
            if assignment:
                assignment_info = {
                    "id": assignment.id,
                    "name": assignment.name,
                    "description": getattr(assignment, "description", ""),
                    "points_possible": getattr(assignment, "points_possible", 0)
                }
        except Exception as assignment_error:
            logger.warning(f"Could not get assignment details: {assignment_error}")
        
        try:
            # Try to get course details
            course = canvas_service_global.canvas.get_course(course_id)
            if course:
                course_info = {
                    "id": course.id,
                    "name": course.name,
                    "course_code": getattr(course, "course_code", "")
                }
        except Exception as course_error:
            logger.warning(f"Could not get course details: {course_error}")
        
        # Load rubric if specified
        rubric = None
        if rubric_id and rubric_id != "default":
            try:
                # Import rubric functionality
                from backend.rubric_api import RUBRICS, load_rubrics_from_disk
                
                # Ensure rubrics are loaded from disk
                if not RUBRICS:
                    load_rubrics_from_disk()
                
                # Get the rubric
                if rubric_id in RUBRICS:
                    rubric_obj = RUBRICS[rubric_id]
                    # Convert to the format expected by the grading service
                    rubric = {
                        "criteria": []
                    }
                    total_points = 0
                    for criterion in rubric_obj.criteria:
                        rubric["criteria"].append({
                            "name": criterion.name,
                            "max_points": criterion.max_points,
                            "description": criterion.description
                        })
                        total_points += criterion.max_points
                    
                    rubric["total_points"] = total_points
                    logger.info(f"Successfully loaded custom rubric '{rubric_obj.name}' with {len(rubric['criteria'])} criteria and {total_points} total points")
                else:
                    logger.warning(f"Rubric {rubric_id} not found, using default rubric")
            except Exception as e:
                logger.warning(f"Could not load rubric {rubric_id}: {str(e)}, using default rubric")
        
        # Process the assignment with rubric
        # First check if there are selected students, if so only grade those
        # Use the global canvas service to maintain agentic capabilities
        canvas_service = canvas_service_global
        
        # Check for selected students - first in default submissions directory
        selection_status = canvas_service.get_selection_status(course_id, assignment_id, "submissions")
        
        if selection_status.get('success') and selection_status.get('selected_students', []):
            selected_students = selection_status.get('selected_students', [])
            selected_student_ids = [student['user_id'] for student in selected_students]
            logger.info(f"Found {len(selected_students)} selected students, grading only those: {selected_student_ids}")
            
            # Create the job directory structure
            job_assignment_path = output_dir / f"course_{course_id}" / f"assignment_{assignment_id}"
            job_submissions_dir = job_assignment_path / "submissions"
            job_batch_dir = job_assignment_path / "batch_results"
            job_metadata_dir = job_assignment_path / "metadata"
            
            job_submissions_dir.mkdir(parents=True, exist_ok=True)
            job_batch_dir.mkdir(parents=True, exist_ok=True)
            job_metadata_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy the selection to the job directory
            job_selected_file = job_batch_dir / "selected_students.json"
            selection_data = {
                'assignment_id': assignment_id,
                'selected_students': selected_students,
                'selection_timestamp': selection_status.get('selection_timestamp'),
                'total_selected': len(selected_students)
            }
            
            with open(job_selected_file, 'w', encoding='utf-8') as f:
                json.dump(selection_data, f, indent=2, default=str)
            
            # Get submissions from Canvas for only the selected students
            logger.info("Fetching submissions for selected students from Canvas...")
            try:
                submissions_data = canvas_service_global.get_submissions_for_assignment(
                    course_id, assignment_id, include=['submission_history', 'submission_comments', 'attachments']
                )
                
                if submissions_data.get('success'):
                    all_submissions = submissions_data.get('submissions', [])
                    
                    # Filter submissions to only selected students
                    selected_submissions = []
                    for submission in all_submissions:
                        if submission.get('user_id') in selected_student_ids:
                            selected_submissions.append(submission)
                    
                    logger.info(f"Found submissions for {len(selected_submissions)} selected students")
                    
                    # Create metadata for each selected student
                    for submission in selected_submissions:
                        user_id = submission.get('user_id')
                        user_name = submission.get('user', {}).get('name', f'User_{user_id}')
                        
                        student_dir = job_submissions_dir / f"student_{user_id}"
                        student_dir.mkdir(exist_ok=True)
                        
                        # Create metadata for the student
                        metadata = {
                            'user_id': user_id,
                            'user_name': user_name,
                            'user_email': submission.get('user', {}).get('email', ''),
                            'submission_type': submission.get('submission_type'),
                            'workflow_state': submission.get('workflow_state'),
                            'score': submission.get('score'),
                            'submitted_at': submission.get('submitted_at'),
                            'files': [],
                            'download_status': 'success'
                        }
                        
                        # Add attachment information
                        attachments = submission.get('attachments', [])
                        for attachment in attachments:
                            metadata['files'].append({
                                'filename': attachment.get('filename'),
                                'url': attachment.get('url'),
                                'content-type': attachment.get('content-type'),
                                'size': attachment.get('size')
                            })
                        
                        # Save metadata
                        metadata_file = student_dir / "metadata.json"
                        with open(metadata_file, 'w', encoding='utf-8') as f:
                            json.dump(metadata, f, indent=2, default=str)
                    
                    # Use the selective grading method with the job directory as base_dir
                    success = True
                    message = "Grading selected students only"
                    results = canvas_service.grade_selected_students_only(
                        course_id, assignment_id, str(output_dir), strictness=strictness
                    )
                    if not results.get('success'):
                        success = False
                        message = results.get('message', 'Failed to grade selected students')
                else:
                    success = False
                    message = f"Failed to fetch submissions: {submissions_data.get('message', 'Unknown error')}"
                    
            except Exception as e:
                logger.error(f"Error fetching submissions for selected students: {e}")
                success = False
                message = f"Error fetching submissions: {str(e)}"
        else:
            logger.info("No students selected, processing all submissions")
            # Use the original method for all submissions
            success, message, results = canvas_service_global.process_assignment(
                course_id, assignment_id, str(output_dir), rubric=rubric, strictness=strictness
            )
        
        # Update job status
        if success:
            update_job_status(job_id, "completed", output_dir, None, assignment_info, course_info)
        else:
            # If no submissions were found, still consider this a "completion" with assignment info
            if "No submissions found" in message:
                update_job_status(job_id, "completed", output_dir, None, assignment_info, course_info)
            else:
                update_job_status(job_id, "failed", output_dir, message, assignment_info, course_info)
        
        logger.info(f"Canvas assignment processing completed: {message}")
    except Exception as e:
        logger.error(f"Error processing Canvas assignment: {e}")
        update_job_status(job_id, "failed", output_dir, str(e))

def update_job_status(job_id: str, status: str, output_dir: Path, error: str = None, assignment_info: dict = None, course_info: dict = None):
    """Update the status of a Canvas grading job."""
    try:
        # Read the existing metadata
        metadata_path = output_dir / "metadata.json"
        if metadata_path.exists():
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        else:
            metadata = {}
        
        # Update the status
        metadata["status"] = status
        
        # Add error if provided
        if error:
            metadata["error"] = error
        
        # Add assignment and course info if provided
        if assignment_info:
            metadata["assignment"] = assignment_info
        
        if course_info:
            metadata["course"] = course_info
        
        # Add timestamp for status change
        if status == "completed" or status == "failed":
            metadata["completed_at"] = datetime.now().isoformat()
        
        # Save the updated metadata
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Error updating job status: {e}")

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a Canvas grading job."""
    try:
        # Find the job directory
        job_dir = directories["grading_results"] / job_id
        
        if not job_dir.exists():
            return {
                "status": "error",
                "message": f"Canvas grading job {job_id} not found"
            }
        
        # Read the metadata file
        metadata_path = job_dir / "metadata.json"
        if not metadata_path.exists():
            return {
                "status": "error",
                "message": f"Canvas grading job metadata not found"
            }
        
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        
        # Check if results are available
        results_path = job_dir / "grading_results.json"
        results_available = results_path.exists()
        
        response = {
            "status": "success",
            "job_id": job_id,
            "job_status": metadata.get("status", "unknown"),
            "type": metadata.get("type", "canvas_assignment"),
            "created_at": metadata.get("created_at", ""),
            "completed_at": metadata.get("completed_at", ""),
            "results_available": results_available
        }
        
        # Include assignment and course info if available
        if "assignment" in metadata:
            response["assignment"] = metadata["assignment"]
        
        if "course" in metadata:
            response["course"] = metadata["course"]
        
        if results_available:
            response["results_url"] = f"/api/canvas/jobs/{job_id}/results"
        
        if "error" in metadata:
            response["error"] = metadata["error"]
        
        return response
    except Exception as e:
        logger.error(f"Error getting Canvas job status: {str(e)}")
        return {
            "status": "error",
            "message": f"Error getting Canvas job status: {str(e)}"
        }

@router.get("/jobs/{job_id}/results")
async def get_job_results(job_id: str):
    """Get the results of a Canvas grading job."""
    try:
        # Find the job directory
        job_dir = directories["grading_results"] / job_id
        
        if not job_dir.exists():
            return {
                "status": "error",
                "message": f"Canvas grading job {job_id} not found"
            }
        
        # Read the results file
        results_path = job_dir / "grading_results.json"
        if not results_path.exists():
            # Read metadata for assignment/course info even if no results
            metadata_path = job_dir / "metadata.json"
            if metadata_path.exists():
                with open(metadata_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                
                # Return a minimal response with assignment/course info
                return {
                    "status": "success",
                    "job_id": job_id,
                    "message": "No grading results available",
                    "assignment": metadata.get("assignment", {}),
                    "course": metadata.get("course", {})
                }
            else:
                return {
                    "status": "error",
                    "message": f"Canvas grading results not found"
                }
        
        with open(results_path, "r", encoding="utf-8") as f:
            results = json.load(f)
        
        return {
            "status": "success",
            "job_id": job_id,
            "results": results
        }
    except Exception as e:
        logger.error(f"Error getting Canvas job results: {str(e)}")
        return {
            "status": "error",
            "message": f"Error getting Canvas job results: {str(e)}"
        }

@router.post("/download-organize-submissions")
async def download_organize_submissions(request: Request):
    """
    Download and organize all submissions for an assignment using the new cloud-ready structure.
    Creates: submissions/course_{course_id}/assignment_{assignment_id}/
    Expected request body: {"api_key": "...", "course_id": "...", "assignment_id": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        
        if not all([api_key, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="API key, course ID, and assignment ID are required"
            )
        
        # Convert to integers
        try:
            course_id = int(course_id)
            assignment_id = int(assignment_id)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Course ID and Assignment ID must be valid integers"
            )
        
        # Use hardcoded SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Initialize Canvas service
        canvas_service = get_canvas_service(api_key, canvas_url)
        
        # Download and organize submissions using new cloud-ready structure
        logger.info(f"Starting cloud-ready download for course {course_id}, assignment {assignment_id}")
        result = canvas_service.download_and_organize_submissions(course_id, assignment_id)
        
        if result['success']:
            logger.info(f"Successfully organized {result['submissions_count']} submissions")
            return {
                "success": True,
                "message": result['message'],
                "data": {
                    "submissions_count": result['submissions_count'],
                    "assignment_directory": result['assignment_directory'],
                    "statistics": result['statistics'],
                    "submissions": result['submissions'],
                    "ready_for_grading": result['ready_for_grading'],
                    "cloud_ready": result['cloud_ready']
                }
            }
        else:
            logger.warning(f"Failed to organize submissions: {result['message']}")
            return {
                "success": False,
                "message": result['message'],
                "data": None
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in download organize submissions endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/prepare-grading-batch")
async def prepare_grading_batch(request: Request):
    """
    Prepare a complete grading batch using the new cloud-ready structure.
    This endpoint creates everything needed for automated grading workflow.
    Expected request body: {"api_key": "...", "course_id": "...", "assignment_id": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        
        if not all([api_key, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="API key, course ID, and assignment ID are required"
            )
        
        # Convert to integers
        try:
            course_id = int(course_id)
            assignment_id = int(assignment_id)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Course ID and Assignment ID must be valid integers"
            )
        
        # Use hardcoded SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Initialize Canvas service
        canvas_service = get_canvas_service(api_key, canvas_url)
        
        # Prepare grading batch
        logger.info(f"Preparing grading batch for course {course_id}, assignment {assignment_id}")
        batch_result = canvas_service.prepare_grading_batch(course_id, assignment_id)
        
        if batch_result.get('success', True) and batch_result.get('grading_ready', False):
            logger.info(f"Successfully prepared grading batch with {len(batch_result.get('student_list', []))} students")
            return {
                "success": True,
                "message": "Grading batch prepared successfully",
                "data": batch_result
            }
        else:
            logger.warning(f"Failed to prepare grading batch: {batch_result.get('message', 'Unknown error')}")
            return {
                "success": False,
                "message": batch_result.get('message', 'Failed to prepare grading batch'),
                "data": batch_result
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in prepare grading batch endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/select-students-for-grading")
async def select_students_for_grading(request: Request):
    """
    Select specific students for grading workflow.
    Expected request body: {"api_key": "...", "course_id": "...", "assignment_id": "...", "student_ids": [123, 456, 789]}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        student_ids = body.get("student_ids", [])
        
        if not all([api_key, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="API key, course ID, and assignment ID are required"
            )
        
        if not student_ids or not isinstance(student_ids, list):
            raise HTTPException(
                status_code=400, 
                detail="student_ids must be a non-empty list of user IDs"
            )
        
        # Convert to integers
        try:
            course_id = int(course_id)
            assignment_id = int(assignment_id)
            student_ids = [int(sid) for sid in student_ids]
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Course ID, Assignment ID, and Student IDs must be valid integers"
            )
        
        # Use hardcoded SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Initialize Canvas service
        canvas_service = get_canvas_service(api_key, canvas_url)
        
        # Select students for grading
        logger.info(f"Selecting {len(student_ids)} students for grading in course {course_id}, assignment {assignment_id}")
        selection_result = canvas_service.select_students_for_grading(course_id, assignment_id, student_ids)
        
        if selection_result['success']:
            logger.info(f"Successfully selected {len(selection_result['selected_students'])} students")
            return {
                "success": True,
                "message": selection_result['message'],
                "data": {
                    "selected_students": selection_result['selected_students'],
                    "selection_file": selection_result['selection_file'],
                    "total_selected": len(selection_result['selected_students'])
                }
            }
        else:
            logger.warning(f"Failed to select students: {selection_result['message']}")
            return {
                "success": False,
                "message": selection_result['message'],
                "data": None
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in select students endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/get-grading-results")
async def get_grading_results(request: Request):
    """
    Get grading results for all students in an assignment.
    Expected request body: {"api_key": "...", "course_id": "...", "assignment_id": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        
        if not all([api_key, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="API key, course ID, and assignment ID are required"
            )
        
        # Convert to integers
        try:
            course_id = int(course_id)
            assignment_id = int(assignment_id)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Course ID and Assignment ID must be valid integers"
            )
        
        # Use hardcoded SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Initialize Canvas service
        canvas_service = get_canvas_service(api_key, canvas_url)
        
        # Get grading results
        logger.info(f"Getting grading results for course {course_id}, assignment {assignment_id}")
        results = canvas_service.get_grading_results(course_id, assignment_id)
        
        if results['success']:
            logger.info(f"Successfully retrieved results for {len(results['results'])} students")
            return {
                "success": True,
                "message": results['message'],
                "data": {
                    "assignment_directory": results['assignment_directory'],
                    "summary": results['summary'],
                    "results": results['results']
                }
            }
        else:
            logger.warning(f"Failed to get grading results: {results['message']}")
            return {
                "success": False,
                "message": results['message'],
                "data": None
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get grading results endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/get-latest-sync")
async def get_assignment_info(request: Request):
    """
    Get information about an assignment from the cloud-ready submissions structure.
    Expected request body: {"api_key": "...", "course_id": "...", "assignment_id": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        
        if not all([api_key, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="API key, course ID, and assignment ID are required"
            )
        
        # Convert to integers
        try:
            course_id = int(course_id)
            assignment_id = int(assignment_id)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Course ID and Assignment ID must be valid integers"
            )
        
        # Check if assignment directory exists
        assignment_path = Path("backend") / "submissions" / f"course_{course_id}" / f"assignment_{assignment_id}"
        
        if not assignment_path.exists():
            return {
                "success": False,
                "message": f"No submissions found for course {course_id}, assignment {assignment_id}",
                "data": None
            }
        
        # Read assignment metadata
        assignment_info = {}
        sync_info = {}
        
        metadata_dir = assignment_path / "metadata"
        if metadata_dir.exists():
            # Read assignment info
            assignment_info_file = metadata_dir / "assignment_info.json"
            if assignment_info_file.exists():
                with open(assignment_info_file, 'r', encoding='utf-8') as f:
                    assignment_info = json.load(f)
            
            # Read sync info
            sync_info_file = metadata_dir / "sync_info.json"
            if sync_info_file.exists():
                with open(sync_info_file, 'r', encoding='utf-8') as f:
                    sync_info = json.load(f)
        
        # Count student directories
        submissions_dir = assignment_path / "submissions"
        student_count = len([d for d in submissions_dir.iterdir() if d.is_dir() and d.name.startswith('student_')]) if submissions_dir.exists() else 0
        
        logger.info(f"Found assignment info: {assignment_path}")
        return {
            "success": True,
            "message": "Assignment information retrieved successfully",
            "data": {
                "assignment_directory": str(assignment_path),
                "assignment_info": assignment_info,
                "sync_info": sync_info,
                "student_count": student_count,
                "structure_version": sync_info.get('structure_version', '2.0'),
                "cloud_ready": sync_info.get('cloud_ready', True)
            }
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get assignment info endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/load-students-with-files")
async def load_students_with_files(request: Request):
    """
    Load all student data with their files for displaying in students list.
    Extracts comprehensive information including files, metadata, and grading status.
    """
    try:
        data = await request.json()
        course_id = data.get('course_id')
        assignment_id = data.get('assignment_id')
        
        if not course_id or not assignment_id:
            return {
                'success': False,
                'message': 'Missing course_id or assignment_id'
            }
        
        # Load student data with files
        result = canvas_service.get_students_list_with_files(
            course_id=course_id,
            assignment_id=assignment_id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error loading students with files: {str(e)}")
        return {
            'success': False,
            'message': f'Error loading students with files: {str(e)}',
            'students': []
        }

@router.post("/grade-selected-students")
async def grade_selected_students(request: Request):
    """
    Grade only the students that have been selected for grading.
    This endpoint processes selected students only, not all students.
    """
    try:
        data = await request.json()
        course_id = data.get('course_id')
        assignment_id = data.get('assignment_id')
        
        if not course_id or not assignment_id:
            return {
                'success': False,
                'message': 'Missing course_id or assignment_id'
            }
        
        # Grade selected students only
        result = canvas_service.grade_selected_students_only(
            course_id=course_id,
            assignment_id=assignment_id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error grading selected students: {str(e)}")
        return {
            'success': False,
            'message': f'Error grading selected students: {str(e)}',
            'graded_students': []
        }

@router.post("/update-student-selection")
async def update_student_selection(request: Request):
    """
    Update student selection (select or deselect students for grading).
    Allows bulk selection/deselection of students.
    """
    try:
        data = await request.json()
        course_id = data.get('course_id')
        assignment_id = data.get('assignment_id')
        student_ids = data.get('student_ids', [])
        action = data.get('action', 'select')  # 'select' or 'deselect'
        
        if not course_id or not assignment_id:
            return {
                'success': False,
                'message': 'Missing course_id or assignment_id'
            }
        
        if not student_ids:
            return {
                'success': False,
                'message': 'No student IDs provided'
            }
        
        if action not in ['select', 'deselect']:
            return {
                'success': False,
                'message': 'Invalid action. Must be "select" or "deselect"'
            }
        
        # Update student selection
        result = canvas_service.update_student_selection(
            course_id=course_id,
            assignment_id=assignment_id,
            student_ids=student_ids,
            action=action
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error updating student selection: {str(e)}")
        return {
            'success': False,
            'message': f'Error updating student selection: {str(e)}',
            'selected_students': []
        }

@router.post("/get-selection-status")
async def get_selection_status(request: Request):
    """
    Get current selection status for an assignment.
    Returns which students are currently selected for grading.
    """
    try:
        data = await request.json()
        course_id = data.get('course_id')
        assignment_id = data.get('assignment_id')
        
        if not course_id or not assignment_id:
            return {
                'success': False,
                'message': 'Missing course_id or assignment_id'
            }
        
        # Get selection information
        result = canvas_service.get_selection_status(
            course_id=course_id,
            assignment_id=assignment_id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting selection status: {str(e)}")
        return {
            'success': False,
            'message': f'Error getting selection status: {str(e)}',
            'selected_students': []
        }

@router.post("/debug-assignments")
async def debug_assignments(request: Request):
    """
    Debug endpoint to test assignment fetching and identify selection issues.
    Expected request body: {"api_key": "...", "course_id": 123}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        
        if not api_key or not course_id:
            raise HTTPException(
                status_code=400, 
                detail="API key and course ID are required"
            )
        
        # Use hardcoded SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Clean up the API key (remove Bearer prefix if present)
        clean_api_key = api_key.replace("Bearer ", "").strip()
        
        # Fetch assignments with debugging
        headers = {"Authorization": f"Bearer {clean_api_key}"}
        url = f"{canvas_url}/api/v1/courses/{course_id}/assignments?per_page=50&page=1"
        
        logger.info(f"DEBUG: Fetching assignments from: {url}")
        
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"DEBUG: Canvas API error: {response.status_code} - {response.text}")
            return {
                "status": "error",
                "message": f"Failed to fetch assignments from Canvas: {response.status_code}",
                "debug_info": {
                    "url": url,
                    "status_code": response.status_code,
                    "response_text": response.text[:500]  # First 500 chars
                }
            }
        
        assignments = response.json()
        
        # Create debug information
        debug_info = {
            "total_assignments": len(assignments),
            "assignments_summary": [],
            "networking_assignments": [],
            "honesty_assignments": []
        }
        
        for assignment in assignments:
            assignment_info = {
                "id": assignment.get('id'),
                "name": assignment.get('name', ''),
                "workflow_state": assignment.get('workflow_state', ''),
                "published": assignment.get('published', False)
            }
            debug_info["assignments_summary"].append(assignment_info)
            
            # Look for networking-related assignments
            name_lower = assignment.get('name', '').lower()
            if 'network' in name_lower or 'hw' in name_lower:
                debug_info["networking_assignments"].append(assignment_info)
            
            # Look for honesty pledge assignments
            if 'honesty' in name_lower or 'pledge' in name_lower:
                debug_info["honesty_assignments"].append(assignment_info)
        
        logger.info(f"DEBUG: Found {len(assignments)} assignments")
        logger.info(f"DEBUG: Networking assignments: {debug_info['networking_assignments']}")
        logger.info(f"DEBUG: Honesty assignments: {debug_info['honesty_assignments']}")
        
        return {
            "status": "success",
            "message": "Debug information retrieved successfully",
            "debug_info": debug_info,
            "raw_assignments": assignments
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DEBUG: Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")

@router.post("/grade-selected-students-with-urls")
async def grade_selected_students_with_urls(request: Request):
    """
    Grade only selected students using Canvas URLs directly.
    Only processes PDF files for now, shows 'updating coming soon' for other types.
    Expected request body: {"api_key": "...", "course_id": "...", "assignment_id": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        api_key = body.get("api_key")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        
        if not all([api_key, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="API key, course ID, and assignment ID are required"
            )
        
        # Convert to integers
        try:
            course_id = int(course_id)
            assignment_id = int(assignment_id)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Course ID and Assignment ID must be valid integers"
            )
        
        # Use hardcoded SJSU Canvas URL
        canvas_url = "https://sjsu.instructure.com"
        
        # Initialize Canvas service
        canvas_service = get_canvas_service(api_key, canvas_url)
        
        # Grade selected students only
        logger.info(f"Starting grading for selected students in course {course_id}, assignment {assignment_id}")
        results = canvas_service.grade_selected_students_only(course_id, assignment_id)
        
        if results['success']:
            logger.info(f"Grading completed: {results.get('message', 'Unknown status')}")
            return {
                "success": True,
                "message": results['message'],
                "data": {
                    "results": results['results'],
                    "summary": results.get('summary', {})
                }
            }
        else:
            logger.warning(f"Grading failed: {results['message']}")
            return {
                "success": False,
                "message": results['message'],
                "data": None
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in grade selected students with URLs endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Agentic Framework Endpoints

@router.get("/workflow-status/{workflow_id}")
async def get_workflow_status(workflow_id: str):
    """Get the status of an agentic workflow."""
    try:
        status = workflow_manager.get_workflow_status(workflow_id)
        return {
            "status": "success",
            "workflow_id": workflow_id,
            "workflow_status": status
        }
    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}")
        return {
            "status": "error",
            "message": f"Error getting workflow status: {str(e)}"
        }

@router.get("/workflows")
async def get_all_workflows():
    """Get all tracked workflows."""
    try:
        workflows = workflow_manager.get_all_workflows()
        return {
            "status": "success",
            "workflows": workflows
        }
    except Exception as e:
        logger.error(f"Error getting workflows: {str(e)}")
        return {
            "status": "error",
            "message": f"Error getting workflows: {str(e)}"
        }

@router.post("/start-agentic-grading")
async def start_agentic_grading(request: Request):
    """Start agentic grading workflow for selected students."""
    try:
        data = await request.json()
        course_id = data.get("course_id")
        assignment_id = data.get("assignment_id")
        
        if not course_id or not assignment_id:
            return {
                "status": "error",
                "message": "Course ID and Assignment ID are required"
            }
        
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas service not initialized"
            }
        
        # Check if using agentic service
        if hasattr(canvas_service_global, 'grade_selected_students_agentic'):
            result = await canvas_service_global.grade_selected_students_agentic(
                course_id=int(course_id),
                assignment_id=int(assignment_id)
            )
            return {
                "status": "success" if result.get('success') else "error",
                "message": result.get('message', ''),
                "results": result.get('results', {})
            }
        else:
            # Fallback to traditional grading
            result = canvas_service_global.grade_selected_students_only(
                course_id=int(course_id),
                assignment_id=int(assignment_id)
            )
            return {
                "status": "success" if result.get('success') else "error",
                "message": result.get('message', ''),
                "results": result.get('results', {})
            }
            
    except Exception as e:
        logger.error(f"Error starting agentic grading: {str(e)}")
        return {
            "status": "error",
            "message": f"Error starting agentic grading: {str(e)}"
        }

@router.post("/initialize-agentic-system")
async def initialize_agentic_system():
    """Initialize the global agentic system."""
    try:
        await initialize_global_agentic_system()
        return {
            "status": "success",
            "message": "Agentic system initialized successfully"
        }
    except Exception as e:
        logger.error(f"Error initializing agentic system: {str(e)}")
        return {
            "status": "error",
            "message": f"Error initializing agentic system: {str(e)}"
        }

@router.post("/shutdown-agentic-system")
async def shutdown_agentic_system():
    """Shutdown the global agentic system."""
    try:
        await shutdown_global_agentic_system()
        return {
            "status": "success",
            "message": "Agentic system shutdown successfully"
        }
    except Exception as e:
        logger.error(f"Error shutting down agentic system: {str(e)}")
        return {
            "status": "error",
            "message": f"Error shutting down agentic system: {str(e)}"
        }