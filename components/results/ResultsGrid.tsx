"use client";

import React from "react";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { cn } from "@/lib/utils";

interface ResultsGridProps {
  children: React.ReactNode;
  loading?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  children,
  loading = false,
  columns = 4,
  className
}) => {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  };

  if (loading) {
    return (
      <div className={cn("grid gap-6", gridCols[columns], className)}>
        <SkeletonCard variant="stat" count={columns} />
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", gridCols[columns], className)}>
      {children}
    </div>
  );
};
