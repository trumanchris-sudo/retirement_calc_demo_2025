"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string; // %, $, years
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  description?: string;
  className?: string;
  onInputChange?: () => void; // Called when input value changes
}

export const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
  formatValue,
  description,
  className,
  onInputChange
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const displayValue = formatValue
    ? formatValue(value)
    : `${value.toFixed(step < 1 ? 1 : 0)}${unit}`;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
          {displayValue}
        </span>
      </div>

      <div className="relative">
        <Slider
          value={[value]}
          onValueChange={(vals) => {
            if (vals[0] !== value) {
              onChange(vals[0]);
              onInputChange?.();
            }
          }}
          min={min}
          max={max}
          step={step}
          onPointerEnter={() => setShowTooltip(true)}
          onPointerLeave={() => setShowTooltip(false)}
          className="relative"
        />
      </div>

      {description && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
};
