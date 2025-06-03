# agents.py
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import ProcessPoolExecutor
class BaseAgent:
    def __init__(self, max_workers=4):
        self.executor = concurrent.futures.ProcessPoolExecutor(max_workers=max_workers)
    
    def submit_task(self, func, *args, **kwargs):
        return self.executor.submit(func, *args, **kwargs)

class ExtractionAgent(BaseAgent):
    def extract(self, zip_file_path):
        from extraction_service import extract_submissions
        return self.submit_task(extract_submissions, zip_file_path)

# class GradingAgent(BaseAgent):
#     def grade(self, submissions, question_text, rubric, strictness=1):
#         from grade_service import grade_submission
#         futures = {}
#         for student, submission in submissions.items():
#             future = self.submit_task(grade_submission, submission, question_text, rubric, strictness)
#             futures[student] = future
#         return futures

class GradingAgent:
    # UPDATE: Use ThreadPoolExecutor with more workers (e.g., 30) for parallel grading
    def __init__(self, max_workers=5):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def grade(self, submissions, question_text, answer, rubric, strictness=1):

        from grade_service import grade_submission
        futures = {}
        # print("submissions",submissions.keys())
        for student, submission in submissions.items():
            future = self.executor.submit(grade_submission, question_text, submission, answer, rubric, strictness)
            futures[student] = future
        return futures

class RubricGenerationAgent(BaseAgent):
    def generate_rubric(self, question_text, prompt):
        from rubric_generation import get_rubric_from_text
        return self.submit_task(get_rubric_from_text, question_text, prompt)
