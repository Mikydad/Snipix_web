/**
 * Change Tracking System for Unsaved Modifications
 * 
 * This module provides comprehensive change tracking to detect unsaved
 * modifications and trigger appropriate recovery actions.
 */

import { TimelineState, ActionHistoryItem, Checkpoint } from '../types';
import { ProjectHistoryManager, getProjectHistoryManager } from './projectHistoryManager';

export interface ChangeTrackingConfig {
  enableRealTimeTracking: boolean;
  enableBatchTracking: boolean;
  trackingInterval: number;
  changeThreshold: number;
  enableCompression: boolean;
  maxChangeHistory: number;
}

export interface ChangeEvent {
  id: string;
  timestamp: number;
  type: 'add' | 'remove' | 'update' | 'move' | 'batch';
  target: 'layer' | 'clip' | 'marker' | 'timeline' | 'multiple';
  targetId: string | string[];
  description: string;
  beforeState: any;
  afterState: any;
  metadata: {
    projectId: string;
    userId?: string;
    sessionId?: string;
    isAutoSave?: boolean;
  };
}

export interface ChangeSummary {
  totalChanges: number;
  unsavedChanges: number;
  lastChangeTime: number;
  changeTypes: Record<string, number>;
  affectedTargets: string[];
  hasCriticalChanges: boolean;
}

export class ChangeTracker {
  private config: ChangeTrackingConfig;
  private projectHistoryManager: ProjectHistoryManager;
  private changeHistory: ChangeEvent[] = [];
  private lastKnownState: TimelineState | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;
  private isTracking = false;
  private sessionId: string;

  constructor(config: Partial<ChangeTrackingConfig> = {}) {
    this.config = {
      enableRealTimeTracking: true,
      enableBatchTracking: true,
      trackingInterval: 2000, // 2 seconds
      changeThreshold: 1,
      enableCompression: true,
      maxChangeHistory: 100,
      ...config
    };

    this.projectHistoryManager = getProjectHistoryManager();
    this.sessionId = this.generateSessionId();
  }

  /**
   * Start change tracking for a project
   */
  startTracking(projectId: string): void {
    if (this.isTracking) return;

    this.isTracking = true;
    
    // Initialize with current state
    this.lastKnownState = this.projectHistoryManager.getTimelineState();
    
    // Start interval tracking
    if (this.config.enableRealTimeTracking) {
      this.trackingInterval = setInterval(() => {
        this.checkForChanges(projectId);
      }, this.config.trackingInterval);
    }
  }

