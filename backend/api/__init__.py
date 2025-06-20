"""
API routes for ScorePAL.
"""

from fastapi import APIRouter

# Create the main router
router = APIRouter()

# Import and include all route modules
from .canvas_routes import router as canvas_router
from .image_extraction import router as image_extraction_router

# Include the routes
router.include_router(canvas_router, prefix="/canvas", tags=["canvas"])
router.include_router(image_extraction_router, tags=["image-extraction"]) 