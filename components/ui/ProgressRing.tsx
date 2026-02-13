"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface RingSegment {
  /** Value from 0-100 representing the percentage */
  value: number;
  /** Unique ID for gradient definition */
  id: string;
  /** Label for the segment */
  label?: string;
  /** Gradient colors [start, end] or single color */
  colors: string | [string, string];
  /** Optional glow effect */
  glow?: boolean;
  /** Animation delay in ms */
  delay?: number;
}

export interface ProgressRingProps {
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Background track color */
  trackColor?: string;
  /** Single ring value (0-100) - use this OR segments */
  value?: number;
  /** Gradient colors for single ring mode */
  colors?: string | [string, string];
  /** Multiple ring segments for comparing metrics */
  segments?: RingSegment[];
  /** Whether to animate on scroll into view */
  animateOnScroll?: boolean;
  /** Animation duration in ms */
  duration?: number;
  /** Animation easing function */
  easing?: "linear" | "easeOut" | "easeInOut" | "spring";
  /** Enable glow effect */
  glow?: boolean;
  /** Center content */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Show value label in center */
  showValue?: boolean;
  /** Value format function */
  formatValue?: (value: number) => string;
  /** Ring rotation offset in degrees */
  rotationOffset?: number;
  /** Gap between segments in degrees (for multi-ring) */
  segmentGap?: number;
  /** Accessible label */
  ariaLabel?: string;
}

