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

from canvas_service import CanvasGradingService
from config import get_settings
from utils.canvas_connector import CanvasConnector
from grading_v2 import GradingService
from preprocessing_v2 import FilePreprocessor, extract_text_from_pdf

# Import rubric functionality directly
from rubric_api import RUBRICS, load_rubrics_from_disk

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
                submission_data.get("downloaded_files")):
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
                        "rubric_used": rubric_name
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