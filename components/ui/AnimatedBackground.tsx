"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Color scheme configurations for animated gradient backgrounds
 * Inspired by Apple's design language with soft, luxurious gradients
 */
const colorSchemes = {
  /** Green/teal gradient for wealth and financial prosperity */
  wealth: {
    blobs: [
      { color: "rgba(16, 185, 129, 0.4)", x: 20, y: 30 },   // Emerald
      { color: "rgba(20, 184, 166, 0.35)", x: 70, y: 60 },  // Teal
      { color: "rgba(34, 197, 94, 0.3)", x: 40, y: 80 },    // Green
      { color: "rgba(6, 182, 212, 0.25)", x: 85, y: 20 },   // Cyan
    ],
    baseGradient: "from-slate-950 via-emerald-950/50 to-slate-950",
    accentColor: "rgba(16, 185, 129, 0.1)",
  },
  /** Blue/green gradient for growth and progress */
  growth: {
    blobs: [
      { color: "rgba(59, 130, 246, 0.4)", x: 30, y: 20 },   // Blue
      { color: "rgba(16, 185, 129, 0.35)", x: 60, y: 70 },  // Emerald
      { color: "rgba(14, 165, 233, 0.3)", x: 80, y: 40 },   // Sky
      { color: "rgba(34, 197, 94, 0.25)", x: 15, y: 65 },   // Green
    ],
    baseGradient: "from-slate-950 via-blue-950/50 to-slate-950",
    accentColor: "rgba(59, 130, 246, 0.1)",
  },
  /** Gold/purple gradient for premium/luxury feel */
  premium: {
    blobs: [
      { color: "rgba(168, 85, 247, 0.4)", x: 25, y: 25 },   // Purple
      { color: "rgba(217, 119, 6, 0.35)", x: 75, y: 55 },   // Amber
      { color: "rgba(139, 92, 246, 0.3)", x: 50, y: 75 },   // Violet
      { color: "rgba(245, 158, 11, 0.25)", x: 90, y: 15 },  // Yellow
    ],
    baseGradient: "from-slate-950 via-purple-950/50 to-slate-950",
    accentColor: "rgba(168, 85, 247, 0.1)",
  },
  /** Neutral dark gradient for subtle backgrounds */
  neutral: {
    blobs: [
      { color: "rgba(100, 116, 139, 0.3)", x: 20, y: 40 },  // Slate
      { color: "rgba(71, 85, 105, 0.25)", x: 70, y: 30 },   // Slate darker
      { color: "rgba(148, 163, 184, 0.2)", x: 45, y: 70 },  // Slate lighter
      { color: "rgba(51, 65, 85, 0.25)", x: 85, y: 60 },    // Slate darkest
    ],
    baseGradient: "from-slate-950 via-slate-900/50 to-slate-950",
    accentColor: "rgba(100, 116, 139, 0.05)",
  },
  /** Sunrise/sunset warm gradient */
  sunrise: {
    blobs: [
      { color: "rgba(251, 146, 60, 0.4)", x: 30, y: 35 },   // Orange
      { color: "rgba(244, 63, 94, 0.35)", x: 65, y: 50 },   // Rose
      { color: "rgba(251, 191, 36, 0.3)", x: 20, y: 70 },   // Amber
      { color: "rgba(236, 72, 153, 0.25)", x: 80, y: 25 },  // Pink
    ],
    baseGradient: "from-slate-950 via-orange-950/50 to-slate-950",
    accentColor: "rgba(251, 146, 60, 0.1)",
  },
} as const;

type ColorScheme = keyof typeof colorSchemes;

const backgroundVariants = cva("relative overflow-hidden", {
  variants: {
    /** Display mode for the background */
    mode: {
      /** Full screen background that fills viewport */
      fullscreen: "fixed inset-0 -z-10",
      /** Section background with relative positioning */
      section: "absolute inset-0 -z-10",
      /** Contained background within parent bounds */
      contained: "absolute inset-0",
    },
    /** Intensity of the gradient effect */
    intensity: {
      subtle: "opacity-60",
      medium: "opacity-80",
      vibrant: "opacity-100",
    },
  },
  defaultVariants: {
    mode: "section",
    intensity: "medium",
  },
});

export interface AnimatedBackgroundProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof backgroundVariants> {
  /** Color scheme preset */
  scheme?: ColorScheme;
  /** Animation speed multiplier (1 = default, 0.5 = slower, 2 = faster) */
  speed?: number;
  /** Enable noise texture overlay for depth */
  enableNoise?: boolean;
  /** Noise opacity (0-1) */
  noiseOpacity?: number;
  /** Disable animations for static background */
  disableAnimation?: boolean;
  /** Custom blur amount for blobs in pixels */
  blurAmount?: number;
  /** Enable vignette effect around edges */
  enableVignette?: boolean;
}

/**
 * AnimatedBackground - Mesmerizing animated gradient backgrounds
 *
 * Features:
 * - Slow-moving gradient blobs (Apple-style design language)
 * - Multiple color schemes (wealth, growth, premium, neutral, sunrise)
 * - Noise texture overlay for depth and visual interest
 * - GPU-accelerated animations using transform and will-change
 * - Subtle enough to not distract from content
 * - Respects prefers-reduced-motion for accessibility
 *
 * @example
 * // Hero section with wealth theme
 * <div className="relative min-h-screen">
 *   <AnimatedBackground scheme="wealth" mode="section" enableVignette />
 *   <div className="relative z-10">Your content here</div>
 * </div>
 *
 * @example
 * // Full page background
 * <AnimatedBackground scheme="premium" mode="fullscreen" intensity="subtle" />
 *
 * @example
 * // Contained within a card
 * <div className="relative rounded-xl overflow-hidden">
 *   <AnimatedBackground scheme="growth" mode="contained" enableNoise />
 *   <div className="relative z-10 p-6">Card content</div>
 * </div>
 */
