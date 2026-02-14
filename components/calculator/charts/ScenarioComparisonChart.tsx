/**
 * ScenarioComparisonChart
 * Extracted from page.tsx — memoized chart for scenario comparison.
 */
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint, ComparisonData } from '@/types/calculator';

const ComposedChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.ComposedChart })),
  { ssr: false }
);

export interface ComparisonChartProps {
  data: ChartDataPoint[];
  comparisonData: ComparisonData;
  isDarkMode: boolean;
  fmt: (n: number) => string;
}

export const ScenarioComparisonChart = React.memo<ComparisonChartProps>(({ data, comparisonData, isDarkMode, fmt }) => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="year" className="text-sm" />
        <YAxis
          tickFormatter={(v) => fmt(v as number)}
          className="text-sm"
          label={isMobile ? undefined : { value: 'Portfolio Value (Real)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
        />
        <RTooltip
          formatter={(v) => fmt(v as number)}
          labelFormatter={(l) => `Year ${l}`}
          contentStyle={{
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            borderRadius: "8px",
            border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            color: isDarkMode ? '#f3f4f6' : '#1f2937'
          }}
          labelStyle={{
            color: isDarkMode ? '#f3f4f6' : '#1f2937',
            fontWeight: 'bold'
          }}
        />
        <Legend />
        {comparisonData.baseline?.visible && (
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            name="Baseline"
          />
        )}
        {comparisonData.bearMarket?.visible && (
          <Line
            type="monotone"
            dataKey="bearMarket"
            stroke="#ef4444"
            strokeWidth={3}
            dot={false}
            name={comparisonData.bearMarket.label}
          />
        )}
        {comparisonData.inflation?.visible && (
          <Line
            type="monotone"
            dataKey="inflation"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={false}
            name={comparisonData.inflation.label}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
});

ScenarioComparisonChart.displayName = 'ScenarioComparisonChart';
