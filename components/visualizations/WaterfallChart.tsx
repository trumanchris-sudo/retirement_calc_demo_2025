"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, fmt } from "@/lib/utils";
import { WATERFALL_COLORS, CHART_COLORS } from "@/lib/chartColors";

// ============================================================================
// Types
// ============================================================================

export type WaterfallCategory = "income" | "tax" | "expense" | "savings" | "total";

export interface WaterfallDataPoint {
  /** Label for the bar (e.g., "Gross Income", "Federal Tax") */
  label: string;
  /** Absolute value (positive for income/savings, negative for taxes/expenses) */
  value: number;
  /** Category determines color coding */
  category: WaterfallCategory;
  /** Optional description for tooltip */
  description?: string;
}

export interface WaterfallChartProps {
  /** Array of data points to display */
  data: WaterfallDataPoint[];
  /** Chart title */
  title?: string;
  /** Chart description */
  description?: string;
  /** Height of the chart in pixels */
  height?: number;
  /** Whether to show the running total line */
  showRunningTotal?: boolean;
  /** Whether to show connecting lines between bars */
  showConnectors?: boolean;
  /** Whether to animate bar reveals */
  animated?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Custom color scheme */
  colors?: Partial<Record<WaterfallCategory, string>>;
  /** Format function for values */
  formatValue?: (value: number) => string;
  /** CSS class name */
  className?: string;
  /** Whether component is in loading state */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLORS: Record<WaterfallCategory, string> = {
  income: WATERFALL_COLORS.income,
  tax: WATERFALL_COLORS.tax,
  expense: WATERFALL_COLORS.expense,
  savings: WATERFALL_COLORS.savings,
  total: WATERFALL_COLORS.total,
};

const CATEGORY_LABELS: Record<WaterfallCategory, string> = {
  income: "Income",
  tax: "Taxes",
  expense: "Expenses",
  savings: "Savings",
  total: "Net Total",
};

// ============================================================================
// Helper Functions
// ============================================================================

interface ProcessedDataPoint {
  label: string;
  value: number;
  category: WaterfallCategory;
  description?: string;
  // Computed fields for waterfall rendering
  start: number;
  end: number;
  runningTotal: number;
  isPositive: boolean;
  barHeight: number;
  barY: number;
}

function processWaterfallData(data: WaterfallDataPoint[]): ProcessedDataPoint[] {
  let runningTotal = 0;

  return data.map((point) => {
    const isPositive = point.value >= 0;
    const start = runningTotal;

    // For totals, show the full bar from 0
    if (point.category === "total") {
      return {
        ...point,
        start: 0,
        end: point.value,
        runningTotal: point.value,
        isPositive: point.value >= 0,
        barHeight: Math.abs(point.value),
        barY: point.value >= 0 ? 0 : point.value,
      };
    }

    runningTotal += point.value;

    return {
      ...point,
      start,
      end: runningTotal,
      runningTotal,
      isPositive,
      barHeight: Math.abs(point.value),
      barY: isPositive ? start : runningTotal,
    };
  });
}

// ============================================================================
// Custom Components
// ============================================================================

interface CustomBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: ProcessedDataPoint;
  index?: number;
  animated?: boolean;
  animationDelay?: number;
  isAnimationComplete?: boolean;
}

const CustomBar: React.FC<CustomBarProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  payload,
  index = 0,
  animated = true,
  animationDelay = 0,
  isAnimationComplete = false,
}) => {
  const [animatedHeight, setAnimatedHeight] = useState(animated && !isAnimationComplete ? 0 : height);
  const [animatedY, setAnimatedY] = useState(animated && !isAnimationComplete ? y + height : y);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animated || isAnimationComplete) {
      setAnimatedHeight(height);
      setAnimatedY(y);
      return;
    }

    const delay = index * animationDelay;
    const duration = 400;
    const startTime = performance.now() + delay;

    const animate = (currentTime: number) => {
      if (currentTime < startTime) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedHeight(height * eased);
      setAnimatedY(y + height * (1 - eased));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animated, height, y, index, animationDelay, isAnimationComplete]);

  if (!payload) return null;

  return (
    <g>
      {/* Bar shadow for depth */}
      <rect
        x={x + 2}
        y={animatedY + 2}
        width={width}
        height={animatedHeight}
        fill="rgba(0,0,0,0.1)"
        rx={4}
        ry={4}
      />
      {/* Main bar */}
      <rect
        x={x}
        y={animatedY}
        width={width}
        height={animatedHeight}
        fill={fill}
        rx={4}
        ry={4}
        className="transition-opacity duration-200 hover:opacity-80"
      />
      {/* Highlight gradient overlay */}
      <rect
        x={x}
        y={animatedY}
        width={width}
        height={animatedHeight / 2}
        fill="url(#barHighlight)"
        rx={4}
        ry={4}
        style={{ pointerEvents: "none" }}
      />
    </g>
  );
};

interface ConnectorLineProps {
  data: ProcessedDataPoint[];
  xScale: (value: string) => number;
  yScale: (value: number) => number;
  barWidth: number;
}

