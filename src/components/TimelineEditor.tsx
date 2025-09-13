import React, { useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useGesture } from 'react-use-gesture';
import { useAppSelector, useAppDispatch } from '../redux/store';
import { 
  setPlayheadTime, 
  setZoom, 
  selectClip,
  clearSelection,
  clearLayerSelection,
  moveClip,
  splitClip
} from '../redux/slices/timelineSlice';
import { Layer, Clip } from '../types';
import TimelineRuler from './TimelineRuler';
import TimelineTrack from './TimelineTrack';
import Playhead from './Playhead';

const TimelineContainer = styled.div`
  position: relative;
  height: 100%;
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const TimelineHeader = styled.div`
  height: 60px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  padding-left: 120px; /* Account for layer headers width */
`;

const TimelineBody = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const LayerHeadersContainer = styled.div`
  width: 120px;
  background: ${({ theme }) => theme.colors.surfaceHover};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const TimelineContent = styled.div<{ $zoom: number }>`
  flex: 1;
  position: relative;
  min-width: ${({ $zoom }) => $zoom * 100}%; /* Ensure minimum width for zoomed content */
`;

const TracksContainer = styled.div`
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: auto; /* Allow horizontal scrolling for zoomed content */
  min-width: 100%;
`;

const PlayheadContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  z-index: 1000;
  pointer-events: none;
`;

const ZoomControls = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  z-index: 100;
`;

const ZoomButton = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

