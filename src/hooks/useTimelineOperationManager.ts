import { useCallback, useRef, useState } from 'react';
import { useTimelineOperations } from './useTimelineOperations';
import { TimelineOperationResult } from '../contexts/TimelineOperationContext';
import { Layer, Clip, Marker, ActionType, ActionMetadata } from '../types';

export interface OperationQueue {
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

export interface OperationManagerConfig {
  maxQueueSize: number;
  autoExecute: boolean;
  batchTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface TimelineOperationManager {
  // Queue management
  addToQueue: (operation: Omit<OperationQueue, 'id' | 'status' | 'progress' | 'createdAt'>) => string;
  executeQueue: () => Promise<void>;
  clearQueue: () => void;
  cancelOperation: (operationId: string) => void;
  
  // Batch operations
  startBatch: (description: string, metadata?: ActionMetadata) => string;
  addToBatch: (batchId: string, operation: () => Promise<any>, description: string) => void;
  commitBatch: (batchId: string) => Promise<TimelineOperationResult>;
  cancelBatch: (batchId: string) => void;
  
  // Complex operations
  duplicateLayer: (layerId: string) => Promise<TimelineOperationResult>;
  duplicateClip: (layerId: string, clipId: string) => Promise<TimelineOperationResult>;
  copyLayer: (layerId: string, targetTime: number) => Promise<TimelineOperationResult>;
  copyClip: (layerId: string, clipId: string, targetTime: number) => Promise<TimelineOperationResult>;
  moveLayerToTime: (layerId: string, targetTime: number) => Promise<TimelineOperationResult>;
  moveClipToTime: (layerId: string, clipId: string, targetTime: number) => Promise<TimelineOperationResult>;
  alignClipsToGrid: (layerId: string, gridSize: number) => Promise<TimelineOperationResult>;
  snapToMarkers: (layerId: string, clipId: string) => Promise<TimelineOperationResult>;
  
  // State
  queue: OperationQueue[];
  activeBatch: string | null;
  isExecuting: boolean;
}

export const useTimelineOperationManager = (
  projectId: string,
  config: Partial<OperationManagerConfig> = {}
): TimelineOperationManager => {
  const timelineOps = useTimelineOperations(projectId);
  const [queue, setQueue] = useState<OperationQueue[]>([]);
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const batchOperations = useRef<Map<string, Array<{
    id: string;
    description: string;
    execute: () => Promise<any>;
  }>>>(new Map());

  const defaultConfig: OperationManagerConfig = {
    maxQueueSize: 50,
    autoExecute: true,
    batchTimeout: 1000,
    retryAttempts: 3,
    retryDelay: 500,
    ...config
  };

  // Queue management
  const addToQueue = useCallback((
    operation: Omit<OperationQueue, 'id' | 'status' | 'progress' | 'createdAt'>
  ): string => {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newOperation: OperationQueue = {
      ...operation,
      id: operationId,
      status: 'pending',
      progress: 0,
      createdAt: Date.now()
    };

    setQueue(prev => {
      const newQueue = [...prev, newOperation];
      // Maintain max queue size
      if (newQueue.length > defaultConfig.maxQueueSize) {
        return newQueue.slice(-defaultConfig.maxQueueSize);
      }
      return newQueue;
    });

    // Auto-execute if enabled
    if (defaultConfig.autoExecute) {
      setTimeout(() => executeQueue(), 0);
    }

    return operationId;
  }, [defaultConfig.maxQueueSize, defaultConfig.autoExecute]);

  const executeQueue = useCallback(async (): Promise<void> => {
    if (isExecuting) return;

    setIsExecuting(true);
    
    try {
      const pendingOperations = queue.filter(op => op.status === 'pending');
      
      for (const operation of pendingOperations) {
        setQueue(prev => prev.map(op => 
          op.id === operation.id 
            ? { ...op, status: 'executing' as const }
            : op
        ));

        try {
          // Execute operations in sequence
          for (let i = 0; i < operation.operations.length; i++) {
            const op = operation.operations[i];
            await op.execute();
            
            // Update progress
            setQueue(prev => prev.map(q => 
              q.id === operation.id 
                ? { ...q, progress: ((i + 1) / operation.operations.length) * 100 }
                : q
            ));
          }

          // Mark as completed
          setQueue(prev => prev.map(op => 
            op.id === operation.id 
              ? { ...op, status: 'completed' as const, completedAt: Date.now() }
              : op
          ));

        } catch (error) {
          // Mark as failed
          setQueue(prev => prev.map(op => 
            op.id === operation.id 
              ? { 
                  ...op, 
                  status: 'failed' as const, 
                  error: error instanceof Error ? error.message : 'Unknown error',
                  completedAt: Date.now()
                }
              : op
          ));
        }
      }
    } finally {
      setIsExecuting(false);
    }
  }, [queue, isExecuting]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const cancelOperation = useCallback((operationId: string) => {
    setQueue(prev => prev.map(op => 
      op.id === operationId 
        ? { ...op, status: 'cancelled' as const, completedAt: Date.now() }
        : op
    ));
  }, []);

  // Batch operations
  const startBatch = useCallback((description: string, metadata?: ActionMetadata): string => {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    batchOperations.current.set(batchId, []);
    setActiveBatch(batchId);
    return batchId;
  }, []);

  const addToBatch = useCallback((
    batchId: string, 
    operation: () => Promise<any>, 
    description: string
  ) => {
    const batch = batchOperations.current.get(batchId);
    if (batch) {
      batch.push({
        id: `batch_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description,
        execute: operation
      });
    }
  }, []);

  const commitBatch = useCallback(async (batchId: string): Promise<TimelineOperationResult> => {
    const batch = batchOperations.current.get(batchId);
    if (!batch) {
      return {
        success: false,
        error: 'Batch not found'
      };
    }

    try {
      const operations = batch.map(op => ({
        type: 'batch',
        action: op.execute,
        description: op.description
      }));

      const batchOperation = timelineOps.createBatchOperation(
        `Batch operation (${operations.length} operations)`,
        operations
      );

      const result = await timelineOps.executeBatchOperation(batchOperation);
      
      // Clean up
      batchOperations.current.delete(batchId);
      setActiveBatch(null);
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to commit batch'
      };
    }
  }, [timelineOps]);

  const cancelBatch = useCallback((batchId: string) => {
    batchOperations.current.delete(batchId);
    setActiveBatch(null);
  }, []);

  // Complex operations
  const duplicateLayer = useCallback(async (layerId: string): Promise<TimelineOperationResult> => {
    const layer = timelineOps.timelineState.layers.find(l => l.id === layerId);
    if (!layer) {
      return {
        success: false,
        error: 'Layer not found'
      };
    }

    const duplicatedLayer: Omit<Layer, 'id'> = {
      ...layer,
      name: `${layer.name} (Copy)`,
      clips: layer.clips.map(clip => ({
        ...clip,
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
    };

    return await timelineOps.addLayer(duplicatedLayer, {
      description: `Duplicate ${layer.type} layer`,
      metadata: {
        projectId,
        operationType: 'addLayer' as ActionType,
        timestamp: Date.now(),
        originalLayerId: layerId
      }
    });
  }, [timelineOps, projectId]);

  const duplicateClip = useCallback(async (
    layerId: string, 
    clipId: string
  ): Promise<TimelineOperationResult> => {
    const layer = timelineOps.timelineState.layers.find(l => l.id === layerId);
    const clip = layer?.clips.find(c => c.id === clipId);
    
    if (!layer || !clip) {
      return {
        success: false,
        error: 'Clip not found'
      };
    }

    const duplicatedClip: Omit<Clip, 'id'> = {
      ...clip,
      startTime: clip.endTime + 0.1, // Place after original
      endTime: clip.endTime + clip.duration + 0.1
    };

    return await timelineOps.addClip(layerId, duplicatedClip, {
      description: `Duplicate ${clip.type} clip`,
      metadata: {
        projectId,
        operationType: 'addClip' as ActionType,
        timestamp: Date.now(),
        originalClipId: clipId
      }
    });
  }, [timelineOps, projectId]);

  const copyLayer = useCallback(async (
    layerId: string, 
    targetTime: number
  ): Promise<TimelineOperationResult> => {
    const layer = timelineOps.timelineState.layers.find(l => l.id === layerId);
    if (!layer) {
      return {
        success: false,
        error: 'Layer not found'
      };
    }

    const copiedLayer: Omit<Layer, 'id'> = {
      ...layer,
      name: `${layer.name} (Copy)`,
      clips: layer.clips.map(clip => ({
        ...clip,
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startTime: clip.startTime + targetTime,
        endTime: clip.endTime + targetTime
      }))
    };

    return await timelineOps.addLayer(copiedLayer, {
      description: `Copy ${layer.type} layer to ${targetTime.toFixed(2)}s`,
      metadata: {
        projectId,
        operationType: 'addLayer' as ActionType,
        timestamp: Date.now(),
        originalLayerId: layerId,
        targetTime
      }
    });
  }, [timelineOps, projectId]);

  const copyClip = useCallback(async (
    layerId: string, 
    clipId: string, 
    targetTime: number
  ): Promise<TimelineOperationResult> => {
    const layer = timelineOps.timelineState.layers.find(l => l.id === layerId);
    const clip = layer?.clips.find(c => c.id === clipId);
    
    if (!layer || !clip) {
      return {
        success: false,
        error: 'Clip not found'
      };
    }

    const copiedClip: Omit<Clip, 'id'> = {
      ...clip,
      startTime: targetTime,
      endTime: targetTime + clip.duration
    };

    return await timelineOps.addClip(layerId, copiedClip, {
      description: `Copy ${clip.type} clip to ${targetTime.toFixed(2)}s`,
      metadata: {
        projectId,
        operationType: 'addClip' as ActionType,
        timestamp: Date.now(),
        originalClipId: clipId,
        targetTime
      }
    });
  }, [timelineOps, projectId]);

  const moveLayerToTime = useCallback(async (
    layerId: string, 
    targetTime: number
  ): Promise<TimelineOperationResult> => {
    const layer = timelineOps.timelineState.layers.find(l => l.id === layerId);
    if (!layer) {
      return {
        success: false,
        error: 'Layer not found'
      };
    }

    const timeOffset = targetTime - (layer.clips[0]?.startTime || 0);
    
    const batchId = startBatch(`Move ${layer.type} layer to ${targetTime.toFixed(2)}s`);
    
    layer.clips.forEach(clip => {
      addToBatch(batchId, async () => {
        return await timelineOps.moveClip(
          layerId, 
          clip.id, 
          clip.startTime + timeOffset
        );
      }, `Move ${clip.type} clip`);
    });

    return await commitBatch(batchId);
  }, [timelineOps, startBatch, addToBatch, commitBatch]);

  const moveClipToTime = useCallback(async (
    layerId: string, 
    clipId: string, 
    targetTime: number
  ): Promise<TimelineOperationResult> => {
    return await timelineOps.moveClip(layerId, clipId, targetTime, {
      description: `Move clip to ${targetTime.toFixed(2)}s`,
      metadata: {
        projectId,
        operationType: 'moveClip' as ActionType,
        timestamp: Date.now(),
        targetTime
      }
    });
  }, [timelineOps, projectId]);

  const alignClipsToGrid = useCallback(async (
    layerId: string, 
    gridSize: number
  ): Promise<TimelineOperationResult> => {
    const layer = timelineOps.timelineState.layers.find(l => l.id === layerId);
    if (!layer) {
      return {
        success: false,
        error: 'Layer not found'
      };
    }

    const batchId = startBatch(`Align clips to ${gridSize}s grid`);
    
    layer.clips.forEach(clip => {
      const alignedStartTime = Math.round(clip.startTime / gridSize) * gridSize;
      const alignedEndTime = Math.round(clip.endTime / gridSize) * gridSize;
      
      addToBatch(batchId, async () => {
        return await timelineOps.trimClip(
          layerId, 
          clip.id, 
          alignedStartTime, 
          alignedEndTime
        );
      }, `Align ${clip.type} clip to grid`);
    });

    return await commitBatch(batchId);
  }, [timelineOps, startBatch, addToBatch, commitBatch]);

  const snapToMarkers = useCallback(async (
    layerId: string, 
    clipId: string
  ): Promise<TimelineOperationResult> => {
    const layer = timelineOps.timelineState.layers.find(l => l.id === layerId);
    const clip = layer?.clips.find(c => c.id === clipId);
    
    if (!layer || !clip) {
      return {
        success: false,
        error: 'Clip not found'
      };
    }

    const markers = timelineOps.timelineState.markers;
    if (markers.length === 0) {
      return {
        success: false,
        error: 'No markers found'
      };
    }

    // Find the closest marker
    const closestMarker = markers.reduce((closest, marker) => {
      const distanceToMarker = Math.abs(marker.time - clip.startTime);
      const distanceToClosest = Math.abs(closest.time - clip.startTime);
      return distanceToMarker < distanceToClosest ? marker : closest;
    });

    const snapOffset = closestMarker.time - clip.startTime;
    
    return await timelineOps.moveClip(layerId, clipId, clip.startTime + snapOffset, {
      description: `Snap clip to marker at ${closestMarker.time.toFixed(2)}s`,
      metadata: {
        projectId,
        operationType: 'moveClip' as ActionType,
        timestamp: Date.now(),
        markerId: closestMarker.id,
        snapOffset
      }
    });
  }, [timelineOps, projectId]);

  return {
    // Queue management
    addToQueue,
    executeQueue,
    clearQueue,
    cancelOperation,
    
    // Batch operations
    startBatch,
    addToBatch,
    commitBatch,
    cancelBatch,
    
    // Complex operations
    duplicateLayer,
    duplicateClip,
    copyLayer,
    copyClip,
    moveLayerToTime,
    moveClipToTime,
    alignClipsToGrid,
    snapToMarkers,
    
    // State
    queue,
    activeBatch,
    isExecuting
  };
};

export default useTimelineOperationManager;

