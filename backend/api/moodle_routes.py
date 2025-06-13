from fastapi import APIRouter, HTTPException, Body
from backend.moodle_service import MoodleService
from backend.celery_worker import celery_app
from backend.agents.lms_integration_agent import fetch_moodle_courses_task, fetch_moodle_assignments_task, fetch_moodle_submissions_task

router = APIRouter()

def get_moodle_service(data):
    return MoodleService(data['base_url'], data['token'])

@router.post("/moodle/courses")
def moodle_courses(data: dict = Body(...)):
    try:
        # Asynchronously send the task to Celery
        task = fetch_moodle_courses_task.delay(data['base_url'], data['token'])
        return {"status": "success", "task_id": task.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/moodle/assignments")
def moodle_assignments(data: dict = Body(...)):
    try:
        # Asynchronously send the task to Celery
        task = fetch_moodle_assignments_task.delay(data['base_url'], data['token'], data['courseid'])
        return {"status": "success", "task_id": task.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/moodle/submissions")
def moodle_submissions(data: dict = Body(...)):
    try:
        # Asynchronously send the task to Celery
        task = fetch_moodle_submissions_task.delay(data['base_url'], data['token'], data['assignid'])
        return {"status": "success", "task_id": task.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New endpoint to check task status (optional, but useful for frontend)
@router.get("/moodle/task-status/{task_id}")
def get_moodle_task_status(task_id: str):
    task = celery_app.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {'status': task.state, 'message': 'Task is pending.'}
    elif task.state == 'PROGRESS':
        response = {'status': task.state, 'message': 'Task is in progress.', 'info': task.info}
    elif task.state == 'SUCCESS':
        response = {'status': task.state, 'result': task.result}
    elif task.state == 'FAILURE':
        response = {'status': task.state, 'error': str(task.info)}
    else:
        response = {'status': task.state}
    return response

@router.post("/moodle/grade")
def moodle_grade(data: dict = Body(...)):
    try:
        service = get_moodle_service(data)
        return service.grade_submission(
            data['assignmentid'],
            data['userid'],
            data['grade'],
            data.get('textfeedback', "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 