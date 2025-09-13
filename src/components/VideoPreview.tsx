import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { timelineTimeToVideoTime, videoTimeToTimelineTime, getEffectiveTimelineDuration, getNextClip } from '../utils/videoTimeUtils';
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
  onTimeUpdate?: (timelineTime: number) => void; // Callback to update timeline playhead
}

const VideoPreview: React.FC<VideoPreviewProps> = React.memo(({
  videoUrl,
  currentTime,
  isPlaying,
  layers,
  onTimeUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimelineTimeRef = useRef<number>(0);

  // Sync video with timeline (when timeline changes)
  useEffect(() => {
    if (videoRef.current) {
      // Only sync video time when NOT playing to avoid conflicts
      if (!isPlaying) {
        // Convert timeline time to video time
        const videoTime = timelineTimeToVideoTime(currentTime, layers);
        
        // Ensure video time is within valid trimmed clip ranges
        const mainVideoLayer = layers.find(layer => layer.isMainVideo);
        if (mainVideoLayer && mainVideoLayer.clips.length > 0) {
          const sortedClips = [...mainVideoLayer.clips].sort((a, b) => a.startTime - b.startTime);
          const firstClip = sortedClips[0];
          const lastClip = sortedClips[sortedClips.length - 1];
          
          const firstClipStart = firstClip.originalStartTime ?? firstClip.startTime;
          const lastClipEnd = (lastClip.originalStartTime ?? lastClip.startTime) + lastClip.duration;
          
          // Clamp video time to valid trimmed range
          const clampedVideoTime = Math.max(firstClipStart, Math.min(videoTime, lastClipEnd));
          
          console.log('🎯 VIDEO SYNC:', {
            timelineTime: currentTime.toFixed(3),
            videoTime: videoTime.toFixed(3),
            clampedVideoTime: clampedVideoTime.toFixed(3),
            firstClipStart: firstClipStart.toFixed(3),
            lastClipEnd: lastClipEnd.toFixed(3)
          });
          
          // If we're restarting (jumping from end to beginning), pause first then reset
          if (currentTime === 0 && videoRef.current.currentTime > 0) {
            videoRef.current.pause();
            videoRef.current.currentTime = firstClipStart;
          } else {
            videoRef.current.currentTime = clampedVideoTime;
          }
        } else {
          // Fallback to original behavior if no clips
          if (currentTime === 0 && videoRef.current.currentTime > 0) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          } else {
            videoRef.current.currentTime = videoTime;
          }
        }
      }
    }
  }, [currentTime, layers, isPlaying]);

  // Sync play state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
        // Ensure animation loop starts immediately when playing
        if (!animationFrameRef.current) {
          console.log('🎬 STARTING ANIMATION LOOP from play state');
          updateTimeline();
        }
      } else {
        videoRef.current.pause();
        // Cancel animation frame when stopping
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    }
  }, [isPlaying]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);


  // Smooth timeline update using requestAnimationFrame
  const updateTimeline = () => {
    // Debug: Log when updateTimeline is called
    if (videoRef.current && videoRef.current.currentTime > 10) {
      console.log('🎬 updateTimeline CALLED:', { 
        videoTime: videoRef.current.currentTime.toFixed(3), 
        isPlaying,
        hasVideoRef: !!videoRef.current,
        hasOnTimeUpdate: !!onTimeUpdate
      });
    }
    
    if (isPlaying && videoRef.current && onTimeUpdate) {
      const videoTime = videoRef.current.currentTime;
      
      // Debug: Log every update to see what's happening (but reduce frequency)
      if (Math.floor(videoTime * 10) % 5 === 0) { // Log every 0.5 seconds
        console.log('updateTimeline:', { 
          videoTime: videoTime.toFixed(3), 
          isPlaying,
          layersCount: layers.length,
          mainVideoClips: layers.find(l => l.isMainVideo)?.clips.length || 0
        });
      }
      
      // Always log when video time is in the second clip range (after 10 seconds)
      if (videoTime > 10) {
        console.log('🎥 SECOND CLIP PLAYBACK:', { 
          videoTime: videoTime.toFixed(3), 
          isPlaying,
          animationFrameActive: !!animationFrameRef.current
        });
      }
      
      // Check if we've reached the end of current clip and need to jump to next
      const nextClip = getNextClip(videoTime, layers);
      if (nextClip) {
        console.log('🎬 TRANSITION DETECTED! Jumping to next clip:', { 
          currentVideoTime: videoTime.toFixed(3), 
          nextClipStart: nextClip.clip.originalStartTime,
          nextClipDuration: nextClip.clip.duration,
          timelineTime: nextClip.timelineTime,
          layers: layers.map(l => ({ 
            id: l.id, 
            isMainVideo: l.isMainVideo,
            clips: l.clips.map(c => ({ 
              id: c.id, 
              startTime: c.startTime, 
              duration: c.duration, 
              originalStartTime: c.originalStartTime,
              endTime: (c.originalStartTime ?? c.startTime) + c.duration
            })) 
          }))
        });
        
        // Calculate smooth transition that maintains trimming functionality
        const currentTimelineTime = videoTimeToTimelineTime(videoTime, layers);
        const nextClipStartTime = nextClip.clip.originalStartTime || nextClip.clip.startTime;
        const nextClipTimelineStart = nextClip.timelineTime;
        
        // Calculate smooth jump position to minimize pause while maintaining trimming
        const timeToCatchUp = nextClipTimelineStart - currentTimelineTime;
        const smoothJumpTime = nextClipStartTime + timeToCatchUp;
        
        console.log('🎯 SMOOTH TRANSITION (FIXED):', {
          currentVideoTime: videoTime.toFixed(3),
          currentTimelineTime: currentTimelineTime.toFixed(3),
          nextClipStart: nextClipStartTime.toFixed(3),
          nextClipTimelineStart: nextClipTimelineStart.toFixed(3),
          timeToCatchUp: timeToCatchUp.toFixed(3),
          smoothJumpTime: smoothJumpTime.toFixed(3)
        });
        
        // Use immediate transition but maintain trimming logic
        if (videoRef.current) {
          videoRef.current.currentTime = smoothJumpTime;
          
          // Update timeline immediately to maintain continuity
          console.log('📍 UPDATING TIMELINE to', nextClipTimelineStart.toFixed(3));
          onTimeUpdate(nextClipTimelineStart);
          lastTimelineTimeRef.current = nextClipTimelineStart;
          
          // Log what happens after the jump
          setTimeout(() => {
            if (videoRef.current) {
              console.log('🔄 AFTER JUMP - Video time:', videoRef.current.currentTime.toFixed(3), 'Timeline time:', lastTimelineTimeRef.current.toFixed(3));
            }
          }, 50); // Reduced timeout for faster feedback
        }
        
        // CRITICAL: Continue the animation loop after the jump
        // The jump might interrupt the requestAnimationFrame, so we need to restart it
        if (isPlaying) {
          console.log('🔄 RESTARTING ANIMATION LOOP after jump');
          // Use a slight delay to ensure video seeking doesn't interfere
          setTimeout(() => {
            if (isPlaying) {
              animationFrameRef.current = requestAnimationFrame(updateTimeline);
            }
          }, 16); // One frame delay (16ms at 60fps)
        }
        
        return;
      }
      
      // Convert video time back to timeline time for normal playback
      const timelineTime = videoTimeToTimelineTime(videoTime, layers);
      
      // Always log when video time is in the second clip range
      if (videoTime > 10) {
        console.log('🎥 SECOND CLIP TIMELINE CONVERSION:', { 
          videoTime: videoTime.toFixed(3), 
          timelineTime: timelineTime.toFixed(3), 
          lastTimelineTime: lastTimelineTimeRef.current.toFixed(3)
        });
      }
      
      // Debug logging for troubleshooting
      if (Math.abs(timelineTime - lastTimelineTimeRef.current) > 0.1) {
        console.log('📊 Timeline update:', { 
          videoTime: videoTime.toFixed(3), 
          timelineTime: timelineTime.toFixed(3), 
          lastTimelineTime: lastTimelineTimeRef.current.toFixed(3),
          difference: (timelineTime - lastTimelineTimeRef.current).toFixed(3)
        });
      }
      
      // Always update timeline to maintain sync - use very small threshold for smooth updates
      const updateThreshold = 0.001; // Very frequent updates for smooth playhead movement
      if (Math.abs(timelineTime - lastTimelineTimeRef.current) > updateThreshold) {
        onTimeUpdate(timelineTime);
        lastTimelineTimeRef.current = timelineTime;
      }
    }
    
    // Schedule next update - ensure consistent animation loop
    if (isPlaying) {
      // Always schedule next frame for smooth playhead movement
      animationFrameRef.current = requestAnimationFrame(updateTimeline);
      
      // Debug: Log when scheduling next frame (reduced frequency)
      if (videoRef.current && videoRef.current.currentTime > 10 && Math.floor(videoRef.current.currentTime * 10) % 10 === 0) {
        console.log('🎬 SCHEDULING NEXT FRAME:', { 
          videoTime: videoRef.current.currentTime.toFixed(3), 
          isPlaying,
          animationFrameId: animationFrameRef.current
        });
      }
    } else {
      // Clear animation frame when not playing
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  const handleTimeUpdate = () => {
    // Start smooth updates when video starts playing
    if (isPlaying && !animationFrameRef.current) {
      console.log('🎬 STARTING ANIMATION LOOP');
      updateTimeline();
    }
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

