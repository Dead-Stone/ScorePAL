"""
Multi-Agentic Framework for Automated Grading System
This framework coordinates multiple specialized agents to handle different aspects of grading.
"""

import asyncio
import json
import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable, Union
from concurrent.futures import ThreadPoolExecutor
import threading
import queue
import time

# Import existing services
from preprocessing_v2 import FilePreprocessor
from grading_v2 import GradingService
from canvas_service import CanvasGradingService
import google.generativeai as genai

logger = logging.getLogger(__name__)

class MessageType(Enum):
    TASK_REQUEST = "task_request"
    TASK_RESPONSE = "task_response"
    STATUS_UPDATE = "status_update"
    ERROR = "error"
    COORDINATION = "coordination"

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class Message:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sender: str = ""
    receiver: str = ""
    message_type: MessageType = MessageType.TASK_REQUEST
    payload: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    correlation_id: Optional[str] = None

@dataclass
class Task:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: str = ""
    payload: Dict[str, Any] = field(default_factory=dict)
    status: TaskStatus = TaskStatus.PENDING
    assigned_agent: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    dependencies: List[str] = field(default_factory=list)

class Tool(ABC):
    """Base class for agent tools"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
    
    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """Execute the tool with given parameters"""
        pass

class FileProcessingTool(Tool):
    """Tool for processing files and extracting text"""
    
    def __init__(self):
        super().__init__("file_processor", "Processes files and extracts text content")
        self.preprocessor = FilePreprocessor()
    
    async def execute(self, file_path: str = None, file_url: str = None, file_type: str = None, 
                     canvas_api_key: str = None, cleanup: bool = True) -> str:
        """Extract text from a file (either local path or download from URL)"""
        import tempfile
        import requests
        import os
        
        temp_file = None
        try:
            if file_url and canvas_api_key:
                # Download file from URL
                headers = {"Authorization": f"Bearer {canvas_api_key}"}
                response = requests.get(file_url, headers=headers)
                
                if response.status_code == 200:
                    # Create temporary file
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.tmp')
                    temp_file.write(response.content)
                    temp_file.close()
                    
                    # Process the temporary file
                    text = self.preprocessor.extract_text_from_file(temp_file.name)
                    
                    # Clean up immediately if requested
                    if cleanup and os.path.exists(temp_file.name):
                        os.unlink(temp_file.name)
                    
                    return text
                else:
                    raise Exception(f"Failed to download file from {file_url}: HTTP {response.status_code}")
            
            elif file_path:
                # Process local file
                return self.preprocessor.extract_text_from_file(file_path)
            
            else:
                raise Exception("Either file_path or file_url must be provided")
                
        except Exception as e:
            # Clean up temp file if it exists
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except:
                    pass
            logger.error(f"File processing failed: {e}")
            raise

class GeminiTool(Tool):
    """Tool for interacting with Gemini API"""
    
    def __init__(self, api_key: str):
        super().__init__("gemini_api", "Interacts with Google Gemini API")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    async def execute(self, prompt: str, **kwargs) -> str:
        """Generate content using Gemini"""
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            raise

class CanvasTool(Tool):
    """Tool for Canvas LMS interactions"""
    
    def __init__(self, canvas_service: CanvasGradingService):
        super().__init__("canvas_api", "Interacts with Canvas LMS")
        self.canvas_service = canvas_service
    
    async def execute(self, action: str, **kwargs) -> Any:
        """Execute Canvas operations"""
        try:
            if action == "get_submissions":
                return self.canvas_service.get_submissions_for_assignment(
                    kwargs.get('course_id'), kwargs.get('assignment_id')
                )
            elif action == "post_grades":
                return self.canvas_service.post_grades_to_canvas(
                    kwargs.get('course_id'), kwargs.get('assignment_id'), kwargs.get('grades')
                )
            else:
                raise ValueError(f"Unknown Canvas action: {action}")
        except Exception as e:
            logger.error(f"Canvas operation failed: {e}")
            raise

class Agent(ABC):
    """Base class for all agents in the system"""
    
    def __init__(self, agent_id: str, name: str, description: str):
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.tools: Dict[str, Tool] = {}
        self.message_queue = asyncio.Queue()
        self.running = False
        self.coordinator = None
        self.capabilities = []
        
    def add_tool(self, tool: Tool):
        """Add a tool to the agent's toolkit"""
        self.tools[tool.name] = tool
        
    def add_capability(self, capability: str):
        """Add a capability to the agent"""
        self.capabilities.append(capability)
    
    async def send_message(self, receiver: str, message_type: MessageType, payload: Dict[str, Any]):
        """Send a message to another agent"""
        message = Message(
            sender=self.agent_id,
            receiver=receiver,
            message_type=message_type,
            payload=payload
        )
        if self.coordinator:
            await self.coordinator.route_message(message)
    
    async def receive_message(self, message: Message):
        """Receive a message from another agent"""
        await self.message_queue.put(message)
    
    async def start(self):
        """Start the agent"""
        self.running = True
        logger.info(f"Agent {self.name} started")
        await self.run()
    
    async def stop(self):
        """Stop the agent"""
        self.running = False
        logger.info(f"Agent {self.name} stopped")
    
    @abstractmethod
    async def run(self):
        """Main agent loop"""
        pass
    
    @abstractmethod
    async def handle_task(self, task: Task) -> Any:
        """Handle a specific task"""
        pass

