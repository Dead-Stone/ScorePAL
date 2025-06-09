import json
from .enhanced_accuracy_prompts import enhance_prompt_with_accuracy

def get_code_grading_prompt(submission: str, rubric: dict, file_metadata: dict, strictness_level: int = 3) -> str:
    """
    Generates a specialized grading prompt for code submissions.
    
    Parameters:
    - submission (str): The code submission with analysis.
    - rubric (dict): A dictionary detailing the grading rubric with point allocations.
    - file_metadata (dict): Metadata about the file including language and analysis.
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
    
    # Get language and analysis from metadata
    language = file_metadata.get('language', 'unknown')
    analysis = file_metadata.get('analysis', {})
    
    # Language-specific evaluation criteria
    language_specifics = {
        'python': {
            'style_guide': 'PEP 8',
            'key_features': 'proper use of Python idioms, list comprehensions, error handling',
            'common_issues': 'naming conventions, imports, exception handling'
        },
        'java': {
            'style_guide': 'Java Code Conventions',
            'key_features': 'proper OOP design, exception handling, encapsulation',
            'common_issues': 'naming conventions, access modifiers, null handling'
        },
        'javascript': {
            'style_guide': 'JavaScript Standard Style',
            'key_features': 'proper use of ES6+ features, async/await, error handling',
            'common_issues': 'variable declarations, callback handling, scope issues'
        },
        'cpp': {
            'style_guide': 'Google C++ Style Guide',
            'key_features': 'memory management, RAII, const correctness',
            'common_issues': 'memory leaks, undefined behavior, pointer usage'
        },
        'c': {
            'style_guide': 'Linux Kernel Style',
            'key_features': 'proper memory management, error checking, modularity',
            'common_issues': 'memory leaks, buffer overflows, null pointer dereference'
        }
    }
    
    lang_info = language_specifics.get(language, {
        'style_guide': 'Standard conventions',
        'key_features': 'clean code principles, proper structure',
        'common_issues': 'readability, maintainability, error handling'
    })
    
    # Construct the prompt
    prompt = f"""You are an experienced computer science instructor evaluating a {language.upper()} programming assignment. Use your expertise in software development and code quality assessment to provide a comprehensive evaluation.

---

**PROGRAMMING ASSIGNMENT EVALUATION**

**Language:** {language.upper()}
**Style Guide Reference:** {lang_info['style_guide']}
**File Analysis:**
- Functions: {len(analysis.get('functions', []))}
- Classes: {len(analysis.get('classes', []))}
- Imports: {len(analysis.get('imports', []))}
- Comment Ratio: {analysis.get('comment_ratio', 0):.1%}

**CODE EVALUATION FRAMEWORK:**

**1. CORRECTNESS & FUNCTIONALITY**
- Does the code solve the intended problem?
- Are there logical errors or bugs?
- Does it handle edge cases appropriately?
- Are algorithms implemented correctly?

**2. CODE QUALITY & STYLE**
- Follows {lang_info['style_guide']} conventions
- Consistent naming conventions (variables, functions, classes)
- Proper indentation and formatting
- {lang_info['key_features']}

**3. DOCUMENTATION & COMMENTS**
- Adequate inline comments explaining complex logic
- Function/method documentation
- Clear variable and function names (self-documenting code)
- Header comments where appropriate

**4. EFFICIENCY & BEST PRACTICES**
- Appropriate algorithm complexity
- Efficient use of data structures
- Avoids common pitfalls: {lang_info['common_issues']}
- Follows language-specific best practices

**5. STRUCTURE & ORGANIZATION**
- Logical code organization
- Proper separation of concerns
- Modular design (functions/classes used effectively)
- Clean architecture principles

---

**EXAMPLE EVALUATION:**

*Example: Python Function*

```python
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)
```

**Evaluation Process:**
Thought: Check correctness - function calculates average but doesn't handle empty list.
Action: Deduct points for missing error handling (division by zero).
Thought: Style looks clean, follows Python conventions.
Action: Full points for style and readability.
Thought: No documentation provided.
Action: Deduct points for missing docstring and comments.
Thought: Algorithm is correct but not optimal (could use built-in sum()).
Action: Partial credit for efficiency.

---

**SUBMISSION TO EVALUATE:**

{submission}

**GRADING RUBRIC:**
{rubric_json}

**EVALUATION INSTRUCTIONS:**

1. **Analyze the code structure and functionality**
   - Identify the main components (functions, classes, algorithms)
   - Check for correctness and logical flow
   - Look for potential bugs or issues

