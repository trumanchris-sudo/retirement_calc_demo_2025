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
import { CHART_SEMANTIC, getTooltipStyles } from '@/lib/chartColors';

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

export const ScenarioComparisonChart = React.memo<ComparisonChartProps>(({ data, comparisonData, fmt }) => {
  const [isMobile, setIsMobile] = React.useState(false);
  const tooltipStyles = getTooltipStyles();

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
          contentStyle={tooltipStyles.contentStyle}
          labelStyle={tooltipStyles.labelStyle}
        />
        <Legend />
        {comparisonData.baseline?.visible && (
          <Line
            type="monotone"
            dataKey="baseline"
            stroke={CHART_SEMANTIC.nominal}
            strokeWidth={3}
            dot={false}
            name="Baseline"
          />
        )}
        {comparisonData.bearMarket?.visible && (
          <Line
            type="monotone"
            dataKey="bearMarket"
            stroke={CHART_SEMANTIC.bearMarket}
            strokeWidth={3}
            dot={false}
            name={comparisonData.bearMarket.label}
          />
        )}
        {comparisonData.inflation?.visible && (
          <Line
            type="monotone"
            dataKey="inflation"
            stroke={CHART_SEMANTIC.inflation}
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
