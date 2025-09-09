#!/usr/bin/env python3
"""
Data Migration Script for MongoDB Integration
"""
import asyncio
import sys
import os
import argparse
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database import init_db, get_users_collection
from services.migration_service import migration_service


async def create_migration_user():
    """Create a migration user for testing"""
    # Initialize database first
    await init_db()
    
    users_collection = get_users_collection()
    
    # Check if migration user already exists
    existing_user = await users_collection.find_one({"email": "migration@example.com"})
    if existing_user:
        user_id = str(existing_user['_id'])
        print(f"✅ Migration user already exists: {user_id}")
    else:
        # Create migration user
        migration_user = {
            "email": "migration@example.com",
            "name": "Migration User",
            "username": "migration",
            "is_active": True,
            "is_verified": True,
            "preferences": {},
            "created_at": asyncio.get_event_loop().time(),
            "updated_at": asyncio.get_event_loop().time()
        }
        
        result = await users_collection.insert_one(migration_user)
        user_id = str(result.inserted_id)
        print(f"✅ Created migration user: {user_id}")
    
    return user_id


async def migrate_from_file(input_file: str, user_id: str):
    """Migrate data from simple API file to MongoDB"""
    print(f"🚀 Starting migration from {input_file}...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Run migration
        result = await migration_service.migrate_from_simple_api(input_file, user_id)
        
        if result["success"]:
            print("✅ Migration completed successfully!")
            print(f"   Projects migrated: {result['stats']['projects_migrated']}")
            print(f"   Timeline states migrated: {result['stats']['timeline_states_migrated']}")
            print(f"   Transcriptions migrated: {result['stats']['transcriptions_migrated']}")
            print(f"   Errors: {result['stats']['errors']}")
            
            if result['errors']:
                print("\n⚠️ Errors encountered:")
                for error in result['errors']:
                    print(f"   - {error}")
        else:
            print("❌ Migration failed!")
            print(f"   Errors: {result['errors']}")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()


async def export_to_file(user_id: str, output_file: str):
    """Export MongoDB data to simple API format"""
    print(f"📤 Starting export to {output_file}...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Run export
        result = await migration_service.export_to_simple_api_format(user_id, output_file)
        
        if result["success"]:
            print("✅ Export completed successfully!")
            print(f"   Projects exported: {result['exported_projects']}")
            print(f"   Timeline states exported: {result['exported_timeline_states']}")
            print(f"   Transcriptions exported: {result['exported_transcriptions']}")
            print(f"   Output file: {result['output_file']}")
        else:
            print("❌ Export failed!")
            print(f"   Error: {result['error']}")
            
    except Exception as e:
        print(f"❌ Export failed: {e}")
        import traceback
        traceback.print_exc()


async def create_sample_data(user_id: str):
    """Create sample data for testing migration"""
    print("📝 Creating sample data for testing...")
    
    try:
        # Initialize database
        print("📡 Initializing database...")
        await init_db()
        
        # Create sample projects
        from services.project_service import project_service
        from models.schemas import ProjectCreate
        
        sample_projects = [
            ProjectCreate(name="Sample Project 1", description="First sample project"),
            ProjectCreate(name="Sample Project 2", description="Second sample project"),
            ProjectCreate(name="Sample Project 3", description="Third sample project")
        ]
        
        created_projects = []
        for project_data in sample_projects:
            project = await project_service.create_project(project_data, user_id)
            created_projects.append(project)
            print(f"✅ Created project: {project.name}")
        
        # Export sample data
        output_file = "sample_data.json"
        await export_to_file(user_id, output_file)
        
        print(f"✅ Sample data created and exported to {output_file}")
        
    except Exception as e:
        print(f"❌ Failed to create sample data: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main function for migration script"""
    parser = argparse.ArgumentParser(description="MongoDB Data Migration Tool")
    parser.add_argument("command", choices=["migrate", "export", "create-sample"], 
                       help="Command to execute")
    parser.add_argument("--input", "-i", help="Input file for migration")
    parser.add_argument("--output", "-o", help="Output file for export")
    parser.add_argument("--user-id", "-u", help="User ID for migration/export")
    
    args = parser.parse_args()
    
    async def run_command():
        # Create migration user if not provided
        if not args.user_id:
            user_id = await create_migration_user()
        else:
            user_id = args.user_id
        
        if args.command == "migrate":
            if not args.input:
                print("❌ Input file required for migration")
                return
            await migrate_from_file(args.input, user_id)
            
        elif args.command == "export":
            if not args.output:
                print("❌ Output file required for export")
                return
            await export_to_file(user_id, args.output)
            
        elif args.command == "create-sample":
            await create_sample_data(user_id)
    
    asyncio.run(run_command())


if __name__ == "__main__":
    main()
