"""
AI Configuration API Routes for ScorePAL
Handles user AI provider configurations and model selection
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional, Dict, Any
import logging
import json
from datetime import datetime
from bson import ObjectId

from ..models.ai_config import (
    AIProvider, ModelCapability
)
from ..models.user import User
from ..auth.auth_config import current_active_user
from ..services.universal_ai_service import universal_ai_service
from ..services.mongodb_service import get_ai_configs_collection
from ..utils.encryption import encrypt_api_key, decrypt_api_key

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

@router.get("/providers/templates")
async def get_provider_templates(
    provider: Optional[AIProvider] = None
):
    """Get AI provider templates with default configurations"""
    try:
        # Return empty list for now - templates can be added later if needed
        return []
    except Exception as e:
        logger.error(f"Error getting provider templates: {e}")
        raise HTTPException(status_code=500, detail="Error fetching provider templates")

@router.get("/my-configs")
async def get_user_ai_configs(
    current_user: User = Depends(current_active_user)
):
    """Get current user's AI configurations"""
    try:
        collection = await get_ai_configs_collection()
        cursor = collection.find({"user_id": current_user.id}).sort([
            ("is_default", -1),
            ("created_at", -1)
        ])
        configs = await cursor.to_list(length=100)
        
        # Process configs
        result = []
        for config in configs:
            config["id"] = str(config["_id"])
            del config["_id"]
            # Mask API key for display
            if "api_key" in config:
                try:
                    decrypted = decrypt_api_key(config["api_key"])
                    config["api_key"] = decrypted[:4] + "..." + decrypted[-4:] if len(decrypted) > 8 else "***"
                except:
                    config["api_key"] = "***"
            result.append(config)
        
        return result
    except Exception as e:
        logger.error(f"Error getting user AI configs: {e}")
        raise HTTPException(status_code=500, detail="Error fetching AI configurations")

@router.post("/my-configs")
async def create_ai_config(
    config_data: Dict[str, Any],
    current_user: User = Depends(current_active_user)
):
    """Create a new AI configuration for the user"""
    try:
        # Validate configuration
        is_valid, error_msg = universal_ai_service.validate_config(config_data)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # If this is set as default, unset other defaults
        collection = await get_ai_configs_collection()
        if config_data.get('is_default'):
            await collection.update_many(
                {"user_id": current_user.id, "is_default": True},
                {"$set": {"is_default": False}}
            )
        
        # Create new configuration
        encrypted_api_key = encrypt_api_key(config_data.get('api_key', ''))
        
        new_config = {
            "user_id": current_user.id,
            "provider": config_data.get('provider'),
            "model_name": config_data.get('model_name'),
            "api_key": encrypted_api_key,
            "api_endpoint": config_data.get('api_endpoint'),
            "is_active": config_data.get('is_active', True),
            "is_default": config_data.get('is_default', False),
            "max_tokens": config_data.get('max_tokens', 2048),
            "temperature": config_data.get('temperature', 0.7),
            "top_p": config_data.get('top_p', 0.9),
            "frequency_penalty": config_data.get('frequency_penalty', 0.0),
            "presence_penalty": config_data.get('presence_penalty', 0.0),
            "extra_config": config_data.get('extra_config', {}),
            "capabilities": config_data.get('capabilities', []),
            "total_requests": 0,
            "total_tokens_used": 0,
            "total_cost": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_used": None
        }
        
        result = await collection.insert_one(new_config)
        new_config["id"] = str(result.inserted_id)
        del new_config["_id"]
        # Mask API key for return
        api_key = config_data.get('api_key', '')
        new_config["api_key"] = api_key[:4] + "..." + api_key[-4:] if len(api_key) > 8 else "***"
        
        logger.info(f"Created AI config {new_config['id']} for user {current_user.id}")
        return new_config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating AI config: {e}")
        raise HTTPException(status_code=500, detail="Error creating AI configuration")

