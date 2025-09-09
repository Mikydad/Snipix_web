"""
Project Management Service for MongoDB Integration
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from models.schemas import (
    Project, ProjectCreate, ProjectUpdate, 
    User, AuditLog, AuditLogCreate, AuditLogAction
)
from services.database import (
    get_projects_collection, get_users_collection, get_audit_logs_collection,
    is_db_available
)
from utils.error_handlers import (
    retry_database_operation, ErrorContext, handle_database_error,
    DatabaseError, ValidationError, OperationError
)
from utils.retry_decorator import resilient_operation

logger = logging.getLogger(__name__)


class ProjectService:
    """Service for managing projects with MongoDB integration"""
    
    def __init__(self):
        self.projects_collection = None
        self.users_collection = None
        self.audit_logs_collection = None
        self._ensure_collections()
    
    def _ensure_collections(self):
        """Ensure database collections are available"""
        if not is_db_available():
            logger.warning("Database not available, running in offline mode")
            return
        
        try:
            self.projects_collection = get_projects_collection()
            self.users_collection = get_users_collection()
            self.audit_logs_collection = get_audit_logs_collection()
        except Exception as e:
            logger.error(f"Failed to initialize collections: {e}")
            raise DatabaseError(f"Failed to initialize collections: {e}")
    
    async def _ensure_collections_async(self):
        """Ensure database collections are available (async version)"""
        if not is_db_available():
            logger.warning("Database not available, running in offline mode")
            return
        
        try:
            self.projects_collection = get_projects_collection()
            self.users_collection = get_users_collection()
            self.audit_logs_collection = get_audit_logs_collection()
        except Exception as e:
            logger.error(f"Failed to initialize collections: {e}")
            raise DatabaseError(f"Failed to initialize collections: {e}")
    
    @retry_database_operation(max_retries=3)
    async def create_project(self, project_data: ProjectCreate, user_id: str) -> Project:
        """Create a new project"""
        with ErrorContext("create_project", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.projects_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate user exists or create a default user
            user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                # Create a default user for testing purposes
                logger.info(f"Creating default user: {user_id}")
                user_doc = {
                    "_id": ObjectId(user_id),
                    "name": "Default User",
                    "username": f"user_{user_id[:8]}",
                    "email": f"user_{user_id[:8]}@example.com",
                    "password": "default_password",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                }
                await self.users_collection.insert_one(user_doc)
                logger.info(f"Created default user: {user_id}")
            
            # Create project document
            project_doc = {
                "name": project_data.name,
                "description": project_data.description,
                "user_id": user_id,
                "status": "active",
                "metadata": {},
                "tags": [],
                "collaborators": [],
                "permissions": {},
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "is_deleted": False
            }
            
            # Insert project
            result = await self.projects_collection.insert_one(project_doc)
            project_id = str(result.inserted_id)
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.CREATE,
                resource_type="project",
                resource_id=project_id,
                details={"name": project_data.name}
            )
            
            # Return created project
            project_doc["_id"] = project_id
            project = Project(**project_doc)
            
            logger.info(f"Created project {project_id} for user {user_id}")
            return project
    
    @retry_database_operation(max_retries=3)
    async def get_project(self, project_id: str, user_id: str) -> Optional[Project]:
        """Get a project by ID"""
        with ErrorContext("get_project", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.projects_collection is None:
                raise DatabaseError("Database not available")
            
            # Find project
            project_doc = await self.projects_collection.find_one({
                "_id": ObjectId(project_id),
                "is_deleted": False
            })
            
            if not project_doc:
                return None
            
            # Check permissions
            if not self._has_project_access(project_doc, user_id):
                raise ValidationError("Access denied to project")
            
            # Convert to Project object
            project_doc["_id"] = str(project_doc["_id"])
            project = Project(**project_doc)
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.VIEW,
                resource_type="project",
                resource_id=project_id
            )
            
            return project
    
    @retry_database_operation(max_retries=3)
    async def get_projects(self, user_id: str, limit: int = 50, skip: int = 0) -> List[Project]:
        """Get all projects for a user"""
        with ErrorContext("get_projects", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.projects_collection is None:
                raise DatabaseError("Database not available")
            
            # Find projects where user is owner or collaborator
            query = {
                "is_deleted": False,
                "$or": [
                    {"user_id": user_id},
                    {"collaborators": user_id}
                ]
            }
            
            cursor = self.projects_collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)
            projects = []
            
            async for project_doc in cursor:
                project_doc["_id"] = str(project_doc["_id"])
                projects.append(Project(**project_doc))
            
            return projects
    
    @retry_database_operation(max_retries=3)
    async def update_project(self, project_id: str, project_data: ProjectUpdate, user_id: str) -> Optional[Project]:
        """Update a project"""
        with ErrorContext("update_project", user_id) as ctx:
            if self.projects_collection is None:
                raise DatabaseError("Database not available")
            
            # Get existing project
            existing_project = await self.get_project(project_id, user_id)
            if not existing_project:
                return None
            
            # Prepare update data
            update_data = {
                "updated_at": datetime.now()
            }
            
            if project_data.name is not None:
                update_data["name"] = project_data.name
            if project_data.description is not None:
                update_data["description"] = project_data.description
            if project_data.thumbnail is not None:
                update_data["thumbnail"] = project_data.thumbnail
            if project_data.duration is not None:
                update_data["duration"] = project_data.duration
            if project_data.video_path is not None:
                update_data["video_path"] = project_data.video_path
            if project_data.trimmed_video_path is not None:
                update_data["trimmed_video_path"] = project_data.trimmed_video_path
            if project_data.trimmed_duration is not None:
                update_data["trimmed_duration"] = project_data.trimmed_duration
            
            # Update project
            result = await self.projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to update project")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="project",
                resource_id=project_id,
                details=update_data
            )
            
            # Return updated project
            return await self.get_project(project_id, user_id)
    
    @retry_database_operation(max_retries=3)
    async def delete_project(self, project_id: str, user_id: str, hard_delete: bool = False) -> bool:
        """Delete a project (soft delete by default)"""
        with ErrorContext("delete_project", user_id) as ctx:
            if self.projects_collection is None:
                raise DatabaseError("Database not available")
            
            # Get existing project
            existing_project = await self.get_project(project_id, user_id)
            if not existing_project:
                return False
            
            if hard_delete:
                # Hard delete
                result = await self.projects_collection.delete_one({"_id": ObjectId(project_id)})
                action = AuditLogAction.DELETE
            else:
                # Soft delete
                result = await self.projects_collection.update_one(
                    {"_id": ObjectId(project_id)},
                    {
                        "$set": {
                            "is_deleted": True,
                            "deleted_at": datetime.now(),
                            "updated_at": datetime.now()
                        }
                    }
                )
                action = AuditLogAction.SOFT_DELETE
            
            if result.modified_count == 0 and result.deleted_count == 0:
                raise OperationError("Failed to delete project")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=action,
                resource_type="project",
                resource_id=project_id,
                details={"hard_delete": hard_delete}
            )
            
            logger.info(f"Deleted project {project_id} for user {user_id}")
            return True
    
    @retry_database_operation(max_retries=3)
    async def restore_project(self, project_id: str, user_id: str) -> bool:
        """Restore a soft-deleted project"""
        with ErrorContext("restore_project", user_id) as ctx:
            if self.projects_collection is None:
                raise DatabaseError("Database not available")
            
            # Find soft-deleted project
            project_doc = await self.projects_collection.find_one({
                "_id": ObjectId(project_id),
                "is_deleted": True
            })
            
            if not project_doc:
                return False
            
            # Check permissions
            if not self._has_project_access(project_doc, user_id):
                raise ValidationError("Access denied to project")
            
            # Restore project
            result = await self.projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$set": {
                        "is_deleted": False,
                        "deleted_at": None,
                        "updated_at": datetime.now()
                    }
                }
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to restore project")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.RESTORE,
                resource_type="project",
                resource_id=project_id
            )
            
            logger.info(f"Restored project {project_id} for user {user_id}")
            return True
    
    @retry_database_operation(max_retries=3)
    async def add_collaborator(self, project_id: str, user_id: str, collaborator_id: str, permissions: List[str]) -> bool:
        """Add a collaborator to a project"""
        with ErrorContext("add_collaborator", user_id) as ctx:
            if self.projects_collection is None:
                raise DatabaseError("Database not available")
            
            # Get existing project
            existing_project = await self.get_project(project_id, user_id)
            if not existing_project:
                return False
            
            # Update project with new collaborator
            result = await self.projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$addToSet": {"collaborators": collaborator_id},
                    "$set": {
                        f"permissions.{collaborator_id}": permissions,
                        "updated_at": datetime.now()
                    }
                }
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to add collaborator")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="project",
                resource_id=project_id,
                details={"action": "add_collaborator", "collaborator_id": collaborator_id, "permissions": permissions}
            )
            
            logger.info(f"Added collaborator {collaborator_id} to project {project_id}")
            return True
    
    @retry_database_operation(max_retries=3)
    async def remove_collaborator(self, project_id: str, user_id: str, collaborator_id: str) -> bool:
        """Remove a collaborator from a project"""
        with ErrorContext("remove_collaborator", user_id) as ctx:
            if self.projects_collection is None:
                raise DatabaseError("Database not available")
            
            # Get existing project
            existing_project = await self.get_project(project_id, user_id)
            if not existing_project:
                return False
            
            # Update project to remove collaborator
            result = await self.projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$pull": {"collaborators": collaborator_id},
                    "$unset": {f"permissions.{collaborator_id}": ""},
                    "$set": {"updated_at": datetime.now()}
                }
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to remove collaborator")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="project",
                resource_id=project_id,
                details={"action": "remove_collaborator", "collaborator_id": collaborator_id}
            )
            
            logger.info(f"Removed collaborator {collaborator_id} from project {project_id}")
            return True
    
    def _has_project_access(self, project_doc: Dict[str, Any], user_id: str) -> bool:
        """Check if user has access to project"""
        # Owner has access
        if project_doc.get("user_id") == user_id:
            return True
        
        # Collaborator has access
        if user_id in project_doc.get("collaborators", []):
            return True
        
        return False
    
    async def _create_audit_log(self, user_id: str, action: AuditLogAction, resource_type: str, 
                               resource_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        """Create an audit log entry"""
        if self.audit_logs_collection is None:
            return
        
        try:
            audit_log_doc = {
                "user_id": user_id,
                "action": action.value,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details or {},
                "created_at": datetime.now(),
                "success": True
            }
            
            await self.audit_logs_collection.insert_one(audit_log_doc)
        except Exception as e:
            logger.warning(f"Failed to create audit log: {e}")


# Global project service instance
project_service = ProjectService()
