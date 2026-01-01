"""
User Settings Model for ScorePAL
Stores user-specific settings including Canvas API keys
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId


class UserSettings(BaseModel):
    """User settings model for MongoDB."""
    
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str  # Reference to user
    
    # Canvas Integration Settings
    canvas_api_key: Optional[str] = None  # Encrypted in practice
    canvas_url: Optional[str] = None  # Canvas instance URL
    canvas_key_configured: bool = False
    canvas_key_last_tested: Optional[datetime] = None
    canvas_key_valid: bool = False
    
    # Other integration settings can be added here
    # e.g., moodle_api_key, blackboard_api_key, etc.
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class UserSettingsCreate(BaseModel):
    """Schema for creating user settings."""
    canvas_api_key: Optional[str] = None
    canvas_url: Optional[str] = None


class UserSettingsUpdate(BaseModel):
    """Schema for updating user settings."""
    canvas_api_key: Optional[str] = None
    canvas_url: Optional[str] = None


class CanvasKeyTestResponse(BaseModel):
    """Response for Canvas API key test."""
    valid: bool
    message: str
    user_info: Optional[Dict[str, Any]] = None

