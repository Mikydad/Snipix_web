from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any, Generic, TypeVar, Union
from datetime import datetime
from enum import Enum
from bson import ObjectId
import uuid

# Generic type for API responses
T = TypeVar('T')

# Enums
class ClipType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"
    TEXT = "text"
    EFFECT = "effect"
    OVERLAY = "overlay"

class LayerType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"
    TEXT = "text"
    EFFECT = "effect"
    OVERLAY = "overlay"

# Base models
class BaseSchema(BaseModel):
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            ObjectId: lambda v: str(v)
        }
        validate_by_name = True
        use_enum_values = True

class MongoDBBaseSchema(BaseSchema):
    """Base schema for MongoDB documents with ObjectId support"""
    id: Optional[str] = Field(alias="_id", default_factory=lambda: str(ObjectId()))
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    @validator('id', pre=True, always=True)
    def validate_id(cls, v):
        if v is None:
            return str(ObjectId())
        return str(v) if isinstance(v, ObjectId) else v
    
    def dict(self, **kwargs):
        """Override dict to handle MongoDB-specific fields"""
        data = super().dict(**kwargs)
        if '_id' in data and 'id' in data:
            data['_id'] = data.pop('id')
        return data

class SoftDeleteSchema(MongoDBBaseSchema):
    """Schema with soft delete functionality"""
    is_deleted: bool = Field(default=False)
    deleted_at: Optional[datetime] = None
    
    def soft_delete(self):
        """Mark document as deleted"""
        self.is_deleted = True
        self.deleted_at = datetime.now()
        self.updated_at = datetime.now()

class VersionedSchema(MongoDBBaseSchema):
    """Schema with versioning support"""
    version: int = Field(default=1)
    previous_version_id: Optional[str] = None
    
    def increment_version(self, previous_version_id: Optional[str] = None):
        """Increment version number"""
        self.previous_version_id = previous_version_id
        self.version += 1
        self.updated_at = datetime.now()

# User models
class UserBase(BaseSchema):
    email: EmailStr
    name: str
    username: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseSchema):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class User(MongoDBBaseSchema):
    email: EmailStr
    name: str
    username: Optional[str] = None
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    last_login: Optional[datetime] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)

class UserLogin(BaseSchema):
    email: EmailStr
    password: str

