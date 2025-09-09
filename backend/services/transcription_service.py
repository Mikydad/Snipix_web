"""
Transcription Data Management Service for MongoDB Integration
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from models.schemas import (
    TranscriptionDocument, TranscriptionCreate, TranscriptionUpdate,
    TranscriptSegment, TranscriptWord,
    AuditLog, AuditLogCreate, AuditLogAction
)
from services.database import (
    get_transcriptions_collection, get_projects_collection, get_audit_logs_collection,
    is_db_available
)
from utils.error_handlers import (
    retry_database_operation, ErrorContext, handle_database_error,
    DatabaseError, ValidationError, OperationError
)
from utils.retry_decorator import resilient_operation

logger = logging.getLogger(__name__)


class TranscriptionService:
    """Service for managing transcription data with MongoDB integration"""
    
    def __init__(self):
        self.transcriptions_collection = None
        self.projects_collection = None
        self.audit_logs_collection = None
        self._ensure_collections()
    
    def _ensure_collections(self):
        """Ensure database collections are available"""
        if not is_db_available():
            logger.warning("Database not available, running in offline mode")
            return
        
        try:
            self.transcriptions_collection = get_transcriptions_collection()
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
            self.transcriptions_collection = get_transcriptions_collection()
            self.projects_collection = get_projects_collection()
            self.audit_logs_collection = get_audit_logs_collection()
        except Exception as e:
            logger.error(f"Failed to initialize collections: {e}")
            raise DatabaseError(f"Failed to initialize collections: {e}")
    
    @retry_database_operation(max_retries=3)
    async def create_transcription(self, transcription_data: TranscriptionCreate, user_id: str) -> TranscriptionDocument:
        """Create a new transcription document"""
        with ErrorContext("create_transcription", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.transcriptions_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project exists and user has access
            project = await self._validate_project_access(transcription_data.project_id, user_id)
            if not project:
                raise ValidationError(f"Project {transcription_data.project_id} not found or access denied")
            
            # Check if transcription already exists for this project
            existing_transcription = await self.transcriptions_collection.find_one({
                "project_id": transcription_data.project_id
            })
            
            if existing_transcription:
                raise ValidationError(f"Transcription already exists for project {transcription_data.project_id}")
            
            # Create transcription document
            transcription_doc = {
                "project_id": transcription_data.project_id,
                "segments": [],
                "language": transcription_data.language or "en",
                "model_used": transcription_data.model_used,
                "processing_time": None,
                "confidence_score": None,
                "is_complete": False,
                "is_edited": False,
                "speaker_count": 1,
                "speakers": {},
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            
            # Insert transcription
            result = await self.transcriptions_collection.insert_one(transcription_doc)
            transcription_id = str(result.inserted_id)
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.CREATE,
                resource_type="transcription",
                resource_id=transcription_id,
                details={
                    "project_id": transcription_data.project_id,
                    "language": transcription_data.language
                }
            )
            
            # Return created transcription
            transcription_doc["_id"] = transcription_id
            transcription = TranscriptionDocument(**transcription_doc)
            
            logger.info(f"Created transcription {transcription_id} for project {transcription_data.project_id}")
            return transcription
    
    @retry_database_operation(max_retries=3)
    async def get_transcription(self, project_id: str, user_id: str) -> Optional[TranscriptionDocument]:
        """Get transcription for a project"""
        with ErrorContext("get_transcription", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.transcriptions_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Find transcription
            transcription_doc = await self.transcriptions_collection.find_one({
                "project_id": project_id
            })
            
            if not transcription_doc:
                return None
            
            # Convert to TranscriptionDocument
            transcription_doc["_id"] = str(transcription_doc["_id"])
            transcription = TranscriptionDocument(**transcription_doc)
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.VIEW,
                resource_type="transcription",
                resource_id=transcription.id,
                details={"project_id": project_id}
            )
            
            return transcription
    
    @retry_database_operation(max_retries=3)
    async def update_transcription(self, project_id: str, transcription_data: TranscriptionUpdate, user_id: str) -> Optional[TranscriptionDocument]:
        """Update transcription data"""
        with ErrorContext("update_transcription", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.transcriptions_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Find existing transcription
            existing_transcription = await self.transcriptions_collection.find_one({
                "project_id": project_id
            })
            
            if not existing_transcription:
                return None
            
            # Prepare update data
            update_data = {
                "updated_at": datetime.now()
            }
            
            if transcription_data.segments is not None:
                update_data["segments"] = [segment.dict() for segment in transcription_data.segments]
            if transcription_data.is_edited is not None:
                update_data["is_edited"] = transcription_data.is_edited
            if transcription_data.speakers is not None:
                update_data["speakers"] = transcription_data.speakers
            
            # Update transcription
            result = await self.transcriptions_collection.update_one(
                {"project_id": project_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to update transcription")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="transcription",
                resource_id=str(existing_transcription["_id"]),
                details=update_data
            )
            
            # Return updated transcription
            return await self.get_transcription(project_id, user_id)
    
    @retry_database_operation(max_retries=3)
    async def add_transcription_segments(self, project_id: str, segments: List[TranscriptSegment], user_id: str) -> Optional[TranscriptionDocument]:
        """Add transcription segments to existing transcription"""
        with ErrorContext("add_transcription_segments", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.transcriptions_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Find existing transcription
            existing_transcription = await self.transcriptions_collection.find_one({
                "project_id": project_id
            })
            
            if not existing_transcription:
                raise ValidationError(f"Transcription not found for project {project_id}")
            
            # Add new segments
            new_segments = [segment.dict() for segment in segments]
            
            result = await self.transcriptions_collection.update_one(
                {"project_id": project_id},
                {
                    "$push": {"segments": {"$each": new_segments}},
                    "$set": {
                        "updated_at": datetime.now(),
                        "is_complete": True  # Mark as complete when segments are added
                    }
                }
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to add transcription segments")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="transcription",
                resource_id=str(existing_transcription["_id"]),
                details={
                    "action": "add_segments",
                    "segment_count": len(segments)
                }
            )
            
            logger.info(f"Added {len(segments)} segments to transcription for project {project_id}")
            return await self.get_transcription(project_id, user_id)
    
    @retry_database_operation(max_retries=3)
    async def update_transcription_segment(self, project_id: str, segment_id: str, updated_segment: TranscriptSegment, user_id: str) -> Optional[TranscriptionDocument]:
        """Update a specific transcription segment"""
        with ErrorContext("update_transcription_segment", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.transcriptions_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Update specific segment
            result = await self.transcriptions_collection.update_one(
                {
                    "project_id": project_id,
                    "segments.id": segment_id
                },
                {
                    "$set": {
                        "segments.$.start_time": updated_segment.start_time,
                        "segments.$.end_time": updated_segment.end_time,
                        "segments.$.text": updated_segment.text,
                        "segments.$.words": [word.dict() for word in updated_segment.words],
                        "segments.$.speaker_id": updated_segment.speaker_id,
                        "segments.$.confidence": updated_segment.confidence,
                        "segments.$.is_edited": updated_segment.is_edited,
                        "segments.$.edited_text": updated_segment.edited_text,
                        "updated_at": datetime.now(),
                        "is_edited": True
                    }
                }
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to update transcription segment")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="transcription",
                resource_id=project_id,
                details={
                    "action": "update_segment",
                    "segment_id": segment_id
                }
            )
            
            logger.info(f"Updated segment {segment_id} in transcription for project {project_id}")
            return await self.get_transcription(project_id, user_id)
    
    @retry_database_operation(max_retries=3)
    async def delete_transcription_segment(self, project_id: str, segment_id: str, user_id: str) -> Optional[TranscriptionDocument]:
        """Delete a specific transcription segment"""
        with ErrorContext("delete_transcription_segment", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.transcriptions_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Remove specific segment
            result = await self.transcriptions_collection.update_one(
                {"project_id": project_id},
                {
                    "$pull": {"segments": {"id": segment_id}},
                    "$set": {
                        "updated_at": datetime.now(),
                        "is_edited": True
                    }
                }
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to delete transcription segment")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="transcription",
                resource_id=project_id,
                details={
                    "action": "delete_segment",
                    "segment_id": segment_id
                }
            )
            
            logger.info(f"Deleted segment {segment_id} from transcription for project {project_id}")
            return await self.get_transcription(project_id, user_id)
    
    @retry_database_operation(max_retries=3)
    async def set_transcription_metadata(self, project_id: str, metadata: Dict[str, Any], user_id: str) -> Optional[TranscriptionDocument]:
        """Set transcription metadata (processing time, confidence score, etc.)"""
        with ErrorContext("set_transcription_metadata", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.transcriptions_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Update metadata
            update_data = {
                "updated_at": datetime.now()
            }
            
            if "processing_time" in metadata:
                update_data["processing_time"] = metadata["processing_time"]
            if "confidence_score" in metadata:
                update_data["confidence_score"] = metadata["confidence_score"]
            if "model_used" in metadata:
                update_data["model_used"] = metadata["model_used"]
            if "speaker_count" in metadata:
                update_data["speaker_count"] = metadata["speaker_count"]
            if "speakers" in metadata:
                update_data["speakers"] = metadata["speakers"]
            
            result = await self.transcriptions_collection.update_one(
                {"project_id": project_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise OperationError("Failed to update transcription metadata")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.UPDATE,
                resource_type="transcription",
                resource_id=project_id,
                details={
                    "action": "update_metadata",
                    "metadata": metadata
                }
            )
            
            logger.info(f"Updated transcription metadata for project {project_id}")
            return await self.get_transcription(project_id, user_id)
    
    @retry_database_operation(max_retries=3)
    async def delete_transcription(self, project_id: str, user_id: str) -> bool:
        """Delete transcription for a project"""
        with ErrorContext("delete_transcription", user_id) as ctx:
            # Ensure collections are available
            await self._ensure_collections_async()
            
            if self.transcriptions_collection is None:
                raise DatabaseError("Database not available")
            
            # Validate project access
            project = await self._validate_project_access(project_id, user_id)
            if not project:
                raise ValidationError(f"Project {project_id} not found or access denied")
            
            # Find existing transcription
            existing_transcription = await self.transcriptions_collection.find_one({
                "project_id": project_id
            })
            
            if not existing_transcription:
                return False
            
            # Delete transcription
            result = await self.transcriptions_collection.delete_one({
                "project_id": project_id
            })
            
            if result.deleted_count == 0:
                raise OperationError("Failed to delete transcription")
            
            # Create audit log
            await self._create_audit_log(
                user_id=user_id,
                action=AuditLogAction.DELETE,
                resource_type="transcription",
                resource_id=str(existing_transcription["_id"]),
                details={"project_id": project_id}
            )
            
            logger.info(f"Deleted transcription for project {project_id}")
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


# Global transcription service instance
transcription_service = TranscriptionService()

