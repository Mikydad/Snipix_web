"""
Email Service for Verification and Notifications
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
import logging
import os
from datetime import datetime, timedelta

from services.database import get_users_collection
from models.user_schemas import UserDocument
from utils.password_utils import password_utils

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_email = os.getenv("SENDER_EMAIL")
        self.sender_password = os.getenv("SENDER_PASSWORD")
        self.app_name = os.getenv("APP_NAME", "Snipix")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        if not self.sender_email or not self.sender_password:
            logger.warning("Email service not configured. Set SENDER_EMAIL and SENDER_PASSWORD")
    
    @property
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return bool(self.sender_email and self.sender_password)
    
    def _create_connection(self) -> Optional[smtplib.SMTP]:
        """Create SMTP connection"""
        if not self.is_configured:
            logger.error("Email service not configured")
            return None
        
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            
            # Create SSL context with relaxed certificate verification for development
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            server.starttls(context=context)
            server.login(self.sender_email, self.sender_password)
            return server
        except Exception as e:
            logger.error(f"Failed to create SMTP connection: {e}")
            return None
    
    def _send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email"""
        if not self.is_configured:
            logger.error("Email service not configured")
            return False
        
        try:
            server = self._create_connection()
            if not server:
                return False
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.sender_email
            message["To"] = to_email
            
            # Add text and HTML parts
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Send email
            server.sendmail(self.sender_email, to_email, message.as_string())
            server.quit()
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    async def send_verification_email(self, user: UserDocument) -> bool:
        """Send email verification email"""
        if not user.email_verification_token:
            logger.error(f"No verification token for user {user.email}")
            return False
        
        verification_url = f"{self.frontend_url}/verify-email?token={user.email_verification_token}"
        
        subject = f"Verify your {self.app_name} account"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Verify Your Account</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to {self.app_name}!</h1>
                </div>
                <div class="content">
                    <h2>Verify Your Email Address</h2>
                    <p>Hi {user.name},</p>
                    <p>Thank you for signing up for {self.app_name}! To complete your registration and start using your account, please verify your email address by clicking the button below:</p>
                    
                    <a href="{verification_url}" class="button">Verify Email Address</a>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p><a href="{verification_url}">{verification_url}</a></p>
                    
                    <p>This verification link will expire in 24 hours.</p>
                    
                    <p>If you didn't create an account with {self.app_name}, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>This email was sent by {self.app_name}. If you have any questions, please contact our support team.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to {self.app_name}!
        
        Hi {user.name},
        
        Thank you for signing up for {self.app_name}! To complete your registration and start using your account, please verify your email address by visiting this link:
        
        {verification_url}
        
        This verification link will expire in 24 hours.
        
        If you didn't create an account with {self.app_name}, please ignore this email.
        
        Best regards,
        The {self.app_name} Team
        """
        
        return self._send_email(user.email, subject, html_content, text_content)
    
    async def send_password_reset_email(self, user: UserDocument) -> bool:
        """Send password reset email"""
        if not user.password_reset_token:
            logger.error(f"No password reset token for user {user.email}")
            return False
        
        reset_url = f"{self.frontend_url}/reset-password?token={user.password_reset_token}"
        
        subject = f"Reset your {self.app_name} password"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Reset Your Password</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>Hi {user.name},</p>
                    <p>We received a request to reset your password for your {self.app_name} account. If you made this request, click the button below to reset your password:</p>
                    
                    <a href="{reset_url}" class="button">Reset Password</a>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p><a href="{reset_url}">{reset_url}</a></p>
                    
                    <p>This password reset link will expire in 1 hour.</p>
                    
                    <p><strong>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</strong></p>
                </div>
                <div class="footer">
                    <p>This email was sent by {self.app_name}. If you have any questions, please contact our support team.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request
        
        Hi {user.name},
        
        We received a request to reset your password for your {self.app_name} account. If you made this request, visit this link to reset your password:
        
        {reset_url}
        
        This password reset link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        
        Best regards,
        The {self.app_name} Team
        """
        
        return self._send_email(user.email, subject, html_content, text_content)
    
    async def send_welcome_email(self, user: UserDocument) -> bool:
        """Send welcome email to new users"""
        subject = f"Welcome to {self.app_name}!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Welcome to {self.app_name}</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to {self.app_name}!</h1>
                </div>
                <div class="content">
                    <h2>Your Account is Ready</h2>
                    <p>Hi {user.name},</p>
                    <p>Welcome to {self.app_name}! Your account has been successfully created and verified. You can now start using all the features of our platform.</p>
                    
                    <a href="{self.frontend_url}/dashboard" class="button">Go to Dashboard</a>
                    
                    <h3>What's Next?</h3>
                    <ul>
                        <li>Complete your profile setup</li>
                        <li>Upload your first video</li>
                        <li>Explore our editing features</li>
                        <li>Connect with our community</li>
                    </ul>
                    
                    <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
                </div>
                <div class="footer">
                    <p>This email was sent by {self.app_name}. If you have any questions, please contact our support team.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to {self.app_name}!
        
        Hi {user.name},
        
        Welcome to {self.app_name}! Your account has been successfully created and verified. You can now start using all the features of our platform.
        
        Visit your dashboard: {self.frontend_url}/dashboard
        
        What's Next?
        - Complete your profile setup
        - Upload your first video
        - Explore our editing features
        - Connect with our community
        
        If you have any questions or need help getting started, don't hesitate to reach out to our support team.
        
        Best regards,
        The {self.app_name} Team
        """
        
        return self._send_email(user.email, subject, html_content, text_content)
    
    async def verify_email_token(self, token: str) -> Optional[UserDocument]:
        """Verify email verification token"""
        try:
            users_collection = get_users_collection()
            
            # Find user with this verification token
            user_doc = await users_collection.find_one({
                "email_verification_token": token,
                "is_email_verified": False
            })
            
            if not user_doc:
                logger.warning(f"Invalid or expired verification token: {token}")
                return None
            
            # Update user as verified
            await users_collection.update_one(
                {"_id": user_doc["_id"]},
                {
                    "$set": {
                        "is_email_verified": True,
                        "email_verification_token": None,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Return updated user
            user_doc["_id"] = str(user_doc["_id"])
            user_doc["is_email_verified"] = True
            user_doc["email_verification_token"] = None
            
            logger.info(f"Email verified for user: {user_doc['email']}")
            return UserDocument(**user_doc)
            
        except Exception as e:
            logger.error(f"Failed to verify email token: {e}")
            return None
    
    async def generate_password_reset_token(self, email: str) -> Optional[str]:
        """Generate password reset token for user"""
        try:
            users_collection = get_users_collection()
            
            # Find user by email
            user_doc = await users_collection.find_one({"email": email})
            if not user_doc:
                logger.warning(f"User not found for password reset: {email}")
                return None
            
            # Generate reset token
            reset_token = password_utils.generate_password_reset_token()
            expires_at = datetime.utcnow() + timedelta(hours=1)
            
            # Update user with reset token
            await users_collection.update_one(
                {"_id": user_doc["_id"]},
                {
                    "$set": {
                        "password_reset_token": reset_token,
                        "password_reset_expires": expires_at,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Password reset token generated for user: {email}")
            return reset_token
            
        except Exception as e:
            logger.error(f"Failed to generate password reset token: {e}")
            return None
    
    async def reset_password_with_token(self, token: str, new_password: str) -> Optional[UserDocument]:
        """Reset password using reset token"""
        try:
            users_collection = get_users_collection()
            
            # Find user with valid reset token
            user_doc = await users_collection.find_one({
                "password_reset_token": token,
                "password_reset_expires": {"$gt": datetime.utcnow()}
            })
            
            if not user_doc:
                logger.warning(f"Invalid or expired password reset token: {token}")
                return None
            
            # Validate new password strength
            is_valid, errors = password_utils.validate_password_strength(new_password)
            if not is_valid:
                logger.warning(f"Password validation failed: {errors}")
                return None
            
            # Hash new password
            password_hash = password_utils.hash_password(new_password)
            
            # Update user password and clear reset token
            await users_collection.update_one(
                {"_id": user_doc["_id"]},
                {
                    "$set": {
                        "password_hash": password_hash,
                        "password_reset_token": None,
                        "password_reset_expires": None,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Return updated user
            user_doc["_id"] = str(user_doc["_id"])
            user_doc["password_reset_token"] = None
            user_doc["password_reset_expires"] = None
            
            logger.info(f"Password reset successfully for user: {user_doc['email']}")
            return UserDocument(**user_doc)
            
        except Exception as e:
            logger.error(f"Failed to reset password with token: {e}")
            return None

# Global instance
email_service = EmailService()
