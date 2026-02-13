/**
 * Touch Gesture Library
 *
 * Provides comprehensive touch gesture detection and handling for:
 * - Swipe left/right for tab navigation
 * - Pinch to zoom for charts
 * - Long press for context menus
 * - Double tap to zoom/reset
 * - Pan for chart navigation
 */

// ============================================================================
// Types
// ============================================================================

export type Point = {
  x: number;
  y: number;
};

export type GestureDirection = 'left' | 'right' | 'up' | 'down' | 'none';

export type SwipeEvent = {
  type: 'swipe';
  direction: GestureDirection;
  velocity: number;
  distance: number;
  startPoint: Point;
  endPoint: Point;
};

export type PinchEvent = {
  type: 'pinch';
  scale: number;
  center: Point;
  initialDistance: number;
  currentDistance: number;
};

export type LongPressEvent = {
  type: 'longpress';
  position: Point;
  duration: number;
};

export type DoubleTapEvent = {
  type: 'doubletap';
  position: Point;
};

export type PanEvent = {
  type: 'pan';
  delta: Point;
  position: Point;
  velocity: Point;
  isFirst: boolean;
  isFinal: boolean;
};

export type TapEvent = {
  type: 'tap';
  position: Point;
};

export type GestureEvent =
  | SwipeEvent
  | PinchEvent
  | LongPressEvent
  | DoubleTapEvent
  | PanEvent
  | TapEvent;

export type GestureHandlers = {
  onSwipe?: (event: SwipeEvent) => void;
  onSwipeLeft?: (event: SwipeEvent) => void;
  onSwipeRight?: (event: SwipeEvent) => void;
  onSwipeUp?: (event: SwipeEvent) => void;
  onSwipeDown?: (event: SwipeEvent) => void;
  onPinch?: (event: PinchEvent) => void;
  onPinchStart?: (event: PinchEvent) => void;
  onPinchEnd?: (event: PinchEvent) => void;
  onLongPress?: (event: LongPressEvent) => void;
  onDoubleTap?: (event: DoubleTapEvent) => void;
  onPan?: (event: PanEvent) => void;
  onPanStart?: (event: PanEvent) => void;
  onPanEnd?: (event: PanEvent) => void;
  onTap?: (event: TapEvent) => void;
};

export type GestureConfig = {
  // Swipe configuration
  swipeThreshold: number; // Minimum distance for swipe (px)
  swipeVelocityThreshold: number; // Minimum velocity for swipe (px/ms)

  // Long press configuration
  longPressDelay: number; // Time before long press fires (ms)
  longPressMoveThreshold: number; // Max movement allowed during long press (px)

  // Double tap configuration
  doubleTapDelay: number; // Max time between taps (ms)
  doubleTapDistanceThreshold: number; // Max distance between taps (px)

  // Pinch configuration
  pinchThreshold: number; // Minimum scale change to register pinch

  // Pan configuration
  panThreshold: number; // Minimum movement to start pan (px)

  // General
  preventDefaultOnGesture: boolean;
};

const DEFAULT_CONFIG: GestureConfig = {
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.3,
  longPressDelay: 500,
  longPressMoveThreshold: 10,
  doubleTapDelay: 300,
  doubleTapDistanceThreshold: 30,
  pinchThreshold: 0.01,
  panThreshold: 10,
  preventDefaultOnGesture: true,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate distance between two points
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate center point between two points
 */
export function getCenter(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Get touch point from touch event
 */
export function getTouchPoint(touch: Touch): Point {
  return {
    x: touch.clientX,
    y: touch.clientY,
  };
}

/**
 * Determine swipe direction from delta
 */
export function getSwipeDirection(dx: number, dy: number): GestureDirection {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy) {
    return dx > 0 ? 'right' : 'left';
  } else if (absDy > absDx) {
    return dy > 0 ? 'down' : 'up';
  }

  return 'none';
}

/**
 * Check if touch is within element bounds
 */
export function isTouchWithinElement(touch: Touch, element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    touch.clientX >= rect.left &&
    touch.clientX <= rect.right &&
    touch.clientY >= rect.top &&
    touch.clientY <= rect.bottom
  );
}

// ============================================================================
// Gesture Recognizer Class
// ============================================================================

export class GestureRecognizer {
  private element: HTMLElement;
  private handlers: GestureHandlers;
  private config: GestureConfig;

  // State tracking
  private touchStartTime = 0;
  private touchStartPoint: Point | null = null;
  private lastTapTime = 0;
  private lastTapPoint: Point | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isLongPressing = false;
  private isPanning = false;
  private isPinching = false;
  private initialPinchDistance = 0;
  private lastPanPoint: Point | null = null;
  private lastPanTime = 0;
  private panVelocity: Point = { x: 0, y: 0 };

