import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UploadState, UploadResponse, ApiResponse, FileMetadata } from '../../types';
import { apiService } from '../../services/apiService';

const initialState: UploadState = {
  file: null,
  progress: 0,
  isUploading: false,
  error: null,
};

// Async thunks
export const uploadVideo = createAsyncThunk(
  'upload/uploadVideo',
  async ({ file, projectId }: { file: File; projectId: string }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);

      const response = await apiService.post<ApiResponse<UploadResponse>>('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          // Note: In a real implementation, you'd dispatch a progress action here
          console.log('Upload progress:', progress);
        },
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Upload failed');
    }
  }
);

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    setFile: (state, action: PayloadAction<FileMetadata | null>) => {
      state.file = action.payload;
      state.error = null;
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    clearUpload: (state) => {
      state.file = null;
      state.progress = 0;
      state.isUploading = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isUploading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadVideo.pending, (state) => {
        state.isUploading = true;
        state.error = null;
        state.progress = 0;
      })
      .addCase(uploadVideo.fulfilled, (state) => {
        state.isUploading = false;
        state.progress = 100;
        state.error = null;
      })
      .addCase(uploadVideo.rejected, (state, action) => {
        state.isUploading = false;
        state.error = action.payload as string || 'Upload failed';
        state.progress = 0;
      });
  },
});

export const {
  setFile,
  setProgress,
  clearUpload,
  setError,
} = uploadSlice.actions;

export default uploadSlice.reducer;