class PreprocessingAgent(Agent):
    """Agent responsible for file preprocessing and text extraction"""
    
    def __init__(self):
        super().__init__("preprocessing_agent", "Preprocessing Agent", "Handles file processing and text extraction")
        self.add_capability("file_processing")
        self.add_capability("text_extraction")
        
    async def run(self):
        """Main agent loop"""
        while self.running:
            try:
                # Wait for messages with timeout
                message = await asyncio.wait_for(self.message_queue.get(), timeout=1.0)
                await self.process_message(message)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"PreprocessingAgent error: {e}")
    
    async def process_message(self, message: Message):
        """Process incoming messages"""
        if message.message_type == MessageType.TASK_REQUEST:
            task_data = message.payload.get('task')
            if task_data:
                task = Task(**task_data)
                result = await self.handle_task(task)
                
                # Send response back
                await self.send_message(
                    message.sender,
                    MessageType.TASK_RESPONSE,
                    {'task_id': task.id, 'result': result}
                )
    
    async def handle_task(self, task: Task) -> Any:
        """Handle preprocessing tasks"""
        if task.type == "extract_text":
            file_path = task.payload.get('file_path')
            if 'file_processor' in self.tools:
                return await self.tools['file_processor'].execute(file_path=file_path)
        elif task.type == "process_submissions":
            # Handle batch processing of submissions
            submissions_data = task.payload.get('submissions', [])
            canvas_api_key = task.payload.get('canvas_api_key')
            results = {}
            
            for submission in submissions_data:
                try:
                    student_id = submission.get('user_id')
                    attachments = submission.get('attachments', [])
                    
                    logger.info(f"Processing submission for student {student_id} with {len(attachments)} attachments")
                    
                    extracted_texts = []
                    processed_files = []
                    
                    for attachment in attachments:
                        if 'file_processor' in self.tools:
                            # Get file URL and name
                            file_url = attachment.get('url')
                            file_name = attachment.get('filename', attachment.get('display_name', 'unknown'))
                            
                            if file_url:
                                logger.info(f"Processing file: {file_name} from URL: {file_url}")
                                try:
                                    text = await self.tools['file_processor'].execute(
                                        file_url=file_url,
                                        canvas_api_key=canvas_api_key,
                                        cleanup=True  # Always clean up temporary files
                                    )
                                    extracted_texts.append(f"File: {file_name}\n{text}")
                                    processed_files.append(file_name)
                                    logger.info(f"Successfully processed file: {file_name}")
                                except Exception as file_error:
                                    logger.warning(f"Failed to process file {file_name}: {file_error}")
                                    extracted_texts.append(f"File: {file_name}\nError: Failed to process - {str(file_error)}")
                    
                    results[student_id] = {
                        'extracted_text': '\n\n'.join(extracted_texts) if extracted_texts else 'No content extracted',
                        'file_count': len(attachments),
                        'processed_files': processed_files,
                        'status': 'completed'
                    }
                    logger.info(f"Completed processing for student {student_id}: {len(processed_files)}/{len(attachments)} files processed")
                    
                except Exception as e:
                    logger.error(f"Error processing submission for student {student_id}: {e}")
                    results[student_id] = {
                        'error': str(e),
                        'status': 'failed'
                    }
            
            return results
        
        return None

