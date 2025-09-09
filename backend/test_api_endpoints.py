#!/usr/bin/env python3
"""
Test script for MongoDB-integrated API endpoints
"""
import asyncio
import sys
import os
import httpx
from bson import ObjectId

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database import init_db, get_users_collection, get_projects_collection


async def create_test_user():
    """Create a test user for API testing"""
    users_collection = get_users_collection()
    
    # Check if test user already exists
    existing_user = await users_collection.find_one({"email": "api_test@example.com"})
    if existing_user:
        user_id = str(existing_user['_id'])
        print(f"✅ Test user already exists: {user_id}")
    else:
        # Create test user
        test_user = {
            "email": "api_test@example.com",
            "name": "API Test User",
            "username": "api_test",
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


async def test_api_endpoints():
    """Test MongoDB-integrated API endpoints"""
    print("🚀 Testing MongoDB-integrated API endpoints...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Create test user
        print("👤 Creating test user...")
        user_id = await create_test_user()
        
        # Test API endpoints
        base_url = "http://localhost:8001"
        headers = {"X-User-ID": user_id}
        
        async with httpx.AsyncClient() as client:
            # Test creating a project
            print("📝 Testing project creation...")
            project_data = {
                "name": "API Test Project",
                "description": "A test project for API endpoints"
            }
            
            response = await client.post(f"{base_url}/projects/", json=project_data, headers=headers)
            if response.status_code == 200:
                project = response.json()
                project_id = project["data"]["_id"]
                print(f"✅ Created project: {project_id}")
            else:
                print(f"❌ Failed to create project: {response.status_code} - {response.text}")
                return
            
            # Test getting projects
            print("📋 Testing project listing...")
            response = await client.get(f"{base_url}/projects/", headers=headers)
            if response.status_code == 200:
                projects = response.json()
                print(f"✅ Retrieved {len(projects['data'])} projects")
            else:
                print(f"❌ Failed to get projects: {response.status_code} - {response.text}")
            
            # Test getting specific project
            print("🔍 Testing project retrieval...")
            response = await client.get(f"{base_url}/projects/{project_id}", headers=headers)
            if response.status_code == 200:
                project = response.json()
                print(f"✅ Retrieved project: {project['data']['name']}")
            else:
                print(f"❌ Failed to get project: {response.status_code} - {response.text}")
            
            # Test updating project
            print("✏️ Testing project update...")
            update_data = {
                "name": "Updated API Test Project",
                "description": "Updated description"
            }
            
            response = await client.put(f"{base_url}/projects/{project_id}", json=update_data, headers=headers)
            if response.status_code == 200:
                project = response.json()
                print(f"✅ Updated project: {project['data']['name']}")
            else:
                print(f"❌ Failed to update project: {response.status_code} - {response.text}")
            
            # Test creating transcription
            print("📝 Testing transcription creation...")
            transcription_data = {
                "project_id": project_id,
                "language": "en",
                "model_used": "whisper-large"
            }
            
            response = await client.post(f"{base_url}/transcriptions/", json=transcription_data, headers=headers)
            if response.status_code == 200:
                transcription = response.json()
                transcription_id = transcription["data"]["_id"]
                print(f"✅ Created transcription: {transcription_id}")
            else:
                print(f"❌ Failed to create transcription: {response.status_code} - {response.text}")
            
            # Test getting transcription
            print("🔍 Testing transcription retrieval...")
            response = await client.get(f"{base_url}/transcriptions/{project_id}", headers=headers)
            if response.status_code == 200:
                transcription = response.json()
                print(f"✅ Retrieved transcription: {transcription['data']['language']}")
            else:
                print(f"❌ Failed to get transcription: {response.status_code} - {response.text}")
            
            # Test soft delete project
            print("🗑️ Testing project soft delete...")
            response = await client.delete(f"{base_url}/projects/{project_id}", headers=headers)
            if response.status_code == 200:
                print("✅ Project soft deleted successfully")
            else:
                print(f"❌ Failed to soft delete project: {response.status_code} - {response.text}")
            
            # Test restore project
            print("♻️ Testing project restore...")
            response = await client.post(f"{base_url}/projects/{project_id}/restore", headers=headers)
            if response.status_code == 200:
                print("✅ Project restored successfully")
            else:
                print(f"❌ Failed to restore project: {response.status_code} - {response.text}")
        
        print("✅ All API endpoint tests completed successfully!")
        
    except Exception as e:
        print(f"❌ API endpoint test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_api_endpoints())

