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

export type GaugeVariant = "semi" | "full" | "arc";

export interface ColorZone {
  /** Start value (percentage 0-100) */
  from: number;
  /** End value (percentage 0-100) */
  to: number;
  /** Zone color */
  color: string;
  /** Optional label for the zone */
  label?: string;
}

export interface TargetMarker {
  /** Value position (0-100) */
  value: number;
  /** Marker label */
  label?: string;
  /** Marker color (defaults to foreground) */
  color?: string;
  /** Whether to show label */
  showLabel?: boolean;
}

export interface GaugeProps {
  /** Current value (0-100) */
  value: number;
  /** Minimum display value (default: 0) */
  min?: number;
  /** Maximum display value (default: 100) */
  max?: number;
  /** Size in pixels */
  size?: number;
  /** Gauge variant */
  variant?: GaugeVariant;
  /** Arc stroke width */
  strokeWidth?: number;
  /** Background track color */
  trackColor?: string;
  /** Color zones for the arc (red/yellow/green regions) */
  colorZones?: ColorZone[];
  /** Single color if no zones (gradient or solid) */
  color?: string | [string, string];
  /** Target markers on the gauge */
  targets?: TargetMarker[];
  /** Animation duration in ms */
  duration?: number;
  /** Animate on scroll into view */
  animateOnScroll?: boolean;
  /** Show the current value display */
  showValue?: boolean;
  /** Custom value formatter */
  formatValue?: (value: number) => string;
  /** Label below the value */
  label?: string;
  /** Sublabel/unit text */
  sublabel?: string;
  /** Enable needle glow effect */
  glowEffect?: boolean;
  /** Show tick marks */
  showTicks?: boolean;
  /** Number of major ticks (default: 5) */
  tickCount?: number;
  /** Needle style */
  needleStyle?: "classic" | "modern" | "minimal";
  /** Additional CSS classes */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
}

// =============================================================================
// Preset Color Zones
// =============================================================================