  // Bound event handlers
  private boundHandleTouchStart: (e: TouchEvent) => void;
  private boundHandleTouchMove: (e: TouchEvent) => void;
  private boundHandleTouchEnd: (e: TouchEvent) => void;
  private boundHandleTouchCancel: (e: TouchEvent) => void;

  constructor(
    element: HTMLElement,
    handlers: GestureHandlers,
    config: Partial<GestureConfig> = {}
  ) {
    this.element = element;
    this.handlers = handlers;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Bind handlers
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundHandleTouchCancel = this.handleTouchCancel.bind(this);

    this.attach();
  }

  /**
   * Attach event listeners
   */
  attach(): void {
    const options: AddEventListenerOptions = { passive: false };
    this.element.addEventListener('touchstart', this.boundHandleTouchStart, options);
    this.element.addEventListener('touchmove', this.boundHandleTouchMove, options);
    this.element.addEventListener('touchend', this.boundHandleTouchEnd, options);
    this.element.addEventListener('touchcancel', this.boundHandleTouchCancel, options);
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    this.element.removeEventListener('touchstart', this.boundHandleTouchStart);
    this.element.removeEventListener('touchmove', this.boundHandleTouchMove);
    this.element.removeEventListener('touchend', this.boundHandleTouchEnd);
    this.element.removeEventListener('touchcancel', this.boundHandleTouchCancel);
    this.clearLongPressTimer();
  }