// Preset configurations for common use cases
export const RING_PRESETS = {
  retirementGoal: {
    colors: ["#10B981", "#34D399"] as [string, string], // Emerald gradient
    glow: true,
  },
  savingsRate: {
    colors: ["#3B82F6", "#60A5FA"] as [string, string], // Blue gradient
    glow: true,
  },
  monteCarloSuccess: {
    colors: ["#8B5CF6", "#A78BFA"] as [string, string], // Purple gradient
    glow: true,
  },
  portfolioAllocation: [
    { colors: ["#10B981", "#34D399"], label: "Stocks" },
    { colors: ["#3B82F6", "#60A5FA"], label: "Bonds" },
    { colors: ["#F59E0B", "#FBBF24"], label: "Real Estate" },
    { colors: ["#EC4899", "#F472B6"], label: "Cash" },
  ],
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
const easeInOutQuart = (t: number): number =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
const spring = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const getEasingFunction = (
  easing: ProgressRingProps["easing"]
): ((t: number) => number) => {
  switch (easing) {
    case "linear":
      return (t) => t;
    case "easeInOut":
      return easeInOutQuart;
    case "spring":
      return spring;
    default:
      return easeOutQuart;
  }
};

// =============================================================================
// Sub-Components
// =============================================================================

interface RingPathProps {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  progress: number;
  circumference: number;
  gradientId: string;
  glow?: boolean;
  index: number;
  rotationOffset: number;
}

const RingPath: React.FC<RingPathProps> = ({
  cx,
  cy,
  radius,
  strokeWidth,
  progress,
  circumference,
  gradientId,
  glow,
  index,
  rotationOffset,
}) => {
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <g>
      {/* Glow filter effect */}
      {glow && (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            filter: "blur(8px)",
            opacity: 0.5,
          }}
          transform={`rotate(${rotationOffset - 90} ${cx} ${cy})`}
        />
      )}
      {/* Main ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(${rotationOffset - 90} ${cx} ${cy})`}
        style={{
          transition: "stroke-dashoffset 0.1s ease-out",
        }}
      />
    </g>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 200,
  strokeWidth = 12,
  trackColor = "hsl(var(--muted) / 0.3)",
  value,
  colors = ["#10B981", "#34D399"],
  segments,
  animateOnScroll = true,
  duration = 1500,
  easing = "easeOut",
  glow = false,
  children,
  className,
  showValue = false,
  formatValue = (v) => `${Math.round(v)}%`,
  rotationOffset = 0,
  segmentGap = 0,
  ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!animateOnScroll);
  const [animatedValues, setAnimatedValues] = useState<number[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  // Calculate ring dimensions
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Normalize segments
  const normalizedSegments = useMemo<RingSegment[]>(() => {
    if (segments) {
      return segments;
    }
    if (value !== undefined) {
      return [
        {
          id: "main",
          value: Math.min(100, Math.max(0, value)),
          colors,
          glow,
          delay: 0,
        },
      ];
    }
    return [];
  }, [segments, value, colors, glow]);

  // Initialize animated values
  useEffect(() => {
    setAnimatedValues(normalizedSegments.map(() => 0));
  }, [normalizedSegments.length]);

  // Intersection Observer for scroll animation
  useEffect(() => {
    if (!animateOnScroll) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (containerRef.current) {
            observer.unobserve(containerRef.current);
          }
        }
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [animateOnScroll]);

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const easingFn = getEasingFunction(easing);

      const newValues = normalizedSegments.map((segment, index) => {
        const segmentDelay = segment.delay || index * 100;
        const adjustedElapsed = Math.max(0, elapsed - segmentDelay);
        const progress = Math.min(adjustedElapsed / duration, 1);
        const easedProgress = easingFn(progress);
        return segment.value * easedProgress;
      });

      setAnimatedValues(newValues);

      // Check if all animations are complete
      const maxDelay = Math.max(
        ...normalizedSegments.map((s, i) => s.delay || i * 100)
      );
      if (elapsed < duration + maxDelay) {
        animationRef.current = requestAnimationFrame(animate);
      }
    },
    [normalizedSegments, duration, easing]
  );

  // Start animation when visible
  useEffect(() => {
    if (isVisible && normalizedSegments.length > 0) {
      startTimeRef.current = undefined;
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isVisible, animate, normalizedSegments.length]);

  // Generate unique gradient IDs
  const gradientIds = useMemo(
    () => normalizedSegments.map((s) => `gradient-${s.id}-${Math.random().toString(36).slice(2, 8)}`),
    [normalizedSegments]
  );

  // Calculate segment rotations for multi-ring mode
  const segmentRotations = useMemo(() => {
    if (normalizedSegments.length <= 1) return [rotationOffset];

    const rotations: number[] = [];
    let currentRotation = rotationOffset;

    normalizedSegments.forEach((segment, index) => {
      rotations.push(currentRotation);
      const segmentAngle = (segment.value / 100) * 360;
      currentRotation += segmentAngle + segmentGap;
    });

    return rotations;
  }, [normalizedSegments, rotationOffset, segmentGap]);

  // Total value for display
  const totalValue = useMemo(
    () => animatedValues.reduce((sum, v) => sum + v, 0),
    [animatedValues]
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(totalValue)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel || "Progress indicator"}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-0"
      >
        {/* Gradient Definitions */}
        <defs>
          {normalizedSegments.map((segment, index) => {
            const segmentColors = Array.isArray(segment.colors)
              ? segment.colors
              : [segment.colors, segment.colors];

            return (
              <linearGradient
                key={gradientIds[index]}
                id={gradientIds[index]}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={segmentColors[0]} />
                <stop offset="100%" stopColor={segmentColors[1]} />
              </linearGradient>
            );
          })}

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="opacity-30"
        />

        {/* Animated Ring Segments */}
        {normalizedSegments.map((segment, index) => (
          <RingPath
            key={segment.id}
            cx={center}
            cy={center}
            radius={radius}
            strokeWidth={strokeWidth}
            progress={animatedValues[index] || 0}
            circumference={circumference}
            gradientId={gradientIds[index]}
            glow={segment.glow}
            index={index}
            rotationOffset={segmentRotations[index]}
          />
        ))}

        {/* Decorative end cap glow */}
        {glow && animatedValues[0] > 0 && (
          <circle
            cx={center + radius * Math.cos(((animatedValues[0] / 100) * 360 + rotationOffset - 90) * (Math.PI / 180))}
            cy={center + radius * Math.sin(((animatedValues[0] / 100) * 360 + rotationOffset - 90) * (Math.PI / 180))}
            r={strokeWidth / 2 + 2}
            fill={`url(#${gradientIds[0]})`}
            className="animate-pulse"
            style={{ filter: "blur(4px)", opacity: 0.8 }}
          />
        )}
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && !children && (
          <span className="text-2xl font-bold text-foreground">
            {formatValue(totalValue)}
          </span>
        )}
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// Specialized Components
// =============================================================================

interface RetirementGoalRingProps {
  /** Current savings */
  current: number;
  /** Target goal */
  goal: number;
  /** Size in pixels */
  size?: number;
  /** Show detailed breakdown */
  showDetails?: boolean;
  className?: string;
}

