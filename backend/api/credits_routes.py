"""
Credits System API Routes for ScorePAL
Handles credit management, earning, and spending
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from pydantic import BaseModel
from ..models.user import User
from ..auth.auth_config import current_active_user, require_admin
from ..auth.auth_config import get_users_collection
from bson import ObjectId

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/credits", tags=["credits"])

# Credit constants
CREDITS_PER_GRADING = 1  # Cost per grading
CREDITS_SIGNUP_BONUS = 10  # Credits given on signup
CREDITS_VERIFICATION_BONUS = 5  # Credits for email verification
CREDITS_REFERRAL_BONUS = 5  # Credits for referring a user


class CreditTransaction(BaseModel):
    """Credit transaction model"""
    amount: int
    type: str  # 'earned', 'spent', 'bonus', 'purchase'
    description: str
    reference_id: Optional[str] = None  # e.g., grading_id, referral_id
    timestamp: datetime = datetime.utcnow()


class CreditBalance(BaseModel):
    """User credit balance response"""
    credits: int
    credits_earned: int
    credits_spent: int
    can_grade: bool


class AddCreditsRequest(BaseModel):
    """Request to add credits"""
    amount: int
    description: Optional[str] = None
    type: str = "bonus"  # 'bonus', 'purchase', 'referral'


@router.get("/balance", response_model=CreditBalance)
async def get_credit_balance(user: User = Depends(current_active_user)):
    """Get current user's credit balance"""
    try:
        collection = await get_users_collection()
        user_doc = await collection.find_one({"_id": ObjectId(user.id)})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        credits = user_doc.get("credits", 0)
        credits_earned = user_doc.get("credits_earned", 0)
        credits_spent = user_doc.get("credits_spent", 0)
        
        return CreditBalance(
            credits=credits,
            credits_earned=credits_earned,
            credits_spent=credits_spent,
            can_grade=credits >= CREDITS_PER_GRADING
        )
    except Exception as e:
        logger.error(f"Error getting credit balance: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving credit balance: {str(e)}")


@router.post("/add")
async def add_credits(
    request: AddCreditsRequest,
    user: User = Depends(current_active_user)
):
    """Add credits to user account (admin or system only)"""
    try:
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        collection = await get_users_collection()
        user_doc = await collection.find_one({"_id": ObjectId(user.id)})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_credits = user_doc.get("credits", 0)
        current_earned = user_doc.get("credits_earned", 0)
        
        new_credits = current_credits + request.amount
        new_earned = current_earned + request.amount
        
        await collection.update_one(
            {"_id": ObjectId(user.id)},
            {
                "$set": {
                    "credits": new_credits,
                    "credits_earned": new_earned,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Added {request.amount} credits to user {user.id} ({user.email})")
        
        return {
            "status": "success",
            "message": f"Added {request.amount} credits",
            "new_balance": new_credits,
            "description": request.description or f"Credits added via {request.type}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding credits: {e}")
        raise HTTPException(status_code=500, detail=f"Error adding credits: {str(e)}")


@router.post("/spend")
async def spend_credits(
    amount: int,
    description: str,
    reference_id: Optional[str] = None,
    user: User = Depends(current_active_user)
):
    """Spend credits (e.g., for grading)"""
    try:
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        collection = await get_users_collection()
        user_doc = await collection.find_one({"_id": ObjectId(user.id)})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_credits = user_doc.get("credits", 0)
        current_spent = user_doc.get("credits_spent", 0)
        
        if current_credits < amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient credits. You have {current_credits} credits, but need {amount}."
            )
        
        new_credits = current_credits - amount
        new_spent = current_spent + amount
        
        await collection.update_one(
            {"_id": ObjectId(user.id)},
            {
                "$set": {
                    "credits": new_credits,
                    "credits_spent": new_spent,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Spent {amount} credits for user {user.id} ({user.email}): {description}")
        
        return {
            "status": "success",
            "message": f"Spent {amount} credits",
            "new_balance": new_credits,
            "description": description
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error spending credits: {e}")
        raise HTTPException(status_code=500, detail=f"Error spending credits: {str(e)}")


@router.post("/check")
async def check_can_grade(
    user: User = Depends(current_active_user)
):
    """Check if user has enough credits to grade"""
    try:
        collection = await get_users_collection()
        user_doc = await collection.find_one({"_id": ObjectId(user.id)})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        credits = user_doc.get("credits", 0)
        can_grade = credits >= CREDITS_PER_GRADING
        
        return {
            "can_grade": can_grade,
            "credits": credits,
            "required": CREDITS_PER_GRADING,
            "message": "You have enough credits to grade" if can_grade else f"You need {CREDITS_PER_GRADING - credits} more credits to grade"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking credits: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking credits: {str(e)}")


@router.post("/admin/add")
async def admin_add_credits(
    user_id: str,
    amount: int,
    description: Optional[str] = None,
    admin: User = Depends(require_admin)
):
    """Admin endpoint to add credits to any user"""
    try:
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        collection = await get_users_collection()
        user_doc = await collection.find_one({"_id": ObjectId(user_id)})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_credits = user_doc.get("credits", 0)
        current_earned = user_doc.get("credits_earned", 0)
        
        new_credits = current_credits + amount
        new_earned = current_earned + amount
        
        await collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "credits": new_credits,
                    "credits_earned": new_earned,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Admin {admin.id} added {amount} credits to user {user_id}")
        
        return {
            "status": "success",
            "message": f"Added {amount} credits to user",
            "user_id": user_id,
            "new_balance": new_credits,
            "description": description or "Admin credit addition"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding credits (admin): {e}")
        raise HTTPException(status_code=500, detail=f"Error adding credits: {str(e)}")

