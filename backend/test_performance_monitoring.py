#!/usr/bin/env python3
"""
Test script for Performance Monitoring
"""
import asyncio
import sys
import os
import time

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database import init_db
from services.performance_monitor import (
    performance_monitor, database_performance_monitor, performance_optimizer
)


async def test_performance_monitoring():
    """Test performance monitoring functionality"""
    print("🚀 Testing Performance Monitoring...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Start performance monitoring
        print("📊 Starting performance monitoring...")
        performance_monitor.start_monitoring()
        
        # Simulate some API calls
        print("🔄 Simulating API calls...")
        for i in range(5):
            performance_monitor.record_api_call("/projects", "GET", 0.1 + i * 0.01, 200)
            performance_monitor.record_api_call("/timeline", "POST", 0.2 + i * 0.02, 200)
            performance_monitor.record_api_call("/transcriptions", "GET", 0.15 + i * 0.01, 200)
        
        # Simulate some database operations
        print("🗄️ Simulating database operations...")
        for i in range(10):
            database_performance_monitor.record_query_time("find_projects", 0.05 + i * 0.01)
            database_performance_monitor.record_query_time("create_project", 0.1 + i * 0.02)
            database_performance_monitor.record_index_usage("projects_user_id")
            database_performance_monitor.record_index_usage("projects_created_at")
        
        # Wait for monitoring to collect some data
        print("⏳ Waiting for monitoring data collection...")
        await asyncio.sleep(15)
        
        # Test performance summary
        print("📈 Testing performance summary...")
        summary = performance_monitor.get_performance_summary()
        print(f"✅ Performance summary:")
        print(f"   Uptime: {summary['uptime_human']}")
        print(f"   Total API calls: {summary['total_api_calls']}")
        print(f"   Total DB operations: {summary['total_database_operations']}")
        print(f"   Top endpoints: {summary['top_endpoints'][:3]}")
        
        # Test detailed metrics
        print("📊 Testing detailed metrics...")
        detailed = performance_monitor.get_detailed_metrics()
        print(f"✅ Detailed metrics:")
        print(f"   Monitoring active: {detailed['monitoring_active']}")
        print(f"   Memory samples: {len(detailed['metrics']['memory_usage'])}")
        print(f"   CPU samples: {len(detailed['metrics']['cpu_usage'])}")
        
        # Test database performance
        print("🗄️ Testing database performance...")
        db_perf = await database_performance_monitor.get_database_performance_metrics()
        print(f"✅ Database performance:")
        print(f"   Connected: {db_perf['connection_performance']['connected']}")
        print(f"   Connection time: {db_perf['connection_performance']['connection_time_ms']:.2f}ms")
        print(f"   Query performance: {db_perf['query_performance']}")
        
        # Test optimization suggestions
        print("💡 Testing optimization suggestions...")
        suggestions = {
            "database": performance_optimizer.optimize_database_queries(),
            "api": performance_optimizer.optimize_api_performance(),
            "memory": performance_optimizer.optimize_memory_usage()
        }
        
        print(f"✅ Optimization suggestions:")
        print(f"   Database: {len(suggestions['database'])} suggestions")
        print(f"   API: {len(suggestions['api'])} suggestions")
        print(f"   Memory: {len(suggestions['memory'])} suggestions")
        
        # Test monitoring status
        print("📊 Testing monitoring status...")
        print(f"✅ Monitoring status:")
        print(f"   Active: {performance_monitor.monitoring_active}")
        print(f"   Start time: {performance_monitor.start_time}")
        
        # Stop monitoring
        print("🛑 Stopping performance monitoring...")
        performance_monitor.stop_monitoring()
        
        print("✅ All performance monitoring tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Performance monitoring test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_performance_monitoring())