const TimelineEditor: React.FC<{
  projectId: string;
  layers: Layer[];
  playheadTime: number;
  zoom: number;
  duration: number;
}> = ({ projectId, layers, playheadTime, zoom, duration }) => {
  const dispatch = useAppDispatch();
  const timelineRef = useRef<HTMLDivElement>(null);
  const { selectedClips, selectedLayer } = useAppSelector(state => state.timeline);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = React.useState(false);

  // Convert time to pixels based on zoom (v2 - no logging)
  const timeToPixels = useCallback((time: number) => {
    const pixelsPerSecond = 100; // Base pixels per second
    return time * pixelsPerSecond * zoom + 120; // Add 120px offset for headers
  }, [zoom]);

  // Convert pixels to time
  const pixelsToTime = useCallback((pixels: number) => {
    const pixelsPerSecond = 100;
    if (zoom <= 0) {
      console.warn('TimelineEditor: Invalid zoom value for pixelsToTime', { zoom });
      return 0;
    }
    return (pixels - 120) / (pixelsPerSecond * zoom); // Subtract 120px offset for headers
  }, [zoom]);

  // Handle timeline scrolling
  const handleTimelineScroll = useCallback((deltaX: number) => {
    const newTime = playheadTime - pixelsToTime(deltaX);
    dispatch(setPlayheadTime(Math.max(0, Math.min(newTime, duration))));
  }, [playheadTime, duration, pixelsToTime, dispatch]);

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.max(0.1, Math.min(10, zoom + delta * 0.1));
    dispatch(setZoom(newZoom));
  }, [zoom, dispatch]);

  // Handle clip selection
  const handleClipClick = useCallback((clipId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      const newSelection = selectedClips.includes(clipId)
        ? selectedClips.filter(id => id !== clipId)
        : [...selectedClips, clipId];
      // For now, just select single clip
      dispatch(selectClip(clipId));
    } else {
      dispatch(selectClip(clipId));
    }
  }, [selectedClips, dispatch]);

  // Handle playhead positioning
  const handlePlayheadClick = useCallback((event: React.MouseEvent) => {
    // This handler is called from TimelineRuler, so the event coordinates are relative to the ruler
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left; // Use ruler's own container
    
    // Convert to time using the ruler's coordinate system
    const pixelsPerSecond = 100;
    const newTime = x / (pixelsPerSecond * zoom);
    
    dispatch(setPlayheadTime(Math.max(0, Math.min(newTime, duration))));
    dispatch(clearSelection());
  }, [zoom, duration, dispatch]);

  // Handle timeline click (not on clips)
  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    // Check if the click originated from a layer track
    const target = event.target as HTMLElement;
    const isLayerClick = target.closest('[data-layer-track]') !== null;
    
    // Only handle clicks on the timeline background, not on clips or layers
    if (event.target === event.currentTarget && !isLayerClick) {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = event.clientX - rect.left - 120; // Subtract header width
      const newTime = pixelsToTime(x + 120); // Add offset back for calculation
      dispatch(setPlayheadTime(Math.max(0, Math.min(newTime, duration))));
      dispatch(clearSelection());
      
      // Also clear layer selection when clicking on empty timeline areas
      if (selectedLayer) {
        dispatch(clearLayerSelection());
      }
    }
  }, [pixelsToTime, duration, dispatch, selectedLayer]);

  // Handle playhead drag start
  const handlePlayheadDragStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    if (duration <= 0) {
      console.warn('Playhead drag start blocked: duration is 0 or invalid', { duration });
      return;
    }
    
    console.log('Playhead drag start triggered', { 
      duration, 
      zoom, 
      playheadTime,
      hasTimelineRef: !!timelineRef.current 
    });
    setIsDraggingPlayhead(true);
    document.body.style.cursor = 'ew-resize';
  }, [duration, zoom, playheadTime]);

  // Handle playhead drag move
  const handlePlayheadDragMove = useCallback((event: MouseEvent) => {
    if (!isDraggingPlayhead || !timelineRef.current) return;
    
    // Defensive checks for invalid state
    if (duration <= 0 || zoom <= 0) {
      console.warn('TimelineEditor: Invalid state for drag operation', { duration, zoom });
      return;
    }
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left; // Get position relative to timeline container
    const newTime = pixelsToTime(x); // Convert directly to time
    const clampedTime = Math.max(0, Math.min(newTime, duration));
    
    console.log('Playhead drag move:', { 
      clientX: event.clientX,
      rectLeft: rect.left,
      rectWidth: rect.width,
      x,
      newTime,
      clampedTime,
      duration,
      zoom,
      isDraggingPlayhead 
    });
    dispatch(setPlayheadTime(clampedTime));
  }, [isDraggingPlayhead, pixelsToTime, duration, zoom, dispatch]);

  // Handle playhead drag end
  const handlePlayheadDragEnd = useCallback(() => {
    setIsDraggingPlayhead(false);
    document.body.style.cursor = 'default';
  }, []);

  // Handle clip splitting at playhead
  const handleSplitAtPlayhead = useCallback(() => {
    if (selectedClips.length === 1) {
      const clipId = selectedClips[0];
      const layer = layers.find(l => l.clips.some(c => c.id === clipId));
      if (layer) {
        const clip = layer.clips.find(c => c.id === clipId);
        if (clip && playheadTime > clip.startTime && playheadTime < clip.endTime) {
          dispatch(splitClip({
            layerId: layer.id,
            clipId: clip.id,
            splitTime: playheadTime
          }));
        }
      }
    }
  }, [selectedClips, layers, playheadTime, dispatch]);

  // Gesture handling for timeline scrolling
  const bind = useGesture({
    onDrag: ({ delta: [deltaX], event }) => {
      if (event.target === timelineRef.current) {
        handleTimelineScroll(deltaX);
      }
    },
    onWheel: ({ delta: [deltaX, deltaY], event }) => {
      if (event.ctrlKey || event.metaKey) {
        // Zoom
        event.preventDefault();
        handleZoom(-deltaY);
      } else {
        // Scroll timeline
        event.preventDefault();
        handleTimelineScroll(deltaX);
      }
    }
  });

  // Clear clip selection when layer is selected
  useEffect(() => {
    if (selectedLayer && selectedClips.length > 0) {
      dispatch(clearSelection());
    }
  }, [selectedLayer, selectedClips.length, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          // Clear layer selection
          if (selectedLayer) {
            dispatch(clearLayerSelection());
          }
          // Also clear clip selection
          dispatch(clearSelection());
          break;
        case ' ':
          event.preventDefault();
          // Toggle play/pause
          break;
        case 'ArrowLeft':
          event.preventDefault();
          dispatch(setPlayheadTime(Math.max(0, playheadTime - 1)));
          break;
        case 'ArrowRight':
          event.preventDefault();
          dispatch(setPlayheadTime(Math.min(duration, playheadTime + 1)));
          break;
        case 'Delete':
          event.preventDefault();
          // Delete selected clips
          break;
        case 'c':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Copy selected clips
          }
          break;
        case 'v':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Paste clips
          }
          break;
        case 'z':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (event.shiftKey) {
              // Redo
            } else {
              // Undo
            }
          }
          break;
        case 's':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Save timeline
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playheadTime, duration, dispatch, selectedLayer]);

  // Debug playhead position (only log when values change significantly)
  useEffect(() => {
    if (duration > 0) {
      console.log('Playhead render (v2):', { 
        playheadTime, 
        left: timeToPixels(playheadTime), 
        zoom, 
        duration,
        isDraggingPlayhead 
      });
    } else {
      console.log('Playhead blocked: duration is 0', { duration, playheadTime });
    }
  }, [playheadTime, zoom, duration, isDraggingPlayhead]);

  // Handle playhead dragging
  useEffect(() => {
    if (isDraggingPlayhead) {
      const handleMouseMove = (event: MouseEvent) => {
        handlePlayheadDragMove(event);
      };
      
      const handleMouseUp = () => {
        handlePlayheadDragEnd();
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, handlePlayheadDragMove, handlePlayheadDragEnd]);

  return (
    <TimelineContainer ref={timelineRef} {...bind()}>
      <TimelineHeader>
        <TimelineRuler 
          duration={duration}
          zoom={zoom}
          playheadTime={playheadTime}
          onTimeClick={handlePlayheadClick}
        />
      </TimelineHeader>
      
      <TimelineBody>
        <LayerHeadersContainer>
          {layers.map((layer) => (
            <div key={layer.id} style={{ height: '80px', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
              <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: '#e5e7eb' }}>
                {layer.name}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button style={{ width: '20px', height: '20px', border: 'none', background: layer.isVisible ? '#6366f1' : 'transparent', color: layer.isVisible ? 'white' : '#9ca3af', borderRadius: '2px', cursor: 'pointer', fontSize: '12px' }} title="Toggle visibility">
                  👁️
                </button>
                <button style={{ width: '20px', height: '20px', border: 'none', background: layer.isLocked ? '#6366f1' : 'transparent', color: layer.isLocked ? 'white' : '#9ca3af', borderRadius: '2px', cursor: 'pointer', fontSize: '12px' }} title="Toggle lock">
                  🔒
                </button>
                <button style={{ width: '20px', height: '20px', border: 'none', background: layer.isMuted ? '#6366f1' : 'transparent', color: layer.isMuted ? 'white' : '#9ca3af', borderRadius: '2px', cursor: 'pointer', fontSize: '12px' }} title="Toggle mute">
                  🔊
                </button>
              </div>
            </div>
          ))}
        </LayerHeadersContainer>
        
        <TimelineContent $zoom={zoom}>
          <TracksContainer onClick={handleTimelineClick}>
            {layers.map((layer) => (
              <TimelineTrack
                key={layer.id}
                layer={layer}
                zoom={zoom}
                playheadTime={playheadTime}
                selectedClips={selectedClips}
                selectedLayer={selectedLayer}
                onClipClick={handleClipClick}
                onClipMove={(clipId, newStartTime) => {
                  dispatch(moveClip({
                    layerId: layer.id,
                    clipId,
                    newStartTime
                  }));
                }}
              />
            ))}
          </TracksContainer>
        </TimelineContent>
      </TimelineBody>

      <PlayheadContainer>
        <Playhead 
          time={playheadTime}
          left={timeToPixels(playheadTime)}
          onSplit={handleSplitAtPlayhead}
          onDragStart={handlePlayheadDragStart}
        />
      </PlayheadContainer>

      <ZoomControls>
        <ZoomButton onClick={() => handleZoom(-0.5)}>-</ZoomButton>
        <ZoomButton onClick={() => handleZoom(0.5)}>+</ZoomButton>
      </ZoomControls>
    </TimelineContainer>
  );
};

export default TimelineEditor;
