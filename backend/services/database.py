import os
import motor.motor_asyncio
from pymongo import MongoClient
from typing import Optional, Dict, Any
import logging
import asyncio
from datetime import datetime

# Import settings
from config.settings import settings, get_mongodb_connection_string, get_mongodb_connection_options

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Async client for FastAPI
async_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
async_db: Optional[motor.motor_asyncio.AsyncIOMotorDatabase] = None

# Sync client for background tasks
sync_client: Optional[MongoClient] = None
sync_db: Optional[MongoClient] = None

# Flag to track if database is available
db_available = False

async def init_db():
    """Initialize database connection with enhanced MongoDB Atlas support"""
    global async_client, async_db, sync_client, sync_db, db_available
    
    try:
        # Get connection string and options
        connection_string = get_mongodb_connection_string()
        connection_options = get_mongodb_connection_options()
        
        logger.info(f"Connecting to MongoDB: {connection_string.split('@')[0]}@***")
        
        # Initialize async client with connection options
        async_client = motor.motor_asyncio.AsyncIOMotorClient(
            connection_string,
            **connection_options
        )
        async_db = async_client[settings.mongodb_database]
        
        # Initialize sync client with connection options
        sync_client = MongoClient(
            connection_string,
            **connection_options
        )
        sync_db = sync_client[settings.mongodb_database]
        
        # Test connection with retry logic
        await test_connection_with_retry()
        
        # Create indexes
        await create_indexes()
        
        db_available = True
        logger.info("✅ Database connection established successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        logger.warning("Running in offline mode - some features may be limited")
        db_available = False
        # Set clients to None to indicate offline mode
        async_client = None
        async_db = None
        sync_client = None
        sync_db = None


async def test_connection_with_retry(max_retries: int = 3, delay: float = 1.0):
    """Test database connection with retry logic"""
    for attempt in range(max_retries):
        try:
            # Test connection
            await async_db.command("ping")
            logger.info(f"Database ping successful (attempt {attempt + 1})")
            return
        except Exception as e:
            logger.warning(f"Database ping failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(delay)
                delay *= 2  # Exponential backoff
            else:
                raise e

async def create_indexes():
    """Create comprehensive database indexes for optimal performance"""
    if async_db is None:
        return
        
    try:
        logger.info("Creating database indexes...")
        
        # Users collection indexes
        await create_index_if_not_exists(async_db.users, "email", unique=True)
        await create_index_if_not_exists(async_db.users, "username", unique=True)
        await create_index_if_not_exists(async_db.users, "created_at")
        
        # Projects collection indexes
        await create_index_if_not_exists(async_db.projects, "user_id")
        await create_index_if_not_exists(async_db.projects, "created_at")
        await create_index_if_not_exists(async_db.projects, "updated_at")
        await create_index_if_not_exists(async_db.projects, "name")
        await create_index_if_not_exists(async_db.projects, [("user_id", 1), ("created_at", -1)])
        await create_index_if_not_exists(async_db.projects, "is_deleted", sparse=True)
        
        # Timeline states collection indexes
        await create_index_if_not_exists(async_db.timeline_states, "project_id")
        await create_index_if_not_exists(async_db.timeline_states, "version")
        await create_index_if_not_exists(async_db.timeline_states, [("project_id", 1), ("version", -1)])
        await create_index_if_not_exists(async_db.timeline_states, "created_at")
        
        # Transcriptions collection indexes
        await create_index_if_not_exists(async_db.transcriptions, "project_id")
        await create_index_if_not_exists(async_db.transcriptions, "start_time")
        await create_index_if_not_exists(async_db.transcriptions, "end_time")
        await create_index_if_not_exists(async_db.transcriptions, [("project_id", 1), ("start_time", 1)])
        await create_index_if_not_exists(async_db.transcriptions, "speaker_id")
        
        # Clips collection indexes
        await create_index_if_not_exists(async_db.clips, "project_id")
        await create_index_if_not_exists(async_db.clips, "layer_id")
        await create_index_if_not_exists(async_db.clips, "start_time")
        await create_index_if_not_exists(async_db.clips, "end_time")
        await create_index_if_not_exists(async_db.clips, [("project_id", 1), ("layer_id", 1)])
        
        # User sessions collection indexes
        await create_index_if_not_exists(async_db.user_sessions, "user_id")
        await create_index_if_not_exists(async_db.user_sessions, "project_id")
        await create_index_if_not_exists(async_db.user_sessions, "last_accessed")
        await create_index_if_not_exists(async_db.user_sessions, [("user_id", 1), ("last_accessed", -1)])
        
        # Audit logs collection indexes
        await create_index_if_not_exists(async_db.audit_logs, "project_id")
        await create_index_if_not_exists(async_db.audit_logs, "user_id")
        await create_index_if_not_exists(async_db.audit_logs, "action")
        await create_index_if_not_exists(async_db.audit_logs, "timestamp")
        await create_index_if_not_exists(async_db.audit_logs, [("project_id", 1), ("timestamp", -1)])
        
        logger.info("✅ Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to create indexes: {e}")
        # Don't raise the error, just log it - indexes are not critical for basic functionality


async def create_index_if_not_exists(collection, index_spec, **kwargs):
    """Create an index if it doesn't already exist"""
    try:
        await collection.create_index(index_spec, **kwargs)
    except Exception as e:
        if "already exists" in str(e) or "IndexKeySpecsConflict" in str(e):
            logger.debug(f"Index already exists: {index_spec}")
        else:
            logger.warning(f"Failed to create index {index_spec}: {e}")

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
    if async_db is None:
        raise RuntimeError("Database not initialized")
    return async_db

def get_sync_db():
    """Get sync database instance"""
    if sync_db is None:
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

def get_timeline_states_collection():
    """Get timeline states collection"""
    if not db_available:
        raise RuntimeError("Database not available")
    return get_async_db().timeline_states

def get_transcriptions_collection():
    """Get transcriptions collection"""
    if not db_available:
        raise RuntimeError("Database not available")
    return get_async_db().transcriptions

def get_user_sessions_collection():
    """Get user sessions collection"""
    if not db_available:
        raise RuntimeError("Database not available")
    return get_async_db().user_sessions

def get_audit_logs_collection():
    """Get audit logs collection"""
    if not db_available:
        raise RuntimeError("Database not available")
    return get_async_db().audit_logs


# Database health check functions
async def get_database_stats() -> Dict[str, Any]:
    """Get database statistics and health information"""
    if async_db is None:
        return {"status": "offline", "error": "Database not initialized"}
    
    try:
        # Get database stats
        stats = await async_db.command("dbStats")
        
        # Get collection counts
        collections_info = {}
        collections = ["users", "projects", "timeline_states", "transcriptions", "clips", "user_sessions", "audit_logs"]
        
        for collection_name in collections:
            try:
                count = await async_db[collection_name].count_documents({})
                collections_info[collection_name] = count
            except Exception:
                collections_info[collection_name] = 0
        
        return {
            "status": "healthy",
            "database": settings.mongodb_database,
            "collections": collections_info,
            "data_size": stats.get("dataSize", 0),
            "storage_size": stats.get("storageSize", 0),
            "indexes": stats.get("indexes", 0),
            "objects": stats.get("objects", 0)
        }
        
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def test_database_connection() -> bool:
    """Test database connection and return status"""
    try:
        await async_db.command("ping")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False
