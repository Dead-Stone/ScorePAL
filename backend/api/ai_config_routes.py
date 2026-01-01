"""
AI Configuration API Routes for ScorePAL
Handles user AI provider configurations and model selection
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
import logging
import json

from models.ai_config import (
    AIModelConfig, AIProviderTemplate, AIProvider, ModelCapability,
    AIModelConfigCreate, AIModelConfigUpdate, AIModelConfigRead,
    AIProviderTemplateRead, ModelSelectionRequest, GradingPreferences,
    AIUsageStats
)
from models.user import User
from auth.auth_config import current_active_user
from database import get_async_session
from services.universal_ai_service import universal_ai_service
from utils.encryption import encrypt_api_key, decrypt_api_key

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/providers/available", response_model=List[Dict[str, Any]])
async def get_available_providers():
    """Get list of available AI providers and their status"""
    try:
        providers = universal_ai_service.get_available_providers()
        return providers
    except Exception as e:
        logger.error(f"Error getting available providers: {e}")
        raise HTTPException(status_code=500, detail="Error fetching available providers")

@router.get("/providers/templates", response_model=List[AIProviderTemplateRead])
async def get_provider_templates(
    provider: Optional[AIProvider] = None,
    session: Session = Depends(get_async_session)
):
    """Get AI provider templates with default configurations"""
    try:
        query = session.query(AIProviderTemplate)
        
        if provider:
            query = query.filter(AIProviderTemplate.provider == provider)
        
        query = query.filter(AIProviderTemplate.is_active == True)
        templates = query.all()
        
        return templates
    except Exception as e:
        logger.error(f"Error getting provider templates: {e}")
        raise HTTPException(status_code=500, detail="Error fetching provider templates")

@router.get("/my-configs", response_model=List[AIModelConfigRead])
async def get_user_ai_configs(
    current_user: User = Depends(current_active_user),
    session: Session = Depends(get_async_session)
):
    """Get current user's AI configurations"""
    try:
        configs = session.query(AIModelConfig).filter(
            AIModelConfig.user_id == current_user.id
        ).order_by(AIModelConfig.is_default.desc(), AIModelConfig.created_at.desc()).all()
        
        # Decrypt API keys for display (masked)
        for config in configs:
            try:
                config.api_key = decrypt_api_key(config.api_key)
            except:
                pass  # Keep encrypted if decryption fails
        
        return configs
    except Exception as e:
        logger.error(f"Error getting user AI configs: {e}")
        raise HTTPException(status_code=500, detail="Error fetching AI configurations")

@router.post("/my-configs", response_model=AIModelConfigRead)
async def create_ai_config(
    config_data: AIModelConfigCreate,
    current_user: User = Depends(current_active_user),
    session: Session = Depends(get_async_session)
):
    """Create a new AI configuration for the user"""
    try:
        # Validate configuration
        config_dict = config_data.dict()
        is_valid, error_msg = universal_ai_service.validate_config(config_dict)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Test the configuration
        try:
            test_result = await universal_ai_service.generate_text(
                config_dict, 
                "Test prompt for configuration validation. Please respond with 'Configuration test successful.'"
            )
            if not test_result.get('text'):
                raise Exception("No response from AI provider")
        except Exception as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Configuration test failed: {str(e)}"
            )
        
        # If this is set as default, unset other defaults
        if config_data.is_default:
            session.query(AIModelConfig).filter(
                and_(
                    AIModelConfig.user_id == current_user.id,
                    AIModelConfig.is_default == True
                )
            ).update({AIModelConfig.is_default: False})
        
        # Create new configuration
        encrypted_api_key = encrypt_api_key(config_data.api_key)
        
        new_config = AIModelConfig(
            user_id=current_user.id,
            provider=config_data.provider,
            model_name=config_data.model_name,
            api_key=encrypted_api_key,
            api_endpoint=config_data.api_endpoint,
            is_active=config_data.is_active,
            is_default=config_data.is_default,
            max_tokens=config_data.max_tokens,
            temperature=config_data.temperature,
            top_p=config_data.top_p,
            frequency_penalty=config_data.frequency_penalty,
            presence_penalty=config_data.presence_penalty,
            extra_config=config_data.extra_config,
            capabilities=config_data.capabilities
        )
        
        session.add(new_config)
        session.commit()
        session.refresh(new_config)
        
        # Decrypt for return (will be masked by Pydantic)
        new_config.api_key = config_data.api_key
        
        logger.info(f"Created AI config {new_config.id} for user {current_user.id}")
        return new_config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating AI config: {e}")
        session.rollback()
        raise HTTPException(status_code=500, detail="Error creating AI configuration")

