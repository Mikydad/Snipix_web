"""
Timeline State Management Service for MongoDB Integration
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from models.schemas import (
    TimelineState, TimelineStateDocument, TimelineStateCreate, TimelineStateUpdate,
    AuditLog, AuditLogCreate, AuditLogAction
)
from services.database import (
    get_timeline_states_collection, get_projects_collection, get_audit_logs_collection,
    is_db_available
)
from utils.error_handlers import (
    retry_database_operation, ErrorContext, handle_database_error,
    DatabaseError, ValidationError, OperationError
)
from utils.retry_decorator import resilient_operation

logger = logging.getLogger(__name__)


class TimelineService:
    """Service for managing timeline states with MongoDB integration"""
    
    def __init__(self):
        self.timeline_states_collection = None
        self.projects_collection = None
        self.audit_logs_collection = None
        self._ensure_collections()
    
    def _ensure_collections(self):
        """Ensure database collections are available"""
        if not is_db_available():
            logger.warning("Database not available, running in offline mode")
            return
        
        try:
            self.timeline_states_collection = get_timeline_states_collection()
            self.projects_collection = get_projects_collection()
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
            self.timeline_states_collection = get_timeline_states_collection()
            self.projects_collection = get_projects_collection()
            self.audit_logs_collection = get_audit_logs_collection()
        except Exception as e:
            logger.error(f"Failed to initialize collections: {e}")
            raise DatabaseError(f"Failed to initialize collections: {e}")
    
    @retry_database_operation(max_retries=3)
    async def save_timeline_state(self, timeline_data: TimelineStateCreate, user_id: str) -> TimelineStateDocument:
        """Save a new timeline state"""
        with ErrorContext("save_timeline_state", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.timeline_states_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project exists and user has access
            project = await self._validate_project_access(timeline_data.project_id, user_id)
            if not project:
                raise ValidationError(f"Project {timeline_data.project_id} not found or access denied")
            
            # Mark previous states as not current
            await self.timeline_states_collection.update_many(
                {"project_id": timeline_data.project_id, "is_current": True},
                {"$set": {"is_current": False, "updated_at": datetime.now()}}
            )
            
            # Get next version number
            latest_state = await self.timeline_states_collection.find_one(
                {"project_id": timeline_data.project_id},
                sort=[("version", -1)]
            )
            next_version = (latest_state.get("version", 0) + 1) if latest_state else 1
            
            # Create timeline state document
            timeline_doc = {
                "project_id": timeline_data.project_id,
                "timeline_state": timeline_data.timeline_state.dict(),
                "is_current": True,
                "version": next_version,
                "description": timeline_data.description,
                "created_by": user_id,
                "change_summary": timeline_data.change_summary,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            
            # Insert timeline state
            result = await self.timeline_states_collection.insert_one(timeline_doc)
            timeline_id = str(result.inserted_id)
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.CREATE,
                resource_type="timeline_state",
                resource_id=timeline_id,
                details={
                    "project_id": timeline_data.project_id,
                    "version": next_version,
                    "description": timeline_data.description
                }
            )
            
            # Return created timeline state
            timeline_doc["_id"] = timeline_id
            timeline_state = TimelineStateDocument(**timeline_doc)
            
            logger.info(f"Saved timeline state {timeline_id} for project {timeline_data.project_id}")
            return timeline_state
    
    @retry_database_operation(max_retries=3)
    async def get_current_timeline_state(self, project_id: str, user_id: str) -> Optional[TimelineStateDocument]:
        """Get the current timeline state for a project"""
        with ErrorContext("get_current_timeline_state", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.timeline_states_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Find current timeline state
            timeline_doc = await self.timeline_states_collection.find_one({
                "project_id": project_id,
                "is_current": True
            })
            
            if not timeline_doc:
                return None
            
            # Convert to TimelineStateDocument with default values for missing fields
            timeline_doc["_id"] = str(timeline_doc["_id"])
            
            # Add default values for missing required fields
            if "created_by" not in timeline_doc:
                timeline_doc["created_by"] = user_id
            if "version" not in timeline_doc:
                timeline_doc["version"] = 1
            if "is_current" not in timeline_doc:
                timeline_doc["is_current"] = True
                
            timeline_state = TimelineStateDocument(**timeline_doc)
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.VIEW,
                resource_type="timeline_state",
                resource_id=timeline_state.id,
                details={"project_id": project_id}
            )
            
            return timeline_state
    
    @retry_database_operation(max_retries=3)
    async def get_timeline_state_by_version(self, project_id: str, version: int, user_id: str) -> Optional[TimelineStateDocument]:
        """Get a specific timeline state by version"""
        with ErrorContext("get_timeline_state_by_version", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.timeline_states_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Find timeline state by version
            timeline_doc = await self.timeline_states_collection.find_one({
                "project_id": project_id,
                "version": version
            })
            
            if not timeline_doc:
                return None
            
            # Convert to TimelineStateDocument with default values for missing fields
            timeline_doc["_id"] = str(timeline_doc["_id"])
            
            # Add default values for missing required fields
            if "created_by" not in timeline_doc:
                timeline_doc["created_by"] = user_id
            if "version" not in timeline_doc:
                timeline_doc["version"] = version
            if "is_current" not in timeline_doc:
                timeline_doc["is_current"] = False
                
            timeline_state = TimelineStateDocument(**timeline_doc)
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.VIEW,
                resource_type="timeline_state",
                resource_id=timeline_state.id,
                details={"project_id": project_id, "version": version}
            )
            
            return timeline_state
    
    @retry_database_operation(max_retries=3)
    async def get_timeline_history(self, project_id: str, user_id: str, limit: int = 20, skip: int = 0) -> List[TimelineStateDocument]:
        """Get timeline state history for a project"""
        with ErrorContext("get_timeline_history", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.timeline_states_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Find timeline states
            cursor = self.timeline_states_collection.find(
                {"project_id": project_id}
            ).sort("version", -1).skip(skip).limit(limit)
            
            timeline_states = []
            async for timeline_doc in cursor:
                timeline_doc["_id"] = str(timeline_doc["_id"])
                timeline_states.append(TimelineStateDocument(**timeline_doc))
            
            return timeline_states
    
    @retry_database_operation(max_retries=3)
    async def update_timeline_state(self, timeline_id: str, timeline_data: TimelineStateUpdate, user_id: str) -> Optional[TimelineStateDocument]:
        """Update a timeline state"""
        with ErrorContext("update_timeline_state", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.timeline_states_collection is None:
                raise DatabaseError("Database not available")
            
            # Get existing timeline state
            existing_timeline = await self.timeline_states_collection.find_one({
                "_id": ObjectId(timeline_id)
            })
            
            if not existing_timeline:
                return None
            
            # Validate project access
            project = await self._validate_project_access(existing_timeline["project_id"], user_id)
            if not project:
                raise ValidationError(f"Project {existing_timeline['project_id']} not found or access denied")
            
            # Prepare update data
            update_data = {
                "updated_at": datetime.now()
            }
            
            if timeline_data.timeline_state is not None:
                update_data["timeline_state"] = timeline_data.timeline_state.dict()
            if timeline_data.description is not None:
                update_data["description"] = timeline_data.description
            if timeline_data.change_summary is not None:
                update_data["change_summary"] = timeline_data.change_summary
            
            # Update timeline state
            result = await self.timeline_states_collection.update_one(
                {"_id": ObjectId(timeline_id)},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to update timeline state")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="timeline_state",
                resource_id=timeline_id,
                details=update_data
            )
            
            # Return updated timeline state
            return await self.get_timeline_state_by_id(timeline_id, user_id)
    
    @retry_database_operation(max_retries=3)
    async def get_timeline_state_by_id(self, timeline_id: str, user_id: str) -> Optional[TimelineStateDocument]:
        """Get a timeline state by ID"""
        with ErrorContext("get_timeline_state_by_id", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.timeline_states_collection is None:
                raise DatabaseError("Database not available")
            
            # Find timeline state
            timeline_doc = await self.timeline_states_collection.find_one({
                "_id": ObjectId(timeline_id)
            })
            
            if not timeline_doc:
                return None
            
            # Validate project access
            project = await self._validate_project_access(timeline_doc["project_id"], user_id)
            if not project:
                raise ValidationError(f"Project {timeline_doc['project_id']} not found or access denied")
            
            # Convert to TimelineStateDocument
            timeline_doc["_id"] = str(timeline_doc["_id"])
            timeline_state = TimelineStateDocument(**timeline_doc)
            
            return timeline_state
    
    @retry_database_operation(max_retries=3)
    async def restore_timeline_state(self, project_id: str, version: int, user_id: str) -> Optional[TimelineStateDocument]:
        """Restore a timeline state to current"""
        with ErrorContext("restore_timeline_state", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.timeline_states_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Get the timeline state to restore
            timeline_to_restore = await self.get_timeline_state_by_version(project_id, version, user_id)
            if not timeline_to_restore:
                return None
            
            # Mark all current states as not current
            await self.timeline_states_collection.update_many(
                {"project_id": project_id, "is_current": True},
                {"$set": {"is_current": False, "updated_at": datetime.now()}}
            )
            
            # Mark the restored state as current
            result = await self.timeline_states_collection.update_one(
                {"_id": ObjectId(timeline_to_restore.id)},
                {
                    "$set": {
                        "is_current": True,
                        "updated_at": datetime.now()
                    }
                }
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to restore timeline state")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="timeline_state",
                resource_id=timeline_to_restore.id,
                details={
                    "action": "restore",
                    "project_id": project_id,
                    "version": version
                }
            )
            
            logger.info(f"Restored timeline state version {version} for project {project_id}")
            return timeline_to_restore
    
    @retry_database_operation(max_retries=3)
    async def delete_timeline_state(self, timeline_id: str, user_id: str) -> bool:
        """Delete a timeline state"""
        with ErrorContext("delete_timeline_state", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.timeline_states_collection is None:
                raise DatabaseError("Database not available")
            
            # Get existing timeline state
            existing_timeline = await self.timeline_states_collection.find_one({
                "_id": ObjectId(timeline_id)
            })
            
            if not existing_timeline:
                return False
            
            # Validate project access
            project = await self._validate_project_access(existing_timeline["project_id"], user_id)
            if not project:
                raise ValidationError(f"Project {existing_timeline['project_id']} not found or access denied")
            
            # Don't allow deletion of current state
            if existing_timeline.get("is_current", False):
                raise ValidationError("Cannot delete current timeline state")
            
            # Delete timeline state
            result = await self.timeline_states_collection.delete_one({
                "_id": ObjectId(timeline_id)
            })
            
            if result.deleted_count == 0:
                raise OperationError("Failed to delete timeline state")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.DELETE,
                resource_type="timeline_state",
                resource_id=timeline_id,
                details={
                    "project_id": existing_timeline["project_id"],
                    "version": existing_timeline["version"]
                }
            )
            
            logger.info(f"Deleted timeline state {timeline_id}")
            return True
    
    async def _validate_project_access(self, project_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Validate that user has access to project"""
        if self.projects_collection is None:
            return None
        
        # Find project
        project_doc = await self.projects_collection.find_one({
            "_id": ObjectId(project_id),
            "is_deleted": False
        })
        
        if not project_doc:
            return None
        
        # Check permissions
        if not self._has_project_access(project_doc, user_id):
            return None
        
        return project_doc
    
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


# Global timeline service instance
timeline_service = TimelineService()

