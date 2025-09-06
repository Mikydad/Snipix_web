import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Layer } from '../types';

const TrackContainer = styled.div<{ $isSelected: boolean }>`
  height: 80px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  align-items: center;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

const TrackContent = styled.div`
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
`;

const ClipContainer = styled.div<{ 
  $left: number; 
  $width: number; 
  $isSelected: boolean;
  $type: string;
}>`
  position: absolute;
  left: ${({ $left }) => $left}px;
  top: 10px;
  bottom: 10px;
  width: ${({ $width }) => $width}px;
  background: ${({ theme, $type, $isSelected }) => {
    if ($isSelected) return theme.colors.primary + '30';
    switch ($type) {
      case 'video': return theme.colors.primary + '20';
      case 'audio': return theme.colors.secondary + '20';
      case 'text': return theme.colors.success + '20';
      case 'effect': return theme.colors.warning + '20';
      default: return theme.colors.surfaceHover;
    }
  }};
  border: ${({ $isSelected, theme }) => 
    $isSelected ? `3px solid ${theme.colors.primary}` : '2px solid ' + theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text};
  user-select: none;
  box-shadow: ${({ $isSelected, theme }) => 
    $isSelected ? `0 0 8px ${theme.colors.primary}40` : 'none'};
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    ${({ $isSelected, theme }) => 
      !$isSelected ? `box-shadow: 0 0 4px ${theme.colors.primary}20;` : ''}
  }
`;

const ClipLabel = styled.div`
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  padding: 0 4px;
`;

const ResizeHandle = styled.div<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ${({ $side }) => $side === 'left' ? 'w-resize' : 'e-resize'};
  background: ${({ theme }) => theme.colors.primary + '20'};
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary + '40'};
  }
`;

interface TimelineTrackProps {
  layer: Layer;
  zoom: number;
  playheadTime: number;
  selectedClips: string[];
  selectedLayer: string | null;
  onClipClick: (clipId: string, event: React.MouseEvent) => void;
  onClipMove: (clipId: string, newStartTime: number) => void;
}

const TimelineTrack: React.FC<TimelineTrackProps> = ({
  layer,
  zoom,
  playheadTime,
  selectedClips,
  selectedLayer,
  onClipClick,
  onClipMove
}) => {

  // Convert time to pixels
  const timeToPixels = useCallback((time: number) => {
    const pixelsPerSecond = 100; // Base pixels per second
    return time * pixelsPerSecond * zoom;
  }, [zoom]);

  // Convert pixels to time
  const pixelsToTime = useCallback((pixels: number) => {
    const pixelsPerSecond = 100;
    return pixels / (pixelsPerSecond * zoom);
  }, [zoom]);

  // Handle clip dragging
  const handleClipDrag = useCallback((clipId: string, initialX: number) => {
    return ({ movement: [mx] }: any) => {
      const deltaTime = pixelsToTime(mx);
      const clip = layer.clips.find(c => c.id === clipId);
      if (clip) {
        const newStartTime = Math.max(0, clip.startTime + deltaTime);
        onClipMove(clipId, newStartTime);
      }
    };
  }, [layer.clips, pixelsToTime, onClipMove]);

  // Handle clip resizing
  const handleClipResize = useCallback((clipId: string, side: 'left' | 'right', initialWidth: number) => {
    return ({ movement: [mx] }: any) => {
      const deltaTime = pixelsToTime(mx);
      const clip = layer.clips.find(c => c.id === clipId);
      if (clip) {
        if (side === 'left') {
          const newStartTime = Math.max(0, clip.startTime + deltaTime);
          const newDuration = Math.max(0.1, clip.duration - deltaTime);
          // Update clip start time and duration
        } else {
          const newDuration = Math.max(0.1, clip.duration + deltaTime);
          // Update clip duration
        }
      }
    };
  }, [layer.clips, pixelsToTime]);

  return (
    <TrackContainer 
      $isSelected={false}
      data-layer-track={layer.id}
    >
      <TrackContent>
        {layer.clips.map((clip) => {
          const left = timeToPixels(clip.startTime);
          const width = timeToPixels(clip.duration);
          const isClipSelected = selectedClips.includes(clip.id);

          return (
            <ClipContainer
              key={clip.id}
              $left={left}
              $width={width}
              $isSelected={isClipSelected}
              $type={clip.type}
              onClick={(e) => {
                e.stopPropagation();
                onClipClick(clip.id, e);
              }}
              onMouseDown={(e) => {
                // Handle drag start
                const handleDrag = (e: MouseEvent) => {
                  const deltaX = e.clientX - e.clientX;
                  const deltaTime = pixelsToTime(deltaX);
                  const currentClip = layer.clips.find(c => c.id === clip.id);
                  if (currentClip) {
                    const newStartTime = Math.max(0, currentClip.startTime + deltaTime);
                    onClipMove(clip.id, newStartTime);
                  }
                };
                
                const handleMouseMove = (e: MouseEvent) => handleDrag(e);
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <ClipLabel>
                {clip.content || clip.type}
              </ClipLabel>
              
              <ResizeHandle 
                $side="left" 
                style={{ left: 0 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // Handle left resize
                }}
              />
              <ResizeHandle 
                $side="right" 
                style={{ right: 0 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // Handle right resize
                }}
              />
            </ClipContainer>
          );
        })}
      </TrackContent>
    </TrackContainer>
  );
};

export default TimelineTrack;
