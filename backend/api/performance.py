"""
Performance Monitoring API endpoints
"""
from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import Dict, Any, Optional, List
from datetime import datetime

from services.performance_monitor import (
    performance_monitor, database_performance_monitor, performance_optimizer
)
from utils.error_handlers import handle_database_error, get_user_friendly_message

router = APIRouter()


@router.get("/metrics")
async def get_performance_metrics():
    """Get current performance metrics"""
    try:
        metrics = performance_monitor.get_performance_summary()
        return {
            "success": True,
            "data": metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.get("/metrics/detailed")
async def get_detailed_metrics():
    """Get detailed performance metrics"""
    try:
        detailed_metrics = performance_monitor.get_detailed_metrics()
        return {
            "success": True,
            "data": detailed_metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.get("/database")
async def get_database_performance():
    """Get database performance metrics"""
    try:
        db_metrics = await database_performance_monitor.get_database_performance_metrics()
        return {
            "success": True,
            "data": db_metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.get("/optimization/suggestions")
async def get_optimization_suggestions():
    """Get performance optimization suggestions"""
    try:
        suggestions = {
            "database": performance_optimizer.optimize_database_queries(),
            "api": performance_optimizer.optimize_api_performance(),
            "memory": performance_optimizer.optimize_memory_usage()
        }
        
        return {
            "success": True,
            "data": suggestions,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.post("/monitoring/start")
async def start_performance_monitoring():
    """Start performance monitoring"""
    try:
        performance_monitor.start_monitoring()
        return {
            "success": True,
            "message": "Performance monitoring started",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.post("/monitoring/stop")
async def stop_performance_monitoring():
    """Stop performance monitoring"""
    try:
        performance_monitor.stop_monitoring()
        return {
            "success": True,
            "message": "Performance monitoring stopped",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.post("/metrics/reset")
async def reset_performance_metrics():
    """Reset performance metrics"""
    try:
        performance_monitor.reset_metrics()
        return {
            "success": True,
            "message": "Performance metrics reset",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )


@router.get("/status")
async def get_monitoring_status():
    """Get monitoring status"""
    try:
        status_info = {
            "monitoring_active": performance_monitor.monitoring_active,
            "start_time": performance_monitor.start_time.isoformat(),
            "uptime": str(datetime.now() - performance_monitor.start_time),
            "metrics_count": {
                "api_calls": sum(performance_monitor.metrics["api_calls"].values()),
                "database_operations": sum(performance_monitor.metrics["database_operations"].values()),
                "memory_samples": len(performance_monitor.metrics["memory_usage"]),
                "cpu_samples": len(performance_monitor.metrics["cpu_usage"])
            }
        }
        
        return {
            "success": True,
            "data": status_info,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_user_friendly_message(e)
        )

