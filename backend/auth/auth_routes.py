"""
Authentication Routes for ScorePAL with MongoDB
Handles login, registration, password reset, and user management with production-level security
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional, List
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from models.user import (
    User, UserCreate, UserRead, UserUpdate, UserRole, UserProfile, UserStats,
    PasswordResetRequest, PasswordResetConfirm, EmailVerificationRequest, LoginRequest,
    LoginResponse, PasswordResetResponse
)
from auth.auth_config import (
    user_manager, 
    current_active_user, 
    current_verified_user,
    current_superuser,
    create_access_token,
    verify_token,
    require_teacher_or_admin,
    require_admin,
    PASSWORD_RESET_EXPIRY_HOURS,
    EMAIL_VERIFICATION_EXPIRY_HOURS,
    JWT_EXPIRATION_HOURS
)
from models.user import generate_secure_token

# Create router
router = APIRouter()

# Email configuration (you should set these in environment variables)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "your-email@gmail.com"  # Set in environment
SMTP_PASSWORD = "your-app-password"      # Set in environment

def send_email(to_email: str, subject: str, body: str):
    """Send email using SMTP (simplified for demo)"""
    try:
        # In production, use proper email service like SendGrid, AWS SES, etc.
        print(f"Email would be sent to {to_email}: {subject}")
        print(f"Body: {body}")
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

# Authentication endpoints

@router.post("/register", response_model=UserRead, tags=["auth"])
async def register_user(user_data: UserCreate):
    """Register a new user with production-level security"""
    try:
        user = await user_manager.create_user(user_data)
        
        # Create access token
        access_token = create_access_token(data={"sub": user.id})
        
        # Send welcome email (optional)
        welcome_body = f"""
        Welcome to ScorePAL!
        
        Your account has been created successfully.
        Email: {user.email}
        Role: {user.role.value}
        
        You can now log in and start using ScorePAL for automated grading.
        """
        send_email(user.email, "Welcome to ScorePAL!", welcome_body)
        
        return UserRead(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            institution=user.institution,
            department=user.department,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=LoginResponse, tags=["auth"])
async def login_user(login_data: LoginRequest):
    """Login user with JWT token response"""
    print(f"Login request received: {login_data}")
    try:
        # Test MongoDB connection first
        try:
            from auth.auth_config import get_users_collection
            await get_users_collection()
        except Exception as db_error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database connection failed: {str(db_error)}"
            )
        
        print(f"Database connection successful")
        user = await user_manager.verify_password(login_data.email, login_data.password)
        
        # Debug: Print user object details
        print(f"User object: {user}")
        print(f"User ID: {user.id}")
        print(f"User email: {user.email}")
        print(f"User dict: {user.dict()}")
        
        # Create access token
        access_token = create_access_token(data={"sub": user.id})
        
        # Create user profile for response
        user_id = str(user.id) if user.id else "unknown"
        print(f"User ID for profile: {user_id}")
        
        user_profile = UserProfile(
            id=user_id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            institution=user.institution,
            department=user.department,
            bio=user.bio,
            profile_picture=user.profile_picture,
            grading_count=user.grading_count,
            free_gradings_used=user.free_gradings_used,
            premium_active=user.premium_active,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login=user.last_login
        )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_profile,
            expires_in=JWT_EXPIRATION_HOURS * 3600
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Login error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/forgot-password", response_model=PasswordResetResponse, tags=["auth"])
async def forgot_password(request: PasswordResetRequest):
    """Send password reset email"""
    try:
        user = await user_manager.get_user_by_email(request.email)
        if not user:
            # Don't reveal if user exists or not
            return PasswordResetResponse(message="If the email exists, a reset link has been sent")
        
        # Generate reset token
        reset_token = generate_secure_token()
        expiry = datetime.utcnow() + timedelta(hours=PASSWORD_RESET_EXPIRY_HOURS)
        
        # Update user with reset token
        await user_manager.update_user(user.id, {
            "password_reset_token": reset_token,
            "password_reset_expires": expiry
        })
        
        # Send reset email
        reset_url = f"https://yourdomain.com/reset-password?token={reset_token}"
        email_body = f"""
        Password Reset Request
        
        You requested a password reset for your ScorePAL account.
        
        Click the link below to reset your password:
        {reset_url}
        
        This link will expire in {PASSWORD_RESET_EXPIRY_HOURS} hours.
        
        If you didn't request this, please ignore this email.
        """
        
        send_email(user.email, "Password Reset Request", email_body)
        
        return PasswordResetResponse(message="Password reset email sent")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}"
        )

@router.post("/reset-password", response_model=dict, tags=["auth"])
async def reset_password(request: PasswordResetConfirm):
    """Reset password using token"""
    try:
        # Find user with this reset token
        from auth.auth_config import get_users_collection
        users_collection = await get_users_collection()
        user_doc = await users_collection.find_one({
            "password_reset_token": request.token,
            "password_reset_expires": {"$gt": datetime.utcnow()}
        })
        
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Hash new password
        from models.user import hash_password
        hashed_password = hash_password(request.new_password)
        
        # Update user password and clear reset token
        await user_manager.update_user(str(user_doc["_id"]), {
            "hashed_password": hashed_password,
            "password_reset_token": None,
            "password_reset_expires": None
        })
        
        return {"message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}"
        )

@router.get("/me", response_model=UserProfile, tags=["users"])
async def get_current_user_profile(user: User = Depends(current_active_user)):
    """Get current user profile with complete data"""
    try:
        return UserProfile(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            institution=user.institution,
            department=user.department,
            bio=user.bio,
            profile_picture=user.profile_picture,
            grading_count=user.grading_count,
            free_gradings_used=user.free_gradings_used,
            premium_active=user.premium_active,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login=user.last_login
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user profile: {str(e)}")

@router.get("/me/stats", response_model=UserStats, tags=["users"])
async def get_user_stats(user: User = Depends(current_active_user)):
    """Get user usage statistics"""
    free_gradings_remaining = max(0, 10 - user.free_gradings_used)
    
    return UserStats(
        total_gradings=user.grading_count,
        free_gradings_remaining=free_gradings_remaining,
        premium_active=user.premium_active,
        role=user.role,
        member_since=user.created_at
    )

@router.put("/me/profile", response_model=UserProfile, tags=["users"])
async def update_user_profile(
    update_data: UserUpdate,
    user: User = Depends(current_active_user)
):
    """Update current user profile"""
    try:
        # Update user fields
        update_dict = update_data.dict(exclude_unset=True)
        
        if update_dict:
                updated_user = await user_manager.update_user(user.id, update_dict)
                if updated_user:
                    user = updated_user
        
        return UserProfile(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            institution=user.institution,
            department=user.department,
            bio=user.bio,
            profile_picture=user.profile_picture,
            grading_count=user.grading_count,
            free_gradings_used=user.free_gradings_used,
            premium_active=user.premium_active,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login=user.last_login
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile update failed: {str(e)}"
        )

@router.post("/me/update-login", tags=["users"])
async def update_last_login(user: User = Depends(current_active_user)):
    """Update user's last login timestamp"""
    try:
        await user_manager.update_user(user.id, {"last_login": datetime.utcnow()})
        return {"message": "Last login updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login update failed: {str(e)}"
        )

