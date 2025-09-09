"""
Authentication Middleware
"""
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging
from bson import ObjectId

from services.jwt_service import jwt_service
from services.database import get_users_collection
from models.user_schemas import UserDocument, UserRole
from utils.error_handlers import handle_database_error, get_user_friendly_message

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()

class AuthMiddleware:
    """Authentication middleware for protected routes"""
    
    @staticmethod
    async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserDocument:
        """Get current user from JWT token"""
        token = credentials.credentials
        
        # Verify token
        payload = jwt_service.verify_access_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Extract user ID
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        try:
            users_collection = get_users_collection()
            # Convert string ID to ObjectId for database query
            user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
            
            if not user_doc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Convert to UserDocument
            user_doc["_id"] = str(user_doc["_id"])
            user = UserDocument(**user_doc)
            
            # Check if user is active
            if user.status != "active":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User account is not active",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get current user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to authenticate user"
            )
    
    @staticmethod
    async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
        """Get current user ID from JWT token (lightweight version)"""
        token = credentials.credentials
        
        # Verify token
        payload = jwt_service.verify_access_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Extract user ID
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_id
    
    @staticmethod
    async def get_current_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserDocument:
        """Get current admin user from JWT token"""
        user = await AuthMiddleware.get_current_user(credentials)
        
        if user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return user
    
    @staticmethod
    async def get_optional_user(request: Request) -> Optional[UserDocument]:
        """Get current user if token is provided, otherwise return None"""
        try:
            # Extract token from Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return None
            
            token = auth_header.split(" ")[1]
            
            # Verify token
            payload = jwt_service.verify_access_token(token)
            if not payload:
                return None
            
            # Extract user ID
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            # Get user from database
            users_collection = get_users_collection()
            # Convert string ID to ObjectId for database query
            user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
            
            if not user_doc:
                return None
            
            # Convert to UserDocument
            user_doc["_id"] = str(user_doc["_id"])
            user = UserDocument(**user_doc)
            
            # Check if user is active
            if user.status != "active":
                return None
            
            return user
            
        except Exception as e:
            logger.debug(f"Optional user authentication failed: {e}")
            return None

# Dependency functions for FastAPI
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserDocument:
    """Dependency to get current authenticated user"""
    return await AuthMiddleware.get_current_user(credentials)

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Dependency to get current user ID"""
    return await AuthMiddleware.get_current_user_id(credentials)

async def get_current_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserDocument:
    """Dependency to get current admin user"""
    return await AuthMiddleware.get_current_admin_user(credentials)

async def get_optional_user(request: Request) -> Optional[UserDocument]:
    """Dependency to get optional user (for public endpoints that can benefit from user context)"""
    return await AuthMiddleware.get_optional_user(request)

# Role-based access control
def require_role(required_role: UserRole):
    """Decorator to require specific role"""
    async def role_checker(user: UserDocument = Depends(get_current_user)) -> UserDocument:
        if user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{required_role.value} access required"
            )
        return user
    return role_checker

# Specific role dependencies
require_admin = require_role(UserRole.ADMIN)
require_user = require_role(UserRole.USER)
