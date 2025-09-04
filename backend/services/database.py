import os
import motor.motor_asyncio
from pymongo import MongoClient
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "snipix")

# Async client for FastAPI
async_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
async_db: Optional[motor.motor_asyncio.AsyncIOMotorDatabase] = None

# Sync client for background tasks
sync_client: Optional[MongoClient] = None
sync_db: Optional[MongoClient] = None

# Flag to track if database is available
db_available = False

async def init_db():
    """Initialize database connection"""
    global async_client, async_db, sync_client, sync_db, db_available
    
    try:
        # Initialize async client
        async_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
        async_db = async_client[DATABASE_NAME]
        
        # Initialize sync client
        sync_client = MongoClient(MONGODB_URL)
        sync_db = sync_client[DATABASE_NAME]
        
        # Test connection
        await async_db.command("ping")
        logger.info("Database connection established successfully")
        
        # Create indexes
        await create_indexes()
        
        db_available = True
        
    except Exception as e:
        logger.warning(f"Failed to connect to database: {e}")
        logger.warning("Running in offline mode - some features may be limited")
        db_available = False
        # Set clients to None to indicate offline mode
        async_client = None
        async_db = None
        sync_client = None
        sync_db = None

async def create_indexes():
    """Create database indexes for better performance"""
    if not async_db:
        return
        
    try:
        # Users collection indexes
        await async_db.users.create_index("email", unique=True)
        
        # Projects collection indexes
        await async_db.projects.create_index("user_id")
        await async_db.projects.create_index("created_at")
        
        # Clips collection indexes
        await async_db.clips.create_index("project_id")
        await async_db.clips.create_index("layer_id")
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")

async def close_db():
    """Close database connections"""
    global async_client, sync_client
    
    if async_client:
        async_client.close()
    if sync_client:
        sync_client.close()
    
    logger.info("Database connections closed")

def get_async_db():
    """Get async database instance"""
    if not async_db:
        raise RuntimeError("Database not initialized")
    return async_db

def get_sync_db():
    """Get sync database instance"""
    if not sync_db:
        raise RuntimeError("Database not initialized")
    return sync_db

def is_db_available():
    """Check if database is available"""
    return db_available

# Database collections
def get_users_collection():
    """Get users collection"""
    if not db_available:
        raise RuntimeError("Database not available")
    return get_async_db().users

def get_projects_collection():
    """Get projects collection"""
    if not db_available:
        raise RuntimeError("Database not available")
    return get_async_db().projects

def get_clips_collection():
    """Get clips collection"""
    if not db_available:
        raise RuntimeError("Database not available")
    return get_async_db().clips

def get_timeline_collection():
    """Get timeline collection"""
    if not db_available:
        raise RuntimeError("Database not available")
    return get_async_db().timeline
