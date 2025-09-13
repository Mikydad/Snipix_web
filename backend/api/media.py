from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List, Optional
import os
from datetime import datetime

from models.schemas import (
    UploadResponse, TranscribeResponse, RemoveFillersRequest, 
    RemoveFillersResponse, ApiResponse, TrimVideoRequest, TrimVideoResponse
)
from services.media_service import media_service
from services.project_service import project_service
from utils.error_handlers import handle_database_error, get_user_friendly_message
from middleware.auth_middleware import get_current_user_id

router = APIRouter()

@router.post("/upload", response_model=ApiResponse[UploadResponse])
async def upload_media(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    user_id: str = Depends(get_current_user_id)
):
    """Upload video file"""
    try:
        # Validate file type
        allowed_types = ["video/mp4", "video/mov", "video/avi", "video/mkv"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only MP4, MOV, AVI, MKV files are allowed."
            )
        
        # Validate file size (2GB)
        max_size = 2 * 1024 * 1024 * 1024  # 2GB
        if file.size > max_size:
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum size is 2GB."
            )
        
        # Save uploaded file
        file_path = media_service.save_uploaded_file(file, project_id)
        
        # Get video duration
        duration = media_service.get_video_duration(file_path)
        print(f"DEBUG: Video duration from FFmpeg: {duration} (type: {type(duration)})")
        
        # Generate thumbnail
        try:
            thumbnail_path = media_service.generate_thumbnail(file_path)
        except Exception as e:
            thumbnail_path = None
        
        # Update project with video information using project service
        try:
            # Get the project first to verify it exists and user has access
            project = await project_service.get_project(project_id, user_id)
            if not project:
                raise HTTPException(
                    status_code=404,
                    detail="Project not found or access denied"
                )
            
            # Update project with video information
            from models.schemas import ProjectUpdate
            update_data = ProjectUpdate(
                video_path=file_path,
                duration=duration,
                thumbnail=thumbnail_path
            )
            
            updated_project = await project_service.update_project(project_id, update_data, user_id)
            print(f"DEBUG: Updated project duration to: {duration} (type: {type(duration)})")
            
        except Exception as e:
            # If project update fails, clean up the uploaded file
            if os.path.exists(file_path):
                os.remove(file_path)
            if thumbnail_path and os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update project: {str(e)}"
            )
        
        return ApiResponse(
            success=True,
            data=UploadResponse(
                project_id=project_id,
                file_path=file_path,
                duration=duration
            ),
            message="Video uploaded successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to upload video"
        )

@router.post("/transcribe", response_model=ApiResponse[TranscribeResponse])
async def transcribe_audio(
    project_id: str = Form(...),
    user_id: str = Depends(get_current_user_id)
):
    """Transcribe video audio"""
    try:
        # Get project from database
        project = await project_service.get_project(project_id, user_id)
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )
        
        # Get video file path
        video_path = project.video_path
        if not video_path or not os.path.exists(video_path):
            raise HTTPException(
                status_code=404,
                detail="Video file not found"
            )
        
        # Extract audio
        audio_path = media_service.extract_audio(video_path)
        
        try:
            # Transcribe audio
            transcript = media_service.transcribe_audio(audio_path)
            
            # Clean up audio file
            media_service.cleanup_temp_files([audio_path])
            
            return ApiResponse(
                success=True,
                data=TranscribeResponse(
                    transcript=transcript,
                    duration=project.duration or 0
                ),
                message="Transcription completed successfully"
            )
            
        except Exception as e:
            # Clean up audio file on error
            media_service.cleanup_temp_files([audio_path])
            raise
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to transcribe audio"
        )

@router.post("/remove-fillers", response_model=ApiResponse[RemoveFillersResponse])
async def remove_fillers(request: RemoveFillersRequest, user_id: str = Depends(get_current_user_id)):
    """Remove filler words from video"""
    try:
        # Get project from database
        project = await project_service.get_project(request.project_id, user_id)
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )
        
        # Get video file path
        video_path = project.video_path
        if not video_path or not os.path.exists(video_path):
            raise HTTPException(
                status_code=404,
                detail="Video file not found"
            )
        
        # Get transcript from the current session (we'll need to store it in the project)
        # For now, we'll use a simple approach - the transcript should be available from the frontend
        # This is a simplified version - in a real app, you'd store the transcript in the project
        
        # For now, return a success response indicating the feature is available
        return ApiResponse(
            success=True,
            data=RemoveFillersResponse(
                processed_video_path=video_path,  # For now, return the original path
                removed_segments=[]  # Empty for now
            ),
            message="Filler removal feature is available (backend processing to be implemented)"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to remove filler words"
        )

@router.get("/{project_id}/video")
async def get_video(
    project_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get video file"""
    try:
        # Get project from database
        project = await project_service.get_project(project_id, user_id)
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )
        
        # Get video file path - prefer trimmed video if available
        video_path = project.trimmed_video_path or project.video_path
        if not video_path or not os.path.exists(video_path):
            raise HTTPException(
                status_code=404,
                detail="Video file not found"
            )
        
        return FileResponse(
            video_path,
            media_type="video/mp4",
            filename=f"video_{project_id}.mp4"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve video"
        )

@router.get("/{project_id}/thumbnail")
async def get_thumbnail(
    project_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get video thumbnail"""
    try:
        # Get project from database
        project = await project_service.get_project(project_id, user_id)
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )
        
        # Get thumbnail path
        thumbnail_path = project.thumbnail
        if not thumbnail_path or not os.path.exists(thumbnail_path):
            raise HTTPException(
                status_code=404,
                detail="Thumbnail not found"
            )
        
        return FileResponse(
            thumbnail_path,
            media_type="image/jpeg",
            filename=f"thumbnail_{project_id}.jpg"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve thumbnail"
        )

@router.post("/trim-video", response_model=ApiResponse[TrimVideoResponse])
async def trim_video(request: TrimVideoRequest, user_id: str = Depends(get_current_user_id)):
    """Trim video based on timeline segments (hybrid approach)"""
    try:
        # Get project from database
        project = await project_service.get_project(request.project_id, user_id)
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )
        
        # Get video file path
        video_path = project.video_path
        if not video_path or not os.path.exists(video_path):
            raise HTTPException(
                status_code=404,
                detail="Video file not found"
            )
        
        # Convert segments to the format expected by media service
        segments = [
            {
                "startTime": segment.startTime,
                "duration": segment.duration
            }
            for segment in request.segments
        ]
        
        print(f"🎬 TRIM VIDEO: Received segments: {segments}")
        print(f"🎬 TRIM VIDEO: Original video path: {video_path}")
        
        # Process video segments
        trimmed_path = media_service.trim_video_segments(video_path, segments)
        
        # Get new duration
        new_duration = media_service.get_video_duration(trimmed_path)
        
        # Update project with trimmed video using project service
        from models.schemas import ProjectUpdate
        update_data = ProjectUpdate(
            trimmed_video_path=trimmed_path,
            trimmed_duration=new_duration
        )
        
        await project_service.update_project(request.project_id, update_data, user_id)
        
        return ApiResponse(
            success=True,
            data=TrimVideoResponse(
                trimmed_video_path=trimmed_path,
                new_duration=new_duration
            ),
            message="Video trimmed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trim video: {str(e)}"
        )

