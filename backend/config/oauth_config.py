"""
Google OAuth Configuration
"""
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class GoogleOAuthConfig:
    """Google OAuth configuration"""
    
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/auth/google/callback")
        self.scope = "openid email profile"
        
        if not self.client_id or not self.client_secret:
            logger.warning("Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")
    
    @property
    def is_configured(self) -> bool:
        """Check if Google OAuth is properly configured"""
        return bool(self.client_id and self.client_secret)
    
    def get_auth_url(self, state: Optional[str] = None) -> str:
        """Generate Google OAuth authorization URL"""
        if not self.is_configured:
            raise ValueError("Google OAuth not configured")
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": self.scope,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent"
        }
        
        if state:
            params["state"] = state
        
        # Build query string
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"
    
    def get_token_url(self) -> str:
        """Get Google OAuth token URL"""
        return "https://oauth2.googleapis.com/token"
    
    def get_user_info_url(self) -> str:
        """Get Google user info URL"""
        return "https://www.googleapis.com/oauth2/v2/userinfo"

# Global instance
google_oauth_config = GoogleOAuthConfig()
