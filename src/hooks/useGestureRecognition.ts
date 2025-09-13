import { useCallback, useRef, useEffect } from 'react';

export interface Gesture {
  id: string;
  type: 'swipe' | 'pinch' | 'rotate' | 'tap' | 'longpress' | 'doubletap' | 'pan';
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  velocity?: number;
  duration?: number;
  scale?: number;
  rotation?: number;
  center?: { x: number; y: number };
  timestamp: number;
}

export interface GestureConfig {
  swipeThreshold: number;
  swipeVelocityThreshold: number;
  pinchThreshold: number;
  rotationThreshold: number;
  tapThreshold: number;
  longPressThreshold: number;
  doubleTapThreshold: number;
  panThreshold: number;
}

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

export class GestureRecognizer {
  private config: GestureConfig;
  private listeners: Set<(gesture: Gesture) => void> = new Set();
  private touchPoints: Map<number, TouchPoint> = new Map();
  private gestureState: {
    isTracking: boolean;
    startTime: number;
    startPoints: TouchPoint[];
    lastPoints: TouchPoint[];
    lastGestureTime: number;
    tapCount: number;
    longPressTimer: NodeJS.Timeout | null;
  } = {
    isTracking: false,
    startTime: 0,
    startPoints: [],
    lastPoints: [],
    lastGestureTime: 0,
    tapCount: 0,
    longPressTimer: null
  };

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = {
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.3,
      pinchThreshold: 0.1,
      rotationThreshold: 0.1,
      tapThreshold: 300,
      longPressThreshold: 500,
      doubleTapThreshold: 300,
      panThreshold: 10,
      ...config
    };
  }

  addListener(listener: (gesture: Gesture) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(gesture: Gesture): void {
    this.listeners.forEach(listener => listener(gesture));
  }

  private getCenter(points: TouchPoint[]): { x: number; y: number } {
    if (points.length === 0) return { x: 0, y: 0 };
    
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 });

    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  }

  private getDistance(point1: TouchPoint, point2: TouchPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getAngle(point1: TouchPoint, point2: TouchPoint): number {
    return Math.atan2(point2.y - point1.y, point2.x - point1.x);
  }

  private getDirection(start: TouchPoint, end: TouchPoint): Gesture['direction'] {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  private detectSwipe(points: TouchPoint[]): Gesture | null {
    if (points.length < 2) return null;

    const start = points[0];
    const end = points[points.length - 1];
    const distance = this.getDistance(start, end);
    const duration = end.timestamp - start.timestamp;
    const velocity = distance / duration;

    if (distance >= this.config.swipeThreshold && velocity >= this.config.swipeVelocityThreshold) {
      return {
        id: `swipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'swipe',
        direction: this.getDirection(start, end),
        distance,
        velocity,
        duration,
        center: this.getCenter(points),
        timestamp: Date.now()
      };
    }

    return null;
  }

  private detectPinch(points: TouchPoint[]): Gesture | null {
    if (points.length !== 2) return null;

    const startDistance = this.getDistance(points[0], points[1]);
    const endDistance = this.getDistance(
      { ...points[0], timestamp: points[points.length - 1].timestamp },
      points[points.length - 1]
    );

    const scale = endDistance / startDistance;
    const scaleChange = Math.abs(scale - 1);

    if (scaleChange >= this.config.pinchThreshold) {
      return {
        id: `pinch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'pinch',
        scale,
        center: this.getCenter(points),
        timestamp: Date.now()
      };
    }

    return null;
  }

  private detectRotation(points: TouchPoint[]): Gesture | null {
    if (points.length !== 2) return null;

    const startAngle = this.getAngle(points[0], points[1]);
    const endAngle = this.getAngle(
      { ...points[0], timestamp: points[points.length - 1].timestamp },
      points[points.length - 1]
    );

    const rotation = endAngle - startAngle;
    const rotationDegrees = (rotation * 180) / Math.PI;

    if (Math.abs(rotationDegrees) >= this.config.rotationThreshold) {
      return {
        id: `rotate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'rotate',
        rotation: rotationDegrees,
        center: this.getCenter(points),
        timestamp: Date.now()
      };
    }

    return null;
  }

  private detectTap(points: TouchPoint[]): Gesture | null {
    if (points.length !== 1) return null;

    const point = points[0];
    const duration = Date.now() - point.timestamp;

    if (duration <= this.config.tapThreshold) {
      return {
        id: `tap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'tap',
        center: { x: point.x, y: point.y },
        duration,
        timestamp: Date.now()
      };
    }

    return null;
  }

  private detectPan(points: TouchPoint[]): Gesture | null {
    if (points.length < 2) return null;

    const start = points[0];
    const end = points[points.length - 1];
    const distance = this.getDistance(start, end);

    if (distance >= this.config.panThreshold) {
      return {
        id: `pan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'pan',
        direction: this.getDirection(start, end),
        distance,
        center: this.getCenter(points),
        timestamp: Date.now()
      };
    }

    return null;
  }

  handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();

    // Clear any existing long press timer
    if (this.gestureState.longPressTimer) {
      clearTimeout(this.gestureState.longPressTimer);
      this.gestureState.longPressTimer = null;
    }

    // Add new touch points
    Array.from(event.changedTouches).forEach(touch => {
      const point: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      };
      this.touchPoints.set(touch.identifier, point);
    });

    this.gestureState.isTracking = true;
    this.gestureState.startTime = Date.now();
    this.gestureState.startPoints = Array.from(this.touchPoints.values());
    this.gestureState.lastPoints = Array.from(this.touchPoints.values());

    // Set up long press detection
    if (this.touchPoints.size === 1) {
      this.gestureState.longPressTimer = setTimeout(() => {
        const gesture: Gesture = {
          id: `longpress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'longpress',
          center: this.getCenter(this.gestureState.startPoints),
          duration: Date.now() - this.gestureState.startTime,
          timestamp: Date.now()
        };
        this.notifyListeners(gesture);
      }, this.config.longPressThreshold);
    }
  };

  handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();

    if (!this.gestureState.isTracking) return;

    // Update touch points
    Array.from(event.changedTouches).forEach(touch => {
      const point = this.touchPoints.get(touch.identifier);
      if (point) {
        point.x = touch.clientX;
        point.y = touch.clientY;
        point.timestamp = Date.now();
      }
    });

    this.gestureState.lastPoints = Array.from(this.touchPoints.values());

    // Detect continuous gestures
    const currentPoints = Array.from(this.touchPoints.values());
    
    // Detect pan
    const panGesture = this.detectPan(currentPoints);
    if (panGesture) {
      this.notifyListeners(panGesture);
    }

    // Detect pinch
    if (currentPoints.length === 2) {
      const pinchGesture = this.detectPinch(currentPoints);
      if (pinchGesture) {
        this.notifyListeners(pinchGesture);
      }

      const rotationGesture = this.detectRotation(currentPoints);
      if (rotationGesture) {
        this.notifyListeners(rotationGesture);
      }
    }
  };

  handleTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();

    // Clear long press timer
    if (this.gestureState.longPressTimer) {
      clearTimeout(this.gestureState.longPressTimer);
      this.gestureState.longPressTimer = null;
    }

    // Remove ended touch points
    Array.from(event.changedTouches).forEach(touch => {
      this.touchPoints.delete(touch.identifier);
    });

    if (this.touchPoints.size === 0) {
      this.gestureState.isTracking = false;
      
      // Detect final gestures
      const finalPoints = this.gestureState.lastPoints;
      
      // Detect swipe
      const swipeGesture = this.detectSwipe(finalPoints);
      if (swipeGesture) {
        this.notifyListeners(swipeGesture);
        return;
      }

      // Detect tap
      if (finalPoints.length === 1) {
        const tapGesture = this.detectTap(finalPoints);
        if (tapGesture) {
          // Check for double tap
          const now = Date.now();
          if (now - this.gestureState.lastGestureTime <= this.config.doubleTapThreshold) {
            this.gestureState.tapCount++;
            if (this.gestureState.tapCount === 2) {
              const doubleTapGesture: Gesture = {
                id: `doubletap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'doubletap',
                center: tapGesture.center,
                timestamp: Date.now()
              };
              this.notifyListeners(doubleTapGesture);
              this.gestureState.tapCount = 0;
              return;
            }
          } else {
            this.gestureState.tapCount = 1;
          }
          
          this.notifyListeners(tapGesture);
          this.gestureState.lastGestureTime = now;
        }
      }
    }
  };

  handleTouchCancel = (event: TouchEvent): void => {
    event.preventDefault();
    
    // Clear long press timer
    if (this.gestureState.longPressTimer) {
      clearTimeout(this.gestureState.longPressTimer);
      this.gestureState.longPressTimer = null;
    }

    // Remove cancelled touch points
    Array.from(event.changedTouches).forEach(touch => {
      this.touchPoints.delete(touch.identifier);
    });

    if (this.touchPoints.size === 0) {
      this.gestureState.isTracking = false;
    }
  };
}

// Hook for using gesture recognition in React components
export const useGestureRecognition = (config: Partial<GestureConfig> = {}) => {
  const recognizerRef = useRef<GestureRecognizer | null>(null);

  // Initialize recognizer
  if (!recognizerRef.current) {
    recognizerRef.current = new GestureRecognizer(config);
  }

  // Set up event listeners
  useEffect(() => {
    const recognizer = recognizerRef.current;
    if (!recognizer) return;

    const handleTouchStart = (e: TouchEvent) => recognizer.handleTouchStart(e);
    const handleTouchMove = (e: TouchEvent) => recognizer.handleTouchMove(e);
    const handleTouchEnd = (e: TouchEvent) => recognizer.handleTouchEnd(e);
    const handleTouchCancel = (e: TouchEvent) => recognizer.handleTouchCancel(e);

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, []);

  // Add gesture listener
  const addGestureListener = useCallback((listener: (gesture: Gesture) => void) => {
    return recognizerRef.current?.addListener(listener);
  }, []);

  return {
    addGestureListener,
    recognizer: recognizerRef.current
  };
};

export default GestureRecognizer;

