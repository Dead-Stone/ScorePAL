"""
Authentication API routes for ScorePAL.
Handles user registration, login, password reset, and user management.
"""

import logging
import hashlib
import secrets
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from utils.knowledge_graph import KnowledgeGraph
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/auth", tags=["authentication"])

# Models for request and response
class UserRegistrationRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    resetToken: str
    newPassword: str

class UserResponse(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    name: str
    registrationTime: str
    isAuthenticated: bool

# Dependency for Knowledge Graph
def get_knowledge_graph():
    """Dependency to get a Knowledge Graph instance."""
    kg = KnowledgeGraph()
    try:
        yield kg
    finally:
        kg.close()

# Utility functions
def hash_password(password: str) -> str:
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return hash_password(password) == hashed_password

def generate_user_id(email: str) -> str:
    """Generate a unique user ID based on email."""
    return hashlib.md5(email.encode()).hexdigest()

def generate_reset_token() -> str:
    """Generate a secure reset token."""
    return secrets.token_urlsafe(32)

def save_user_to_local_storage(user_data: Dict[str, Any]) -> bool:
    """Save user data to local storage as backup."""
    try:
        storage_path = Path(os.getenv("KG_STORAGE_PATH", "data/knowledge_graph"))
        users_path = storage_path / "users"
        users_path.mkdir(parents=True, exist_ok=True)
        
        user_file = users_path / f"{user_data['id']}.json"
        with open(user_file, 'w') as f:
            json.dump(user_data, f, indent=2)
        
        logger.info(f"User {user_data['email']} saved to local storage")
        return True
    except Exception as e:
        logger.error(f"Error saving user to local storage: {e}")
        return False

def get_user_from_local_storage(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user data from local storage."""
    try:
        storage_path = Path(os.getenv("KG_STORAGE_PATH", "data/knowledge_graph"))
        users_path = storage_path / "users"
        user_file = users_path / f"{user_id}.json"
        
        if user_file.exists():
            with open(user_file, 'r') as f:
                return json.load(f)
        return None
    except Exception as e:
        logger.error(f"Error getting user from local storage: {e}")
        return None

def get_user_by_email_from_local_storage(email: str) -> Optional[Dict[str, Any]]:
    """Get user data by email from local storage."""
    try:
        storage_path = Path(os.getenv("KG_STORAGE_PATH", "data/knowledge_graph"))
        users_path = storage_path / "users"
        
        if not users_path.exists():
            return None
            
        for user_file in users_path.glob("*.json"):
            with open(user_file, 'r') as f:
                user_data = json.load(f)
                if user_data.get('email') == email:
                    return user_data
        return None
    except Exception as e:
        logger.error(f"Error getting user by email from local storage: {e}")
        return None

def create_user_in_graph_db(user_data: Dict[str, Any], kg: KnowledgeGraph) -> bool:
    """Create user in Neo4j graph database."""
    if not kg.is_connected():
        return False
    
    try:
        with kg._driver.session(database=kg.database) as session:
            result = session.run(
                """
                MERGE (u:User {id: $id})
                SET u.email = $email,
                    u.firstName = $firstName,
                    u.lastName = $lastName,
                    u.name = $name,
                    u.passwordHash = $passwordHash,
                    u.registrationTime = $registrationTime,
                    u.lastLoginTime = $lastLoginTime,
                    u.isActive = true,
                    u.usageCount = 0,
                    u.remainingFreeGradings = 10
                RETURN u.id as id
                """,
                id=user_data['id'],
                email=user_data['email'],
                firstName=user_data['firstName'],
                lastName=user_data['lastName'],
                name=user_data['name'],
                passwordHash=user_data['passwordHash'],
                registrationTime=user_data['registrationTime'],
                lastLoginTime=user_data.get('lastLoginTime'),
            )
            
            if result.single():
                logger.info(f"User {user_data['email']} created in Neo4j")
                return True
            return False
    except Exception as e:
        logger.error(f"Error creating user in Neo4j: {e}")
        return False

def get_user_from_graph_db(user_id: str, kg: KnowledgeGraph) -> Optional[Dict[str, Any]]:
    """Get user from Neo4j graph database."""
    if not kg.is_connected():
        return None
    
    try:
        with kg._driver.session(database=kg.database) as session:
            result = session.run(
                """
                MATCH (u:User {id: $id})
                RETURN u.id as id, u.email as email, u.firstName as firstName,
                       u.lastName as lastName, u.name as name, u.passwordHash as passwordHash,
                       u.registrationTime as registrationTime, u.lastLoginTime as lastLoginTime,
                       u.isActive as isActive, u.usageCount as usageCount,
                       u.remainingFreeGradings as remainingFreeGradings
                """,
                id=user_id
            )
            
            record = result.single()
            if record:
                return dict(record)
            return None
    except Exception as e:
        logger.error(f"Error getting user from Neo4j: {e}")
        return None

def get_user_by_email_from_graph_db(email: str, kg: KnowledgeGraph) -> Optional[Dict[str, Any]]:
    """Get user by email from Neo4j graph database."""
    if not kg.is_connected():
        return None
    
    try:
        with kg._driver.session(database=kg.database) as session:
            result = session.run(
                """
                MATCH (u:User {email: $email})
                RETURN u.id as id, u.email as email, u.firstName as firstName,
                       u.lastName as lastName, u.name as name, u.passwordHash as passwordHash,
                       u.registrationTime as registrationTime, u.lastLoginTime as lastLoginTime,
                       u.isActive as isActive, u.usageCount as usageCount,
                       u.remainingFreeGradings as remainingFreeGradings
                """,
                email=email
            )
            
            record = result.single()
            if record:
                return dict(record)
            return None
    except Exception as e:
        logger.error(f"Error getting user by email from Neo4j: {e}")
        return None

@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(
    request: UserRegistrationRequest,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Register a new user."""
    try:
        # Check if user already exists
        existing_user = get_user_by_email_from_graph_db(request.email, kg)
        if not existing_user:
            existing_user = get_user_by_email_from_local_storage(request.email)
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create user data
        user_id = generate_user_id(request.email)
        current_time = datetime.now().isoformat()
        
        user_data = {
            "id": user_id,
            "email": request.email,
            "firstName": request.firstName,
            "lastName": request.lastName,
            "name": f"{request.firstName} {request.lastName}",
            "passwordHash": hash_password(request.password),
            "registrationTime": current_time,
            "lastLoginTime": current_time,
            "isActive": True,
            "usageCount": 0,
            "remainingFreeGradings": 10
        }
        
        # Save to GraphDB if available, otherwise to local storage
        saved_to_graph = create_user_in_graph_db(user_data, kg)
        saved_to_local = save_user_to_local_storage(user_data)
        
        if not saved_to_graph and not saved_to_local:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )
        
        # Return user response
        return UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            firstName=user_data["firstName"],
            lastName=user_data["lastName"],
            name=user_data["name"],
            registrationTime=user_data["registrationTime"],
            isAuthenticated=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during registration"
        )

