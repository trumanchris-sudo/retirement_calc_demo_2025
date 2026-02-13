"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ============================================================================
// TYPES
// ============================================================================

export type SparklineVariant = "line" | "bar" | "area"
export type SparklineColorMode = "auto" | "positive" | "negative" | "neutral" | "gradient"

export interface SparklineDataPoint {
  value: number
  label?: string
}

export interface SparklineProps {
  /** Data points - can be numbers or objects with value/label */
  data: (number | SparklineDataPoint)[]
  /** Variant: line, bar, or area */
  variant?: SparklineVariant
  /** Width of the sparkline */
  width?: number
  /** Height of the sparkline */
  height?: number
  /** Color mode: auto (green/red based on trend), positive, negative, neutral, or gradient */
  colorMode?: SparklineColorMode
  /** Custom positive color */
  positiveColor?: string
  /** Custom negative color */
  negativeColor?: string
  /** Custom neutral color */
  neutralColor?: string
  /** Show tooltip on hover */
  showTooltip?: boolean
  /** Stroke width for line/area variants */
  strokeWidth?: number
  /** Whether to animate the sparkline */
  animated?: boolean
  /** Animation duration in ms */
  animationDuration?: number
  /** Whether to fill the area under the line (for line variant) */
  filled?: boolean
  /** Bar gap for bar variant (0-1) */
  barGap?: number
  /** Bar radius for bar variant */
  barRadius?: number
  /** Show dots on data points (line/area only) */
  showDots?: boolean
  /** Dot radius */
  dotRadius?: number
  /** Custom className */
  className?: string
  /** Format function for tooltip values */
  formatValue?: (value: number, index: number) => string
  /** Format function for tooltip labels */
  formatLabel?: (label: string | undefined, index: number, value: number) => string
  /** Aria label for accessibility */
  ariaLabel?: string
  /** Reference line value (shows horizontal line) */
  referenceLine?: number
  /** Reference line color */
  referenceLineColor?: string
  /** Min value override (auto-calculated if not provided) */
  minValue?: number
  /** Max value override (auto-calculated if not provided) */
  maxValue?: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function normalizeData(data: (number | SparklineDataPoint)[]): SparklineDataPoint[] {
  return data.map((d, i) => {
    if (typeof d === "number") {
      return { value: d, label: undefined }
    }
    return d
  })
}

function calculateTrend(data: SparklineDataPoint[]): "positive" | "negative" | "neutral" {
  if (data.length < 2) return "neutral"
  const first = data[0].value
  const last = data[data.length - 1].value
  if (last > first) return "positive"
  if (last < first) return "negative"
  return "neutral"
}

function getMinMax(
  data: SparklineDataPoint[],
  minOverride?: number,
  maxOverride?: number
): { min: number; max: number } {
  const values = data.map((d) => d.value)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)

  return {
    min: minOverride ?? dataMin,
    max: maxOverride ?? dataMax,
  }
}

function scaleValue(
  value: number,
  min: number,
  max: number,
  height: number,
  padding = 2
): number {
  const range = max - min
  if (range === 0) return height / 2
  return height - padding - ((value - min) / range) * (height - padding * 2)
}

// ============================================================================
// SPARKLINE COLORS
// ============================================================================

const defaultColors = {
  positive: "#22c55e", // green-500
  negative: "#ef4444", // red-500
  neutral: "#6b7280", // gray-500
  gradient: {
    start: "#3b82f6", // blue-500
    end: "#8b5cf6", // violet-500
  },
}

function getColor(
  colorMode: SparklineColorMode,
  trend: "positive" | "negative" | "neutral",
  positiveColor?: string,
  negativeColor?: string,
  neutralColor?: string
): string {
  const colors = {
    positive: positiveColor ?? defaultColors.positive,
    negative: negativeColor ?? defaultColors.negative,
    neutral: neutralColor ?? defaultColors.neutral,
  }

  switch (colorMode) {
    case "auto":
      return colors[trend]
    case "positive":
      return colors.positive
    case "negative":
      return colors.negative
    case "neutral":
      return colors.neutral
    case "gradient":
      return "url(#sparkline-gradient)"
    default:
      return colors.neutral
  }
}

// ============================================================================
// LINE SPARKLINE
// ============================================================================

