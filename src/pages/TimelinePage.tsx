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
import ErrorToast from '../components/ErrorToast';
import HeaderProgress from '../components/HeaderProgress';
import { toast } from 'react-toastify';
import { useAutoTrim } from '../hooks/useAutoTrim';
import { getEffectiveTimelineDuration } from '../utils/videoTimeUtils';

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
  
  const { layers, playheadTime, zoom, duration, isPlaying, validationState } = useSelector(
    (state: RootState) => state.timeline
  );

  // Auto-trim hook for automatic backend processing
  useAutoTrim(projectId);

  // State for video blob URL
  const [videoBlobUrl, setVideoBlobUrl] = React.useState<string>('');

  // Fetch video as blob with authentication
  React.useEffect(() => {
    if (!projectId) return;

    const fetchVideoBlob = async () => {
      try {
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
        const videoUrl = `${apiBaseUrl}/media/${projectId}/video`;
        
        // Get auth token
        const tokens = localStorage.getItem('auth_tokens');
        if (!tokens) {
          console.error('No auth tokens found');
          return;
        }

        const parsedTokens = JSON.parse(tokens);
        const accessToken = parsedTokens.access_token || parsedTokens.accessToken;
        
        if (!accessToken) {
          console.error('No access token found');
          return;
        }

        // Fetch video with authentication
        const response = await fetch(videoUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status}`);
        }

        // Create blob URL
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setVideoBlobUrl(blobUrl);

        console.log('✅ Video blob URL created:', blobUrl);
      } catch (error) {
        console.error('❌ Failed to fetch video blob:', error);
      }
    };

    fetchVideoBlob();

    // Cleanup blob URL on unmount
    return () => {
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
    };
  }, [projectId]);

  // Memoize video URL to prevent unnecessary re-renders
  const videoUrl = React.useMemo(() => {
    return videoBlobUrl;
  }, [videoBlobUrl]);

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
    if (currentProject && currentProject.duration && projectId) {
      console.log('DEBUG: Project duration received:', currentProject.duration, 'type:', typeof currentProject.duration);
      console.log('DEBUG: Full project object:', currentProject);
      
      dispatch(setDuration(currentProject.duration));
      
      // Create video layer immediately - let Redux handle duplicates
      console.log('DEBUG: Creating video layer for project:', projectId);
      
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const videoLayer: Layer = {
        id: `video-layer-${projectId}`, // Use projectId to make it unique
        name: 'Video',
        type: 'video',
        clips: [{
          id: `video-clip-${projectId}`,
          type: 'video',
          startTime: 0,
          endTime: currentProject.duration,
          duration: currentProject.duration,
          originalStartTime: 0, // Original video starts at 0
          sourcePath: `${apiBaseUrl}/media/${projectId}/video`,
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
      
      dispatch(addLayer(videoLayer));
      console.log('DEBUG: Video layer dispatched for project:', projectId);
    }
  }, [currentProject, dispatch, projectId]);

  const handleBack = () => {
    navigate('/projects');
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    toast.success('Timeline saved successfully!');
  };

  const handlePlayPause = () => {
    const effectiveDuration = getEffectiveTimelineDuration(layers);
    
    // If we're at the end and user clicks play, restart from beginning
    if (!isPlaying && playheadTime >= effectiveDuration) {
      dispatch(setPlayheadTime(0));
      dispatch(setIsPlaying(true));
    } else {
      dispatch(setIsPlaying(!isPlaying));
    }
  };

  // Auto-advance timeline when video is playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        const newTime = playheadTimeRef.current + 0.1; // Use ref to get current time
        const effectiveDuration = getEffectiveTimelineDuration(layers);
        
        if (newTime < effectiveDuration) {
          dispatch(setPlayheadTime(newTime));
        } else {
          // Stop playing and clamp playhead to exact end
          dispatch(setPlayheadTime(effectiveDuration));
          dispatch(setIsPlaying(false));
        }
      }, 100);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, layers, dispatch]); // Use layers instead of currentProject.duration

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
      <ErrorToast />
      <Header>
        <Title>{currentProject.name} - Timeline Editor</Title>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <HeaderProgress 
            isProcessing={validationState.isValidating} 
          />
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
