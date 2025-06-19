"""
User Models for ScorePAL Authentication System
Supports multiple user roles: teacher, admin, student, grader
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable, SQLAlchemyUserDatabase
from fastapi_users import schemas
from pydantic import BaseModel
import enum
from typing import Optional
from datetime import datetime

Base = declarative_base()

class UserRole(str, enum.Enum):
    TEACHER = "teacher"
    ADMIN = "admin"
    STUDENT = "student"
    GRADER = "grader"

class User(SQLAlchemyBaseUserTable[int], Base):
    """User model with extended fields for ScorePAL"""
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Extended fields
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.TEACHER, nullable=False)
    institution = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    profile_picture = Column(String(500), nullable=True)
    
    # Usage tracking
    grading_count = Column(Integer, default=0, nullable=False)
    free_gradings_used = Column(Integer, default=0, nullable=False)
    premium_active = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

# Pydantic schemas
class UserRead(schemas.BaseUser[int]):
    """Schema for reading user data"""
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
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class UserCreate(schemas.BaseUserCreate):
    """Schema for creating new users"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole = UserRole.TEACHER
    institution: Optional[str] = None
    department: Optional[str] = None

class UserUpdate(schemas.BaseUserUpdate):
    """Schema for updating user data"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    institution: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

# Additional Pydantic models for frontend
class UserProfile(BaseModel):
    """Complete user profile data"""
    id: int
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