@router.put("/my-configs/{config_id}", response_model=AIModelConfigRead)
async def update_ai_config(
    config_id: int,
    config_data: AIModelConfigUpdate,
    current_user: User = Depends(current_active_user),
    session: Session = Depends(get_async_session)
):
    """Update an existing AI configuration"""
    try:
        # Get existing config
        config = session.query(AIModelConfig).filter(
            and_(
                AIModelConfig.id == config_id,
                AIModelConfig.user_id == current_user.id
            )
        ).first()
        
        if not config:
            raise HTTPException(status_code=404, detail="AI configuration not found")
        
        # Update fields
        update_data = config_data.dict(exclude_unset=True)
        
        # If API key is being updated, encrypt it
        if 'api_key' in update_data:
            update_data['api_key'] = encrypt_api_key(update_data['api_key'])
        
        # If setting as default, unset other defaults
        if update_data.get('is_default'):
            session.query(AIModelConfig).filter(
                and_(
                    AIModelConfig.user_id == current_user.id,
                    AIModelConfig.id != config_id,
                    AIModelConfig.is_default == True
                )
            ).update({AIModelConfig.is_default: False})
        
        # Apply updates
        for key, value in update_data.items():
            setattr(config, key, value)
        
        session.commit()
        session.refresh(config)
        
        # Decrypt for return (will be masked)
        if 'api_key' in update_data:
            config.api_key = config_data.api_key
        else:
            config.api_key = decrypt_api_key(config.api_key)
        
        logger.info(f"Updated AI config {config_id} for user {current_user.id}")
        return config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating AI config: {e}")
        session.rollback()
        raise HTTPException(status_code=500, detail="Error updating AI configuration")

@router.delete("/my-configs/{config_id}")
async def delete_ai_config(
    config_id: int,
    current_user: User = Depends(current_active_user),
    session: Session = Depends(get_async_session)
):
    """Delete an AI configuration"""
    try:
        # Get existing config
        config = session.query(AIModelConfig).filter(
            and_(
                AIModelConfig.id == config_id,
                AIModelConfig.user_id == current_user.id
            )
        ).first()
        
        if not config:
            raise HTTPException(status_code=404, detail="AI configuration not found")
        
        session.delete(config)
        session.commit()
        
        logger.info(f"Deleted AI config {config_id} for user {current_user.id}")
        return {"message": "AI configuration deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting AI config: {e}")
        session.rollback()
        raise HTTPException(status_code=500, detail="Error deleting AI configuration")

