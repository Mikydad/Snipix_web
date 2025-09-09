#!/usr/bin/env python3
"""
Test script using FastAPI test client to test the Snipix API
"""
import asyncio
from fastapi.testclient import TestClient
from main import app
from services.database import init_db
import json

async def test_api():
    """Test the Snipix API using FastAPI test client"""
    # Initialize database first
    print("🔌 Initializing database connection...")
    await init_db()
    print("✅ Database initialized!")
    
    client = TestClient(app)
    
    print("🚀 Testing Snipix API with FastAPI Test Client...")
    print("=" * 60)
    
    # Test root endpoint
    try:
        print("1. Testing root endpoint...")
        response = client.get("/")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        print()
    except Exception as e:
        print(f"   Error: {e}")
        print()
    
    # Test health check
    try:
        print("2. Testing health check...")
        response = client.get("/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        print()
    except Exception as e:
        print(f"   Error: {e}")
        print()
    
    # Test basic health check
    try:
        print("3. Testing basic health check...")
        response = client.get("/health/basic")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        print()
    except Exception as e:
        print(f"   Error: {e}")
        print()
    
    # Test detailed health check
    try:
        print("4. Testing detailed health check...")
        response = client.get("/health/detailed")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        print()
    except Exception as e:
        print(f"   Error: {e}")
        print()
    
    # Test performance metrics
    try:
        print("5. Testing performance metrics...")
        response = client.get("/performance/metrics")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        print()
    except Exception as e:
        print(f"   Error: {e}")
        print()
    
    # Test creating a user
    try:
        print("6. Testing user creation...")
        user_data = {
            "name": "Test User",
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123"
        }
        response = client.post("/auth/register", json=user_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            user_info = response.json()
            print(f"   User created: {user_info.get('username', 'Unknown')}")
            user_id = user_info.get('id')
        else:
            print(f"   Response: {response.text}")
            user_id = None
        print()
    except Exception as e:
        print(f"   Error: {e}")
        user_id = None
        print()
    
    # Test project creation (if user was created)
    if user_id:
        try:
            print("7. Testing project creation...")
            project_data = {
                "name": "Test Project",
                "description": "A test project for API testing"
            }
            headers = {"Authorization": f"Bearer {user_id}"}
            response = client.post("/projects/", json=project_data, headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                project_info = response.json()
                print(f"   Project created: {project_info.get('name', 'Unknown')}")
            else:
                print(f"   Response: {response.text}")
            print()
        except Exception as e:
            print(f"   Error: {e}")
            print()
    
    # Test timeline state creation
    try:
        print("8. Testing timeline state creation...")
        timeline_data = {
            "project_id": "test_project_id",
            "state": {
                "tracks": [],
                "clips": [],
                "timeline_position": 0
            }
        }
        response = client.post("/timeline/save", json=timeline_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            timeline_info = response.json()
            print(f"   Timeline state saved: {timeline_info.get('id', 'Unknown')}")
        else:
            print(f"   Response: {response.text}")
        print()
    except Exception as e:
        print(f"   Error: {e}")
        print()
    
    # Test transcription creation
    try:
        print("9. Testing transcription creation...")
        transcription_data = {
            "project_id": "test_project_id",
            "audio_file_path": "/test/audio.wav",
            "language": "en",
            "segments": [
                {
                    "start": 0.0,
                    "end": 5.0,
                    "text": "Hello, this is a test transcription."
                }
            ]
        }
        response = client.post("/transcriptions/", json=transcription_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            transcription_info = response.json()
            print(f"   Transcription created: {transcription_info.get('id', 'Unknown')}")
        else:
            print(f"   Response: {response.text}")
        print()
    except Exception as e:
        print(f"   Error: {e}")
        print()
    
    # Test getting projects list
    try:
        print("10. Testing projects list...")
        response = client.get("/projects/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            projects = response.json()
            print(f"   Projects found: {len(projects.get('data', []))}")
        else:
            print(f"   Response: {response.text}")
        print()
    except Exception as e:
        print(f"   Error: {e}")
        print()
    
    print("=" * 60)
    print("✅ API testing completed!")

if __name__ == "__main__":
    asyncio.run(test_api())
