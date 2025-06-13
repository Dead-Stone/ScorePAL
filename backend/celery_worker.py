from celery import Celery

# Configure Celery to use Redis as both broker and backend
# Replace 'redis://localhost:6379/0' with your Redis URL if it's different
celery_app = Celery(
    'scorepal_agents',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0',
    include=['backend.agents.lms_integration_agent', 'backend.agents.preprocessing_agent', 'backend.agents.grading_agent', 'backend.agents.feedback_agent'] # Placeholder for future agent modules
)

# Optional: Celery Beat configuration for scheduled tasks (if needed later)
# celery_app.conf.beat_schedule = {
#     'run-every-5-seconds': {
#         'task': 'backend.agents.some_scheduled_task',
#         'schedule': 5.0,
#         'args': ()
#     },
# }

# Optional: Task serialization
celery_app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
)

# Define a simple test task
@celery_app.task
def debug_task(x, y):
    return f"Debug task received x={x}, y={y}. Sum: {x+y}" 