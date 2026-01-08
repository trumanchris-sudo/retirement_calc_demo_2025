'use client';

import { useState } from 'react';
import type { AssumptionWithReasoning } from '@/types/ai-onboarding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, AlertCircle, Info, Edit2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssumptionsReviewProps {
  assumptions: AssumptionWithReasoning[];
  onRefine: (refinementText: string) => void;
  onUpdateAssumptions?: (overrides: Record<string, any>) => void;
  isUpdating?: boolean;
}

export function AssumptionsReview({ assumptions, onRefine, onUpdateAssumptions, isUpdating = false }: AssumptionsReviewProps) {
  // Track user edits: field -> edited value
  const [userEdits, setUserEdits] = useState<Record<string, any>>({});

  // Track which fields are currently being edited (for focus state)
  const [editingField, setEditingField] = useState<string | null>(null);

  if (assumptions.length === 0) return null;

  const handleValueChange = (field: string, newValue: any) => {
    setUserEdits(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  const hasEdits = Object.keys(userEdits).length > 0;

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'bg-green-900/50 text-green-300 border-green-800';
      case 'medium':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-800';
      case 'low':
        return 'bg-red-900/50 text-red-300 border-red-800';
    }
  };

  const getConfidenceIcon = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Check className="w-4 h-4" />;
      case 'medium':
        return <Info className="w-4 h-4" />;
      case 'low':
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div
      className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
      role="region"
      aria-label="Assumptions review"
    >
      <div className="bg-gradient-to-br from-blue-950/50 to-purple-950/50 border-2 border-blue-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-100 mb-2">
          <span aria-hidden="true">📋</span> Review Assumptions
        </h3>
        <p className="text-sm text-blue-200">
          I've made the following assumptions based on our conversation. Please review them and let me know if
          anything needs adjustment.
        </p>
      </div>

      <div className="grid gap-3" role="list" aria-label="List of assumptions">
        {assumptions.map((assumption, index) => {
          const currentValue = userEdits[assumption.field] !== undefined
            ? userEdits[assumption.field]
            : assumption.value;
          const isEdited = userEdits[assumption.field] !== undefined;
          const isEditing = editingField === assumption.field;

          return (
            <div
              key={`${assumption.field}-${index}`}
              role="listitem"
              className={cn(
                'bg-slate-800 border-2 rounded-lg p-4 transition-all',
                assumption.userProvided ? 'border-green-700' : 'border-slate-600',
                isEdited && 'border-blue-500 bg-slate-750'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-slate-50">{assumption.displayName}</h4>
                    {assumption.userProvided && !isEdited && (
                      <Badge variant="outline" className="bg-green-950 text-green-200 border-green-700">
                        <Check className="w-3 h-3 mr-1" aria-hidden="true" />
                        Confirmed
                      </Badge>
                    )}
                    {isEdited && (
                      <Badge variant="outline" className="bg-blue-950 text-blue-200 border-blue-700">
                        <Edit2 className="w-3 h-3 mr-1" aria-hidden="true" />
                        Edited
                      </Badge>
                    )}
                  </div>

                  {/* Editable input field */}
                  <div className="mb-2">
                    <EditableField
                      value={currentValue}
                      originalValue={assumption.value}
                      field={assumption.field}
                      onChange={(newValue) => handleValueChange(assumption.field, newValue)}
                      onFocus={() => setEditingField(assumption.field)}
                      onBlur={() => setEditingField(null)}
                      isEditing={isEditing}
                    />
                  </div>

                  <p className="text-sm text-slate-300 italic">"{assumption.reasoning}"</p>
                </div>

                <Badge
                  variant="outline"
                  className={cn('flex items-center gap-1', getConfidenceColor(assumption.confidence))}
                  aria-label={`Confidence level: ${assumption.confidence}`}
                >
                  {getConfidenceIcon(assumption.confidence)}
                  <span className="sr-only">{assumption.confidence} confidence</span>
                  <span aria-hidden="true">{assumption.confidence}</span>
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Update Assumptions button - show when user has made edits */}
      {hasEdits && onUpdateAssumptions && (
        <div className="bg-blue-950/50 border-2 border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-200 mb-3">
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

      {/* Help text for inline editing */}
      <div className="bg-slate-800 border-2 border-slate-600 rounded-lg p-4">
        <p className="text-sm text-slate-200 mb-1">
          💡 <strong>Click any value above to edit it directly.</strong> Your changes will be saved and you can recalculate assumptions with the "Update Assumptions" button.
        </p>
      </div>
    </div>
  );
}

// Editable field component - handles different value types
interface EditableFieldProps {
  value: any;
  originalValue: any;
  field: string;
  onChange: (value: any) => void;
  onFocus: () => void;
  onBlur: () => void;
  isEditing: boolean;
}

function EditableField({ value, originalValue, field, onChange, onFocus, onBlur, isEditing }: EditableFieldProps) {
  // Determine input type based on value
  const isNumber = typeof originalValue === 'number';
  const isBoolean = typeof originalValue === 'boolean';

  // Handle string/select fields (maritalStatus, state, employmentType, etc.)
  if (field === 'maritalStatus') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full px-3 py-2 bg-slate-700 border-2 border-slate-600 rounded-md text-blue-200 font-semibold text-lg focus:outline-none focus:border-blue-500 transition-colors"
      >
        <option value="single">Single</option>
        <option value="married">Married</option>
      </select>
    );
  }

  if (field === 'employmentType1' || field === 'employmentType2') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full px-3 py-2 bg-slate-700 border-2 border-slate-600 rounded-md text-blue-200 font-semibold text-lg focus:outline-none focus:border-blue-500 transition-colors"
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
        className="w-full px-3 py-2 bg-slate-700 border-2 border-slate-600 rounded-md text-blue-200 font-semibold text-lg focus:outline-none focus:border-blue-500 transition-colors"
      >
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }

  if (isNumber) {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full px-3 py-2 bg-slate-700 border-2 border-slate-600 rounded-md text-blue-200 font-semibold text-lg focus:outline-none focus:border-blue-500 transition-colors"
        step={value > 1000 ? 1000 : value > 100 ? 100 : 1}
      />
    );
  }

  // Default: text input for state, etc.
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      className="w-full px-3 py-2 bg-slate-700 border-2 border-slate-600 rounded-md text-blue-200 font-semibold text-lg focus:outline-none focus:border-blue-500 transition-colors"
    />
  );
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    if (value > 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}
