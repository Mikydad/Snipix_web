import { ActionHistoryItem, ActionType, ActionMetadata, TimelineState } from '../types';

/**
 * Action History Management System
 * Provides utilities for managing action history with circular buffer and smart state tracking
 */

export interface ActionHistoryConfig {
  maxSize: number;
  enableCompression: boolean;
  enableMetadata: boolean;
  autoCleanup: boolean;
}

export interface ActionHistoryStats {
  totalActions: number;
  memoryUsage: number;
  oldestAction: Date | null;
  newestAction: Date | null;
  actionTypes: Record<ActionType, number>;
}

export class ActionHistoryManager {
  private history: ActionHistoryItem[] = [];
  private config: ActionHistoryConfig;
  private projectId: string;

  constructor(projectId: string, config: Partial<ActionHistoryConfig> = {}) {
    this.projectId = projectId;
    this.config = {
      maxSize: 50,
      enableCompression: true,
      enableMetadata: true,
      autoCleanup: true,
      ...config
    };
  }

  /**
   * Add a new action to the history
   */
  addAction(
    type: ActionType,
    description: string,
    state: Partial<TimelineState>,
    metadata?: Partial<ActionMetadata>
  ): ActionHistoryItem {
    const actionItem: ActionHistoryItem = {
      id: this.generateActionId(),
      type,
      description,
      timestamp: Date.now(),
      state: this.config.enableCompression ? this.compressState(state) : state,
      metadata: this.config.enableMetadata ? {
        projectId: this.projectId,
        isCheckpoint: false,
        ...metadata
      } : undefined
    };

    this.history.push(actionItem);

    // Auto cleanup if enabled
    if (this.config.autoCleanup && this.history.length > this.config.maxSize) {
      this.cleanup();
    }

    return actionItem;
  }

  /**
   * Get all actions
   */
  getAllActions(): ActionHistoryItem[] {
    return [...this.history];
  }

  /**
   * Get the most recent action
   */
  getLastAction(): ActionHistoryItem | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Get action by ID
   */
  getActionById(id: string): ActionHistoryItem | null {
    return this.history.find(action => action.id === id) || null;
  }

  /**
   * Get actions by type
   */
  getActionsByType(type: ActionType): ActionHistoryItem[] {
    return this.history.filter(action => action.type === type);
  }

  /**
   * Get actions within time range
   */
  getActionsInRange(startTime: number, endTime: number): ActionHistoryItem[] {
    return this.history.filter(action => 
      action.timestamp >= startTime && action.timestamp <= endTime
    );
  }

  /**
   * Get recent actions (last N actions)
   */
  getRecentActions(count: number): ActionHistoryItem[] {
    return this.history.slice(-count);
  }

