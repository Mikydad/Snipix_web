import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TimelineState, Layer, Clip, Keyframe, Marker, ApiResponse, TrimState, TrimRange, ValidationState, ValidationError, ValidationWarning, ActionHistoryItem, Checkpoint, ActionType, ActionMetadata } from '../../types';
import { apiService } from '../../services/apiService';

// Helper functions for action history management
const generateActionId = (): string => {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to create truly serializable state snapshots
const createSerializableStateSnapshot = (state: TimelineState): Partial<TimelineState> => {
  try {
    // Use JSON parse/stringify to create a deep clone that's guaranteed to be serializable
    return JSON.parse(JSON.stringify({
      layers: state.layers,
      playheadTime: state.playheadTime,
      duration: state.duration,
      zoom: state.zoom,
      markers: state.markers,
      selectedClips: state.selectedClips,
      selectedLayer: state.selectedLayer,
      isPlaying: state.isPlaying,
      isSnapping: state.isSnapping
    }));
  } catch (error) {
    console.warn('Failed to create serializable state snapshot:', error);
    // Fallback to a minimal snapshot
    return {
      layers: [],
      playheadTime: 0,
      duration: 0,
      zoom: 1,
      markers: [],
      selectedClips: [],
      selectedLayer: null,
      isPlaying: false,
      isSnapping: false
    };
  }
};

const createActionHistoryItemLocal = (
  type: ActionType,
  description: string,
  state: Partial<TimelineState>,
  metadata?: ActionMetadata
): ActionHistoryItem => {
  return {
    id: generateActionId(),
    type,
    description,
    timestamp: Date.now(),
    state,
    metadata
  };
};

const addToActionHistory = (state: TimelineState, actionItem: ActionHistoryItem): void => {
  // Add to action history
  state.actionHistory.push(actionItem);
  
  // Maintain max history size
  if (state.actionHistory.length > state.maxHistorySize) {
    state.actionHistory.shift();
  }
  
  // Mark as having unsaved changes, but not for save operations
  if (actionItem.type !== 'saveCheckpoint') {
    state.hasUnsavedChanges = true;
  }
};

const initialState: TimelineState = {
  layers: [],
  playheadTime: 0,
  zoom: 1,
  duration: 0,
  markers: [],
  selectedClips: [],
  isPlaying: false,
  isSnapping: true,
  undoStack: [],
  redoStack: [],
  selectedLayer: null,
  trimState: {
    isActive: false,
    selectedRange: null,
    isDragging: false,
    dragStartTime: null,
    pendingOperations: []
  },
  validationState: {
    errors: [],
    warnings: [],
    isValidating: false
  },
  checkpoints: [],
  lastSavedCheckpoint: null,
  hasUnsavedChanges: false,
  actionHistory: [],
  maxHistorySize: 50, // Maximum number of actions to keep in history
  timelineHistory: [] // Backend timeline history for restore functionality
};

// Async thunks
// Helper function to convert backend TimelineState to frontend format
const convertFromBackendTimelineState = (backendState: any) => ({
  layers: (backendState.layers || []).map((layer: any) => ({
    id: layer.id,
    name: layer.name,
    type: layer.type,
    clips: (layer.clips || []).map((clip: any) => ({
      id: clip.id,
      type: clip.type,
      startTime: clip.start_time || 0,
      endTime: clip.end_time || (clip.start_time || 0) + (clip.duration || 0),
      duration: clip.duration || 0,
      originalStartTime: clip.original_start_time || clip.start_time || 0,
      sourcePath: clip.source_path || '',
      content: clip.content || '',
      properties: clip.properties || {},
      keyframes: clip.keyframes || []
    })),
    isVisible: layer.is_visible !== undefined ? layer.is_visible : true,
    isLocked: layer.is_locked !== undefined ? layer.is_locked : false,
    isMuted: layer.is_muted !== undefined ? layer.is_muted : false,
    order: layer.order || 0,
    isMainVideo: layer.is_main_video || false
  })),
  playheadTime: backendState.playhead_time || 0,
  zoom: backendState.zoom || 1,
  duration: backendState.duration || 0,
  markers: backendState.markers || [],
  selectedClips: backendState.selected_clips || [],
  isPlaying: backendState.is_playing || false,
  isSnapping: backendState.is_snapping !== undefined ? backendState.is_snapping : true,
  selectedLayer: null, // Will be set separately if needed
  trimState: {
    isActive: false,
    selectedRange: null,
    isDragging: false,
    dragStartTime: null,
    pendingOperations: []
  },
  validationState: {
    errors: [],
    warnings: [],
    isValidating: false
  },
  checkpoints: [],
  lastSavedCheckpoint: null,
  hasUnsavedChanges: false,
  actionHistory: [],
  maxHistorySize: 50,
  timelineHistory: []
});

// Helper function to convert frontend TimelineState to backend format
const convertToBackendTimelineState = (frontendState: TimelineState) => ({
  layers: frontendState.layers.map(layer => ({
    id: layer.id,
    name: layer.name,
    type: layer.type,
    clips: layer.clips.map(clip => ({
      id: clip.id,
      type: clip.type,
      start_time: clip.startTime || 0,
      end_time: clip.endTime || (clip.startTime || 0) + (clip.duration || 0),
      duration: clip.duration || 0,
      source_path: clip.sourcePath || '',
      content: clip.content || '',
      properties: clip.properties || {},
      keyframes: clip.keyframes || [],
      // Store originalStartTime as a custom property for restoration
      original_start_time: clip.originalStartTime || clip.startTime || 0
    })),
    is_visible: layer.isVisible !== undefined ? layer.isVisible : true,
    is_locked: layer.isLocked !== undefined ? layer.isLocked : false,
    is_muted: layer.isMuted !== undefined ? layer.isMuted : false,
    order: layer.order || 0,
    // Store isMainVideo as a custom property for restoration
    is_main_video: layer.isMainVideo || false
  })),
  playhead_time: frontendState.playheadTime || 0,
  zoom: frontendState.zoom || 1,
  duration: frontendState.duration || 0,
  markers: frontendState.markers || [],
  selected_clips: frontendState.selectedClips || [],
  is_playing: frontendState.isPlaying || false,
  is_snapping: frontendState.isSnapping !== undefined ? frontendState.isSnapping : true
});

export const saveTimeline = createAsyncThunk(
  'timeline/saveTimeline',
  async ({ projectId, timelineState }: { projectId: string; timelineState: TimelineState }, { rejectWithValue }) => {
    try {
      const response = await apiService.post<ApiResponse<any>>('/timeline/', {
        project_id: projectId,
        timeline_state: convertToBackendTimelineState(timelineState),
        description: 'Quick Save',
        change_summary: 'Timeline saved via quick save'
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to save timeline');
    }
  }
);

export const saveNamedTimeline = createAsyncThunk(
  'timeline/saveNamedTimeline',
  async ({ projectId, timelineState, description }: { projectId: string; timelineState: TimelineState; description: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.post<ApiResponse<any>>('/timeline/', {
        project_id: projectId,
        timeline_state: convertToBackendTimelineState(timelineState),
        description: description,
        change_summary: `Timeline saved as: ${description}`
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to save timeline');
    }
  }
);

export const loadTimeline = createAsyncThunk(
  'timeline/loadTimeline',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get<ApiResponse<TimelineState>>(`/timeline/${projectId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to load timeline');
    }
  }
);

export const loadTimelineHistory = createAsyncThunk(
  'timeline/loadTimelineHistory',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get<ApiResponse<any[]>>(`/timeline/${projectId}/history`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to load timeline history');
    }
  }
);

export const restoreTimelineVersion = createAsyncThunk(
  'timeline/restoreTimelineVersion',
  async ({ projectId, version }: { projectId: string; version: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.post<ApiResponse<any>>(`/timeline/${projectId}/restore/${version}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to restore timeline version');
    }
  }
);

export const trimVideoHybrid = createAsyncThunk(
  'timeline/trimVideoHybrid',
  async ({ projectId, segments }: { projectId: string; segments: Array<{ startTime: number; duration: number }> }, { rejectWithValue }) => {
    try {
      const response = await apiService.trimVideo(projectId, segments);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to trim video');
    }
  }
);

export const autoTrimVideo = createAsyncThunk(
  'timeline/autoTrimVideo',
  async ({ projectId, layers }: { projectId: string; layers: Layer[] }, { rejectWithValue }) => {
    try {
      // Find the main video layer
      const mainVideoLayer = layers.find(layer => layer.isMainVideo);
      if (!mainVideoLayer || !mainVideoLayer.clips.length) {
        return null; // No main video layer to trim
      }
      
      // Convert clips to segments format
      const segments = mainVideoLayer.clips.map(clip => ({
        startTime: clip.originalStartTime || clip.startTime,
        duration: clip.duration
      }));
      
      console.log('🎬 AutoTrimVideo: Sending segments:', segments);
      console.log('🎬 AutoTrimVideo: Clips data:', mainVideoLayer.clips.map(clip => ({
        id: clip.id,
        startTime: clip.startTime,
        originalStartTime: clip.originalStartTime,
        duration: clip.duration,
        endTime: clip.endTime
      })));
      console.log('🎬 AutoTrimVideo: Main video layer:', mainVideoLayer);
      
      const response = await apiService.trimVideo(projectId, segments);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to auto-trim video');
    }
  }
);

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    // Playhead controls
    setPlayheadTime: (state, action: PayloadAction<number>) => {
      console.log('Redux setPlayheadTime called:', { oldTime: state.playheadTime, newTime: action.payload });
      state.playheadTime = Math.max(0, Math.min(action.payload, state.duration));
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    
    // Force duration recalculation
    recalculateDuration: (state) => {
      const mainVideoLayer = state.layers.find(layer => layer.isMainVideo);
      if (mainVideoLayer && mainVideoLayer.clips.length > 0) {
        const totalDuration = mainVideoLayer.clips.reduce((total, clip) => total + clip.duration, 0);
        state.duration = totalDuration;
        console.log('Timeline duration recalculated:', totalDuration, 'clips:', mainVideoLayer.clips.map(c => ({ id: c.id, duration: c.duration })));
      }
    },

    // Zoom and view controls
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = Math.max(0.1, Math.min(action.payload, 10));
    },
    setIsSnapping: (state, action: PayloadAction<boolean>) => {
      state.isSnapping = action.payload;
    },

    // Layer management
    addLayer: (state, action: PayloadAction<Layer & { skipUndo?: boolean }>) => {
      const { skipUndo = false, ...newLayer } = action.payload;
      
      // Store the state before the action for undo (serializable snapshot)
      const beforeState = createSerializableStateSnapshot(state);
      
      // Prevent duplicate main video layers
      if (newLayer.isMainVideo === true) {
        // Remove any existing main video layers
        state.layers = state.layers.filter(layer => layer.isMainVideo !== true);
        console.log('DEBUG: Removed existing main video layers, adding new one:', newLayer.id);
      }
      
      // Check if layer with same ID already exists
      const existingLayerIndex = state.layers.findIndex(layer => layer.id === newLayer.id);
      if (existingLayerIndex !== -1) {
        console.log('DEBUG: Layer with ID already exists, replacing:', newLayer.id);
        state.layers[existingLayerIndex] = newLayer;
      } else {
        console.log('DEBUG: Adding new layer:', newLayer.id);
        state.layers.push(newLayer);
      }
      
      state.layers.sort((a, b) => a.order - b.order);
      
      // Create undo entry after the action is performed
      if (!skipUndo) {
        const actionItem = createActionHistoryItemLocal(
          'addLayer',
          `Added ${newLayer.type} layer: ${newLayer.name}`,
          beforeState, // Store the state BEFORE the action
          {
            layerId: newLayer.id,
            operationType: 'addLayer',
            isCheckpoint: false
          }
        );
        
        // Add to undo stack
        state.undoStack.push(actionItem);
        
        // Clear redo stack
        state.redoStack = [];
        
        // Add to action history
        addToActionHistory(state, actionItem);
      }
    },
    removeLayer: (state, action: PayloadAction<string>) => {
      const layerId = action.payload;
      const layerToRemove = state.layers.find(layer => layer.id === layerId);
      
      if (layerToRemove) {
        // Store the state before the action for undo (serializable snapshot)
        const beforeState = createSerializableStateSnapshot(state);
        
        // Remove the layer
        state.layers = state.layers.filter(layer => layer.id !== layerId);
        
        // Create undo entry after the action is performed
        const actionItem = createActionHistoryItemLocal(
          'removeLayer',
          `Removed ${layerToRemove.type} layer: ${layerToRemove.name}`,
          beforeState, // Store the state BEFORE the action
          {
            layerId: layerToRemove.id,
            operationType: 'removeLayer',
            isCheckpoint: false
          }
        );
        
        // Add to undo stack
        state.undoStack.push(actionItem);
        
        // Clear redo stack
        state.redoStack = [];
        
        // Add to action history
        addToActionHistory(state, actionItem);
      }
    },
    updateLayer: (state, action: PayloadAction<Partial<Layer> & { id: string }>) => {
      const index = state.layers.findIndex(layer => layer.id === action.payload.id);
      if (index !== -1) {
        state.layers[index] = { ...state.layers[index], ...action.payload };
      }
    },
    reorderLayers: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      const layer = state.layers.splice(fromIndex, 1)[0];
      state.layers.splice(toIndex, 0, layer);
      // Update order property
      state.layers.forEach((layer, index) => {
        layer.order = index;
      });
    },

    // Clip management
    addClip: (state, action: PayloadAction<{ layerId: string; clip: Clip }>) => {
      const layer = state.layers.find(l => l.id === action.payload.layerId);
      if (layer) {
        layer.clips.push(action.payload.clip);
        
        // Update timeline duration for main video layer
        if (layer.isMainVideo) {
          const totalDuration = layer.clips.reduce((total, clip) => total + clip.duration, 0);
          state.duration = totalDuration;
          console.log('Timeline duration updated after adding clip:', totalDuration);
        }
      }
    },
    removeClip: (state, action: PayloadAction<{ layerId: string; clipId: string }>) => {
      const layer = state.layers.find(l => l.id === action.payload.layerId);
      if (layer) {
        layer.clips = layer.clips.filter(clip => clip.id !== action.payload.clipId);
        
        // Update timeline duration for main video layer
        if (layer.isMainVideo) {
          const totalDuration = layer.clips.reduce((total, clip) => total + clip.duration, 0);
          state.duration = totalDuration;
          console.log('Timeline duration updated after removing clip:', totalDuration);
        }
      }
    },
    updateClip: (state, action: PayloadAction<{ layerId: string; clipId: string; updates: Partial<Clip> }>) => {
      const layer = state.layers.find(l => l.id === action.payload.layerId);
      if (layer) {
        const clip = layer.clips.find(c => c.id === action.payload.clipId);
        if (clip) {
          Object.assign(clip, action.payload.updates);
          
          // Update timeline duration for main video layer if duration changed
          if (layer.isMainVideo && action.payload.updates.duration !== undefined) {
            const totalDuration = layer.clips.reduce((total, clip) => total + clip.duration, 0);
            state.duration = totalDuration;
            console.log('Timeline duration updated after updating clip:', totalDuration);
          }
        }
      }
    },
    moveClip: (state, action: PayloadAction<{ layerId: string; clipId: string; newStartTime: number }>) => {
      const layer = state.layers.find(l => l.id === action.payload.layerId);
      if (layer) {
        const clip = layer.clips.find(c => c.id === action.payload.clipId);
        if (clip) {
          clip.startTime = action.payload.newStartTime;
          clip.endTime = clip.startTime + clip.duration;
        }
      }
    },

    // Selection management
    selectClip: (state, action: PayloadAction<string>) => {
      state.selectedClips = [action.payload];
    },
    selectMultipleClips: (state, action: PayloadAction<string[]>) => {
      state.selectedClips = action.payload;
    },
    clearSelection: (state) => {
      state.selectedClips = [];
    },

    // Layer selection for trim/delete operations
    selectLayer: (state, action: PayloadAction<string>) => {
      state.selectedLayer = action.payload;
      // Clear any existing trim state when selecting a new layer
      state.trimState.selectedRange = null;
      state.trimState.isDragging = false;
      state.trimState.dragStartTime = null;
    },
    clearLayerSelection: (state) => {
      state.selectedLayer = null;
      // Clear trim state when clearing layer selection
      state.trimState.isActive = false;
      state.trimState.selectedRange = null;
      state.trimState.isDragging = false;
      state.trimState.dragStartTime = null;
    },

    // Trim operations
    setTrimRange: (state, action: PayloadAction<TrimRange>) => {
      const { startTime, endTime, layerId, isValid } = action.payload;
      
      // Validate range
      const layer = state.layers.find(l => l.id === layerId);
      if (!layer) return;
      
      // Ensure range is within layer bounds
      const validStartTime = Math.max(0, Math.min(startTime, state.duration));
      const validEndTime = Math.max(validStartTime, Math.min(endTime, state.duration));
      
      state.trimState.selectedRange = {
        startTime: validStartTime,
        endTime: validEndTime,
        layerId,
        isValid: isValid && validStartTime < validEndTime
      };
      state.trimState.isActive = true;
    },
    
    clearTrimRange: (state) => {
      state.trimState.selectedRange = null;
      state.trimState.isDragging = false;
      state.trimState.dragStartTime = null;
    },
    
    setTrimDragging: (state, action: PayloadAction<{ isDragging: boolean; startTime?: number }>) => {
      state.trimState.isDragging = action.payload.isDragging;
      if (action.payload.startTime !== undefined) {
        state.trimState.dragStartTime = action.payload.startTime;
      }
    },

    // Delete operations
    deleteSegment: (state, action: PayloadAction<{ layerId: string; startTime: number; endTime: number }>) => {
      const { layerId, startTime, endTime } = action.payload;
      const layer = state.layers.find(l => l.id === layerId);
      
      if (!layer) return;
      
      // Prevent deletion of entire main video layer
      if (layer.isMainVideo && startTime <= 0 && endTime >= state.duration) {
        return; // Don't allow deletion of entire main video
      }
      
      // Initialize segments if they don't exist
      if (!layer.segments) {
        layer.segments = [{
          id: `segment_${layerId}_0`,
          startTime: 0,
          endTime: state.duration,
          duration: state.duration,
          isDeleted: false
        }];
      }
      
      // Mark segments for deletion
      layer.segments.forEach(segment => {
        if (segment.startTime >= startTime && segment.endTime <= endTime) {
          segment.isDeleted = true;
        }
      });
      
      // Add to pending operations
      const operation = {
        id: `delete_${Date.now()}`,
        type: 'delete' as const,
        layerId,
        startTime,
        endTime,
        segments: layer.segments.filter(s => s.isDeleted),
        timestamp: Date.now()
      };
      
      state.trimState.pendingOperations.push(operation);
    },
    
    applyTrimOperations: (state, action: PayloadAction<{ layerId: string }>) => {
      const { layerId } = action.payload;
      const layer = state.layers.find(l => l.id === layerId);
      
      if (!layer || !layer.segments) return;
      
      // Store the state before the action for undo (serializable snapshot)
      const beforeState = createSerializableStateSnapshot(state);
      
      // Remove deleted segments
      layer.segments = layer.segments.filter(segment => !segment.isDeleted);
      
      // Fill gaps for main video layer
      if (layer.isMainVideo && layer.segments.length > 0) {
        // Sort segments by start time
        layer.segments.sort((a, b) => a.startTime - b.startTime);
        
        // Adjust start times to fill gaps
        let currentTime = 0;
        layer.segments.forEach(segment => {
          const duration = segment.endTime - segment.startTime;
          segment.startTime = currentTime;
          segment.endTime = currentTime + duration;
          segment.duration = duration;
          currentTime += duration;
        });
        
        // Update timeline duration
        state.duration = currentTime;
      }
      
      // Clear pending operations for this layer
      state.trimState.pendingOperations = state.trimState.pendingOperations.filter(
        op => op.layerId !== layerId
      );
      
      // Clear trim state
      state.trimState.selectedRange = null;
      state.trimState.isActive = false;
      
      // Create undo entry after the action is performed
      const actionItem = createActionHistoryItemLocal(
        'trimClip',
        `Applied trim operations to layer`,
        beforeState, // Store the state BEFORE the action
        {
          layerId: layer.id,
          operationType: 'trimClip',
          isCheckpoint: false
        }
      );
      
      // Add to undo stack
      state.undoStack.push(actionItem);
      
      // Clear redo stack
      state.redoStack = [];
      
      // Add to action history
      addToActionHistory(state, actionItem);
    },

    // Segment management
    splitSegment: (state, action: PayloadAction<{ layerId: string; splitTime: number }>) => {
      const { layerId, splitTime } = action.payload;
      const layer = state.layers.find(l => l.id === layerId);
      
      if (!layer) return;
      
      // Initialize segments if they don't exist
      if (!layer.segments) {
        layer.segments = [{
          id: `segment_${layerId}_0`,
          startTime: 0,
          endTime: state.duration,
          duration: state.duration,
          isDeleted: false
        }];
      }
      
      // Find the segment that contains the split time
      const segmentToSplit = layer.segments.find(segment => 
        segment.startTime < splitTime && segment.endTime > splitTime && !segment.isDeleted
      );
      
      if (segmentToSplit) {
        // Create new segment for the second part
        const newSegment = {
          id: `segment_${layerId}_${Date.now()}`,
          startTime: splitTime,
          endTime: segmentToSplit.endTime,
          duration: segmentToSplit.endTime - splitTime,
          isDeleted: false
        };
        
        // Update the original segment
        segmentToSplit.endTime = splitTime;
        segmentToSplit.duration = splitTime - segmentToSplit.startTime;
        
        // Add the new segment
        layer.segments.push(newSegment);
        
        // Add to pending operations
        const operation = {
          id: `split_${Date.now()}`,
          type: 'split' as const,
          layerId,
          startTime: splitTime,
          endTime: splitTime,
          segments: [segmentToSplit, newSegment],
          timestamp: Date.now()
        };
        
        state.trimState.pendingOperations.push(operation);
      }
    },
    
    mergeSegments: (state, action: PayloadAction<{ layerId: string; segmentIds: string[] }>) => {
      const { layerId, segmentIds } = action.payload;
      const layer = state.layers.find(l => l.id === layerId);
      
      if (!layer || !layer.segments || segmentIds.length < 2) return;
      
      // Get segments to merge
      const segmentsToMerge = layer.segments.filter(segment => 
        segmentIds.includes(segment.id) && !segment.isDeleted
      );
      
      if (segmentsToMerge.length < 2) return;
      
      // Sort by start time
      segmentsToMerge.sort((a, b) => a.startTime - b.startTime);
      
      // Create merged segment
      const mergedSegment = {
        id: `merged_${layerId}_${Date.now()}`,
        startTime: segmentsToMerge[0].startTime,
        endTime: segmentsToMerge[segmentsToMerge.length - 1].endTime,
        duration: segmentsToMerge.reduce((total, seg) => total + seg.duration, 0),
        isDeleted: false
      };
      
      // Remove original segments and add merged segment
      layer.segments = layer.segments.filter(segment => !segmentIds.includes(segment.id));
      layer.segments.push(mergedSegment);
      
      // Add to pending operations
      const operation = {
        id: `merge_${Date.now()}`,
        type: 'trim' as const,
        layerId,
        startTime: mergedSegment.startTime,
        endTime: mergedSegment.endTime,
        segments: [mergedSegment],
        timestamp: Date.now()
      };
      
      state.trimState.pendingOperations.push(operation);
    },

    // Keyframe management
    addKeyframe: (state, action: PayloadAction<{ layerId: string; clipId: string; keyframe: Keyframe }>) => {
      const layer = state.layers.find(l => l.id === action.payload.layerId);
      if (layer) {
        const clip = layer.clips.find(c => c.id === action.payload.clipId);
        if (clip) {
          clip.keyframes.push(action.payload.keyframe);
        }
      }
    },
    removeKeyframe: (state, action: PayloadAction<{ layerId: string; clipId: string; keyframeId: string }>) => {
      const layer = state.layers.find(l => l.id === action.payload.layerId);
      if (layer) {
        const clip = layer.clips.find(c => c.id === action.payload.clipId);
        if (clip) {
          clip.keyframes = clip.keyframes.filter(k => k.id !== action.payload.keyframeId);
        }
      }
    },

    // Marker management
    addMarker: (state, action: PayloadAction<Marker>) => {
      state.markers.push(action.payload);
    },
    removeMarker: (state, action: PayloadAction<string>) => {
      state.markers = state.markers.filter((marker: Marker) => marker.id !== action.payload);
    },
    updateMarker: (state, action: PayloadAction<Partial<Marker> & { id: string }>) => {
      const marker = state.markers.find((m: Marker) => m.id === action.payload.id);
      if (marker) {
        Object.assign(marker, action.payload);
      }
    },

    // Undo/Redo
    saveState: (state, action: PayloadAction<{ description?: string; metadata?: ActionMetadata }>) => {
      const { description = 'Save State', metadata } = action.payload;
      
      // Create action history item for the current state
      const actionItem = createActionHistoryItemLocal(
        'batchOperation',
        description,
        { ...state },
        metadata
      );
      
      // Add to undo stack
      state.undoStack.push(actionItem);
      
      // Clear redo stack
      state.redoStack = [];
      
      // Add to action history
      addToActionHistory(state, actionItem);
    },
    
    undo: (state) => {
      if (state.undoStack.length > 0) {
        const previousAction = state.undoStack.pop()!;
        
        // Create action history item for current state before undo (serializable snapshot)
        const currentActionItem = createActionHistoryItemLocal(
          'batchOperation',
          `Undo: ${previousAction.description}`,
          createSerializableStateSnapshot(state),
          {
            ...previousAction.metadata,
            isCheckpoint: false,
            beforeState: previousAction.state,
            afterState: createSerializableStateSnapshot(state)
          }
        );
        
        // Add current state to redo stack
        state.redoStack.push(currentActionItem);
        
        // Restore previous state explicitly
        state.layers = previousAction.state.layers || [];
        state.playheadTime = previousAction.state.playheadTime || 0;
        state.duration = previousAction.state.duration || 0;
        state.zoom = previousAction.state.zoom || 1;
        state.markers = previousAction.state.markers || [];
        state.selectedClips = previousAction.state.selectedClips || [];
        state.selectedLayer = previousAction.state.selectedLayer || null;
        state.isPlaying = previousAction.state.isPlaying || false;
        state.isSnapping = previousAction.state.isSnapping || false;
        
        // Add to action history
        addToActionHistory(state, currentActionItem);
      }
    },
    
    redo: (state) => {
      if (state.redoStack.length > 0) {
        const nextAction = state.redoStack.pop()!;
        
        // Create action history item for current state before redo
        const currentActionItem = createActionHistoryItemLocal(
          'batchOperation',
          `Redo: ${nextAction.description}`,
          {
            layers: [...state.layers],
            playheadTime: state.playheadTime,
            duration: state.duration,
            zoom: state.zoom,
            markers: [...state.markers],
            selectedClips: [...state.selectedClips],
            selectedLayer: state.selectedLayer,
            isPlaying: state.isPlaying,
            isSnapping: state.isSnapping
          },
          {
            ...nextAction.metadata,
            isCheckpoint: false,
            beforeState: {
              layers: [...state.layers],
              playheadTime: state.playheadTime,
              duration: state.duration,
              zoom: state.zoom,
              markers: [...state.markers],
              selectedClips: [...state.selectedClips],
              selectedLayer: state.selectedLayer,
              isPlaying: state.isPlaying,
              isSnapping: state.isSnapping
            },
            afterState: nextAction.state
          }
        );
        
        // Add current state to undo stack
        state.undoStack.push(currentActionItem);
        
        // Restore next state explicitly
        state.layers = nextAction.state.layers || [];
        state.playheadTime = nextAction.state.playheadTime || 0;
        state.duration = nextAction.state.duration || 0;
        state.zoom = nextAction.state.zoom || 1;
        state.markers = nextAction.state.markers || [];
        state.selectedClips = nextAction.state.selectedClips || [];
        state.selectedLayer = nextAction.state.selectedLayer || null;
        state.isPlaying = nextAction.state.isPlaying || false;
        state.isSnapping = nextAction.state.isSnapping || false;
        
        // Add to action history
        addToActionHistory(state, currentActionItem);
      }
    },

    // Checkpoint Management
    saveCheckpoint: (state, action: PayloadAction<{ projectId: string; description: string; isAutoSave?: boolean }>) => {
      const { projectId, description, isAutoSave = false } = action.payload;
      
      const checkpoint: Checkpoint = {
        id: `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        timestamp: Date.now(),
        description,
        isAutoSave,
        state: { ...state },
        metadata: {
          version: '1.0',
          actionCount: state.actionHistory.length,
          layersCount: state.layers.length,
          clipsCount: state.layers.reduce((count, layer) => count + layer.clips.length, 0),
          duration: state.duration
        }
      };
      
      // Add checkpoint
      state.checkpoints.push(checkpoint);
      
      // Update last saved checkpoint
      state.lastSavedCheckpoint = checkpoint.id;
      
      // Clear unsaved changes flag
      state.hasUnsavedChanges = false;
      
      // Maintain max checkpoints (keep last 10)
      if (state.checkpoints.length > 10) {
        state.checkpoints.shift();
      }
      
      // Create action history item
      const actionItem = createActionHistoryItemLocal(
        'saveCheckpoint',
        `Save Checkpoint: ${description}`,
        { checkpoints: state.checkpoints, lastSavedCheckpoint: checkpoint.id, hasUnsavedChanges: false },
        {
          projectId,
          isCheckpoint: true,
          checkpointId: checkpoint.id
        }
      );
      
      addToActionHistory(state, actionItem);
    },
    
    restoreCheckpoint: (state, action: PayloadAction<{ checkpointId: string }>) => {
      const { checkpointId } = action.payload;
      const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
      
      if (checkpoint) {
        // Create action history item for current state before restore
        const currentActionItem = createActionHistoryItemLocal(
          'restoreCheckpoint',
          `Restore Checkpoint: ${checkpoint.description}`,
          { ...state },
          {
            projectId: checkpoint.projectId,
            isCheckpoint: true,
            checkpointId: checkpoint.id,
            beforeState: { ...state },
            afterState: checkpoint.state
          }
        );
        
        // Add current state to undo stack
        state.undoStack.push(currentActionItem);
        
        // Clear redo stack
        state.redoStack = [];
        
        // Restore checkpoint state
        Object.assign(state, checkpoint.state);
        
        // Add to action history
        addToActionHistory(state, currentActionItem);
      }
    },
    
    clearCheckpoints: (state) => {
      state.checkpoints = [];
      state.lastSavedCheckpoint = null;
      
      // Create action history item
      const actionItem = createActionHistoryItemLocal(
        'batchOperation',
        'Clear All Checkpoints',
        { checkpoints: [], lastSavedCheckpoint: null },
        { isCheckpoint: false }
      );
      
      addToActionHistory(state, actionItem);
    },
    
    clearActionHistory: (state) => {
      state.actionHistory = [];
      state.undoStack = [];
      state.redoStack = [];
      
      // Create action history item
      const actionItem = createActionHistoryItemLocal(
        'batchOperation',
        'Clear Action History',
        { actionHistory: [], undoStack: [], redoStack: [] },
        { isCheckpoint: false }
      );
      
      addToActionHistory(state, actionItem);
    },

    // Timeline operations
    splitClip: (state, action: PayloadAction<{ layerId: string; clipId: string; splitTime: number }>) => {
      const layer = state.layers.find((l: Layer) => l.id === action.payload.layerId);
      if (layer) {
        const clip = layer.clips.find((c: Clip) => c.id === action.payload.clipId);
        if (clip && action.payload.splitTime > clip.startTime && action.payload.splitTime < clip.endTime) {
          const newClip: Clip = {
            ...clip,
            id: `${clip.id}_split_${Date.now()}`,
            startTime: action.payload.splitTime,
            duration: clip.endTime - action.payload.splitTime,
          };
          clip.duration = action.payload.splitTime - clip.startTime;
          clip.endTime = action.payload.splitTime;
          layer.clips.push(newClip);
        }
      }
    },

    // Split layer at playhead position
    splitLayerAtPlayhead: (state, action: PayloadAction<{ layerId: string; splitTime: number; projectId?: string }>) => {
      const { layerId, splitTime } = action.payload;
      const layer = state.layers.find((l: Layer) => l.id === layerId);
      
      if (layer) {
        // Find the clip that contains the split time
        const clipToSplit = layer.clips.find((clip: Clip) => 
          splitTime > clip.startTime && 
          splitTime < clip.startTime + clip.duration
        );
        
        if (clipToSplit) {
          // Store the state before the action for undo (serializable snapshot)
          const beforeState = createSerializableStateSnapshot(state);
          
          // Store original video time for the first part
          const originalStartTime = clipToSplit.originalStartTime ?? clipToSplit.startTime;
          
          // Create new clip for the second part
          const newClip: Clip = {
            ...clipToSplit,
            id: `${clipToSplit.id}_split_${Date.now()}`,
            startTime: splitTime,
            duration: (clipToSplit.startTime + clipToSplit.duration) - splitTime,
            originalStartTime: originalStartTime + (splitTime - clipToSplit.startTime),
          };
          
          // Update original clip duration and set originalStartTime
          clipToSplit.duration = splitTime - clipToSplit.startTime;
          clipToSplit.originalStartTime = originalStartTime;
          
          // Add new clip to layer
          layer.clips.push(newClip);
          
          // Sort clips by start time
          layer.clips.sort((a, b) => a.startTime - b.startTime);
          
          // Create undo entry after the action is performed
          const actionItem = createActionHistoryItemLocal(
            'splitClip',
            `Split layer at ${splitTime.toFixed(2)}s`,
            beforeState, // Store the state BEFORE the action
            {
              layerId: layer.id,
              clipId: clipToSplit.id,
              operationType: 'splitClip',
              isCheckpoint: false
            }
          );
          
          // Add to undo stack
          state.undoStack.push(actionItem);
          
          // Clear redo stack
          state.redoStack = [];
          
          // Add to action history
          addToActionHistory(state, actionItem);
        }
      }
    },

    // Delete clip at playhead position
    deleteAtPlayhead: (state, action: PayloadAction<{ layerId: string; deleteTime: number }>) => {
      const layer = state.layers.find((l: Layer) => l.id === action.payload.layerId);
      if (!layer) return;

      // Find the clip that contains the delete time
      const clipToDelete = layer.clips.find((clip: Clip) => 
        action.payload.deleteTime >= clip.startTime && 
        action.payload.deleteTime < clip.startTime + clip.duration
      );
      
      if (!clipToDelete) return;

      // Prevent deletion of entire main video layer
      if (layer.isMainVideo && layer.clips.length === 1) {
        return; // Don't allow deletion of the only clip in main video
      }

      // Store deleted clip properties before removal
      const deletedStartTime = clipToDelete.startTime;
      const deletedDuration = clipToDelete.duration;
      
      // Remove the clip
      layer.clips = layer.clips.filter(clip => clip.id !== clipToDelete.id);
      
      // For main video layer, fill the gap by adjusting subsequent clips
      if (layer.isMainVideo) {
        // Move all clips that come after the deleted clip to fill the gap
        layer.clips.forEach(clip => {
          if (clip.startTime > deletedStartTime) {
            clip.startTime -= deletedDuration;
          }
        });
        
        // Sort clips by start time
        layer.clips.sort((a, b) => a.startTime - b.startTime);
        
        // Update timeline duration
        const lastClip = layer.clips[layer.clips.length - 1];
        if (lastClip) {
          const newDuration = lastClip.startTime + lastClip.duration;
          
          // Calculate proportional playhead movement
          if (state.duration > 0) {
            const playheadPercentage = state.playheadTime / state.duration;
            state.playheadTime = Math.min(playheadPercentage * newDuration, newDuration);
          }
          
          state.duration = newDuration;
        }
      }
    },

    // Delete clip by ID (for selected clip deletion)
    deleteClipById: (state, action: PayloadAction<{ layerId: string; clipId: string; projectId?: string }>) => {
      const layer = state.layers.find((l: Layer) => l.id === action.payload.layerId);
      if (!layer) {
        // Add validation error for layer not found
        state.validationState.errors.push({
          id: `layer-not-found-${Date.now()}`,
          type: 'deletion',
          message: 'Layer not found. Cannot delete clip.',
          layerId: action.payload.layerId,
          timestamp: Date.now()
        });
        return;
      }

      // Find the clip to delete
      const clipToDelete = layer.clips.find((clip: Clip) => clip.id === action.payload.clipId);
      
      if (!clipToDelete) {
        // Add validation error for clip not found
        state.validationState.errors.push({
          id: `clip-not-found-${Date.now()}`,
          type: 'deletion',
          message: 'Clip not found. Cannot delete clip.',
          layerId: action.payload.layerId,
          clipId: action.payload.clipId,
          timestamp: Date.now()
        });
        return;
      }

      // Comprehensive validation for main video layer
      if (layer.isMainVideo) {
        // Prevent deletion of entire main video layer
        if (layer.clips.length === 1) {
          state.validationState.errors.push({
            id: `main-video-empty-${Date.now()}`,
            type: 'deletion',
            message: 'Cannot delete the only clip in the main video layer. The main video cannot be empty.',
            layerId: action.payload.layerId,
            clipId: action.payload.clipId,
            timestamp: Date.now()
          });
          return;
        }

        // Check if deleting this clip would leave the main video with no content at the beginning
        const remainingClips = layer.clips.filter(clip => clip.id !== clipToDelete.id);
        const hasContentAtStart = remainingClips.some(clip => clip.startTime === 0);
        
        if (!hasContentAtStart && clipToDelete.startTime === 0) {
          // Check if there are other clips that can be moved to start
          const clipsAfterFirst = remainingClips.filter(clip => clip.startTime > 0);
          if (clipsAfterFirst.length === 0) {
            state.validationState.errors.push({
              id: `main-video-no-start-${Date.now()}`,
              type: 'deletion',
              message: 'Cannot delete the first clip if it would leave the main video with no content at the beginning.',
              layerId: action.payload.layerId,
              clipId: action.payload.clipId,
              timestamp: Date.now()
            });
            return;
          }
        }

        // Check minimum duration requirements
        const totalRemainingDuration = remainingClips.reduce((sum, clip) => sum + clip.duration, 0);
        if (totalRemainingDuration < 0.1) { // Minimum 0.1 seconds
          state.validationState.errors.push({
            id: `main-video-min-duration-${Date.now()}`,
            type: 'duration',
            message: 'Cannot delete clip. The remaining video would be too short (less than 0.1 seconds).',
            layerId: action.payload.layerId,
            clipId: action.payload.clipId,
            timestamp: Date.now()
          });
          return;
        }
      }

      // Clear any existing validation errors for this operation
      state.validationState.errors = state.validationState.errors.filter(
        error => !(error.layerId === action.payload.layerId && error.clipId === action.payload.clipId)
      );

      // Store the state before the action for undo (serializable snapshot)
      const beforeState = createSerializableStateSnapshot(state);

      // Store deleted clip properties before removal
      const deletedStartTime = clipToDelete.startTime;
      const deletedDuration = clipToDelete.duration;
      
      // Remove the clip
      layer.clips = layer.clips.filter(clip => clip.id !== clipToDelete.id);
      
      // For main video layer, fill the gap by adjusting subsequent clips
      if (layer.isMainVideo) {
        // Move all clips that come after the deleted clip to fill the gap
        layer.clips.forEach(clip => {
          if (clip.startTime > deletedStartTime) {
            clip.startTime -= deletedDuration;
          }
        });
        
        // Sort clips by start time
        layer.clips.sort((a, b) => a.startTime - b.startTime);
        
        // Update timeline duration
        const lastClip = layer.clips[layer.clips.length - 1];
        if (lastClip) {
          const newDuration = lastClip.startTime + lastClip.duration;
          
          // Calculate proportional playhead movement
          if (state.duration > 0) {
            const playheadPercentage = state.playheadTime / state.duration;
            state.playheadTime = Math.min(playheadPercentage * newDuration, newDuration);
          }
          
          state.duration = newDuration;
        }
      }

      // Clear selection if the deleted clip was selected
      state.selectedClips = state.selectedClips.filter(clipId => clipId !== action.payload.clipId);

      // Create undo entry after the action is performed
      const actionItem = createActionHistoryItemLocal(
        'removeClip',
        `Deleted clip at ${deletedStartTime.toFixed(2)}s`,
        beforeState, // Store the state BEFORE the action
        {
          layerId: layer.id,
          clipId: action.payload.clipId,
          operationType: 'removeClip',
          isCheckpoint: false
        }
      );
      
      // Add to undo stack
      state.undoStack.push(actionItem);
      
      // Clear redo stack
      state.redoStack = [];
      
      // Add to action history
      addToActionHistory(state, actionItem);

      // Add success message (could be used for toast notifications)
      console.log(`Successfully deleted clip ${action.payload.clipId} from layer ${action.payload.layerId}`);
    },

    // Validation actions
    addValidationError: (state, action: PayloadAction<ValidationError>) => {
      state.validationState.errors.push(action.payload);
    },
    clearValidationErrors: (state) => {
      state.validationState.errors = [];
    },
    removeValidationError: (state, action: PayloadAction<string>) => {
      state.validationState.errors = state.validationState.errors.filter(error => error.id !== action.payload);
    },
    addValidationWarning: (state, action: PayloadAction<ValidationWarning>) => {
      state.validationState.warnings.push(action.payload);
    },
    clearValidationWarnings: (state) => {
      state.validationState.warnings = [];
    },
    setValidating: (state, action: PayloadAction<boolean>) => {
      state.validationState.isValidating = action.payload;
    },

    // Reset timeline
    resetTimeline: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    // Save timeline
    builder
      .addCase(saveTimeline.pending, (state) => {
        // Could add loading state here
      })
      .addCase(saveTimeline.fulfilled, (state) => {
        // Mark as saved - clear unsaved changes flag
        state.hasUnsavedChanges = false;
        console.log('Timeline saved successfully - hasUnsavedChanges set to false');
      })
      .addCase(saveTimeline.rejected, (state, action) => {
        // Error state
        console.error('Failed to save timeline:', action.payload);
      });

    // Load timeline
    builder
      .addCase(loadTimeline.pending, (state) => {
        // Could add loading state here
      })
      .addCase(loadTimeline.fulfilled, (state, action) => {
        if (action.payload && action.payload.data) {
          // Load timeline data but clear undo/redo stacks to start fresh
          const timelineData = action.payload.data;
          
          // Convert backend format to frontend format
          const convertedData = convertFromBackendTimelineState(timelineData);
          
          // Only overwrite layers if backend has layers, otherwise preserve existing layers
          // This prevents empty backend response from clearing frontend-created layers
          if (convertedData.layers && convertedData.layers.length > 0) {
            state.layers = convertedData.layers;
            console.log('Timeline loaded with backend layers:', convertedData.layers.length);
          } else {
            console.log('Backend returned empty layers, preserving existing frontend layers:', state.layers.length);
          }
          
          // Restore other properties
          state.playheadTime = convertedData.playheadTime || 0;
          state.zoom = convertedData.zoom || 1;
          state.duration = convertedData.duration || 0;
          state.markers = convertedData.markers || [];
          state.selectedClips = convertedData.selectedClips || [];
          state.isPlaying = convertedData.isPlaying || false;
          state.isSnapping = convertedData.isSnapping !== undefined ? convertedData.isSnapping : true;
          state.selectedLayer = convertedData.selectedLayer || null;
          
          // Ensure duration is calculated correctly from clips
          const mainVideoLayer = state.layers.find(layer => layer.isMainVideo);
          if (mainVideoLayer && mainVideoLayer.clips.length > 0) {
            const calculatedDuration = mainVideoLayer.clips.reduce((total, clip) => total + clip.duration, 0);
            if (calculatedDuration > 0) {
              state.duration = calculatedDuration;
              console.log('Timeline duration recalculated from clips:', calculatedDuration);
            }
          }
          state.trimState = convertedData.trimState || {
            isActive: false,
            selectedRange: null,
            isDragging: false,
            dragStartTime: null,
            pendingOperations: []
          };
          state.validationState = convertedData.validationState || {
            errors: [],
            warnings: [],
            isValidating: false
          };
          
          // Always start with empty undo/redo stacks
          state.undoStack = [];
          state.redoStack = [];
          state.actionHistory = [];
          state.hasUnsavedChanges = false;
          
          console.log('Timeline loaded with proper data conversion - undo/redo stacks cleared for fresh start');
        }
      })
      .addCase(loadTimeline.rejected, (state, action) => {
        console.error('Failed to load timeline:', action.payload);
      });

    // Hybrid trim video
    builder
      .addCase(trimVideoHybrid.pending, (state) => {
        state.validationState.isValidating = true;
      })
      .addCase(trimVideoHybrid.fulfilled, (state, action) => {
        state.validationState.isValidating = false;
        // Update state with trimmed video info
        console.log('Video trimmed successfully:', action.payload);
      })
      .addCase(trimVideoHybrid.rejected, (state, action) => {
        state.validationState.isValidating = false;
        console.error('Failed to trim video:', action.payload);
      });

    // Auto trim video
    builder
      .addCase(autoTrimVideo.pending, (state) => {
        state.validationState.isValidating = true;
      })
      .addCase(autoTrimVideo.fulfilled, (state, action) => {
        state.validationState.isValidating = false;
        if (action.payload) {
          console.log('Auto trim completed successfully:', action.payload);
          // Force duration recalculation after auto-trim
          const mainVideoLayer = state.layers.find(layer => layer.isMainVideo);
          if (mainVideoLayer && mainVideoLayer.clips.length > 0) {
            const totalDuration = mainVideoLayer.clips.reduce((total, clip) => total + clip.duration, 0);
            state.duration = totalDuration;
            console.log('Timeline duration recalculated after auto-trim:', totalDuration);
          }
        }
      })
      .addCase(autoTrimVideo.rejected, (state, action) => {
        state.validationState.isValidating = false;
        console.error('Failed to auto-trim video:', action.payload);
      });

    // Load timeline history
    builder
      .addCase(loadTimelineHistory.pending, (state) => {
        // Could add loading state here
      })
      .addCase(loadTimelineHistory.fulfilled, (state, action) => {
        if (action.payload && action.payload.data) {
          state.timelineHistory = action.payload.data;
          console.log('Timeline history loaded:', action.payload.data.length, 'versions');
        }
      })
      .addCase(loadTimelineHistory.rejected, (state, action) => {
        console.error('Failed to load timeline history:', action.payload);
      });

    // Restore timeline version
    builder
      .addCase(restoreTimelineVersion.pending, (state) => {
        // Could add loading state here
      })
      .addCase(restoreTimelineVersion.fulfilled, (state, action) => {
        if (action.payload && action.payload.data) {
          // Load the restored timeline data
          const timelineData = action.payload.data.timeline_state;
          
          // Convert backend format to frontend format
          const convertedData = convertFromBackendTimelineState(timelineData);
          
          console.log('🔄 RESTORE: Original backend timeline data:', timelineData);
          console.log('🔄 RESTORE: Converted frontend data:', convertedData);
          console.log('🔄 RESTORE: Main video layer clips:', convertedData.layers?.find((l: any) => l.isMainVideo)?.clips);
          
          // Restore each property individually to ensure proper deep copying
          state.layers = convertedData.layers || [];
          state.playheadTime = convertedData.playheadTime || 0;
          state.zoom = convertedData.zoom || 1;
          state.duration = convertedData.duration || 0;
          state.markers = convertedData.markers || [];
          state.selectedClips = convertedData.selectedClips || [];
          state.isPlaying = false; // Always start paused after restore
          state.isSnapping = convertedData.isSnapping !== undefined ? convertedData.isSnapping : true;
          state.selectedLayer = convertedData.selectedLayer || null;
          state.trimState = convertedData.trimState || {
            isActive: false,
            selectedRange: null,
            isDragging: false,
            dragStartTime: null,
            pendingOperations: []
          };
          state.validationState = convertedData.validationState || {
            errors: [],
            warnings: [],
            isValidating: false
          };
          
          // Clear undo/redo stacks for fresh start
          state.undoStack = [];
          state.redoStack = [];
          state.actionHistory = [];
          state.hasUnsavedChanges = false;
          
          console.log('Timeline version restored successfully with proper data conversion');
        }
      })
      .addCase(restoreTimelineVersion.rejected, (state, action) => {
        console.error('Failed to restore timeline version:', action.payload);
      });
  },
});

export const {
  setPlayheadTime,
  setDuration,
  setIsPlaying,
  setZoom,
  setIsSnapping,
  addLayer,
  removeLayer,
  updateLayer,
  reorderLayers,
  addClip,
  removeClip,
  updateClip,
  moveClip,
  selectClip,
  selectMultipleClips,
  clearSelection,
  selectLayer,
  clearLayerSelection,
  setTrimRange,
  clearTrimRange,
  setTrimDragging,
  deleteSegment,
  applyTrimOperations,
  splitSegment,
  mergeSegments,
  addKeyframe,
  removeKeyframe,
  addMarker,
  removeMarker,
  updateMarker,
  saveState,
  undo,
  redo,
  saveCheckpoint,
  restoreCheckpoint,
  clearCheckpoints,
  clearActionHistory,
  splitClip,
  splitLayerAtPlayhead,
  deleteAtPlayhead,
  deleteClipById,
  addValidationError,
  clearValidationErrors,
  removeValidationError,
  addValidationWarning,
  clearValidationWarnings,
  setValidating,
  resetTimeline,
  recalculateDuration,
} = timelineSlice.actions;

export default timelineSlice.reducer;
