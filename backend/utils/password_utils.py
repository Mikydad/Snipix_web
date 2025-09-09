"""
Password Hashing and Validation Utilities
"""
import bcrypt
import re
import secrets
import string
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class PasswordUtils:
    """Utilities for password hashing and validation"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt with salt"""
        try:
            # Generate salt and hash password
            salt = bcrypt.gensalt(rounds=12)  # 12 rounds for good security
            hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
            return hashed.decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to hash password: {e}")
            raise
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            logger.error(f"Failed to verify password: {e}")
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> tuple[bool, list[str]]:
        """
        Validate password strength
        Returns: (is_valid, list_of_errors)
        """
        errors = []
        
        # Length check
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        # Uppercase check
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        # Lowercase check
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        # Digit check
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        # Special character check
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        # Common password check
        common_passwords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ]
        if password.lower() in common_passwords:
            errors.append("Password is too common, please choose a more unique password")
        
        # Sequential characters check
        if PasswordUtils._has_sequential_chars(password):
            errors.append("Password should not contain sequential characters")
        
        # Repeated characters check
        if PasswordUtils._has_repeated_chars(password):
            errors.append("Password should not contain repeated characters")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def _has_sequential_chars(password: str) -> bool:
        """Check for sequential characters (e.g., abc, 123)"""
        for i in range(len(password) - 2):
            if (ord(password[i+1]) == ord(password[i]) + 1 and 
                ord(password[i+2]) == ord(password[i]) + 2):
                return True
        return False
    
    @staticmethod
    def _has_repeated_chars(password: str) -> bool:
        """Check for repeated characters (e.g., aaa, 111)"""
        for i in range(len(password) - 2):
            if password[i] == password[i+1] == password[i+2]:
                return True
        return False
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate a secure random token"""
        try:
            alphabet = string.ascii_letters + string.digits
            return ''.join(secrets.choice(alphabet) for _ in range(length))
        except Exception as e:
            logger.error(f"Failed to generate secure token: {e}")
            raise
    
    @staticmethod
    def generate_password_reset_token() -> str:
        """Generate a password reset token"""
        return PasswordUtils.generate_secure_token(32)
    
    @staticmethod
    def generate_email_verification_token() -> str:
        """Generate an email verification token"""
        return PasswordUtils.generate_secure_token(32)
    
    @staticmethod
    def get_password_strength_score(password: str) -> int:
        """
        Calculate password strength score (0-100)
        """
        score = 0
        
        # Length scoring
        if len(password) >= 8:
            score += 20
        if len(password) >= 12:
            score += 10
        if len(password) >= 16:
            score += 10
        
        # Character variety scoring
        if re.search(r'[a-z]', password):
            score += 10
        if re.search(r'[A-Z]', password):
            score += 10
        if re.search(r'\d', password):
            score += 10
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 10
        
        # Bonus for uncommon patterns
        if not PasswordUtils._has_sequential_chars(password):
            score += 10
        if not PasswordUtils._has_repeated_chars(password):
            score += 10
        
        return min(score, 100)
    
    @staticmethod
    def get_password_strength_label(score: int) -> str:
        """Get password strength label based on score"""
        if score < 30:
            return "Weak"
        elif score < 60:
            return "Fair"
        elif score < 80:
            return "Good"
        else:
            return "Strong"

# Global instance
password_utils = PasswordUtils()
