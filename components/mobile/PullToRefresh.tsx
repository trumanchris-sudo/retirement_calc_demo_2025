"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type RefreshState = "idle" | "pulling" | "threshold" | "loading" | "success" | "error";

interface PullToRefreshProps {
  /** Content to wrap with pull-to-refresh behavior */
  children: ReactNode;
  /** Async function to call when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Distance in px to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance in px (default: 150) */
  maxPull?: number;
  /** Resistance factor for overscroll (default: 2.5) */
  resistance?: number;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Accessibility label for the refresh action */
  ariaLabel?: string;
  /** Custom success message */
  successMessage?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Duration to show success/error state in ms (default: 1500) */
  feedbackDuration?: number;
}

// ============================================================================
// Spring Physics Utilities
// ============================================================================

/**
 * Spring physics configuration for native-feeling animations
 * Based on iOS/Android standard spring parameters
 */
const SPRING_CONFIG = {
  tension: 300,
  friction: 30,
  mass: 1,
};

/**
 * Calculate spring animation value
 * Uses critically damped spring for smooth snap-back
 */
function springInterpolate(
  current: number,
  target: number,
  velocity: number,
  dt: number
): { value: number; velocity: number } {
  const { tension, friction, mass } = SPRING_CONFIG;

  const displacement = current - target;
  const springForce = -tension * displacement;
  const dampingForce = -friction * velocity;
  const acceleration = (springForce + dampingForce) / mass;

  const newVelocity = velocity + acceleration * dt;
  const newValue = current + newVelocity * dt;

  // Stop when close enough to target
  if (Math.abs(newValue - target) < 0.5 && Math.abs(newVelocity) < 0.5) {
    return { value: target, velocity: 0 };
  }

  return { value: newValue, velocity: newVelocity };
}

// ============================================================================
// Haptic Feedback
// ============================================================================

/**
 * Trigger haptic feedback if available
 * Uses Vibration API with patterns that feel native
 */
function triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "error") {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;

  // Respect reduced motion preference
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    error: [20, 100, 20, 100, 20],
  };

  try {
    navigator.vibrate(patterns[type]);
  } catch {
    // Silently fail if vibration not supported
  }
}

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook to detect if user prefers reduced motion
 */
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}

// ============================================================================
// Branded Refresh Indicator Component
// ============================================================================

interface RefreshIndicatorProps {
  state: RefreshState;
  pullProgress: number; // 0 to 1
  pullDistance: number;
  successMessage: string;
  errorMessage: string;
}

