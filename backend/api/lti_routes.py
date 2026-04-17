"""
Canvas LTI (Learning Tools Interoperability) Integration Routes
Implements LTI 1.3 Advantage for Canvas integration with:
- Single Sign-On (SSO)
- Grade Passback
- Deep Linking
- Names and Role Provisioning Services (NRPS)
"""

import logging
import os
import hmac
import hashlib
import base64
import json
import time
import secrets
from typing import Optional, Dict, Any
from urllib.parse import urlencode, parse_qs, urlparse
from datetime import datetime, timedelta

from fastapi import APIRouter, Request, HTTPException, Depends, Form, Query
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from pydantic import BaseModel
import requests
try:
    from jose import jwt
    from jose.constants import ALGORITHMS
    JOSE_AVAILABLE = True
except ImportError:
    JOSE_AVAILABLE = False
    logger.warning("python-jose not available - LTI JWT verification will be limited")

from ..auth.auth_config import current_active_user
from ..models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lti", tags=["lti"])

# LTI Configuration
LTI_CLIENT_ID = os.getenv("LTI_CLIENT_ID", "")
LTI_DEPLOYMENT_ID = os.getenv("LTI_DEPLOYMENT_ID", "")
LTI_ISSUER = os.getenv("LTI_ISSUER", "https://canvas.instructure.com")
LTI_REDIRECT_URI = os.getenv("LTI_REDIRECT_URI", "http://localhost:8000/api/lti/launch")
LTI_GRADE_PASSBACK_URL = os.getenv("LTI_GRADE_PASSBACK_URL", "")

# JWT Configuration for LTI
LTI_PRIVATE_KEY = os.getenv("LTI_PRIVATE_KEY", "")  # RSA private key in PEM format
LTI_PUBLIC_KEY = os.getenv("LTI_PUBLIC_KEY", "")  # Public key for Canvas to verify

# Store LTI sessions (in production, use Redis or database)
lti_sessions: Dict[str, Dict[str, Any]] = {}


class LTILaunchRequest(BaseModel):
    """LTI Launch Request parameters"""
    iss: str
    login_hint: Optional[str] = None
    target_link_uri: Optional[str] = None
    lti_message_hint: Optional[str] = None
    client_id: str
    deployment_id: str


class LTIGradePassback(BaseModel):
    """Grade passback request"""
    scoreGiven: float
    scoreMaximum: float
    comment: Optional[str] = None
    activityProgress: str = "Completed"
    gradingProgress: str = "FullyGraded"
    userId: str
    timestamp: str


@router.get("/config")
async def get_lti_config():
    """
    Get LTI configuration for Canvas Developer Key setup.
    Returns the configuration needed to register this tool in Canvas.
    """
    return {
        "title": "ScorePAL - AI Grading Assistant",
        "description": "AI-powered grading tool with Canvas integration",
        "target_link_uri": LTI_REDIRECT_URI,
        "oidc_initiation_url": f"{os.getenv('BASE_URL', 'http://localhost:8000')}/api/lti/init",
        "jwks_uri": f"{os.getenv('BASE_URL', 'http://localhost:8000')}/api/lti/jwks",
        "extensions": [
            {
                "platform": "canvas.instructure.com",
                "settings": {
                    "platform": "canvas.instructure.com",
                    "placements": [
                        {
                            "placement": "course_navigation",
                            "message_type": "LtiResourceLinkRequest",
                            "target_link_uri": LTI_REDIRECT_URI,
                            "label": "ScorePAL Grading"
                        },
                        {
                            "placement": "assignment_selection",
                            "message_type": "LtiDeepLinkingRequest",
                            "target_link_uri": LTI_REDIRECT_URI,
                            "label": "ScorePAL"
                        }
                    ],
                    "privacy_level": "public"
                }
            }
        ],
        "custom_parameters": {
            "canvas_course_id": "$Canvas.course.id",
            "canvas_user_id": "$Canvas.user.id",
            "canvas_user_login": "$Canvas.user.loginId"
        },
        "claims": [
            "iss",
            "sub",
            "aud",
            "exp",
            "iat",
            "nonce",
            "https://purl.imsglobal.org/spec/lti/claim/deployment_id",
            "https://purl.imsglobal.org/spec/lti/claim/message_type",
            "https://purl.imsglobal.org/spec/lti/claim/version",
            "https://purl.imsglobal.org/spec/lti/claim/resource_link",
            "https://purl.imsglobal.org/spec/lti/claim/context",
            "https://purl.imsglobal.org/spec/lti/claim/tool_platform",
            "https://purl.imsglobal.org/spec/lti/claim/launch_presentation",
            "https://purl.imsglobal.org/spec/lti/claim/roles",
            "https://purl.imsglobal.org/spec/lti/claim/custom"
        ]
    }


