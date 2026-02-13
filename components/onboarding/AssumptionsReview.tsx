'use client';

import { useState } from 'react';
import type { AssumptionWithReasoning } from '@/types/ai-onboarding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, AlertCircle, Info, Edit2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Type for user override values */
type OverrideValue = string | number | boolean | null;

interface AssumptionsReviewProps {
  assumptions: AssumptionWithReasoning[];
  onRefine: (refinementText: string) => void;
  onUpdateAssumptions?: (overrides: Record<string, OverrideValue>) => void;
  isUpdating?: boolean;
}

export function AssumptionsReview({ assumptions, onRefine, onUpdateAssumptions, isUpdating = false }: AssumptionsReviewProps) {
  // Track user edits: field -> edited value
  const [userEdits, setUserEdits] = useState<Record<string, OverrideValue>>({});

  // Track which fields are currently being edited (for focus state)
  const [editingField, setEditingField] = useState<string | null>(null);

  if (assumptions.length === 0) return null;

  const handleValueChange = (field: string, newValue: OverrideValue): void => {
    setUserEdits(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  const hasEdits = Object.keys(userEdits).length > 0;

  const getConfidenceIcon = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Check className="w-3 h-3" />;
      case 'medium':
        return <Info className="w-3 h-3" />;
      case 'low':
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  // Group assumptions by category
  const groupedAssumptions = {
    cashSafety: assumptions.filter(a =>
      a.field === 'emergencyFund' ||
      (a.field === 'currentTaxable' && !assumptions.find(x => x.field === 'cTax1'))
    ),
    retirement: assumptions.filter(a =>
      a.field === 'currentTraditional' ||
      a.field === 'currentRoth' ||
      a.field === 'cPre1' ||
      a.field === 'cPost1' ||
      a.field === 'cMatch1' ||
      a.field === 'cPre2' ||
      a.field === 'cPost2' ||
      a.field === 'cMatch2'
    ),
    taxableIncome: assumptions.filter(a =>
      a.field === 'cTax1' ||
      a.field === 'cTax2' ||
      a.field === 'primaryIncome' ||
      a.field === 'spouseIncome' ||
      a.field === 'age' ||
      a.field === 'spouseAge' ||
      a.field === 'retirementAge'
    ),
    other: assumptions.filter(a =>
      a.field === 'maritalStatus' ||
      a.field === 'employmentType1' ||
      a.field === 'employmentType2' ||
      a.field === 'state'
    )
  };

  // Filter out empty groups
  const sections = [
    { title: 'Cash & Safety', items: groupedAssumptions.cashSafety },
    { title: 'Retirement Accounts & Contributions', items: groupedAssumptions.retirement },
    { title: 'Income & Personal Details', items: groupedAssumptions.taxableIncome },
    { title: 'Employment & Location', items: groupedAssumptions.other },
  ].filter(section => section.items.length > 0);

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      role="region"
      aria-label="Assumptions review"
    >
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Review & edit assumptions
        </h3>
        <p className="text-sm text-muted-foreground">
          The most impactful assumptions are shown below. Other planning assumptions (inflation, returns, tax rates) use standard defaults.
        </p>
      </div>

      {/* Sections with grid layout */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {section.title}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.items.map((assumption, index) => {
              const currentValue = userEdits[assumption.field] !== undefined
                ? userEdits[assumption.field]
                : assumption.value;
              const isEdited = userEdits[assumption.field] !== undefined;
              const isEditing = editingField === assumption.field;

              return (
                <div
                  key={`${assumption.field}-${index}`}
                  className={cn(
                    'space-y-2 p-3 rounded-lg border transition-colors',
                    isEdited
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                      : 'bg-card border'
                  )}
                >
                  {/* Label with badges */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-foreground">
                      {assumption.displayName}
                    </label>
                    <div className="flex items-center gap-1.5">
                      {assumption.userProvided && !isEdited && (
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                        >
                          <Check className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                          Confirmed
                        </Badge>
                      )}
                      {isEdited && (
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        >
                          <Edit2 className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                          Edited
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-5 px-1.5 text-[10px] flex items-center gap-0.5',
                          assumption.confidence === 'high' && 'bg-muted text-muted-foreground border',
                          assumption.confidence === 'medium' && 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
                          assumption.confidence === 'low' && 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                        )}
                        aria-label={`Confidence: ${assumption.confidence}`}
                      >
                        {getConfidenceIcon(assumption.confidence)}
                        <span className="sr-only">{assumption.confidence}</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Editable input field */}
                  <EditableField
                    value={currentValue}
                    originalValue={assumption.value}
                    field={assumption.field}
                    onChange={(newValue) => handleValueChange(assumption.field, newValue)}
                    onFocus={() => setEditingField(assumption.field)}
                    onBlur={() => setEditingField(null)}
                    isEditing={isEditing}
                  />

                  {/* Helper text (reasoning) */}
                  <p className="text-xs text-muted-foreground italic">
                    {assumption.reasoning}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Update Assumptions button - show when user has made edits */}
      {hasEdits && onUpdateAssumptions && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            You've made {Object.keys(userEdits).length} change{Object.keys(userEdits).length !== 1 ? 's' : ''}.
            Click below to recalculate assumptions with your updated values.
          </p>
          <Button
            size="sm"
            onClick={() => onUpdateAssumptions(userEdits)}
            disabled={isUpdating}
            className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] px-6"
            aria-label="Recalculate assumptions with edited values"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Assumptions'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Editable field component - handles different value types
interface EditableFieldProps {
  value: OverrideValue;
  originalValue: OverrideValue;
  field: string;
  onChange: (value: OverrideValue) => void;
  onFocus: () => void;
  onBlur: () => void;
  isEditing: boolean;
}

function EditableField({ value, originalValue, field, onChange, onFocus, onBlur, isEditing }: EditableFieldProps) {
  // Determine input type based on value
  const isNumber = typeof originalValue === 'number';
  const isBoolean = typeof originalValue === 'boolean';

  // Detect field type for formatting
  const fieldLower = field.toLowerCase();

  // Currency fields: dollar amounts that need $ and commas
  const isCurrencyField = fieldLower.includes('income') ||
                          fieldLower.includes('salary') ||
                          fieldLower.includes('bonus') ||
                          fieldLower.includes('monthly') ||
                          fieldLower.includes('annual') ||
                          fieldLower.includes('current') ||
                          fieldLower.includes('emergency') ||
                          fieldLower.includes('balance') ||
                          // Contribution dollar amounts (cPre1, cPost1, cTax1, cMatch1, etc.)
                          fieldLower.startsWith('cpre') ||
                          fieldLower.startsWith('cpost') ||
                          fieldLower.startsWith('ctax') ||
                          fieldLower.startsWith('cmatch');

  // Percentage fields: rates stored as decimals (0.07 = 7%)
  // Explicitly exclude contribution dollar amounts
  const isPercentageField = (fieldLower.includes('rate') && !fieldLower.startsWith('c')) ||
                            (fieldLower.includes('savingsrate'));

  // Safely convert value to string for select elements
  const stringValue = value == null ? '' : String(value);

  const selectClassName = "w-full px-3 py-2 bg-background border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

  // Handle string/select fields (maritalStatus, state, employmentType, etc.)
  if (field === 'maritalStatus') {
    return (
      <select
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={selectClassName}
      >
        <option value="single">Single</option>
        <option value="married">Married</option>
      </select>
    );
  }

  if (field === 'employmentType1' || field === 'employmentType2') {
    return (
      <select
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={selectClassName}
      >
        <option value="w2">W-2 Employee</option>
        <option value="self-employed">Self-Employed</option>
        <option value="both">Both</option>
        <option value="retired">Retired</option>
        <option value="other">Other</option>
      </select>
    );
  }

  if (isBoolean) {
    return (
      <select
        value={value ? 'yes' : 'no'}
        onChange={(e) => onChange(e.target.value === 'yes')}
        onFocus={onFocus}
        onBlur={onBlur}
        className={selectClassName}
      >
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }

  if (isNumber) {
    // Safely convert to number for numeric operations
    const numValue = typeof value === 'number' ? value : 0;
    // Handle NaN - NEVER show "NaN" to the user
    const isValidNumber = typeof value === 'number' && !isNaN(value) && isFinite(value);

    // Format display value based on field type
    let displayValue = '';
    let prefix = '';
    let suffix = '';
    let placeholder = '—';

    if (!isValidNumber) {
      // Show empty input with placeholder for invalid numbers
      displayValue = '';
    } else if (isCurrencyField) {
      // Display as currency: $100,000
      displayValue = Math.round(numValue).toLocaleString('en-US');
      prefix = '$';
      placeholder = '$0';
    } else if (isPercentageField) {
      // Display as percentage: 7.0%
      // Value is stored as decimal (0.07), display as 7.0
      displayValue = (numValue * 100).toFixed(1);
      suffix = '%';
      placeholder = '0%';
    } else {
      // Default number display
      displayValue = String(numValue);
      placeholder = '0';
    }

    return (
      <Input
        type="text"
        value={isEditing ? displayValue : (isValidNumber ? `${prefix}${displayValue}${suffix}` : '')}
        placeholder={placeholder}
        onChange={(e) => {
          const rawValue = e.target.value.replace(/[$,%]/g, '').replace(/,/g, '');
          const parsed = parseFloat(rawValue);

          // Only update if we have a valid number
          if (!isNaN(parsed) && isFinite(parsed)) {
            if (isPercentageField) {
              // Convert percentage input to decimal
              onChange(parsed / 100);
            } else {
              onChange(parsed);
            }
          } else if (rawValue === '') {
            // Allow clearing the field
            onChange(0);
          }
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full"
      />
    );
  }

  // Default: text input for state, etc.
  return (
    <Input
      type="text"
      value={stringValue}
      placeholder="—"
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      className="w-full"
    />
  );
}
