import { Checkpoint, CheckpointMetadata, TimelineState } from '../types';

/**
 * Checkpoint Manager for Persistent Recovery
 * Handles save checkpoints with localStorage persistence and project-specific management
 */

export interface CheckpointConfig {
  maxCheckpoints: number;
  autoSaveInterval: number; // in milliseconds
  enableCompression: boolean;
  enableMetadata: boolean;
}

export interface CheckpointStats {
  totalCheckpoints: number;
  memoryUsage: number;
  oldestCheckpoint: Date | null;
  newestCheckpoint: Date | null;
  autoSaveCount: number;
  manualSaveCount: number;
}

export class CheckpointManager {
  private projectId: string;
  private config: CheckpointConfig;
  private checkpoints: Checkpoint[] = [];
  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor(projectId: string, config: Partial<CheckpointConfig> = {}) {
    this.projectId = projectId;
    this.config = {
      maxCheckpoints: 10,
      autoSaveInterval: 30000, // 30 seconds
      enableCompression: true,
      enableMetadata: true,
      ...config
    };
    
    this.loadFromStorage();
  }

  /**
   * Create a new checkpoint
   */
  createCheckpoint(
    state: TimelineState,
    description: string,
    isAutoSave: boolean = false
  ): Checkpoint {
    const checkpoint: Checkpoint = {
      id: this.generateCheckpointId(),
      projectId: this.projectId,
      timestamp: Date.now(),
      description,
      isAutoSave,
      state: this.config.enableCompression ? this.compressState(state) : state,
      metadata: this.config.enableMetadata ? this.generateMetadata(state) : {
        version: '1.0',
        actionCount: 0,
        layersCount: 0,
        clipsCount: 0,
        duration: 0
      }
    };

    this.checkpoints.push(checkpoint);

    // Maintain max checkpoints
    if (this.checkpoints.length > this.config.maxCheckpoints) {
      this.checkpoints.shift();
    }

    // Save to localStorage
    this.saveToStorage();

    return checkpoint;
  }

  /**
   * Get checkpoint by ID
   */
  getCheckpoint(id: string): Checkpoint | null {
    return this.checkpoints.find(cp => cp.id === id) || null;
  }

  /**
   * Get all checkpoints
   */
  getAllCheckpoints(): Checkpoint[] {
    return [...this.checkpoints];
  }

  /**
   * Get latest checkpoint
   */
  getLatestCheckpoint(): Checkpoint | null {
    return this.checkpoints.length > 0 ? this.checkpoints[this.checkpoints.length - 1] : null;
  }

  /**
   * Get checkpoints by type (auto/manual)
   */
  getCheckpointsByType(isAutoSave: boolean): Checkpoint[] {
    return this.checkpoints.filter(cp => cp.isAutoSave === isAutoSave);
  }

  /**
   * Get checkpoints within time range
   */
  getCheckpointsInRange(startTime: number, endTime: number): Checkpoint[] {
    return this.checkpoints.filter(cp => 
      cp.timestamp >= startTime && cp.timestamp <= endTime
    );
  }

  /**
   * Restore state from checkpoint
   */
  restoreFromCheckpoint(id: string): TimelineState | null {
    const checkpoint = this.getCheckpoint(id);
    if (checkpoint) {
      return this.config.enableCompression ? 
        this.decompressState(checkpoint.state) : 
        checkpoint.state;
    }
    return null;
  }

  /**
   * Delete checkpoint
   */
  deleteCheckpoint(id: string): boolean {
    const index = this.checkpoints.findIndex(cp => cp.id === id);
    if (index !== -1) {
      this.checkpoints.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Clear all checkpoints
   */
  clearAllCheckpoints(): void {
    this.checkpoints = [];
    this.saveToStorage();
  }

  /**
   * Start auto-save timer
   */
  startAutoSave(getCurrentState: () => TimelineState): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      const currentState = getCurrentState();
      this.createCheckpoint(currentState, 'Auto Save', true);
    }, this.config.autoSaveInterval);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Get checkpoint statistics
   */
  getStats(): CheckpointStats {
    const autoSaveCount = this.checkpoints.filter(cp => cp.isAutoSave).length;
    const manualSaveCount = this.checkpoints.filter(cp => !cp.isAutoSave).length;
    
    // Calculate memory usage (rough estimate)
    const memoryUsage = JSON.stringify(this.checkpoints).length;

    return {
      totalCheckpoints: this.checkpoints.length,
      memoryUsage,
      oldestCheckpoint: this.checkpoints.length > 0 ? new Date(this.checkpoints[0].timestamp) : null,
      newestCheckpoint: this.checkpoints.length > 0 ? new Date(this.checkpoints[this.checkpoints.length - 1].timestamp) : null,
      autoSaveCount,
      manualSaveCount
    };
  }

