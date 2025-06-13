"""
Multi-agent grading system for ScorePAL.

This module implements a parallel grading system using multiple worker processes
to grade submissions simultaneously for improved performance.
"""

import os
import json
import logging
import time
import uuid
import asyncio
import concurrent.futures
import multiprocessing
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

from grading_v2 import GradingService
from utils.knowledge_graph import KnowledgeGraph

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Maximum number of parallel workers
MAX_WORKERS = int(os.getenv("MAX_GRADING_WORKERS", "10"))

class GradingWorker:
    """Worker for grading submissions in parallel."""
    
    def __init__(self, gemini_api_key: str = None):
        """Initialize the grading worker."""
        self.grading_service = GradingService(gemini_api_key or os.getenv("GEMINI_API_KEY"))
        self.kg = KnowledgeGraph()
        
    def grade_submission(self, 
                        submission_text: str, 
                        question_text: str, 
                        answer_key: str, 
                        student_name: str,
                        assignment_id: str,
                        rubric: Dict[str, Any], 
                        strictness: float = 0.5,
                        file_path: str = None) -> Dict[str, Any]:
        """
        Grade a single submission using the grading service with enhanced image analysis.
        
        Args:
            submission_text: The student's submission text
            question_text: The assignment question text
            answer_key: The answer key text
            student_name: The student's name
            assignment_id: The assignment ID
            rubric: The grading rubric
            strictness: Grading strictness (0.0 to 1.0)
            file_path: Optional path to original submission file for image extraction
            
        Returns:
            The grading result
        """
        try:
            # Enhance submission with image analysis if file path is provided
            enhanced_submission = submission_text
            image_enhanced = False
            
            if file_path and os.path.exists(file_path):
                try:
                    from enhanced_image_extraction import enhance_submission_with_images
                    context = f"Assignment: {assignment_id}, Student: {student_name}"
                    enhanced_submission = enhance_submission_with_images(
                        submission_text, file_path, context
                    )
                    image_enhanced = enhanced_submission != submission_text
                    if image_enhanced:
                        logger.info(f"Enhanced submission for {student_name} with AI vision analysis")
                except Exception as img_error:
                    logger.warning(f"Image enhancement failed for {student_name}: {img_error}")
                    # Continue with original submission if image enhancement fails
            
            # Use the grading service to grade the enhanced submission
            result = self.grading_service.grade_submission(
                submission_text=enhanced_submission,
                question_text=question_text,
                answer_key=answer_key,
                student_name=student_name,
                rubric=rubric,
                strictness=strictness
            )
            
            if not result:
                raise ValueError("Grading service returned empty result")
                
            # Generate a unique submission ID
            submission_id = f"{assignment_id}_{student_name.replace(' ', '_').lower()}_{uuid.uuid4().hex[:8]}"
            
            # Save to Knowledge Graph storage
            self.kg.add_submission_to_knowledge_graph(
                submission_id=submission_id,
                assignment_id=assignment_id,
                student_name=student_name,
                submission_text=submission_text,
                grade_data={
                    "score": result.get("score", 0),
                    "total": result.get("max_score", 100),
                    "grading_feedback": result.get("feedback", ""),
                    "criterion_scores": result.get("criteria_scores", {})
                }
            )
            
            # Also save the full result
            self.kg.save_grading_result(
                assignment_id=assignment_id,
                student_name=student_name,
                result_data=result
            )
            
            # Add image enhancement info to result
            result['image_enhanced'] = image_enhanced
            
            return result
        except Exception as e:
            logger.error(f"Error grading submission for {student_name}: {e}")
            return {
                "error": str(e),
                "student_name": student_name,
                "score": 0,
                "max_score": 100,
                "percentage": 0,
                "feedback": f"Error grading submission: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

class MultiAgentGradingSystem:
    """
    Multi-agent grading system for parallel processing of submissions.
    """
    
    def __init__(self, max_workers: int = None):
        """
        Initialize the multi-agent grading system.
        
        Args:
            max_workers: Maximum number of worker processes (default: 10)
        """
        self.max_workers = max_workers or MAX_WORKERS
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        # Ensure we don't exceed available CPUs
        available_cpus = multiprocessing.cpu_count()
        if self.max_workers > available_cpus:
            logger.warning(f"Requested {self.max_workers} workers but only {available_cpus} CPUs available. Using {available_cpus} workers.")
            self.max_workers = available_cpus
        
        logger.info(f"Initializing Multi-Agent Grading System with {self.max_workers} workers")
    
    async def grade_batch(self, 
                         submissions: Dict[str, str],
                         question_text: str,
                         answer_key: str,
                         assignment_id: str,
                         rubric: Dict[str, Any],
                         strictness: float = 0.5) -> Dict[str, Any]:
        """
        Grade a batch of submissions in parallel.
        
        Args:
            submissions: Dictionary mapping student names to submission texts
            question_text: The assignment question text
            answer_key: The answer key text
            assignment_id: The assignment ID
            rubric: The grading rubric
            strictness: Grading strictness (0.0 to 1.0)
            
        Returns:
            Dictionary of grading results by student name
        """
        start_time = time.time()
        logger.info(f"Starting batch grading for {len(submissions)} submissions with {self.max_workers} workers")
        
        # Prepare the arguments for each submission
        grading_tasks = []
        for student_name, submission_text in submissions.items():
            grading_tasks.append({
                "submission_text": submission_text,
                "question_text": question_text,
                "answer_key": answer_key,
                "student_name": student_name,
                "assignment_id": assignment_id,
                "rubric": rubric,
                "strictness": strictness
            })
        
        # Use ProcessPoolExecutor for true parallel processing
        results = {}
        with concurrent.futures.ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            # Create a worker for each submission
            futures = []
            for task in grading_tasks:
                future = executor.submit(
                    self._grade_submission_worker,
                    self.gemini_api_key,
                    task["submission_text"],
                    task["question_text"],
                    task["answer_key"],
                    task["student_name"],
                    task["assignment_id"],
                    task["rubric"],
                    task["strictness"]
                )
                futures.append((task["student_name"], future))
            
            # Process results as they complete
            for student_name, future in futures:
                try:
                    result = future.result()
                    results[student_name] = result
                    logger.info(f"Completed grading for {student_name}: Score={result.get('score', 'N/A')}")
                except Exception as e:
                    logger.error(f"Error in grading task for {student_name}: {e}")
                    results[student_name] = {
                        "error": str(e),
                        "student_name": student_name,
                        "score": 0,
                        "max_score": 100,
                        "percentage": 0,
                        "feedback": f"Error grading submission: {str(e)}",
                        "timestamp": datetime.now().isoformat()
                    }
        
        # Calculate batch statistics
        total_score = 0
        passed_count = 0
        for result in results.values():
            if "score" in result:
                total_score += result["score"]
                if result["score"] >= 60:  # Assuming 60% is passing
                    passed_count += 1
        
        avg_score = total_score / len(results) if results else 0
        pass_rate = passed_count / len(results) if results else 0
        
        # Prepare batch summary
        summary = {
            "assignment_id": assignment_id,
            "submission_count": len(submissions),
            "average_score": avg_score,
            "pass_rate": pass_rate,
            "completed_at": datetime.now().isoformat(),
            "processing_time_seconds": time.time() - start_time
        }
        
        # Save the batch results to storage
        self._save_batch_results(assignment_id, results, summary)
        
        logger.info(f"Completed batch grading: {len(results)} submissions in {time.time() - start_time:.2f} seconds")
        logger.info(f"Average score: {avg_score:.2f}, Pass rate: {pass_rate:.2%}")
        
        return {
            "results": results,
            "summary": summary
        }
    
    @staticmethod
    def _grade_submission_worker(gemini_api_key: str,
                               submission_text: str,
                               question_text: str,
                               answer_key: str,
                               student_name: str,
                               assignment_id: str,
                               rubric: Dict[str, Any],
                               strictness: float) -> Dict[str, Any]:
        """
        Static method for grading a submission in a worker process.
        
        This is a separate method to allow it to be pickled for multiprocessing.
        """
        worker = GradingWorker(gemini_api_key=gemini_api_key)
        return worker.grade_submission(
            submission_text=submission_text,
            question_text=question_text,
            answer_key=answer_key,
            student_name=student_name,
            assignment_id=assignment_id,
            rubric=rubric,
            strictness=strictness
        )
    
    def _save_batch_results(self, assignment_id: str, results: Dict[str, Any], summary: Dict[str, Any]):
        """
        Save batch results to storage.
        
        Args:
            assignment_id: The assignment ID
            results: Dictionary of grading results by student name
            summary: Batch summary statistics
        """
        try:
            # Create the results directory if it doesn't exist
            # Use a more organized folder structure for batch grading results
            import os
            from pathlib import Path
            
            # Get the base directory path
            base_dir = Path(os.getenv("GRADING_RESULTS_PATH", "data/grading_results"))
            assignment_dir = base_dir / assignment_id
            
            # Create a dedicated batch results directory
            batch_dir = assignment_dir / "batch_results"
            student_results_dir = batch_dir / "student_results"
            
            # Create all needed directories
            for directory in [assignment_dir, batch_dir, student_results_dir]:
                directory.mkdir(parents=True, exist_ok=True)
            
            # Save the summary
            with open(batch_dir / "summary.json", 'w') as f:
                json.dump(summary, f, indent=2)
            
            # Save the combined results
            with open(batch_dir / "all_results.json", 'w') as f:
                json.dump({
                    "assignment_id": assignment_id,
                    "timestamp": datetime.now().isoformat(),
                    "results": results,
                    "summary": summary
                }, f, indent=2)
            
            # Save individual student results
            for student_name, result in results.items():
                safe_name = student_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
                with open(student_results_dir / f"{safe_name}_result.json", 'w') as f:
                    json.dump(result, f, indent=2)
            
            # Also save results in the original location for backward compatibility
            with open(assignment_dir / "summary.json", 'w') as f:
                json.dump(summary, f, indent=2)
            
            for student_name, result in results.items():
                safe_name = student_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
                with open(assignment_dir / f"{safe_name}_result.json", 'w') as f:
                    json.dump(result, f, indent=2)
            
            logger.info(f"Saved batch results for assignment {assignment_id}")
        except Exception as e:
            logger.error(f"Error saving batch results: {e}")
    
    async def grade_single(self,
                         submission_text: str,
                         question_text: str,
                         answer_key: str,
                         student_name: str,
                         assignment_id: str,
                         rubric: Dict[str, Any],
                         strictness: float = 0.5,
                         file_path: str = None) -> Dict[str, Any]:
        """
        Grade a single submission with enhanced image analysis.
        
        Args:
            submission_text: The student's submission text
            question_text: The assignment question text
            answer_key: The answer key text
            student_name: The student's name
            assignment_id: The assignment ID
            rubric: The grading rubric
            strictness: Grading strictness (0.0 to 1.0)
            file_path: Optional path to original submission file for image enhancement
            
        Returns:
            The grading result
        """
        logger.info(f"Starting single grading for {student_name} with AI vision enhancement")
        worker = GradingWorker(gemini_api_key=self.gemini_api_key)
        result = worker.grade_submission(
            submission_text=submission_text,
            question_text=question_text,
            answer_key=answer_key,
            student_name=student_name,
            assignment_id=assignment_id,
            rubric=rubric,
            strictness=strictness,
            file_path=file_path
        )
        logger.info(f"Completed grading for {student_name}: Score={result.get('score', 'N/A')}")
        return result 