export const RetirementGoalRing: React.FC<RetirementGoalRingProps> = ({
  current,
  goal,
  size = 180,
  showDetails = true,
  className,
}) => {
  const percentage = Math.min(100, (current / goal) * 100);
  const isOnTrack = percentage >= 80;
  const colors: [string, string] = isOnTrack
    ? ["#10B981", "#34D399"] // Green
    : percentage >= 50
    ? ["#F59E0B", "#FBBF24"] // Amber
    : ["#EF4444", "#F87171"]; // Red

  const formatCurrency = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <ProgressRing
        size={size}
        value={percentage}
        colors={colors}
        glow
        strokeWidth={size * 0.06}
        ariaLabel={`Retirement goal progress: ${percentage.toFixed(0)}%`}
      >
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-foreground">
            {percentage.toFixed(0)}%
          </span>
          <span className="text-xs text-muted-foreground">of goal</span>
        </div>
      </ProgressRing>
      {showDetails && (
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">
            <span className="text-emerald-500">{formatCurrency(current)}</span>
            <span className="text-muted-foreground"> / </span>
            <span>{formatCurrency(goal)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(goal - current)} remaining
          </p>
        </div>
      )}
    </div>
  );
};

interface SavingsRateRingProps {
  /** Current savings rate as percentage (0-100) */
  rate: number;
  /** Recommended rate as percentage */
  recommended?: number;
  /** Size in pixels */
  size?: number;
  className?: string;
}

export const SavingsRateRing: React.FC<SavingsRateRingProps> = ({
  rate,
  recommended = 15,
  size = 160,
  className,
}) => {
  const isGood = rate >= recommended;
  const colors: [string, string] = isGood
    ? ["#3B82F6", "#60A5FA"]
    : ["#F97316", "#FB923C"];

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <ProgressRing
        size={size}
        value={Math.min(100, rate)}
        colors={colors}
        glow={isGood}
        strokeWidth={size * 0.07}
        ariaLabel={`Savings rate: ${rate}%`}
      >
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-foreground">{rate.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground">savings rate</span>
        </div>
      </ProgressRing>
      <div className="text-center">
        <p className={cn("text-sm font-medium", isGood ? "text-blue-500" : "text-orange-500")}>
          {isGood ? "Great job!" : `Target: ${recommended}%`}
        </p>
      </div>
    </div>
  );
};

interface MonteCarloSuccessRingProps {
  /** Success probability (0-100) */
  probability: number;
  /** Number of simulations run */
  simulations?: number;
  /** Size in pixels */
  size?: number;
  className?: string;
}

export const MonteCarloSuccessRing: React.FC<MonteCarloSuccessRingProps> = ({
  probability,
  simulations = 10000,
  size = 180,
  className,
}) => {
  const getColors = (prob: number): [string, string] => {
    if (prob >= 90) return ["#10B981", "#34D399"]; // Excellent - Green
    if (prob >= 75) return ["#22D3EE", "#67E8F9"]; // Good - Cyan
    if (prob >= 50) return ["#F59E0B", "#FBBF24"]; // Moderate - Amber
    return ["#EF4444", "#F87171"]; // Low - Red
  };

  const getLabel = (prob: number) => {
    if (prob >= 90) return "Excellent";
    if (prob >= 75) return "Good";
    if (prob >= 50) return "Moderate";
    return "Needs Review";
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <ProgressRing
        size={size}
        value={probability}
        colors={getColors(probability)}
        glow
        strokeWidth={size * 0.065}
        duration={2000}
        easing="spring"
        ariaLabel={`Monte Carlo success probability: ${probability}%`}
      >
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-foreground">
            {probability.toFixed(0)}%
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {getLabel(probability)}
          </span>
        </div>
      </ProgressRing>
      <p className="text-xs text-muted-foreground text-center">
        Based on {simulations.toLocaleString()} simulations
      </p>
    </div>
  );
};

interface PortfolioAllocationRingProps {
  /** Array of allocations with name and percentage */
  allocations: Array<{
    name: string;
    percentage: number;
    color?: string | [string, string];
  }>;
  /** Size in pixels */
  size?: number;
  /** Show legend */
  showLegend?: boolean;
  className?: string;
}

// Default colors for portfolio allocations
const DEFAULT_ALLOCATION_COLORS: [string, string][] = [
  ["#10B981", "#34D399"], // Emerald
  ["#3B82F6", "#60A5FA"], // Blue
  ["#8B5CF6", "#A78BFA"], // Purple
  ["#F59E0B", "#FBBF24"], // Amber
  ["#EC4899", "#F472B6"], // Pink
  ["#14B8A6", "#2DD4BF"], // Teal
  ["#EF4444", "#F87171"], // Red
  ["#6366F1", "#818CF8"], // Indigo
];

