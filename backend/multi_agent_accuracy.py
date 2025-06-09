import json
import logging
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from statistics import mean, median, stdev
import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class AgentEvaluation:
    agent_id: str
    score: float
    total: float
    criteria_scores: List[Dict[str, Any]]
    feedback: str
    confidence: float
    reasoning: str

@dataclass
class ConsensusResult:
    final_score: float
    final_total: float
    criteria_scores: List[Dict[str, Any]]
    consensus_feedback: str
    confidence_score: float
    agent_agreement: float
    outlier_agents: List[str]

class MultiAgentGradingAccuracy:
    """Enhanced multi-agent grading system for improved accuracy."""
    
    def __init__(self, grading_service):
        self.grading_service = grading_service
        self.agents = [
            {"id": "strict_evaluator", "strictness": 0.8, "focus": "technical_accuracy"},
            {"id": "balanced_evaluator", "strictness": 0.5, "focus": "overall_quality"},
            {"id": "lenient_evaluator", "strictness": 0.3, "focus": "effort_and_understanding"},
            {"id": "subject_specialist", "strictness": 0.6, "focus": "domain_expertise"},
            {"id": "communication_expert", "strictness": 0.5, "focus": "clarity_and_presentation"}
        ]
    
    async def grade_with_consensus(
        self, 
        submission_text: str, 
        file_metadata: Dict[str, Any],
        rubric: Optional[Dict[str, Any]] = None,
        base_strictness: float = 0.5
    ) -> ConsensusResult:
        """
        Grade assignment using multiple agents and reach consensus.
        """
        try:
            evaluations = []
            
            # Get evaluations from all agents
            for agent in self.agents:
                evaluation = await self._get_agent_evaluation(
                    agent, submission_text, file_metadata, rubric, base_strictness
                )
                if evaluation:
                    evaluations.append(evaluation)
            
            if len(evaluations) < 3:
                raise ValueError("Insufficient agent evaluations for consensus")
            
            # Calculate consensus
            consensus = self._calculate_consensus(evaluations)
            
            logger.info(f"Multi-agent consensus achieved with {len(evaluations)} agents")
            logger.info(f"Agreement score: {consensus.agreement:.2f}, Confidence: {consensus.confidence_score:.2f}")
            
            return consensus
            
        except Exception as e:
            logger.error(f"Error in multi-agent grading: {e}")
            raise
    
    async def _get_agent_evaluation(
        self, 
        agent: Dict[str, str], 
        submission_text: str, 
        file_metadata: Dict[str, Any],
        rubric: Optional[Dict[str, Any]],
        base_strictness: float
    ) -> Optional[AgentEvaluation]:
        """Get evaluation from a specific agent."""
        try:
            # Adjust strictness based on agent type
            agent_strictness = agent["strictness"]
            
            # Create agent-specific prompt enhancement
            enhanced_metadata = file_metadata.copy()
            enhanced_metadata["agent_focus"] = agent["focus"]
            enhanced_metadata["agent_id"] = agent["id"]
            
            # Get grading result
            if file_metadata.get('file_type') == 'code':
                result = self.grading_service.grade_code_submission(
                    submission_text=submission_text,
                    file_metadata=enhanced_metadata,
                    student_name="Student",
                    rubric=rubric,
                    strictness=agent_strictness
                )
            else:
                result = self.grading_service.grade_enhanced_submission(
                    submission_text=submission_text,
                    file_metadata=enhanced_metadata,
                    student_name="Student",
                    rubric=rubric,
                    strictness=agent_strictness
                )
            
            # Calculate confidence based on score consistency
            confidence = self._calculate_confidence(result)
            
            return AgentEvaluation(
                agent_id=agent["id"],
                score=result.get("score", 0),
                total=result.get("total", 100),
                criteria_scores=result.get("criteria_scores", []),
                feedback=result.get("grading_feedback", ""),
                confidence=confidence,
                reasoning=f"Evaluated with {agent['focus']} focus at {agent_strictness} strictness"
            )
            
        except Exception as e:
            logger.warning(f"Agent {agent['id']} evaluation failed: {e}")
            return None
    
    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """Calculate confidence score for an evaluation."""
        try:
            # Factors that increase confidence
            confidence_factors = []
            
            # 1. Score reasonableness (not too extreme)
            score = result.get("score", 0)
            total = result.get("total", 100)
            percentage = score / total if total > 0 else 0
            
            if 0.2 <= percentage <= 0.9:  # Reasonable range
                confidence_factors.append(0.8)
            else:
                confidence_factors.append(0.4)
            
            # 2. Criteria score consistency
            criteria_scores = result.get("criteria_scores", [])
            if criteria_scores:
                percentages = []
                for criterion in criteria_scores:
                    if criterion.get("max_points", 0) > 0:
                        percentages.append(criterion.get("points", 0) / criterion["max_points"])
                
                if percentages:
                    std_dev = np.std(percentages) if len(percentages) > 1 else 0
                    consistency_score = max(0, 1 - (std_dev * 2))  # Lower std_dev = higher consistency
                    confidence_factors.append(consistency_score)
            
            # 3. Feedback quality (length and detail)
            feedback = result.get("grading_feedback", "")
            if len(feedback) > 100:  # Detailed feedback
                confidence_factors.append(0.9)
            elif len(feedback) > 50:
                confidence_factors.append(0.7)
            else:
                confidence_factors.append(0.5)
            
            return mean(confidence_factors)
            
        except Exception as e:
            logger.warning(f"Error calculating confidence: {e}")
            return 0.5
    
    def _calculate_consensus(self, evaluations: List[AgentEvaluation]) -> ConsensusResult:
        """Calculate consensus from multiple agent evaluations."""
        try:
            # Extract scores and weights
            scores = [eval.score for eval in evaluations]
            totals = [eval.total for eval in evaluations]
            confidences = [eval.confidence for eval in evaluations]
            
            # Calculate agreement score
            score_percentages = [s/t if t > 0 else 0 for s, t in zip(scores, totals)]
            agreement = self._calculate_agreement(score_percentages)
            
            # Identify outliers
            outliers = self._identify_outliers(evaluations, score_percentages)
            
            # Filter out outliers for final calculation
            valid_evaluations = [e for e in evaluations if e.agent_id not in outliers]
            
            if not valid_evaluations:
                valid_evaluations = evaluations  # Use all if all are outliers
            
            # Weighted consensus calculation
            weighted_scores = []
            weighted_totals = []
            total_weight = 0
            
            for eval in valid_evaluations:
                weight = eval.confidence
                weighted_scores.append(eval.score * weight)
                weighted_totals.append(eval.total * weight)
                total_weight += weight
            
            if total_weight > 0:
                final_score = sum(weighted_scores) / total_weight
                final_total = sum(weighted_totals) / total_weight
            else:
                final_score = mean([e.score for e in valid_evaluations])
                final_total = mean([e.total for e in valid_evaluations])
            
            # Combine criteria scores
            consensus_criteria = self._combine_criteria_scores(valid_evaluations)
            
            # Generate consensus feedback
            consensus_feedback = self._generate_consensus_feedback(valid_evaluations)
            
            # Calculate overall confidence
            overall_confidence = mean([e.confidence for e in valid_evaluations]) * (agreement ** 0.5)
            
            return ConsensusResult(
                final_score=round(final_score, 1),
                final_total=round(final_total, 1),
                criteria_scores=consensus_criteria,
                consensus_feedback=consensus_feedback,
                confidence_score=overall_confidence,
                agent_agreement=agreement,
                outlier_agents=outliers
            )
            
        except Exception as e:
            logger.error(f"Error calculating consensus: {e}")
            raise
    
    def _calculate_agreement(self, percentages: List[float]) -> float:
        """Calculate agreement score between agents."""
        if len(percentages) < 2:
            return 1.0
        
        # Calculate coefficient of variation (lower = better agreement)
        mean_pct = mean(percentages)
        if mean_pct == 0:
            return 0.5
        
        std_pct = stdev(percentages) if len(percentages) > 1 else 0
        cv = std_pct / mean_pct
        
        # Convert to agreement score (0-1, higher = better agreement)
        agreement = max(0, 1 - (cv * 2))
        return min(1.0, agreement)
    
    def _identify_outliers(self, evaluations: List[AgentEvaluation], percentages: List[float]) -> List[str]:
        """Identify outlier evaluations using statistical methods."""
        if len(percentages) < 4:  # Need at least 4 agents to identify outliers
            return []
        
        outliers = []
        mean_pct = mean(percentages)
        std_pct = stdev(percentages)
        
        # Use 2 standard deviations as outlier threshold
        threshold = 2 * std_pct
        
        for eval, pct in zip(evaluations, percentages):
            if abs(pct - mean_pct) > threshold:
                outliers.append(eval.agent_id)
                logger.info(f"Agent {eval.agent_id} identified as outlier: {pct:.2f} vs mean {mean_pct:.2f}")
        
        return outliers
    
    def _combine_criteria_scores(self, evaluations: List[AgentEvaluation]) -> List[Dict[str, Any]]:
        """Combine criteria scores from multiple evaluations."""
        if not evaluations:
            return []
        
        # Get all unique criteria names
        all_criteria = {}
        for eval in evaluations:
            for criterion in eval.criteria_scores:
                name = criterion.get("name", "")
                if name not in all_criteria:
                    all_criteria[name] = {
                        "name": name,
                        "max_points": criterion.get("max_points", 0),
                        "scores": [],
                        "feedbacks": []
                    }
                all_criteria[name]["scores"].append(criterion.get("points", 0))
                all_criteria[name]["feedbacks"].append(criterion.get("feedback", ""))
        
        # Calculate consensus for each criterion
        consensus_criteria = []
        for name, data in all_criteria.items():
            avg_score = mean(data["scores"]) if data["scores"] else 0
            combined_feedback = self._combine_feedbacks(data["feedbacks"])
            
            consensus_criteria.append({
                "name": name,
                "points": round(avg_score, 1),
                "max_points": data["max_points"],
                "feedback": combined_feedback
            })
        
        return consensus_criteria
    
    def _combine_feedbacks(self, feedbacks: List[str]) -> str:
        """Combine multiple feedback strings into a coherent summary."""
        valid_feedbacks = [f.strip() for f in feedbacks if f and f.strip()]
        if not valid_feedbacks:
            return ""
        
        if len(valid_feedbacks) == 1:
            return valid_feedbacks[0]
        
        # For multiple feedbacks, create a combined summary
        return f"Multiple evaluators noted: {' | '.join(valid_feedbacks[:3])}"
    
    def _generate_consensus_feedback(self, evaluations: List[AgentEvaluation]) -> str:
        """Generate consensus feedback from multiple evaluations."""
        feedbacks = [e.feedback for e in evaluations if e.feedback]
        
        if not feedbacks:
            return "No detailed feedback available."
        
        if len(feedbacks) == 1:
            return feedbacks[0]
        
        # Extract common themes and create summary
        summary_parts = []
        
        # Add agreement statement
        agreement = self._calculate_agreement([e.score/e.total for e in evaluations])
        if agreement > 0.8:
            summary_parts.append("Multiple evaluators showed strong agreement on the assessment.")
        elif agreement > 0.6:
            summary_parts.append("Multiple evaluators showed moderate agreement on the assessment.")
        else:
            summary_parts.append("Multiple evaluators provided varied perspectives on the assessment.")
        
        # Add most detailed feedback
        longest_feedback = max(feedbacks, key=len)
        summary_parts.append(longest_feedback)
        
        # Add note about multi-agent evaluation
        summary_parts.append(f"This assessment was evaluated by {len(evaluations)} independent AI agents for improved accuracy.")
        
        return " ".join(summary_parts)

class AccuracyMetrics:
    """Track and analyze grading accuracy metrics."""
    
    @staticmethod
    def calculate_accuracy_score(consensus_result: ConsensusResult) -> Dict[str, float]:
        """Calculate various accuracy metrics."""
        return {
            "confidence_score": consensus_result.confidence_score,
            "agent_agreement": consensus_result.agent_agreement,
            "consensus_strength": consensus_result.confidence_score * consensus_result.agent_agreement,
            "outlier_ratio": len(consensus_result.outlier_agents) / 5,  # Assuming 5 agents
            "reliability_score": (consensus_result.confidence_score + consensus_result.agent_agreement) / 2
        } 