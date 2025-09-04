import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TranscriptState, TranscriptWord, TranscribeResponse, RemoveFillersResponse, ApiResponse } from '../../types';
import { apiService } from '../../services/apiService';

const initialState: TranscriptState = {
  words: [],
  isTranscribing: false,
  error: null,
  selectedWords: [],
};

// Async thunks
export const transcribeAudio = createAsyncThunk(
  'transcript/transcribeAudio',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('project_id', projectId);
      
      const response = await apiService.post<ApiResponse<TranscribeResponse>>(`/media/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Transcription failed');
    }
  }
);

export const removeFillers = createAsyncThunk(
  'transcript/removeFillers',
  async ({ projectId, selectedWords }: { projectId: string; selectedWords: string[] }, { rejectWithValue }) => {
    try {
      const response = await apiService.post<ApiResponse<RemoveFillersResponse>>(`/media/remove-fillers`, {
        project_id: projectId,
        selectedWords,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Filler removal failed');
    }
  }
);

export const removeAutoDetectedFillers = createAsyncThunk(
  'transcript/removeAutoDetectedFillers',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.post<ApiResponse<RemoveFillersResponse>>(`/media/remove-fillers`, {
        project_id: projectId,
        auto_detect: true,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Auto filler removal failed');
    }
  }
);

const transcriptSlice = createSlice({
  name: 'transcript',
  initialState,
  reducers: {
    setWords: (state, action: PayloadAction<TranscriptWord[]>) => {
      state.words = action.payload;
    },
    toggleWordSelection: (state, action: PayloadAction<string>) => {
      const wordId = action.payload;
      const index = state.selectedWords.indexOf(wordId);
      if (index > -1) {
        state.selectedWords.splice(index, 1);
      } else {
        state.selectedWords.push(wordId);
      }
    },
    selectWords: (state, action: PayloadAction<string[]>) => {
      state.selectedWords = action.payload;
    },
    clearSelection: (state) => {
      state.selectedWords = [];
    },
    markAsFiller: (state, action: PayloadAction<string>) => {
      const word = state.words.find((w: TranscriptWord) => w.text === action.payload);
      if (word) {
        word.isFiller = true;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    resetTranscript: (state) => {
      state.words = [];
      state.selectedWords = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Transcribe audio
    builder
      .addCase(transcribeAudio.pending, (state) => {
        state.isTranscribing = true;
        state.error = null;
      })
      .addCase(transcribeAudio.fulfilled, (state, action) => {
        state.isTranscribing = false;
        if (action.payload?.data) {
          state.words = action.payload.data.transcript || [];
        }
      })
      .addCase(transcribeAudio.rejected, (state, action) => {
        state.isTranscribing = false;
        state.error = action.payload as string || 'Transcription failed';
      });

    // Remove fillers
    builder
      .addCase(removeFillers.pending, (state) => {
        state.isTranscribing = true;
        state.error = null;
      })
      .addCase(removeFillers.fulfilled, (state) => {
        state.isTranscribing = false;
        state.selectedWords = [];
      })
      .addCase(removeFillers.rejected, (state, action) => {
        state.isTranscribing = false;
        state.error = action.payload as string || 'Filler removal failed';
      });

    // Remove auto detected fillers
    builder
      .addCase(removeAutoDetectedFillers.pending, (state) => {
        state.isTranscribing = true;
        state.error = null;
      })
      .addCase(removeAutoDetectedFillers.fulfilled, (state) => {
        state.isTranscribing = false;
      })
      .addCase(removeAutoDetectedFillers.rejected, (state, action) => {
        state.isTranscribing = false;
        state.error = action.payload as string || 'Auto filler removal failed';
      });
  },
});

export const {
  setWords,
  toggleWordSelection,
  selectWords,
  clearSelection,
  markAsFiller,
  clearError,
  resetTranscript,
} = transcriptSlice.actions;

export default transcriptSlice.reducer;
