/**
 * WealthAccumulationChart
 * Extracted from page.tsx — memoized chart for default wealth accumulation view.
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
import type { ChartDataPoint } from '@/types/calculator';
import { CHART_COLORS, CHART_SEMANTIC, getTooltipStyles } from '@/lib/chartColors';

const ComposedChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.ComposedChart })),
  { ssr: false }
);

export interface WealthChartProps {
  data: ChartDataPoint[];
  showP10: boolean;
  showP90: boolean;
  isDarkMode: boolean;
  fmt: (n: number) => string;
}

export const WealthAccumulationChart = React.memo<WealthChartProps>(({ data, showP10, showP90, fmt }) => {
  const tooltipStyles = getTooltipStyles();

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <defs>
          <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_SEMANTIC.nominal} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={CHART_SEMANTIC.nominal} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_SEMANTIC.real} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={CHART_SEMANTIC.real} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="year" className="text-sm" />
        <YAxis tickFormatter={(v) => fmt(v as number)} className="text-sm" />
        <RTooltip
          formatter={(v) => fmt(v as number)}
          labelFormatter={(l) => `Year ${l}`}
          contentStyle={tooltipStyles.contentStyle}
          labelStyle={tooltipStyles.labelStyle}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="bal"
          stroke={CHART_SEMANTIC.nominal}
          strokeWidth={3}
          dot={false}
          name="Nominal (50th Percentile)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="real"
          stroke={CHART_SEMANTIC.real}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          name="Real (50th Percentile)"
          isAnimationActive={false}
        />
        {showP10 && (
          <Line
            type="monotone"
            dataKey="p10"
            stroke={CHART_SEMANTIC.p10}
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={false}
            name="10th Percentile (Nominal)"
          />
        )}
        {showP90 && (
          <Line
            type="monotone"
            dataKey="p90"
            stroke={CHART_SEMANTIC.p90}
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={false}
            name="90th Percentile (Nominal)"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
});

WealthAccumulationChart.displayName = 'WealthAccumulationChart';
