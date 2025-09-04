import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
import logging

from services.database import get_users_collection
from models.schemas import User, UserCreate

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET", "your-secret-key-here")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.PyJWTError as e:
            logger.error(f"Token verification failed: {e}")
            return None

    async def create_user(self, user_data: UserCreate) -> Optional[User]:
        """Create new user"""
        try:
            users_collection = get_users_collection()
            
            # Check if user already exists
            existing_user = await users_collection.find_one({"email": user_data.email})
            if existing_user:
                return None
            
            # Hash password
            hashed_password = self.hash_password(user_data.password)
            
            # Create user document
            user_doc = {
                "email": user_data.email,
                "name": user_data.name,
                "password": hashed_password,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert user
            result = await users_collection.insert_one(user_doc)
            
            # Return user without password
            user_doc["_id"] = str(result.inserted_id)
            user_doc.pop("password")
            
            return User(**user_doc)
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return None

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        try:
            users_collection = get_users_collection()
            
            # Find user by email
            user_doc = await users_collection.find_one({"email": email})
            if not user_doc:
                return None
            
            # Verify password
            if not self.verify_password(password, user_doc["password"]):
                return None
            
            # Return user without password
            user_doc["_id"] = str(user_doc["_id"])
            user_doc.pop("password")
            
            return User(**user_doc)
            
        except Exception as e:
            logger.error(f"Failed to authenticate user: {e}")
            return None

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            users_collection = get_users_collection()
            
            user_doc = await users_collection.find_one({"_id": user_id})
            if not user_doc:
                return None
            
            # Return user without password
            user_doc["_id"] = str(user_doc["_id"])
            user_doc.pop("password")
            
            return User(**user_doc)
            
        except Exception as e:
            logger.error(f"Failed to get user by ID: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            users_collection = get_users_collection()
            
            user_doc = await users_collection.find_one({"email": email})
            if not user_doc:
                return None
            
            # Return user without password
            user_doc["_id"] = str(user_doc["_id"])
            user_doc.pop("password")
            
            return User(**user_doc)
            
        except Exception as e:
            logger.error(f"Failed to get user by email: {e}")
            return None

    async def update_user(self, user_id: str, update_data: dict) -> Optional[User]:
        """Update user information"""
        try:
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

