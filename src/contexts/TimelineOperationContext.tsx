import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useTimelineOperations } from '../hooks/useTimelineOperations';
import { useTimelineOperationManager } from '../hooks/useTimelineOperationManager';
import { useTimelineHistory } from '../hooks/useUndoRedo';
import { Layer, Clip, Marker, ActionType, ActionMetadata } from '../types';

export interface TimelineOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

interface OperationQueue {
  id: string;
  operations: Array<{
    id: string;
    type: string;
    description: string;
    execute: () => Promise<any>;
    undo?: () => Promise<any>;
  }>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

interface TimelineOperationContextType {
  // Basic operations
  addLayer: (layer: Omit<Layer, 'id'>) => Promise<TimelineOperationResult>;
  removeLayer: (layerId: string) => Promise<TimelineOperationResult>;
  updateLayer: (layerId: string, updates: Partial<Layer>) => Promise<TimelineOperationResult>;
  reorderLayers: (layerIds: string[]) => Promise<TimelineOperationResult>;
  
  addClip: (layerId: string, clip: Omit<Clip, 'id'>) => Promise<TimelineOperationResult>;
  removeClip: (layerId: string, clipId: string) => Promise<TimelineOperationResult>;
  updateClip: (layerId: string, clipId: string, updates: Partial<Clip>) => Promise<TimelineOperationResult>;
  moveClip: (layerId: string, clipId: string, newStartTime: number) => Promise<TimelineOperationResult>;
  trimClip: (layerId: string, clipId: string, newStartTime: number, newEndTime: number) => Promise<TimelineOperationResult>;
  splitClip: (layerId: string, clipId: string, splitTime: number) => Promise<TimelineOperationResult>;
  mergeClips: (layerId: string, clipIds: string[]) => Promise<TimelineOperationResult>;
  
  setPlayheadTime: (time: number) => Promise<TimelineOperationResult>;
  setDuration: (duration: number) => Promise<TimelineOperationResult>;
  setZoom: (zoom: number) => Promise<TimelineOperationResult>;
  
  addMarker: (marker: Omit<Marker, 'id'>) => Promise<TimelineOperationResult>;
  removeMarker: (markerId: string) => Promise<TimelineOperationResult>;
  updateMarker: (markerId: string, updates: Partial<Marker>) => Promise<TimelineOperationResult>;
  
  // Undo/Redo operations
  undo: () => Promise<TimelineOperationResult>;
  redo: () => Promise<TimelineOperationResult>;
  
  // Complex operations
  duplicateLayer: (layerId: string) => Promise<TimelineOperationResult>;
  duplicateClip: (layerId: string, clipId: string) => Promise<TimelineOperationResult>;
  copyLayer: (layerId: string, targetTime: number) => Promise<TimelineOperationResult>;
  copyClip: (layerId: string, clipId: string, targetTime: number) => Promise<TimelineOperationResult>;
  moveLayerToTime: (layerId: string, targetTime: number) => Promise<TimelineOperationResult>;
  moveClipToTime: (layerId: string, clipId: string, targetTime: number) => Promise<TimelineOperationResult>;
  alignClipsToGrid: (layerId: string, gridSize: number) => Promise<TimelineOperationResult>;
  snapToMarkers: (layerId: string, clipId: string) => Promise<TimelineOperationResult>;
  
  // Batch operations
  startBatch: (description: string, metadata?: ActionMetadata) => string;
  addToBatch: (batchId: string, operation: () => Promise<any>, description: string) => void;
  commitBatch: (batchId: string) => Promise<TimelineOperationResult>;
  cancelBatch: (batchId: string) => void;
  
  // Queue management
  addToQueue: (operation: Omit<OperationQueue, 'id' | 'status' | 'progress' | 'createdAt'>) => string;
  executeQueue: () => Promise<void>;
  clearQueue: () => void;
  cancelOperation: (operationId: string) => void;
  
  // State
  timelineState: any;
  queue: OperationQueue[];
  activeBatch: string | null;
  isExecuting: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
}

const TimelineOperationContext = createContext<TimelineOperationContextType | null>(null);

interface TimelineOperationProviderProps {
  children: React.ReactNode;
  projectId: string;
}

export const TimelineOperationProvider: React.FC<TimelineOperationProviderProps> = ({
  children,
  projectId
}) => {
  const timelineOps = useTimelineOperations(projectId);
  const operationManager = useTimelineOperationManager(projectId);
  const timelineHistory = useTimelineHistory(projectId);
  
  const [operationHistory, setOperationHistory] = useState<Array<{
    id: string;
    type: string;
    description: string;
    timestamp: number;
    success: boolean;
    error?: string;
  }>>([]);

  // Track operation history
  const trackOperation = useCallback((
    type: string,
    description: string,
    success: boolean,
    error?: string
  ) => {
    const operation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      timestamp: Date.now(),
      success,
      error
    };
    
    setOperationHistory(prev => [...prev.slice(-99), operation]);
  }, []);

