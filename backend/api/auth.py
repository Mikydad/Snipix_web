"""
Authentication API Endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import timedelta, datetime
from typing import Optional
import logging

from models.user_schemas import (
    UserCreate, UserDocument, UserResponse, LoginRequest, GoogleAuthRequest,
    TokenResponse, RefreshTokenRequest, PasswordResetRequest, PasswordResetConfirm,
    EmailVerificationRequest, UserUpdate, UserRole, UserStatus, AuthProvider
)
from services.auth_service import auth_service
from services.jwt_service import jwt_service
from services.google_oauth_service import google_oauth_service
from services.email_service import email_service
from services.database import get_users_collection
from middleware.auth_middleware import get_current_user, get_current_user_id, get_optional_user
from models.schemas import ApiResponse

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

@router.post("/test-register", response_model=ApiResponse[dict])
async def test_register(user_data: UserCreate):
    """Test registration endpoint to debug issues"""
    try:
        # Create user
        user, error_message = await auth_service.create_user(user_data)
        if user is None:
            return ApiResponse(
                success=False,
                error=error_message or "Failed to create user. Please try again."
            )
        
        # Test JWT token creation
        try:
            tokens = jwt_service.create_token_pair(
                user_id=user.id,
                email=user.email,
                role=user.role if isinstance(user.role, str) else user.role.value
            )
            logger.info("JWT tokens created successfully")
        except Exception as e:
            logger.error(f"JWT token creation failed: {e}")
            return ApiResponse(
                success=False,
                error=f"JWT token creation failed: {e}"
            )
        
        # Test UserResponse creation
        try:
            user_response = UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                username=user.username,
                avatar_url=user.avatar_url,
                role=UserRole(user.role) if isinstance(user.role, str) else user.role,
                status=UserStatus(user.status) if isinstance(user.status, str) else user.status,
                auth_provider=AuthProvider(user.auth_provider) if isinstance(user.auth_provider, str) else user.auth_provider,
                is_email_verified=user.is_email_verified,
                last_login=user.last_login,
                login_count=user.login_count,
                total_session_time=user.total_session_time,
                preferences=user.preferences,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
            logger.info("UserResponse created successfully")
        except Exception as e:
            logger.error(f"UserResponse creation failed: {e}")
            return ApiResponse(
                success=False,
                error=f"UserResponse creation failed: {e}"
            )
        
        return ApiResponse(
            success=True,
            data={"message": "All tests passed", "user_id": user.id}
        )
        
    except Exception as e:
        logger.error(f"Test registration failed: {e}", exc_info=True)
        return ApiResponse(
            success=False,
            error=f"Test registration failed: {e}"
        )

@router.post("/test-remove-user", response_model=ApiResponse[dict])
async def test_remove_user(request: dict):
    """Test endpoint to remove user from database for testing"""
    try:
        email = request.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        users_collection = get_users_collection()
        
        # Find and remove user by email
        result = await users_collection.delete_one({"email": email})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return ApiResponse(
            success=True,
            data={"email": email, "deleted": True},
            message="User removed successfully for testing"
        )
        
    except Exception as e:
        logger.error(f"Test user removal failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove user: {str(e)}"
        )

@router.post("/test-verify-email", response_model=ApiResponse[dict])
async def test_verify_email(request: dict):
    """Test endpoint to manually verify email for testing"""
    try:
        email = request.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        users_collection = get_users_collection()
        
        # Find user by email
        user_doc = await users_collection.find_one({"email": email})
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update email verification status
        await users_collection.update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"is_email_verified": True, "updated_at": datetime.utcnow()}}
        )
        
        return ApiResponse(
            success=True,
            data={"email": email, "verified": True},
            message="Email verified successfully for testing"
        )
        
    except Exception as e:
        logger.error(f"Test email verification failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify email: {str(e)}"
        )

@router.post("/register", response_model=ApiResponse[TokenResponse])
async def register(user_data: UserCreate):
    """Register new user with email and password"""
    try:
        # Create user
        user, error_message = await auth_service.create_user(user_data)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message or "Failed to create user. Please try again."
            )
        
        # Create tokens
        tokens = jwt_service.create_token_pair(
            user_id=user.id,
            email=user.email,
            role=user.role if isinstance(user.role, str) else user.role.value
        )
        
        # Send verification email
        if email_service.is_configured:
            await email_service.send_verification_email(user)
        
        response_data = TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"],
            user=UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                username=user.username,
                avatar_url=user.avatar_url,
                role=UserRole(user.role) if isinstance(user.role, str) else user.role,
                status=UserStatus(user.status) if isinstance(user.status, str) else user.status,
                auth_provider=AuthProvider(user.auth_provider) if isinstance(user.auth_provider, str) else user.auth_provider,
                is_email_verified=user.is_email_verified,
                last_login=user.last_login,
                login_count=user.login_count,
                total_session_time=user.total_session_time,
                preferences=user.preferences,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
        )
        
        return ApiResponse(
            success=True,
            data=response_data,
            message="User registered successfully. Please check your email for verification."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )

@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(login_data: LoginRequest):
    """Login with email and password"""
    try:
        # Authenticate user
        user = await auth_service.authenticate_user(login_data.email, login_data.password)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if email is verified
        if not user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Please verify your email address before logging in"
            )
        
        # Create tokens
        tokens = jwt_service.create_token_pair(
            user_id=user.id,
            email=user.email,
            role=user.role if isinstance(user.role, str) else user.role.value
        )
        
        response_data = TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"],
            user=UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                username=user.username,
                avatar_url=user.avatar_url,
                role=UserRole(user.role) if isinstance(user.role, str) else user.role,
                status=UserStatus(user.status) if isinstance(user.status, str) else user.status,
                auth_provider=AuthProvider(user.auth_provider) if isinstance(user.auth_provider, str) else user.auth_provider,
                is_email_verified=user.is_email_verified,
                last_login=user.last_login,
                login_count=user.login_count,
                total_session_time=user.total_session_time,
                preferences=user.preferences,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
        )
        
        return ApiResponse(
            success=True,
            data=response_data,
            message="Login successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )

@router.post("/google", response_model=ApiResponse[TokenResponse])
async def google_auth(google_data: GoogleAuthRequest):
    """Authenticate with Google OAuth"""
    try:
        if not google_oauth_service.is_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth is not configured"
            )
        
        # Authenticate user with Google
        user = await google_oauth_service.authenticate_user(google_data.token)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google authentication failed"
            )
        
        # Create tokens
        tokens = jwt_service.create_token_pair(
            user_id=user.id,
            email=user.email,
            role=user.role if isinstance(user.role, str) else user.role.value
        )
        
        # Send welcome email for new users
        if user.login_count == 1 and email_service.is_configured:
            await email_service.send_welcome_email(user)
        
        response_data = TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"],
            user=UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                username=user.username,
                avatar_url=user.avatar_url,
                role=UserRole(user.role) if isinstance(user.role, str) else user.role,
                status=UserStatus(user.status) if isinstance(user.status, str) else user.status,
                auth_provider=AuthProvider(user.auth_provider) if isinstance(user.auth_provider, str) else user.auth_provider,
                is_email_verified=user.is_email_verified,
                last_login=user.last_login,
                login_count=user.login_count,
                total_session_time=user.total_session_time,
                preferences=user.preferences,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
        )
        
        return ApiResponse(
            success=True,
            data=response_data,
            message="Google authentication successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication failed. Please try again."
        )

@router.post("/refresh", response_model=ApiResponse[dict])
async def refresh_token(refresh_data: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        # Verify refresh token and create new access token
        new_tokens = jwt_service.refresh_access_token(refresh_data.refresh_token)
        if new_tokens is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        return ApiResponse(
            success=True,
            data=new_tokens,
            message="Token refreshed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed. Please try again."
        )

@router.post("/verify-email", response_model=ApiResponse[dict])
async def verify_email(verification_data: EmailVerificationRequest):
    """Verify email address with token"""
    try:
        # Verify email token
        user = await email_service.verify_email_token(verification_data.token)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        return ApiResponse(
            success=True,
            data={"email": user.email, "verified": True},
            message="Email verified successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed. Please try again."
        )

@router.post("/resend-verification", response_model=ApiResponse[dict])
async def resend_verification_email(current_user: UserDocument = Depends(get_current_user)):
    """Resend verification email"""
    try:
        if current_user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified"
            )
        
        # Send verification email
        if email_service.is_configured:
            success = await email_service.send_verification_email(current_user)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send verification email"
                )
        
        return ApiResponse(
            success=True,
            data={"email": current_user.email},
            message="Verification email sent successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification email"
        )

@router.post("/forgot-password", response_model=ApiResponse[dict])
async def forgot_password(password_reset_data: PasswordResetRequest):
    """Request password reset"""
    try:
        # Generate password reset token
        token = await email_service.generate_password_reset_token(password_reset_data.email)
        if token is None:
            # Don't reveal if email exists or not for security
            return ApiResponse(
                success=True,
                data={"email": password_reset_data.email},
                message="If the email exists, a password reset link has been sent"
            )
        
        # Get user to send email
        user = await auth_service.get_user_by_email(password_reset_data.email)
        if user and email_service.is_configured:
            await email_service.send_password_reset_email(user)
        
        return ApiResponse(
            success=True,
            data={"email": password_reset_data.email},
            message="If the email exists, a password reset link has been sent"
        )
        
    except Exception as e:
        logger.error(f"Password reset request failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed. Please try again."
        )

@router.post("/reset-password", response_model=ApiResponse[dict])
async def reset_password(password_reset_data: PasswordResetConfirm):
    """Reset password with token"""
    try:
        # Reset password with token
        user = await email_service.reset_password_with_token(
            password_reset_data.token,
            password_reset_data.new_password
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        return ApiResponse(
            success=True,
            data={"email": user.email},
            message="Password reset successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed. Please try again."
        )

@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_current_user_profile(current_user: UserDocument = Depends(get_current_user)):
    """Get current user profile"""
    try:
        user_response = UserResponse(
            id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            username=current_user.username,
            avatar_url=current_user.avatar_url,
            role=current_user.role,
            status=current_user.status,
            auth_provider=current_user.auth_provider,
            is_email_verified=current_user.is_email_verified,
            last_login=current_user.last_login,
            login_count=current_user.login_count,
            total_session_time=current_user.total_session_time,
            preferences=current_user.preferences,
            created_at=current_user.created_at,
            updated_at=current_user.updated_at
        )
        
        return ApiResponse(
            success=True,
            data=user_response,
            message="User profile retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to get user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )

@router.put("/me", response_model=ApiResponse[UserResponse])
async def update_user_profile(
    update_data: UserUpdate,
    current_user: UserDocument = Depends(get_current_user)
):
    """Update current user profile"""
    try:
        # Update user in database
        from services.database import get_users_collection
        users_collection = get_users_collection()
        
        update_dict = update_data.dict(exclude_unset=True)
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_dict["updated_at"] = datetime.utcnow()
        
        await users_collection.update_one(
            {"_id": current_user.id},
            {"$set": update_dict}
        )
        
        # Get updated user
        updated_user = await auth_service.get_user_by_id(current_user.id)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated user"
            )
        
        user_response = UserResponse(
            id=updated_user.id,
            email=updated_user.email,
            name=updated_user.name,
            username=updated_user.username,
            avatar_url=updated_user.avatar_url,
            role=updated_user.role,
            status=updated_user.status,
            auth_provider=updated_user.auth_provider,
            is_email_verified=updated_user.is_email_verified,
            last_login=updated_user.last_login,
            login_count=updated_user.login_count,
            total_session_time=updated_user.total_session_time,
            preferences=updated_user.preferences,
            created_at=updated_user.created_at,
            updated_at=updated_user.updated_at
        )
        
        return ApiResponse(
            success=True,
            data=user_response,
            message="Profile updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.post("/logout", response_model=ApiResponse[dict])
async def logout():
    """Logout user (client-side token removal)"""
    return ApiResponse(
        success=True,
        data={},
        message="Logout successful. Please remove tokens from client storage."
    )