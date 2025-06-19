"""
Authentication Configuration for ScorePAL
FastAPI Users setup with JWT authentication and SQLAlchemy database
"""

import os
from typing import Optional
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from models.user import User, UserCreate, UserRead, UserUpdate, UserRole, Base

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/scorepal_users.db")

# Convert sqlite URL for async if needed
if DATABASE_URL.startswith("sqlite:///"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
else:
    ASYNC_DATABASE_URL = DATABASE_URL

# Create async engine
engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Create sync engine for initial setup
sync_engine = create_engine(DATABASE_URL, echo=False)

class UserManager(BaseUserManager[User, int]):
    """Custom user manager with ScorePAL specific logic"""
    reset_password_token_secret = os.getenv("RESET_PASSWORD_SECRET", "scorepal-reset-secret-key")
    verification_token_secret = os.getenv("VERIFICATION_SECRET", "scorepal-verification-secret-key")

    def parse_id(self, value: str) -> int:
        """Parse user ID from string to integer"""
        try:
            return int(value)
        except ValueError:
            raise ValueError(f"Invalid user ID: {value}")

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        """Called after successful user registration"""
        print(f"User {user.id} has registered with email {user.email} and role {user.role}")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        """Called after forgot password request"""
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        """Called after verification request"""
        print(f"Verification requested for user {user.id}. Verification token: {token}")

    async def validate_password(self, password: str, user: UserCreate | User) -> None:
        """Validate password strength"""
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        if not any(char.isdigit() for char in password):
            raise ValueError("Password must contain at least one digit")
        
        if not any(char.isupper() for char in password):
            raise ValueError("Password must contain at least one uppercase letter")

    async def create_user(self, user_create: UserCreate) -> User:
        """Create user with usage tracking initialization"""
        user = await super().create_user(user_create)
        
        # Initialize usage tracking based on role
        if user.role == UserRole.TEACHER:
            user.free_gradings_used = 0
        elif user.role == UserRole.ADMIN:
            user.premium_active = True
            
        return user

async def get_async_session():
    """Get async database session"""
    async with async_session_maker() as session:
        yield session

async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """Get user database instance"""
    yield SQLAlchemyUserDatabase(session, User)

async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    """Get user manager instance"""
    yield UserManager(user_db)

# JWT Strategy
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=os.getenv("JWT_SECRET", "scorepal-jwt-secret-key"),
        lifetime_seconds=3600 * 24 * 7,  # 1 week
    )

# Authentication backend
auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

# FastAPI Users instance
fastapi_users = FastAPIUsers[User, int](get_user_manager, [auth_backend])

# Current user dependencies
current_active_user = fastapi_users.current_user(active=True)
current_verified_user = fastapi_users.current_user(active=True, verified=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)

# Role-based dependencies
def require_role(required_role: UserRole):
    """Dependency to require specific user role"""
    def role_checker(user: User = Depends(current_active_user)):
        if user.role != required_role and not user.is_superuser:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role.value}"
            )
        return user
    return role_checker

def require_roles(*required_roles: UserRole):
    """Dependency to require any of the specified user roles"""
    def role_checker(user: User = Depends(current_active_user)):
        if user.role not in required_roles and not user.is_superuser:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[role.value for role in required_roles]}"
            )
        return user
    return role_checker

# Convenience role dependencies
require_teacher = require_role(UserRole.TEACHER)
require_admin = require_role(UserRole.ADMIN)
require_student = require_role(UserRole.STUDENT)
require_grader = require_role(UserRole.GRADER)
require_teacher_or_admin = require_roles(UserRole.TEACHER, UserRole.ADMIN)
require_grader_or_admin = require_roles(UserRole.GRADER, UserRole.ADMIN)

# Database initialization
async def create_db_and_tables():
    """Create database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

def create_db_sync():
    """Create database tables synchronously"""
    Base.metadata.create_all(bind=sync_engine) 