const ConnectorLines: React.FC<ConnectorLineProps> = ({
  data,
  xScale,
  yScale,
  barWidth,
}) => {
  return (
    <g className="connector-lines">
      {data.slice(0, -1).map((point, index) => {
        const nextPoint = data[index + 1];
        if (!nextPoint || nextPoint.category === "total") return null;

        const x1 = xScale(point.label) + barWidth;
        const x2 = xScale(nextPoint.label);
        const y = yScale(point.runningTotal);

        return (
          <line
            key={`connector-${index}`}
            x1={x1}
            x2={x2}
            y1={y}
            y2={y}
            stroke="rgba(156, 163, 175, 0.5)"
            strokeWidth={1}
            strokeDasharray="4,4"
            className="transition-opacity duration-300"
          />
        );
      })}
    </g>
  );
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ProcessedDataPoint }>;
  formatValue: (value: number) => string;
  colors: Record<WaterfallCategory, string>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  formatValue,
  colors,
}) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const color = colors[data.category];

  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <span className="font-semibold text-foreground">{data.label}</span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount:</span>
          <span className={cn(
            "font-mono font-medium",
            data.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {data.isPositive ? "+" : ""}{formatValue(data.value)}
          </span>
        </div>

        {data.category !== "total" && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Running Total:</span>
            <span className="font-mono font-medium text-foreground">
              {formatValue(data.runningTotal)}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Category:</span>
          <span className="text-foreground">{CATEGORY_LABELS[data.category]}</span>
        </div>

        {data.description && (
          <div className="pt-2 border-t border-border mt-2">
            <p className="text-muted-foreground text-xs">{data.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const WaterfallChart = React.memo(function WaterfallChart({
  data,
  title = "Cash Flow Waterfall",
  description = "Step-by-step breakdown of income, taxes, expenses, and savings",
  height = 400,
  showRunningTotal = true,
  showConnectors = true,
  animated = true,
  animationDuration = 100,
  colors: customColors,
  formatValue = fmt,
  className,
  isLoading = false,
}: WaterfallChartProps) {
  const [isAnimationComplete, setIsAnimationComplete] = useState(!animated);
  const chartRef = useRef<HTMLDivElement>(null);

  const colors = useMemo(() => ({
    ...DEFAULT_COLORS,
    ...customColors,
  }), [customColors]);

  const processedData = useMemo(() => processWaterfallData(data), [data]);

  // Reset animation when data changes
  useEffect(() => {
    if (animated) {
      setIsAnimationComplete(false);
      const totalDuration = data.length * animationDuration + 500;
      const timer = setTimeout(() => {
        setIsAnimationComplete(true);
      }, totalDuration);
      return () => clearTimeout(timer);
    }
  }, [data, animated, animationDuration]);

  // Calculate domain for Y axis
  const yDomain = useMemo(() => {
    const allValues = processedData.flatMap(d => [d.start, d.end, d.runningTotal]);
    const min = Math.min(0, ...allValues);
    const max = Math.max(0, ...allValues);
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [processedData]);

  // Custom bar shape renderer
  // Reason: recharts v2 Bar shape prop types are overly restrictive but accept render functions at runtime
  const renderBar = (props: unknown) => (
    <CustomBar
      {...(props as CustomBarProps)}
      animated={animated}
      animationDelay={animationDuration}
      isAnimationComplete={isAnimationComplete}
    />
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-5 w-5 bg-muted animate-pulse rounded" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center bg-muted/20 rounded-lg animate-pulse"
            style={{ height }}
          >
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center bg-muted/10 rounded-lg border-2 border-dashed border-muted"
            style={{ height }}
          >
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} style={{ height }} role="img" aria-label={`${title}: ${description}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={processedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="barHighlight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <linearGradient id="runningTotalGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(139, 92, 246, 0.8)" />
                  <stop offset="100%" stopColor="rgba(139, 92, 246, 0.8)" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(156, 163, 175, 0.2)"
              />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(156, 163, 175, 0.3)" }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />

              <YAxis
                domain={yDomain}
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(156, 163, 175, 0.3)" }}
                tickFormatter={(value) => formatValue(value)}
                width={80}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    formatValue={formatValue}
                    colors={colors}
                  />
                }
                cursor={{ fill: "rgba(156, 163, 175, 0.1)" }}
              />

              {/* Zero reference line */}
              <ReferenceLine
                y={0}
                stroke="rgba(156, 163, 175, 0.5)"
                strokeWidth={1}
              />

              {/* Waterfall bars using barY as base and barHeight as height */}
              <Bar
                dataKey="barHeight"
                shape={renderBar}
                isAnimationActive={false}
              >
                {processedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[entry.category]}
                  />
                ))}
              </Bar>

              {/* Running total line */}
              {showRunningTotal && (
                <Line
                  type="monotone"
                  dataKey="runningTotal"
                  stroke="url(#runningTotalGradient)"
                  strokeWidth={2}
                  dot={{
                    fill: CHART_COLORS.tertiary,
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{
                    fill: CHART_COLORS.tertiary,
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                    r: 6,
                  }}
                  isAnimationActive={animated}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-border">
          {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
            const hasCategory = processedData.some(d => d.category === category);
            if (!hasCategory) return null;

            return (
              <div key={category} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: colors[category as WaterfallCategory] }}
                />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            );
          })}
          {showRunningTotal && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-violet-500 rounded" />
              <span className="text-sm text-muted-foreground">Running Total</span>
            </div>
          )}
        </div>

        {/* Summary statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
          {(() => {
            const totalIncome = processedData
              .filter(d => d.category === "income")
              .reduce((sum, d) => sum + d.value, 0);
            const totalTaxes = processedData
              .filter(d => d.category === "tax")
              .reduce((sum, d) => sum + Math.abs(d.value), 0);
            const totalExpenses = processedData
              .filter(d => d.category === "expense")
              .reduce((sum, d) => sum + Math.abs(d.value), 0);
            const netSavings = processedData
              .filter(d => d.category === "savings" || d.category === "total")
              .reduce((sum, d) => sum + d.value, 0) || (totalIncome - totalTaxes - totalExpenses);

            return (
              <>
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-xs text-muted-foreground">Total Income</div>
                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatValue(totalIncome)}
                  </div>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-xs text-muted-foreground">Total Taxes</div>
                  <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                    -{formatValue(totalTaxes)}
                  </div>
                </div>
                <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div className="text-xs text-muted-foreground">Total Expenses</div>
                  <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    -{formatValue(totalExpenses)}
                  </div>
                </div>
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-xs text-muted-foreground">Net Savings</div>
                  <div className={cn(
                    "text-sm font-semibold",
                    netSavings >= 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-red-600 dark:text-red-400"
                  )}>
                    {netSavings >= 0 ? "+" : ""}{formatValue(netSavings)}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Preset Data Generators
// ============================================================================

/**
 * Generate sample tax breakdown waterfall data
 */
export function generateTaxBreakdownData(
  grossIncome: number,
  federalTax: number,
  stateTax: number,
  socialSecurity: number,
  medicare: number,
  healthInsurance: number,
  retirement401k: number,
): WaterfallDataPoint[] {
  return [
    {
      label: "Gross Income",
      value: grossIncome,
      category: "income",
      description: "Total annual earnings before deductions",
    },
    {
      label: "Federal Tax",
      value: -federalTax,
      category: "tax",
      description: "Federal income tax withholding",
    },
    {
      label: "State Tax",
      value: -stateTax,
      category: "tax",
      description: "State income tax withholding",
    },
    {
      label: "Social Security",
      value: -socialSecurity,
      category: "tax",
      description: "Social Security (FICA) contribution",
    },
    {
      label: "Medicare",
      value: -medicare,
      category: "tax",
      description: "Medicare (FICA) contribution",
    },
    {
      label: "Health Insurance",
      value: -healthInsurance,
      category: "expense",
      description: "Pre-tax health insurance premium",
    },
    {
      label: "401(k) Contribution",
      value: -retirement401k,
      category: "savings",
      description: "Pre-tax retirement contribution",
    },
    {
      label: "Take Home Pay",
      value: grossIncome - federalTax - stateTax - socialSecurity - medicare - healthInsurance - retirement401k,
      category: "total",
      description: "Net amount deposited to your bank account",
    },
  ];
}

/**
 * Generate sample monthly cash flow waterfall data
 */
export function generateCashFlowData(
  takeHomePay: number,
  housing: number,
  utilities: number,
  food: number,
  transportation: number,
  insurance: number,
  entertainment: number,
  savings: number,
): WaterfallDataPoint[] {
  return [
    {
      label: "Take Home Pay",
      value: takeHomePay,
      category: "income",
      description: "Monthly net income after payroll deductions",
    },
    {
      label: "Housing",
      value: -housing,
      category: "expense",
      description: "Rent or mortgage payment",
    },
    {
      label: "Utilities",
      value: -utilities,
      category: "expense",
      description: "Electric, gas, water, internet, etc.",
    },
    {
      label: "Food",
      value: -food,
      category: "expense",
      description: "Groceries and dining out",
    },
    {
      label: "Transportation",
      value: -transportation,
      category: "expense",
      description: "Car payment, gas, insurance, transit",
    },
    {
      label: "Insurance",
      value: -insurance,
      category: "expense",
      description: "Life, disability, and other insurance",
    },
    {
      label: "Entertainment",
      value: -entertainment,
      category: "expense",
      description: "Subscriptions, hobbies, recreation",
    },
    {
      label: "Monthly Savings",
      value: savings,
      category: "savings",
      description: "Amount transferred to savings/investment",
    },
    {
      label: "Remaining",
      value: takeHomePay - housing - utilities - food - transportation - insurance - entertainment - savings,
      category: "total",
      description: "Discretionary spending money left over",
    },
  ];
}

export default WaterfallChart;