class AnswerKeyAgent(Agent):
    """Agent responsible for generating and managing answer keys"""
    
    def __init__(self):
        super().__init__("answer_key_agent", "Answer Key Agent", "Generates and manages answer keys")
        self.add_capability("answer_key_generation")
        self.add_capability("question_analysis")
    
    async def run(self):
        """Main agent loop"""
        while self.running:
            try:
                message = await asyncio.wait_for(self.message_queue.get(), timeout=1.0)
                await self.process_message(message)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"AnswerKeyAgent error: {e}")
    
    async def process_message(self, message: Message):
        """Process incoming messages"""
        if message.message_type == MessageType.TASK_REQUEST:
            task_data = message.payload.get('task')
            if task_data:
                task = Task(**task_data)
                result = await self.handle_task(task)
                
                await self.send_message(
                    message.sender,
                    MessageType.TASK_RESPONSE,
                    {'task_id': task.id, 'result': result}
                )
    
    async def handle_task(self, task: Task) -> Any:
        """Handle answer key generation tasks"""
        if task.type == "generate_answer_key":
            question_text = task.payload.get('question_text')
            rubric = task.payload.get('rubric')
            
            if 'gemini_api' in self.tools:
                prompt = f"""
                Generate a comprehensive answer key for the following questions:
                
                Questions: {question_text}
                
                Rubric: {json.dumps(rubric, indent=2) if rubric else 'No rubric provided'}
                
                Provide detailed answers with explanations for each question.
                Format as a structured text that can be used for grading.
                """
                
                answer_key = await self.tools['gemini_api'].execute(prompt=prompt)
                return {
                    'answer_key': answer_key,
                    'generated_at': datetime.now().isoformat(),
                    'question_count': len(question_text.split('\n')) if question_text else 0
                }
        
        return None

class GradingAgent(Agent):
    """Agent responsible for grading student submissions"""
    
    def __init__(self):
        super().__init__("grading_agent", "Grading Agent", "Grades student submissions")
        self.add_capability("submission_grading")
        self.add_capability("rubric_evaluation")
        self.grading_service = None
    
    def set_grading_service(self, grading_service: GradingService):
        """Set the grading service"""
        self.grading_service = grading_service
    
    async def run(self):
        """Main agent loop"""
        while self.running:
            try:
                message = await asyncio.wait_for(self.message_queue.get(), timeout=1.0)
                await self.process_message(message)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"GradingAgent error: {e}")
    
    async def process_message(self, message: Message):
        """Process incoming messages"""
        if message.message_type == MessageType.TASK_REQUEST:
            task_data = message.payload.get('task')
            if task_data:
                task = Task(**task_data)
                result = await self.handle_task(task)
                
                await self.send_message(
                    message.sender,
                    MessageType.TASK_RESPONSE,
                    {'task_id': task.id, 'result': result}
                )
    
    async def handle_task(self, task: Task) -> Any:
        """Handle grading tasks"""
        if task.type == "grade_submission":
            submission_text = task.payload.get('submission_text')
            question_text = task.payload.get('question_text')
            answer_key = task.payload.get('answer_key')
            student_name = task.payload.get('student_name', 'Student')
            rubric = task.payload.get('rubric')
            
            if self.grading_service:
                result = self.grading_service.grade_submission(
                    submission_text=submission_text,
                    question_text=question_text,
                    answer_key=answer_key,
                    student_name=student_name,
                    rubric=rubric
                )
                return result
        elif task.type == "batch_grade":
            submissions = task.payload.get('submissions', {})
            question_text = task.payload.get('question_text')
            answer_key = task.payload.get('answer_key')
            rubric = task.payload.get('rubric')
            strictness = task.payload.get('strictness', 0.5)
            
            results = {}
            for student_id, submission_data in submissions.items():
                try:
                    if self.grading_service:
                        grade_result = self.grading_service.grade_submission(
                            submission_text=submission_data.get('extracted_text', ''),
                            question_text=question_text,
                            answer_key=answer_key,
                            student_name=submission_data.get('student_name', f'Student {student_id}'),
                            rubric=rubric,
                            strictness=strictness
                        )
                        results[student_id] = {
                            'grading_result': grade_result,
                            'status': 'completed',
                            'graded_at': datetime.now().isoformat()
                        }
                except Exception as e:
                    results[student_id] = {
                        'error': str(e),
                        'status': 'failed'
                    }
            
            return results
        
        return None

