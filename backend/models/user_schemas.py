"""
User Authentication Models and Schemas
"""
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId
import uuid

from models.schemas import BaseSchema, MongoDBBaseSchema, VersionedSchema

# User Enums
class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"

class AuthProvider(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"

# User Base Models
class UserBase(BaseSchema):
    email: EmailStr
    name: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE
    auth_provider: AuthProvider = AuthProvider.EMAIL
    is_email_verified: bool = False
    last_login: Optional[datetime] = None
    login_count: int = 0
    total_session_time: int = 0  # in minutes
    preferences: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('username')
    def validate_username(cls, v):
        if v is not None:
            if len(v) < 3:
                raise ValueError('Username must be at least 3 characters long')
            if not v.replace('_', '').replace('-', '').isalnum():
                raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v

class UserCreate(UserBase):
    password: str
    confirm_password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class UserUpdate(BaseSchema):
    name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    
    @validator('username')
    def validate_username(cls, v):
        if v is not None:
            if len(v) < 3:
                raise ValueError('Username must be at least 3 characters long')
            if not v.replace('_', '').replace('-', '').isalnum():
                raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

# MongoDB User Document
class UserDocument(MongoDBBaseSchema):
    email: EmailStr
    name: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE
    auth_provider: AuthProvider = AuthProvider.EMAIL
    is_email_verified: bool = False
    password_hash: Optional[str] = None  # Only for email auth
    google_id: Optional[str] = None  # Only for Google auth
    last_login: Optional[datetime] = None
    login_count: int = 0
    total_session_time: int = 0  # in minutes
    preferences: Dict[str, Any] = Field(default_factory=dict)
    email_verification_token: Optional[str] = None
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None
    
    @validator('username')
    def validate_username(cls, v):
        if v is not None:
            if len(v) < 3:
                raise ValueError('Username must be at least 3 characters long')
            if not v.replace('_', '').replace('-', '').isalnum():
                raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v

# Authentication Models
class LoginRequest(BaseSchema):
    email: EmailStr
    password: str
    remember_me: bool = False

class GoogleAuthRequest(BaseSchema):
    token: str
    remember_me: bool = False

class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RefreshTokenRequest(BaseSchema):
    refresh_token: str

class PasswordResetRequest(BaseSchema):
    email: EmailStr

class PasswordResetConfirm(BaseSchema):
    token: str
    new_password: str
    confirm_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

class EmailVerificationRequest(BaseSchema):
    token: str

# Admin Models
class AdminUserStats(BaseSchema):
    total_users: int
    active_users: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int

class UserAnalytics(BaseSchema):
    user_id: str
    email: str
    name: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    last_login: Optional[datetime]
    login_count: int
    total_session_time: int
    project_count: int
    total_storage_used: int  # in bytes

class AdminDashboardData(BaseSchema):
    user_stats: AdminUserStats
    user_analytics: List[UserAnalytics]
    system_health: Dict[str, Any]

# Session Models
class SessionData(BaseSchema):
    user_id: str
    session_id: str
    created_at: datetime
    expires_at: datetime
    is_active: bool = True
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class SessionCreate(BaseSchema):
    user_id: str
    expires_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
