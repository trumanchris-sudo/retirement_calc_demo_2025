"use client";

import React from "react";
import { cn } from "@/lib/utils";

// Re-export enhanced skeletons from SmartSkeleton
export {
  ShimmerBase,
  ChartSkeleton,
  TableSkeleton,
  CardSkeleton,
  FormSkeleton,
  TimelineSkeleton,
  StatsGridSkeleton,
  PageSkeleton,
  // Types
  type ShimmerBaseProps,
  type ChartSkeletonProps,
  type TableSkeletonProps,
  type CardSkeletonProps,
  type FormSkeletonProps,
  type TimelineSkeletonProps,
  type StatsGridSkeletonProps,
  type PageSkeletonProps,
} from "./SmartSkeleton";

// ============================================================================
// LEGACY SKELETON COMPONENTS (kept for backward compatibility)
// ============================================================================

interface SkeletonCardProps {
  variant?: "stat" | "chart" | "text" | "table" | "form" | "metric" | "timeline";
  count?: number;
  className?: string;
  /** Use shimmer animation instead of pulse */
  shimmer?: boolean;
}

const SkeletonBase: React.FC<{ className?: string; shimmer?: boolean }> = ({
  className,
  shimmer = false,
}) => (
  <div
    className={cn(
      "rounded",
      shimmer
        ? "bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 bg-[length:200%_100%] animate-shimmer"
        : "animate-pulse bg-slate-200 dark:bg-slate-800",
      className
    )}
  />
);

const StatCardSkeleton: React.FC<{ shimmer?: boolean }> = ({ shimmer }) => (
  <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
    <div className="flex justify-between items-start">
      <SkeletonBase className="h-5 w-28 rounded-full" shimmer={shimmer} />
      <SkeletonBase className="h-8 w-8 rounded-lg" shimmer={shimmer} />
    </div>
    <div className="space-y-2">
      <SkeletonBase className="h-9 w-36" shimmer={shimmer} />
      <SkeletonBase className="h-4 w-24" shimmer={shimmer} />
    </div>
  </div>
);

const MetricSkeleton: React.FC<{ shimmer?: boolean }> = ({ shimmer }) => (
  <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
    <SkeletonBase className="h-10 w-10 rounded-full" shimmer={shimmer} />
    <div className="flex-1 space-y-2">
      <SkeletonBase className="h-4 w-20" shimmer={shimmer} />
      <SkeletonBase className="h-6 w-28" shimmer={shimmer} />
    </div>
  </div>
);

const LegacyChartSkeleton: React.FC<{ shimmer?: boolean }> = ({ shimmer }) => (
  <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBase className="h-6 w-40" shimmer={shimmer} />
        <SkeletonBase className="h-4 w-56" shimmer={shimmer} />
      </div>
      <SkeletonBase className="h-8 w-24 rounded-md" shimmer={shimmer} />
    </div>
    {/* Chart area with simulated grid lines */}
    <div className="relative h-64 w-full rounded-lg overflow-hidden">
      <SkeletonBase className="absolute inset-0" shimmer={shimmer} />
      {/* Simulated chart lines */}
      <div className="absolute inset-4 flex flex-col justify-between opacity-30">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-t border-slate-300 dark:border-slate-600" />
        ))}
      </div>
    </div>
    {/* Legend */}
    <div className="flex gap-6 justify-center pt-2">
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-3 w-3 rounded-full" shimmer={shimmer} />
        <SkeletonBase className="h-3 w-16" shimmer={shimmer} />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-3 w-3 rounded-full" shimmer={shimmer} />
        <SkeletonBase className="h-3 w-20" shimmer={shimmer} />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-3 w-3 rounded-full" shimmer={shimmer} />
        <SkeletonBase className="h-3 w-14" shimmer={shimmer} />
      </div>
    </div>
  </div>
);

const TextSkeleton: React.FC<{ shimmer?: boolean }> = ({ shimmer }) => (
  <div className="space-y-3">
    <SkeletonBase className="h-4 w-full" shimmer={shimmer} />
    <SkeletonBase className="h-4 w-11/12" shimmer={shimmer} />
    <SkeletonBase className="h-4 w-4/5" shimmer={shimmer} />
    <SkeletonBase className="h-4 w-9/12" shimmer={shimmer} />
  </div>
);

