/**
 * Navigation Guard for Unsaved Changes
 * 
 * This module provides comprehensive navigation protection to prevent
 * accidental loss of unsaved changes during navigation.
 */

import { TimelineState, Checkpoint } from '../types';
import { getPageRecoveryManager } from './pageRecoveryManager';
import { getChangeTracker } from './changeTracker';

export interface NavigationGuardConfig {
  enableBeforeUnload: boolean;
  enableRouteChange: boolean;
  enableBrowserNavigation: boolean;
  warningMessage: string;
  confirmationMessage: string;
  autoSaveOnNavigation: boolean;
  maxUnsavedTime: number; // Maximum time to keep unsaved changes (in ms)
}

export interface NavigationEvent {
  type: 'beforeunload' | 'routechange' | 'browsernavigation';
  target: string;
  timestamp: number;
  hasUnsavedChanges: boolean;
  canProceed: boolean;
}

export class NavigationGuard {
  private config: NavigationGuardConfig;
  private pageRecoveryManager: any;
  private changeTracker: any;
  private isActive = false;
  private navigationListeners: Array<(event: NavigationEvent) => void> = [];
  private unsavedChangesStartTime: number | null = null;

  constructor(config: Partial<NavigationGuardConfig> = {}) {
    this.config = {
      enableBeforeUnload: true,
      enableRouteChange: true,
      enableBrowserNavigation: true,
      warningMessage: 'You have unsaved changes. Are you sure you want to leave?',
      confirmationMessage: 'Your changes will be lost if you leave this page.',
      autoSaveOnNavigation: true,
      maxUnsavedTime: 30 * 60 * 1000, // 30 minutes
      ...config
    };

    this.pageRecoveryManager = getPageRecoveryManager();
    this.changeTracker = getChangeTracker();
  }