2. **Assess code quality**
   - Check adherence to {lang_info['style_guide']}
   - Evaluate naming conventions and readability
   - Look for {lang_info['key_features']}

3. **Evaluate documentation**
   - Check for appropriate comments and documentation
   - Assess code self-documentation through naming

4. **Check efficiency and best practices**
   - Identify algorithm complexity
   - Look for common issues: {lang_info['common_issues']}
   - Assess use of language-specific features

5. **Provide constructive feedback**
   - Highlight strengths in the code
   - Suggest specific improvements
   - Reference best practices and conventions

**GRADING APPROACH:**
Apply a {strictness_desc} grading standard (level {strictness_level} out of 5).
Consider both functional correctness and code quality equally important.

**CRITICAL SCORING RULES:**
1. **CALCULATE TOTAL FROM CRITERIA**: The "score" field MUST equal the sum of all "points" in criteria_scores
2. **VALIDATE POINTS**: Each criterion's "points" must be ≤ its "max_points"
3. **USE RUBRIC EXACTLY**: Use the exact criterion names and max_points from the provided rubric
4. **SHOW YOUR MATH**: Calculate the total step by step to ensure accuracy

**SCORING CALCULATION EXAMPLE:**
If criteria_scores = [
  {{"name": "Correctness", "points": 25, "max_points": 30}},
  {{"name": "Style", "points": 20, "max_points": 25}},
  {{"name": "Documentation", "points": 15, "max_points": 20}}
]
Then: score = 25 + 20 + 15 = 60 (NOT some other number)

**SELF-ASSESSMENT ACCURACY REQUIREMENTS:**
Before finalizing your response, evaluate your own grading accuracy:

1. **Mathematical Accuracy**: Are your calculations correct? Does the total equal the sum?
2. **Evidence Quality**: Did you provide specific examples and code references?
3. **Feedback Quality**: Is your feedback detailed, constructive, and actionable?
4. **Score Reasonableness**: Are your scores fair and well-distributed?

Rate each factor from 0.0 to 1.0 based on your confidence.

**OUTPUT FORMAT:**
Provide only a JSON object in this exact format:

{{
  "score": <sum_of_all_criteria_points>,
  "total": <sum_of_all_max_points_from_rubric>,
  "criteria_scores": [
    {{
      "name": "<exact_criterion_name_from_rubric>",
      "points": <points_earned_0_to_max>,
      "max_points": <exact_max_points_from_rubric>,
      "feedback": "<Specific technical feedback with code examples and line references>"
    }}
  ],
  "grading_feedback": "<Overall summary: strengths, main issues, and specific improvement suggestions for this {language} code>",
  "mistakes": {{
    "error1": "<Specific code issue with explanation>",
    "error2": "<Another improvement area>",
    "error3": "<Additional technical feedback>"
  }},
  "self_assessment": {{
    "mathematical_accuracy": <0.0_to_1.0_confidence_in_calculations>,
    "evidence_quality": <0.0_to_1.0_quality_of_specific_examples>,
    "feedback_quality": <0.0_to_1.0_constructiveness_and_detail>,
    "score_reasonableness": <0.0_to_1.0_fairness_of_scoring>,
    "overall_confidence": <0.0_to_1.0_overall_evaluation_confidence>,
    "accuracy_notes": "<brief_explanation_of_confidence_level>"
  }}
}}

**IMPORTANT:**
- Reference specific parts of the code in your feedback
- Provide actionable suggestions for improvement
- Consider both novice and advanced {language} programming concepts
- Be constructive and educational in your comments

