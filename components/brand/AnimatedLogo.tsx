"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types & Configuration
// =============================================================================

type LogoSize = "sm" | "md" | "lg";
type LogoState = "loading" | "idle" | "hover";

interface AnimatedLogoProps {
  /** Size variant of the logo */
  size?: LogoSize;
  /** Whether the logo is in loading state */
  isLoading?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Callback when logo animation completes initial load */
  onAnimationComplete?: () => void;
  /** Accessible label for the logo */
  ariaLabel?: string;
  /** Whether to show the wordmark alongside the icon */
  showWordmark?: boolean;
}

// Size configurations for consistent scaling
const sizeConfig: Record<LogoSize, {
  icon: number;
  fontSize: number;
  wordmarkSize: string;
  gap: string;
}> = {
  sm: { icon: 32, fontSize: 20, wordmarkSize: "text-lg", gap: "gap-2" },
  md: { icon: 48, fontSize: 30, wordmarkSize: "text-2xl", gap: "gap-3" },
  lg: { icon: 72, fontSize: 44, wordmarkSize: "text-4xl", gap: "gap-4" },
};

// Brand color palette
const brandColors = {
  primary: "#6b4cd6",
  primaryLight: "#8366e8",
  primaryDark: "#5a3db8",
  accent: "#7d5ee6",
  highlight: "#9b7ff0",
  glow: "rgba(107, 76, 214, 0.4)",
};