  /**
   * Activate navigation guard
   */
  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.setupEventListeners();
  }

  /**
   * Deactivate navigation guard
   */
  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.removeEventListeners();
  }

  /**
   * Check if navigation should be allowed
   */
  canNavigate(target: string): boolean {
    const hasUnsavedChanges = this.hasUnsavedChanges();
    
    if (!hasUnsavedChanges) {
      return true;
    }

    // Check if unsaved changes are too old
    if (this.unsavedChangesStartTime) {
      const unsavedTime = Date.now() - this.unsavedChangesStartTime;
      if (unsavedTime > this.config.maxUnsavedTime) {
        console.warn('Unsaved changes are too old, allowing navigation');
        return true;
      }
    }

    // Check if target is safe (e.g., same project)
    if (this.isSafeNavigation(target)) {
      return true;
    }

    return false;
  }

  /**
   * Request navigation permission
   */
  requestNavigationPermission(target: string): Promise<boolean> {
    return new Promise((resolve) => {
      const hasUnsavedChanges = this.hasUnsavedChanges();
      
      if (!hasUnsavedChanges) {
        resolve(true);
        return;
      }

      // Show confirmation dialog
      const confirmed = window.confirm(this.config.confirmationMessage);
      
      if (confirmed) {
        // Auto-save if enabled
        if (this.config.autoSaveOnNavigation) {
          this.performAutoSave();
        }
        
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Before unload (page refresh/close)
    if (this.config.enableBeforeUnload) {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    // Browser navigation (back/forward)
    if (this.config.enableBrowserNavigation) {
      window.addEventListener('popstate', this.handleBrowserNavigation);
    }

    // Route change (for SPA navigation)
    if (this.config.enableRouteChange) {
      this.setupRouteChangeListener();
    }

    // Page visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('popstate', this.handleBrowserNavigation);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Handle before unload event
   */
  private handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    const hasUnsavedChanges = this.hasUnsavedChanges();
    
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = this.config.warningMessage;
      
      // Notify listeners
      this.notifyListeners({
        type: 'beforeunload',
        target: window.location.href,
        timestamp: Date.now(),
        hasUnsavedChanges: true,
        canProceed: false
      });
    }
  };

  /**
   * Handle browser navigation
   */
  private handleBrowserNavigation = (event: PopStateEvent): void => {
    const hasUnsavedChanges = this.hasUnsavedChanges();
    
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(this.config.confirmationMessage);
      
      if (!confirmed) {
        // Prevent navigation by pushing current state back
        window.history.pushState(null, '', window.location.href);
        
        this.notifyListeners({
          type: 'browsernavigation',
          target: window.location.href,
          timestamp: Date.now(),
          hasUnsavedChanges: true,
          canProceed: false
        });
      } else {
        this.notifyListeners({
          type: 'browsernavigation',
          target: window.location.href,
          timestamp: Date.now(),
          hasUnsavedChanges: true,
          canProceed: true
        });
      }
    }
  };

  /**
   * Handle visibility change
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden && this.hasUnsavedChanges()) {
      // Page is being hidden, save recovery data
      this.performAutoSave();
    }
  };

  /**
   * Setup route change listener for SPA
   */
  private setupRouteChangeListener(): void {
    // This would integrate with React Router or other SPA routing
    // For now, we'll use a custom event system
    
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      window.dispatchEvent(new CustomEvent('routechange', { 
        detail: { type: 'pushstate', url: args[2] } 
      }));
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      window.dispatchEvent(new CustomEvent('routechange', { 
        detail: { type: 'replacestate', url: args[2] } 
      }));
    };

    window.addEventListener('routechange', this.handleRouteChange as EventListener);
  }

  /**
   * Handle route change
   */
  private handleRouteChange = (event: Event): void => {
    const customEvent = event as CustomEvent;
    const { url } = customEvent.detail;
    const hasUnsavedChanges = this.hasUnsavedChanges();
    
    if (hasUnsavedChanges) {
      this.requestNavigationPermission(url).then(canProceed => {
        if (!canProceed) {
          // Prevent route change
          event.preventDefault();
        }
        
        this.notifyListeners({
          type: 'routechange',
          target: url,
          timestamp: Date.now(),
          hasUnsavedChanges: true,
          canProceed
        });
      });
    }
  };

  /**
   * Check if there are unsaved changes
   */
  private hasUnsavedChanges(): boolean {
    try {
      const recoveryState = this.pageRecoveryManager.getRecoveryState();
      const changeSummary = this.changeTracker.getChangeSummary();
      
      return recoveryState.hasUnsavedChanges || changeSummary.unsavedChanges > 0;
    } catch (error) {
      console.warn('Failed to check unsaved changes:', error);
      return false;
    }
  }

  /**
   * Check if navigation target is safe
   */
  private isSafeNavigation(target: string): boolean {
    // Define safe navigation patterns
    const safePatterns = [
      /^\/timeline\/[^\/]+$/, // Same project timeline
      /^\/projects$/, // Projects list
      /^\/profile$/, // User profile
      /^\/settings$/ // Settings
    ];

    return safePatterns.some(pattern => pattern.test(target));
  }

  /**
   * Perform auto-save
   */
  private performAutoSave(): void {
    try {
      const currentProject = this.pageRecoveryManager.getCurrentProject();
      if (currentProject) {
        this.pageRecoveryManager.performAutoSave(currentProject.projectId);
        this.unsavedChangesStartTime = null;
      }
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  }

  /**
   * Mark unsaved changes start time
   */
  markUnsavedChanges(): void {
    if (!this.unsavedChangesStartTime) {
      this.unsavedChangesStartTime = Date.now();
    }
  }

  /**
   * Clear unsaved changes
   */
  clearUnsavedChanges(): void {
    this.unsavedChangesStartTime = null;
  }

  /**
   * Add navigation listener
   */
  addNavigationListener(listener: (event: NavigationEvent) => void): void {
    this.navigationListeners.push(listener);
  }

  /**
   * Remove navigation listener
   */
  removeNavigationListener(listener: (event: NavigationEvent) => void): void {
    const index = this.navigationListeners.indexOf(listener);
    if (index > -1) {
      this.navigationListeners.splice(index, 1);
    }
  }

  /**
   * Notify listeners
   */
  private notifyListeners(event: NavigationEvent): void {
    this.navigationListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn('Navigation listener error:', error);
      }
    });
  }

  /**
   * Get navigation guard status
   */
  getStatus(): {
    isActive: boolean;
    hasUnsavedChanges: boolean;
    unsavedChangesStartTime: number | null;
    config: NavigationGuardConfig;
  } {
    return {
      isActive: this.isActive,
      hasUnsavedChanges: this.hasUnsavedChanges(),
      unsavedChangesStartTime: this.unsavedChangesStartTime,
      config: { ...this.config }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<NavigationGuardConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.deactivate();
    this.navigationListeners = [];
    this.unsavedChangesStartTime = null;
  }
}

// Global instance
let globalNavigationGuard: NavigationGuard | null = null;

/**
 * Get or create global navigation guard
 */
export const getNavigationGuard = (config?: Partial<NavigationGuardConfig>): NavigationGuard => {
  if (!globalNavigationGuard) {
    globalNavigationGuard = new NavigationGuard(config);
  }
  return globalNavigationGuard;
};

/**
 * Create navigation guard instance
 */
export const createNavigationGuard = (config?: Partial<NavigationGuardConfig>): NavigationGuard => {
  return new NavigationGuard(config);
};

export default NavigationGuard;
