from ..celery_worker import celery_app

@celery_app.task
def generate_feedback_task(graded_data: dict):
    """Celery task to generate human-readable feedback from graded data."""
    submission_id = graded_data.get('submission_id', 'N/A')
    grade = graded_data.get('grade', 'N/A')
    raw_feedback = graded_data.get('raw_feedback', 'No raw feedback')
    print(f"Generating feedback for submission {submission_id} (Grade: {grade})")
    # Placeholder for actual feedback generation logic (e.g., using an LLM)
    human_readable_feedback = f"Overall grade: {grade}%. {raw_feedback} Please review the rubric for details."
    return {"status": "feedback_generated", "submission_id": submission_id, "feedback": human_readable_feedback} 