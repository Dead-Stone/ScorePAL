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

import requests
from fastapi import APIRouter, HTTPException, status, Request, Form, Body, Depends, BackgroundTasks
from pydantic import BaseModel, Field, root_validator, validator

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_settings
from utils.moodle_connector import MoodleConnector
from grading_v2 import GradingService
from preprocessing_v2 import FilePreprocessor, extract_text_from_pdf

# Import rubric functionality directly
from rubric_api import RUBRICS, load_rubrics_from_disk

settings = get_settings()

# Set up logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter()

@router.get("/status")
async def get_moodle_status():
    """
    Get Moodle connection status.
    Returns connection status and any cached connection info.
    """
    try:
        # For now, return basic status - you can enhance this to check actual connection
        return {
            "status": "success",
            "connected": True,  # This should be based on actual connection check
            "message": "Moodle connection status retrieved successfully"
        }
    except Exception as e:
        logger.error(f"Error getting Moodle status: {e}")
        return {
            "status": "error",
            "connected": False,
            "message": f"Error getting Moodle status: {str(e)}"
        }

@router.get("/courses")
async def get_courses():
    """
    Get Moodle courses (simplified endpoint for frontend).
    This should use stored credentials or session-based authentication.
    """
    try:
        # For now, return a basic response - implement proper credential handling later
        return {
            "status": "success",
            "courses": [],  # This should fetch from Moodle using stored credentials
            "message": "Please implement proper Moodle authentication flow"
        }
    except Exception as e:
        logger.error(f"Error getting Moodle courses: {e}")
        return {
            "status": "error",
            "message": f"Error getting Moodle courses: {str(e)}"
        }

@router.get("/courses/{course_id}/assignments")
async def get_course_assignments(course_id: str):
    """
    Get assignments for a specific course (simplified endpoint for frontend).
    This should use stored credentials or session-based authentication.
    """
    try:
        # For now, return a basic response - implement proper credential handling later
        return {
            "status": "success",
            "assignments": [],  # This should fetch from Moodle using stored credentials
            "message": "Please implement proper Moodle authentication flow"
        }
    except Exception as e:
        logger.error(f"Error getting Moodle assignments: {e}")
        return {
            "status": "error",
            "message": f"Error getting Moodle assignments: {str(e)}"
        }

