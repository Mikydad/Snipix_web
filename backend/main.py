from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import uuid
from typing import List, Optional
import json

from api.auth import router as auth_router
from api.projects import router as projects_router
from api.media import router as media_router
from api.timeline import router as timeline_router
from services.database import init_db
from services.media_service import MediaService
from models.schemas import *

app = FastAPI(
    title="Snipix API",
    description="Web-based video editing API with AI transcription",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for media
media_dir = os.getenv("MEDIA_DIR", "./media")
os.makedirs(media_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=media_dir), name="static")

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(projects_router, prefix="/projects", tags=["Projects"])
app.include_router(media_router, prefix="/media", tags=["Media"])
app.include_router(timeline_router, prefix="/timeline", tags=["Timeline"])

@app.on_event("startup")
async def startup_event():
    """Initialize database and create necessary directories"""
    await init_db()
    
    # Create media directories
    os.makedirs(os.path.join(media_dir, "videos"), exist_ok=True)
    os.makedirs(os.path.join(media_dir, "processed"), exist_ok=True)
    os.makedirs(os.path.join(media_dir, "thumbnails"), exist_ok=True)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Snipix API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/test")
async def test_endpoint():
    """Test endpoint without authentication"""
    return {"message": "Test endpoint works without authentication"}

@app.post("/test")
async def test_post_endpoint():
    """Test POST endpoint without authentication"""
    return {"message": "Test POST endpoint works without authentication"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
