import { useCallback, useRef, useEffect, useState } from 'react';
import { ActionType } from '../types';

export interface UserInteraction {
  id: string;
  type: 'click' | 'drag' | 'keyboard' | 'gesture' | 'voice';
  timestamp: number;
  data: any;
  context?: string;
}

export interface InteractionConfig {
  enableClickTracking: boolean;
  enableDragTracking: boolean;
  enableKeyboardTracking: boolean;
  enableGestureTracking: boolean;
  enableVoiceTracking: boolean;
  maxInteractions: number;
  debounceMs: number;
}

export interface DragInteraction {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  distance: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'none';
  velocity: number;
  duration: number;
}

export interface ClickInteraction {
  x: number;
  y: number;
  button: number;
  target: string;
  doubleClick: boolean;
  context: string;
}

export interface KeyboardInteraction {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  duration: number;
  sequence: string[];
}

export class UserInteractionManager {
  private interactions: UserInteraction[] = [];
  private config: InteractionConfig;
  private listeners: Set<(interaction: UserInteraction) => void> = new Set();
  private dragState: {
    isDragging: boolean;
    startTime: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
  } | null = null;
  private clickState: {
    lastClick: number;
    clickCount: number;
  } = { lastClick: 0, clickCount: 0 };

  constructor(config: Partial<InteractionConfig> = {}) {
    this.config = {
      enableClickTracking: true,
      enableDragTracking: true,
      enableKeyboardTracking: true,
      enableGestureTracking: false,
      enableVoiceTracking: false,
      maxInteractions: 100,
      debounceMs: 100,
      ...config
    };
  }

  addInteraction(interaction: UserInteraction): void {
    this.interactions.push(interaction);
    
    // Maintain max interactions
    if (this.interactions.length > this.config.maxInteractions) {
      this.interactions.shift();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(interaction));
  }