class CoordinatorAgent(Agent):
    """Main coordinator agent that orchestrates the entire grading process"""
    
    def __init__(self):
        super().__init__("coordinator_agent", "Coordinator Agent", "Orchestrates the grading workflow")
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}
        self.workflows: Dict[str, Dict] = {}
        self.add_capability("workflow_orchestration")
        self.add_capability("task_management")
    
    def register_agent(self, agent: Agent):
        """Register an agent with the coordinator"""
        self.agents[agent.agent_id] = agent
        agent.coordinator = self
        logger.info(f"Registered agent: {agent.name}")
    
    async def route_message(self, message: Message):
        """Route messages between agents"""
        if message.receiver in self.agents:
            await self.agents[message.receiver].receive_message(message)
        else:
            logger.warning(f"Unknown receiver: {message.receiver}")
    
    async def start_workflow(self, workflow_type: str, workflow_data: Dict[str, Any]) -> str:
        """Start a grading workflow"""
        workflow_id = str(uuid.uuid4())
        
        if workflow_type == "canvas_grading":
            await self._start_canvas_grading_workflow(workflow_id, workflow_data)
        elif workflow_type == "batch_grading":
            await self._start_batch_grading_workflow(workflow_id, workflow_data)
        else:
            raise ValueError(f"Unknown workflow type: {workflow_type}")
        
        return workflow_id
    
    async def _start_canvas_grading_workflow(self, workflow_id: str, data: Dict[str, Any]):
        """Start Canvas grading workflow"""
        course_id = data.get('course_id')
        assignment_id = data.get('assignment_id')
        selected_students = data.get('selected_students', [])
        rubric = data.get('rubric')
        strictness = data.get('strictness', 0.5)
        
        workflow = {
            'id': workflow_id,
            'type': 'canvas_grading',
            'status': 'in_progress',
            'steps': [],
            'data': data,
            'started_at': datetime.now().isoformat()
        }
        self.workflows[workflow_id] = workflow
        
        try:
            # Step 1: Get submissions from Canvas
            if 'canvas_api' in self.tools:
                submissions_result = await self.tools['canvas_api'].execute(
                    action='get_submissions',
                    course_id=course_id,
                    assignment_id=assignment_id
                )
                
                if submissions_result.get('success'):
                    submissions = submissions_result.get('submissions', [])
                    
                    # Filter for selected students if specified
                    if selected_students:
                        submissions = [s for s in submissions if s.get('user_id') in selected_students]
                    
                    workflow['steps'].append({
                        'step': 'fetch_submissions',
                        'status': 'completed',
                        'result': f"Retrieved {len(submissions)} submissions"
                    })
                    
                    # Step 2: Process submissions (extract text)
                    preprocessing_task = Task(
                        type="process_submissions",
                        payload={
                            'submissions': submissions,
                            'canvas_api_key': self.canvas_service.canvas_api_key if self.canvas_service else None
                        }
                    )
                    
                    preprocessing_result = await self._send_task_to_agent(
                        'preprocessing_agent', preprocessing_task
                    )
                    
                    if preprocessing_result:
                        workflow['steps'].append({
                            'step': 'preprocess_submissions',
                            'status': 'completed',
                            'result': f"Processed {len(preprocessing_result)} submissions"
                        })
                        
                        # Step 3: Generate answer key if needed
                        question_text = data.get('question_text', '')
                        answer_key = data.get('answer_key')
                        
                        if not answer_key and question_text:
                            answer_key_task = Task(
                                type="generate_answer_key",
                                payload={
                                    'question_text': question_text,
                                    'rubric': rubric
                                }
                            )
                            
                            answer_key_result = await self._send_task_to_agent(
                                'answer_key_agent', answer_key_task
                            )
                            
                            if answer_key_result:
                                answer_key = answer_key_result.get('answer_key')
                                workflow['steps'].append({
                                    'step': 'generate_answer_key',
                                    'status': 'completed',
                                    'result': 'Answer key generated'
                                })
                        
                        # Step 4: Grade submissions
                        grading_task = Task(
                            type="batch_grade",
                            payload={
                                'submissions': preprocessing_result,
                                'question_text': question_text,
                                'answer_key': answer_key,
                                'rubric': rubric,
                                'strictness': strictness
                            }
                        )
                        
                        grading_result = await self._send_task_to_agent(
                            'grading_agent', grading_task
                        )
                        
                        if grading_result:
                            workflow['steps'].append({
                                'step': 'grade_submissions',
                                'status': 'completed',
                                'result': f"Graded {len(grading_result)} submissions"
                            })
                            
                            workflow['status'] = 'completed'
                            workflow['completed_at'] = datetime.now().isoformat()
                            workflow['final_result'] = grading_result
                        else:
                            workflow['status'] = 'failed'
                            workflow['error'] = 'Grading failed'
                    else:
                        workflow['status'] = 'failed'
                        workflow['error'] = 'Preprocessing failed'
                else:
                    workflow['status'] = 'failed'
                    workflow['error'] = 'Failed to fetch submissions from Canvas'
            else:
                workflow['status'] = 'failed'
                workflow['error'] = 'Canvas tool not available'
        
        except Exception as e:
            workflow['status'] = 'failed'
            workflow['error'] = str(e)
            logger.error(f"Workflow {workflow_id} failed: {e}")
    
    async def _send_task_to_agent(self, agent_id: str, task: Task) -> Any:
        """Send a task to a specific agent and wait for response"""
        if agent_id not in self.agents:
            logger.error(f"Agent {agent_id} not found")
            return None
        
        # Create a response queue for this task
        response_queue = asyncio.Queue()
        self.tasks[task.id] = {
            'task': task,
            'response_queue': response_queue,
            'agent_id': agent_id
        }
        
        # Send task to agent
        await self.agents[agent_id].receive_message(Message(
            sender=self.agent_id,
            receiver=agent_id,
            message_type=MessageType.TASK_REQUEST,
            payload={'task': task.__dict__}
        ))
        
        try:
            # Wait for response (with timeout)
            response_message = await asyncio.wait_for(response_queue.get(), timeout=300.0)
            return response_message.payload.get('result')
        except asyncio.TimeoutError:
            logger.error(f"Task {task.id} timed out")
            return None
        finally:
            # Clean up
            if task.id in self.tasks:
                del self.tasks[task.id]
    
    async def run(self):
        """Main coordinator loop"""
        while self.running:
            try:
                # Handle incoming messages
                message = await asyncio.wait_for(self.message_queue.get(), timeout=1.0)
                await self.process_message(message)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"CoordinatorAgent error: {e}")
    
    async def process_message(self, message: Message):
        """Process incoming messages"""
        if message.message_type == MessageType.TASK_RESPONSE:
            task_id = message.payload.get('task_id')
            if task_id in self.tasks:
                # Forward response to waiting queue
                await self.tasks[task_id]['response_queue'].put(message)
    
    async def handle_task(self, task: Task) -> Any:
        """Handle coordinator-specific tasks"""
        # Coordinator mainly orchestrates, doesn't handle individual tasks
        return None
    
    def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """Get the status of a workflow"""
        if workflow_id in self.workflows:
            return self.workflows[workflow_id]
        return {'error': 'Workflow not found'}

