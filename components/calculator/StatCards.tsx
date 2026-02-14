/**
 * StatCard, FlippingStatCard, CollapsibleSection
 * Extracted from page.tsx — presentational components for calculator results.
 */
'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlippingCard } from '@/components/FlippingCard';
import { InfoIcon } from '@/components/ui/InlineIcons';
import { COLOR, type ColorKey } from '@/lib/constants';

/** Props for icon components used in stat cards */
export type IconComponentProps = { className?: string };

export const StatCard = React.memo<{
  title: string;
  value: string;
  sub?: string;
  color?: ColorKey;
  icon?: React.ComponentType<IconComponentProps>;
  explanation?: string;
}>(function StatCard({ title, value, sub, color = "blue", icon: Icon, explanation }) {
  const c = COLOR[color] ?? COLOR.blue;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card
      className={`overflow-hidden border-2 transition-all hover:shadow-lg hover:-translate-y-1 ${
        explanation ? 'cursor-pointer' : ''
      }`}
      onClick={() => explanation && setIsExpanded(!isExpanded)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <Badge variant="secondary" className={`${c.bg} ${c.badge} border-0`}>
            {title}
          </Badge>
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <Icon className={`w-5 h-5 ${c.icon}`} />
              </div>
            )}
            {explanation && (
              <InfoIcon className={`w-4 h-4 ${c.icon} transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>
        <div className={`text-3xl font-bold ${c.text} mb-1`}>{value}</div>
        {sub && <p className={`text-sm ${c.sub}`}>{sub}</p>}
        {explanation && isExpanded && (
          <div className={`mt-4 pt-4 border-t ${c.border} animate-in slide-in-from-top-2 duration-200`}>
            <p className={`text-sm ${c.sub} leading-relaxed`}>{explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export const FlippingStatCard = React.memo<{
  title: string;
  value: string;
  sub?: string;
  color?: ColorKey;
  icon?: React.ComponentType<IconComponentProps>;
  backContent?: React.ReactNode;
}>(function FlippingStatCard({ title, value, sub, color = "blue", icon: Icon, backContent }) {
  const c = COLOR[color] ?? COLOR.blue;

  const frontContent = (
    <>
      <div className="flip-card-header">
        <Badge variant="secondary" className={`border-0 bg-transparent ${c.badge}`}>
          {title}
        </Badge>
        <span className="flip-card-icon text-xs opacity-50 print-hide flip-hint">Click to flip ↻</span>
      </div>
      <div className="flex items-start justify-between mb-3">
        <div className={`text-3xl font-bold mb-1 ${c.text}`}>{value}</div>
        {Icon && (
          <div className="p-2 rounded-lg">
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        )}
      </div>
      {sub && <p className={`text-sm ${c.sub}`}>{sub}</p>}
    </>
  );

  const defaultBackContent = (
    <>
      <div className="flip-card-header">
        <span className="flip-card-title">{title} - Details</span>
        <span className="flip-card-icon text-xs">Click to flip back ↻</span>
      </div>
      <div className="flip-card-body-details">
        <p>No additional details provided.</p>
      </div>
    </>
  );

  return (
    <FlippingCard
      frontContent={frontContent}
      backContent={backContent || defaultBackContent}
    />
  );
});

export const CollapsibleSection: React.FC<{
  title: string;
  icon?: React.ComponentType<IconComponentProps>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon: Icon, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-md"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-6 px-2 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};
