import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../redux/store';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState } from '../redux/store';
import { fetchProjectById } from '../redux/slices/projectSlice';
import { loadTimeline, loadTimelineHistory, restoreTimelineVersion, setDuration, addLayer, setIsPlaying, setPlayheadTime, saveTimeline, saveNamedTimeline, saveState, saveCheckpoint, restoreCheckpoint, recalculateDuration, autoTrimVideo } from '../redux/slices/timelineSlice';
import { Layer } from '../types';
import TimelineEditor from '../components/TimelineEditor';
import VideoPreview from '../components/VideoPreview';
import TimelineToolbar from '../components/TimelineToolbar';
import KeyboardShortcutOverlay from '../components/KeyboardShortcutOverlay';
import RecoveryDialog from '../components/RecoveryDialog';
import ProjectSwitcher from '../components/ProjectSwitcher';
import ProjectHistoryDashboard from '../components/ProjectHistoryDashboard';
import HistoryPanel from '../components/HistoryPanel';
import FeedbackUI from '../components/FeedbackUI';
import OperationStatusDashboard from '../components/OperationStatusDashboard';
import { usePageRecovery } from '../hooks/usePageRecovery';
import { useRecoveryOptions } from '../hooks/useRecoveryOptions';
import { useProjectHistory } from '../hooks/useProjectHistory';
import { KeyboardShortcutProvider, useTimelineShortcuts, useTimelineInteractions } from '../contexts/KeyboardShortcutContext';
import { TimelineOperationProvider, useTimelineOperationContext } from '../contexts/TimelineOperationContext';
import { UserFeedbackProvider, useUserFeedback } from '../contexts/UserFeedbackContext';
import ErrorToast from '../components/ErrorToast';
import ProjectSettingsDropdown from '../components/ProjectSettingsDropdown';
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

const SaveButton = styled.button<{ $hasUnsavedChanges?: boolean; $isDropdownOpen?: boolean }>`
  padding: 6px 12px;
  border: 1px solid ${({ theme, $hasUnsavedChanges }) => 
    $hasUnsavedChanges ? theme.colors.warning : theme.colors.border};
  background: ${({ theme, $hasUnsavedChanges }) => 
    $hasUnsavedChanges ? theme.colors.warning + '20' : theme.colors.surface};
  color: ${({ theme, $hasUnsavedChanges }) => 
    $hasUnsavedChanges ? theme.colors.warning : theme.colors.text};
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  
  &:hover {
    background: ${({ theme, $hasUnsavedChanges }) => 
      $hasUnsavedChanges ? theme.colors.warning + '30' : theme.colors.surfaceHover};
  }
`;

