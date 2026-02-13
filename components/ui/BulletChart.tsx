"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface BulletChartRange {
  /** Maximum value for this range */
  max: number;
  /** Color for this range (CSS color or Tailwind class) */
  color: string;
  /** Label for the range (e.g., "Poor", "OK", "Good") */
  label?: string;
}

export interface BulletChartProps {
  /** Current value to display */
  value: number;
  /** Target/goal value - displayed as vertical line */
  target: number;
  /** Maximum value for the chart scale */
  max: number;
  /** Minimum value for the chart scale (default: 0) */
  min?: number;
  /** Comparative/benchmark value - displayed as smaller bar */
  comparative?: number;
  /** Background ranges for poor/ok/good visualization */
  ranges?: BulletChartRange[];
  /** Label for the metric */
  label?: string;
  /** Unit to display after values (e.g., "%", "K", "$") */
  unit?: string;
  /** Height of the chart in pixels */
  height?: number;
  /** Format function for displaying values */
  formatValue?: (value: number) => string;
  /** Whether to show value labels */
  showValues?: boolean;
  /** Whether to show the scale/axis */
  showScale?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Whether to animate on scroll into view */
  animateOnScroll?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
  /** Color of the main value bar */
  valueColor?: string;
  /** Color of the target line */
  targetColor?: string;
  /** Color of the comparative bar */
  comparativeColor?: string;
  /** Whether the chart is compact (less padding) */
  compact?: boolean;
}

// Default range colors (grayscale gradient for background)
const DEFAULT_RANGES: BulletChartRange[] = [
  { max: 0.33, color: "bg-red-200 dark:bg-red-900/40", label: "Poor" },
  { max: 0.67, color: "bg-amber-200 dark:bg-amber-900/40", label: "OK" },
  { max: 1.0, color: "bg-emerald-200 dark:bg-emerald-900/40", label: "Good" },
];

