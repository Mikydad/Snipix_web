# Snipix Web - Video Editing App

A web-based video editing application with a CapCut-inspired timeline interface, featuring AI-powered transcription and filler word removal.

## Features

### Upload and Process Workflow
- **File Upload**: Drag-and-drop or file input for video files (MP4, MOV, max 2GB)
- **AI Transcription**: Local Whisper AI integration for audio transcription with timestamps
- **Filler Removal**: Automatic and manual removal of filler words (um, uh, like)
- **Video Processing**: FFmpeg-based video trimming and processing

### Timeline Editor
- **CapCut-Inspired Interface**: Static centered playhead with movable timeline
- **Multi-Layer Support**: Unlimited video, audio, text, effects, and overlay layers
- **Advanced Editing**: Clip trimming, splitting, transitions, keyframes, markers
- **Real-time Preview**: Live video preview with playhead synchronization
- **Gesture Support**: Mouse and touch gestures for desktop and mobile

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Redux Toolkit** for state management
- **Styled Components** for styling
- **React Router** for navigation
- **React Dropzone** for file uploads
- **React Use Gesture** for touch/mouse interactions
- **Video.js** for video playback

### Backend
- **FastAPI** (Python) for API server
- **MongoDB** for local database
- **FFmpeg** for video processing
- **Faster-Whisper** for AI transcription
- **JWT** for authentication

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- FFmpeg installed locally
- Docker (for MongoDB)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
pip install -r requirements.txt
```

### 2. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name snipix-mongo mongo:latest

# Or install MongoDB locally
```

### 3. Configure Environment

Create `.env` file in the backend directory:

```env
MONGODB_URL=mongodb://localhost:27017/snipix
JWT_SECRET=your-secret-key-here
MEDIA_DIR=./media
```

### 4. Start the Application

```bash
# Terminal 1: Start backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Project Structure

```
snipix-web/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── pages/             # Page components
│   ├── redux/             # Redux store and slices
│   ├── services/          # API services
│   ├── types/             # TypeScript interfaces
│   └── utils/             # Utility functions
├── backend/               # FastAPI backend
│   ├── api/               # API endpoints
│   ├── models/            # Pydantic schemas
│   ├── services/          # Business logic
│   ├── tests/             # Backend tests
│   └── media/             # Uploaded media files
└── tests/                 # Frontend tests
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Media Processing
- `POST /upload-media` - Upload video file
- `POST /transcribe-audio` - Transcribe video audio
- `POST /remove-fillers` - Remove filler words
- `POST /process-trim` - Trim video segments

### Projects
- `GET /projects` - List user projects
- `POST /projects` - Create new project
- `GET /projects/{id}` - Get project details
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project

### Timeline
- `POST /timeline/save` - Save timeline state
- `GET /timeline/{project_id}` - Get timeline data
- `POST /timeline/render-preview` - Generate preview

## Usage Workflow

### 1. Upload Video
- Navigate to the upload page
- Drag and drop or select a video file
- Wait for upload completion

### 2. Transcribe and Process
- Review the generated transcript
- Select filler words to remove (manual) or use automatic detection
- Preview the processed video
- Choose to edit in timeline or save

### 3. Timeline Editing
- Add multiple layers (video, audio, text, effects)
- Trim and split clips using the playhead
- Apply transitions and effects
- Use keyframes for animations
- Export final video

## Development

### Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd backend
pytest
```

### Code Quality

The codebase follows:
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Comprehensive error handling
- Accessibility standards (ARIA labels, keyboard navigation)

## Performance Considerations

- Canvas-based timeline rendering for smooth performance
- Virtualized track rendering for unlimited layers
- Optimized FFmpeg commands for video processing
- Async I/O for file operations
- Efficient Redux state management

## Security

- JWT-based authentication
- Input validation with Pydantic
- File type and size validation
- Secure file storage with UUID naming
- CORS configuration

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Mobile Support

- Responsive design
- Touch gesture support
- Optimized UI for mobile browsers
- Progressive Web App features

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: Install FFmpeg and ensure it's in your PATH
2. **MongoDB connection**: Check if MongoDB is running on port 27017
3. **File upload size**: Ensure video files are under 2GB
4. **Whisper model**: First transcription may take longer as it downloads the model

### Logs

- Frontend logs: Browser console
- Backend logs: Terminal running uvicorn
- MongoDB logs: Docker logs (if using Docker)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

