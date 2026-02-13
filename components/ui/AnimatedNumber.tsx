"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

// Animation speed presets
export type AnimationSpeed = "fast" | "normal" | "slow" | "verySlow";

const SPEED_DURATIONS: Record<AnimationSpeed, number> = {
  fast: 600,
  normal: 1200,
  slow: 2000,
  verySlow: 3000,
};

// Spring physics configuration
interface SpringConfig {
  stiffness: number; // Spring stiffness (higher = faster)
  damping: number; // Damping ratio (higher = less oscillation)
  mass: number; // Mass (higher = more inertia)
}

const SPRING_PRESETS: Record<AnimationSpeed, SpringConfig> = {
  fast: { stiffness: 300, damping: 30, mass: 1 },
  normal: { stiffness: 180, damping: 20, mass: 1 },
  slow: { stiffness: 100, damping: 15, mass: 1.2 },
  verySlow: { stiffness: 60, damping: 12, mass: 1.5 },
};

interface AnimatedNumberProps {
  /** The target value to animate to */
  value: number;
  /** Animation duration in milliseconds (overrides speed preset) */
  duration?: number;
  /** Animation speed preset */
  speed?: AnimationSpeed;
  /** Custom formatter function */
  format?: (n: number) => string;
  /** Delay before animation starts (milliseconds) */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Prefix to display before the number (e.g., "$") */
  prefix?: string;
  /** Suffix to display after the number (e.g., "%", "K", "M") */
  suffix?: string;
  /** Number of decimal places (default: 0) */
  decimals?: number;
  /** Enable comma formatting for large numbers */
  useCommas?: boolean;
  /** Enable color transitions based on value changes */
  colorTransition?: boolean;
  /** Custom color for positive changes (default: emerald-500) */
  positiveColor?: string;
  /** Custom color for negative changes (default: red-500) */
  negativeColor?: string;
  /** Enable scale pulse effect on significant changes */
  pulseOnChange?: boolean;
  /** Threshold for "significant" change as percentage (default: 5) */
  significantChangeThreshold?: number;
  /** Use spring physics instead of easing */
  useSpring?: boolean;
  /** Custom spring configuration */
  springConfig?: Partial<SpringConfig>;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Always show sign (+/-) */
  showSign?: boolean;
}

/**
 * Formats a number with commas and decimal places
 */
