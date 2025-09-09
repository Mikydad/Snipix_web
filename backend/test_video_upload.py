#!/usr/bin/env python3
"""
Test script for video upload functionality
"""
import asyncio
import httpx
import os
from pathlib import Path

async def test_video_upload():
    """Test video upload functionality"""
    base_url = "http://127.0.0.1:8001"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        print("🎬 Testing Video Upload Functionality...")
        print("=" * 50)
        
        # First, create a test project
        print("1. Creating a test project...")
        try:
            project_data = {
                "name": "Video Upload Test Project",
                "description": "A project for testing video upload"
            }
            headers = {"X-User-ID": "507f1f77bcf86cd799439011"}
            
            response = await client.post(f"{base_url}/projects/", json=project_data, headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                project_info = response.json()
                project_id = project_info['data']['_id']
                print(f"   ✅ Project created with ID: {project_id}")
            else:
                print(f"   ❌ Failed to create project: {response.text}")
                return
                
        except Exception as e:
            print(f"   ❌ Error creating project: {e}")
            return
        
        # Create a test video file (small dummy file)
        print("2. Creating test video file...")
        test_video_path = "test_video.mp4"
        try:
            # Create a small dummy MP4 file (just a few bytes)
            with open(test_video_path, "wb") as f:
                f.write(b"\x00\x00\x00\x20ftypmp42\x00\x00\x00\x00mp41mp42")
            print(f"   ✅ Test video file created: {test_video_path}")
        except Exception as e:
            print(f"   ❌ Error creating test video: {e}")
            return
        
        # Test video upload
        print("3. Testing video upload...")
        try:
            with open(test_video_path, "rb") as f:
                files = {"file": ("test_video.mp4", f, "video/mp4")}
                data = {"project_id": project_id}
                headers = {"X-User-ID": "507f1f77bcf86cd799439011"}
                
                response = await client.post(f"{base_url}/media/upload", files=files, data=data, headers=headers)
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 200:
                    upload_info = response.json()
                    print(f"   ✅ Video uploaded successfully!")
                    print(f"   File path: {upload_info['data']['file_path']}")
                    print(f"   Duration: {upload_info['data']['duration']}")
                else:
                    print(f"   ❌ Upload failed: {response.text}")
                    
        except Exception as e:
            print(f"   ❌ Error uploading video: {e}")
        
        # Test getting project info to verify video was saved
        print("4. Verifying project was updated...")
        try:
            headers = {"X-User-ID": "507f1f77bcf86cd799439011"}
            response = await client.get(f"{base_url}/projects/{project_id}", headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                project_info = response.json()
                project = project_info['data']
                print(f"   ✅ Project retrieved successfully!")
                print(f"   Video path: {project.get('video_path', 'Not set')}")
                print(f"   Duration: {project.get('duration', 'Not set')}")
                print(f"   Thumbnail: {project.get('thumbnail', 'Not set')}")
            else:
                print(f"   ❌ Failed to get project: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Error getting project: {e}")
        
        # Clean up test file
        print("5. Cleaning up...")
        try:
            if os.path.exists(test_video_path):
                os.remove(test_video_path)
                print(f"   ✅ Test video file removed")
        except Exception as e:
            print(f"   ⚠️  Could not remove test file: {e}")
        
        print("=" * 50)
        print("✅ Video upload test completed!")

if __name__ == "__main__":
    asyncio.run(test_video_upload())
