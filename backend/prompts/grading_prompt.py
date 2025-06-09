import json

def get_grading_prompt(question_text: str, answer_key: str, submission: str, rubric: dict, strictness_level: int = 3) -> str:
    """
    Generates a grading prompt using the ReAct framework with few-shot examples.
    
    Parameters:
    - question_text (str): The exam question.
    - answer_key (str): The model answer or key points expected. Can be empty if not available.
    - submission (str): The student's submission.
    - rubric (dict): A dictionary detailing the grading rubric with point allocations.
    - strictness_level (int): An integer from 0 (most lenient) to 5 (most strict) indicating grading strictness.
    
    Returns:
    - str: A formatted prompt string ready for use with a language model.
    """
    
    # Format the rubric as a JSON string with indentation for readability
    rubric_json = json.dumps(rubric, indent=2)
    
    # Map strictness level to descriptive term
    strictness_terms = {
        0: "very lenient",
        1: "lenient",
        2: "moderately lenient",
        3: "moderate",
        4: "moderately strict",
        5: "strict"
    }
    
    strictness_desc = strictness_terms.get(strictness_level, "moderate")
    
    # Adjust expected score range based on strictness
    min_score_pct = 95 - (strictness_level * 5)
    max_score_pct = 100 - (strictness_level * 2)
    
    # Construct the prompt
    prompt = f"""You are an experienced instructor tasked with evaluating a student's exam submission. Utilize the provided question, rubric, and student response to assess the submission. Follow the ReAct (Reasoning and Acting) framework to ensure a thorough and structured evaluation.

---

**Few-Shot Example:**

*Example 1:*

**Question:**
Explain the concept of Newton's First Law of Motion.

**Rubric:**
{{
  "criteria": [
    {{
      "name": "Definition Accuracy",
      "max_points": 5,
      "description": "Accuracy and completeness of the definition"
    }},
    {{
      "name": "Example Provided",
      "max_points": 3,
      "description": "Quality and relevance of examples"
    }},
    {{
      "name": "Clarity of Explanation",
      "max_points": 2,
      "description": "Overall clarity and organization"
    }}
  ]
}}

**Student Submission:**
"Newton's First Law states that an object will stay at rest or keep moving unless something makes it change."

**Evaluation:**
Thought: The student provides a general idea but lacks precision in terminology.
Action: Assess "Definition Accuracy" - Deduct 2 points for missing key terms like "inertia" and "net external force".
Thought: No example is provided.
Action: Assess "Example Provided" - Deduct all 3 points since no example was given.
Thought: The explanation is somewhat clear but could be more precise.
Action: Assess "Clarity of Explanation" - Deduct 1 point for lack of precision.

**Final JSON Output:**
{{
  "student_name": "",
  "score": 4,
  "total": 10,
  "criteria_scores": [
    {{
      "name": "Definition Accuracy",
      "points": 3,
      "max_points": 5,
      "feedback": "Missing key terms such as 'inertia' and 'net external force'."
    }},
    {{
      "name": "Example Provided",
      "points": 0,
      "max_points": 3,
      "feedback": "No example was provided to illustrate the concept."
    }},
    {{
      "name": "Clarity of Explanation",
      "points": 1,
      "max_points": 2,
      "feedback": "Explanation lacks precision and could be clearer."
    }}
  ],
  "mistakes": {{
    "1": "Missing key terms such as 'inertia' and 'net external force'.",
    "2": "No example was provided to illustrate the concept.",
    "3": "Explanation lacks precision and could be clearer."
  }},
  "grading_feedback": "The submission shows a basic understanding but lacks key terminology and an illustrative example. Improve clarity and include examples to enhance your explanation."
}}

---

**Now, proceed to evaluate the following submission:**

**Question:**
{question_text}

**Answer Key:**
{answer_key if answer_key else "No specific answer key provided. Use your expert judgment."}

**Rubric:**
{rubric_json}

**Student Submission:**
{submission}

**Instructions:**
1. Analyze the student's response in relation to the question and rubric.
2. For each criterion in the rubric, determine if the student met the expectations.
3. Use the ReAct framework:
   - Thought: Reflect on the student's response concerning each criterion.
   - Action: Assess points earned for each criterion and provide specific feedback.
4. Compile the scores and feedback into a structured JSON object.
5. Always give specific feedback for each criterion.
6. Apply a {strictness_desc} grading approach as specified.
7. Read the student's submission carefully and understand the student's intent.

**CRITICAL SCORING REQUIREMENTS:**
- **MATH MUST BE CORRECT**: The "score" field MUST equal the sum of all criteria "points"
- **VALIDATE EACH CRITERION**: Each criterion's "points" must be ≤ its "max_points"
- **USE EXACT RUBRIC**: Use the exact criterion names and max_points from the provided rubric
- **DOUBLE-CHECK CALCULATION**: Verify your arithmetic before finalizing

**SCORING VERIFICATION PROCESS:**
1. Award points for each criterion based on student performance
2. Sum all criterion points to get the total score
3. Verify: total score = sum of all criterion points
4. Ensure no criterion exceeds its maximum points

**Output Format:**
Provide only the JSON object in the following format:
{{
  "score": <sum_of_all_criteria_points>,
  "total": <sum_of_all_max_points_from_rubric>,
  "criteria_scores": [
    {{
      "name": "<exact_criterion_name_from_rubric>",
      "points": <points_earned_0_to_max>,
      "max_points": <exact_max_points_from_rubric>,
      "feedback": "<Specific feedback explaining why this score was awarded>"
    }}
  ],
  "grading_feedback": "<Overall assessment covering strengths, weaknesses, and improvement suggestions>",
  "mistakes": {{
    "error1": "<First notable mistake or area for improvement>",
    "error2": "<Second notable mistake or area for improvement>",
    "error3": "<Additional feedback or improvement area>"
  }}
}}

**Strictness Level:**
Apply a {strictness_desc} grading approach (level {strictness_level} out of 5).
With this strictness level, the score should typically fall between {min_score_pct}% and {max_score_pct}% of the maximum score for a good submission.

Begin your evaluation now.
"""
    return prompt
