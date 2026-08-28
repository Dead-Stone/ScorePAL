"""
Institution/College Models for ScorePAL
Manages educational institutions and their members
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId

class InstitutionStatus(str, Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"

class Institution(BaseModel):
    """Institution/College model"""
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    code: str  # Unique institution code (e.g., "MIT", "STANFORD")
    domain: Optional[str] = None  # Email domain (e.g., "mit.edu")
    website: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    status: InstitutionStatus = InstitutionStatus.ACTIVE
    
    # Contact information
    admin_email: Optional[EmailStr] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    
    # Settings
    allow_self_registration: bool = True
    require_email_verification: bool = True
    require_admin_approval: bool = False
    
    # Role permissions (which roles are allowed for this institution)
    allowed_roles: List[str] = Field(default_factory=lambda: ["teacher", "student", "grader", "admin"])
    
    # Statistics
    total_users: int = 0
    total_teachers: int = 0
    total_students: int = 0
    total_graders: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None  # User ID who created this institution
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class InstitutionCreate(BaseModel):
    """Schema for creating a new institution"""
    name: str
    code: str
    domain: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    admin_email: Optional[EmailStr] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    allow_self_registration: bool = True
    require_email_verification: bool = True
    require_admin_approval: bool = False
    allowed_roles: List[str] = Field(default_factory=lambda: ["teacher", "student", "grader", "admin"])
    
    @validator('code')
    def validate_code(cls, v):
        if not v or len(v) < 2:
            raise ValueError("Institution code must be at least 2 characters")
        if not v.isalnum() and '_' not in v:
            raise ValueError("Institution code must be alphanumeric or contain underscores")
        return v.upper()

class InstitutionUpdate(BaseModel):
    """Schema for updating institution data"""
    name: Optional[str] = None
    domain: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    admin_email: Optional[EmailStr] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[InstitutionStatus] = None
    allow_self_registration: Optional[bool] = None
    require_email_verification: Optional[bool] = None
    require_admin_approval: Optional[bool] = None
    allowed_roles: Optional[List[str]] = None

class InstitutionRead(BaseModel):
    """Schema for reading institution data"""
    id: Optional[str] = None
    name: str
    code: str
    domain: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    status: InstitutionStatus
    allow_self_registration: bool
    require_email_verification: bool
    require_admin_approval: bool
    allowed_roles: List[str]
    total_users: int
    total_teachers: int
    total_students: int
    total_graders: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class InstitutionMember(BaseModel):
    """Institution membership model"""
    user_id: str
    institution_id: str
    role: str
    status: str = "active"  # active, pending, suspended
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