// Preset configurations for common use cases
export const BULLET_PRESETS = {
  savingsRate: {
    ranges: [
      { max: 10, color: "bg-red-200 dark:bg-red-900/40", label: "Low" },
      { max: 15, color: "bg-amber-200 dark:bg-amber-900/40", label: "Moderate" },
      { max: 100, color: "bg-emerald-200 dark:bg-emerald-900/40", label: "Good" },
    ],
    unit: "%",
    target: 15,
    max: 30,
  },
  retirementGoal: {
    ranges: [
      { max: 0.5, color: "bg-red-200 dark:bg-red-900/40", label: "Behind" },
      { max: 0.8, color: "bg-amber-200 dark:bg-amber-900/40", label: "On Track" },
      { max: 1.5, color: "bg-emerald-200 dark:bg-emerald-900/40", label: "Ahead" },
    ],
    target: 1.0,
    max: 1.5,
    formatValue: (v: number) => `${(v * 100).toFixed(0)}%`,
  },
  monthlyBudget: {
    ranges: [
      { max: 0.7, color: "bg-emerald-200 dark:bg-emerald-900/40", label: "Under" },
      { max: 0.9, color: "bg-amber-200 dark:bg-amber-900/40", label: "Near" },
      { max: 1.5, color: "bg-red-200 dark:bg-red-900/40", label: "Over" },
    ],
    target: 1.0,
    max: 1.5,
  },
  investmentReturn: {
    ranges: [
      { max: 4, color: "bg-red-200 dark:bg-red-900/40", label: "Low" },
      { max: 7, color: "bg-amber-200 dark:bg-amber-900/40", label: "Average" },
      { max: 15, color: "bg-emerald-200 dark:bg-emerald-900/40", label: "High" },
    ],
    unit: "%",
    target: 7,
    max: 15,
  },
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

const defaultFormatValue = (value: number, unit?: string): string => {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M${unit || ""}`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K${unit || ""}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}${unit || ""}`;
};

// =============================================================================
// Single Bullet Chart Component
// =============================================================================

export const BulletChart: React.FC<BulletChartProps> = ({
  value,
  target,
  max,
  min = 0,
  comparative,
  ranges,
  label,
  unit = "",
  height = 24,
  formatValue,
  showValues = true,
  showScale = false,
  animationDuration = 800,
  animateOnScroll = true,
  className,
  ariaLabel,
  valueColor = "bg-primary",
  targetColor = "bg-foreground dark:bg-white",
  comparativeColor = "bg-muted-foreground/60",
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!animateOnScroll);
  const [animatedValue, setAnimatedValue] = useState(0);
  const [animatedComparative, setAnimatedComparative] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  // Calculate scale
  const range = max - min;
  const clampedValue = Math.max(min, Math.min(max, value));
  const clampedComparative = comparative !== undefined
    ? Math.max(min, Math.min(max, comparative))
    : undefined;
  const clampedTarget = Math.max(min, Math.min(max, target));

  // Calculate percentages
  const valuePercent = ((animatedValue - min) / range) * 100;
  const targetPercent = ((clampedTarget - min) / range) * 100;
  const comparativePercent = clampedComparative !== undefined
    ? ((animatedComparative - min) / range) * 100
    : undefined;

  // Normalize ranges or use defaults
  const normalizedRanges = useMemo(() => {
    if (ranges && ranges.length > 0) {
      return ranges.map((r) => ({
        ...r,
        percent: ((r.max - min) / range) * 100,
      }));
    }
    // Default ranges based on percentage of max
    return DEFAULT_RANGES.map((r) => ({
      ...r,
      max: min + r.max * range,
      percent: r.max * 100,
    }));
  }, [ranges, min, range]);

  // Format function
  const format = useCallback(
    (v: number) => (formatValue ? formatValue(v) : defaultFormatValue(v, unit)),
    [formatValue, unit]
  );

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
        rootMargin: "0px 0px -20px 0px",
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
  useEffect(() => {
    if (!isVisible) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedValue(eased * clampedValue);
      if (clampedComparative !== undefined) {
        setAnimatedComparative(eased * clampedComparative);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = undefined;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, clampedValue, clampedComparative, animationDuration]);

  // Bar height calculations
  const mainBarHeight = height * 0.5;
  const comparativeBarHeight = height * 0.25;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col gap-1",
        compact ? "gap-0.5" : "gap-1.5",
        className
      )}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={ariaLabel || `${label || "Progress"}: ${format(value)} of ${format(target)} target`}
    >
      {/* Label and Values Row */}
      {(label || showValues) && (
        <div className={cn("flex items-center justify-between", compact ? "text-xs" : "text-sm")}>
          {label && (
            <span className="font-medium text-foreground truncate mr-2">
              {label}
            </span>
          )}
          {showValues && (
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <span className="font-semibold text-foreground">{format(value)}</span>
              <span className="text-xs">/ {format(target)}</span>
            </div>
          )}
        </div>
      )}

      {/* Chart Container */}
      <div
        className="relative w-full rounded-sm overflow-hidden"
        style={{ height }}
      >
        {/* Background Ranges */}
        <div className="absolute inset-0 flex">
          {normalizedRanges.map((rangeItem, index) => {
            const prevPercent = index > 0 ? normalizedRanges[index - 1].percent : 0;
            const width = rangeItem.percent - prevPercent;
            return (
              <div
                key={`range-${index}`}
                className={cn("h-full transition-colors", rangeItem.color)}
                style={{ width: `${width}%` }}
                title={rangeItem.label}
              />
            );
          })}
        </div>

        {/* Comparative Measure Bar */}
        {comparativePercent !== undefined && (
          <div
            className={cn(
              "absolute left-0 rounded-sm transition-all duration-300",
              comparativeColor
            )}
            style={{
              width: `${comparativePercent}%`,
              height: comparativeBarHeight,
              top: (height - comparativeBarHeight) / 2,
            }}
          />
        )}

        {/* Main Value Bar */}
        <div
          className={cn(
            "absolute left-0 rounded-sm transition-all shadow-sm",
            valueColor
          )}
          style={{
            width: `${valuePercent}%`,
            height: mainBarHeight,
            top: (height - mainBarHeight) / 2,
            transitionDuration: `${animationDuration}ms`,
          }}
        />

        {/* Target Line */}
        <div
          className={cn(
            "absolute top-0 w-0.5 rounded-full shadow-md",
            targetColor
          )}
          style={{
            left: `${targetPercent}%`,
            height: "100%",
            transform: "translateX(-50%)",
          }}
        />

        {/* Target Triangle Marker */}
        <div
          className="absolute"
          style={{
            left: `${targetPercent}%`,
            top: -4,
            transform: "translateX(-50%)",
          }}
        >
          <div
            className={cn(
              "w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px]",
              "border-t-foreground dark:border-t-white"
            )}
          />
        </div>
      </div>

      {/* Scale/Axis */}
      {showScale && (
        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
          <span>{format(min)}</span>
          <span>{format(min + range / 2)}</span>
          <span>{format(max)}</span>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Bullet Chart Row - Multiple charts in a compact row
// =============================================================================

export interface BulletChartRowItem {
  /** Unique ID for the chart */
  id: string;
  /** Label for this metric */
  label: string;
  /** Current value */
  value: number;
  /** Target value */
  target: number;
  /** Maximum value */
  max: number;
  /** Minimum value (default: 0) */
  min?: number;
  /** Comparative value */
  comparative?: number;
  /** Custom ranges */
  ranges?: BulletChartRange[];
  /** Unit suffix */
  unit?: string;
  /** Custom value formatter */
  formatValue?: (value: number) => string;
  /** Custom value bar color */
  valueColor?: string;
}

export interface BulletChartRowProps {
  /** Array of chart items to display */
  items: BulletChartRowItem[];
  /** Height of each chart */
  chartHeight?: number;
  /** Gap between charts */
  gap?: number;
  /** Whether to show labels */
  showLabels?: boolean;
  /** Whether to show values */
  showValues?: boolean;
  /** Whether to show scale */
  showScale?: boolean;
  /** Animation duration */
  animationDuration?: number;
  /** Stagger animation delay between charts */
  staggerDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Layout direction */
  direction?: "vertical" | "horizontal";
}

export const BulletChartRow: React.FC<BulletChartRowProps> = ({
  items,
  chartHeight = 20,
  gap = 12,
  showLabels = true,
  showValues = true,
  showScale = false,
  animationDuration = 800,
  staggerDelay = 100,
  className,
  direction = "vertical",
}) => {
  return (
    <div
      className={cn(
        direction === "vertical"
          ? "flex flex-col"
          : "flex flex-row flex-wrap",
        className
      )}
      style={{ gap }}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            direction === "horizontal" && "flex-1 min-w-[200px]"
          )}
          style={{
            animationDelay: `${index * staggerDelay}ms`,
          }}
        >
          <BulletChart
            value={item.value}
            target={item.target}
            max={item.max}
            min={item.min}
            comparative={item.comparative}
            ranges={item.ranges}
            label={showLabels ? item.label : undefined}
            unit={item.unit}
            height={chartHeight}
            formatValue={item.formatValue}
            showValues={showValues}
            showScale={showScale}
            animationDuration={animationDuration + index * staggerDelay}
            valueColor={item.valueColor}
            compact
          />
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// Compact Goal Tracker - Dashboard-friendly component
// =============================================================================

export interface GoalTrackerProps {
  /** Goal label */
  label: string;
  /** Current progress value */
  current: number;
  /** Target goal value */
  goal: number;
  /** Benchmark/comparison value */
  benchmark?: number;
  /** Unit for values */
  unit?: string;
  /** Format function for values */
  formatValue?: (value: number) => string;
  /** Status indicator color */
  statusColor?: "success" | "warning" | "danger" | "neutral";
  /** Additional CSS classes */
  className?: string;
  /** Compact mode */
  compact?: boolean;
  /** Click handler */
  onClick?: () => void;
}

const STATUS_COLORS = {
  success: {
    bar: "bg-emerald-500 dark:bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: "text-emerald-500",
  },
  warning: {
    bar: "bg-amber-500 dark:bg-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: "text-amber-500",
  },
  danger: {
    bar: "bg-red-500 dark:bg-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    icon: "text-red-500",
  },
  neutral: {
    bar: "bg-slate-500 dark:bg-slate-400",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: "text-slate-500",
  },
};

export const GoalTracker: React.FC<GoalTrackerProps> = ({
  label,
  current,
  goal,
  benchmark,
  unit = "",
  formatValue,
  statusColor,
  className,
  compact = false,
  onClick,
}) => {
  const percentage = Math.min(100, (current / goal) * 100);

  // Auto-determine status color based on progress
  const autoStatus = useMemo(() => {
    if (statusColor) return statusColor;
    if (percentage >= 90) return "success";
    if (percentage >= 60) return "warning";
    return "danger";
  }, [percentage, statusColor]);

  const colors = STATUS_COLORS[autoStatus];

  const format = useCallback(
    (v: number) => {
      if (formatValue) return formatValue(v);
      if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M${unit}`;
      if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K${unit}`;
      return `${v.toFixed(v % 1 === 0 ? 0 : 1)}${unit}`;
    },
    [formatValue, unit]
  );

  const ranges: BulletChartRange[] = [
    { max: goal * 0.6, color: "bg-muted/60", label: "Behind" },
    { max: goal * 0.9, color: "bg-muted/40", label: "On Track" },
    { max: goal * 1.2, color: "bg-muted/20", label: "Ahead" },
  ];

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-3 transition-all hover:shadow-sm",
        onClick && "cursor-pointer hover:border-primary/50",
        compact && "p-2",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
          {label}
        </span>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            colors.badge
          )}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>
      <BulletChart
        value={current}
        target={goal}
        max={goal * 1.2}
        comparative={benchmark}
        ranges={ranges}
        height={compact ? 16 : 20}
        showValues={false}
        showScale={false}
        valueColor={colors.bar}
        compact
      />
      <div className={cn("flex justify-between mt-1.5 text-muted-foreground", compact ? "text-xs" : "text-xs")}>
        <span>{format(current)}</span>
        <span>Goal: {format(goal)}</span>
      </div>
    </div>
  );
};