@router.post("/my-configs/{config_id}/test")
async def test_ai_config(
    config_id: int,
    current_user: User = Depends(current_active_user),
    session: Session = Depends(get_async_session)
):
    """Test an AI configuration"""
    try:
        # Get config
        config = session.query(AIModelConfig).filter(
            and_(
                AIModelConfig.id == config_id,
                AIModelConfig.user_id == current_user.id
            )
        ).first()
        
        if not config:
            raise HTTPException(status_code=404, detail="AI configuration not found")
        
        # Prepare config for testing
        config_dict = {
            'provider': config.provider,
            'model_name': config.model_name,
            'api_key': decrypt_api_key(config.api_key),
            'api_endpoint': config.api_endpoint,
            'max_tokens': config.max_tokens,
            'temperature': config.temperature,
            'top_p': config.top_p,
            'frequency_penalty': config.frequency_penalty,
            'presence_penalty': config.presence_penalty,
            'extra_config': config.extra_config
        }
        
        # Test the configuration
        test_prompt = "Hello! This is a test to verify the AI configuration is working correctly. Please respond with a brief confirmation."
        
        start_time = time.time()
        result = await universal_ai_service.generate_text(config_dict, test_prompt)
        end_time = time.time()
        
        # Update last used timestamp
        config.last_used = datetime.now()
        session.commit()
        
        return {
            "success": True,
            "message": "AI configuration test successful",
            "response": result.get('text', ''),
            "response_time": end_time - start_time,
            "tokens_used": result.get('usage', {}).get('total_tokens', 0),
            "cost_estimate": result.get('cost_estimate', 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing AI config: {e}")
        raise HTTPException(
            status_code=400, 
            detail=f"AI configuration test failed: {str(e)}"
        )

@router.put("/my-configs/{config_id}/set-default")
async def set_default_ai_config(
    config_id: int,
    current_user: User = Depends(current_active_user),
    session: Session = Depends(get_async_session)
):
    """Set an AI configuration as the default"""
    try:
        # Verify config exists and belongs to user
        config = session.query(AIModelConfig).filter(
            and_(
                AIModelConfig.id == config_id,
                AIModelConfig.user_id == current_user.id
            )
        ).first()
        
        if not config:
            raise HTTPException(status_code=404, detail="AI configuration not found")
        
        # Unset other defaults
        session.query(AIModelConfig).filter(
            and_(
                AIModelConfig.user_id == current_user.id,
                AIModelConfig.is_default == True
            )
        ).update({AIModelConfig.is_default: False})
        
        # Set this as default
        config.is_default = True
        session.commit()
        
        logger.info(f"Set AI config {config_id} as default for user {current_user.id}")
        return {"message": "Default AI configuration updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting default AI config: {e}")
        session.rollback()
        raise HTTPException(status_code=500, detail="Error setting default AI configuration")

@router.get("/my-configs/default", response_model=Optional[AIModelConfigRead])
async def get_default_ai_config(
    current_user: User = Depends(current_active_user),
    session: Session = Depends(get_async_session)
):
    """Get user's default AI configuration"""
    try:
        config = session.query(AIModelConfig).filter(
            and_(
                AIModelConfig.user_id == current_user.id,
                AIModelConfig.is_default == True,
                AIModelConfig.is_active == True
            )
        ).first()
        
        if config:
            config.api_key = decrypt_api_key(config.api_key)
        
        return config
        
    except Exception as e:
        logger.error(f"Error getting default AI config: {e}")
        raise HTTPException(status_code=500, detail="Error fetching default AI configuration")

@router.get("/usage-stats", response_model=AIUsageStats)
async def get_ai_usage_stats(
    current_user: User = Depends(current_active_user),
    session: Session = Depends(get_async_session)
):
    """Get AI usage statistics for the user"""
    try:
        # Get all user's configs
        configs = session.query(AIModelConfig).filter(
            AIModelConfig.user_id == current_user.id
        ).all()
        
        total_requests = sum(config.total_requests for config in configs)
        total_tokens_used = sum(config.total_tokens_used for config in configs)
        
        # Calculate total cost (rough estimate)
        total_cost = 0.0
        for config in configs:
            if config.cost_per_1k_tokens:
                cost_per_1k = float(config.cost_per_1k_tokens)
                total_cost += (config.total_tokens_used / 1000) * cost_per_1k
        
        # Find most used provider and model
        most_used_config = max(configs, key=lambda c: c.total_requests) if configs else None
        
        stats = AIUsageStats(
            total_requests=total_requests,
            total_tokens_used=total_tokens_used,
            total_cost=f"{total_cost:.4f}",
            most_used_provider=most_used_config.provider if most_used_config else None,
            most_used_model=most_used_config.model_name if most_used_config else None,
            success_rate=0.95,  # Would calculate from actual success/failure tracking
            last_30_days_usage=total_requests  # Simplified for now
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting usage stats: {e}")
        raise HTTPException(status_code=500, detail="Error fetching usage statistics")

@router.post("/validate-config")
async def validate_ai_config(config_data: Dict[str, Any]):
    """Validate an AI configuration without saving"""
    try:
        is_valid, error_msg = universal_ai_service.validate_config(config_data)
        
        return {
            "valid": is_valid,
            "message": error_msg,
            "provider_available": config_data.get('provider') in [p.value for p in AIProvider]
        }
        
    except Exception as e:
        logger.error(f"Error validating config: {e}")
        raise HTTPException(status_code=500, detail="Error validating configuration")

@router.get("/providers/{provider}/models")
async def get_provider_models(provider: AIProvider):
    """Get available models for a specific provider"""
    try:
        # This would typically query a database or API
        # For now, return common models for each provider
        models = {
            AIProvider.OPENAI: [
                {"name": "gpt-4", "display_name": "GPT-4", "context_length": 8192},
                {"name": "gpt-4-turbo", "display_name": "GPT-4 Turbo", "context_length": 128000},
                {"name": "gpt-3.5-turbo", "display_name": "GPT-3.5 Turbo", "context_length": 16385},
            ],
            AIProvider.ANTHROPIC: [
                {"name": "claude-3-opus-20240229", "display_name": "Claude 3 Opus", "context_length": 200000},
                {"name": "claude-3-sonnet-20240229", "display_name": "Claude 3 Sonnet", "context_length": 200000},
                {"name": "claude-3-haiku-20240307", "display_name": "Claude 3 Haiku", "context_length": 200000},
            ],
            AIProvider.GOOGLE: [
                {"name": "gemini-pro", "display_name": "Gemini Pro", "context_length": 32760},
                {"name": "gemini-2.0-flash", "display_name": "Gemini 2.0 Flash", "context_length": 1000000},
                {"name": "gemini-1.5-pro", "display_name": "Gemini 1.5 Pro", "context_length": 2000000},
            ],
            AIProvider.PERPLEXITY: [
                {"name": "llama-3.1-sonar-small-128k-online", "display_name": "Llama 3.1 Sonar Small", "context_length": 131072},
                {"name": "llama-3.1-sonar-large-128k-online", "display_name": "Llama 3.1 Sonar Large", "context_length": 131072},
            ]
        }
        
        return models.get(provider, [])
        
    except Exception as e:
        logger.error(f"Error getting provider models: {e}")
        raise HTTPException(status_code=500, detail="Error fetching provider models") 