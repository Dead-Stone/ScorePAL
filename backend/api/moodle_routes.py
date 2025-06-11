from fastapi import APIRouter, HTTPException, Body
from backend.moodle_service import MoodleService

router = APIRouter()

def get_moodle_service(data):
    return MoodleService(data['base_url'], data['token'])

@router.post("/moodle/courses")
def moodle_courses(data: dict = Body(...)):
    try:
        service = get_moodle_service(data)
        return service.get_courses()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/moodle/assignments")
def moodle_assignments(data: dict = Body(...)):
    try:
        service = get_moodle_service(data)
        return service.get_assignments(data['courseid'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/moodle/submissions")
def moodle_submissions(data: dict = Body(...)):
    try:
        service = get_moodle_service(data)
        return service.get_submissions(data['assignmentid'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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