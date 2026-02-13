"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// SMART SKELETON SYSTEM
// Premium loading states that feel intentional and branded
// ============================================================================

// ============================================================================
// BASE SKELETON WITH PREMIUM SHIMMER
// ============================================================================

interface ShimmerBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation variant */
  variant?: "default" | "brand" | "subtle" | "gold";
  /** Animation speed */
  speed?: "slow" | "default" | "fast";
  /** Border radius preset */
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  /** Disable animation (for reduced motion) */
  static?: boolean;
}

/**
 * ShimmerBase - The foundation skeleton element with premium shimmer animation
 *
 * Features a multi-layer shimmer effect that creates depth and premium feel:
 * - Base gradient layer
 * - Animated highlight sweep
 * - Subtle edge glow
 */
export const ShimmerBase = React.forwardRef<HTMLDivElement, ShimmerBaseProps>(
  (
    {
      className,
      variant = "default",
      speed = "default",
      rounded = "md",
      static: isStatic = false,
      style,
      ...props
    },
    ref
  ) => {
    const roundedClasses = {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      full: "rounded-full",
    };

    const speedDurations = {
      slow: "3s",
      default: "2s",
      fast: "1.2s",
    };

    const variantStyles = {
      default: {
        background: "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted)) 100%)",
        "--shimmer-color": "rgba(255, 255, 255, 0.08)",
        "--shimmer-peak": "rgba(255, 255, 255, 0.15)",
      },
      brand: {
        background: "linear-gradient(135deg, hsl(258 30% 20%) 0%, hsl(258 40% 15%) 100%)",
        "--shimmer-color": "rgba(107, 76, 214, 0.15)",
        "--shimmer-peak": "rgba(139, 116, 222, 0.3)",
      },
      subtle: {
        background: "hsl(var(--muted) / 0.5)",
        "--shimmer-color": "rgba(255, 255, 255, 0.03)",
        "--shimmer-peak": "rgba(255, 255, 255, 0.08)",
      },
      gold: {
        background: "linear-gradient(135deg, hsl(43 50% 15%) 0%, hsl(43 60% 12%) 100%)",
        "--shimmer-color": "rgba(218, 165, 32, 0.15)",
        "--shimmer-peak": "rgba(218, 165, 32, 0.3)",
      },
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          roundedClasses[rounded],
          className
        )}
        style={{
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
      >
        {/* Shimmer overlay */}
        {!isStatic && (
          <div
            className="absolute inset-0 -translate-x-full"
            style={{
              background: `linear-gradient(
                90deg,
                transparent 0%,
                var(--shimmer-color) 20%,
                var(--shimmer-peak) 50%,
                var(--shimmer-color) 80%,
                transparent 100%
              )`,
              animation: `smartShimmer ${speedDurations[speed]} cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            }}
          />
        )}
        <style jsx>{`
          @keyframes smartShimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(200%);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            div {
              animation: none !important;
            }
          }
        `}</style>
      </div>
    );
  }
);
ShimmerBase.displayName = "ShimmerBase";

// ============================================================================
// CHART SKELETON - For Recharts loading states
// ============================================================================

interface ChartSkeletonProps {
  /** Chart type affects the visual representation */
  type?: "line" | "bar" | "area" | "histogram" | "pie";
  /** Height of the chart area */
  height?: number | string;
  /** Show axis labels */
  showAxes?: boolean;
  /** Show legend placeholder */
  showLegend?: boolean;
  /** Number of legend items */
  legendItems?: number;
  /** Title text (optional) */
  title?: string;
  className?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  type = "line",
  height = 280,
  showAxes = true,
  showLegend = true,
  legendItems = 3,
  title,
  className,
}) => {
  // Generate deterministic bar heights for histogram/bar chart
  // Using fixed pattern to avoid hydration mismatch while still looking organic
  const barHeights = React.useMemo(() => {
    const count = type === "histogram" ? 12 : 8;
    // Deterministic heights based on index to avoid server/client mismatch
    const baseHeights = [45, 72, 38, 65, 55, 78, 42, 58, 68, 35, 62, 48];
    return Array.from({ length: count }, (_, i) => baseHeights[i % baseHeights.length]);
  }, [type]);

  // Generate deterministic wavy path for line/area charts
  const wavyPath = React.useMemo(() => {
    const points = 8;
    // Deterministic variation values to avoid hydration mismatch
    const variations = [7, 12, 3, 9, 5, 11, 8, 4];
    const pathPoints = Array.from({ length: points }, (_, i) => ({
      x: (i / (points - 1)) * 100,
      y: 30 + Math.sin(i * 0.8) * 25 + variations[i],
    }));
    return pathPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }, []);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card overflow-hidden",
        "shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="p-6 pb-4 space-y-2">
        {title ? (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground/40">{title}</h3>
            <ShimmerBase className="h-8 w-24" rounded="lg" variant="subtle" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <ShimmerBase className="h-6 w-40" rounded="md" />
            <ShimmerBase className="h-8 w-24" rounded="lg" variant="subtle" />
          </div>
        )}
        <ShimmerBase className="h-4 w-64" rounded="sm" variant="subtle" />
      </div>

      {/* Chart Area */}
      <div
        className="relative px-6 pb-4"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        {/* Y-Axis */}
        {showAxes && (
          <div className="absolute left-6 top-0 bottom-8 w-12 flex flex-col justify-between items-end pr-2">
            {[...Array(5)].map((_, i) => (
              <ShimmerBase
                key={i}
                className="h-3 w-8"
                rounded="sm"
                variant="subtle"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}

        {/* Chart Content */}
        <div
          className={cn(
            "absolute right-6 top-0 bottom-8 overflow-hidden",
            showAxes ? "left-20" : "left-6"
          )}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="border-t border-muted/30"
                style={{ opacity: 0.3 + i * 0.1 }}
              />
            ))}
          </div>

          {/* Chart visualization based on type */}
          {(type === "line" || type === "area") && (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {type === "area" && (
                <path
                  d={`${wavyPath} L 100 100 L 0 100 Z`}
                  className="fill-primary/10"
                />
              )}
              <path
                d={wavyPath}
                fill="none"
                className="stroke-primary/30"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Data points */}
              {Array.from({ length: 8 }).map((_, i) => (
                <circle
                  key={i}
                  cx={(i / 7) * 100}
                  cy={30 + Math.sin(i * 0.8) * 25 + 10}
                  r="3"
                  className="fill-primary/40"
                />
              ))}
            </svg>
          )}

          {(type === "bar" || type === "histogram") && (
            <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
              {barHeights.map((h, i) => (
                <ShimmerBase
                  key={i}
                  className="flex-1"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 50}ms`,
                  }}
                  rounded="sm"
                  variant={type === "histogram" ? "brand" : "default"}
                />
              ))}
            </div>
          )}

          {type === "pie" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-40 h-40">
                <ShimmerBase
                  className="absolute inset-0"
                  rounded="full"
                  variant="brand"
                />
                <div className="absolute inset-8 rounded-full bg-card" />
              </div>
            </div>
          )}
        </div>

        {/* X-Axis */}
        {showAxes && (
          <div className="absolute bottom-0 left-20 right-6 h-8 flex justify-between items-start pt-2">
            {[...Array(6)].map((_, i) => (
              <ShimmerBase
                key={i}
                className="h-3 w-10"
                rounded="sm"
                variant="subtle"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="px-6 pb-6 flex items-center justify-center gap-6">
          {[...Array(legendItems)].map((_, i) => {
            // Deterministic widths to avoid hydration mismatch
            const legendWidths = [52, 64, 48, 58, 55];
            return (
              <div key={i} className="flex items-center gap-2">
                <ShimmerBase
                  className="h-3 w-3"
                  rounded="full"
                  variant="brand"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
                <ShimmerBase
                  className="h-3"
                  style={{ width: legendWidths[i % legendWidths.length] }}
                  rounded="sm"
                  variant="subtle"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TABLE SKELETON - For data tables
// ============================================================================

interface TableSkeletonProps {
  /** Number of rows to display */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Column width distribution (flexible | equal | weighted) */
  columnLayout?: "flexible" | "equal" | number[];
  /** Show header row */
  showHeader?: boolean;
  /** Show row numbers */
  showRowNumbers?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Show action column */
  showActions?: boolean;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  columnLayout = "flexible",
  showHeader = true,
  showRowNumbers = false,
  compact = false,
  showActions = false,
  className,
}) => {
  const actualColumns = showRowNumbers ? columns + 1 : columns;
  const finalColumns = showActions ? actualColumns + 1 : actualColumns;

  // Generate column widths
  const getColumnWidth = (index: number): string => {
    if (showRowNumbers && index === 0) return "48px";
    if (showActions && index === finalColumns - 1) return "80px";

    if (Array.isArray(columnLayout)) {
      const adjustedIndex = showRowNumbers ? index - 1 : index;
      return `${columnLayout[adjustedIndex] || 1}fr`;
    }

    return columnLayout === "equal" ? "1fr" : "auto";
  };

  const cellPadding = compact ? "py-2 px-3" : "py-4 px-4";
  const headerPadding = compact ? "py-3 px-3" : "py-4 px-4";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm",
        className
      )}
    >
      {/* Header */}
      {showHeader && (
        <div
          className={cn(
            "grid bg-muted/30 border-b border-border/50",
            headerPadding
          )}
          style={{
            gridTemplateColumns: Array.from({ length: finalColumns })
              .map((_, i) => getColumnWidth(i))
              .join(" "),
            gap: "1rem",
          }}
        >
          {Array.from({ length: finalColumns }).map((_, i) => (
            <ShimmerBase
              key={i}
              className={cn(
                "h-4",
                showRowNumbers && i === 0 ? "w-6" : "w-full max-w-24"
              )}
              rounded="sm"
              variant="subtle"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      )}

      {/* Body */}
      <div className="divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className={cn(
              "grid items-center transition-colors",
              cellPadding,
              rowIndex % 2 === 0 ? "bg-transparent" : "bg-muted/10"
            )}
            style={{
              gridTemplateColumns: Array.from({ length: finalColumns })
                .map((_, i) => getColumnWidth(i))
                .join(" "),
              gap: "1rem",
              animationDelay: `${rowIndex * 80}ms`,
            }}
          >
            {Array.from({ length: finalColumns }).map((_, colIndex) => {
              // Row number column
              if (showRowNumbers && colIndex === 0) {
                return (
                  <ShimmerBase
                    key={colIndex}
                    className="h-4 w-6"
                    rounded="sm"
                    variant="subtle"
                  />
                );
              }

              // Actions column
              if (showActions && colIndex === finalColumns - 1) {
                return (
                  <div key={colIndex} className="flex gap-2">
                    <ShimmerBase className="h-8 w-8" rounded="lg" variant="subtle" />
                    <ShimmerBase className="h-8 w-8" rounded="lg" variant="subtle" />
                  </div>
                );
              }

              // Regular data columns with varied widths
              const widthPercent = 50 + Math.random() * 50;
              return (
                <ShimmerBase
                  key={colIndex}
                  className="h-4"
                  style={{
                    width: `${widthPercent}%`,
                    maxWidth: "120px",
                    animationDelay: `${(rowIndex * finalColumns + colIndex) * 30}ms`,
                  }}
                  rounded="sm"
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer (pagination hint) */}
      <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
        <ShimmerBase className="h-4 w-32" rounded="sm" variant="subtle" />
        <div className="flex gap-2">
          <ShimmerBase className="h-8 w-8" rounded="lg" variant="subtle" />
          <ShimmerBase className="h-8 w-8" rounded="lg" variant="subtle" />
          <ShimmerBase className="h-8 w-8" rounded="lg" variant="subtle" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CARD SKELETON - For result/stat cards
// ============================================================================

interface CardSkeletonProps {
  /** Card variant */
  variant?: "stat" | "metric" | "result" | "premium" | "compact";
  /** Show icon placeholder */
  showIcon?: boolean;
  /** Show trend indicator */
  showTrend?: boolean;
  /** Show secondary value */
  showSecondary?: boolean;
  /** Use brand styling */
  branded?: boolean;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  variant = "stat",
  showIcon = true,
  showTrend = false,
  showSecondary = false,
  branded = false,
  className,
}) => {
  const baseVariant = branded ? "brand" : "default";

  // Premium variant - matches LegacyResultCard style
  if (variant === "premium") {
    return (
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden p-8",
          "min-h-[400px]",
          className
        )}
      >
        {/* Background gradient */}
        <ShimmerBase
          className="absolute inset-0"
          rounded="none"
          variant="brand"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-6">
          {/* Icon area */}
          <div className="relative">
            <ShimmerBase
              className="h-24 w-24"
              rounded="xl"
              variant="brand"
            />
            <div className="absolute inset-4">
              <ShimmerBase
                className="h-full w-full"
                rounded="lg"
                variant="subtle"
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <ShimmerBase className="h-8 w-48 mx-auto" rounded="md" variant="subtle" />
            <ShimmerBase className="h-4 w-32 mx-auto" rounded="sm" variant="subtle" />
          </div>

          {/* Hero metric */}
          <ShimmerBase className="h-16 w-32" rounded="lg" variant="subtle" />
          <ShimmerBase className="h-4 w-24" rounded="sm" variant="subtle" />

          {/* Secondary metric */}
          <div className="text-center space-y-2 pt-4">
            <ShimmerBase className="h-12 w-40 mx-auto" rounded="md" variant="subtle" />
            <ShimmerBase className="h-3 w-28 mx-auto" rounded="sm" variant="subtle" />
          </div>
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card",
          className
        )}
      >
        {showIcon && (
          <ShimmerBase className="h-8 w-8 flex-shrink-0" rounded="lg" variant={baseVariant} />
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <ShimmerBase className="h-3 w-20" rounded="sm" variant="subtle" />
          <ShimmerBase className="h-5 w-16" rounded="sm" />
        </div>
        {showTrend && (
          <ShimmerBase className="h-5 w-12 flex-shrink-0" rounded="full" variant="subtle" />
        )}
      </div>
    );
  }

  // Metric variant - horizontal layout
  if (variant === "metric") {
    return (
      <div
        className={cn(
          "flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm",
          className
        )}
      >
        {showIcon && (
          <ShimmerBase className="h-12 w-12 flex-shrink-0" rounded="xl" variant={baseVariant} />
        )}
        <div className="flex-1 space-y-2">
          <ShimmerBase className="h-4 w-24" rounded="sm" variant="subtle" />
          <ShimmerBase className="h-7 w-32" rounded="sm" />
        </div>
        {showTrend && (
          <div className="flex items-center gap-2">
            <ShimmerBase className="h-4 w-4" rounded="full" variant="subtle" />
            <ShimmerBase className="h-5 w-14" rounded="sm" variant="subtle" />
          </div>
        )}
      </div>
    );
  }

  // Result variant - for calculation results
  if (variant === "result") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/50 bg-card p-6 space-y-4 shadow-sm",
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <ShimmerBase className="h-4 w-28" rounded="sm" variant="subtle" />
            <ShimmerBase className="h-3 w-40" rounded="sm" variant="subtle" />
          </div>
          {showIcon && (
            <ShimmerBase className="h-10 w-10" rounded="xl" variant={baseVariant} />
          )}
        </div>

        {/* Main value */}
        <div className="space-y-2">
          <ShimmerBase className="h-10 w-40" rounded="md" />
          {showSecondary && (
            <ShimmerBase className="h-4 w-24" rounded="sm" variant="subtle" />
          )}
        </div>

        {/* Progress or additional info */}
        <div className="pt-2 space-y-2">
          <div className="flex justify-between">
            <ShimmerBase className="h-3 w-16" rounded="sm" variant="subtle" />
            <ShimmerBase className="h-3 w-12" rounded="sm" variant="subtle" />
          </div>
          <ShimmerBase className="h-2 w-full" rounded="full" variant="subtle" />
        </div>
      </div>
    );
  }

  // Default stat variant
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card p-6 space-y-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <ShimmerBase className="h-5 w-28" rounded="full" variant="subtle" />
        {showIcon && (
          <ShimmerBase className="h-9 w-9" rounded="lg" variant={baseVariant} />
        )}
      </div>
      <div className="space-y-2">
        <ShimmerBase className="h-9 w-36" rounded="md" />
        {showTrend && (
          <div className="flex items-center gap-2">
            <ShimmerBase className="h-4 w-4" rounded="full" variant="subtle" />
            <ShimmerBase className="h-4 w-20" rounded="sm" variant="subtle" />
          </div>
        )}
        {showSecondary && (
          <ShimmerBase className="h-4 w-24" rounded="sm" variant="subtle" />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// FORM SKELETON - For input forms
// ============================================================================

interface FormSkeletonProps {
  /** Number of field groups */
  fields?: number;
  /** Layout style */
  layout?: "vertical" | "horizontal" | "grid";
  /** Grid columns (for grid layout) */
  gridColumns?: 2 | 3;
  /** Show section headers */
  showSections?: boolean;
  /** Number of sections */
  sections?: number;
  /** Show submit button */
  showButton?: boolean;
  /** Button width */
  buttonWidth?: "full" | "auto";
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  layout = "vertical",
  gridColumns = 2,
  showSections = false,
  sections = 1,
  showButton = true,
  buttonWidth = "auto",
  className,
}) => {
  const fieldsPerSection = Math.ceil(fields / sections);

  const FieldGroup = ({ delay = 0 }: { delay?: number }) => (
    <div
      className={cn(
        "space-y-2",
        layout === "horizontal" && "flex items-center gap-4"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <ShimmerBase
        className={cn(
          "h-4",
          layout === "horizontal" ? "w-24 flex-shrink-0" : "w-28"
        )}
        rounded="sm"
        variant="subtle"
      />
      <ShimmerBase
        className={cn(
          "h-10",
          layout === "horizontal" ? "flex-1" : "w-full"
        )}
        rounded="lg"
      />
    </div>
  );

  const Section = ({ index }: { index: number }) => (
    <div className="space-y-5">
      {showSections && (
        <div className="space-y-2 pb-2">
          <ShimmerBase
            className="h-6 w-40"
            rounded="md"
            style={{ animationDelay: `${index * 200}ms` }}
          />
          <ShimmerBase
            className="h-4 w-64"
            rounded="sm"
            variant="subtle"
            style={{ animationDelay: `${index * 200 + 50}ms` }}
          />
        </div>
      )}

      <div
        className={cn(
          layout === "grid" &&
            `grid gap-4 ${
              gridColumns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"
            }`,
          layout !== "grid" && "space-y-4"
        )}
      >
        {Array.from({ length: fieldsPerSection }).map((_, fieldIndex) => (
          <FieldGroup
            key={fieldIndex}
            delay={index * 200 + fieldIndex * 50 + 100}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card p-6 space-y-6 shadow-sm",
        className
      )}
    >
      {/* Form title */}
      <div className="space-y-1">
        <ShimmerBase className="h-6 w-44" rounded="md" />
        <ShimmerBase className="h-4 w-72" rounded="sm" variant="subtle" />
      </div>

      {/* Sections */}
      <div className={cn("space-y-8", showSections && "divide-y divide-border/30")}>
        {Array.from({ length: sections }).map((_, i) => (
          <div key={i} className={i > 0 && showSections ? "pt-6" : ""}>
            <Section index={i} />
          </div>
        ))}
      </div>

      {/* Button */}
      {showButton && (
        <div className={cn("pt-4", buttonWidth === "full" ? "" : "flex justify-end")}>
          <ShimmerBase
            className={cn(
              "h-11",
              buttonWidth === "full" ? "w-full" : "w-32"
            )}
            rounded="lg"
            variant="brand"
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ADDITIONAL SPECIALIZED SKELETONS
// ============================================================================

/**
 * Timeline Skeleton - For timeline/step displays
 */
interface TimelineSkeletonProps {
  steps?: number;
  showConnectors?: boolean;
  className?: string;
}

export const TimelineSkeleton: React.FC<TimelineSkeletonProps> = ({
  steps = 4,
  showConnectors = true,
  className,
}) => (
  <div className={cn("space-y-1", className)}>
    {Array.from({ length: steps }).map((_, i) => (
      <div key={i} className="flex gap-4">
        <div className="flex flex-col items-center">
          <ShimmerBase
            className="h-10 w-10 flex-shrink-0"
            rounded="full"
            variant="brand"
            style={{ animationDelay: `${i * 100}ms` }}
          />
          {showConnectors && i < steps - 1 && (
            <ShimmerBase
              className="w-0.5 h-16 my-1"
              rounded="full"
              variant="subtle"
            />
          )}
        </div>
        <div className="flex-1 pt-1 pb-4 space-y-2">
          <ShimmerBase
            className="h-5 w-36"
            rounded="sm"
            style={{ animationDelay: `${i * 100 + 50}ms` }}
          />
          <ShimmerBase
            className="h-4 w-full max-w-md"
            rounded="sm"
            variant="subtle"
          />
          <ShimmerBase
            className="h-4 w-3/4 max-w-sm"
            rounded="sm"
            variant="subtle"
          />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Stats Grid Skeleton - For dashboard stat cards
 */
interface StatsGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  variant?: CardSkeletonProps["variant"];
  className?: string;
}

export const StatsGridSkeleton: React.FC<StatsGridSkeletonProps> = ({
  count = 4,
  columns = 4,
  variant = "stat",
  className,
}) => {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton
          key={i}
          variant={variant}
          showIcon
          showTrend={i % 2 === 0}
        />
      ))}
    </div>
  );
};

/**
 * Page Skeleton - Full page loading state
 */
interface PageSkeletonProps {
  showHeader?: boolean;
  showSidebar?: boolean;
  sections?: Array<"chart" | "table" | "cards" | "form">;
  className?: string;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  showHeader = true,
  showSidebar = false,
  sections = ["cards", "chart", "table"],
  className,
}) => (
  <div className={cn("min-h-screen", className)}>
    {/* Header */}
    {showHeader && (
      <div className="border-b border-border/50 bg-card/50 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShimmerBase className="h-8 w-8" rounded="lg" variant="brand" />
            <ShimmerBase className="h-6 w-40" rounded="md" />
          </div>
          <div className="flex items-center gap-3">
            <ShimmerBase className="h-9 w-24" rounded="lg" variant="subtle" />
            <ShimmerBase className="h-9 w-9" rounded="full" variant="subtle" />
          </div>
        </div>
      </div>
    )}

    <div className="flex">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-border/50 p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ShimmerBase
              key={i}
              className="h-10 w-full"
              rounded="lg"
              variant="subtle"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto">
        {/* Page title */}
        <div className="space-y-2">
          <ShimmerBase className="h-8 w-64" rounded="md" />
          <ShimmerBase className="h-4 w-96" rounded="sm" variant="subtle" />
        </div>

        {/* Sections */}
        {sections.map((section, i) => (
          <div key={i}>
            {section === "cards" && <StatsGridSkeleton />}
            {section === "chart" && <ChartSkeleton />}
            {section === "table" && <TableSkeleton />}
            {section === "form" && <FormSkeleton />}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
  type ShimmerBaseProps,
  type ChartSkeletonProps,
  type TableSkeletonProps,
  type CardSkeletonProps,
  type FormSkeletonProps,
  type TimelineSkeletonProps,
  type StatsGridSkeletonProps,
  type PageSkeletonProps,
};
