import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { 
  saveCheckpoint, 
  restoreCheckpoint, 
  clearCheckpoints 
} from '../redux/slices/timelineSlice';
import { Checkpoint, CheckpointMetadata } from '../types';
import { CheckpointManager, createCheckpointManager } from '../utils/checkpointManager';

/**
 * Custom hook for save checkpoint management with enhanced features
 */
export const useSaveCheckpoint = (projectId: string) => {
  const dispatch = useDispatch();
  const timelineState = useSelector((state: RootState) => state.timeline);
  
  const checkpointManagerRef = useRef<CheckpointManager | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30000); // 30 seconds
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);

  // Initialize checkpoint manager
  useEffect(() => {
    if (!checkpointManagerRef.current) {
      checkpointManagerRef.current = createCheckpointManager(projectId, {
        maxCheckpoints: 10,
        autoSaveInterval,
        enableCompression: true,
        enableMetadata: true
      });
    }
  }, [projectId, autoSaveInterval]);

  // Auto-save effect
  useEffect(() => {
    if (checkpointManagerRef.current && isAutoSaveEnabled && timelineState.hasUnsavedChanges) {
      // Start auto-save timer
      if (!autoSaveIntervalRef.current) {
        autoSaveIntervalRef.current = setInterval(() => {
          if (timelineState.hasUnsavedChanges) {
            handleAutoSave();
          }
        }, autoSaveInterval);
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
  }, [isAutoSaveEnabled, autoSaveInterval, timelineState.hasUnsavedChanges]);

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

  const handleAutoSave = useCallback(() => {
    const now = Date.now();
    setLastAutoSaveTime(now);
    handleSaveCheckpoint('Auto Save', true);
  }, [handleSaveCheckpoint]);

  const handleRestoreCheckpoint = useCallback((checkpointId: string) => {
    dispatch(restoreCheckpoint({ checkpointId }));
  }, [dispatch]);

  const handleClearCheckpoints = useCallback(() => {
    dispatch(clearCheckpoints());
  }, [dispatch]);

  const handleClearOldCheckpoints = useCallback((olderThanDays: number = 7) => {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const oldCheckpoints = timelineState.checkpoints.filter(
      cp => cp.timestamp < cutoffTime
    );
    
    // Remove old checkpoints
    oldCheckpoints.forEach(cp => {
      checkpointManagerRef.current?.deleteCheckpoint(cp.id);
    });
  }, [timelineState.checkpoints]);

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

  const getCheckpointsByType = useCallback((isAutoSave: boolean) => {
    return checkpointManagerRef.current?.getCheckpointsByType(isAutoSave) || [];
  }, []);

  const searchCheckpoints = useCallback((query: string) => {
    return checkpointManagerRef.current?.searchCheckpoints(query) || [];
  }, []);

  const exportCheckpoints = useCallback(() => {
    return checkpointManagerRef.current?.exportCheckpoints() || '';
  }, []);

  const importCheckpoints = useCallback((data: string) => {
    return checkpointManagerRef.current?.importCheckpoints(data) || false;
  }, []);

  const getNextAutoSaveTime = useCallback(() => {
    if (!isAutoSaveEnabled || !lastAutoSaveTime) {
      return null;
    }
    return lastAutoSaveTime + autoSaveInterval;
  }, [isAutoSaveEnabled, lastAutoSaveTime, autoSaveInterval]);

  const getTimeUntilNextAutoSave = useCallback(() => {
    const nextAutoSave = getNextAutoSaveTime();
    if (!nextAutoSave) {
      return null;
    }
    return Math.max(0, nextAutoSave - Date.now());
  }, [getNextAutoSaveTime]);

  const formatTimeUntilNextAutoSave = useCallback(() => {
    const timeUntil = getTimeUntilNextAutoSave();
    if (!timeUntil) {
      return null;
    }
    
    const seconds = Math.ceil(timeUntil / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  }, [getTimeUntilNextAutoSave]);

  const toggleAutoSave = useCallback(() => {
    setIsAutoSaveEnabled(prev => !prev);
  }, []);

  const updateAutoSaveInterval = useCallback((interval: number) => {
    setAutoSaveInterval(Math.max(5000, Math.min(300000, interval))); // 5s to 5m
  }, []);

  const createNamedCheckpoint = useCallback((name: string) => {
    handleSaveCheckpoint(`Named Save: ${name}`, false);
  }, [handleSaveCheckpoint]);

  const createQuickSave = useCallback(() => {
    handleSaveCheckpoint('Quick Save', false);
  }, [handleSaveCheckpoint]);

  const restoreLatestCheckpoint = useCallback(() => {
    const latest = getLatestCheckpoint();
    if (latest) {
      handleRestoreCheckpoint(latest.id);
    }
  }, [getLatestCheckpoint, handleRestoreCheckpoint]);

  const getCheckpointMemoryUsage = useCallback(() => {
    const stats = getCheckpointStats();
    const bytesToMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
    return {
      totalMB: bytesToMB(stats.memoryUsage),
      averagePerCheckpoint: stats.totalCheckpoints > 0 ? 
        bytesToMB(stats.memoryUsage / stats.totalCheckpoints) : '0.00'
    };
  }, [getCheckpointStats]);

  return {
    // Actions
    saveCheckpoint: handleSaveCheckpoint,
    restoreCheckpoint: handleRestoreCheckpoint,
    clearCheckpoints: handleClearCheckpoints,
    clearOldCheckpoints: handleClearOldCheckpoints,
    createNamedCheckpoint,
    createQuickSave,
    restoreLatestCheckpoint,
    
    // Auto-save controls
    toggleAutoSave,
    updateAutoSaveInterval,
    enableAutoSave: () => setIsAutoSaveEnabled(true),
    disableAutoSave: () => setIsAutoSaveEnabled(false),
    
    // State
    checkpoints: timelineState.checkpoints,
    lastSavedCheckpoint: timelineState.lastSavedCheckpoint,
    hasUnsavedChanges: timelineState.hasUnsavedChanges,
    isAutoSaveEnabled,
    autoSaveInterval,
    lastAutoSaveTime,
    
    // Utilities
    getCheckpointStats,
    getAllCheckpoints,
    getLatestCheckpoint,
    getCheckpointsByType,
    searchCheckpoints,
    exportCheckpoints,
    importCheckpoints,
    getTimeUntilNextAutoSave,
    formatTimeUntilNextAutoSave,
    getCheckpointMemoryUsage,
    
    // Manager
    checkpointManager: checkpointManagerRef.current
  };
};

export default useSaveCheckpoint;

