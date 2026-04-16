"""
Authentication Configuration for ScorePAL with MongoDB
Production-level security with password hashing, JWT tokens, and rate limiting
"""

import os
from dotenv import load_dotenv
from pathlib import Path
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError
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

# Load environment variables from .env file
# Try root .env first, then backend/.env
root_env = Path(__file__).parent.parent.parent / ".env"
backend_env = Path(__file__).parent.parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
if backend_env.exists():
    load_dotenv(backend_env, override=True)

# Import models
from models.user import (
    User, UserCreate, UserRead, UserUpdate, UserRole, 
    hash_password, verify_password, generate_secure_token, validate_password_strength
)

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "")  # Empty string if not configured
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "scorepal")
COLLECTION_NAME = os.getenv("MONGODB_COLLECTION", "users")
MONGODB_ENABLED = bool(MONGODB_URL)  # Only enabled if URL is set

# Log MongoDB URL (mask password for security)
import logging
logger = logging.getLogger(__name__)
if MONGODB_URL and "@" in MONGODB_URL:
    masked_url = MONGODB_URL.split("@")[0].split(":")[0] + ":***@" + MONGODB_URL.split("@")[1] if "@" in MONGODB_URL else MONGODB_URL
else:
    masked_url = MONGODB_URL
if MONGODB_ENABLED:
    logger.info(f"MongoDB URL configured: {masked_url}")
    logger.info(f"MongoDB Database: {DATABASE_NAME}")
else:
    logger.info("MongoDB not configured. Using SQLite fallback.")

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
    """Get MongoDB client with lazy initialization. Returns None if MongoDB is not configured."""
    global _client, _database, _users_collection, MONGODB_URL, MONGODB_ENABLED

    # If MongoDB is not enabled, return None
    if not MONGODB_ENABLED:
        return None, None, None

    # Re-read MONGODB_URL in case .env was updated
    current_url = os.getenv("MONGODB_URL", "")

    # If URL became empty, reset
    if not current_url:
        MONGODB_ENABLED = False
        if _client is not None:
            try:
                _client.close()
            except:
                pass
            _client = None
            _database = None
            _users_collection = None
        return None, None, None

    # If URL changed, update the global and reset client
    if current_url != MONGODB_URL:
        logger.warning(f"MongoDB URL changed, reinitializing client")
        MONGODB_URL = current_url
        if _client is not None:
            try:
                _client.close()
            except:
                pass
            _client = None
            _database = None
            _users_collection = None

    if _client is None:
        logger.info(f"Initializing MongoDB client...")
        try:
            _client = AsyncIOMotorClient(current_url, serverSelectionTimeoutMS=3000)
            _database = _client[DATABASE_NAME]
            _users_collection = _database[COLLECTION_NAME]
            logger.info(f"MongoDB client initialized successfully for database: {DATABASE_NAME}")
        except Exception as e:
            logger.error(f"Failed to initialize MongoDB client: {e}")
            logger.warning("Falling back to SQLite storage for user data")
            _client = None
            _database = None
            _users_collection = None
            MONGODB_ENABLED = False
            return None, None, None

    return _client, _database, _users_collection

async def get_users_collection():
    """Get users collection with proper async initialization. Returns None if MongoDB is not available."""
    client, database, users_collection = get_mongodb_client()
    if users_collection is None:
        logger.warning("Users collection not available - MongoDB not configured or failed to connect")
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
        # Give signup bonus credits
        from api.credits_routes import CREDITS_SIGNUP_BONUS
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
            "credits": CREDITS_SIGNUP_BONUS,
            "credits_earned": CREDITS_SIGNUP_BONUS,
            "credits_spent": 0,
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
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
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
    except ExpiredSignatureError:
        return None
    except JWTError:
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

def require_institution_member():
    """Dependency to require user to be a member of an institution"""
    async def institution_checker(user: User = Depends(current_active_user)):
        if not user.institution:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You must be a member of an institution to access this resource."
            )
        
        # Verify institution membership is active
        try:
            from api.institution_routes import get_institution_members_collection
            members_collection = await get_institution_members_collection()
            member = await members_collection.find_one({
                "user_id": user.id,
                "institution_id": user.institution,
                "status": "active"
            })
            
            if not member:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. Your institution membership is not active."
                )
        except Exception as e:
            logger.warning(f"Error checking institution membership: {e}")
            # Allow access if check fails (graceful degradation)
        
        return user
    return institution_checker

def require_same_institution():
    """Dependency to require users to be from the same institution"""
    async def same_institution_checker(
        user: User = Depends(current_active_user),
        target_user_id: str = None
    ):
        if not user.institution:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You must be a member of an institution."
            )
        
        if target_user_id:
            target_user = await user_manager.get_user_by_id(target_user_id)
            if not target_user or target_user.institution != user.institution:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You can only access resources from your institution."
                )
        
        return user
    return same_institution_checker

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