@router.post("/me/increment-grading", tags=["users"])
async def increment_grading_count(user: User = Depends(current_active_user)):
    """Increment user's grading count and free gradings used"""
    try:
    # Check if user has free gradings remaining
        if user.free_gradings_used < 10 and not user.premium_active:
            free_gradings_increment = 1
        else:
            free_gradings_increment = 0
        
        update_data = {
            "grading_count": user.grading_count + 1,
            "free_gradings_used": user.free_gradings_used + free_gradings_increment
        }
        
        await user_manager.update_user(user.id, update_data)
    
        return {
        "message": "Grading count updated",
        "total_gradings": user.grading_count + 1,
        "free_gradings_used": user.free_gradings_used + free_gradings_increment
    }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Grading increment failed: {str(e)}"
        )

@router.get("/me/can-grade", tags=["users"])
async def check_grading_permission(user: User = Depends(current_active_user)):
    """Check if user can perform grading (has free gradings or premium)"""
    can_grade = user.premium_active or user.free_gradings_used < 10
    free_gradings_remaining = max(0, 10 - user.free_gradings_used)
    
    return {
        "can_grade": can_grade,
        "free_gradings_remaining": free_gradings_remaining,
        "premium_active": user.premium_active,
        "reason": "Premium active" if user.premium_active else f"{free_gradings_remaining} free gradings remaining" if can_grade else "No free gradings remaining"
    }

