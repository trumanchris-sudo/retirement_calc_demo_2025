"use client";

import React from "react";
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
  placeholder
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(val);
    } else if (e.target.value === "") {
      onChange(0);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        className={cn(
          "text-sm font-medium",
          error && "text-red-600 dark:text-red-400"
        )}
      >
        {label}
      </Label>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
            {prefix}
          </span>
        )}

        <Input
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className={cn(
            "font-mono",
            prefix && "pl-7",
            suffix && "pr-12",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
        />

        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">
            {suffix}
          </span>
        )}
      </div>

      {description && !error && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};