const DropdownArrow = styled.span<{ $isOpen: boolean }>`
  font-size: 10px;
  transition: transform 0.2s ease;
  transform: ${({ $isOpen }) => $isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const SaveDropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transform: translateY(${({ $isOpen }) => $isOpen ? '0' : '-10px'});
  transition: all 0.2s ease;
  overflow: hidden;
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const StatusIndicator = styled.div<{ $status: 'saved' | 'unsaved' | 'saving' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme, $status }) => {
    switch ($status) {
      case 'saved': return theme.colors.success;
      case 'unsaved': return theme.colors.warning;
      case 'saving': return theme.colors.primary;
      default: return theme.colors.border;
    }
  }};
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

// Timeline content component with integrated operations
const TimelineContent: React.FC<{ projectId: string }> = ({ projectId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { currentProject, isLoading: projectLoading, error: projectError } = useSelector(
    (state: RootState) => state.projects
  );
  
  const { 
    layers, 
    playheadTime, 
    zoom, 
    duration, 
    markers,
    selectedClips,
    isPlaying, 
    isSnapping,
    undoStack,
    redoStack,
    selectedLayer,
    trimState,
    validationState, 
    checkpoints,
    lastSavedCheckpoint,
    hasUnsavedChanges,
    actionHistory,
    timelineHistory
  } = useSelector((state: RootState) => state.timeline);

  // Calculate effective duration from layers if duration is not set
  const effectiveDuration = React.useMemo(() => {
    console.log('TimelinePage: Calculating effective duration:', { 
      duration, 
      layersCount: layers.length,
      hasProject: !!currentProject,
      projectDuration: currentProject?.duration,
      layers: layers.map(l => ({ id: l.id, name: l.name, isMainVideo: l.isMainVideo, clipsCount: l.clips.length }))
    });
    
    // Use Redux duration if available
    if (duration > 0) {
      console.log('TimelinePage: Using Redux duration:', duration);
      return duration;
    }
    
    // Fallback 1: Use project duration if available
    if (currentProject && currentProject.duration && currentProject.duration > 0) {
      console.log('TimelinePage: Using project duration:', currentProject.duration);
      return currentProject.duration;
    }
    
    // Fallback 2: Calculate duration from layers
    const mainVideoLayer = layers.find(layer => layer.isMainVideo);
    if (mainVideoLayer && mainVideoLayer.clips.length > 0) {
      const totalDuration = mainVideoLayer.clips.reduce((total, clip) => total + clip.duration, 0);
      console.log('TimelinePage: Using calculated duration from layers:', totalDuration, 'clips:', mainVideoLayer.clips.map(c => ({ id: c.id, duration: c.duration })));
      return totalDuration;
    }
    
    // Fallback 3: Calculate from any layer with clips
    const layerWithClips = layers.find(layer => layer.clips.length > 0);
    if (layerWithClips) {
      const totalDuration = layerWithClips.clips.reduce((total, clip) => total + clip.duration, 0);
      console.log('TimelinePage: Using duration from any layer:', totalDuration, 'layer:', layerWithClips.name);
      return totalDuration;
    }
    
    console.log('TimelinePage: No duration available, using 0');
    return 0;
  }, [duration, layers, currentProject]);

  // Auto-trim hook for automatic backend processing
  useAutoTrim(projectId);

  // Force duration recalculation when layers change
  useEffect(() => {
    const mainVideoLayer = layers.find(layer => layer.isMainVideo);
    if (mainVideoLayer && mainVideoLayer.clips.length > 0) {
      const calculatedDuration = mainVideoLayer.clips.reduce((total, clip) => total + clip.duration, 0);
      if (Math.abs(calculatedDuration - duration) > 0.01) {
        console.log('TimelinePage: Duration mismatch detected, dispatching recalculateDuration', { 
          calculatedDuration, 
          currentDuration: duration,
          clips: mainVideoLayer.clips.map(c => ({ id: c.id, duration: c.duration }))
        });
        dispatch(recalculateDuration());
      }
    }
  }, [layers, duration, dispatch]);

  // Page reload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // State for video blob URL
  const [videoBlobUrl, setVideoBlobUrl] = React.useState<string>('');

  // Load timeline history when component mounts
  useEffect(() => {
    dispatch(loadTimelineHistory(projectId));
  }, [dispatch, projectId]);

  // Recreate video blob URL after restore
  useEffect(() => {
    if (layers.length > 0 && videoBlobUrl) {
      // Force video element to reload by updating the src
      const videoElement = document.querySelector('video');
      if (videoElement && videoElement.src !== videoBlobUrl) {
        videoElement.src = videoBlobUrl;
        videoElement.load();
        console.log('Video source updated after restore');
      }
    }
  }, [layers, videoBlobUrl]);

  // Reset playing state after restore to ensure proper playback
  useEffect(() => {
    if (layers.length > 0) {
      // Ensure video is paused after restore
      dispatch(setIsPlaying(false));
      console.log('Video playback state reset after restore');
    }
  }, [layers, dispatch]);
  
  // State for enhanced UI components
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showOperationDashboard, setShowOperationDashboard] = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [showProjectHistoryDashboard, setShowProjectHistoryDashboard] = useState(false);
  const [isSaveDropdownOpen, setIsSaveDropdownOpen] = useState(false);
  
  // Save functionality
  const getSaveStatus = () => {
    if (hasUnsavedChanges) return 'unsaved';
    return 'saved';
  };
  
  const handleQuickSave = async () => {
    try {
      // Get current timeline state from Redux
      const currentState = {
        layers,
        playheadTime,
        zoom,
        duration,
        markers,
        selectedClips,
        isPlaying,
        isSnapping,
        undoStack,
        redoStack,
        selectedLayer,
        trimState,
        validationState,
        checkpoints,
        lastSavedCheckpoint,
        hasUnsavedChanges,
        actionHistory,
        maxHistorySize: 50
      };
      
      // Save timeline to backend
      await dispatch(saveTimeline({ 
        projectId, 
        timelineState: currentState
      })).unwrap();
      
      // Mark as saved locally - use saveCheckpoint instead of saveState to avoid recursion
      dispatch(saveCheckpoint({ 
        projectId, 
        description: 'Quick Save',
        isAutoSave: false
      }));
      
      // Process trimmed video segments if there are clips in main video layer
      const mainVideoLayer = layers.find(layer => layer.isMainVideo);
      if (mainVideoLayer && mainVideoLayer.clips.length > 0) {
        console.log('Quick Save: Processing trimmed video segments...');
        await dispatch(autoTrimVideo({ projectId, layers })).unwrap();
        console.log('Quick Save: Video segments processed successfully');
      }
      
      toast.success('Timeline saved successfully!');
      setIsSaveDropdownOpen(false);
    } catch (error) {
      console.error('Quick save failed:', error);
      toast.error('Failed to save timeline');
    }
  };
  
  const handleNamedSave = async () => {
    const saveName = prompt('Enter a name for this save:');
    if (!saveName) return;
    
    try {
      // Get current timeline state from Redux
      const currentState = {
        layers,
        playheadTime,
        zoom,
        duration,
        markers,
        selectedClips,
        isPlaying,
        isSnapping,
        undoStack,
        redoStack,
        selectedLayer,
        trimState,
        validationState,
        checkpoints,
        lastSavedCheckpoint,
        hasUnsavedChanges,
        actionHistory,
        maxHistorySize: 50
      };
      
      // Save timeline to backend with custom name
      await dispatch(saveNamedTimeline({ 
        projectId, 
        timelineState: currentState,
        description: saveName
      })).unwrap();
      
      // Create a named checkpoint locally
      dispatch(saveCheckpoint({ 
        projectId,
        description: saveName,
        isAutoSave: false
      }));
      
      // Process trimmed video segments if there are clips in main video layer
      const mainVideoLayer = layers.find(layer => layer.isMainVideo);
      if (mainVideoLayer && mainVideoLayer.clips.length > 0) {
        console.log('Named Save: Processing trimmed video segments...');
        await dispatch(autoTrimVideo({ projectId, layers })).unwrap();
        console.log('Named Save: Video segments processed successfully');
      }
      
      toast.success(`Timeline saved as "${saveName}"!`);
      setIsSaveDropdownOpen(false);
    } catch (error) {
      console.error('Named save failed:', error);
      toast.error('Failed to save timeline');
    }
  };
  
  const handleAutoSave = () => {
    // Create an auto-save checkpoint
    dispatch(saveCheckpoint({ 
      projectId,
      description: 'Auto Save',
      isAutoSave: true
    }));
    
    console.log('Auto save checkpoint created');
    setIsSaveDropdownOpen(false);
  };
  
  const handleRestoreCheckpoint = async () => {
    if (!timelineHistory || timelineHistory.length === 0) {
      alert('No saved versions available to restore');
      setIsSaveDropdownOpen(false);
      return;
    }
    
    // Show timeline history selection dialog
    const historyNames = timelineHistory.map((item, index) => 
      `${index}: ${item.description || 'Unnamed Save'} (v${item.version}) - ${new Date(item.created_at).toLocaleString()}`
    ).join('\n');
    
    const selectedIndex = prompt(`Available saved versions:\n${historyNames}\n\nEnter index (0-${timelineHistory.length - 1}):`);
    
    if (selectedIndex === null) {
      setIsSaveDropdownOpen(false);
      return;
    }
    
    const index = parseInt(selectedIndex);
    if (isNaN(index) || index < 0 || index >= timelineHistory.length) {
      alert('Invalid version index');
      setIsSaveDropdownOpen(false);
      return;
    }
    
    try {
      // Restore the selected timeline version from backend
      await dispatch(restoreTimelineVersion({ 
        projectId, 
        version: timelineHistory[index].version 
      })).unwrap();
      
      toast.success(`Restored timeline version: ${timelineHistory[index].description || 'Unnamed Save'}`);
      setIsSaveDropdownOpen(false);
    } catch (error) {
      console.error('Failed to restore timeline version:', error);
      toast.error('Failed to restore timeline version');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-save-dropdown]')) {
        setIsSaveDropdownOpen(false);
      }
    };

    if (isSaveDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isSaveDropdownOpen]);

  // Project history management
  const projectHistory = useProjectHistory(projectId, {
    enableAutoSave: true,
    enableKeyboardShortcuts: true
  });

  // Page recovery system
  const pageRecovery = usePageRecovery(projectId, {
    enableAutoRestore: true,
    enableRecoveryDialog: true,
    onRecoveryComplete: (action) => {
      console.log('Recovery completed:', action);
      userFeedback.handleOperationSuccess('recovery', `Recovery action completed: ${action}`);
    }
  });

  // Recovery options
  const recoveryOptions = useRecoveryOptions(projectId, {
    enableAutoBackup: true,
    enableNavigationProtection: true,
    onRecoveryComplete: (result) => {
      if (result.success) {
        userFeedback.handleOperationSuccess('recovery', result.message);
      } else {
        userFeedback.handleOperationError('recovery', result.error || 'Recovery failed');
      }
    }
  });

  // User interactions
  const interactions = useTimelineInteractions(projectId);

  // Timeline operations context
  const timelineOps = useTimelineOperationContext();

  // User feedback context
  const userFeedback = useUserFeedback();

  // Project switching handler
  const handleProjectSwitch = async (newProjectId: string) => {
    if (newProjectId === projectId) return;
    
    const operationId = userFeedback.handleOperationStart('Switch Project', 'projectSwitch');
    
    try {
      // Switch to new project
      projectHistory.switchToProject(newProjectId);
      
      // Navigate to new project
      navigate(`/timeline/${newProjectId}`);
      
      userFeedback.handleOperationSuccess(operationId, 'Project switched successfully');
    } catch (error) {
      userFeedback.handleOperationError(operationId, 'Failed to switch project');
    }
  };

  // Timeline actions for keyboard shortcuts using integrated operations
  const timelineActions = {
    undo: async () => {
      const operationId = userFeedback.handleOperationStart('Undo', 'undo');
      const result = await timelineOps.undo();
      if (result.success) {
        userFeedback.handleOperationSuccess(operationId, 'Action undone successfully');
      } else {
        userFeedback.handleOperationError(operationId, result.error || 'Failed to undo');
      }
    },
    redo: async () => {
      const operationId = userFeedback.handleOperationStart('Redo', 'redo');
      const result = await timelineOps.redo();
      if (result.success) {
        userFeedback.handleOperationSuccess(operationId, 'Action redone successfully');
      } else {
        userFeedback.handleOperationError(operationId, result.error || 'Failed to redo');
      }
    },
    save: async () => {
      // This would integrate with the save checkpoint system
      console.log('Save action');
    },
    saveAs: async () => {
      console.log('Save as action');
    },
    playPause: () => {
      dispatch(setIsPlaying(!isPlaying));
    },
    stop: () => {
      dispatch(setIsPlaying(false));
      dispatch(setPlayheadTime(0));
    },
    goToStart: async () => {
      const result = await timelineOps.setPlayheadTime(0);
      if (!result.success) {
        toast.error(result.error || 'Failed to go to start');
      }
    },
    goToEnd: async () => {
      const result = await timelineOps.setPlayheadTime(duration);
      if (!result.success) {
        toast.error(result.error || 'Failed to go to end');
      }
    },
    stepForward: async () => {
      const result = await timelineOps.setPlayheadTime(Math.min(playheadTime + 1, duration));
      if (!result.success) {
        toast.error(result.error || 'Failed to step forward');
      }
    },
    stepBackward: async () => {
      const result = await timelineOps.setPlayheadTime(Math.max(playheadTime - 1, 0));
      if (!result.success) {
        toast.error(result.error || 'Failed to step backward');
      }
    },
    addVideoLayer: async () => {
      const operationId = userFeedback.handleOperationStart('Add Video Layer', 'addLayer');
      const newLayer: Omit<Layer, 'id'> = {
        name: 'Video Layer',
        type: 'video',
        clips: [],
        isVisible: true,
        isLocked: false,
        isMuted: false,
        order: layers.length
      };
      const result = await timelineOps.addLayer(newLayer);
      if (result.success) {
        userFeedback.handleOperationSuccess(operationId, 'Video layer added successfully');
      } else {
        userFeedback.handleOperationError(operationId, result.error || 'Failed to add video layer');
      }
    },
    addAudioLayer: async () => {
      const operationId = userFeedback.handleOperationStart('Add Audio Layer', 'addLayer');
      const newLayer: Omit<Layer, 'id'> = {
        name: 'Audio Layer',
        type: 'audio',
        clips: [],
        isVisible: true,
        isLocked: false,
        isMuted: false,
        order: layers.length
      };
      const result = await timelineOps.addLayer(newLayer);
      if (result.success) {
        userFeedback.handleOperationSuccess(operationId, 'Audio layer added successfully');
      } else {
        userFeedback.handleOperationError(operationId, result.error || 'Failed to add audio layer');
      }
    },
    addTextLayer: async () => {
      const operationId = userFeedback.handleOperationStart('Add Text Layer', 'addLayer');
      const newLayer: Omit<Layer, 'id'> = {
        name: 'Text Layer',
        type: 'text',
        clips: [],
        isVisible: true,
        isLocked: false,
        isMuted: false,
        order: layers.length
      };
      const result = await timelineOps.addLayer(newLayer);
      if (result.success) {
        userFeedback.handleOperationSuccess(operationId, 'Text layer added successfully');
      } else {
        userFeedback.handleOperationError(operationId, result.error || 'Failed to add text layer');
      }
    },
    deleteSelected: async () => {
      // This would integrate with selection state
      console.log('Delete selected action');
    },
    showShortcuts: () => {
      setShowKeyboardShortcuts(true);
    },
    showHistory: () => {
      setShowHistoryPanel(true);
    },
    showDashboard: () => {
      setShowOperationDashboard(true);
    },
    focusSearch: () => {
      console.log('Focus search action');
    }
  };

  const timelineState = {
    canUndo: timelineOps.canUndo,
    canRedo: timelineOps.canRedo,
    isPlaying,
    hasSelection: false // This would come from the selection state
  };

  // Use timeline shortcuts
  useTimelineShortcuts(projectId, timelineActions, timelineState);

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

  // Handle video time updates during playback
  const handleVideoTimeUpdate = (timelineTime: number) => {
    dispatch(setPlayheadTime(timelineTime));
  };

  // Memoize video URL to prevent unnecessary re-renders
  const videoUrl = React.useMemo(() => {
    return videoBlobUrl;
  }, [videoBlobUrl]);

  // Use ref to track current playhead time for auto-advance
  const playheadTimeRef = React.useRef(playheadTime);
  playheadTimeRef.current = playheadTime;

  useEffect(() => {
    if (projectId) {
      console.log('TimelinePage: Starting data load for project:', projectId);
      dispatch(fetchProjectById(projectId) as any);
      
      // Load timeline history first, then auto-restore latest saved version
      dispatch(loadTimelineHistory(projectId) as any).then((result: any) => {
        if (result.payload && result.payload.data && result.payload.data.length > 0) {
          // Find the latest saved version (highest version number)
          const latestVersion = Math.max(...result.payload.data.map((item: any) => item.version));
          console.log('TimelinePage: Auto-restoring latest saved version:', latestVersion);
          dispatch(restoreTimelineVersion({ projectId, version: latestVersion }) as any);
        } else {
          // No saved versions, load current timeline
          console.log('TimelinePage: No saved versions found, loading current timeline');
          dispatch(loadTimeline(projectId) as any);
        }
      }).catch((error: any) => {
        console.error('TimelinePage: Failed to load timeline history, falling back to current timeline:', error);
        dispatch(loadTimeline(projectId) as any);
      });
    }
  }, [dispatch, projectId]);

  // Initialize timeline when project data is available
  useEffect(() => {
    if (currentProject && currentProject.duration && projectId) {
      console.log('TimelinePage: Project data available, initializing timeline:', {
        projectDuration: currentProject.duration,
        timelineDuration: duration,
        layersCount: layers.length
      });
      
      // Set duration if not already set
      if (duration === 0) {
        console.log('TimelinePage: Setting duration from project:', currentProject.duration);
        dispatch(setDuration(currentProject.duration));
      }
      
      // Create video layer if no main video layer exists
      const hasMainVideoLayer = layers.some(layer => layer.isMainVideo);
      if (!hasMainVideoLayer) {
        console.log('TimelinePage: Creating main video layer for project:', projectId);
        
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
        const videoLayer: Layer = {
          id: `video-layer-${projectId}`,
          name: 'Video',
          type: 'video',
          clips: [{
            id: `video-clip-${projectId}`,
            type: 'video',
            startTime: 0,
            endTime: currentProject.duration,
            duration: currentProject.duration,
            originalStartTime: 0,
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
          isMainVideo: true
        };
        
        dispatch(addLayer({ ...videoLayer, skipUndo: true }));
        console.log('TimelinePage: Video layer created successfully');
      } else {
        console.log('TimelinePage: Main video layer already exists');
      }
    }
  }, [currentProject, duration, layers, dispatch, projectId]);

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

  // Auto-advance timeline when video is playing (disabled - let video control playback)
  // useEffect(() => {
  //   let interval: NodeJS.Timeout;
  //   if (isPlaying) {
  //     interval = setInterval(() => {
  //       const newTime = playheadTimeRef.current + 0.1; // Use ref to get current time
  //       const effectiveDuration = getEffectiveTimelineDuration(layers);
        
  //       if (newTime < effectiveDuration) {
  //         dispatch(setPlayheadTime(newTime));
  //       } else {
  //         // Stop playing and clamp playhead to exact end
  //         dispatch(setPlayheadTime(effectiveDuration));
  //         dispatch(setIsPlaying(false));
  //       }
  //     }, 100);
  //   }
  //   return () => {
  //     if (interval) {
  //       clearInterval(interval);
  //     }
  //   };
  // }, [isPlaying, layers, dispatch]); // Use layers instead of currentProject.duration

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
          <div style={{ position: 'relative' }} data-save-dropdown>
            <SaveButton 
              onClick={() => setIsSaveDropdownOpen(!isSaveDropdownOpen)}
              $hasUnsavedChanges={hasUnsavedChanges}
              $isDropdownOpen={isSaveDropdownOpen}
              title={hasUnsavedChanges ? 'Save Changes' : 'All Changes Saved'}
            >
              <StatusIndicator $status={getSaveStatus()} />
              <span>
                {hasUnsavedChanges ? 'Save' : 'All Saved'}
              </span>
              <DropdownArrow $isOpen={isSaveDropdownOpen}>▼</DropdownArrow>
            </SaveButton>
            
            <SaveDropdown $isOpen={isSaveDropdownOpen}>
              <DropdownItem onClick={handleQuickSave}>
                Quick Save
              </DropdownItem>
              <DropdownItem onClick={handleNamedSave}>
                Named Save
              </DropdownItem>
              <DropdownItem onClick={handleAutoSave}>
                Auto Save
              </DropdownItem>
              <DropdownItem onClick={handleRestoreCheckpoint}>
                Restore Checkpoint
              </DropdownItem>
            </SaveDropdown>
          </div>
          <PlayPauseButton onClick={handlePlayPause}>
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </PlayPauseButton>
          <BackButton onClick={handleBack}>Back to Projects</BackButton>
          <ProjectSettingsDropdown
            onShortcuts={() => setShowKeyboardShortcuts(true)}
            onHistory={() => setShowHistoryPanel(true)}
            onDashboard={() => setShowOperationDashboard(true)}
            onSwitchProject={() => setShowProjectSwitcher(true)}
            onProjectHistory={() => setShowProjectHistoryDashboard(true)}
          />
        </div>
      </Header>
      
      <MainContent>
        <VideoSection>
          <VideoPreview 
            videoUrl={videoUrl}
            currentTime={playheadTime}
            isPlaying={isPlaying}
            layers={layers}
            onTimeUpdate={handleVideoTimeUpdate}
          />
        </VideoSection>
        
        <TimelineSection>
          <TimelineToolbar projectId={projectId} />
          <TimelineEditor 
            projectId={projectId || ''}
            layers={layers}
            playheadTime={playheadTime}
            zoom={zoom}
            duration={effectiveDuration}
          />
        </TimelineSection>
      </MainContent>
      
      {/* Enhanced UI Components */}
      <KeyboardShortcutOverlay
        isVisible={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
      <HistoryPanel 
        isVisible={showHistoryPanel} 
        onClose={() => setShowHistoryPanel(false)}
        projectId={projectId || ''}
      />
      <OperationStatusDashboard 
        isVisible={showOperationDashboard} 
        onClose={() => setShowOperationDashboard(false)}
        projectId={projectId || ''}
      />
      
      {/* Project Management Components */}
      <ProjectSwitcher
        currentProjectId={projectId || ''}
        onProjectSwitch={handleProjectSwitch}
        projects={[]} // This would come from Redux state
      />
      
      <ProjectHistoryDashboard
        isVisible={showProjectHistoryDashboard}
        onClose={() => setShowProjectHistoryDashboard(false)}
        currentProjectId={projectId || ''}
        projects={[]} // This would come from Redux state
        onProjectSwitch={handleProjectSwitch}
      />
      
      {/* Recovery System */}
      <RecoveryDialog
        isVisible={pageRecovery.showRecoveryDialog && pageRecovery.recoveryData !== null}
        onClose={() => pageRecovery.setShowRecoveryDialog(false)}
        projectId={projectId || ''}
        recoveryData={pageRecovery.recoveryData}
        onRecoveryComplete={pageRecovery.handleRecovery}
      />
      
      <FeedbackUI />
    </TimelineContainer>
  );
};

// Main TimelinePage component with integrated providers
const TimelinePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <ErrorContainer>
        <h2>Project ID not found</h2>
        <button onClick={() => window.history.back()}>Go Back</button>
      </ErrorContainer>
    );
  }

  return (
    <KeyboardShortcutProvider projectId={projectId}>
      <TimelineOperationProvider projectId={projectId}>
        <UserFeedbackProvider projectId={projectId}>
          <TimelineContent projectId={projectId} />
        </UserFeedbackProvider>
      </TimelineOperationProvider>
    </KeyboardShortcutProvider>
  );
};

export default TimelinePage;
