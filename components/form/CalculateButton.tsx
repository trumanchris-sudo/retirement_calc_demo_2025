"use client";

import React from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { cn } from "@/lib/utils";

interface CalculateButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  onDismissError?: () => void;
  onRetry?: () => void;
  /** Hint shown when button is disabled */
  disabledHint?: string;
  className?: string;
}

export const CalculateButton: React.FC<CalculateButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  error,
  onDismissError,
  onRetry,
  disabledHint,
  className
}) => {
  const isDisabled = disabled || loading;

  return (
    <div className={cn("space-y-4", className)}>
      <Button
        onClick={onClick}
        disabled={isDisabled}
        size="lg"
        aria-busy={loading}
        aria-describedby={
          error ? "calc-error" : isDisabled && disabledHint ? "calc-hint" : undefined
        }
        className={cn(
          // Base styles - 56px height for good touch target
          "w-full h-14 text-lg font-semibold",
          // Gradient background
          "bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto]",
          "hover:bg-[position:100%_0%] transition-all duration-500",
          // Shadow and states
          "shadow-lg hover:shadow-xl",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Focus ring for accessibility
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
          // Subtle pulse animation when ready
          !loading && !disabled && "animate-pulse-subtle"
        )}
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" color="text-white" className="mr-2" />
            <span>Calculating...</span>
            <span className="sr-only">
              Running Monte Carlo simulation with 1,000 market scenarios
            </span>
          </>
        ) : (
          <>
            <Calculator className="w-5 h-5 mr-2" aria-hidden="true" />
            Calculate My Plan
          </>
        )}
      </Button>

      {/* Disabled hint */}
      {isDisabled && disabledHint && !error && (
        <p id="calc-hint" className="text-sm text-center text-muted-foreground">
          {disabledHint}
        </p>
      )}

      {/* Error with optional retry */}
      {error && (
        <div id="calc-error">
          <ErrorMessage
            message={error}
            onDismiss={onDismissError}
            onRetry={onRetry || onClick}
            hint="Check your inputs above for any highlighted errors"
          />
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
