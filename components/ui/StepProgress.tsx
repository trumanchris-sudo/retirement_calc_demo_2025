"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TRANSITIONS } from "@/lib/designTokens";

interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  /** Layout direction */
  orientation?: "horizontal" | "vertical";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Allow clicking completed steps to navigate */
  onStepClick?: (stepIndex: number) => void;
  /** Show step numbers */
  showNumbers?: boolean;
}

/**
 * StepProgress - Visual progress indicator for multi-step flows
 *
 * Shows the user where they are in a multi-step process with clear
 * visual feedback for completed, current, and upcoming steps.
 *
 * @example
 * const steps = [
 *   { id: 'basics', label: 'Basic Info' },
 *   { id: 'income', label: 'Income & Savings' },
 *   { id: 'goals', label: 'Retirement Goals' },
 *   { id: 'review', label: 'Review' },
 * ];
 *
 * <StepProgress steps={steps} currentStep={1} />
 */
export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep,
  className,
  orientation = "horizontal",
  size = "md",
  onStepClick,
  showNumbers = true,
}) => {
  const sizeClasses = {
    sm: {
      circle: "w-6 h-6 text-xs",
      label: "text-xs",
      description: "text-[10px]",
      connector: orientation === "horizontal" ? "h-0.5" : "w-0.5",
    },
    md: {
      circle: "w-8 h-8 text-sm",
      label: "text-sm",
      description: "text-xs",
      connector: orientation === "horizontal" ? "h-0.5" : "w-0.5",
    },
    lg: {
      circle: "w-10 h-10 text-base",
      label: "text-base",
      description: "text-sm",
      connector: orientation === "horizontal" ? "h-1" : "w-1",
    },
  };

  const sizes = sizeClasses[size];

  const isHorizontal = orientation === "horizontal";

  return (
    <nav
      className={cn(
        "flex",
        isHorizontal ? "flex-row items-start" : "flex-col",
        className
      )}
      aria-label="Progress"
    >
      <ol
        className={cn(
          "flex",
          isHorizontal ? "flex-row items-start w-full" : "flex-col space-y-4"
        )}
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          const isClickable = onStepClick && isCompleted;

          return (
            <li
              key={step.id}
              className={cn(
                "relative",
                isHorizontal && "flex-1",
                isHorizontal && index !== steps.length - 1 && "pr-4 sm:pr-8"
              )}
            >
              <div
                className={cn(
                  "flex",
                  isHorizontal ? "flex-col items-center" : "flex-row items-start gap-3"
                )}
              >
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex items-center justify-center rounded-full font-medium transition-all duration-200",
                    sizes.circle,
                    isCompleted && [
                      "bg-green-500 text-white",
                      isClickable && "hover:bg-green-600 cursor-pointer hover:scale-110",
                    ],
                    isCurrent && "bg-blue-500 text-white ring-4 ring-blue-500/20 scale-110",
                    isUpcoming && "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
                    !isClickable && !isCurrent && "cursor-default"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : step.icon ? (
                    step.icon
                  ) : showNumbers ? (
                    index + 1
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-current" />
                  )}
                </button>

                {/* Step label and description */}
                <div
                  className={cn(
                    isHorizontal ? "mt-2 text-center" : "flex-1"
                  )}
                >
                  <span
                    className={cn(
                      "block font-medium transition-colors duration-200",
                      sizes.label,
                      isCompleted && "text-green-600 dark:text-green-400",
                      isCurrent && "text-blue-600 dark:text-blue-400",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span
                      className={cn(
                        "block text-muted-foreground mt-0.5",
                        sizes.description,
                        isHorizontal && "hidden sm:block"
                      )}
                    >
                      {step.description}
                    </span>
                  )}
                </div>

                {/* Connector line */}
                {index !== steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute transition-colors duration-200",
                      isHorizontal
                        ? "top-4 left-1/2 w-full -translate-y-1/2"
                        : "left-4 top-8 h-full -translate-x-1/2",
                      sizes.connector,
                      isCompleted
                        ? "bg-green-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    )}
                    style={
                      isHorizontal
                        ? { marginLeft: size === "sm" ? 12 : size === "md" ? 16 : 20 }
                        : { marginTop: 8 }
                    }
                    aria-hidden="true"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * CompactStepProgress - Minimal progress bar for tight spaces
 */
export const CompactStepProgress: React.FC<{
  steps: number;
  currentStep: number;
  className?: string;
  showLabel?: boolean;
}> = ({ steps, currentStep, className, showLabel = true }) => {
  const percentage = ((currentStep + 1) / steps) * 100;

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Step {currentStep + 1} of {steps}
          </span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * DotProgress - Simple dot-based progress indicator
 */
export const DotProgress: React.FC<{
  steps: number;
  currentStep: number;
  className?: string;
  onDotClick?: (index: number) => void;
}> = ({ steps, currentStep, className, onDotClick }) => {
  return (
    <div
      className={cn("flex items-center justify-center gap-2", className)}
      role="tablist"
      aria-label="Progress"
    >
      {Array.from({ length: steps }).map((_, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isClickable = onDotClick && (isCompleted || isActive);

        return (
          <button
            key={index}
            type="button"
            onClick={() => isClickable && onDotClick(index)}
            disabled={!isClickable}
            className={cn(
              "rounded-full transition-all duration-200",
              isActive
                ? "w-6 h-2 bg-blue-500"
                : isCompleted
                  ? "w-2 h-2 bg-blue-500/50 hover:bg-blue-500"
                  : "w-2 h-2 bg-slate-300 dark:bg-slate-600",
              isClickable && !isActive && "cursor-pointer hover:scale-110"
            )}
            role="tab"
            aria-selected={isActive}
            aria-label={`Step ${index + 1}`}
          />
        );
      })}
    </div>
  );
};
