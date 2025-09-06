from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Generic, TypeVar
from datetime import datetime
from enum import Enum

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
            datetime: lambda v: v.isoformat()
        }

# User models
class UserBase(BaseSchema):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True

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

class Project(ProjectBase):
    id: str = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    timeline_state: Optional[Dict[str, Any]] = None
    transcript_state: Optional[Dict[str, Any]] = None

    class Config:
        allow_population_by_field_name = True

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

# Transcript models
class TranscriptWord(BaseSchema):
    text: str
    start: float
    end: float
    confidence: float
    is_filler: Optional[bool] = False

class TranscriptState(BaseSchema):
    words: List[TranscriptWord] = Field(default_factory=list)
    selected_words: List[str] = Field(default_factory=list)

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
