"""
Authentication Routes for ScorePAL
Handles login, registration, password reset, and user management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.sql import func
from typing import Optional, List
from datetime import datetime

from models.user import User, UserCreate, UserRead, UserUpdate, UserRole, UserProfile, UserStats
from auth.auth_config import (
    fastapi_users, 
    auth_backend, 
    current_active_user, 
    current_verified_user,
    current_superuser,
    get_user_db,
    get_async_session,
    require_teacher_or_admin,
    require_admin
)

# Create router
router = APIRouter()

# Include FastAPI Users auth routes
router.include_router(
    fastapi_users.get_auth_router(auth_backend), 
    prefix="/jwt", 
    tags=["auth"]
)

router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/reset-password",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/verify",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# Custom authentication endpoints

@router.post("/login", response_model=dict, tags=["auth"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Login endpoint that returns user data along with token
    """
    # This will be handled by FastAPI Users, but we can add custom logic here
    # For now, redirect to the standard login
    return {"message": "Use /auth/jwt/login endpoint for authentication"}

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
        from fastapi import HTTPException
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
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update current user profile"""
    # Update user fields
    update_dict = update_data.dict(exclude_unset=True)
    
    if update_dict:
        stmt = update(User).where(User.id == user.id).values(
            **update_dict,
            updated_at=datetime.utcnow()
        )
        await session.execute(stmt)
        await session.commit()
        
        # Refresh user data
        await session.refresh(user)
    
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

@router.post("/me/update-login", tags=["users"])
async def update_last_login(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update user's last login timestamp"""
    stmt = update(User).where(User.id == user.id).values(
        last_login=datetime.utcnow()
    )
    await session.execute(stmt)
    await session.commit()
    
    return {"message": "Last login updated successfully"}

@router.post("/me/increment-grading", tags=["users"])
async def increment_grading_count(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Increment user's grading count and free gradings used"""
    # Check if user has free gradings remaining
    if user.free_gradings_used < 10 and not user.premium_active:
        free_gradings_increment = 1
    else:
        free_gradings_increment = 0
    
    stmt = update(User).where(User.id == user.id).values(
        grading_count=User.grading_count + 1,
        free_gradings_used=User.free_gradings_used + free_gradings_increment
    )
    await session.execute(stmt)
    await session.commit()
    
    return {
        "message": "Grading count updated",
        "total_gradings": user.grading_count + 1,
        "free_gradings_used": user.free_gradings_used + free_gradings_increment
    }

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
    user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Get all users (admin only)"""
    stmt = select(User).offset(skip).limit(limit)
    result = await session.execute(stmt)
    users = result.scalars().all()
    
    return [
        UserProfile(
            id=u.id,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            role=u.role,
            institution=u.institution,
            department=u.department,
            bio=u.bio,
            profile_picture=u.profile_picture,
            grading_count=u.grading_count,
            free_gradings_used=u.free_gradings_used,
            premium_active=u.premium_active,
            is_active=u.is_active,
            is_verified=u.is_verified,
            created_at=u.created_at,
            last_login=u.last_login
        ) for u in users
    ]

@router.get("/admin/stats", tags=["admin"])
async def get_admin_stats(
    user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Get system statistics (admin only)"""
    # Get user counts by role
    stmt = select(User.role, func.count(User.id)).group_by(User.role)
    result = await session.execute(stmt)
    role_counts = dict(result.all())
    
    # Get total grading count
    stmt = select(func.sum(User.grading_count))
    result = await session.execute(stmt)
    total_gradings = result.scalar() or 0
    
    # Get active users (logged in last 30 days)
    thirty_days_ago = datetime.utcnow().replace(day=datetime.utcnow().day - 30)
    stmt = select(func.count(User.id)).where(User.last_login >= thirty_days_ago)
    result = await session.execute(stmt)
    active_users = result.scalar() or 0
    
    return {
        "total_users": sum(role_counts.values()),
        "users_by_role": role_counts,
        "total_gradings": total_gradings,
        "active_users_30_days": active_users
    }

@router.put("/admin/users/{user_id}/premium", tags=["admin"])
async def toggle_user_premium(
    user_id: int,
    premium_active: bool,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Toggle user's premium status (admin only)"""
    stmt = update(User).where(User.id == user_id).values(premium_active=premium_active)
    result = await session.execute(stmt)
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await session.commit()
    
    return {"message": f"User {user_id} premium status updated to {premium_active}"}

@router.put("/admin/users/{user_id}/role", tags=["admin"])
async def change_user_role(
    user_id: int,
    new_role: UserRole,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Change user's role (admin only)"""
    stmt = update(User).where(User.id == user_id).values(role=new_role)
    result = await session.execute(stmt)
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await session.commit()
    
    return {"message": f"User {user_id} role updated to {new_role.value}"} 