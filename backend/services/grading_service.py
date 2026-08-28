import re
import os
import logging

# Set up logging
logger = logging.getLogger(__name__)

class GradingService:
    def __init__(self, api_key=None):
        """Initialize the grading service with API key."""
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if self.api_key:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
        else:
            logger.warning("No Gemini API key provided. Grading service will not function properly.")
            self.client = None
    
    async def generate_text(self, system_prompt, user_prompt):
        """Generate text using Gemini API."""
        try:
            if not self.api_key or not self.client:
                raise ValueError("No API key configured for Gemini")
            
            # Combine system and user prompts
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # Use new Client pattern with free model
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"Error generating text with Gemini: {str(e)}")
            return f"Error generating text: {str(e)}"

    async def grade_submission_text(self, submission_text, student_id=None, submission_id=None):
        """
        Grade a submission text directly.
        
        Args:
            submission_text: The text content of the submission
            student_id: Optional student ID
            submission_id: Optional submission ID
            
        Returns:
            Dictionary with grading results
        """
        try:
            if not submission_text or len(submission_text.strip()) < 10:
                return {
                    "error": "Submission text is too short or empty",
                    "score": 0,
                    "feedback": "The submission could not be graded due to insufficient content."
                }
            
            # Create a system prompt for grading
            system_prompt = """You are an educational grading assistant. Your task is to grade the student submission.
Please evaluate the submission based on:
1. Content quality and accuracy
2. Completeness of the response
3. Critical thinking and analysis
4. Clarity and organization

Provide a numerical score (0-100) and specific feedback explaining the grade."""
            
            # Create a user prompt with the submission
            user_prompt = f"""Please grade the following submission:

SUBMISSION:
{submission_text}

Provide a score (0-100) and detailed feedback."""

            # Call the Gemini API
            response = await self.generate_text(
                system_prompt=system_prompt,
                user_prompt=user_prompt
            )
            
            # Extract score and feedback
            score = 0
            feedback = ""
            
            # Try to extract score using regex
            score_match = re.search(r"score:?\s*(\d+)[/]?100", response, re.IGNORECASE)
            if score_match:
                score = int(score_match.group(1))
            else:
                # Look for numerical values that could be scores
                potential_scores = re.findall(r"[^\d](\d{1,3})[^\d]", response)
                for potential_score in potential_scores:
                    num = int(potential_score)
                    if 0 <= num <= 100:
                        score = num
                        break
            
            # The rest is feedback
            feedback = response
            
            return {
                "student_id": student_id,
                "submission_id": submission_id,
                "score": score,
                "feedback": feedback,
                "raw_response": response
            }
            
        except Exception as e:
            logger.error(f"Error grading submission text: {str(e)}")
            return {
                "error": str(e),
                "score": 0,
                "feedback": "An error occurred during grading."
            } 