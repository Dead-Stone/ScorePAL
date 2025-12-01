"""
ScorePAL - Enhanced AI-Powered Academic Grading Assistant
Supports Multiple AI Providers with Universal Interface

@author: Mohana Moganti (@Dead-Stone)
@license: MIT
@repository: https://github.com/Dead-Stone/ScorePAL
"""

import logging
import re
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_

from grading_v2 import GradingResult  # Import existing result class
from prompts.answer_key_prompt import get_answer_key_prompt
from prompts.grading_prompt import get_grading_prompt 
from prompts.image_prompt import get_image_description_prompt
from models.rubric import Rubric, GradingCriteria
from models.ai_config import AIModelConfig, AIProvider, ModelSelectionRequest
from services.universal_ai_service import universal_ai_service
from utils.encryption import decrypt_api_key

logger = logging.getLogger(__name__)

class EnhancedGradingService:
    """Enhanced grading service with multi-provider AI support"""
    
    def __init__(self, db_session: Session):
        self.db_session = db_session
        self.universal_ai = universal_ai_service
        
    def _get_user_ai_configs(self, user_id: int) -> List[AIModelConfig]:
        """Get user's AI configurations"""
        return self.db_session.query(AIModelConfig).filter(
            and_(
                AIModelConfig.user_id == user_id,
                AIModelConfig.is_active == True
            )
        ).order_by(AIModelConfig.is_default.desc()).all()
    
    def _get_default_ai_config(self, user_id: int) -> Optional[AIModelConfig]:
        """Get user's default AI configuration"""
        return self.db_session.query(AIModelConfig).filter(
            and_(
                AIModelConfig.user_id == user_id,
                AIModelConfig.is_default == True,
                AIModelConfig.is_active == True
            )
        ).first()
    
    def _config_to_dict(self, config: AIModelConfig) -> Dict[str, Any]:
        """Convert AIModelConfig to dictionary for AI service"""
        return {
            'provider': config.provider,
            'model_name': config.model_name,
            'api_key': decrypt_api_key(config.api_key),
            'api_endpoint': config.api_endpoint,
            'max_tokens': config.max_tokens,
            'temperature': config.temperature,
            'top_p': config.top_p,
            'frequency_penalty': config.frequency_penalty,
            'presence_penalty': config.presence_penalty,
            'extra_config': config.extra_config or {},
            'cost_per_1k_tokens': config.cost_per_1k_tokens,
            'max_context_length': config.max_context_length
        }
    
    async def grade_submission_with_model_selection(self,
                                                  submission_text: str,
                                                  question_text: str,
                                                  answer_key: str,
                                                  user_id: int,
                                                  student_name: str = "Student",
                                                  rubric: Optional[Union[Dict[str, Any], Rubric]] = None,
                                                  strictness: float = 0.5,
                                                  model_selection: Optional[ModelSelectionRequest] = None,
                                                  use_fallback: bool = True) -> Dict[str, Any]:
        """
        Grade a submission with AI model selection support
        
        Args:
            submission_text: The student's submission text
            question_text: The original question/prompt
            answer_key: The answer key or model answer
            user_id: ID of the user performing grading
            student_name: The name of the student
            rubric: Optional rubric for grading
            strictness: Grading strictness from 0.0 to 1.0
            model_selection: Optional model selection preferences
            use_fallback: Whether to use fallback models if primary fails
            
        Returns:
            Dictionary with grading results including AI provider info
        """
        try:
            # Prepare rubric
            if rubric is None:
                rubric_obj = Rubric.create_default()
                rubric_dict = rubric_obj.to_dict()
            elif isinstance(rubric, Rubric):
                rubric_obj = rubric
                rubric_dict = rubric.to_dict()
            else:
                rubric_dict = rubric
                try:
                    rubric_obj = Rubric.from_dict(rubric_dict)
                except Exception as e:
                    logging.warning(f"Could not convert rubric dict to Rubric object: {e}")
                    rubric_obj = Rubric.create_default()
            
            # Ensure strictness is between 0 and 1
            strictness = max(0.0, min(1.0, strictness))
            
            # Generate grading prompt
            prompt = get_grading_prompt(
                question_text=question_text,
                answer_key=answer_key,
                submission=submission_text,
                rubric=rubric_dict,
                strictness_level=int(strictness * 5)
            )
            
            # Determine which AI configurations to use
            ai_configs = []
            
            if model_selection and model_selection.model_config_id:
                # Use specific model configuration
                config = self.db_session.query(AIModelConfig).filter(
                    and_(
                        AIModelConfig.id == model_selection.model_config_id,
                        AIModelConfig.user_id == user_id,
                        AIModelConfig.is_active == True
                    )
                ).first()
                
                if config:
                    ai_configs.append(config)
                else:
                    raise ValueError(f"AI configuration {model_selection.model_config_id} not found")
            
            else:
                # Use default configuration or all user configs as fallbacks
                default_config = self._get_default_ai_config(user_id)
                if default_config:
                    ai_configs.append(default_config)
                
                if use_fallback:
                    # Add other configs as fallbacks
                    other_configs = self._get_user_ai_configs(user_id)
                    for config in other_configs:
                        if config.id != (default_config.id if default_config else None):
                            ai_configs.append(config)
            
            if not ai_configs:
                raise ValueError("No AI configurations available for user")
            
            # Convert configs to dictionaries
            config_dicts = [self._config_to_dict(config) for config in ai_configs]
            
            # Apply model selection overrides
            if model_selection:
                for config_dict in config_dicts:
                    if model_selection.custom_temperature:
                        config_dict['temperature'] = model_selection.custom_temperature
                    if model_selection.custom_max_tokens:
                        config_dict['max_tokens'] = model_selection.custom_max_tokens
            
            # Generate response with fallback
            if len(config_dicts) == 1:
                ai_response = await self.universal_ai.generate_text(config_dicts[0], prompt)
            else:
                ai_response = await self.universal_ai.generate_with_fallback(config_dicts, prompt)
            
            # Parse AI response
            json_match = re.search(r'\{.*\}', ai_response['text'], re.DOTALL)
            if not json_match:
                raise ValueError("No JSON content found in AI response")
            
            json_content = json_match.group(0)
            response_data = json.loads(json_content)
            
            # Validate response structure
            required_fields = ['total_score', 'breakdown', 'feedback']
            for field in required_fields:
                if field not in response_data:
                    response_data[field] = self._get_default_value(field)
            
            # Create grading result
            result = GradingResult(
                student_name=student_name,
                score=float(response_data.get('total_score', 0)),
                max_score=float(rubric_dict.get('total_points', 100)),
                feedback=response_data.get('feedback', 'No feedback provided'),
                criteria_scores=response_data.get('breakdown', []),
                mistakes=response_data.get('mistakes', [])
            )
            
            # Update usage statistics
            used_config = ai_configs[0]  # Primary config used
            used_config.total_requests += 1
            used_config.total_tokens_used += ai_response.get('usage', {}).get('total_tokens', 0)
            used_config.last_used = datetime.now()
            self.db_session.commit()
            
            # Prepare enhanced result with AI metadata
            enhanced_result = result.to_dict()
            enhanced_result.update({
                'ai_provider': ai_response.get('provider'),
                'ai_model': ai_response.get('model'),
                'response_time': ai_response.get('response_time'),
                'tokens_used': ai_response.get('usage', {}),
                'cost_estimate': ai_response.get('cost_estimate', 0),
                'fallback_used': ai_response.get('fallback_used', False),
                'provider_attempts': ai_response.get('provider_attempts', 1),
                'timestamp': ai_response.get('timestamp')
            })
            
            return enhanced_result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response JSON: {e}")
            return self._create_error_result(student_name, "Failed to parse AI response")
        except Exception as e:
            logger.error(f"Error in enhanced grading: {e}")
            return self._create_error_result(student_name, f"Grading error: {str(e)}")
    
    async def batch_grade_with_model_selection(self,
                                             submissions: Dict[str, str],
                                             question_text: str,
                                             answer_key: str,
                                             user_id: int,
                                             rubric: Optional[Union[Dict[str, Any], Rubric]] = None,
                                             strictness: float = 0.5,
                                             model_selection: Optional[ModelSelectionRequest] = None,
                                             use_fallback: bool = True,
                                             max_concurrent: int = 3) -> Dict[str, Any]:
        """
        Grade multiple submissions concurrently with AI provider selection
        
        Args:
            submissions: Dictionary of student_name -> submission_text
            question_text: The original question/prompt
            answer_key: The answer key or model answer
            user_id: ID of the user performing grading
            rubric: Optional rubric for grading
            strictness: Grading strictness from 0.0 to 1.0
            model_selection: Optional model selection preferences
            use_fallback: Whether to use fallback models
            max_concurrent: Maximum concurrent grading operations
            
        Returns:
            Dictionary with batch grading results and statistics
        """
        try:
            start_time = datetime.now()
            
            # Create semaphore for concurrent operations
            semaphore = asyncio.Semaphore(max_concurrent)
            
            async def grade_single_with_semaphore(student_name: str, submission: str):
                async with semaphore:
                    return await self.grade_submission_with_model_selection(
                        submission_text=submission,
                        question_text=question_text,
                        answer_key=answer_key,
                        user_id=user_id,
                        student_name=student_name,
                        rubric=rubric,
                        strictness=strictness,
                        model_selection=model_selection,
                        use_fallback=use_fallback
                    )
            
            # Create tasks for all submissions
            tasks = []
            for student_name, submission in submissions.items():
                task = grade_single_with_semaphore(student_name, submission)
                tasks.append(task)
            
            # Execute all grading tasks
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            graded_results = {}
            successful_grades = 0
            failed_grades = 0
            total_tokens_used = 0
            total_cost = 0.0
            providers_used = set()
            
            for i, result in enumerate(results):
                student_name = list(submissions.keys())[i]
                
                if isinstance(result, Exception):
                    logger.error(f"Error grading {student_name}: {result}")
                    graded_results[student_name] = self._create_error_result(
                        student_name, f"Grading failed: {str(result)}"
                    )
                    failed_grades += 1
                else:
                    graded_results[student_name] = result
                    successful_grades += 1
                    
                    # Accumulate statistics
                    if 'tokens_used' in result:
                        total_tokens_used += result['tokens_used'].get('total_tokens', 0)
                    if 'cost_estimate' in result:
                        total_cost += result.get('cost_estimate', 0)
                    if 'ai_provider' in result:
                        providers_used.add(result['ai_provider'])
            
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            
            # Generate summary statistics
            summary = self._generate_enhanced_summary(graded_results, {
                'total_submissions': len(submissions),
                'successful_grades': successful_grades,
                'failed_grades': failed_grades,
                'processing_time': processing_time,
                'total_tokens_used': total_tokens_used,
                'total_cost': total_cost,
                'providers_used': list(providers_used),
                'average_processing_time': processing_time / len(submissions) if submissions else 0
            })
            
            return {
                'results': graded_results,
                'summary': summary,
                'statistics': {
                    'total_submissions': len(submissions),
                    'successful_grades': successful_grades,
                    'failed_grades': failed_grades,
                    'success_rate': successful_grades / len(submissions) if submissions else 0,
                    'processing_time': processing_time,
                    'total_tokens_used': total_tokens_used,
                    'total_cost': f"${total_cost:.4f}",
                    'providers_used': list(providers_used),
                    'average_processing_time': processing_time / len(submissions) if submissions else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error in batch grading: {e}")
            raise
    
    async def get_available_models_for_user(self, user_id: int) -> List[Dict[str, Any]]:
        """Get available AI models for a user"""
        try:
            configs = self._get_user_ai_configs(user_id)
            models = []
            
            for config in configs:
                # Test if config is working
                try:
                    test_result = await self.universal_ai.generate_text(
                        self._config_to_dict(config),
                        "Test",
                        max_tokens=10
                    )
                    status = "available"
                    last_response_time = test_result.get('response_time', 0)
                except Exception as e:
                    status = f"error: {str(e)[:50]}"
                    last_response_time = None
                
                models.append({
                    'config_id': config.id,
                    'provider': config.provider.value,
                    'model_name': config.model_name,
                    'display_name': f"{config.provider.value.title()} - {config.model_name}",
                    'is_default': config.is_default,
                    'status': status,
                    'capabilities': config.capabilities,
                    'max_tokens': config.max_tokens,
                    'cost_per_1k_tokens': config.cost_per_1k_tokens,
                    'last_used': config.last_used.isoformat() if config.last_used else None,
                    'total_requests': config.total_requests,
                    'last_response_time': last_response_time
                })
            
            return models
            
        except Exception as e:
            logger.error(f"Error getting available models: {e}")
            return []
    
    def _get_default_value(self, field: str) -> Any:
        """Get default value for missing response fields"""
        defaults = {
            'total_score': 0,
            'breakdown': [],
            'feedback': 'Unable to generate feedback',
            'mistakes': []
        }
        return defaults.get(field, None)
    
    def _create_error_result(self, student_name: str = "Student", error_msg: str = "Grading failed") -> Dict[str, Any]:
        """Create an error result for failed grading"""
        result = GradingResult(
            student_name=student_name,
            score=0,
            max_score=100,
            feedback=f"Error: {error_msg}",
            criteria_scores=[],
            mistakes=[]
        )
        
        return result.to_dict()
    
    def _generate_enhanced_summary(self, results: Dict[str, Any], stats: Dict[str, Any]) -> Dict[str, Any]:
        """Generate enhanced summary with AI provider statistics"""
        if not results:
            return {"message": "No results to summarize"}
        
        # Calculate grade statistics
        scores = []
        for result in results.values():
            if isinstance(result, dict) and 'score' in result:
                scores.append(result['score'])
        
        if not scores:
            return {"message": "No valid scores to analyze"}
        
        # Basic statistics
        avg_score = sum(scores) / len(scores)
        min_score = min(scores)
        max_score = max(scores)
        
        # Grade distribution
        grade_distribution = {
            'A': len([s for s in scores if s >= 90]),
            'B': len([s for s in scores if 80 <= s < 90]),
            'C': len([s for s in scores if 70 <= s < 80]),
            'D': len([s for s in scores if 60 <= s < 70]),
            'F': len([s for s in scores if s < 60])
        }
        
        summary = {
            'total_submissions': len(results),
            'average_score': round(avg_score, 2),
            'highest_score': max_score,
            'lowest_score': min_score,
            'grade_distribution': grade_distribution,
            'class_performance': self._analyze_performance(avg_score),
            'ai_statistics': {
                'total_tokens_used': stats.get('total_tokens_used', 0),
                'total_cost': f"${stats.get('total_cost', 0):.4f}",
                'providers_used': stats.get('providers_used', []),
                'average_processing_time': f"{stats.get('average_processing_time', 0):.2f}s",
                'success_rate': f"{(stats.get('successful_grades', 0) / stats.get('total_submissions', 1)) * 100:.1f}%"
            }
        }
        
        return summary
    
    def _analyze_performance(self, avg_score: float) -> str:
        """Analyze class performance based on average score"""
        if avg_score >= 90:
            return "Excellent - Class performed exceptionally well"
        elif avg_score >= 80:
            return "Good - Class performed well overall"
        elif avg_score >= 70:
            return "Satisfactory - Class met basic expectations"
        elif avg_score >= 60:
            return "Needs Improvement - Class struggled with concepts"
        else:
            return "Poor - Class needs significant support" 