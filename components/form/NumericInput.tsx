'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { soundPresets } from '@/lib/sounds';

export interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  prefix?: string; // e.g., "$"
  suffix?: string; // e.g., "%"
  formatOnBlur?: boolean; // Format with commas when user leaves field
  allowNegative?: boolean;
  decimalPlaces?: number;
  /** Quick preset values for dropdown */
  presets?: { label: string; value: number }[];
  /** Preset configuration for common financial amounts */
  presetType?: 'currency' | 'percentage' | 'age' | 'years' | 'none';
  /** Enable scrubbing (drag to adjust) */
  enableScrubbing?: boolean;
  /** Enable scroll wheel adjustment */
  enableScrollWheel?: boolean;
  /** Enable step buttons */
  enableStepButtons?: boolean;
  /** Sensitivity for scrubbing (higher = faster change) */
  scrubSensitivity?: number;
}

// Default presets for common financial scenarios
const DEFAULT_PRESETS: Record<string, { label: string; value: number }[]> = {
  currency: [
    { label: '$10K', value: 10000 },
    { label: '$25K', value: 25000 },
    { label: '$50K', value: 50000 },
    { label: '$75K', value: 75000 },
    { label: '$100K', value: 100000 },
    { label: '$150K', value: 150000 },
    { label: '$250K', value: 250000 },
    { label: '$500K', value: 500000 },
    { label: '$1M', value: 1000000 },
  ],
  percentage: [
    { label: '3%', value: 3 },
    { label: '4%', value: 4 },
    { label: '5%', value: 5 },
    { label: '6%', value: 6 },
    { label: '7%', value: 7 },
    { label: '8%', value: 8 },
    { label: '10%', value: 10 },
    { label: '12%', value: 12 },
  ],
  age: [
    { label: '25', value: 25 },
    { label: '30', value: 30 },
    { label: '35', value: 35 },
    { label: '40', value: 40 },
    { label: '45', value: 45 },
    { label: '50', value: 50 },
    { label: '55', value: 55 },
    { label: '60', value: 60 },
    { label: '65', value: 65 },
    { label: '67', value: 67 },
    { label: '70', value: 70 },
  ],
  years: [
    { label: '5 yrs', value: 5 },
    { label: '10 yrs', value: 10 },
    { label: '15 yrs', value: 15 },
    { label: '20 yrs', value: 20 },
    { label: '25 yrs', value: 25 },
    { label: '30 yrs', value: 30 },
  ],
};

/**
 * NumericInput Component - Premium Edition
 *
 * A premium number input with intuitive interactions for financial data entry.
 *
 * Features:
 * - Scrubbing: Drag left/right to adjust value
 * - Scroll wheel: Scroll to increment/decrement
 * - Animated value changes with smooth transitions
 * - Step buttons with hold-to-repeat
 * - Quick presets dropdown for common values
 * - Currency/percentage formatting
 * - Min/max clamping with visual feedback
 * - Fixes Ctrl+A bug (selects field content, not whole page)
 *
 * Usage:
 * ```tsx
 * <NumericInput
 *   value={salary}
 *   onChange={setSalary}
 *   min={0}
 *   max={10000000}
 *   prefix="$"
 *   presetType="currency"
 *   enableScrubbing
 *   enableScrollWheel
 *   enableStepButtons
 * />
 * ```
 */
