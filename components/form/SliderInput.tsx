"use client";

import React, { useState, useId, useMemo } from "react";
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
  /** Optional ID override, otherwise auto-generated */
  id?: string;
  /** Show tick marks at intervals */
  showTicks?: boolean;
  /** Custom tick interval (defaults to 25% of range) */
  tickInterval?: number;
  /** Warning threshold - shows amber when exceeded */
  warningThreshold?: number;
  /** Danger threshold - shows red when exceeded */
  dangerThreshold?: number;
  /** Show min/max labels below slider */
  showMinMax?: boolean;
  /** Tooltip content for info icon */
  tip?: string;
  /** Whether slider is disabled */
  disabled?: boolean;
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
  onInputChange,
  id: providedId,
  showTicks = false,
  tickInterval,
  warningThreshold,
  dangerThreshold,
  showMinMax = false,
  tip,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const generatedId = useId();
  const id = providedId || generatedId;
  const descriptionId = `${id}-description`;
  const valueId = `${id}-value`;

  const displayValue = formatValue
    ? formatValue(value)
    : `${value.toFixed(step < 1 ? 1 : 0)}${unit}`;

  // Create accessible value text
  const accessibleValue = formatValue
    ? formatValue(value)
    : `${value.toFixed(step < 1 ? 1 : 0)} ${unit === "%" ? "percent" : unit}`;

  // Determine color based on thresholds
  const valueColor = useMemo(() => {
    if (dangerThreshold !== undefined && value >= dangerThreshold) {
      return "danger";
    }
    if (warningThreshold !== undefined && value >= warningThreshold) {
      return "warning";
    }
    return "default";
  }, [value, warningThreshold, dangerThreshold]);

  // Color classes
  const colorClasses = {
    default: {
      badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
      text: "text-blue-600 dark:text-blue-400",
    },
    warning: {
      badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
      text: "text-amber-600 dark:text-amber-400",
    },
    danger: {
      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
      text: "text-red-600 dark:text-red-400",
    },
  };

  const colors = colorClasses[valueColor];

  // Calculate tick positions
  const ticks = useMemo(() => {
    if (!showTicks) return [];
    const interval = tickInterval || (max - min) / 4;
    const positions: number[] = [];
    for (let i = min; i <= max; i += interval) {
      positions.push(Math.round(i * 100) / 100); // Avoid floating point issues
    }
    if (positions[positions.length - 1] !== max) {
      positions.push(max);
    }
    return positions;
  }, [showTicks, tickInterval, min, max]);

  return (
    <div className={cn("space-y-3", className)} role="group" aria-labelledby={id}>
      {/* Header with label and value badge */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <Label id={id} htmlFor={`${id}-slider`} className="text-sm font-medium">
            {label}
          </Label>
          {tip && (
            <div className="group relative inline-block">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="More information"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4M12 8h.01" />
                </svg>
              </button>
              <div className="invisible group-hover:visible absolute z-50 w-48 p-2 text-xs bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                {tip}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45" />
              </div>
            </div>
          )}
        </div>
        <output
          id={valueId}
          htmlFor={`${id}-slider`}
          className={cn(
            "text-sm font-mono font-semibold px-2 py-0.5 rounded-md transition-all duration-200",
            colors.badge,
            isDragging && "ring-2 ring-offset-2 ring-blue-500/50 scale-105"
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          {displayValue}
          <span className="sr-only">{accessibleValue}</span>
        </output>
      </div>

      {/* Slider */}
      <div className="relative">
        <Slider
          id={`${id}-slider`}
          value={[value]}
          onValueChange={(vals) => {
            if (vals[0] !== value) {
              onChange(vals[0]);
              onInputChange?.();
            }
          }}
          onValueCommit={() => setIsDragging(false)}
          onPointerDown={() => setIsDragging(true)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(
            "relative",
            disabled && "opacity-50 cursor-not-allowed",
            // Color the track based on threshold
            valueColor === "warning" && "[&>span>span]:bg-amber-500",
            valueColor === "danger" && "[&>span>span]:bg-red-500"
          )}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={accessibleValue}
          aria-describedby={description ? descriptionId : undefined}
        />
      </div>

      {/* Tick marks */}
      {showTicks && ticks.length > 0 && (
        <div className="relative h-5 -mt-1">
          {ticks.map((tick) => {
            const tickPercent = ((tick - min) / (max - min)) * 100;
            return (
              <div
                key={tick}
                className="absolute flex flex-col items-center"
                style={{ left: `${tickPercent}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-px h-1.5 bg-slate-300 dark:bg-slate-600" />
                <span className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                  {formatValue ? formatValue(tick) : `${tick}${unit}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Min/Max labels (when ticks not shown) */}
      {showMinMax && !showTicks && (
        <div className="flex justify-between text-xs text-muted-foreground -mt-1">
          <span>{formatValue ? formatValue(min) : `${min}${unit}`}</span>
          <span>{formatValue ? formatValue(max) : `${max}${unit}`}</span>
        </div>
      )}

      {/* Description */}
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

/**
 * RangeSlider - For selecting a range with two handles
 */
export const RangeSlider: React.FC<{
  label: string;
  value: [number, number];
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
  description?: string;
  className?: string;
  id?: string;
}> = ({
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
  id: providedId,
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;

  const displayMin = formatValue
    ? formatValue(value[0])
    : `${value[0].toFixed(step < 1 ? 1 : 0)}${unit}`;

  const displayMax = formatValue
    ? formatValue(value[1])
    : `${value[1].toFixed(step < 1 ? 1 : 0)}${unit}`;

  return (
    <div className={cn("space-y-3", className)} role="group" aria-labelledby={id}>
      <div className="flex justify-between items-center">
        <Label id={id} className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
          {displayMin} - {displayMax}
        </span>
      </div>

      <Slider
        value={value}
        onValueChange={(vals) => {
          if (vals.length === 2) {
            onChange([vals[0], vals[1]]);
          }
        }}
        min={min}
        max={max}
        step={step}
        className="relative"
        aria-label={label}
      />

      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
};
