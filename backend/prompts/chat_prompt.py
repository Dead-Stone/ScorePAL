from typing import Dict, Any, Optional, List

def create_grading_chat_prompt(
    question_text: str, 
    model_answer: str, 
    submission: str, 
    rubric: Dict[str, Any], 
    strictness_level: int = 1
) -> List[Dict[str, str]]:
    """
    Creates a structured chat prompt with system and user messages for grading.
    
    Args:
        question_text: The text of the question/assignment
        model_answer: The model/reference answer or grading key
        submission: The student's submission to grade
        rubric: The grading rubric with criteria
        strictness_level: How strict the grading should be (1-5)
        
    Returns:
        List of message dictionaries in chat format
    """
    # Format rubric criteria for better readability
    rubric_text = ""
    if "criteria" in rubric and isinstance(rubric["criteria"], list):
        for i, criterion in enumerate(rubric["criteria"], 1):
            name = criterion.get("name", f"Criterion {i}")
            description = criterion.get("description", "")
            points = criterion.get("points", 0)
            rubric_text += f"• {name} ({points} points): {description}\n"
    else:
        # Simple rubric format
        max_score = rubric.get("max_score", 100)
        rubric_text = f"Total points: {max_score}\n"
        if "description" in rubric:
            rubric_text += rubric["description"]

    # Map strictness level to descriptions
    strictness_descriptions = {
        1: "Be lenient and give students the benefit of the doubt.",
        2: "Be somewhat lenient but ensure key concepts are addressed.",
        3: "Apply standard academic expectations.",
        4: "Be somewhat strict and expect thorough understanding.",
        5: "Be very strict and expect detailed, precise answers."
    }
    
    strictness_text = strictness_descriptions.get(strictness_level, strictness_descriptions[3])
    
    # Create the system message with all context
    system_message = {
        "role": "system",
        "content": f"""You are an experienced educational grader with expertise in assessing student submissions.
        
Your task is to grade a student's submission based on the provided question, model answer, and rubric.

GRADING INSTRUCTIONS:
1. Carefully analyze the student submission against the rubric criteria
2. Identify specific strengths and weaknesses
3. Provide constructive feedback
4. Apply a strictness level of {strictness_level}/5: {strictness_text}
5. Remain objective and consistent in your evaluation

After grading, provide your response in this exact JSON format:
{{
    "score": <numerical_score>,
    "total": <total_possible_points>,
    "mistakes": {{
        "error1": "description of the first error or misconception",
        "error2": "description of the second error or misconception",
        ...
    }},
    "grading_feedback": "Detailed feedback explaining the grade with specific examples from the submission"
}}

Return ONLY the JSON object with no additional text before or after.
"""
    }
    
    # Create the user message with the actual content to grade
    user_message = {
        "role": "user",
        "content": f"""# QUESTION:
{question_text}

# MODEL ANSWER:
{model_answer}

# RUBRIC:
{rubric_text}

# STUDENT SUBMISSION:
{submission}

Please grade this submission and provide the results in the requested JSON format.
"""
    }
    
    return [system_message, user_message]

def create_feedback_chat_prompt(
    question_text: str,
    submission: str,
    grading_results: Dict[str, Any],
    tone: str = "constructive"
) -> List[Dict[str, str]]:
    """
    Creates a chat prompt for generating personalized feedback based on grading results.
    
    Args:
        question_text: The text of the question/assignment
        submission: The student's submission
        grading_results: The results from grading (scores, mistakes, etc.)
        tone: The tone of the feedback (constructive, encouraging, critical)
        
    Returns:
        List of message dictionaries in chat format
    """
    # Extract grading information
    score = grading_results.get("score", 0)
    total = grading_results.get("total", 100)
    percentage = (score / total) * 100 if total > 0 else 0
    mistakes = grading_results.get("mistakes", {})
    grading_feedback = grading_results.get("grading_feedback", "")
    
    # Define tone adjustments
    tone_instructions = {
        "constructive": "Focus on actionable improvements while acknowledging strengths.",
        "encouraging": "Emphasize strengths and progress while gently noting areas for improvement.",
        "critical": "Provide direct, candid feedback on weaknesses with clear expectations for improvement."
    }
    
    tone_instruction = tone_instructions.get(tone, tone_instructions["constructive"])
    
    # Create the system message
    system_message = {
        "role": "system",
        "content": f"""You are an experienced educator providing personalized feedback to a student.

Your task is to generate detailed, helpful feedback on the student's submission that will help them improve.

FEEDBACK INSTRUCTIONS:
1. Use a {tone} tone: {tone_instruction}
2. Start with a brief summary of the student's performance
3. Highlight specific strengths from the submission
4. Address key areas for improvement based on the identified mistakes
5. Provide specific examples and suggestions for how to improve
6. End with encouragement and next steps

Your feedback should be personalized, specific, and actionable.
"""
    }
    
    # Format mistakes for the prompt
    mistakes_text = ""
    for i, (error, description) in enumerate(mistakes.items(), 1):
        mistakes_text += f"{i}. {error}: {description}\n"
    
    if not mistakes_text:
        mistakes_text = "No specific mistakes were identified."
    
    # Create the user message
    user_message = {
        "role": "user",
        "content": f"""# QUESTION:
{question_text}

# STUDENT SUBMISSION:
{submission}

# GRADING RESULTS:
Score: {score}/{total} ({percentage:.1f}%)

# IDENTIFIED MISTAKES:
{mistakes_text}

# GRADER COMMENTS:
{grading_feedback}

Please provide personalized, {tone} feedback for this student based on their submission and the grading results.
"""
    }
    
    return [system_message, user_message]

# Example usage:
# grading_messages = create_grading_chat_prompt(question, answer, submission, rubric, 3)
# feedback_messages = create_feedback_chat_prompt(question, submission, grading_results, "encouraging")