@router.post("/grade")
async def grade_moodle_assignment_simple(request: Request):
    """
    Start grading job for Moodle assignment (simplified endpoint for frontend).
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
        logger.error(f"Error starting Moodle grading: {e}")
        return {
            "status": "error",
            "message": f"Error starting Moodle grading: {str(e)}"
        }

@router.post("/connect")
async def connect_to_moodle(request: Request):
    """
    Connect to Moodle LMS and verify the connection.
    Expected request body: {"moodle_url": "...", "token": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        moodle_url = body.get("moodle_url")
        token = body.get("token")
        
        if not moodle_url or not token:
            raise HTTPException(
                status_code=400, 
                detail="Moodle URL and token are required"
            )
        
        # Clean up the URL and token
        clean_url = moodle_url.rstrip('/')
        clean_token = token.strip()
        
        # Create a Moodle connector and test the connection
        moodle = MoodleConnector(clean_url, clean_token)
        connection_successful = moodle.test_connection()
        
        if connection_successful:
            return {
                "status": "success",
                "message": "Successfully connected to Moodle LMS"
            }
        else:
            return {
                "status": "error",
                "message": "Failed to connect to Moodle LMS. Please check your credentials."
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting to Moodle: {e}")
        raise HTTPException(status_code=500, detail=f"Error connecting to Moodle: {str(e)}")

@router.post("/get-courses")
async def get_moodle_courses(request: Request):
    """
    Get courses from Moodle API.
    Expected request body: {"moodle_url": "...", "token": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        moodle_url = body.get("moodle_url")
        token = body.get("token")
        
        if not moodle_url or not token:
            raise HTTPException(
                status_code=400, 
                detail="Moodle URL and token are required"
            )
        
        # Clean up the URL and token
        clean_url = moodle_url.rstrip('/')
        clean_token = token.strip()
        
        # Create a Moodle connector
        moodle = MoodleConnector(clean_url, clean_token)
        
        # Get all enrolled courses for the user
        all_courses = []
        
        # Make API call to get user courses
        response = moodle.call_function("core_enrol_get_users_courses", {
            'userid': moodle.get_user_id()
        })
        
        if response and 'data' in response:
            all_courses = response['data']
            logger.info(f"Retrieved {len(all_courses)} courses from Moodle")
        
        return {
            "status": "success",
            "courses": all_courses,
            "total_count": len(all_courses)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Moodle courses: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching Moodle courses: {str(e)}")

@router.post("/get-assignments")
async def get_moodle_assignments(request: Request):
    """
    Get assignments for a specific course from Moodle API.
    Expected request body: {"moodle_url": "...", "token": "...", "course_id": 123}
    """
    try:
        # Parse request body
        body = await request.json()
        moodle_url = body.get("moodle_url")
        token = body.get("token")
        course_id = body.get("course_id")
        
        if not moodle_url or not token or not course_id:
            raise HTTPException(
                status_code=400, 
                detail="Moodle URL, token, and course ID are required"
            )
        
        # Clean up parameters
        clean_url = moodle_url.rstrip('/')
        clean_token = token.strip()
        
        # Create a Moodle connector
        moodle = MoodleConnector(clean_url, clean_token)
        
        # Get assignments for the course
        response = moodle.call_function("mod_assign_get_assignments", {
            'courseids': [course_id]
        })
        
        assignments = []
        if response and 'data' in response and 'courses' in response['data']:
            for course in response['data']['courses']:
                if course.get('id') == course_id:
                    assignments = course.get('assignments', [])
                    break
        
        logger.info(f"Retrieved {len(assignments)} assignments for course {course_id}")
        
        return {
            "status": "success",
            "assignments": assignments,
            "total_count": len(assignments)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Moodle assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching Moodle assignments: {str(e)}")

@router.post("/get-submissions")
async def get_moodle_submissions(request: Request):
    """
    Get submissions for a Moodle assignment.
    Expected request body: {"moodle_url": "...", "token": "...", "course_id": "...", "assignment_id": "..."}
    """
    try:
        # Parse request body
        body = await request.json()
        moodle_url = body.get("moodle_url")
        token = body.get("token")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        
        if not all([moodle_url, token, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="Moodle URL, token, course ID, and assignment ID are required"
            )
        
        # Clean up parameters
        clean_url = moodle_url.rstrip('/')
        clean_token = token.strip()
        
        # Create Moodle connector
        moodle = MoodleConnector(clean_url, clean_token)
        
        # Get enrolled users in the course first
        users_response = moodle.call_function("core_enrol_get_enrolled_users", {
            'courseid': course_id
        })
        
        if not users_response or 'data' not in users_response:
            raise HTTPException(status_code=404, detail="No users found in course")
        
        users = users_response['data']
        all_submissions = []
        
        # Get submission status for each user
        for user in users:
            try:
                submission_response = moodle.call_function("mod_assign_get_submission_status", {
                    'assignid': assignment_id,
                    'userid': user['id']
                })
                
                if submission_response and 'data' in submission_response:
                    submission_data = submission_response['data']
                    submission_data['user'] = user  # Add user info
                    all_submissions.append(submission_data)
                    
            except Exception as e:
                logger.warning(f"Error getting submission for user {user['id']}: {str(e)}")
                continue
        
        logger.info(f"Retrieved {len(all_submissions)} submissions for assignment {assignment_id}")
        
        return {
            "status": "success",
            "submissions": all_submissions,
            "total_count": len(all_submissions)
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Moodle submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching Moodle submissions: {str(e)}")

@router.post("/sync-submissions")
async def sync_moodle_submissions(request: Request):
    """
    Sync submissions from Moodle - download and store submission data without grading.
    
    Expected request body: {
        "moodle_url": "...", 
        "token": "...",
        "course_id": "...", 
        "assignment_id": "...",
        "force_sync": false (optional)
    }
    """
    try:
        # Parse request body
        body = await request.json()
        moodle_url = body.get("moodle_url")
        token = body.get("token")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        force_sync = body.get("force_sync", False)
        
        if not all([moodle_url, token, course_id, assignment_id]):
            raise HTTPException(
                status_code=400, 
                detail="Moodle URL, token, course ID, and assignment ID are required"
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
                                summary_data.get("assignment_id") == assignment_id and
                                summary_data.get("platform") == "moodle"):
                                existing_sync = summary_data
                                logger.info(f"Found existing Moodle sync data from {summary_data.get('synced_at')}")
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
        sync_output_dir = os.path.join(base_sync_dir, f"moodle_course_{course_id}", f"assignment_{assignment_id}", f"sync_{timestamp}")
        
        # Create subdirectories
        submissions_metadata_dir = os.path.join(sync_output_dir, "submissions_metadata")
        downloads_dir = os.path.join(sync_output_dir, "downloaded_files")
        
        os.makedirs(submissions_metadata_dir, exist_ok=True)
        os.makedirs(downloads_dir, exist_ok=True)
        
        clean_url = moodle_url.rstrip('/')
        clean_token = token.strip()
        
        # Create Moodle connector
        moodle = MoodleConnector(clean_url, clean_token)
        
        # Get submissions
        submissions_response = await get_moodle_submissions(request)
        if submissions_response['status'] != 'success':
            return submissions_response
        
        submissions = submissions_response['submissions']
        
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
                user_info = submission.get("user", {})
                user_id = user_info.get("id")
                user_name = f"{user_info.get('firstname', '')} {user_info.get('lastname', '')}".strip()
                
                # Create submission metadata
                submission_data = {
                    "user_id": user_id,
                    "user_name": user_name,
                    "platform": "moodle",
                    "submitted_at": None,
                    "grade": None,
                    "status": "no_submission",
                    "attachments": [],
                    "downloaded_files": [],
                    "sync_status": "no_files"
                }
                
                # Check for submission data
                if 'lastattempt' in submission and submission['lastattempt']:
                    attempt = submission['lastattempt']
                    
                    # Check team submission first, then individual submission
                    actual_submission = attempt.get('teamsubmission') or attempt.get('submission')
                    
                    if actual_submission:
                        submission_data.update({
                            "submission_id": actual_submission.get("id"),
                            "submitted_at": actual_submission.get("timemodified"),
                            "status": actual_submission.get("status", "submitted"),
                        })
                        
                        # Process plugins for files
                        plugins = actual_submission.get("plugins", [])
                        for plugin in plugins:
                            if plugin.get("type") == "file":
                                fileareas = plugin.get("fileareas", [])
                                for filearea in fileareas:
                                    if filearea.get("area") == "submission_files":
                                        files = filearea.get("files", [])
                                        for file_info in files:
                                            attachment_data = {
                                                "filename": file_info.get("filename"),
                                                "fileurl": file_info.get("fileurl"),
                                                "filesize": file_info.get("filesize"),
                                                "mimetype": file_info.get("mimetype"),
                                                "download_status": "pending"
                                            }
                                            
                                            # Download the file
                                            try:
                                                if file_info.get("fileurl"):
                                                    file_response = requests.get(file_info["fileurl"])
                                                    
                                                    if file_response.status_code == 200:
                                                        # Save file to downloads directory
                                                        safe_filename = re.sub(r'[^\w\-_\.]', '_', file_info["filename"])
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
                
                # Check for feedback/grades
                if 'feedback' in submission and submission['feedback']:
                    feedback = submission['feedback']
                    if 'grade' in feedback:
                        grade_info = feedback['grade']
                        submission_data["grade"] = grade_info.get("grade")
                
                # Update sync status
                successful_downloads = len([f for f in submission_data["attachments"] if f["download_status"] == "success"])
                if successful_downloads > 0:
                    submission_data["sync_status"] = "synced"
                elif submission_data["attachments"]:
                    submission_data["sync_status"] = "failed"
                else:
                    submission_data["sync_status"] = "no_files"
                
                # Save individual submission metadata
                submission_file = os.path.join(submissions_metadata_dir, f"submission_{user_id}.json")
                with open(submission_file, 'w', encoding='utf-8') as f:
                    json.dump(submission_data, f, indent=2)
                
                synced_submissions.append(submission_data)
                
                logger.info(f"Synced Moodle submission for user {user_id} ({submission_data['sync_status']})")
                
            except Exception as e:
                logger.error(f"Error syncing Moodle submission for user {user_info.get('id', 'unknown')}: {str(e)}")
                # Still add error submission for tracking
                synced_submissions.append({
                    "user_id": user_info.get("id"),
                    "user_name": f"{user_info.get('firstname', '')} {user_info.get('lastname', '')}".strip(),
                    "platform": "moodle",
                    "sync_status": "error",
                    "error": str(e)
                })
        
        # Save sync summary
        sync_summary = {
            "sync_job_id": sync_job_id,
            "platform": "moodle",
            "moodle_url": clean_url,
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
        
        logger.info(f"Moodle sync completed: {sync_summary['successful_syncs']}/{sync_summary['total_submissions']} submissions synced successfully")
        
        # Create descriptive message based on sync type
        sync_type = "Force synced" if (existing_sync and force_sync) else "Synced"
        message = f"{sync_type} {sync_summary['successful_syncs']} of {sync_summary['total_submissions']} Moodle submissions"
        
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
        logger.error(f"Error in sync Moodle submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error syncing Moodle submissions: {str(e)}")

@router.post("/grade-selected-submissions")
async def grade_selected_moodle_submissions(request: Request):
    """
    Grade only selected Moodle submissions with specified rubric.
    Uses the same grading logic as Canvas but for Moodle submissions.
    
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
        
        logger.info(f"Starting grading for {len(selected_user_ids)} selected Moodle submissions")
        
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
                        if (summary_data.get("sync_job_id") == sync_job_id and 
                            summary_data.get("platform") == "moodle"):
                            sync_summary_file = summary_path
                            break
                except:
                    continue
        
        if not sync_summary_file:
            raise HTTPException(status_code=404, detail="Moodle sync job not found")
        
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
        attempt_folder_name = f"moodle_grading_attempt_{timestamp}_{grading_job_id[:8]}"
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
                "message": "No valid Moodle submissions found for the selected users"
            }
        
        logger.info(f"Found {len(selected_submissions)} valid Moodle submissions to grade")
        
        # Grade selected submissions
        grading_results = []
        
        for idx, submission_data in enumerate(selected_submissions):
            try:
                user_id = submission_data.get("user_id")
                user_name = submission_data.get("user_name")
                downloaded_files = submission_data.get("downloaded_files", [])
                
                logger.info(f"Processing Moodle submission {idx + 1}/{len(selected_submissions)} for user {user_id}")
                
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
                    
                    # Check submission status
                    sync_status = submission_data.get("sync_status", "unknown")
                    status = submission_data.get("status", "unknown")
                    
                    # Determine appropriate feedback based on submission state
                    if sync_status == "no_files":
                        feedback = "Moodle submission exists but contains no file attachments to grade"
                        status_type = "no_files"
                    elif sync_status == "error":
                        feedback = "Error occurred while syncing this Moodle submission"
                        status_type = "error"
                    elif status == "draft":
                        feedback = "Student has not submitted their work (still in draft state)"
                        status_type = "not_submitted"
                    else:
                        feedback = "No readable files available for AI grading"
                        status_type = "no_readable_files"
                    
                    grading_results.append({
                        "user_id": user_id,
                        "user_name": user_name,
                        "status": status_type,
                        "raw_score": 0,
                        "total_points": total_points,
                        "percentage": 0.0,
                        "grade": 0.0,
                        "score_display": f"0/{total_points}",
                        "percentage_display": "0.0%",
                        "feedback": feedback,
                        "files_processed": 0,
                        "rubric_used": rubric_name,
                        "platform": "moodle",
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
                    
                    logger.info(f"Starting AI grading for Moodle user {user_id}")
                    
                    # Grade using the grading service
                    grade_result = grading_service.grade_submission(
                        submission_text=combined_content,
                        question_text="Moodle assignment submission - Please analyze and evaluate the work",
                        answer_key="Evaluate based on assignment requirements and rubric criteria",
                        student_name=user_name,
                        rubric=grading_rubric,
                        strictness=strictness
                    )
                    
                    raw_score = grade_result.get("score", 0)
                    max_possible = grading_rubric.get("total_points", 100)
                    percentage = (raw_score / max_possible * 100) if max_possible > 0 else 0
                    
                    logger.info(f"Moodle grading completed for user {user_id}, score: {raw_score}/{max_possible} ({percentage:.1f}%)")
                    
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
                        "grade": round(percentage, 1),
                        "score_display": f"{raw_score}/{max_possible}",
                        "percentage_display": f"{percentage:.1f}%",
                        "feedback": grade_result.get("feedback", ""),
                        "files_processed": len(submission_texts),
                        "rubric_used": rubric_name,
                        "platform": "moodle"
                    })
                else:
                    # Determine rubric name for display
                    rubric_name = "default"
                    if rubric_id and rubric_id in RUBRICS:
                        rubric_name = f"{RUBRICS[rubric_id].name} (ID: {rubric_id})"
                    elif rubric_id:
                        rubric_name = f"Custom (ID: {rubric_id})"
                    
                    # Get total points for proper display
                    total_points = 100
                    if 'grading_rubric' in locals():
                        total_points = grading_rubric.get("total_points", 100)
                    elif rubric:
                        total_points = rubric.get("total_points", 100)
                    
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
                        "rubric_used": rubric_name,
                        "platform": "moodle"
                    })
                    
            except Exception as e:
                logger.error(f"Error grading Moodle submission for user {user_id}: {str(e)}")
                
                # Determine rubric name for display
                rubric_name = "default"
                if rubric_id and rubric_id in RUBRICS:
                    rubric_name = f"{RUBRICS[rubric_id].name} (ID: {rubric_id})"
                elif rubric_id:
                    rubric_name = f"Custom (ID: {rubric_id})"
                
                # Get total points for proper display
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
                    "rubric_used": rubric_name,
                    "platform": "moodle"
                })
        
        # Save results with comprehensive structure
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
                "platform": "moodle",
                "moodle_url": sync_summary.get("moodle_url"),
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
                "moodle_course": sync_summary.get("course_id"),
                "moodle_assignment": sync_summary.get("assignment_id"),
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
            "platform": "moodle",
            "moodle_url": sync_summary.get("moodle_url"),
            "course_id": sync_summary["course_id"],
            "assignment_id": sync_summary["assignment_id"],
            "ai_graded": len([r for r in grading_results if r.get("status") == "graded"]),
            "status_graded": len([r for r in grading_results if r.get("status") in ["not_submitted", "no_files", "no_readable_files"]]),
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
                "Percentage", "Score Display", "Files Processed", "Rubric Used", "Platform", "Feedback Preview"
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
                    result.get("platform", ""),
                    feedback_preview
                ])
        
        logger.info(f"Moodle grading completed for {len(selected_user_ids)} selected submissions")
        logger.info(f"Results saved to top-level folder: {attempt_folder_name}")
        
        return {
            "status": "success",
            "message": f"Successfully graded {len(successful_results)} of {len(selected_user_ids)} selected Moodle submissions",
            "grading_job_id": grading_job_id,
            "results": grading_results,
            "output_directory": output_dir
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in grade selected Moodle submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error grading selected Moodle submissions: {str(e)}") 