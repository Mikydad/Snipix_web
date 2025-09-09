"""
Data Migration Script for User Authentication
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List
from bson import ObjectId

from services.database import get_async_db, get_projects_collection, get_users_collection
from models.user_schemas import UserDocument, UserRole, UserStatus, AuthProvider
from utils.password_utils import password_utils

logger = logging.getLogger(__name__)

class DataMigration:
    """Handle data migration for authentication system"""
    
    def __init__(self):
        self.db = get_async_db()
        self.projects_collection = get_projects_collection()
        self.users_collection = get_users_collection()
    
    async def create_default_admin_user(self) -> str:
        """Create default admin user if no users exist"""
        try:
            # Check if any users exist
            user_count = await self.users_collection.count_documents({})
            
            if user_count > 0:
                logger.info("Users already exist, skipping admin user creation")
                return None
            
            # Create default admin user
            admin_password = "Admin123!"  # Change this in production
            password_hash = password_utils.hash_password(admin_password)
            
            admin_user_data = {
                "email": "admin@snipix.com",
                "name": "System Administrator",
                "username": "admin",
                "role": UserRole.ADMIN.value,
                "status": UserStatus.ACTIVE.value,
                "auth_provider": AuthProvider.EMAIL.value,
                "is_email_verified": True,
                "password_hash": password_hash,
                "last_login": None,
                "login_count": 0,
                "total_session_time": 0,
                "preferences": {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await self.users_collection.insert_one(admin_user_data)
            admin_id = str(result.inserted_id)
            
            logger.info(f"Created default admin user: admin@snipix.com")
            logger.warning(f"Default admin password: {admin_password} - CHANGE THIS IN PRODUCTION!")
            
            return admin_id
            
        except Exception as e:
            logger.error(f"Failed to create admin user: {e}")
            return None
    
    async def migrate_existing_projects(self) -> Dict[str, Any]:
        """Migrate existing projects to have user ownership"""
        try:
            # Find projects without created_by field
            projects_without_user = await self.projects_collection.find({
                "created_by": {"$exists": False}
            }).to_list(length=None)
            
            if not projects_without_user:
                logger.info("No projects need migration")
                return {"migrated": 0, "errors": 0}
            
            # Get or create default user
            default_user = await self.users_collection.find_one({"email": "admin@snipix.com"})
            if not default_user:
                # Create default user
                default_user_id = await self.create_default_admin_user()
                if not default_user_id:
                    raise Exception("Failed to create default user for migration")
                default_user = await self.users_collection.find_one({"_id": ObjectId(default_user_id)})
            
            default_user_id = str(default_user["_id"])
            
            # Migrate projects
            migrated_count = 0
            error_count = 0
            
            for project in projects_without_user:
                try:
                    await self.projects_collection.update_one(
                        {"_id": project["_id"]},
                        {
                            "$set": {
                                "created_by": default_user_id,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                    migrated_count += 1
                    logger.info(f"Migrated project: {project.get('name', 'Unknown')}")
                    
                except Exception as e:
                    error_count += 1
                    logger.error(f"Failed to migrate project {project.get('_id')}: {e}")
            
            logger.info(f"Project migration completed: {migrated_count} migrated, {error_count} errors")
            return {"migrated": migrated_count, "errors": error_count}
            
        except Exception as e:
            logger.error(f"Project migration failed: {e}")
            return {"migrated": 0, "errors": 1}
    
    async def migrate_timeline_states(self) -> Dict[str, Any]:
        """Migrate timeline states to have user ownership"""
        try:
            timeline_states_collection = self.db.timeline_states
            
            # Find timeline states without created_by field
            timeline_states_without_user = await timeline_states_collection.find({
                "created_by": {"$exists": False}
            }).to_list(length=None)
            
            if not timeline_states_without_user:
                logger.info("No timeline states need migration")
                return {"migrated": 0, "errors": 0}
            
            # Get default user
            default_user = await self.users_collection.find_one({"email": "admin@snipix.com"})
            if not default_user:
                logger.warning("No default user found for timeline state migration")
                return {"migrated": 0, "errors": len(timeline_states_without_user)}
            
            default_user_id = str(default_user["_id"])
            
            # Migrate timeline states
            migrated_count = 0
            error_count = 0
            
            for timeline_state in timeline_states_without_user:
                try:
                    await timeline_states_collection.update_one(
                        {"_id": timeline_state["_id"]},
                        {
                            "$set": {
                                "created_by": default_user_id,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                    migrated_count += 1
                    logger.info(f"Migrated timeline state for project: {timeline_state.get('project_id')}")
                    
                except Exception as e:
                    error_count += 1
                    logger.error(f"Failed to migrate timeline state {timeline_state.get('_id')}: {e}")
            
            logger.info(f"Timeline state migration completed: {migrated_count} migrated, {error_count} errors")
            return {"migrated": migrated_count, "errors": error_count}
            
        except Exception as e:
            logger.error(f"Timeline state migration failed: {e}")
            return {"migrated": 0, "errors": 1}
    
    async def migrate_transcriptions(self) -> Dict[str, Any]:
        """Migrate transcriptions to have user ownership"""
        try:
            transcriptions_collection = self.db.transcriptions
            
            # Find transcriptions without created_by field
            transcriptions_without_user = await transcriptions_collection.find({
                "created_by": {"$exists": False}
            }).to_list(length=None)
            
            if not transcriptions_without_user:
                logger.info("No transcriptions need migration")
                return {"migrated": 0, "errors": 0}
            
            # Get default user
            default_user = await self.users_collection.find_one({"email": "admin@snipix.com"})
            if not default_user:
                logger.warning("No default user found for transcription migration")
                return {"migrated": 0, "errors": len(transcriptions_without_user)}
            
            default_user_id = str(default_user["_id"])
            
            # Migrate transcriptions
            migrated_count = 0
            error_count = 0
            
            for transcription in transcriptions_without_user:
                try:
                    await transcriptions_collection.update_one(
                        {"_id": transcription["_id"]},
                        {
                            "$set": {
                                "created_by": default_user_id,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                    migrated_count += 1
                    logger.info(f"Migrated transcription for project: {transcription.get('project_id')}")
                    
                except Exception as e:
                    error_count += 1
                    logger.error(f"Failed to migrate transcription {transcription.get('_id')}: {e}")
            
            logger.info(f"Transcription migration completed: {migrated_count} migrated, {error_count} errors")
            return {"migrated": migrated_count, "errors": error_count}
            
        except Exception as e:
            logger.error(f"Transcription migration failed: {e}")
            return {"migrated": 0, "errors": 1}
    
    async def create_database_indexes(self) -> bool:
        """Create necessary database indexes for authentication"""
        try:
            # Create indexes for users collection
            await self.users_collection.create_index("email", unique=True)
            await self.users_collection.create_index("username", unique=True, sparse=True)
            await self.users_collection.create_index("google_id", unique=True, sparse=True)
            await self.users_collection.create_index("email_verification_token")
            await self.users_collection.create_index("password_reset_token")
            await self.users_collection.create_index("created_at")
            await self.users_collection.create_index("status")
            await self.users_collection.create_index("role")
            
            # Create indexes for projects collection
            await self.projects_collection.create_index("created_by")
            await self.projects_collection.create_index([("created_by", 1), ("created_at", -1)])
            
            # Create indexes for timeline_states collection
            timeline_states_collection = self.db.timeline_states
            await timeline_states_collection.create_index("created_by")
            await timeline_states_collection.create_index([("project_id", 1), ("created_by", 1)])
            
            # Create indexes for transcriptions collection
            transcriptions_collection = self.db.transcriptions
            await transcriptions_collection.create_index("created_by")
            await transcriptions_collection.create_index([("project_id", 1), ("created_by", 1)])
            
            logger.info("Database indexes created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create database indexes: {e}")
            return False
    
    async def run_full_migration(self) -> Dict[str, Any]:
        """Run complete data migration"""
        logger.info("Starting data migration for authentication system...")
        
        results = {
            "admin_user_created": False,
            "projects_migrated": {"migrated": 0, "errors": 0},
            "timeline_states_migrated": {"migrated": 0, "errors": 0},
            "transcriptions_migrated": {"migrated": 0, "errors": 0},
            "indexes_created": False,
            "overall_success": False
        }
        
        try:
            # Create indexes first
            results["indexes_created"] = await self.create_database_indexes()
            
            # Create admin user
            admin_id = await self.create_default_admin_user()
            results["admin_user_created"] = admin_id is not None
            
            # Migrate data
            results["projects_migrated"] = await self.migrate_existing_projects()
            results["timeline_states_migrated"] = await self.migrate_timeline_states()
            results["transcriptions_migrated"] = await self.migrate_transcriptions()
            
            # Check overall success
            total_errors = (
                results["projects_migrated"]["errors"] +
                results["timeline_states_migrated"]["errors"] +
                results["transcriptions_migrated"]["errors"]
            )
            
            results["overall_success"] = (
                results["indexes_created"] and
                results["admin_user_created"] and
                total_errors == 0
            )
            
            if results["overall_success"]:
                logger.info("Data migration completed successfully!")
            else:
                logger.warning(f"Data migration completed with {total_errors} errors")
            
            return results
            
        except Exception as e:
            logger.error(f"Data migration failed: {e}")
            results["overall_success"] = False
            return results

async def main():
    """Run migration script"""
    migration = DataMigration()
    results = await migration.run_full_migration()
    
    print("\n" + "="*50)
    print("DATA MIGRATION RESULTS")
    print("="*50)
    print(f"Admin User Created: {results['admin_user_created']}")
    print(f"Projects Migrated: {results['projects_migrated']['migrated']} (Errors: {results['projects_migrated']['errors']})")
    print(f"Timeline States Migrated: {results['timeline_states_migrated']['migrated']} (Errors: {results['timeline_states_migrated']['errors']})")
    print(f"Transcriptions Migrated: {results['transcriptions_migrated']['migrated']} (Errors: {results['transcriptions_migrated']['errors']})")
    print(f"Indexes Created: {results['indexes_created']}")
    print(f"Overall Success: {results['overall_success']}")
    print("="*50)
    
    if results['overall_success']:
        print("\n✅ Migration completed successfully!")
        print("You can now use the authentication system.")
    else:
        print("\n❌ Migration completed with errors.")
        print("Please check the logs for details.")

if __name__ == "__main__":
    asyncio.run(main())
