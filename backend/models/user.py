"""
User Models for ScorePAL Authentication System with MongoDB
Supports multiple user roles: teacher, admin, student, grader
Production-level security with password hashing and JWT tokens
"""

from motor.motor_asyncio import AsyncIOMotorClient
from fastapi_users import schemas
from pydantic import BaseModel, EmailStr, Field, validator
import enum
from typing import Optional, Dict, Any
from datetime import datetime
import bcrypt
import secrets
import string
from bson import ObjectId

# MongoDB User Model
class UserRole(str, enum.Enum):
    TEACHER = "teacher"
    ADMIN = "admin"
    STUDENT = "student"
    GRADER = "grader"

class User(BaseModel):
    """User model with MongoDB ObjectId and extended fields for ScorePAL"""
    id: Optional[str] = Field(default=None, alias="_id")
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    is_superuser: bool = False
    is_verified: bool = False
    
    # Extended fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole = UserRole.TEACHER
    institution: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    
    # Usage tracking
    grading_count: int = 0
    free_gradings_used: int = 0
    premium_active: bool = False
    
    # Credits system
    credits: int = 0  # Total credits available
    credits_earned: int = 0  # Total credits earned (lifetime)
    credits_spent: int = 0  # Total credits spent (lifetime)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    # AI configuration preferences
    default_ai_config_id: Optional[str] = None
    grading_preferences: Optional[Dict[str, Any]] = None
    
    # Security fields
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None
    email_verification_token: Optional[str] = None
    email_verification_expires: Optional[datetime] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

# Password security utilities
def hash_password(password: str) -> str:
    """Hash password using bcrypt with salt"""
    salt = bcrypt.gensalt(rounds=12)  # 12 rounds for security
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_secure_token(length: int = 32) -> str:
    """Generate secure random token for password reset/email verification"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def validate_password_strength(password: str) -> None:
    """Validate password strength requirements"""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    
    if not any(char.isdigit() for char in password):
        raise ValueError("Password must contain at least one digit")
    
    if not any(char.isupper() for char in password):
        raise ValueError("Password must contain at least one uppercase letter")
    
    if not any(char.islower() for char in password):
        raise ValueError("Password must contain at least one lowercase letter")
    
    if not any(char in "!@#$%^&*()_+-=[]{}|;:,.<>?" for char in password):
        raise ValueError("Password must contain at least one special character")

# Pydantic schemas for API
class UserRead(BaseModel):
    """Schema for reading user data"""
    id: Optional[str] = None
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole = UserRole.TEACHER
    institution: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    grading_count: int = 0
    free_gradings_used: int = 0
    premium_active: bool = False
    credits: int = 0
    credits_earned: int = 0
    credits_spent: int = 0
    is_active: bool = True
    is_verified: bool = False
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    """Schema for creating new users"""
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole = UserRole.TEACHER
    institution: Optional[str] = None
    department: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        validate_password_strength(v)
        return v

class UserUpdate(BaseModel):
    """Schema for updating user data"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    institution: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

class PasswordResetRequest(BaseModel):
    """Schema for password reset request"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        validate_password_strength(v)
        return v

class EmailVerificationRequest(BaseModel):
    """Schema for email verification request"""
    email: EmailStr

class LoginRequest(BaseModel):
    """Schema for login request"""
    email: EmailStr
    password: str

# Additional Pydantic models for frontend
class UserProfile(BaseModel):
    """Complete user profile data"""
    id: Optional[str] = None
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole
    institution: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    grading_count: int
    free_gradings_used: int
    premium_active: bool
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class UserStats(BaseModel):
    """User usage statistics"""
    total_gradings: int
    free_gradings_remaining: int
    premium_active: bool
    role: UserRole
    member_since: datetime

class LoginResponse(BaseModel):
    """Response model for successful login"""
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    expires_in: int

class PasswordResetResponse(BaseModel):
    """Response model for password reset"""
    message: str
    token_sent: bool = True 