/**
 * Custom hook for project-specific history management
 * 
 * This hook provides React integration for the ProjectHistoryManager,
 * handling project switching, state management, and cleanup.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { ActionType, ActionMetadata, TimelineState } from '../types';
import { 
  ProjectHistoryManager, 
  ProjectHistoryConfig, 
  ProjectHistoryStats,
  getProjectHistoryManager 
} from '../utils/projectHistoryManager';

export interface UseProjectHistoryOptions {
  config?: Partial<ProjectHistoryConfig>;
  enableAutoSave?: boolean;
  enableKeyboardShortcuts?: boolean;
}

export interface UseProjectHistoryReturn {
  // Project management
  switchToProject: (projectId: string) => void;
  getCurrentProjectId: () => string | null;
  getProjectStats: (projectId?: string) => ProjectHistoryStats | null;
  getAllProjectStats: () => ProjectHistoryStats[];
  
  // Timeline state
  getTimelineState: () => TimelineState | null;
  updateTimelineState: (updates: Partial<TimelineState>) => void;
  
  // History management
  addToHistory: (action: any) => void;
  getActionHistory: () => any[];
  clearHistory: () => void;
  
  // Checkpoint management
  saveCheckpoint: (description: string, isAutoSave?: boolean) => string | null;
  restoreCheckpoint: (checkpointId: string) => boolean;
  getCheckpoints: () => any[];
  clearCheckpoints: () => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoStackLength: number;
  redoStackLength: number;
  
  // Export/Import
  exportProjectHistory: (projectId?: string) => string | null;
  importProjectHistory: (projectId: string, data: string) => boolean;
  
  // State
  hasUnsavedChanges: boolean;
  isProcessing: boolean;
}

export const useProjectHistory = (
  projectId: string,
  options: UseProjectHistoryOptions = {}
): UseProjectHistoryReturn => {
  const dispatch = useDispatch();
  const timelineState = useSelector((state: RootState) => state.timeline);
  
  const {
    config = {},
    enableAutoSave = true,
    enableKeyboardShortcuts = true
  } = options;

  const managerRef = useRef<ProjectHistoryManager | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Initialize project history manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = getProjectHistoryManager(config);
    }
  }, [config]);

  // Switch to project when projectId changes
  useEffect(() => {
    if (managerRef.current && projectId) {
      const projectState = managerRef.current.switchToProject(projectId);
      setCurrentProjectId(projectId);
      
      // Sync Redux state with project state
      if (projectState.timelineState) {
        dispatch({
          type: 'timeline/syncProjectState',
          payload: projectState.timelineState
        });
      }
    }
  }, [projectId, dispatch]);

  // Auto-save effect
  useEffect(() => {
    if (!enableAutoSave || !managerRef.current || !currentProjectId) return;

    const interval = setInterval(() => {
      if (timelineState.hasUnsavedChanges) {
        handleSaveCheckpoint('Auto Save', true);
      }
    }, config.autoSaveInterval || 30000);

    return () => clearInterval(interval);
  }, [enableAutoSave, timelineState.hasUnsavedChanges, currentProjectId, config.autoSaveInterval]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

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
      // Ctrl/Cmd + Shift + Z for redo
      else if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + S for save
      else if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSaveCheckpoint('Manual Save', false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts]);

  // Project management functions
  const switchToProject = useCallback((newProjectId: string) => {
    if (!managerRef.current) return;
    
    setIsProcessing(true);
    try {
      const projectState = managerRef.current.switchToProject(newProjectId);
      setCurrentProjectId(newProjectId);
      
      // Sync Redux state
      dispatch({
        type: 'timeline/syncProjectState',
        payload: projectState.timelineState
      });
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch]);

  const getCurrentProjectId = useCallback(() => {
    return currentProjectId;
  }, [currentProjectId]);

  const getProjectStats = useCallback((targetProjectId?: string) => {
    if (!managerRef.current) return null;
    
    if (targetProjectId) {
      const project = managerRef.current.getProject(targetProjectId);
      return project ? {
        projectId: project.projectId,
        historySize: project.historyManager?.getAllActions().length || 0,
        checkpointCount: project.checkpointManager?.getAllCheckpoints().length || 0,
        memoryUsage: 0, // Will be calculated by manager
        lastAccessed: project.lastAccessed,
        isActive: project.isActive
      } : null;
    }
    
    return managerRef.current.getCurrentProjectStats();
  }, []);

  const getAllProjectStats = useCallback(() => {
    return managerRef.current?.getAllProjectStats() || [];
  }, []);

  // Timeline state functions
  const getTimelineState = useCallback(() => {
    return managerRef.current?.getTimelineState() || null;
  }, []);

  const updateTimelineState = useCallback((updates: Partial<TimelineState>) => {
    if (!managerRef.current) return;
    
    managerRef.current.updateTimelineState(updates);
    
    // Also update Redux state
    dispatch({
      type: 'timeline/updateState',
      payload: updates
    });
  }, [dispatch]);

  // History management functions
  const addToHistory = useCallback((action: any) => {
    if (!managerRef.current) return;
    
    managerRef.current.addToHistory(action);
  }, []);

  const getActionHistory = useCallback(() => {
    return managerRef.current?.getActionHistory() || [];
  }, []);

  const clearHistory = useCallback(() => {
    if (!managerRef.current) return;
    
    managerRef.current.clearHistory();
    dispatch(clearActionHistory());
  }, [dispatch]);

  // Checkpoint management functions
  const handleSaveCheckpoint = useCallback((description: string, isAutoSave: boolean = false) => {
    if (!managerRef.current) return null;
    
    const checkpointId = managerRef.current.saveCheckpoint(description, isAutoSave);
    
    // Also dispatch to Redux
    dispatch(saveCheckpoint({
      projectId: currentProjectId || '',
      description,
      isAutoSave
    }));
    
    return checkpointId;
  }, [dispatch, currentProjectId]);

  const handleRestoreCheckpoint = useCallback((checkpointId: string) => {
    if (!managerRef.current) return false;
    
    const success = managerRef.current.restoreCheckpoint(checkpointId);
    
    if (success) {
      // Sync Redux state
      const timelineState = managerRef.current!.getTimelineState();
      if (timelineState) {
        dispatch({
          type: 'timeline/syncProjectState',
          payload: timelineState
        });
      }
    }
    
    return success;
  }, [dispatch]);

  const getCheckpoints = useCallback(() => {
    return managerRef.current?.getCheckpoints() || [];
  }, []);

  const handleClearCheckpoints = useCallback(() => {
    if (!managerRef.current) return;
    
    managerRef.current.clearCheckpoints();
    dispatch(clearCheckpoints());
  }, [dispatch]);

  // Undo/Redo functions
  const handleUndo = useCallback(() => {
    if (!managerRef.current || isProcessing) return;
    
    setIsProcessing(true);
    try {
      dispatch(undo());
      
      // Sync with project state
      const timelineState = managerRef.current.getTimelineState();
      if (timelineState) {
        dispatch({
          type: 'timeline/syncProjectState',
          payload: timelineState
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, isProcessing]);

  const handleRedo = useCallback(() => {
    if (!managerRef.current || isProcessing) return;
    
    setIsProcessing(true);
    try {
      dispatch(redo());
      
      // Sync with project state
      const timelineState = managerRef.current.getTimelineState();
      if (timelineState) {
        dispatch({
          type: 'timeline/syncProjectState',
          payload: timelineState
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, isProcessing]);

  // Export/Import functions
  const exportProjectHistory = useCallback((targetProjectId?: string) => {
    if (!managerRef.current) return null;
    
    const projectId = targetProjectId || currentProjectId;
    if (!projectId) return null;
    
    return managerRef.current.exportProjectHistory(projectId);
  }, [currentProjectId]);

  const importProjectHistory = useCallback((targetProjectId: string, data: string) => {
    if (!managerRef.current) return false;
    
    const success = managerRef.current.importProjectHistory(targetProjectId, data);
    
    if (success && targetProjectId === currentProjectId) {
      // Sync Redux state if importing current project
      const timelineState = managerRef.current.getTimelineState();
      if (timelineState) {
        dispatch({
          type: 'timeline/syncProjectState',
          payload: timelineState
        });
      }
    }
    
    return success;
  }, [dispatch, currentProjectId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't destroy the global manager, just clean up current project
      if (managerRef.current && currentProjectId) {
        // Mark project as inactive
        const project = managerRef.current.getProject(currentProjectId);
        if (project) {
          project.isActive = false;
          project.lastAccessed = Date.now();
        }
      }
    };
  }, [currentProjectId]);

  return {
    // Project management
    switchToProject,
    getCurrentProjectId,
    getProjectStats,
    getAllProjectStats,
    
    // Timeline state
    getTimelineState,
    updateTimelineState,
    
    // History management
    addToHistory,
    getActionHistory,
    clearHistory,
    
    // Checkpoint management
    saveCheckpoint: handleSaveCheckpoint,
    restoreCheckpoint: handleRestoreCheckpoint,
    getCheckpoints,
    clearCheckpoints: handleClearCheckpoints,
    
    // Undo/Redo
    undo: handleUndo,
    redo: handleRedo,
    canUndo: timelineState.undoStack.length > 0,
    canRedo: timelineState.redoStack.length > 0,
    undoStackLength: timelineState.undoStack.length,
    redoStackLength: timelineState.redoStack.length,
    
    // Export/Import
    exportProjectHistory,
    importProjectHistory,
    
    // State
    hasUnsavedChanges: timelineState.hasUnsavedChanges,
    isProcessing
  };
};

export default useProjectHistory;
