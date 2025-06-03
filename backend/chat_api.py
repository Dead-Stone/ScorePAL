"""
Chat API for ScorePAL.

This module provides the chat functionality for student interactions and feedback.
"""

import os
import json
import logging
import time
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
import google.generativeai as genai
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/chat", tags=["chat"])

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not found in environment variables. Chat functionality will be limited.")

# Models for request and response
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatContext(BaseModel):
    assignmentId: Optional[str] = None
    submissionId: Optional[str] = None
    studentName: Optional[str] = None
    questionText: Optional[str] = None
    submissionText: Optional[str] = None
    gradingFeedback: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    context: ChatContext
    messageHistory: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    timestamp: str

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest = Body(...)):
    """
    Process a chat message and generate a response.
    
    Args:
        request: The chat request containing the message, context, and message history
        
    Returns:
        ChatResponse: The AI's response
    """
    try:
        logger.info(f"Received chat request for {request.context.studentName if request.context.studentName else 'unknown student'}")
        
        # Use Gemini if API key is available
        if GEMINI_API_KEY:
            try:
                response = await generate_gemini_response(
                    message=request.message,
                    context=request.context,
                    message_history=request.messageHistory
                )
                return ChatResponse(
                    reply=response,
                    timestamp=datetime.now().isoformat()
                )
            except Exception as e:
                logger.error(f"Error generating Gemini response: {e}")
                # Fall back to rule-based if Gemini fails
                response = generate_rule_based_response(
                    message=request.message,
                    context=request.context
                )
                return ChatResponse(
                    reply=response,
                    timestamp=datetime.now().isoformat()
                )
        else:
            # Use rule-based responses if no API key
            response = generate_rule_based_response(
                message=request.message,
                context=request.context
            )
            return ChatResponse(
                reply=response,
                timestamp=datetime.now().isoformat()
            )
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

async def generate_gemini_response(message: str, context: ChatContext, message_history: List[ChatMessage]) -> str:
    """
    Generate a response using the Gemini API.
    
    Args:
        message: The user's message
        context: Context information about the assignment and submission
        message_history: Previous messages in the conversation
        
    Returns:
        str: The AI's response
    """
    try:
        # Configure the model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Format message history for Gemini
        chat_history = []
        for msg in message_history:
            # Skip the first AI message (welcome message)
            if msg.role == "assistant" and len(chat_history) == 0:
                continue
            chat_history.append({"role": msg.role, "parts": [msg.content]})
        
        # Create a chat session
        chat = model.start_chat(history=chat_history)
        
        # Prepare system prompt with context information
        system_prompt = f"""You are an AI teaching assistant grading a student's assignment.

CONTEXT INFORMATION:
Student: {context.studentName if context.studentName else 'Unknown'}
Assignment ID: {context.assignmentId if context.assignmentId else 'Unknown'}
Submission ID: {context.submissionId if context.submissionId else 'Unknown'}

Assignment Question:
{context.questionText if context.questionText else 'Not available'}

Student's Submission:
{context.submissionText if context.submissionText else 'Not available'}

Grading Feedback:
{context.gradingFeedback if context.gradingFeedback else 'Not available'}

INSTRUCTIONS:
1. Provide helpful, educational guidance to the student about their work.
2. If they ask about their grade, explain the feedback and how they could improve.
3. Be encouraging but honest about areas for improvement.
4. Keep responses concise, focused, and tailored to the specific assignment.
5. Do not share specific grade percentages, only qualitative feedback.
6. Your job is to help them understand the feedback and improve their understanding.
7. Remember you graded the student's submission, so you know the feedback and the grade.
Now, please respond to the student's message below.
"""
        
        # Add system prompt if this is a new conversation
        if len(chat_history) == 0:
            chat.send_message(system_prompt)
        
        # Send the user's message and get response
        response = chat.send_message(message)
        
        # Extract the text response
        response_text = response.text
        
        return response_text
    except Exception as e:
        logger.error(f"Error generating Gemini response: {e}")
        raise

def generate_rule_based_response(message: str, context: ChatContext) -> str:
    """
    Generate a rule-based response when the AI service is unavailable.
    
    Args:
        message: The user's message
        context: Context information about the assignment and submission
        
    Returns:
        str: A rule-based response
    """
    message_lower = message.lower()
    
    # Extract student name for personalization
    student_name = context.studentName if context.studentName else "there"
    
    # Check for common message patterns
    if any(word in message_lower for word in ["hello", "hi", "hey", "greetings"]):
        return f"Hello {student_name}! How can I help you with your assignment today?"
    
    elif any(word in message_lower for word in ["thank", "thanks", "appreciate"]):
        return f"You're welcome, {student_name}! Feel free to ask if you have any other questions."
    
    elif any(word in message_lower for word in ["bye", "goodbye"]):
        return f"Goodbye, {student_name}! Good luck with your assignment."
    
    elif any(word in message_lower for word in ["grade", "score", "marks", "evaluation"]):
        return (
            f"Based on the rubric, your submission has several strengths and areas for improvement. "
            f"The feedback indicates that you demonstrated good understanding of core concepts, "
            f"but could improve in providing more detailed analysis and supporting evidence. "
            f"Would you like specific suggestions on how to improve your work?"
        )
    
    elif any(word in message_lower for word in ["improve", "better", "enhance", "strengthen"]):
        return (
            f"To improve your submission, I recommend: \n"
            f"1) Adding more specific examples to support your arguments\n"
            f"2) Connecting concepts more explicitly to the assignment question\n"
            f"3) Strengthening your analysis by considering alternative perspectives\n"
            f"4) Proofreading for clarity and grammatical accuracy\n"
            f"Would you like more specific guidance on any of these areas?"
        )
    
    elif any(word in message_lower for word in ["help", "assist", "guidance"]):
        return (
            f"I'm here to help you, {student_name}! I can explain the assignment feedback, "
            f"suggest improvements, or answer questions about the concepts covered. "
            f"What specific aspect would you like help with?"
        )
    
    else:
        return (
            f"That's a good question. Based on your submission, I'd suggest focusing on "
            f"strengthening your main arguments with more evidence and ensuring your "
            f"conclusion directly addresses the initial question. Would you like me to "
            f"elaborate on any specific part of the feedback?"
        ) 