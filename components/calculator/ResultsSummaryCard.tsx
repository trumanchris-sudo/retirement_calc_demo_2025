"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TYPOGRAPHY, METRIC_COLORS, TRANSITIONS } from "@/lib/designTokens";
import { InfoTooltip, TOOLTIP_CONTENT } from "@/components/ui/InfoTooltip";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { CalculationResult } from "@/types/calculator";
import type { BatchSummary } from "@/types/planner";

interface ResultsSummaryCardProps {
  result: CalculationResult | null;
  batchSummary: BatchSummary | null;
  className?: string;
  /** Show compact version for smaller spaces */
  compact?: boolean;
  /** Animate numbers on load */
  animate?: boolean;
}

// Format currency
const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// Format full currency
const formatFullCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

// Determine status color based on success rate
const getStatusColor = (successRate: number): "positive" | "warning" | "negative" => {
  if (successRate >= 90) return "positive";
  if (successRate >= 75) return "warning";
  return "negative";
};

// Get status label
const getStatusLabel = (successRate: number): string => {
  if (successRate >= 90) return "On Track";
  if (successRate >= 75) return "Needs Attention";
  return "At Risk";
};

/**
 * ResultsSummaryCard - Hero card showing key retirement metrics
 *
 * Provides an at-a-glance summary of retirement readiness with
 * clear visual indicators for plan health.
 */