function RefreshIndicator({
  state,
  pullProgress,
  pullDistance,
  successMessage,
  errorMessage,
}: RefreshIndicatorProps) {
  // Clamp progress to 0-1 range
  const progress = Math.min(1, Math.max(0, pullProgress));

  // Calculate indicator opacity based on pull distance
  const opacity = Math.min(1, pullDistance / 40);

  // Calculate rotation for the cube (0 to 720 degrees at full pull)
  const rotation = progress * 720;

  // Scale animation for success/error states
  const scale = state === "success" || state === "error" ? 1.1 : 1;

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center",
        "transition-opacity duration-200 pointer-events-none z-50"
      )}
      style={{
        top: Math.max(8, pullDistance - 60),
        opacity,
      }}
      role="status"
      aria-live="polite"
      aria-label={
        state === "loading"
          ? "Refreshing..."
          : state === "success"
          ? successMessage
          : state === "error"
          ? errorMessage
          : state === "threshold"
          ? "Release to refresh"
          : "Pull down to refresh"
      }
    >
      {/* Branded Cube Indicator */}
      <div
        className="relative"
        style={{
          width: 48,
          height: 48,
          perspective: "500px",
          transform: `scale(${scale})`,
          transition: state === "success" || state === "error" ? "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
        }}
      >
        {state === "loading" ? (
          // Loading spinner
          <div className="w-12 h-12 relative">
            <div
              className="absolute inset-0 rounded-lg border-4 border-primary/20"
              style={{ borderRadius: 8 }}
            />
            <div
              className="absolute inset-0 rounded-lg border-4 border-transparent border-t-primary animate-spin"
              style={{ borderRadius: 8 }}
            />
            {/* Inner cube face for branding */}
            <div
              className="absolute inset-2 bg-primary rounded flex items-center justify-center"
              style={{ borderRadius: 4 }}
            >
              <span className="text-primary-foreground font-bold text-lg">R</span>
            </div>
          </div>
        ) : state === "success" ? (
          // Success checkmark
          <div
            className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center shadow-lg"
            style={{ borderRadius: 8 }}
          >
            <svg
              className="w-7 h-7 text-white animate-scale-in"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                className="animate-check-draw"
              />
            </svg>
          </div>
        ) : state === "error" ? (
          // Error X mark
          <div
            className="w-12 h-12 bg-destructive rounded-lg flex items-center justify-center shadow-lg"
            style={{ borderRadius: 8 }}
          >
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        ) : (
          // Pulling cube with rotation
          <div
            className="w-12 h-12 relative"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${rotation * 0.5}deg) rotateY(${rotation}deg)`,
              transition: state === "idle" ? "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
            }}
          >
            {/* Front face */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)`,
                borderRadius: 8,
                transform: "translateZ(24px)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
              }}
            >
              <span className="text-primary-foreground font-bold text-xl">R</span>
            </div>
            {/* Back face */}
            <div
              className="absolute inset-0"
              style={{
                background: "hsl(var(--primary) / 0.7)",
                borderRadius: 8,
                transform: "rotateY(180deg) translateZ(24px)",
              }}
            />
            {/* Top face */}
            <div
              className="absolute inset-0"
              style={{
                background: "hsl(var(--primary) / 0.9)",
                borderRadius: 8,
                transform: "rotateX(90deg) translateZ(24px)",
              }}
            />
            {/* Bottom face */}
            <div
              className="absolute inset-0"
              style={{
                background: "hsl(var(--primary) / 0.5)",
                borderRadius: 8,
                transform: "rotateX(-90deg) translateZ(24px)",
              }}
            />
            {/* Left face */}
            <div
              className="absolute inset-0"
              style={{
                background: "hsl(var(--primary) / 0.6)",
                borderRadius: 8,
                transform: "rotateY(-90deg) translateZ(24px)",
              }}
            />
            {/* Right face */}
            <div
              className="absolute inset-0"
              style={{
                background: "hsl(var(--primary) / 0.8)",
                borderRadius: 8,
                transform: "rotateY(90deg) translateZ(24px)",
              }}
            />
          </div>
        )}
      </div>

      {/* Progress ring behind cube */}
      {(state === "pulling" || state === "threshold") && (
        <svg
          className="absolute"
          style={{ top: -4, left: "50%", transform: "translateX(-50%)" }}
          width={56}
          height={56}
          viewBox="0 0 56 56"
        >
          <circle
            cx={28}
            cy={28}
            r={25}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={3}
          />
          <circle
            cx={28}
            cy={28}
            r={25}
            fill="none"
            stroke={state === "threshold" ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.6)"}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={157}
            strokeDashoffset={157 * (1 - progress)}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "center",
              transition: "stroke 0.2s ease",
            }}
          />
        </svg>
      )}

      {/* Status text */}
      <span
        className={cn(
          "mt-2 text-xs font-medium transition-colors duration-200",
          state === "threshold" ? "text-primary" : "text-muted-foreground",
          state === "success" && "text-green-600 dark:text-green-400",
          state === "error" && "text-destructive"
        )}
      >
        {state === "loading" && "Updating..."}
        {state === "success" && successMessage}
        {state === "error" && errorMessage}
        {state === "threshold" && "Release to refresh"}
        {state === "pulling" && `Pull to refresh (${Math.round(progress * 100)}%)`}
      </span>
    </div>
  );
}

// ============================================================================
// Main PullToRefresh Component
// ============================================================================

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 150,
  resistance = 2.5,
  enabled = true,
  className,
  ariaLabel = "Pull to refresh",
  successMessage = "Updated!",
  errorMessage = "Failed to refresh",
  feedbackDuration = 1500,
}: PullToRefreshProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const hasTriggeredHapticRef = useRef(false);

  // State
  const [pullDistance, setPullDistance] = useState(0);
  const [state, setState] = useState<RefreshState>("idle");

  // Hooks
  const prefersReducedMotion = usePrefersReducedMotion();

  // Calculate pull progress (0 to 1)
  const pullProgress = pullDistance / threshold;

  // Check if content is scrolled to top
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return true;
    return containerRef.current.scrollTop <= 0;
  }, []);

  // Apply resistance curve for natural overscroll feel
  const applyResistance = useCallback(
    (distance: number): number => {
      if (distance <= 0) return 0;
      // Logarithmic resistance for more natural feel
      return Math.min(maxPull, distance / (1 + distance / (maxPull * resistance)));
    },
    [maxPull, resistance]
  );

  // Animate pull distance with spring physics
  const animateTo = useCallback(
    (target: number, onComplete?: () => void) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      if (prefersReducedMotion) {
        setPullDistance(target);
        if (contentRef.current) {
          contentRef.current.style.transform = target > 0 ? `translateY(${target}px)` : "";
        }
        onComplete?.();
        return;
      }

      let currentValue = pullDistance;
      let currentVelocity = velocityRef.current;
      let lastTime = performance.now();

      const animate = (time: number) => {
        const dt = Math.min((time - lastTime) / 1000, 0.064); // Cap at ~15fps min
        lastTime = time;

        const result = springInterpolate(currentValue, target, currentVelocity, dt);
        currentValue = result.value;
        currentVelocity = result.velocity;

        setPullDistance(currentValue);
        if (contentRef.current) {
          contentRef.current.style.transform =
            currentValue > 0.5 ? `translateY(${currentValue}px)` : "";
        }

        if (currentValue !== target) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          rafRef.current = null;
          onComplete?.();
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    },
    [pullDistance, prefersReducedMotion]
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || state === "loading") return;
      if (!isAtTop()) return;

      const touch = e.touches[0];
      startYRef.current = touch.clientY;
      currentYRef.current = touch.clientY;
      lastTimeRef.current = performance.now();
      velocityRef.current = 0;
      isPullingRef.current = false;
      hasTriggeredHapticRef.current = false;
    },
    [enabled, state, isAtTop]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || state === "loading") return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;

      // Calculate velocity for momentum
      const now = performance.now();
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        velocityRef.current = (touch.clientY - currentYRef.current) / dt * 1000;
      }
      currentYRef.current = touch.clientY;
      lastTimeRef.current = now;

      // Only activate if pulling down and at top
      if (deltaY > 0 && isAtTop()) {
        e.preventDefault();
        isPullingRef.current = true;

        const resistedDistance = applyResistance(deltaY);
        setPullDistance(resistedDistance);

        if (contentRef.current) {
          contentRef.current.style.transform = `translateY(${resistedDistance}px)`;
        }

        // Check threshold for haptic feedback
        if (resistedDistance >= threshold && !hasTriggeredHapticRef.current) {
          hasTriggeredHapticRef.current = true;
          triggerHaptic("medium");
          setState("threshold");
        } else if (resistedDistance < threshold && hasTriggeredHapticRef.current) {
          hasTriggeredHapticRef.current = false;
          triggerHaptic("light");
          setState("pulling");
        } else if (resistedDistance > 0 && state === "idle") {
          setState("pulling");
        }
      }
    },
    [enabled, state, isAtTop, applyResistance, threshold]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold && state !== "loading") {
      // Trigger refresh
      setState("loading");
      triggerHaptic("heavy");

      // Animate to loading position
      animateTo(threshold * 0.6);

      try {
        await onRefresh();
        setState("success");
        triggerHaptic("success");
      } catch (error) {
        setState("error");
        triggerHaptic("error");
        console.error("[PullToRefresh] Refresh failed:", error);
      }

      // Show feedback then reset
      setTimeout(() => {
        animateTo(0, () => {
          setState("idle");
        });
      }, feedbackDuration);
    } else {
      // Snap back with spring physics
      setState("idle");
      animateTo(0);
    }
  }, [pullDistance, threshold, state, onRefresh, animateTo, feedbackDuration]);

  // Attach touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const options: AddEventListenerOptions = { passive: false };

    container.addEventListener("touchstart", handleTouchStart, options);
    container.addEventListener("touchmove", handleTouchMove, options);
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-auto overscroll-none touch-pan-y",
        "-webkit-overflow-scrolling-touch",
        className
      )}
      style={{
        // Prevent native pull-to-refresh on mobile browsers
        overscrollBehavior: "none",
      }}
      aria-label={ariaLabel}
    >
      {/* Refresh Indicator */}
      <RefreshIndicator
        state={state}
        pullProgress={pullProgress}
        pullDistance={pullDistance}
        successMessage={successMessage}
        errorMessage={errorMessage}
      />

      {/* Content Wrapper */}
      <div
        ref={contentRef}
        className="will-change-transform"
        style={{
          // GPU acceleration for smooth transforms
          transform: "translateZ(0)",
        }}
      >
        {children}
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="assertive">
        {state === "loading" && "Refreshing data..."}
        {state === "success" && successMessage}
        {state === "error" && errorMessage}
      </div>

      {/* Inline keyframe animations */}
      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes check-draw {
          0% {
            stroke-dasharray: 0, 100;
          }
          100% {
            stroke-dasharray: 100, 0;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-check-draw {
          animation: check-draw 0.4s ease-out 0.1s forwards;
          stroke-dasharray: 0, 100;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { PullToRefreshProps, RefreshState };
export default PullToRefresh;
