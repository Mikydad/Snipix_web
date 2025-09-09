"""
Retry decorator for database operations with exponential backoff
"""
import asyncio
import logging
from typing import Callable, TypeVar, Any, Optional
from functools import wraps
import time

from utils.error_handlers import retry_database_operation, RetryableError, NonRetryableError

logger = logging.getLogger(__name__)

T = TypeVar('T')


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    max_delay: float = 60.0,
    jitter: bool = True
):
    """
    Retry decorator with exponential backoff and jitter
    
    Args:
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay between retries in seconds
        backoff_factor: Factor by which delay increases after each retry
        max_delay: Maximum delay between retries
        jitter: Whether to add random jitter to delay
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            last_exception = None
            current_delay = initial_delay
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except RetryableError as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        logger.error(f"Max retries ({max_retries}) exceeded for {func.__name__}: {e}")
                        raise e
                    
                    # Calculate delay with jitter
                    delay = min(current_delay, max_delay)
                    if jitter:
                        import random
                        delay *= (0.5 + random.random() * 0.5)  # Add 0-50% jitter
                    
                    logger.warning(f"Attempt {attempt + 1}/{max_retries + 1} failed for {func.__name__}: {e}. Retrying in {delay:.2f}s")
                    await asyncio.sleep(delay)
                    current_delay *= backoff_factor
                    
                except NonRetryableError as e:
                    logger.error(f"Non-retryable error in {func.__name__}: {e}")
                    raise e
                except Exception as e:
                    logger.error(f"Unexpected error in {func.__name__}: {e}")
                    raise e
            
            # This should never be reached
            raise last_exception or Exception("Unknown error occurred")
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            last_exception = None
            current_delay = initial_delay
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except RetryableError as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        logger.error(f"Max retries ({max_retries}) exceeded for {func.__name__}: {e}")
                        raise e
                    
                    # Calculate delay with jitter
                    delay = min(current_delay, max_delay)
                    if jitter:
                        import random
                        delay *= (0.5 + random.random() * 0.5)  # Add 0-50% jitter
                    
                    logger.warning(f"Attempt {attempt + 1}/{max_retries + 1} failed for {func.__name__}: {e}. Retrying in {delay:.2f}s")
                    time.sleep(delay)
                    current_delay *= backoff_factor
                    
                except NonRetryableError as e:
                    logger.error(f"Non-retryable error in {func.__name__}: {e}")
                    raise e
                except Exception as e:
                    logger.error(f"Unexpected error in {func.__name__}: {e}")
                    raise e
            
            # This should never be reached
            raise last_exception or Exception("Unknown error occurred")
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: float = 60.0,
    expected_exception: type = Exception
):
    """
    Circuit breaker decorator to prevent cascading failures
    
    Args:
        failure_threshold: Number of failures before opening circuit
        recovery_timeout: Time to wait before attempting recovery
        expected_exception: Exception type to count as failures
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        failure_count = 0
        last_failure_time = None
        circuit_open = False
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            nonlocal failure_count, last_failure_time, circuit_open
            
            # Check if circuit is open and if we should attempt recovery
            if circuit_open:
                if time.time() - last_failure_time > recovery_timeout:
                    logger.info(f"Circuit breaker attempting recovery for {func.__name__}")
                    circuit_open = False
                    failure_count = 0
                else:
                    raise Exception(f"Circuit breaker is open for {func.__name__}")
            
            try:
                result = await func(*args, **kwargs)
                # Reset failure count on success
                failure_count = 0
                return result
            except expected_exception as e:
                failure_count += 1
                last_failure_time = time.time()
                
                if failure_count >= failure_threshold:
                    circuit_open = True
                    logger.error(f"Circuit breaker opened for {func.__name__} after {failure_count} failures")
                
                raise e
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            nonlocal failure_count, last_failure_time, circuit_open
            
            # Check if circuit is open and if we should attempt recovery
            if circuit_open:
                if time.time() - last_failure_time > recovery_timeout:
                    logger.info(f"Circuit breaker attempting recovery for {func.__name__}")
                    circuit_open = False
                    failure_count = 0
                else:
                    raise Exception(f"Circuit breaker is open for {func.__name__}")
            
            try:
                result = func(*args, **kwargs)
                # Reset failure count on success
                failure_count = 0
                return result
            except expected_exception as e:
                failure_count += 1
                last_failure_time = time.time()
                
                if failure_count >= failure_threshold:
                    circuit_open = True
                    logger.error(f"Circuit breaker opened for {func.__name__} after {failure_count} failures")
                
                raise e
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def timeout(seconds: float):
    """
    Timeout decorator for database operations
    
    Args:
        seconds: Timeout in seconds
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=seconds)
            except asyncio.TimeoutError:
                logger.error(f"Operation {func.__name__} timed out after {seconds} seconds")
                raise Exception(f"Operation timed out after {seconds} seconds")
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            import signal
            
            def timeout_handler(signum, frame):
                raise TimeoutError(f"Operation {func.__name__} timed out after {seconds} seconds")
            
            # Set up timeout
            old_handler = signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(int(seconds))
            
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                # Restore old handler
                signal.alarm(0)
                signal.signal(signal.SIGALRM, old_handler)
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Convenience decorators combining multiple patterns
def resilient_operation(
    max_retries: int = 3,
    timeout_seconds: float = 30.0,
    circuit_breaker_threshold: int = 5
):
    """
    Combined decorator with retry, timeout, and circuit breaker
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        # Apply decorators in order: timeout -> circuit breaker -> retry
        decorated_func = timeout(timeout_seconds)(func)
        decorated_func = circuit_breaker(circuit_breaker_threshold)(decorated_func)
        decorated_func = retry_with_backoff(max_retries)(decorated_func)
        return decorated_func
    
    return decorator