export const ResultsSummaryCard: React.FC<ResultsSummaryCardProps> = ({
  result,
  batchSummary,
  className,
  compact = false,
  animate = true,
}) => {
  if (!result) {
    return null;
  }

  // Calculate success rate
  const successRate = batchSummary?.probRuin !== undefined
    ? (1 - batchSummary.probRuin) * 100
    : result.survYrs >= result.yrsToSim ? 100 : (result.survYrs / result.yrsToSim) * 100;

  const statusColor = getStatusColor(successRate);
  const statusLabel = getStatusLabel(successRate);
  const colors = METRIC_COLORS[statusColor];

  // Key metrics
  const metrics = [
    {
      id: "success",
      label: "Success Rate",
      value: successRate,
      format: (v: number) => `${v.toFixed(0)}%`,
      tooltip: TOOLTIP_CONTENT.successRate,
      highlight: true,
    },
    {
      id: "withdrawal",
      label: "Annual Income",
      value: result.wdAfter,
      format: formatCurrency,
      fullValue: formatFullCurrency(result.wdAfter),
      tooltip: TOOLTIP_CONTENT.afterTaxWithdrawal,
    },
    {
      id: "eol",
      label: "End-of-Life Wealth",
      value: result.eolReal,
      format: formatCurrency,
      fullValue: formatFullCurrency(result.eolReal),
      tooltip: TOOLTIP_CONTENT.endOfLifeWealth,
    },
  ];

  if (compact) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Status badge */}
            <Badge
              className={cn(
                "px-3 py-1 text-sm font-medium",
                colors.bg,
                colors.text,
                "border-0"
              )}
            >
              {statusLabel}
            </Badge>

            {/* Key metrics inline */}
            <div className="flex items-center gap-6">
              {metrics.slice(0, 2).map((metric) => (
                <div key={metric.id} className="text-right">
                  <div className="text-xs text-muted-foreground">{metric.label}</div>
                  <div className={cn("text-lg font-bold tabular-nums", TYPOGRAPHY.metricSmall)}>
                    {animate ? (
                      <AnimatedNumber
                        value={metric.value}
                        format={metric.format}
                        duration={1000}
                      />
                    ) : (
                      metric.format(metric.value)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden border-2 transition-all duration-300",
        colors.border,
        className
      )}
    >
      {/* Colored top border accent */}
      <div
        className={cn(
          "h-1 w-full",
          statusColor === "positive" && "bg-green-500",
          statusColor === "warning" && "bg-amber-500",
          statusColor === "negative" && "bg-red-500"
        )}
      />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={TYPOGRAPHY.cardTitle}>
            Your Retirement Outlook
          </CardTitle>
          <Badge
            className={cn(
              "px-3 py-1 text-sm font-semibold",
              colors.bg,
              colors.text,
              "border-0 animate-in zoom-in-50 duration-300"
            )}
          >
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Success rate hero metric */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <InfoTooltip {...TOOLTIP_CONTENT.successRate} side="top" />
          </div>
          <div
            className={cn(
              "text-5xl font-bold tabular-nums tracking-tight",
              colors.text
            )}
          >
            {animate ? (
              <AnimatedNumber
                value={successRate}
                format={(v) => `${v.toFixed(0)}%`}
                duration={1500}
              />
            ) : (
              `${successRate.toFixed(0)}%`
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {successRate >= 90
              ? "Excellent! Your plan is well-positioned for retirement."
              : successRate >= 75
                ? "Your plan is viable but could use some optimization."
                : "Consider adjustments to improve your retirement security."}
          </p>
        </div>

        {/* Success rate visual bar */}
        <div className="mb-6">
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                statusColor === "positive" && "bg-gradient-to-r from-green-400 to-green-500",
                statusColor === "warning" && "bg-gradient-to-r from-amber-400 to-amber-500",
                statusColor === "negative" && "bg-gradient-to-r from-red-400 to-red-500"
              )}
              style={{ width: animate ? `${successRate}%` : `${successRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          {metrics.slice(1).map((metric, index) => (
            <div
              key={metric.id}
              className={cn(
                "p-4 rounded-lg bg-muted/50 transition-all duration-200 hover:bg-muted",
                index === 0 && "animate-in slide-in-from-left-4 duration-500",
                index === 1 && "animate-in slide-in-from-right-4 duration-500"
              )}
              style={{ animationDelay: `${300 + index * 100}ms` }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {metric.label}
                </span>
                {metric.tooltip && (
                  <InfoTooltip {...metric.tooltip} side="top" />
                )}
              </div>
              <div className={cn("font-bold tabular-nums", TYPOGRAPHY.metricMedium)}>
                {animate ? (
                  <AnimatedNumber
                    value={metric.value}
                    format={metric.format}
                    duration={1200}
                    delay={400 + index * 100}
                  />
                ) : (
                  metric.format(metric.value)
                )}
              </div>
              {metric.fullValue && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {metric.fullValue}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Additional context */}
        {batchSummary && batchSummary.eolReal_p50 !== undefined && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Median end-of-life wealth across all scenarios:</span>
              <span className="font-medium text-foreground">
                {formatFullCurrency(batchSummary.eolReal_p50)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * MetricCard - Individual metric display card
 */
export const MetricCard: React.FC<{
  label: string;
  value: number;
  format?: (v: number) => string;
  tooltip?: { content: string; learnMoreLink?: string };
  color?: keyof typeof METRIC_COLORS;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  animate?: boolean;
}> = ({
  label,
  value,
  format = (v) => v.toLocaleString(),
  tooltip,
  color = "neutral",
  icon,
  trend,
  trendValue,
  className,
  animate = true,
}) => {
  const colors = METRIC_COLORS[color];

  return (
    <Card className={cn("overflow-hidden", colors.border, className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">
              {label}
            </span>
            {tooltip && <InfoTooltip {...tooltip} side="top" />}
          </div>
          {icon && (
            <div className={cn("p-1.5 rounded-md", colors.bg)}>
              {icon}
            </div>
          )}
        </div>
        <div className={cn("text-2xl font-bold tabular-nums", colors.text)}>
          {animate ? (
            <AnimatedNumber value={value} format={format} duration={1000} />
          ) : (
            format(value)
          )}
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-1">
            {trend === "up" && (
              <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {trend === "down" && (
              <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            <span className={cn(
              "text-xs",
              trend === "up" && "text-green-600 dark:text-green-400",
              trend === "down" && "text-red-600 dark:text-red-400",
              trend === "neutral" && "text-muted-foreground"
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
