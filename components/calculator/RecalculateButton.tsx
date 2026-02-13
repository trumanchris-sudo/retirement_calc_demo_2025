"use client"

import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export interface RecalculateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isCalculating?: boolean;
  className?: string;
  disabledReason?: string;
}

/**
 * RecalculateButton - A reusable button for triggering recalculations
 * Used in Stress Tests and Legacy Planning tabs
 */
export function RecalculateButton({
  onClick,
  disabled = false,
  isCalculating = false,
  className = "",
  disabledReason,
}: RecalculateButtonProps) {
  const isDisabled = disabled || isCalculating;

  return (
    <div className="relative inline-block">
      <Button
        onClick={onClick}
        disabled={isDisabled}
        size="lg"
        className={`w-full sm:w-auto min-h-[44px] ${className}`}
        aria-busy={isCalculating}
        aria-describedby={isDisabled && disabledReason ? "recalc-disabled-reason" : undefined}
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        {isCalculating ? 'Calculating...' : 'Recalculate'}
      </Button>
      {isDisabled && disabledReason && (
        <span id="recalc-disabled-reason" className="sr-only">
          {disabledReason}
        </span>
      )}
    </div>
  );
}
