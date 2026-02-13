'use client';

import React from 'react';
import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';
import { FIELD_DISPLAY_NAMES } from '@/types/ai-onboarding';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface DataSummaryPanelProps {
  extractedData: ExtractedData;
  assumptions: AssumptionWithReasoning[];
}

export const DataSummaryPanel = React.memo(function DataSummaryPanel({ extractedData, assumptions }: DataSummaryPanelProps) {
  const extractedCount = Object.keys(extractedData).filter(
    (key) => extractedData[key as keyof ExtractedData] !== undefined
  ).length;

  const requiredFields: Array<keyof ExtractedData> = [
    'age',
    'maritalStatus',
    'primaryIncome',
    'retirementAge',
  ];

  const completedRequired = requiredFields.filter(
    (field) => extractedData[field] !== undefined
  ).length;

  return (
    <div className="h-full w-full bg-slate-950/80 backdrop-blur overflow-y-auto">
      <div className="p-4 sm:p-6 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Data Summary</h3>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-slate-400">Extracted:</span>
            <span className="ml-2 font-semibold text-blue-300">{extractedCount} fields</span>
          </div>
          <div>
            <span className="text-slate-400">Required:</span>
            <span className="ml-2 font-semibold text-green-300">
              {completedRequired}/{requiredFields.length}
            </span>
          </div>
        </div>
      </div>

      {/* Extracted Data */}
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Collected Information
          </h4>
          {extractedCount === 0 ? (
            <p className="text-sm text-slate-500 italic">No data collected yet</p>
          ) : (
            <div className="space-y-2">
              {(Object.keys(extractedData) as Array<keyof ExtractedData>)
                .filter((key) => extractedData[key] !== undefined)
                .map((key) => {
                  const value = extractedData[key];
                  const isRequired = requiredFields.includes(key);

                  return (
                    <div
                      key={key}
                      className="bg-slate-900/50 border border-slate-800 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs text-slate-400">
                          {FIELD_DISPLAY_NAMES[key]}
                        </span>
                        {isRequired && (
                          <Badge
                            variant="outline"
                            className="bg-green-950/50 text-green-400 border-green-800 text-xs"
                          >
                            <Check className="w-3 h-3" />
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium text-slate-100">
                        {formatDataValue(value)}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Assumptions */}
        {assumptions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
              Assumptions Made
            </h4>
            <div className="space-y-2">
              {assumptions.map((assumption, index) => (
                <div
                  key={`${assumption.field}-${index}`}
                  className="bg-slate-900/50 border border-slate-800 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-400">
                      {assumption.displayName}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        assumption.confidence === 'high'
                          ? 'bg-green-950/50 text-green-400 border-green-800'
                          : assumption.confidence === 'medium'
                          ? 'bg-yellow-950/50 text-yellow-400 border-yellow-800'
                          : 'bg-red-950/50 text-red-400 border-red-800'
                      }
                    >
                      {assumption.confidence}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-blue-300 mb-1">
                    {formatDataValue(assumption.value)}
                  </div>
                  <p className="text-xs text-slate-500 italic line-clamp-2">
                    {assumption.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Completion</span>
            <span className="text-xs font-semibold text-slate-300">
              {Math.round((completedRequired / requiredFields.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{
                width: `${(completedRequired / requiredFields.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

DataSummaryPanel.displayName = 'DataSummaryPanel';

/** Format data values for display */
function formatDataValue(value: string | number | boolean | null | undefined | number[]): string {
  if (value === undefined || value === null) return 'Not set';

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
    if (value.length === 0) return 'None';
    return value.join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}
