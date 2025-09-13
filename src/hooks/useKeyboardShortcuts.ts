import { useEffect, useCallback, useRef } from 'react';
import { ActionType } from '../types';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  category: string;
  action: () => void;
  enabled?: () => boolean;
  preventDefault?: boolean;
}

export interface KeyboardShortcutConfig {
  shortcuts: KeyboardShortcut[];
  enabled: boolean;
  ignoreInputs?: boolean;
  debug?: boolean;
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled: boolean = true;
  private ignoreInputs: boolean = true;
  private debug: boolean = false;
  private listeners: Set<(shortcut: KeyboardShortcut) => void> = new Set();

  constructor(config: Partial<KeyboardShortcutConfig> = {}) {
    this.enabled = config.enabled ?? true;
    this.ignoreInputs = config.ignoreInputs ?? true;
    this.debug = config.debug ?? false;
  }

  addShortcut(shortcut: KeyboardShortcut): void {
    const key = this.generateKey(shortcut);
    this.shortcuts.set(key, shortcut);
    
    if (this.debug) {
      // console.log(`Added keyboard shortcut: ${key} - ${shortcut.description}`); // Disabled excessive logging
    }
  }

  removeShortcut(shortcut: KeyboardShortcut): void {
    const key = this.generateKey(shortcut);
    this.shortcuts.delete(key);
  }

  clearShortcuts(): void {
    this.shortcuts.clear();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  addListener(listener: (shortcut: KeyboardShortcut) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private generateKey(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push('ctrl');
    if (shortcut.shiftKey) modifiers.push('shift');
    if (shortcut.altKey) modifiers.push('alt');
    if (shortcut.metaKey) modifiers.push('meta');
    
    return `${modifiers.join('+')}+${shortcut.key.toLowerCase()}`;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    // Ignore input fields if configured
    if (this.ignoreInputs) {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.contentEditable === 'true' ||
          target.isContentEditable) {
        return;
      }
    }

    const key = this.generateKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      description: '',
      category: '',
      action: () => {}
    });

    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      // Check if shortcut is enabled
      if (shortcut.enabled && !shortcut.enabled()) {
        return;
      }

      // Prevent default if configured
      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }

      // Execute action
      try {
        shortcut.action();
        
        // Notify listeners
        this.listeners.forEach(listener => listener(shortcut));
        
        if (this.debug) {
          console.log(`Executed keyboard shortcut: ${key} - ${shortcut.description}`);
        }
      } catch (error) {
        console.error(`Error executing keyboard shortcut ${key}:`, error);
      }
    }
  };

  attach(): () => void {
    document.addEventListener('keydown', this.handleKeyDown);
    return () => document.removeEventListener('keydown', this.handleKeyDown);
  }

  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }
}

// Hook for using keyboard shortcuts in React components
export const useKeyboardShortcuts = (config: Partial<KeyboardShortcutConfig>) => {
  const managerRef = useRef<KeyboardShortcutManager | null>(null);
  const shortcutsRef = useRef<KeyboardShortcut[]>([]);

  // Initialize manager
  if (!managerRef.current) {
    managerRef.current = new KeyboardShortcutManager(config);
  }

  // Update shortcuts when config changes
  useEffect(() => {
    if (config.shortcuts) {
      shortcutsRef.current = config.shortcuts;
      managerRef.current?.clearShortcuts();
      config.shortcuts.forEach(shortcut => {
        managerRef.current?.addShortcut(shortcut);
      });
    }
  }, [config.shortcuts]);

  // Update enabled state
  useEffect(() => {
    if (config.enabled !== undefined) {
      managerRef.current?.setEnabled(config.enabled);
    }
  }, [config.enabled]);

  // Attach/detach event listeners
  useEffect(() => {
    const cleanup = managerRef.current?.attach();
    return cleanup;
  }, []);

  // Add shortcut helper
  const addShortcut = useCallback((shortcut: KeyboardShortcut) => {
    managerRef.current?.addShortcut(shortcut);
  }, []);

  // Remove shortcut helper
  const removeShortcut = useCallback((shortcut: KeyboardShortcut) => {
    managerRef.current?.removeShortcut(shortcut);
  }, []);

  // Get shortcuts helper
  const getShortcuts = useCallback(() => {
    return managerRef.current?.getShortcuts() || [];
  }, []);

  // Get shortcuts by category helper
  const getShortcutsByCategory = useCallback((category: string) => {
    return managerRef.current?.getShortcutsByCategory(category) || [];
  }, []);

  return {
    addShortcut,
    removeShortcut,
    getShortcuts,
    getShortcutsByCategory,
    manager: managerRef.current
  };
};

