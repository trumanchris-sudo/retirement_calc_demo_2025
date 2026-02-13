"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Preset gradient configurations for common financial contexts
 */
const gradientPresets = {
  /** Green gradient for positive metrics (portfolio totals, gains) */
  "wealth-green": {
    colors: ["#10b981", "#34d399", "#6ee7b7", "#34d399", "#10b981"],
    shadow: "0 0 20px rgba(16, 185, 129, 0.3)",
  },
  /** Yellow/amber gradient for warnings or moderate states */
  "caution-yellow": {
    colors: ["#f59e0b", "#fbbf24", "#fcd34d", "#fbbf24", "#f59e0b"],
    shadow: "0 0 20px rgba(245, 158, 11, 0.3)",
  },
  /** Red gradient for negative metrics (losses, danger) */
  "danger-red": {
    colors: ["#ef4444", "#f87171", "#fca5a5", "#f87171", "#ef4444"],
    shadow: "0 0 20px rgba(239, 68, 68, 0.3)",
  },
  /** Premium gold gradient for achievements and highlights */
  "premium-gold": {
    colors: ["#b8860b", "#daa520", "#ffd700", "#daa520", "#b8860b"],
    shadow: "0 0 25px rgba(218, 165, 32, 0.4)",
  },
  /** Blue gradient for informational/neutral metrics */
  "info-blue": {
    colors: ["#3b82f6", "#60a5fa", "#93c5fd", "#60a5fa", "#3b82f6"],
    shadow: "0 0 20px rgba(59, 130, 246, 0.3)",
  },
  /** Purple gradient for special/premium features */
  "premium-purple": {
    colors: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#a78bfa", "#8b5cf6"],
    shadow: "0 0 20px rgba(139, 92, 246, 0.3)",
  },
} as const;

type GradientPreset = keyof typeof gradientPresets;

const gradientTextVariants = cva("inline-block font-bold", {
  variants: {
    size: {
      sm: "text-lg",
      md: "text-2xl",
      lg: "text-4xl",
      xl: "text-5xl md:text-6xl",
      "2xl": "text-6xl md:text-7xl",
    },
  },
  defaultVariants: {
    size: "lg",
  },
});

export interface GradientTextProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof gradientTextVariants> {
  /** Preset gradient theme */
  preset?: GradientPreset;
  /** Custom gradient colors (overrides preset) */
  colors?: string[];
  /** Custom text shadow (overrides preset) */
  shadow?: string;
  /** Animation duration in seconds (default: 6) */
  animationDuration?: number;
  /** Disable animation entirely */
  disableAnimation?: boolean;
  /** Disable text shadow */
  disableShadow?: boolean;
  /** HTML element to render as */
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div";
}

/**
 * GradientText - Beautiful animated gradient text for headlines and key metrics
 *
 * Features:
 * - Animated gradient that slowly shifts colors
 * - Preset gradients for common financial contexts
 * - Custom gradient and shadow support
 * - Text shadow for depth
 * - Respects prefers-reduced-motion for accessibility
 *
 * @example
 * // Using a preset
 * <GradientText preset="wealth-green" size="xl">$1,234,567</GradientText>
 *
 * @example
 * // Using custom colors
 * <GradientText colors={["#ff0000", "#00ff00", "#0000ff"]}>Custom</GradientText>
 *
 * @example
 * // As a headline
 * <GradientText as="h1" preset="premium-gold" size="2xl">
 *   Your Retirement Future
 * </GradientText>
 */
export function GradientText({
  children,
  className,
  preset = "wealth-green",
  colors: customColors,
  shadow: customShadow,
  size,
  animationDuration = 6,
  disableAnimation = false,
  disableShadow = false,
  as: Component = "span",
  style,
  ...props
}: GradientTextProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

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

  // Get colors and shadow from preset or custom props
  const presetConfig = gradientPresets[preset];
  const colors = customColors || presetConfig.colors;
  const textShadow = customShadow || presetConfig.shadow;

  // Generate CSS gradient string
  const gradientString = `linear-gradient(
    90deg,
    ${colors.join(", ")}
  )`;

  // Determine if animation should be active
  const shouldAnimate = !disableAnimation && !prefersReducedMotion;

  // Generate unique animation name to avoid conflicts
  const animationId = React.useId().replace(/:/g, "");

  // Inline styles for the gradient effect
  const gradientStyles: React.CSSProperties = {
    background: gradientString,
    backgroundSize: shouldAnimate ? "200% auto" : "100% auto",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: disableShadow ? "none" : textShadow,
    animation: shouldAnimate
      ? `gradient-shift-${animationId} ${animationDuration}s ease infinite`
      : "none",
    ...style,
  };

  return (
    <>
      {/* Scoped keyframes for this instance */}
      {shouldAnimate && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes gradient-shift-${animationId} {
                0%, 100% {
                  background-position: 0% 50%;
                }
                50% {
                  background-position: 100% 50%;
                }
              }
            `,
          }}
        />
      )}
      <Component
        className={cn(gradientTextVariants({ size }), className)}
        style={gradientStyles}
        // Accessibility: ensure text is readable for screen readers
        role="text"
        aria-label={typeof children === "string" ? children : undefined}
        {...props}
      >
        {children}
      </Component>
    </>
  );
}

/**
 * Convenience components for common use cases
 */

export function WealthGradientText(
  props: Omit<GradientTextProps, "preset">
) {
  return <GradientText preset="wealth-green" {...props} />;
}

export function CautionGradientText(
  props: Omit<GradientTextProps, "preset">
) {
  return <GradientText preset="caution-yellow" {...props} />;
}

export function DangerGradientText(
  props: Omit<GradientTextProps, "preset">
) {
  return <GradientText preset="danger-red" {...props} />;
}

export function PremiumGradientText(
  props: Omit<GradientTextProps, "preset">
) {
  return <GradientText preset="premium-gold" {...props} />;
}

/**
 * Hook for programmatic gradient text styling
 * Useful when you need gradient styles in custom components
 */
export function useGradientStyles({
  preset = "wealth-green",
  colors: customColors,
  shadow: customShadow,
  animationDuration = 6,
  disableAnimation = false,
  disableShadow = false,
}: Pick<
  GradientTextProps,
  | "preset"
  | "colors"
  | "shadow"
  | "animationDuration"
  | "disableAnimation"
  | "disableShadow"
> = {}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const presetConfig = gradientPresets[preset];
  const colors = customColors || presetConfig.colors;
  const textShadow = customShadow || presetConfig.shadow;
  const shouldAnimate = !disableAnimation && !prefersReducedMotion;

  const gradientString = `linear-gradient(90deg, ${colors.join(", ")})`;

  return {
    colors,
    textShadow: disableShadow ? "none" : textShadow,
    gradientString,
    shouldAnimate,
    animationDuration,
    styles: {
      background: gradientString,
      backgroundSize: shouldAnimate ? "200% auto" : "100% auto",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      textShadow: disableShadow ? "none" : textShadow,
    } as React.CSSProperties,
  };
}

export { gradientPresets };
export type { GradientPreset };
