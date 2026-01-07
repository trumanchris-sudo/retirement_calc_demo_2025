'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input as UIInput } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
}

/**
 * NumericInput Component
 *
 * A number input with proper formatting and Ctrl+A support.
 *
 * Features:
 * - Fixes Ctrl+A bug (selects field content, not whole page)
 * - Formats numbers with commas on blur (e.g., 1000000 → 1,000,000)
 * - Supports min/max validation
 * - Supports prefix/suffix ($ or %)
 * - Cleans input to prevent invalid characters
 *
 * Usage:
 * ```tsx
 * <NumericInput
 *   value={age}
 *   onChange={setAge}
 *   min={18}
 *   max={100}
 *   aria-label="Your age"
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
}: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(formatNumber(value, decimalPlaces, formatOnBlur));
  const [isFocused, setIsFocused] = useState(false);

  // Sync display value when external value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumber(value, decimalPlaces, formatOnBlur));
    }
  }, [value, isFocused, decimalPlaces, formatOnBlur]);

  const handleFocus = () => {
    setIsFocused(true);
    // Remove formatting when focused for easier editing
    setDisplayValue(value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);

    // Parse and validate the input
    let numValue = parseFloat(displayValue.replace(/,/g, ''));

    if (isNaN(numValue)) {
      numValue = 0;
    }

    // Apply min/max constraints
    if (min !== undefined && numValue < min) {
      numValue = min;
    }
    if (max !== undefined && numValue > max) {
      numValue = max;
    }

    // Round to specified decimal places
    numValue = parseFloat(numValue.toFixed(decimalPlaces));

    // Update parent
    onChange(numValue);

    // Update display with formatting
    setDisplayValue(formatNumber(numValue, decimalPlaces, formatOnBlur));
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Fix Ctrl+A bug: prevent default browser behavior, handle manually
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      e.stopPropagation();
      inputRef.current?.select();
    }

    // Allow arrow keys, backspace, delete, tab
    const allowedKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Tab', 'Enter'];
    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Allow Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
  };

  const formattedDisplay = isFocused
    ? displayValue
    : `${prefix || ''}${displayValue}${suffix || ''}`;

  return (
    <UIInput
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
      className={cn('text-right', className)}
      id={id}
      aria-label={ariaLabel}
    />
  );
}

/**
 * Format a number with commas and decimal places
 */
function formatNumber(num: number, decimalPlaces: number, useCommas: boolean): string {
  if (!useCommas) {
    return num.toFixed(decimalPlaces);
  }

  const parts = num.toFixed(decimalPlaces).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}
