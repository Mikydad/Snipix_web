/**
 * Custom hook for automatic checkpoint restoration and recovery management
 * 
 * This hook provides React integration for the page recovery system,
 * handling automatic checkpoint restoration and recovery dialogs.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { 
  getPageRecoveryManager,
  PageRecoveryConfig,
  RecoveryState 
} from '../utils/pageRecoveryManager';
import { TimelineState, Checkpoint, ActionHistoryItem } from '../types';

export interface UsePageRecoveryOptions {
  config?: Partial<PageRecoveryConfig>;
  enableAutoRestore?: boolean;
  enableRecoveryDialog?: boolean;
  onRecoveryComplete?: (action: 'restore' | 'discard' | 'continue') => void;
}

export interface UsePageRecoveryReturn {
  // Recovery state
  recoveryState: RecoveryState;
  isRecoveryNeeded: boolean;
  recoveryData: RecoveryState['recoveryData'];
  
  // Recovery actions
  handleRecovery: (action: 'restore' | 'discard' | 'continue') => void;
  clearRecoveryData: () => void;
  
  // Checkpoint management
  createCheckpoint: (description: string, isAutoSave?: boolean) => string | null;
  restoreCheckpoint: (checkpointId: string) => boolean;
  getCheckpoints: () => Checkpoint[];
  
  // State management
  updateRecoveryState: (updates: Partial<RecoveryState>) => void;
  
  // Dialog state
  showRecoveryDialog: boolean;
  setShowRecoveryDialog: (show: boolean) => void;
}

export const usePageRecovery = (
  projectId: string,
  options: UsePageRecoveryOptions = {}
): UsePageRecoveryReturn => {
  const dispatch = useDispatch();
  const timelineState = useSelector((state: RootState) => state.timeline);
  
  const {
    config = {},
    enableAutoRestore = true,
    enableRecoveryDialog = true,
    onRecoveryComplete
  } = options;

  const pageRecoveryManagerRef = useRef(getPageRecoveryManager(config));
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    hasUnsavedChanges: false,
    lastSavedCheckpoint: null,
    lastActionTimestamp: 0,
    autoSaveEnabled: true,
    recoveryData: null
  });
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize recovery manager
  useEffect(() => {
    if (!isInitialized && projectId) {
      pageRecoveryManagerRef.current.initialize(projectId);
      setIsInitialized(true);
    }
  }, [projectId, isInitialized]);

  // Listen for recovery events
  useEffect(() => {
    if (!enableRecoveryDialog) return;

    const handleRecoveryNeeded = (event: CustomEvent) => {
      const { projectId: eventProjectId, recoveryData } = event.detail;
      
      if (eventProjectId === projectId) {
        setRecoveryState(prev => ({
          ...prev,
          recoveryData,
          hasUnsavedChanges: true
        }));
        setShowRecoveryDialog(true);
      }
    };

    window.addEventListener('snipix:recovery-needed', handleRecoveryNeeded as EventListener);
    
    return () => {
      window.removeEventListener('snipix:recovery-needed', handleRecoveryNeeded as EventListener);
    };
  }, [projectId, enableRecoveryDialog]);

  // Update recovery state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = pageRecoveryManagerRef.current.getRecoveryState();
      setRecoveryState(currentState);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle recovery action
  const handleRecovery = useCallback((action: 'restore' | 'discard' | 'continue') => {
    try {
      pageRecoveryManagerRef.current.handleRecovery(projectId, action);
      
      // Update local state
      setRecoveryState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        recoveryData: null
      }));
      
      // Close dialog
      setShowRecoveryDialog(false);
      
      // Notify parent component
      onRecoveryComplete?.(action);
      
      // Dispatch Redux action to sync state
      if (action === 'restore' || action === 'continue') {
        const timelineState = pageRecoveryManagerRef.current.getRecoveryData()?.timelineState;
        if (timelineState) {
          dispatch({
            type: 'timeline/syncProjectState',
            payload: timelineState
          });
        }
      }
    } catch (error) {
      console.error('Recovery action failed:', error);
    }
  }, [projectId, dispatch, onRecoveryComplete]);

  // Clear recovery data
  const clearRecoveryData = useCallback(() => {
    try {
      pageRecoveryManagerRef.current.updateRecoveryState({
        hasUnsavedChanges: false,
        recoveryData: null
      });
      
      setRecoveryState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        recoveryData: null
      }));
      
      setShowRecoveryDialog(false);
    } catch (error) {
      console.error('Failed to clear recovery data:', error);
    }
  }, []);

  // Create checkpoint
  const createCheckpoint = useCallback((description: string, isAutoSave: boolean = false): string | null => {
    try {
      // Use the project history manager to create checkpoint
      const projectHistoryManager = pageRecoveryManagerRef.current['projectHistoryManager'];
      const checkpointId = projectHistoryManager.saveCheckpoint(description, isAutoSave);
      
      if (checkpointId) {
        // Update recovery state
        setRecoveryState(prev => ({
          ...prev,
          hasUnsavedChanges: false,
          lastSavedCheckpoint: projectHistoryManager.getCheckpoints().find(cp => cp.id === checkpointId) || null
        }));
      }
      
      return checkpointId;
    } catch (error) {
      console.error('Failed to create checkpoint:', error);
      return null;
    }
  }, []);

  // Restore checkpoint
  const restoreCheckpoint = useCallback((checkpointId: string): boolean => {
    try {
      const projectHistoryManager = pageRecoveryManagerRef.current['projectHistoryManager'];
      const success = projectHistoryManager.restoreCheckpoint(checkpointId);
      
      if (success) {
        // Update recovery state
        setRecoveryState(prev => ({
          ...prev,
          hasUnsavedChanges: false,
          recoveryData: null
        }));
        
        // Sync Redux state
        const timelineState = projectHistoryManager.getTimelineState();
        if (timelineState) {
          dispatch({
            type: 'timeline/syncProjectState',
            payload: timelineState
          });
        }
      }
      
      return success;
    } catch (error) {
      console.error('Failed to restore checkpoint:', error);
      return false;
    }
  }, [dispatch]);

  // Get checkpoints
  const getCheckpoints = useCallback((): Checkpoint[] => {
    try {
      const projectHistoryManager = pageRecoveryManagerRef.current['projectHistoryManager'];
      return projectHistoryManager.getCheckpoints();
    } catch (error) {
      console.error('Failed to get checkpoints:', error);
      return [];
    }
  }, []);

  // Update recovery state
  const updateRecoveryState = useCallback((updates: Partial<RecoveryState>) => {
    try {
      pageRecoveryManagerRef.current.updateRecoveryState(updates);
      setRecoveryState(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update recovery state:', error);
    }
  }, []);

  // Auto-restore on timeline load
  useEffect(() => {
    if (!enableAutoRestore || !isInitialized) return;

    const checkForAutoRestore = () => {
      const isRecoveryNeeded = pageRecoveryManagerRef.current.isRecoveryNeeded();
      
      if (isRecoveryNeeded && !showRecoveryDialog) {
        // Auto-restore if recovery data exists and no dialog is shown
        const recoveryData = pageRecoveryManagerRef.current.getRecoveryData();
        
        if (recoveryData) {
          // Check if we should auto-restore (e.g., if it's an auto-save)
          const hasAutoSave = recoveryData.checkpoints.some(cp => cp.isAutoSave);
          
          if (hasAutoSave) {
            // Auto-restore from the latest auto-save checkpoint
            const latestAutoSave = recoveryData.checkpoints
              .filter(cp => cp.isAutoSave)
              .sort((a, b) => b.timestamp - a.timestamp)[0];
            
            if (latestAutoSave) {
              handleRecovery('restore');
            }
          } else {
            // Show recovery dialog for manual saves
            setShowRecoveryDialog(true);
          }
        }
      }
    };

    // Check after a short delay to allow initialization
    const timeout = setTimeout(checkForAutoRestore, 1000);
    
    return () => clearTimeout(timeout);
  }, [enableAutoRestore, isInitialized, showRecoveryDialog, handleRecovery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInitialized) {
        pageRecoveryManagerRef.current.destroy();
      }
    };
  }, [isInitialized]);

  return {
    // Recovery state
    recoveryState,
    isRecoveryNeeded: recoveryState.hasUnsavedChanges && recoveryState.recoveryData !== null,
    recoveryData: recoveryState.recoveryData,
    
    // Recovery actions
    handleRecovery,
    clearRecoveryData,
    
    // Checkpoint management
    createCheckpoint,
    restoreCheckpoint,
    getCheckpoints,
    
    // State management
    updateRecoveryState,
    
    // Dialog state
    showRecoveryDialog,
    setShowRecoveryDialog
  };
};

export default usePageRecovery;
