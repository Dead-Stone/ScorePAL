"""
Authentication Routes for ScorePAL with MongoDB
Handles login, registration, password reset, and user management with production-level security
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from models.user import (
    User, UserCreate, UserRead, UserUpdate, UserRole, UserProfile, UserStats,
    PasswordResetRequest, PasswordResetConfirm, EmailVerificationRequest, LoginRequest,
    LoginResponse, PasswordResetResponse
)
from models.institution import Institution, InstitutionStatus
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

# Email configuration (set these in environment variables)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "your-email@gmail.com"  # Set in environment
SMTP_PASSWORD = "your-app-password"      # Set in environment

def send_email(to_email: str, subject: str, body: str, html_body: str = None):
    """Send email using SMTP"""
    import os
    
    smtp_server = os.getenv("SMTP_SERVER", SMTP_SERVER)
    smtp_port = int(os.getenv("SMTP_PORT", str(SMTP_PORT)))
    smtp_username = os.getenv("SMTP_USERNAME", SMTP_USERNAME)
    smtp_password = os.getenv("SMTP_PASSWORD", SMTP_PASSWORD)
    
    # Check if using default/placeholder values
    is_dev_mode = (
        smtp_username == "your-email@gmail.com" or 
        not smtp_password or 
        smtp_password == "your-app-password"
    )
    
    if is_dev_mode:
        logger.warning(f"[DEV MODE] Email not configured. Would send to {to_email}: {subject}")
        logger.warning(f"[DEV MODE] OTP Code: {body.split('code is:')[1].split()[0] if 'code is:' in body else 'N/A'}")
        logger.warning("[DEV MODE] Configure SMTP_USERNAME and SMTP_PASSWORD in environment variables to enable email sending")
        return True
    
    try:
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_username
        msg['To'] = to_email
        
        # Add text part
        text_part = MIMEText(body, 'plain')
        msg.attach(text_part)
        
        # Add HTML part if provided
        if html_body:
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
        
        # Send email via SMTP
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {e}")
        logger.error("Please check your SMTP_USERNAME and SMTP_PASSWORD in environment variables")
        logger.error("For Gmail, you need to use an App Password, not your regular password")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error occurred: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

# Authentication endpoints

@router.post("/register", response_model=UserRead, tags=["auth"])
async def register_user(user_data: UserCreate):
    """Register a new user with production-level security and institution validation"""
    try:
        # Normalize email to lowercase for consistency
        user_data.email = user_data.email.lower().strip()
        logger.info(f"Registering user with email: {user_data.email}")
        
        # Auto-detect institution from email domain if not provided
        if not user_data.institution:
            from utils.institution_utils import detect_institution_from_email
            detected_institution = await detect_institution_from_email(user_data.email)
            if detected_institution:
                user_data.institution = detected_institution["id"]
                logger.info(f"Auto-detected institution '{detected_institution['name']}' for email {user_data.email}")
        
        # Validate institution if provided
        if user_data.institution:
            from api.institution_routes import get_institutions_collection, get_institution_members_collection
            institutions_collection = await get_institutions_collection()
            
            # Try to find institution by code or name
            institution = await institutions_collection.find_one({
                "$or": [
                    {"code": user_data.institution.upper()},
                    {"name": {"$regex": user_data.institution, "$options": "i"}}
                ]
            })
            
            if not institution:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Institution '{user_data.institution}' not found. Please contact your administrator."
                )
            
            # Check if institution is active
            if institution.get("status") != InstitutionStatus.ACTIVE.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This institution is not currently accepting new registrations"
                )
            
            # Check if self-registration is allowed
            if not institution.get("allow_self_registration", True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Self-registration is not allowed for this institution. Please contact your administrator."
                )
            
            # Validate email domain if institution has domain requirement
            if institution.get("domain"):
                email_domain = user_data.email.split("@")[-1].lower()
                institution_domain = institution["domain"].lower()
                if email_domain != institution_domain:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Email domain must match institution domain ({institution_domain})"
                    )
            
            # Check if role is allowed for this institution
            allowed_roles = institution.get("allowed_roles", ["teacher", "student", "grader", "admin"])
            if user_data.role.value not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role '{user_data.role.value}' is not allowed for this institution. Allowed roles: {', '.join(allowed_roles)}"
                )
            
            # Store institution ID instead of code/name
            user_data.institution = str(institution["_id"])
        
        user = await user_manager.create_user(user_data)
        
        # Add user to institution members if institution was provided
        if user_data.institution:
            from api.institution_routes import get_institution_members_collection
            members_collection = await get_institution_members_collection()
            institutions_collection = await get_institutions_collection()
            
            # Add member record
            member_doc = {
                "user_id": user.id,
                "institution_id": user_data.institution,
                "role": user_data.role.value,
                "status": "pending" if institution.get("require_admin_approval", False) else "active",
                "joined_at": datetime.utcnow()
            }
            await members_collection.insert_one(member_doc)
            
            # Update institution statistics
            role_field = f"total_{user_data.role.value}s" if user_data.role.value != "admin" else "total_users"
            await institutions_collection.update_one(
                {"_id": institution["_id"]},
                {"$inc": {"total_users": 1, role_field: 1}}
            )
        
        # Generate OTP for email verification
        import random
        otp_code = str(random.randint(100000, 999999))
        otp_expires = datetime.utcnow() + timedelta(minutes=10)
        
        # Store OTP in user document (if MongoDB is available)
        from auth.auth_config import get_users_collection, MONGODB_ENABLED
        from bson import ObjectId

        if MONGODB_ENABLED:
            try:
                users_collection = await get_users_collection()

                # Convert user.id to ObjectId if it's a string
                user_id = ObjectId(user.id) if isinstance(user.id, str) else user.id

                result = await users_collection.update_one(
                    {"_id": user_id},
                    {"$set": {
                        "otp_code": otp_code,
                        "otp_expires": otp_expires,
                        "otp_verified": False
                    }}
                )

                logger.info(f"OTP stored for user {user.email}: {otp_code} (matched: {result.matched_count}, modified: {result.modified_count})")
            except Exception as e:
                logger.warning(f"Could not store OTP in MongoDB: {e}. OTP email will still be sent.")
        else:
            logger.info(f"MongoDB not available, skipping OTP storage. OTP: {otp_code}")
        
        # Send OTP email
        otp_body = f"""Welcome to ScorePAL!

