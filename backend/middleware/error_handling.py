"""
Error handling middleware and utilities
"""
import logging
import traceback
from typing import Dict, Any
from datetime import datetime
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from utils.error_handlers import (
    DatabaseError, ValidationError, OperationError, 
    RetryableError, NonRetryableError, get_user_friendly_message
)

logger = logging.getLogger(__name__)


class ErrorHandler:
    """Centralized error handling for the application"""
    
    @staticmethod
    def handle_database_error(error: Exception, operation: str) -> Dict[str, Any]:
        """Handle database-related errors"""
        error_info = {
            "error_type": type(error).__name__,
            "operation": operation,
            "timestamp": datetime.now().isoformat(),
            "message": str(error)
        }
        
        if isinstance(error, RetryableError):
            error_info["retryable"] = True
            error_info["user_message"] = "Service temporarily unavailable. Please try again."
        elif isinstance(error, NonRetryableError):
            error_info["retryable"] = False
            error_info["user_message"] = "Operation failed. Please check your input and try again."
        elif isinstance(error, ValidationError):
            error_info["retryable"] = False
            error_info["user_message"] = "Invalid data provided. Please check your input."
        elif isinstance(error, OperationError):
            error_info["retryable"] = False
            error_info["user_message"] = "Operation failed. Please try again."
        else:
            error_info["retryable"] = False
            error_info["user_message"] = "An unexpected error occurred. Please try again."
        
        logger.error(f"Database error in {operation}: {error}", extra=error_info)
        return error_info
    
    @staticmethod
    def handle_validation_error(error: RequestValidationError) -> Dict[str, Any]:
        """Handle request validation errors"""
        error_info = {
            "error_type": "ValidationError",
            "timestamp": datetime.now().isoformat(),
            "message": "Request validation failed",
            "details": error.errors(),
            "user_message": "Invalid request data. Please check your input."
        }
        
        logger.warning(f"Validation error: {error.errors()}")
        return error_info
    
    @staticmethod
    def handle_http_error(error: HTTPException) -> Dict[str, Any]:
        """Handle HTTP exceptions"""
        error_info = {
            "error_type": "HTTPException",
            "status_code": error.status_code,
            "timestamp": datetime.now().isoformat(),
            "message": error.detail,
            "user_message": get_user_friendly_message(error)
        }
        
        if error.status_code >= 500:
            logger.error(f"HTTP error {error.status_code}: {error.detail}")
        else:
            logger.warning(f"HTTP error {error.status_code}: {error.detail}")
        
        return error_info
    
    @staticmethod
    def handle_generic_error(error: Exception) -> Dict[str, Any]:
        """Handle generic exceptions"""
        error_info = {
            "error_type": type(error).__name__,
            "timestamp": datetime.now().isoformat(),
            "message": str(error),
            "user_message": "An unexpected error occurred. Please try again."
        }
        
        logger.error(f"Unexpected error: {error}", exc_info=True)
        return error_info


async def database_error_handler(request: Request, exc: DatabaseError):
    """Handle database errors"""
    error_info = ErrorHandler.handle_database_error(exc, "unknown")
    
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "error": error_info["user_message"],
            "details": error_info,
            "timestamp": error_info["timestamp"]
        }
    )


async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    error_info = ErrorHandler.handle_validation_error(exc)
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": error_info["user_message"],
            "details": error_info["details"],
            "timestamp": error_info["timestamp"]
        }
    )


async def http_error_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    error_info = ErrorHandler.handle_http_error(exc)
    
    return JSONResponse(
        status_code=error_info["status_code"],
        content={
            "success": False,
            "error": error_info["user_message"],
            "details": error_info,
            "timestamp": error_info["timestamp"]
        }
    )


async def generic_error_handler(request: Request, exc: Exception):
    """Handle generic exceptions"""
    error_info = ErrorHandler.handle_generic_error(exc)
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": error_info["user_message"],
            "details": error_info,
            "timestamp": error_info["timestamp"]
        }
    )


def setup_error_handlers(app):
    """Setup error handlers for the FastAPI application"""
    # Add exception handlers
    app.add_exception_handler(DatabaseError, database_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(HTTPException, http_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(Exception, generic_error_handler)
    
    logger.info("Error handlers configured successfully")


class RequestLogger:
    """Middleware for logging requests and responses"""
    
    @staticmethod
    async def log_request(request: Request, call_next):
        """Log incoming requests"""
        start_time = datetime.now()
        
        # Log request
        logger.info(f"Request: {request.method} {request.url.path}", extra={
            "method": request.method,
            "path": request.url.path,
            "query_params": str(request.query_params),
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "timestamp": start_time.isoformat()
        })
        
        # Process request
        response = await call_next(request)
        
        # Log response
        process_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Response: {response.status_code} ({process_time:.3f}s)", extra={
            "status_code": response.status_code,
            "process_time": process_time,
            "timestamp": datetime.now().isoformat()
        })
        
        return response


def setup_request_logging(app):
    """Setup request logging middleware"""
    app.middleware("http")(RequestLogger.log_request)
    logger.info("Request logging middleware configured successfully")


class CircuitBreaker:
    """Simple circuit breaker implementation"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def can_execute(self) -> bool:
        """Check if operation can be executed"""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if self.last_failure_time and \
               (datetime.now() - self.last_failure_time).seconds > self.recovery_timeout:
                self.state = "HALF_OPEN"
                return True
            return False
        elif self.state == "HALF_OPEN":
            return True
        return False
    
    def record_success(self):
        """Record successful operation"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def record_failure(self):
        """Record failed operation"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")


# Global circuit breaker instances
database_circuit_breaker = CircuitBreaker()
api_circuit_breaker = CircuitBreaker()

