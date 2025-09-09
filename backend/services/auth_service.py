import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
import logging

from services.database import get_users_collection
from models.user_schemas import UserDocument, UserCreate, UserRole, UserStatus, AuthProvider
from services.jwt_service import jwt_service
from utils.password_utils import password_utils

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        # Use environment variables for configuration
        self.access_token_expire_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.refresh_token_expire_days = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return password_utils.hash_password(password)

    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return password_utils.verify_password(password, hashed_password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        return jwt_service.create_access_token(data, expires_delta)

    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token and return payload"""
        return jwt_service.verify_access_token(token)

    async def create_user(self, user_data: UserCreate) -> tuple[Optional[UserDocument], Optional[str]]:
        """Create new user - returns (user, error_message)"""
        try:
            # Ensure database is initialized
            from services.database import init_db, async_db
            if async_db is None:
                await init_db()
            
            users_collection = get_users_collection()
            
            # Check if user already exists by email (case-insensitive)
            existing_user = await users_collection.find_one({"email": {"$regex": f"^{user_data.email}$", "$options": "i"}})
            if existing_user:
                logger.warning(f"User with email {user_data.email} already exists")
                return None, "Email already exists. Please use a different email address."
            
            # Check if username already exists (if provided)
            if user_data.username:
                existing_username = await users_collection.find_one({"username": user_data.username})
                if existing_username:
                    logger.warning(f"Username {user_data.username} already exists")
                    return None, "Username already exists. Please choose a different username."
            
            # Validate password strength
            is_valid, errors = password_utils.validate_password_strength(user_data.password)
            if not is_valid:
                logger.warning(f"Password validation failed: {errors}")
                return None, f"Password validation failed: {', '.join(errors)}"
            
            # Hash password
            password_hash = self.hash_password(user_data.password)
            
            # Create user document
            user_doc = {
                "email": user_data.email,
                "name": user_data.name,
                "username": user_data.username,
                "avatar_url": user_data.avatar_url,
                "role": user_data.role.value,
                "status": user_data.status.value,
                "auth_provider": user_data.auth_provider.value,
                "is_email_verified": user_data.is_email_verified,
                "password_hash": password_hash,
                "last_login": user_data.last_login,
                "login_count": user_data.login_count,
                "total_session_time": user_data.total_session_time,
                "preferences": user_data.preferences,
                "email_verification_token": password_utils.generate_email_verification_token(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert user
            result = await users_collection.insert_one(user_doc)
            user_doc["_id"] = str(result.inserted_id)
            user_doc["id"] = str(result.inserted_id)  # Also set id field for UserDocument
            
            logger.info(f"Created new user: {user_data.email}")
            return UserDocument(**user_doc), None
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return None, f"Failed to create user: {str(e)}"

    async def authenticate_user(self, email: str, password: str) -> Optional[UserDocument]:
        """Authenticate user with email and password"""
        try:
            # Ensure database is initialized
            from services.database import init_db, async_db
            if async_db is None:
                await init_db()
            
            users_collection = get_users_collection()
            
            # Find user by email (case-insensitive)
            user_doc = await users_collection.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
            if not user_doc:
                logger.warning(f"User not found: {email}")
                return None
            
            # Check if user is active
            if user_doc.get("status") != UserStatus.ACTIVE.value:
                logger.warning(f"User account not active: {email}")
                return None
            
            # Verify password
            password_hash = user_doc.get("password_hash")
            if not password_hash or not self.verify_password(password, password_hash):
                logger.warning(f"Invalid password for user: {email}")
                return None
            
            # Update last login
            await users_collection.update_one(
                {"_id": user_doc["_id"]},
                {
                    "$set": {
                        "last_login": datetime.utcnow(),
                        "login_count": user_doc.get("login_count", 0) + 1,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Return user without password
            user_doc["_id"] = str(user_doc["_id"])
            user_doc.pop("password_hash", None)
            
            return UserDocument(**user_doc)
            
        except Exception as e:
            logger.error(f"Failed to authenticate user: {e}")
            return None

    async def get_user_by_id(self, user_id: str) -> Optional[UserDocument]:
        """Get user by ID"""
        try:
            # Ensure database is initialized
            from services.database import init_db, async_db
            if async_db is None:
                await init_db()
            
            users_collection = get_users_collection()
            
            user_doc = await users_collection.find_one({"_id": user_id})
            if not user_doc:
                return None
            
            # Return user without password
            user_doc["_id"] = str(user_doc["_id"])
            user_doc.pop("password_hash", None)
            
            return UserDocument(**user_doc)
            
        except Exception as e:
            logger.error(f"Failed to get user by ID: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[UserDocument]:
        """Get user by email"""
        try:
            # Ensure database is initialized
            from services.database import init_db, async_db
            if async_db is None:
                await init_db()
            
            users_collection = get_users_collection()
            
            user_doc = await users_collection.find_one({"email": email})
            if not user_doc:
                return None
            
            # Return user without password
            user_doc["_id"] = str(user_doc["_id"])
            user_doc.pop("password_hash", None)
            
            return UserDocument(**user_doc)
            
        except Exception as e:
            logger.error(f"Failed to get user by email: {e}")
            return None

    async def update_user(self, user_id: str, update_data: dict) -> Optional[UserDocument]:
        """Update user information"""
        try:
            # Ensure database is initialized
            from services.database import init_db, async_db
            if async_db is None:
                await init_db()
            
            users_collection = get_users_collection()
            
            # Add updated_at timestamp
            update_data["updated_at"] = datetime.utcnow()
            
            # Update user
            result = await users_collection.update_one(
                {"_id": user_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                return None
            
            # Return updated user
            return await self.get_user_by_id(user_id)
            
        except Exception as e:
            logger.error(f"Failed to update user: {e}")
            return None

    async def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """Change user password"""
        try:
            users_collection = get_users_collection()
            
            # Get user with password
            user_doc = await users_collection.find_one({"_id": user_id})
            if not user_doc:
                return False
            
            # Verify old password
            if not self.verify_password(old_password, user_doc["password"]):
                return False
            
            # Hash new password
            hashed_new_password = self.hash_password(new_password)
            
            # Update password
            result = await users_collection.update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "password": hashed_new_password,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to change password: {e}")
            return False

# Global auth service instance
auth_service = AuthService()

