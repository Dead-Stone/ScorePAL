import json
from typing import Dict, Any, List

class EnhancedPromptSystem:
    """Enhanced prompt system for improved grading accuracy."""
    
    @staticmethod
    def get_enhanced_grading_prompt(
        submission: str, 
        rubric: dict, 
        file_metadata: dict, 
        strictness_level: int = 3,
        agent_focus: str = "overall_quality"
    ) -> str:
        """
        Generate enhanced grading prompt with improved accuracy features.
        """
        
        rubric_json = json.dumps(rubric, indent=2)
        
        # Agent-specific instructions
        agent_instructions = {
            "technical_accuracy": "Focus particularly on technical correctness, proper methodology, and accurate implementation.",
            "overall_quality": "Provide a balanced evaluation considering all aspects of the assignment equally.",
            "effort_and_understanding": "Emphasize student understanding and effort, being more forgiving of minor technical issues.",
            "domain_expertise": "Apply deep subject matter expertise and advanced evaluation criteria.",
            "clarity_and_presentation": "Focus on communication clarity, organization, and presentation quality."
        }
        
        focus_instruction = agent_instructions.get(agent_focus, agent_instructions["overall_quality"])
        
        prompt = f"""You are an expert academic evaluator with advanced training in educational assessment. Your task is to provide a highly accurate, fair, and detailed evaluation of this student submission.

**EVALUATION FOCUS:** {focus_instruction}

**ENHANCED ACCURACY GUIDELINES:**

1. **SYSTEMATIC EVALUATION PROCESS:**
   - First, read the entire submission carefully
   - Identify the main requirements and objectives
   - Evaluate each criterion systematically
   - Cross-check scores for consistency
   - Provide specific evidence for each score

2. **EVIDENCE-BASED SCORING:**
   - Quote specific parts of the submission that support your scores
   - Explain WHY you awarded each score
   - Reference specific rubric criteria in your reasoning
   - Avoid subjective opinions without evidence

3. **ACCURACY CALIBRATION:**
   - Use the full scoring range (0-100% of available points)
   - Avoid clustering scores in the middle range
   - Be precise with partial credit
   - Consider the academic level and context

4. **QUALITY ASSURANCE:**
   - Verify that criterion scores sum to the total
   - Ensure feedback is constructive and specific
   - Check for logical consistency across criteria
   - Validate that scores reflect the actual quality demonstrated

**SUBMISSION ANALYSIS:**

**File Type:** {file_metadata.get('file_type', 'unknown')}
**Content Length:** {len(submission)} characters
**Special Considerations:** {file_metadata.get('analysis', {})}

**SUBMISSION CONTENT:**
{submission}

**GRADING RUBRIC:**
{rubric_json}

**DETAILED EVALUATION PROCESS:**

**STEP 1: CONTENT ANALYSIS**
Analyze what the student has submitted:
- What are the main components/sections?
- What requirements are addressed?
- What is the overall quality level?
- Are there any standout strengths or weaknesses?

**STEP 2: CRITERION-BY-CRITERION EVALUATION**
For each rubric criterion:
- Identify relevant evidence in the submission
- Apply the scoring standards objectively  
- Assign points with clear justification
- Provide specific, actionable feedback

**STEP 3: CONSISTENCY CHECK**
- Verify mathematical accuracy
- Ensure criteria scores align with overall quality
- Check that feedback matches assigned scores
- Confirm fair and consistent application of standards

**STEP 4: FINAL QUALITY REVIEW**
- Overall coherence of the evaluation
- Appropriateness of tone and constructiveness
- Completeness of feedback
- Accuracy of final scoring

**CRITICAL ACCURACY REQUIREMENTS:**
- Calculate the total score as the exact sum of all criterion points
- Each criterion score must be ≤ its maximum points
- Provide specific examples from the submission in feedback
- Use precise numerical scores (not ranges)
- Explain your reasoning for partial credit decisions

**ENHANCED FEEDBACK STRUCTURE:**
For each criterion, provide:
1. Score awarded and maximum possible
2. Specific evidence from submission
3. What was done well
4. What could be improved
5. Specific suggestions for enhancement

**OUTPUT FORMAT:**
Provide ONLY a JSON object with this exact structure:

{{
  "score": <exact_sum_of_all_criteria_points>,
  "total": <sum_of_all_max_points_from_rubric>,
  "criteria_scores": [
    {{
      "name": "<exact_criterion_name_from_rubric>",
      "points": <precise_points_earned>,
      "max_points": <exact_max_points_from_rubric>,
      "evidence": "<specific_quotes_or_references_from_submission>",
      "strengths": "<what_was_done_well_for_this_criterion>",
      "improvements": "<specific_suggestions_for_improvement>",
      "feedback": "<comprehensive_feedback_combining_above_elements>"
    }}
  ],
  "overall_assessment": {{
    "strengths": ["<major_strength_1>", "<major_strength_2>", "<major_strength_3>"],
    "areas_for_improvement": ["<improvement_area_1>", "<improvement_area_2>", "<improvement_area_3>"],
    "recommendations": ["<specific_recommendation_1>", "<specific_recommendation_2>"]
  }},
  "grading_feedback": "<comprehensive_overall_feedback_summarizing_evaluation>",
  "confidence_indicators": {{
    "score_certainty": "<high/medium/low>",
    "evidence_quality": "<strong/moderate/weak>",
    "evaluation_notes": "<any_special_considerations_or_limitations>"
  }}
}}

**VERIFICATION CHECKLIST:**
Before finalizing your response, verify:
- [ ] Total score equals sum of criterion points
- [ ] Each criterion score ≤ its maximum
- [ ] All rubric criteria are addressed
- [ ] Feedback includes specific evidence
- [ ] Scores reflect demonstrated quality
- [ ] Mathematical calculations are correct

Begin your systematic evaluation now."""

        return prompt
    
    @staticmethod
    def get_code_accuracy_prompt(
        submission: str, 
        rubric: dict, 
        file_metadata: dict, 
        strictness_level: int = 3
    ) -> str:
        """Enhanced prompt specifically for code submissions with accuracy focus."""
        
        language = file_metadata.get('language', 'unknown')
        analysis = file_metadata.get('analysis', {})
        
        return f"""You are an expert programming instructor and code reviewer with extensive experience in {language} development and academic assessment.

**CODE EVALUATION FRAMEWORK FOR MAXIMUM ACCURACY:**

**1. FUNCTIONAL CORRECTNESS (Primary Factor)**
- Does the code solve the stated problem correctly?
- Are there logical errors or bugs?
- Does it handle edge cases and error conditions?
- Test the logic mentally with sample inputs

**2. CODE QUALITY ASSESSMENT**
- Follows {language} best practices and conventions
- Proper variable naming and code organization
- Appropriate use of language features
- Code efficiency and optimization

**3. DOCUMENTATION AND CLARITY**
- Adequate comments explaining complex logic
- Clear function/method documentation
- Self-documenting code through good naming
- Overall readability and maintainability

**CODE ANALYSIS:**
- **Language:** {language}
- **Functions Detected:** {len(analysis.get('functions', []))}
- **Classes Detected:** {len(analysis.get('classes', []))}
- **Import Statements:** {len(analysis.get('imports', []))}
- **Comment Density:** {analysis.get('comment_ratio', 0):.1%}

**ENHANCED CODE EVALUATION PROCESS:**

**STEP 1: SYNTAX AND STRUCTURE ANALYSIS**
- Check for syntax errors or obvious issues
- Analyze program structure and organization
- Evaluate use of appropriate data structures

**STEP 2: LOGIC AND ALGORITHM REVIEW**
- Trace through the algorithm step by step
- Verify correctness of core logic
- Check for potential runtime errors
- Assess algorithm efficiency

**STEP 3: CODE QUALITY INSPECTION**
- Review naming conventions and style
- Check for proper error handling
- Evaluate code modularity and reusability
- Assess adherence to best practices

**STEP 4: FUNCTIONALITY VERIFICATION**
- Would this code work as intended?
- Are all requirements addressed?
- How would it perform with different inputs?
- Are there any missing components?

**CODE SUBMISSION:**
```{language}
{submission}
```

**GRADING RUBRIC:**
{json.dumps(rubric, indent=2)}

**ACCURACY-FOCUSED EVALUATION REQUIREMENTS:**

1. **EVIDENCE-BASED SCORING:**
   - Quote specific code sections for each score
   - Explain technical reasoning behind each decision
   - Reference specific {language} concepts and standards

2. **COMPREHENSIVE TECHNICAL FEEDBACK:**
   - Identify specific bugs or issues (with line references if possible)
   - Suggest concrete code improvements
   - Explain why certain approaches are better/worse

3. **BALANCED ASSESSMENT:**
   - Consider both working code and code quality
   - Recognize partial implementations appropriately
   - Account for student learning level

**OUTPUT FORMAT:**
{{
  "score": <sum_of_all_criteria_points>,
  "total": <sum_of_all_max_points>,
  "criteria_scores": [
    {{
      "name": "<criterion_name>",
      "points": <points_earned>,
      "max_points": <max_points>,
      "code_evidence": "<specific_code_sections_or_line_references>",
      "technical_analysis": "<detailed_technical_evaluation>",
      "feedback": "<comprehensive_feedback_with_code_improvement_suggestions>"
    }}
  ],
  "code_review": {{
    "strengths": ["<technical_strength_1>", "<technical_strength_2>"],
    "issues": ["<specific_issue_1_with_solution>", "<specific_issue_2_with_solution>"],
    "suggestions": ["<improvement_suggestion_1>", "<improvement_suggestion_2>"]
  }},
  "grading_feedback": "<overall_technical_assessment_and_recommendations>",
  "execution_assessment": {{
    "would_run": "<yes/no/partially>",
    "potential_errors": ["<error_1>", "<error_2>"],
    "functionality_score": "<0-100>%"
  }}
}}

Perform your systematic code evaluation now."""

    @staticmethod
    def get_calibration_examples() -> List[Dict[str, Any]]:
        """Provide calibration examples for better accuracy."""
        return [
            {
                "scenario": "Excellent Work",
                "description": "Submission exceeds expectations in all areas",
                "score_range": "90-100%",
                "indicators": [
                    "Goes beyond basic requirements",
                    "Demonstrates deep understanding",
                    "Exceptional quality and presentation",
                    "Creative or innovative approaches"
                ]
            },
            {
                "scenario": "Good Work",
                "description": "Submission meets most requirements well",
                "score_range": "80-89%",
                "indicators": [
                    "Meets all major requirements",
                    "Shows solid understanding",
                    "Good quality with minor issues",
                    "Clear effort and organization"
                ]
            },
            {
                "scenario": "Satisfactory Work",
                "description": "Submission meets basic requirements",
                "score_range": "70-79%",
                "indicators": [
                    "Addresses most requirements",
                    "Demonstrates basic understanding",
                    "Acceptable quality with some issues",
                    "Adequate effort shown"
                ]
            },
            {
                "scenario": "Needs Improvement",
                "description": "Submission has significant gaps",
                "score_range": "60-69%",
                "indicators": [
                    "Missing some key requirements",
                    "Understanding is unclear",
                    "Quality issues throughout",
                    "Insufficient effort or preparation"
                ]
            },
            {
                "scenario": "Unsatisfactory Work",
                "description": "Submission fails to meet basic standards",
                "score_range": "Below 60%",
                "indicators": [
                    "Major requirements not addressed",
                    "Little evidence of understanding",
                    "Poor quality or incomplete",
                    "Minimal effort shown"
                ]
            }
        ] 