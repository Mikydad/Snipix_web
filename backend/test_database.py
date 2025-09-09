#!/usr/bin/env python3
"""
Test script for MongoDB database service
"""
import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database import init_db, get_database_stats, test_database_connection


async def test_database():
    """Test database connection and functionality"""
    print("🚀 Testing MongoDB Database Service...")
    
    try:
        # Initialize database
        print("📡 Initializing database connection...")
        await init_db()
        
        # Test connection
        print("🔍 Testing database connection...")
        is_connected = await test_database_connection()
        print(f"✅ Database connection: {'SUCCESS' if is_connected else 'FAILED'}")
        
        # Get database stats
        print("📊 Getting database statistics...")
        stats = await get_database_stats()
        print(f"📈 Database stats: {stats}")
        
        print("✅ All database tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_database())