Your verification code is: {otp_code}

This code will expire in 10 minutes.

If you didn't create an account, please ignore this email."""
        otp_html = f"""<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Welcome to ScorePAL!</h2>
        <p>Your verification code is:</p>
        <div style="background: #f3f4f6; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0;">{otp_code}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
    </div>
</body>
</html>"""
        email_sent = send_email(user.email, "Verify your ScorePAL account", otp_body, otp_html)
        if not email_sent:
            logger.warning(f"Failed to send OTP email to {user.email}, but user registration succeeded")
        
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

@router.post("/send-otp", tags=["auth"])
async def send_otp(request: EmailVerificationRequest):
    """Send OTP to email for verification"""
    try:
        from auth.auth_config import MONGODB_ENABLED

        # Normalize email to lowercase
        email_normalized = request.email.lower().strip()
        logger.info(f"Sending OTP to email: {email_normalized}")

        user = None
        if MONGODB_ENABLED:
            try:
                from auth.auth_config import get_users_collection
                users_collection = await get_users_collection()

                # Try exact match first, then case-insensitive
                user = await users_collection.find_one({"email": email_normalized})
                if not user:
                    user = await users_collection.find_one({"email": {"$regex": f"^{email_normalized}$", "$options": "i"}})
            except Exception as e:
                logger.warning(f"Could not query MongoDB for user: {e}")

        # Always return success message to prevent email enumeration
        if not user and MONGODB_ENABLED:
            return {"message": "If the email exists, an OTP has been sent"}
        
        import random
        otp_code = str(random.randint(100000, 999999))
        otp_expires = datetime.utcnow() + timedelta(minutes=10)
        
        from bson import ObjectId
        user_id = ObjectId(user["_id"]) if isinstance(user["_id"], str) else user["_id"]
        
        result = await users_collection.update_one(
            {"_id": user_id},
            {"$set": {
                "otp_code": otp_code,
                "otp_expires": otp_expires,
                "otp_verified": False
            }}
        )
        
        logger.info(f"OTP sent and stored for {request.email}: {otp_code} (matched: {result.matched_count}, modified: {result.modified_count})")
        
        otp_body = f"""Your ScorePAL verification code is: {otp_code}

This code will expire in 10 minutes."""
        otp_html = f"""<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">ScorePAL Verification</h2>
        <p>Your verification code is:</p>
        <div style="background: #f3f4f6; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0;">{otp_code}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
    </div>
</body>
</html>"""
        email_sent = send_email(email_normalized, "Your ScorePAL Verification Code", otp_body, otp_html)
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP email. Please check email configuration or try again later."
            )
        return {"message": "OTP sent successfully"}
    except Exception as e:
        logger.error(f"Failed to send OTP: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")