  /**
   * Stop change tracking
   */
  stopTracking(): void {
    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  /**
   * Track a specific change event
   */
  trackChange(
    type: ChangeEvent['type'],
    target: ChangeEvent['target'],
    targetId: string | string[],
    description: string,
    beforeState: any,
    afterState: any,
    metadata: Partial<ChangeEvent['metadata']> = {}
  ): void {
    const changeEvent: ChangeEvent = {
      id: this.generateChangeId(),
      timestamp: Date.now(),
      type,
      target,
      targetId,
      description,
      beforeState: this.config.enableCompression ? this.compressState(beforeState) : beforeState,
      afterState: this.config.enableCompression ? this.compressState(afterState) : afterState,
      metadata: {
        projectId: this.projectHistoryManager.getCurrentProject()?.projectId || '',
        sessionId: this.sessionId,
        ...metadata
      }
    };

    this.changeHistory.push(changeEvent);

    // Maintain max history size
    if (this.changeHistory.length > this.config.maxChangeHistory) {
      this.changeHistory.shift();
    }

    // Update last known state
    this.lastKnownState = this.projectHistoryManager.getTimelineState();
  }

  /**
   * Check for changes between current and last known state
   */
  private checkForChanges(projectId: string): void {
    const currentState = this.projectHistoryManager.getTimelineState();
    
    if (!currentState || !this.lastKnownState) {
      this.lastKnownState = currentState;
      return;
    }

    const changes = this.detectStateChanges(this.lastKnownState, currentState);
    
    if (changes.length > 0) {
      // Track batch changes
      if (this.config.enableBatchTracking && changes.length > 1) {
        this.trackChange(
          'batch',
          'multiple',
          changes.map(c => c.targetId),
          `Batch operation: ${changes.length} changes`,
          this.lastKnownState,
          currentState,
          { projectId }
        );
      } else {
        // Track individual changes
        changes.forEach(change => {
          this.trackChange(
            change.type,
            change.target,
            change.targetId,
            change.description,
            change.beforeState,
            change.afterState,
            { projectId }
          );
        });
      }
    }

    this.lastKnownState = currentState;
  }

  /**
   * Detect changes between two timeline states
   */
  private detectStateChanges(oldState: TimelineState, newState: TimelineState): Array<{
    type: ChangeEvent['type'];
    target: ChangeEvent['target'];
    targetId: string;
    description: string;
    beforeState: any;
    afterState: any;
  }> {
    const changes: Array<{
      type: ChangeEvent['type'];
      target: ChangeEvent['target'];
      targetId: string;
      description: string;
      beforeState: any;
      afterState: any;
    }> = [];

    // Check layers
    const layerChanges = this.detectLayerChanges(oldState.layers, newState.layers);
    changes.push(...layerChanges);

    // Check markers
    const markerChanges = this.detectMarkerChanges(oldState.markers, newState.markers);
    changes.push(...markerChanges);

    // Check timeline properties
    const timelineChanges = this.detectTimelinePropertyChanges(oldState, newState);
    changes.push(...timelineChanges);

    return changes;
  }

  /**
   * Detect changes in layers
   */
  private detectLayerChanges(oldLayers: any[], newLayers: any[]): Array<{
    type: ChangeEvent['type'];
    target: ChangeEvent['target'];
    targetId: string;
    description: string;
    beforeState: any;
    afterState: any;
  }> {
    const changes: Array<{
      type: ChangeEvent['type'];
      target: ChangeEvent['target'];
      targetId: string;
      description: string;
      beforeState: any;
      afterState: any;
    }> = [];

    // Check for added layers
    newLayers.forEach(newLayer => {
      const oldLayer = oldLayers.find(l => l.id === newLayer.id);
      if (!oldLayer) {
        changes.push({
          type: 'add',
          target: 'layer',
          targetId: newLayer.id,
          description: `Added layer: ${newLayer.name}`,
          beforeState: null,
          afterState: newLayer
        });
      }
    });

    // Check for removed layers
    oldLayers.forEach(oldLayer => {
      const newLayer = newLayers.find(l => l.id === oldLayer.id);
      if (!newLayer) {
        changes.push({
          type: 'remove',
          target: 'layer',
          targetId: oldLayer.id,
          description: `Removed layer: ${oldLayer.name}`,
          beforeState: oldLayer,
          afterState: null
        });
      }
    });

    // Check for updated layers
    oldLayers.forEach(oldLayer => {
      const newLayer = newLayers.find(l => l.id === oldLayer.id);
      if (newLayer && JSON.stringify(oldLayer) !== JSON.stringify(newLayer)) {
        changes.push({
          type: 'update',
          target: 'layer',
          targetId: oldLayer.id,
          description: `Updated layer: ${oldLayer.name}`,
          beforeState: oldLayer,
          afterState: newLayer
        });
      }
    });

    return changes;
  }

  /**
   * Detect changes in markers
   */
  private detectMarkerChanges(oldMarkers: any[], newMarkers: any[]): Array<{
    type: ChangeEvent['type'];
    target: ChangeEvent['target'];
    targetId: string;
    description: string;
    beforeState: any;
    afterState: any;
  }> {
    const changes: Array<{
      type: ChangeEvent['type'];
      target: ChangeEvent['target'];
      targetId: string;
      description: string;
      beforeState: any;
      afterState: any;
    }> = [];

    // Check for added markers
    newMarkers.forEach(newMarker => {
      const oldMarker = oldMarkers.find(m => m.id === newMarker.id);
      if (!oldMarker) {
        changes.push({
          type: 'add',
          target: 'marker',
          targetId: newMarker.id,
          description: `Added marker: ${newMarker.name}`,
          beforeState: null,
          afterState: newMarker
        });
      }
    });

    // Check for removed markers
    oldMarkers.forEach(oldMarker => {
      const newMarker = newMarkers.find(m => m.id === oldMarker.id);
      if (!newMarker) {
        changes.push({
          type: 'remove',
          target: 'marker',
          targetId: oldMarker.id,
          description: `Removed marker: ${oldMarker.name}`,
          beforeState: oldMarker,
          afterState: null
        });
      }
    });

    // Check for updated markers
    oldMarkers.forEach(oldMarker => {
      const newMarker = newMarkers.find(m => m.id === oldMarker.id);
      if (newMarker && JSON.stringify(oldMarker) !== JSON.stringify(newMarker)) {
        changes.push({
          type: 'update',
          target: 'marker',
          targetId: oldMarker.id,
          description: `Updated marker: ${oldMarker.name}`,
          beforeState: oldMarker,
          afterState: newMarker
        });
      }
    });

    return changes;
  }

  /**
   * Detect changes in timeline properties
   */
  private detectTimelinePropertyChanges(oldState: TimelineState, newState: TimelineState): Array<{
    type: ChangeEvent['type'];
    target: ChangeEvent['target'];
    targetId: string;
    description: string;
    beforeState: any;
    afterState: any;
  }> {
    const changes: Array<{
      type: ChangeEvent['type'];
      target: ChangeEvent['target'];
      targetId: string;
      description: string;
      beforeState: any;
      afterState: any;
    }> = [];

    const properties = ['playheadTime', 'duration', 'zoom'] as const;

    properties.forEach(prop => {
      if (oldState[prop] !== newState[prop]) {
        changes.push({
          type: 'update',
          target: 'timeline',
          targetId: prop,
          description: `Updated ${prop}: ${oldState[prop]} → ${newState[prop]}`,
          beforeState: { [prop]: oldState[prop] },
          afterState: { [prop]: newState[prop] }
        });
      }
    });

    return changes;
  }

  /**
   * Get change summary
   */
  getChangeSummary(): ChangeSummary {
    const now = Date.now();
    const recentChanges = this.changeHistory.filter(
      change => now - change.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    const changeTypes: Record<string, number> = {};
    const affectedTargets: string[] = [];

    this.changeHistory.forEach(change => {
      changeTypes[change.type] = (changeTypes[change.type] || 0) + 1;
      
      if (Array.isArray(change.targetId)) {
        affectedTargets.push(...change.targetId);
      } else {
        affectedTargets.push(change.targetId);
      }
    });

    const hasCriticalChanges = recentChanges.some(change => 
      change.type === 'remove' || 
      change.target === 'timeline' ||
      change.description.includes('batch')
    );

    return {
      totalChanges: this.changeHistory.length,
      unsavedChanges: recentChanges.length,
      lastChangeTime: this.changeHistory.length > 0 ? this.changeHistory[this.changeHistory.length - 1].timestamp : 0,
      changeTypes,
      affectedTargets: Array.from(new Set(affectedTargets)),
      hasCriticalChanges
    };
  }

  /**
   * Get recent changes
   */
  getRecentChanges(count: number = 10): ChangeEvent[] {
    return this.changeHistory.slice(-count);
  }

  /**
   * Clear change history
   */
  clearHistory(): void {
    this.changeHistory = [];
  }

  /**
   * Compress state for storage
   */
  private compressState(state: any): any {
    if (!this.config.enableCompression) return state;
    
    try {
      return JSON.parse(JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to compress state:', error);
      return state;
    }
  }

  /**
   * Generate unique change ID
   */
  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopTracking();
    this.changeHistory = [];
    this.lastKnownState = null;
  }
}

// Global instance
let globalChangeTracker: ChangeTracker | null = null;

/**
 * Get or create global change tracker
 */
export const getChangeTracker = (config?: Partial<ChangeTrackingConfig>): ChangeTracker => {
  if (!globalChangeTracker) {
    globalChangeTracker = new ChangeTracker(config);
  }
  return globalChangeTracker;
};

/**
 * Create change tracker instance
 */
export const createChangeTracker = (config?: Partial<ChangeTrackingConfig>): ChangeTracker => {
  return new ChangeTracker(config);
};

export default ChangeTracker;