@router.get("/init")
async def lti_initiate_login(
    iss: str = Query(..., description="Issuer identifier"),
    login_hint: str = Query(..., description="Login hint"),
    target_link_uri: str = Query(..., description="Target link URI"),
    lti_message_hint: Optional[str] = Query(None, description="LTI message hint"),
    client_id: str = Query(..., description="Client ID"),
    deployment_id: str = Query(..., description="Deployment ID")
):
    """
    LTI 1.3 OIDC Login Initiation endpoint.
    This is called by Canvas to initiate the LTI launch flow.
    """
    try:
        # Validate issuer
        if iss != LTI_ISSUER:
            raise HTTPException(status_code=400, detail=f"Invalid issuer: {iss}")
        
        # Generate state and nonce for security
        import secrets
        state = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(32)
        
        # Store state in session (in production, use Redis)
        lti_sessions[state] = {
            "iss": iss,
            "login_hint": login_hint,
            "target_link_uri": target_link_uri,
            "lti_message_hint": lti_message_hint,
            "client_id": client_id,
            "deployment_id": deployment_id,
            "nonce": nonce,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Build authorization request
        auth_params = {
            "scope": "openid",
            "response_type": "id_token",
            "client_id": client_id,
            "redirect_uri": LTI_REDIRECT_URI,
            "login_hint": login_hint,
            "state": state,
            "response_mode": "form_post",
            "nonce": nonce,
            "prompt": "none"
        }
        
        if lti_message_hint:
            auth_params["lti_message_hint"] = lti_message_hint
        
        # Get Canvas authorization endpoint
        auth_url = f"{iss}/api/lti/authorize_redirect"
        auth_url_with_params = f"{auth_url}?{urlencode(auth_params)}"
        
        # Redirect to Canvas authorization
        return RedirectResponse(url=auth_url_with_params)
        
    except Exception as e:
        logger.error(f"LTI initiation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LTI initiation failed: {str(e)}")


@router.post("/launch")
async def lti_launch(request: Request):
    """
    LTI 1.3 Launch endpoint.
    Receives the JWT from Canvas and processes the launch.
    """
    try:
        form_data = await request.form()
        id_token = form_data.get("id_token")
        state = form_data.get("state")
        
        if not id_token or not state:
            raise HTTPException(status_code=400, detail="Missing id_token or state")
        
        # Verify state
        if state not in lti_sessions:
            raise HTTPException(status_code=400, detail="Invalid state")
        
        session_data = lti_sessions[state]
        
        # Decode JWT (without verification first to get issuer)
        unverified = jwt.get_unverified_claims(id_token)
        
        # Get Canvas's public keys
        jwks_url = f"{unverified.get('iss')}/.well-known/jwks.json"
        jwks_response = requests.get(jwks_url, timeout=10)
        
        if jwks_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch Canvas JWKS")
        
        jwks = jwks_response.json()
        
        # Verify JWT
        try:
            # Get the key ID from the token
            header = jwt.get_unverified_header(id_token)
            kid = header.get("kid")
            
            # Find the matching key
            key = None
            for jwk in jwks.get("keys", []):
                if jwk.get("kid") == kid:
                    key = jwk
                    break
            
            if not key:
                raise HTTPException(status_code=400, detail="Key not found in JWKS")
            
            # Verify and decode the token
            claims = jwt.decode(
                id_token,
                key,
                algorithms=["RS256"],
                audience=session_data["client_id"],
                issuer=unverified.get("iss")
            )
            
        except Exception as e:
            logger.error(f"JWT verification failed: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid JWT: {str(e)}")
        
        # Extract LTI claims
        lti_claims = {
            "message_type": claims.get("https://purl.imsglobal.org/spec/lti/claim/message_type"),
            "version": claims.get("https://purl.imsglobal.org/spec/lti/claim/version"),
            "deployment_id": claims.get("https://purl.imsglobal.org/spec/lti/claim/deployment_id"),
            "resource_link": claims.get("https://purl.imsglobal.org/spec/lti/claim/resource_link"),
            "context": claims.get("https://purl.imsglobal.org/spec/lti/claim/context"),
            "tool_platform": claims.get("https://purl.imsglobal.org/spec/lti/claim/tool_platform"),
            "launch_presentation": claims.get("https://purl.imsglobal.org/spec/lti/claim/launch_presentation"),
            "roles": claims.get("https://purl.imsglobal.org/spec/lti/claim/roles"),
            "custom": claims.get("https://purl.imsglobal.org/spec/lti/claim/custom"),
            "user": {
                "sub": claims.get("sub"),
                "name": claims.get("name"),
                "email": claims.get("email"),
                "given_name": claims.get("given_name"),
                "family_name": claims.get("family_name")
            }
        }
        
        # Store LTI session
        session_id = secrets.token_urlsafe(32)
        lti_sessions[session_id] = {
            "claims": claims,
            "lti_claims": lti_claims,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Determine redirect based on message type
        if lti_claims["message_type"] == "LtiResourceLinkRequest":
            # Regular launch - redirect to grading interface
            redirect_url = f"/grade?lti_session={session_id}&course_id={lti_claims['context'].get('id')}"
        elif lti_claims["message_type"] == "LtiDeepLinkingRequest":
            # Deep linking - redirect to assignment selection
            redirect_url = f"/lti/deep-link?session={session_id}"
        else:
            redirect_url = f"/dashboard?lti_session={session_id}"
        
        # Return HTML that redirects to frontend
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>ScorePAL LTI Launch</title>
            <script>
                window.location.href = "{redirect_url}";
            </script>
        </head>
        <body>
            <p>Redirecting to ScorePAL...</p>
            <p>If you are not redirected, <a href="{redirect_url}">click here</a>.</p>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LTI launch error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LTI launch failed: {str(e)}")


@router.get("/jwks")
async def get_jwks():
    """
    JSON Web Key Set (JWKS) endpoint for Canvas to verify our tokens.
    """
    # In production, generate and store RSA key pair
    # For now, return placeholder
    return {
        "keys": [
            {
                "kty": "RSA",
                "kid": "scorepal-key-1",
                "use": "sig",
                "alg": "RS256",
                "n": "...",  # Public key modulus
                "e": "AQAB"  # Public key exponent
            }
        ]
    }


@router.post("/grade-passback")
async def grade_passback(
    request: Request,
    user: User = Depends(current_active_user)
):
    """
    LTI Grade Passback endpoint.
    Posts grades back to Canvas using LTI Advantage Assignment and Grade Services.
    """
    try:
        body = await request.json()
        
        # Extract grade passback data
        score_given = body.get("scoreGiven")
        score_maximum = body.get("scoreMaximum")
        comment = body.get("comment", "")
        user_id = body.get("userId")
        line_item_id = body.get("lineItemId")  # Canvas assignment ID
        
        # Get LTI session to get access token
        session_id = request.headers.get("X-LTI-Session")
        if not session_id or session_id not in lti_sessions:
            raise HTTPException(status_code=401, detail="Invalid LTI session")
        
        session = lti_sessions[session_id]
        lti_claims = session.get("lti_claims", {})
        
        # Get access token from Canvas
        access_token = await get_lti_access_token(lti_claims)
        
        # Post grade to Canvas
        grade_url = f"{lti_claims.get('tool_platform', {}).get('url')}/api/lti/courses/{lti_claims['context']['id']}/line_items/{line_item_id}/results"
        
        grade_data = {
            "userId": user_id,
            "resultScore": score_given,
            "resultMaximum": score_maximum,
            "comment": comment,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/vnd.ims.lis.v2.result+json"
        }
        
        response = requests.post(grade_url, json=grade_data, headers=headers, timeout=30)
        
        if response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Grade passback failed: {response.text}"
            )
        
        return {
            "status": "success",
            "message": "Grade posted successfully",
            "result": response.json()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Grade passback error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Grade passback failed: {str(e)}")


async def get_lti_access_token(lti_claims: Dict[str, Any]) -> str:
    """
    Get OAuth 2.0 access token from Canvas for LTI Advantage services.
    """
    # Get token endpoint from platform
    platform_url = lti_claims.get("tool_platform", {}).get("url", "")
    token_url = f"{platform_url}/login/oauth2/token"
    
    # Use client credentials grant
    # In production, store these securely
    client_id = LTI_CLIENT_ID
    client_secret = os.getenv("LTI_CLIENT_SECRET", "")
    
    token_data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/lineitem"
    }
    
    response = requests.post(token_url, data=token_data, timeout=10)
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to get access token")
    
    token_response = response.json()
    return token_response.get("access_token")


@router.get("/session/{session_id}")
async def get_lti_session(session_id: str):
    """
    Get LTI session data (for frontend to access LTI context).
    """
    if session_id not in lti_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = lti_sessions[session_id]
    return {
        "session_id": session_id,
        "lti_claims": session.get("lti_claims"),
        "user": session.get("claims", {}).get("user")
    }


@router.get("/nrps/{course_id}/members")
async def get_course_members(
    course_id: str,
    request: Request
):
    """
    Names and Role Provisioning Service (NRPS) endpoint.
    Returns course members for Canvas.
    """
    session_id = request.headers.get("X-LTI-Session")
    if not session_id or session_id not in lti_sessions:
        raise HTTPException(status_code=401, detail="Invalid LTI session")
    
    session = lti_sessions[session_id]
    lti_claims = session.get("lti_claims", {})
    
    # Get access token
    access_token = await get_lti_access_token(lti_claims)
    
    # Get NRPS URL from context
    context = lti_claims.get("context", {})
    nrps_url = context.get("https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice", {}).get("context_memberships_url")
    
    if not nrps_url:
        raise HTTPException(status_code=400, detail="NRPS not available")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.ims.lis.nrps.v2.membershipcontainer+json"
    }
    
    response = requests.get(nrps_url, headers=headers, timeout=30)
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to get members")
    
    return response.json()