@router.post("/verify-otp", tags=["auth"])
async def verify_otp(
    email: str = Query(..., description="User email address"),
    otp_code: str = Query(..., description="OTP verification code")
):
    """Verify OTP code"""
    try:
        from auth.auth_config import get_users_collection
        users_collection = await get_users_collection()
        
        # Normalize email to lowercase for matching
        email_normalized = email.lower().strip()
        
        logger.info(f"Verifying OTP for email: {email_normalized}, code: {otp_code}")
        
        # Try exact match first (emails should be stored in lowercase)
        user = await users_collection.find_one({"email": email_normalized})
        
        # If not found, try case-insensitive regex match as fallback
        if not user:
            user = await users_collection.find_one({"email": {"$regex": f"^{email_normalized}$", "$options": "i"}})
        
        if not user:
            logger.warning(f"User not found for email: {email_normalized} (original: {email})")
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"User found: {user.get('email')}, OTP in DB: {user.get('otp_code')}, OTP provided: {otp_code}")
        
        if not user.get("otp_code"):
            logger.warning(f"No OTP found for user: {email_normalized}")
            raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")
        
        # Check expiration
        if user.get("otp_expires"):
            if user["otp_expires"] < datetime.utcnow():
                logger.warning(f"OTP expired for user: {email_normalized}")
                raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        
        # Verify OTP code (compare as strings)
        stored_otp = str(user.get("otp_code", ""))
        provided_otp = str(otp_code).strip()
        
        if stored_otp != provided_otp:
            logger.warning(f"OTP mismatch for user {email_normalized}: stored={stored_otp}, provided={provided_otp}")
            raise HTTPException(status_code=400, detail="Invalid OTP code")
        
        # Update user verification status
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "otp_verified": True,
                "is_verified": True,
                "otp_code": None,
                "otp_expires": None
            }}
        )
        
        logger.info(f"OTP verified successfully for user: {email_normalized}")
        return {"message": "Email verified successfully", "verified": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to verify OTP: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to verify OTP: {str(e)}")

@router.post("/login", response_model=LoginResponse, tags=["auth"])
async def login_user(login_data: LoginRequest):
    """Login user with JWT token response and auto-detect institution"""
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
        
        # Check if user was found (verify_password raises exception on failure, but check anyway)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Auto-detect and update institution if user doesn't have one
        if not user.institution:
            from utils.institution_utils import detect_institution_from_email
            detected_institution = await detect_institution_from_email(login_data.email)
            if detected_institution:
                # Update user's institution
                await user_manager.update_user(user.id, {
                    "institution": detected_institution["id"]
                })
                user.institution = detected_institution["id"]
                
                # Add user to institution members
                try:
                    from api.institution_routes import get_institution_members_collection
                    members_collection = await get_institution_members_collection()
                    institutions_collection = await get_institutions_collection()
                    
                    # Check if already a member
                    existing_member = await members_collection.find_one({
                        "user_id": user.id,
                        "institution_id": detected_institution["id"]
                    })
                    
                    if not existing_member:
                        from bson import ObjectId
                        member_doc = {
                            "user_id": user.id,
                            "institution_id": detected_institution["id"],
                            "role": user.role.value,
                            "status": "active",
                            "joined_at": datetime.utcnow()
                        }
                        await members_collection.insert_one(member_doc)
                        
                        # Update institution statistics
                        role_field = f"total_{user.role.value}s" if user.role.value != "admin" else "total_users"
                        await institutions_collection.update_one(
                            {"_id": ObjectId(detected_institution["id"])},
                            {"$inc": {"total_users": 1, role_field: 1}}
                        )
                        logger.info(f"Auto-added user {user.email} to institution {detected_institution['name']}")
                except Exception as e:
                    logger.warning(f"Could not add user to institution members: {e}")
                    # Don't fail login if this fails
        
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