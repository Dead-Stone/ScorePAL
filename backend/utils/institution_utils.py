"""
Utility functions for institution detection and management
"""

from typing import Optional
from ..models.institution import Institution
from ..api.institution_routes import get_institutions_collection


async def detect_institution_from_email(email: str) -> Optional[dict]:
    """
    Automatically detect institution from email domain
    
    Args:
        email: User's email address
        
    Returns:
        Institution document if found, None otherwise
    """
    if not email or "@" not in email:
        return None
    
    email_domain = email.split("@")[-1].lower()
    
    institutions_collection = await get_institutions_collection()
    
    # Try to find institution by exact domain match
    institution = await institutions_collection.find_one({
        "domain": email_domain,
        "status": "active"
    })
    
    if institution:
        institution["id"] = str(institution["_id"])
        del institution["_id"]
        return institution
    
    # Try to find by domain without TLD (e.g., "mit" from "mit.edu")
    domain_parts = email_domain.split(".")
    if len(domain_parts) > 1:
        base_domain = domain_parts[0]  # e.g., "mit" from "mit.edu"
        
        # Search for institutions with similar domain patterns
        # This is a fallback for cases like "student.mit.edu" matching "mit.edu"
        all_institutions = institutions_collection.find({
            "status": "active",
            "domain": {"$exists": True, "$ne": None}
        })
        
        async for inst in all_institutions:
            if inst.get("domain") and base_domain in inst["domain"].lower():
                inst["id"] = str(inst["_id"])
                del inst["_id"]
                return inst
    
    return None


async def get_institution_by_code_or_name(identifier: str) -> Optional[dict]:
    """
    Get institution by code or name
    
    Args:
        identifier: Institution code or name
        
    Returns:
        Institution document if found, None otherwise
    """
    institutions_collection = await get_institutions_collection()
    
    institution = await institutions_collection.find_one({
        "$or": [
            {"code": identifier.upper()},
            {"name": {"$regex": identifier, "$options": "i"}}
        ],
        "status": "active"
    })
    
    if institution:
        institution["id"] = str(institution["_id"])
        del institution["_id"]
        return institution
    
    return None


async def validate_email_for_institution(email: str, institution_id: str) -> tuple[bool, Optional[str]]:
    """
    Validate that email domain matches institution domain
    
    Args:
        email: User's email address
        institution_id: Institution ID to validate against
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not email or "@" not in email:
        return False, "Invalid email format"
    
    institutions_collection = await get_institutions_collection()
    from bson import ObjectId
    
    try:
        institution = await institutions_collection.find_one({"_id": ObjectId(institution_id)})
        if not institution:
            return False, "Institution not found"
        
        # If institution has no domain requirement, allow any email
        if not institution.get("domain"):
            return True, None
        
        email_domain = email.split("@")[-1].lower()
        institution_domain = institution["domain"].lower()
        
        # Exact match
        if email_domain == institution_domain:
            return True, None
        
        # Check if email domain is a subdomain of institution domain
        # e.g., "student.mit.edu" should match "mit.edu"
        if email_domain.endswith("." + institution_domain):
            return True, None
        
        return False, f"Email domain must match institution domain ({institution_domain})"
    
    except Exception as e:
        return False, f"Error validating email: {str(e)}"

