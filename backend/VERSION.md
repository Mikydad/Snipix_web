# Snipix Backend - Version Info

## Version 1.2.0
**Release Date**: September 8, 2025  
**Python Version**: 3.13  
**FastAPI Version**: Latest  

### Backend Version History
- **v1.0.0**: Initial release with in-memory storage
- **v1.1.0**: Added MongoDB Atlas integration (unstable)
- **v1.2.0**: Fixed MongoDB integration, video processing, and trimming

### Key Backend Changes in v1.2.0
- Fixed MongoDB connection timeout issues
- Updated all API endpoints to use MongoDB-based project service
- Fixed video trimming functionality
- Added proper error handling and validation
- Improved media processing pipeline

### API Endpoints Status
- ✅ `/projects/` - Project CRUD operations
- ✅ `/media/upload` - Video upload with thumbnail generation
- ✅ `/media/transcribe` - Audio transcription
- ✅ `/media/trim-video` - Video trimming
- ✅ `/media/{project_id}/video` - Video serving
- ✅ `/media/{project_id}/thumbnail` - Thumbnail serving
- ✅ `/health` - Health monitoring

### Database Schema Updates
- Added `video_path` field to projects
- Added `trimmed_video_path` and `trimmed_duration` fields
- Improved project update handling

### Dependencies
- MongoDB Community Edition (local)
- FastAPI with async support
- FFmpeg for video processing
- Whisper for transcription
- Motor for async MongoDB operations