# Admin-only endpoints
@router.get("/admin/users", response_model=List[UserProfile], tags=["admin"])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    user: User = Depends(require_admin)
):
    """Get all users (admin only)"""
    try:
        from auth.auth_config import get_users_collection
        
        # Get users with pagination
        users_collection = await get_users_collection()
        cursor = users_collection.find().skip(skip).limit(limit)
        users = []
        
        async for user_doc in cursor:
            user_doc["_id"] = str(user_doc["_id"])
            user_obj = User(**user_doc)
            users.append(UserProfile(
                id=user_obj.id,
                email=user_obj.email,
                first_name=user_obj.first_name,
                last_name=user_obj.last_name,
                role=user_obj.role,
                institution=user_obj.institution,
                department=user_obj.department,
                bio=user_obj.bio,
                profile_picture=user_obj.profile_picture,
                grading_count=user_obj.grading_count,
                free_gradings_used=user_obj.free_gradings_used,
                premium_active=user_obj.premium_active,
                is_active=user_obj.is_active,
                is_verified=user_obj.is_verified,
                created_at=user_obj.created_at,
                last_login=user_obj.last_login
            ))
        
        return users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get users: {str(e)}"
        )

@router.get("/admin/stats", tags=["admin"])
async def get_admin_stats(user: User = Depends(require_admin)):
    """Get system statistics (admin only)"""
    try:
        from auth.auth_config import get_users_collection
        
        # Get user counts by role
        users_collection = await get_users_collection()
        pipeline = [
            {"$group": {"_id": "$role", "count": {"$sum": 1}}}
        ]
        role_counts = {}
        async for doc in users_collection.aggregate(pipeline):
            role_counts[doc["_id"]] = doc["count"]
        
        # Get total grading count
        pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$grading_count"}}}
        ]
        total_gradings = 0
        async for doc in users_collection.aggregate(pipeline):
            total_gradings = doc["total"]
        
        # Get active users (logged in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = await users_collection.count_documents({
            "last_login": {"$gte": thirty_days_ago}
        })
        
        # Get total users
        total_users = await users_collection.count_documents({})
        
        return {
            "total_users": total_users,
            "users_by_role": role_counts,
            "total_gradings": total_gradings,
            "active_users_30_days": active_users
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}"
        )

@router.put("/admin/users/{user_id}/premium", tags=["admin"])
async def toggle_user_premium(
    user_id: str,
    premium_active: bool,
    admin: User = Depends(require_admin)
):
    """Toggle user's premium status (admin only)"""
    try:
        updated_user = await user_manager.update_user(user_id, {"premium_active": premium_active})
        
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": f"User {user_id} premium status updated to {premium_active}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update premium status: {str(e)}"
        )

@router.put("/admin/users/{user_id}/role", tags=["admin"])
async def change_user_role(
    user_id: str,
    new_role: UserRole,
    admin: User = Depends(require_admin)
):
    """Change user's role (admin only)"""
    try:
        updated_user = await user_manager.update_user(user_id, {"role": new_role})
        
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": f"User {user_id} role updated to {new_role.value}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {str(e)}"
        ) 