  addListener(listener: (interaction: UserInteraction) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Click tracking
  trackClick = (event: MouseEvent, context: string = ''): void => {
    if (!this.config.enableClickTracking) return;

    const now = Date.now();
    const isDoubleClick = now - this.clickState.lastClick < 300;
    
    if (isDoubleClick) {
      this.clickState.clickCount++;
    } else {
      this.clickState.clickCount = 1;
    }

    this.clickState.lastClick = now;

    const interaction: UserInteraction = {
      id: `click_${now}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'click',
      timestamp: now,
      data: {
        x: event.clientX,
        y: event.clientY,
        button: event.button,
        target: (event.target as HTMLElement)?.tagName || 'unknown',
        doubleClick: isDoubleClick,
        context
      } as ClickInteraction,
      context
    };

    this.addInteraction(interaction);
  };

  // Drag tracking
  startDrag = (event: MouseEvent | TouchEvent, context: string = ''): void => {
    if (!this.config.enableDragTracking) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    this.dragState = {
      isDragging: true,
      startTime: Date.now(),
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
      lastTime: Date.now()
    };
  };

  updateDrag = (event: MouseEvent | TouchEvent, context: string = ''): void => {
    if (!this.dragState?.isDragging || !this.config.enableDragTracking) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    const now = Date.now();

    const deltaX = clientX - this.dragState.startX;
    const deltaY = clientY - this.dragState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = now - this.dragState.startTime;
    const velocity = distance / (duration / 1000);

    // Determine direction
    let direction: DragInteraction['direction'] = 'none';
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const interaction: UserInteraction = {
      id: `drag_${now}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'drag',
      timestamp: now,
      data: {
        startX: this.dragState.startX,
        startY: this.dragState.startY,
        currentX: clientX,
        currentY: clientY,
        deltaX,
        deltaY,
        distance,
        direction,
        velocity,
        duration
      } as DragInteraction,
      context
    };

    this.addInteraction(interaction);

    // Update drag state
    this.dragState.lastX = clientX;
    this.dragState.lastY = clientY;
    this.dragState.lastTime = now;
  };

  endDrag = (event: MouseEvent | TouchEvent, context: string = ''): void => {
    if (!this.dragState?.isDragging) return;

    this.updateDrag(event, context);
    this.dragState.isDragging = false;
  };

  // Keyboard tracking
  trackKeyboard = (event: KeyboardEvent, context: string = ''): void => {
    if (!this.config.enableKeyboardTracking) return;

    const interaction: UserInteraction = {
      id: `keyboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'keyboard',
      timestamp: Date.now(),
      data: {
        key: event.key,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        duration: 0, // Could be enhanced to track key hold duration
        sequence: [] // Could be enhanced to track key sequences
      } as KeyboardInteraction,
      context
    };

    this.addInteraction(interaction);
  };

  // Gesture tracking (for touch devices)
  trackGesture = (event: TouchEvent, context: string = ''): void => {
    if (!this.config.enableGestureTracking) return;

    const touches = event.touches;
    if (touches.length === 0) return;

    const interaction: UserInteraction = {
      id: `gesture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'gesture',
      timestamp: Date.now(),
      data: {
        touchCount: touches.length,
        touches: Array.from(touches).map(touch => ({
          x: touch.clientX,
          y: touch.clientY,
          identifier: touch.identifier
        })),
        scale: 1, // TouchEvent doesn't have scale property
        rotation: 0 // TouchEvent doesn't have rotation property
      },
      context
    };

    this.addInteraction(interaction);
  };

  // Get interactions
  getInteractions(): UserInteraction[] {
    return [...this.interactions];
  }

  getInteractionsByType(type: UserInteraction['type']): UserInteraction[] {
    return this.interactions.filter(i => i.type === type);
  }

  getInteractionsByContext(context: string): UserInteraction[] {
    return this.interactions.filter(i => i.context === context);
  }

  getRecentInteractions(count: number = 10): UserInteraction[] {
    return this.interactions.slice(-count);
  }

  clearInteractions(): void {
    this.interactions = [];
  }

  // Analytics helpers
  getClickHeatmap(): { x: number; y: number; count: number }[] {
    const clicks = this.getInteractionsByType('click');
    const heatmap = new Map<string, { x: number; y: number; count: number }>();

    clicks.forEach(click => {
      const data = click.data as ClickInteraction;
      const key = `${Math.floor(data.x / 50) * 50},${Math.floor(data.y / 50) * 50}`;
      
      if (heatmap.has(key)) {
        heatmap.get(key)!.count++;
      } else {
        heatmap.set(key, { x: data.x, y: data.y, count: 1 });
      }
    });

    return Array.from(heatmap.values());
  }

  getMostUsedKeys(): { key: string; count: number }[] {
    const keyboard = this.getInteractionsByType('keyboard');
    const keyCounts = new Map<string, number>();

    keyboard.forEach(kb => {
      const data = kb.data as KeyboardInteraction;
      const key = data.key;
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    });

    return Array.from(keyCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }

  getDragPatterns(): { direction: string; count: number; avgDistance: number }[] {
    const drags = this.getInteractionsByType('drag');
    const patterns = new Map<string, { count: number; totalDistance: number }>();

    drags.forEach(drag => {
      const data = drag.data as DragInteraction;
      const direction = data.direction;
      
      if (patterns.has(direction)) {
        const pattern = patterns.get(direction)!;
        pattern.count++;
        pattern.totalDistance += data.distance;
      } else {
        patterns.set(direction, { count: 1, totalDistance: data.distance });
      }
    });

    return Array.from(patterns.entries())
      .map(([direction, data]) => ({
        direction,
        count: data.count,
        avgDistance: data.totalDistance / data.count
      }))
      .sort((a, b) => b.count - a.count);
  }
}

// Hook for using user interactions in React components
export const useUserInteractions = (config: Partial<InteractionConfig> = {}) => {
  const managerRef = useRef<UserInteractionManager | null>(null);
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);

  // Initialize manager
  if (!managerRef.current) {
    managerRef.current = new UserInteractionManager(config);
  }

  // Set up listener to update state
  useEffect(() => {
    const cleanup = managerRef.current?.addListener((interaction) => {
      setInteractions(prev => [...prev.slice(-99), interaction]);
    });

    return cleanup;
  }, []);

  // Event handlers
  const handleClick = useCallback((event: MouseEvent, context?: string) => {
    managerRef.current?.trackClick(event, context);
  }, []);

  const handleDragStart = useCallback((event: MouseEvent | TouchEvent, context?: string) => {
    managerRef.current?.startDrag(event, context);
  }, []);

  const handleDragMove = useCallback((event: MouseEvent | TouchEvent, context?: string) => {
    managerRef.current?.updateDrag(event, context);
  }, []);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent, context?: string) => {
    managerRef.current?.endDrag(event, context);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent, context?: string) => {
    managerRef.current?.trackKeyboard(event, context);
  }, []);

  const handleTouch = useCallback((event: TouchEvent, context?: string) => {
    managerRef.current?.trackGesture(event, context);
  }, []);

  // Analytics helpers
  const getClickHeatmap = useCallback(() => {
    return managerRef.current?.getClickHeatmap() || [];
  }, []);

  const getMostUsedKeys = useCallback(() => {
    return managerRef.current?.getMostUsedKeys() || [];
  }, []);

  const getDragPatterns = useCallback(() => {
    return managerRef.current?.getDragPatterns() || [];
  }, []);

  const getInteractionsByType = useCallback((type: UserInteraction['type']) => {
    return managerRef.current?.getInteractionsByType(type) || [];
  }, []);

  const getInteractionsByContext = useCallback((context: string) => {
    return managerRef.current?.getInteractionsByContext(context) || [];
  }, []);

  const clearInteractions = useCallback(() => {
    managerRef.current?.clearInteractions();
    setInteractions([]);
  }, []);

  return {
    interactions,
    handleClick,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleKeyDown,
    handleTouch,
    getClickHeatmap,
    getMostUsedKeys,
    getDragPatterns,
    getInteractionsByType,
    getInteractionsByContext,
    clearInteractions,
    manager: managerRef.current
  };
};

export default UserInteractionManager;

