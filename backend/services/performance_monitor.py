"""
Performance Monitoring and Optimization Service
"""
import logging
import time
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
import psutil
import threading

from services.database import get_database_stats, test_database_connection
from utils.error_handlers import ErrorContext

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Performance monitoring service for the application"""
    
    def __init__(self):
        self.metrics = {
            "api_calls": defaultdict(int),
            "response_times": defaultdict(list),
            "error_counts": defaultdict(int),
            "database_operations": defaultdict(int),
            "memory_usage": deque(maxlen=100),
            "cpu_usage": deque(maxlen=100),
            "active_connections": deque(maxlen=100)
        }
        self.start_time = datetime.now()
        self.monitoring_active = False
        self.monitor_thread = None
    
    def start_monitoring(self):
        """Start performance monitoring"""
        if not self.monitoring_active:
            self.monitoring_active = True
            self.monitor_thread = threading.Thread(target=self._monitor_system_resources)
            self.monitor_thread.daemon = True
            self.monitor_thread.start()
            logger.info("Performance monitoring started")
    
    def stop_monitoring(self):
        """Stop performance monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1)
        logger.info("Performance monitoring stopped")
    
    def _monitor_system_resources(self):
        """Monitor system resources in background thread"""
        while self.monitoring_active:
            try:
                # Monitor memory usage
                try:
                    memory_info = psutil.virtual_memory()
                    self.metrics["memory_usage"].append({
                        "timestamp": datetime.now().isoformat(),
                        "used_percent": memory_info.percent,
                        "used_mb": memory_info.used / 1024 / 1024,
                        "available_mb": memory_info.available / 1024 / 1024
                    })
                except Exception as e:
                    logger.debug(f"Could not get memory info: {e}")
                
                # Monitor CPU usage
                try:
                    cpu_percent = psutil.cpu_percent(interval=0.1)  # Reduced interval
                    self.metrics["cpu_usage"].append({
                        "timestamp": datetime.now().isoformat(),
                        "cpu_percent": cpu_percent
                    })
                except Exception as e:
                    logger.debug(f"Could not get CPU info: {e}")
                
                # Monitor active connections (skip if permission denied)
                try:
                    connections = len(psutil.net_connections())
                    self.metrics["active_connections"].append({
                        "timestamp": datetime.now().isoformat(),
                        "count": connections
                    })
                except (psutil.AccessDenied, PermissionError):
                    logger.debug("Skipping network connections monitoring (permission denied)")
                except Exception as e:
                    logger.debug(f"Could not get network connections: {e}")
                
                time.sleep(10)  # Monitor every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in performance monitoring: {e}")
                time.sleep(30)  # Wait longer on error
    
    def record_api_call(self, endpoint: str, method: str, response_time: float, status_code: int):
        """Record API call metrics"""
        key = f"{method} {endpoint}"
        self.metrics["api_calls"][key] += 1
        self.metrics["response_times"][key].append(response_time)
        
        if status_code >= 400:
            self.metrics["error_counts"][key] += 1
    
    def record_database_operation(self, operation: str, duration: float):
        """Record database operation metrics"""
        self.metrics["database_operations"][operation] += 1
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        uptime = datetime.now() - self.start_time
        
        # Calculate average response times
        avg_response_times = {}
        for endpoint, times in self.metrics["response_times"].items():
            if times:
                avg_response_times[endpoint] = sum(times) / len(times)
        
        # Calculate error rates
        error_rates = {}
        for endpoint, calls in self.metrics["api_calls"].items():
            errors = self.metrics["error_counts"].get(endpoint, 0)
            error_rates[endpoint] = (errors / calls * 100) if calls > 0 else 0
        
        # Get latest system metrics
        latest_memory = self.metrics["memory_usage"][-1] if self.metrics["memory_usage"] else None
        latest_cpu = self.metrics["cpu_usage"][-1] if self.metrics["cpu_usage"] else None
        latest_connections = self.metrics["active_connections"][-1] if self.metrics["active_connections"] else None
        
        return {
            "uptime_seconds": uptime.total_seconds(),
            "uptime_human": str(uptime),
            "total_api_calls": sum(self.metrics["api_calls"].values()),
            "total_database_operations": sum(self.metrics["database_operations"].values()),
            "average_response_times": avg_response_times,
            "error_rates": error_rates,
            "system_metrics": {
                "memory": latest_memory,
                "cpu": latest_cpu,
                "connections": latest_connections
            },
            "top_endpoints": sorted(
                self.metrics["api_calls"].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10]
        }
    
    def get_detailed_metrics(self) -> Dict[str, Any]:
        """Get detailed performance metrics"""
        return {
            "metrics": self.metrics,
            "monitoring_active": self.monitoring_active,
            "start_time": self.start_time.isoformat(),
            "current_time": datetime.now().isoformat()
        }
    
    def reset_metrics(self):
        """Reset all performance metrics"""
        self.metrics = {
            "api_calls": defaultdict(int),
            "response_times": defaultdict(list),
            "error_counts": defaultdict(int),
            "database_operations": defaultdict(int),
            "memory_usage": deque(maxlen=100),
            "cpu_usage": deque(maxlen=100),
            "active_connections": deque(maxlen=100)
        }
        self.start_time = datetime.now()
        logger.info("Performance metrics reset")


