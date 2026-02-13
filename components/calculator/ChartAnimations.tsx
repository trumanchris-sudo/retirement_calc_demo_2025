"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";

// =============================================================================
// Animation Constants and Types
// =============================================================================

export const ANIMATION_PRESETS = {
  fast: { duration: 300, easing: "ease-out" },
  normal: { duration: 600, easing: "ease-in-out" },
  slow: { duration: 1000, easing: "ease-in-out" },
  smooth: { duration: 800, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  bounce: { duration: 700, easing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
  elastic: { duration: 900, easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)" },
} as const;

export type AnimationPreset = keyof typeof ANIMATION_PRESETS;

export interface ChartAnimationConfig {
  enabled?: boolean;
  preset?: AnimationPreset;
  duration?: number;
  delay?: number;
  stagger?: number;
  easing?: string;
  onComplete?: () => void;
}

interface AnimationContextValue {
  config: ChartAnimationConfig;
  isAnimating: boolean;
  dataVersion: number;
  triggerAnimation: () => void;
}

// =============================================================================
// Animation Context
// =============================================================================

const AnimationContext = createContext<AnimationContextValue | null>(null);

export function useChartAnimation() {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error(
      "useChartAnimation must be used within a ChartAnimationProvider"
    );
  }
  return context;
}

export interface ChartAnimationProviderProps {
  children: React.ReactNode;
  config?: ChartAnimationConfig;
  data?: unknown[];
}

export function ChartAnimationProvider({
  children,
  config = {},
  data,
}: ChartAnimationProviderProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const prevDataRef = useRef(data);

  // Detect data changes to trigger animations
  useEffect(() => {
    if (
      data &&
      prevDataRef.current &&
      JSON.stringify(data) !== JSON.stringify(prevDataRef.current)
    ) {
      setDataVersion((v) => v + 1);
      setIsAnimating(true);
      const duration = config.duration ?? ANIMATION_PRESETS.normal.duration;
      const timer = setTimeout(() => {
        setIsAnimating(false);
        config.onComplete?.();
      }, duration);
      prevDataRef.current = data;
      return () => clearTimeout(timer);
    }
    prevDataRef.current = data;
  }, [data, config]);

  const triggerAnimation = useCallback(() => {
    setDataVersion((v) => v + 1);
    setIsAnimating(true);
    const duration = config.duration ?? ANIMATION_PRESETS.normal.duration;
    setTimeout(() => {
      setIsAnimating(false);
      config.onComplete?.();
    }, duration);
  }, [config]);

  const value = useMemo(
    () => ({
      config: { enabled: true, ...config },
      isAnimating,
      dataVersion,
      triggerAnimation,
    }),
    [config, isAnimating, dataVersion, triggerAnimation]
  );

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}

// =============================================================================
// 1. Animated Line (Path Drawing Effect)
// =============================================================================

export interface AnimatedLineProps {
  dataKey: string;
  stroke?: string;
  strokeWidth?: number;
  animationDuration?: number;
  animationDelay?: number;
  dot?: boolean;
  name?: string;
  type?: "linear" | "monotone" | "step" | "natural";
  strokeDasharray?: string;
  className?: string;
}

export function AnimatedLine({
  dataKey,
  stroke = "#3b82f6",
  strokeWidth = 2,
  animationDuration = 1500,
  animationDelay = 0,
  dot = false,
  name,
  type = "monotone",
  strokeDasharray,
  className,
}: AnimatedLineProps) {
  return (
    <Line
      dataKey={dataKey}
      stroke={stroke}
      strokeWidth={strokeWidth}
      dot={dot}
      name={name}
      type={type}
      strokeDasharray={strokeDasharray}
      className={cn("animated-line", className)}
      isAnimationActive={true}
      animationBegin={animationDelay}
      animationDuration={animationDuration}
      animationEasing="ease-out"
    />
  );
}

// =============================================================================
// 2. Animated Bar (Rise Animation)
// =============================================================================

export interface AnimatedBarProps {
  dataKey: string;
  fill?: string;
  animationDuration?: number;
  animationDelay?: number;
  staggerDelay?: number;
  name?: string;
  radius?: number | [number, number, number, number];
  className?: string;
  onAnimationEnd?: () => void;
}

export function AnimatedBar({
  dataKey,
  fill = "#3b82f6",
  animationDuration = 800,
  animationDelay = 0,
  name,
  radius = [4, 4, 0, 0],
  onAnimationEnd,
}: AnimatedBarProps) {
  return (
    <Bar
      dataKey={dataKey}
      fill={fill}
      name={name}
      radius={radius}
      isAnimationActive={true}
      animationBegin={animationDelay}
      animationDuration={animationDuration}
      animationEasing="ease-out"
      onAnimationEnd={onAnimationEnd}
    />
  );
}

// =============================================================================
// 3. Animated Area (Fill Animation)
// =============================================================================

export interface AnimatedAreaProps {
  dataKey: string;
  fill?: string;
  stroke?: string;
  fillOpacity?: number;
  animationDuration?: number;
  animationDelay?: number;
  name?: string;
  type?: "linear" | "monotone" | "step" | "natural";
  gradientId?: string;
  className?: string;
}

export function AnimatedArea({
  dataKey,
  fill = "#3b82f6",
  stroke = "#3b82f6",
  fillOpacity = 0.3,
  animationDuration = 1200,
  animationDelay = 0,
  name,
  type = "monotone",
  gradientId,
  className,
}: AnimatedAreaProps) {
  return (
    <Area
      dataKey={dataKey}
      fill={gradientId ? `url(#${gradientId})` : fill}
      stroke={stroke}
      fillOpacity={fillOpacity}
      name={name}
      type={type}
      className={cn("animated-area", className)}
      isAnimationActive={true}
      animationBegin={animationDelay}
      animationDuration={animationDuration}
      animationEasing="ease-in-out"
    />
  );
}

// =============================================================================
// 4. Animated Tooltip
// =============================================================================

export interface AnimatedTooltipProps {
  animationDuration?: number;
  showArrow?: boolean;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedTooltip({
  animationDuration = 200,
  className,
  formatter,
}: AnimatedTooltipProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div
        className={cn(
          "animated-tooltip rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm",
          "px-3 py-2 shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          className
        )}
        style={{
          animation: `tooltipEntrance ${animationDuration}ms ease-out`,
        }}
      >
        {label && (
          <div className="font-semibold text-sm mb-1 text-foreground">
            {label}
          </div>
        )}
        <div className="space-y-1">
          {payload.map((entry: { dataKey?: string; name?: string; value?: number; color?: string }, index: number) => (
            <div
              key={`${entry.dataKey || entry.name}-${index}`}
              className="flex items-center gap-2 text-sm"
              style={{
                animation: `tooltipItemSlide 150ms ease-out ${50 * index}ms both`,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">
                {formatter && entry.value !== undefined
                  ? formatter(entry.value)
                  : entry.value?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Tooltip
      content={CustomTooltipContent}
      cursor={{
        stroke: "hsl(var(--muted-foreground))",
        strokeWidth: 1,
        strokeDasharray: "4 4",
      }}
    />
  );
}

// =============================================================================
// 5. Animated Legend
// =============================================================================

export interface AnimatedLegendProps {
  animationDuration?: number;
  hoverScale?: number;
  className?: string;
}

export function AnimatedLegend({
  animationDuration = 300,
  hoverScale = 1.05,
  className,
}: AnimatedLegendProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomLegendContent = ({ payload }: any) => {
    if (!payload?.length) return null;

    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-4 pt-4",
          className
        )}
      >
        {payload.map((entry: { value?: string; color?: string; dataKey?: string }, index: number) => {
          const key = entry.dataKey || entry.value || `item-${index}`;
          return (
            <div
              key={`legend-${key}-${index}`}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer",
                "transition-all duration-200",
                hoveredItem === key && "bg-muted"
              )}
              style={{
                animation: `legendItemFadeIn ${animationDuration}ms ease-out ${index * 100}ms both`,
                transform: hoveredItem === key ? `scale(${hoverScale})` : "scale(1)",
              }}
              onMouseEnter={() => setHoveredItem(key)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-sm transition-transform duration-200",
                  hoveredItem === key && "scale-110"
                )}
                style={{ backgroundColor: entry.color }}
              />
              <span
                className={cn(
                  "text-sm transition-colors duration-200",
                  hoveredItem === key
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return <Legend content={CustomLegendContent} />;
}

// =============================================================================
// 6. Animated Axis Labels
// =============================================================================

export interface AnimatedAxisProps {
  type: "x" | "y";
  dataKey?: string;
  animationDuration?: number;
  animationDelay?: number;
  tickFormatter?: (value: number) => string;
  className?: string;
}

export function AnimatedXAxis({
  dataKey = "name",
  animationDuration = 500,
  animationDelay = 0,
  tickFormatter,
}: Omit<AnimatedAxisProps, "type">) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    if (!payload || x === undefined || y === undefined) return <g />;

    return (
      <g
        transform={`translate(${x},${y})`}
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `all ${animationDuration}ms ease-out ${(payload.index || 0) * 50}ms`,
        }}
      >
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          className="text-xs"
        >
          {tickFormatter ? tickFormatter(payload.value) : payload.value}
        </text>
      </g>
    );
  };

  return <XAxis dataKey={dataKey} tick={CustomTick} axisLine={false} />;
}

export function AnimatedYAxis({
  animationDuration = 500,
  animationDelay = 0,
  tickFormatter,
}: Omit<AnimatedAxisProps, "type" | "dataKey">) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    if (!payload || x === undefined || y === undefined) return <g />;

    return (
      <g
        transform={`translate(${x},${y})`}
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `all ${animationDuration}ms ease-out ${(payload.index || 0) * 30}ms`,
        }}
      >
        <text
          x={0}
          y={0}
          dx={-10}
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
          className="text-xs"
        >
          {tickFormatter ? tickFormatter(payload.value) : payload.value}
        </text>
      </g>
    );
  };

  return <YAxis tick={CustomTick} axisLine={false} />;
}

// =============================================================================
// 7. Animated Grid with Pulse Effect
// =============================================================================

export interface AnimatedGridProps {
  strokeDasharray?: string;
  pulseOnDataChange?: boolean;
  pulseDuration?: number;
  className?: string;
}

export function AnimatedGrid({
  strokeDasharray = "3 3",
  pulseOnDataChange = true,
  pulseDuration = 500,
  className,
}: AnimatedGridProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const animationContext = useContext(AnimationContext);

  useEffect(() => {
    if (pulseOnDataChange && animationContext?.dataVersion) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), pulseDuration);
      return () => clearTimeout(timer);
    }
  }, [animationContext?.dataVersion, pulseOnDataChange, pulseDuration]);

  return (
    <CartesianGrid
      strokeDasharray={strokeDasharray}
      className={cn(
        "transition-opacity duration-300",
        isPulsing ? "animate-pulse opacity-70" : "opacity-30",
        className
      )}
      stroke="hsl(var(--border))"
    />
  );
}

