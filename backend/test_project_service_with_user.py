#!/usr/bin/env python3
"""
Test script for Project Service with User Creation
"""
import asyncio
import sys
import os
from bson import ObjectId

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database import init_db, get_users_collection
from services.project_service import project_service
from models.schemas import ProjectCreate, UserCreate


async def create_test_user():
    """Create a test user for testing"""
    users_collection = get_users_collection()
    
    # Check if test user already exists
    existing_user = await users_collection.find_one({"email": "test@example.com"})
    if existing_user:
        print(f"✅ Test user already exists: {existing_user['_id']}")
        return str(existing_user['_id'])
    
    # Create test user
    test_user = {
        "email": "test@example.com",
        "name": "Test User",
        "username": "testuser",
        "is_active": True,
        "is_verified": True,
        "preferences": {},
        "created_at": asyncio.get_event_loop().time(),
        "updated_at": asyncio.get_event_loop().time()
    }
    
    result = await users_collection.insert_one(test_user)
    user_id = str(result.inserted_id)
    print(f"✅ Created test user: {user_id}")
    return user_id


async def test_project_service():
    """Test project service functionality"""
    print("🚀 Testing Project Service...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Create test user
        print("👤 Creating test user...")
        test_user_id = await create_test_user()
        
        # Test creating a project
        print("📝 Testing project creation...")
        project_data = ProjectCreate(
            name="Test Project",
            description="A test project for MongoDB integration"
        )
        
        project = await project_service.create_project(project_data, test_user_id)
        print(f"✅ Created project: {project.id} - {project.name}")
        
        # Test getting the project
        print("🔍 Testing project retrieval...")
        retrieved_project = await project_service.get_project(project.id, test_user_id)
        if retrieved_project:
            print(f"✅ Retrieved project: {retrieved_project.id} - {retrieved_project.name}")
        else:
            print("❌ Failed to retrieve project")
        
        # Test getting all projects
        print("📋 Testing project listing...")
        projects = await project_service.get_projects(test_user_id)
        print(f"✅ Found {len(projects)} projects")
        
        # Test updating the project
        print("✏️ Testing project update...")
        from models.schemas import ProjectUpdate
        update_data = ProjectUpdate(
            name="Updated Test Project",
            description="Updated description"
        )
        
        updated_project = await project_service.update_project(project.id, update_data, test_user_id)
        if updated_project:
            print(f"✅ Updated project: {updated_project.name}")
        else:
            print("❌ Failed to update project")
        
        # Test soft delete
        print("🗑️ Testing project soft delete...")
        delete_result = await project_service.delete_project(project.id, test_user_id)
        if delete_result:
            print("✅ Project soft deleted successfully")
        else:
            print("❌ Failed to soft delete project")
        
        # Test restore
        print("♻️ Testing project restore...")
        restore_result = await project_service.restore_project(project.id, test_user_id)
        if restore_result:
            print("✅ Project restored successfully")
        else:
            print("❌ Failed to restore project")
        
        print("✅ All project service tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Project service test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_project_service())

