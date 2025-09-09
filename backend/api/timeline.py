"""
Timeline API endpoints for MongoDB Integration
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime

from models.schemas import (
    TimelineStateDocument, TimelineStateCreate, TimelineStateUpdate, 
    ApiResponse
)
from services.timeline_service import timeline_service
from utils.error_handlers import handle_database_error, get_user_friendly_message
from middleware.auth_middleware import get_current_user_id

router = APIRouter()


@router.post("/", response_model=ApiResponse[TimelineStateDocument])
async def save_timeline_state(
    timeline_data: TimelineStateCreate, 
    user_id: str = Depends(get_current_user_id)
):
    """Save a new timeline state"""
    try:
        timeline_state = await timeline_service.save_timeline_state(timeline_data, user_id)
        
        return ApiResponse(
            success=True,
            data=timeline_state,
            message="Timeline state saved successfully"
        )
        
    except Exception as e:
        error = handle_database_error(e, "save_timeline_state")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.get("/{project_id}", response_model=ApiResponse[TimelineStateDocument])
async def get_timeline_state(
    project_id: str, 
    user_id: str = Depends(get_current_user_id)
):
    """Get timeline state for a project (returns empty state if none exists)"""
    try:
        timeline_state = await timeline_service.get_current_timeline_state(project_id, user_id)
        
        if not timeline_state:
            # Return empty timeline state for new projects
            from models.schemas import TimelineStateDocument, TimelineState
            empty_timeline_state = TimelineStateDocument(
                project_id=project_id,
                timeline_state=TimelineState(
                    layers=[],
                    playhead_time=0.0,
                    zoom=1.0,
                    duration=0.0,
                    markers=[],
                    selected_clips=[],
                    is_playing=False,
                    is_snapping=True
                ),
                version=1,
                is_current=True,
                created_by=user_id,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            return ApiResponse(
                success=True,
                data=empty_timeline_state,
                message="Empty timeline state created for new project"
            )
        
        return ApiResponse(
            success=True,
            data=timeline_state,
            message="Timeline state retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "get_timeline_state")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


async def get_current_timeline_state(
    project_id: str, 
    user_id: str = Depends(get_current_user_id)
):
    """Get the current timeline state for a project"""
    try:
        timeline_state = await timeline_service.get_current_timeline_state(project_id, user_id)
        
        if not timeline_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No timeline state found for this project"
            )
        
        return ApiResponse(
            success=True,
            data=timeline_state,
            message="Current timeline state retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "get_current_timeline_state")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.get("/{project_id}/version/{version}", response_model=ApiResponse[TimelineStateDocument])
async def get_timeline_state_by_version(
    project_id: str, 
    version: int, 
    user_id: str = Depends(get_current_user_id)
):
    """Get a specific timeline state by version"""
    try:
        timeline_state = await timeline_service.get_timeline_state_by_version(project_id, version, user_id)
        
        if not timeline_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Timeline state version {version} not found"
            )
        
        return ApiResponse(
            success=True,
            data=timeline_state,
            message=f"Timeline state version {version} retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "get_timeline_state_by_version")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.get("/{project_id}/history", response_model=ApiResponse[List[TimelineStateDocument]])
async def get_timeline_history(
    project_id: str, 
    user_id: str = Depends(get_current_user_id),
    limit: int = 20,
    skip: int = 0
):
    """Get timeline state history for a project"""
    try:
        history = await timeline_service.get_timeline_history(project_id, user_id, limit, skip)
        
        return ApiResponse(
            success=True,
            data=history,
            message=f"Retrieved {len(history)} timeline states from history"
        )
        
    except Exception as e:
        error = handle_database_error(e, "get_timeline_history")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.put("/{timeline_id}", response_model=ApiResponse[TimelineStateDocument])
async def update_timeline_state(
    timeline_id: str, 
    timeline_data: TimelineStateUpdate, 
    user_id: str = Depends(get_current_user_id)
):
    """Update a timeline state"""
    try:
        timeline_state = await timeline_service.update_timeline_state(timeline_id, timeline_data, user_id)
        
        if not timeline_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timeline state not found"
            )
        
        return ApiResponse(
            success=True,
            data=timeline_state,
            message="Timeline state updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "update_timeline_state")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.post("/{project_id}/restore/{version}", response_model=ApiResponse[TimelineStateDocument])
async def restore_timeline_state(
    project_id: str, 
    version: int, 
    user_id: str = Depends(get_current_user_id)
):
    """Restore a timeline state to current"""
    try:
        timeline_state = await timeline_service.restore_timeline_state(project_id, version, user_id)
        
        if not timeline_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Timeline state version {version} not found"
            )
        
        return ApiResponse(
            success=True,
            data=timeline_state,
            message=f"Timeline state version {version} restored successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "restore_timeline_state")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.delete("/{timeline_id}", response_model=ApiResponse)
async def delete_timeline_state(
    timeline_id: str, 
    user_id: str = Depends(get_current_user_id)
):
    """Delete a timeline state"""
    try:
        success = await timeline_service.delete_timeline_state(timeline_id, user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timeline state not found"
            )
        
        return ApiResponse(
            success=True,
            data=None,
            message="Timeline state deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "delete_timeline_state")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )