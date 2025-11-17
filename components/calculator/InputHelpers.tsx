"use client"

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { clampNum, toNumber } from "@/lib/utils";

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

export const Spinner: React.FC = () => (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const InfoIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const Tip: React.FC<{ text: string }> = ({ text }) => (
  <div className="inline-block ml-1 group relative">
    <InfoIcon className="w-4 h-4 text-blue-500 cursor-help inline" />
    <div className="invisible group-hover:visible absolute z-10 w-64 p-2 text-xs bg-gray-900 text-white rounded shadow-lg left-1/2 -translate-x-1/2 bottom-full mb-2">
      {text}
    </div>
  </div>
);

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
};

export const Input: React.FC<InputProps> = ({
  label,
  value,
  setter,
  step = 1,
  min = 0,
  max,
  tip,
  isRate = false,
  disabled = false,
  onInputChange,
  defaultValue,
}) => {
  const [local, setLocal] = useState<string>(String(value ?? 0));
  const [isFocused, setIsFocused] = useState(false);

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
    // Remove commas and parse
    const cleanValue = local.replace(/,/g, '').trim();

    // If field is empty and we have a default, restore default
    if (cleanValue === '' && defaultValue !== undefined) {
      setter(defaultValue);
      onInputChange?.();
      setLocal(isRate ? String(defaultValue) : defaultValue.toLocaleString('en-US'));
      return;
    }

    const num = toNumber(cleanValue, value ?? 0);
    let val = isRate ? parseFloat(String(num)) : Math.round(num);
    val = clampNum(val, min, max);

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

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-foreground">
        {label}
        {tip && <Tip text={tip} />}
      </Label>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
      />
    </div>
  );
};