@router.put("/my-configs/{config_id}")
async def update_ai_config(
    config_id: str,
    config_data: Dict[str, Any],
    current_user: User = Depends(current_active_user)
):
    """Update an existing AI configuration"""
    try:
        collection = await get_ai_configs_collection()
        
        # Get existing config
        config = await collection.find_one({
            "_id": ObjectId(config_id),
            "user_id": current_user.id
        })
        
        if not config:
            raise HTTPException(status_code=404, detail="AI configuration not found")
        
        # Prepare update data
        update_data = {}
        for key, value in config_data.items():
            if value is not None:
                update_data[key] = value
        
        # If API key is being updated, encrypt it
        if 'api_key' in update_data:
            update_data['api_key'] = encrypt_api_key(update_data['api_key'])
        
        # If setting as default, unset other defaults
        if update_data.get('is_default'):
            await collection.update_many(
                {"user_id": current_user.id, "_id": {"$ne": ObjectId(config_id)}, "is_default": True},
                {"$set": {"is_default": False}}
            )
        
        # Add updated timestamp
        update_data['updated_at'] = datetime.utcnow()
        
        # Apply updates
        await collection.update_one(
            {"_id": ObjectId(config_id)},
            {"$set": update_data}
        )
        
        # Get updated config
        updated_config = await collection.find_one({"_id": ObjectId(config_id)})
        updated_config["id"] = str(updated_config["_id"])
        del updated_config["_id"]
        
        # Mask API key
        if "api_key" in updated_config:
            try:
                decrypted = decrypt_api_key(updated_config["api_key"])
                updated_config["api_key"] = decrypted[:4] + "..." + decrypted[-4:] if len(decrypted) > 8 else "***"
            except:
                updated_config["api_key"] = "***"
        
        logger.info(f"Updated AI config {config_id} for user {current_user.id}")
        return updated_config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating AI config: {e}")
        raise HTTPException(status_code=500, detail="Error updating AI configuration")

@router.delete("/my-configs/{config_id}")
async def delete_ai_config(
    config_id: str,
    current_user: User = Depends(current_active_user)
):
    """Delete an AI configuration"""
    try:
        collection = await get_ai_configs_collection()
        
        # Get existing config
        config = await collection.find_one({
            "_id": ObjectId(config_id),
            "user_id": current_user.id
        })
        
        if not config:
            raise HTTPException(status_code=404, detail="AI configuration not found")
        
        await collection.delete_one({"_id": ObjectId(config_id)})
        
        logger.info(f"Deleted AI config {config_id} for user {current_user.id}")
        return {"message": "AI configuration deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting AI config: {e}")
        raise HTTPException(status_code=500, detail="Error deleting AI configuration")

@router.post("/my-configs/{config_id}/test")
async def test_ai_config(
    config_id: str,
    current_user: User = Depends(current_active_user)
):
    """Test an AI configuration"""
    try:
        import time
        collection = await get_ai_configs_collection()
        
        # Get config
        config = await collection.find_one({
            "_id": ObjectId(config_id),
            "user_id": current_user.id
        })
        
        if not config:
            raise HTTPException(status_code=404, detail="AI configuration not found")
        
        # Prepare config for testing
        config_dict = {
            'provider': config.get('provider'),
            'model_name': config.get('model_name'),
            'api_key': decrypt_api_key(config.get('api_key', '')),
            'api_endpoint': config.get('api_endpoint'),
            'max_tokens': config.get('max_tokens', 2048),
            'temperature': float(config.get('temperature', 0.7)) if isinstance(config.get('temperature'), str) else config.get('temperature', 0.7),
            'top_p': float(config.get('top_p', 0.9)) if isinstance(config.get('top_p'), str) else config.get('top_p', 0.9),
            'frequency_penalty': float(config.get('frequency_penalty', 0.0)) if isinstance(config.get('frequency_penalty'), str) else config.get('frequency_penalty', 0.0),
            'presence_penalty': float(config.get('presence_penalty', 0.0)) if isinstance(config.get('presence_penalty'), str) else config.get('presence_penalty', 0.0),
            'extra_config': config.get('extra_config', {})
        }
        
        # Test the configuration
        test_prompt = "Hello! This is a test to verify the AI configuration is working correctly. Please respond with a brief confirmation."
        
        start_time = time.time()
        result = await universal_ai_service.generate_text(config_dict, test_prompt)
        end_time = time.time()
        
        # Update last used timestamp
        await collection.update_one(
            {"_id": ObjectId(config_id)},
            {"$set": {"last_used": datetime.utcnow()}}
        )
        
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
    config_id: str,
    current_user: User = Depends(current_active_user)
):
    """Set an AI configuration as the default"""
    try:
        collection = await get_ai_configs_collection()
        
        # Verify config exists and belongs to user
        config = await collection.find_one({
            "_id": ObjectId(config_id),
            "user_id": current_user.id
        })
        
        if not config:
            raise HTTPException(status_code=404, detail="AI configuration not found")
        
        # Unset other defaults
        await collection.update_many(
            {"user_id": current_user.id, "is_default": True},
            {"$set": {"is_default": False}}
        )
        
        # Set this as default
        await collection.update_one(
            {"_id": ObjectId(config_id)},
            {"$set": {"is_default": True, "updated_at": datetime.utcnow()}}
        )
        
        logger.info(f"Set AI config {config_id} as default for user {current_user.id}")
        return {"message": "Default AI configuration updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting default AI config: {e}")
        raise HTTPException(status_code=500, detail="Error setting default AI configuration")

