/**
 * Comprehensive Recovery Options Hook
 * 
 * This hook provides all recovery options including restore checkpoint,
 * discard changes, and continue editing functionality.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { 
  getPageRecoveryManager
} from '../utils/pageRecoveryManager';
import { getChangeTracker } from '../utils/changeTracker';
import { getNavigationGuard } from '../utils/navigationGuard';
import { TimelineState, Checkpoint, ActionHistoryItem } from '../types';

export interface RecoveryOptions {
  restoreCheckpoint: boolean;
  discardChanges: boolean;
  continueEditing: boolean;
  autoSave: boolean;
  createBackup: boolean;
}

export interface RecoveryResult {
  success: boolean;
  action: 'restore' | 'discard' | 'continue' | 'backup';
  message: string;
  data?: any;
  error?: string;
}

export interface UseRecoveryOptionsReturn {
  // Recovery state
  isRecoveryAvailable: boolean;
  availableOptions: RecoveryOptions;
  lastCheckpoint: Checkpoint | null;
  unsavedChangesCount: number;
  
  // Recovery actions
  restoreFromCheckpoint: (checkpointId?: string) => Promise<RecoveryResult>;
  discardAllChanges: () => Promise<RecoveryResult>;
  continueWithChanges: () => Promise<RecoveryResult>;
  createBackup: () => Promise<RecoveryResult>;
  
  // Checkpoint management
  getAvailableCheckpoints: () => Checkpoint[];
  createManualCheckpoint: (description: string) => Promise<string | null>;
  
  // Change management
  getChangeSummary: () => any;
  clearChangeHistory: () => void;
  
  // Navigation protection
  enableNavigationProtection: () => void;
  disableNavigationProtection: () => void;
  
  // Status
  getRecoveryStatus: () => {
    hasUnsavedChanges: boolean;
    lastSaveTime: number | null;
    changeCount: number;
    isProtected: boolean;
  };
}

export const useRecoveryOptions = (
  projectId: string,
  options: {
    enableAutoBackup?: boolean;
    enableNavigationProtection?: boolean;
    onRecoveryComplete?: (result: RecoveryResult) => void;
  } = {}
): UseRecoveryOptionsReturn => {
  const dispatch = useDispatch();
  const timelineState = useSelector((state: RootState) => state.timeline);
  
  const {
    enableAutoBackup = true,
    enableNavigationProtection = true,
    onRecoveryComplete
  } = options;

  const pageRecoveryManagerRef = useRef(getPageRecoveryManager());
  const changeTrackerRef = useRef(getChangeTracker());
  const navigationGuardRef = useRef(getNavigationGuard());
  
  const [isRecoveryAvailable, setIsRecoveryAvailable] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<RecoveryOptions>({
    restoreCheckpoint: false,
    discardChanges: true,
    continueEditing: true,
    autoSave: true,
    createBackup: true
  });
  const [lastCheckpoint, setLastCheckpoint] = useState<Checkpoint | null>(null);
  const [unsavedChangesCount, setUnsavedChangesCount] = useState(0);

  // Initialize recovery systems
  useEffect(() => {
    if (projectId) {
      // Initialize page recovery manager
      pageRecoveryManagerRef.current.initialize(projectId);
      
      // Start change tracking
      changeTrackerRef.current.startTracking(projectId);
      
      // Enable navigation protection
      if (enableNavigationProtection) {
        navigationGuardRef.current.activate();
      }
    }

    return () => {
      changeTrackerRef.current.stopTracking();
      if (enableNavigationProtection) {
        navigationGuardRef.current.deactivate();
      }
    };
  }, [projectId, enableNavigationProtection]);

  // Update recovery state
  useEffect(() => {
    const updateRecoveryState = () => {
      const recoveryState = pageRecoveryManagerRef.current.getRecoveryState();
      const changeSummary = changeTrackerRef.current.getChangeSummary();
      const checkpoints = pageRecoveryManagerRef.current['projectHistoryManager'].getCheckpoints();
      
      setIsRecoveryAvailable(recoveryState.hasUnsavedChanges || changeSummary.unsavedChanges > 0);
      setUnsavedChangesCount(changeSummary.unsavedChanges);
      
      // Update available options
      setAvailableOptions({
        restoreCheckpoint: checkpoints.length > 0,
        discardChanges: true,
        continueEditing: true,
        autoSave: recoveryState.autoSaveEnabled,
        createBackup: enableAutoBackup
      });
      
      // Set last checkpoint
      if (checkpoints.length > 0) {
        const latestCheckpoint = checkpoints.sort((a, b) => b.timestamp - a.timestamp)[0];
        setLastCheckpoint(latestCheckpoint);
      }
    };

    const interval = setInterval(updateRecoveryState, 1000);
    updateRecoveryState();

    return () => clearInterval(interval);
  }, [enableAutoBackup]);

  // Restore from checkpoint
  const restoreFromCheckpoint = useCallback(async (checkpointId?: string): Promise<RecoveryResult> => {
    try {
      const checkpoints = pageRecoveryManagerRef.current['projectHistoryManager'].getCheckpoints();
      const targetCheckpointId = checkpointId || (checkpoints.length > 0 ? checkpoints[0].id : null);
      
      if (!targetCheckpointId) {
        return {
          success: false,
          action: 'restore',
          message: 'No checkpoint available to restore',
          error: 'No checkpoint found'
        };
      }

      const success = pageRecoveryManagerRef.current['projectHistoryManager'].restoreCheckpoint(targetCheckpointId);
      
      if (success) {
        // Clear unsaved changes
        changeTrackerRef.current.clearHistory();
        navigationGuardRef.current.clearUnsavedChanges();
        
        // Sync Redux state
        const timelineState = pageRecoveryManagerRef.current['projectHistoryManager'].getTimelineState();
        if (timelineState) {
          dispatch({
            type: 'timeline/syncProjectState',
            payload: timelineState
          });
        }

        const result: RecoveryResult = {
          success: true,
          action: 'restore',
          message: 'Successfully restored from checkpoint',
          data: { checkpointId: targetCheckpointId }
        };

        onRecoveryComplete?.(result);
        return result;
      } else {
        return {
          success: false,
          action: 'restore',
          message: 'Failed to restore from checkpoint',
          error: 'Restore operation failed'
        };
      }
    } catch (error) {
      const result: RecoveryResult = {
        success: false,
        action: 'restore',
        message: 'Error during restore operation',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      onRecoveryComplete?.(result);
      return result;
    }
  }, [dispatch, onRecoveryComplete]);

  // Discard all changes
  const discardAllChanges = useCallback(async (): Promise<RecoveryResult> => {
    try {
      // Clear all unsaved changes
      pageRecoveryManagerRef.current.handleRecovery(projectId, 'discard');
      changeTrackerRef.current.clearHistory();
      navigationGuardRef.current.clearUnsavedChanges();
      
      // Clear Redux state
      dispatch({
        type: 'timeline/resetState'
      });

      const result: RecoveryResult = {
        success: true,
        action: 'discard',
        message: 'All changes discarded successfully'
      };

      onRecoveryComplete?.(result);
      return result;
    } catch (error) {
      const result: RecoveryResult = {
        success: false,
        action: 'discard',
        message: 'Error during discard operation',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      onRecoveryComplete?.(result);
      return result;
    }
  }, [projectId, dispatch, onRecoveryComplete]);

  // Continue with changes
  const continueWithChanges = useCallback(async (): Promise<RecoveryResult> => {
    try {
      // Continue with current state
      pageRecoveryManagerRef.current.handleRecovery(projectId, 'continue');
      
      // Mark unsaved changes
      navigationGuardRef.current.markUnsavedChanges();

      const result: RecoveryResult = {
        success: true,
        action: 'continue',
        message: 'Continuing with current changes'
      };

      onRecoveryComplete?.(result);
      return result;
    } catch (error) {
      const result: RecoveryResult = {
        success: false,
        action: 'continue',
        message: 'Error during continue operation',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      onRecoveryComplete?.(result);
      return result;
    }
  }, [projectId, onRecoveryComplete]);

  // Create backup
  const createBackup = useCallback(async (): Promise<RecoveryResult> => {
    try {
      const currentState = pageRecoveryManagerRef.current['projectHistoryManager'].getTimelineState();
      const actionHistory = pageRecoveryManagerRef.current['projectHistoryManager'].getActionHistory();
      const checkpoints = pageRecoveryManagerRef.current['projectHistoryManager'].getCheckpoints();
      
      if (!currentState) {
        return {
          success: false,
          action: 'backup',
          message: 'No state available to backup',
          error: 'No current state'
        };
      }

      const backupData = {
        timestamp: Date.now(),
        projectId,
        timelineState: currentState,
        actionHistory,
        checkpoints,
        metadata: {
          version: '1.0',
          createdBy: 'recovery-system',
          description: 'Automatic backup before recovery operation'
        }
      };

      // Save backup to localStorage
      const backupKey = `snipix_backup_${projectId}_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));

      const result: RecoveryResult = {
        success: true,
        action: 'backup',
        message: 'Backup created successfully',
        data: { backupKey, backupData }
      };

      onRecoveryComplete?.(result);
      return result;
    } catch (error) {
      const result: RecoveryResult = {
        success: false,
        action: 'backup',
        message: 'Error during backup operation',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      onRecoveryComplete?.(result);
      return result;
    }
  }, [projectId, onRecoveryComplete]);

  // Get available checkpoints
  const getAvailableCheckpoints = useCallback((): Checkpoint[] => {
    try {
      return pageRecoveryManagerRef.current['projectHistoryManager'].getCheckpoints();
    } catch (error) {
      console.warn('Failed to get checkpoints:', error);
      return [];
    }
  }, []);

  // Create manual checkpoint
  const createManualCheckpoint = useCallback(async (description: string): Promise<string | null> => {
    try {
      const checkpointId = pageRecoveryManagerRef.current['projectHistoryManager'].saveCheckpoint(description, false);
      
      if (checkpointId) {
        // Clear unsaved changes after successful save
        changeTrackerRef.current.clearHistory();
        navigationGuardRef.current.clearUnsavedChanges();
      }
      
      return checkpointId;
    } catch (error) {
      console.error('Failed to create manual checkpoint:', error);
      return null;
    }
  }, []);

  // Get change summary
  const getChangeSummary = useCallback(() => {
    try {
      return changeTrackerRef.current.getChangeSummary();
    } catch (error) {
      console.warn('Failed to get change summary:', error);
      return null;
    }
  }, []);

  // Clear change history
  const clearChangeHistory = useCallback(() => {
    try {
      changeTrackerRef.current.clearHistory();
      navigationGuardRef.current.clearUnsavedChanges();
    } catch (error) {
      console.warn('Failed to clear change history:', error);
    }
  }, []);

  // Enable navigation protection
  const enableNavProtection = useCallback(() => {
    try {
      navigationGuardRef.current.activate();
    } catch (error) {
      console.warn('Failed to enable navigation protection:', error);
    }
  }, []);

  // Disable navigation protection
  const disableNavProtection = useCallback(() => {
    try {
      navigationGuardRef.current.deactivate();
    } catch (error) {
      console.warn('Failed to disable navigation protection:', error);
    }
  }, []);

  // Get recovery status
  const getRecoveryStatus = useCallback(() => {
    try {
      const recoveryState = pageRecoveryManagerRef.current.getRecoveryState();
      const changeSummary = changeTrackerRef.current.getChangeSummary();
      const navigationStatus = navigationGuardRef.current.getStatus();
      
      return {
        hasUnsavedChanges: recoveryState.hasUnsavedChanges || changeSummary.unsavedChanges > 0,
        lastSaveTime: lastCheckpoint?.timestamp || null,
        changeCount: changeSummary.unsavedChanges,
        isProtected: navigationStatus.isActive
      };
    } catch (error) {
      console.warn('Failed to get recovery status:', error);
      return {
        hasUnsavedChanges: false,
        lastSaveTime: null,
        changeCount: 0,
        isProtected: false
      };
    }
  }, [lastCheckpoint]);

  return {
    // Recovery state
    isRecoveryAvailable,
    availableOptions,
    lastCheckpoint,
    unsavedChangesCount,
    
    // Recovery actions
    restoreFromCheckpoint,
    discardAllChanges,
    continueWithChanges,
    createBackup,
    
    // Checkpoint management
    getAvailableCheckpoints,
    createManualCheckpoint,
    
    // Change management
    getChangeSummary,
    clearChangeHistory,
    
    // Navigation protection
    enableNavigationProtection: enableNavProtection,
    disableNavigationProtection: disableNavProtection,
    
    // Status
    getRecoveryStatus
  };
};

export default useRecoveryOptions;
