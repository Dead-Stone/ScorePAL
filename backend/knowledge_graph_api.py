"""
Knowledge Graph API for ScorePAL
Handles knowledge graph operations and analytics
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

from utils.knowledge_graph import KnowledgeGraph
from auth.auth_config import current_active_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize knowledge graph
kg = KnowledgeGraph()

@router.get("/status")
async def get_knowledge_graph_status():
    """Get knowledge graph connection status"""
    try:
        status = {
            "connected": kg._driver is not None,
            "storage_path": str(kg.storage_path),
            "use_neo4j": kg.use_neo4j,
            "timestamp": datetime.now().isoformat()
        }
        return status
    except Exception as e:
        logger.error(f"Error getting KG status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/concepts")
async def get_concepts(query: Optional[str] = None, limit: int = 50):
    """Get concepts from knowledge graph"""
    try:
        if query:
            concepts = kg.search_concepts(query, limit=limit)
        else:
            concepts = kg.get_all_concepts(limit=limit)
        return {"concepts": concepts}
    except Exception as e:
        logger.error(f"Error getting concepts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assignments")
async def get_assignments(limit: int = 50):
    """Get assignments from knowledge graph"""
    try:
        assignments = kg.get_all_assignments(limit=limit)
        return {"assignments": assignments}
    except Exception as e:
        logger.error(f"Error getting assignments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students")
async def get_students(limit: int = 50):
    """Get students from knowledge graph"""
    try:
        students = kg.get_all_students(limit=limit)
        return {"students": students}
    except Exception as e:
        logger.error(f"Error getting students: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/submissions")
async def get_submissions(limit: int = 50):
    """Get submissions from knowledge graph"""
    try:
        submissions = kg.get_all_submissions(limit=limit)
        return {"submissions": submissions}
    except Exception as e:
        logger.error(f"Error getting submissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_knowledge_graph_analytics():
    """Get knowledge graph analytics and statistics"""
    try:
        analytics = {
            "total_concepts": len(kg.get_all_concepts()),
            "total_assignments": len(kg.get_all_assignments()),
            "total_students": len(kg.get_all_students()),
            "total_submissions": len(kg.get_all_submissions()),
            "neo4j_connected": kg._driver is not None,
            "timestamp": datetime.now().isoformat()
        }
        return analytics
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 