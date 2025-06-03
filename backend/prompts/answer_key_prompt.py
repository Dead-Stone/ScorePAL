import json

def get_answer_key_prompt(questions_text: str, rubric: dict) -> str:
    return f"""
You are an expert instructor in computer networking. Given the following exam questions and detailed rubric, generate a complete answer key that meets these criteria:
1. Clearly lists each question or section title.
2. Provides the correct answer for each question. If questions are not type A then grade the students answer in general knowledge(lenient). Type A- questions with defined answers should be graded as such.
3. Includes a detailed explanation for the answer, highlighting key concepts, calculation steps, and rationale.
4. Explicitly matches the rubric criteria for full or partial credit.
5. Outputs only valid JSON following this format:
{{
  "answer_key": [
    {{
      "section": "<Section or question title>",
      "answer": "<The correct answer>",
      "explanation": "<Detailed explanation and reasoning>"
    }},
    ...
  ]
}}

Questions:
{questions_text}

Rubric:
{json.dumps(rubric, indent=2)}

Ensure the JSON structure is valid and nothing else is output.
"""

