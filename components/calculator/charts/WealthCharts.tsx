"use client"

import React from "react";
import dynamic from "next/dynamic";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartDataPoint, ComparisonData } from "@/types/calculator";
import { CHART_SEMANTIC, getTooltipStyles } from "@/lib/chartColors";

// Lazy load the ComposedChart for better performance
const ComposedChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.ComposedChart })),
  { ssr: false }
);

export interface WealthChartProps {
  data: ChartDataPoint[];
  showP10: boolean;
  showP90: boolean;
  isDarkMode: boolean;
  fmt: (n: number) => string;
}

/**
 * WealthAccumulationChart - Shows wealth over time with percentile bands
 * Mobile-responsive with touch-friendly tooltips
 */
export const WealthAccumulationChart = React.memo<WealthChartProps>(
  ({ data, showP10, showP90, fmt }) => {
    // Mobile-responsive height
    const [chartHeight, setChartHeight] = React.useState(400);
    const tooltipStyles = getTooltipStyles();

    React.useEffect(() => {
      const updateHeight = () => {
        // Shorter chart on mobile to leave room for controls
        setChartHeight(window.innerWidth < 640 ? 280 : 400);
      };
      updateHeight();
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }, []);

    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_SEMANTIC.nominal} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_SEMANTIC.nominal} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_SEMANTIC.real} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_SEMANTIC.real} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="year" className="text-sm" />
          <YAxis tickFormatter={(v) => fmt(v as number)} className="text-sm" />
          <RTooltip
            formatter={(v) => fmt(v as number)}
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
            isAnimationActive={true}
            animationDuration={1200}
            animationBegin={0}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="real"
            stroke={CHART_SEMANTIC.real}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Real (50th Percentile)"
            isAnimationActive={true}
            animationDuration={1200}
            animationBegin={200}
            animationEasing="ease-out"
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
              isAnimationActive={true}
              animationDuration={1200}
              animationBegin={400}
              animationEasing="ease-out"
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
              isAnimationActive={true}
              animationDuration={1200}
              animationBegin={600}
              animationEasing="ease-out"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }
);

WealthAccumulationChart.displayName = "WealthAccumulationChart";

export interface ComparisonChartProps {
  data: ChartDataPoint[];
  comparisonData: ComparisonData;
  isDarkMode: boolean;
  fmt: (n: number) => string;
}

/**
 * ScenarioComparisonChart - Shows baseline vs stress scenarios
 */
export const ScenarioComparisonChart = React.memo<ComparisonChartProps>(
  ({ data, comparisonData, fmt }) => {
    const [isMobile, setIsMobile] = React.useState(false);
    const tooltipStyles = getTooltipStyles();

    React.useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 640);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Build combined data for chart
    const combinedData = React.useMemo(() => {
      return data.map((point, index) => {
        const combined: Record<string, number | null> = {
          year: point.year,
          baseline: point.real,
        };

        if (comparisonData.bearMarket?.data?.[index]) {
          combined.bearMarket = comparisonData.bearMarket.data[index].real;
        }

        if (comparisonData.inflation?.data?.[index]) {
          combined.inflation = comparisonData.inflation.data[index].real;
        }

        return combined;
      });
    }, [data, comparisonData]);

    return (
      <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
        <ComposedChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="year" className="text-sm" />
          <YAxis tickFormatter={(v) => fmt(v as number)} className="text-sm" />
          <RTooltip
            formatter={(v) => fmt(v as number)}
            contentStyle={tooltipStyles.contentStyle}
            labelStyle={tooltipStyles.labelStyle}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke={CHART_SEMANTIC.nominal}
            strokeWidth={3}
            dot={false}
            name="Baseline (Real)"
            isAnimationActive={true}
            animationDuration={1200}
            animationBegin={0}
            animationEasing="ease-out"
          />
          {comparisonData.bearMarket?.visible && (
            <Line
              type="monotone"
              dataKey="bearMarket"
              stroke={CHART_SEMANTIC.bearMarket}
              strokeWidth={2}
              dot={false}
              name={comparisonData.bearMarket.label || "Bear Market"}
              isAnimationActive={true}
              animationDuration={1200}
              animationBegin={300}
              animationEasing="ease-out"
            />
          )}
          {comparisonData.inflation?.visible && (
            <Line
              type="monotone"
              dataKey="inflation"
              stroke={CHART_SEMANTIC.inflation}
              strokeWidth={2}
              dot={false}
              name={comparisonData.inflation.label || "Inflation Shock"}
              isAnimationActive={true}
              animationDuration={1200}
              animationBegin={600}
              animationEasing="ease-out"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }
);

ScenarioComparisonChart.displayName = "ScenarioComparisonChart";
