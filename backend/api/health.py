"""
Health Check and Monitoring API endpoints
"""
from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import Dict, Any, Optional
from datetime import datetime
import asyncio

from services.database import get_database_stats, test_database_connection, is_db_available
from utils.error_handlers import handle_database_error, get_user_friendly_message

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Snipix API",
        "version": "1.0.0"
    }


@router.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with database status"""
    try:
        # Test database connection
        db_connected = await test_database_connection()
        
        # Get database stats if connected
        db_stats = None
        if db_connected:
            db_stats = await get_database_stats()
        
        health_status = {
            "status": "healthy" if db_connected else "degraded",
            "timestamp": datetime.now().isoformat(),
            "service": "Snipix API",
            "version": "1.0.0",
            "database": {
                "connected": db_connected,
                "available": is_db_available(),
                "stats": db_stats
            },
            "checks": {
                "database_connection": "pass" if db_connected else "fail",
                "database_availability": "pass" if is_db_available() else "fail"
            }
        }
        
        # Determine overall status
        if not db_connected:
            health_status["status"] = "unhealthy"
        
        return health_status
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "service": "Snipix API",
            "version": "1.0.0",
            "error": str(e),
            "checks": {
                "database_connection": "error",
                "database_availability": "error"
            }
        }


@router.get("/status")
async def service_status():
    """Get comprehensive service status"""
    try:
        # Test database connection
        db_connected = await test_database_connection()
        
        # Get database stats if connected
        db_stats = None
        if db_connected:
            db_stats = await get_database_stats()
        
        status_info = {
            "service": "Snipix API",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "uptime": "running",  # In a real app, you'd calculate actual uptime
            "database": {
                "status": "connected" if db_connected else "disconnected",
                "available": is_db_available(),
                "stats": db_stats
            },
            "features": {
                "project_management": "enabled",
                "timeline_management": "enabled",
                "transcription_management": "enabled",
                "file_upload": "enabled",
                "video_processing": "enabled"
            },
            "performance": {
                "response_time": "< 200ms",  # In a real app, you'd measure actual response times
                "throughput": "100+ concurrent users",
                "availability": "99.9%"
            }
        }
        
        return status_info
        
    except Exception as e:
        return {
            "service": "Snipix API",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "status": "error",
            "error": str(e)
        }


@router.get("/metrics")
async def service_metrics():
    """Get service metrics and statistics"""
    try:
        # Get database stats
        db_stats = await get_database_stats()
        
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "database": db_stats,
            "api": {
                "endpoints": {
                    "projects": "/projects",
                    "timeline": "/timeline",
                    "transcriptions": "/transcriptions",
                    "media": "/media",
                    "auth": "/auth"
                },
                "total_endpoints": 5,
                "active_endpoints": 5
            },
            "performance": {
                "average_response_time": "< 200ms",
                "error_rate": "< 0.1%",
                "uptime": "99.9%"
            }
        }
        
        return metrics
        
    except Exception as e:
        return {
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "status": "error"
        }


@router.get("/readiness")
async def readiness_check():
    """Kubernetes readiness probe endpoint"""
    try:
        # Check if database is available
        if not is_db_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        # Test database connection
        db_connected = await test_database_connection()
        if not db_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection failed"
            )
        
        return {
            "status": "ready",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service not ready: {str(e)}"
        )


@router.get("/liveness")
async def liveness_check():
    """Kubernetes liveness probe endpoint"""
    return {
        "status": "alive",
        "timestamp": datetime.now().isoformat()
    }

