"use client"

import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export interface RecalculateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isCalculating?: boolean;
  className?: string;
}

/**
 * RecalculateButton - A reusable button for triggering recalculations
 * Used in Stress Tests and Legacy Planning tabs
 */
export function RecalculateButton({
  onClick,
  disabled = false,
  isCalculating = false,
  className = ""
}: RecalculateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isCalculating}
      size="lg"
      className={`w-full sm:w-auto ${className}`}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
      {isCalculating ? 'Calculating...' : 'Recalculate'}
    </Button>
  );
}
