import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Project, ApiResponse } from '../../types';
import { apiService } from '../../services/apiService';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async () => {
    const response = await apiService.get<ApiResponse<Project[]>>('/projects');
    return response.data;
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData: Partial<Project>) => {
    const response = await apiService.post<ApiResponse<Project>>('/projects', projectData);
    return response.data;
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId: string) => {
    const response = await apiService.get<ApiResponse<Project>>(`/projects/${projectId}`);
    return response.data;
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, data }: { projectId: string; data: Partial<Project> }) => {
    const response = await apiService.put<ApiResponse<Project>>(`/projects/${projectId}`, data);
    return response.data;
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId: string) => {
    await apiService.delete(`/projects/${projectId}`);
    return projectId;
  }
);

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateProjectTimeline: (state, action: PayloadAction<{ projectId: string; timelineState: any }>) => {
      const project = state.projects.find(p => p._id === action.payload.projectId);
      if (project) {
        project.timelineState = action.payload.timelineState;
        project.updatedAt = new Date().toISOString();
      }
      if (state.currentProject?._id === action.payload.projectId) {
        state.currentProject.timelineState = action.payload.timelineState;
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },
    updateProjectTranscript: (state, action: PayloadAction<{ projectId: string; transcriptState: any }>) => {
      const project = state.projects.find(p => p._id === action.payload.projectId);
      if (project) {
        project.transcriptState = action.payload.transcriptState;
        project.updatedAt = new Date().toISOString();
      }
      if (state.currentProject?._id === action.payload.projectId) {
        state.currentProject.transcriptState = action.payload.transcriptState;
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects = action.payload?.data || [];
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch projects';
      });

    // Create project
    builder
      .addCase(createProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data) {
          state.projects.unshift(action.payload.data);
          state.currentProject = action.payload.data;
        }
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create project';
      });

    // Fetch project by ID
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProject = action.payload?.data || null;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch project';
      });

    // Update project
    builder
      .addCase(updateProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data) {
          const projectData = action.payload.data;
          const index = state.projects.findIndex(p => p._id === projectData._id);
          if (index !== -1) {
            state.projects[index] = projectData;
          }
          if (state.currentProject?._id === projectData._id) {
            state.currentProject = projectData;
          }
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update project';
      });

    // Delete project
    builder
      .addCase(deleteProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects = state.projects.filter(p => p._id !== action.payload);
        if (state.currentProject?._id === action.payload) {
          state.currentProject = null;
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete project';
      });
  },
});

export const {
  setCurrentProject,
  clearError,
  updateProjectTimeline,
  updateProjectTranscript,
} = projectSlice.actions;

export default projectSlice.reducer;
