/**
 * AiInsightBox Component
 * Extracted from page.tsx — displays AI-generated plan insights.
 */
'use client';

import React from 'react';
import { SparkleIcon } from '@/components/ui/InlineIcons';
import { formatInsight } from '@/lib/formatUtils';

export const AiInsightBox = React.memo<{
  insight: string;
  error?: string | null;
  isLoading: boolean;
}>(function AiInsightBox({ insight, error, isLoading }) {
  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="animate-spin">
            <SparkleIcon className="text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Analyzing Your Plan...</h4>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Please wait a moment while we generate your personalized insights.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <SparkleIcon className="text-red-600 dark:text-red-400" />
          <h4 className="text-lg font-semibold text-red-900 dark:text-red-100">Analysis Error</h4>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="p-6 rounded-xl bg-card border shadow-sm text-center">
        <p className="text-sm text-muted-foreground">
          Click &quot;Calculate Retirement Plan&quot; to see your personalized analysis
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-card border shadow-sm">
      <div className="space-y-1">
        {formatInsight(insight)}
      </div>
    </div>
  );
});