Begin your code evaluation now.
"""
    
    # Enhance prompt with accuracy improvements
    enhanced_prompt = enhance_prompt_with_accuracy(prompt, "code")
    
    return enhanced_prompt


def get_enhanced_general_prompt(submission: str, rubric: dict, file_metadata: dict, strictness_level: int = 3) -> str:
    """
    Enhanced general grading prompt that adapts based on file type.
    
    Parameters:
    - submission (str): The submission content with analysis.
    - rubric (dict): A dictionary detailing the grading rubric.
    - file_metadata (dict): Metadata about the file type and content.
    - strictness_level (int): Grading strictness level.
    
    Returns:
    - str: A formatted prompt string.
    """
    
    file_type = file_metadata.get('file_type', 'unknown')
    
    # Route to specialized prompts based on file type
    if file_type == 'code':
        return get_code_grading_prompt(submission, rubric, file_metadata, strictness_level)
    
    # Use enhanced general prompt for other types
    rubric_json = json.dumps(rubric, indent=2)
    
    strictness_terms = {
        0: "very lenient",
        1: "lenient",
        2: "moderately lenient", 
        3: "moderate",
        4: "moderately strict",
        5: "strict"
    }
    
    strictness_desc = strictness_terms.get(strictness_level, "moderate")
    
    # File type specific instructions
    type_instructions = {
        'pdf': "Evaluate this document submission focusing on content quality, organization, and academic rigor.",
        'word': "Assess this document for content quality, structure, and adherence to academic standards.",
        'text': "Evaluate this text submission for content, clarity, and completeness.",
        'markdown': "Assess this markdown document for content quality, structure, and formatting.",
        'jupyter': "Evaluate this Jupyter notebook for code quality, analysis, and documentation.",
        'data': "Assess this data file for structure, completeness, and analytical value.",
        'image': "Evaluate this image submission, considering any extracted text and visual content.",
        'archive': "Assess the contents of this archive, evaluating each component appropriately.",
        'config': "Evaluate this configuration file for correctness, completeness, and best practices."
    }
    
    instruction = type_instructions.get(file_type, "Evaluate this submission based on the provided rubric and academic standards.")
    
    prompt = f"""You are an experienced instructor evaluating a student submission. {instruction}

**SUBMISSION TYPE:** {file_type.upper()}
**FILE METADATA:** {json.dumps(file_metadata, indent=2)}

**SUBMISSION CONTENT:**
{submission}

**GRADING RUBRIC:**
{rubric_json}

**EVALUATION INSTRUCTIONS:**

1. **Content Analysis**
   - Assess the depth and accuracy of the content
   - Check for completeness and relevance
   - Evaluate understanding of the subject matter

2. **Quality Assessment**
   - Check organization and structure
   - Assess clarity of communication
   - Evaluate presentation and formatting

3. **Academic Standards**
   - Apply appropriate academic rigor
   - Check for evidence and support
   - Assess critical thinking and analysis

**GRADING APPROACH:**
Apply a {strictness_desc} grading standard (level {strictness_level} out of 5).

**CRITICAL SCORING RULES:**
1. **CALCULATE TOTAL FROM CRITERIA**: The "score" field MUST equal the sum of all "points" in criteria_scores
2. **VALIDATE POINTS**: Each criterion's "points" must be ≤ its "max_points"  
3. **USE RUBRIC EXACTLY**: Use the exact criterion names and max_points from the provided rubric
4. **ENSURE CONSISTENCY**: Double-check that your math is correct

**SCORING VERIFICATION:**
Before submitting your response, verify:
- Sum of criteria points = total score
- Each criterion point ≤ its max_points
- All criterion names match the rubric exactly

**SELF-ASSESSMENT ACCURACY REQUIREMENTS:**
Before finalizing your response, evaluate your own grading accuracy:

1. **Mathematical Accuracy**: Are your calculations correct? Does the total equal the sum?
2. **Evidence Quality**: Did you provide specific examples and references from the submission?
3. **Feedback Quality**: Is your feedback detailed, constructive, and actionable?
4. **Score Reasonableness**: Are your scores fair and well-distributed according to the rubric?

Rate each factor from 0.0 to 1.0 based on your confidence.

**OUTPUT FORMAT:**
{{
  "score": <sum_of_all_criteria_points>,
  "total": <sum_of_all_max_points_from_rubric>,
  "criteria_scores": [
    {{
      "name": "<exact_criterion_name_from_rubric>",
      "points": <points_earned_0_to_max>,
      "max_points": <exact_max_points_from_rubric>,
      "feedback": "<Detailed feedback explaining the score for this criterion>"
    }}
  ],
  "grading_feedback": "<Overall assessment highlighting strengths, weaknesses, and improvement suggestions>",
  "mistakes": {{
    "issue1": "<Specific area needing improvement>",
    "issue2": "<Another suggestion for enhancement>",
    "issue3": "<Additional constructive feedback>"
  }},
  "self_assessment": {{
    "mathematical_accuracy": <0.0_to_1.0_confidence_in_calculations>,
    "evidence_quality": <0.0_to_1.0_quality_of_specific_examples>,
    "feedback_quality": <0.0_to_1.0_constructiveness_and_detail>,
    "score_reasonableness": <0.0_to_1.0_fairness_of_scoring>,
    "overall_confidence": <0.0_to_1.0_overall_evaluation_confidence>,
    "accuracy_notes": "<brief_explanation_of_confidence_level>"
  }}
}}

Begin your evaluation now.
"""
    
    # Enhance prompt with accuracy improvements
    enhanced_prompt = enhance_prompt_with_accuracy(prompt, "general")
    
    return enhanced_prompt 