#!/usr/bin/env python3
"""
Test script for Timeline Service
"""
import asyncio
import sys
import os
from bson import ObjectId

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database import init_db, get_users_collection, get_projects_collection
from services.timeline_service import timeline_service
from models.schemas import TimelineStateCreate, TimelineState, Layer, Clip, ClipType, LayerType


async def create_test_data():
    """Create test user and project for testing"""
    users_collection = get_users_collection()
    projects_collection = get_projects_collection()
    
    # Check if test user already exists
    existing_user = await users_collection.find_one({"email": "timeline_test@example.com"})
    if existing_user:
        user_id = str(existing_user['_id'])
        print(f"✅ Test user already exists: {user_id}")
    else:
        # Create test user
        test_user = {
            "email": "timeline_test@example.com",
            "name": "Timeline Test User",
            "username": "timeline_test",
            "is_active": True,
            "is_verified": True,
            "preferences": {},
            "created_at": asyncio.get_event_loop().time(),
            "updated_at": asyncio.get_event_loop().time()
        }
        
        result = await users_collection.insert_one(test_user)
        user_id = str(result.inserted_id)
        print(f"✅ Created test user: {user_id}")
    
    # Check if test project already exists
    existing_project = await projects_collection.find_one({"name": "Timeline Test Project"})
    if existing_project:
        project_id = str(existing_project['_id'])
        print(f"✅ Test project already exists: {project_id}")
    else:
        # Create test project
        test_project = {
            "name": "Timeline Test Project",
            "description": "A test project for timeline service",
            "user_id": user_id,
            "status": "active",
            "metadata": {},
            "tags": [],
            "collaborators": [],
            "permissions": {},
            "created_at": asyncio.get_event_loop().time(),
            "updated_at": asyncio.get_event_loop().time(),
            "is_deleted": False
        }
        
        result = await projects_collection.insert_one(test_project)
        project_id = str(result.inserted_id)
        print(f"✅ Created test project: {project_id}")
    
    return user_id, project_id


async def test_timeline_service():
    """Test timeline service functionality"""
    print("🚀 Testing Timeline Service...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Create test data
        print("👤 Creating test data...")
        user_id, project_id = await create_test_data()
        
        # Create test timeline state
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
        
        # Test getting current timeline state
        print("🔍 Testing current timeline state retrieval...")
        current_state = await timeline_service.get_current_timeline_state(project_id, user_id)
        if current_state:
            print(f"✅ Retrieved current timeline state: {current_state.id} - Version {current_state.version}")
        else:
            print("❌ Failed to retrieve current timeline state")
        
        # Test creating another timeline state (version 2)
        print("📝 Testing timeline state versioning...")
        test_timeline_state_2 = TimelineState(
            layers=[test_layer],
            playhead_time=7.0,
            zoom=1.5,
            duration=10.0,
            markers=[],
            selected_clips=["clip_1"],
            is_playing=True,
            is_snapping=True
        )
        
        timeline_data_2 = TimelineStateCreate(
            project_id=project_id,
            timeline_state=test_timeline_state_2,
            description="Updated timeline state",
            change_summary="Moved playhead and changed zoom"
        )
        
        timeline_state_2 = await timeline_service.save_timeline_state(timeline_data_2, user_id)
        print(f"✅ Created timeline state version 2: {timeline_state_2.id} - Version {timeline_state_2.version}")
        
        # Test getting timeline history
        print("📋 Testing timeline history...")
        history = await timeline_service.get_timeline_history(project_id, user_id)
        print(f"✅ Found {len(history)} timeline states in history")
        
        # Test getting specific version
        print("🔍 Testing specific version retrieval...")
        version_1_state = await timeline_service.get_timeline_state_by_version(project_id, 1, user_id)
        if version_1_state:
            print(f"✅ Retrieved version 1: {version_1_state.id} - Playhead: {version_1_state.timeline_state.playhead_time}")
        else:
            print("❌ Failed to retrieve version 1")
        
        # Test restoring previous version
        print("♻️ Testing timeline state restore...")
        restored_state = await timeline_service.restore_timeline_state(project_id, 1, user_id)
        if restored_state:
            print(f"✅ Restored version 1: {restored_state.id} - Is current: {restored_state.is_current}")
        else:
            print("❌ Failed to restore version 1")
        
        # Test updating timeline state
        print("✏️ Testing timeline state update...")
        from models.schemas import TimelineStateUpdate
        update_data = TimelineStateUpdate(
            description="Updated description",
            change_summary="Updated via API"
        )
        
        updated_state = await timeline_service.update_timeline_state(timeline_state_2.id, update_data, user_id)
        if updated_state:
            print(f"✅ Updated timeline state: {updated_state.description}")
        else:
            print("❌ Failed to update timeline state")
        
        print("✅ All timeline service tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Timeline service test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_timeline_service())

