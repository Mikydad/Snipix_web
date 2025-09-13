/**
 * Project-Specific History Management System
 * 
 * This module provides project isolation for undo/redo history, checkpoints,
 * and timeline state management. Each project maintains its own independent
 * history and state.
 */

import { TimelineState, ActionHistoryItem, Checkpoint, ActionMetadata } from '../types';
import { ActionHistoryManager, createActionHistoryManager } from './actionHistory';
import { CheckpointManager, createCheckpointManager } from './checkpointManager';

export interface ProjectHistoryConfig {
  maxHistorySize: number;
  maxCheckpoints: number;
  autoSaveInterval: number;
  enableCompression: boolean;
  enableMetadata: boolean;
  autoCleanup: boolean;
}

export interface ProjectHistoryState {
  projectId: string;
  timelineState: TimelineState;
  historyManager: ActionHistoryManager | null;
  checkpointManager: CheckpointManager | null;
  lastAccessed: number;
  isActive: boolean;
}

export interface ProjectHistoryStats {
  projectId: string;
  historySize: number;
  checkpointCount: number;
  memoryUsage: number;
  lastAccessed: number;
  isActive: boolean;
}

export class ProjectHistoryManager {
  private projects: Map<string, ProjectHistoryState> = new Map();
  private currentProjectId: string | null = null;
  private config: ProjectHistoryConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ProjectHistoryConfig> = {}) {
    this.config = {
      maxHistorySize: 100,
      maxCheckpoints: 10,
      autoSaveInterval: 30000, // 30 seconds
      enableCompression: true,
      enableMetadata: true,
      autoCleanup: true,
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Initialize or get project history state
   */
  initializeProject(projectId: string, initialState?: Partial<TimelineState>): ProjectHistoryState {
    if (this.projects.has(projectId)) {
      const state = this.projects.get(projectId)!;
      state.lastAccessed = Date.now();
      return state;
    }

    const historyManager = createActionHistoryManager(projectId, {
      maxSize: this.config.maxHistorySize,
      enableCompression: this.config.enableCompression,
      enableMetadata: this.config.enableMetadata,
      autoCleanup: this.config.autoCleanup
    });

    const checkpointManager = createCheckpointManager(projectId, {
      maxCheckpoints: this.config.maxCheckpoints,
      autoSaveInterval: this.config.autoSaveInterval,
      enableCompression: this.config.enableCompression,
      enableMetadata: this.config.enableMetadata
    });

    const projectState: ProjectHistoryState = {
      projectId,
      timelineState: this.createInitialTimelineState(initialState),
      historyManager,
      checkpointManager,
      lastAccessed: Date.now(),
      isActive: false
    };

    this.projects.set(projectId, projectState);
    return projectState;
  }

  /**
   * Switch to a different project
   */
  switchToProject(projectId: string): ProjectHistoryState {
    // Deactivate current project
    if (this.currentProjectId && this.projects.has(this.currentProjectId)) {
      const currentState = this.projects.get(this.currentProjectId)!;
      currentState.isActive = false;
      currentState.lastAccessed = Date.now();
    }

    // Initialize or get target project
    const targetState = this.initializeProject(projectId);
    targetState.isActive = true;
    this.currentProjectId = projectId;

    return targetState;
  }

  /**
   * Get current project state
   */
  getCurrentProject(): ProjectHistoryState | null {
    if (!this.currentProjectId) return null;
    return this.projects.get(this.currentProjectId) || null;
  }

  /**
   * Get project state by ID
   */
  getProject(projectId: string): ProjectHistoryState | null {
    return this.projects.get(projectId) || null;
  }

  /**
   * Update timeline state for current project
   */
  updateTimelineState(updates: Partial<TimelineState>): void {
    const currentProject = this.getCurrentProject();
    if (!currentProject) return;

    currentProject.timelineState = {
      ...currentProject.timelineState,
      ...updates
    };
    currentProject.lastAccessed = Date.now();
  }

  /**
   * Get timeline state for current project
   */
  getTimelineState(): TimelineState | null {
    const currentProject = this.getCurrentProject();
    return currentProject?.timelineState || null;
  }

  /**
   * Add action to history for current project
   */
  addToHistory(action: ActionHistoryItem): void {
    const currentProject = this.getCurrentProject();
    if (!currentProject?.historyManager) return;

    currentProject.historyManager.addAction(
      action.type,
      action.description,
      action.state,
      action.metadata
    );
    currentProject.lastAccessed = Date.now();
  }

  /**
   * Get action history for current project
   */
  getActionHistory(): ActionHistoryItem[] {
    const currentProject = this.getCurrentProject();
    return currentProject?.historyManager?.getAllActions() || [];
  }

  /**
   * Save checkpoint for current project
   */
  saveCheckpoint(description: string, isAutoSave: boolean = false): string | null {
    const currentProject = this.getCurrentProject();
    if (!currentProject?.checkpointManager) return null;

    const checkpoint = currentProject.checkpointManager.createCheckpoint(
      currentProject.timelineState,
      description,
      isAutoSave
    );
    
    currentProject.lastAccessed = Date.now();
    return checkpoint.id;
  }

  /**
   * Restore checkpoint for current project
   */
  restoreCheckpoint(checkpointId: string): boolean {
    const currentProject = this.getCurrentProject();
    if (!currentProject?.checkpointManager) return false;

    const checkpoint = currentProject.checkpointManager.getCheckpoint(checkpointId);
    if (!checkpoint) return false;

    currentProject.timelineState = checkpoint.state;
    currentProject.lastAccessed = Date.now();
    return true;
  }

  /**
   * Get checkpoints for current project
   */
  getCheckpoints(): Checkpoint[] {
    const currentProject = this.getCurrentProject();
    return currentProject?.checkpointManager?.getAllCheckpoints() || [];
  }

  /**
   * Clear history for current project
   */
  clearHistory(): void {
    const currentProject = this.getCurrentProject();
    if (!currentProject?.historyManager) return;

    currentProject.historyManager.clearHistory();
    currentProject.lastAccessed = Date.now();
  }

  /**
   * Clear checkpoints for current project
   */
  clearCheckpoints(): void {
    const currentProject = this.getCurrentProject();
    if (!currentProject?.checkpointManager) return;

    currentProject.checkpointManager.clearAllCheckpoints();
    currentProject.lastAccessed = Date.now();
  }

  /**
   * Remove project and clean up resources
   */
  removeProject(projectId: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    // Clean up managers
    if (project.historyManager) {
      project.historyManager.clearHistory();
    }
    if (project.checkpointManager) {
      project.checkpointManager.clearAllCheckpoints();
    }

    this.projects.delete(projectId);

    // If this was the current project, clear current
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }
  }

  /**
   * Get statistics for all projects
   */
  getAllProjectStats(): ProjectHistoryStats[] {
    return Array.from(this.projects.values()).map(project => ({
      projectId: project.projectId,
      historySize: project.historyManager?.getAllActions().length || 0,
      checkpointCount: project.checkpointManager?.getAllCheckpoints().length || 0,
      memoryUsage: this.calculateMemoryUsage(project),
      lastAccessed: project.lastAccessed,
      isActive: project.isActive
    }));
  }

  /**
   * Get statistics for current project
   */
  getCurrentProjectStats(): ProjectHistoryStats | null {
    const currentProject = this.getCurrentProject();
    if (!currentProject) return null;

    return {
      projectId: currentProject.projectId,
      historySize: currentProject.historyManager?.getAllActions().length || 0,
      checkpointCount: currentProject.checkpointManager?.getAllCheckpoints().length || 0,
      memoryUsage: this.calculateMemoryUsage(currentProject),
      lastAccessed: currentProject.lastAccessed,
      isActive: currentProject.isActive
    };
  }

  /**
   * Export project history
   */
  exportProjectHistory(projectId: string): string | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const exportData = {
      projectId: project.projectId,
      exportedAt: new Date().toISOString(),
      timelineState: project.timelineState,
      actionHistory: project.historyManager?.getAllActions() || [],
      checkpoints: project.checkpointManager?.getAllCheckpoints() || [],
      stats: this.getCurrentProjectStats()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import project history
   */
  importProjectHistory(projectId: string, data: string): boolean {
    try {
      const importData = JSON.parse(data);
      
      if (importData.projectId !== projectId) {
        console.warn('Project ID mismatch in import data');
        return false;
      }

      const project = this.initializeProject(projectId);
      
      if (importData.timelineState) {
        project.timelineState = importData.timelineState;
      }
      
      if (importData.actionHistory && project.historyManager) {
        importData.actionHistory.forEach((action: ActionHistoryItem) => {
          project.historyManager!.addAction(
            action.type,
            action.description,
            action.state,
            action.metadata
          );
        });
      }
      
      if (importData.checkpoints && project.checkpointManager) {
        importData.checkpoints.forEach((checkpoint: Checkpoint) => {
          project.checkpointManager!.createCheckpoint(
            checkpoint.state,
            checkpoint.description,
            checkpoint.isAutoSave
          );
        });
      }

      project.lastAccessed = Date.now();
      return true;
    } catch (error) {
      console.error('Failed to import project history:', error);
      return false;
    }
  }

  /**
   * Create initial timeline state
   */
  private createInitialTimelineState(initialState?: Partial<TimelineState>): TimelineState {
    return {
      layers: [],
      playheadTime: 0,
      duration: 0,
      zoom: 1,
      markers: [],
      undoStack: [],
      redoStack: [],
      actionHistory: [],
      checkpoints: [],
      lastSavedCheckpoint: null,
      hasUnsavedChanges: false,
      maxHistorySize: this.config.maxHistorySize,
      selectedClips: [],
      isPlaying: false,
      isSnapping: false,
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
      ...initialState
    };
  }

  /**
   * Calculate memory usage for a project
   */
  private calculateMemoryUsage(project: ProjectHistoryState): number {
    try {
      const stateSize = JSON.stringify(project.timelineState).length;
      const historySize = project.historyManager?.getAllActions().reduce((total, action) => {
        return total + JSON.stringify(action).length;
      }, 0) || 0;
      const checkpointSize = project.checkpointManager?.getAllCheckpoints().reduce((total, checkpoint) => {
        return total + JSON.stringify(checkpoint).length;
      }, 0) || 0;
      
      return stateSize + historySize + checkpointSize;
    } catch (error) {
      console.warn('Failed to calculate memory usage:', error);
      return 0;
    }
  }

  /**
   * Start cleanup timer for inactive projects
   */
  private startCleanupTimer(): void {
    if (!this.config.autoCleanup) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

      Array.from(this.projects.keys()).forEach(projectId => {
        const project = this.projects.get(projectId);
        if (project && !project.isActive && (now - project.lastAccessed) > inactiveThreshold) {
          // Clean up inactive project data but keep the project entry
          if (project.historyManager) {
            project.historyManager.clearHistory();
          }
          if (project.checkpointManager) {
            project.checkpointManager.clearAllCheckpoints();
          }
        }
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clean up all projects
    Array.from(this.projects.values()).forEach(project => {
      if (project.historyManager) {
        project.historyManager.clearHistory();
      }
      if (project.checkpointManager) {
        project.checkpointManager.clearAllCheckpoints();
      }
    });

    this.projects.clear();
    this.currentProjectId = null;
  }
}

// Global instance
let globalProjectHistoryManager: ProjectHistoryManager | null = null;

/**
 * Get or create global project history manager
 */
export const getProjectHistoryManager = (config?: Partial<ProjectHistoryConfig>): ProjectHistoryManager => {
  if (!globalProjectHistoryManager) {
    globalProjectHistoryManager = new ProjectHistoryManager(config);
  }
  return globalProjectHistoryManager;
};

/**
 * Create project history manager instance
 */
export const createProjectHistoryManager = (config?: Partial<ProjectHistoryConfig>): ProjectHistoryManager => {
  return new ProjectHistoryManager(config);
};

export default ProjectHistoryManager;