// =============================================================================
// CSS Keyframes (inject into document)
// =============================================================================

export const ChartAnimationStyles = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
        @keyframes barRise {
          0% {
            transform: scaleY(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        @keyframes tooltipEntrance {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes tooltipItemSlide {
          0% {
            opacity: 0;
            transform: translateX(-10px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes legendItemFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes lineDrawIn {
          0% {
            stroke-dashoffset: 100%;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes areaFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes gridPulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes dotPopIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animated-line {
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .animated-bar {
          transform-origin: center bottom;
        }

        .animated-area {
          transition: opacity 300ms ease-in-out;
        }

        .chart-container-animated {
          --chart-animation-duration: 600ms;
        }

        .chart-container-animated .recharts-line-curve {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: lineDrawIn var(--chart-animation-duration) ease-out forwards;
        }

        .chart-container-animated .recharts-area-area {
          animation: areaFadeIn calc(var(--chart-animation-duration) * 1.5) ease-in-out forwards;
        }
      `,
    }}
  />
);

// =============================================================================
// Pre-configured Animated Chart Wrappers
// =============================================================================

export interface AnimatedLineChartProps {
  data: Array<Record<string, unknown>>;
  lines: Array<{
    dataKey: string;
    stroke?: string;
    name?: string;
    strokeWidth?: number;
    type?: "linear" | "monotone" | "step" | "natural";
  }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  animationPreset?: AnimationPreset;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function AnimatedLineChart({
  data,
  lines,
  xAxisKey = "name",
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  animationPreset = "normal",
  valueFormatter,
  className,
}: AnimatedLineChartProps) {
  const preset = ANIMATION_PRESETS[animationPreset];

  return (
    <ChartAnimationProvider data={data} config={{ duration: preset.duration }}>
      <ChartAnimationStyles />
      <div className={cn("chart-container-animated", className)}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            {showGrid && <AnimatedGrid />}
            <AnimatedXAxis dataKey={xAxisKey} />
            <AnimatedYAxis tickFormatter={valueFormatter} />
            {showTooltip && <AnimatedTooltip formatter={valueFormatter} />}
            {showLegend && <AnimatedLegend />}
            {lines.map((line, index) => (
              <AnimatedLine
                key={line.dataKey}
                dataKey={line.dataKey}
                stroke={line.stroke}
                name={line.name}
                strokeWidth={line.strokeWidth}
                type={line.type}
                animationDelay={index * 200}
                animationDuration={preset.duration}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartAnimationProvider>
  );
}

export interface AnimatedBarChartProps {
  data: Array<Record<string, unknown>>;
  bars: Array<{
    dataKey: string;
    fill?: string;
    name?: string;
    radius?: number | [number, number, number, number];
  }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  animationPreset?: AnimationPreset;
  valueFormatter?: (value: number) => string;
  stacked?: boolean;
  className?: string;
}

export function AnimatedBarChart({
  data,
  bars,
  xAxisKey = "name",
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  animationPreset = "normal",
  valueFormatter,
  className,
}: AnimatedBarChartProps) {
  const preset = ANIMATION_PRESETS[animationPreset];

  return (
    <ChartAnimationProvider data={data} config={{ duration: preset.duration }}>
      <ChartAnimationStyles />
      <div className={cn("chart-container-animated", className)}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            {showGrid && <AnimatedGrid />}
            <AnimatedXAxis dataKey={xAxisKey} />
            <AnimatedYAxis tickFormatter={valueFormatter} />
            {showTooltip && <AnimatedTooltip formatter={valueFormatter} />}
            {showLegend && <AnimatedLegend />}
            {bars.map((bar, index) => (
              <AnimatedBar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                fill={bar.fill}
                name={bar.name}
                radius={bar.radius}
                animationDelay={index * 100}
                animationDuration={preset.duration}
                staggerDelay={50}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartAnimationProvider>
  );
}

export interface AnimatedAreaChartProps {
  data: Array<Record<string, unknown>>;
  areas: Array<{
    dataKey: string;
    fill?: string;
    stroke?: string;
    name?: string;
    fillOpacity?: number;
  }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  animationPreset?: AnimationPreset;
  valueFormatter?: (value: number) => string;
  stacked?: boolean;
  className?: string;
}

export function AnimatedAreaChart({
  data,
  areas,
  xAxisKey = "name",
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  animationPreset = "normal",
  valueFormatter,
  className,
}: AnimatedAreaChartProps) {
  const preset = ANIMATION_PRESETS[animationPreset];

  return (
    <ChartAnimationProvider data={data} config={{ duration: preset.duration }}>
      <ChartAnimationStyles />
      <div className={cn("chart-container-animated", className)}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              {areas.map((area) => (
                <linearGradient
                  key={`gradient-${area.dataKey}`}
                  id={`gradient-${area.dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={area.fill || "#3b82f6"}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor={area.fill || "#3b82f6"}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              ))}
            </defs>
            {showGrid && <AnimatedGrid />}
            <AnimatedXAxis dataKey={xAxisKey} />
            <AnimatedYAxis tickFormatter={valueFormatter} />
            {showTooltip && <AnimatedTooltip formatter={valueFormatter} />}
            {showLegend && <AnimatedLegend />}
            {areas.map((area, index) => (
              <AnimatedArea
                key={area.dataKey}
                dataKey={area.dataKey}
                fill={area.fill}
                stroke={area.stroke}
                name={area.name}
                fillOpacity={area.fillOpacity}
                gradientId={`gradient-${area.dataKey}`}
                animationDelay={index * 150}
                animationDuration={preset.duration}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartAnimationProvider>
  );
}

// =============================================================================
// Utility hook for triggering chart re-animations
// =============================================================================

export function useChartReanimation() {
  const [key, setKey] = useState(0);

  const triggerReanimation = useCallback(() => {
    setKey((k) => k + 1);
  }, []);

  return { key, triggerReanimation };
}

// =============================================================================
// Export all components
// =============================================================================

export {
  // Context
  AnimationContext,
};

// Also re-export the raw recharts components for those who want them
export {
  LineChart,
  BarChart,
  AreaChart,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
