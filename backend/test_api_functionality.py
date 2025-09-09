#!/usr/bin/env python3
"""
Test script for MongoDB-integrated API endpoints (direct testing)
"""
import asyncio
import sys
import os
from bson import ObjectId

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database import init_db, get_users_collection, get_projects_collection
from services.project_service import project_service
from services.timeline_service import timeline_service
from services.transcription_service import transcription_service
from models.schemas import ProjectCreate, TimelineStateCreate, TranscriptionCreate, TimelineState, Layer, Clip, ClipType, LayerType


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


async def test_api_functionality():
    """Test MongoDB-integrated API functionality directly"""
    print("🚀 Testing MongoDB-integrated API functionality...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Create test user
        print("👤 Creating test user...")
        user_id = await create_test_user()
        
        # Test project creation
        print("📝 Testing project creation...")
        project_data = ProjectCreate(
            name="API Test Project",
            description="A test project for API endpoints"
        )
        
        project = await project_service.create_project(project_data, user_id)
        project_id = project.id
        print(f"✅ Created project: {project_id}")
        
        # Test project retrieval
        print("🔍 Testing project retrieval...")
        retrieved_project = await project_service.get_project(project_id, user_id)
        if retrieved_project:
            print(f"✅ Retrieved project: {retrieved_project.name}")
        else:
            print("❌ Failed to retrieve project")
        
        # Test project listing
        print("📋 Testing project listing...")
        projects = await project_service.get_projects(user_id)
        print(f"✅ Retrieved {len(projects)} projects")
        
        # Test project update
        print("✏️ Testing project update...")
        from models.schemas import ProjectUpdate
        update_data = ProjectUpdate(
            name="Updated API Test Project",
            description="Updated description"
        )
        
        updated_project = await project_service.update_project(project_id, update_data, user_id)
        if updated_project:
            print(f"✅ Updated project: {updated_project.name}")
        else:
            print("❌ Failed to update project")
        
        # Test timeline state creation
        print("📝 Testing timeline state creation...")
        
        # Create test clips and layers
        test_clip = Clip(
            id="clip_1",
            type=ClipType.VIDEO,
            start_time=0.0,
            end_time=10.0,
            duration=10.0,
            source_path="/test/video.mp4"
        )
        
        test_layer = Layer(
            id="layer_1",
            name="Video Layer",
            type=LayerType.VIDEO,
            clips=[test_clip],
            is_visible=True,
            is_locked=False,
            is_muted=False,
            order=0
        )
        
        test_timeline_state = TimelineState(
            layers=[test_layer],
            playhead_time=5.0,
            zoom=1.0,
            duration=10.0,
            markers=[],
            selected_clips=["clip_1"],
            is_playing=False,
            is_snapping=True
        )
        
        timeline_data = TimelineStateCreate(
            project_id=project_id,
            timeline_state=test_timeline_state,
            description="Initial timeline state",
            change_summary="Created initial timeline"
        )
        
        timeline_state = await timeline_service.save_timeline_state(timeline_data, user_id)
        print(f"✅ Created timeline state: {timeline_state.id} - Version {timeline_state.version}")
        
        # Test timeline state retrieval
        print("🔍 Testing timeline state retrieval...")
        current_state = await timeline_service.get_current_timeline_state(project_id, user_id)
        if current_state:
            print(f"✅ Retrieved current timeline state: {current_state.id}")
        else:
            print("❌ Failed to retrieve current timeline state")
        
        # Test transcription creation
        print("📝 Testing transcription creation...")
        transcription_data = TranscriptionCreate(
            project_id=project_id,
            language="en",
            model_used="whisper-large"
        )
        
        transcription = await transcription_service.create_transcription(transcription_data, user_id)
        print(f"✅ Created transcription: {transcription.id}")
        
        # Test transcription retrieval
        print("🔍 Testing transcription retrieval...")
        retrieved_transcription = await transcription_service.get_transcription(project_id, user_id)
        if retrieved_transcription:
            print(f"✅ Retrieved transcription: {retrieved_transcription.language}")
        else:
            print("❌ Failed to retrieve transcription")
        
        # Test project soft delete
        print("🗑️ Testing project soft delete...")
        delete_result = await project_service.delete_project(project_id, user_id)
        if delete_result:
            print("✅ Project soft deleted successfully")
        else:
            print("❌ Failed to soft delete project")
        
        # Test project restore
        print("♻️ Testing project restore...")
        restore_result = await project_service.restore_project(project_id, user_id)
        if restore_result:
            print("✅ Project restored successfully")
        else:
            print("❌ Failed to restore project")
        
        print("✅ All API functionality tests completed successfully!")
        
    except Exception as e:
        print(f"❌ API functionality test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_api_functionality())

