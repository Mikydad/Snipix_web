import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState } from '../redux/store';
import { fetchProjectById } from '../redux/slices/projectSlice';
import { loadTimeline, setDuration, addLayer, setIsPlaying, setPlayheadTime } from '../redux/slices/timelineSlice';
import { Layer } from '../types';
import TimelineEditor from '../components/TimelineEditor';
import VideoPreview from '../components/VideoPreview';
import TimelineToolbar from '../components/TimelineToolbar';
import { toast } from 'react-toastify';
import { useAutoTrim } from '../hooks/useAutoTrim';

const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
  color: white;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
`;

const BackButton = styled.button`
  background: #4a4a4a;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover {
    background: #5a5a5a;
  }
`;

const PlayPauseButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

const VideoSection = styled.div`
  height: 400px;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
`;

const TimelineSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.2rem;
  color: #ccc;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  color: #ff6b6b;
  
  h2 {
    margin-bottom: 1rem;
  }
  
  button {
    background: #4a4a4a;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    
    &:hover {
      background: #5a5a5a;
    }
  }
`;

const TimelinePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { currentProject, isLoading: projectLoading, error: projectError } = useSelector(
    (state: RootState) => state.projects
  );
  
  const { layers, playheadTime, zoom, duration, isPlaying } = useSelector(
    (state: RootState) => state.timeline
  );

  // Auto-trim hook for automatic backend processing
  useAutoTrim(projectId);

  // Memoize video URL to prevent unnecessary re-renders
  const videoUrl = React.useMemo(() => {
    return projectId ? `/media/${projectId}/video` : '';
  }, [projectId]);

  // Use ref to track current playhead time for auto-advance
  const playheadTimeRef = React.useRef(playheadTime);
  playheadTimeRef.current = playheadTime;

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectById(projectId) as any);
      dispatch(loadTimeline(projectId) as any);
    }
  }, [dispatch, projectId]);

  // Set timeline duration when project loads
  useEffect(() => {
    if (currentProject && currentProject.duration) {
      console.log('DEBUG: Project duration received:', currentProject.duration, 'type:', typeof currentProject.duration);
      console.log('DEBUG: Full project object:', currentProject);
      dispatch(setDuration(currentProject.duration));
      
      // Create a video layer with the uploaded video
      const videoLayer: Layer = {
        id: 'video-layer-1',
        name: 'Video',
        type: 'video',
        clips: [{
          id: 'video-clip-1',
          type: 'video',
          startTime: 0,
          endTime: currentProject.duration,
          duration: currentProject.duration,
          originalStartTime: 0, // Original video starts at 0
          sourcePath: `/media/${projectId}/video`,
          content: currentProject.name,
          properties: {
            volume: 1.0,
            speed: 1.0,
            opacity: 1.0,
            easing: 'linear'
          },
          keyframes: []
        }],
        isVisible: true,
        isLocked: false,
        isMuted: false,
        order: 0,
        isMainVideo: true  // Mark as main video layer for gap filling
      };
      
      // Add the video layer if it doesn't exist
      if (layers.length === 0) {
        dispatch(addLayer(videoLayer));
      }
    }
  }, [currentProject, dispatch, projectId]); // Removed layers.length dependency

  const handleBack = () => {
    navigate('/projects');
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    toast.success('Timeline saved successfully!');
  };

  const handlePlayPause = () => {
    dispatch(setIsPlaying(!isPlaying));
  };

  // Auto-advance timeline when video is playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentProject?.duration) {
      interval = setInterval(() => {
        const newTime = playheadTimeRef.current + 0.1; // Use ref to get current time
        if (newTime <= (currentProject.duration || 0)) {
          dispatch(setPlayheadTime(newTime));
        } else {
          // Stop playing when we reach the end
          dispatch(setIsPlaying(false));
        }
      }, 100);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, currentProject?.duration, dispatch]); // Removed playheadTime dependency

  if (projectLoading) {
    return (
      <LoadingContainer>
        Loading timeline...
      </LoadingContainer>
    );
  }

  if (projectError) {
    return (
      <ErrorContainer>
        <h2>Error loading timeline</h2>
        <p>{projectError}</p>
        <button onClick={handleBack}>Go Back</button>
      </ErrorContainer>
    );
  }

  if (!currentProject) {
    return (
      <ErrorContainer>
        <h2>Project not found</h2>
        <button onClick={handleBack}>Go Back</button>
      </ErrorContainer>
    );
  }

  return (
    <TimelineContainer>
      <Header>
        <Title>{currentProject.name} - Timeline Editor</Title>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <PlayPauseButton onClick={handlePlayPause}>
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </PlayPauseButton>
          <BackButton onClick={handleBack}>Back to Projects</BackButton>
          <BackButton onClick={handleSave}>Save</BackButton>
        </div>
      </Header>
      
      <MainContent>
        <VideoSection>
          <VideoPreview 
            videoUrl={videoUrl}
            currentTime={playheadTime}
            isPlaying={isPlaying}
            layers={layers}
          />
        </VideoSection>
        
        <TimelineSection>
          <TimelineToolbar projectId={projectId} />
          <TimelineEditor 
            projectId={projectId || ''}
            layers={layers}
            playheadTime={playheadTime}
            zoom={zoom}
            duration={duration}
          />
        </TimelineSection>
      </MainContent>
    </TimelineContainer>
  );
};

export default TimelinePage;
