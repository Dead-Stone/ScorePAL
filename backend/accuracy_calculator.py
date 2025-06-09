"""
Comprehensive Accuracy Calculator for AI Grading System
Provides detailed analysis and metrics for grading accuracy assessment.
"""

import json
import logging
import re
from typing import Dict, List, Any, Optional, Tuple
from statistics import mean, median, stdev
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class AccuracyReport:
    """Comprehensive accuracy report for a grading result."""
    mathematical_accuracy: float
    feedback_quality: float
    score_reasonableness: float
    evidence_quality: float
    rubric_alignment: float
    overall_confidence: float
    accuracy_level: str
    recommendations: List[str]
    warnings: List[str]

class AccuracyCalculator:
    """Comprehensive accuracy calculation system for grading results."""
    
    def __init__(self):
        self.accuracy_thresholds = {
            "excellent": 0.9,
            "high": 0.8,
            "good": 0.7,
            "moderate": 0.6,
            "fair": 0.5,
            "low": 0.0
        }
        
        self.evidence_keywords = [
            "specifically", "example", "demonstrates", "shows", "evident", 
            "clear", "quote", "line", "section", "code", "implementation"
        ]
        
        self.improvement_keywords = [
            "suggest", "recommend", "improve", "consider", "could", 
            "should", "enhance", "strengthen", "develop"
        ]
    
    def calculate_accuracy_metrics(self, result: Dict[str, Any], rubric: Optional[Dict] = None) -> Dict[str, Any]:
        """Calculate comprehensive accuracy metrics."""
        
        try:
            # Calculate individual components
            math_accuracy = self._calculate_mathematical_accuracy(result)
            feedback_quality = self._calculate_feedback_quality(result)
            score_reasonableness = self._calculate_score_reasonableness(result)
            evidence_quality = self._calculate_evidence_quality(result)
            
            # Calculate overall confidence
            overall_confidence = (
                math_accuracy * 0.35 +
                feedback_quality * 0.25 +
                score_reasonableness * 0.25 +
                evidence_quality * 0.15
            )
            
            # Determine accuracy level
            accuracy_level = self._get_accuracy_level(overall_confidence)
            
            metrics = {
                "mathematical_accuracy": round(math_accuracy, 3),
                "feedback_quality": round(feedback_quality, 3),
                "score_reasonableness": round(score_reasonableness, 3),
                "evidence_quality": round(evidence_quality, 3),
                "overall_confidence": round(overall_confidence, 3),
                "accuracy_level": accuracy_level,
                "recommendations": self._generate_recommendations(
                    math_accuracy, feedback_quality, score_reasonableness, evidence_quality
                )
            }
            
            logger.info(f"Accuracy calculated: {accuracy_level} ({overall_confidence:.3f})")
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating accuracy metrics: {e}")
            return self._get_default_metrics()
    
    def _calculate_mathematical_accuracy(self, result: Dict[str, Any]) -> float:
        """Calculate mathematical consistency score."""
        
        try:
            criteria_scores = result.get("criteria_scores", [])
            if not criteria_scores:
                return 0.7  # Default for missing criteria
            
            # Check total score consistency
            reported_total = result.get("score", 0)
            calculated_total = sum(c.get("points", 0) for c in criteria_scores)
            
            difference = abs(reported_total - calculated_total)
            
            if difference < 0.01:
                total_accuracy = 1.0
            elif difference < 0.5:
                total_accuracy = 0.9
            elif difference < 1.0:
                total_accuracy = 0.7
            else:
                total_accuracy = 0.4
            
            # Check for invalid individual scores
            invalid_count = 0
            for criterion in criteria_scores:
                points = criterion.get("points", 0)
                max_points = criterion.get("max_points", 0)
                if max_points > 0 and (points > max_points or points < 0):
                    invalid_count += 1
            
            validity_score = 1.0 - (invalid_count / len(criteria_scores)) if criteria_scores else 1.0
            
            return (total_accuracy * 0.7) + (validity_score * 0.3)
            
        except Exception as e:
            logger.warning(f"Error in mathematical accuracy calculation: {e}")
            return 0.5
    
    def _calculate_feedback_quality(self, result: Dict[str, Any]) -> float:
        """Calculate feedback quality score."""
        
        try:
            score = 0.0
            
            # Main feedback analysis
            main_feedback = result.get("grading_feedback", "")
            if main_feedback:
                # Length scoring
                if len(main_feedback) > 150:
                    score += 0.3
                elif len(main_feedback) > 75:
                    score += 0.2
                elif len(main_feedback) > 25:
                    score += 0.1
                
                # Structure indicators
                if any(word in main_feedback.lower() for word in ["overall", "strengths", "improvement"]):
                    score += 0.1
                
                # Constructive language
                if any(word in main_feedback.lower() for word in self.improvement_keywords):
                    score += 0.1
            
            # Criteria feedback analysis
            criteria_scores = result.get("criteria_scores", [])
            if criteria_scores:
                detailed_count = sum(1 for c in criteria_scores if len(c.get("feedback", "")) > 20)
                coverage_ratio = detailed_count / len(criteria_scores)
                score += coverage_ratio * 0.4
            
            return min(1.0, score)
            
        except Exception as e:
            logger.warning(f"Error in feedback quality calculation: {e}")
            return 0.5
    
    def _calculate_score_reasonableness(self, result: Dict[str, Any]) -> float:
        """Calculate score reasonableness."""
        
        try:
            total_score = result.get("score", 0)
            max_score = result.get("total", 100)
            
            if max_score <= 0:
                return 0.5
            
            percentage = total_score / max_score
            
            # Range check
            if 0.05 <= percentage <= 0.95:
                range_score = 1.0
            elif 0.0 <= percentage <= 1.0:
                range_score = 0.8
            else:
                range_score = 0.2
            
            # Distribution check
            criteria_scores = result.get("criteria_scores", [])
            if len(criteria_scores) > 1:
                percentages = []
                for c in criteria_scores:
                    max_pts = c.get("max_points", 0)
                    if max_pts > 0:
                        percentages.append(c.get("points", 0) / max_pts)
                
                if percentages:
                    std_dev = stdev(percentages) if len(percentages) > 1 else 0
                    distribution_score = max(0, 1 - (std_dev * 1.5))
                else:
                    distribution_score = 0.8
            else:
                distribution_score = 1.0
            
            return (range_score * 0.6) + (distribution_score * 0.4)
            
        except Exception as e:
            logger.warning(f"Error in score reasonableness calculation: {e}")
            return 0.5
    
    def _calculate_evidence_quality(self, result: Dict[str, Any]) -> float:
        """Calculate evidence quality score."""
        
        try:
            score = 0.0
            
            # Main feedback evidence
            main_feedback = result.get("grading_feedback", "")
            evidence_count = sum(1 for word in self.evidence_keywords if word in main_feedback.lower())
            
            if evidence_count >= 3:
                score += 0.4
            elif evidence_count >= 1:
                score += 0.2
            
            # Specific examples or quotes
            if any(indicator in main_feedback.lower() for indicator in ['"', "'", "example", "such as"]):
                score += 0.2
            
            # Criteria-specific evidence
            criteria_scores = result.get("criteria_scores", [])
            if criteria_scores:
                specific_criteria = sum(1 for c in criteria_scores 
                                      if any(word in c.get("feedback", "").lower() 
                                           for word in self.evidence_keywords))
                specificity_ratio = specific_criteria / len(criteria_scores)
                score += specificity_ratio * 0.3
            
            # Actionable suggestions
            if any(word in main_feedback.lower() for word in ["next time", "consider", "to improve"]):
                score += 0.1
            
            return min(1.0, score)
            
        except Exception as e:
            logger.warning(f"Error in evidence quality calculation: {e}")
            return 0.5
    
    def _get_accuracy_level(self, confidence: float) -> str:
        """Determine accuracy level from confidence score."""
        
        if confidence >= 0.9:
            return "excellent"
        elif confidence >= 0.8:
            return "high"
        elif confidence >= 0.7:
            return "good"
        elif confidence >= 0.6:
            return "moderate"
        elif confidence >= 0.5:
            return "fair"
        else:
            return "low"
    
    def _generate_recommendations(self, math_acc: float, feedback_qual: float, 
                                 score_reason: float, evidence_qual: float) -> List[str]:
        """Generate specific recommendations for improvement."""
        
        recommendations = []
        
        if math_acc < 0.8:
            recommendations.append("Verify mathematical calculations and score consistency")
        
        if feedback_qual < 0.7:
            recommendations.append("Provide more detailed and structured feedback")
        
        if score_reason < 0.7:
            recommendations.append("Review score distribution and ensure reasonable ranges")
        
        if evidence_qual < 0.6:
            recommendations.append("Include more specific evidence and examples")
        
        if not recommendations:
            recommendations.append("Excellent accuracy - maintain current standards")
        
        return recommendations
    
    def _get_default_metrics(self) -> Dict[str, Any]:
        """Return default metrics when calculation fails."""
        
        return {
            "mathematical_accuracy": 0.5,
            "feedback_quality": 0.5,
            "score_reasonableness": 0.5,
            "evidence_quality": 0.5,
            "overall_confidence": 0.5,
            "accuracy_level": "moderate",
            "recommendations": ["Unable to calculate detailed metrics - manual review recommended"]
        } 