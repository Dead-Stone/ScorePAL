"""
MongoDB Service for ScorePAL
Centralized MongoDB connection management and collection access.
"""

import os
from dotenv import load_dotenv
from pathlib import Path
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import IndexModel, ASCENDING, DESCENDING, TEXT
import logging

# Load environment variables from .env file
# Try root .env first, then backend/.env
root_env = Path(__file__).parent.parent.parent / ".env"
backend_env = Path(__file__).parent.parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
if backend_env.exists():
    load_dotenv(backend_env, override=True)

logger = logging.getLogger(__name__)

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "scorepal")

# Global MongoDB client and database instances
_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


def get_mongodb_client() -> AsyncIOMotorClient:
    """Get or create MongoDB client with lazy initialization."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URL)
        logger.info(f"Initialized MongoDB client: {MONGODB_URL}")
    return _client


def get_database() -> AsyncIOMotorDatabase:
    """Get or create database instance."""
    global _database
    if _database is None:
        client = get_mongodb_client()
        _database = client[DATABASE_NAME]
        logger.info(f"Using database: {DATABASE_NAME}")
    return _database


async def get_assignments_collection() -> AsyncIOMotorCollection:
    """Get assignments collection with indexes."""
    db = get_database()
    collection = db["assignments"]
    
    # Create indexes if they don't exist
    await collection.create_indexes([
        IndexModel([("teacher_id", ASCENDING)]),
        IndexModel([("course_id", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)]),
        IndexModel([("due_date", ASCENDING)]),
        IndexModel([("canvas_assignment_id", ASCENDING)], unique=True, sparse=True),
        IndexModel([("name", TEXT), ("description", TEXT)]),  # Text search
    ])
    
    return collection


async def get_submissions_collection() -> AsyncIOMotorCollection:
    """Get submissions collection with indexes."""
    db = get_database()
    collection = db["submissions"]
    
    # Create indexes if they don't exist
    await collection.create_indexes([
        IndexModel([("assignment_id", ASCENDING)]),
        IndexModel([("student_id", ASCENDING)]),
        IndexModel([("student_name", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("submitted_at", DESCENDING)]),
        IndexModel([("assignment_id", ASCENDING), ("student_id", ASCENDING)]),
        IndexModel([("canvas_submission_id", ASCENDING)], unique=True, sparse=True),
    ])
    
    return collection


async def get_results_collection() -> AsyncIOMotorCollection:
    """Get grading results collection with indexes."""
    db = get_database()
    collection = db["grading_results"]
    
    # Create indexes if they don't exist
    await collection.create_indexes([
        IndexModel([("submission_id", ASCENDING)], unique=True),
        IndexModel([("assignment_id", ASCENDING)]),
        IndexModel([("student_id", ASCENDING)]),
        IndexModel([("student_name", ASCENDING)]),
        IndexModel([("grader_id", ASCENDING)]),
        IndexModel([("graded_at", DESCENDING)]),
        IndexModel([("assignment_id", ASCENDING), ("student_id", ASCENDING)]),
        IndexModel([("score", DESCENDING)]),
        IndexModel([("percentage", DESCENDING)]),
    ])
    
    return collection


async def get_analytics_collection() -> AsyncIOMotorCollection:
    """Get analytics cache collection with indexes."""
    db = get_database()
    collection = db["analytics_cache"]
    
    # Create indexes if they don't exist
    await collection.create_indexes([
        IndexModel([("assignment_id", ASCENDING)]),
        IndexModel([("cache_type", ASCENDING)]),
        IndexModel([("student_id", ASCENDING)]),
        IndexModel([("rubric_id", ASCENDING)]),
        IndexModel([("computed_at", DESCENDING)]),
        IndexModel([("expires_at", ASCENDING)]),
        IndexModel([("assignment_id", ASCENDING), ("cache_type", ASCENDING)]),
    ])
    
    return collection


async def get_rubrics_collection() -> AsyncIOMotorCollection:
    """Get rubrics collection with indexes."""
    db = get_database()
    collection = db["rubrics"]
    
    # Create indexes if they don't exist
    await collection.create_indexes([
        IndexModel([("name", TEXT), ("description", TEXT)]),
        IndexModel([("created_at", DESCENDING)]),
    ])
    
    return collection


async def get_user_settings_collection() -> AsyncIOMotorCollection:
    """Get user settings collection with indexes."""
    db = get_database()
    collection = db["user_settings"]
    
    # Create indexes if they don't exist
    await collection.create_indexes([
        IndexModel([("user_id", ASCENDING)], unique=True),
        IndexModel([("canvas_key_configured", ASCENDING)]),
    ])
    
    return collection


async def initialize_indexes():
    """Initialize all collection indexes."""
    try:
        logger.info("Initializing MongoDB indexes...")
        await get_assignments_collection()
        await get_submissions_collection()
        await get_results_collection()
        await get_analytics_collection()
        await get_rubrics_collection()
        await get_user_settings_collection()
        logger.info("MongoDB indexes initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing MongoDB indexes: {e}", exc_info=True)
        raise


async def close_connection():
    """Close MongoDB connection."""
    global _client, _database
    if _client:
        _client.close()
        _client = None
        _database = None
        logger.info("MongoDB connection closed")

