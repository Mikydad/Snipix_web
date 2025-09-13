/**
 * Page Recovery System for Unsaved Changes
 * 
 * This module provides comprehensive recovery functionality for page reloads,
 * navigation, and unsaved changes detection.
 */

import { TimelineState, Checkpoint, ActionHistoryItem } from '../types';
import { ProjectHistoryManager, getProjectHistoryManager } from './projectHistoryManager';

export interface RecoveryState {
  hasUnsavedChanges: boolean;
  lastSavedCheckpoint: Checkpoint | null;
  lastActionTimestamp: number;
  autoSaveEnabled: boolean;
  recoveryData: {
    timelineState: TimelineState | null;
    actionHistory: ActionHistoryItem[];
    checkpoints: Checkpoint[];
  } | null;
}

export interface RecoveryOptions {
  restoreCheckpoint: boolean;
  discardChanges: boolean;
  continueEditing: boolean;
  autoSave: boolean;
}

export interface PageRecoveryConfig {
  enableAutoRecovery: boolean;
  enableChangeTracking: boolean;
  enableNavigationWarnings: boolean;
  autoSaveInterval: number;
  maxRecoveryAttempts: number;
  recoveryTimeout: number;
}

export class PageRecoveryManager {
  private config: PageRecoveryConfig;
  private recoveryState: RecoveryState;
  private projectHistoryManager: ProjectHistoryManager;
  private changeTrackingInterval: NodeJS.Timeout | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private lastKnownState: TimelineState | null = null;
  private isInitialized = false;

  constructor(config: Partial<PageRecoveryConfig> = {}) {
    this.config = {
      enableAutoRecovery: true,
      enableChangeTracking: true,
      enableNavigationWarnings: true,
      autoSaveInterval: 30000, // 30 seconds
      maxRecoveryAttempts: 3,
      recoveryTimeout: 10000, // 10 seconds
      ...config
    };

    this.recoveryState = {
      hasUnsavedChanges: false,
      lastSavedCheckpoint: null,
      lastActionTimestamp: 0,
      autoSaveEnabled: true,
      recoveryData: null
    };

    this.projectHistoryManager = getProjectHistoryManager();
    this.setupEventListeners();
  }

  /**
   * Initialize recovery system for a project
   */
  initialize(projectId: string): void {
    if (this.isInitialized) return;

    this.isInitialized = true;
    
    // Check for existing recovery data
    this.checkForRecoveryData(projectId);
    
    // Start change tracking
    if (this.config.enableChangeTracking) {
      this.startChangeTracking(projectId);
    }
    
    // Start auto-save
    if (this.config.enableAutoRecovery) {
      this.startAutoSave(projectId);
    }
  }

  /**
   * Check for recovery data on page load
   */
  private checkForRecoveryData(projectId: string): void {
    try {
      const recoveryKey = `snipix_recovery_${projectId}`;
      const recoveryData = localStorage.getItem(recoveryKey);
      
      if (recoveryData) {
        const parsed = JSON.parse(recoveryData);
        
        // Check if recovery data is recent (within last 24 hours)
        const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
        
        if (isRecent) {
          this.recoveryState.recoveryData = parsed.data;
          this.recoveryState.hasUnsavedChanges = true;
          
          // Trigger recovery dialog
          this.triggerRecoveryDialog(projectId);
        } else {
          // Clean up old recovery data
          localStorage.removeItem(recoveryKey);
        }
      }
    } catch (error) {
      console.warn('Failed to check recovery data:', error);
    }
  }