const LegacyTableSkeleton: React.FC<{ shimmer?: boolean }> = ({ shimmer }) => (
  <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
    {/* Table header */}
    <div className="flex gap-4 p-4 border-b bg-muted/50">
      <SkeletonBase className="h-4 w-1/4" shimmer={shimmer} />
      <SkeletonBase className="h-4 w-1/4" shimmer={shimmer} />
      <SkeletonBase className="h-4 w-1/4" shimmer={shimmer} />
      <SkeletonBase className="h-4 w-1/4" shimmer={shimmer} />
    </div>
    {/* Table rows */}
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
        <SkeletonBase className="h-4 w-1/4" shimmer={shimmer} />
        <SkeletonBase className="h-4 w-1/4" shimmer={shimmer} />
        <SkeletonBase className="h-4 w-1/4" shimmer={shimmer} />
        <SkeletonBase className="h-4 w-1/4" shimmer={shimmer} />
      </div>
    ))}
  </div>
);

const LegacyFormSkeleton: React.FC<{ shimmer?: boolean }> = ({ shimmer }) => (
  <div className="rounded-xl border bg-card p-6 space-y-6 shadow-sm">
    <SkeletonBase className="h-6 w-32" shimmer={shimmer} />
    {/* Form fields */}
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-2">
        <SkeletonBase className="h-4 w-24" shimmer={shimmer} />
        <SkeletonBase className="h-10 w-full rounded-md" shimmer={shimmer} />
      </div>
    ))}
    {/* Button */}
    <SkeletonBase className="h-10 w-32 rounded-md" shimmer={shimmer} />
  </div>
);

const LegacyTimelineSkeleton: React.FC<{ shimmer?: boolean }> = ({ shimmer }) => (
  <div className="space-y-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex gap-4">
        <div className="flex flex-col items-center">
          <SkeletonBase className="h-8 w-8 rounded-full" shimmer={shimmer} />
          {i < 3 && <SkeletonBase className="h-12 w-0.5 my-1" shimmer={shimmer} />}
        </div>
        <div className="flex-1 pb-4">
          <SkeletonBase className="h-5 w-32 mb-2" shimmer={shimmer} />
          <SkeletonBase className="h-4 w-full" shimmer={shimmer} />
          <SkeletonBase className="h-4 w-3/4 mt-1" shimmer={shimmer} />
        </div>
      </div>
    ))}
  </div>
);

const skeletonComponents: Record<
  NonNullable<SkeletonCardProps["variant"]>,
  React.FC<{ shimmer?: boolean }>
> = {
  stat: StatCardSkeleton,
  chart: LegacyChartSkeleton,
  text: TextSkeleton,
  table: LegacyTableSkeleton,
  form: LegacyFormSkeleton,
  metric: MetricSkeleton,
  timeline: LegacyTimelineSkeleton,
};

/**
 * SkeletonCard - Loading placeholder for various content types
 *
 * @deprecated Use the new SmartSkeleton components instead:
 * - ChartSkeleton for charts
 * - TableSkeleton for tables
 * - CardSkeleton for cards
 * - FormSkeleton for forms
 *
 * Provides visual feedback during async operations with multiple variants
 * to match the content being loaded.
 *
 * @example
 * // Show loading stats
 * <SkeletonCard variant="stat" count={4} />
 *
 * // Show loading chart with shimmer effect
 * <SkeletonCard variant="chart" shimmer />
 *
 * // Show loading table rows
 * <SkeletonCard variant="table" />
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  variant = "stat",
  count = 1,
  className,
  shimmer = false,
}) => {
  const SkeletonComponent = skeletonComponents[variant];

  return (
    <div className={cn("stagger-children", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} shimmer={shimmer} />
      ))}
    </div>
  );
};

/**
 * Inline skeleton for text content
 */
export const SkeletonText: React.FC<{
  width?: string;
  className?: string;
  shimmer?: boolean;
}> = ({ width = "w-24", className, shimmer }) => (
  <SkeletonBase
    className={cn("h-4 inline-block", width, className)}
    shimmer={shimmer}
  />
);

/**
 * Skeleton for circular avatars/icons
 */
export const SkeletonCircle: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
  shimmer?: boolean;
}> = ({ size = "md", className, shimmer }) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  return (
    <SkeletonBase
      className={cn("rounded-full", sizeClasses[size], className)}
      shimmer={shimmer}
    />
  );
};
