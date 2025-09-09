from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime

from models.schemas import Project, ProjectCreate, ProjectUpdate, ApiResponse
from services.project_service import project_service
from utils.error_handlers import handle_database_error, get_user_friendly_message
from middleware.auth_middleware import get_current_user_id

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[Project]])
async def get_projects(user_id: str = Depends(get_current_user_id)):
    """Get all projects for current user"""
    try:
        projects = await project_service.get_projects(user_id)
        
        return ApiResponse(
            success=True,
            data=projects,
            message=f"Found {len(projects)} projects"
        )
        
    except Exception as e:
        error = handle_database_error(e, "get_projects")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )

@router.post("/", response_model=ApiResponse[Project])
async def create_project(project_data: ProjectCreate, user_id: str = Depends(get_current_user_id)):
    """Create new project"""
    try:
        project = await project_service.create_project(project_data, user_id)
        
        return ApiResponse(
            success=True,
            data=project,
            message="Project created successfully"
        )
        
    except Exception as e:
        error = handle_database_error(e, "create_project")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )

@router.get("/{project_id}", response_model=ApiResponse[Project])
async def get_project(project_id: str, user_id: str = Depends(get_current_user_id)):
    """Get project by ID"""
    try:
        project = await project_service.get_project(project_id, user_id)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return ApiResponse(
            success=True,
            data=project,
            message="Project found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "get_project")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )

@router.put("/{project_id}", response_model=ApiResponse[Project])
async def update_project(project_id: str, project_data: ProjectUpdate, user_id: str = Depends(get_current_user_id)):
    """Update project"""
    try:
        project = await project_service.update_project(project_id, project_data, user_id)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return ApiResponse(
            success=True,
            data=project,
            message="Project updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "update_project")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )

@router.delete("/{project_id}", response_model=ApiResponse)
async def delete_project(project_id: str, user_id: str = Depends(get_current_user_id), hard_delete: bool = False):
    """Delete project (soft delete by default)"""
    try:
        success = await project_service.delete_project(project_id, user_id, hard_delete)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return ApiResponse(
            success=True,
            data=None,
            message="Project deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "delete_project")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )

@router.post("/{project_id}/restore", response_model=ApiResponse)
async def restore_project(project_id: str, user_id: str = Depends(get_current_user_id)):
    """Restore a soft-deleted project"""
    try:
        success = await project_service.restore_project(project_id, user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or not deleted"
            )
        
        return ApiResponse(
            success=True,
            data=None,
            message="Project restored successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error = handle_database_error(e, "restore_project")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )