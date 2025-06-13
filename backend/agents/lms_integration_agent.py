from ..celery_worker import celery_app
from ..moodle_service import MoodleService

@celery_app.task
def fetch_moodle_courses_task(base_url: str, token: str):
    """Celery task to fetch Moodle courses."""
    try:
        moodle_service = MoodleService(base_url, token)
        courses = moodle_service.get_courses()
        print(f"Successfully fetched {len(courses)} Moodle courses.")
        return {"status": "success", "courses": courses}
    except Exception as e:
        print(f"Error fetching Moodle courses: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task
def fetch_moodle_assignments_task(base_url: str, token: str, courseid: int):
    """Celery task to fetch Moodle assignments for a given course."""
    try:
        moodle_service = MoodleService(base_url, token)
        assignments = moodle_service.get_assignments(courseid)
        print(f"Successfully fetched {len(assignments)} Moodle assignments for course {courseid}.")
        return {"status": "success", "assignments": assignments}
    except Exception as e:
        print(f"Error fetching Moodle assignments for course {courseid}: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task
def fetch_moodle_submissions_task(base_url: str, token: str, assignid: int):
    """Celery task to fetch Moodle submissions for a given assignment."""
    try:
        moodle_service = MoodleService(base_url, token)
        submissions = moodle_service.get_submissions(assignid)
        print(f"Successfully fetched {len(submissions)} Moodle submissions for assignment {assignid}.")
        return {"status": "success", "submissions": submissions}
    except Exception as e:
        print(f"Error fetching Moodle submissions for assignment {assignid}: {e}")
        return {"status": "error", "message": str(e)} 