  /**
   * Export checkpoints for backup
   */
  exportCheckpoints(): string {
    return JSON.stringify({
      projectId: this.projectId,
      config: this.config,
      checkpoints: this.checkpoints,
      exportedAt: Date.now()
    });
  }

  /**
   * Import checkpoints from backup
   */
  importCheckpoints(exportedData: string): boolean {
    try {
      const data = JSON.parse(exportedData);
      if (data.projectId === this.projectId && data.checkpoints) {
        this.checkpoints = data.checkpoints;
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import checkpoints:', error);
      return false;
    }
  }

  /**
   * Search checkpoints by description
   */
  searchCheckpoints(query: string): Checkpoint[] {
    const lowercaseQuery = query.toLowerCase();
    return this.checkpoints.filter(cp => 
      cp.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get storage key for this project
   */
  private getStorageKey(): string {
    return `snipix_checkpoints_${this.projectId}`;
  }

  /**
   * Save checkpoints to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        checkpoints: this.checkpoints,
        lastSaved: Date.now()
      };
      localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save checkpoints to localStorage:', error);
    }
  }

  /**
   * Load checkpoints from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.getStorageKey());
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.checkpoints && Array.isArray(parsed.checkpoints)) {
          this.checkpoints = parsed.checkpoints;
        }
      }
    } catch (error) {
      console.error('Failed to load checkpoints from localStorage:', error);
      this.checkpoints = [];
    }
  }

  /**
   * Generate unique checkpoint ID
   */
  private generateCheckpointId(): string {
    return `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate checkpoint metadata
   */
  private generateMetadata(state: TimelineState): CheckpointMetadata {
    const clipsCount = state.layers.reduce((count, layer) => count + layer.clips.length, 0);
    
    return {
      version: '1.0',
      actionCount: state.actionHistory.length,
      layersCount: state.layers.length,
      clipsCount,
      duration: state.duration
    };
  }

  /**
   * Compress state to reduce memory usage
   */
  private compressState(state: TimelineState): TimelineState {
    if (!this.config.enableCompression) {
      return state;
    }

    // Create a compressed version of the state
    const compressed: TimelineState = {
      ...state,
      layers: state.layers.map(layer => ({
        ...layer,
        clips: layer.clips.map(clip => ({
          id: clip.id,
          type: clip.type,
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.duration,
          originalStartTime: clip.originalStartTime,
          sourcePath: clip.sourcePath,
          content: clip.content,
          properties: clip.properties,
          keyframes: clip.keyframes
        }))
      })),
      // Keep action history but limit size
      actionHistory: state.actionHistory.slice(-20), // Keep last 20 actions
      undoStack: state.undoStack.slice(-10), // Keep last 10 undo states
      redoStack: state.redoStack.slice(-10), // Keep last 10 redo states
    };

    return compressed;
  }

  /**
   * Decompress state (restore full state)
   */
  private decompressState(compressedState: TimelineState): TimelineState {
    if (!this.config.enableCompression) {
      return compressedState;
    }

    // For now, return as-is since compression is minimal
    // In a real implementation, you might need to restore missing fields
    return compressedState;
  }
}

/**
 * Utility functions for checkpoint management
 */

/**
 * Create a new checkpoint manager instance
 */
export const createCheckpointManager = (
  projectId: string, 
  config?: Partial<CheckpointConfig>
): CheckpointManager => {
  return new CheckpointManager(projectId, config);
};

/**
 * Format checkpoint timestamp for display
 */
export const formatCheckpointTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

/**
 * Get checkpoint icon based on type
 */
export const getCheckpointIcon = (isAutoSave: boolean): string => {
  return isAutoSave ? '🤖' : '💾';
};

/**
 * Validate checkpoint
 */
export const validateCheckpoint = (checkpoint: Checkpoint): boolean => {
  return !!(
    checkpoint.id &&
    checkpoint.projectId &&
    typeof checkpoint.timestamp === 'number' &&
    checkpoint.description &&
    checkpoint.state &&
    checkpoint.metadata
  );
};

/**
 * Calculate checkpoint size in bytes
 */
export const calculateCheckpointSize = (checkpoint: Checkpoint): number => {
  return JSON.stringify(checkpoint).length;
};

/**
 * Get checkpoint summary for display
 */
export const getCheckpointSummary = (checkpoint: Checkpoint): string => {
  const { metadata } = checkpoint;
  const parts = [
    `${metadata.layersCount} layers`,
    `${metadata.clipsCount} clips`,
    `${metadata.duration.toFixed(1)}s duration`
  ];
  
  if (metadata.actionCount > 0) {
    parts.push(`${metadata.actionCount} actions`);
  }
  
  return parts.join(', ');
};

export default CheckpointManager;