  /**
   * Remove action by ID
   */
  removeAction(id: string): boolean {
    const index = this.history.findIndex(action => action.id === id);
    if (index !== -1) {
      this.history.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all actions
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Cleanup old actions to maintain max size
   */
  cleanup(): void {
    if (this.history.length > this.config.maxSize) {
      const removeCount = this.history.length - this.config.maxSize;
      this.history.splice(0, removeCount);
    }
  }

  /**
   * Get history statistics
   */
  getStats(): ActionHistoryStats {
    const actionTypes: Record<ActionType, number> = {} as Record<ActionType, number>;
    
    // Initialize all action types to 0
    const allTypes: ActionType[] = [
      'addLayer', 'removeLayer', 'updateLayer', 'reorderLayers',
      'addClip', 'removeClip', 'updateClip', 'moveClip', 'trimClip',
      'splitClip', 'mergeClips', 'setPlayheadTime', 'setDuration',
      'setZoom', 'addMarker', 'removeMarker', 'updateMarker',
      'saveCheckpoint', 'restoreCheckpoint', 'batchOperation'
    ];
    
    allTypes.forEach(type => {
      actionTypes[type] = 0;
    });

    // Count actions by type
    this.history.forEach(action => {
      actionTypes[action.type]++;
    });

    // Calculate memory usage (rough estimate)
    const memoryUsage = JSON.stringify(this.history).length;

    return {
      totalActions: this.history.length,
      memoryUsage,
      oldestAction: this.history.length > 0 ? new Date(this.history[0].timestamp) : null,
      newestAction: this.history.length > 0 ? new Date(this.history[this.history.length - 1].timestamp) : null,
      actionTypes
    };
  }

  /**
   * Export history for backup/restore
   */
  exportHistory(): string {
    return JSON.stringify({
      projectId: this.projectId,
      config: this.config,
      history: this.history,
      exportedAt: Date.now()
    });
  }

  /**
   * Import history from backup
   */
  importHistory(exportedData: string): boolean {
    try {
      const data = JSON.parse(exportedData);
      if (data.projectId === this.projectId && data.history) {
        this.history = data.history;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import action history:', error);
      return false;
    }
  }

  /**
   * Search actions by description or metadata
   */
  searchActions(query: string): ActionHistoryItem[] {
    const lowercaseQuery = query.toLowerCase();
    return this.history.filter(action => 
      action.description.toLowerCase().includes(lowercaseQuery) ||
      action.metadata?.affectedLayers?.some(layer => 
        layer.toLowerCase().includes(lowercaseQuery)
      ) ||
      action.metadata?.affectedClips?.some(clip => 
        clip.toLowerCase().includes(lowercaseQuery)
      )
    );
  }

  /**
   * Get actions that affected specific layers
   */
  getActionsForLayers(layerIds: string[]): ActionHistoryItem[] {
    return this.history.filter(action => 
      action.metadata?.affectedLayers?.some(layerId => 
        layerIds.includes(layerId)
      )
    );
  }

  /**
   * Get actions that affected specific clips
   */
  getActionsForClips(clipIds: string[]): ActionHistoryItem[] {
    return this.history.filter(action => 
      action.metadata?.affectedClips?.some(clipId => 
        clipIds.includes(clipId)
      )
    );
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Compress state to reduce memory usage
   */
  private compressState(state: Partial<TimelineState>): Partial<TimelineState> {
    if (!this.config.enableCompression) {
      return state;
    }

    // Only keep essential fields and remove redundant data
    const compressed: Partial<TimelineState> = {};
    
    if (state.layers) {
      compressed.layers = state.layers.map(layer => ({
        ...layer,
        // Remove unnecessary fields for compression
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
      }));
    }

    // Keep other essential fields
    if (state.playheadTime !== undefined) compressed.playheadTime = state.playheadTime;
    if (state.duration !== undefined) compressed.duration = state.duration;
    if (state.zoom !== undefined) compressed.zoom = state.zoom;
    if (state.markers) compressed.markers = state.markers;
    if (state.selectedClips) compressed.selectedClips = state.selectedClips;
    if (state.selectedLayer !== undefined) compressed.selectedLayer = state.selectedLayer;

    return compressed;
  }
}

/**
 * Utility functions for action history management
 */

/**
 * Create a new action history manager instance
 */
export const createActionHistoryManager = (
  projectId: string, 
  config?: Partial<ActionHistoryConfig>
): ActionHistoryManager => {
  return new ActionHistoryManager(projectId, config);
};

/**
 * Generate action description based on type and context
 */
export const generateActionDescription = (
  type: ActionType,
  context: Record<string, any> = {}
): string => {
  const descriptions: Record<ActionType, (ctx: Record<string, any>) => string> = {
    addLayer: (ctx) => `Add Layer: ${ctx.name || 'New Layer'}`,
    removeLayer: (ctx) => `Remove Layer: ${ctx.layerId || 'Unknown'}`,
    updateLayer: (ctx) => `Update Layer: ${ctx.layerId || 'Unknown'}`,
    reorderLayers: (ctx) => `Reorder Layers`,
    addClip: (ctx) => `Add Clip to Layer: ${ctx.layerId || 'Unknown'}`,
    removeClip: (ctx) => `Remove Clip: ${ctx.clipId || 'Unknown'}`,
    updateClip: (ctx) => `Update Clip: ${ctx.clipId || 'Unknown'}`,
    moveClip: (ctx) => `Move Clip: ${ctx.clipId || 'Unknown'}`,
    trimClip: (ctx) => `Trim Clip: ${ctx.clipId || 'Unknown'}`,
    splitClip: (ctx) => `Split Clip: ${ctx.clipId || 'Unknown'}`,
    mergeClips: (ctx) => `Merge Clips`,
    setPlayheadTime: (ctx) => `Set Playhead: ${ctx.time || 0}s`,
    setDuration: (ctx) => `Set Duration: ${ctx.duration || 0}s`,
    setZoom: (ctx) => `Set Zoom: ${ctx.zoom || 1}x`,
    addMarker: (ctx) => `Add Marker: ${ctx.label || 'New Marker'}`,
    removeMarker: (ctx) => `Remove Marker: ${ctx.markerId || 'Unknown'}`,
    updateMarker: (ctx) => `Update Marker: ${ctx.markerId || 'Unknown'}`,
    saveCheckpoint: (ctx) => `Save Checkpoint: ${ctx.description || 'Manual Save'}`,
    restoreCheckpoint: (ctx) => `Restore Checkpoint: ${ctx.checkpointId || 'Unknown'}`,
    batchOperation: (ctx) => `Batch Operation: ${ctx.description || 'Multiple Changes'}`,
    undo: (ctx) => `Undo: ${ctx.description || 'Previous Action'}`,
    redo: (ctx) => `Redo: ${ctx.description || 'Next Action'}`,
    saveState: (ctx) => `Save State: ${ctx.description || 'Current State'}`,
    projectSwitch: (ctx) => `Switch Project: ${ctx.projectId || 'Unknown'}`
  };

  return descriptions[type]?.(context) || `Action: ${type}`;
};

/**
 * Validate action history item
 */
export const validateActionHistoryItem = (item: ActionHistoryItem): boolean => {
  return !!(
    item.id &&
    item.type &&
    item.description &&
    typeof item.timestamp === 'number' &&
    item.state
  );
};

/**
 * Format action timestamp for display
 */
export const formatActionTimestamp = (timestamp: number): string => {
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
 * Get action icon based on type
 */
export const getActionIcon = (type: ActionType): string => {
  const icons: Record<ActionType, string> = {
    addLayer: '➕',
    removeLayer: '➖',
    updateLayer: '✏️',
    reorderLayers: '🔄',
    addClip: '📎',
    removeClip: '🗑️',
    updateClip: '✏️',
    moveClip: '↔️',
    trimClip: '✂️',
    splitClip: '✂️',
    mergeClips: '🔗',
    setPlayheadTime: '⏯️',
    setDuration: '⏱️',
    setZoom: '🔍',
    addMarker: '📍',
    removeMarker: '🗑️',
    updateMarker: '✏️',
    saveCheckpoint: '💾',
    restoreCheckpoint: '🔄',
    batchOperation: '📦',
    undo: '↩️',
    redo: '↪️',
    saveState: '💾',
    projectSwitch: '🔄'
  };

  return icons[type] || '📝';
};

export default ActionHistoryManager;
