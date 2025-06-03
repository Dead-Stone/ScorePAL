import os
import json
import re
import logging
import google.generativeai as genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

def get_rubric_from_text(question: str, rubric_text: str, api_key: str = None) -> dict:
    """
    Generate a detailed grading rubric in JSON format using Gemini 2.0 Flash.
    
    The generated rubric must meet these conditions:
      - It contains a "total_points" field that is exactly 20.
      - It contains a "sections" array. Each section represents a question and must include:
            "question": a short title or identifier for the question,
            "max_points": an integer indicating the points allocated for that question,
            "criteria": an array of grading criteria (each with "name", "points", and "description").
      - The sum of "max_points" across all sections must equal 20.
      - Output only valid JSON without any extra text.
    
    Args:
        question (str): Question paper or prompt.
        rubric_text (str): Additional context or instructions.
        api_key (str, optional): Gemini API key. If not provided, will try to get from env.
    
    Returns:
        dict: The generated rubric.
        
    Raises:
        Exception: If generation or JSON extraction fails.
    """
    try:
        # Get API key from parameter or environment variable
        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY")
            
        if not api_key:
            raise ValueError("No Gemini API key provided and GEMINI_API_KEY environment variable is not set.")
        
        # Configure Gemini API and instantiate the model
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = (
            """
            You are an expert in educational assessment and rubric design. Your task is to generate a detailed grading rubric in JSON format based on the given criteria. The rubric should be structured with clear sections, each containing multiple criteria with assigned points, descriptions, and response levels for detailed assessment.

            **Instructions:**
            - Output the rubric as a structured JSON object.
            - Include a "total_points" field representing the sum of all section points.
            - Each section should have:
            - A "name" field for the section title.
            - A "max_points" field specifying the maximum points for that section.
            - A "criteria" array containing individual grading criteria.
            - Each criterion should include:
            - A "name" field specifying the criterion.
            - A "points" field denoting the maximum assigned points.
            - A "description" field explaining what the criterion assesses.
            - A "grading_scale" array specifying different performance levels, each containing:
                - A "level" field for the performance category (e.g., "Excellent", "Good", "Fair", "Poor").
                - A "points" field indicating the score associated with that level.
                - A "description" field detailing what is expected at that level.

            **Example Structure:**
            {
            "total_points": 100,
            "sections": [
                {
                "name": "Content Knowledge",
                "max_points": 25,
                "criteria": [
                    {
                    "name": "Accuracy of Information",
                    "points": 10,
                    "description": "The response demonstrates accurate and well-researched knowledge relevant to the topic.",
                    "grading_scale": [
                        {
                        "level": "Excellent",
                        "points": 10,
                        "description": "All information is accurate, well-researched, and well-articulated."
                        },
                        {
                        "level": "Good",
                        "points": 7,
                        "description": "Most information is accurate, with minor inaccuracies that do not affect understanding."
                        },
                        {
                        "level": "Fair",
                        "points": 5,
                        "description": "Some information is inaccurate or lacks supporting evidence."
                        },
                        {
                        "level": "Poor",
                        "points": 2,
                        "description": "Information is mostly incorrect or lacks necessary depth."
                        }
                    ]
                    },
                    {
                    "name": "Depth of Analysis",
                    "points": 15,
                    "description": "Provides in-depth analysis with supporting examples and critical insights.",
                    "grading_scale": [
                        {
                        "level": "Excellent",
                        "points": 15,
                        "description": "Strong analytical depth with critical insights and multiple relevant examples."
                        },
                        {
                        "level": "Good",
                        "points": 10,
                        "description": "Adequate analysis with relevant examples, though some areas need improvement."
                        },
                        {
                        "level": "Fair",
                        "points": 7,
                        "description": "Basic analysis with limited depth and few supporting examples."
                        },
                        {
                        "level": "Poor",
                        "points": 3,
                        "description": "Minimal analysis with little to no supporting evidence."
                        }
                    ]
                    }
                ]
                },
                {
                "name": "Organization & Structure",
                "max_points": 20,
                "criteria": [
                    {
                    "name": "Logical Flow",
                    "points": 10,
                    "description": "Ideas are clearly structured and transitions effectively guide the reader through the content.",
                    "grading_scale": [
                        {
                        "level": "Excellent",
                        "points": 10,
                        "description": "Logical and seamless flow between ideas with strong transitions."
                        },
                        {
                        "level": "Good",
                        "points": 7,
                        "description": "Ideas are generally well-structured, but transitions could be improved."
                        },
                        {
                        "level": "Fair",
                        "points": 5,
                        "description": "Some organization is evident, but ideas jump around and lack clear transitions."
                        },
                        {
                        "level": "Poor",
                        "points": 2,
                        "description": "Lacks clear organization, making comprehension difficult."
                        }
                    ]
                    }
                ]
                }
            ]
            }
            ```
            - Ensure that the total points across all sections sum up to the value defined in the "total_points" field.
            - The rubric should be applicable to all educational submissions as per their course work.
            - Adapt the rubric to fit different complexity levels and educational standards.
            - Include detailed descriptions for each criterion to guide accurate assessment."""
            f"Given the quesion paper: {question}"
            f"Now, generate a JSON rubric tailored to the following context: {rubric_text}"
            
        )
        
        generation_config = types.GenerationConfig(
            max_output_tokens=1024,
            temperature=0.5,
            top_p=0.9
        )
        
        # response = model.generate_content(prompt, generation_config=generation_config)
        response = model.generate_content(prompt)
        logger.info(f"Generated response from Gemini for rubric generation")
        
        # Extract JSON from the response using regex
        json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON content found in the response.")
        json_text = json_match.group(0)
        rubric = json.loads(json_text)
        return rubric
    except Exception as e:
        logger.error(f"Error generating rubric from text: {e}")
        raise

# Example usage:
if __name__ == "__main__":
    context = (
        "Generating rubric... total of 20 marks, Divide the points into each question. "
        "Make sure to have all questions covered."
    )
    try:
        rubric = get_rubric_from_text("",context)
        print(json.dumps(rubric, indent=2))
    except Exception as e:
        print(f"Rubric generation failed: {e}")
