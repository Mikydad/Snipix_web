import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { 
  undo, 
  redo, 
  saveState, 
  saveCheckpoint, 
  restoreCheckpoint, 
  clearCheckpoints,
  clearActionHistory 
} from '../redux/slices/timelineSlice';
import { ActionType, ActionMetadata } from '../types';
import { ActionHistoryManager, createActionHistoryManager } from '../utils/actionHistory';
import { CheckpointManager, createCheckpointManager } from '../utils/checkpointManager';

/**
 * Custom hook for undo/redo functionality with keyboard shortcuts and enhanced features
 */
export const useUndoRedo = (projectId: string) => {
  const dispatch = useDispatch();
  const timelineState = useSelector((state: RootState) => state.timeline);
  
  const historyManagerRef = useRef<ActionHistoryManager | null>(null);
  const isProcessingRef = useRef(false);

  // Initialize history manager
  useEffect(() => {
    if (!historyManagerRef.current) {
      historyManagerRef.current = createActionHistoryManager(projectId, {
        maxSize: timelineState.maxHistorySize,
        enableCompression: true,
        enableMetadata: true,
        autoCleanup: true
      });
    }
  }, [projectId, timelineState.maxHistorySize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      // Ctrl/Cmd + Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }
      
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if (((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') ||
          ((event.ctrlKey || event.metaKey) && event.key === 'y')) {
        event.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUndo = useCallback(() => {
    if (isProcessingRef.current || timelineState.undoStack.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    dispatch(undo());
    
    // Reset processing flag after a short delay
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  }, [dispatch, timelineState.undoStack.length]);

  const handleRedo = useCallback(() => {
    if (isProcessingRef.current || timelineState.redoStack.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    dispatch(redo());
    
    // Reset processing flag after a short delay
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  }, [dispatch, timelineState.redoStack.length]);

  const handleSaveState = useCallback((
    description?: string, 
    metadata?: Partial<ActionMetadata>
  ) => {
    dispatch(saveState({ 
      description: description || 'Manual Save', 
      metadata: {
        projectId,
        isCheckpoint: false,
        ...metadata
      }
    }));
  }, [dispatch, projectId]);

  const canUndo = timelineState.undoStack.length > 0;
  const canRedo = timelineState.redoStack.length > 0;

  return {
    // Actions
    undo: handleUndo,
    redo: handleRedo,
    saveState: handleSaveState,
    
    // State
    canUndo,
    canRedo,
    undoStackLength: timelineState.undoStack.length,
    redoStackLength: timelineState.redoStack.length,
    hasUnsavedChanges: timelineState.hasUnsavedChanges,
    
    // History manager
    historyManager: historyManagerRef.current,
    
    // Processing state
    isProcessing: isProcessingRef.current
  };
};

/**
 * Custom hook for save checkpoint management
 */
export const useSaveCheckpoint = (projectId: string) => {
  const dispatch = useDispatch();
  const timelineState = useSelector((state: RootState) => state.timeline);
  
  const checkpointManagerRef = useRef<CheckpointManager | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize checkpoint manager
  useEffect(() => {
    if (!checkpointManagerRef.current) {
      checkpointManagerRef.current = createCheckpointManager(projectId, {
        maxCheckpoints: 10,
        autoSaveInterval: 30000, // 30 seconds
        enableCompression: true,
        enableMetadata: true
      });
    }
  }, [projectId]);

  // Auto-save effect
  useEffect(() => {
    if (checkpointManagerRef.current && timelineState.hasUnsavedChanges) {
      // Start auto-save timer
      if (!autoSaveIntervalRef.current) {
        autoSaveIntervalRef.current = setInterval(() => {
          if (timelineState.hasUnsavedChanges) {
            handleSaveCheckpoint('Auto Save', true);
          }
        }, 30000); // 30 seconds
      }
    } else {
      // Stop auto-save timer
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [timelineState.hasUnsavedChanges]);

  const handleSaveCheckpoint = useCallback((
    description: string, 
    isAutoSave: boolean = false
  ) => {
    dispatch(saveCheckpoint({ 
      projectId, 
      description, 
      isAutoSave 
    }));
  }, [dispatch, projectId]);

  const handleRestoreCheckpoint = useCallback((checkpointId: string) => {
    dispatch(restoreCheckpoint({ checkpointId }));
  }, [dispatch]);

  const handleClearCheckpoints = useCallback(() => {
    dispatch(clearCheckpoints());
  }, [dispatch]);

  const handleClearActionHistory = useCallback(() => {
    dispatch(clearActionHistory());
  }, [dispatch]);

  const getCheckpointStats = useCallback(() => {
    return checkpointManagerRef.current?.getStats() || {
      totalCheckpoints: 0,
      memoryUsage: 0,
      oldestCheckpoint: null,
      newestCheckpoint: null,
      autoSaveCount: 0,
      manualSaveCount: 0
    };
  }, []);

  const getAllCheckpoints = useCallback(() => {
    return checkpointManagerRef.current?.getAllCheckpoints() || [];
  }, []);

  const getLatestCheckpoint = useCallback(() => {
    return checkpointManagerRef.current?.getLatestCheckpoint() || null;
  }, []);

  return {
    // Actions
    saveCheckpoint: handleSaveCheckpoint,
    restoreCheckpoint: handleRestoreCheckpoint,
    clearCheckpoints: handleClearCheckpoints,
    clearActionHistory: handleClearActionHistory,
    
    // State
    checkpoints: timelineState.checkpoints,
    lastSavedCheckpoint: timelineState.lastSavedCheckpoint,
    hasUnsavedChanges: timelineState.hasUnsavedChanges,
    
    // Utilities
    getCheckpointStats,
    getAllCheckpoints,
    getLatestCheckpoint,
    
    // Manager
    checkpointManager: checkpointManagerRef.current
  };
};

/**
 * Combined hook for both undo/redo and checkpoint management
 */
export const useTimelineHistory = (projectId: string) => {
  const undoRedo = useUndoRedo(projectId);
  const saveCheckpoint = useSaveCheckpoint(projectId);
  const timelineState = useSelector((state: RootState) => state.timeline);

  return {
    ...undoRedo,
    ...saveCheckpoint,
    
    // Add missing properties that components expect
    actionHistory: timelineState.actionHistory,
    undoStack: timelineState.undoStack,
    redoStack: timelineState.redoStack,
    maxHistorySize: timelineState.maxHistorySize,
    
    // Combined utilities
    saveAndCreateCheckpoint: (description: string) => {
      undoRedo.saveState(description);
      saveCheckpoint.saveCheckpoint(description, false);
    },
    
    getHistoryStats: () => ({
      undo: {
        canUndo: undoRedo.canUndo,
        stackLength: undoRedo.undoStackLength
      },
      redo: {
        canRedo: undoRedo.canRedo,
        stackLength: undoRedo.redoStackLength
      },
      checkpoints: saveCheckpoint.getCheckpointStats(),
      unsavedChanges: undoRedo.hasUnsavedChanges
    })
  };
};

export default useTimelineHistory;

