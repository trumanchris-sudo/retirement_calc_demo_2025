"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";
import {
  useGestures,
  type GestureHandlers,
  type GestureConfig,
  type Point,
  type SwipeEvent,
  type PinchEvent,
  type PanEvent,
  type DoubleTapEvent,
  type LongPressEvent,
  createTabSwipeHandlers,
  createChartZoomHandlers,
  createChartPanHandlers,
  triggerHaptic,
  isTouchDevice,
} from "@/lib/gestures";

// ============================================================================
// GestureWrapper - Base wrapper for gesture detection
// ============================================================================

export type GestureWrapperProps = {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
  config?: Partial<GestureConfig>;
  hapticFeedback?: boolean;
} & GestureHandlers;

/**
 * Base gesture wrapper component
 *
 * @example
 * <GestureWrapper
 *   onSwipeLeft={() => nextTab()}
 *   onLongPress={() => openMenu()}
 *   hapticFeedback
 * >
 *   <div>Swipeable content</div>
 * </GestureWrapper>
 */
export const GestureWrapper = forwardRef<HTMLDivElement, GestureWrapperProps>(
  (
    {
      children,
      className,
      enabled = true,
      config,
      hapticFeedback = false,
      onSwipe,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onPinch,
      onPinchStart,
      onPinchEnd,
      onLongPress,
      onDoubleTap,
      onPan,
      onPanStart,
      onPanEnd,
      onTap,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Forward ref
    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    // Wrap handlers with haptic feedback if enabled
    const handlers = useMemo<GestureHandlers>(() => {
      const wrapWithHaptic = <T extends (...args: unknown[]) => void>(
        handler: T | undefined,
        intensity: "light" | "medium" | "heavy" = "light"
      ): T | undefined => {
        if (!handler) return undefined;
        return ((...args: unknown[]) => {
          if (hapticFeedback) {
            triggerHaptic(intensity);
          }
          handler(...args);
        }) as T;
      };

      return {
        onSwipe: wrapWithHaptic(onSwipe as (...args: unknown[]) => void, "light") as typeof onSwipe,
        onSwipeLeft: wrapWithHaptic(onSwipeLeft as (...args: unknown[]) => void, "light") as typeof onSwipeLeft,
        onSwipeRight: wrapWithHaptic(onSwipeRight as (...args: unknown[]) => void, "light") as typeof onSwipeRight,
        onSwipeUp: wrapWithHaptic(onSwipeUp as (...args: unknown[]) => void, "light") as typeof onSwipeUp,
        onSwipeDown: wrapWithHaptic(onSwipeDown as (...args: unknown[]) => void, "light") as typeof onSwipeDown,
        onPinch,
        onPinchStart,
        onPinchEnd,
        onLongPress: wrapWithHaptic(onLongPress as (...args: unknown[]) => void, "medium") as typeof onLongPress,
        onDoubleTap: wrapWithHaptic(onDoubleTap as (...args: unknown[]) => void, "light") as typeof onDoubleTap,
        onPan,
        onPanStart,
        onPanEnd,
        onTap: wrapWithHaptic(onTap as (...args: unknown[]) => void, "light") as typeof onTap,
      };
    }, [
      hapticFeedback,
      onSwipe,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onPinch,
      onPinchStart,
      onPinchEnd,
      onLongPress,
      onDoubleTap,
      onPan,
      onPanStart,
      onPanEnd,
      onTap,
    ]);

    const gestureRef = useGestures<HTMLDivElement>({
      handlers,
      config,
      enabled,
    });

    // Combine refs
    const setRefs = useCallback(
      (element: HTMLDivElement | null) => {
        containerRef.current = element;
        gestureRef(element);
      },
      [gestureRef]
    );

    return (
      <div
        ref={setRefs}
        className={cn("touch-manipulation", className)}
        style={{ touchAction: "pan-y" }}
      >
        {children}
      </div>
    );
  }
);

GestureWrapper.displayName = "GestureWrapper";

// ============================================================================
// SwipeableTabContainer - Tab navigation with swipe gestures
// ============================================================================

export type SwipeableTabContainerProps = {
  children: React.ReactNode;
  currentIndex: number;
  totalTabs: number;
  onTabChange: (index: number) => void;
  className?: string;
  enabled?: boolean;
  showIndicator?: boolean;
  hapticFeedback?: boolean;
};

/**
 * Swipeable container for tab navigation
 *
 * @example
 * <SwipeableTabContainer
 *   currentIndex={activeTab}
 *   totalTabs={3}
 *   onTabChange={setActiveTab}
 *   showIndicator
 * >
 *   {tabContent}
 * </SwipeableTabContainer>
 */
export const SwipeableTabContainer = forwardRef<
  HTMLDivElement,
  SwipeableTabContainerProps
>(
  (
    {
      children,
      currentIndex,
      totalTabs,
      onTabChange,
      className,
      enabled = true,
      showIndicator = true,
      hapticFeedback = true,
    },
    ref
  ) => {
    const swipeHandlers = useMemo(
      () => createTabSwipeHandlers(currentIndex, totalTabs, onTabChange),
      [currentIndex, totalTabs, onTabChange]
    );

    return (
      <GestureWrapper
        ref={ref}
        className={cn("relative", className)}
        enabled={enabled}
        hapticFeedback={hapticFeedback}
        {...swipeHandlers}
        config={{
          swipeThreshold: 75,
          swipeVelocityThreshold: 0.25,
        }}
      >
        {children}

        {/* Swipe indicator dots */}
        {showIndicator && totalTabs > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            {Array.from({ length: totalTabs }).map((_, i) => (
              <button
                key={i}
                onClick={() => onTabChange(i)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-200",
                  i === currentIndex
                    ? "bg-blue-600 w-4"
                    : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                )}
                aria-label={`Go to tab ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Visual swipe feedback arrows (mobile only) */}
        <SwipeHints
          showLeft={currentIndex > 0}
          showRight={currentIndex < totalTabs - 1}
        />
      </GestureWrapper>
    );
  }
);

SwipeableTabContainer.displayName = "SwipeableTabContainer";

// ============================================================================
// ZoomableChartWrapper - Chart with pinch-zoom and pan
// ============================================================================

export type ZoomableChartRef = {
  resetZoom: () => void;
  setZoom: (scale: number) => void;
  getZoom: () => number;
};

export type ZoomableChartWrapperProps = {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
  minScale?: number;
  maxScale?: number;
  onScaleChange?: (scale: number) => void;
  onOffsetChange?: (offset: Point) => void;
  showZoomControls?: boolean;
  hapticFeedback?: boolean;
};

/**
 * Wrapper for charts with pinch-zoom and pan support
 *
 * @example
 * const chartRef = useRef<ZoomableChartRef>(null);
 *
 * <ZoomableChartWrapper
 *   ref={chartRef}
 *   showZoomControls
 *   minScale={0.5}
 *   maxScale={4}
 * >
 *   <LineChart />
 * </ZoomableChartWrapper>
 *
 * // Reset zoom programmatically
 * chartRef.current?.resetZoom();
 */
export const ZoomableChartWrapper = forwardRef<
  ZoomableChartRef,
  ZoomableChartWrapperProps
>(
  (
    {
      children,
      className,
      enabled = true,
      minScale = 0.5,
      maxScale = 3,
      onScaleChange,
      onOffsetChange,
      showZoomControls = false,
      hapticFeedback = true,
    },
    ref
  ) => {
    const [scale, setScaleState] = useState(1);
    const [offset, setOffsetState] = useState<Point>({ x: 0, y: 0 });
    const [isPinching, setIsPinching] = useState(false);
    const baseScaleRef = useRef(1);

    const setScale = useCallback(
      (newScale: number) => {
        const clampedScale = Math.min(maxScale, Math.max(minScale, newScale));
        setScaleState(clampedScale);
        onScaleChange?.(clampedScale);
      },
      [minScale, maxScale, onScaleChange]
    );

    const setOffset = useCallback(
      (newOffset: Point) => {
        setOffsetState(newOffset);
        onOffsetChange?.(newOffset);
      },
      [onOffsetChange]
    );

    const resetZoom = useCallback(() => {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }, [setScale, setOffset]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      resetZoom,
      setZoom: setScale,
      getZoom: () => scale,
    }));

    // Handlers
    const handlePinchStart = useCallback(() => {
      setIsPinching(true);
      baseScaleRef.current = scale;
    }, [scale]);

    const handlePinch = useCallback(
      (event: PinchEvent) => {
        const newScale = baseScaleRef.current * event.scale;
        setScale(newScale);
      },
      [setScale]
    );

    const handlePinchEnd = useCallback(() => {
      setIsPinching(false);
    }, []);

    const handleDoubleTap = useCallback(() => {
      // Toggle between 1x and 2x zoom
      if (scale === 1) {
        setScale(2);
      } else {
        resetZoom();
      }
    }, [scale, setScale, resetZoom]);

    const handlePan = useCallback(
      (event: PanEvent) => {
        if (event.isFinal || scale <= 1) return;

        setOffset({
          x: offset.x + event.delta.x,
          y: offset.y + event.delta.y,
        });
      },
      [scale, offset, setOffset]
    );

    return (
      <div className={cn("relative overflow-hidden", className)}>
        <GestureWrapper
          enabled={enabled}
          hapticFeedback={hapticFeedback}
          onPinchStart={handlePinchStart}
          onPinch={handlePinch}
          onPinchEnd={handlePinchEnd}
          onDoubleTap={handleDoubleTap}
          onPan={handlePan}
          config={{
            pinchThreshold: 0.02,
            panThreshold: 5,
          }}
          className="h-full w-full"
        >
          <div
            style={{
              transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
              transformOrigin: "center center",
              transition: isPinching ? "none" : "transform 0.2s ease-out",
            }}
          >
            {children}
          </div>
        </GestureWrapper>

        {/* Zoom controls */}
        {showZoomControls && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={() => setScale(scale * 1.25)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur dark:bg-gray-800/90"
              aria-label="Zoom in"
            >
              <ZoomInIcon />
            </button>
            <button
              onClick={() => setScale(scale / 1.25)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur dark:bg-gray-800/90"
              aria-label="Zoom out"
            >
              <ZoomOutIcon />
            </button>
            {scale !== 1 && (
              <button
                onClick={resetZoom}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur dark:bg-gray-800/90"
                aria-label="Reset zoom"
              >
                <ResetIcon />
              </button>
            )}
          </div>
        )}

        {/* Scale indicator */}
        {scale !== 1 && (
          <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
            {Math.round(scale * 100)}%
          </div>
        )}
      </div>
    );
  }
);

ZoomableChartWrapper.displayName = "ZoomableChartWrapper";

// ============================================================================
// LongPressable - Element with long press context menu support
// ============================================================================

export type LongPressableProps = {
  children: React.ReactNode;
  className?: string;
  onLongPress: (position: Point) => void;
  onTap?: () => void;
  disabled?: boolean;
  hapticFeedback?: boolean;
  pressDuration?: number;
};

/**
 * Wrapper for elements that respond to long press
 *
 * @example
 * <LongPressable
 *   onLongPress={(pos) => showContextMenu(pos)}
 *   onTap={() => handleTap()}
 * >
 *   <ListItem />
 * </LongPressable>
 */
export const LongPressable = forwardRef<HTMLDivElement, LongPressableProps>(
  (
    {
      children,
      className,
      onLongPress,
      onTap,
      disabled = false,
      hapticFeedback = true,
      pressDuration = 500,
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = useState(false);

    const handleLongPress = useCallback(
      (event: LongPressEvent) => {
        onLongPress(event.position);
      },
      [onLongPress]
    );

    const handlePanStart = useCallback(() => {
      setIsPressed(true);
    }, []);

    const handlePanEnd = useCallback(() => {
      setIsPressed(false);
    }, []);

    return (
      <GestureWrapper
        ref={ref}
        className={cn(
          "transition-transform duration-150",
          isPressed && "scale-[0.98]",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        enabled={!disabled}
        hapticFeedback={hapticFeedback}
        onLongPress={handleLongPress}
        onTap={onTap}
        onPanStart={handlePanStart}
        onPanEnd={handlePanEnd}
        config={{
          longPressDelay: pressDuration,
        }}
      >
        {children}
      </GestureWrapper>
    );
  }
);

LongPressable.displayName = "LongPressable";

// ============================================================================
// DoubleTappable - Element with double tap support
// ============================================================================

export type DoubleTappableProps = {
  children: React.ReactNode;
  className?: string;
  onDoubleTap: (position: Point) => void;
  onSingleTap?: () => void;
  disabled?: boolean;
  hapticFeedback?: boolean;
};

/**
 * Wrapper for elements that respond to double tap
 *
 * @example
 * <DoubleTappable
 *   onDoubleTap={() => toggleFullscreen()}
 *   onSingleTap={() => showDetails()}
 * >
 *   <Image />
 * </DoubleTappable>
 */
export const DoubleTappable = forwardRef<HTMLDivElement, DoubleTappableProps>(
  (
    {
      children,
      className,
      onDoubleTap,
      onSingleTap,
      disabled = false,
      hapticFeedback = true,
    },
    ref
  ) => {
    const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTapRef = useRef<number>(0);

    const handleTap = useCallback(() => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < 300) {
        // Double tap detected, clear single tap timer
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }
      } else {
        // Potential single tap, wait to see if another tap comes
        tapTimeoutRef.current = setTimeout(() => {
          onSingleTap?.();
        }, 300);
      }

      lastTapRef.current = now;
    }, [onSingleTap]);

    const handleDoubleTap = useCallback(
      (event: DoubleTapEvent) => {
        onDoubleTap(event.position);
      },
      [onDoubleTap]
    );

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
        }
      };
    }, []);

    return (
      <GestureWrapper
        ref={ref}
        className={cn(disabled && "pointer-events-none opacity-50", className)}
        enabled={!disabled}
        hapticFeedback={hapticFeedback}
        onDoubleTap={handleDoubleTap}
        onTap={handleTap}
      >
        {children}
      </GestureWrapper>
    );
  }
);

DoubleTappable.displayName = "DoubleTappable";

// ============================================================================
// PanContainer - Container with pan/drag support
// ============================================================================

export type PanContainerRef = {
  resetPosition: () => void;
  setPosition: (position: Point) => void;
  getPosition: () => Point;
};

export type PanContainerProps = {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  onPositionChange?: (position: Point) => void;
  momentum?: boolean;
};

/**
 * Container with pan/drag support for navigation
 *
 * @example
 * <PanContainer
 *   bounds={{ minX: -500, maxX: 0, minY: 0, maxY: 0 }}
 *   onPositionChange={(pos) => updateScrollPosition(pos)}
 *   momentum
 * >
 *   <WideContent />
 * </PanContainer>
 */
export const PanContainer = forwardRef<PanContainerRef, PanContainerProps>(
  (
    {
      children,
      className,
      enabled = true,
      bounds,
      onPositionChange,
      momentum = true,
    },
    ref
  ) => {
    const [position, setPositionState] = useState<Point>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const velocityRef = useRef<Point>({ x: 0, y: 0 });
    const momentumFrameRef = useRef<number | null>(null);

    const setPosition = useCallback(
      (newPosition: Point) => {
        let { x, y } = newPosition;

        if (bounds) {
          x = Math.min(bounds.maxX, Math.max(bounds.minX, x));
          y = Math.min(bounds.maxY, Math.max(bounds.minY, y));
        }

        setPositionState({ x, y });
        onPositionChange?.({ x, y });
      },
      [bounds, onPositionChange]
    );

    const resetPosition = useCallback(() => {
      setPosition({ x: 0, y: 0 });
    }, [setPosition]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      resetPosition,
      setPosition,
      getPosition: () => position,
    }));

    const applyMomentum = useCallback(() => {
      const friction = 0.95;
      const minVelocity = 0.1;

      const animate = () => {
        velocityRef.current = {
          x: velocityRef.current.x * friction,
          y: velocityRef.current.y * friction,
        };

        if (
          Math.abs(velocityRef.current.x) > minVelocity ||
          Math.abs(velocityRef.current.y) > minVelocity
        ) {
          setPosition({
            x: position.x + velocityRef.current.x * 16,
            y: position.y + velocityRef.current.y * 16,
          });
          momentumFrameRef.current = requestAnimationFrame(animate);
        }
      };

      momentumFrameRef.current = requestAnimationFrame(animate);
    }, [position, setPosition]);

    const handlePanStart = useCallback(() => {
      setIsDragging(true);
      if (momentumFrameRef.current) {
        cancelAnimationFrame(momentumFrameRef.current);
      }
    }, []);

    const handlePan = useCallback(
      (event: PanEvent) => {
        if (event.isFinal) return;

        velocityRef.current = event.velocity;
        setPosition({
          x: position.x + event.delta.x,
          y: position.y + event.delta.y,
        });
      },
      [position, setPosition]
    );

    const handlePanEnd = useCallback(
      (event: PanEvent) => {
        setIsDragging(false);

        if (momentum && (Math.abs(event.velocity.x) > 0.5 || Math.abs(event.velocity.y) > 0.5)) {
          applyMomentum();
        }
      },
      [momentum, applyMomentum]
    );

    // Cleanup momentum animation on unmount
    useEffect(() => {
      return () => {
        if (momentumFrameRef.current) {
          cancelAnimationFrame(momentumFrameRef.current);
        }
      };
    }, []);

    return (
      <GestureWrapper
        className={cn("overflow-hidden", className)}
        enabled={enabled}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        config={{
          panThreshold: 5,
          preventDefaultOnGesture: true,
        }}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          {children}
        </div>
      </GestureWrapper>
    );
  }
);

PanContainer.displayName = "PanContainer";

// ============================================================================
// Helper Components
// ============================================================================

function SwipeHints({
  showLeft,
  showRight,
}: {
  showLeft: boolean;
  showRight: boolean;
}) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  if (!isTouch) return null;

  return (
    <>
      {showLeft && (
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 opacity-30">
          <ChevronLeftIcon className="h-6 w-6 text-gray-400" />
        </div>
      )}
      {showRight && (
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-30">
          <ChevronRightIcon className="h-6 w-6 text-gray-400" />
        </div>
      )}
    </>
  );
}

// ============================================================================
// Icons
// ============================================================================

function ZoomInIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ZoomOutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  // Re-export gesture types and utilities
  type GestureHandlers,
  type GestureConfig,
  type Point,
  type SwipeEvent,
  type PinchEvent,
  type PanEvent,
  type DoubleTapEvent,
  type LongPressEvent,
  // Re-export helper functions
  createTabSwipeHandlers,
  createChartZoomHandlers,
  createChartPanHandlers,
  triggerHaptic,
  isTouchDevice,
};