export const COLOR_ZONE_PRESETS = {
  /** Standard red-yellow-green for positive metrics (higher is better) */
  standard: [
    { from: 0, to: 33, color: "#EF4444", label: "Poor" },
    { from: 33, to: 66, color: "#F59E0B", label: "Fair" },
    { from: 66, to: 100, color: "#10B981", label: "Good" },
  ] as ColorZone[],

  /** Inverted for metrics where lower is better (like risk) */
  inverted: [
    { from: 0, to: 33, color: "#10B981", label: "Low" },
    { from: 33, to: 66, color: "#F59E0B", label: "Moderate" },
    { from: 66, to: 100, color: "#EF4444", label: "High" },
  ] as ColorZone[],

  /** Five-zone gradient for detailed metrics */
  detailed: [
    { from: 0, to: 20, color: "#EF4444", label: "Critical" },
    { from: 20, to: 40, color: "#F97316", label: "Poor" },
    { from: 40, to: 60, color: "#F59E0B", label: "Fair" },
    { from: 60, to: 80, color: "#84CC16", label: "Good" },
    { from: 80, to: 100, color: "#10B981", label: "Excellent" },
  ] as ColorZone[],

  /** Savings rate zones */
  savingsRate: [
    { from: 0, to: 10, color: "#EF4444", label: "Needs Work" },
    { from: 10, to: 15, color: "#F59E0B", label: "Getting There" },
    { from: 15, to: 20, color: "#84CC16", label: "Good" },
    { from: 20, to: 100, color: "#10B981", label: "Excellent" },
  ] as ColorZone[],

  /** Risk score zones */
  riskScore: [
    { from: 0, to: 25, color: "#10B981", label: "Conservative" },
    { from: 25, to: 50, color: "#22D3EE", label: "Moderate" },
    { from: 50, to: 75, color: "#F59E0B", label: "Growth" },
    { from: 75, to: 100, color: "#EF4444", label: "Aggressive" },
  ] as ColorZone[],

  /** Plan health zones */
  planHealth: [
    { from: 0, to: 50, color: "#EF4444", label: "At Risk" },
    { from: 50, to: 75, color: "#F59E0B", label: "Needs Attention" },
    { from: 75, to: 90, color: "#84CC16", label: "On Track" },
    { from: 90, to: 100, color: "#10B981", label: "Excellent" },
  ] as ColorZone[],
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

const polarToCartesian = (
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
};

// Get angle ranges for different variants
const getAngleRange = (variant: GaugeVariant): { start: number; end: number; total: number } => {
  switch (variant) {
    case "full":
      return { start: 0, end: 360, total: 360 };
    case "arc":
      return { start: -60, end: 240, total: 300 };
    case "semi":
    default:
      return { start: -90, end: 90, total: 180 };
  }
};

// =============================================================================
// Needle Component
// =============================================================================

interface NeedleProps {
  cx: number;
  cy: number;
  angle: number;
  length: number;
  style: GaugeProps["needleStyle"];
  glow?: boolean;
  color?: string;
}

const Needle: React.FC<NeedleProps> = ({
  cx,
  cy,
  angle,
  length,
  style = "classic",
  glow = false,
  color = "currentColor",
}) => {
  const tip = polarToCartesian(cx, cy, length, angle);
  const baseWidth = style === "minimal" ? 2 : style === "modern" ? 4 : 6;
  const baseLength = style === "minimal" ? 4 : style === "modern" ? 8 : 10;

  // Calculate base points perpendicular to needle direction
  const baseAngle1 = angle + 90;
  const baseAngle2 = angle - 90;
  const base1 = polarToCartesian(cx, cy, baseWidth, baseAngle1);
  const base2 = polarToCartesian(cx, cy, baseWidth, baseAngle2);
  const back = polarToCartesian(cx, cy, baseLength, angle + 180);

  if (style === "minimal") {
    return (
      <g className="transition-transform duration-300">
        {glow && (
          <line
            x1={cx}
            y1={cy}
            x2={tip.x}
            y2={tip.y}
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            style={{ filter: "blur(4px)", opacity: 0.5 }}
          />
        )}
        <line
          x1={cx}
          y1={cy}
          x2={tip.x}
          y2={tip.y}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} fill={color} />
      </g>
    );
  }

  return (
    <g className="transition-transform duration-300">
      {glow && (
        <polygon
          points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${back.x},${back.y} ${base2.x},${base2.y}`}
          fill={color}
          style={{ filter: "blur(6px)", opacity: 0.4 }}
        />
      )}
      <polygon
        points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${back.x},${back.y} ${base2.x},${base2.y}`}
        fill={color}
        className={style === "modern" ? "drop-shadow-md" : ""}
      />
      <circle
        cx={cx}
        cy={cy}
        r={style === "modern" ? 6 : 8}
        fill={color}
        className={style === "modern" ? "drop-shadow-md" : ""}
      />
      {style === "classic" && (
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill="hsl(var(--background))"
        />
      )}
    </g>
  );
};

// =============================================================================
// Tick Marks Component
// =============================================================================

interface TickMarksProps {
  cx: number;
  cy: number;
  radius: number;
  angleRange: { start: number; end: number; total: number };
  count: number;
  min: number;
  max: number;
  formatValue?: (value: number) => string;
}

const TickMarks: React.FC<TickMarksProps> = ({
  cx,
  cy,
  radius,
  angleRange,
  count,
  min,
  max,
  formatValue = (v) => v.toString(),
}) => {
  const ticks = [];
  const majorTickLength = 10;
  const minorTickLength = 5;
  const labelOffset = 20;

  for (let i = 0; i <= count; i++) {
    const value = min + ((max - min) * i) / count;
    const angle = angleRange.start + (angleRange.total * i) / count;

    const innerPoint = polarToCartesian(cx, cy, radius - majorTickLength, angle);
    const outerPoint = polarToCartesian(cx, cy, radius, angle);
    const labelPoint = polarToCartesian(cx, cy, radius - majorTickLength - labelOffset, angle);

    // Major tick
    ticks.push(
      <line
        key={`major-${i}`}
        x1={innerPoint.x}
        y1={innerPoint.y}
        x2={outerPoint.x}
        y2={outerPoint.y}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={2}
        strokeLinecap="round"
      />
    );

    // Tick label
    ticks.push(
      <text
        key={`label-${i}`}
        x={labelPoint.x}
        y={labelPoint.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[10px] fill-muted-foreground font-medium"
      >
        {formatValue(value)}
      </text>
    );

    // Minor ticks between major ticks
    if (i < count) {
      for (let j = 1; j < 5; j++) {
        const minorAngle = angle + (angleRange.total / count) * (j / 5);
        const minorInner = polarToCartesian(cx, cy, radius - minorTickLength, minorAngle);
        const minorOuter = polarToCartesian(cx, cy, radius, minorAngle);

        ticks.push(
          <line
            key={`minor-${i}-${j}`}
            x1={minorInner.x}
            y1={minorInner.y}
            x2={minorOuter.x}
            y2={minorOuter.y}
            stroke="hsl(var(--muted-foreground) / 0.5)"
            strokeWidth={1}
            strokeLinecap="round"
          />
        );
      }
    }
  }

  return <g>{ticks}</g>;
};

// =============================================================================
// Target Marker Component
// =============================================================================

interface TargetMarkerElementProps {
  cx: number;
  cy: number;
  radius: number;
  angleRange: { start: number; end: number; total: number };
  target: TargetMarker;
  min: number;
  max: number;
}

const TargetMarkerElement: React.FC<TargetMarkerElementProps> = ({
  cx,
  cy,
  radius,
  angleRange,
  target,
  min,
  max,
}) => {
  const normalizedValue = ((target.value - min) / (max - min)) * 100;
  const angle = angleRange.start + (angleRange.total * normalizedValue) / 100;

  const innerPoint = polarToCartesian(cx, cy, radius - 15, angle);
  const outerPoint = polarToCartesian(cx, cy, radius + 5, angle);
  const labelPoint = polarToCartesian(cx, cy, radius + 18, angle);

  return (
    <g>
      <line
        x1={innerPoint.x}
        y1={innerPoint.y}
        x2={outerPoint.x}
        y2={outerPoint.y}
        stroke={target.color || "hsl(var(--foreground))"}
        strokeWidth={3}
        strokeLinecap="round"
        className="drop-shadow-sm"
      />
      {target.showLabel && target.label && (
        <text
          x={labelPoint.x}
          y={labelPoint.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[9px] fill-foreground font-semibold"
        >
          {target.label}
        </text>
      )}
    </g>
  );
};

// =============================================================================
// Main Gauge Component
// =============================================================================

export const Gauge: React.FC<GaugeProps> = ({
  value,
  min = 0,
  max = 100,
  size = 200,
  variant = "semi",
  strokeWidth = 16,
  trackColor = "hsl(var(--muted) / 0.3)",
  colorZones,
  color = ["#3B82F6", "#60A5FA"],
  targets = [],
  duration = 1500,
  animateOnScroll = true,
  showValue = true,
  formatValue = (v) => `${Math.round(v)}`,
  label,
  sublabel,
  glowEffect = true,
  showTicks = false,
  tickCount = 5,
  needleStyle = "classic",
  className,
  ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!animateOnScroll);
  const [animatedValue, setAnimatedValue] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  // Clamp and normalize value
  const clampedValue = Math.max(min, Math.min(max, value));
  const normalizedValue = ((clampedValue - min) / (max - min)) * 100;

  // Get angle configuration based on variant
  const angleRange = useMemo(() => getAngleRange(variant), [variant]);

  // Calculate dimensions
  const center = size / 2;
  const radius = (size - strokeWidth - (showTicks ? 40 : 0)) / 2;

  // Calculate needle angle
  const needleAngle = useMemo(() => {
    const progress = animatedValue / 100;
    return angleRange.start + angleRange.total * progress;
  }, [animatedValue, angleRange]);

  // Get current zone color based on value
  const getCurrentColor = useCallback(
    (val: number): string => {
      if (colorZones) {
        const zone = colorZones.find((z) => val >= z.from && val <= z.to);
        return zone?.color || colorZones[colorZones.length - 1]?.color || "#3B82F6";
      }
      if (Array.isArray(color)) {
        return color[0];
      }
      return color;
    },
    [colorZones, color]
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
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
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
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutElastic(progress);

      setAnimatedValue(normalizedValue * easedProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    },
    [normalizedValue, duration]
  );

  // Start animation when visible
  useEffect(() => {
    if (isVisible) {
      startTimeRef.current = undefined;
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isVisible, animate]);

  // Re-animate when value changes
  useEffect(() => {
    if (isVisible) {
      startTimeRef.current = undefined;
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [normalizedValue, isVisible, animate]);

  // Generate gradient ID
  const gradientId = useMemo(
    () => `gauge-gradient-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  // Build color zone arcs
  const renderColorZones = useCallback(() => {
    if (!colorZones) return null;

    return colorZones.map((zone, index) => {
      const startAngle = angleRange.start + (angleRange.total * zone.from) / 100;
      const endAngle = angleRange.start + (angleRange.total * zone.to) / 100;
      const arcPath = describeArc(center, center, radius, startAngle, endAngle);

      return (
        <path
          key={`zone-${index}`}
          d={arcPath}
          fill="none"
          stroke={zone.color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          opacity={0.25}
        />
      );
    });
  }, [colorZones, angleRange, center, radius, strokeWidth]);

  // Build filled arc up to current value
  const renderFilledArc = useCallback(() => {
    if (animatedValue <= 0) return null;

    const startAngle = angleRange.start;
    const endAngle = angleRange.start + (angleRange.total * animatedValue) / 100;

    // For color zones, create segments
    if (colorZones) {
      const segments: React.ReactNode[] = [];
      let currentStart = startAngle;

      for (const zone of colorZones) {
        const zoneStartAngle = angleRange.start + (angleRange.total * zone.from) / 100;
        const zoneEndAngle = angleRange.start + (angleRange.total * zone.to) / 100;

        // Skip zones before the filled area
        if (zoneEndAngle <= currentStart) continue;
        // Stop if we've passed the filled area
        if (zoneStartAngle >= endAngle) break;

        const segmentStart = Math.max(currentStart, zoneStartAngle);
        const segmentEnd = Math.min(endAngle, zoneEndAngle);

        if (segmentEnd > segmentStart) {
          const arcPath = describeArc(center, center, radius, segmentStart, segmentEnd);
          segments.push(
            <g key={`filled-${zone.from}`}>
              {glowEffect && (
                <path
                  d={arcPath}
                  fill="none"
                  stroke={zone.color}
                  strokeWidth={strokeWidth + 6}
                  strokeLinecap="round"
                  style={{ filter: "blur(8px)", opacity: 0.4 }}
                />
              )}
              <path
                d={arcPath}
                fill="none"
                stroke={zone.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            </g>
          );
        }
        currentStart = segmentEnd;
      }
      return <>{segments}</>;
    }

    // Single color arc
    const arcPath = describeArc(center, center, radius, startAngle, endAngle);
    const fillColor = Array.isArray(color) ? `url(#${gradientId})` : color;

    return (
      <g>
        {glowEffect && (
          <path
            d={arcPath}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth + 6}
            strokeLinecap="round"
            style={{ filter: "blur(8px)", opacity: 0.4 }}
          />
        )}
        <path
          d={arcPath}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </g>
    );
  }, [animatedValue, angleRange, center, radius, strokeWidth, colorZones, color, gradientId, glowEffect]);

  // Calculate height based on variant
  const svgHeight = useMemo(() => {
    if (variant === "semi") {
      return size / 2 + strokeWidth + 20;
    }
    return size;
  }, [variant, size, strokeWidth]);

  // Calculate vertical offset for semi-circle
  const viewBoxY = variant === "semi" ? size / 4 - 10 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex flex-col items-center justify-center",
        className
      )}
      style={{ width: size, minHeight: svgHeight + 40 }}
      role="meter"
      aria-valuenow={clampedValue}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={ariaLabel || label || "Gauge indicator"}
    >
      <svg
        width={size}
        height={svgHeight}
        viewBox={`0 ${viewBoxY} ${size} ${svgHeight}`}
        className="overflow-visible"
      >
        {/* Gradient Definition */}
        {Array.isArray(color) && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color[0]} />
              <stop offset="100%" stopColor={color[1]} />
            </linearGradient>
          </defs>
        )}

        {/* Tick marks */}
        {showTicks && (
          <TickMarks
            cx={center}
            cy={center}
            radius={radius + strokeWidth / 2}
            angleRange={angleRange}
            count={tickCount}
            min={min}
            max={max}
            formatValue={formatValue}
          />
        )}

        {/* Background track */}
        <path
          d={describeArc(center, center, radius, angleRange.start, angleRange.end)}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Color zone backgrounds */}
        {renderColorZones()}

        {/* Filled arc */}
        {renderFilledArc()}

        {/* Target markers */}
        {targets.map((target, index) => (
          <TargetMarkerElement
            key={`target-${index}`}
            cx={center}
            cy={center}
            radius={radius}
            angleRange={angleRange}
            target={target}
            min={min}
            max={max}
          />
        ))}

        {/* Needle */}
        <Needle
          cx={center}
          cy={center}
          angle={needleAngle}
          length={radius - strokeWidth / 2 - 8}
          style={needleStyle}
          glow={glowEffect}
          color={getCurrentColor(animatedValue)}
        />
      </svg>

      {/* Value display */}
      {showValue && (
        <div
          className={cn(
            "flex flex-col items-center",
            variant === "semi" ? "-mt-8" : "mt-2"
          )}
        >
          <span
            className="text-3xl font-bold tabular-nums transition-colors duration-300"
            style={{ color: getCurrentColor(animatedValue) }}
          >
            {formatValue(min + ((max - min) * animatedValue) / 100)}
          </span>
          {sublabel && (
            <span className="text-xs text-muted-foreground font-medium">
              {sublabel}
            </span>
          )}
        </div>
      )}

      {/* Label */}
      {label && (
        <span className="text-sm text-muted-foreground font-medium mt-1">
          {label}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// Specialized Gauge Components
// =============================================================================

interface SavingsRateGaugeProps {
  /** Current savings rate as percentage (0-100) */
  rate: number;
  /** Target savings rate */
  target?: number;
  /** Size in pixels */
  size?: number;
  className?: string;
}

export const SavingsRateGauge: React.FC<SavingsRateGaugeProps> = ({
  rate,
  target = 15,
  size = 200,
  className,
}) => {
  return (
    <Gauge
      value={rate}
      min={0}
      max={50}
      size={size}
      variant="semi"
      colorZones={COLOR_ZONE_PRESETS.savingsRate}
      targets={[
        { value: target, label: "Target", color: "#3B82F6", showLabel: true },
      ]}
      formatValue={(v) => `${v.toFixed(1)}%`}
      label="Savings Rate"
      sublabel="of income"
      needleStyle="modern"
      className={className}
    />
  );
};

interface RiskScoreGaugeProps {
  /** Risk score (0-100) */
  score: number;
  /** Size in pixels */
  size?: number;
  className?: string;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  score,
  size = 200,
  className,
}) => {
  const getRiskLabel = (s: number): string => {
    if (s <= 25) return "Conservative";
    if (s <= 50) return "Moderate";
    if (s <= 75) return "Growth";
    return "Aggressive";
  };

  return (
    <Gauge
      value={score}
      min={0}
      max={100}
      size={size}
      variant="arc"
      colorZones={COLOR_ZONE_PRESETS.riskScore}
      formatValue={(v) => Math.round(v).toString()}
      label="Risk Score"
      sublabel={getRiskLabel(score)}
      needleStyle="classic"
      showTicks
      tickCount={4}
      className={className}
    />
  );
};

interface PlanHealthGaugeProps {
  /** Plan health score (0-100) */
  health: number;
  /** Target threshold */
  target?: number;
  /** Size in pixels */
  size?: number;
  className?: string;
}

export const PlanHealthGauge: React.FC<PlanHealthGaugeProps> = ({
  health,
  target = 80,
  size = 220,
  className,
}) => {
  const getHealthLabel = (h: number): string => {
    if (h >= 90) return "Excellent";
    if (h >= 75) return "On Track";
    if (h >= 50) return "Needs Attention";
    return "At Risk";
  };

  return (
    <Gauge
      value={health}
      min={0}
      max={100}
      size={size}
      variant="semi"
      colorZones={COLOR_ZONE_PRESETS.planHealth}
      targets={[
        { value: target, label: "Goal", color: "#6366F1", showLabel: true },
      ]}
      formatValue={(v) => `${Math.round(v)}%`}
      label="Plan Health"
      sublabel={getHealthLabel(health)}
      needleStyle="modern"
      glowEffect
      className={className}
    />
  );
};

interface MonteCarloGaugeProps {
  /** Success probability (0-100) */
  probability: number;
  /** Number of simulations */
  simulations?: number;
  /** Size in pixels */
  size?: number;
  className?: string;
}

export const MonteCarloGauge: React.FC<MonteCarloGaugeProps> = ({
  probability,
  simulations = 10000,
  size = 200,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <Gauge
        value={probability}
        min={0}
        max={100}
        size={size}
        variant="full"
        colorZones={COLOR_ZONE_PRESETS.detailed}
        formatValue={(v) => `${Math.round(v)}%`}
        label="Success Probability"
        needleStyle="minimal"
        strokeWidth={12}
        glowEffect
      />
      <p className="text-xs text-muted-foreground">
        Based on {simulations.toLocaleString()} simulations
      </p>
    </div>
  );
};

// =============================================================================
// Mini Gauge for Dashboard Cards
// =============================================================================

interface MiniGaugeProps {
  value: number;
  max?: number;
  size?: number;
  colorZones?: ColorZone[];
  color?: string;
  showValue?: boolean;
  className?: string;
}

export const MiniGauge: React.FC<MiniGaugeProps> = ({
  value,
  max = 100,
  size = 60,
  colorZones,
  color = "#3B82F6",
  showValue = true,
  className,
}) => {
  const normalizedValue = (value / max) * 100;
  const zones = colorZones || COLOR_ZONE_PRESETS.standard;

  const getCurrentColor = (): string => {
    const zone = zones.find((z) => normalizedValue >= z.from && normalizedValue <= z.to);
    return zone?.color || color;
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <Gauge
        value={value}
        max={max}
        size={size}
        variant="semi"
        colorZones={zones}
        strokeWidth={6}
        showValue={false}
        needleStyle="minimal"
        glowEffect={false}
      />
      {showValue && (
        <span
          className="absolute text-sm font-bold"
          style={{
            color: getCurrentColor(),
            top: "60%",
          }}
        >
          {Math.round(normalizedValue)}
        </span>
      )}
    </div>
  );
};

export default Gauge;
