'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import { Input as UIInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BudgetInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  id: string;
  type?: 'text' | 'number';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export const BudgetInput = ({
  label,
  value,
  onChange,
  id,
  type = 'number',
  placeholder,
  min = 0,
  max,
  step = 1
}: BudgetInputProps) => {
  const [internalValue, setInternalValue] = useState(value.toString());

  useEffect(() => {
    setInternalValue(value.toString());
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    const numValue = parseFloat(newValue) || 0;
    onChange(numValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <UIInput id={id} type={type} value={internalValue} onChange={handleChange} placeholder={placeholder} min={min} max={max} step={step} />
    </div>
  );
};
