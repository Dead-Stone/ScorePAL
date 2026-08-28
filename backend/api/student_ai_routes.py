"""
Student AI Assistant Routes
Provides AI-powered assistance for students with context about their academic data
Uses real AI models (OpenAI, Claude, Gemini, etc.) for natural conversations
"""

import logging
import os
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from ..auth.auth_config import current_active_user
from ..models.user import User
from ..services.universal_ai_service import universal_ai_service
from ..services.mongodb_service import get_user_settings_collection
from ..utils.encryption import decrypt_api_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["student-ai"])

# Conversation history storage (in production, use Redis or database)
conversation_history: Dict[str, List[Dict[str, str]]] = {}


class StudentAIMessage(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    userId: Optional[str] = None
    conversationId: Optional[str] = None  # For conversation continuity


class StudentAIResponse(BaseModel):
    response: str
    conversationId: Optional[str] = None


async def get_user_ai_config(user: User) -> Optional[Dict[str, Any]]:
    """Get user's AI configuration or use system default from environment variables"""
    # Try Gemini first (main/default model)
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        return {
            'provider': 'google',
            'model_name': os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp"),
            'api_key': gemini_key,
            'max_tokens': int(os.getenv("GEMINI_MAX_TOKENS", "2000")),
            'temperature': float(os.getenv("GEMINI_TEMPERATURE", "0.8")),
        }
    
    # Fallback to OpenAI
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        return {
            'provider': 'openai',
            'model_name': os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            'api_key': openai_key,
            'max_tokens': int(os.getenv("OPENAI_MAX_TOKENS", "1000")),
            'temperature': float(os.getenv("OPENAI_TEMPERATURE", "0.7")),
        }
    
    # Fallback to Anthropic Claude
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        return {
            'provider': 'anthropic',
            'model_name': os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
            'api_key': anthropic_key,
            'max_tokens': int(os.getenv("ANTHROPIC_MAX_TOKENS", "1000")),
            'temperature': float(os.getenv("ANTHROPIC_TEMPERATURE", "0.7")),
        }
    
    logger.warning("No AI API key found in environment variables. AI assistant will use fallback responses.")
    return None


@router.post("/student-assistant", response_model=StudentAIResponse)
async def student_ai_assistant(
    request: StudentAIMessage = Body(...),
    user: User = Depends(current_active_user)
):
    """
    AI assistant endpoint for students using real AI models.
    Provides natural, ChatGPT-like conversations with context about student's academic data.
    """
    try:
        user_message = request.message.strip()
        context = request.context or {}
        conversation_id = request.conversationId or f"conv_{user.id}"
        
        # Get student's data from context
        courses = context.get("courses", [])
        stats = context.get("stats", {})
        insights = context.get("insights", [])
        results_count = context.get("resultsCount", 0)
        
        # Get or initialize conversation history
        if conversation_id not in conversation_history:
            conversation_history[conversation_id] = []
        
        # Build context string for AI
        context_str = build_student_context(courses, stats, insights, results_count)
        
        # Get AI configuration
        ai_config = await get_user_ai_config(user)
        
        if ai_config:
            # Use real AI
            try:
                # Comprehensive Study Buddy Prompt
                study_buddy_prompt = """You are an intelligent, friendly, and supportive AI Study Buddy for a college student. Your role is to help them succeed academically by providing personalized guidance, insights, and support.

**Your Personality & Approach:**
- Be warm, encouraging, and empathetic - like a trusted friend who genuinely cares about their success
- Use a conversational, natural tone (like ChatGPT) - friendly but professional
- Be proactive in offering helpful suggestions and insights
- Celebrate their achievements and provide constructive feedback
- Help them understand their academic performance and identify areas for improvement

**Your Capabilities:**
- Analyze their grades, course performance, and academic trends
- Provide personalized study tips and strategies based on their specific courses and performance
- Help them understand assignment requirements and deadlines
- Offer guidance on time management and study planning
- Explain course concepts and help with academic questions
- Identify patterns in their performance (what's working well, what needs attention)
- Suggest improvement strategies tailored to their situation

**Your Communication Style:**
- Keep responses concise but comprehensive - aim for 2-4 sentences for simple questions, up to a paragraph for complex topics
- Use the student's actual data (courses, grades, assignments) when relevant
- Ask follow-up questions to better understand their needs
- Provide actionable advice, not just information
- Use examples from their courses when helpful
- Be encouraging and focus on growth mindset

**Important Guidelines:**
- Always base your advice on the student's actual academic data when available
- If you don't have specific data, acknowledge it and provide general guidance
- Never make up grades, scores, or course information
- Focus on helping them learn and improve, not just getting grades
- Be honest about limitations and when they should consult their instructors

Remember: You're not just an information source - you're a supportive study companion helping them navigate their academic journey successfully."""
                
                # Build conversation messages
                messages = []
                
                # System prompt with student context
                system_prompt = f"""{study_buddy_prompt}

**Current Student Academic Information:**

{context_str}

Use this information to provide personalized, context-aware responses. Reference specific courses, grades, and performance data when relevant to the student's questions."""
                
                # Add conversation history
                for msg in conversation_history[conversation_id][-10:]:  # Last 10 messages for context
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
                
                # For Gemini, we need to format the prompt differently
                # Gemini works best with a single prompt that includes system context
                if ai_config['provider'] == 'google':
                    # Build a comprehensive prompt for Gemini
                    conversation_context = ""
                    if messages:
                        conversation_context = "\n\n**Previous Conversation:**\n"
                        for msg in messages[-6:]:  # Last 6 messages for Gemini
                            role_label = "Student" if msg["role"] == "user" else "Study Buddy"
                            conversation_context += f"{role_label}: {msg['content']}\n\n"
                    
                    prompt = f"""{system_prompt}{conversation_context}

**Current Question:**
Student: {user_message}

Study Buddy:"""
                else:
                    # For OpenAI and Anthropic, use structured messages
                    if ai_config['provider'] in ['openai', 'anthropic']:
                        messages.insert(0, {"role": "system", "content": system_prompt})
                    else:
                        # For other providers, include system prompt in first user message
                        if not messages:
                            user_message = f"{system_prompt}\n\nStudent asks: {user_message}"
                    
                    # Add current user message
                    messages.append({"role": "user", "content": user_message})
                    
                    # Build prompt - convert messages to formatted string
                    prompt_parts = []
                    for msg in messages:
                        role = msg["role"]
                        content = msg["content"]
                        if role == "system":
                            prompt_parts.append(f"System: {content}")
                        elif role == "user":
                            prompt_parts.append(f"User: {content}")
                        elif role == "assistant":
                            prompt_parts.append(f"Assistant: {content}")
                    
                    prompt = "\n\n".join(prompt_parts)
                
                result = await universal_ai_service.generate_text(
                    ai_config,
                    prompt,
                    max_tokens=ai_config.get('max_tokens', 1000),
                    temperature=ai_config.get('temperature', 0.7)
                )
                
                ai_response = result.get('text', '').strip()
                
                # Store in conversation history
                conversation_history[conversation_id].append({"role": "user", "content": user_message})
                conversation_history[conversation_id].append({"role": "assistant", "content": ai_response})
                
                # Limit history size
                if len(conversation_history[conversation_id]) > 20:
                    conversation_history[conversation_id] = conversation_history[conversation_id][-20:]
                
                return StudentAIResponse(
                    response=ai_response,
                    conversationId=conversation_id
                )
                
            except Exception as ai_error:
                logger.error(f"AI generation error: {ai_error}", exc_info=True)
                # Fallback to rule-based
                response = generate_fallback_response(user_message, courses, stats, insights, results_count)
                return StudentAIResponse(
                    response=response,
                    conversationId=conversation_id
                )
        else:
            # No AI config available, use fallback
            logger.info("No AI configuration available, using fallback responses")
            response = generate_fallback_response(user_message, courses, stats, insights, results_count)
            return StudentAIResponse(
                response=response,
                conversationId=conversation_id
            )
        
    except Exception as e:
        logger.error(f"Error in student AI assistant: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing AI request: {str(e)}"
        )


def build_student_context(courses: list, stats: dict, insights: list, results_count: int) -> str:
    """Build a context string for the AI about the student"""
    context_parts = []
    
    # Courses
    if courses:
        course_list = "\n".join([
            f"- {c.get('name', 'Unknown')} ({c.get('code', 'N/A')}): {c.get('current_score', 'N/A')}% current score"
            for c in courses[:5]
        ])
        context_parts.append(f"Enrolled Courses:\n{course_list}")
    
    # Statistics
    if stats:
        context_parts.append(f"Academic Statistics:")
        context_parts.append(f"- Average Grade: {stats.get('averageGrade', 'N/A')}")
        context_parts.append(f"- Total Graded Assignments: {results_count}")
        if stats.get('totalAssignments'):
            context_parts.append(f"- Total Assignments: {stats.get('totalAssignments')}")
    
    # Insights
    if insights:
        insights_text = "\n".join([f"- {insight}" for insight in insights[:3]])
        context_parts.append(f"Recent Insights:\n{insights_text}")
    
    return "\n\n".join(context_parts) if context_parts else "No academic data available yet."


def generate_fallback_response(
    message: str,
    courses: list,
    stats: dict,
    insights: list,
    results_count: int
) -> str:
    """Generate AI response based on message and context"""
    
    # Grade/performance questions
    if any(word in message for word in ['grade', 'score', 'gpa', 'performance', 'average']):
        avg_grade = stats.get('averageGrade', 'N/A')
        total_assignments = results_count
        return f"Based on your current academic data:\n\n" \
               f"• Average Grade: {avg_grade}\n" \
               f"• Total Graded Assignments: {total_assignments}\n" \
               f"• Courses Enrolled: {len(courses)}\n\n" \
               f"I can help you understand your performance in specific courses or provide tips to improve. What would you like to know more about?"
    
    # Course questions
    if any(word in message for word in ['course', 'class', 'subject']):
        if courses:
            course_list = "\n".join([f"• {c.get('name', 'Unknown')} ({c.get('code', 'N/A')})" for c in courses[:5]])
            return f"You're enrolled in {len(courses)} course(s):\n\n{course_list}\n\n" \
                   f"I can help you with:\n" \
                   f"• Assignment details for any course\n" \
                   f"• Grade breakdown by course\n" \
                   f"• Study tips for specific subjects\n\n" \
                   f"Which course would you like to know more about?"
        else:
            return "I don't see any courses in your account yet. Make sure you've connected your Canvas account in Settings to see your courses here."
    
    # Assignment questions
    if any(word in message for word in ['assignment', 'homework', 'due', 'deadline', 'submit']):
        return f"I can help you track your assignments! Here's what I can do:\n\n" \
               f"• Show upcoming assignment due dates\n" \
               f"• Track your submission status\n" \
               f"• Provide reminders for deadlines\n" \
               f"• Help you understand assignment requirements\n\n" \
               f"Would you like to see your upcoming assignments or get help with a specific one?"
    
    # Study tips
    if any(word in message for word in ['study', 'tip', 'improve', 'better', 'help', 'advice']):
        tips = [
            "Review graded assignments to identify patterns in feedback",
            "Focus on courses where you're below your target grade",
            "Create a study schedule for upcoming assignments",
            "Review instructor feedback carefully",
            "Practice with past assignments if available"
        ]
        tips_text = "\n".join([f"• {tip}" for tip in tips])
        return f"Here are some study tips to help you succeed:\n\n{tips_text}\n\n" \
               f"I can provide personalized advice based on your specific courses and performance. What area would you like to focus on?"
    
    # Progress questions
    if any(word in message for word in ['progress', 'trend', 'improving', 'declining']):
        if insights:
            progress_insights = "\n".join([f"• {insight}" for insight in insights[:3]])
            return f"Here's what I notice about your progress:\n\n{progress_insights}\n\n" \
                   f"Would you like more detailed analysis of your performance trends?"
        else:
            return "I can analyze your academic progress and trends. With more graded assignments, I can provide insights about whether you're improving, maintaining, or need to focus on specific areas."
    
    # General help
    if any(word in message for word in ['hello', 'hi', 'hey', 'help', 'what can you']):
        return "I'm your AI academic buddy! I can help you with:\n\n" \
               "📊 **Grades & Performance**\n" \
               "• Check your current grades and GPA\n" \
               "• Understand your performance trends\n" \
               "• Get insights on your academic progress\n\n" \
               "📚 **Courses & Assignments**\n" \
               "• View your enrolled courses\n" \
               "• Track assignment due dates\n" \
               "• Get help with specific assignments\n\n" \
               "💡 **Study Support**\n" \
               "• Personalized study tips\n" \
               "• Improvement strategies\n" \
               "• Academic advice\n\n" \
               "What would you like to know?"
    
    # Default response
    return "I'm here to help! I can assist you with:\n\n" \
           "• Understanding your grades and performance\n" \
           "• Course information and assignments\n" \
           "• Study tips and academic advice\n" \
           "• Answering questions about your progress\n\n" \
           "Try asking me about your grades, courses, assignments, or study tips. What would you like to know?"


def generate_suggestions(message: str, courses: list, stats: dict) -> list:
    """Generate helpful suggestions based on the conversation"""
    suggestions = []
    
    if 'grade' in message or 'score' in message:
        suggestions.extend([
            "Show me my grades by course",
            "What's my average grade?",
            "How can I improve my grades?"
        ])
    
    if 'course' in message or 'class' in message:
        if courses:
            suggestions.extend([
                f"Tell me about {courses[0].get('name', 'my courses')}",
                "Show my assignments",
                "What's my grade in this course?"
            ])
    
    if 'assignment' in message or 'due' in message:
        suggestions.extend([
            "Show upcoming assignments",
            "What assignments are due soon?",
            "Help me with my assignments"
        ])
    
    if not suggestions:
        suggestions = [
            "What are my current grades?",
            "Show me my courses",
            "What assignments are due?",
            "Give me study tips"
        ]
    
    return suggestions[:4]  # Limit to 4 suggestions

