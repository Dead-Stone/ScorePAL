"""
Enhanced accuracy-focused prompts for improved grading precision.
"""

def get_enhanced_accuracy_prompt(submission_type: str = "general") -> str:
    """Get accuracy enhancement instructions that can be appended to any prompt."""
    
    base_accuracy_instructions = """

**CRITICAL ACCURACY ENHANCEMENT GUIDELINES:**

**1. SYSTEMATIC EVALUATION PROCESS:**
   - Read the submission completely before starting evaluation
   - Identify specific evidence for each criterion
   - Cross-reference your scores with the provided evidence
   - Ensure logical consistency across all criteria

**2. MATHEMATICAL PRECISION:**
   - Calculate criterion scores first, then sum for total
   - Verify: Total Score = Sum of All Criterion Points
   - Double-check: Each criterion score ≤ its maximum points
   - Round to 1 decimal place for precision

**3. EVIDENCE-BASED SCORING:**
   - Quote specific text/code that supports each score
   - Explain WHY you awarded specific points
   - Provide concrete examples from the submission
   - Avoid vague or subjective assessments

**4. CALIBRATED SCORING STANDARDS:**
   - 90-100%: Exceptional work exceeding expectations
   - 80-89%: Good work meeting most requirements well
   - 70-79%: Satisfactory work meeting basic requirements
   - 60-69%: Below expectations with significant gaps
   - Below 60%: Unsatisfactory with major deficiencies

**5. QUALITY ASSURANCE CHECKLIST:**
   Before finalizing, verify:
   □ Total equals sum of criteria points
   □ All criteria scores are ≤ maximum
   □ Feedback includes specific evidence
   □ Scores reflect actual quality demonstrated
   □ Mathematical calculations are correct

**6. ENHANCED FEEDBACK REQUIREMENTS:**
   For each criterion, provide:
   - Specific evidence from submission
   - Clear justification for points awarded
   - Concrete suggestions for improvement
   - Recognition of what was done well
"""

    if submission_type == "code":
        return base_accuracy_instructions + """

**CODE-SPECIFIC ACCURACY ENHANCEMENTS:**

**7. TECHNICAL VERIFICATION:**
   - Trace through code logic step-by-step
   - Identify specific syntax or logical errors
   - Evaluate algorithm efficiency and correctness
   - Check for proper use of language features

**8. CODE QUALITY ASSESSMENT:**
   - Review naming conventions and style consistency
   - Evaluate documentation and comment quality
   - Assess code organization and structure
   - Check error handling and edge cases

**9. FUNCTIONALITY SCORING:**
   - Would this code compile/run correctly?
   - Does it solve the intended problem?
   - Are there potential runtime errors?
   - How robust is the implementation?
"""
    
    return base_accuracy_instructions


def get_multi_perspective_prompt() -> str:
    """Get instructions for multi-perspective evaluation."""
    
    return """

**MULTI-PERSPECTIVE EVALUATION APPROACH:**

**Step 1: Technical Evaluator Perspective**
- Focus on correctness, accuracy, and technical merit
- Apply rigorous standards for factual content
- Emphasize proper methodology and implementation

**Step 2: Educational Evaluator Perspective** 
- Consider student learning level and context
- Recognize effort and understanding demonstrated
- Balance technical accuracy with educational goals

**Step 3: Holistic Quality Perspective**
- Evaluate overall coherence and presentation
- Consider communication effectiveness
- Assess practical value and applicability

**Step 4: Consensus Integration**
- Reconcile different perspective assessments
- Weight technical accuracy heavily but consider context
- Provide balanced final evaluation

This multi-perspective approach ensures comprehensive and fair evaluation.
"""


def get_accuracy_validation_prompt() -> str:
    """Get validation instructions for final accuracy check."""
    
    return """

**FINAL ACCURACY VALIDATION:**

**Mathematical Verification:**
1. Sum all criterion points manually
2. Verify total equals calculated sum  
3. Check no criterion exceeds maximum
4. Confirm percentages are calculated correctly

**Logic Verification:**
1. Do scores reflect quality demonstrated?
2. Is feedback consistent with scores awarded?
3. Are similar quality levels scored similarly?
4. Do scores align with rubric standards?

**Evidence Verification:**
1. Is each score supported by specific evidence?
2. Are examples quoted accurately from submission?
3. Do explanations clearly justify point awards?
4. Is feedback constructive and actionable?

**Completeness Verification:**
1. Are all rubric criteria addressed?
2. Is overall feedback comprehensive?
3. Are suggestions specific and helpful?
4. Is evaluation fair and unbiased?

If any verification fails, revise scores and feedback accordingly.
"""


def get_confidence_scoring_prompt() -> str:
    """Get instructions for confidence scoring."""
    
    return """

**CONFIDENCE ASSESSMENT:**

Rate your confidence in this evaluation (0.0-1.0):

**Factors increasing confidence:**
- Clear, unambiguous submission content
- Strong evidence supporting all scores
- Consistent quality across criteria
- Straightforward application of rubric

**Factors decreasing confidence:**
- Ambiguous or incomplete submission
- Borderline quality requiring judgment calls
- Limited evidence for some criteria
- Complex trade-offs between different aspects

**Confidence levels:**
- 0.9-1.0: Very confident, clear-cut evaluation
- 0.7-0.8: Confident, some minor uncertainties
- 0.5-0.6: Moderate confidence, several judgment calls
- 0.3-0.4: Low confidence, significant uncertainties
- 0.0-0.2: Very uncertain, major ambiguities

Include confidence score and reasoning in your response.
"""


def enhance_prompt_with_accuracy(base_prompt: str, submission_type: str = "general") -> str:
    """Enhance any base prompt with accuracy instructions."""
    
    accuracy_enhancement = get_enhanced_accuracy_prompt(submission_type)
    validation_instructions = get_accuracy_validation_prompt()
    confidence_instructions = get_confidence_scoring_prompt()
    
    enhanced_prompt = base_prompt + accuracy_enhancement + validation_instructions + confidence_instructions
    
    # Add final accuracy reminder
    enhanced_prompt += """

**CRITICAL REMINDER:**
Your evaluation will be assessed for mathematical accuracy, evidence quality, 
and scoring consistency. Take time to verify your work before responding.
Provide specific evidence and clear reasoning for every score awarded.
"""
    
    return enhanced_prompt 