// =============================================================================
// Dashboard Grid - Multiple goal trackers in a grid
// =============================================================================

export interface GoalTrackerGridProps {
  /** Array of goal items */
  goals: Array<{
    id: string;
    label: string;
    current: number;
    goal: number;
    benchmark?: number;
    unit?: string;
    formatValue?: (value: number) => string;
    statusColor?: "success" | "warning" | "danger" | "neutral";
    onClick?: () => void;
  }>;
  /** Number of columns (responsive) */
  columns?: 1 | 2 | 3 | 4;
  /** Gap between items */
  gap?: number;
  /** Compact mode for all trackers */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const COLUMN_CLASSES = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export const GoalTrackerGrid: React.FC<GoalTrackerGridProps> = ({
  goals,
  columns = 2,
  gap = 16,
  compact = false,
  className,
}) => {
  return (
    <div
      className={cn("grid", COLUMN_CLASSES[columns], className)}
      style={{ gap }}
    >
      {goals.map((goal) => (
        <GoalTracker
          key={goal.id}
          label={goal.label}
          current={goal.current}
          goal={goal.goal}
          benchmark={goal.benchmark}
          unit={goal.unit}
          formatValue={goal.formatValue}
          statusColor={goal.statusColor}
          onClick={goal.onClick}
          compact={compact}
        />
      ))}
    </div>
  );
};

// =============================================================================
// Mini Bullet Chart - Extra compact for inline use
// =============================================================================

export interface MiniBulletChartProps {
  /** Current value */
  value: number;
  /** Target value */
  target: number;
  /** Maximum value */
  max?: number;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Tooltip format function */
  formatTooltip?: (value: number, target: number) => string;
  /** Value bar color */
  valueColor?: string;
  /** Additional CSS classes */
  className?: string;
}

export const MiniBulletChart: React.FC<MiniBulletChartProps> = ({
  value,
  target,
  max,
  width = 80,
  height = 8,
  showTooltip = true,
  formatTooltip,
  valueColor = "bg-primary",
  className,
}) => {
  const actualMax = max ?? Math.max(target * 1.2, value * 1.1);
  const valuePercent = Math.min(100, (value / actualMax) * 100);
  const targetPercent = Math.min(100, (target / actualMax) * 100);

  const tooltip = formatTooltip
    ? formatTooltip(value, target)
    : `${value.toFixed(0)} / ${target.toFixed(0)} (${((value / target) * 100).toFixed(0)}%)`;

  return (
    <div
      className={cn("relative rounded-full bg-muted/40 overflow-hidden", className)}
      style={{ width, height }}
      title={showTooltip ? tooltip : undefined}
      role="meter"
      aria-valuenow={value}
      aria-valuemax={actualMax}
    >
      {/* Value bar */}
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", valueColor)}
        style={{ width: `${valuePercent}%` }}
      />
      {/* Target line */}
      <div
        className="absolute inset-y-0 w-px bg-foreground dark:bg-white"
        style={{ left: `${targetPercent}%` }}
      />
    </div>
  );
};

// =============================================================================
// Exports
// =============================================================================

export default BulletChart;