export const PortfolioAllocationRing: React.FC<PortfolioAllocationRingProps> = ({
  allocations,
  size = 200,
  showLegend = true,
  className,
}) => {
  // Create segments from allocations
  const segments: RingSegment[] = allocations.map((alloc, index) => ({
    id: `alloc-${index}`,
    value: alloc.percentage,
    label: alloc.name,
    colors: alloc.color || DEFAULT_ALLOCATION_COLORS[index % DEFAULT_ALLOCATION_COLORS.length],
    delay: index * 150,
    glow: false,
  }));

  // Calculate cumulative rotations for pie-chart style
  const cumulativeSegments = useMemo(() => {
    let cumulative = 0;
    return segments.map((segment) => {
      const result = { ...segment, rotation: cumulative * 3.6 }; // 360/100 = 3.6
      cumulative += segment.value;
      return result;
    });
  }, [segments]);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        <ProgressRing
          size={size}
          strokeWidth={size * 0.1}
          segments={segments}
          segmentGap={2}
          duration={1800}
          easing="easeOut"
          ariaLabel="Portfolio allocation breakdown"
        >
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium text-muted-foreground">Portfolio</span>
            <span className="text-lg font-bold text-foreground">Allocation</span>
          </div>
        </ProgressRing>
      </div>

      {showLegend && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {allocations.map((alloc, index) => {
            const colors = alloc.color || DEFAULT_ALLOCATION_COLORS[index % DEFAULT_ALLOCATION_COLORS.length];
            const color = Array.isArray(colors) ? colors[0] : colors;

            return (
              <div key={`legend-${index}`} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-muted-foreground">{alloc.name}</span>
                <span className="text-sm font-medium text-foreground ml-auto">
                  {alloc.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Multi-Ring Comparison Component
// =============================================================================

interface MultiRingComparisonProps {
  /** Rings to compare - displayed concentrically */
  rings: Array<{
    value: number;
    label: string;
    colors: string | [string, string];
    sublabel?: string;
  }>;
  /** Outer size in pixels */
  size?: number;
  /** Gap between rings */
  ringGap?: number;
  className?: string;
}

export const MultiRingComparison: React.FC<MultiRingComparisonProps> = ({
  rings,
  size = 220,
  ringGap = 16,
  className,
}) => {
  const strokeWidth = (size - ringGap * (rings.length - 1)) / (rings.length * 2 + 2);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {rings.map((ring, index) => {
          const ringSize = size - index * (strokeWidth + ringGap) * 2;
          const offset = index * (strokeWidth + ringGap);

          return (
            <div
              key={`ring-${index}`}
              className="absolute"
              style={{
                top: offset,
                left: offset,
              }}
            >
              <ProgressRing
                size={ringSize}
                value={ring.value}
                colors={ring.colors}
                strokeWidth={strokeWidth}
                glow={index === 0}
                duration={1500 + index * 200}
                ariaLabel={`${ring.label}: ${ring.value}%`}
              />
            </div>
          );
        })}

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className="text-2xl font-bold text-foreground">
              {rings[0]?.value.toFixed(0)}%
            </span>
            <span className="block text-xs text-muted-foreground">
              {rings[0]?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4">
        {rings.map((ring, index) => {
          const color = Array.isArray(ring.colors) ? ring.colors[0] : ring.colors;

          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-muted-foreground">{ring.label}</span>
              <span className="text-sm font-semibold text-foreground">
                {ring.value.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// Animated Stats Ring
// =============================================================================

interface StatRingProps {
  /** Current value */
  value: number;
  /** Maximum value */
  max: number;
  /** Unit label (e.g., "years", "$") */
  unit?: string;
  /** Description label */
  label: string;
  /** Color theme */
  theme?: "success" | "warning" | "danger" | "info" | "neutral";
  /** Size in pixels */
  size?: number;
  className?: string;
}

const THEME_COLORS: Record<string, [string, string]> = {
  success: ["#10B981", "#34D399"],
  warning: ["#F59E0B", "#FBBF24"],
  danger: ["#EF4444", "#F87171"],
  info: ["#3B82F6", "#60A5FA"],
  neutral: ["#6B7280", "#9CA3AF"],
};

export const StatRing: React.FC<StatRingProps> = ({
  value,
  max,
  unit = "",
  label,
  theme = "info",
  size = 140,
  className,
}) => {
  const percentage = Math.min(100, (value / max) * 100);
  const colors = THEME_COLORS[theme];

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <ProgressRing
        size={size}
        value={percentage}
        colors={colors}
        glow={percentage >= 75}
        strokeWidth={size * 0.08}
        ariaLabel={`${label}: ${value}${unit} of ${max}${unit}`}
      >
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold text-foreground">
            {unit === "$" ? `$${value.toLocaleString()}` : `${value}${unit}`}
          </span>
        </div>
      </ProgressRing>
      <span className="text-sm text-muted-foreground text-center">{label}</span>
    </div>
  );
};

export default ProgressRing;
