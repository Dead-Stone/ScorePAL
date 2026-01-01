"""
Migration script to migrate existing JSON-based grading results to MongoDB.
Scans grading_results and synced_submissions directories and imports data.
"""

import os
import sys
import json
import asyncio
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.mongodb_service import (
    get_results_collection,
    get_submissions_collection,
    get_assignments_collection,
    initialize_indexes
)
from services.results_service import save_grading_result

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def migrate_results_from_directory(results_dir: Path, assignment_id: str = None) -> Dict[str, Any]:
    """
    Migrate results from a directory structure.
    
    Args:
        results_dir: Directory containing result files
        assignment_id: Optional assignment ID (will be extracted from path if not provided)
    
    Returns:
        Migration statistics
    """
    stats = {
        "total_files": 0,
        "successful": 0,
        "failed": 0,
        "skipped": 0,
        "errors": []
    }
    
    if not results_dir.exists():
        logger.warning(f"Results directory does not exist: {results_dir}")
        return stats
    
    # Determine assignment_id from directory name if not provided
    if not assignment_id:
        assignment_id = results_dir.name
    
    # Look for result files
    result_files = list(results_dir.glob("*_results.json")) + list(results_dir.glob("*_result.json"))
    
    # Also check for batch_results subdirectory
    batch_dir = results_dir / "batch_results"
    if batch_dir.exists():
        student_results_dir = batch_dir / "student_results"
        if student_results_dir.exists():
            result_files.extend(list(student_results_dir.glob("*_result.json")))
    
    stats["total_files"] = len(result_files)
    logger.info(f"Found {len(result_files)} result files in {results_dir}")
    
    for result_file in result_files:
        try:
            # Read result file
            with open(result_file, "r", encoding="utf-8") as f:
                result_data = json.load(f)
            
            # Extract student name from filename or result data
            student_name = result_data.get("student_name", "")
            if not student_name:
                # Try to extract from filename
                filename = result_file.stem
                # Remove common suffixes
                for suffix in ["_result", "_results"]:
                    if filename.endswith(suffix):
                        filename = filename[:-len(suffix)]
                student_name = filename.replace("_", " ")
            
            # Check if result already exists in MongoDB
            results_collection = await get_results_collection()
            existing = await results_collection.find_one({
                "assignment_id": assignment_id,
                "student_name": student_name
            })
            
            if existing:
                logger.info(f"Result already exists for {student_name} in assignment {assignment_id}, skipping")
                stats["skipped"] += 1
                continue
            
            # Read related text files if available
            question_text = ""
            submission_text = ""
            answer_key_text = ""
            
            question_file = result_file.parent / "question.txt"
            if question_file.exists():
                with open(question_file, "r", encoding="utf-8") as f:
                    question_text = f.read()
            
            submission_file = result_file.parent / "submission.txt"
            if submission_file.exists():
                with open(submission_file, "r", encoding="utf-8") as f:
                    submission_text = f.read()
            
            answer_key_file = result_file.parent / "answer_key.txt"
            if answer_key_file.exists():
                with open(answer_key_file, "r", encoding="utf-8") as f:
                    answer_key_text = f.read()
            
            # Prepare result data for MongoDB
            result_data["question_text"] = question_text
            result_data["submission_text"] = submission_text
            result_data["answer_key"] = answer_key_text
            result_data["assignment_id"] = assignment_id
            
            # Save to MongoDB
            result_id = await save_grading_result(
                result_data=result_data,
                assignment_id=assignment_id,
                student_name=student_name
            )
            
            logger.info(f"Migrated result for {student_name} (ID: {result_id})")
            stats["successful"] += 1
            
        except Exception as e:
            logger.error(f"Error migrating result file {result_file}: {e}", exc_info=True)
            stats["failed"] += 1
            stats["errors"].append({
                "file": str(result_file),
                "error": str(e)
            })
    
    return stats


