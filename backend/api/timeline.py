"""
Timeline API endpoints for MongoDB Integration
"""
from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import List, Optional

from models.schemas import (
    TimelineStateDocument, TimelineStateCreate, TimelineStateUpdate, 
    ApiResponse
)
from services.timeline_service import timeline_service
from utils.error_handlers import handle_database_error, get_user_friendly_message

router = APIRouter()

# Dependency to get user ID from headers (in a real app, this would be from JWT token)
async def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> str:
    """Get current user ID from headers"""
    if not x_user_id:
        # For testing purposes, use a default user ID
        return "507f1f77bcf86cd799439011"  # Default test user ID
    return x_user_id


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


@router.get("/{project_id}/current", response_model=ApiResponse[TimelineStateDocument])
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