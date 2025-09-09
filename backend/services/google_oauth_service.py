"""
Google OAuth Service
"""
import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from config.oauth_config import google_oauth_config
from services.database import get_users_collection
from models.user_schemas import UserDocument, UserRole, UserStatus, AuthProvider
from utils.password_utils import password_utils

logger = logging.getLogger(__name__)

class GoogleOAuthService:
    """Service for Google OAuth authentication"""
    
    def __init__(self):
        self.config = google_oauth_config
    
    async def exchange_code_for_token(self, code: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access token"""
        if not self.config.is_configured:
            logger.error("Google OAuth not configured")
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.config.get_token_url(),
                    data={
                        "client_id": self.config.client_id,
                        "client_secret": self.config.client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": self.config.redirect_uri
                    },
                    headers={"Accept": "application/json"}
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to exchange code for token: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error exchanging code for token: {e}")
            return None
    
    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user information from Google"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.config.get_user_info_url(),
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get user info: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting user info: {e}")
            return None
    
    async def authenticate_user(self, code: str) -> Optional[UserDocument]:
        """Authenticate user with Google OAuth code"""
        try:
            # Handle mock token for testing
            if code == 'mock_google_token':
                logger.info("Using mock Google token for testing")
                # Create a mock user for testing
                users_collection = get_users_collection()
                mock_email = "mockuser@gmail.com"
                
                # Check if mock user exists
                existing_user = await users_collection.find_one({"email": mock_email})
                
                if existing_user:
                    # Update last login
                    await users_collection.update_one(
                        {"_id": existing_user["_id"]},
                        {"$set": {"last_login": datetime.utcnow()}}
                    )
                    existing_user["_id"] = str(existing_user["_id"])
                    existing_user["id"] = str(existing_user["_id"])
                    return UserDocument(**existing_user)
                else:
                    # Create new mock user
                    user_data = {
                        "email": mock_email,
                        "name": "Mock Google User",
                        "username": "mockuser",
                        "avatar_url": None,
                        "role": UserRole.USER.value,
                        "status": UserStatus.ACTIVE.value,
                        "auth_provider": AuthProvider.GOOGLE.value,
                        "is_email_verified": True,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                        "last_login": datetime.utcnow(),
                        "login_count": 1,
                        "total_session_time": 0,
                        "preferences": {}
                    }
                    
                    result = await users_collection.insert_one(user_data)
                    user_data["_id"] = str(result.inserted_id)
                    user_data["id"] = str(result.inserted_id)
                    
                    return UserDocument(**user_data)
            
            # Exchange code for token
            token_data = await self.exchange_code_for_token(code)
            if not token_data:
                return None
            
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("No access token in response")
                return None
            
            # Get user info
            user_info = await self.get_user_info(access_token)
            if not user_info:
                return None
            
            # Extract user data
            google_id = user_info.get("id")
            email = user_info.get("email")
            name = user_info.get("name")
            avatar_url = user_info.get("picture")
            
            if not google_id or not email:
                logger.error("Missing required user data from Google")
                return None
            
            # Check if user exists
            users_collection = get_users_collection()
            existing_user = await users_collection.find_one({
                "$or": [
                    {"google_id": google_id},
                    {"email": email}
                ]
            })
            
            if existing_user:
                # Update existing user
                existing_user["_id"] = str(existing_user["_id"])
                
                # Update Google ID if not set
                if not existing_user.get("google_id"):
                    await users_collection.update_one(
                        {"_id": existing_user["_id"]},
                        {"$set": {
                            "google_id": google_id,
                            "auth_provider": AuthProvider.GOOGLE.value,
                            "avatar_url": avatar_url,
                            "last_login": datetime.utcnow(),
                            "login_count": existing_user.get("login_count", 0) + 1,
                            "updated_at": datetime.utcnow()
                        }}
                    )
                    existing_user["google_id"] = google_id
                    existing_user["auth_provider"] = AuthProvider.GOOGLE.value
                    existing_user["avatar_url"] = avatar_url
                
                return UserDocument(**existing_user)
            else:
                # Create new user
                new_user_data = {
                    "google_id": google_id,
                    "email": email,
                    "name": name,
                    "avatar_url": avatar_url,
                    "auth_provider": AuthProvider.GOOGLE.value,
                    "role": UserRole.USER.value,
                    "status": UserStatus.ACTIVE.value,
                    "is_email_verified": True,  # Google emails are pre-verified
                    "last_login": datetime.utcnow(),
                    "login_count": 1,
                    "total_session_time": 0,
                    "preferences": {},
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                result = await users_collection.insert_one(new_user_data)
                new_user_data["_id"] = str(result.inserted_id)
                
                logger.info(f"Created new Google user: {email}")
                return UserDocument(**new_user_data)
                
        except Exception as e:
            logger.error(f"Error authenticating Google user: {e}")
            return None
    
    def get_auth_url(self, state: Optional[str] = None) -> str:
        """Get Google OAuth authorization URL"""
        return self.config.get_auth_url(state)
    
    def is_configured(self) -> bool:
        """Check if Google OAuth is configured"""
        return self.config.is_configured

# Global instance
google_oauth_service = GoogleOAuthService()
