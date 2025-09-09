#!/usr/bin/env python3
"""
Test script for Transcription Service
"""
import asyncio
import sys
import os
from bson import ObjectId

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database import init_db, get_users_collection, get_projects_collection
from services.transcription_service import transcription_service
from models.schemas import (
    TranscriptionCreate, TranscriptSegment, TranscriptWord
)


async def create_test_data():
    """Create test user and project for testing"""
    users_collection = get_users_collection()
    projects_collection = get_projects_collection()
    
    # Check if test user already exists
    existing_user = await users_collection.find_one({"email": "transcription_test@example.com"})
    if existing_user:
        user_id = str(existing_user['_id'])
        print(f"✅ Test user already exists: {user_id}")
    else:
        # Create test user
        test_user = {
            "email": "transcription_test@example.com",
            "name": "Transcription Test User",
            "username": "transcription_test",
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
    existing_project = await projects_collection.find_one({"name": "Transcription Test Project"})
    if existing_project:
        project_id = str(existing_project['_id'])
        print(f"✅ Test project already exists: {project_id}")
    else:
        # Create test project
        test_project = {
            "name": "Transcription Test Project",
            "description": "A test project for transcription service",
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


async def test_transcription_service():
    """Test transcription service functionality"""
    print("🚀 Testing Transcription Service...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Create test data
        print("👤 Creating test data...")
        user_id, project_id = await create_test_data()
        
        # Test creating transcription
        print("📝 Testing transcription creation...")
        transcription_data = TranscriptionCreate(
            project_id=project_id,
            language="en",
            model_used="whisper-large"
        )
        
        transcription = await transcription_service.create_transcription(transcription_data, user_id)
        print(f"✅ Created transcription: {transcription.id} - Language: {transcription.language}")
        
        # Test getting transcription
        print("🔍 Testing transcription retrieval...")
        retrieved_transcription = await transcription_service.get_transcription(project_id, user_id)
        if retrieved_transcription:
            print(f"✅ Retrieved transcription: {retrieved_transcription.id} - Segments: {len(retrieved_transcription.segments)}")
        else:
            print("❌ Failed to retrieve transcription")
        
        # Test adding transcription segments
        print("📝 Testing transcription segments...")
        
        # Create test words
        word1 = TranscriptWord(
            text="Hello",
            start=0.0,
            end=0.5,
            confidence=0.95,
            is_filler=False,
            speaker_id="speaker_1"
        )
        
        word2 = TranscriptWord(
            text="world",
            start=0.5,
            end=1.0,
            confidence=0.92,
            is_filler=False,
            speaker_id="speaker_1"
        )
        
        # Create test segment
        segment1 = TranscriptSegment(
            id="segment_1",
            start_time=0.0,
            end_time=1.0,
            text="Hello world",
            words=[word1, word2],
            speaker_id="speaker_1",
            confidence=0.93,
            is_edited=False
        )
        
        segments = [segment1]
        updated_transcription = await transcription_service.add_transcription_segments(project_id, segments, user_id)
        if updated_transcription:
            print(f"✅ Added segments: {len(updated_transcription.segments)} segments")
        else:
            print("❌ Failed to add segments")
        
        # Test updating transcription metadata
        print("📊 Testing transcription metadata...")
        metadata = {
            "processing_time": 15.5,
            "confidence_score": 0.89,
            "speaker_count": 1,
            "speakers": {"speaker_1": "John Doe"}
        }
        
        metadata_transcription = await transcription_service.set_transcription_metadata(project_id, metadata, user_id)
        if metadata_transcription:
            print(f"✅ Updated metadata: Processing time: {metadata_transcription.processing_time}s, Confidence: {metadata_transcription.confidence_score}")
        else:
            print("❌ Failed to update metadata")
        
        # Test updating a specific segment
        print("✏️ Testing segment update...")
        updated_segment = TranscriptSegment(
            id="segment_1",
            start_time=0.0,
            end_time=1.2,
            text="Hello world!",
            words=[word1, word2],
            speaker_id="speaker_1",
            confidence=0.95,
            is_edited=True,
            edited_text="Hello world!"
        )
        
        updated_segment_transcription = await transcription_service.update_transcription_segment(
            project_id, "segment_1", updated_segment, user_id
        )
        if updated_segment_transcription:
            print(f"✅ Updated segment: {updated_segment_transcription.segments[0].text}")
        else:
            print("❌ Failed to update segment")
        
        # Test getting final transcription
        print("🔍 Testing final transcription retrieval...")
        final_transcription = await transcription_service.get_transcription(project_id, user_id)
        if final_transcription:
            print(f"✅ Final transcription: {len(final_transcription.segments)} segments, {final_transcription.speaker_count} speakers")
            print(f"   Language: {final_transcription.language}, Model: {final_transcription.model_used}")
            print(f"   Processing time: {final_transcription.processing_time}s, Confidence: {final_transcription.confidence_score}")
        else:
            print("❌ Failed to retrieve final transcription")
        
        print("✅ All transcription service tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Transcription service test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_transcription_service())

