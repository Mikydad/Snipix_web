import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TimelineState, Layer, Clip, Keyframe, Marker, ApiResponse } from '../../types';
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
  addKeyframe,
  removeKeyframe,
  addMarker,
  removeMarker,
  updateMarker,
  saveState,
  undo,
  redo,
  splitClip,
  resetTimeline,
} = timelineSlice.actions;

export default timelineSlice.reducer;
