"""
Institution Management Routes for ScorePAL
Handles institution creation, management, and membership
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from models.institution import (
    Institution, InstitutionCreate, InstitutionUpdate, InstitutionRead,
    InstitutionStatus, InstitutionMember
)
from models.user import User, UserRole
from auth.auth_config import (
    current_active_user, require_admin, require_teacher_or_admin,
    get_users_collection, get_mongodb_client
)

router = APIRouter(prefix="/institutions", tags=["institutions"])

# Get institutions collection
async def get_institutions_collection():
    """Get institutions collection"""
    client, database, _ = get_mongodb_client()
    return database["institutions"]

# Get institution members collection
async def get_institution_members_collection():
    """Get institution members collection"""
    client, database, _ = get_mongodb_client()
    return database["institution_members"]

@router.post("/", response_model=InstitutionRead, status_code=status.HTTP_201_CREATED)
async def create_institution(
    institution_data: InstitutionCreate,
    current_user: User = Depends(require_admin)
):
    """Create a new institution (admin only)"""
    institutions_collection = await get_institutions_collection()
    
    # Check if code already exists
    existing = await institutions_collection.find_one({"code": institution_data.code.upper()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Institution with code '{institution_data.code}' already exists"
        )
    
    # Create institution document
    institution_doc = {
        **institution_data.dict(),
        "code": institution_data.code.upper(),
        "status": InstitutionStatus.ACTIVE,
        "total_users": 0,
        "total_teachers": 0,
        "total_students": 0,
        "total_graders": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by": current_user.id
    }
    
    result = await institutions_collection.insert_one(institution_doc)
    institution_doc["id"] = str(result.inserted_id)
    del institution_doc["_id"]
    
    return InstitutionRead(**institution_doc)

@router.get("/", response_model=List[InstitutionRead])
async def list_institutions(
    status_filter: Optional[InstitutionStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(current_active_user)
):
    """List all institutions (filtered by status if provided)"""
    institutions_collection = await get_institutions_collection()
    
    query = {}
    if status_filter:
        query["status"] = status_filter.value
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"domain": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = institutions_collection.find(query).sort("name", 1)
    institutions = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        institutions.append(InstitutionRead(**doc))
    
    return institutions

@router.get("/{institution_id}", response_model=InstitutionRead)
async def get_institution(
    institution_id: str,
    current_user: User = Depends(current_active_user)
):
    """Get institution details"""
    institutions_collection = await get_institutions_collection()
    
    try:
        object_id = ObjectId(institution_id)
        doc = await institutions_collection.find_one({"_id": object_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Institution not found"
            )
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        return InstitutionRead(**doc)
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )

@router.put("/{institution_id}", response_model=InstitutionRead)
async def update_institution(
    institution_id: str,
    institution_data: InstitutionUpdate,
    current_user: User = Depends(require_admin)
):
    """Update institution (admin only)"""
    institutions_collection = await get_institutions_collection()
    
    try:
        object_id = ObjectId(institution_id)
        update_data = {k: v for k, v in institution_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await institutions_collection.update_one(
            {"_id": object_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Institution not found"
            )
        
        # Return updated institution
        doc = await institutions_collection.find_one({"_id": object_id})
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        return InstitutionRead(**doc)
    except HTTPException:
        raise
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )

@router.get("/code/{institution_code}", response_model=InstitutionRead)
async def get_institution_by_code(
    institution_code: str,
    current_user: User = Depends(current_active_user)
):
    """Get institution by code"""
    institutions_collection = await get_institutions_collection()
    
    doc = await institutions_collection.find_one({"code": institution_code.upper()})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return InstitutionRead(**doc)

@router.get("/detect/email/{email}", response_model=Optional[InstitutionRead])
async def detect_institution_from_email_endpoint(
    email: str
    # No authentication required - needed for registration/login
):
    """Detect institution from email domain (public endpoint)"""
    from utils.institution_utils import detect_institution_from_email
    
    institution = await detect_institution_from_email(email)
    if institution:
        return InstitutionRead(**institution)
    return None

@router.post("/{institution_id}/members/{user_id}", status_code=status.HTTP_201_CREATED)
async def add_member(
    institution_id: str,
    user_id: str,
    role: UserRole,
    current_user: User = Depends(require_admin)
):
    """Add a user to an institution (admin only)"""
    members_collection = await get_institution_members_collection()
    institutions_collection = await get_institutions_collection()
    
    # Verify institution exists
    try:
        inst_object_id = ObjectId(institution_id)
        institution = await institutions_collection.find_one({"_id": inst_object_id})
        if not institution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Institution not found"
            )
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Check if user is already a member
    existing = await members_collection.find_one({
        "user_id": user_id,
        "institution_id": institution_id
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this institution"
        )
    
    # Add member
    member_doc = {
        "user_id": user_id,
        "institution_id": institution_id,
        "role": role.value,
        "status": "active",
        "joined_at": datetime.utcnow(),
        "approved_by": current_user.id,
        "approved_at": datetime.utcnow()
    }
    
    await members_collection.insert_one(member_doc)
    
    # Update institution statistics
    role_field = f"total_{role.value}s" if role.value != "admin" else "total_users"
    await institutions_collection.update_one(
        {"_id": inst_object_id},
        {"$inc": {"total_users": 1, role_field: 1}}
    )
    
    return {"message": "Member added successfully"}

@router.get("/{institution_id}/members", response_model=List[dict])
async def list_members(
    institution_id: str,
    current_user: User = Depends(require_teacher_or_admin)
):
    """List all members of an institution"""
    members_collection = await get_institution_members_collection()
    users_collection = await get_users_collection()
    
    cursor = members_collection.find({"institution_id": institution_id})
    members = []
    async for doc in cursor:
        # Get user details
        user = await users_collection.find_one({"_id": ObjectId(doc["user_id"])})
        if user:
            members.append({
                "user_id": doc["user_id"],
                "email": user.get("email"),
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "role": doc["role"],
                "status": doc["status"],
                "joined_at": doc["joined_at"]
            })
    
    return members

@router.get("/user/{user_id}/institution", response_model=Optional[InstitutionRead])
async def get_user_institution(
    user_id: str,
    current_user: User = Depends(current_active_user)
):
    """Get institution for a specific user"""
    members_collection = await get_institution_members_collection()
    institutions_collection = await get_institutions_collection()
    
    # Find user's institution membership
    member = await members_collection.find_one({"user_id": user_id})
    if not member:
        return None
    
    # Get institution
    try:
        inst_object_id = ObjectId(member["institution_id"])
        doc = await institutions_collection.find_one({"_id": inst_object_id})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            return InstitutionRead(**doc)
    except:
        pass
    
    return None

