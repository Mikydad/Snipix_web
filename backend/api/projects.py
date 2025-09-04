from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime

from models.schemas import Project, ProjectCreate, ProjectUpdate, ApiResponse

router = APIRouter()

# Temporary in-memory storage for testing (since MongoDB is offline)
projects_storage = []
project_counter = 0

@router.get("/", response_model=ApiResponse[List[Project]])
async def get_projects():
    """Get all projects for current user"""
    try:
        # Return in-memory projects for testing
        return ApiResponse(
            success=True,
            data=[Project(**project) for project in projects_storage],
            message=f"Found {len(projects_storage)} projects"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch projects"
        )

@router.post("/", response_model=ApiResponse[Project])
async def create_project(project_data: ProjectCreate):
    """Create new project"""
    try:
        global project_counter
        project_counter += 1
        
        # Create project document
        project_doc = {
            "_id": f"project_{project_counter}",
            "name": project_data.name,
            "description": project_data.description,
            "user_id": "test_user",  # Temporary test user ID
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "thumbnail": None,
            "duration": None,
            "timeline_state": None,
            "transcript_state": None
        }
        
        # Store in memory
        projects_storage.append(project_doc)
        
        return ApiResponse(
            success=True,
            data=Project(**project_doc),
            message="Project created successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project"
        )

@router.get("/{project_id}/debug")
async def get_project_debug(project_id: str):
    """Get project by ID (debug version without Pydantic)"""
    try:
        # Find project in memory
        project_doc = next((p for p in projects_storage if p["_id"] == project_id), None)
        
        if not project_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        print(f"DEBUG: Raw project duration: {project_doc.get('duration')} (type: {type(project_doc.get('duration'))})")
        
        # Return raw JSON without Pydantic processing
        return {
            "success": True,
            "data": project_doc,
            "message": "Project found (debug)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch project"
        )

@router.get("/{project_id}", response_model=ApiResponse[Project])
async def get_project(project_id: str):
    """Get project by ID"""
    try:
        # Find project in memory
        project_doc = next((p for p in projects_storage if p["_id"] == project_id), None)
        
        if not project_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        print(f"DEBUG: Project duration in storage: {project_doc.get('duration')} (type: {type(project_doc.get('duration'))})")
        
        # Test: Force the duration to be a specific value to see if the issue is in serialization
        if project_doc.get('duration'):
            test_duration = float(project_doc.get('duration'))
            print(f"DEBUG: Test duration conversion: {test_duration} (type: {type(test_duration)})")
            project_doc['duration'] = test_duration
        
        return ApiResponse(
            success=True,
            data=Project(**project_doc),
            message="Project found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch project"
        )

# Comment out other endpoints for now to focus on upload testing
# @router.put("/{project_id}", response_model=ApiResponse[Project])
# async def update_project(project_id: str, project_data: ProjectUpdate):
#     """Update project - temporarily disabled"""
#     pass

# @router.delete("/{project_id}", response_model=ApiResponse)
# async def delete_project(project_id: str):
#     """Delete project - temporarily disabled"""
#     pass
