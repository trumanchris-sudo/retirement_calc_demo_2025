"use client";

import React from "react";
import { AlertCircle, X, RefreshCw, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  /** Optional hint for how to fix the error */
  hint?: string;
  /** Type of error for styling */
  variant?: "error" | "warning";
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  onDismiss,
  onRetry,
  hint,
  variant = "error",
  className,
}) => {
  const isWarning = variant === "warning";

  const colors = isWarning
    ? {
        border: "border-amber-200 dark:border-amber-900",
        bg: "bg-amber-50 dark:bg-amber-900/20",
        icon: "text-amber-600 dark:text-amber-400",
        title: "text-amber-900 dark:text-amber-200",
        text: "text-amber-800 dark:text-amber-300",
        hint: "text-amber-700 dark:text-amber-400",
        dismissHover: "hover:text-amber-900 dark:hover:text-amber-200",
      }
    : {
        border: "border-red-200 dark:border-red-900",
        bg: "bg-red-50 dark:bg-red-900/20",
        icon: "text-red-600 dark:text-red-400",
        title: "text-red-900 dark:text-red-200",
        text: "text-red-800 dark:text-red-300",
        hint: "text-red-700 dark:text-red-400",
        dismissHover: "hover:text-red-900 dark:hover:text-red-200",
      };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "relative rounded-lg border p-4 animate-in slide-in-from-top-2 duration-300",
        colors.border,
        colors.bg,
        className
      )}
    >
      <div className="flex gap-3">
        <AlertCircle
          className={cn("h-5 w-5 flex-shrink-0 mt-0.5", colors.icon)}
          aria-hidden="true"
        />
        <div className="flex-1 space-y-2">
          {title && (
            <h3 className={cn("font-semibold", colors.title)}>{title}</h3>
          )}
          <p className={cn("text-sm", colors.text)}>{message}</p>

          {hint && (
            <div className={cn("flex items-start gap-2 text-xs", colors.hint)}>
              <HelpCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{hint}</span>
            </div>
          )}

          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Try Again
            </Button>
          )}
        </div>

        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className={cn(
              "h-6 w-6 flex-shrink-0",
              colors.icon,
              colors.dismissHover
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
