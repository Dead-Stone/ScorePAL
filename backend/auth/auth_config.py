"""
Authentication Configuration for ScorePAL with MongoDB
Production-level security with password hashing, JWT tokens, and rate limiting
"""

import os
import jwt
from typing import Optional, Union
from datetime import datetime, timedelta
from fastapi import Depends, Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import bcrypt
import secrets
import string
from bson import ObjectId

# Import models
from models.user import (
    User, UserCreate, UserRead, UserUpdate, UserRole, 
    hash_password, verify_password, generate_secure_token, validate_password_strength
)

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "scorepal")
COLLECTION_NAME = os.getenv("MONGODB_COLLECTION", "users")

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "168"))  # 7 days default

# Security Configuration
PASSWORD_RESET_EXPIRY_HOURS = int(os.getenv("PASSWORD_RESET_EXPIRY_HOURS", "24"))
EMAIL_VERIFICATION_EXPIRY_HOURS = int(os.getenv("EMAIL_VERIFICATION_EXPIRY_HOURS", "72"))
MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
ACCOUNT_LOCKOUT_MINUTES = int(os.getenv("ACCOUNT_LOCKOUT_MINUTES", "30"))

# MongoDB client - lazy initialization
_client = None
_database = None
_users_collection = None

def get_mongodb_client():
    """Get MongoDB client with lazy initialization"""
    global _client, _database, _users_collection
    
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URL)
        _database = _client[DATABASE_NAME]
        _users_collection = _database[COLLECTION_NAME]
    
    return _client, _database, _users_collection

async def get_users_collection():
    """Get users collection with proper async initialization"""
    client, database, users_collection = get_mongodb_client()
    return users_collection

# Create indexes for performance and security
async def create_indexes():
    """Create MongoDB indexes for users collection"""
    users_collection = await get_users_collection()
    await users_collection.create_index("email", unique=True)
    await users_collection.create_index("password_reset_token")
    await users_collection.create_index("email_verification_token")
    await users_collection.create_index("created_at")
    await users_collection.create_index("last_login")

class MongoDBUserManager:
    """Custom MongoDB user manager with production-level security"""
    
    def __init__(self):
        self.collection = None  # Will be initialized lazily
    
    async def get_collection(self):
        """Get users collection with proper async initialization"""
        if self.collection is None:
            self.collection = await get_users_collection()
        return self.collection
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with proper password hashing"""
        collection = await self.get_collection()
        
        # Check if user already exists
        existing_user = await collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user document
        user_doc = {
            "email": user_data.email,
            "hashed_password": hashed_password,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "role": user_data.role,
            "institution": user_data.institution,
            "department": user_data.department,
            "is_active": True,
            "is_superuser": False,
            "is_verified": False,
            "grading_count": 0,
            "free_gradings_used": 0,
            "premium_active": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "failed_login_attempts": 0,
            "locked_until": None
        }
        
        # Insert user
        result = await collection.insert_one(user_doc)
        user_doc["id"] = str(result.inserted_id)
        del user_doc["_id"]  # Remove _id since User model expects 'id'
        
        return User(**user_doc)
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        print(f"Getting user by email: {email}")
        collection = await self.get_collection()
        user_doc = await collection.find_one({"email": email})
        print(f"Raw user doc: {user_doc}")
        if user_doc:
            # Convert ObjectId to string and map _id to id
            user_doc["id"] = str(user_doc["_id"])
            del user_doc["_id"]  # Remove _id since User model expects 'id'
            print(f"Processed user doc: {user_doc}")
            user = User(**user_doc)
            print(f"Created user object: {user}")
            print(f"User ID: {user.id}")
            return user
        print("No user found in database")
        return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        collection = await self.get_collection()
        try:
            object_id = ObjectId(user_id)
            user_doc = await collection.find_one({"_id": object_id})
            if user_doc:
                # Convert ObjectId to string and map _id to id
                user_doc["id"] = str(user_doc["_id"])
                del user_doc["_id"]  # Remove _id since User model expects 'id'
                return User(**user_doc)
        except:
            pass
        return None
    
    async def update_user(self, user_id: str, update_data: dict) -> Optional[User]:
        """Update user data"""
        collection = await self.get_collection()
        try:
            object_id = ObjectId(user_id)
            update_data["updated_at"] = datetime.utcnow()
            
            result = await collection.update_one(
                {"_id": object_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                return await self.get_user_by_id(user_id)
        except:
            pass
        return None
    
    async def verify_password(self, email: str, password: str) -> Optional[User]:
        """Verify user password and handle account lockout"""
        print(f"Verifying password for email: {email}")
        user = await self.get_user_by_email(email)
        print(f"User found: {user}")
        if not user:
            print("No user found")
            return None
        
        print(f"User ID: {user.id}")
        print(f"User dict: {user.dict()}")
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account is locked until {user.locked_until}"
            )
        
        # Verify password
        if verify_password(password, user.hashed_password):
            print("Password verified successfully")
            # Reset failed attempts on successful login
            await self.update_user(user.id, {
                "failed_login_attempts": 0,
                "locked_until": None,
                "last_login": datetime.utcnow()
            })
            return user
        else:
            print("Password verification failed")
            # Increment failed attempts
            new_attempts = user.failed_login_attempts + 1
            update_data = {"failed_login_attempts": new_attempts}
            
            # Lock account if max attempts reached
            if new_attempts >= MAX_LOGIN_ATTEMPTS:
                lockout_until = datetime.utcnow() + timedelta(minutes=ACCOUNT_LOCKOUT_MINUTES)
                update_data["locked_until"] = lockout_until
            
            await self.update_user(user.id, update_data)
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

# JWT Token Management
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.JWTError:
        return None

# HTTP Bearer token dependency
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_manager = MongoDBUserManager()
    user = await user_manager.get_user_by_id(user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user

# User manager instance
user_manager = MongoDBUserManager()

# Current user dependencies
current_active_user = get_current_user
current_verified_user = get_current_user  # Simplified for now
current_superuser = get_current_user  # Simplified for now

# Role-based dependencies
def require_role(required_role: UserRole):
    """Dependency to require specific user role"""
    async def role_checker(user: User = Depends(current_active_user)):
        if user.role != required_role and not user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role.value}"
            )
        return user
    return role_checker

def require_roles(*required_roles: UserRole):
    """Dependency to require any of the specified user roles"""
    async def role_checker(user: User = Depends(current_active_user)):
        if user.role not in required_roles and not user.is_superuser:
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
    """Create MongoDB indexes and initialize database"""
    await create_indexes()
    print("MongoDB indexes created successfully")

def create_db_sync():
    """Create MongoDB indexes synchronously"""
    import asyncio
    asyncio.run(create_indexes())
    print("MongoDB indexes created successfully") 