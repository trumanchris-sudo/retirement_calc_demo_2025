"use client";

import React, { useEffect, useState } from "react";
import { Progress } from "./progress";
import { cn } from "@/lib/utils";
import { TRANSITIONS, STATUS } from "@/lib/designTokens";

interface CalculationProgressProps {
  /** Current phase of calculation */
  phase?: "validating" | "monteCarlo" | "legacy" | "ai" | "complete";
  /** Progress percentage (0-100) */
  percent?: number;
  /** Custom message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show in compact mode */
  compact?: boolean;
  /** Estimated time remaining in seconds */
  estimatedTime?: number;
}

interface PhaseInfo {
  message: string;
  description: string;
  icon: "spinner" | "brain" | "chart" | "check" | "users";
}

const phaseInfo: Record<string, PhaseInfo> = {
  validating: {
    message: "Validating inputs...",
    description: "Checking your retirement parameters",
    icon: "spinner",
  },
  monteCarlo: {
    message: "Running Monte Carlo simulation...",
    description: "Simulating 1,000 market scenarios to estimate success probability",
    icon: "chart",
  },
  legacy: {
    message: "Calculating generational wealth...",
    description: "Projecting multi-generational inheritance scenarios",
    icon: "users",
  },
  ai: {
    message: "Generating insights...",
    description: "AI is analyzing your retirement plan",
    icon: "brain",
  },
  complete: {
    message: "Calculation complete!",
    description: "Your results are ready",
    icon: "check",
  },
};

// Animated icons for different phases
const PhaseIcon: React.FC<{ icon: PhaseInfo["icon"]; isComplete: boolean }> = ({
  icon,
  isComplete,
}) => {
  if (isComplete || icon === "check") {
    return (
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-in zoom-in-50 duration-300">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>
    );
  }

  const iconClasses = "w-5 h-5 text-blue-600 dark:text-blue-400";

  switch (icon) {
    case "brain":
      return (
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <svg className={cn(iconClasses, "animate-pulse text-purple-600 dark:text-purple-400")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      );
    case "chart":
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <svg className={cn(iconClasses, "animate-pulse")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      );
    case "users":
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <svg className={cn(iconClasses, "animate-pulse text-emerald-600 dark:text-emerald-400")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-r-transparent rounded-full animate-spin" />
        </div>
      );
  }
};

// Animated progress dots
const ProgressDots: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;

  return (
    <span className="inline-flex ml-1">
      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
    </span>
  );
};

/**
 * CalculationProgress - Shows progress during retirement calculations
 *
 * Provides clear feedback during long-running Monte Carlo simulations
 * so users know the app hasn't frozen.
 *
 * Features:
 * - Phase-specific icons and descriptions
 * - Animated progress bar with percentage
 * - Estimated time remaining
 * - Compact mode for inline use
 */
export const CalculationProgress: React.FC<CalculationProgressProps> = ({
  phase = "monteCarlo",
  percent = 0,
  message,
  className,
  compact = false,
  estimatedTime,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const info = phaseInfo[phase] || phaseInfo.validating;
  const displayMessage = message || info.message;
  const isComplete = phase === "complete";
  const isProcessing = !isComplete && percent < 100;

  // Track elapsed time for better UX feedback
  useEffect(() => {
    if (!isComplete && percent < 100) {
      const timer = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setElapsedTime(0);
    }
  }, [isComplete, percent]);

  // Format time display
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
          isComplete
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
          TRANSITIONS.default,
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy={!isComplete}
      >
        {isProcessing && (
          <div className="w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin" />
        )}
        {isComplete && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        <span className="font-medium">
          {displayMessage.replace("...", "")}
          <ProgressDots active={isProcessing} />
        </span>
        {isProcessing && percent > 0 && (
          <span className="text-xs opacity-75">{percent}%</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-5 rounded-xl border shadow-sm animate-in fade-in-50 slide-in-from-top-2 duration-300",
        isComplete
          ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
          : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy={!isComplete}
    >
      <div className="flex items-start gap-4">
        <PhaseIcon icon={info.icon} isComplete={isComplete} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={cn(
              "text-sm font-semibold",
              isComplete
                ? "text-green-900 dark:text-green-100"
                : "text-blue-900 dark:text-blue-100"
            )}>
              {displayMessage.replace("...", "")}
              <ProgressDots active={isProcessing} />
            </h4>
            {isProcessing && elapsedTime > 2 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatTime(elapsedTime)}
              </span>
            )}
          </div>

          <p className={cn(
            "text-xs mb-3",
            isComplete
              ? "text-green-700 dark:text-green-300"
              : "text-blue-700 dark:text-blue-300"
          )}>
            {info.description}
          </p>

          {isProcessing && (
            <div className="space-y-2">
              <div className="relative h-2 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
                {percent > 0 ? (
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${percent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-progress-indeterminate" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-600 dark:text-blue-400">
                  {phase === "monteCarlo" && "Simulating market conditions"}
                  {phase === "legacy" && "Projecting inheritance"}
                  {phase === "ai" && "Analyzing your plan"}
                  {phase === "validating" && "Checking parameters"}
                </span>
                {percent > 0 && (
                  <span className="font-medium text-blue-700 dark:text-blue-300 tabular-nums">
                    {percent}%
                  </span>
                )}
              </div>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <span>Results ready</span>
              {elapsedTime > 0 && (
                <>
                  <span className="text-green-400 dark:text-green-600">|</span>
                  <span>Completed in {formatTime(elapsedTime)}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