  /**
   * Update handlers
   */
  updateHandlers(handlers: GestureHandlers): void {
    this.handlers = handlers;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    const touches = e.touches;

    if (touches.length === 1) {
      // Single touch - potential tap, swipe, long press, or pan
      const touch = touches[0];
      this.touchStartTime = Date.now();
      this.touchStartPoint = getTouchPoint(touch);
      this.lastPanPoint = this.touchStartPoint;
      this.lastPanTime = this.touchStartTime;
      this.isPanning = false;
      this.isLongPressing = false;

      // Start long press timer
      this.clearLongPressTimer();
      this.longPressTimer = setTimeout(() => {
        if (this.touchStartPoint && !this.isPanning) {
          this.isLongPressing = true;
          const event: LongPressEvent = {
            type: 'longpress',
            position: this.touchStartPoint,
            duration: this.config.longPressDelay,
          };
          this.handlers.onLongPress?.(event);
        }
      }, this.config.longPressDelay);

    } else if (touches.length === 2) {
      // Two touches - pinch gesture
      this.clearLongPressTimer();
      this.isPanning = false;
      this.isPinching = true;

      const p1 = getTouchPoint(touches[0]);
      const p2 = getTouchPoint(touches[1]);
      this.initialPinchDistance = getDistance(p1, p2);

      const event: PinchEvent = {
        type: 'pinch',
        scale: 1,
        center: getCenter(p1, p2),
        initialDistance: this.initialPinchDistance,
        currentDistance: this.initialPinchDistance,
      };
      this.handlers.onPinchStart?.(event);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    const touches = e.touches;

    if (touches.length === 1 && this.touchStartPoint) {
      const touch = touches[0];
      const currentPoint = getTouchPoint(touch);
      const distance = getDistance(this.touchStartPoint, currentPoint);

      // Check if movement exceeds long press threshold
      if (distance > this.config.longPressMoveThreshold) {
        this.clearLongPressTimer();

        // If not already panning and distance exceeds pan threshold, start pan
        if (!this.isPanning && distance > this.config.panThreshold && !this.isLongPressing) {
          this.isPanning = true;

          const panEvent: PanEvent = {
            type: 'pan',
            delta: {
              x: currentPoint.x - this.touchStartPoint.x,
              y: currentPoint.y - this.touchStartPoint.y,
            },
            position: currentPoint,
            velocity: { x: 0, y: 0 },
            isFirst: true,
            isFinal: false,
          };
          this.handlers.onPanStart?.(panEvent);
          this.handlers.onPan?.(panEvent);
        } else if (this.isPanning && this.lastPanPoint) {
          // Continue panning
          const now = Date.now();
          const timeDelta = now - this.lastPanTime;

          if (timeDelta > 0) {
            this.panVelocity = {
              x: (currentPoint.x - this.lastPanPoint.x) / timeDelta,
              y: (currentPoint.y - this.lastPanPoint.y) / timeDelta,
            };
          }

          const panEvent: PanEvent = {
            type: 'pan',
            delta: {
              x: currentPoint.x - this.lastPanPoint.x,
              y: currentPoint.y - this.lastPanPoint.y,
            },
            position: currentPoint,
            velocity: this.panVelocity,
            isFirst: false,
            isFinal: false,
          };
          this.handlers.onPan?.(panEvent);

          this.lastPanPoint = currentPoint;
          this.lastPanTime = now;
        }
      }

      // Prevent scrolling if we're handling a gesture
      if (this.isPanning && this.config.preventDefaultOnGesture) {
        e.preventDefault();
      }

    } else if (touches.length === 2 && this.isPinching) {
      // Handle pinch
      const p1 = getTouchPoint(touches[0]);
      const p2 = getTouchPoint(touches[1]);
      const currentDistance = getDistance(p1, p2);
      const scale = currentDistance / this.initialPinchDistance;

      if (Math.abs(scale - 1) > this.config.pinchThreshold) {
        const event: PinchEvent = {
          type: 'pinch',
          scale,
          center: getCenter(p1, p2),
          initialDistance: this.initialPinchDistance,
          currentDistance,
        };
        this.handlers.onPinch?.(event);

        if (this.config.preventDefaultOnGesture) {
          e.preventDefault();
        }
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    this.clearLongPressTimer();

    const changedTouches = e.changedTouches;

    if (changedTouches.length === 1 && this.touchStartPoint) {
      const touch = changedTouches[0];
      const endPoint = getTouchPoint(touch);
      const duration = Date.now() - this.touchStartTime;
      const distance = getDistance(this.touchStartPoint, endPoint);

      // Handle pan end
      if (this.isPanning) {
        const panEvent: PanEvent = {
          type: 'pan',
          delta: { x: 0, y: 0 },
          position: endPoint,
          velocity: this.panVelocity,
          isFirst: false,
          isFinal: true,
        };
        this.handlers.onPanEnd?.(panEvent);
        this.handlers.onPan?.(panEvent);
        this.isPanning = false;
        this.resetState();
        return;
      }

      // Skip if long pressing
      if (this.isLongPressing) {
        this.isLongPressing = false;
        this.resetState();
        return;
      }

      // Check for swipe
      const dx = endPoint.x - this.touchStartPoint.x;
      const dy = endPoint.y - this.touchStartPoint.y;
      const velocity = distance / duration;

      if (
        distance > this.config.swipeThreshold &&
        velocity > this.config.swipeVelocityThreshold
      ) {
        const direction = getSwipeDirection(dx, dy);
        const event: SwipeEvent = {
          type: 'swipe',
          direction,
          velocity,
          distance,
          startPoint: this.touchStartPoint,
          endPoint,
        };

        this.handlers.onSwipe?.(event);

        switch (direction) {
          case 'left':
            this.handlers.onSwipeLeft?.(event);
            break;
          case 'right':
            this.handlers.onSwipeRight?.(event);
            break;
          case 'up':
            this.handlers.onSwipeUp?.(event);
            break;
          case 'down':
            this.handlers.onSwipeDown?.(event);
            break;
        }

        this.resetState();
        return;
      }

      // Check for double tap
      const now = Date.now();
      if (
        this.lastTapTime > 0 &&
        now - this.lastTapTime < this.config.doubleTapDelay &&
        this.lastTapPoint &&
        getDistance(endPoint, this.lastTapPoint) < this.config.doubleTapDistanceThreshold
      ) {
        const event: DoubleTapEvent = {
          type: 'doubletap',
          position: endPoint,
        };
        this.handlers.onDoubleTap?.(event);
        this.lastTapTime = 0;
        this.lastTapPoint = null;
        this.resetState();
        return;
      }

      // Single tap
      if (distance < this.config.panThreshold && duration < 300) {
        const event: TapEvent = {
          type: 'tap',
          position: endPoint,
        };
        this.handlers.onTap?.(event);
        this.lastTapTime = now;
        this.lastTapPoint = endPoint;
      }
    }

    // Handle pinch end
    if (this.isPinching && e.touches.length < 2) {
      this.isPinching = false;

      if (changedTouches.length >= 1) {
        const event: PinchEvent = {
          type: 'pinch',
          scale: 1,
          center: getTouchPoint(changedTouches[0]),
          initialDistance: this.initialPinchDistance,
          currentDistance: this.initialPinchDistance,
        };
        this.handlers.onPinchEnd?.(event);
      }
    }

    this.resetState();
  }

  private handleTouchCancel(): void {
    this.clearLongPressTimer();
    this.resetState();
  }

  private resetState(): void {
    this.touchStartPoint = null;
    this.touchStartTime = 0;
    this.lastPanPoint = null;
    this.panVelocity = { x: 0, y: 0 };
    this.isLongPressing = false;
    // Don't reset lastTapTime/lastTapPoint here - needed for double tap detection
  }
}

// ============================================================================
// React Hook
// ============================================================================

import { useEffect, useRef, useCallback } from 'react';

export type UseGesturesOptions = {
  handlers: GestureHandlers;
  config?: Partial<GestureConfig>;
  enabled?: boolean;
};

/**
 * React hook for gesture recognition
 *
 * @example
 * const gestureRef = useGestures({
 *   handlers: {
 *     onSwipeLeft: () => goToNextTab(),
 *     onSwipeRight: () => goToPrevTab(),
 *     onPinch: (e) => setZoom(e.scale),
 *     onDoubleTap: () => resetZoom(),
 *     onLongPress: () => showContextMenu(),
 *   },
 *   config: { swipeThreshold: 75 },
 * });
 *
 * return <div ref={gestureRef}>...</div>;
 */
export function useGestures<T extends HTMLElement = HTMLElement>(
  options: UseGesturesOptions
): React.RefCallback<T> {
  const { handlers, config, enabled = true } = options;

  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const handlersRef = useRef(handlers);
  const configRef = useRef(config);

  // Update refs when handlers/config change
  useEffect(() => {
    handlersRef.current = handlers;
    if (recognizerRef.current) {
      recognizerRef.current.updateHandlers(handlers);
    }
  }, [handlers]);

  useEffect(() => {
    configRef.current = config;
    if (recognizerRef.current && config) {
      recognizerRef.current.updateConfig(config);
    }
  }, [config]);

  const setRef = useCallback((element: T | null) => {
    // Clean up previous recognizer
    if (recognizerRef.current) {
      recognizerRef.current.detach();
      recognizerRef.current = null;
    }

    // Create new recognizer if element exists and gestures are enabled
    if (element && enabled) {
      recognizerRef.current = new GestureRecognizer(
        element,
        handlersRef.current,
        configRef.current
      );
    }
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.detach();
        recognizerRef.current = null;
      }
    };
  }, []);

  return setRef;
}

// ============================================================================
// Higher Order Functions for Common Patterns
// ============================================================================

/**
 * Create swipe handlers for tab navigation
 */
export function createTabSwipeHandlers(
  currentIndex: number,
  totalTabs: number,
  onChange: (index: number) => void
): Pick<GestureHandlers, 'onSwipeLeft' | 'onSwipeRight'> {
  return {
    onSwipeLeft: () => {
      if (currentIndex < totalTabs - 1) {
        onChange(currentIndex + 1);
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        onChange(currentIndex - 1);
      }
    },
  };
}

/**
 * Create zoom handlers for charts
 */
export function createChartZoomHandlers(
  currentScale: number,
  setScale: (scale: number) => void,
  minScale = 0.5,
  maxScale = 3
): Pick<GestureHandlers, 'onPinch' | 'onDoubleTap'> {
  return {
    onPinch: (event) => {
      const newScale = Math.min(maxScale, Math.max(minScale, currentScale * event.scale));
      setScale(newScale);
    },
    onDoubleTap: () => {
      // Reset to 1 if zoomed, zoom to 2x if at default
      setScale(currentScale === 1 ? 2 : 1);
    },
  };
}

/**
 * Create pan handlers for chart navigation
 */
export function createChartPanHandlers(
  currentOffset: Point,
  setOffset: (offset: Point) => void,
  bounds?: { minX: number; maxX: number; minY: number; maxY: number }
): Pick<GestureHandlers, 'onPan'> {
  return {
    onPan: (event) => {
      if (event.isFinal) return;

      let newX = currentOffset.x + event.delta.x;
      let newY = currentOffset.y + event.delta.y;

      if (bounds) {
        newX = Math.min(bounds.maxX, Math.max(bounds.minX, newX));
        newY = Math.min(bounds.maxY, Math.max(bounds.minY, newY));
      }

      setOffset({ x: newX, y: newY });
    },
  };
}

// ============================================================================
// Haptic Feedback (if available)
// ============================================================================

/**
 * Trigger haptic feedback if available
 */
export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  // Check for Vibration API
  if ('vibrate' in navigator) {
    const duration = style === 'light' ? 10 : style === 'medium' ? 25 : 50;
    navigator.vibrate(duration);
  }
}

// ============================================================================
// Touch State Utilities
// ============================================================================

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE specific
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get current touch count
 */
export function getTouchCount(e: TouchEvent): number {
  return e.touches.length;
}

/**
 * Prevent default touch behavior (useful for preventing scroll during gestures)
 */
export function preventTouchDefault(e: TouchEvent): void {
  if (e.cancelable) {
    e.preventDefault();
  }
}
