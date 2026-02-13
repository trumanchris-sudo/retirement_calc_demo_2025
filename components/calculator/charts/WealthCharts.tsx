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
 */
export const WealthAccumulationChart = React.memo<WealthChartProps>(
  ({ data, showP10, showP90, isDarkMode, fmt }) => (
    <ResponsiveContainer width="100%" height={400}>
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
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="year" className="text-sm" />
        <YAxis tickFormatter={(v) => fmt(v as number)} className="text-sm" />
        <RTooltip
          formatter={(v) => fmt(v as number)}
          labelFormatter={(l) => `Year ${l}`}
          contentStyle={{
            backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
            borderRadius: "8px",
            border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            color: isDarkMode ? "#f3f4f6" : "#1f2937",
          }}
          labelStyle={{
            color: isDarkMode ? "#f3f4f6" : "#1f2937",
            fontWeight: "bold",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="bal"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={false}
          name="Nominal (50th Percentile)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="real"
          stroke="#10b981"
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
            stroke="#ef4444"
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
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={false}
            name="90th Percentile (Nominal)"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
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
      <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
        <ComposedChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="year" className="text-sm" />
          <YAxis tickFormatter={(v) => fmt(v as number)} className="text-sm" />
          <RTooltip
            formatter={(v) => fmt(v as number)}
            labelFormatter={(l) => `Year ${l}`}
            contentStyle={{
              backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
              borderRadius: "8px",
              border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              color: isDarkMode ? "#f3f4f6" : "#1f2937",
            }}
            labelStyle={{
              color: isDarkMode ? "#f3f4f6" : "#1f2937",
              fontWeight: "bold",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            name="Baseline (Real)"
            isAnimationActive={false}
          />
          {comparisonData.bearMarket?.visible && (
            <Line
              type="monotone"
              dataKey="bearMarket"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name={comparisonData.bearMarket.label || "Bear Market"}
              isAnimationActive={false}
            />
          )}
          {comparisonData.inflation?.visible && (
            <Line
              type="monotone"
              dataKey="inflation"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name={comparisonData.inflation.label || "Inflation Shock"}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }
);

ScenarioComparisonChart.displayName = "ScenarioComparisonChart";