class Token(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    user: User

# Project models
class ProjectBase(BaseSchema):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    video_path: Optional[str] = None
    trimmed_video_path: Optional[str] = None
    trimmed_duration: Optional[float] = None

class Project(SoftDeleteSchema):
    name: str
    description: Optional[str] = None
    user_id: str
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    video_path: Optional[str] = None
    status: str = Field(default="active")  # active, archived, processing
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    collaborators: List[str] = Field(default_factory=list)  # user_ids
    permissions: Dict[str, List[str]] = Field(default_factory=dict)  # user_id -> permissions

# Clip models
class ClipProperties(BaseSchema):
    opacity: Optional[float] = 1.0
    scale: Optional[float] = 1.0
    position: Optional[Dict[str, float]] = {"x": 0, "y": 0}
    rotation: Optional[float] = 0.0

class Keyframe(BaseSchema):
    id: str
    time: float
    property: str
    value: Any
    easing: Optional[str] = "linear"

class Clip(BaseSchema):
    id: str
    type: ClipType
    start_time: float
    end_time: float
    duration: float
    source_path: Optional[str] = None
    content: Optional[str] = None
    properties: ClipProperties = Field(default_factory=ClipProperties)
    keyframes: List[Keyframe] = Field(default_factory=list)

# Layer models
class Layer(BaseSchema):
    id: str
    name: str
    type: LayerType
    clips: List[Clip] = Field(default_factory=list)
    is_visible: bool = True
    is_locked: bool = False
    is_muted: bool = False
    order: int = 0

# Timeline models
class Marker(BaseSchema):
    id: str
    time: float
    label: str
    color: str = "#6366f1"

class TimelineState(BaseSchema):
    layers: List[Layer] = Field(default_factory=list)
    playhead_time: float = 0.0
    zoom: float = 1.0
    duration: float = 0.0
    markers: List[Marker] = Field(default_factory=list)
    selected_clips: List[str] = Field(default_factory=list)
    is_playing: bool = False
    is_snapping: bool = True

# MongoDB Timeline State models
class TimelineStateDocument(VersionedSchema):
    project_id: str
    timeline_state: TimelineState
    is_current: bool = Field(default=True)
    description: Optional[str] = None
    created_by: str  # user_id
    change_summary: Optional[str] = None

class TimelineStateCreate(BaseSchema):
    project_id: str
    timeline_state: TimelineState
    description: Optional[str] = None
    change_summary: Optional[str] = None

class TimelineStateUpdate(BaseSchema):
    timeline_state: Optional[TimelineState] = None
    description: Optional[str] = None
    change_summary: Optional[str] = None

# Transcript models
class TranscriptWord(BaseSchema):
    text: str
    start: float
    end: float
    confidence: float
    is_filler: Optional[bool] = False
    speaker_id: Optional[str] = None

class TranscriptSegment(BaseSchema):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    start_time: float
    end_time: float
    text: str
    words: List[TranscriptWord] = Field(default_factory=list)
    speaker_id: Optional[str] = None
    confidence: float
    is_edited: bool = Field(default=False)
    edited_text: Optional[str] = None

class TranscriptState(BaseSchema):
    words: List[TranscriptWord] = Field(default_factory=list)
    selected_words: List[str] = Field(default_factory=list)

# MongoDB Transcription models
class TranscriptionDocument(MongoDBBaseSchema):
    project_id: str
    segments: List[TranscriptSegment] = Field(default_factory=list)
    language: str = Field(default="en")
    model_used: Optional[str] = None
    processing_time: Optional[float] = None
    confidence_score: Optional[float] = None
    is_complete: bool = Field(default=False)
    is_edited: bool = Field(default=False)
    speaker_count: int = Field(default=1)
    speakers: Dict[str, str] = Field(default_factory=dict)  # speaker_id -> speaker_name

class TranscriptionCreate(BaseSchema):
    project_id: str
    language: Optional[str] = "en"
    model_used: Optional[str] = None

class TranscriptionUpdate(BaseSchema):
    segments: Optional[List[TranscriptSegment]] = None
    is_edited: Optional[bool] = None
    speakers: Optional[Dict[str, str]] = None

# Media models
class UploadResponse(BaseSchema):
    project_id: str
    file_path: str
    duration: float

class TranscribeResponse(BaseSchema):
    transcript: List[TranscriptWord]
    duration: float

class RemoveFillersRequest(BaseSchema):
    project_id: str
    selected_words: Optional[List[str]] = None
    auto_detect: Optional[bool] = False

class RemoveFillersResponse(BaseSchema):
    processed_video_path: str
    removed_segments: List[Dict[str, Any]]

# API Response models
class ApiResponse(BaseSchema, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[str] = None

# Timeline API models
class TimelineSaveRequest(BaseSchema):
    project_id: str
    timeline_state: TimelineState

class TimelineLoadResponse(BaseSchema):
    timeline_state: TimelineState

# Media processing models
class ProcessTrimRequest(BaseSchema):
    project_id: str
    clip_id: str
    start_time: float
    end_time: float

class RenderPreviewRequest(BaseSchema):
    project_id: str
    start_time: float
    end_time: float
    quality: str = "medium"  # low, medium, high

# Hybrid trim models
class VideoSegment(BaseSchema):
    startTime: float
    duration: float

class TrimVideoRequest(BaseSchema):
    project_id: str
    segments: List[VideoSegment]

class TrimVideoResponse(BaseSchema):
    trimmed_video_path: str
    new_duration: float

# User Session models
class UserSession(MongoDBBaseSchema):
    user_id: str
    project_id: Optional[str] = None
    session_data: Dict[str, Any] = Field(default_factory=dict)
    last_accessed: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: Optional[datetime] = None

class UserSessionCreate(BaseSchema):
    user_id: str
    project_id: Optional[str] = None
    session_data: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: Optional[datetime] = None

class UserSessionUpdate(BaseSchema):
    session_data: Optional[Dict[str, Any]] = None
    last_accessed: Optional[datetime] = None
    is_active: Optional[bool] = None

# Audit Log models
class AuditLogAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    SOFT_DELETE = "soft_delete"
    RESTORE = "restore"
    VIEW = "view"
    EXPORT = "export"
    SHARE = "share"
    UPLOAD = "upload"
    PROCESS = "process"

class AuditLog(MongoDBBaseSchema):
    user_id: str
    project_id: Optional[str] = None
    action: AuditLogAction
    resource_type: str  # project, timeline_state, transcription, etc.
    resource_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool = Field(default=True)
    error_message: Optional[str] = None

class AuditLogCreate(BaseSchema):
    user_id: str
    project_id: Optional[str] = None
    action: AuditLogAction
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: Optional[bool] = True
    error_message: Optional[str] = None
