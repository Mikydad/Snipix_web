#!/usr/bin/env python3
"""
Test script for Error Handling and Health Monitoring
"""
import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database import init_db, get_database_stats, test_database_connection
from api.health import health_check, detailed_health_check, service_status, service_metrics


async def test_health_monitoring():
    """Test health monitoring functionality"""
    print("🚀 Testing Health Monitoring and Error Handling...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Test basic health check
        print("🔍 Testing basic health check...")
        health = await health_check()
        print(f"✅ Basic health check: {health['status']}")
        
        # Test detailed health check
        print("🔍 Testing detailed health check...")
        detailed_health = await detailed_health_check()
        print(f"✅ Detailed health check: {detailed_health['status']}")
        print(f"   Database connected: {detailed_health['database']['connected']}")
        print(f"   Database available: {detailed_health['database']['available']}")
        
        if detailed_health['database']['stats']:
            stats = detailed_health['database']['stats']
            print(f"   Database collections: {len(stats.get('collections', {}))}")
            print(f"   Database objects: {stats.get('objects', 0)}")
        
        # Test service status
        print("📊 Testing service status...")
        status = await service_status()
        print(f"✅ Service status: {status['service']} v{status['version']}")
        print(f"   Database status: {status['database']['status']}")
        print(f"   Features enabled: {len(status['features'])}")
        
        # Test service metrics
        print("📈 Testing service metrics...")
        metrics = await service_metrics()
        print(f"✅ Service metrics retrieved")
        print(f"   Database status: {metrics['database']['status']}")
        print(f"   API endpoints: {metrics['api']['total_endpoints']}")
        
        # Test error handling utilities
        print("🛡️ Testing error handling utilities...")
        from utils.error_handlers import (
            classify_mongodb_error, is_retryable_error, 
            is_connection_error, get_user_friendly_message
        )
        
        # Test error classification
        test_errors = [
            Exception("Test error"),
            ConnectionError("Connection failed"),
            ValueError("Invalid value")
        ]
        
        for error in test_errors:
            classified = classify_mongodb_error(error)
            retryable = is_retryable_error(error)
            user_message = get_user_friendly_message(error)
            
            print(f"   Error: {type(error).__name__}")
            print(f"     Classified as: {type(classified).__name__}")
            print(f"     Retryable: {retryable}")
            print(f"     User message: {user_message}")
        
        # Test circuit breaker
        print("⚡ Testing circuit breaker...")
        from middleware.error_handling import database_circuit_breaker
        
        # Test circuit breaker states
        print(f"   Initial state: {database_circuit_breaker.state}")
        print(f"   Can execute: {database_circuit_breaker.can_execute()}")
        
        # Simulate failures
        for i in range(3):
            database_circuit_breaker.record_failure()
            print(f"   After failure {i+1}: {database_circuit_breaker.state}")
        
        # Test recovery
        database_circuit_breaker.record_success()
        print(f"   After success: {database_circuit_breaker.state}")
        
        print("✅ All health monitoring and error handling tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Health monitoring test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_health_monitoring())

