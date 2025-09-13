import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/store';
import { 
  addLayer, 
  removeLayer, 
  updateLayer, 
  reorderLayers,
  addClip, 
  removeClip, 
  updateClip, 
  moveClip,
  splitClip,
  setPlayheadTime,
  setDuration,
  setZoom,
  addMarker,
  removeMarker,
  updateMarker,
  saveState,
  undo,
  redo
} from '../redux/slices/timelineSlice';
import { Layer, Clip, Marker, ActionType, ActionMetadata } from '../types';

export interface TimelineOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  actionId?: string;
}

export interface TimelineOperationOptions {
  description?: string;
  metadata?: ActionMetadata;
  skipHistory?: boolean;
  batchId?: string;
}

export interface BatchOperation {
  id: string;
  description: string;
  operations: Array<{
    type: string;
    action: () => void;
    description: string;
  }>;
  metadata?: ActionMetadata;
}

export const useTimelineOperations = (projectId: string) => {
  const dispatch = useAppDispatch();
  const timelineState = useAppSelector(state => state.timeline);

  // Helper function to create action metadata
  const createActionMetadata = useCallback((
    operationType: ActionType,
    additionalData?: any
  ): ActionMetadata => ({
    projectId,
    operationType,
    timestamp: Date.now(),
    ...additionalData
  }), [projectId]);

  // Helper function to save state before operation
  const saveStateBeforeOperation = useCallback((
    description: string,
    metadata?: ActionMetadata
  ) => {
    if (!timelineState.hasUnsavedChanges) {
      dispatch(saveState({ 
        description: `Before: ${description}`, 
        metadata: {
          ...metadata,
          operationType: 'saveState' as ActionType,
          projectId,
          timestamp: Date.now()
        }
      }));
    }
  }, [dispatch, projectId, timelineState.hasUnsavedChanges]);

  // Layer Operations
  const addLayerWithHistory = useCallback(async (
    layer: Omit<Layer, 'id'>,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const layerId = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newLayer: Layer = { ...layer, id: layerId };

      saveStateBeforeOperation(
        options.description || `Add ${layer.type} layer`,
        options.metadata || createActionMetadata('addLayer', { layerType: layer.type })
      );

      dispatch(addLayer(newLayer));

      return {
        success: true,
        data: newLayer,
        actionId: layerId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add layer'
      };
    }
  }, [dispatch, saveStateBeforeOperation, createActionMetadata]);

  const removeLayerWithHistory = useCallback(async (
    layerId: string,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const layer = timelineState.layers.find(l => l.id === layerId);
      if (!layer) {
        return {
          success: false,
          error: 'Layer not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Remove ${layer.type} layer`,
        options.metadata || createActionMetadata('removeLayer', { layerId, layerType: layer.type })
      );

      dispatch(removeLayer(layerId));

      return {
        success: true,
        data: { layerId, layer },
        actionId: layerId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove layer'
      };
    }
  }, [dispatch, timelineState.layers, saveStateBeforeOperation, createActionMetadata]);

  const updateLayerWithHistory = useCallback(async (
    layerId: string,
    updates: Partial<Layer>,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const layer = timelineState.layers.find(l => l.id === layerId);
      if (!layer) {
        return {
          success: false,
          error: 'Layer not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Update ${layer.type} layer`,
        options.metadata || createActionMetadata('updateLayer', { layerId, layerType: layer.type })
      );

      dispatch(updateLayer({ id: layerId, ...updates }));

      return {
        success: true,
        data: { layerId, updates },
        actionId: layerId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update layer'
      };
    }
  }, [dispatch, timelineState.layers, saveStateBeforeOperation, createActionMetadata]);

  const reorderLayersWithHistory = useCallback(async (
    layerIds: string[],
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      saveStateBeforeOperation(
        options.description || 'Reorder layers',
        options.metadata || createActionMetadata('reorderLayers', { layerIds })
      );

      // For now, we'll implement a simple reorder that moves the first layer to the end
      // In a real implementation, you'd need to calculate the actual indices
      dispatch(reorderLayers({ fromIndex: 0, toIndex: layerIds.length - 1 }));

      return {
        success: true,
        data: { layerIds },
        actionId: `reorder_${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder layers'
      };
    }
  }, [dispatch, saveStateBeforeOperation, createActionMetadata]);

  // Clip Operations
  const addClipWithHistory = useCallback(async (
    layerId: string,
    clip: Omit<Clip, 'id'>,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const clipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newClip: Clip = { ...clip, id: clipId };

      saveStateBeforeOperation(
        options.description || `Add ${clip.type} clip`,
        options.metadata || createActionMetadata('addClip', { layerId, clipType: clip.type })
      );

      dispatch(addClip({ layerId, clip: newClip }));

      return {
        success: true,
        data: { layerId, clip: newClip },
        actionId: clipId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add clip'
      };
    }
  }, [dispatch, saveStateBeforeOperation, createActionMetadata]);

  const removeClipWithHistory = useCallback(async (
    layerId: string,
    clipId: string,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const layer = timelineState.layers.find(l => l.id === layerId);
      const clip = layer?.clips.find(c => c.id === clipId);
      
      if (!layer || !clip) {
        return {
          success: false,
          error: 'Clip not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Remove ${clip.type} clip`,
        options.metadata || createActionMetadata('removeClip', { layerId, clipId, clipType: clip.type })
      );

      dispatch(removeClip({ layerId, clipId }));

      return {
        success: true,
        data: { layerId, clipId, clip },
        actionId: clipId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove clip'
      };
    }
  }, [dispatch, timelineState.layers, saveStateBeforeOperation, createActionMetadata]);

  const updateClipWithHistory = useCallback(async (
    layerId: string,
    clipId: string,
    updates: Partial<Clip>,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const layer = timelineState.layers.find(l => l.id === layerId);
      const clip = layer?.clips.find(c => c.id === clipId);
      
      if (!layer || !clip) {
        return {
          success: false,
          error: 'Clip not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Update ${clip.type} clip`,
        options.metadata || createActionMetadata('updateClip', { layerId, clipId, clipType: clip.type })
      );

      dispatch(updateClip({ layerId, clipId, updates }));

      return {
        success: true,
        data: { layerId, clipId, updates },
        actionId: clipId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update clip'
      };
    }
  }, [dispatch, timelineState.layers, saveStateBeforeOperation, createActionMetadata]);

  const moveClipWithHistory = useCallback(async (
    layerId: string,
    clipId: string,
    newStartTime: number,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const layer = timelineState.layers.find(l => l.id === layerId);
      const clip = layer?.clips.find(c => c.id === clipId);
      
      if (!layer || !clip) {
        return {
          success: false,
          error: 'Clip not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Move ${clip.type} clip`,
        options.metadata || createActionMetadata('moveClip', { 
          layerId, 
          clipId, 
          clipType: clip.type,
          oldStartTime: clip.startTime,
          newStartTime
        })
      );

      dispatch(moveClip({ layerId, clipId, newStartTime }));

      return {
        success: true,
        data: { layerId, clipId, newStartTime },
        actionId: clipId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move clip'
      };
    }
  }, [dispatch, timelineState.layers, saveStateBeforeOperation, createActionMetadata]);

  const trimClipWithHistory = useCallback(async (
    layerId: string,
    clipId: string,
    newStartTime: number,
    newEndTime: number,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const layer = timelineState.layers.find(l => l.id === layerId);
      const clip = layer?.clips.find(c => c.id === clipId);
      
      if (!layer || !clip) {
        return {
          success: false,
          error: 'Clip not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Trim ${clip.type} clip`,
        options.metadata || createActionMetadata('updateClip', { 
          layerId, 
          clipId, 
          clipType: clip.type,
          oldStartTime: clip.startTime,
          oldEndTime: clip.endTime,
          newStartTime,
          newEndTime
        })
      );

      dispatch(updateClip({ 
        layerId, 
        clipId, 
        updates: { 
          startTime: newStartTime, 
          endTime: newEndTime,
          duration: newEndTime - newStartTime
        } 
      }));

      return {
        success: true,
        data: { layerId, clipId, newStartTime, newEndTime },
        actionId: clipId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trim clip'
      };
    }
  }, [dispatch, timelineState.layers, saveStateBeforeOperation, createActionMetadata]);

  const splitClipWithHistory = useCallback(async (
    layerId: string,
    clipId: string,
    splitTime: number,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const layer = timelineState.layers.find(l => l.id === layerId);
      const clip = layer?.clips.find(c => c.id === clipId);
      
      if (!layer || !clip) {
        return {
          success: false,
          error: 'Clip not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Split ${clip.type} clip`,
        options.metadata || createActionMetadata('splitClip', { 
          layerId, 
          clipId, 
          clipType: clip.type,
          splitTime
        })
      );

      dispatch(splitClip({ layerId, clipId, splitTime }));

      return {
        success: true,
        data: { layerId, clipId, splitTime },
        actionId: clipId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to split clip'
      };
    }
  }, [dispatch, timelineState.layers, saveStateBeforeOperation, createActionMetadata]);

  const mergeClipsWithHistory = useCallback(async (
    layerId: string,
    clipIds: string[],
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const layer = timelineState.layers.find(l => l.id === layerId);
      const clips = layer?.clips.filter(c => clipIds.includes(c.id)) || [];
      
      if (!layer || clips.length !== clipIds.length) {
        return {
          success: false,
          error: 'One or more clips not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Merge ${clips.length} clips`,
        options.metadata || createActionMetadata('updateClip', { 
          layerId, 
          clipIds,
          clipTypes: clips.map(c => c.type)
        })
      );

      // Sort clips by start time
      const sortedClips = clips.sort((a, b) => a.startTime - b.startTime);
      const firstClip = sortedClips[0];
      const lastClip = sortedClips[sortedClips.length - 1];
      
      // Update the first clip to span the entire merged duration
      dispatch(updateClip({ 
        layerId, 
        clipId: firstClip.id, 
        updates: { 
          endTime: lastClip.endTime,
          duration: lastClip.endTime - firstClip.startTime
        } 
      }));

      // Remove the other clips
      for (let i = 1; i < sortedClips.length; i++) {
        dispatch(removeClip({ layerId, clipId: sortedClips[i].id }));
      }

      return {
        success: true,
        data: { layerId, clipIds },
        actionId: `merge_${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to merge clips'
      };
    }
  }, [dispatch, timelineState.layers, saveStateBeforeOperation, createActionMetadata]);

  // Timeline Operations
  const setPlayheadTimeWithHistory = useCallback(async (
    time: number,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const oldTime = timelineState.playheadTime;

      saveStateBeforeOperation(
        options.description || `Set playhead to ${time.toFixed(2)}s`,
        options.metadata || createActionMetadata('setPlayheadTime', { 
          oldTime,
          newTime: time
        })
      );

      dispatch(setPlayheadTime(time));

      return {
        success: true,
        data: { time },
        actionId: `playhead_${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set playhead time'
      };
    }
  }, [dispatch, timelineState.playheadTime, saveStateBeforeOperation, createActionMetadata]);

  const setDurationWithHistory = useCallback(async (
    duration: number,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const oldDuration = timelineState.duration;

      saveStateBeforeOperation(
        options.description || `Set duration to ${duration.toFixed(2)}s`,
        options.metadata || createActionMetadata('setDuration', { 
          oldDuration,
          newDuration: duration
        })
      );

      dispatch(setDuration(duration));

      return {
        success: true,
        data: { duration },
        actionId: `duration_${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set duration'
      };
    }
  }, [dispatch, timelineState.duration, saveStateBeforeOperation, createActionMetadata]);

  const setZoomWithHistory = useCallback(async (
    zoom: number,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const oldZoom = timelineState.zoom;

      saveStateBeforeOperation(
        options.description || `Set zoom to ${zoom}x`,
        options.metadata || createActionMetadata('setZoom', { 
          oldZoom,
          newZoom: zoom
        })
      );

      dispatch(setZoom(zoom));

      return {
        success: true,
        data: { zoom },
        actionId: `zoom_${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set zoom'
      };
    }
  }, [dispatch, timelineState.zoom, saveStateBeforeOperation, createActionMetadata]);

  // Marker Operations
  const addMarkerWithHistory = useCallback(async (
    marker: Omit<Marker, 'id'>,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const markerId = `marker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newMarker: Marker = { ...marker, id: markerId };

      saveStateBeforeOperation(
        options.description || `Add marker at ${marker.time.toFixed(2)}s`,
        options.metadata || createActionMetadata('addMarker', { 
          markerId,
          markerTime: marker.time
        })
      );

      dispatch(addMarker(newMarker));

      return {
        success: true,
        data: newMarker,
        actionId: markerId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add marker'
      };
    }
  }, [dispatch, saveStateBeforeOperation, createActionMetadata]);

  const removeMarkerWithHistory = useCallback(async (
    markerId: string,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const marker = timelineState.markers.find(m => m.id === markerId);
      if (!marker) {
        return {
          success: false,
          error: 'Marker not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Remove marker at ${marker.time.toFixed(2)}s`,
        options.metadata || createActionMetadata('removeMarker', { 
          markerId,
          markerTime: marker.time
        })
      );

      dispatch(removeMarker(markerId));

      return {
        success: true,
        data: { markerId, marker },
        actionId: markerId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove marker'
      };
    }
  }, [dispatch, timelineState.markers, saveStateBeforeOperation, createActionMetadata]);

  const updateMarkerWithHistory = useCallback(async (
    markerId: string,
    updates: Partial<Marker>,
    options: TimelineOperationOptions = {}
  ): Promise<TimelineOperationResult> => {
    try {
      const marker = timelineState.markers.find(m => m.id === markerId);
      if (!marker) {
        return {
          success: false,
          error: 'Marker not found'
        };
      }

      saveStateBeforeOperation(
        options.description || `Update marker at ${marker.time.toFixed(2)}s`,
        options.metadata || createActionMetadata('updateMarker', { 
          markerId,
          markerTime: marker.time
        })
      );

      dispatch(updateMarker({ id: markerId, ...updates }));

      return {
        success: true,
        data: { markerId, updates },
        actionId: markerId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update marker'
      };
    }
  }, [dispatch, timelineState.markers, saveStateBeforeOperation, createActionMetadata]);

  // Undo/Redo Operations
  const performUndo = useCallback(async (): Promise<TimelineOperationResult> => {
    try {
      if (timelineState.undoStack.length === 0) {
        return {
          success: false,
          error: 'Nothing to undo'
        };
      }

      dispatch(undo());

      return {
        success: true,
        data: { action: 'undo' },
        actionId: `undo_${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to undo'
      };
    }
  }, [dispatch, timelineState.undoStack.length]);

  const performRedo = useCallback(async (): Promise<TimelineOperationResult> => {
    try {
      if (timelineState.redoStack.length === 0) {
        return {
          success: false,
          error: 'Nothing to redo'
        };
      }

      dispatch(redo());

      return {
        success: true,
        data: { action: 'redo' },
        actionId: `redo_${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to redo'
      };
    }
  }, [dispatch, timelineState.redoStack.length]);

  // Batch Operations
  const createBatchOperation = useCallback((
    description: string,
    operations: Array<{
      type: string;
      action: () => void;
      description: string;
    }>,
    metadata?: ActionMetadata
  ): BatchOperation => {
    return {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description,
      operations,
      metadata
    };
  }, []);

  const executeBatchOperation = useCallback(async (
    batch: BatchOperation
  ): Promise<TimelineOperationResult> => {
    try {
      saveStateBeforeOperation(
        `Batch: ${batch.description}`,
        batch.metadata || createActionMetadata('batchOperation', { 
          batchId: batch.id,
          operationCount: batch.operations.length
        })
      );

      // Execute all operations in the batch
      batch.operations.forEach(operation => {
        operation.action();
      });

      return {
        success: true,
        data: { batch },
        actionId: batch.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute batch operation'
      };
    }
  }, [saveStateBeforeOperation, createActionMetadata]);

  return {
    // Layer operations
    addLayer: addLayerWithHistory,
    removeLayer: removeLayerWithHistory,
    updateLayer: updateLayerWithHistory,
    reorderLayers: reorderLayersWithHistory,

    // Clip operations
    addClip: addClipWithHistory,
    removeClip: removeClipWithHistory,
    updateClip: updateClipWithHistory,
    moveClip: moveClipWithHistory,
    trimClip: trimClipWithHistory,
    splitClip: splitClipWithHistory,
    mergeClips: mergeClipsWithHistory,

    // Timeline operations
    setPlayheadTime: setPlayheadTimeWithHistory,
    setDuration: setDurationWithHistory,
    setZoom: setZoomWithHistory,

    // Marker operations
    addMarker: addMarkerWithHistory,
    removeMarker: removeMarkerWithHistory,
    updateMarker: updateMarkerWithHistory,

    // Undo/Redo operations
    undo: performUndo,
    redo: performRedo,

    // Batch operations
    createBatchOperation,
    executeBatchOperation,

    // State access
    timelineState
  };
};

export default useTimelineOperations;
