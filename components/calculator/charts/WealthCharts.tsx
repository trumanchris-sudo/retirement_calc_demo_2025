"use client"

import React from "react";
import dynamic from "next/dynamic";
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartDataPoint, ComparisonData } from "@/types/calculator";
import { CHART_SEMANTIC, getTooltipStyles } from "@/lib/chartColors";

// Lazy load AreaChart for better performance
const AreaChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.AreaChart })),
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
 * WealthAccumulationChart - Shows wealth over time with percentile bands.
 * Visual style matches "Two Paths Diverge": AreaChart with gradient fills
 * and a custom inline legend (no Recharts Legend overlay).
 */
export const WealthAccumulationChart = React.memo<WealthChartProps>(
  ({ data, showP10, showP90, fmt }) => {
    // Mobile-responsive height
    const [chartHeight, setChartHeight] = React.useState(400);
    const tooltipStyles = getTooltipStyles();

    React.useEffect(() => {
      const updateHeight = () => {
        setChartHeight(window.innerWidth < 640 ? 280 : 400);
      };
      updateHeight();
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }, []);

    return (
      <div className="space-y-3">
        {/* Custom inline legend — matches "Two Paths Diverge" style */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_SEMANTIC.nominal }} />
            <span className="text-muted-foreground">Nominal (50th)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_SEMANTIC.real }} />
            <span className="text-muted-foreground">Real (50th)</span>
          </div>
          {showP10 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5" style={{ backgroundColor: CHART_SEMANTIC.p10 }} />
              <span className="text-muted-foreground">10th Percentile</span>
            </div>
          )}
          {showP90 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5" style={{ backgroundColor: CHART_SEMANTIC.p90 }} />
              <span className="text-muted-foreground">90th Percentile</span>
            </div>
          )}
        </div>

        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="accBal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_SEMANTIC.nominal} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_SEMANTIC.nominal} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="accReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_SEMANTIC.real} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CHART_SEMANTIC.real} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 12 }} />
              <RTooltip
                formatter={(v) => fmt(v as number)}
                contentStyle={tooltipStyles.contentStyle}
                labelStyle={tooltipStyles.labelStyle}
              />
              <Area
                type="monotone"
                dataKey="bal"
                stroke={CHART_SEMANTIC.nominal}
                strokeWidth={2}
                fill="url(#accBal)"
                name="Nominal (50th Percentile)"
                isAnimationActive={true}
                animationDuration={1200}
                animationBegin={0}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="real"
                stroke={CHART_SEMANTIC.real}
                strokeWidth={2}
                fill="url(#accReal)"
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
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  name="10th Percentile"
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
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  name="90th Percentile"
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationBegin={600}
                  animationEasing="ease-out"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
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
 * ScenarioComparisonChart - Shows baseline vs stress scenarios.
 * Visual style matches "Two Paths Diverge": AreaChart with gradient fills
 * and a custom inline legend.
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

    const bearLabel = comparisonData.bearMarket?.label || "Bear Market";
    const inflLabel = comparisonData.inflation?.label || "Inflation Shock";

    return (
      <div className="space-y-3">
        {/* Custom inline legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_SEMANTIC.nominal }} />
            <span className="text-muted-foreground">Baseline (Real)</span>
          </div>
          {comparisonData.bearMarket?.visible && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_SEMANTIC.bearMarket }} />
              <span className="text-muted-foreground">{bearLabel}</span>
            </div>
          )}
          {comparisonData.inflation?.visible && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_SEMANTIC.inflation }} />
              <span className="text-muted-foreground">{inflLabel}</span>
            </div>
          )}
        </div>

        <div style={{ height: isMobile ? 300 : 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedData}>
              <defs>
                <linearGradient id="scBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_SEMANTIC.nominal} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_SEMANTIC.nominal} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="scBear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_SEMANTIC.bearMarket} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_SEMANTIC.bearMarket} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="scInflation" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_SEMANTIC.inflation} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_SEMANTIC.inflation} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 12 }} />
              <RTooltip
                formatter={(v) => fmt(v as number)}
                contentStyle={tooltipStyles.contentStyle}
                labelStyle={tooltipStyles.labelStyle}
              />
              <Area
                type="monotone"
                dataKey="baseline"
                stroke={CHART_SEMANTIC.nominal}
                strokeWidth={2}
                fill="url(#scBaseline)"
                name="Baseline (Real)"
                isAnimationActive={true}
                animationDuration={1200}
                animationBegin={0}
                animationEasing="ease-out"
              />
              {comparisonData.bearMarket?.visible && (
                <Area
                  type="monotone"
                  dataKey="bearMarket"
                  stroke={CHART_SEMANTIC.bearMarket}
                  strokeWidth={2}
                  fill="url(#scBear)"
                  name={bearLabel}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationBegin={300}
                  animationEasing="ease-out"
                />
              )}
              {comparisonData.inflation?.visible && (
                <Area
                  type="monotone"
                  dataKey="inflation"
                  stroke={CHART_SEMANTIC.inflation}
                  strokeWidth={2}
                  fill="url(#scInflation)"
                  name={inflLabel}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationBegin={600}
                  animationEasing="ease-out"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
);

ScenarioComparisonChart.displayName = "ScenarioComparisonChart";
