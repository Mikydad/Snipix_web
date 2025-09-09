"""
Error handling utilities for MongoDB operations
"""
import logging
import asyncio
from typing import Any, Callable, Optional, TypeVar, Union
from functools import wraps
from datetime import datetime
import traceback

from pymongo.errors import (
    ConnectionFailure,
    ServerSelectionTimeoutError,
    NetworkTimeout,
    OperationFailure,
    DuplicateKeyError,
    WriteError,
    PyMongoError
)

logger = logging.getLogger(__name__)

T = TypeVar('T')

class DatabaseError(Exception):
    """Base database error"""
    pass

class ConnectionError(DatabaseError):
    """Database connection error"""
    pass

class OperationError(DatabaseError):
    """Database operation error"""
    pass

class ValidationError(DatabaseError):
    """Data validation error"""
    pass

class RetryableError(DatabaseError):
    """Retryable database error"""
    pass

class NonRetryableError(DatabaseError):
    """Non-retryable database error"""
    pass


def classify_mongodb_error(error: Exception) -> DatabaseError:
    """Classify MongoDB errors into appropriate categories"""
    if isinstance(error, (ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout)):
        return RetryableError(f"Connection error: {str(error)}")
    elif isinstance(error, DuplicateKeyError):
        return ValidationError(f"Duplicate key error: {str(error)}")
    elif isinstance(error, WriteError):
        return OperationError(f"Write error: {str(error)}")
    elif isinstance(error, OperationFailure):
        return OperationError(f"Operation failed: {str(error)}")
    elif isinstance(error, PyMongoError):
        return RetryableError(f"MongoDB error: {str(error)}")
    else:
        return DatabaseError(f"Unknown error: {str(error)}")


def retry_database_operation(
    max_retries: int = 3,
    delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (RetryableError, ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout)
):
    """Decorator for retrying database operations with exponential backoff"""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    classified_error = classify_mongodb_error(e)
                    
                    if attempt == max_retries:
                        logger.error(f"Max retries ({max_retries}) exceeded for {func.__name__}: {classified_error}")
                        raise classified_error
                    
                    logger.warning(f"Attempt {attempt + 1}/{max_retries + 1} failed for {func.__name__}: {classified_error}")
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff_factor
                    
                except Exception as e:
                    # Non-retryable error
                    classified_error = classify_mongodb_error(e)
                    logger.error(f"Non-retryable error in {func.__name__}: {classified_error}")
                    raise classified_error
            
            # This should never be reached, but just in case
            raise last_exception or DatabaseError("Unknown error occurred")
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    classified_error = classify_mongodb_error(e)
                    
                    if attempt == max_retries:
                        logger.error(f"Max retries ({max_retries}) exceeded for {func.__name__}: {classified_error}")
                        raise classified_error
                    
                    logger.warning(f"Attempt {attempt + 1}/{max_retries + 1} failed for {func.__name__}: {classified_error}")
                    import time
                    time.sleep(current_delay)
                    current_delay *= backoff_factor
                    
                except Exception as e:
                    # Non-retryable error
                    classified_error = classify_mongodb_error(e)
                    logger.error(f"Non-retryable error in {func.__name__}: {classified_error}")
                    raise classified_error
            
            # This should never be reached, but just in case
            raise last_exception or DatabaseError("Unknown error occurred")
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class ErrorContext:
    """Context manager for error handling with logging"""
    
    def __init__(self, operation: str, user_id: Optional[str] = None):
        self.operation = operation
        self.user_id = user_id
        self.start_time = None
        self.context = {}
    
    def __enter__(self):
        self.start_time = datetime.now()
        logger.info(f"Starting operation: {self.operation}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0
        
        if exc_type is None:
            logger.info(f"Operation completed: {self.operation} (duration: {duration:.3f}s)")
        else:
            error_msg = str(exc_val) if exc_val else "Unknown error"
            logger.error(f"Operation failed: {self.operation} - {error_msg} (duration: {duration:.3f}s)")
            
            # Log stack trace for debugging
            if exc_tb:
                logger.error(f"Stack trace: {traceback.format_tb(exc_tb)}")
        
        return False  # Don't suppress exceptions


def log_database_operation(operation: str, collection: str, user_id: Optional[str] = None):
    """Log database operation for monitoring and debugging"""
    logger.info(f"Database operation: {operation} on {collection}", extra={
        "operation": operation,
        "collection": collection,
        "user_id": user_id,
        "timestamp": datetime.now().isoformat()
    })


def handle_database_error(error: Exception, operation: str, context: Optional[dict] = None) -> DatabaseError:
    """Handle and classify database errors with context"""
    classified_error = classify_mongodb_error(error)
    
    error_context = {
        "operation": operation,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "timestamp": datetime.now().isoformat()
    }
    
    if context:
        error_context.update(context)
    
    logger.error(f"Database error in {operation}: {classified_error}", extra=error_context)
    
    return classified_error


# Utility functions for common error scenarios
def is_retryable_error(error: Exception) -> bool:
    """Check if an error is retryable"""
    return isinstance(classify_mongodb_error(error), RetryableError)


def is_connection_error(error: Exception) -> bool:
    """Check if an error is a connection error"""
    return isinstance(error, (ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout))


def is_validation_error(error: Exception) -> bool:
    """Check if an error is a validation error"""
    return isinstance(error, DuplicateKeyError) or isinstance(classify_mongodb_error(error), ValidationError)


def get_user_friendly_message(error: Exception) -> str:
    """Get user-friendly error message"""
    if is_connection_error(error):
        return "Database connection issue. Please try again in a moment."
    elif is_validation_error(error):
        return "Invalid data provided. Please check your input."
    elif isinstance(error, DuplicateKeyError):
        return "This item already exists. Please use a different identifier."
    else:
        return "An unexpected error occurred. Please try again."