// =============================================================================
// AnimatedLogo Component
// =============================================================================

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  size = "md",
  isLoading = false,
  className,
  onAnimationComplete,
  ariaLabel = "Retirement Calculator Logo",
  showWordmark = false,
}) => {
  const [state, setState] = useState<LogoState>("idle");
  const [hasAnimated, setHasAnimated] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const config = sizeConfig[size];

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Handle loading state
  useEffect(() => {
    if (isLoading) {
      setState("loading");
    } else {
      setState("idle");
    }
  }, [isLoading]);

  // Trigger entrance animation on mount
  useEffect(() => {
    if (prefersReducedMotion) {
      setHasAnimated(true);
      onAnimationComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setHasAnimated(true);
      onAnimationComplete?.();
    }, 800);

    return () => clearTimeout(timer);
  }, [prefersReducedMotion, onAnimationComplete]);

  // Event handlers
  const handleMouseEnter = useCallback(() => {
    if (state !== "loading") {
      setState("hover");
    }
  }, [state]);

  const handleMouseLeave = useCallback(() => {
    if (state !== "loading") {
      setState("idle");
    }
  }, [state]);

  // Unique gradient IDs per instance
  const gradientId = useRef(`logo-gradient-${Math.random().toString(36).substr(2, 9)}`);
  const glowId = useRef(`logo-glow-${Math.random().toString(36).substr(2, 9)}`);
  const shimmerMaskId = useRef(`logo-shimmer-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <div
      ref={containerRef}
      className={cn(
        "inline-flex items-center select-none",
        config.gap,
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Logo Icon */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          "transition-transform duration-300 ease-out",
          !prefersReducedMotion && state === "hover" && "scale-110",
          !prefersReducedMotion && !hasAnimated && "animate-logo-entrance"
        )}
        style={{
          width: config.icon,
          height: config.icon,
        }}
      >
        {/* Glow effect layer */}
        <div
          className={cn(
            "absolute inset-0 rounded-[20%] blur-lg transition-opacity duration-500",
            state === "hover" && !prefersReducedMotion ? "opacity-80" : "opacity-0"
          )}
          style={{
            background: brandColors.glow,
            transform: "scale(1.2)",
          }}
          aria-hidden="true"
        />

        {/* Main SVG Logo */}
        <svg
          viewBox="0 0 100 100"
          className={cn(
            "relative z-10 w-full h-full",
            !prefersReducedMotion && state === "idle" && hasAnimated && "animate-logo-breathe",
            !prefersReducedMotion && state === "loading" && "animate-logo-loading"
          )}
          aria-hidden="true"
        >
          <defs>
            {/* Primary gradient */}
            <linearGradient
              id={gradientId.current}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={brandColors.primaryLight}>
                {!prefersReducedMotion && (
                  <animate
                    attributeName="stop-color"
                    values={`${brandColors.primaryLight};${brandColors.highlight};${brandColors.primaryLight}`}
                    dur="4s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="100%" stopColor={brandColors.primary}>
                {!prefersReducedMotion && (
                  <animate
                    attributeName="stop-color"
                    values={`${brandColors.primary};${brandColors.primaryDark};${brandColors.primary}`}
                    dur="4s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
            </linearGradient>

            {/* Glow filter */}
            <filter
              id={glowId.current}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Shimmer mask for loading state */}
            <linearGradient id={shimmerMaskId.current} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0">
                {!prefersReducedMotion && (
                  <animate
                    attributeName="offset"
                    values="-0.5;1.5"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="50%" stopColor="white" stopOpacity="0.6">
                {!prefersReducedMotion && (
                  <animate
                    attributeName="offset"
                    values="0;2"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="100%" stopColor="white" stopOpacity="0">
                {!prefersReducedMotion && (
                  <animate
                    attributeName="offset"
                    values="0.5;2.5"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
            </linearGradient>
          </defs>

          {/* Background shape */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="20"
            fill={`url(#${gradientId.current})`}
            filter={state === "hover" && !prefersReducedMotion ? `url(#${glowId.current})` : undefined}
            className="transition-all duration-300"
          />

          {/* Subtle inner border highlight */}
          <rect
            x="6"
            y="6"
            width="88"
            height="88"
            rx="18"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />

          {/* The "R" letterform */}
          <text
            x="50"
            y="68"
            textAnchor="middle"
            fontWeight="700"
            fontSize="56"
            fill="#fff"
            style={{ userSelect: "none" }}
            className={cn(
              "transition-all duration-300",
              !prefersReducedMotion && state === "hover" && "drop-shadow-lg"
            )}
          >
            R
          </text>

          {/* Shimmer overlay for loading */}
          {state === "loading" && !prefersReducedMotion && (
            <rect
              x="4"
              y="4"
              width="92"
              height="92"
              rx="20"
              fill={`url(#${shimmerMaskId.current})`}
              style={{ mixBlendMode: "overlay" }}
            />
          )}

          {/* Specular highlight */}
          <ellipse
            cx="35"
            cy="30"
            rx="25"
            ry="15"
            fill="rgba(255,255,255,0.12)"
            className={cn(
              "transition-opacity duration-500",
              state === "hover" && !prefersReducedMotion ? "opacity-60" : "opacity-100"
            )}
          >
            {!prefersReducedMotion && (
              <animate
                attributeName="opacity"
                values="0.12;0.18;0.12"
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </ellipse>
        </svg>

        {/* Loading spinner ring */}
        {state === "loading" && !prefersReducedMotion && (
          <svg
            className="absolute inset-0 w-full h-full animate-spin-slow"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={brandColors.accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="60 200"
              opacity="0.7"
            />
          </svg>
        )}
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className={cn(
            "font-bold tracking-tight",
            config.wordmarkSize,
            "bg-gradient-to-r from-[#8366e8] to-[#6b4cd6] bg-clip-text text-transparent",
            "transition-all duration-300",
            !prefersReducedMotion && !hasAnimated && "animate-wordmark-entrance",
            !prefersReducedMotion && state === "hover" && "tracking-wide"
          )}
        >
          RetireCalc
        </span>
      )}

      {/* Inline styles for animations */}
      <style jsx>{`
        @keyframes logo-entrance {
          0% {
            opacity: 0;
            transform: scale(0.5) rotate(-10deg);
          }
          60% {
            opacity: 1;
            transform: scale(1.08) rotate(2deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes logo-breathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        @keyframes logo-loading {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(0.96);
            opacity: 0.8;
          }
        }

        @keyframes wordmark-entrance {
          0% {
            opacity: 0;
            transform: translateX(-10px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-logo-entrance {
          animation: logo-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-logo-breathe {
          animation: logo-breathe 4s ease-in-out infinite;
        }

        .animate-logo-loading {
          animation: logo-loading 1.2s ease-in-out infinite;
        }

        .animate-wordmark-entrance {
          animation: wordmark-entrance 0.6s ease-out 0.4s forwards;
          opacity: 0;
        }

        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }

        /* Reduced motion: disable all animations */
        @media (prefers-reduced-motion: reduce) {
          .animate-logo-entrance,
          .animate-logo-breathe,
          .animate-logo-loading,
          .animate-wordmark-entrance,
          .animate-spin-slow {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};

// =============================================================================
// Export Default & Named
// =============================================================================

export default AnimatedLogo;

// Export types for external use
export type { AnimatedLogoProps, LogoSize, LogoState };
