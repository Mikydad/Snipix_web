from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import timedelta
from typing import Optional

from models.schemas import UserCreate, User, UserLogin, Token, ApiResponse
from services.auth_service import auth_service

router = APIRouter()
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = auth_service.verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.post("/register", response_model=ApiResponse[Token])
async def register(user_data: UserCreate):
    """Register new user"""
    try:
        # Create user
        user = await auth_service.create_user(user_data)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=auth_service.access_token_expire_minutes)
        access_token = auth_service.create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )
        
        return ApiResponse(
            success=True,
            data=Token(access_token=access_token, token_type="bearer", user=user),
            message="User registered successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )

@router.post("/login", response_model=ApiResponse[Token])
async def login(user_credentials: UserLogin):
    """Login user"""
    try:
        # Authenticate user
        user = await auth_service.authenticate_user(
            user_credentials.email, user_credentials.password
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=auth_service.access_token_expire_minutes)
        access_token = auth_service.create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )
        
        return ApiResponse(
            success=True,
            data=Token(access_token=access_token, token_type="bearer", user=user),
            message="Login successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to login"
        )

@router.get("/me", response_model=ApiResponse[User])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return ApiResponse(
        success=True,
        data=current_user,
        message="User information retrieved successfully"
    )

@router.put("/me", response_model=ApiResponse[User])
async def update_current_user(
    update_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update current user information"""
    try:
        # Remove sensitive fields from update data
        update_data.pop("password", None)
        update_data.pop("email", None)  # Don't allow email changes via this endpoint
        
        updated_user = await auth_service.update_user(current_user.id, update_data)
        if updated_user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update user"
            )
        
        return ApiResponse(
            success=True,
            data=updated_user,
            message="User updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.post("/change-password", response_model=ApiResponse)
async def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    try:
        success = await auth_service.change_password(
            current_user.id, old_password, new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid old password"
            )
        
        return ApiResponse(
            success=True,
            message="Password changed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

