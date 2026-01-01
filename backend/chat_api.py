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
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/chat", tags=["chat"])

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment variables. Chat functionality will be limited.")

# Models for request and response
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatContext(BaseModel):
    studentName: Optional[str] = None
    assignmentName: Optional[str] = None
    questionText: Optional[str] = None
    rubric: Optional[Dict[str, Any]] = None
    gradeData: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    message: str
    context: ChatContext
    messageHistory: Optional[List[ChatMessage]] = None

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
    """Generate response using Gemini AI"""
    try:
        from google import genai
        
        # Build context prompt
        context_prompt = build_context_prompt(context, message_history)
        
        # Create full prompt
        full_prompt = f"""
{context_prompt}

Student Message: {message}

Please provide a helpful, educational response that addresses the student's question or concern. 
Be encouraging and constructive in your feedback.
"""
        
        # Use new Client pattern with free model
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt
        )
        
        return response.text
        
    except Exception as e:
        logger.error(f"Gemini response generation failed: {e}")
        raise

def generate_rule_based_response(message: str, context: ChatContext) -> str:
    """Generate rule-based response when AI is not available"""
    message_lower = message.lower()
    
    # Simple rule-based responses
    if any(word in message_lower for word in ['help', 'confused', 'don\'t understand']):
        return "I understand you're feeling confused. Let me help clarify this concept. Could you tell me more specifically what part you're struggling with?"
    
    elif any(word in message_lower for word in ['grade', 'score', 'points']):
        return "I can see you're asking about grades. The grading is based on the rubric criteria we discussed. Would you like me to explain how your submission was evaluated?"
    
    elif any(word in message_lower for word in ['feedback', 'improve', 'better']):
        return "Great question! To improve your work, focus on the specific feedback points mentioned in your grading. Practice those areas and you'll see improvement."
    
    elif any(word in message_lower for word in ['thanks', 'thank you', 'appreciate']):
        return "You're very welcome! I'm here to help you succeed. Don't hesitate to ask if you have more questions."
    
    else:
        return "Thank you for your message. I'm here to help with any questions about your assignment, grading, or course material. What would you like to know more about?"

def build_context_prompt(context: ChatContext, message_history: List[ChatMessage]) -> str:
    """Build context prompt for AI responses"""
    prompt_parts = []
    
    if context.studentName:
        prompt_parts.append(f"Student: {context.studentName}")
    
    if context.assignmentName:
        prompt_parts.append(f"Assignment: {context.assignmentName}")
    
    if context.questionText:
        prompt_parts.append(f"Question: {context.questionText}")
    
    if context.rubric:
        prompt_parts.append(f"Rubric: {json.dumps(context.rubric, indent=2)}")
    
    if context.gradeData:
        prompt_parts.append(f"Grade Data: {json.dumps(context.gradeData, indent=2)}")
    
    if message_history:
        prompt_parts.append("Previous conversation:")
        for msg in message_history[-5:]:  # Last 5 messages for context
            prompt_parts.append(f"{msg.role}: {msg.content}")
    
    return "\n".join(prompt_parts) if prompt_parts else "No specific context provided." 