@router.get("/my-configs/default")
async def get_default_ai_config(
    current_user: User = Depends(current_active_user)
):
    """Get user's default AI configuration"""
    try:
        collection = await get_ai_configs_collection()
        
        config = await collection.find_one({
            "user_id": current_user.id,
            "is_default": True,
            "is_active": True
        })
        
        if config:
            config["id"] = str(config["_id"])
            del config["_id"]
            # Mask API key
            if "api_key" in config:
                try:
                    decrypted = decrypt_api_key(config["api_key"])
                    config["api_key"] = decrypted[:4] + "..." + decrypted[-4:] if len(decrypted) > 8 else "***"
                except:
                    config["api_key"] = "***"
        
        return config
        
    except Exception as e:
        logger.error(f"Error getting default AI config: {e}")
        raise HTTPException(status_code=500, detail="Error fetching default AI configuration")

@router.get("/usage-stats")
async def get_ai_usage_stats(
    current_user: User = Depends(current_active_user)
):
    """Get AI usage statistics for the user"""
    try:
        collection = await get_ai_configs_collection()
        
        # Get all user's configs
        cursor = collection.find({"user_id": current_user.id})
        configs = await cursor.to_list(length=100)
        
        total_requests = sum(config.get('total_requests', 0) for config in configs)
        total_tokens_used = sum(config.get('total_tokens_used', 0) for config in configs)
        
        # Calculate total cost (rough estimate)
        total_cost = 0.0
        for config in configs:
            if config.get('cost_per_1k_tokens'):
                cost_per_1k = float(config.get('cost_per_1k_tokens', 0))
                total_cost += (config.get('total_tokens_used', 0) / 1000) * cost_per_1k
        
        # Find most used provider and model
        most_used_config = max(configs, key=lambda c: c.get('total_requests', 0)) if configs else None
        
        stats = {
            "total_requests": total_requests,
            "total_tokens_used": total_tokens_used,
            "total_cost": f"{total_cost:.4f}",
            "most_used_provider": most_used_config.get('provider') if most_used_config else None,
            "most_used_model": most_used_config.get('model_name') if most_used_config else None,
            "success_rate": 0.95,  # Would calculate from actual success/failure tracking
            "last_30_days_usage": total_requests  # Simplified for now
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting usage stats: {e}")
        raise HTTPException(status_code=500, detail="Error fetching usage statistics")

@router.post("/validate-config")
async def validate_ai_config(config_data: Dict[str, Any]):
    """Validate an AI configuration without saving"""
    try:
        # Check if required fields are present
        if not config_data.get('provider') or not config_data.get('model_name') or not config_data.get('api_key'):
            return {
                "valid": False,
                "message": "Missing required fields: provider, model_name, or api_key",
                "provider_available": False
            }
        
        is_valid, error_msg = universal_ai_service.validate_config(config_data)
        
        return {
            "valid": is_valid,
            "message": error_msg if not is_valid else "Configuration is valid",
            "provider_available": config_data.get('provider') in [p.value for p in AIProvider],
            "success": is_valid
        }
        
    except Exception as e:
        logger.error(f"Error validating config: {e}")
        return {
            "valid": False,
            "message": f"Error validating configuration: {str(e)}",
            "provider_available": False,
            "success": False
        }

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