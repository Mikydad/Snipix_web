"""
Data Migration Service for MongoDB Integration
"""
import logging
import json
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import uuid

from models.schemas import (
    Project, ProjectCreate, TimelineStateCreate, TranscriptionCreate,
    TimelineState, TranscriptSegment, TranscriptWord
)
from services.project_service import project_service
from services.timeline_service import timeline_service
from services.transcription_service import transcription_service
from services.database import init_db, get_users_collection
from utils.error_handlers import ErrorContext, handle_database_error

logger = logging.getLogger(__name__)


class MigrationService:
    """Service for migrating data from simple API to MongoDB"""
    
    def __init__(self):
        self.migration_log = []
        self.errors = []
        self.stats = {
            "projects_migrated": 0,
            "timeline_states_migrated": 0,
            "transcriptions_migrated": 0,
            "errors": 0,
            "start_time": None,
            "end_time": None
        }
    
    async def migrate_from_simple_api(self, data_file_path: str, target_user_id: str) -> Dict[str, Any]:
        """Migrate data from simple API JSON file to MongoDB"""
        with ErrorContext("migrate_from_simple_api", target_user_id) as ctx:
            self.stats["start_time"] = datetime.now()
            
            try:
                # Load data from file
                data = await self._load_simple_api_data(data_file_path)
                logger.info(f"Loaded {len(data.get('projects', []))} projects from simple API")
                
                # Migrate projects
                migrated_projects = await self._migrate_projects(data.get("projects", []), target_user_id)
                
                # Migrate timeline states
                migrated_timeline_states = await self._migrate_timeline_states(
                    data.get("timeline_states", []), migrated_projects
                )
                
                # Migrate transcriptions
                migrated_transcriptions = await self._migrate_transcriptions(
                    data.get("transcriptions", []), migrated_projects
                )
                
                self.stats["end_time"] = datetime.now()
                self.stats["projects_migrated"] = len(migrated_projects)
                self.stats["timeline_states_migrated"] = len(migrated_timeline_states)
                self.stats["transcriptions_migrated"] = len(migrated_transcriptions)
                
                migration_result = {
                    "success": True,
                    "stats": self.stats,
                    "migrated_projects": migrated_projects,
                    "migrated_timeline_states": migrated_timeline_states,
                    "migrated_transcriptions": migrated_transcriptions,
                    "errors": self.errors,
                    "migration_log": self.migration_log
                }
                
                logger.info(f"Migration completed successfully: {self.stats}")
                return migration_result
                
            except Exception as e:
                self.stats["end_time"] = datetime.now()
                self.stats["errors"] += 1
                error = handle_database_error(e, "migrate_from_simple_api")
                self.errors.append(str(error))
                
                logger.error(f"Migration failed: {e}")
                return {
                    "success": False,
                    "stats": self.stats,
                    "errors": self.errors,
                    "migration_log": self.migration_log
                }
    
    async def _load_simple_api_data(self, file_path: str) -> Dict[str, Any]:
        """Load data from simple API JSON file"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            self.migration_log.append(f"Loaded data from {file_path}")
            return data
            
        except FileNotFoundError:
            raise Exception(f"Data file not found: {file_path}")
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON in data file: {e}")
        except Exception as e:
            raise Exception(f"Failed to load data file: {e}")
    
    async def _migrate_projects(self, projects_data: List[Dict[str, Any]], user_id: str) -> List[str]:
        """Migrate projects from simple API format to MongoDB"""
        migrated_project_ids = []
        
        for project_data in projects_data:
            try:
                # Convert simple API format to ProjectCreate
                project_create = ProjectCreate(
                    name=project_data.get("name", "Migrated Project"),
                    description=project_data.get("description", "Migrated from simple API")
                )
                
                # Create project in MongoDB
                project = await project_service.create_project(project_create, user_id)
                migrated_project_ids.append(project.id)
                
                # Update project with additional data if available
                if project_data.get("duration") or project_data.get("thumbnail"):
                    from models.schemas import ProjectUpdate
                    update_data = ProjectUpdate()
                    
                    if project_data.get("duration"):
                        update_data.duration = float(project_data["duration"])
                    if project_data.get("thumbnail"):
                        update_data.thumbnail = project_data["thumbnail"]
                    
                    await project_service.update_project(project.id, update_data, user_id)
                
                self.migration_log.append(f"Migrated project: {project.name} -> {project.id}")
                
            except Exception as e:
                error_msg = f"Failed to migrate project {project_data.get('name', 'unknown')}: {e}"
                self.errors.append(error_msg)
                self.stats["errors"] += 1
                logger.error(error_msg)
        
        return migrated_project_ids
    
    async def _migrate_timeline_states(self, timeline_states_data: List[Dict[str, Any]], project_ids: List[str]) -> List[str]:
        """Migrate timeline states from simple API format to MongoDB"""
        migrated_timeline_state_ids = []
        
        for i, timeline_data in enumerate(timeline_states_data):
            try:
                # Get corresponding project ID
                project_id = project_ids[i] if i < len(project_ids) else project_ids[0]
                
                # Convert timeline data to TimelineState
                timeline_state = self._convert_timeline_data(timeline_data)
                
                # Create timeline state in MongoDB
                timeline_create = TimelineStateCreate(
                    project_id=project_id,
                    timeline_state=timeline_state,
                    description="Migrated from simple API",
                    change_summary="Initial migration"
                )
                
                timeline_state_doc = await timeline_service.save_timeline_state(timeline_create, "migration_user")
                migrated_timeline_state_ids.append(timeline_state_doc.id)
                
                self.migration_log.append(f"Migrated timeline state for project {project_id}")
                
            except Exception as e:
                error_msg = f"Failed to migrate timeline state {i}: {e}"
                self.errors.append(error_msg)
                self.stats["errors"] += 1
                logger.error(error_msg)
        
        return migrated_timeline_state_ids
    
    async def _migrate_transcriptions(self, transcriptions_data: List[Dict[str, Any]], project_ids: List[str]) -> List[str]:
        """Migrate transcriptions from simple API format to MongoDB"""
        migrated_transcription_ids = []
        
        for i, transcription_data in enumerate(transcriptions_data):
            try:
                # Get corresponding project ID
                project_id = project_ids[i] if i < len(project_ids) else project_ids[0]
                
                # Create transcription in MongoDB
                transcription_create = TranscriptionCreate(
                    project_id=project_id,
                    language="en",
                    model_used="migration"
                )
                
                transcription = await transcription_service.create_transcription(transcription_create, "migration_user")
                
                # Add segments if available
                if transcription_data.get("words"):
                    segments = self._convert_transcription_data(transcription_data)
                    if segments:
                        await transcription_service.add_transcription_segments(project_id, segments, "migration_user")
                
                migrated_transcription_ids.append(transcription.id)
                
                self.migration_log.append(f"Migrated transcription for project {project_id}")
                
            except Exception as e:
                error_msg = f"Failed to migrate transcription {i}: {e}"
                self.errors.append(error_msg)
                self.stats["errors"] += 1
                logger.error(error_msg)
        
        return migrated_transcription_ids
    
    def _convert_timeline_data(self, timeline_data: Dict[str, Any]) -> TimelineState:
        """Convert simple API timeline data to TimelineState"""
        # Create a basic timeline state
        timeline_state = TimelineState(
            layers=[],
            playhead_time=timeline_data.get("playhead_time", 0.0),
            zoom=timeline_data.get("zoom", 1.0),
            duration=timeline_data.get("duration", 0.0),
            markers=[],
            selected_clips=[],
            is_playing=False,
            is_snapping=True
        )
        
        return timeline_state
    
    def _convert_transcription_data(self, transcription_data: Dict[str, Any]) -> List[TranscriptSegment]:
        """Convert simple API transcription data to TranscriptSegment list"""
        segments = []
        
        words_data = transcription_data.get("words", [])
        if not words_data:
            return segments
        
        # Group words into segments (simple grouping by time)
        current_segment_words = []
        current_start = None
        current_end = None
        
        for word_data in words_data:
            word = TranscriptWord(
                text=word_data.get("text", ""),
                start=word_data.get("start", 0.0),
                end=word_data.get("end", 0.0),
                confidence=word_data.get("confidence", 0.0),
                is_filler=word_data.get("is_filler", False)
            )
            
            if current_start is None:
                current_start = word.start
            
            current_end = word.end
            current_segment_words.append(word)
            
            # Create segment every 10 words or at end
            if len(current_segment_words) >= 10 or word == words_data[-1]:
                segment_text = " ".join([w.text for w in current_segment_words])
                
                segment = TranscriptSegment(
                    id=str(uuid.uuid4()),
                    start_time=current_start,
                    end_time=current_end,
                    text=segment_text,
                    words=current_segment_words,
                    confidence=sum([w.confidence for w in current_segment_words]) / len(current_segment_words),
                    is_edited=False
                )
                
                segments.append(segment)
                current_segment_words = []
                current_start = None
                current_end = None
        
        return segments
    
    async def export_to_simple_api_format(self, user_id: str, output_file_path: str) -> Dict[str, Any]:
        """Export MongoDB data to simple API format"""
        with ErrorContext("export_to_simple_api_format", user_id) as ctx:
            try:
                # Get all projects for user
                projects = await project_service.get_projects(user_id)
                
                export_data = {
                    "projects": [],
                    "timeline_states": [],
                    "transcriptions": [],
                    "export_timestamp": datetime.now().isoformat(),
                    "user_id": user_id
                }
                
                # Export projects
                for project in projects:
                    project_data = {
                        "_id": project.id,
                        "name": project.name,
                        "description": project.description,
                        "user_id": project.user_id,
                        "created_at": project.created_at.isoformat(),
                        "updated_at": project.updated_at.isoformat(),
                        "thumbnail": project.thumbnail,
                        "duration": project.duration
                    }
                    export_data["projects"].append(project_data)
                    
                    # Export timeline states for this project
                    try:
                        timeline_state = await timeline_service.get_current_timeline_state(project.id, user_id)
                        if timeline_state:
                            timeline_data = {
                                "project_id": project.id,
                                "timeline_state": timeline_state.timeline_state.dict(),
                                "version": timeline_state.version,
                                "created_at": timeline_state.created_at.isoformat()
                            }
                            export_data["timeline_states"].append(timeline_data)
                    except Exception as e:
                        logger.warning(f"Failed to export timeline state for project {project.id}: {e}")
                    
                    # Export transcription for this project
                    try:
                        transcription = await transcription_service.get_transcription(project.id, user_id)
                        if transcription:
                            transcription_data = {
                                "project_id": project.id,
                                "language": transcription.language,
                                "segments": [segment.dict() for segment in transcription.segments],
                                "created_at": transcription.created_at.isoformat()
                            }
                            export_data["transcriptions"].append(transcription_data)
                    except Exception as e:
                        logger.warning(f"Failed to export transcription for project {project.id}: {e}")
                
                # Save to file
                with open(output_file_path, 'w') as f:
                    json.dump(export_data, f, indent=2, default=str)
                
                logger.info(f"Exported {len(projects)} projects to {output_file_path}")
                
                return {
                    "success": True,
                    "exported_projects": len(projects),
                    "exported_timeline_states": len(export_data["timeline_states"]),
                    "exported_transcriptions": len(export_data["transcriptions"]),
                    "output_file": output_file_path
                }
                
            except Exception as e:
                error = handle_database_error(e, "export_to_simple_api_format")
                logger.error(f"Export failed: {e}")
                return {
                    "success": False,
                    "error": str(error)
                }
    
    def get_migration_stats(self) -> Dict[str, Any]:
        """Get migration statistics"""
        return {
            "stats": self.stats,
            "errors": self.errors,
            "migration_log": self.migration_log
        }


# Global migration service instance
migration_service = MigrationService()

