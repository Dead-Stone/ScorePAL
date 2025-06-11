"""
API endpoints for ScorePAL.
This module defines the FastAPI routes for the application.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends, Query, APIRouter, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import os
import json
import logging
import shutil
import zipfile
from pathlib import Path
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
import asyncio
import uvicorn
import mimetypes
import tempfile

# Import our existing services
from preprocessing_v2 import FilePreprocessor, extract_text_from_pdf
from grading_v2 import GradingService
from utils.neo4j_connector import Neo4jConnector
from utils.directory_utils import ensure_directory_structure
from rubric_api import router as rubric_router
from canvas_service import CanvasGradingService
from config import get_settings  # Use absolute import
from multi_agent_grading import MultiAgentGradingSystem
from chat_api import router as chat_router

# Try to import our custom canvas routes
try:
    from api.canvas_routes import router as custom_canvas_router
    has_custom_canvas_routes = True
except ImportError:
    has_custom_canvas_routes = False
    logger.warning("Could not import custom canvas routes")

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ScorePAL API",
    description="API for the ScorePAL grading system",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(rubric_router, tags=["rubrics"])

# Import and include the knowledge graph router
from knowledge_graph_api import router as knowledge_graph_router
app.include_router(knowledge_graph_router)

# Include the chat router
app.include_router(chat_router)

# Include our custom canvas routes if available
if has_custom_canvas_routes:
    app.include_router(custom_canvas_router, prefix="/api/canvas", tags=["Canvas"])

# Initialize services
try:
    # Ensure directories exist before initializing services
    directories = ensure_directory_structure()
    logger.info("Directory structure ensured")
    
    file_preprocessor = FilePreprocessor()
    logger.info("FilePreprocessor initialized")
    
    grading_service = GradingService(api_key=os.getenv("GEMINI_API_KEY"))
    logger.info("GradingService initialized")
    
    # Initialize the multi-agent grading system
    multi_agent_grading = MultiAgentGradingSystem()
    logger.info(f"Multi-Agent Grading System initialized with {multi_agent_grading.max_workers} workers")
    
    db = Neo4jConnector()
    if db.is_connected():
        logger.info("Neo4j database connected")
    else:
        logger.warning("Neo4j database not connected")
except Exception as e:
    logger.error(f"Error initializing services: {e}", exc_info=True)
    # We'll continue without failing, but the API might not function properly

# Background task queue
background_tasks = {}

# File upload handling
async def save_upload_file(upload_file: UploadFile, destination: Path) -> Path:
    """Save an uploaded file to a destination path."""
    try:
        # Ensure parent directory exists
        destination.parent.mkdir(parents=True, exist_ok=True)
        
        # Make sure we have a valid file
        if not upload_file or not hasattr(upload_file, 'file'):
            raise ValueError(f"Invalid upload file object: {upload_file}")
            
        # Get the file size for logging
        try:
            # Try to get file size without reading content
            await upload_file.seek(0, 2)  # Seek to end
            file_size = await upload_file.tell()  # Get position (size)
            await upload_file.seek(0)  # Reset to beginning
            logger.info(f"Saving file of size {file_size} bytes to {destination}")
        except Exception as e:
            logger.warning(f"Could not determine file size: {e}")
        
        # Check if destination already exists
        if destination.exists():
            logger.warning(f"Destination file already exists, will be overwritten: {destination}")
        
        # Read and write in chunks to handle large files
        with open(destination, "wb") as buffer:
            # Read in 1MB chunks
            chunk_size = 1024 * 1024
            while True:
                chunk = await upload_file.read(chunk_size)
                if not chunk:
                    break
                buffer.write(chunk)
                
        # Verify file was written successfully
        if not destination.exists():
            raise FileNotFoundError(f"File was not written to {destination}")
            
        file_size = destination.stat().st_size
        logger.info(f"Successfully saved file ({file_size} bytes) to {destination}")
        
        return destination
    except Exception as e:
        logger.error(f"Error saving upload file to {destination}: {str(e)}", exc_info=True)
        # Clean up partially written file if it exists
        if destination.exists():
            try:
                destination.unlink()
                logger.info(f"Cleaned up partially written file: {destination}")
            except Exception as cleanup_error:
                logger.error(f"Failed to clean up file: {cleanup_error}")
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint to check if the API is running."""
    return {"message": "ScorePAL API is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check if required directories exist
        for dir_name, dir_path in directories.items():
            if not dir_path.exists():
                dir_path.mkdir(parents=True, exist_ok=True)
        
        # Check if we can write to the temp directory
        test_file = directories["temp_uploads"] / "health_check.txt"
        try:
            test_file.write_text("health check")
            test_file.unlink()  # Clean up
        except Exception as e:
            raise Exception(f"Failed to write to temp directory: {str(e)}")
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "environment": "development" if os.getenv("DEBUG", "true").lower() == "true" else "production"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/system/initialize")
async def initialize_system():
    """Force initialization/reinitialization of the system."""
    try:
        # Re-ensure directory structure
        global directories
        directories = ensure_directory_structure()
        
        # Count existing files for reporting
        metadata_files = len(list(Path(directories["metadata"]).glob("*.json"))) if os.path.exists(directories["metadata"]) else 0
        result_files = len(list(Path(directories["grading_results"]).glob("*/*.json"))) if os.path.exists(directories["grading_results"]) else 0
        
        return {
            "status": "success",
            "message": "System directories initialized successfully",
            "directories": {str(k): str(v) for k, v in directories.items()},
            "existing_data": {
                "metadata_files": metadata_files,
                "result_files": result_files
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"System initialization failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"System initialization failed: {str(e)}")

@app.post("/upload-assignment")
async def upload_assignment(
    assignment_name: str = Form(...),
    question_paper: UploadFile = File(...),
    submissions: UploadFile = File(...),
    answer_key: Optional[UploadFile] = File(None),
    strictness: float = Form(0.5),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Upload an assignment with question paper and submissions.
    
    Args:
        assignment_name: Name of the assignment
        question_paper: Question paper file (PDF/DOCX)
        submissions: ZIP file containing student submissions
        answer_key: Optional answer key file
        strictness: Grading strictness (0.0 to 1.0, default: 0.5)
    """
    try:
        # Validate file types
        # Question paper should be PDF/DOCX
        question_ext = Path(question_paper.filename).suffix.lower()
        if question_ext not in ['.pdf', '.docx']:
            raise HTTPException(status_code=400, detail="Question paper must be PDF or DOCX format")
        
        # Submissions should be ZIP
        submission_ext = Path(submissions.filename).suffix.lower()
        if submission_ext not in ['.zip']:
            raise HTTPException(status_code=400, detail="Submissions must be a ZIP file")
        
        # Answer key should be PDF/DOCX if provided
        if answer_key:
            answer_key_ext = Path(answer_key.filename).suffix.lower()
            if answer_key_ext not in ['.pdf', '.docx', '.txt']:
                raise HTTPException(status_code=400, detail="Answer key must be PDF, DOCX, or TXT format")
        
        # Validate strictness
        strictness = float(strictness)
        if strictness < 0.0 or strictness > 1.0:
            strictness = 0.5  # Default to moderate if out of range
        
        # Generate unique ID for this upload
        upload_id = str(uuid.uuid4())
        upload_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        formatted_name = "".join(c if c.isalnum() or c == '_' else '_' for c in assignment_name.replace(' ', '_').lower())
        
        # Create structured upload directories
        assignment_dir = directories["uploads"] / f"{formatted_name}_{upload_timestamp}_{upload_id[:8]}"
        assignment_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created assignment directory: {assignment_dir}")
        
        # Save question paper to appropriate directory
        question_dir = directories["question_papers"] / upload_id
        question_dir.mkdir(parents=True, exist_ok=True)
        question_filename = f"question_{formatted_name}{question_ext}"
        question_path = await save_upload_file(question_paper, question_dir / question_filename)
        logger.info(f"Saved question paper to: {question_path}")
        
        # Save submissions to appropriate directory
        submissions_dir = directories["submissions"] / upload_id
        submissions_dir.mkdir(parents=True, exist_ok=True)
        submissions_filename = f"submissions_{formatted_name}{submission_ext}"
        submissions_path = await save_upload_file(submissions, submissions_dir / submissions_filename)
        logger.info(f"Saved submissions to: {submissions_path}")
        
        # Save answer key if provided
        answer_key_path = None
        if answer_key:
            answer_key_dir = directories["answer_keys"] / upload_id
            answer_key_dir.mkdir(parents=True, exist_ok=True)
            answer_key_filename = f"answer_key_{formatted_name}{Path(answer_key.filename).suffix.lower()}"
            answer_key_path = await save_upload_file(answer_key, answer_key_dir / answer_key_filename)
            logger.info(f"Saved answer key to: {answer_key_path}")
        
        # Create a metadata file with upload info
        metadata = {
            "id": upload_id,
            "assignment_name": assignment_name,
            "formatted_name": formatted_name,
            "uploaded_at": datetime.now().isoformat(),
            "question_paper": str(question_path),
            "submissions": str(submissions_path),
            "answer_key": str(answer_key_path) if answer_key_path else None,
            "strictness": strictness,
            "status": "uploaded",
            "directory_structure": {
                "assignment": str(assignment_dir),
                "question": str(question_dir),
                "submissions": str(submissions_dir),
                "answer_key": str(answer_key_dir) if answer_key else None
            },
            "files": {
                "question_filename": question_filename,
                "submissions_filename": submissions_filename,
                "answer_key_filename": answer_key_filename if answer_key else None
            }
        }
        
        # Save metadata in the assignment directory
        metadata_path = assignment_dir / "metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"Saved metadata to: {metadata_path}")
        
        # Also save a copy in the central metadata directory
        metadata_copy_path = directories["metadata"] / f"{formatted_name}_{upload_id}_metadata.json"
        with open(metadata_copy_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"Saved metadata copy to: {metadata_copy_path}")
        
        # Start processing in the background
        background_tasks.add_task(
            process_assignment,
            upload_id=upload_id,
            metadata=metadata
        )
        
        return {
            "upload_id": upload_id,
            "status": "uploaded",
            "message": "Files uploaded successfully. Processing has started.",
            "metadata_path": str(metadata_path),
            "files_saved": {
                "question_paper": str(question_path),
                "submissions": str(submissions_path),
                "answer_key": str(answer_key_path) if answer_key_path else None
            }
        }
    
    except Exception as e:
        logger.error(f"Error uploading assignment: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading assignment: {str(e)}")

async def process_assignment(upload_id: str, metadata: Dict[str, Any]):
    """Process an uploaded assignment in the background."""
    try:
        # Update status
        update_upload_status(upload_id, "processing", metadata)
        
        # Determine output path - use configured directory structure for this upload
        custom_output_path = None
        if "directory_structure" in metadata and "assignment" in metadata["directory_structure"]:
            custom_output_path = metadata["directory_structure"]["assignment"]
            logger.info(f"Using custom output path from directory structure: {custom_output_path}")
        
        # Use the FilePreprocessor to process the files
        result = file_preprocessor.process_files(
            submissions_zip=metadata["submissions"],
            question_paper=metadata["question_paper"],
            answer_key_PATH=metadata["answer_key"],
            assignment_name=metadata["assignment_name"],
            custom_output_path=custom_output_path,
            save_intermediate_files=True
        )
        
        # Store the result in metadata
        metadata.update({
            "processed_at": datetime.now().isoformat(),
            "status": "processed",
            "assignment_id": result["assignment_id"],
            "submission_count": len(result["submissions"]),
            "files_location": str(custom_output_path) if custom_output_path else str(result.get("output_dir", ""))
        })
        
        # Save updated metadata
        update_upload_metadata(upload_id, metadata)
        
        logger.info(f"Assignment {upload_id} processed successfully")
    except Exception as e:
        logger.error(f"Error processing assignment {upload_id}: {e}")
        update_upload_status(upload_id, "failed", metadata, str(e))

def update_upload_status(upload_id: str, status: str, metadata: Dict[str, Any], error: str = None):
    """Update the status of an upload."""
    try:
        metadata["status"] = status
        if error:
            metadata["error"] = error
        
        # Get directory paths from metadata
        if "directory_structure" in metadata:
            # For new structure
            if "type" in metadata and metadata["type"] == "single_submission":
                # Single submission
                student_dir = Path(metadata["directory_structure"]["student"])
                metadata_path = student_dir / "metadata.json"
                
                # Also update central metadata
                formatted_student = metadata["formatted_student"]
                formatted_name = metadata["formatted_name"]
                metadata_copy_path = directories["metadata"] / f"{formatted_student}_{formatted_name}_{upload_id}_metadata.json"
            else:
                # Regular assignment
                assignment_dir = Path(metadata["directory_structure"]["assignment"])
                metadata_path = assignment_dir / "metadata.json"
                
                # Also update central metadata
                formatted_name = metadata["formatted_name"]
                metadata_copy_path = directories["metadata"] / f"{formatted_name}_{upload_id}_metadata.json"
        else:
            # For old structure
            upload_dir = directories["uploads"] / upload_id
            metadata_path = upload_dir / "metadata.json"
            metadata_copy_path = None
        
        # Save updated metadata
        if metadata_path.exists():
            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)
        
        # Update copy if it exists
        if metadata_copy_path and metadata_copy_path.exists():
            with open(metadata_copy_path, "w") as f:
                json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Error updating upload status: {e}")

def update_upload_metadata(upload_id: str, metadata: Dict[str, Any]):
    """Update the metadata of an upload."""
    try:
        # Get directory paths from metadata
        if "directory_structure" in metadata:
            # For new structure
            if "type" in metadata and metadata["type"] == "single_submission":
                # Single submission
                student_dir = Path(metadata["directory_structure"]["student"])
                metadata_path = student_dir / "metadata.json"
                
                # Also update central metadata
                formatted_student = metadata["formatted_student"]
                formatted_name = metadata["formatted_name"]
                metadata_copy_path = directories["metadata"] / f"{formatted_student}_{formatted_name}_{upload_id}_metadata.json"
            else:
                # Regular assignment
                assignment_dir = Path(metadata["directory_structure"]["assignment"])
                metadata_path = assignment_dir / "metadata.json"
                
                # Also update central metadata
                formatted_name = metadata["formatted_name"]
                metadata_copy_path = directories["metadata"] / f"{formatted_name}_{upload_id}_metadata.json"
        else:
            # For old structure
            upload_dir = directories["uploads"] / upload_id
            metadata_path = upload_dir / "metadata.json"
            metadata_copy_path = None
        
        # Save updated metadata
        if metadata_path.exists():
            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)
        
        # Update copy if it exists
        if metadata_copy_path and metadata_copy_path.exists():
            with open(metadata_copy_path, "w") as f:
                json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Error updating upload metadata: {e}")

@app.get("/assignments")
async def list_assignments():
    """List all assignments."""
    try:
        assignments = []
        
        # Check metadata directory for all assignments
        metadata_dir = directories["metadata"]
        if metadata_dir.exists():
            for metadata_file in metadata_dir.glob("*_metadata.json"):
                if metadata_file.is_file():
                    with open(metadata_file, "r") as f:
                        metadata = json.load(f)
                    
                    # Skip single submissions when listing assignments
                    if "type" in metadata and metadata["type"] == "single_submission":
                        continue
                    
                    assignments.append({
                        "id": metadata.get("id"),
                        "assignment_name": metadata.get("assignment_name"),
                        "uploaded_at": metadata.get("uploaded_at"),
                        "status": metadata.get("status"),
                        "submission_count": metadata.get("submission_count", 0),
                    })
        
        # For backward compatibility, also check uploads directory
        uploads_dir = directories["uploads"]
        if uploads_dir.exists():
            for assignment_dir in uploads_dir.iterdir():
                if assignment_dir.is_dir():
                    metadata_path = assignment_dir / "metadata.json"
                    if metadata_path.exists():
                        with open(metadata_path, "r") as f:
                            metadata = json.load(f)
                        
                        # Check if this assignment is already in our list
                        existing_ids = [a["id"] for a in assignments]
                        if metadata.get("id") not in existing_ids:
                            assignments.append({
                                "id": metadata.get("id"),
                                "assignment_name": metadata.get("assignment_name"),
                                "uploaded_at": metadata.get("uploaded_at"),
                                "status": metadata.get("status"),
                                "submission_count": metadata.get("submission_count", 0),
                            })
        
        return {"assignments": assignments}
    except Exception as e:
        logger.error(f"Error listing assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing assignments: {str(e)}")

@app.get("/assignments/{assignment_id}")
async def get_assignment(assignment_id: str):
    """Get details of a specific assignment."""
    try:
        # First check metadata directory (new structure)
        metadata_dir = directories["metadata"]
        if metadata_dir.exists():
            for metadata_file in metadata_dir.glob(f"*_{assignment_id}*_metadata.json"):
                if metadata_file.is_file():
                    with open(metadata_file, "r") as f:
                        metadata = json.load(f)
                    if metadata.get("id") == assignment_id:
                        return metadata
            
            # Also check metadata files without assignment_id in filename
            for metadata_file in metadata_dir.glob("*_metadata.json"):
                if metadata_file.is_file():
                    with open(metadata_file, "r") as f:
                        metadata = json.load(f)
                    if metadata.get("id") == assignment_id:
                        return metadata
        
        # Check old structure
        # Check uploads directory
        uploads_dir = directories["uploads"]
        if uploads_dir.exists():
            for upload_dir in uploads_dir.iterdir():
                if upload_dir.is_dir():
                    metadata_path = upload_dir / "metadata.json"
                    if metadata_path.exists():
                        with open(metadata_path, "r") as f:
                            metadata = json.load(f)
                        if metadata.get("id") == assignment_id:
                            return metadata
        
        # Check processed assignments
        processed_dir = directories["processed_uploads"] / assignment_id
        if processed_dir.exists():
            metadata_path = processed_dir / "metadata.json"
            if metadata_path.exists():
                with open(metadata_path, "r") as f:
                    metadata = json.load(f)
                return metadata
        
        raise HTTPException(status_code=404, detail=f"Assignment {assignment_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting assignment {assignment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting assignment: {str(e)}")

@app.post("/grade-assignment/{assignment_id}")
async def grade_assignment(
    assignment_id: str,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Grade an assignment.
    
    Args:
        assignment_id: ID of the assignment to grade
    """
    try:
        # Find the assignment
        assignment = await get_assignment(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail=f"Assignment {assignment_id} not found")
        
        # Check if the assignment is processed
        if assignment.get("status") != "processed":
            raise HTTPException(
                status_code=400, 
                detail=f"Assignment {assignment_id} is not ready for grading (status: {assignment.get('status')})"
            )
        
        # Check if it's a batch assignment
        if "type" not in assignment or assignment.get("type") != "single_submission":
            return {
                "status": "coming_soon",
                "message": "Batch grading is coming soon. Please use single submission grading for now.",
                "assignment_id": assignment_id
            }
        
        # Start grading in the background
        background_tasks.add_task(
            grade_assignment_task,
            assignment_id=assignment_id,
            assignment=assignment
        )
        
        return {
            "assignment_id": assignment_id,
            "status": "grading_started",
            "message": "Grading has started."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting grading for assignment {assignment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error starting grading: {str(e)}")

async def grade_assignment_task(assignment_id: str, assignment: Dict[str, Any]):
    """Grade an assignment in the background."""
    try:
        # Update status
        update_assignment_status(assignment_id, "grading")
        
        # Get the assignment data
        processed_dir = directories["processed_uploads"] / assignment_id
        
        if not processed_dir.exists():
            raise FileNotFoundError(f"Processed directory for assignment {assignment_id} not found")
        
        question_path = processed_dir / "question.txt"
        answer_key_path = processed_dir / "answer_key.txt"
        submissions_dir = processed_dir / "submissions"
        
        # Read the question and answer key
        with open(question_path, "r", encoding="utf-8") as f:
            question_text = f.read()
        
        with open(answer_key_path, "r", encoding="utf-8") as f:
            answer_key = f.read()
        
        # Get strictness from metadata if available, default to moderate (0.5)
        strictness = 0.5
        if assignment and "strictness" in assignment:
            try:
                strictness_value = float(assignment["strictness"])
                if 0.0 <= strictness_value <= 1.0:
                    strictness = strictness_value
            except (ValueError, TypeError):
                # If strictness is not a valid float, use default
                pass
        
        # Get all submissions
        submissions = {}
        for submission_file in submissions_dir.iterdir():
            if submission_file.is_file():
                # Use filename without extension as student name
                student_name = submission_file.stem
                
                # Read submission text
                try:
                    if submission_file.suffix.lower() == '.txt':
                        # For text files, read directly
                        with open(submission_file, "r", encoding="utf-8") as f:
                            submissions[student_name] = f.read()
                    elif submission_file.suffix.lower() == '.pdf':
                        # For PDF files, use text extraction utility
                        extracted_text = extract_text_from_pdf(str(submission_file))
                        if extracted_text:
                            submissions[student_name] = extracted_text
                            # Save the extracted text for future reference
                            text_file = submissions_dir / f"{student_name}_extracted.txt"
                            with open(text_file, "w", encoding="utf-8") as f:
                                f.write(extracted_text)
                        else:
                            logger.warning(f"Could not extract text from PDF: {submission_file}")
                except Exception as e:
                    logger.error(f"Error reading submission file {submission_file}: {e}")
                    # Skip this file and continue
        
        # Grade each submission using the multi-agent system
        if submissions:
            # Use the default rubric for now
            # In a future version, we might load a custom rubric
            default_rubric = {
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
            
            # Use the multi-agent grading system for parallel processing
            batch_results = await multi_agent_grading.grade_batch(
                submissions=submissions,
                question_text=question_text,
                answer_key=answer_key,
                assignment_id=assignment_id,
                rubric=default_rubric,
                strictness=strictness
            )
            
            results = batch_results["results"]
            summary = batch_results["summary"]
            
            # Save results in organized structure
            results_dir = directories["grading_results"] / assignment_id
            batch_dir = results_dir / "batch_results"
            student_results_dir = batch_dir / "student_results"
            
            # Create directories
            for directory in [results_dir, batch_dir, student_results_dir]:
                directory.mkdir(parents=True, exist_ok=True)
            
            # Save each student result
            for student_name, result in results.items():
                safe_name = student_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
                
                # Save in the new structure
                with open(student_results_dir / f"{safe_name}_result.json", "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2)
                
                # Also save in the root for backward compatibility
                with open(results_dir / f"{safe_name}_result.json", "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2)
            
            # Save the summary
            with open(batch_dir / "summary.json", "w", encoding="utf-8") as f:
                json.dump(summary, f, indent=2)
            
            # Also save summary in root for backward compatibility
            with open(results_dir / "summary.json", "w", encoding="utf-8") as f:
                json.dump(summary, f, indent=2)
            
            # Save the combined results file
            with open(batch_dir / "all_results.json", "w", encoding="utf-8") as f:
                json.dump({
                    "assignment_id": assignment_id,
                    "timestamp": datetime.now().isoformat(),
                    "results": results,
                    "summary": summary
                }, f, indent=2)
            
            # Also save a copy in the root directory for backward compatibility
            with open(results_dir / "all_results.json", "w", encoding="utf-8") as f:
                json.dump({
                    "assignment_id": assignment_id,
                    "timestamp": datetime.now().isoformat(),
                    "results": results,
                    "summary": summary
                }, f, indent=2)
            
            # Update status
            update_assignment_status(
                assignment_id, 
                "graded", 
                {
                    "graded_at": datetime.now().isoformat(),
                    "submission_count": len(submissions),
                    "results_dir": str(results_dir),
                    "summary_path": str(batch_dir / "summary.json"),
                    "average_score": summary["average_score"],
                    "pass_rate": summary["pass_rate"],
                    "processing_time": summary["processing_time_seconds"]
                }
            )
            
            logger.info(f"Assignment {assignment_id} graded successfully")
        else:
            update_assignment_status(
                assignment_id, 
                "error", 
                None, 
                "No submissions found for grading"
            )
    except Exception as e:
        logger.error(f"Error grading assignment {assignment_id}: {e}")
        update_assignment_status(
            assignment_id, 
            "error", 
            None, 
            str(e)
        )

def update_assignment_status(assignment_id: str, status: str, metadata: Dict[str, Any] = None, error: str = None):
    """Update the status of an assignment."""
    assignment_dir = directories["processed_uploads"] / assignment_id
    metadata_path = assignment_dir / "metadata.json"
    
    if metadata_path.exists():
        with open(metadata_path, "r") as f:
            if metadata is None:
                metadata = json.load(f)
        
        metadata["status"] = status
        if error:
            metadata["error"] = error
        
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
            
        # If there's an upload_id, also update the upload metadata
        if "upload_id" in metadata:
            update_upload_status(metadata["upload_id"], status, metadata, error)

def get_grade_letter(percentage: float) -> str:
    """
    Convert a percentage score to a letter grade.
    
    Args:
        percentage: The percentage score (0-100)
        
    Returns:
        The corresponding letter grade (A, B, C, D, or F)
    """
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

@app.get("/grading-results/{assignment_id}")
async def get_grading_results(assignment_id: str):
    """Get grading results for a specific assignment."""
    try:
        logger.info(f"Getting grading results for assignment/submission: {assignment_id}")
        
        # First, retrieve the assignment info to determine if it's a single submission
        try:
            assignment_info = await get_assignment(assignment_id)
            if not assignment_info:
                logger.error(f"Assignment/submission not found: {assignment_id}")
                raise HTTPException(status_code=404, detail=f"Assignment/submission {assignment_id} not found")
                
            is_single_submission = assignment_info.get("type") == "single_submission"
            logger.info(f"Determined submission type: {'single' if is_single_submission else 'batch'}")
            
            # If it's a batch assignment, return coming soon message
            if not is_single_submission:
                return {
                    "status": "coming_soon",
                    "message": "Batch grading results are coming soon. Please use single submission grading for now.",
                    "assignment_id": assignment_id
                }
        except Exception as e:
            logger.error(f"Error retrieving assignment info: {e}")
            is_single_submission = False  # Default to batch processing if we can't determine
        
        # Check in the grading_results directory
        results_dir = directories["grading_results"] / assignment_id
        logger.info(f"Looking for results in: {results_dir}")
        
        if is_single_submission:
            logger.info("Processing single submission results")
            
            # Look for a result file pattern
            result_files = list(results_dir.glob("*_results.json"))
            if not result_files:
                # Try different naming patterns
                result_files = list(results_dir.glob("*_result.json"))
            
            if result_files:
                result_file = result_files[0]  # Use the first result file
                logger.info(f"Found result file: {result_file}")
                
                with open(result_file, "r", encoding="utf-8") as f:
                    result_data = json.load(f)
                
                # Get submission text if available
                submission_text = ""
                try:
                    submission_file = result_file.parent / "submission.txt"
                    if submission_file.exists():
                        with open(submission_file, "r", encoding="utf-8") as f:
                            submission_text = f.read()
                except Exception as e:
                    logger.error(f"Error reading submission file: {e}")
                
                # Get question text if available
                question_text = ""
                try:
                    question_file = result_file.parent / "question.txt"
                    if question_file.exists():
                        with open(question_file, "r", encoding="utf-8") as f:
                            question_text = f.read()
                except Exception as e:
                    logger.error(f"Error reading question file: {e}")
                
                # Get answer key if available
                answer_key_text = ""
                try:
                    answer_key_file = result_file.parent / "answer_key.txt"
                    if answer_key_file.exists():
                        with open(answer_key_file, "r", encoding="utf-8") as f:
                            answer_key_text = f.read()
                except Exception as e:
                    logger.error(f"Error reading answer key file: {e}")
                
                # Check if result_data is in the expected format
                if "student_name" in result_data and "score" in result_data:
                    # The result file has the score directly at the top level
                    return {
                        "assignment_id": assignment_id,
                        "assignment_name": assignment_info.get("assignment_name"),
                        "student_name": result_data.get("student_name") or assignment_info.get("student_name"),
                        "graded_at": assignment_info.get("graded_at", datetime.now().isoformat()),
                        "score": result_data.get("score"),
                        "total": result_data.get("max_score", 100),
                        "percentage": result_data.get("percentage"),
                        "grade_letter": result_data.get("grade_letter"),
                        "grading_feedback": result_data.get("feedback"),
                        "criteria_scores": result_data.get("criteria_scores", []),
                        "mistakes": {f"mistake_{i+1}": {"deductions": 0, "reasons": m.get("description")} 
                                   for i, m in enumerate(result_data.get("mistakes", []))},
                        "submission_text": submission_text,
                        "question_text": question_text,
                        "answer_key": answer_key_text,
                        "timestamp": result_data.get("timestamp", datetime.now().isoformat())
                    }
                
                # Older format with nested structure
                if "result" in result_data:
                    result = result_data["result"]
                    return {
                        "assignment_id": assignment_id,
                        "assignment_name": assignment_info.get("assignment_name"),
                        "student_name": result.get("student_name") or assignment_info.get("student_name"),
                        "graded_at": result_data.get("graded_at", datetime.now().isoformat()),
                        "score": result.get("score"),
                        "total": result.get("max_score", 100),
                        "percentage": result.get("percentage"),
                        "grade_letter": result.get("grade_letter"),
                        "grading_feedback": result.get("feedback"),
                        "criteria_scores": result.get("criteria_scores", []),
                        "mistakes": result.get("mistakes", {}),
                        "submission_text": submission_text,
                        "question_text": question_text,
                        "answer_key": answer_key_text,
                        "timestamp": result.get("timestamp", datetime.now().isoformat())
                    }
                
                # If we got here, return the raw result data
                return result_data
            
            logger.error(f"No result files found in {results_dir}")
            raise HTTPException(status_code=404, detail=f"No grading results found for {assignment_id}")
        
        # If we reach here, no results were found
        logger.error(f"No grading results found for {assignment_id}")
        raise HTTPException(status_code=404, detail=f"No grading results found for {assignment_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving grading results: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving grading results: {str(e)}")

@app.post("/upload-single")
async def upload_single(
    student_name: str = Form(...),
    assignment_name: str = Form(...),
    question_paper: UploadFile = File(...),
    submission: UploadFile = File(...),
    answer_key: Optional[UploadFile] = File(None),
    strictness: float = Form(0.5),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Upload a single student submission for grading.
    
    Args:
        student_name: Name of the student
        assignment_name: Name of the assignment
        question_paper: Question paper file (PDF/DOCX)
        submission: Student submission file (PDF only)
        answer_key: Optional answer key file
        strictness: Grading strictness (0.0 to 1.0, default: 0.5)
    """
    try:
        logger.info(f"Starting upload for student: {student_name}, assignment: {assignment_name}")
        
        # Log received files
        logger.info(f"Received question paper: {question_paper.filename}, size: {question_paper.size}")
        logger.info(f"Received submission: {submission.filename}, size: {submission.size}")
        if answer_key:
            logger.info(f"Received answer key: {answer_key.filename}, size: {answer_key.size}")
        
        # Validate file types
        # Question paper should be PDF/DOCX
        question_ext = Path(question_paper.filename).suffix.lower()
        if question_ext not in ['.pdf', '.docx']:
            logger.error(f"Invalid question paper format: {question_ext}")
            raise HTTPException(status_code=400, detail=f"Question paper must be PDF or DOCX format, received: {question_ext}")
        
        # Submission should be PDF only
        submission_ext = Path(submission.filename).suffix.lower()
        if submission_ext != '.pdf':
            logger.error(f"Invalid submission format: {submission_ext}")
            raise HTTPException(status_code=400, detail="Currently, only PDF submissions are supported. Support for other formats coming soon!")
        
        # Answer key should be PDF/DOCX if provided
        if answer_key:
            answer_key_ext = Path(answer_key.filename).suffix.lower()
            if answer_key_ext not in ['.pdf', '.docx', '.txt']:
                logger.error(f"Invalid answer key format: {answer_key_ext}")
                raise HTTPException(status_code=400, detail=f"Answer key must be PDF, DOCX, or TXT format, received: {answer_key_ext}")
            
        # Validate strictness
        try:
            strictness = float(strictness)
            if strictness < 0.0 or strictness > 1.0:
                logger.warning(f"Strictness value out of range: {strictness}, defaulting to 0.5")
                strictness = 0.5  # Default to moderate if out of range
        except ValueError:
            logger.warning(f"Invalid strictness value: {strictness}, defaulting to 0.5")
            strictness = 0.5
            
        # Generate unique ID for this submission
        upload_id = str(uuid.uuid4())
        upload_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        formatted_name = "".join(c if c.isalnum() or c == '_' else '_' for c in assignment_name.replace(' ', '_').lower())
        formatted_student = "".join(c if c.isalnum() or c == '_' else '_' for c in student_name.replace(' ', '_').lower())
        
        logger.info(f"Generated upload ID: {upload_id}")
        logger.info(f"Formatted name: {formatted_name}")
        logger.info(f"Formatted student: {formatted_student}")
        
        # Ensure all base directories exist
        ensure_directory_structure()
        
        # Create structured upload directories
        student_dir = directories["uploads"] / f"{formatted_student}_{formatted_name}_{upload_timestamp}_{upload_id[:8]}"
        try:
            student_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created student directory: {student_dir}")
        except Exception as e:
            logger.error(f"Failed to create student directory: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create directory: {str(e)}")
        
        # Save question paper to appropriate directory
        question_dir = directories["question_papers"] / upload_id
        try:
            question_dir.mkdir(parents=True, exist_ok=True)
            question_filename = f"question_{formatted_name}{question_ext}"
            question_path = await save_upload_file(question_paper, question_dir / question_filename)
            logger.info(f"Saved question paper to: {question_path}")
        except Exception as e:
            logger.error(f"Failed to save question paper: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save question paper: {str(e)}")
        
        # Save submission to appropriate directory
        submission_dir = directories["submissions"] / upload_id
        try:
            submission_dir.mkdir(parents=True, exist_ok=True)
            submission_filename = f"{formatted_student}_{formatted_name}{submission_ext}"
            submission_path = await save_upload_file(submission, submission_dir / submission_filename)
            logger.info(f"Saved submission to: {submission_path}")
        except Exception as e:
            logger.error(f"Failed to save submission: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save submission: {str(e)}")
        
        # Save answer key if provided
        answer_key_path = None
        answer_key_filename = None
        if answer_key:
            try:
                answer_key_dir = directories["answer_keys"] / upload_id
                answer_key_dir.mkdir(parents=True, exist_ok=True)
                answer_key_filename = f"answer_key_{formatted_name}{Path(answer_key.filename).suffix.lower()}"
                answer_key_path = await save_upload_file(answer_key, answer_key_dir / answer_key_filename)
                logger.info(f"Saved answer key to: {answer_key_path}")
            except Exception as e:
                logger.error(f"Failed to save answer key: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to save answer key: {str(e)}")
        
        # Create a metadata file with upload info
        metadata = {
            "id": upload_id,
            "type": "single_submission",
            "student_name": student_name,
            "formatted_student": formatted_student,
            "assignment_name": assignment_name,
            "formatted_name": formatted_name,
            "uploaded_at": datetime.now().isoformat(),
            "question_paper": str(question_path),
            "submission": str(submission_path),
            "answer_key": str(answer_key_path) if answer_key_path else None,
            "strictness": strictness,
            "status": "uploaded",
            "directory_structure": {
                "student": str(student_dir),
                "question": str(question_dir),
                "submission": str(submission_dir),
                "answer_key": str(answer_key_dir) if answer_key else None
            },
            "files": {
                "question_filename": question_filename,
                "submission_filename": submission_filename,
                "answer_key_filename": answer_key_filename
            }
        }
        
        # Save metadata in the student directory
        try:
            metadata_path = student_dir / "metadata.json"
            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)
            logger.info(f"Saved metadata to: {metadata_path}")
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save metadata: {str(e)}")
        
        # Also save a copy in the central metadata directory
        try:
            metadata_copy_path = directories["metadata"] / f"{formatted_student}_{formatted_name}_{upload_id}_metadata.json"
            with open(metadata_copy_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)
            logger.info(f"Saved metadata copy to: {metadata_copy_path}")
        except Exception as e:
            logger.error(f"Failed to save metadata copy: {e}")
            # This is not critical, so we don't raise an exception here
        
        # Start processing in the background
        logger.info(f"Starting background processing for upload: {upload_id}")
        background_tasks.add_task(
            process_and_grade_single,
            upload_id=upload_id,
            metadata=metadata
        )
        
        return {
            "upload_id": upload_id,
            "status": "uploaded",
            "message": "Files uploaded successfully. Processing and grading has started.",
            "metadata_path": str(metadata_path),
            "files_saved": {
                "question_paper": str(question_path),
                "submission": str(submission_path),
                "answer_key": str(answer_key_path) if answer_key_path else None
            }
        }
    except HTTPException:
        # Re-raise HTTP exceptions as they already have appropriate status codes
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload_single: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error uploading submission: {str(e)}")

async def process_and_grade_single(upload_id: str, metadata: Dict[str, Any]):
    """Process and grade a single student submission in the background."""
    try:
        # Update status
        update_upload_status(upload_id, "processing", metadata)
        logger.info(f"Starting processing for single submission {upload_id}")
        
        # Validate required metadata fields
        required_fields = ["question_paper", "submission", "student_name", "assignment_name"]
        for field in required_fields:
            if field not in metadata or not metadata[field]:
                error_msg = f"Missing required metadata field: {field}"
                logger.error(error_msg)
                update_upload_status(upload_id, "failed", metadata, error_msg)
                return
        
        # Determine output path - use configured directory structure for this upload
        custom_output_path = None
        if "directory_structure" in metadata and "student" in metadata["directory_structure"]:
            custom_output_path = metadata["directory_structure"]["student"]
            logger.info(f"Using custom output path from directory structure: {custom_output_path}")
        
        # Validate all required files exist
        question_paper_path = metadata["question_paper"]
        if not os.path.exists(question_paper_path):
            error_msg = f"Question paper file not found: {question_paper_path}"
            logger.error(error_msg)
            update_upload_status(upload_id, "failed", metadata, error_msg)
            return
            
        submission_path = metadata["submission"]
        if not os.path.exists(submission_path):
            error_msg = f"Submission file not found: {submission_path}"
            logger.error(error_msg)
            update_upload_status(upload_id, "failed", metadata, error_msg)
            return
        
        answer_key_path = metadata.get("answer_key")
        if answer_key_path and not os.path.exists(answer_key_path):
            logger.warning(f"Answer key file not found: {answer_key_path}")
            answer_key_path = None
        
        student_name = metadata["student_name"]
        assignment_name = metadata["assignment_name"]
        strictness = metadata.get("strictness", 0.5)
        
        # Process the question paper
        logger.info(f"Processing question paper: {question_paper_path}")
        
        # Create a FilePreprocessor with custom output path
        try:
            if custom_output_path:
                custom_preprocessor = FilePreprocessor(custom_output_path=custom_output_path, save_ocr_files=True)
                question_text = custom_preprocessor.extract_text_from_file(question_paper_path)
            else:
                question_text = file_preprocessor.extract_text_from_file(question_paper_path)
                
            if not question_text or len(question_text) < 10:
                error_msg = "Failed to extract meaningful text from question paper"
                logger.error(error_msg)
                update_upload_status(upload_id, "failed", metadata, error_msg)
                return
                
            logger.info(f"Successfully extracted {len(question_text)} characters from question paper")
        except Exception as e:
            error_msg = f"Error processing question paper: {str(e)}"
            logger.error(error_msg, exc_info=True)
            update_upload_status(upload_id, "failed", metadata, error_msg)
            return
        
        # Process the student submission
        try:
            logger.info(f"Processing student submission: {submission_path}")
            if custom_output_path:
                submission_text = custom_preprocessor.extract_text_from_file(submission_path)
            else:
                submission_text = file_preprocessor.extract_text_from_file(submission_path)
                
            if not submission_text or len(submission_text) < 10:
                error_msg = "Failed to extract meaningful text from student submission"
                logger.error(error_msg)
                update_upload_status(upload_id, "failed", metadata, error_msg)
                return
                
            logger.info(f"Successfully extracted {len(submission_text)} characters from submission")
        except Exception as e:
            error_msg = f"Error processing student submission: {str(e)}"
            logger.error(error_msg, exc_info=True)
            update_upload_status(upload_id, "failed", metadata, error_msg)
            return
        
        # Process the answer key if available
        answer_key_text = None
        try:
            if answer_key_path:
                logger.info(f"Processing answer key: {answer_key_path}")
                if custom_output_path:
                    answer_key_text = custom_preprocessor.extract_text_from_file(answer_key_path)
                else:
                    answer_key_text = file_preprocessor.extract_text_from_file(answer_key_path)
                logger.info(f"Successfully extracted {len(answer_key_text) if answer_key_text else 0} characters from answer key")
        except Exception as e:
            logger.warning(f"Error processing answer key, will generate one: {str(e)}")
            answer_key_text = None
        
        # Generate an answer key if not provided or failed to extract
        if not answer_key_text:
            try:
                logger.info("Generating answer key using Gemini")
                if custom_output_path:
                    answer_key_text = custom_preprocessor._generate_answer_key(question_text, None)
                else:
                    answer_key_text = file_preprocessor._generate_answer_key(question_text, None)
                    
                if not answer_key_text or len(answer_key_text) < 10:
                    logger.warning("Generated answer key seems too short, but will proceed")
                    
                logger.info(f"Successfully generated answer key with {len(answer_key_text)} characters")
            except Exception as e:
                error_msg = f"Error generating answer key: {str(e)}"
                logger.error(error_msg, exc_info=True)
                update_upload_status(upload_id, "failed", metadata, error_msg)
                return
        
        # Use the default rubric for now
        # In a future version, we might load a custom rubric
        default_rubric = {
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
        
        # Use assignment name as the assignment ID for grouping
        assignment_id = metadata.get("formatted_name", "unnamed_assignment")
        
        # Grade the submission using the multi-agent system
        try:
            logger.info(f"Grading submission for {student_name}")
            # Use the single submission grading from the multi-agent system
            grading_result = await multi_agent_grading.grade_single(
                submission_text=submission_text,
                question_text=question_text,
                answer_key=answer_key_text or "",
                student_name=student_name,
                assignment_id=assignment_id,
                rubric=default_rubric,
                strictness=strictness
            )
            
            if not grading_result:
                error_msg = "Grading service returned empty result"
                logger.error(error_msg)
                update_upload_status(upload_id, "failed", metadata, error_msg)
                return
                
            logger.info(f"Grading completed successfully: Score={grading_result.get('score', 'N/A')}/{grading_result.get('max_score', 100)}")
        except Exception as e:
            error_msg = f"Error grading submission: {str(e)}"
            logger.error(error_msg, exc_info=True)
            update_upload_status(upload_id, "failed", metadata, error_msg)
            return
        
        # Save the results
        try:
            results_dir = directories["grading_results"] / upload_id
            results_dir.mkdir(parents=True, exist_ok=True)
            
            # Create a safe filename
            formatted_student = metadata.get('formatted_student', 'student')
            formatted_name = metadata.get('formatted_name', 'assignment')
            
            results_path = results_dir / f"{formatted_student}_{formatted_name}_results.json"
            
            with open(results_path, "w", encoding="utf-8") as f:
                json.dump(grading_result, f, indent=2)
                
            logger.info(f"Saved grading results to {results_path}")
            
            # Also save processed files for reference
            with open(results_dir / "question.txt", "w", encoding="utf-8") as f:
                f.write(question_text)
                
            with open(results_dir / "submission.txt", "w", encoding="utf-8") as f:
                f.write(submission_text)
                
            if answer_key_text:
                with open(results_dir / "answer_key.txt", "w", encoding="utf-8") as f:
                    f.write(answer_key_text)
        except Exception as e:
            error_msg = f"Error saving grading results: {str(e)}"
            logger.error(error_msg, exc_info=True)
            update_upload_status(upload_id, "failed", metadata, error_msg)
            return
        
        # Update metadata with results
        try:
            metadata.update({
                "processed_at": datetime.now().isoformat(),
                "graded_at": datetime.now().isoformat(),
                "status": "graded",
                "results_path": str(results_path),
                "score": grading_result.get("score", 0),
                "max_score": grading_result.get("max_score", 100),
                "percentage": grading_result.get("percentage", 0),
            })
            
            # Save updated metadata
            update_upload_metadata(upload_id, metadata)
            
            logger.info(f"Single submission {upload_id} processed and graded successfully")
        except Exception as e:
            error_msg = f"Error updating metadata with results: {str(e)}"
            logger.error(error_msg, exc_info=True)
            # Don't fail here since grading was successful
            metadata["status"] = "graded_with_warnings"
            metadata["warning"] = error_msg
            try:
                update_upload_metadata(upload_id, metadata)
            except Exception as metadata_e:
                logger.error(f"Failed to update metadata with warning: {metadata_e}")
    except Exception as e:
        logger.error(f"Unexpected error processing and grading submission {upload_id}: {e}", exc_info=True)
        try:
            update_upload_status(upload_id, "failed", metadata, str(e))
        except Exception as status_e:
            logger.error(f"Failed to update status after error: {status_e}")

@app.get("/files/{file_type}/{assignment_id}/{filename}")
async def get_file(file_type: str, assignment_id: str, filename: str):
    """
    Serve original files like PDFs, DOCXs, etc.
    
    Args:
        file_type: Type of file (question_paper, submission, answer_key)
        assignment_id: ID of the assignment/submission
        filename: Name of the file to retrieve
    """
    try:
        valid_file_types = ["question_paper", "submission", "answer_key", "original"]
        if file_type not in valid_file_types:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Must be one of: {', '.join(valid_file_types)}")
        
        # Determine the appropriate directory based on file type
        if file_type == "question_paper":
            file_dir = directories["question_papers"] / assignment_id
        elif file_type == "submission":
            file_dir = directories["submissions"] / assignment_id
        elif file_type == "answer_key":
            file_dir = directories["answer_keys"] / assignment_id
        elif file_type == "original":
            # For any original file in the assignment directory
            # First, get the assignment info to find the directory
            assignment_info = await get_assignment(assignment_id)
            if not assignment_info:
                raise HTTPException(status_code=404, detail=f"Assignment {assignment_id} not found")
                
            # Check if it's a single submission
            if assignment_info.get("type") == "single_submission" and "directory_structure" in assignment_info:
                file_dir = Path(assignment_info["directory_structure"].get("student", ""))
            else:
                # Regular assignment
                if "directory_structure" in assignment_info:
                    file_dir = Path(assignment_info["directory_structure"].get("assignment", ""))
                else:
                    # Old structure
                    file_dir = directories["uploads"] / assignment_id
        
        # Look for the file
        file_path = file_dir / filename
        if not file_path.exists():
            # Try to find by glob pattern in case the exact name wasn't provided
            matching_files = list(file_dir.glob(f"*{filename}*"))
            if not matching_files:
                raise HTTPException(status_code=404, detail=f"File {filename} not found")
            file_path = matching_files[0]  # Use the first match
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(str(file_path))
        if not content_type:
            # Default to binary file
            content_type = "application/octet-stream"
            
        return FileResponse(
            path=file_path,
            filename=file_path.name,
            media_type=content_type
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving file {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving file: {str(e)}")

@app.get("/grading-results/{assignment_id}/files")
async def get_submission_files(assignment_id: str):
    """Get information about all files related to a submission."""
    try:
        # Get assignment info
        assignment_info = await get_assignment(assignment_id)
        if not assignment_info:
            raise HTTPException(status_code=404, detail=f"Assignment {assignment_id} not found")
        
        # Check if it's a single submission
        is_single_submission = assignment_info.get("type") == "single_submission"
        
        # Initialize file info dictionary
        file_info = {
            "question_papers": [],
            "submissions": [],
            "answer_keys": []
        }
        
        # Get question papers
        question_dir = directories["question_papers"] / assignment_id
        if question_dir.exists():
            file_info["question_papers"] = [
                {
                    "filename": f.name,
                    "path": f"/files/question_paper/{assignment_id}/{f.name}",
                    "size": f.stat().st_size,
                    "last_modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                    "content_type": mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                }
                for f in question_dir.glob("*") if f.is_file()
            ]
        
        # Get submissions
        submission_dir = directories["submissions"] / assignment_id
        if submission_dir.exists():
            file_info["submissions"] = [
                {
                    "filename": f.name,
                    "path": f"/files/submission/{assignment_id}/{f.name}",
                    "size": f.stat().st_size,
                    "last_modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                    "content_type": mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                }
                for f in submission_dir.glob("*") if f.is_file()
            ]
        
        # Get answer keys
        answer_key_dir = directories["answer_keys"] / assignment_id
        if answer_key_dir.exists():
            file_info["answer_keys"] = [
                {
                    "filename": f.name,
                    "path": f"/files/answer_key/{assignment_id}/{f.name}",
                    "size": f.stat().st_size,
                    "last_modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                    "content_type": mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                }
                for f in answer_key_dir.glob("*") if f.is_file()
            ]
        
        # Get original files from assignment/student directory
        if "directory_structure" in assignment_info:
            if is_single_submission and "student" in assignment_info["directory_structure"]:
                student_dir = Path(assignment_info["directory_structure"]["student"])
                if student_dir.exists():
                    file_info["original_files"] = [
                        {
                            "filename": f.name,
                            "path": f"/files/original/{assignment_id}/{f.name}",
                            "size": f.stat().st_size,
                            "last_modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                            "content_type": mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                        }
                        for f in student_dir.glob("*") if f.is_file() and not f.name.endswith(".json")
                    ]
            elif "assignment" in assignment_info["directory_structure"]:
                assignment_dir = Path(assignment_info["directory_structure"]["assignment"])
                if assignment_dir.exists():
                    file_info["original_files"] = [
                        {
                            "filename": f.name,
                            "path": f"/files/original/{assignment_id}/{f.name}",
                            "size": f.stat().st_size,
                            "last_modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                            "content_type": mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                        }
                        for f in assignment_dir.glob("*") if f.is_file() and not f.name.endswith(".json")
                    ]
        
        return file_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file information for {assignment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting file information: {str(e)}")

# Import Canvas-related modules
from canvas_service import CanvasGradingService
from utils.canvas_connector import CanvasConnector

# Add new Canvas endpoints
@app.post("/canvas/connect")
async def connect_to_canvas(
    canvas_url: str = Form(...),
    api_key: str = Form(...)
):
    """
    Connect to Canvas LMS and verify the connection.
    
    Args:
        canvas_url: Canvas instance URL (e.g., 'https://canvas.instructure.com')
        api_key: Canvas API key
    """
    try:
        # Create a Canvas connector and test the connection
        canvas = CanvasConnector(canvas_url, api_key)
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
    except Exception as e:
        logger.error(f"Error connecting to Canvas: {e}")
        raise HTTPException(status_code=500, detail=f"Error connecting to Canvas: {str(e)}")

@app.get("/canvas/courses")
async def list_canvas_courses(
    canvas_url: str,
    api_key: str
):
    """
    List all courses available in Canvas.
    
    Args:
        canvas_url: Canvas instance URL
        api_key: Canvas API key
    """
    try:
        # Use the grading service to get courses
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        canvas_service = CanvasGradingService(canvas_url, api_key, gemini_api_key)
        
        # Get all courses
        courses = canvas_service.get_available_courses()
        
        return {
            "status": "success",
            "courses": courses
        }
    except Exception as e:
        logger.error(f"Error listing Canvas courses: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing Canvas courses: {str(e)}")

@app.get("/canvas/courses/{course_id}/assignments")
async def list_canvas_assignments(
    course_id: int,
    canvas_url: str,
    api_key: str
):
    """
    List all assignments for a Canvas course.
    
    Args:
        course_id: Canvas course ID
        canvas_url: Canvas instance URL
        api_key: Canvas API key
    """
    try:
        # Use the grading service to get assignments
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        canvas_service = CanvasGradingService(canvas_url, api_key, gemini_api_key)
        
        # Get assignments for the course
        assignments = canvas_service.get_assignments_for_course(course_id)
        
        return {
            "status": "success",
            "course_id": course_id,
            "assignments": assignments
        }
    except Exception as e:
        logger.error(f"Error listing Canvas assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing Canvas assignments: {str(e)}")

@app.post("/canvas/grade-assignment")
async def grade_canvas_assignment(
    canvas_url: str = Form(...),
    api_key: str = Form(...),
    course_id: int = Form(...),
    assignment_id: int = Form(...),
    strictness: float = Form(0.5),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Grade a Canvas assignment using ScorePAL.
    
    Args:
        canvas_url: Canvas instance URL
        api_key: Canvas API key
        course_id: Canvas course ID
        assignment_id: Canvas assignment ID
        strictness: Grading strictness (0.0 to 1.0, default: 0.5)
    """
    try:
        # Generate a unique ID for this job
        job_id = str(uuid.uuid4())
        
        # Create output directory
        output_dir = directories["grading_results"] / job_id
        os.makedirs(output_dir, exist_ok=True)
        
        # Store job metadata
        metadata = {
            "id": job_id,
            "type": "canvas_assignment",
            "canvas_url": canvas_url,
            "course_id": course_id,
            "assignment_id": assignment_id,
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
        background_tasks.add_task(
            process_canvas_assignment,
            job_id=job_id,
            canvas_url=canvas_url,
            api_key=api_key,
            course_id=course_id,
            assignment_id=assignment_id,
            strictness=strictness,
            output_dir=output_dir
        )
        
        return {
            "status": "success",
            "message": "Grading job started",
            "job_id": job_id
        }
    except Exception as e:
        logger.error(f"Error starting Canvas grading job: {e}")
        raise HTTPException(status_code=500, detail=f"Error starting Canvas grading job: {str(e)}")

@app.get("/canvas/jobs/{job_id}")
async def get_canvas_job_status(job_id: str):
    """
    Get the status of a Canvas grading job.
    
    Args:
        job_id: Canvas grading job ID
    """
    try:
        # Find the job directory
        job_dir = directories["grading_results"] / job_id
        
        if not job_dir.exists():
            raise HTTPException(status_code=404, detail=f"Canvas grading job {job_id} not found")
        
        # Read the metadata file
        metadata_path = job_dir / "metadata.json"
        if not metadata_path.exists():
            raise HTTPException(status_code=404, detail=f"Canvas grading job metadata not found")
        
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        
        # Check if results are available
        results_path = job_dir / "grading_results.json"
        results_available = results_path.exists()
        
        response = {
            "job_id": job_id,
            "status": metadata.get("status", "unknown"),
            "type": metadata.get("type", "canvas_assignment"),
            "created_at": metadata.get("created_at", ""),
            "completed_at": metadata.get("completed_at", ""),
            "results_available": results_available
        }
        
        if results_available:
            response["results_url"] = f"/canvas/jobs/{job_id}/results"
        
        if "error" in metadata:
            response["error"] = metadata["error"]
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Canvas job status: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting Canvas job status: {str(e)}")

@app.get("/canvas/jobs/{job_id}/results")
async def get_canvas_job_results(job_id: str):
    """
    Get the results of a Canvas grading job.
    
    Args:
        job_id: Canvas grading job ID
    """
    try:
        # Find the job directory
        job_dir = directories["grading_results"] / job_id
        
        if not job_dir.exists():
            raise HTTPException(status_code=404, detail=f"Canvas grading job {job_id} not found")
        
        # Read the results file
        results_path = job_dir / "grading_results.json"
        if not results_path.exists():
            raise HTTPException(status_code=404, detail=f"Canvas grading results not found")
        
        with open(results_path, "r", encoding="utf-8") as f:
            results = json.load(f)
        
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Canvas job results: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting Canvas job results: {str(e)}")

@app.post("/canvas/post-grades/{job_id}")
async def post_canvas_grades(
    job_id: str,
    canvas_url: str = Form(...),
    api_key: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Post grades from a completed grading job back to Canvas.
    
    Args:
        job_id: Canvas grading job ID
        canvas_url: Canvas instance URL
        api_key: Canvas API key
    """
    try:
        # Find the job directory
        job_dir = directories["grading_results"] / job_id
        
        if not job_dir.exists():
            raise HTTPException(status_code=404, detail=f"Canvas grading job {job_id} not found")
        
        # Read the metadata file
        metadata_path = job_dir / "metadata.json"
        if not metadata_path.exists():
            raise HTTPException(status_code=404, detail=f"Canvas grading job metadata not found")
        
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        
        # Check if job is completed
        if metadata.get("status") != "completed":
            raise HTTPException(status_code=400, detail=f"Canvas grading job is not completed yet")
        
        # Read the results file
        results_path = job_dir / "grading_results.json"
        if not results_path.exists():
            raise HTTPException(status_code=404, detail=f"Canvas grading results not found")
        
        with open(results_path, "r", encoding="utf-8") as f:
            results = json.load(f)
        
        # Start the posting task in the background
        background_tasks.add_task(
            post_canvas_grades_task,
            job_id=job_id,
            canvas_url=canvas_url,
            api_key=api_key,
            course_id=metadata.get("course_id"),
            assignment_id=metadata.get("assignment_id"),
            results=results
        )
        
        return {
            "status": "success",
            "message": "Posting grades to Canvas has started",
            "job_id": job_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error posting Canvas grades: {e}")
        raise HTTPException(status_code=500, detail=f"Error posting Canvas grades: {str(e)}")

async def process_canvas_assignment(
    job_id: str,
    canvas_url: str,
    api_key: str,
    course_id: int,
    assignment_id: int,
    strictness: float,
    output_dir: Path
):
    """Process a Canvas assignment in the background."""
    try:
        # Update job status
        update_job_status(job_id, "processing", output_dir)
        
        # Create Canvas grading service
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        canvas_service = CanvasGradingService(canvas_url, api_key, gemini_api_key)
        
        # Process the assignment
        success, message, results = canvas_service.process_assignment(
            course_id, assignment_id, output_dir
        )
        
        # Update job status
        if success:
            update_job_status(job_id, "completed", output_dir)
        else:
            update_job_status(job_id, "failed", output_dir, message)
        
        logger.info(f"Canvas assignment processing completed: {message}")
    except Exception as e:
        logger.error(f"Error processing Canvas assignment: {e}")
        update_job_status(job_id, "failed", output_dir, str(e))

async def post_canvas_grades_task(
    job_id: str,
    canvas_url: str,
    api_key: str,
    course_id: int,
    assignment_id: int,
    results: Dict[str, Any]
):
    """Post grades to Canvas in the background."""
    try:
        # Update job status
        output_dir = directories["grading_results"] / job_id
        update_job_status(job_id, "posting_grades", output_dir)
        
        # Create Canvas grading service
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        canvas_service = CanvasGradingService(canvas_url, api_key, gemini_api_key)
        
        # Prepare grades for posting
        grades = {}
        for user_id, submission in results.get("submissions", {}).items():
            if "grading_result" in submission:
                grading_result = submission["grading_result"]
                if "score" in grading_result:
                    grades[user_id] = {
                        "grade": grading_result["score"],
                        "comment": grading_result.get("feedback", "")
                    }
        
        # Post grades to Canvas
        success, message, post_results = canvas_service.post_grades_to_canvas(
            course_id, assignment_id, grades
        )
        
        # Save posting results
        posting_results_path = output_dir / "posting_results.json"
        with open(posting_results_path, "w", encoding="utf-8") as f:
            json.dump(post_results, f, indent=2)
        
        # Update job status
        if success:
            update_job_status(job_id, "grades_posted", output_dir, message)
        else:
            update_job_status(job_id, "posting_failed", output_dir, message)
        
        logger.info(f"Canvas grades posting completed: {message}")
    except Exception as e:
        logger.error(f"Error posting Canvas grades: {e}")
        update_job_status(job_id, "posting_failed", output_dir, str(e))

def update_job_status(job_id: str, status: str, output_dir: Path, error: str = None):
    """Update the status of a Canvas job."""
    try:
        # Read the existing metadata
        metadata_path = output_dir / "metadata.json"
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        
        # Update the status
        metadata["status"] = status
        
        # Add error if provided
        if error:
            metadata["error"] = error
        
        # Add timestamp if completed
        if status in ["completed", "failed", "grades_posted", "posting_failed"]:
            metadata["completed_at"] = datetime.now().isoformat()
        
        # Save updated metadata
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Error updating job status: {e}")

def get_canvas_service() -> CanvasGradingService:
    """Dependency to get Canvas service instance."""
    settings = get_settings()
    return CanvasGradingService(
        canvas_url=settings.canvas_url,
        canvas_api_key=settings.canvas_api_key,
        gemini_api_key=settings.gemini_api_key
    )

@app.get("/api/canvas/test")
async def test_canvas_connection(canvas_service: CanvasGradingService = Depends(get_canvas_service)):
    """Test Canvas connection."""
    try:
        is_connected = canvas_service.test_connection()
        return {"success": is_connected, "message": "Connection successful" if is_connected else "Connection failed"}
    except Exception as e:
        logger.error(f"Error testing Canvas connection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/canvas/courses")
async def get_courses(canvas_service: CanvasGradingService = Depends(get_canvas_service)):
    """Get all available courses."""
    try:
        courses = canvas_service.get_available_courses()
        return {"success": True, "courses": courses}
    except Exception as e:
        logger.error(f"Error getting courses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/canvas/courses/{course_id}/assignments")
async def get_assignments(
    course_id: int,
    canvas_service: CanvasGradingService = Depends(get_canvas_service)
):
    """Get all assignments for a course."""
    try:
        assignments = canvas_service.get_assignments_for_course(course_id)
        return {"success": True, "assignments": assignments}
    except Exception as e:
        logger.error(f"Error getting assignments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/canvas/courses/{course_id}/assignments/{assignment_id}/submissions")
async def get_submissions(
    course_id: int,
    assignment_id: int,
    include: Optional[List[str]] = Query(None),
    per_page: int = Query(100, ge=1, le=100),
    canvas_service: CanvasGradingService = Depends(get_canvas_service)
):
    """
    Get all submissions for an assignment with pagination.
    
    Args:
        course_id: Canvas course ID
        assignment_id: Canvas assignment ID
        include: List of additional data to include (e.g., ['submission_history', 'submission_comments'])
        per_page: Number of submissions per page (1-100)
    """
    try:
        result = canvas_service.get_submissions_for_assignment(
            course_id=course_id,
            assignment_id=assignment_id,
            include=include,
            per_page=per_page
        )
        return result
    except Exception as e:
        logger.error(f"Error getting submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/canvas/courses/{course_id}/assignments/{assignment_id}/submissions/{user_id}")
async def get_submission_details(
    course_id: int,
    assignment_id: int,
    user_id: int,
    canvas_service: CanvasGradingService = Depends(get_canvas_service)
):
    """
    Get detailed information about a specific submission.
    
    Args:
        course_id: Canvas course ID
        assignment_id: Canvas assignment ID
        user_id: Canvas user ID
    """
    try:
        result = canvas_service.get_submission_details(
            course_id=course_id,
            assignment_id=assignment_id,
            user_id=user_id
        )
        return result
    except Exception as e:
        logger.error(f"Error getting submission details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/canvas/direct-test")
async def direct_test_canvas_connection(
    canvas_url: str,
    api_key: str
):
    """
    Test Canvas connection with direct credentials.
    
    This endpoint accepts the Canvas URL and API key directly as query parameters,
    which can help bypass configuration issues.
    
    Args:
        canvas_url: Canvas instance URL (e.g., 'https://sjsu.instructure.com')
        api_key: Canvas API key
    """
    try:
        logger.info(f"Testing direct connection to Canvas at {canvas_url}")
        # Create a Canvas service with the provided credentials
        canvas_service = CanvasGradingService(
            canvas_url=canvas_url,
            canvas_api_key=api_key,
            gemini_api_key=get_settings().gemini_api_key or ""
        )
        
        # Test the connection
        is_connected = canvas_service.test_connection()
        
        return {
            "success": is_connected,
            "message": "Connection successful" if is_connected else "Connection failed",
            "canvas_url": canvas_url
        }
    except Exception as e:
        logger.error(f"Error in direct Canvas connection test: {str(e)}")
        return {
            "success": False,
            "message": f"Error: {str(e)}",
            "error_details": str(e),
            "canvas_url": canvas_url
        }

@app.get("/api/canvas/direct/courses/{course_id}/assignments/{assignment_id}/submissions")
async def direct_get_submissions(
    course_id: int,
    assignment_id: int,
    canvas_url: str,
    api_key: str,
    include: Optional[List[str]] = Query(None),
    per_page: int = Query(100, ge=1, le=100)
):
    """
    Get all submissions for an assignment with direct Canvas credentials.
    
    This endpoint accepts the Canvas URL and API key directly as query parameters,
    which can help bypass configuration issues.
    
    Args:
        course_id: Canvas course ID
        assignment_id: Canvas assignment ID
        canvas_url: Canvas instance URL
        api_key: Canvas API key
        include: List of additional data to include (e.g., ['submission_history', 'submission_comments'])
        per_page: Number of submissions per page (1-100)
    """
    try:
        logger.info(f"Getting submissions for course {course_id}, assignment {assignment_id} from {canvas_url}")
        
        # Create a Canvas service with the provided credentials
        canvas_service = CanvasGradingService(
            canvas_url=canvas_url,
            canvas_api_key=api_key,
            gemini_api_key=get_settings().gemini_api_key or ""
        )
        
        # Get submissions
        result = canvas_service.get_submissions_for_assignment(
            course_id=course_id,
            assignment_id=assignment_id,
            include=include,
            per_page=per_page
        )
        
        return result
    except Exception as e:
        logger.error(f"Error getting submissions directly: {str(e)}")
        return {
            "success": False,
            "message": f"Error: {str(e)}",
            "error_details": str(e),
            "submissions": []
        }

# Import and initialize Canvas service
try:
    canvas_service_global = None
    logger.info("Canvas service will be initialized on demand")
except Exception as e:
    logger.error(f"Error initializing Canvas service: {e}")

# Add Canvas specific router
canvas_router = APIRouter(prefix="/api/canvas", tags=["canvas"])

@canvas_router.post("/initialize")
async def initialize_canvas(
    request: Request,
    api_key: str = Form(None) # canvas_url is removed from parameters
):
    """
    Initialize Canvas integration with user-provided credentials.
    Stores the credentials in memory for the session.
    Canvas URL is hardcoded to SJSU.
    Accepts both form data and JSON data for api_key.
    """
    try:
        global canvas_service_global
        
        # Hardcode Canvas URL
        canvas_url = "https://sjsu.instructure.com/" # Hardcoded
        
        # Check if we're getting form data or JSON for api_key
        content_type = request.headers.get("content-type", "")
        
        # For form data requests
        if "form" in content_type or "x-www-form-urlencoded" in content_type:
            if api_key is None: # api_key is passed as Form(None) initially
                form_data = await request.form()
                if "api_key" in form_data:
                    api_key = form_data["api_key"]
        # For JSON requests
        elif "json" in content_type:
            if api_key is None: # api_key is passed as Form(None) initially
                try:
                    json_data = await request.json()
                    if "api_key" in json_data:
                        api_key = json_data["api_key"]
                except:
                    logger.error("Failed to parse JSON body for api_key")
        
        # Validate required parameters
        if not api_key: # Only api_key needs validation now
            logger.error("Missing required parameter: api_key")
            return {
                "status": "error",
                "message": "API key is required"
            }
            
        # Ensure api_key is a string
        api_key = str(api_key)
        
        # Format bearer token if needed
        if not api_key.startswith("Bearer ") and len(api_key) > 30:
            api_key = f"Bearer {api_key}"
            
        logger.info(f"Connecting to Canvas at: {canvas_url}") # canvas_url is now hardcoded
        gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        canvas_service_global = CanvasGradingService(canvas_url, api_key, gemini_api_key)
        
        # Test the connection
        connection_successful = canvas_service_global.test_connection()
        
        if connection_successful:
            logger.info(f"Successfully connected to Canvas at {canvas_url}")
            return {
                "status": "success",
                "message": "Successfully connected to Canvas LMS"
            }
        else:
            logger.error(f"Failed to connect to Canvas at {canvas_url}")
            return {
                "status": "error",
                "message": "Failed to connect to Canvas LMS. Please check your credentials."
            }
    except Exception as e:
        logger.error(f"Error initializing Canvas: {str(e)}")
        return {
            "status": "error",
            "message": f"Error initializing Canvas: {str(e)}"
        }

@canvas_router.get("/courses")
async def get_canvas_courses():
    """Get all courses available in Canvas using stored credentials."""
    try:
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas not initialized. Please initialize with credentials first."
            }
        
        courses = canvas_service_global.get_available_courses()
        
        return {
            "status": "success",
            "courses": courses
        }
    except Exception as e:
        logger.error(f"Error getting Canvas courses: {str(e)}")
        return {
            "status": "error", 
            "message": f"Error getting Canvas courses: {str(e)}"
        }

@canvas_router.get("/courses/{course_id}/assignments")
async def get_canvas_assignments(course_id: int):
    """Get all assignments for a specific Canvas course."""
    try:
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas not initialized. Please initialize with credentials first."
            }
        
        assignments = canvas_service_global.get_assignments_for_course(course_id)
        
        return {
            "status": "success",
            "course_id": course_id,
            "assignments": assignments
        }
    except Exception as e:
        logger.error(f"Error getting Canvas assignments: {str(e)}")
        return {
            "status": "error",
            "message": f"Error getting Canvas assignments: {str(e)}"
        }

@canvas_router.get("/courses/{course_id}/assignments/{assignment_id}/submissions")
async def get_canvas_submissions(
    course_id: int, 
    assignment_id: int,
    include: Optional[List[str]] = Query(None)
):
    """Get all submissions for a specific Canvas assignment."""
    try:
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas not initialized. Please initialize with credentials first."
            }
        
        submissions = canvas_service_global.get_submissions_for_assignment(
            course_id, 
            assignment_id,
            include=include
        )
        
        return submissions
    except Exception as e:
        logger.error(f"Error getting Canvas submissions: {str(e)}")
        return {
            "status": "error",
            "message": f"Error getting Canvas submissions: {str(e)}"
        }

@canvas_router.post("/courses/{course_id}/assignments/{assignment_id}/grade")
async def grade_canvas_assignment(
    course_id: int,
    assignment_id: int,
    background_tasks: BackgroundTasks
):
    """Grade a Canvas assignment using ScorePAL."""
    try:
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas not initialized. Please initialize with credentials first."
            }
        
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Create output directory
        output_dir = directories["grading_results"] / job_id
        os.makedirs(output_dir, exist_ok=True)
        
        # Store job metadata
        metadata = {
            "id": job_id,
            "type": "canvas_assignment",
            "course_id": course_id,
            "assignment_id": assignment_id,
            "status": "queued",
            "created_at": datetime.now().isoformat(),
            "output_dir": str(output_dir)
        }
        
        # Save metadata
        metadata_path = output_dir / "metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        
        # Start the grading task in the background
        background_tasks.add_task(
            process_canvas_assignment_task,
            job_id=job_id,
            course_id=course_id,
            assignment_id=assignment_id,
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

@canvas_router.get("/jobs/{job_id}")
async def get_canvas_job_status(job_id: str):
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

@canvas_router.get("/jobs/{job_id}/results")
async def get_canvas_job_results(job_id: str):
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

@canvas_router.post("/jobs/{job_id}/post-grades")
async def post_canvas_grades(
    job_id: str,
    background_tasks: BackgroundTasks
):
    """Post grades from a completed grading job back to Canvas."""
    try:
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas not initialized. Please initialize with credentials first."
            }
        
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
        
        # Check if job is completed
        if metadata.get("status") != "completed":
            return {
                "status": "error",
                "message": f"Canvas grading job is not completed yet (status: {metadata.get('status')})"
            }
        
        # Read the results file
        results_path = job_dir / "grading_results.json"
        if not results_path.exists():
            return {
                "status": "error",
                "message": f"Canvas grading results not found"
            }
        
        with open(results_path, "r", encoding="utf-8") as f:
            results = json.load(f)
        
        # Start the posting task in the background
        background_tasks.add_task(
            post_canvas_grades_task,
            job_id=job_id,
            course_id=metadata.get("course_id"),
            assignment_id=metadata.get("assignment_id"),
            results=results
        )
        
        return {
            "status": "success",
            "message": "Posting grades to Canvas has started",
            "job_id": job_id
        }
    except Exception as e:
        logger.error(f"Error posting Canvas grades: {str(e)}")
        return {
            "status": "error",
            "message": f"Error posting Canvas grades: {str(e)}"
        }

async def process_canvas_assignment_task(
    job_id: str,
    course_id: int,
    assignment_id: int,
    output_dir: Path
):
    """Process a Canvas assignment in the background."""
    try:
        # Update job status
        update_job_status(job_id, "processing", output_dir)
        
        # Process the assignment using the global Canvas service
        if not canvas_service_global:
            update_job_status(job_id, "failed", output_dir, "Canvas service not initialized")
            return
        
        # Process the assignment
        success, message, results = canvas_service_global.process_assignment(
            course_id, assignment_id, output_dir
        )
        
        # Update job status
        if success:
            update_job_status(job_id, "completed", output_dir)
        else:
            update_job_status(job_id, "failed", output_dir, message)
        
        logger.info(f"Canvas assignment processing completed: {message}")
    except Exception as e:
        logger.error(f"Error processing Canvas assignment: {e}")
        update_job_status(job_id, "failed", output_dir, str(e))

async def post_canvas_grades_task(
    job_id: str,
    course_id: int,
    assignment_id: int,
    results: Dict[str, Any]
):
    """Post grades to Canvas in the background."""
    try:
        # Update job status
        output_dir = directories["grading_results"] / job_id
        update_job_status(job_id, "posting_grades", output_dir)
        
        if not canvas_service_global:
            update_job_status(job_id, "posting_failed", output_dir, "Canvas service not initialized")
            return
        
        # Prepare grades for posting
        grades = {}
        for user_id, submission in results.get("submissions", {}).items():
            if "grading_result" in submission:
                grading_result = submission["grading_result"]
                if "score" in grading_result:
                    grades[user_id] = {
                        "grade": grading_result["score"],
                        "comment": grading_result.get("feedback", "")
                    }
        
        # Post grades to Canvas
        success, message, post_results = canvas_service_global.post_grades_to_canvas(
            course_id, assignment_id, grades
        )
        
        # Save posting results
        posting_results_path = output_dir / "posting_results.json"
        with open(posting_results_path, "w", encoding="utf-8") as f:
            json.dump(post_results, f, indent=2)
        
        # Update job status
        if success:
            update_job_status(job_id, "grades_posted", output_dir, message)
        else:
            update_job_status(job_id, "posting_failed", output_dir, message)
        
        logger.info(f"Canvas grades posting completed: {message}")
    except Exception as e:
        logger.error(f"Error posting Canvas grades: {e}")
        update_job_status(job_id, "posting_failed", output_dir, str(e))

# Include the Canvas router
app.include_router(canvas_router)

# Add new Canvas endpoints
@app.post("/canvas/initialize")
async def canvas_initialize_redirect(
    request: Request
    # No specific parameters needed here as initialize_canvas will extract api_key
):
    """
    Redirect endpoint for /canvas/initialize to forward to /api/canvas/initialize
    This is needed because of Next.js rewrites configuration
    """
    try:
        # Call the /api/canvas/initialize endpoint
        # We only pass the request; initialize_canvas will handle api_key extraction
        return await initialize_canvas(request)
    except Exception as e:
        logger.error(f"Error in Canvas redirect: {str(e)}")
        return {
            "status": "error",
            "message": f"Error initializing Canvas: {str(e)}"
        }

@canvas_router.post("/grade-assignment")
async def grade_canvas_assignment(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Grade a Canvas assignment using ScorePAL with hardcoded IDs."""
    try:
        if not canvas_service_global:
            return {
                "status": "error",
                "message": "Canvas not initialized. Please initialize with credentials first."
            }
        
        # Hardcoded values for course and assignment
        COURSE_ID = 1589225  # Hardcoded course ID
        ASSIGNMENT_ID = 7133587  # Hardcoded assignment ID
        
        # Try to get API key from request if needed for this endpoint
        api_key = None
        try:
            body = await request.json()
            api_key = body.get('api_key')
        except:
            # Fallback to session-based authentication
            pass
        
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Create output directory
        output_dir = directories["grading_results"] / job_id
        os.makedirs(output_dir, exist_ok=True)
        
        # Store job metadata
        metadata = {
            "id": job_id,
            "type": "canvas_assignment",
            "course_id": COURSE_ID,  # Use hardcoded course ID
            "assignment_id": ASSIGNMENT_ID,  # Use hardcoded assignment ID
            "status": "queued",
            "created_at": datetime.now().isoformat(),
            "output_dir": str(output_dir)
        }
        
        # Save metadata
        metadata_path = output_dir / "metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        
        # Start the grading task in the background
        background_tasks.add_task(
            process_canvas_assignment_task,
            job_id=job_id,
            course_id=COURSE_ID,  # Use hardcoded course ID
            assignment_id=ASSIGNMENT_ID,  # Use hardcoded assignment ID
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

@canvas_router.post("/get-submissions")
async def get_canvas_submissions_by_post(
    request: Request
):
    """
    Get submissions for a specific Canvas assignment via POST request.
    Uses the Canvas API directly with the provided credentials.
    """
    try:
        # Extract request data
        data = await request.json()
        course_id = data.get("course_id")
        assignment_id = data.get("assignment_id")
        api_key = data.get("api_key")
        
        # Validate required parameters
        if not course_id or not assignment_id or not api_key:
            logger.error("Missing required parameters")
            return {
                "status": "error",
                "message": "Course ID, Assignment ID, and API key are required"
            }
            
        # Create a Canvas service instance with the provided credentials
        canvas_url = "https://sjsu.instructure.com"  # Hardcoded Canvas URL
        canvas_service = CanvasGradingService(
            canvas_url=canvas_url,
            canvas_api_key=api_key,
            gemini_api_key=os.getenv("GEMINI_API_KEY", "")
        )
        
        # Test connection first
        if not canvas_service.test_connection():
            return {
                "status": "error",
                "message": "Failed to connect to Canvas. Please check your API key."
            }
        
        # Get submissions using the Canvas service
        result = canvas_service.get_submissions_for_assignment(
            course_id=int(course_id),
            assignment_id=int(assignment_id),
            include=['user', 'attachments']
        )
        
        if result.get('success', False):
            return {
                "status": "success",
                "course": result.get('course', {}),
                "assignment": result.get('assignment', {}),
                "submissions": result.get('submissions', []),
                "total_count": result.get('total_count', 0)
            }
        else:
            return {
                "status": "error",
                "message": result.get('message', 'Failed to get submissions')
            }
        
    except Exception as e:
        logger.error(f"Error getting Canvas submissions: {str(e)}")
        return {
            "status": "error",
            "message": f"Error getting Canvas submissions: {str(e)}"
        }

if __name__ == "__main__":
    # Adjust directories based on the new project structure
    for dir_name, dir_path in directories.items():
        if not dir_path.exists():
            logger.info(f"Creating directory: {dir_path}")
            dir_path.mkdir(parents=True, exist_ok=True)
            
    # Start the API server
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
    # Log startup
    logger.info("API server started successfully") 