async def migrate_synced_submissions(synced_dir: Path) -> Dict[str, Any]:
    """
    Migrate results from synced_submissions directory (Canvas submissions).
    """
    stats = {
        "total_directories": 0,
        "successful": 0,
        "failed": 0,
        "skipped": 0,
        "errors": []
    }
    
    if not synced_dir.exists():
        logger.warning(f"Synced submissions directory does not exist: {synced_dir}")
        return stats
    
    # Look for assignment directories
    assignment_dirs = [d for d in synced_dir.iterdir() if d.is_dir()]
    stats["total_directories"] = len(assignment_dirs)
    
    for assignment_dir in assignment_dirs:
        assignment_id = assignment_dir.name
        logger.info(f"Processing assignment directory: {assignment_id}")
        
        # Look for grading_result.json files in subdirectories
        result_files = list(assignment_dir.rglob("grading_result.json"))
        
        for result_file in result_files:
            try:
                # Read result file
                with open(result_file, "r", encoding="utf-8") as f:
                    result_data = json.load(f)
                
                # Extract student information
                student_name = result_data.get("student_name", "")
                student_id = result_data.get("student_id", "")
                
                if not student_name:
                    # Try to get from directory structure
                    parent_dir = result_file.parent
                    student_name = parent_dir.name
                
                # Check if already exists
                results_collection = await get_results_collection()
                query = {"assignment_id": assignment_id}
                if student_id:
                    query["student_id"] = student_id
                else:
                    query["student_name"] = student_name
                
                existing = await results_collection.find_one(query)
                if existing:
                    logger.info(f"Result already exists for {student_name} in assignment {assignment_id}, skipping")
                    stats["skipped"] += 1
                    continue
                
                # Save to MongoDB
                result_id = await save_grading_result(
                    result_data=result_data,
                    assignment_id=assignment_id,
                    student_id=student_id if student_id else None,
                    student_name=student_name
                )
                
                logger.info(f"Migrated Canvas result for {student_name} (ID: {result_id})")
                stats["successful"] += 1
                
            except Exception as e:
                logger.error(f"Error migrating synced submission {result_file}: {e}", exc_info=True)
                stats["failed"] += 1
                stats["errors"].append({
                    "file": str(result_file),
                    "error": str(e)
                })
    
    return stats


async def main():
    """Main migration function."""
    logger.info("Starting migration of grading results to MongoDB...")
    
    # Initialize MongoDB indexes
    try:
        await initialize_indexes()
        logger.info("MongoDB indexes initialized")
    except Exception as e:
        logger.error(f"Error initializing indexes: {e}")
        return
    
    # Determine base directories
    backend_dir = Path(__file__).parent.parent
    data_dir = backend_dir / "data"
    grading_results_dir = data_dir / "grading_results"
    synced_submissions_dir = backend_dir / "synced_submissions"
    
    # Also check for alternative locations
    if not grading_results_dir.exists():
        grading_results_dir = backend_dir / "grading_results"
    
    total_stats = {
        "grading_results": {},
        "synced_submissions": {},
        "total_successful": 0,
        "total_failed": 0,
        "total_skipped": 0
    }
    
    # Migrate grading_results directory
    if grading_results_dir.exists():
        logger.info(f"Migrating from grading_results directory: {grading_results_dir}")
        
        # Process each assignment directory
        assignment_dirs = [d for d in grading_results_dir.iterdir() if d.is_dir()]
        logger.info(f"Found {len(assignment_dirs)} assignment directories")
        
        for assignment_dir in assignment_dirs:
            assignment_id = assignment_dir.name
            logger.info(f"Processing assignment: {assignment_id}")
            stats = await migrate_results_from_directory(assignment_dir, assignment_id)
            total_stats["grading_results"][assignment_id] = stats
            total_stats["total_successful"] += stats["successful"]
            total_stats["total_failed"] += stats["failed"]
            total_stats["total_skipped"] += stats["skipped"]
    else:
        logger.warning(f"Grading results directory not found: {grading_results_dir}")
    
    # Migrate synced_submissions directory
    if synced_submissions_dir.exists():
        logger.info(f"Migrating from synced_submissions directory: {synced_submissions_dir}")
        stats = await migrate_synced_submissions(synced_submissions_dir)
        total_stats["synced_submissions"] = stats
        total_stats["total_successful"] += stats["successful"]
        total_stats["total_failed"] += stats["failed"]
        total_stats["total_skipped"] += stats["skipped"]
    else:
        logger.warning(f"Synced submissions directory not found: {synced_submissions_dir}")
    
    # Print summary
    logger.info("=" * 60)
    logger.info("Migration Summary")
    logger.info("=" * 60)
    logger.info(f"Total successful: {total_stats['total_successful']}")
    logger.info(f"Total failed: {total_stats['total_failed']}")
    logger.info(f"Total skipped: {total_stats['total_skipped']}")
    
    # Save migration report
    report_file = backend_dir / "migration_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump({
            "migration_date": datetime.now().isoformat(),
            "stats": total_stats
        }, f, indent=2)
    
    logger.info(f"Migration report saved to: {report_file}")
    logger.info("Migration completed!")


if __name__ == "__main__":
    asyncio.run(main())

