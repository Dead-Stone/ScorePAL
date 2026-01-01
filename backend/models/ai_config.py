"""
AI Model Configuration Models for ScorePAL
Supports multiple AI providers with user-specific configurations
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import enum
import json

from database import Base

class AIProvider(str, enum.Enum):
    """Supported AI providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    HUGGINGFACE = "huggingface"
    PERPLEXITY = "perplexity"
    COHERE = "cohere"
    REPLICATE = "replicate"
    TOGETHER = "together"
    GROQ = "groq"
    MISTRAL = "mistral"
    PALM = "palm"
    AZURE_OPENAI = "azure_openai"

class ModelCapability(str, enum.Enum):
    """AI model capabilities"""
    TEXT_GENERATION = "text_generation"
    CODE_GENERATION = "code_generation"
    IMAGE_ANALYSIS = "image_analysis"
    MULTIMODAL = "multimodal"
    LONG_CONTEXT = "long_context"

class AIModelConfig(Base):
    """AI model configuration for each provider"""
    __tablename__ = "ai_model_configs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False)  # Changed from Integer to String for MongoDB compatibility
    provider = Column(SQLEnum(AIProvider), nullable=False)
    model_name = Column(String(255), nullable=False)
    api_key = Column(Text, nullable=False)  # Encrypted in practice
    api_endpoint = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    
    # Model-specific configuration
    max_tokens = Column(Integer, default=2048)
    temperature = Column(String(10), default="0.7")  # Store as string to handle decimal precision
    top_p = Column(String(10), default="0.9")
    frequency_penalty = Column(String(10), default="0.0")
    presence_penalty = Column(String(10), default="0.0")
    
    # Additional configuration as JSON
    extra_config = Column(JSON, nullable=True)
    
    # Model metadata
    capabilities = Column(JSON, nullable=True)  # List of ModelCapability values
    cost_per_1k_tokens = Column(String(20), nullable=True)  # Store as string for precision
    max_context_length = Column(Integer, nullable=True)
    
    # Usage tracking
    total_requests = Column(Integer, default=0)
    total_tokens_used = Column(Integer, default=0)
    last_used = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AIProviderTemplate(Base):
    """Template configurations for different AI providers"""
    __tablename__ = "ai_provider_templates"
    
    id = Column(Integer, primary_key=True)
    provider = Column(SQLEnum(AIProvider), nullable=False)
    template_name = Column(String(255), nullable=False)
    model_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Default configuration values
    max_tokens = Column(Integer, default=2048)
    temperature = Column(String(10), default="0.7")
    top_p = Column(String(10), default="0.9")
    frequency_penalty = Column(String(10), default="0.0")
    presence_penalty = Column(String(10), default="0.0")
    
    # Model metadata
    capabilities = Column(JSON, nullable=True)
    cost_per_1k_tokens = Column(String(20), nullable=True)
    max_context_length = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Pydantic models for API
class AIModelConfigBase(BaseModel):
    """Base AI model configuration"""
    provider: AIProvider
    model_name: str
    api_key: str
    api_endpoint: Optional[str] = None
    is_active: bool = True
    is_default: bool = False
    max_tokens: int = 2048
    temperature: str = "0.7"
    top_p: str = "0.9"
    frequency_penalty: str = "0.0"
    presence_penalty: str = "0.0"
    extra_config: Optional[Dict[str, Any]] = None
    capabilities: Optional[List[ModelCapability]] = None
    cost_per_1k_tokens: Optional[str] = None
    max_context_length: Optional[int] = None

class AIModelConfigCreate(AIModelConfigBase):
    """Schema for creating AI model configuration"""
    pass

class AIModelConfigUpdate(BaseModel):
    """Schema for updating AI model configuration"""
    provider: Optional[AIProvider] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    api_endpoint: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    max_tokens: Optional[int] = None
    temperature: Optional[str] = None
    top_p: Optional[str] = None
    frequency_penalty: Optional[str] = None
    presence_penalty: Optional[str] = None
    extra_config: Optional[Dict[str, Any]] = None
    capabilities: Optional[List[ModelCapability]] = None
    cost_per_1k_tokens: Optional[str] = None
    max_context_length: Optional[int] = None

class AIModelConfigRead(AIModelConfigBase):
    """Schema for reading AI model configuration"""
    id: int
    user_id: str
    total_requests: int
    total_tokens_used: int
    last_used: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AIProviderTemplateRead(BaseModel):
    """Schema for reading AI provider template"""
    id: int
    provider: AIProvider
    template_name: str
    model_name: str
    description: Optional[str] = None
    is_active: bool
    max_tokens: int
    temperature: str
    top_p: str
    frequency_penalty: str
    presence_penalty: str
    capabilities: Optional[List[ModelCapability]] = None
    cost_per_1k_tokens: Optional[str] = None
    max_context_length: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ModelSelectionRequest(BaseModel):
    """Request for model selection during grading"""
    provider: Optional[AIProvider] = None
    model_name: Optional[str] = None
    config_id: Optional[int] = None
    override_params: Optional[Dict[str, Any]] = None

class GradingPreferences(BaseModel):
    """User preferences for grading"""
    default_strictness: float = 0.5
    preferred_ai_provider: Optional[AIProvider] = None
    preferred_model: Optional[str] = None
    feedback_style: str = "detailed"  # detailed, concise, academic
    include_rubric: bool = True
    include_suggestions: bool = True

class AIUsageStats(BaseModel):
    """AI usage statistics"""
    total_requests: int = 0
    total_tokens_used: int = 0
    total_cost: float = 0.0
    requests_by_provider: Dict[str, int] = {}
    tokens_by_provider: Dict[str, int] = {}
    cost_by_provider: Dict[str, float] = {}
    last_used: Optional[datetime] = None 