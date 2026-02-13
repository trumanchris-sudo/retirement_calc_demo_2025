"use client";

import React, { useId } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string; // $
  suffix?: string; // %, years
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  error?: string;
  className?: string;
  placeholder?: string;
  /** Optional ID override */
  id?: string;
  /** Required indicator */
  required?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step = 1,
  description,
  error,
  className,
  placeholder,
  id: providedId,
  required = false
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const inputId = `${id}-input`;
  const descriptionId = `${id}-desc`;
  const errorId = `${id}-error`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      // Apply min/max constraints during input
      let constrainedVal = val;
      if (min !== undefined && val < min) constrainedVal = min;
      if (max !== undefined && val > max) constrainedVal = max;
      onChange(constrainedVal);
    } else if (e.target.value === "") {
      onChange(min ?? 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow Enter to blur and submit
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Build aria-describedby based on available descriptions
  const ariaDescribedBy = [
    description && !error ? descriptionId : null,
    error ? errorId : null
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={inputId}
        className={cn(
          "text-sm font-medium",
          error && "text-red-600 dark:text-red-400"
        )}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-hidden="true">*</span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </Label>

      <div className="relative">
        {prefix && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none"
            aria-hidden="true"
          >
            {prefix}
          </span>
        )}

        <Input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          className={cn(
            // Base styles with good touch target height (44px on mobile)
            "font-mono h-11 md:h-10 min-h-[44px]",
            prefix && "pl-7",
            suffix && "pr-12",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
        />

        {suffix && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400 pointer-events-none"
            aria-hidden="true"
          >
            {suffix}
          </span>
        )}
      </div>

      {description && !error && (
        <p id={descriptionId} className="text-xs text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
        >
          <span aria-hidden="true">&#9888;</span>
          {error}
        </p>
      )}
    </div>
  );
};