export function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
  prefix,
  suffix,
  formatOnBlur = true,
  allowNegative = false,
  decimalPlaces = 0,
  presets,
  presetType = 'none',
  enableScrubbing = true,
  enableScrollWheel = true,
  enableStepButtons = true,
  scrubSensitivity = 1,
}: NumericInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(formatNumber(value, decimalPlaces, formatOnBlur));
  const [isFocused, setIsFocused] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [isAtMin, setIsAtMin] = useState(false);
  const [isAtMax, setIsAtMax] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [animatingValue, setAnimatingValue] = useState<number | null>(null);

  // Refs for scrubbing and hold-to-repeat
  const dragStartX = useRef<number>(0);
  const dragStartValue = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdSpeedRef = useRef<number>(1);
  const currentValueRef = useRef<number>(value);

  // Keep currentValueRef in sync
  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  // Get presets to use
  const activePresets = presets || (presetType !== 'none' ? DEFAULT_PRESETS[presetType] : undefined);

  // Calculate smart step based on value magnitude
  const getSmartStep = useCallback((currentValue: number) => {
    if (step !== 1) return step; // Use explicit step if provided

    const absValue = Math.abs(currentValue);
    if (absValue >= 1000000) return 10000;
    if (absValue >= 100000) return 1000;
    if (absValue >= 10000) return 100;
    if (absValue >= 1000) return 10;
    return step;
  }, [step]);

  // Clamp value and update boundary states
  const clampValue = useCallback((val: number): number => {
    let clamped = val;
    let atMin = false;
    let atMax = false;

    if (min !== undefined && val <= min) {
      clamped = min;
      atMin = true;
    }
    if (max !== undefined && val >= max) {
      clamped = max;
      atMax = true;
    }

    setIsAtMin(atMin);
    setIsAtMax(atMax);

    return parseFloat(clamped.toFixed(decimalPlaces));
  }, [min, max, decimalPlaces]);

  // Animate value change
  const animateValueChange = useCallback((newValue: number) => {
    setAnimatingValue(newValue);
    setTimeout(() => setAnimatingValue(null), 150);
  }, []);

  // Update value with animation
  const updateValue = useCallback((newValue: number, animate = true) => {
    const clamped = clampValue(newValue);
    if (clamped !== value) {
      soundPresets.moneyChange();
      if (animate) {
        animateValueChange(clamped);
      }
      onChange(clamped);
    }
  }, [clampValue, value, onChange, animateValueChange]);

  // Sync display value when external value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumber(value, decimalPlaces, formatOnBlur));
    }
    // Update boundary states
    clampValue(value);
  }, [value, isFocused, decimalPlaces, formatOnBlur, clampValue]);

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    setShowPresets(false);
    // Remove formatting when focused for easier editing
    setDisplayValue(value.toString());
  };

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);

    // Parse and validate the input
    let numValue = parseFloat(displayValue.replace(/,/g, ''));

    if (isNaN(numValue)) {
      numValue = 0;
    }

    // Apply min/max constraints
    const clamped = clampValue(numValue);

    // Update parent
    onChange(clamped);

    // Update display with formatting
    setDisplayValue(formatNumber(clamped, decimalPlaces, formatOnBlur));
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Remove prefix/suffix if present
    if (prefix) {
      newValue = newValue.replace(prefix, '');
    }
    if (suffix) {
      newValue = newValue.replace(suffix, '');
    }

    // Allow only valid numeric characters
    const regex = allowNegative
      ? /^-?\d*\.?\d*$/
      : /^\d*\.?\d*$/;

    if (regex.test(newValue) || newValue === '') {
      setDisplayValue(newValue);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Fix Ctrl+A bug: prevent default browser behavior, handle manually
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      e.stopPropagation();
      inputRef.current?.select();
      return;
    }

    // Arrow up/down to increment/decrement
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const smartStep = getSmartStep(value);
      updateValue(value + smartStep * (e.shiftKey ? 10 : 1));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const smartStep = getSmartStep(value);
      updateValue(value - smartStep * (e.shiftKey ? 10 : 1));
      return;
    }

    // Escape to close presets
    if (e.key === 'Escape') {
      setShowPresets(false);
      return;
    }

    // Allow arrow keys, backspace, delete, tab
    const allowedKeys = ['ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'Tab', 'Enter'];
    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Allow Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
  };

  // Handle scroll wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enableScrollWheel || disabled) return;

    // Only handle when input or container is focused/hovered
    const isInputFocused = document.activeElement === inputRef.current;
    const isHovered = containerRef.current?.matches(':hover');

    if (!isInputFocused && !isHovered) return;

    e.preventDefault();

    const smartStep = getSmartStep(value);
    const delta = e.deltaY < 0 ? smartStep : -smartStep;
    const multiplier = e.shiftKey ? 10 : 1;

    updateValue(value + delta * multiplier);
  }, [enableScrollWheel, disabled, value, getSmartStep, updateValue]);

  // Setup scroll wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enableScrollWheel) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel, enableScrollWheel]);

  // Handle scrubbing (drag to adjust)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enableScrubbing || disabled) return;

    // Only start scrubbing if clicking on the scrub zone (prefix area)
    const target = e.target as HTMLElement;
    if (!target.closest('[data-scrub-zone]')) return;

    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartValue.current = value;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const smartStep = getSmartStep(dragStartValue.current);
      const sensitivity = smartStep * scrubSensitivity * 0.1;
      const newValue = dragStartValue.current + deltaX * sensitivity;
      updateValue(newValue, false);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [enableScrubbing, disabled, value, getSmartStep, scrubSensitivity, updateValue]);

  // Handle step buttons
  const startHoldIncrement = useCallback((direction: 'up' | 'down') => {
    if (disabled) return;

    const smartStep = getSmartStep(value);
    const delta = direction === 'up' ? smartStep : -smartStep;

    // Initial change
    updateValue(value + delta);
    holdSpeedRef.current = 1;

    // Start hold-to-repeat
    holdTimerRef.current = setInterval(() => {
      holdSpeedRef.current = Math.min(holdSpeedRef.current * 1.1, 10);
      const currentVal = currentValueRef.current;
      const currentStep = getSmartStep(currentVal);
      const newValue = clampValue(currentVal + currentStep * Math.round(holdSpeedRef.current) * (direction === 'up' ? 1 : -1));
      soundPresets.numberTick();
      onChange(newValue);
    }, 100);
  }, [disabled, value, getSmartStep, updateValue, onChange, clampValue]);

  const stopHoldIncrement = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdSpeedRef.current = 1;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  // Handle preset selection
  const handlePresetSelect = (presetValue: number) => {
    updateValue(presetValue);
    setShowPresets(false);
    inputRef.current?.focus();
  };

  // Close presets when clicking outside
  useEffect(() => {
    if (!showPresets) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPresets]);

  const formattedDisplay = isFocused
    ? displayValue
    : `${prefix || ''}${displayValue}${suffix || ''}`;

  // Determine visual feedback classes
  const boundaryClass = isAtMin || isAtMax
    ? 'ring-2 ring-amber-400/50 border-amber-400/50'
    : '';

  const animatingClass = animatingValue !== null
    ? 'scale-[1.02] transition-transform duration-150'
    : 'transition-transform duration-150';

  const draggingClass = isDragging
    ? 'ring-2 ring-blue-400/50 border-blue-400/50'
    : '';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center group',
        className
      )}
    >
      {/* Scrub zone / Prefix indicator */}
      {(prefix || enableScrubbing) && (
        <div
          data-scrub-zone
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-center px-3 z-10',
            'text-muted-foreground text-sm font-medium',
            enableScrubbing && !disabled && 'cursor-ew-resize hover:text-foreground hover:bg-muted/50 rounded-l-md transition-colors',
            isDragging && 'bg-blue-50 dark:bg-blue-950/30'
          )}
          onMouseDown={handleMouseDown}
          title={enableScrubbing ? 'Drag to adjust value' : undefined}
        >
          {prefix || <span className="w-3" />}
        </div>
      )}

      {/* Main input */}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={formattedDisplay}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          // Base styles with mobile-friendly touch target
          'flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background',
          // Placeholder and focus styles
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Disabled and responsive text
          'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          // Right-aligned for numbers
          'text-right',
          // Padding for prefix/suffix/buttons
          prefix || enableScrubbing ? 'pl-10' : 'pl-3',
          (suffix || (activePresets && activePresets.length > 0) || enableStepButtons) ? 'pr-20' : 'pr-3',
          // Visual feedback
          boundaryClass,
          animatingClass,
          draggingClass
        )}
        id={id}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />

      {/* Right side controls */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-1">
        {/* Suffix */}
        {suffix && (
          <span className="text-muted-foreground text-sm pr-1">
            {suffix}
          </span>
        )}

        {/* Step buttons */}
        {enableStepButtons && (
          <div className="flex flex-col h-8">
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled || isAtMax}
              className={cn(
                'flex items-center justify-center w-5 h-4 rounded-t text-muted-foreground',
                'hover:bg-muted hover:text-foreground transition-colors',
                'active:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none',
                isAtMax && 'text-amber-500'
              )}
              onMouseDown={() => startHoldIncrement('up')}
              onMouseUp={stopHoldIncrement}
              onMouseLeave={stopHoldIncrement}
              aria-label="Increment"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled || isAtMin}
              className={cn(
                'flex items-center justify-center w-5 h-4 rounded-b text-muted-foreground',
                'hover:bg-muted hover:text-foreground transition-colors',
                'active:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none',
                isAtMin && 'text-amber-500'
              )}
              onMouseDown={() => startHoldIncrement('down')}
              onMouseUp={stopHoldIncrement}
              onMouseLeave={stopHoldIncrement}
              aria-label="Decrement"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Presets dropdown trigger */}
        {activePresets && activePresets.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className={cn(
              'flex items-center justify-center w-6 h-6 rounded text-muted-foreground',
              'hover:bg-muted hover:text-foreground transition-colors',
              'active:bg-muted/80 disabled:opacity-50 disabled:pointer-events-none',
              showPresets && 'bg-muted text-foreground'
            )}
            onClick={() => setShowPresets(!showPresets)}
            aria-label="Show presets"
            aria-expanded={showPresets}
          >
            <ChevronRight className={cn(
              'w-4 h-4 transition-transform duration-200',
              showPresets && 'rotate-90'
            )} />
          </button>
        )}
      </div>

      {/* Presets dropdown */}
      {showPresets && activePresets && activePresets.length > 0 && (
        <div
          className={cn(
            'absolute top-full right-0 mt-1 z-50',
            'min-w-[120px] max-h-[200px] overflow-y-auto',
            'rounded-md border bg-popover p-1 shadow-md',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200'
          )}
        >
          {activePresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              className={cn(
                'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm',
                'hover:bg-accent hover:text-accent-foreground transition-colors',
                'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                value === preset.value && 'bg-accent/50 font-medium'
              )}
              onClick={() => handlePresetSelect(preset.value)}
            >
              <span>{preset.label}</span>
              {value === preset.value && (
                <span className="text-xs text-muted-foreground">current</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Boundary indicator tooltip */}
      {(isAtMin || isAtMax) && isFocused && (
        <div className={cn(
          'absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs',
          'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}>
          {isAtMin ? `Min: ${formatNumber(min!, decimalPlaces, true)}` : `Max: ${formatNumber(max!, decimalPlaces, true)}`}
        </div>
      )}
    </div>
  );
}

/**
 * Format a number with commas and decimal places
 */
function formatNumber(num: number, decimalPlaces: number, useCommas: boolean): string {
  if (!Number.isFinite(num)) return '0';

  if (!useCommas) {
    return num.toFixed(decimalPlaces);
  }

  const parts = num.toFixed(decimalPlaces).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * Compact currency formatter for presets
 */
export function formatCompactCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 0)}K`;
  return `$${value}`;
}
