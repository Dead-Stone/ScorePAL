import requests

class MoodleService:
    def __init__(self, base_url, token):
        self.base_url = base_url.rstrip('/') + '/webservice/rest/server.php'
        self.token = token

    def _post(self, wsfunction, params=None):
        data = {
            'wstoken': self.token,
            'wsfunction': wsfunction,
            'moodlewsrestformat': 'json'
        }
        if params:
            data.update(params)
        response = requests.post(self.base_url, data=data)
        response.raise_for_status()
        return response.json()

    def get_courses(self):
        return self._post('core_course_get_courses')

    def get_assignments(self, courseid):
        return self._post('mod_assign_get_assignments', {'courseids[0]': courseid})

    def get_submissions(self, assignmentid):
        return self._post('mod_assign_get_submissions', {'assignmentids[0]': assignmentid})

    def grade_submission(self, assignmentid, userid, grade, textfeedback=""):
        params = {
            'assignmentid': assignmentid,
            'applytoall': 0,
            'grades[0][userid]': userid,
            'grades[0][grade]': grade,
            'grades[0][attemptnumber]': -1,
            'grades[0][addattempt]': 0,
            'grades[0][workflowstate]': '',
            'grades[0][plugindata][assignfeedbackcomments_editor][text]': textfeedback,
            'grades[0][plugindata][assignfeedbackcomments_editor][format]': 1
        }
        return self._post('mod_assign_save_grade', params) 