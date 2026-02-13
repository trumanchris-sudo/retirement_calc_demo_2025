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
import {
  ChartAnimationProvider,
  ChartAnimationStyles,
  AnimatedLine,
  AnimatedGrid,
  AnimatedTooltip,
  AnimatedLegend,
  AnimatedXAxis,
  AnimatedYAxis,
} from "@/components/calculator/ChartAnimations";

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
  ({ data, showP10, showP90, isDarkMode, fmt }) => {
    // Mobile-responsive height
    const [chartHeight, setChartHeight] = React.useState(400);

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
    <ChartAnimationProvider data={data} config={{ duration: 800 }}>
      <ChartAnimationStyles />
      <div className="chart-container-animated">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <AnimatedGrid strokeDasharray="3 3" pulseOnDataChange={true} />
            <XAxis dataKey="year" className="text-sm" />
            <YAxis tickFormatter={(v) => fmt(v as number)} className="text-sm" />
            <AnimatedTooltip
              formatter={(v) => fmt(v)}
              animationDuration={200}
            />
            <AnimatedLegend animationDuration={400} hoverScale={1.05} />
            <AnimatedLine
              type="monotone"
              dataKey="bal"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
              name="Nominal (50th Percentile)"
              animationDuration={1200}
              animationDelay={0}
            />
            <AnimatedLine
              type="monotone"
              dataKey="real"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Real (50th Percentile)"
              animationDuration={1200}
              animationDelay={200}
            />
            {showP10 && (
              <AnimatedLine
                type="monotone"
                dataKey="p10"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                name="10th Percentile (Nominal)"
                animationDuration={1200}
                animationDelay={400}
              />
            )}
            {showP90 && (
              <AnimatedLine
                type="monotone"
                dataKey="p90"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                name="90th Percentile (Nominal)"
                animationDuration={1200}
                animationDelay={600}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartAnimationProvider>
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
  ({ data, comparisonData, isDarkMode, fmt }) => {
    const [isMobile, setIsMobile] = React.useState(false);

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
      <ChartAnimationProvider data={combinedData} config={{ duration: 800 }}>
        <ChartAnimationStyles />
        <div className="chart-container-animated">
          <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
            <ComposedChart data={combinedData}>
              <AnimatedGrid strokeDasharray="3 3" pulseOnDataChange={true} />
              <XAxis dataKey="year" className="text-sm" />
              <YAxis tickFormatter={(v) => fmt(v as number)} className="text-sm" />
              <AnimatedTooltip
                formatter={(v) => fmt(v)}
                animationDuration={200}
              />
              <AnimatedLegend animationDuration={400} hoverScale={1.05} />
              <AnimatedLine
                type="monotone"
                dataKey="baseline"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                name="Baseline (Real)"
                animationDuration={1200}
                animationDelay={0}
              />
              {comparisonData.bearMarket?.visible && (
                <AnimatedLine
                  type="monotone"
                  dataKey="bearMarket"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name={comparisonData.bearMarket.label || "Bear Market"}
                  animationDuration={1200}
                  animationDelay={300}
                />
              )}
              {comparisonData.inflation?.visible && (
                <AnimatedLine
                  type="monotone"
                  dataKey="inflation"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name={comparisonData.inflation.label || "Inflation Shock"}
                  animationDuration={1200}
                  animationDelay={600}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartAnimationProvider>
    );
  }
);

ScenarioComparisonChart.displayName = "ScenarioComparisonChart";
