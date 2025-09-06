import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { timelineTimeToVideoTime, getEffectiveTimelineDuration } from '../utils/videoTimeUtils';
import { Layer } from '../types';

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
  layers: Layer[];
}

const VideoPreview: React.FC<VideoPreviewProps> = React.memo(({
  videoUrl,
  currentTime,
  isPlaying,
  layers
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video with timeline (when timeline changes)
  useEffect(() => {
    if (videoRef.current) {
      // Convert timeline time to video time
      const videoTime = timelineTimeToVideoTime(currentTime, layers);
      videoRef.current.currentTime = videoTime;
    }
  }, [currentTime, layers]);

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
    // Disabled - timeline controls video time, not the other way around
    // This prevents conflicts and video getting stuck
  };

  const handleLoadedMetadata = () => {
    // Video metadata loaded - no need to store duration locally
    // The timeline manages the effective duration
  };

  const handlePlayPause = () => {
    // This is now controlled by the timeline, so we don't handle it here
    // The timeline's play/pause button controls this
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (effectiveDuration > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTimelineTime = percentage * effectiveDuration;
      
      // Convert timeline time to video time and set it
      const newVideoTime = timelineTimeToVideoTime(newTimelineTime, layers);
      if (videoRef.current) {
        videoRef.current.currentTime = newVideoTime;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate effective timeline duration and progress
  const effectiveDuration = getEffectiveTimelineDuration(layers);
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

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
          {formatTime(currentTime)} / {formatTime(effectiveDuration)}
        </TimeDisplay>
      </VideoControls>
      
      <ProgressBar onClick={handleSeek}>
        <ProgressFill $progress={progress} />
      </ProgressBar>
    </VideoContainer>
  );
});

export default VideoPreview;

