'use client';

import type { AssumptionWithReasoning } from '@/types/ai-onboarding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssumptionsReviewProps {
  assumptions: AssumptionWithReasoning[];
  onRefine: (refinementText: string) => void;
}

export function AssumptionsReview({ assumptions, onRefine }: AssumptionsReviewProps) {
  if (assumptions.length === 0) return null;

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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-blue-950/50 to-purple-950/50 border border-blue-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-100 mb-2">📋 Review Assumptions</h3>
        <p className="text-sm text-blue-200/80">
          I've made the following assumptions based on our conversation. Please review them and let me know if
          anything needs adjustment.
        </p>
      </div>

      <div className="grid gap-3">
        {assumptions.map((assumption, index) => (
          <div
            key={`${assumption.field}-${index}`}
            className={cn(
              'bg-slate-800/60 backdrop-blur border rounded-lg p-4 transition-all hover:bg-slate-800/80',
              assumption.userProvided ? 'border-green-800/50' : 'border-slate-700'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-slate-100">{assumption.displayName}</h4>
                  {assumption.userProvided && (
                    <Badge variant="outline" className="bg-green-950/50 text-green-300 border-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Confirmed
                    </Badge>
                  )}
                </div>

                <p className="text-lg font-semibold text-blue-300 mb-2">
                  {formatValue(assumption.value)}
                </p>

                <p className="text-sm text-slate-400 italic">"{assumption.reasoning}"</p>
              </div>

              <Badge
                variant="outline"
                className={cn('flex items-center gap-1', getConfidenceColor(assumption.confidence))}
              >
                {getConfidenceIcon(assumption.confidence)}
                {assumption.confidence}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4">
        <p className="text-sm text-slate-300 mb-3">
          To refine any assumption, simply type your correction below. For example:
        </p>
        <ul className="text-sm text-slate-400 space-y-1 mb-3 list-disc list-inside">
          <li>"Actually, my emergency fund is $50,000"</li>
          <li>"I want to retire at 55, not 60"</li>
          <li>"My spouse's income is $120,000"</li>
        </ul>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRefine("I'd like to refine some assumptions")}
          className="text-blue-300 border-blue-800 hover:bg-blue-950"
        >
          Make Changes
        </Button>
      </div>
    </div>
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