  /**
   * Start change tracking for unsaved changes detection
   */
  private startChangeTracking(projectId: string): void {
    this.changeTrackingInterval = setInterval(() => {
      const currentState = this.projectHistoryManager.getTimelineState();
      
      if (currentState && this.lastKnownState) {
        const hasChanges = this.detectChanges(this.lastKnownState, currentState);
        
        if (hasChanges) {
          this.recoveryState.hasUnsavedChanges = true;
          this.recoveryState.lastActionTimestamp = Date.now();
          
          // Save recovery data
          this.saveRecoveryData(projectId, currentState);
        }
      }
      
      // Update last known state
      if (currentState) {
        this.lastKnownState = { ...currentState };
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Start auto-save functionality
   */
  private startAutoSave(projectId: string): void {
    this.autoSaveInterval = setInterval(() => {
      if (this.recoveryState.hasUnsavedChanges && this.recoveryState.autoSaveEnabled) {
        this.performAutoSave(projectId);
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * Detect changes between two timeline states
   */
  private detectChanges(oldState: TimelineState, newState: TimelineState): boolean {
    // Check for changes in critical properties
    const criticalProps: (keyof TimelineState)[] = [
      'layers', 'playheadTime', 'duration', 'zoom', 'markers',
      'undoStack', 'redoStack', 'actionHistory', 'checkpoints'
    ];

    for (const prop of criticalProps) {
      if (JSON.stringify(oldState[prop]) !== JSON.stringify(newState[prop])) {
        return true;
      }
    }

    return false;
  }

  /**
   * Save recovery data to localStorage
   */
  private saveRecoveryData(projectId: string, timelineState: TimelineState): void {
    try {
      const recoveryKey = `snipix_recovery_${projectId}`;
      const recoveryData = {
        timestamp: Date.now(),
        projectId,
        data: {
          timelineState,
          actionHistory: this.projectHistoryManager.getActionHistory(),
          checkpoints: this.projectHistoryManager.getCheckpoints()
        }
      };

      localStorage.setItem(recoveryKey, JSON.stringify(recoveryData));
    } catch (error) {
      console.warn('Failed to save recovery data:', error);
    }
  }

  /**
   * Perform auto-save
   */
  private performAutoSave(projectId: string): void {
    try {
      const checkpointId = this.projectHistoryManager.saveCheckpoint('Auto Save', true);
      
      if (checkpointId) {
        this.recoveryState.hasUnsavedChanges = false;
        this.clearRecoveryData(projectId);
        
        console.log('Auto-save completed successfully');
      }
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  }

  /**
   * Clear recovery data
   */
  private clearRecoveryData(projectId: string): void {
    try {
      const recoveryKey = `snipix_recovery_${projectId}`;
      localStorage.removeItem(recoveryKey);
      this.recoveryState.recoveryData = null;
    } catch (error) {
      console.warn('Failed to clear recovery data:', error);
    }
  }

  /**
   * Trigger recovery dialog
   */
  private triggerRecoveryDialog(projectId: string): void {
    // This will be handled by the RecoveryDialog component
    // For now, we'll dispatch a custom event
    const event = new CustomEvent('snipix:recovery-needed', {
      detail: {
        projectId,
        recoveryData: this.recoveryState.recoveryData,
        options: this.getRecoveryOptions()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Get available recovery options
   */
  private getRecoveryOptions(): RecoveryOptions {
    return {
      restoreCheckpoint: this.recoveryState.lastSavedCheckpoint !== null,
      discardChanges: true,
      continueEditing: true,
      autoSave: this.recoveryState.autoSaveEnabled
    };
  }

  /**
   * Handle recovery action
   */
  handleRecovery(projectId: string, action: 'restore' | 'discard' | 'continue'): void {
    switch (action) {
      case 'restore':
        this.restoreFromCheckpoint(projectId);
        break;
      case 'discard':
        this.discardChanges(projectId);
        break;
      case 'continue':
        this.continueEditing(projectId);
        break;
    }
  }

  /**
   * Restore from last checkpoint
   */
  private restoreFromCheckpoint(projectId: string): void {
    try {
      if (this.recoveryState.lastSavedCheckpoint) {
        const success = this.projectHistoryManager.restoreCheckpoint(
          this.recoveryState.lastSavedCheckpoint.id
        );
        
        if (success) {
          this.recoveryState.hasUnsavedChanges = false;
          this.clearRecoveryData(projectId);
          console.log('Successfully restored from checkpoint');
        }
      }
    } catch (error) {
      console.error('Failed to restore from checkpoint:', error);
    }
  }

  /**
   * Discard unsaved changes
   */
  private discardChanges(projectId: string): void {
    try {
      this.recoveryState.hasUnsavedChanges = false;
      this.clearRecoveryData(projectId);
      
      // Clear current project history
      this.projectHistoryManager.clearHistory();
      this.projectHistoryManager.clearCheckpoints();
      
      console.log('Changes discarded successfully');
    } catch (error) {
      console.error('Failed to discard changes:', error);
    }
  }

  /**
   * Continue editing with current state
   */
  private continueEditing(projectId: string): void {
    try {
      if (this.recoveryState.recoveryData) {
        // Restore the recovery data to current state
        const { timelineState, actionHistory, checkpoints } = this.recoveryState.recoveryData;
        
        // Update project history manager with recovery data
        if (timelineState) {
          this.projectHistoryManager.updateTimelineState(timelineState);
        }
        
        // Restore action history
        actionHistory.forEach(action => {
          this.projectHistoryManager.addToHistory(action);
        });
        
        // Restore checkpoints
        checkpoints.forEach(checkpoint => {
          this.projectHistoryManager.saveCheckpoint(
            checkpoint.description,
            checkpoint.isAutoSave
          );
        });
        
        this.recoveryState.hasUnsavedChanges = false;
        this.clearRecoveryData(projectId);
        
        console.log('Continuing with recovered state');
      }
    } catch (error) {
      console.error('Failed to continue editing:', error);
    }
  }

  /**
   * Setup event listeners for page unload and navigation
   */
  private setupEventListeners(): void {
    // Handle page unload
    window.addEventListener('beforeunload', (event) => {
      if (this.recoveryState.hasUnsavedChanges && this.config.enableNavigationWarnings) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    });

    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.recoveryState.hasUnsavedChanges) {
        // Page is being hidden, save recovery data
        const currentProjectId = this.projectHistoryManager.getCurrentProject()?.projectId;
        if (currentProjectId) {
          const currentState = this.projectHistoryManager.getTimelineState();
          if (currentState) {
            this.saveRecoveryData(currentProjectId, currentState);
          }
        }
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      if (this.recoveryState.hasUnsavedChanges && this.config.enableNavigationWarnings) {
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to navigate away?'
        );
        
        if (!confirmed) {
          // Prevent navigation
          event.preventDefault();
          window.history.pushState(null, '', window.location.href);
        }
      }
    });
  }

  /**
   * Get current recovery state
   */
  getRecoveryState(): RecoveryState {
    return { ...this.recoveryState };
  }

  /**
   * Update recovery state
   */
  updateRecoveryState(updates: Partial<RecoveryState>): void {
    this.recoveryState = { ...this.recoveryState, ...updates };
  }

  /**
   * Check if recovery is needed
   */
  isRecoveryNeeded(): boolean {
    return this.recoveryState.hasUnsavedChanges && this.recoveryState.recoveryData !== null;
  }

  /**
   * Get recovery data
   */
  getRecoveryData(): RecoveryState['recoveryData'] {
    return this.recoveryState.recoveryData;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.changeTrackingInterval) {
      clearInterval(this.changeTrackingInterval);
      this.changeTrackingInterval = null;
    }
    
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    this.isInitialized = false;
  }
}

// Global instance
let globalPageRecoveryManager: PageRecoveryManager | null = null;

/**
 * Get or create global page recovery manager
 */
export const getPageRecoveryManager = (config?: Partial<PageRecoveryConfig>): PageRecoveryManager => {
  if (!globalPageRecoveryManager) {
    globalPageRecoveryManager = new PageRecoveryManager(config);
  }
  return globalPageRecoveryManager;
};

/**
 * Create page recovery manager instance
 */
export const createPageRecoveryManager = (config?: Partial<PageRecoveryConfig>): PageRecoveryManager => {
  return new PageRecoveryManager(config);
};

export default PageRecoveryManager;
