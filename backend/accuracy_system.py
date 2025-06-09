import json
import logging
from typing import Dict, List, Any, Optional
from statistics import mean, stdev
try:
    from .accuracy_calculator import AccuracyCalculator
except ImportError:
    from accuracy_calculator import AccuracyCalculator

logger = logging.getLogger(__name__)

class AccuracyEnhancer:
    """System for improving grading accuracy through multiple validation techniques."""
    
    def __init__(self, grading_service):
        self.grading_service = grading_service
        self.accuracy_calculator = AccuracyCalculator()
    
    def enhance_grading_accuracy(self, result: Dict[str, Any], rubric: Optional[Dict] = None) -> Dict[str, Any]:
        """Main method to enhance grading accuracy."""
        
        enhanced_result = result.copy()
        
        # 1. Fix mathematical inconsistencies
        enhanced_result = self._fix_math_errors(enhanced_result)
        
        # 2. Validate against rubric
        if rubric:
            enhanced_result = self._validate_rubric_alignment(enhanced_result, rubric)
        
        # 3. Enhance feedback quality
        enhanced_result = self._improve_feedback(enhanced_result)
        
        # 4. Calculate comprehensive accuracy metrics using dedicated calculator
        accuracy_metrics = self.accuracy_calculator.calculate_accuracy_metrics(enhanced_result, rubric)
        enhanced_result["accuracy_score"] = accuracy_metrics["overall_confidence"]
        enhanced_result["accuracy_metrics"] = accuracy_metrics
        
        logger.info(f"Enhanced grading with accuracy level: {accuracy_metrics['accuracy_level']} ({accuracy_metrics['overall_confidence']:.3f})")
        
        return enhanced_result
    
    def _fix_math_errors(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Fix mathematical calculation errors."""
        
        criteria_scores = result.get("criteria_scores", [])
        
        if not criteria_scores:
            return result
        
        # Recalculate totals
        total_points = sum(c.get("points", 0) for c in criteria_scores)
        total_max = sum(c.get("max_points", 0) for c in criteria_scores)
        
        result["score"] = round(total_points, 1)
        result["total"] = total_max
        
        # Fix individual scores exceeding maximums
        for criterion in criteria_scores:
            points = criterion.get("points", 0)
            max_points = criterion.get("max_points", 0)
            
            if points > max_points and max_points > 0:
                criterion["points"] = max_points
        
        return result
    
    def _validate_rubric_alignment(self, result: Dict[str, Any], rubric: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure result aligns with rubric criteria."""
        
        rubric_criteria = rubric.get("criteria", [])
        result_criteria = result.get("criteria_scores", [])
        
        # Create mapping
        rubric_map = {c.get("name", ""): c for c in rubric_criteria}
        
        # Update max points from rubric
        for criterion in result_criteria:
            name = criterion.get("name", "")
            if name in rubric_map:
                criterion["max_points"] = rubric_map[name].get("max_points", 0)
        
        return result
    
    def _improve_feedback(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Improve feedback quality and structure."""
        
        feedback = result.get("grading_feedback", "")
        
        # Add structure if missing
        if feedback and len(feedback) > 50:
            if not any(word in feedback.lower() for word in ["overall", "summary", "strengths"]):
                result["grading_feedback"] = f"Overall Assessment: {feedback}"
        
        # Ensure criteria have feedback
        for criterion in result.get("criteria_scores", []):
            if not criterion.get("feedback"):
                points = criterion.get("points", 0)
                max_points = criterion.get("max_points", 0)
                percentage = (points / max_points * 100) if max_points > 0 else 0
                
                if percentage >= 90:
                    criterion["feedback"] = "Excellent work on this criterion."
                elif percentage >= 80:
                    criterion["feedback"] = "Good performance with minor areas for improvement."
                elif percentage >= 70:
                    criterion["feedback"] = "Satisfactory work meeting basic requirements."
                else:
                    criterion["feedback"] = "Needs improvement to meet expectations."
        
        return result
    
    def _calculate_accuracy(self, result: Dict[str, Any]) -> float:
        """Calculate comprehensive accuracy confidence score."""
        
        # Calculate individual accuracy components
        math_score = self._check_math_consistency(result)
        feedback_score = self._assess_feedback_quality(result)
        reason_score = self._check_score_reasonableness(result)
        evidence_score = self._assess_evidence_quality(result)
        
        # Weighted combination of accuracy factors
        accuracy_components = {
            'mathematical_accuracy': math_score,
            'feedback_quality': feedback_score,
            'score_reasonableness': reason_score,
            'evidence_quality': evidence_score
        }
        
        # Calculate weighted overall accuracy
        overall_accuracy = (
            math_score * 0.35 +           # Mathematical precision is critical
            feedback_score * 0.25 +       # Quality feedback is important
            reason_score * 0.25 +         # Reasonable scoring is key
            evidence_score * 0.15         # Evidence support adds confidence
        )
        
        # Store detailed metrics in the result
        result["accuracy_metrics"] = {
            "mathematical_accuracy": round(math_score, 3),
            "feedback_quality": round(feedback_score, 3),
            "score_reasonableness": round(reason_score, 3),
            "evidence_quality": round(evidence_score, 3),
            "overall_confidence": round(overall_accuracy, 3),
            "accuracy_level": self._get_accuracy_level(overall_accuracy)
        }
        
        logger.info(f"Accuracy calculation: Math={math_score:.2f}, Feedback={feedback_score:.2f}, Reason={reason_score:.2f}, Evidence={evidence_score:.2f}, Overall={overall_accuracy:.2f}")
        
        return round(overall_accuracy, 3)
    
    def _check_math_consistency(self, result: Dict[str, Any]) -> float:
        """Check mathematical consistency."""
        
        try:
            total = result.get("score", 0)
            criteria_sum = sum(c.get("points", 0) for c in result.get("criteria_scores", []))
            
            if abs(total - criteria_sum) < 0.1:
                return 1.0
            elif abs(total - criteria_sum) < 1.0:
                return 0.8
            else:
                return 0.3
        except:
            return 0.0
    
    def _assess_feedback_quality(self, result: Dict[str, Any]) -> float:
        """Assess feedback quality."""
        
        main_feedback = result.get("grading_feedback", "")
        criteria_feedback = [c.get("feedback", "") for c in result.get("criteria_scores", [])]
        
        score = 0.0
        
        # Main feedback length and quality
        if len(main_feedback) > 100:
            score += 0.5
        elif len(main_feedback) > 50:
            score += 0.3
        
        # Criteria feedback completeness
        with_feedback = sum(1 for f in criteria_feedback if len(f) > 10)
        if criteria_feedback:
            score += 0.5 * (with_feedback / len(criteria_feedback))
        
        return score
    
    def _check_score_reasonableness(self, result: Dict[str, Any]) -> float:
        """Check if scores are reasonable."""
        
        try:
            score = result.get("score", 0)
            total = result.get("total", 100)
            
            if total <= 0:
                return 0.5
            
            percentage = score / total
            
            # Check score distribution reasonableness
            criteria_scores = result.get("criteria_scores", [])
            if criteria_scores:
                # Calculate coefficient of variation for criteria scores
                percentages = []
                for c in criteria_scores:
                    if c.get("max_points", 0) > 0:
                        percentages.append(c.get("points", 0) / c["max_points"])
                
                if percentages:
                    # Reasonable distribution check
                    avg_pct = mean(percentages)
                    if len(percentages) > 1:
                        std_pct = stdev(percentages)
                        cv = std_pct / avg_pct if avg_pct > 0 else 1
                        distribution_score = max(0, 1 - cv)  # Lower variation = higher score
                    else:
                        distribution_score = 1.0
                else:
                    distribution_score = 0.5
            else:
                distribution_score = 0.5
            
            # Overall percentage reasonableness
            if 0.1 <= percentage <= 0.95:
                range_score = 1.0
            elif 0.0 <= percentage <= 1.0:
                range_score = 0.7
            else:
                range_score = 0.0
            
            # Combine range and distribution scores
            return (range_score * 0.7) + (distribution_score * 0.3)
            
        except:
            return 0.5
    
    def _assess_evidence_quality(self, result: Dict[str, Any]) -> float:
        """Assess the quality of evidence provided in feedback."""
        
        try:
            evidence_score = 0.0
            
            # Check main feedback for evidence indicators
            main_feedback = result.get("grading_feedback", "")
            evidence_words = ["specifically", "example", "demonstrates", "shows", "evident", "clear", "quote", "line"]
            
            evidence_count = sum(1 for word in evidence_words if word in main_feedback.lower())
            if evidence_count >= 3:
                evidence_score += 0.4
            elif evidence_count >= 1:
                evidence_score += 0.2
            
            # Check criteria feedback for specific evidence
            criteria_scores = result.get("criteria_scores", [])
            if criteria_scores:
                detailed_feedback_count = 0
                for criterion in criteria_scores:
                    feedback = criterion.get("feedback", "")
                    if len(feedback) > 30:  # Substantial feedback
                        detailed_feedback_count += 1
                        # Look for specific evidence indicators
                        if any(word in feedback.lower() for word in evidence_words):
                            evidence_score += 0.1
                
                # Bonus for comprehensive feedback across criteria
                if detailed_feedback_count >= len(criteria_scores) * 0.8:
                    evidence_score += 0.2
            
            # Check for specific suggestions and improvements
            improvement_words = ["suggest", "recommend", "improve", "consider", "could", "should"]
            if any(word in main_feedback.lower() for word in improvement_words):
                evidence_score += 0.1
            
            return min(1.0, evidence_score)
            
        except Exception as e:
            logger.warning(f"Error assessing evidence quality: {e}")
            return 0.5
    
    def _get_accuracy_level(self, accuracy_score: float) -> str:
        """Classify accuracy level based on score."""
        
        if accuracy_score >= 0.9:
            return "excellent"
        elif accuracy_score >= 0.8:
            return "high"
        elif accuracy_score >= 0.7:
            return "good" 
        elif accuracy_score >= 0.6:
            return "moderate"
        elif accuracy_score >= 0.5:
            return "fair"
        else:
            return "low" 