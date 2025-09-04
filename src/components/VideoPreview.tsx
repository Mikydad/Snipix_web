import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
`;

const VideoElement = styled.video`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
`;

const VideoControls = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  background: rgba(0, 0, 0, 0.8);
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(10px);
  
  ${VideoContainer}:hover & {
    opacity: 1;
  }
`;

const ControlButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border-radius: 4px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TimeDisplay = styled.div`
  color: white;
  font-size: 12px;
  font-family: monospace;
  display: flex;
  align-items: center;
  padding: 0 ${({ theme }) => theme.spacing.sm};
`;

const ProgressBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  border-radius: 0 0 8px 8px;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: ${({ theme }) => theme.colors.primary};
  transition: width 0.1s ease;
`;

interface VideoPreviewProps {
  videoUrl: string;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = React.memo(({
  videoUrl,
  currentTime,
  isPlaying,
  onTimeUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = React.useState(0);
  const [currentVideoTime, setCurrentVideoTime] = React.useState(0);

  // Sync video with timeline (when timeline changes)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = currentTime;
      setCurrentVideoTime(currentTime);
    }
  }, [currentTime]);

  // Sync play state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime;
      setCurrentVideoTime(newTime);
      // Notify parent component of time update
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    // This is now controlled by the timeline, so we don't handle it here
    // The timeline's play/pause button controls this
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      videoRef.current.currentTime = newTime;
      setCurrentVideoTime(newTime);
      // Notify parent component
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentVideoTime / duration) * 100 : 0;

  return (
    <VideoContainer>
      <VideoElement
        ref={videoRef}
        src={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        muted
      />
      
      <VideoControls>
        <ControlButton onClick={handlePlayPause} disabled>
          {isPlaying ? '⏸️' : '▶️'}
        </ControlButton>
        <TimeDisplay>
          {formatTime(currentVideoTime)} / {formatTime(duration)}
        </TimeDisplay>
      </VideoControls>
      
      <ProgressBar onClick={handleSeek}>
        <ProgressFill $progress={progress} />
      </ProgressBar>
    </VideoContainer>
  );
});

export default VideoPreview;

