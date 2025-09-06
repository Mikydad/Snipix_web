import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TimelineState, Layer, Clip, Keyframe, Marker, ApiResponse, TrimState, TrimRange } from '../../types';
import { apiService } from '../../services/apiService';

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
  }
};

// Async thunks
export const saveTimeline = createAsyncThunk(
  'timeline/saveTimeline',
  async ({ projectId, timelineState }: { projectId: string; timelineState: TimelineState }, { rejectWithValue }) => {
    try {
      const response = await apiService.post<ApiResponse<any>>('/timeline/save', {
        projectId,
        timelineState,
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
        startTime: clip.startTime,
        duration: clip.duration
      }));
      
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
      state.playheadTime = Math.max(0, Math.min(action.payload, state.duration));
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },

    // Zoom and view controls
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = Math.max(0.1, Math.min(action.payload, 10));
    },
    setIsSnapping: (state, action: PayloadAction<boolean>) => {
      state.isSnapping = action.payload;
    },

    // Layer management
    addLayer: (state, action: PayloadAction<Layer>) => {
      state.layers.push(action.payload);
      state.layers.sort((a, b) => a.order - b.order);
    },
    removeLayer: (state, action: PayloadAction<string>) => {
      state.layers = state.layers.filter(layer => layer.id !== action.payload);
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
      }
    },
    removeClip: (state, action: PayloadAction<{ layerId: string; clipId: string }>) => {
      const layer = state.layers.find(l => l.id === action.payload.layerId);
      if (layer) {
        layer.clips = layer.clips.filter(clip => clip.id !== action.payload.clipId);
      }
    },
    updateClip: (state, action: PayloadAction<{ layerId: string; clipId: string; updates: Partial<Clip> }>) => {
      const layer = state.layers.find(l => l.id === action.payload.layerId);
      if (layer) {
        const clip = layer.clips.find(c => c.id === action.payload.clipId);
        if (clip) {
          Object.assign(clip, action.payload.updates);
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
    saveState: (state) => {
      state.undoStack.push({ ...state });
      state.redoStack = [];
    },
    undo: (state) => {
      if (state.undoStack.length > 0) {
        const previousState = state.undoStack.pop()!;
        state.redoStack.push({ ...state });
        Object.assign(state, previousState);
      }
    },
    redo: (state) => {
      if (state.redoStack.length > 0) {
        const nextState = state.redoStack.pop()!;
        state.undoStack.push({ ...state });
        Object.assign(state, nextState);
      }
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
      const layer = state.layers.find((l: Layer) => l.id === action.payload.layerId);
      if (layer) {
        // Find the clip that contains the split time
        const clipToSplit = layer.clips.find((clip: Clip) => 
          action.payload.splitTime > clip.startTime && 
          action.payload.splitTime < clip.startTime + clip.duration
        );
        
        if (clipToSplit) {
          // Store original video time for the first part
          const originalStartTime = clipToSplit.originalStartTime ?? clipToSplit.startTime;
          
          // Create new clip for the second part
          const newClip: Clip = {
            ...clipToSplit,
            id: `${clipToSplit.id}_split_${Date.now()}`,
            startTime: action.payload.splitTime,
            duration: (clipToSplit.startTime + clipToSplit.duration) - action.payload.splitTime,
            originalStartTime: originalStartTime + (action.payload.splitTime - clipToSplit.startTime),
          };
          
          // Update original clip duration and set originalStartTime
          clipToSplit.duration = action.payload.splitTime - clipToSplit.startTime;
          clipToSplit.originalStartTime = originalStartTime;
          
          // Add new clip to layer
          layer.clips.push(newClip);
          
          // Sort clips by start time
          layer.clips.sort((a, b) => a.startTime - b.startTime);
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
      if (!layer) return;

      // Find the clip to delete
      const clipToDelete = layer.clips.find((clip: Clip) => clip.id === action.payload.clipId);
      
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

      // Clear selection if the deleted clip was selected
      state.selectedClips = state.selectedClips.filter(clipId => clipId !== action.payload.clipId);
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
        // Success state
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
        if (action.payload) {
          Object.assign(state, action.payload);
        }
      })
      .addCase(loadTimeline.rejected, (state, action) => {
        console.error('Failed to load timeline:', action.payload);
      });

    // Hybrid trim video
    builder
      .addCase(trimVideoHybrid.pending, (state) => {
        // Could add loading state here
      })
      .addCase(trimVideoHybrid.fulfilled, (state, action) => {
        // Update state with trimmed video info
        console.log('Video trimmed successfully:', action.payload);
      })
      .addCase(trimVideoHybrid.rejected, (state, action) => {
        console.error('Failed to trim video:', action.payload);
      });

    // Auto trim video
    builder
      .addCase(autoTrimVideo.pending, (state) => {
        // Could add loading state here
      })
      .addCase(autoTrimVideo.fulfilled, (state, action) => {
        if (action.payload) {
          console.log('Auto trim completed successfully:', action.payload);
        }
      })
      .addCase(autoTrimVideo.rejected, (state, action) => {
        console.error('Failed to auto-trim video:', action.payload);
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
  splitClip,
  splitLayerAtPlayhead,
  deleteAtPlayhead,
  deleteClipById,
  resetTimeline,
} = timelineSlice.actions;

export default timelineSlice.reducer;
