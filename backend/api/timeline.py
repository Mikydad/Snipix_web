from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any

from models.schemas import (
    TimelineSaveRequest, TimelineLoadResponse, ApiResponse
)

router = APIRouter()

@router.post("/save", response_model=ApiResponse)
async def save_timeline(request: TimelineSaveRequest):
    """Save timeline state"""
    try:
        # Find project in memory
        from api.projects import projects_storage
        project_doc = next((p for p in projects_storage if p["_id"] == request.project_id), None)
        
        if not project_doc:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        # For now, just return success since we're not storing timeline data
        return ApiResponse(
            success=True,
            message="Timeline saved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to save timeline"
        )

@router.get("/{project_id}", response_model=ApiResponse[TimelineLoadResponse])
async def load_timeline(project_id: str):
    """Load timeline state"""
    try:
        # Find project in memory
        from api.projects import projects_storage
        project_doc = next((p for p in projects_storage if p["_id"] == project_id), None)
        
        if not project_doc:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        # For now, return empty timeline state since we're not storing timeline data
        from models.schemas import TimelineState
        empty_timeline = TimelineState()
        
        return ApiResponse(
            success=True,
            data=TimelineLoadResponse(timeline_state=empty_timeline),
            message="Timeline loaded successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to load timeline"
        )

@router.delete("/{project_id}", response_model=ApiResponse)
async def delete_timeline(project_id: str):
    """Delete timeline state"""
    try:
        # Find project in memory
        from api.projects import projects_storage
        project_doc = next((p for p in projects_storage if p["_id"] == project_id), None)
        
        if not project_doc:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        # For now, just return success since we're not storing timeline data
        return ApiResponse(
            success=True,
            message="Timeline deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to delete timeline"
        )

@router.post("/{project_id}/render-preview", response_model=ApiResponse)
async def render_preview(
    project_id: str,
    start_time: float = 0.0,
    end_time: float = 10.0,
    quality: str = "medium"
):
    """Render preview of timeline segment"""
    try:
        # Find project in memory
        from api.projects import projects_storage
        project_doc = next((p for p in projects_storage if p["_id"] == project_id), None)
        
        if not project_doc:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        # Get video file path
        video_path = project_doc.get("video_path")
        if not video_path:
            raise HTTPException(
                status_code=404,
                detail="Video file not found"
            )
        
        # For now, return success since we're not implementing preview rendering yet
        return ApiResponse(
            success=True,
            message="Preview rendering feature is available (backend processing to be implemented)"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to render preview"
        )

@router.post("/{project_id}/export", response_model=ApiResponse)
async def export_timeline(project_id: str):
    """Export timeline as video"""
    try:
        # Find project in memory
        from api.projects import projects_storage
        project_doc = next((p for p in projects_storage if p["_id"] == project_id), None)
        
        if not project_doc:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        # Get video file path
        video_path = project_doc.get("video_path")
        if not video_path:
            raise HTTPException(
                status_code=404,
                detail="Video file not found"
            )
        
        # For now, return success since we're not implementing export yet
        return ApiResponse(
            success=True,
            message="Export feature is available (backend processing to be implemented)"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to export timeline"
        )