@router.post("/login", response_model=UserResponse)
async def login_user(
    request: UserLoginRequest,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Login a user."""
    try:
        # Get user from GraphDB or local storage
        user_data = get_user_by_email_from_graph_db(request.email, kg)
        if not user_data:
            user_data = get_user_by_email_from_local_storage(request.email)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(request.password, user_data["passwordHash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Update last login time
        user_data["lastLoginTime"] = datetime.now().isoformat()
        
        # Update in GraphDB if connected
        if kg.is_connected():
            try:
                with kg._driver.session(database=kg.database) as session:
                    session.run(
                        """
                        MATCH (u:User {id: $id})
                        SET u.lastLoginTime = $lastLoginTime
                        """,
                        id=user_data["id"],
                        lastLoginTime=user_data["lastLoginTime"]
                    )
            except Exception as e:
                logger.warning(f"Failed to update last login time in GraphDB: {e}")
        
        # Update in local storage
        save_user_to_local_storage(user_data)
        
        return UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            firstName=user_data["firstName"],
            lastName=user_data["lastName"],
            name=user_data["name"],
            registrationTime=user_data["registrationTime"],
            isAuthenticated=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Request password reset."""
    try:
        # Get user from GraphDB or local storage
        user_data = get_user_by_email_from_graph_db(request.email, kg)
        if not user_data:
            user_data = get_user_by_email_from_local_storage(request.email)
        
        if not user_data:
            # For security, don't reveal if email exists or not
            return {"message": "If the email exists, a reset link has been sent"}
        
        # Generate reset token
        reset_token = generate_reset_token()
        reset_token_expires = (datetime.now() + timedelta(hours=1)).isoformat()
        
        # Store reset token
        user_data["resetToken"] = reset_token
        user_data["resetTokenExpires"] = reset_token_expires
        
        # Update in GraphDB if connected
        if kg.is_connected():
            try:
                with kg._driver.session(database=kg.database) as session:
                    session.run(
                        """
                        MATCH (u:User {id: $id})
                        SET u.resetToken = $resetToken,
                            u.resetTokenExpires = $resetTokenExpires
                        """,
                        id=user_data["id"],
                        resetToken=reset_token,
                        resetTokenExpires=reset_token_expires
                    )
            except Exception as e:
                logger.warning(f"Failed to update reset token in GraphDB: {e}")
        
        # Update in local storage
        save_user_to_local_storage(user_data)
        
        # TODO: Send email with reset link
        logger.info(f"Password reset requested for {request.email}. Reset token: {reset_token}")
        
        return {"message": "If the email exists, a reset link has been sent"}
        
    except Exception as e:
        logger.error(f"Error processing forgot password request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Reset user password."""
    try:
        # Get user from GraphDB or local storage
        user_data = get_user_by_email_from_graph_db(request.email, kg)
        if not user_data:
            user_data = get_user_by_email_from_local_storage(request.email)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset request"
            )
        
        # Check if reset token exists and is valid
        if not user_data.get("resetToken") or user_data.get("resetToken") != request.resetToken:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Check if token is expired
        if user_data.get("resetTokenExpires"):
            expires_at = datetime.fromisoformat(user_data["resetTokenExpires"])
            if datetime.now() > expires_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Reset token has expired"
                )
        
        # Update password and clear reset token
        user_data["passwordHash"] = hash_password(request.newPassword)
        user_data.pop("resetToken", None)
        user_data.pop("resetTokenExpires", None)
        
        # Update in GraphDB if connected
        if kg.is_connected():
            try:
                with kg._driver.session(database=kg.database) as session:
                    session.run(
                        """
                        MATCH (u:User {id: $id})
                        SET u.passwordHash = $passwordHash
                        REMOVE u.resetToken, u.resetTokenExpires
                        """,
                        id=user_data["id"],
                        passwordHash=user_data["passwordHash"]
                    )
            except Exception as e:
                logger.warning(f"Failed to update password in GraphDB: {e}")
        
        # Update in local storage
        save_user_to_local_storage(user_data)
        
        return {"message": "Password has been reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during password reset"
        )

@router.get("/user/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    kg: KnowledgeGraph = Depends(get_knowledge_graph)
):
    """Get user information."""
    try:
        # Get user from GraphDB or local storage
        user_data = get_user_from_graph_db(user_id, kg)
        if not user_data:
            user_data = get_user_from_local_storage(user_id)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            firstName=user_data["firstName"],
            lastName=user_data["lastName"],
            name=user_data["name"],
            registrationTime=user_data["registrationTime"],
            isAuthenticated=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 