const formatWithCommas = (
  value: number,
  decimals: number,
  useCommas: boolean
): string => {
  const fixed = Math.abs(value).toFixed(decimals);
  if (!useCommas) return fixed;

  const parts = fixed.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

/**
 * Spring physics simulation
 */
const useSpringAnimation = (
  target: number,
  config: SpringConfig,
  enabled: boolean
): number => {
  const [current, setCurrent] = useState(target);
  const velocityRef = useRef(0);
  const positionRef = useRef(target);
  const targetRef = useRef(target);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    if (!enabled) {
      setCurrent(target);
      return;
    }

    const { stiffness, damping, mass } = config;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.064); // Cap at ~15fps minimum
      lastTime = currentTime;

      const displacement = positionRef.current - targetRef.current;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * velocityRef.current;
      const acceleration = (springForce + dampingForce) / mass;

      velocityRef.current += acceleration * deltaTime;
      positionRef.current += velocityRef.current * deltaTime;

      // Check if animation has settled
      const isSettled =
        Math.abs(displacement) < 0.01 &&
        Math.abs(velocityRef.current) < 0.01;

      if (isSettled) {
        positionRef.current = targetRef.current;
        velocityRef.current = 0;
        setCurrent(targetRef.current);
      } else {
        setCurrent(positionRef.current);
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, config, enabled]);

  return current;
};

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration,
  speed = "normal",
  format,
  delay = 0,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0,
  useCommas = true,
  colorTransition = false,
  positiveColor = "text-emerald-500",
  negativeColor = "text-red-500",
  pulseOnChange = false,
  significantChangeThreshold = 5,
  useSpring = true,
  springConfig,
  onAnimationComplete,
  showSign = false,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [changeDirection, setChangeDirection] = useState<"positive" | "negative" | "neutral">("neutral");
  const [colorOpacity, setColorOpacity] = useState(0);

  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const startValueRef = useRef(0);
  const previousValueRef = useRef(value);
  const isFirstRender = useRef(true);
  const animationCompleteTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Resolve duration from speed preset or explicit value
  const effectiveDuration = duration ?? SPEED_DURATIONS[speed];

  // Resolve spring config
  const effectiveSpringConfig: SpringConfig = useMemo(
    () => ({
      ...SPRING_PRESETS[speed],
      ...springConfig,
    }),
    [speed, springConfig]
  );

  // Spring animation value
  const springValue = useSpringAnimation(
    hasStarted ? value : 0,
    effectiveSpringConfig,
    useSpring && hasStarted
  );

  // Easing function with overshoot for more dynamic feel
  const easeOutBack = useCallback((t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }, []);

  // Standard easing fallback
  const easeOutQuart = useCallback((t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  }, []);

  // Animate function for non-spring animation
  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / effectiveDuration, 1);

      // Use easeOutBack for more dynamic feel, but only if not overshooting too much
      const easedProgress = Math.abs(value - startValueRef.current) > 1000
        ? easeOutQuart(progress)
        : easeOutBack(progress);

      const current =
        startValueRef.current +
        (value - startValueRef.current) * Math.min(easedProgress, 1);
      setDisplayValue(current);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        setDisplayValue(value);
        if (animationCompleteTimeoutRef.current) {
          clearTimeout(animationCompleteTimeoutRef.current);
        }
        animationCompleteTimeoutRef.current = setTimeout(() => {
          onAnimationComplete?.();
        }, 50);
      }
    },
    [value, effectiveDuration, easeOutBack, easeOutQuart, onAnimationComplete]
  );

  // Handle delay
  useEffect(() => {
    if (delay > 0) {
      const delayTimer = setTimeout(() => {
        setHasStarted(true);
      }, delay);
      return () => clearTimeout(delayTimer);
    } else {
      setHasStarted(true);
    }
  }, [delay]);

  // Detect significant changes and trigger effects
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousValueRef.current = value;
      return;
    }

    const previousValue = previousValueRef.current;
    const change = value - previousValue;
    const percentChange =
      previousValue !== 0
        ? Math.abs((change / previousValue) * 100)
        : Math.abs(change) > 0
        ? 100
        : 0;

    // Determine change direction
    if (change > 0) {
      setChangeDirection("positive");
    } else if (change < 0) {
      setChangeDirection("negative");
    } else {
      setChangeDirection("neutral");
    }

    // Trigger color transition
    if (colorTransition && change !== 0) {
      setColorOpacity(1);
      const fadeTimer = setTimeout(() => {
        setColorOpacity(0);
      }, 1500);
      return () => clearTimeout(fadeTimer);
    }

    // Trigger pulse on significant changes
    if (pulseOnChange && percentChange >= significantChangeThreshold) {
      setIsPulsing(true);
      const pulseTimer = setTimeout(() => {
        setIsPulsing(false);
      }, 400);
      return () => clearTimeout(pulseTimer);
    }

    previousValueRef.current = value;
  }, [value, colorTransition, pulseOnChange, significantChangeThreshold]);

  // Main animation effect (for non-spring)
  useEffect(() => {
    if (!hasStarted || useSpring) return;

    startValueRef.current = displayValue;
    startTimeRef.current = undefined;
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [value, hasStarted, useSpring, animate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationCompleteTimeoutRef.current) {
        clearTimeout(animationCompleteTimeoutRef.current);
      }
    };
  }, []);

  // Determine which value to display
  const currentValue = useSpring ? springValue : displayValue;

  // Format the number
  const formattedNumber = useMemo(() => {
    if (format) {
      return format(currentValue);
    }

    const isNegative = currentValue < 0;
    const formatted = formatWithCommas(currentValue, decimals, useCommas);

    let sign = "";
    if (showSign && currentValue > 0) {
      sign = "+";
    } else if (isNegative) {
      sign = "-";
    }

    return `${prefix}${sign}${formatted}${suffix}`;
  }, [currentValue, format, decimals, useCommas, prefix, suffix, showSign]);

  // Compute dynamic color class
  const colorClass = useMemo(() => {
    if (!colorTransition || colorOpacity === 0) return "";
    return changeDirection === "positive"
      ? positiveColor
      : changeDirection === "negative"
      ? negativeColor
      : "";
  }, [colorTransition, colorOpacity, changeDirection, positiveColor, negativeColor]);

  // Compute dynamic styles
  const dynamicStyles = useMemo(
    () => ({
      transition: "color 0.3s ease-out, transform 0.2s ease-out",
      transform: isPulsing ? "scale(1.08)" : "scale(1)",
    }),
    [isPulsing]
  );

  return (
    <span
      className={cn(
        "inline-block tabular-nums",
        colorClass,
        isPulsing && "animate-pulse",
        className
      )}
      style={{
        ...dynamicStyles,
        ...(colorTransition && colorOpacity > 0
          ? { opacity: 1 }
          : {}),
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {formattedNumber}
    </span>
  );
};

/**
 * Preset configurations for common use cases
 */
export const AnimatedCurrency: React.FC<
  Omit<AnimatedNumberProps, "prefix" | "useCommas" | "decimals"> & {
    currency?: string;
    showCents?: boolean;
  }
> = ({ currency = "$", showCents = false, ...props }) => (
  <AnimatedNumber
    prefix={currency}
    useCommas={true}
    decimals={showCents ? 2 : 0}
    colorTransition={true}
    pulseOnChange={true}
    {...props}
  />
);

export const AnimatedPercentage: React.FC<
  Omit<AnimatedNumberProps, "suffix" | "decimals">
> = (props) => (
  <AnimatedNumber
    suffix="%"
    decimals={1}
    colorTransition={true}
    {...props}
  />
);

export const AnimatedCompactNumber: React.FC<
  Omit<AnimatedNumberProps, "format">
> = (props) => {
  const compactFormat = useCallback((n: number): string => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000_000) {
      return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
    }
    if (abs >= 1_000_000) {
      return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}${(abs / 1_000).toFixed(1)}K`;
    }
    return `${sign}${abs.toFixed(0)}`;
  }, []);

  return (
    <AnimatedNumber
      format={compactFormat}
      colorTransition={true}
      pulseOnChange={true}
      {...props}
    />
  );
};
