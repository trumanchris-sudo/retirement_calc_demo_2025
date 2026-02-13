"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
  /** Custom label for screen readers, defaults to "Loading..." */
  label?: string;
  /** Optional visible text to display next to spinner */
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color,
  className,
  label = "Loading...",
  text,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4"
  };

  const spinner = (
    <div
      className={cn(
        "inline-block rounded-full border-solid border-current border-r-transparent align-[-0.125em] animate-spin",
        sizeClasses[size],
        color || "text-blue-600 dark:text-blue-400",
        className
      )}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  );

  if (text) {
    return (
      <div className="flex items-center gap-2">
        {spinner}
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    );
  }

  return spinner;
};