// Predefined shortcut sets for common operations
export const createTimelineShortcuts = (
  actions: {
    undo: () => void;
    redo: () => void;
    save: () => void;
    saveAs: () => void;
    playPause: () => void;
    stop: () => void;
    goToStart: () => void;
    goToEnd: () => void;
    stepForward: () => void;
    stepBackward: () => void;
    addVideoLayer: () => void;
    addAudioLayer: () => void;
    addTextLayer: () => void;
    deleteSelected: () => void;
    showShortcuts: () => void;
    focusSearch: () => void;
  },
  state: {
    canUndo: boolean;
    canRedo: boolean;
    isPlaying: boolean;
    hasSelection: boolean;
  }
): KeyboardShortcut[] => {
  return [
    // Undo/Redo
    {
      key: 'z',
      ctrlKey: true,
      description: 'Undo last action',
      category: 'Undo/Redo',
      action: actions.undo,
      enabled: () => state.canUndo
    },
    {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      description: 'Redo last undone action',
      category: 'Undo/Redo',
      action: actions.redo,
      enabled: () => state.canRedo
    },
    {
      key: 'y',
      ctrlKey: true,
      description: 'Redo last undone action (alternative)',
      category: 'Undo/Redo',
      action: actions.redo,
      enabled: () => state.canRedo
    },

    // Save Operations
    {
      key: 's',
      ctrlKey: true,
      description: 'Quick save',
      category: 'Save Operations',
      action: actions.save
    },
    {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      description: 'Save as...',
      category: 'Save Operations',
      action: actions.saveAs
    },

    // Timeline Navigation
    {
      key: ' ',
      description: 'Play/Pause',
      category: 'Timeline Navigation',
      action: actions.playPause
    },
    {
      key: 'Escape',
      description: 'Stop',
      category: 'Timeline Navigation',
      action: actions.stop
    },
    {
      key: 'Home',
      description: 'Go to beginning',
      category: 'Timeline Navigation',
      action: actions.goToStart
    },
    {
      key: 'End',
      description: 'Go to end',
      category: 'Timeline Navigation',
      action: actions.goToEnd
    },
    {
      key: 'ArrowRight',
      description: 'Step forward',
      category: 'Timeline Navigation',
      action: actions.stepForward
    },
    {
      key: 'ArrowLeft',
      description: 'Step backward',
      category: 'Timeline Navigation',
      action: actions.stepBackward
    },

    // Layer Operations
    {
      key: 'v',
      ctrlKey: true,
      shiftKey: true,
      description: 'Add video layer',
      category: 'Layer Operations',
      action: actions.addVideoLayer
    },
    {
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
      description: 'Add audio layer',
      category: 'Layer Operations',
      action: actions.addAudioLayer
    },
    {
      key: 't',
      ctrlKey: true,
      shiftKey: true,
      description: 'Add text layer',
      category: 'Layer Operations',
      action: actions.addTextLayer
    },
    {
      key: 'Delete',
      description: 'Delete selected layer/clip',
      category: 'Layer Operations',
      action: actions.deleteSelected,
      enabled: () => state.hasSelection
    },

    // General
    {
      key: '/',
      ctrlKey: true,
      description: 'Show keyboard shortcuts',
      category: 'General',
      action: actions.showShortcuts
    },
    {
      key: 'k',
      ctrlKey: true,
      description: 'Focus search',
      category: 'General',
      action: actions.focusSearch
    }
  ];
};

export default KeyboardShortcutManager;

