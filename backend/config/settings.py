"""
Configuration settings for Snipix Video Editor
"""
import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Application settings
    app_name: str = "Snipix Video Editor"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    
    # MongoDB Atlas settings
    mongodb_url: str = Field(env="MONGODB_URL", default="mongodb://localhost:27017")
    mongodb_database: str = Field(env="MONGODB_DATABASE", default="snipix")
    mongodb_atlas_cluster: Optional[str] = Field(env="MONGODB_ATLAS_CLUSTER", default=None)
    mongodb_atlas_username: Optional[str] = Field(env="MONGODB_ATLAS_USERNAME", default=None)
    mongodb_atlas_password: Optional[str] = Field(env="MONGODB_ATLAS_PASSWORD", default=None)
    
    # Connection settings
    mongodb_max_pool_size: int = Field(default=100, env="MONGODB_MAX_POOL_SIZE")
    mongodb_min_pool_size: int = Field(default=10, env="MONGODB_MIN_POOL_SIZE")
    mongodb_max_idle_time_ms: int = Field(default=30000, env="MONGODB_MAX_IDLE_TIME_MS")
    mongodb_server_selection_timeout_ms: int = Field(default=5000, env="MONGODB_SERVER_SELECTION_TIMEOUT_MS")
    mongodb_connect_timeout_ms: int = Field(default=10000, env="MONGODB_CONNECT_TIMEOUT_MS")
    mongodb_socket_timeout_ms: int = Field(default=20000, env="MONGODB_SOCKET_TIMEOUT_MS")
    
    # Retry settings
    mongodb_retry_writes: bool = Field(default=True, env="MONGODB_RETRY_WRITES")
    mongodb_retry_reads: bool = Field(default=True, env="MONGODB_RETRY_READS")
    mongodb_max_retry_time: int = Field(default=30, env="MONGODB_MAX_RETRY_TIME")
    
    # Security settings
    mongodb_ssl: bool = Field(default=True, env="MONGODB_SSL")
    mongodb_tls_insecure: bool = Field(default=False, env="MONGODB_TLS_INSECURE")
    
    # Redis settings (for caching)
    redis_url: str = Field(env="REDIS_URL", default="redis://localhost:6379")
    redis_password: Optional[str] = Field(env="REDIS_PASSWORD", default=None)
    redis_db: int = Field(default=0, env="REDIS_DB")
    
    # JWT settings
    secret_key: str = Field(env="SECRET_KEY", default="your-secret-key-change-in-production")
    algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # Media settings
    media_upload_path: str = Field(default="./media", env="MEDIA_UPLOAD_PATH")
    max_file_size: int = Field(default=500 * 1024 * 1024, env="MAX_FILE_SIZE")  # 500MB
    allowed_file_types: list = Field(default=["video/mp4", "video/avi", "video/mov"], env="ALLOWED_FILE_TYPES")
    
    # Logging settings
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: str = Field(default="./logs/application.log", env="LOG_FILE")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from environment


# Global settings instance
settings = Settings()


def get_mongodb_connection_string() -> str:
    """Get MongoDB connection string based on environment"""
    if settings.mongodb_atlas_cluster and settings.mongodb_atlas_username and settings.mongodb_atlas_password:
        # MongoDB Atlas connection
        return f"mongodb+srv://{settings.mongodb_atlas_username}:{settings.mongodb_atlas_password}@{settings.mongodb_atlas_cluster}.mongodb.net/{settings.mongodb_database}?retryWrites=true&w=majority"
    else:
        # Local MongoDB connection
        return settings.mongodb_url


def get_mongodb_connection_options() -> dict:
    """Get MongoDB connection options"""
    options = {
        "maxPoolSize": settings.mongodb_max_pool_size,
        "minPoolSize": settings.mongodb_min_pool_size,
        "maxIdleTimeMS": settings.mongodb_max_idle_time_ms,
        "serverSelectionTimeoutMS": settings.mongodb_server_selection_timeout_ms,
        "connectTimeoutMS": settings.mongodb_connect_timeout_ms,
        "socketTimeoutMS": settings.mongodb_socket_timeout_ms,
        "retryWrites": settings.mongodb_retry_writes,
        "retryReads": settings.mongodb_retry_reads,
    }
    
    # Only add SSL/TLS options if SSL is enabled
    if settings.mongodb_ssl:
        options["ssl"] = settings.mongodb_ssl
        options["tlsInsecure"] = settings.mongodb_tls_insecure
    
    return options