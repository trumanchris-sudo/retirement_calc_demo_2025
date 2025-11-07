"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  variant?: "stat" | "chart" | "text";
  count?: number;
  className?: string;
}

const SkeletonBase: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "animate-pulse bg-slate-200 dark:bg-slate-800 rounded",
      className
    )}
  />
);

const StatCardSkeleton: React.FC = () => (
  <div className="rounded-xl border bg-card p-6 space-y-4">
    <div className="flex justify-between items-start">
      <SkeletonBase className="h-4 w-24" />
      <SkeletonBase className="h-5 w-5 rounded-full" />
    </div>
    <SkeletonBase className="h-10 w-32" />
    <SkeletonBase className="h-3 w-20" />
  </div>
);

const ChartSkeleton: React.FC = () => (
  <div className="rounded-xl border bg-card p-6 space-y-4">
    <SkeletonBase className="h-6 w-40" />
    <SkeletonBase className="h-64 w-full" />
    <div className="flex gap-4 justify-center">
      <SkeletonBase className="h-3 w-20" />
      <SkeletonBase className="h-3 w-20" />
      <SkeletonBase className="h-3 w-20" />
    </div>
  </div>
);

const TextSkeleton: React.FC = () => (
  <div className="space-y-2">
    <SkeletonBase className="h-4 w-full" />
    <SkeletonBase className="h-4 w-5/6" />
    <SkeletonBase className="h-4 w-4/6" />
  </div>
);

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  variant = "stat",
  count = 1,
  className
}) => {
  const SkeletonComponent = {
    stat: StatCardSkeleton,
    chart: ChartSkeleton,
    text: TextSkeleton
  }[variant];

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
};
