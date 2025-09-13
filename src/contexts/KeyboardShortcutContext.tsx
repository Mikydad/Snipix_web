import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { KeyboardShortcut, KeyboardShortcutManager, createTimelineShortcuts } from '../hooks/useKeyboardShortcuts';
import { useUserInteractions } from '../hooks/useUserInteractions';
import { useGestureRecognition } from '../hooks/useGestureRecognition';

interface KeyboardShortcutContextType {
  shortcuts: KeyboardShortcut[];
  addShortcut: (shortcut: KeyboardShortcut) => void;
  removeShortcut: (shortcut: KeyboardShortcut) => void;
  getShortcutsByCategory: (category: string) => KeyboardShortcut[];
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  showShortcuts: () => void;
  hideShortcuts: () => void;
  isShortcutsVisible: boolean;
}

const KeyboardShortcutContext = createContext<KeyboardShortcutContextType | null>(null);

interface KeyboardShortcutProviderProps {
  children: React.ReactNode;
  projectId?: string;
  timelineActions?: {
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
  };
  timelineState?: {
    canUndo: boolean;
    canRedo: boolean;
    isPlaying: boolean;
    hasSelection: boolean;
  };
}

export const KeyboardShortcutProvider: React.FC<KeyboardShortcutProviderProps> = ({
  children,
  projectId,
  timelineActions,
  timelineState = {
    canUndo: false,
    canRedo: false,
    isPlaying: false,
    hasSelection: false
  }
}) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isShortcutsVisible, setIsShortcutsVisible] = useState(false);
  const [manager, setManager] = useState<KeyboardShortcutManager | null>(null);

  // Initialize manager
  useEffect(() => {
    const newManager = new KeyboardShortcutManager({
      enabled: isEnabled,
      ignoreInputs: true,
      debug: process.env.NODE_ENV === 'development'
    });
    setManager(newManager);

    // Set up cleanup
    const cleanup = newManager.attach();
    return cleanup;
  }, []);

  // Add timeline shortcuts if actions are provided
  useEffect(() => {
    if (timelineActions && manager) {
      const timelineShortcuts = createTimelineShortcuts(timelineActions, timelineState);
      
      // Clear existing shortcuts
      manager.clearShortcuts();
      
      // Add timeline shortcuts
      timelineShortcuts.forEach(shortcut => {
        manager.addShortcut(shortcut);
      });

      // Don't update shortcuts state to prevent infinite re-renders
      // setShortcuts(manager.getShortcuts());
    }
  }, [timelineActions, manager]); // Removed timelineState from dependencies to prevent infinite re-renders

  // Update enabled state
  useEffect(() => {
    if (manager) {
      manager.setEnabled(isEnabled);
    }
  }, [isEnabled, manager]);

  // Add shortcut
  const addShortcut = useCallback((shortcut: KeyboardShortcut) => {
    if (manager) {
      manager.addShortcut(shortcut);
      // Don't update shortcuts state here to prevent infinite re-renders
    }
  }, [manager]);

  // Remove shortcut
  const removeShortcut = useCallback((shortcut: KeyboardShortcut) => {
    if (manager) {
      manager.removeShortcut(shortcut);
      // Don't update shortcuts state here to prevent infinite re-renders
    }
  }, [manager]);

  // Get shortcuts by category
  const getShortcutsByCategory = useCallback((category: string) => {
    return shortcuts.filter(shortcut => shortcut.category === category);
  }, [shortcuts]);

  // Show shortcuts
  const showShortcuts = useCallback(() => {
    setIsShortcutsVisible(true);
  }, []);

  // Hide shortcuts
  const hideShortcuts = useCallback(() => {
    setIsShortcutsVisible(false);
  }, []);

  // Set enabled
  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, []);

  const contextValue: KeyboardShortcutContextType = {
    shortcuts,
    addShortcut,
    removeShortcut,
    getShortcutsByCategory,
    isEnabled,
    setEnabled,
    showShortcuts,
    hideShortcuts,
    isShortcutsVisible
  };

  return (
    <KeyboardShortcutContext.Provider value={contextValue}>
      {children}
    </KeyboardShortcutContext.Provider>
  );
};

// Hook to use keyboard shortcuts context
export const useKeyboardShortcutContext = (): KeyboardShortcutContextType => {
  const context = useContext(KeyboardShortcutContext);
  if (!context) {
    throw new Error('useKeyboardShortcutContext must be used within a KeyboardShortcutProvider');
  }
  return context;
};

// Hook for timeline-specific shortcuts
export const useTimelineShortcuts = (
  projectId: string,
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
) => {
  const { addShortcut, removeShortcut, getShortcutsByCategory } = useKeyboardShortcutContext();

  // Add timeline shortcuts
  useEffect(() => {
    const timelineShortcuts = createTimelineShortcuts(actions, state);
    
    timelineShortcuts.forEach(shortcut => {
      addShortcut(shortcut);
    });

    return () => {
      timelineShortcuts.forEach(shortcut => {
        removeShortcut(shortcut);
      });
    };
  }, [actions, state, addShortcut, removeShortcut]);

  return {
    shortcuts: getShortcutsByCategory('Timeline Navigation'),
    undoRedoShortcuts: getShortcutsByCategory('Undo/Redo'),
    saveShortcuts: getShortcutsByCategory('Save Operations'),
    layerShortcuts: getShortcutsByCategory('Layer Operations')
  };
};

// Hook for user interactions
export const useTimelineInteractions = (projectId: string) => {
  const interactions = useUserInteractions({
    enableClickTracking: true,
    enableDragTracking: true,
    enableKeyboardTracking: true,
    enableGestureTracking: true,
    maxInteractions: 100,
    debounceMs: 100
  });

  const gestures = useGestureRecognition({
    swipeThreshold: 50,
    swipeVelocityThreshold: 0.3,
    pinchThreshold: 0.1,
    rotationThreshold: 0.1,
    tapThreshold: 300,
    longPressThreshold: 500,
    doubleTapThreshold: 300,
    panThreshold: 10
  });

  // Add gesture listener for timeline-specific gestures
  useEffect(() => {
    const cleanup = gestures.addGestureListener((gesture) => {
      console.log('Timeline gesture detected:', gesture);
      
      // Handle timeline-specific gestures
      switch (gesture.type) {
        case 'swipe':
          if (gesture.direction === 'left' || gesture.direction === 'right') {
            // Could be used for timeline scrubbing
            console.log('Timeline scrub gesture:', gesture);
          }
          break;
        case 'pinch':
          // Could be used for zoom
          console.log('Timeline zoom gesture:', gesture);
          break;
        case 'doubletap':
          // Could be used for play/pause
          console.log('Timeline play/pause gesture:', gesture);
          break;
        default:
          break;
      }
    });

    return cleanup;
  }, [gestures]);

  return {
    ...interactions,
    ...gestures,
    // Timeline-specific interaction helpers
    trackTimelineClick: (event: MouseEvent) => {
      interactions.handleClick(event, 'timeline');
    },
    trackTimelineDrag: (event: MouseEvent) => {
      interactions.handleDragMove(event, 'timeline');
    },
    trackTimelineKeyboard: (event: KeyboardEvent) => {
      interactions.handleKeyDown(event, 'timeline');
    }
  };
};

export default KeyboardShortcutProvider;