interface LineSparklineProps {
  data: SparklineDataPoint[]
  width: number
  height: number
  color: string
  strokeWidth: number
  filled: boolean
  showDots: boolean
  dotRadius: number
  animated: boolean
  animationDuration: number
  referenceLine?: number
  referenceLineColor: string
  min: number
  max: number
  onHover?: (index: number | null) => void
  colorMode: SparklineColorMode
}

function LineSparkline({
  data,
  width,
  height,
  color,
  strokeWidth,
  filled,
  showDots,
  dotRadius,
  animated,
  animationDuration,
  referenceLine,
  referenceLineColor,
  min,
  max,
  onHover,
  colorMode,
}: LineSparklineProps) {
  const padding = 4
  const pointWidth = (width - padding * 2) / (data.length - 1 || 1)

  // Generate path
  const points = data.map((d, i) => ({
    x: padding + i * pointWidth,
    y: scaleValue(d.value, min, max, height, padding),
  }))

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`

  // Reference line
  const refLineY = referenceLine !== undefined
    ? scaleValue(referenceLine, min, max, height, padding)
    : null

  const uniqueId = React.useId().replace(/:/g, "")

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Gradient definition */}
      {colorMode === "gradient" && (
        <defs>
          <linearGradient id={`sparkline-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={defaultColors.gradient.start} />
            <stop offset="100%" stopColor={defaultColors.gradient.end} />
          </linearGradient>
          <linearGradient id={`sparkline-gradient-fill-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={defaultColors.gradient.start} stopOpacity="0.3" />
            <stop offset="100%" stopColor={defaultColors.gradient.start} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}

      {/* Reference line */}
      {refLineY !== null && (
        <line
          x1={padding}
          y1={refLineY}
          x2={width - padding}
          y2={refLineY}
          stroke={referenceLineColor}
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.5}
        />
      )}

      {/* Area fill */}
      {filled && data.length > 1 && (
        <path
          d={areaPath}
          fill={colorMode === "gradient" ? `url(#sparkline-gradient-fill-${uniqueId})` : color}
          opacity={colorMode === "gradient" ? 1 : 0.15}
          className={animated ? "sparkline-area-animate" : ""}
          style={animated ? { animationDuration: `${animationDuration}ms` } : undefined}
        />
      )}

      {/* Line */}
      {data.length > 1 && (
        <path
          d={linePath}
          fill="none"
          stroke={colorMode === "gradient" ? `url(#sparkline-gradient-${uniqueId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? "sparkline-line-animate" : ""}
          style={animated ? {
            animationDuration: `${animationDuration}ms`,
            strokeDasharray: 1000,
            strokeDashoffset: 1000,
          } : undefined}
        />
      )}

      {/* Dots */}
      {showDots && points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={dotRadius}
          fill={colorMode === "gradient" ? defaultColors.gradient.end : color}
          className={cn(
            "transition-transform duration-150",
            animated && "sparkline-dot-animate"
          )}
          style={animated ? { animationDelay: `${(i / points.length) * animationDuration}ms` } : undefined}
        />
      ))}

      {/* Hover areas */}
      {points.map((p, i) => (
        <rect
          key={`hover-${i}`}
          x={p.x - pointWidth / 2}
          y={0}
          width={pointWidth}
          height={height}
          fill="transparent"
          onMouseEnter={() => onHover?.(i)}
          className="cursor-pointer"
        />
      ))}
    </svg>
  )
}

// ============================================================================
// BAR SPARKLINE
// ============================================================================

interface BarSparklineProps {
  data: SparklineDataPoint[]
  width: number
  height: number
  color: string
  barGap: number
  barRadius: number
  animated: boolean
  animationDuration: number
  referenceLine?: number
  referenceLineColor: string
  min: number
  max: number
  onHover?: (index: number | null) => void
  positiveColor: string
  negativeColor: string
  colorMode: SparklineColorMode
}

function BarSparkline({
  data,
  width,
  height,
  color,
  barGap,
  barRadius,
  animated,
  animationDuration,
  referenceLine,
  referenceLineColor,
  min,
  max,
  onHover,
  positiveColor,
  negativeColor,
  colorMode,
}: BarSparklineProps) {
  const padding = 2
  const totalGap = (data.length - 1) * barGap
  const barWidth = Math.max(1, (width - padding * 2 - totalGap) / data.length)

  // For bars, we want 0 to be the baseline if data crosses 0
  const zeroLine = min < 0 && max > 0 ? scaleValue(0, min, max, height, padding) : null
  const baseline = zeroLine ?? height - padding

  // Reference line
  const refLineY = referenceLine !== undefined
    ? scaleValue(referenceLine, min, max, height, padding)
    : null

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Reference line */}
      {refLineY !== null && (
        <line
          x1={padding}
          y1={refLineY}
          x2={width - padding}
          y2={refLineY}
          stroke={referenceLineColor}
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.5}
        />
      )}

      {/* Zero line */}
      {zeroLine !== null && (
        <line
          x1={padding}
          y1={zeroLine}
          x2={width - padding}
          y2={zeroLine}
          stroke="currentColor"
          strokeWidth={0.5}
          opacity={0.3}
        />
      )}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padding + i * (barWidth + barGap)
        const scaledY = scaleValue(d.value, min, max, height, padding)
        const barHeight = Math.abs(baseline - scaledY)
        const y = d.value >= 0 ? scaledY : baseline

        // Determine bar color based on value
        let barColor = color
        if (colorMode === "auto") {
          barColor = d.value >= 0 ? positiveColor : negativeColor
        }

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(1, barHeight)}
              rx={barRadius}
              ry={barRadius}
              fill={barColor}
              className={cn(
                "transition-all duration-150 hover:opacity-80",
                animated && "sparkline-bar-animate"
              )}
              style={animated ? {
                animationDelay: `${(i / data.length) * animationDuration}ms`,
                animationDuration: `${animationDuration}ms`,
              } : undefined}
              onMouseEnter={() => onHover?.(i)}
            />
          </g>
        )
      })}
    </svg>
  )
}

// ============================================================================
// AREA SPARKLINE
// ============================================================================

interface AreaSparklineProps {
  data: SparklineDataPoint[]
  width: number
  height: number
  color: string
  strokeWidth: number
  showDots: boolean
  dotRadius: number
  animated: boolean
  animationDuration: number
  referenceLine?: number
  referenceLineColor: string
  min: number
  max: number
  onHover?: (index: number | null) => void
  colorMode: SparklineColorMode
}

function AreaSparkline({
  data,
  width,
  height,
  color,
  strokeWidth,
  showDots,
  dotRadius,
  animated,
  animationDuration,
  referenceLine,
  referenceLineColor,
  min,
  max,
  onHover,
  colorMode,
}: AreaSparklineProps) {
  const padding = 4
  const pointWidth = (width - padding * 2) / (data.length - 1 || 1)

  // Generate path
  const points = data.map((d, i) => ({
    x: padding + i * pointWidth,
    y: scaleValue(d.value, min, max, height, padding),
  }))

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`

  // Reference line
  const refLineY = referenceLine !== undefined
    ? scaleValue(referenceLine, min, max, height, padding)
    : null

  const uniqueId = React.useId().replace(/:/g, "")

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Gradient definition for area fill */}
      <defs>
        <linearGradient id={`sparkline-area-gradient-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
        {colorMode === "gradient" && (
          <>
            <linearGradient id={`sparkline-gradient-stroke-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={defaultColors.gradient.start} />
              <stop offset="100%" stopColor={defaultColors.gradient.end} />
            </linearGradient>
            <linearGradient id={`sparkline-gradient-area-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={defaultColors.gradient.start} stopOpacity="0.4" />
              <stop offset="100%" stopColor={defaultColors.gradient.end} stopOpacity="0.05" />
            </linearGradient>
          </>
        )}
      </defs>

      {/* Reference line */}
      {refLineY !== null && (
        <line
          x1={padding}
          y1={refLineY}
          x2={width - padding}
          y2={refLineY}
          stroke={referenceLineColor}
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.5}
        />
      )}

      {/* Area fill */}
      {data.length > 1 && (
        <path
          d={areaPath}
          fill={colorMode === "gradient"
            ? `url(#sparkline-gradient-area-${uniqueId})`
            : `url(#sparkline-area-gradient-${uniqueId})`}
          className={animated ? "sparkline-area-animate" : ""}
          style={animated ? { animationDuration: `${animationDuration}ms` } : undefined}
        />
      )}

      {/* Line */}
      {data.length > 1 && (
        <path
          d={linePath}
          fill="none"
          stroke={colorMode === "gradient"
            ? `url(#sparkline-gradient-stroke-${uniqueId})`
            : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? "sparkline-line-animate" : ""}
          style={animated ? {
            animationDuration: `${animationDuration}ms`,
            strokeDasharray: 1000,
            strokeDashoffset: 1000,
          } : undefined}
        />
      )}

      {/* Dots */}
      {showDots && points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={dotRadius}
          fill={colorMode === "gradient" ? defaultColors.gradient.end : color}
          className={cn(
            "transition-transform duration-150",
            animated && "sparkline-dot-animate"
          )}
          style={animated ? { animationDelay: `${(i / points.length) * animationDuration}ms` } : undefined}
        />
      ))}

      {/* Hover areas */}
      {points.map((p, i) => (
        <rect
          key={`hover-${i}`}
          x={p.x - pointWidth / 2}
          y={0}
          width={pointWidth}
          height={height}
          fill="transparent"
          onMouseEnter={() => onHover?.(i)}
          className="cursor-pointer"
        />
      ))}
    </svg>
  )
}

