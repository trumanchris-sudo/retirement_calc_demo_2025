"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface PieSegment {
  /** Unique identifier for the segment */
  id: string;
  /** Display name */
  name: string;
  /** Numeric value */
  value: number;
  /** Optional color override (otherwise uses gradient palette) */
  color?: string;
  /** Optional child segments for drill-down */
  children?: PieSegment[];
  /** Optional icon component */
  icon?: React.ReactNode;
}

export interface InteractivePieChartProps {
  /** Data segments to display */
  data: PieSegment[];
  /** Chart title */
  title?: string;
  /** Chart subtitle/description */
  subtitle?: string;
  /** Format function for values (default: currency) */
  formatValue?: (value: number) => string;
  /** Format function for percentages */
  formatPercent?: (percent: number) => string;
  /** Chart height in pixels */
  height?: number;
  /** Show as donut (true) or solid pie (false) */
  donut?: boolean;
  /** Inner radius ratio for donut (0-1) */
  innerRadiusRatio?: number;
  /** Show legend below chart */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: "bottom" | "right";
  /** Callback when segment is clicked */
  onSegmentClick?: (segment: PieSegment, path: PieSegment[]) => void;
  /** Enable drill-down navigation */
  enableDrillDown?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Custom center content renderer */
  renderCenterContent?: (total: number, activeSegment: PieSegment | null) => React.ReactNode;
  /** Chart variant for different use cases */
  variant?: "asset-allocation" | "expense-breakdown" | "tax-breakdown" | "default";
  /** Show gradient fills */
  showGradients?: boolean;
  /** Dark mode */
  isDarkMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Color Palettes
// ============================================================================

const GRADIENT_PALETTES = {
  "asset-allocation": [
    { start: "#3b82f6", end: "#1d4ed8", name: "blue" },      // Stocks
    { start: "#10b981", end: "#047857", name: "emerald" },   // Bonds
    { start: "#f59e0b", end: "#d97706", name: "amber" },     // Real Estate
    { start: "#8b5cf6", end: "#6d28d9", name: "violet" },    // Alternatives
    { start: "#ec4899", end: "#be185d", name: "pink" },      // Cash
    { start: "#06b6d4", end: "#0891b2", name: "cyan" },      // International
  ],
  "expense-breakdown": [
    { start: "#ef4444", end: "#b91c1c", name: "red" },       // Housing
    { start: "#f97316", end: "#c2410c", name: "orange" },    // Food
    { start: "#eab308", end: "#a16207", name: "yellow" },    // Transport
    { start: "#22c55e", end: "#15803d", name: "green" },     // Healthcare
    { start: "#3b82f6", end: "#1d4ed8", name: "blue" },      // Utilities
    { start: "#a855f7", end: "#7c3aed", name: "purple" },    // Entertainment
    { start: "#64748b", end: "#475569", name: "slate" },     // Other
  ],
  "tax-breakdown": [
    { start: "#dc2626", end: "#991b1b", name: "red" },       // Federal
    { start: "#2563eb", end: "#1e40af", name: "blue" },      // State
    { start: "#059669", end: "#047857", name: "green" },     // FICA
    { start: "#7c3aed", end: "#5b21b6", name: "purple" },    // Property
    { start: "#ea580c", end: "#c2410c", name: "orange" },    // Sales
    { start: "#0891b2", end: "#0e7490", name: "cyan" },      // Other
  ],
  default: [
    { start: "#3b82f6", end: "#2563eb", name: "blue" },
    { start: "#10b981", end: "#059669", name: "emerald" },
    { start: "#f59e0b", end: "#d97706", name: "amber" },
    { start: "#ef4444", end: "#dc2626", name: "red" },
    { start: "#8b5cf6", end: "#7c3aed", name: "violet" },
    { start: "#ec4899", end: "#db2777", name: "pink" },
    { start: "#06b6d4", end: "#0891b2", name: "cyan" },
    { start: "#84cc16", end: "#65a30d", name: "lime" },
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

const defaultFormatValue = (value: number): string => {
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const defaultFormatPercent = (percent: number): string => {
  return `${percent.toFixed(1)}%`;
};

// ============================================================================
// Active Shape Renderer (for hover expansion)
// ============================================================================

interface ActiveShapeProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: PieSegment & { percent: number };
  percent: number;
  value: number;
  formatValue: (v: number) => string;
  formatPercent: (p: number) => string;
  isDarkMode: boolean;
  isSelected: boolean;
}

const renderActiveShape = (props: ActiveShapeProps) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    formatValue,
    formatPercent,
    isDarkMode,
    isSelected,
  } = props;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  // Pull-out offset for selected segment
  const pullOutOffset = isSelected ? 12 : 0;
  const offsetX = pullOutOffset * cos;
  const offsetY = pullOutOffset * sin;

  // Expansion on hover
  const expandedOuterRadius = outerRadius + 8;

  return (
    <g>
      {/* Main expanded sector */}
      <Sector
        cx={cx + offsetX}
        cy={cy + offsetY}
        innerRadius={innerRadius}
        outerRadius={expandedOuterRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
          transition: "all 0.3s ease-out",
        }}
      />
      {/* Highlight ring */}
      <Sector
        cx={cx + offsetX}
        cy={cy + offsetY}
        innerRadius={expandedOuterRadius + 2}
        outerRadius={expandedOuterRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ opacity: 0.5 }}
      />
      {/* Tooltip label */}
      <g>
        <text
          x={cx + offsetX}
          y={cy + offsetY - 10}
          textAnchor="middle"
          fill={isDarkMode ? "#f3f4f6" : "#1f2937"}
          fontSize={14}
          fontWeight={600}
        >
          {payload.name}
        </text>
        <text
          x={cx + offsetX}
          y={cy + offsetY + 8}
          textAnchor="middle"
          fill={isDarkMode ? "#9ca3af" : "#6b7280"}
          fontSize={12}
        >
          {formatValue(payload.value)}
        </text>
        <text
          x={cx + offsetX}
          y={cy + offsetY + 24}
          textAnchor="middle"
          fill={fill}
          fontSize={13}
          fontWeight={500}
        >
          {formatPercent(percent * 100)}
        </text>
      </g>
    </g>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const InteractivePieChart = React.memo(function InteractivePieChart({
  data,
  title,
  subtitle,
  formatValue = defaultFormatValue,
  formatPercent = defaultFormatPercent,
  height = 400,
  donut = true,
  innerRadiusRatio = 0.6,
  showLegend = true,
  legendPosition = "bottom",
  onSegmentClick,
  enableDrillDown = true,
  animationDuration = 800,
  renderCenterContent,
  variant = "default",
  showGradients = true,
  isDarkMode = false,
  className,
}: InteractivePieChartProps) {
  // State
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drillDownPath, setDrillDownPath] = useState<PieSegment[]>([]);
  const [hoveredLegendIndex, setHoveredLegendIndex] = useState<number | null>(null);

  // Get current data based on drill-down path
  const currentData = useMemo(() => {
    if (drillDownPath.length === 0) return data;
    const lastSegment = drillDownPath[drillDownPath.length - 1];
    return lastSegment.children || data;
  }, [data, drillDownPath]);

  // Calculate total
  const total = useMemo(() => {
    return currentData.reduce((sum, segment) => sum + segment.value, 0);
  }, [currentData]);

  // Get color palette
  const palette = GRADIENT_PALETTES[variant] || GRADIENT_PALETTES.default;

  // Get color for segment
  const getSegmentColor = useCallback(
    (segment: PieSegment, index: number): string => {
      if (segment.color) return segment.color;
      const paletteColor = palette[index % palette.length];
      return paletteColor.start;
    },
    [palette]
  );

  // Reset state on drill-down
  useEffect(() => {
    setActiveIndex(null);
    setSelectedIndex(null);
  }, [drillDownPath]);

  // Handlers
  const handleMouseEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleClick = useCallback(
    (segment: PieSegment, index: number) => {
      // Toggle selection
      if (selectedIndex === index) {
        setSelectedIndex(null);
      } else {
        setSelectedIndex(index);
      }

      // Handle drill-down
      if (enableDrillDown && segment.children && segment.children.length > 0) {
        setDrillDownPath((prev) => [...prev, segment]);
      }

      // Callback
      if (onSegmentClick) {
        onSegmentClick(segment, drillDownPath);
      }
    },
    [selectedIndex, enableDrillDown, onSegmentClick, drillDownPath]
  );

  const handleDrillUp = useCallback(() => {
    setDrillDownPath((prev) => prev.slice(0, -1));
  }, []);

  const handleLegendMouseEnter = useCallback((index: number) => {
    setHoveredLegendIndex(index);
    setActiveIndex(index);
  }, []);

  const handleLegendMouseLeave = useCallback(() => {
    setHoveredLegendIndex(null);
    setActiveIndex(null);
  }, []);

  const handleLegendClick = useCallback(
    (segment: PieSegment, index: number) => {
      handleClick(segment, index);
    },
    [handleClick]
  );

  // Compute inner/outer radius
  const outerRadius = Math.min(height * 0.35, 140);
  const innerRadius = donut ? outerRadius * innerRadiusRatio : 0;

  // Prepare data with percentages
  const chartData = useMemo(() => {
    return currentData.map((segment, index) => ({
      ...segment,
      percent: segment.value / total,
      fill: getSegmentColor(segment, index),
    }));
  }, [currentData, total, getSegmentColor]);

  // Generate gradient definitions
  const gradientDefs = useMemo(() => {
    if (!showGradients) return null;
    return (
      <defs>
        {palette.map((colors, index) => (
          <linearGradient
            key={`gradient-${colors.name}`}
            id={`pie-gradient-${index}`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor={colors.start} stopOpacity={1} />
            <stop offset="100%" stopColor={colors.end} stopOpacity={0.85} />
          </linearGradient>
        ))}
      </defs>
    );
  }, [palette, showGradients]);

  // Get fill for cell
  const getCellFill = useCallback(
    (segment: PieSegment, index: number): string => {
      if (segment.color) return segment.color;
      if (showGradients) return `url(#pie-gradient-${index % palette.length})`;
      return palette[index % palette.length].start;
    },
    [showGradients, palette]
  );

  // Active segment for center content
  const activeSegment = activeIndex !== null ? currentData[activeIndex] : null;

  // Default center content
  const defaultCenterContent = (
    <div className="flex flex-col items-center justify-center text-center">
      {activeSegment ? (
        <>
          <span
            className={cn(
              "text-2xl font-bold",
              isDarkMode ? "text-white" : "text-gray-900"
            )}
          >
            {formatValue(activeSegment.value)}
          </span>
          <span
            className={cn(
              "text-sm",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}
          >
            {activeSegment.name}
          </span>
          <span
            className="text-sm font-medium"
            style={{ color: getSegmentColor(activeSegment, activeIndex!) }}
          >
            {formatPercent((activeSegment.value / total) * 100)}
          </span>
        </>
      ) : (
        <>
          <span
            className={cn(
              "text-3xl font-bold",
              isDarkMode ? "text-white" : "text-gray-900"
            )}
          >
            {formatValue(total)}
          </span>
          <span
            className={cn(
              "text-sm",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}
          >
            Total
          </span>
        </>
      )}
    </div>
  );

  // Render legend item
  const renderLegendItem = (segment: PieSegment, index: number) => {
    const percent = (segment.value / total) * 100;
    const isHovered = hoveredLegendIndex === index;
    const isSelected = selectedIndex === index;
    const hasChildren = segment.children && segment.children.length > 0;

    return (
      <button
        key={segment.id}
        onClick={() => handleLegendClick(segment, index)}
        onMouseEnter={() => handleLegendMouseEnter(index)}
        onMouseLeave={handleLegendMouseLeave}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
          "text-left w-full",
          isHovered || isSelected
            ? isDarkMode
              ? "bg-gray-800"
              : "bg-gray-100"
            : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          isSelected && "ring-2 ring-offset-1",
          hasChildren && enableDrillDown && "cursor-pointer"
        )}
        style={
          isSelected
            ? ({ "--tw-ring-color": getSegmentColor(segment, index) } as React.CSSProperties)
            : undefined
        }
      >
        {/* Color indicator */}
        <div
          className={cn(
            "w-4 h-4 rounded-full flex-shrink-0 transition-transform duration-200",
            isHovered && "scale-125"
          )}
          style={{
            background: showGradients
              ? `linear-gradient(135deg, ${palette[index % palette.length].start}, ${palette[index % palette.length].end})`
              : getSegmentColor(segment, index),
            boxShadow: isHovered
              ? `0 0 8px ${getSegmentColor(segment, index)}80`
              : undefined,
          }}
        />

        {/* Label and value */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium truncate",
                isDarkMode ? "text-gray-200" : "text-gray-800"
              )}
            >
              {segment.name}
            </span>
            {hasChildren && enableDrillDown && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  isDarkMode
                    ? "bg-gray-700 text-gray-400"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                +{segment.children!.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
              {formatValue(segment.value)}
            </span>
            <span
              className="font-medium"
              style={{ color: getSegmentColor(segment, index) }}
            >
              {formatPercent(percent)}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-6",
        isDarkMode
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-200",
        className
      )}
    >
      {/* Header */}
      {(title || subtitle || drillDownPath.length > 0) && (
        <div className="mb-4">
          {drillDownPath.length > 0 && (
            <button
              onClick={handleDrillUp}
              className={cn(
                "flex items-center gap-1 text-sm mb-2 transition-colors",
                isDarkMode
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to {drillDownPath.length > 1
                ? drillDownPath[drillDownPath.length - 2].name
                : "Overview"}
            </button>
          )}
          {title && (
            <h3
              className={cn(
                "text-lg font-semibold",
                isDarkMode ? "text-white" : "text-gray-900"
              )}
            >
              {drillDownPath.length > 0
                ? drillDownPath[drillDownPath.length - 1].name
                : title}
            </h3>
          )}
          {subtitle && drillDownPath.length === 0 && (
            <p
              className={cn(
                "text-sm mt-1",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Chart Container */}
      <div
        className={cn(
          "flex",
          legendPosition === "right" ? "flex-row gap-6" : "flex-col"
        )}
      >
        {/* Pie Chart */}
        <div
          className="relative"
          style={{
            height,
            minWidth: legendPosition === "right" ? "60%" : "100%",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {gradientDefs}
              {/* Reason: recharts v3 removed activeIndex from Pie type definitions */}
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                dataKey="value"
                {...({ activeIndex: activeIndex ?? undefined } as Record<string, unknown>)}
                activeShape={(props: unknown) =>
                  renderActiveShape({
                    ...(props as Omit<ActiveShapeProps, "formatValue" | "formatPercent" | "isDarkMode" | "isSelected">),
                    formatValue,
                    formatPercent,
                    isDarkMode,
                    isSelected: selectedIndex === (props as { index: number }).index,
                  })
                }
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(_, index) => handleClick(currentData[index], index)}
                animationBegin={0}
                animationDuration={animationDuration}
                animationEasing="ease-out"
                style={{ cursor: "pointer" }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={getCellFill(entry, index)}
                    stroke={isDarkMode ? "#1f2937" : "#ffffff"}
                    strokeWidth={2}
                    style={{
                      opacity: selectedIndex !== null && selectedIndex !== index ? 0.5 : 1,
                      transition: "opacity 0.3s ease",
                      transform:
                        selectedIndex === index
                          ? "scale(1.02)"
                          : "scale(1)",
                      transformOrigin: "center",
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center content for donut */}
          {donut && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: innerRadius * 1.6,
                height: innerRadius * 1.6,
              }}
            >
              {renderCenterContent
                ? renderCenterContent(total, activeSegment)
                : defaultCenterContent}
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div
            className={cn(
              legendPosition === "right"
                ? "flex-1 overflow-y-auto max-h-[400px]"
                : "mt-4"
            )}
          >
            <div
              className={cn(
                legendPosition === "right"
                  ? "flex flex-col gap-1"
                  : "grid gap-1",
                legendPosition === "bottom" &&
                  currentData.length > 4 &&
                  "sm:grid-cols-2"
              )}
            >
              {currentData.map((segment, index) =>
                renderLegendItem(segment, index)
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drill-down breadcrumb */}
      {drillDownPath.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
              Path:
            </span>
            <button
              onClick={() => setDrillDownPath([])}
              className={cn(
                "hover:underline",
                isDarkMode ? "text-blue-400" : "text-blue-600"
              )}
            >
              Overview
            </button>
            {drillDownPath.map((segment, index) => (
              <React.Fragment key={segment.id}>
                <span className={isDarkMode ? "text-gray-600" : "text-gray-300"}>
                  /
                </span>
                <button
                  onClick={() =>
                    setDrillDownPath(drillDownPath.slice(0, index + 1))
                  }
                  className={cn(
                    index === drillDownPath.length - 1
                      ? isDarkMode
                        ? "text-gray-200 font-medium"
                        : "text-gray-800 font-medium"
                      : isDarkMode
                      ? "text-blue-400 hover:underline"
                      : "text-blue-600 hover:underline"
                  )}
                >
                  {segment.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

InteractivePieChart.displayName = "InteractivePieChart";

// ============================================================================
// Preset Variants
// ============================================================================

export interface AssetAllocationChartProps {
  data: PieSegment[];
  height?: number;
  isDarkMode?: boolean;
  className?: string;
  onSegmentClick?: (segment: PieSegment, path: PieSegment[]) => void;
}

/**
 * Asset Allocation Chart - Pre-configured for portfolio visualization
 */
export const AssetAllocationChart = React.memo(function AssetAllocationChart({
  data,
  height = 350,
  isDarkMode = false,
  className,
  onSegmentClick,
}: AssetAllocationChartProps) {
  return (
    <InteractivePieChart
      data={data}
      title="Asset Allocation"
      subtitle="Click segments to explore allocation details"
      variant="asset-allocation"
      height={height}
      donut={true}
      innerRadiusRatio={0.55}
      showLegend={true}
      legendPosition="bottom"
      enableDrillDown={true}
      isDarkMode={isDarkMode}
      className={className}
      onSegmentClick={onSegmentClick}
      formatValue={(v) => {
        if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
        if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
        return `$${v.toFixed(0)}`;
      }}
    />
  );
});

AssetAllocationChart.displayName = "AssetAllocationChart";

export interface ExpenseBreakdownChartProps {
  data: PieSegment[];
  height?: number;
  isDarkMode?: boolean;
  className?: string;
  monthlyTotal?: boolean;
  onSegmentClick?: (segment: PieSegment, path: PieSegment[]) => void;
}

/**
 * Expense Breakdown Chart - Pre-configured for spending visualization
 */
export const ExpenseBreakdownChart = React.memo(function ExpenseBreakdownChart({
  data,
  height = 350,
  isDarkMode = false,
  className,
  monthlyTotal = true,
  onSegmentClick,
}: ExpenseBreakdownChartProps) {
  return (
    <InteractivePieChart
      data={data}
      title="Expense Breakdown"
      subtitle={monthlyTotal ? "Monthly spending by category" : "Annual spending by category"}
      variant="expense-breakdown"
      height={height}
      donut={true}
      innerRadiusRatio={0.5}
      showLegend={true}
      legendPosition="bottom"
      enableDrillDown={true}
      isDarkMode={isDarkMode}
      className={className}
      onSegmentClick={onSegmentClick}
      formatValue={(v) => {
        if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
        if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
        return `$${v.toFixed(0)}`;
      }}
    />
  );
});

ExpenseBreakdownChart.displayName = "ExpenseBreakdownChart";

export interface TaxBreakdownChartProps {
  data: PieSegment[];
  height?: number;
  isDarkMode?: boolean;
  className?: string;
  onSegmentClick?: (segment: PieSegment, path: PieSegment[]) => void;
}

/**
 * Tax Breakdown Chart - Pre-configured for tax visualization
 */
export const TaxBreakdownChart = React.memo(function TaxBreakdownChart({
  data,
  height = 350,
  isDarkMode = false,
  className,
  onSegmentClick,
}: TaxBreakdownChartProps) {
  return (
    <InteractivePieChart
      data={data}
      title="Tax Breakdown"
      subtitle="Total tax burden by type"
      variant="tax-breakdown"
      height={height}
      donut={true}
      innerRadiusRatio={0.55}
      showLegend={true}
      legendPosition="bottom"
      enableDrillDown={true}
      isDarkMode={isDarkMode}
      className={className}
      onSegmentClick={onSegmentClick}
      formatValue={(v) => {
        if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
        if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
        return `$${v.toFixed(0)}`;
      }}
    />
  );
});

TaxBreakdownChart.displayName = "TaxBreakdownChart";

export default InteractivePieChart;
