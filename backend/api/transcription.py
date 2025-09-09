"""
Transcription API endpoints for MongoDB Integration
"""
from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import List, Optional, Dict, Any

from models.schemas import (
    TranscriptionDocument, TranscriptionCreate, TranscriptionUpdate,
    TranscriptSegment, ApiResponse
)
from services.transcription_service import transcription_service
from utils.error_handlers import handle_database_error, get_user_friendly_message

router = APIRouter()

# Dependency to get user ID from headers (in a real app, this would be from JWT token)
async def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> str:
    """Get current user ID from headers"""
    if not x_user_id:
        # For testing purposes, use a default user ID
        return "507f1f77bcf86cd799439011"  # Default test user ID
    return x_user_id


@router.post("/", response_model=ApiResponse[TranscriptionDocument])
async def create_transcription(
    transcription_data: TranscriptionCreate, 
    user_id: str = Depends(get_current_user_id)
):
    """Create a new transcription document"""
    try:
        transcription = await transcription_service.create_transcription(transcription_data, user_id)
        
        return ApiResponse(
            success=True,
            data=transcription,
            message="Transcription created successfully"
        )
        
    except Exception as e:
        error = handle_database_error(e, "create_transcription")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.get("/{project_id}", response_model=ApiResponse[TranscriptionDocument])
async def get_transcription(
    project_id: str, 
    user_id: str = Depends(get_current_user_id)
):
    """Get transcription for a project"""
    try:
        transcription = await transcription_service.get_transcription(project_id, user_id)
        
        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcription not found for this project"
            )
        
        return ApiResponse(
            success=True,
            data=transcription,
            message="Transcription retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "get_transcription")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.put("/{project_id}", response_model=ApiResponse[TranscriptionDocument])
async def update_transcription(
    project_id: str, 
    transcription_data: TranscriptionUpdate, 
    user_id: str = Depends(get_current_user_id)
):
    """Update transcription data"""
    try:
        transcription = await transcription_service.update_transcription(project_id, transcription_data, user_id)
        
        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcription not found for this project"
            )
        
        return ApiResponse(
            success=True,
            data=transcription,
            message="Transcription updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "update_transcription")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.post("/{project_id}/segments", response_model=ApiResponse[TranscriptionDocument])
async def add_transcription_segments(
    project_id: str, 
    segments: List[TranscriptSegment], 
    user_id: str = Depends(get_current_user_id)
):
    """Add transcription segments to existing transcription"""
    try:
        transcription = await transcription_service.add_transcription_segments(project_id, segments, user_id)
        
        return ApiResponse(
            success=True,
            data=transcription,
            message=f"Added {len(segments)} segments to transcription"
        )
        
    except Exception as e:
        error = handle_database_error(e, "add_transcription_segments")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.put("/{project_id}/segments/{segment_id}", response_model=ApiResponse[TranscriptionDocument])
async def update_transcription_segment(
    project_id: str, 
    segment_id: str, 
    updated_segment: TranscriptSegment, 
    user_id: str = Depends(get_current_user_id)
):
    """Update a specific transcription segment"""
    try:
        transcription = await transcription_service.update_transcription_segment(
            project_id, segment_id, updated_segment, user_id
        )
        
        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcription or segment not found"
            )
        
        return ApiResponse(
            success=True,
            data=transcription,
            message="Transcription segment updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "update_transcription_segment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.delete("/{project_id}/segments/{segment_id}", response_model=ApiResponse[TranscriptionDocument])
async def delete_transcription_segment(
    project_id: str, 
    segment_id: str, 
    user_id: str = Depends(get_current_user_id)
):
    """Delete a specific transcription segment"""
    try:
        transcription = await transcription_service.delete_transcription_segment(project_id, segment_id, user_id)
        
        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcription or segment not found"
            )
        
        return ApiResponse(
            success=True,
            data=transcription,
            message="Transcription segment deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "delete_transcription_segment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.put("/{project_id}/metadata", response_model=ApiResponse[TranscriptionDocument])
async def set_transcription_metadata(
    project_id: str, 
    metadata: Dict[str, Any], 
    user_id: str = Depends(get_current_user_id)
):
    """Set transcription metadata (processing time, confidence score, etc.)"""
    try:
        transcription = await transcription_service.set_transcription_metadata(project_id, metadata, user_id)
        
        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcription not found for this project"
            )
        
        return ApiResponse(
            success=True,
            data=transcription,
            message="Transcription metadata updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "set_transcription_metadata")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.delete("/{project_id}", response_model=ApiResponse)
async def delete_transcription(
    project_id: str, 
    user_id: str = Depends(get_current_user_id)
):
    """Delete transcription for a project"""
    try:
        success = await transcription_service.delete_transcription(project_id, user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcription not found for this project"
            )
        
        return ApiResponse(
            success=True,
            data=None,
            message="Transcription deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "delete_transcription")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )

