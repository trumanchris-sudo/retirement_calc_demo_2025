"use client";

import React, {
  forwardRef,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// PulseButton - Buttons that pulse on important CTAs
// ============================================================================

interface PulseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  pulseColor?: string;
  pulseIntensity?: "subtle" | "normal" | "strong";
  pulseDuration?: number;
  isPulsing?: boolean;
}

export const PulseButton = forwardRef<HTMLButtonElement, PulseButtonProps>(
  (
    {
      children,
      className,
      pulseColor = "rgba(59, 130, 246, 0.5)",
      pulseIntensity = "normal",
      pulseDuration = 2000,
      isPulsing = true,
      ...props
    },
    ref
  ) => {
    const intensityScale = {
      subtle: "scale-[1.02]",
      normal: "scale-105",
      strong: "scale-110",
    };

    const pulseOpacity = {
      subtle: "0.3",
      normal: "0.5",
      strong: "0.7",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-md px-4 py-2 font-medium transition-all",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {isPulsing && (
          <span
            className={cn(
              "absolute inset-0 rounded-md animate-pulse",
              intensityScale[pulseIntensity]
            )}
            style={{
              background: pulseColor,
              opacity: pulseOpacity[pulseIntensity],
              animationDuration: `${pulseDuration}ms`,
            }}
          />
        )}
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);
PulseButton.displayName = "PulseButton";

// ============================================================================
// HoverScale - Subtle scale transforms on hover
// ============================================================================

interface HoverScaleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  scale?: number;
  duration?: number;
}

export const HoverScale = forwardRef<HTMLDivElement, HoverScaleProps>(
  (
    {
      children,
      className,
      scale = 1.02,
      duration = 200,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "transition-transform ease-out cursor-pointer",
          "hover:shadow-lg",
          className
        )}
        style={{
          transitionDuration: `${duration}ms`,
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLElement).style.transform = `scale(${scale})`;
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
HoverScale.displayName = "HoverScale";

// ============================================================================
// ClickRipple - Material Design style ripple effects
// ============================================================================

interface RippleInstance {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface ClickRippleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  rippleColor?: string;
  rippleDuration?: number;
  disabled?: boolean;
}

export const ClickRipple = forwardRef<HTMLDivElement, ClickRippleProps>(
  (
    {
      children,
      className,
      rippleColor = "rgba(255, 255, 255, 0.35)",
      rippleDuration = 600,
      disabled = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<RippleInstance[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const newRipple: RippleInstance = {
          id: Date.now(),
          x,
          y,
          size,
        };

        setRipples((prev) => [...prev, newRipple]);

        // Clean up ripple after animation
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, rippleDuration);

        onClick?.(e);
      },
      [disabled, rippleDuration, onClick]
    );

    return (
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          "relative overflow-hidden cursor-pointer",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none animate-ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: rippleColor,
              animationDuration: `${rippleDuration}ms`,
            }}
          />
        ))}
        <style jsx>{`
          @keyframes ripple {
            from {
              transform: scale(0);
              opacity: 1;
            }
            to {
              transform: scale(1);
              opacity: 0;
            }
          }
          .animate-ripple {
            animation: ripple ease-out forwards;
          }
        `}</style>
      </div>
    );
  }
);
ClickRipple.displayName = "ClickRipple";

// ============================================================================
// FocusRing - Beautiful custom focus rings for accessibility
// ============================================================================

interface FocusRingProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  ringColor?: string;
  ringWidth?: number;
  ringOffset?: number;
  ringStyle?: "solid" | "dashed" | "dotted" | "glow";
}

export const FocusRing = forwardRef<HTMLDivElement, FocusRingProps>(
  (
    {
      children,
      className,
      ringColor = "hsl(var(--ring))",
      ringWidth = 2,
      ringOffset = 2,
      ringStyle = "solid",
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const ringStyles = {
      solid: `${ringWidth}px solid ${ringColor}`,
      dashed: `${ringWidth}px dashed ${ringColor}`,
      dotted: `${ringWidth}px dotted ${ringColor}`,
      glow: "none",
    };

    const glowShadow = ringStyle === "glow"
      ? `0 0 0 ${ringWidth}px ${ringColor}, 0 0 ${ringWidth * 4}px ${ringColor}`
      : "none";

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-block transition-all duration-200",
          className
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      >
        <div
          className="transition-all duration-200 rounded-md"
          style={{
            outline: isFocused ? ringStyles[ringStyle] : "none",
            outlineOffset: isFocused ? ringOffset : 0,
            boxShadow: isFocused ? glowShadow : "none",
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
FocusRing.displayName = "FocusRing";

// ============================================================================
// LoadingDots - Animated loading indicators
// ============================================================================

interface LoadingDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  color?: string;
  dotCount?: number;
  speed?: "slow" | "normal" | "fast";
}

export const LoadingDots = forwardRef<HTMLDivElement, LoadingDotsProps>(
  (
    {
      className,
      size = "md",
      color = "currentColor",
      dotCount = 3,
      speed = "normal",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "w-1.5 h-1.5",
      md: "w-2.5 h-2.5",
      lg: "w-4 h-4",
    };

    const gapClasses = {
      sm: "gap-1",
      md: "gap-1.5",
      lg: "gap-2",
    };

    const speedDurations = {
      slow: 1.4,
      normal: 1.0,
      fast: 0.6,
    };

    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center", gapClasses[size], className)}
        role="status"
        aria-label="Loading"
        {...props}
      >
        {Array.from({ length: dotCount }).map((_, i) => (
          <span
            key={i}
            className={cn("rounded-full animate-bounce", sizeClasses[size])}
            style={{
              backgroundColor: color,
              animationDuration: `${speedDurations[speed]}s`,
              animationDelay: `${i * (speedDurations[speed] / dotCount)}s`,
            }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);
LoadingDots.displayName = "LoadingDots";

// ============================================================================
// SuccessCheck - Animated checkmark for completed actions
// ============================================================================

interface SuccessCheckProps extends React.SVGAttributes<SVGElement> {
  size?: number;
  strokeWidth?: number;
  color?: string;
  duration?: number;
  delay?: number;
  onAnimationComplete?: () => void;
}

export const SuccessCheck = forwardRef<SVGSVGElement, SuccessCheckProps>(
  (
    {
      className,
      size = 48,
      strokeWidth = 3,
      color = "currentColor",
      duration = 500,
      delay = 0,
      onAnimationComplete,
      ...props
    },
    ref
  ) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, delay);

      const completeTimer = setTimeout(() => {
        onAnimationComplete?.();
      }, delay + duration);

      return () => {
        clearTimeout(timer);
        clearTimeout(completeTimer);
      };
    }, [delay, duration, onAnimationComplete]);

    return (
      <svg
        ref={ref}
        className={cn("inline-block", className)}
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {/* Circle */}
        <circle
          cx="26"
          cy="26"
          r="23"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          className="transition-all"
          style={{
            strokeDasharray: 144.5,
            strokeDashoffset: isAnimating ? 0 : 144.5,
            transition: `stroke-dashoffset ${duration}ms ease-out`,
          }}
        />
        {/* Checkmark */}
        <path
          d="M14 27L22 35L38 19"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{
            strokeDasharray: 50,
            strokeDashoffset: isAnimating ? 0 : 50,
            transition: `stroke-dashoffset ${duration * 0.6}ms ease-out ${duration * 0.4}ms`,
          }}
        />
      </svg>
    );
  }
);
SuccessCheck.displayName = "SuccessCheck";

// ============================================================================
// ShakeError - Shake animation for validation errors
// ============================================================================

interface ShakeErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isShaking?: boolean;
  intensity?: "subtle" | "normal" | "strong";
  duration?: number;
  onShakeComplete?: () => void;
}

export const ShakeError = forwardRef<HTMLDivElement, ShakeErrorProps>(
  (
    {
      children,
      className,
      isShaking = false,
      intensity = "normal",
      duration = 400,
      onShakeComplete,
      ...props
    },
    ref
  ) => {
    const [shaking, setShaking] = useState(isShaking);

    useEffect(() => {
      if (isShaking) {
        setShaking(true);
        const timer = setTimeout(() => {
          setShaking(false);
          onShakeComplete?.();
        }, duration);
        return () => clearTimeout(timer);
      }
    }, [isShaking, duration, onShakeComplete]);

    const intensityValues = {
      subtle: "2px",
      normal: "4px",
      strong: "8px",
    };

    const shakeDistance = intensityValues[intensity];

    return (
      <div
        ref={ref}
        className={cn(
          "transition-colors",
          shaking && "animate-shake",
          className
        )}
        style={
          {
            "--shake-distance": shakeDistance,
            animationDuration: shaking ? `${duration}ms` : undefined,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(calc(-1 * var(--shake-distance))); }
            20%, 40%, 60%, 80% { transform: translateX(var(--shake-distance)); }
          }
          .animate-shake {
            animation: shake ease-in-out;
          }
        `}</style>
      </div>
    );
  }
);
ShakeError.displayName = "ShakeError";

// ============================================================================
// Additional utility hooks for micro-interactions
// ============================================================================

/**
 * Hook for adding hover state to any element
 */
export function useHover<T extends HTMLElement = HTMLDivElement>() {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return { ref, isHovered };
}

/**
 * Hook for adding press/active state to any element
 */
export function usePress<T extends HTMLElement = HTMLDivElement>() {
  const [isPressed, setIsPressed] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);
    const handleMouseLeave = () => setIsPressed(false);

    element.addEventListener("mousedown", handleMouseDown);
    element.addEventListener("mouseup", handleMouseUp);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mousedown", handleMouseDown);
      element.removeEventListener("mouseup", handleMouseUp);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return { ref, isPressed };
}