  // Enhanced operations with tracking
  const addLayer = useCallback(async (layer: Omit<Layer, 'id'>): Promise<TimelineOperationResult> => {
    const result = await timelineOps.addLayer(layer);
    trackOperation('addLayer', `Add ${layer.type} layer`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const removeLayer = useCallback(async (layerId: string): Promise<TimelineOperationResult> => {
    const result = await timelineOps.removeLayer(layerId);
    trackOperation('removeLayer', `Remove layer ${layerId}`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const updateLayer = useCallback(async (
    layerId: string, 
    updates: Partial<Layer>
  ): Promise<TimelineOperationResult> => {
    const result = await timelineOps.updateLayer(layerId, updates);
    trackOperation('updateLayer', `Update layer ${layerId}`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const reorderLayers = useCallback(async (layerIds: string[]): Promise<TimelineOperationResult> => {
    const result = await timelineOps.reorderLayers(layerIds);
    trackOperation('reorderLayers', `Reorder ${layerIds.length} layers`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const addClip = useCallback(async (
    layerId: string, 
    clip: Omit<Clip, 'id'>
  ): Promise<TimelineOperationResult> => {
    const result = await timelineOps.addClip(layerId, clip);
    trackOperation('addClip', `Add ${clip.type} clip`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const removeClip = useCallback(async (
    layerId: string, 
    clipId: string
  ): Promise<TimelineOperationResult> => {
    const result = await timelineOps.removeClip(layerId, clipId);
    trackOperation('removeClip', `Remove clip ${clipId}`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const updateClip = useCallback(async (
    layerId: string, 
    clipId: string, 
    updates: Partial<Clip>
  ): Promise<TimelineOperationResult> => {
    const result = await timelineOps.updateClip(layerId, clipId, updates);
    trackOperation('updateClip', `Update clip ${clipId}`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const moveClip = useCallback(async (
    layerId: string, 
    clipId: string, 
    newStartTime: number
  ): Promise<TimelineOperationResult> => {
    const result = await timelineOps.moveClip(layerId, clipId, newStartTime);
    trackOperation('moveClip', `Move clip to ${newStartTime.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const trimClip = useCallback(async (
    layerId: string, 
    clipId: string, 
    newStartTime: number, 
    newEndTime: number
  ): Promise<TimelineOperationResult> => {
    const result = await timelineOps.trimClip(layerId, clipId, newStartTime, newEndTime);
    trackOperation('trimClip', `Trim clip to ${newStartTime.toFixed(2)}s-${newEndTime.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const splitClip = useCallback(async (
    layerId: string, 
    clipId: string, 
    splitTime: number
  ): Promise<TimelineOperationResult> => {
    const result = await timelineOps.splitClip(layerId, clipId, splitTime);
    trackOperation('splitClip', `Split clip at ${splitTime.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const mergeClips = useCallback(async (
    layerId: string, 
    clipIds: string[]
  ): Promise<TimelineOperationResult> => {
    const result = await timelineOps.mergeClips(layerId, clipIds);
    trackOperation('mergeClips', `Merge ${clipIds.length} clips`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const setPlayheadTime = useCallback(async (time: number): Promise<TimelineOperationResult> => {
    const result = await timelineOps.setPlayheadTime(time);
    trackOperation('setPlayheadTime', `Set playhead to ${time.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const setDuration = useCallback(async (duration: number): Promise<TimelineOperationResult> => {
    const result = await timelineOps.setDuration(duration);
    trackOperation('setDuration', `Set duration to ${duration.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const setZoom = useCallback(async (zoom: number): Promise<TimelineOperationResult> => {
    const result = await timelineOps.setZoom(zoom);
    trackOperation('setZoom', `Set zoom to ${zoom}x`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const addMarker = useCallback(async (marker: Omit<Marker, 'id'>): Promise<TimelineOperationResult> => {
    const result = await timelineOps.addMarker(marker);
    trackOperation('addMarker', `Add marker at ${marker.time.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const removeMarker = useCallback(async (markerId: string): Promise<TimelineOperationResult> => {
    const result = await timelineOps.removeMarker(markerId);
    trackOperation('removeMarker', `Remove marker ${markerId}`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const updateMarker = useCallback(async (
    markerId: string, 
    updates: Partial<Marker>
  ): Promise<TimelineOperationResult> => {
    const result = await timelineOps.updateMarker(markerId, updates);
    trackOperation('updateMarker', `Update marker ${markerId}`, result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const undo = useCallback(async (): Promise<TimelineOperationResult> => {
    const result = await timelineOps.undo();
    trackOperation('undo', 'Undo last action', result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  const redo = useCallback(async (): Promise<TimelineOperationResult> => {
    const result = await timelineOps.redo();
    trackOperation('redo', 'Redo last action', result.success, result.error);
    return result;
  }, [timelineOps, trackOperation]);

  // Complex operations
  const duplicateLayer = useCallback(async (layerId: string): Promise<TimelineOperationResult> => {
    const result = await operationManager.duplicateLayer(layerId);
    trackOperation('duplicateLayer', `Duplicate layer ${layerId}`, result.success, result.error);
    return result;
  }, [operationManager, trackOperation]);

  const duplicateClip = useCallback(async (
    layerId: string, 
    clipId: string
  ): Promise<TimelineOperationResult> => {
    const result = await operationManager.duplicateClip(layerId, clipId);
    trackOperation('duplicateClip', `Duplicate clip ${clipId}`, result.success, result.error);
    return result;
  }, [operationManager, trackOperation]);

  const copyLayer = useCallback(async (
    layerId: string, 
    targetTime: number
  ): Promise<TimelineOperationResult> => {
    const result = await operationManager.copyLayer(layerId, targetTime);
    trackOperation('copyLayer', `Copy layer ${layerId} to ${targetTime.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [operationManager, trackOperation]);

  const copyClip = useCallback(async (
    layerId: string, 
    clipId: string, 
    targetTime: number
  ): Promise<TimelineOperationResult> => {
    const result = await operationManager.copyClip(layerId, clipId, targetTime);
    trackOperation('copyClip', `Copy clip ${clipId} to ${targetTime.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [operationManager, trackOperation]);

  const moveLayerToTime = useCallback(async (
    layerId: string, 
    targetTime: number
  ): Promise<TimelineOperationResult> => {
    const result = await operationManager.moveLayerToTime(layerId, targetTime);
    trackOperation('moveLayerToTime', `Move layer ${layerId} to ${targetTime.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [operationManager, trackOperation]);

  const moveClipToTime = useCallback(async (
    layerId: string, 
    clipId: string, 
    targetTime: number
  ): Promise<TimelineOperationResult> => {
    const result = await operationManager.moveClipToTime(layerId, clipId, targetTime);
    trackOperation('moveClipToTime', `Move clip ${clipId} to ${targetTime.toFixed(2)}s`, result.success, result.error);
    return result;
  }, [operationManager, trackOperation]);

  const alignClipsToGrid = useCallback(async (
    layerId: string, 
    gridSize: number
  ): Promise<TimelineOperationResult> => {
    const result = await operationManager.alignClipsToGrid(layerId, gridSize);
    trackOperation('alignClipsToGrid', `Align clips to ${gridSize}s grid`, result.success, result.error);
    return result;
  }, [operationManager, trackOperation]);

  const snapToMarkers = useCallback(async (
    layerId: string, 
    clipId: string
  ): Promise<TimelineOperationResult> => {
    const result = await operationManager.snapToMarkers(layerId, clipId);
    trackOperation('snapToMarkers', `Snap clip ${clipId} to markers`, result.success, result.error);
    return result;
  }, [operationManager, trackOperation]);

  const contextValue: TimelineOperationContextType = {
    // Basic operations
    addLayer,
    removeLayer,
    updateLayer,
    reorderLayers,
    addClip,
    removeClip,
    updateClip,
    moveClip,
    trimClip,
    splitClip,
    mergeClips,
    setPlayheadTime,
    setDuration,
    setZoom,
    addMarker,
    removeMarker,
    updateMarker,
    
    // Undo/Redo operations
    undo,
    redo,
    
    // Complex operations
    duplicateLayer,
    duplicateClip,
    copyLayer,
    copyClip,
    moveLayerToTime,
    moveClipToTime,
    alignClipsToGrid,
    snapToMarkers,
    
    // Batch operations
    startBatch: operationManager.startBatch,
    addToBatch: operationManager.addToBatch,
    commitBatch: operationManager.commitBatch,
    cancelBatch: operationManager.cancelBatch,
    
    // Queue management
    addToQueue: operationManager.addToQueue,
    executeQueue: operationManager.executeQueue,
    clearQueue: operationManager.clearQueue,
    cancelOperation: operationManager.cancelOperation,
    
    // State
    timelineState: timelineOps.timelineState,
    queue: operationManager.queue,
    activeBatch: operationManager.activeBatch,
    isExecuting: operationManager.isExecuting,
    canUndo: timelineHistory.canUndo,
    canRedo: timelineHistory.canRedo,
    hasUnsavedChanges: timelineHistory.hasUnsavedChanges
  };

  return (
    <TimelineOperationContext.Provider value={contextValue}>
      {children}
    </TimelineOperationContext.Provider>
  );
};

// Hook to use timeline operations context
export const useTimelineOperationContext = (): TimelineOperationContextType => {
  const context = useContext(TimelineOperationContext);
  if (!context) {
    throw new Error('useTimelineOperationContext must be used within a TimelineOperationProvider');
  }
  return context;
};

export default TimelineOperationProvider;