class DatabasePerformanceMonitor:
    """Database-specific performance monitoring"""
    
    def __init__(self):
        self.query_times = defaultdict(list)
        self.connection_pool_stats = {}
        self.index_usage = defaultdict(int)
    
    async def get_database_performance_metrics(self) -> Dict[str, Any]:
        """Get database performance metrics"""
        try:
            # Get database stats
            db_stats = await get_database_stats()
            
            # Test connection performance
            start_time = time.time()
            connected = await test_database_connection()
            connection_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Calculate average query times
            avg_query_times = {}
            for operation, times in self.query_times.items():
                if times:
                    avg_query_times[operation] = sum(times) / len(times)
            
            return {
                "database_stats": db_stats,
                "connection_performance": {
                    "connected": connected,
                    "connection_time_ms": connection_time
                },
                "query_performance": avg_query_times,
                "index_usage": dict(self.index_usage),
                "connection_pool": self.connection_pool_stats
            }
            
        except Exception as e:
            logger.error(f"Failed to get database performance metrics: {e}")
            return {
                "error": str(e),
                "database_stats": None,
                "connection_performance": {"connected": False}
            }
    
    def record_query_time(self, operation: str, duration: float):
        """Record database query execution time"""
        self.query_times[operation].append(duration)
        # Keep only last 100 measurements
        if len(self.query_times[operation]) > 100:
            self.query_times[operation] = self.query_times[operation][-100:]
    
    def record_index_usage(self, index_name: str):
        """Record index usage"""
        self.index_usage[index_name] += 1


class PerformanceOptimizer:
    """Performance optimization utilities"""
    
    @staticmethod
    def optimize_database_queries() -> List[str]:
        """Suggest database query optimizations"""
        suggestions = []
        
        # Check for missing indexes
        suggestions.append("Ensure all frequently queried fields have indexes")
        suggestions.append("Use compound indexes for multi-field queries")
        suggestions.append("Consider partial indexes for filtered queries")
        
        # Query optimization suggestions
        suggestions.append("Use projection to limit returned fields")
        suggestions.append("Implement pagination for large result sets")
        suggestions.append("Use aggregation pipelines for complex queries")
        
        return suggestions
    
    @staticmethod
    def optimize_api_performance() -> List[str]:
        """Suggest API performance optimizations"""
        suggestions = []
        
        # Caching suggestions
        suggestions.append("Implement Redis caching for frequently accessed data")
        suggestions.append("Use HTTP caching headers for static content")
        suggestions.append("Cache database query results")
        
        # Response optimization
        suggestions.append("Compress API responses")
        suggestions.append("Use pagination for large datasets")
        suggestions.append("Implement request batching")
        
        return suggestions
    
    @staticmethod
    def optimize_memory_usage() -> List[str]:
        """Suggest memory usage optimizations"""
        suggestions = []
        
        # Memory management
        suggestions.append("Implement connection pooling")
        suggestions.append("Use lazy loading for large objects")
        suggestions.append("Clear unused data structures")
        
        # Resource management
        suggestions.append("Monitor memory leaks")
        suggestions.append("Use generators for large data processing")
        suggestions.append("Implement garbage collection tuning")
        
        return suggestions


# Global performance monitoring instances
performance_monitor = PerformanceMonitor()
database_performance_monitor = DatabasePerformanceMonitor()
performance_optimizer = PerformanceOptimizer()


class PerformanceMiddleware:
    """Middleware for performance monitoring"""
    
    def __init__(self, app):
        self.app = app
        self.performance_monitor = performance_monitor
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            start_time = time.time()
            
            # Process request
            await self.app(scope, receive, send)
            
            # Record metrics
            response_time = time.time() - start_time
            method = scope.get("method", "UNKNOWN")
            path = scope.get("path", "/")
            
            # Extract status code from response (simplified)
            self.performance_monitor.record_api_call(path, method, response_time, 200)
        
        else:
            await self.app(scope, receive, send)
