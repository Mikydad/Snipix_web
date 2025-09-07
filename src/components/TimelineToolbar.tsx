import React from 'react';
import styled from 'styled-components';
import { useAppSelector, useAppDispatch } from '../redux/store';
import { 
  setIsPlaying, 
  setPlayheadTime, 
  addLayer, 
  undo, 
  redo,
  setIsSnapping,
  applyTrimOperations,
  splitLayerAtPlayhead,
  deleteClipById
} from '../redux/slices/timelineSlice';
import { getEffectiveTimelineDuration } from '../utils/videoTimeUtils';

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: 0 ${({ theme }) => theme.spacing.md};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-right: none;
  }
`;

const ToolbarButton = styled.button<{ $active?: boolean; $primary?: boolean }>`
  width: 32px;
  height: 32px;
  border: 1px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active, $primary }) => 
    $primary ? theme.colors.primary :
    $active ? theme.colors.primary + '20' : 
    theme.colors.surface};
  color: ${({ theme, $active, $primary }) => 
    $primary || $active ? 'white' : theme.colors.text};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme, $primary }) => 
      $primary ? theme.colors.primaryHover : 
      theme.colors.surfaceHover};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TimeInput = styled.input`
  width: 80px;
  height: 32px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  font-family: monospace;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ToolbarLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 500;
`;

const TimelineToolbar: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const dispatch = useAppDispatch();
    const {
    isPlaying,
    playheadTime, 
    duration, 
    isSnapping,
    undoStack,
    redoStack,
    selectedLayer,
    selectedClips,
    layers,
    trimState
  } = useAppSelector(state => state.timeline);

  const handlePlayPause = () => {
    const effectiveDuration = getEffectiveTimelineDuration(layers);
    
    console.log('DEBUG: TimelineToolbar handlePlayPause called', {
      isPlaying,
      playheadTime,
      effectiveDuration,
      atEnd: playheadTime >= effectiveDuration
    });
    
    // If we're at the end and user clicks play, restart from beginning
    if (!isPlaying && playheadTime >= effectiveDuration) {
      console.log('DEBUG: TimelineToolbar restarting - setting playhead to 0 and isPlaying to true');
      dispatch(setPlayheadTime(0));
      dispatch(setIsPlaying(true));
    } else {
      console.log('DEBUG: TimelineToolbar normal toggle - setting isPlaying to', !isPlaying);
      dispatch(setIsPlaying(!isPlaying));
    }
  };

  const handleStop = () => {
    dispatch(setIsPlaying(false));
    dispatch(setPlayheadTime(0));
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value;
    const time = parseTimeString(timeString);
    if (time !== null) {
      dispatch(setPlayheadTime(Math.max(0, Math.min(time, duration))));
    }
  };

  const handleAddLayer = (type: 'video' | 'audio' | 'text' | 'effect') => {
    const newLayer = {
      id: `layer_${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Layer`,
      type,
      clips: [],
      isVisible: true,
      isLocked: false,
      isMuted: false,
      order: 0
    };
    dispatch(addLayer(newLayer));
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      dispatch(undo());
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      dispatch(redo());
    }
  };

  const handleToggleSnapping = () => {
    dispatch(setIsSnapping(!isSnapping));
  };

  const handleTrim = () => {
    if (selectedClips.length > 0) {
      // Get the layer that contains the selected clip
      const selectedClipId = selectedClips[0]; // Use first selected clip
      const layer = layers.find(l => l.clips.some(c => c.id === selectedClipId));
      
      if (layer) {
        // Split the layer at the current playhead position
        dispatch(splitLayerAtPlayhead({
          layerId: layer.id,
          splitTime: playheadTime,
          projectId: projectId
        }));
      }
    }
  };

  const handleDelete = () => {
    if (selectedClips.length > 0) {
      // Get the layer that contains the selected clip
      const selectedClipId = selectedClips[0]; // Use first selected clip
      const layer = layers.find(l => l.clips.some(c => c.id === selectedClipId));
      
      if (layer) {
        // Delete the selected clip by ID
        dispatch(deleteClipById({
          layerId: layer.id,
          clipId: selectedClipId,
          projectId: projectId
        }));
      }
    }
  };

  const handleApplyChanges = () => {
    if (selectedLayer) {
      dispatch(applyTrimOperations({ layerId: selectedLayer }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimeString = (timeString: string): number | null => {
    const match = timeString.match(/^(\d+):(\d{2})$/);
    if (match) {
      const mins = parseInt(match[1]);
      const secs = parseInt(match[2]);
      return mins * 60 + secs;
    }
    return null;
  };

  return (
    <ToolbarContainer>
      {/* Playback Controls */}
      <ToolbarGroup>
        <ToolbarButton onClick={handlePlayPause} $primary={isPlaying}>
          {isPlaying ? '⏸️' : '▶️'}
        </ToolbarButton>
        <ToolbarButton onClick={handleStop}>
          ⏹️
        </ToolbarButton>
      </ToolbarGroup>

      {/* Time Display */}
      <ToolbarGroup>
        <ToolbarLabel>Time:</ToolbarLabel>
        <TimeInput
          value={formatTime(playheadTime)}
          onChange={handleTimeInputChange}
          placeholder="00:00"
        />
        <ToolbarLabel>/ {formatTime(duration)}</ToolbarLabel>
      </ToolbarGroup>

      {/* Layer Controls */}
      <ToolbarGroup>
        <ToolbarButton onClick={() => handleAddLayer('video')} title="Add Video Layer">
          🎬
        </ToolbarButton>
        <ToolbarButton onClick={() => handleAddLayer('audio')} title="Add Audio Layer">
          🎵
        </ToolbarButton>
        <ToolbarButton onClick={() => handleAddLayer('text')} title="Add Text Layer">
          📝
        </ToolbarButton>
        <ToolbarButton onClick={() => handleAddLayer('effect')} title="Add Effect Layer">
          ✨
        </ToolbarButton>
        
        {/* Trim/Delete Controls - Only show when clip is selected */}
        {selectedClips.length > 0 && (
          <>
            <ToolbarButton 
              onClick={handleTrim} 
              disabled={false}
              title="Split layer at playhead position"
            >
              ✂️
            </ToolbarButton>
            <ToolbarButton 
              onClick={handleDelete} 
              disabled={false}
              title="Delete clip at playhead position"
            >
              🗑️
            </ToolbarButton>
            <ToolbarButton 
              onClick={handleApplyChanges} 
              disabled={trimState.pendingOperations.length === 0}
              title="Apply All Changes"
              $primary={trimState.pendingOperations.length > 0}
            >
              ✅
            </ToolbarButton>
          </>
        )}
      </ToolbarGroup>

      {/* Edit Controls */}
      <ToolbarGroup>
        <ToolbarButton 
          onClick={handleUndo} 
          disabled={undoStack.length === 0}
          title="Undo"
        >
          ↩️
        </ToolbarButton>
        <ToolbarButton 
          onClick={handleRedo} 
          disabled={redoStack.length === 0}
          title="Redo"
        >
          ↪️
        </ToolbarButton>
      </ToolbarGroup>

      {/* View Controls */}
      <ToolbarGroup>
        <ToolbarButton 
          onClick={handleToggleSnapping} 
          $active={isSnapping}
          title="Toggle Snapping"
        >
          🔗
        </ToolbarButton>
      </ToolbarGroup>
    </ToolbarContainer>
  );
};

export default TimelineToolbar;

