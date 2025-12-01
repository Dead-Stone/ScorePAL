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
GEMINI_GRADING_MODEL = os.getenv("GEMINI_GRADING_MODEL", "gemini-2.0-flash")

from canvas_service import CanvasGradingService
from config import get_settings
from utils.canvas_connector import CanvasConnector
from grading_v2 import GradingService
from preprocessing_v2 import FilePreprocessor, extract_text_from_pdf

# Import rubric functionality directly
from rubric_api import RUBRICS, load_rubrics_from_disk

# Import MongoDB services
from services.results_service import save_grading_result
from services.mongodb_service import get_submissions_collection, get_assignments_collection
from services.analytics_service import compute_assignment_analytics

settings = get_settings()

# Set up logging
logger = logging.getLogger(__name__)

# Create the router with the correct prefix
router = APIRouter()  # No prefix here - it will be added when included in the app

def get_canvas_service() -> CanvasGradingService:
    """Get the Canvas grading service."""
    canvas_api_key = settings.canvas_api_key
    canvas_url = settings.canvas_url
    gemini_api_key = settings.gemini_api_key
    
    return CanvasGradingService(
        canvas_api_key=canvas_api_key,
        canvas_url=canvas_url,
        gemini_api_key=gemini_api_key,
    )

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

@router.post("/get-ta-courses")
async def get_ta_courses(request: Request):
    """
    Get TA courses from Canvas API.
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
        
        # Make direct API call to get TA courses
        headers = {"Authorization": f"Bearer {clean_api_key}"}
        response = requests.get(f"{canvas_url}/api/v1/courses?enrollment_type=ta", headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Canvas API error: {response.status_code} - {response.text}")
            return {
                "status": "error",
                "message": f"Failed to fetch courses from Canvas: {response.status_code}"
            }
        
        courses = response.json()
        
        return {
            "status": "success",
            "courses": courses
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching TA courses: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching TA courses: {str(e)}")

@router.post("/get-assignments")
async def get_assignments(request: Request):
    """
    Get assignments for a specific course from Canvas API.
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
        
        # Make direct API call to get assignments
        headers = {"Authorization": f"Bearer {clean_api_key}"}
        response = requests.get(f"{canvas_url}/api/v1/courses/{course_id}/assignments", headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Canvas API error: {response.status_code} - {response.text}")
            return {
                "status": "error",
                "message": f"Failed to fetch assignments from Canvas: {response.status_code}"
            }
        
        assignments = response.json()
        
        return {
            "status": "success",
            "assignments": assignments
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching assignments: {str(e)}")

@router.post("/get-submissions")
async def get_canvas_submissions(request: Request):
    """
    Get submissions for a Canvas assignment.
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
        
        # Extract canvas URL from the API key or use settings default
        # Assuming SJSU Canvas based on the URL in the screenshot
        canvas_url = "https://sjsu.instructure.com"
        
        # Clean up the API key (remove Bearer prefix if present)
        clean_api_key = api_key.replace("Bearer ", "").strip()
        
        # Create Canvas connector
        canvas = CanvasConnector(canvas_url, clean_api_key)
        
        # Get submissions using the Canvas API
        submissions_url = f"{canvas_url}/api/v1/courses/{course_id}/assignments/{assignment_id}/submissions"
        
        headers = {
            "Authorization": f"Bearer {clean_api_key}",
            "Content-Type": "application/json"
        }
        
        # Add query parameters to include attachments and other data
        params = {
            "include[]": ["submission_comments", "attachments", "user"]
        }
        
        response = requests.get(submissions_url, headers=headers, params=params)
        
        if response.status_code == 200:
            submissions = response.json()
            return {
                "status": "success",
                "submissions": submissions
            }
        else:
            logger.error(f"Canvas API error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Canvas API error: {response.text}"
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
                # Special handling for AI-generated rubric
                if rubric_id == "ai_generated":
                    # Load the AI-generated rubric from the sync summary
                    analysis_file = os.path.join(sync_output_dir, "assignment_analysis", "assignment_analysis.json")
                    if os.path.exists(analysis_file):
                        with open(analysis_file, 'r', encoding='utf-8') as f:
                            analysis_data = json.load(f)
                            ai_rubric = analysis_data.get("content_analysis", {}).get("generated_rubric")
                            if ai_rubric:
                                rubric = ai_rubric
                                logger.info(f"Successfully loaded AI-generated rubric with {rubric.get('total_points', 0)} total points")
                            else:
                                logger.warning("AI-generated rubric not found in analysis data")
                    else:
                        logger.warning("Assignment analysis file not found for AI-generated rubric")
                else:
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
        
        # Filter submissions to only selected ones that were successfully synced
        selected_submissions = []
        for submission_data in sync_summary["submissions"]:
            if (submission_data.get("user_id") in selected_user_ids and 
                submission_data.get("sync_status") == "synced" and 
                submission_data.get("attachments")):  # Check for attachments instead of downloaded_files
                selected_submissions.append(submission_data)
        
        if not selected_submissions:
            # Log debug information
            logger.warning(f"No valid submissions found. Selected user IDs: {selected_user_ids}")
            logger.warning(f"Total submissions in sync: {len(sync_summary.get('submissions', []))}")
            
            # Check what submissions are available
            available_submissions = []
            for submission_data in sync_summary["submissions"]:
                available_submissions.append({
                    "user_id": submission_data.get("user_id"),
                    "sync_status": submission_data.get("sync_status"),
                    "has_attachments": bool(submission_data.get("attachments")),
                    "attachment_count": len(submission_data.get("attachments", []))
                })
            
            logger.warning(f"Available submissions: {available_submissions}")
            
            return {
                "status": "error",
                "message": f"No valid submissions found for the selected users. Available submissions: {len(available_submissions)}",
                "debug": {
                    "selected_user_ids": selected_user_ids,
                    "available_submissions": available_submissions
                }
            }
        
        logger.info(f"Found {len(selected_submissions)} valid submissions to grade")
        
        # Grade selected submissions (download files on-demand)
        grading_results = []
        
        # Get Canvas connection details from sync summary
        canvas_url = "https://sjsu.instructure.com"  # Default Canvas URL
        
        for idx, submission_data in enumerate(selected_submissions):
            try:
                user_id = submission_data.get("user_id")
                user_name = submission_data.get("user_name")
                attachments = submission_data.get("attachments", [])
                
                logger.info(f"Processing submission {idx + 1}/{len(selected_submissions)} for user {user_id}")
                
                if not attachments:
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
                    
                    grading_results.append({
                        "user_id": user_id,
                        "user_name": user_name,
                        "status": "no_files",
                        "raw_score": 0,
                        "total_points": total_points,
                        "percentage": 0.0,
                        "grade": 0.0,
                        "score_display": f"0/{total_points}",
                        "percentage_display": "0.0%",
                        "feedback": "No files available for grading",
                        "files_processed": 0,
                        "rubric_used": rubric_name,
                        "rubric_breakdown": create_default_rubric_result(rubric or {"criteria": []}, "No files submitted").get("rubric_breakdown", []),
                        "submission_content": "No files submitted",
                        "submission_files": []
                    })
                    continue
                
                # Download and extract text from files on-demand with enhanced processing
                submission_texts = []
                files_processed = 0
                download_errors = []
                
                logger.info(f"Processing {len(attachments)} attachments for user {user_id}")
                
                for attachment_idx, attachment in enumerate(attachments):
                    try:
                        file_id = attachment.get("id")
                        file_name = attachment.get("name", f"file_{attachment_idx}")
                        file_uuid = attachment.get("uuid")
                        file_url = attachment.get("url")
                        file_size = attachment.get("size", 0)
                        
                        logger.info(f"Processing attachment {attachment_idx + 1}/{len(attachments)}: {file_name} (ID: {file_id}, Size: {file_size} bytes)")
                        
                        # Skip very large files (> 50MB) to avoid memory issues
                        if file_size > 50 * 1024 * 1024:
                            logger.warning(f"Skipping large file {file_name} ({file_size} bytes)")
                            download_errors.append(f"File {file_name} too large ({file_size} bytes)")
                            continue
                        
                        # Try to download the file with multiple methods
                        downloaded_content = None
                        download_method = None
                        
                        # Method 1: Try direct URL if available
                        if file_url:
                            try:
                                import requests
                                headers = {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                                }
                                response = requests.get(file_url, timeout=60, headers=headers, stream=True)
                                if response.status_code == 200:
                                    downloaded_content = response.content
                                    download_method = "direct_url"
                                    logger.info(f"Downloaded {file_name} via direct URL ({len(downloaded_content)} bytes)")
                                else:
                                    logger.warning(f"Direct URL download failed for {file_name}: HTTP {response.status_code}")
                            except Exception as e:
                                logger.warning(f"Direct URL download failed for {file_name}: {str(e)}")
                        
                        # Method 2: Try alternative URL patterns if available
                        if not downloaded_content and file_id:
                            try:
                                # Try common Canvas file URL patterns
                                alternative_urls = [
                                    f"https://sjsu.instructure.com/files/{file_id}/download",
                                    f"https://sjsu.instructure.com/api/v1/files/{file_id}",
                                ]
                                
                                for alt_url in alternative_urls:
                                    try:
                                        response = requests.get(alt_url, timeout=30, headers=headers)
                                        if response.status_code == 200:
                                            downloaded_content = response.content
                                            download_method = "alternative_url"
                                            logger.info(f"Downloaded {file_name} via alternative URL ({len(downloaded_content)} bytes)")
                                            break
                                    except:
                                        continue
                            except Exception as e:
                                logger.warning(f"Alternative URL download failed for {file_name}: {str(e)}")
                        
                        if downloaded_content:
                            # Create unique filename to avoid conflicts
                            safe_file_name = "".join(c for c in file_name if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
                            temp_file_path = os.path.join(downloads_dir, f"{user_id}_{attachment_idx}_{safe_file_name}")
                            
                            try:
                                # Save file temporarily for text extraction
                                with open(temp_file_path, 'wb') as f:
                                    f.write(downloaded_content)
                                
                                logger.info(f"Saved {file_name} to {temp_file_path} for text extraction")
                                
                                # Extract text from the downloaded file using enhanced methods
                                extracted_text = None
                                extraction_method = None
                                
                                try:
                                    file_extension = file_name.lower().split('.')[-1] if '.' in file_name else 'unknown'
                                    
                                    if file_extension == 'pdf':
                                        extracted_text = extract_text_from_pdf(temp_file_path)
                                        extraction_method = "enhanced_pdf_extraction"
                                    elif file_extension in ['docx', 'doc']:
                                        extracted_text = file_preprocessor.extract_text_from_file(temp_file_path)
                                        extraction_method = "docx_extraction"
                                    elif file_extension in ['txt', 'md']:
                                        with open(temp_file_path, 'r', encoding='utf-8', errors='replace') as f:
                                            extracted_text = f.read()
                                        extraction_method = "text_file_read"
                                    elif file_extension in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
                                        extracted_text = file_preprocessor.extract_text_from_file(temp_file_path)
                                        extraction_method = "ocr_extraction"
                                    else:
                                        # Try general file preprocessor
                                        extracted_text = file_preprocessor.extract_text_from_file(temp_file_path)
                                        extraction_method = "general_extraction"
                                    
                                    if extracted_text and extracted_text.strip():
                                        # Clean and validate extracted text
                                        cleaned_text = extracted_text.strip()
                                        
                                        # Skip very short extractions that are likely errors
                                        if len(cleaned_text) < 10:
                                            logger.warning(f"Extracted text too short from {file_name}: '{cleaned_text[:50]}'")
                                            download_errors.append(f"File {file_name}: extracted text too short")
                                        else:
                                            submission_texts.append({
                                                "file_name": file_name,
                                                "content": cleaned_text,
                                                "file_size": len(downloaded_content),
                                                "extraction_method": extraction_method,
                                                "download_method": download_method,
                                                "text_length": len(cleaned_text)
                                            })
                                            files_processed += 1
                                            logger.info(f"Successfully extracted {len(cleaned_text)} characters from {file_name} using {extraction_method}")
                                    else:
                                        logger.warning(f"No text content extracted from {file_name}")
                                        download_errors.append(f"File {file_name}: no readable content")
                                        
                                except Exception as e:
                                    logger.error(f"Error extracting text from {file_name}: {str(e)}")
                                    download_errors.append(f"File {file_name}: extraction error - {str(e)}")
                                
                                # Clean up temporary file
                                try:
                                    os.remove(temp_file_path)
                                    logger.debug(f"Cleaned up temporary file: {temp_file_path}")
                                except Exception as cleanup_error:
                                    logger.warning(f"Could not clean up temporary file {temp_file_path}: {cleanup_error}")
                                    
                            except Exception as e:
                                logger.error(f"Error saving/processing downloaded file {file_name}: {str(e)}")
                                download_errors.append(f"File {file_name}: processing error - {str(e)}")
                        else:
                            logger.warning(f"Could not download file: {file_name}")
                            download_errors.append(f"File {file_name}: download failed")
                            
                    except Exception as e:
                        logger.error(f"Error processing attachment {attachment}: {str(e)}")
                        download_errors.append(f"Attachment processing error: {str(e)}")
                
                # Log summary of file processing
                logger.info(f"File processing summary for user {user_id}: {files_processed}/{len(attachments)} files successfully processed")
                if download_errors:
                    logger.warning(f"Download/extraction errors for user {user_id}: {download_errors}")
                
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
                        logger.info(f"Using custom rubric with {len(rubric.get('criteria', []))} criteria, total points: {rubric.get('total_points', 'unknown')}")
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
                    
                    # Grade using strict rubric-based evaluation
                    grade_result = await grade_submission_with_strict_rubric(
                        submission_text=combined_content,
                        submission_files=submission_texts,
                        rubric=grading_rubric,
                        student_name=user_name,
                        strictness=strictness
                    )
                    
                    raw_score = grade_result.get("total_score", 0)
                    max_possible = grading_rubric.get("total_points", 100)
                    percentage = (raw_score / max_possible * 100) if max_possible > 0 else 0
                    
                    logger.info(f"Strict rubric grading completed for user {user_id}, score: {raw_score}/{max_possible} ({percentage:.1f}%)")
                    
                    # Determine rubric name for display
                    rubric_name = "default"
                    if rubric_id and rubric_id in RUBRICS:
                        rubric_name = f"{RUBRICS[rubric_id].name} (ID: {rubric_id})"
                    elif rubric_id == "ai_generated":
                        rubric_name = "AI Generated Rubric"
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
                        "feedback": grade_result.get("overall_feedback", ""),
                        "files_processed": files_processed,
                        "total_attachments": len(attachments),
                        "download_errors": download_errors if download_errors else None,
                        "rubric_used": rubric_name,
                        "rubric_breakdown": grade_result.get("rubric_breakdown", []),
                        "submission_content": combined_content[:2000] + "..." if len(combined_content) > 2000 else combined_content,
                        "submission_files": [
                            {
                                "name": f["file_name"], 
                                "preview": f["content"][:500] + "..." if len(f["content"]) > 500 else f["content"],
                                "file_size": f.get("file_size", 0),
                                "text_length": f.get("text_length", 0),
                                "extraction_method": f.get("extraction_method", "unknown"),
                                "download_method": f.get("download_method", "unknown")
                            } for f in submission_texts
                        ],
                        "processing_summary": {
                            "total_files": len(attachments),
                            "successfully_processed": files_processed,
                            "failed_files": len(download_errors) if download_errors else 0,
                            "total_text_extracted": sum(f.get("text_length", 0) for f in submission_texts),
                            "extraction_methods_used": list(set(f.get("extraction_method", "unknown") for f in submission_texts))
                        }
                    })
                else:
                    # No readable content found
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
                        "feedback": f"No readable content could be extracted from {len(attachments)} submitted file(s). Errors: {'; '.join(download_errors[:3]) if download_errors else 'Unknown extraction issues'}",
                        "files_processed": files_processed,
                        "total_attachments": len(attachments),
                        "download_errors": download_errors if download_errors else None,
                        "rubric_used": rubric_name,
                        "rubric_breakdown": create_default_rubric_result(rubric or {"criteria": []}, "No readable content").get("rubric_breakdown", []),
                        "submission_content": f"Files submitted but no readable content extracted from {len(attachments)} file(s)",
                        "submission_files": [
                            {
                                "name": att.get("name", "Unknown"), 
                                "preview": "Content could not be extracted",
                                "file_size": att.get("size", 0),
                                "text_length": 0,
                                "extraction_method": "failed",
                                "download_method": "failed"
                            } for att in attachments[:3]
                        ],
                        "processing_summary": {
                            "total_files": len(attachments),
                            "successfully_processed": files_processed,
                            "failed_files": len(download_errors) if download_errors else len(attachments),
                            "total_text_extracted": 0,
                            "extraction_methods_used": ["failed"]
                        }
                    })
                    
            except Exception as e:
                logger.error(f"Error grading submission for user {user_id}: {str(e)}")
                
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
                
                grading_results.append({
                    "user_id": user_id,
                    "user_name": submission_data.get("user_name", f"User {user_id}"),
                    "status": "error",
                    "raw_score": 0,
                    "total_points": total_points,
                    "percentage": 0.0,
                    "grade": 0.0,
                    "score_display": f"0/{total_points}",
                    "percentage_display": "0.0%",
                    "feedback": f"Error processing submission: {str(e)}",
                    "files_processed": 0,
                    "rubric_used": rubric_name,
                    "rubric_breakdown": create_default_rubric_result(rubric or {"criteria": []}, f"Processing error: {str(e)}").get("rubric_breakdown", []),
                    "submission_content": "Error occurred during processing",
                    "submission_files": []
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
                "no_files": len([r for r in grading_results if r.get("status") == "no_files"]),
                "no_content": len([r for r in grading_results if r.get("status") == "no_readable_content"]),
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
            "students_graded": len([r for r in grading_results if r.get("status") == "graded"]),
            "total_selected": len(selected_user_ids),
            "rubric_used": job_rubric_name,
            "strictness": strictness,
            "average_percentage": None,
            "average_raw_score": None,
            "rubric_total_points": None,
            "success_rate": f"{len([r for r in grading_results if r.get('status') == 'graded'])}/{len(selected_user_ids)}"
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
        
        # Save results to MongoDB for analytics and persistence
        assignment_id = f"canvas_{sync_summary['course_id']}_{sync_summary['assignment_id']}"
        saved_result_ids = []
        
        try:
            for result in grading_results:
                if result.get("status") == "graded":
                    try:
                        # Create or find submission record
                        submissions_collection = await get_submissions_collection()
                        existing_submission = await submissions_collection.find_one({
                            "assignment_id": assignment_id,
                            "student_name": result.get("user_name", ""),
                            "canvas_user_id": str(result.get("user_id", ""))
                        })
                        
                        submission_id = None
                        if existing_submission:
                            submission_id = str(existing_submission["_id"])
                        else:
                            # Create new submission record
                            submission_doc = {
                                "assignment_id": assignment_id,
                                "student_name": result.get("user_name", ""),
                                "student_id": None,  # Canvas users may not be in our system
                                "canvas_submission_id": None,
                                "canvas_user_id": str(result.get("user_id", "")),
                                "files": [],
                                "submission_text": result.get("submission_content", ""),
                                "file_count": result.get("files_processed", 0),
                                "submitted_at": datetime.utcnow(),
                                "status": "graded",
                                "metadata": {
                                    "sync_job_id": sync_job_id,
                                    "grading_job_id": grading_job_id,
                                    "canvas_course_id": sync_summary["course_id"],
                                    "canvas_assignment_id": sync_summary["assignment_id"]
                                }
                            }
                            sub_result = await submissions_collection.insert_one(submission_doc)
                            submission_id = str(sub_result.inserted_id)
                        
                        # Transform rubric breakdown to criteria_scores format
                        criteria_scores = []
                        rubric_breakdown = result.get("rubric_breakdown", [])
                        for criterion in rubric_breakdown:
                            criteria_scores.append({
                                "criterion_name": criterion.get("criterion_name", ""),
                                "criterion_description": "",
                                "score": criterion.get("points_awarded", 0),
                                "max_points": criterion.get("max_points", 0),
                                "weight": 1.0,
                                "feedback": criterion.get("feedback", ""),
                                "level": None
                            })
                        
                        # Get grading rubric for saving
                        grading_rubric_to_save = rubric if rubric else {
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
                        
                        # Save grading result to MongoDB
                        result_id = await save_grading_result(
                            result_data={
                                "score": result.get("raw_score", 0),
                                "max_score": result.get("total_points", 100),
                                "percentage": result.get("percentage", 0),
                                "grade_letter": _calculate_grade_letter(result.get("percentage", 0)),
                                "overall_feedback": result.get("feedback", ""),
                                "criteria_scores": criteria_scores,
                                "rubric": grading_rubric_to_save,
                                "rubric_id": rubric_id,
                                "mistakes": [],
                                "submission_text": result.get("submission_content", ""),
                                "ai_model_used": GEMINI_GRADING_MODEL,
                                "strictness": strictness
                            },
                            submission_id=submission_id,
                            assignment_id=assignment_id,
                            student_name=result.get("user_name", ""),
                            grader_id=None,  # Can be added if we track grader
                            grader_name="AI Grader"
                        )
                        saved_result_ids.append(result_id)
                        logger.info(f"Saved Canvas grading result {result_id} to MongoDB")
                    except Exception as e:
                        logger.warning(f"Could not save result for {result.get('user_name')} to MongoDB: {e}")
            
            # Invalidate analytics cache for this assignment to force recomputation
            try:
                from services.mongodb_service import get_analytics_collection
                analytics_collection = await get_analytics_collection()
                await analytics_collection.update_many(
                    {"assignment_id": assignment_id},
                    {"$set": {"is_stale": True}}
                )
                logger.info(f"Invalidated analytics cache for assignment {assignment_id}")
            except Exception as e:
                logger.warning(f"Could not invalidate analytics cache: {e}")
                
        except Exception as e:
            logger.warning(f"Error saving Canvas results to MongoDB: {e}")
        
        return {
            "status": "success",
            "message": f"Successfully graded {len(successful_results)} of {len(selected_user_ids)} selected submissions",
            "grading_job_id": grading_job_id,
            "results": grading_results,
            "output_directory": output_dir,
            "saved_to_mongodb": len(saved_result_ids),
            "mongodb_result_ids": saved_result_ids
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in grade selected submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error grading selected submissions: {str(e)}")


@router.post("/get-assignment-analysis")
async def get_assignment_analysis(request: Request):
    """
    Get assignment analysis data including generated rubric.
    
    Expected request body: {
        "sync_job_id": "...",
        "course_id": "..." (optional),
        "assignment_id": "..." (optional)
    }
    """
    try:
        body = await request.json()
        sync_job_id = body.get("sync_job_id")
        course_id = body.get("course_id")
        assignment_id = body.get("assignment_id")
        
        if not sync_job_id:
            raise HTTPException(status_code=400, detail="Sync job ID is required")
        
        logger.info(f"Looking for assignment analysis for sync job: {sync_job_id}")
        
        # Find the sync directory based on sync_job_id
        base_sync_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "synced_submissions")
        logger.info(f"Base sync directory: {base_sync_dir}")
        logger.info(f"Base sync directory exists: {os.path.exists(base_sync_dir)}")
        
        # Search for the sync job directory by looking in sync_summary.json files
        analysis_file = None
        sync_directory = None
        all_sync_dirs = []
        
        if os.path.exists(base_sync_dir):
            logger.info(f"Scanning sync directory for sync job {sync_job_id}")
            for root, dirs, files in os.walk(base_sync_dir):
                all_sync_dirs.append(root)
                if "sync_summary.json" in files:
                    try:
                        sync_summary_file = os.path.join(root, "sync_summary.json")
                        with open(sync_summary_file, 'r', encoding='utf-8') as f:
                            sync_data = json.load(f)
                            found_sync_id = sync_data.get("sync_job_id")
                            logger.info(f"Found sync summary in {root} with sync_job_id: {found_sync_id}")
                            
                            if found_sync_id == sync_job_id:
                                # Found the correct sync directory
                                sync_directory = root
                                analysis_file = os.path.join(root, "assignment_analysis", "assignment_analysis.json")
                                logger.info(f"Found matching sync directory for job {sync_job_id}: {sync_directory}")
                                logger.info(f"Expected analysis file: {analysis_file}")
                                logger.info(f"Analysis file exists: {os.path.exists(analysis_file)}")
                                break
                    except Exception as e:
                        logger.warning(f"Error reading sync summary file {sync_summary_file}: {str(e)}")
                        continue
        else:
            logger.warning(f"Base sync directory does not exist: {base_sync_dir}")

        if not analysis_file or not os.path.exists(analysis_file):
            # Log available sync jobs for debugging
            available_jobs = []
            sync_dirs_found = []
            
            if os.path.exists(base_sync_dir):
                for root, dirs, files in os.walk(base_sync_dir):
                    sync_dirs_found.append(root)
                    if "sync_summary.json" in files:
                        try:
                            sync_summary_file = os.path.join(root, "sync_summary.json")
                            with open(sync_summary_file, 'r', encoding='utf-8') as f:
                                sync_data = json.load(f)
                                available_jobs.append({
                                    "sync_job_id": sync_data.get("sync_job_id"),
                                    "synced_at": sync_data.get("synced_at"),
                                    "course_id": sync_data.get("course_id"),
                                    "assignment_id": sync_data.get("assignment_id"),
                                    "directory": root
                                })
                        except Exception as e:
                            logger.warning(f"Error reading sync summary from {sync_summary_file}: {str(e)}")
                            continue
            
            logger.warning(f"Assignment analysis not found for sync job {sync_job_id}")
            logger.info(f"Available sync jobs: {available_jobs}")
            logger.info(f"All directories scanned: {sync_dirs_found}")
            
            # Create detailed error message
            error_details = {
                "requested_sync_job_id": sync_job_id,
                "base_sync_dir": base_sync_dir,
                "base_sync_dir_exists": os.path.exists(base_sync_dir),
                "available_jobs_count": len(available_jobs),
                "available_jobs": available_jobs[:5],  # Limit to first 5 for readability
                "directories_scanned": len(sync_dirs_found),
                "expected_analysis_file": analysis_file if analysis_file else "Not determined",
                "analysis_file_exists": os.path.exists(analysis_file) if analysis_file else False
            }
            
            # If we found a sync directory but no analysis file, try to generate it
            if sync_directory and os.path.exists(sync_directory):
                logger.info(f"Sync directory found but no analysis file. Attempting to generate analysis for {sync_job_id}")
                
                # Try to load sync summary to get assignment details
                try:
                    sync_summary_file = os.path.join(sync_directory, "sync_summary.json")
                    with open(sync_summary_file, 'r', encoding='utf-8') as f:
                        sync_data = json.load(f)
                    
                    assignment_details = sync_data.get("assignment_details", {})
                    if assignment_details:
                        logger.info(f"Found assignment details, generating analysis for assignment {assignment_details.get('id')}")
                        
                        # Generate analysis on-demand
                        analysis_result = await analyze_assignment_content(assignment_details)
                        
                        # Generate rubric
                        rubric_result = await generate_assignment_rubric(assignment_details, analysis_result)
                        
                        # Generate answer key
                        answer_key_result = await generate_answer_key_and_tests(assignment_details, analysis_result)
                        
                        # Combine all results
                        complete_analysis = {
                            "assignment_analysis": analysis_result,
                            "generated_rubric": rubric_result,
                            "answer_key": answer_key_result,
                            "generated_at": datetime.now().isoformat(),
                            "generated_on_demand": True
                        }
                        
                        # Save the analysis for future use
                        analysis_dir = os.path.join(sync_directory, "assignment_analysis")
                        os.makedirs(analysis_dir, exist_ok=True)
                        analysis_file = os.path.join(analysis_dir, "assignment_analysis.json")
                        
                        with open(analysis_file, 'w', encoding='utf-8') as f:
                            json.dump(complete_analysis, f, indent=2)
                        
                        logger.info(f"Successfully generated and saved assignment analysis for sync job: {sync_job_id}")
                        
                        return {
                            "status": "success",
                            "sync_job_id": sync_job_id,
                            "sync_directory": sync_directory,
                            "generated_on_demand": True,
                            **complete_analysis
                        }
                    else:
                        logger.warning(f"No assignment details found in sync summary for {sync_job_id}")
                        
                except Exception as e:
                    logger.error(f"Error generating analysis on-demand for {sync_job_id}: {str(e)}")
            
            raise HTTPException(
                status_code=404, 
                detail=f"Assignment analysis not found for sync job {sync_job_id}. Debug info: {error_details}"
            )

        # Load and return the analysis data
        with open(analysis_file, 'r', encoding='utf-8') as f:
            analysis_data = json.load(f)

        logger.info(f"Successfully retrieved assignment analysis for sync job: {sync_job_id}")
        
        return {
            "status": "success",
            "sync_job_id": sync_job_id,
            "sync_directory": sync_directory,
            "generated_on_demand": False,
            **analysis_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving assignment analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving assignment analysis: {str(e)}")


@router.post("/debug-sync-jobs")
async def debug_sync_jobs(request: Request):
    """
    Debug endpoint to list all available sync jobs and their status
    """
    try:
        # Find the sync directory
        base_sync_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "synced_submissions")
        
        debug_info = {
            "base_sync_dir": base_sync_dir,
            "base_sync_dir_exists": os.path.exists(base_sync_dir),
            "available_jobs": [],
            "all_directories": [],
            "errors": []
        }
        
        if os.path.exists(base_sync_dir):
            for root, dirs, files in os.walk(base_sync_dir):
                debug_info["all_directories"].append({
                    "path": root,
                    "files": files,
                    "subdirs": dirs
                })
                
                if "sync_summary.json" in files:
                    try:
                        sync_summary_file = os.path.join(root, "sync_summary.json")
                        with open(sync_summary_file, 'r', encoding='utf-8') as f:
                            sync_data = json.load(f)
                        
                        # Check for assignment analysis
                        analysis_file = os.path.join(root, "assignment_analysis", "assignment_analysis.json")
                        analysis_exists = os.path.exists(analysis_file)
                        
                        debug_info["available_jobs"].append({
                            "sync_job_id": sync_data.get("sync_job_id"),
                            "synced_at": sync_data.get("synced_at"),
                            "course_id": sync_data.get("course_id"),
                            "assignment_id": sync_data.get("assignment_id"),
                            "directory": root,
                            "has_assignment_details": "assignment_details" in sync_data,
                            "analysis_file_exists": analysis_exists,
                            "analysis_file_path": analysis_file
                        })
                    except Exception as e:
                        debug_info["errors"].append({
                            "file": sync_summary_file,
                            "error": str(e)
                        })
        
        return {
            "status": "success",
            **debug_info
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

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
    Enhanced sync submissions from Canvas - download and store submission data with comprehensive assignment analysis.
    
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
        assignment_analysis_dir = os.path.join(sync_output_dir, "assignment_analysis")  # New directory
        
        os.makedirs(submissions_metadata_dir, exist_ok=True)
        os.makedirs(downloads_dir, exist_ok=True)
        os.makedirs(assignment_analysis_dir, exist_ok=True)
        
        canvas_url = "https://sjsu.instructure.com"
        clean_api_key = api_key.replace("Bearer ", "").strip()
        
        # Create Canvas connector
        canvas = CanvasConnector(canvas_url, clean_api_key)
        
        # === ENHANCED: Get comprehensive assignment details ===
        logger.info("Fetching comprehensive assignment details...")
        assignment = canvas.get_assignment(int(course_id), int(assignment_id))
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Extract comprehensive assignment data
        assignment_details = {
            "id": assignment.id,
            "name": assignment.name,
            "description": getattr(assignment, 'description', ''),
            "instructions": getattr(assignment, 'instructions', ''),
            "due_at": getattr(assignment, 'due_at', None),
            "points_possible": getattr(assignment, 'points_possible', 100),
            "submission_types": getattr(assignment, 'submission_types', []),
            "rubric": getattr(assignment, 'rubric', None),
            "workflow_state": getattr(assignment, 'workflow_state', 'published'),
            "created_at": getattr(assignment, 'created_at', None),
            "updated_at": getattr(assignment, 'updated_at', None)
        }
        
        logger.info(f"Assignment details extracted: {assignment.name}")
        
        # === ENHANCED: AI-powered assignment analysis ===
        logger.info("Analyzing assignment content with AI...")
        assignment_analysis = await analyze_assignment_content(assignment_details)
        
        # === ENHANCED: Generate rubric if not provided ===
        if not assignment_details.get("rubric") and assignment_analysis.get("questions"):
            logger.info("Generating assignment-specific rubric...")
            generated_rubric = await generate_assignment_rubric(assignment_details, assignment_analysis)
            assignment_analysis["generated_rubric"] = generated_rubric
        
        # === ENHANCED: Create answer key and test cases ===
        logger.info("Generating answer key and test cases...")
        answer_key_data = await generate_answer_key_and_tests(assignment_details, assignment_analysis)
        
        # Save assignment analysis
        analysis_file = os.path.join(assignment_analysis_dir, "assignment_analysis.json")
        with open(analysis_file, 'w', encoding='utf-8') as f:
            json.dump({
                "assignment_details": assignment_details,
                "content_analysis": assignment_analysis,
                "answer_key_data": answer_key_data,
                "analysis_timestamp": datetime.now().isoformat()
            }, f, indent=2)
        
        logger.info(f"Assignment analysis saved to {analysis_file}")
        
        # Continue with existing submission sync logic...
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
        
        # Process submission metadata only (don't download files during sync)
        synced_submissions = []
        
        logger.info(f"Processing metadata for {len(submissions)} submissions...")
        
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
                    "files_count": len(attachments),
                    "sync_status": "no_files" if not attachments else "synced"
                }
                
                # Only collect attachment metadata (don't download files yet)
                if attachments:
                    for attachment in attachments:
                        # Handle Canvas File objects properly
                        if hasattr(attachment, 'id'):
                            file_id = getattr(attachment, 'id', None)
                            file_name = getattr(attachment, 'display_name', None) or getattr(attachment, 'filename', 'file')
                            file_uuid = getattr(attachment, 'uuid', None)
                            file_url = getattr(attachment, 'url', None)
                            file_size = getattr(attachment, 'size', 0)
                        else:
                            file_id = attachment.get("id")
                            file_name = attachment.get("display_name", attachment.get("filename", "file"))
                            file_uuid = attachment.get("uuid")
                            file_url = attachment.get("url")
                            file_size = attachment.get("size", 0)
                        
                        # Get file extension for type detection
                        file_extension = os.path.splitext(file_name)[1].lower()
                        
                        attachment_data = {
                            "id": file_id,
                            "name": file_name,
                            "uuid": file_uuid,
                            "url": file_url,
                            "size": file_size,
                            "file_type": file_extension,
                            "download_status": "pending",  # Will be downloaded during grading
                            "ocr_capable": file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif', '.webp', '.pdf', '.docx', '.doc']
                        }
                        
                        submission_data["attachments"].append(attachment_data)
                    
                # Save submission metadata to individual file
                submission_metadata_file = os.path.join(submissions_metadata_dir, f"submission_{user_id}.json")
                with open(submission_metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(submission_data, f, indent=2)
                
                synced_submissions.append(submission_data)
                
                logger.info(f"Synced metadata for user {user_id} ({user_name}): {len(attachments)} files")
                
            except Exception as e:
                logger.error(f"Error processing submission for user {submission.get('user_id', 'unknown')}: {str(e)}")
                synced_submissions.append({
                    "user_id": submission.get("user_id"),
                    "user_name": f"User {submission.get('user_id', 'unknown')}",
                    "sync_status": "error",
                    "error": str(e)
                })
        
        # === Calculate file statistics (OCR will happen later during grading) ===
        file_stats = {
            "total_files": 0,
            "ocr_capable_files": 0,
            "image_files": 0,
            "document_files": 0,
            "other_files": 0
        }
        
        for submission in synced_submissions:
            for attachment in submission.get("attachments", []):
                file_stats["total_files"] += 1
                
                if attachment.get("ocr_capable"):
                    file_stats["ocr_capable_files"] += 1
                
                file_type = attachment.get("file_type", "").lower()
                if file_type in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif', '.webp']:
                    file_stats["image_files"] += 1
                elif file_type in ['.pdf', '.docx', '.doc']:
                    file_stats["document_files"] += 1
                else:
                    file_stats["other_files"] += 1

        # === ENHANCED: Create comprehensive sync summary ===
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
            "submissions": synced_submissions,
            
            # === ENHANCED: Assignment analysis data ===
            "assignment_details": assignment_details,
            "assignment_analysis": {
                "questions_found": len(assignment_analysis.get("questions", [])),
                "main_topics": assignment_analysis.get("main_topics", []),
                "question_types": assignment_analysis.get("question_types", []),
                "difficulty_level": assignment_analysis.get("difficulty_level", "medium"),
                "has_generated_rubric": "generated_rubric" in assignment_analysis,
                "has_answer_key": bool(answer_key_data.get("answer_key")),
                "has_test_cases": bool(answer_key_data.get("test_cases"))
            },
            
            # === NEW: File statistics (OCR processing will happen during grading) ===
            "file_statistics": file_stats
        }
        
        # Save summary file
        summary_file = os.path.join(sync_output_dir, "sync_summary.json")
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(sync_summary, f, indent=2)
        
        logger.info(f"Enhanced sync completed: {sync_summary['successful_syncs']}/{sync_summary['total_submissions']} submissions synced successfully")
        
        # Create descriptive message based on sync type
        sync_type = "Force synced" if (existing_sync and force_sync) else "Synced"
        message = f"{sync_type} {sync_summary['successful_syncs']} of {sync_summary['total_submissions']} submissions with comprehensive assignment analysis"
        
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
        logger.error(f"Error in enhanced sync submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error syncing submissions: {str(e)}") 


# === NEW HELPER FUNCTIONS ===

async def analyze_assignment_content(assignment_details: dict) -> dict:
    """Analyze assignment content to extract questions and topics using AI"""
    try:
        description = assignment_details.get("description", "")
        instructions = assignment_details.get("instructions", "")
        
        # Combine description and instructions
        full_content = f"{description}\n\n{instructions}".strip()
        
        if not full_content:
            return {"questions": [], "main_topics": [], "question_types": [], "difficulty_level": "medium"}
        
        # Initialize Gemini model
        import google.generativeai as genai
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel(GEMINI_GRADING_MODEL)
        
        analysis_prompt = f"""
        Analyze the following assignment content and extract key information:
        
        Assignment: {assignment_details.get('name', 'Untitled')}
        Content: {full_content}
        
        Please provide a JSON response with:
        1. "questions": List of specific questions/tasks found in the assignment
        2. "main_topics": List of main topics/subjects covered
        3. "question_types": List of question types (essay, multiple choice, calculation, etc.)
        4. "difficulty_level": Overall difficulty (easy, medium, hard)
        5. "expected_submission_format": What format of submission is expected
        6. "key_concepts": Important concepts students should demonstrate
        
        Output only valid JSON.
        """
        
        response = model.generate_content(analysis_prompt)
        
        # Parse JSON response
        import json
        import re
        json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if json_match:
            analysis_result = json.loads(json_match.group(0))
            return analysis_result
        else:
            logger.warning("Could not parse AI analysis response as JSON")
            return {"questions": [], "main_topics": [], "question_types": [], "difficulty_level": "medium"}
    
    except Exception as e:
        logger.error(f"Error analyzing assignment content: {str(e)}")
        return {"questions": [], "main_topics": [], "question_types": [], "difficulty_level": "medium"}


async def generate_assignment_rubric(assignment_details: dict, assignment_analysis: dict) -> dict:
    """Generate a rubric specific to the assignment using existing rubric generation"""
    try:
        from backend.rubric_generation import get_rubric_from_text
        
        # Create context for rubric generation
        rubric_context = f"""
        Assignment: {assignment_details.get('name', 'Untitled')}
        Points Possible: {assignment_details.get('points_possible', 100)}
        Topics: {', '.join(assignment_analysis.get('main_topics', []))}
        Question Types: {', '.join(assignment_analysis.get('question_types', []))}
        Difficulty: {assignment_analysis.get('difficulty_level', 'medium')}
        """
        
        # Generate rubric using existing function
        rubric = get_rubric_from_text(
            question=assignment_details.get('description', ''),
            rubric_text=rubric_context
        )
        
        # Adjust total points to match assignment
        target_points = assignment_details.get('points_possible', 100)
        if rubric.get('total_points') != target_points:
            # Scale the rubric to match assignment points
            scale_factor = target_points / rubric.get('total_points', 100)
            
            if 'sections' in rubric:
                for section in rubric['sections']:
                    section['max_points'] = int(section['max_points'] * scale_factor)
                    for criterion in section.get('criteria', []):
                        criterion['points'] = int(criterion['points'] * scale_factor)
                        for scale_item in criterion.get('grading_scale', []):
                            scale_item['points'] = int(scale_item['points'] * scale_factor)
            
            rubric['total_points'] = target_points
        
        return rubric
    
    except Exception as e:
        logger.error(f"Error generating assignment rubric: {str(e)}")
        # Return default rubric
        return {
            "total_points": assignment_details.get('points_possible', 100),
            "sections": [
                {
                    "name": "Content Understanding",
                    "max_points": int(assignment_details.get('points_possible', 100) * 0.4),
                    "criteria": [
                        {
                            "name": "Understanding",
                            "points": int(assignment_details.get('points_possible', 100) * 0.4),
                            "description": "Demonstrates understanding of key concepts"
                        }
                    ]
                }
            ]
        }


async def generate_answer_key_and_tests(assignment_details: dict, assignment_analysis: dict) -> dict:
    """Generate answer key and test cases for the assignment"""
    try:
        # Initialize Gemini model for answer key generation
        import google.generativeai as genai
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel(GEMINI_GRADING_MODEL)
        
        # Create comprehensive prompt for answer key generation
        description = assignment_details.get("description", "")
        instructions = assignment_details.get("instructions", "")
        assignment_name = assignment_details.get('name', 'Untitled Assignment')
        
        full_content = f"{description}\n\n{instructions}".strip()
        
        if not full_content:
            return {"answer_key": None, "test_cases": [], "grading_guidelines": []}
        
        answer_key_prompt = f"""
        You are an expert educator creating a comprehensive answer key for the following assignment:

        Assignment Title: {assignment_name}
        Points Possible: {assignment_details.get('points_possible', 100)}
        
        Assignment Content:
        {full_content}
        
        Based on the assignment analysis:
        - Main Topics: {', '.join(assignment_analysis.get('main_topics', []))}
        - Question Types: {', '.join(assignment_analysis.get('question_types', []))}
        - Difficulty Level: {assignment_analysis.get('difficulty_level', 'medium')}
        - Identified Questions: {assignment_analysis.get('questions', [])}
        
        Please create:
        1. A detailed answer key with model responses for each question/task
        2. Key concepts students should demonstrate
        3. Common mistakes to watch for
        4. Grading guidelines for partial credit
        
        Format as clear, structured text that a grader can easily reference.
        """
        
        # Generate answer key
        response = model.generate_content(answer_key_prompt)
        answer_key = response.text.strip()
        
        # Generate test cases and grading guidelines
        test_cases = []
        grading_guidelines = []
        
        # Create test cases based on main topics
        for topic in assignment_analysis.get('main_topics', [])[:5]:  # Limit to 5 topics
            test_cases.append({
                "topic": topic,
                "key_points": f"Student should demonstrate understanding of {topic}",
                "evaluation_criteria": f"Look for correct application of {topic} concepts"
            })
        
        # Create grading guidelines
        grading_guidelines = [
            "Check for understanding of core concepts",
            "Evaluate problem-solving approach",
            "Assess quality of explanations",
            "Look for appropriate use of terminology",
            "Consider completeness of response"
        ]
        
        return {
            "answer_key": answer_key,
            "test_cases": test_cases,
            "grading_guidelines": grading_guidelines
        }
    
    except Exception as e:
        logger.error(f"Error generating answer key and tests: {str(e)}")
        return {
            "answer_key": [],
            "test_cases": [],
            "grading_guidelines": ["Evaluate based on assignment requirements"]
        }


async def grade_submission_with_strict_rubric(
    submission_text: str,
    submission_files: List[Dict],
    rubric: Dict,
    student_name: str = "Student",
    strictness: float = 0.5
) -> Dict:
    """
    Grade a submission strictly based on rubric criteria only.
    Returns detailed breakdown by each rubric criterion.
    """
    try:
        import google.generativeai as genai
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel(GEMINI_GRADING_MODEL)
        
        # Build rubric criteria description
        criteria_descriptions = []
        total_possible_points = 0
        
        for criterion in rubric.get("criteria", []):
            name = criterion.get("name", "Criterion")
            max_points = criterion.get("max_points", 0)
            description = criterion.get("description", "")
            total_possible_points += max_points
            
            criteria_descriptions.append(f"""
Criterion: {name}
Max Points: {max_points}
Description: {description}
""")
        
        criteria_text = "\n".join(criteria_descriptions)
        
        # Create strict rubric-based grading prompt
        strictness_level = "strict" if strictness > 0.7 else "moderate" if strictness > 0.3 else "lenient"
        
        grading_prompt = f"""
You are an expert academic grader. Grade this submission STRICTLY based ONLY on the provided rubric criteria. Do not use any external knowledge or assumptions beyond what is explicitly stated in the rubric.

RUBRIC CRITERIA:
{criteria_text}

TOTAL POSSIBLE POINTS: {total_possible_points}

STUDENT SUBMISSION:
{submission_text}

GRADING INSTRUCTIONS:
1. Evaluate ONLY based on the rubric criteria provided above
2. For each criterion, assign points from 0 to the maximum points for that criterion
3. Use {strictness_level} grading standards
4. Provide specific feedback for each criterion explaining the score
5. Do not award points for content not explicitly covered by the rubric criteria

Please respond with a JSON object in this exact format:
{{
    "rubric_breakdown": [
        {{
            "criterion_name": "Criterion Name",
            "points_awarded": 0,
            "max_points": 0,
            "percentage": 0.0,
            "feedback": "Specific feedback for this criterion",
            "evidence_found": "Quote or describe specific evidence from submission"
        }}
    ],
    "total_score": 0,
    "max_possible": {total_possible_points},
    "overall_percentage": 0.0,
    "overall_feedback": "Overall summary of the grading",
    "rubric_adherence": "How well the submission addresses the rubric criteria"
}}

IMPORTANT: Only award points for content that directly addresses the rubric criteria. Be specific about what evidence you found in the submission for each criterion.
"""

        # Generate grading response
        response = model.generate_content(grading_prompt)
        
        # Parse JSON response
        import json
        import re
        json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if json_match:
            grading_result = json.loads(json_match.group(0))
            
            # Validate and ensure all criteria are included
            rubric_breakdown = grading_result.get("rubric_breakdown", [])
            
            # Ensure we have entries for all rubric criteria
            criteria_names = [c.get("name", "") for c in rubric.get("criteria", [])]
            breakdown_names = [b.get("criterion_name", "") for b in rubric_breakdown]
            
            for criterion in rubric.get("criteria", []):
                criterion_name = criterion.get("name", "")
                if criterion_name not in breakdown_names:
                    # Add missing criterion with 0 points
                    rubric_breakdown.append({
                        "criterion_name": criterion_name,
                        "points_awarded": 0,
                        "max_points": criterion.get("max_points", 0),
                        "percentage": 0.0,
                        "feedback": "No evidence found for this criterion in the submission",
                        "evidence_found": "None identified"
                    })
            
            # Recalculate totals to ensure accuracy
            total_awarded = sum(item.get("points_awarded", 0) for item in rubric_breakdown)
            total_possible = sum(item.get("max_points", 0) for item in rubric_breakdown)
            overall_percentage = (total_awarded / total_possible * 100) if total_possible > 0 else 0
            
            grading_result.update({
                "rubric_breakdown": rubric_breakdown,
                "total_score": total_awarded,
                "max_possible": total_possible,
                "overall_percentage": round(overall_percentage, 1)
            })
            
            return grading_result
        else:
            logger.warning("Could not parse AI grading response as JSON")
            return create_default_rubric_result(rubric, "Error parsing AI response")
    
    except Exception as e:
        logger.error(f"Error in strict rubric grading: {str(e)}")
        return create_default_rubric_result(rubric, f"Grading error: {str(e)}")


def _calculate_grade_letter(percentage: float) -> str:
    """Calculate letter grade from percentage."""
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    else:
        return "F"

def create_default_rubric_result(rubric: Dict, error_message: str) -> Dict:
    """Create a default result when grading fails"""
    rubric_breakdown = []
    total_points = 0
    
    for criterion in rubric.get("criteria", []):
        max_points = criterion.get("max_points", 0)
        total_points += max_points
        rubric_breakdown.append({
            "criterion_name": criterion.get("name", "Criterion"),
            "points_awarded": 0,
            "max_points": max_points,
            "percentage": 0.0,
            "feedback": "Unable to grade due to error",
            "evidence_found": "Error occurred during grading"
        })
    
    return {
        "rubric_breakdown": rubric_breakdown,
        "total_score": 0,
        "max_possible": total_points,
        "overall_percentage": 0.0,
        "overall_feedback": f"Grading failed: {error_message}",
        "rubric_adherence": "Unable to evaluate"
    } 