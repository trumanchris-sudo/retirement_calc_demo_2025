"use client"

import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { clampNum, toNumber, cn } from "@/lib/utils";
import type { FieldValidationResult } from "@/lib/fieldValidation";

/**
 * Shared UI helper components for calculator inputs and icons
 */

// ==================== Icons ====================

export const TrendingUpIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const Spinner: React.FC<{ className?: string; size?: "sm" | "md" | "lg" }> = ({
  className = "",
  size = "md"
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8"
  };

  return (
    <svg
      className={cn("animate-spin text-current", sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

const InfoIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/**
 * Tooltip component with improved positioning and animation
 */
export const Tip: React.FC<{ text: string; children?: React.ReactNode }> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const hideTip = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(false), 150);
  };

  return (
    <div
      className="inline-flex items-center relative"
      onMouseEnter={showTip}
      onMouseLeave={hideTip}
      onFocus={showTip}
      onBlur={hideTip}
    >
      <button
        type="button"
        className="ml-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-full"
        aria-label="More information"
        tabIndex={0}
      >
        {children || <InfoIcon className="w-4 h-4" />}
      </button>
      <div
        className={cn(
          "absolute z-50 w-64 p-3 text-xs bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl",
          "left-1/2 -translate-x-1/2 bottom-full mb-2",
          "transition-all duration-200",
          isVisible
            ? "opacity-100 translate-y-0 visible"
            : "opacity-0 translate-y-1 invisible"
        )}
        role="tooltip"
      >
        <div className="relative">
          {text}
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900 dark:border-t-slate-800" />
        </div>
      </div>
    </div>
  );
};

// ==================== Input Component ====================

export type InputProps = {
  label: React.ReactNode;
  value: number;
  setter: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  tip?: string;
  isRate?: boolean;
  disabled?: boolean;
  onInputChange?: () => void; // Called when input value changes
  defaultValue?: number; // If provided, auto-clear this value on focus
  validate?: (value: number) => FieldValidationResult; // Optional validation function
  prefix?: string; // e.g., "$"
  suffix?: string; // e.g., "%"
  placeholder?: string;
  /** Show success state when valid */
  showSuccess?: boolean;
  /** Help text shown below the input */
  helpText?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
};

export const Input: React.FC<InputProps> = ({
  label,
  value,
  setter,
  // step is accepted for API compatibility but not used since input type="text"
  step = 1, // eslint-disable-line @typescript-eslint/no-unused-vars
  min = 0,
  max,
  tip,
  isRate = false,
  disabled = false,
  onInputChange,
  defaultValue,
  validate,
  prefix,
  suffix,
  placeholder,
  showSuccess = false,
  helpText,
  size = "md",
}) => {
  const [local, setLocal] = useState<string>(String(value ?? 0));
  const [isFocused, setIsFocused] = useState(false);
  const [validationResult, setValidationResult] = useState<FieldValidationResult | null>(null);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      // When not focused, show formatted number with commas
      if (isRate) {
        setLocal(String(value ?? 0));
      } else {
        setLocal((value ?? 0).toLocaleString('en-US'));
      }
    }
  }, [value, isFocused, isRate]);

  const onFocus = () => {
    setIsFocused(true);
    // If current value equals default value, clear the field for easy editing
    if (defaultValue !== undefined && value === defaultValue) {
      setLocal('');
    } else {
      // Remove commas for editing
      setLocal(String(value ?? 0));
    }
  };

  const onBlur = () => {
    setIsFocused(false);
    setHasBeenTouched(true);

    // Remove commas and parse
    const cleanValue = local.replace(/,/g, '').trim();

    // If field is empty and we have a default, restore default
    if (cleanValue === '' && defaultValue !== undefined) {
      setter(defaultValue);
      onInputChange?.();
      setLocal(isRate ? String(defaultValue) : defaultValue.toLocaleString('en-US'));
      // Run validation on default value
      if (validate) {
        setValidationResult(validate(defaultValue));
      }
      return;
    }

    const num = toNumber(cleanValue, value ?? 0);
    let val = isRate ? parseFloat(String(num)) : Math.round(num);
    val = clampNum(val, min, max);

    // Run validation
    if (validate) {
      setValidationResult(validate(val));
    }

    // Only trigger change if value actually changed
    if (val !== value) {
      setter(val);
      onInputChange?.(); // Notify parent of input change
    }

    // Format with commas for display
    if (isRate) {
      setLocal(String(val));
    } else {
      setLocal(val.toLocaleString('en-US'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow Ctrl+A / Cmd+A to select all text in this input only
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.stopPropagation();
      // Let default behavior select all text in the input
    }
    // Allow Enter to blur the field and trigger calculation
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Determine validation state
  const hasError = validationResult && !validationResult.isValid && !validationResult.warningOnly;
  const hasWarning = validationResult && validationResult.warningOnly;
  const isValid = hasBeenTouched && validationResult?.isValid && showSuccess;

  // Size classes
  const sizeClasses = {
    sm: "h-9 text-sm",
    md: "h-11 md:h-10 text-sm",
    lg: "h-12 text-base"
  };

  // Determine styling based on state
  const inputClasses = cn(
    "flex w-full rounded-md border bg-background px-3 py-2 shadow-sm ring-offset-background",
    "transition-all duration-200",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    sizeClasses[size],
    // Prefix/suffix padding
    prefix && "pl-8",
    suffix && "pr-8",
    // State-based styling
    hasError && "border-red-500 focus-visible:ring-red-500 bg-red-50/50 dark:bg-red-950/20",
    hasWarning && "border-amber-500 focus-visible:ring-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
    isValid && "border-green-500 focus-visible:ring-green-500",
    !hasError && !hasWarning && !isValid && "border-input focus-visible:ring-ring",
    // Dark mode
    "dark:bg-slate-900 dark:border-slate-700"
  );

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-foreground font-medium">
        {label}
        {tip && <Tip text={tip} />}
      </Label>

      <div className="relative">
        {/* Prefix */}
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {prefix}
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={inputClasses}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={
            (hasError || hasWarning) && validationResult?.error
              ? `${label}-error`
              : helpText
                ? `${label}-help`
                : undefined
          }
        />

        {/* Suffix */}
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {suffix}
          </span>
        )}

        {/* Validation icon */}
        {hasBeenTouched && !isFocused && (
          <span className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 transition-opacity duration-200",
            suffix && "right-10"
          )}>
            {hasError && (
              <AlertIcon className="w-4 h-4 text-red-500 animate-in zoom-in-50 duration-200" />
            )}
            {hasWarning && (
              <AlertIcon className="w-4 h-4 text-amber-500 animate-in zoom-in-50 duration-200" />
            )}
            {isValid && (
              <CheckIcon className="w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200" />
            )}
          </span>
        )}
      </div>

      {/* Validation message */}
      {validationResult && validationResult.error && (
        <p
          id={`${label}-error`}
          className={cn(
            "text-xs flex items-center gap-1 animate-in slide-in-from-top-1 duration-200",
            hasError ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
          )}
          role="alert"
        >
          {hasError ? (
            <AlertIcon className="w-3 h-3 flex-shrink-0" />
          ) : (
            <InfoIcon className="w-3 h-3 flex-shrink-0" />
          )}
          <span>{validationResult.error}</span>
        </p>
      )}

      {/* Help text */}
      {helpText && !validationResult?.error && (
        <p
          id={`${label}-help`}
          className="text-xs text-muted-foreground"
        >
          {helpText}
        </p>
      )}
    </div>
  );
};

/**
 * InputGroup - Groups related inputs with a shared label
 */
export const InputGroup: React.FC<{
  label: string;
  tip?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, tip, children, className }) => (
  <div className={cn("space-y-3", className)}>
    <Label className="flex items-center gap-1.5 text-foreground font-medium">
      {label}
      {tip && <Tip text={tip} />}
    </Label>
    <div className="grid gap-3 sm:grid-cols-2">
      {children}
    </div>
  </div>
);

/**
 * InputAddon - Wraps an input with prefix/suffix visual elements
 */
export const InputAddon: React.FC<{
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ prefix, suffix, children, className }) => (
  <div className={cn("flex rounded-md shadow-sm", className)}>
    {prefix && (
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
        {prefix}
      </span>
    )}
    <div className={cn("flex-1", prefix && "rounded-l-none", suffix && "rounded-r-none")}>
      {children}
    </div>
    {suffix && (
      <span className="inline-flex items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">
        {suffix}
      </span>
    )}
  </div>
);