// ============================================================================
// MAIN SPARKLINE COMPONENT
// ============================================================================

export const Sparkline = React.forwardRef<HTMLDivElement, SparklineProps>(
  (
    {
      data,
      variant = "line",
      width = 100,
      height = 24,
      colorMode = "auto",
      positiveColor,
      negativeColor,
      neutralColor,
      showTooltip = true,
      strokeWidth = 1.5,
      animated = true,
      animationDuration = 500,
      filled = false,
      barGap = 1,
      barRadius = 1,
      showDots = false,
      dotRadius = 2,
      className,
      formatValue = (v) => v.toLocaleString(),
      formatLabel = (label) => label ?? "",
      ariaLabel,
      referenceLine,
      referenceLineColor = "#9ca3af",
      minValue,
      maxValue,
    },
    ref
  ) => {
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

    const normalizedData = React.useMemo(() => normalizeData(data), [data])
    const trend = React.useMemo(() => calculateTrend(normalizedData), [normalizedData])
    const { min, max } = React.useMemo(
      () => getMinMax(normalizedData, minValue, maxValue),
      [normalizedData, minValue, maxValue]
    )

    const color = getColor(
      colorMode,
      trend,
      positiveColor,
      negativeColor,
      neutralColor
    )

    const hoveredPoint = hoveredIndex !== null ? normalizedData[hoveredIndex] : null

    const sparklineContent = (
      <div
        ref={ref}
        className={cn("inline-flex items-center", className)}
        style={{ width, height }}
        role="img"
        aria-label={ariaLabel ?? `Sparkline chart showing ${variant} data with ${normalizedData.length} points`}
      >
        {variant === "line" && (
          <LineSparkline
            data={normalizedData}
            width={width}
            height={height}
            color={color}
            strokeWidth={strokeWidth}
            filled={filled}
            showDots={showDots}
            dotRadius={dotRadius}
            animated={animated}
            animationDuration={animationDuration}
            referenceLine={referenceLine}
            referenceLineColor={referenceLineColor}
            min={min}
            max={max}
            onHover={showTooltip ? setHoveredIndex : undefined}
            colorMode={colorMode}
          />
        )}
        {variant === "bar" && (
          <BarSparkline
            data={normalizedData}
            width={width}
            height={height}
            color={color}
            barGap={barGap}
            barRadius={barRadius}
            animated={animated}
            animationDuration={animationDuration}
            referenceLine={referenceLine}
            referenceLineColor={referenceLineColor}
            min={min}
            max={max}
            onHover={showTooltip ? setHoveredIndex : undefined}
            positiveColor={positiveColor ?? defaultColors.positive}
            negativeColor={negativeColor ?? defaultColors.negative}
            colorMode={colorMode}
          />
        )}
        {variant === "area" && (
          <AreaSparkline
            data={normalizedData}
            width={width}
            height={height}
            color={color}
            strokeWidth={strokeWidth}
            showDots={showDots}
            dotRadius={dotRadius}
            animated={animated}
            animationDuration={animationDuration}
            referenceLine={referenceLine}
            referenceLineColor={referenceLineColor}
            min={min}
            max={max}
            onHover={showTooltip ? setHoveredIndex : undefined}
            colorMode={colorMode}
          />
        )}
      </div>
    )

    if (!showTooltip) {
      return sparklineContent
    }

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip open={hoveredIndex !== null}>
          <TooltipTrigger asChild>
            {sparklineContent}
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="px-2 py-1 text-xs"
            sideOffset={4}
          >
            {hoveredPoint && (
              <div className="flex flex-col gap-0.5">
                {hoveredPoint.label && (
                  <span className="text-muted-foreground text-[10px]">
                    {formatLabel(hoveredPoint.label, hoveredIndex!, hoveredPoint.value)}
                  </span>
                )}
                <span className="font-medium tabular-nums">
                  {formatValue(hoveredPoint.value, hoveredIndex!)}
                </span>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)
Sparkline.displayName = "Sparkline"

// ============================================================================
// SPARKLINE GROUP - Multiple sparklines in a row
// ============================================================================

export interface SparklineGroupProps {
  children: React.ReactNode
  className?: string
  gap?: number
  /** Label displayed before the sparklines */
  label?: string
  /** Label position */
  labelPosition?: "left" | "top"
}

export function SparklineGroup({
  children,
  className,
  gap = 8,
  label,
  labelPosition = "left",
}: SparklineGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center",
        labelPosition === "top" && "flex-col items-start",
        className
      )}
      style={{ gap }}
    >
      {label && (
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
      )}
      <div className="flex items-center" style={{ gap }}>
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// SPARKLINE WITH LABEL - Common pattern for dashboards
// ============================================================================

export interface SparklineWithLabelProps extends SparklineProps {
  /** Label text */
  label: string
  /** Current/latest value to display */
  value?: string | number
  /** Change value (e.g., "+5%" or -10) */
  change?: string | number
  /** Position of label relative to sparkline */
  layout?: "horizontal" | "vertical"
}

export function SparklineWithLabel({
  label,
  value,
  change,
  layout = "horizontal",
  ...sparklineProps
}: SparklineWithLabelProps) {
  const normalizedData = normalizeData(sparklineProps.data)
  const trend = calculateTrend(normalizedData)

  const changeColor = trend === "positive"
    ? "text-green-600 dark:text-green-400"
    : trend === "negative"
      ? "text-red-600 dark:text-red-400"
      : "text-muted-foreground"

  return (
    <div
      className={cn(
        "flex gap-3",
        layout === "horizontal" ? "items-center" : "flex-col items-start"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {value !== undefined && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold tabular-nums">{value}</span>
            {change !== undefined && (
              <span className={cn("text-xs tabular-nums", changeColor)}>
                {typeof change === "number" && change > 0 ? "+" : ""}
                {change}
              </span>
            )}
          </div>
        )}
      </div>
      <Sparkline {...sparklineProps} />
    </div>
  )
}

// ============================================================================
// MINI SPARKLINE - Extra compact version
// ============================================================================

export interface MiniSparklineProps extends Omit<SparklineProps, "width" | "height"> {
  /** Size preset */
  size?: "xs" | "sm" | "md"
}

const sizePresets = {
  xs: { width: 40, height: 12 },
  sm: { width: 60, height: 16 },
  md: { width: 80, height: 20 },
}

export function MiniSparkline({ size = "sm", ...props }: MiniSparklineProps) {
  const dimensions = sizePresets[size]
  return (
    <Sparkline
      {...props}
      {...dimensions}
      strokeWidth={1}
      showDots={false}
      animated={false}
    />
  )
}

// ============================================================================
// CSS ANIMATIONS (inject into document)
// ============================================================================

const sparklineKeyframes = `
@keyframes sparkline-line-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes sparkline-area-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes sparkline-bar-grow {
  from {
    transform: scaleY(0);
    transform-origin: bottom;
  }
  to {
    transform: scaleY(1);
    transform-origin: bottom;
  }
}

@keyframes sparkline-dot-pop {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.sparkline-line-animate {
  animation: sparkline-line-draw forwards;
}

.sparkline-area-animate {
  animation: sparkline-area-fade forwards;
}

.sparkline-bar-animate {
  animation: sparkline-bar-grow forwards;
}

.sparkline-dot-animate {
  animation: sparkline-dot-pop 0.2s forwards;
}
`

// Inject keyframes into document head
if (typeof document !== "undefined") {
  const styleId = "sparkline-keyframes"
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = sparklineKeyframes
    document.head.appendChild(style)
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Sparkline