export function AnimatedBackground({
  className,
  scheme = "wealth",
  speed = 1,
  mode,
  intensity,
  enableNoise = true,
  noiseOpacity = 0.03,
  disableAnimation = false,
  blurAmount = 100,
  enableVignette = false,
  ...props
}: AnimatedBackgroundProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const animationId = React.useId().replace(/:/g, "");

  // Check for reduced motion preference
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const schemeConfig = colorSchemes[scheme];
  const shouldAnimate = !disableAnimation && !prefersReducedMotion;

  // Calculate animation durations based on speed
  const baseDuration = 20 / speed; // Base 20 seconds per cycle

  // Generate unique blob animation keyframes
  const blobKeyframes = schemeConfig.blobs.map((blob, index) => {
    // Each blob has slightly different movement patterns
    const offsetX = (index * 15) % 30;
    const offsetY = (index * 20) % 40;
    return `
      @keyframes blob-move-${animationId}-${index} {
        0%, 100% {
          transform: translate(0%, 0%) scale(1);
        }
        25% {
          transform: translate(${10 + offsetX}%, ${-10 - offsetY / 2}%) scale(1.1);
        }
        50% {
          transform: translate(${-5 + offsetX / 2}%, ${15 + offsetY}%) scale(0.95);
        }
        75% {
          transform: translate(${-15 - offsetX}%, ${-5 - offsetY / 3}%) scale(1.05);
        }
      }
    `;
  });

  return (
    <div
      ref={containerRef}
      className={cn(backgroundVariants({ mode, intensity }), className)}
      aria-hidden="true"
      {...props}
    >
      {/* Inject keyframes for blob animations */}
      {shouldAnimate && (
        <style
          dangerouslySetInnerHTML={{
            __html: blobKeyframes.join("\n"),
          }}
        />
      )}

      {/* Base gradient layer */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          schemeConfig.baseGradient
        )}
      />

      {/* Animated gradient blobs */}
      <div className="absolute inset-0">
        {schemeConfig.blobs.map((blob, index) => {
          const size = 300 + index * 100; // Varying sizes
          const animationDuration = baseDuration + index * 4; // Staggered timing

          return (
            <div
              key={index}
              className="absolute rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${blob.x}%`,
                top: `${blob.y}%`,
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle at center, ${blob.color} 0%, transparent 70%)`,
                filter: `blur(${blurAmount}px)`,
                // GPU acceleration
                willChange: shouldAnimate ? "transform" : "auto",
                animation: shouldAnimate
                  ? `blob-move-${animationId}-${index} ${animationDuration}s ease-in-out infinite`
                  : "none",
                // Hardware acceleration
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                perspective: 1000,
              }}
            />
          );
        })}
      </div>

      {/* Secondary ambient layer for depth */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${schemeConfig.accentColor} 0%, transparent 70%)`,
        }}
      />

      {/* Noise texture overlay for depth */}
      {enableNoise && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: noiseOpacity,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            mixBlendMode: "overlay",
          }}
        />
      )}

      {/* Vignette effect */}
      {enableVignette && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.4) 100%)",
          }}
        />
      )}
    </div>
  );
}

/**
 * Preset background components for common use cases
 */

export function WealthBackground(
  props: Omit<AnimatedBackgroundProps, "scheme">
) {
  return <AnimatedBackground scheme="wealth" {...props} />;
}

export function GrowthBackground(
  props: Omit<AnimatedBackgroundProps, "scheme">
) {
  return <AnimatedBackground scheme="growth" {...props} />;
}

export function PremiumBackground(
  props: Omit<AnimatedBackgroundProps, "scheme">
) {
  return <AnimatedBackground scheme="premium" {...props} />;
}

export function NeutralBackground(
  props: Omit<AnimatedBackgroundProps, "scheme">
) {
  return <AnimatedBackground scheme="neutral" {...props} />;
}

export function SunriseBackground(
  props: Omit<AnimatedBackgroundProps, "scheme">
) {
  return <AnimatedBackground scheme="sunrise" {...props} />;
}

/**
 * HeroBackground - Optimized preset for hero sections
 * Pre-configured with fullscreen mode, vignette, and vibrant intensity
 */
export function HeroBackground({
  scheme = "wealth",
  ...props
}: Omit<AnimatedBackgroundProps, "mode" | "enableVignette" | "intensity">) {
  return (
    <AnimatedBackground
      scheme={scheme}
      mode="fullscreen"
      intensity="vibrant"
      enableVignette
      {...props}
    />
  );
}

/**
 * CardBackground - Optimized preset for card backgrounds
 * Pre-configured with contained mode and subtle intensity
 */
export function CardBackground({
  scheme = "neutral",
  ...props
}: Omit<AnimatedBackgroundProps, "mode" | "intensity">) {
  return (
    <AnimatedBackground
      scheme={scheme}
      mode="contained"
      intensity="subtle"
      speed={0.5}
      blurAmount={60}
      {...props}
    />
  );
}

/**
 * Hook for programmatic access to color scheme configurations
 */
export function useColorScheme(scheme: ColorScheme = "wealth") {
  return colorSchemes[scheme];
}

export { colorSchemes };
export type { ColorScheme };
