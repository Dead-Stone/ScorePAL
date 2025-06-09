"""
Accuracy Enhancement System for AI Grading
Implements multiple strategies to improve grading accuracy and reliability.
"""

import json
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from statistics import mean, median, stdev
import numpy as np
import re

logger = logging.getLogger(__name__)

@dataclass
class AccuracyMetrics:
    confidence_score: float
    consistency_score: float
    evidence_quality: float
    mathematical_accuracy: float
    overall_accuracy: float

class AccuracyEnhancementSystem:
    """Comprehensive system for improving grading accuracy."""
    
    def __init__(self, grading_service):
        self.grading_service = grading_service
        self.accuracy_thresholds = {
            "high": 0.85,
            "medium": 0.70,
            "low": 0.50
        }
    
    async def enhanced_grade_with_validation(
        self, 
        submission_text: str, 
        file_metadata: Dict[str, Any],
        rubric: Optional[Dict[str, Any]] = None,
        strictness: float = 0.5,
        require_high_accuracy: bool = True
    ) -> Dict[str, Any]:
        """
        Grade with multiple accuracy enhancement techniques.
        """
        try:
            # 1. Multi-pass grading with different approaches
            results = await self._multi_pass_grading(
                submission_text, file_metadata, rubric, strictness
            )
            
            # 2. Validate and enhance the best result
            best_result = self._select_best_result(results)
            
            # 3. Apply accuracy enhancements
            enhanced_result = self._enhance_result_accuracy(best_result, rubric)
            
            # 4. Final validation and quality checks
            validated_result = self._validate_final_result(enhanced_result, rubric)
            
            # 5. Calculate accuracy metrics
            accuracy_metrics = self._calculate_accuracy_metrics(validated_result, results)
            
            # 6. Add accuracy information to result
            validated_result["accuracy_metrics"] = accuracy_metrics
            validated_result["accuracy_level"] = self._classify_accuracy_level(accuracy_metrics.overall_accuracy)
            
            # 7. If accuracy is too low and high accuracy is required, retry
            if require_high_accuracy and accuracy_metrics.overall_accuracy < self.accuracy_thresholds["medium"]:
                logger.warning(f"Low accuracy detected ({accuracy_metrics.overall_accuracy:.2f}), retrying with enhanced methods")
                return await self._retry_with_enhanced_methods(
                    submission_text, file_metadata, rubric, strictness
                )
            
            return validated_result
            
        except Exception as e:
            logger.error(f"Error in enhanced grading: {e}")
            raise
    
    async def _multi_pass_grading(
        self,
        submission_text: str,
        file_metadata: Dict[str, Any],
        rubric: Optional[Dict[str, Any]],
        strictness: float
    ) -> List[Dict[str, Any]]:
        """Perform multiple grading passes with different approaches."""
        
        results = []
        
        # Pass 1: Standard grading
        try:
            result1 = await self._grade_with_approach(
                submission_text, file_metadata, rubric, strictness, "standard"
            )
            results.append(("standard", result1))
        except Exception as e:
            logger.warning(f"Standard grading failed: {e}")
        
        # Pass 2: Detail-focused grading
        try:
            result2 = await self._grade_with_approach(
                submission_text, file_metadata, rubric, strictness, "detailed"
            )
            results.append(("detailed", result2))
        except Exception as e:
            logger.warning(f"Detailed grading failed: {e}")
        
        # Pass 3: Holistic grading
        try:
            result3 = await self._grade_with_approach(
                submission_text, file_metadata, rubric, strictness, "holistic"
            )
            results.append(("holistic", result3))
        except Exception as e:
            logger.warning(f"Holistic grading failed: {e}")
        
        return results
    
    async def _grade_with_approach(
        self,
        submission_text: str,
        file_metadata: Dict[str, Any],
        rubric: Optional[Dict[str, Any]],
        strictness: float,
        approach: str
    ) -> Dict[str, Any]:
        """Grade with a specific approach."""
        
        # Modify metadata to indicate approach
        enhanced_metadata = file_metadata.copy()
        enhanced_metadata["grading_approach"] = approach
        
        # Adjust parameters based on approach
        if approach == "detailed":
            # More thorough analysis
            strictness = min(1.0, strictness * 1.1)
        elif approach == "holistic":
            # More balanced evaluation
            strictness = max(0.0, strictness * 0.9)
        
        # Perform grading
        if file_metadata.get('file_type') == 'code':
            return self.grading_service.grade_code_submission(
                submission_text=submission_text,
                file_metadata=enhanced_metadata,
                student_name="Student",
                rubric=rubric,
                strictness=strictness
            )
        else:
            return self.grading_service.grade_enhanced_submission(
                submission_text=submission_text,
                file_metadata=enhanced_metadata,
                student_name="Student",
                rubric=rubric,
                strictness=strictness
            )
    
    def _select_best_result(self, results: List[Tuple[str, Dict[str, Any]]]) -> Dict[str, Any]:
        """Select the best result from multiple grading passes."""
        
        if not results:
            raise ValueError("No grading results available")
        
        if len(results) == 1:
            return results[0][1]
        
        # Score each result based on quality indicators
        scored_results = []
        
        for approach, result in results:
            quality_score = self._calculate_result_quality(result)
            scored_results.append((quality_score, approach, result))
        
        # Select the highest quality result
        scored_results.sort(key=lambda x: x[0], reverse=True)
        best_result = scored_results[0][2]
        
        logger.info(f"Selected {scored_results[0][1]} approach with quality score {scored_results[0][0]:.2f}")
        
        return best_result
    
    def _calculate_result_quality(self, result: Dict[str, Any]) -> float:
        """Calculate quality score for a grading result."""
        
        quality_factors = []
        
        # 1. Mathematical consistency
        math_score = self._check_mathematical_consistency(result)
        quality_factors.append(math_score * 0.3)
        
        # 2. Feedback quality
        feedback_score = self._assess_feedback_quality(result)
        quality_factors.append(feedback_score * 0.25)
        
        # 3. Score reasonableness
        reasonableness_score = self._assess_score_reasonableness(result)
        quality_factors.append(reasonableness_score * 0.25)
        
        # 4. Criteria coverage
        coverage_score = self._assess_criteria_coverage(result)
        quality_factors.append(coverage_score * 0.2)
        
        return sum(quality_factors)
    
    def _check_mathematical_consistency(self, result: Dict[str, Any]) -> float:
        """Check mathematical consistency of scores."""
        
        try:
            total_score = result.get("score", 0)
            criteria_scores = result.get("criteria_scores", [])
            
            if not criteria_scores:
                return 0.5
            
            # Check if individual scores sum to total
            calculated_total = sum(c.get("points", 0) for c in criteria_scores)
            
            if abs(calculated_total - total_score) < 0.1:
                return 1.0
            elif abs(calculated_total - total_score) < 1.0:
                return 0.8
            else:
                return 0.3
                
        except Exception:
            return 0.0
    
    def _assess_feedback_quality(self, result: Dict[str, Any]) -> float:
        """Assess the quality of feedback provided."""
        
        feedback = result.get("grading_feedback", "")
        criteria_feedback = [c.get("feedback", "") for c in result.get("criteria_scores", [])]
        
        quality_score = 0.0
        
        # Length and detail
        if len(feedback) > 200:
            quality_score += 0.3
        elif len(feedback) > 100:
            quality_score += 0.2
        elif len(feedback) > 50:
            quality_score += 0.1
        
        # Specific feedback for criteria
        detailed_criteria = sum(1 for f in criteria_feedback if len(f) > 30)
        if detailed_criteria > 0:
            quality_score += 0.3 * (detailed_criteria / len(criteria_feedback))
        
        # Check for specific examples or evidence
        if any(word in feedback.lower() for word in ["example", "specifically", "demonstrates", "shows"]):
            quality_score += 0.2
        
        # Check for constructive suggestions
        if any(word in feedback.lower() for word in ["improve", "suggest", "consider", "recommend"]):
            quality_score += 0.2
        
        return min(1.0, quality_score)
    
    def _assess_score_reasonableness(self, result: Dict[str, Any]) -> float:
        """Assess if scores are reasonable and well-distributed."""
        
        try:
            total_score = result.get("score", 0)
            total_possible = result.get("total", 100)
            
            if total_possible <= 0:
                return 0.5
            
            percentage = total_score / total_possible
            
            # Reasonable range check
            if 0.1 <= percentage <= 0.95:
                return 1.0
            elif 0.05 <= percentage <= 0.98:
                return 0.8
            else:
                return 0.3
                
        except Exception:
            return 0.5
    
    def _assess_criteria_coverage(self, result: Dict[str, Any]) -> float:
        """Assess how well all criteria are covered."""
        
        criteria_scores = result.get("criteria_scores", [])
        
        if not criteria_scores:
            return 0.0
        
        # Check if all criteria have feedback
        with_feedback = sum(1 for c in criteria_scores if c.get("feedback"))
        coverage_ratio = with_feedback / len(criteria_scores)
        
        return coverage_ratio
    
    def _enhance_result_accuracy(self, result: Dict[str, Any], rubric: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply accuracy enhancements to the result."""
        
        enhanced_result = result.copy()
        
        # 1. Fix mathematical inconsistencies
        enhanced_result = self._fix_mathematical_issues(enhanced_result)
        
        # 2. Enhance feedback quality
        enhanced_result = self._enhance_feedback_quality(enhanced_result)
        
        # 3. Validate against rubric
        if rubric:
            enhanced_result = self._validate_against_rubric(enhanced_result, rubric)
        
        # 4. Add confidence indicators
        enhanced_result = self._add_confidence_indicators(enhanced_result)
        
        return enhanced_result
    
    def _fix_mathematical_issues(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Fix mathematical inconsistencies in the result."""
        
        criteria_scores = result.get("criteria_scores", [])
        
        if not criteria_scores:
            return result
        
        # Recalculate total from criteria
        calculated_total = sum(c.get("points", 0) for c in criteria_scores)
        calculated_max = sum(c.get("max_points", 0) for c in criteria_scores)
        
        # Update totals
        result["score"] = round(calculated_total, 1)
        if calculated_max > 0:
            result["total"] = calculated_max
        
        # Validate individual criteria scores
        for criterion in criteria_scores:
            points = criterion.get("points", 0)
            max_points = criterion.get("max_points", 0)
            
            # Ensure points don't exceed max
            if points > max_points and max_points > 0:
                criterion["points"] = max_points
                logger.warning(f"Adjusted {criterion.get('name', 'criterion')} score from {points} to {max_points}")
        
        return result
    
    def _enhance_feedback_quality(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance the quality of feedback."""
        
        # Add structure to main feedback if missing
        main_feedback = result.get("grading_feedback", "")
        
        if main_feedback and not any(word in main_feedback.lower() for word in ["strengths", "areas", "recommendations"]):
            # Add structure
            structured_feedback = f"Assessment Summary: {main_feedback}"
            
            # Add recommendations if missing
            if "recommend" not in main_feedback.lower() and "suggest" not in main_feedback.lower():
                structured_feedback += " Consider reviewing the feedback for each criterion for specific improvement suggestions."
            
            result["grading_feedback"] = structured_feedback
        
        return result
    
    def _validate_against_rubric(self, result: Dict[str, Any], rubric: Dict[str, Any]) -> Dict[str, Any]:
        """Validate result against the provided rubric."""
        
        rubric_criteria = rubric.get("criteria", [])
        result_criteria = result.get("criteria_scores", [])
        
        # Ensure all rubric criteria are present
        rubric_names = {c.get("name", "") for c in rubric_criteria}
        result_names = {c.get("name", "") for c in result_criteria}
        
        missing_criteria = rubric_names - result_names
        
        if missing_criteria:
            logger.warning(f"Missing criteria in result: {missing_criteria}")
            
            # Add missing criteria with zero scores
            for rubric_criterion in rubric_criteria:
                if rubric_criterion.get("name", "") in missing_criteria:
                    result_criteria.append({
                        "name": rubric_criterion["name"],
                        "points": 0,
                        "max_points": rubric_criterion.get("max_points", 0),
                        "feedback": "No evaluation provided for this criterion."
                    })
        
        # Update max_points from rubric
        rubric_map = {c.get("name", ""): c for c in rubric_criteria}
        
        for criterion in result_criteria:
            name = criterion.get("name", "")
            if name in rubric_map:
                criterion["max_points"] = rubric_map[name].get("max_points", 0)
        
        return result
    
    def _add_confidence_indicators(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Add confidence indicators to the result."""
        
        math_score = self._check_mathematical_consistency(result)
        feedback_score = self._assess_feedback_quality(result)
        reasonableness_score = self._assess_score_reasonableness(result)
        
        confidence_level = "high" if all(s > 0.8 for s in [math_score, feedback_score, reasonableness_score]) else \
                          "medium" if all(s > 0.6 for s in [math_score, feedback_score, reasonableness_score]) else \
                          "low"
        
        result["confidence_indicators"] = {
            "mathematical_accuracy": math_score,
            "feedback_quality": feedback_score,
            "score_reasonableness": reasonableness_score,
            "confidence_level": confidence_level
        }
        
        return result
    
    def _validate_final_result(self, result: Dict[str, Any], rubric: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Perform final validation of the result."""
        
        # Ensure all required fields are present
        required_fields = ["score", "total", "criteria_scores", "grading_feedback"]
        
        for field in required_fields:
            if field not in result:
                if field == "score":
                    result[field] = 0
                elif field == "total":
                    result[field] = 100
                elif field == "criteria_scores":
                    result[field] = []
                elif field == "grading_feedback":
                    result[field] = "Evaluation completed."
        
        # Final mathematical check
        result = self._fix_mathematical_issues(result)
        
        return result
    
    def _calculate_accuracy_metrics(self, final_result: Dict[str, Any], all_results: List[Tuple[str, Dict[str, Any]]]) -> AccuracyMetrics:
        """Calculate comprehensive accuracy metrics."""
        
        # Confidence from result quality
        confidence_score = self._calculate_result_quality(final_result)
        
        # Consistency across multiple results
        if len(all_results) > 1:
            scores = [r[1].get("score", 0) for r in all_results]
            totals = [r[1].get("total", 100) for r in all_results]
            percentages = [s/t if t > 0 else 0 for s, t in zip(scores, totals)]
            
            if len(percentages) > 1:
                consistency_score = max(0, 1 - (stdev(percentages) * 2))
            else:
                consistency_score = 1.0
        else:
            consistency_score = 0.8  # Single result penalty
        
        # Evidence quality from feedback
        evidence_quality = self._assess_feedback_quality(final_result)
        
        # Mathematical accuracy
        mathematical_accuracy = self._check_mathematical_consistency(final_result)
        
        # Overall accuracy
        overall_accuracy = mean([confidence_score, consistency_score, evidence_quality, mathematical_accuracy])
        
        return AccuracyMetrics(
            confidence_score=confidence_score,
            consistency_score=consistency_score,
            evidence_quality=evidence_quality,
            mathematical_accuracy=mathematical_accuracy,
            overall_accuracy=overall_accuracy
        )
    
    def _classify_accuracy_level(self, accuracy_score: float) -> str:
        """Classify accuracy level based on score."""
        
        if accuracy_score >= self.accuracy_thresholds["high"]:
            return "high"
        elif accuracy_score >= self.accuracy_thresholds["medium"]:
            return "medium"
        else:
            return "low"
    
    async def _retry_with_enhanced_methods(
        self,
        submission_text: str,
        file_metadata: Dict[str, Any],
        rubric: Optional[Dict[str, Any]],
        strictness: float
    ) -> Dict[str, Any]:
        """Retry grading with enhanced methods for better accuracy."""
        
        logger.info("Retrying grading with enhanced accuracy methods")
        
        # Try with different strictness levels
        strictness_levels = [strictness * 0.8, strictness, strictness * 1.2]
        results = []
        
        for adj_strictness in strictness_levels:
            try:
                result = await self._grade_with_approach(
                    submission_text, file_metadata, rubric, 
                    max(0.0, min(1.0, adj_strictness)), "detailed"
                )
                results.append(("enhanced", result))
            except Exception as e:
                logger.warning(f"Enhanced retry failed with strictness {adj_strictness}: {e}")
        
        if results:
            best_result = self._select_best_result(results)
            enhanced_result = self._enhance_result_accuracy(best_result, rubric)
            return self._validate_final_result(enhanced_result, rubric)
        else:
            raise ValueError("All enhanced grading attempts failed")


class AccuracyValidation:
    """Utility class for accuracy validation and quality assurance."""
    
    @staticmethod
    def validate_grading_result(result: Dict[str, Any], rubric: Optional[Dict[str, Any]] = None) -> Dict[str, bool]:
        """Validate a grading result for accuracy and completeness."""
        
        validation_results = {}
        
        # Check mathematical accuracy
        validation_results["math_accurate"] = AccuracyValidation._check_math_accuracy(result)
        
        # Check completeness
        validation_results["complete"] = AccuracyValidation._check_completeness(result)
        
        # Check rubric alignment
        if rubric:
            validation_results["rubric_aligned"] = AccuracyValidation._check_rubric_alignment(result, rubric)
        
        # Check feedback quality
        validation_results["quality_feedback"] = AccuracyValidation._check_feedback_quality(result)
        
        return validation_results
    
    @staticmethod
    def _check_math_accuracy(result: Dict[str, Any]) -> bool:
        """Check if mathematical calculations are accurate."""
        
        try:
            total_score = result.get("score", 0)
            criteria_scores = result.get("criteria_scores", [])
            
            calculated_total = sum(c.get("points", 0) for c in criteria_scores)
            
            return abs(calculated_total - total_score) < 0.1
            
        except Exception:
            return False
    
    @staticmethod
    def _check_completeness(result: Dict[str, Any]) -> bool:
        """Check if result is complete."""
        
        required_fields = ["score", "total", "criteria_scores", "grading_feedback"]
        
        return all(field in result for field in required_fields)
    
    @staticmethod
    def _check_rubric_alignment(result: Dict[str, Any], rubric: Dict[str, Any]) -> bool:
        """Check if result aligns with rubric."""
        
        rubric_criteria = rubric.get("criteria", [])
        result_criteria = result.get("criteria_scores", [])
        
        rubric_names = {c.get("name", "") for c in rubric_criteria}
        result_names = {c.get("name", "") for c in result_criteria}
        
        return rubric_names == result_names
    
    @staticmethod
    def _check_feedback_quality(result: Dict[str, Any]) -> bool:
        """Check if feedback is of good quality."""
        
        feedback = result.get("grading_feedback", "")
        criteria_feedback = result.get("criteria_scores", [])
        
        # Main feedback should be substantial
        if len(feedback) < 50:
            return False
        
        # Most criteria should have feedback
        with_feedback = sum(1 for c in criteria_feedback if len(c.get("feedback", "")) > 10)
        
        return with_feedback >= len(criteria_feedback) * 0.7 