class AgenticGradingSystem:
    """Main system that manages all agents and workflows"""
    
    def __init__(self, gemini_api_key: str, canvas_service: CanvasGradingService = None):
        self.agents = {}
        self.coordinator = CoordinatorAgent()
        self.gemini_api_key = gemini_api_key
        self.canvas_service = canvas_service
        self.running = False
        
        # Pass canvas service to coordinator
        self.coordinator.canvas_service = canvas_service
        
        # Initialize agents and tools
        self._initialize_agents()
        self._setup_tools()
    
    def _initialize_agents(self):
        """Initialize all agents"""
        # Create specialized agents
        preprocessing_agent = PreprocessingAgent()
        answer_key_agent = AnswerKeyAgent()
        grading_agent = GradingAgent()
        
        # Set up grading service for grading agent
        grading_agent.set_grading_service(GradingService(api_key=self.gemini_api_key))
        
        # Register agents with coordinator
        self.coordinator.register_agent(preprocessing_agent)
        self.coordinator.register_agent(answer_key_agent)
        self.coordinator.register_agent(grading_agent)
        
        # Store agents for direct access
        self.agents = {
            'preprocessing': preprocessing_agent,
            'answer_key': answer_key_agent,
            'grading': grading_agent,
            'coordinator': self.coordinator
        }
    
    def _setup_tools(self):
        """Setup tools for agents"""
        # File processing tool for preprocessing agent
        file_tool = FileProcessingTool()
        self.agents['preprocessing'].add_tool(file_tool)
        
        # Gemini tool for answer key agent and coordinator
        gemini_tool = GeminiTool(self.gemini_api_key)
        self.agents['answer_key'].add_tool(gemini_tool)
        self.coordinator.add_tool(gemini_tool)
        
        # Canvas tool if available
        if self.canvas_service:
            canvas_tool = CanvasTool(self.canvas_service)
            self.coordinator.add_tool(canvas_tool)
    
    async def start(self):
        """Start the agentic system"""
        if self.running:
            return
        
        self.running = True
        logger.info("Starting Agentic Grading System")
        
        # Start all agents concurrently
        tasks = []
        for agent in self.agents.values():
            tasks.append(asyncio.create_task(agent.start()))
        
        # Run all agents
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def stop(self):
        """Stop the agentic system"""
        if not self.running:
            return
        
        self.running = False
        logger.info("Stopping Agentic Grading System")
        
        # Stop all agents
        for agent in self.agents.values():
            await agent.stop()
    
    async def start_grading_workflow(self, workflow_type: str, workflow_data: Dict[str, Any]) -> str:
        """Start a grading workflow"""
        return await self.coordinator.start_workflow(workflow_type, workflow_data)
    
    def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """Get workflow status"""
        return self.coordinator.get_workflow_status(workflow_id)
    
    async def grade_canvas_assignment(self, course_id: int, assignment_id: int, 
                                    selected_students: List[int] = None,
                                    question_text: str = "", answer_key: str = "",
                                    rubric: Dict[str, Any] = None) -> str:
        """Start Canvas assignment grading workflow"""
        workflow_data = {
            'course_id': course_id,
            'assignment_id': assignment_id,
            'selected_students': selected_students,
            'question_text': question_text,
            'answer_key': answer_key,
            'rubric': rubric
        }
        
        return await self.start_grading_workflow('canvas_grading', workflow_data)

# Global instance for the agentic system
_agentic_system = None

def get_agentic_system(gemini_api_key: str = None, canvas_service: CanvasGradingService = None) -> AgenticGradingSystem:
    """Get or create the global agentic system"""
    global _agentic_system
    
    if _agentic_system is None and gemini_api_key:
        _agentic_system = AgenticGradingSystem(gemini_api_key, canvas_service)
    
    return _agentic_system

async def start_agentic_system(gemini_api_key: str, canvas_service: CanvasGradingService = None):
    """Start the agentic system"""
    system = get_agentic_system(gemini_api_key, canvas_service)
    if system:
        await system.start()

async def stop_agentic_system():
    """Stop the agentic system"""
    global _agentic_system
    if _agentic_system:
        await _agentic_system.stop()
        _agentic_system = None 