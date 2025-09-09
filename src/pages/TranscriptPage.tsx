import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAppSelector, useAppDispatch } from '../redux/store';
import { fetchProjectById } from '../redux/slices/projectSlice';
import { 
  transcribeAudio, 
  removeFillers, 
  removeAutoDetectedFillers,
  toggleWordSelection,
  clearSelection,
  selectWords
} from '../redux/slices/transcriptSlice';

const TranscriptContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ProjectInfo = styled.div``;

const ProjectTitle = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const ProjectDuration = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Button = styled.button<{ $primary?: boolean; $secondary?: boolean }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  
  background: ${({ theme, $primary, $secondary }) => 
    $primary ? theme.colors.primary :
    $secondary ? theme.colors.secondary :
    theme.colors.surfaceHover};
  color: ${({ theme, $primary, $secondary }) => 
    $primary || $secondary ? 'white' : theme.colors.text};
  
  &:hover {
    background: ${({ theme, $primary, $secondary }) => 
      $primary ? theme.colors.primaryHover :
      $secondary ? theme.colors.secondary + 'dd' :
      theme.colors.border};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.xl};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const TranscriptSection = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TranscriptText = styled.div`
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text};
`;

const Word = styled.span<{ $selected?: boolean; $isFiller?: boolean }>`
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  background: ${({ theme, $selected, $isFiller }) => 
    $selected ? theme.colors.primary + '40' :
    $isFiller ? theme.colors.error + '20' :
    'transparent'};
  color: ${({ theme, $selected, $isFiller }) => 
    $selected ? theme.colors.primary :
    $isFiller ? theme.colors.error :
    theme.colors.text};
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary + '20'};
  }
`;

const VideoSection = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const VideoPlayer = styled.video`
  width: 100%;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: #000;
`;

const Controls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
`;

const StatusIndicator = styled.div<{ $status: 'idle' | 'transcribing' | 'processing' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.875rem;
  
  background: ${({ theme, $status }) => 
    $status === 'transcribing' ? theme.colors.warning + '20' :
    $status === 'processing' ? theme.colors.primary + '20' :
    theme.colors.surfaceHover};
  color: ${({ theme, $status }) => 
    $status === 'transcribing' ? theme.colors.warning :
    $status === 'processing' ? theme.colors.primary :
    theme.colors.textSecondary};
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const TranscriptPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { currentProject } = useAppSelector(state => state.projects);
  const { words, isTranscribing, selectedWords } = useAppSelector(state => state.transcript);
  
  const [videoUrl, setVideoUrl] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectById(projectId));
    }
  }, [projectId, dispatch]);

  // Fetch video as blob with authentication
  useEffect(() => {
    if (!currentProject?._id) return;

    const fetchVideoBlob = async () => {
      try {
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
        const videoApiUrl = `${apiBaseUrl}/media/${currentProject._id}/video`;
        
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
        const response = await fetch(videoApiUrl, {
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
        setVideoUrl(blobUrl);

        console.log('✅ Video blob URL created for transcript:', blobUrl);
      } catch (error) {
        console.error('❌ Failed to fetch video blob for transcript:', error);
      }
    };

    fetchVideoBlob();

    // Cleanup blob URL on unmount
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [currentProject]);

  const handleTranscribe = async () => {
    if (!projectId) return;
    
    try {
      await dispatch(transcribeAudio(projectId)).unwrap();
      toast.success('Transcription completed!');
    } catch (error) {
      toast.error('Transcription failed. Please try again.');
    }
  };

  const handleRemoveSelectedFillers = async () => {
    if (!projectId || selectedWords.length === 0) return;
    
    try {
      await dispatch(removeFillers({ projectId, selectedWords })).unwrap();
      toast.success('Selected fillers removed!');
      dispatch(clearSelection());
    } catch (error) {
      toast.error('Failed to remove fillers. Please try again.');
    }
  };

  const handleRemoveAutoDetectedFillers = async () => {
    if (!projectId) return;
    
    try {
      await dispatch(removeAutoDetectedFillers(projectId)).unwrap();
      toast.success('Auto-detected fillers removed!');
    } catch (error) {
      toast.error('Failed to remove auto-detected fillers. Please try again.');
    }
  };

  const handleWordClick = (wordId: string) => {
    dispatch(toggleWordSelection(wordId));
  };

  const handleEditInTimeline = () => {
    if (projectId) {
      navigate(`/timeline/${projectId}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatus = () => {
    if (isTranscribing) return 'transcribing';
    if (words.length > 0) return 'idle';
    return 'idle';
  };

  if (!currentProject) {
    return <div>Loading...</div>;
  }

  return (
    <TranscriptContainer>
      <Header>
        <ProjectInfo>
          <ProjectTitle>{currentProject.name}</ProjectTitle>
          <ProjectDuration>
            Duration: {formatTime(currentProject.duration || 0)}
          </ProjectDuration>
        </ProjectInfo>
        
        <ActionButtons>
          <Button 
            $primary 
            onClick={handleTranscribe}
            disabled={isTranscribing || words.length > 0}
          >
            {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
          </Button>
          <Button 
            $secondary 
            onClick={handleEditInTimeline}
            disabled={words.length === 0}
          >
            Edit in Timeline
          </Button>
        </ActionButtons>
      </Header>

      <ContentGrid>
        <TranscriptSection>
          <SectionTitle>
            📝 Transcript
            <StatusIndicator $status={getStatus()}>
              {isTranscribing && <LoadingSpinner />}
              {words.length > 0 ? `${words.length} words` : 'No transcript'}
            </StatusIndicator>
          </SectionTitle>
          
          {words.length > 0 ? (
            <TranscriptText>
              {words.map((word, index) => (
                <Word
                  key={`${word.start}-${word.end}-${index}`}
                  $selected={selectedWords.includes(`${word.start}-${word.end}`)}
                  $isFiller={word.isFiller}
                  onClick={() => handleWordClick(`${word.start}-${word.end}`)}
                  title={`${word.text} (${formatTime(word.start)} - ${formatTime(word.end)})`}
                >
                  {word.text}
                </Word>
              ))}
            </TranscriptText>
          ) : (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              {isTranscribing ? 'Transcribing audio...' : 'Click "Transcribe Audio" to generate transcript'}
            </div>
          )}
          
          {words.length > 0 && (
            <Controls>
              <Button 
                onClick={handleRemoveSelectedFillers}
                disabled={selectedWords.length === 0}
              >
                Remove Selected ({selectedWords.length})
              </Button>
              <Button 
                onClick={handleRemoveAutoDetectedFillers}
              >
                Remove Auto-Detected Fillers
              </Button>
              <Button 
                onClick={() => dispatch(clearSelection())}
                disabled={selectedWords.length === 0}
              >
                Clear Selection
              </Button>
            </Controls>
          )}
        </TranscriptSection>

        <VideoSection>
          <SectionTitle>🎬 Video Preview</SectionTitle>
          {videoUrl && (
            <VideoPlayer controls>
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </VideoPlayer>
          )}
        </VideoSection>
      </ContentGrid>
    </TranscriptContainer>
  );
};

export default TranscriptPage;

