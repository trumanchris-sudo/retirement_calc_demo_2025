"use client"

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown } from "lucide-react";
import type { BatchSummary } from "@/types/planner";

interface SequenceRiskChartProps {
  batchSummary: BatchSummary | null;
  retAge: number;
  age1: number;
}

interface FailureBucket {
  label: string;
  minYear: number;
  maxYear: number;
  count: number;
  percentage: number;
  age1Range: string;
}

export function SequenceRiskChart({ batchSummary, retAge, age1 }: SequenceRiskChartProps) {
  const analysis = useMemo(() => {
    if (!batchSummary || !batchSummary.allRuns) return null;

    // Extract failure years from ruined paths
    const failedPaths = batchSummary.allRuns.filter(r => r.ruined && (r.survYrs ?? 0) > 0);

    if (failedPaths.length === 0) {
      return { totalFailures: 0, buckets: [], criticalWindow: null };
    }

    // Create buckets: 1-5, 6-10, 11-15, 16-20, 21-25, 26-30, 31+
    const buckets: FailureBucket[] = [
      { label: "Years 1-5", minYear: 1, maxYear: 5, count: 0, percentage: 0, age1Range: "" },
      { label: "Years 6-10", minYear: 6, maxYear: 10, count: 0, percentage: 0, age1Range: "" },
      { label: "Years 11-15", minYear: 11, maxYear: 15, count: 0, percentage: 0, age1Range: "" },
      { label: "Years 16-20", minYear: 16, maxYear: 20, count: 0, percentage: 0, age1Range: "" },
      { label: "Years 21-25", minYear: 21, maxYear: 25, count: 0, percentage: 0, age1Range: "" },
      { label: "Years 26-30", minYear: 26, maxYear: 30, count: 0, percentage: 0, age1Range: "" },
      { label: "Years 31+", minYear: 31, maxYear: 999, count: 0, percentage: 0, age1Range: "" },
    ];

    // Count failures in each bucket
    failedPaths.forEach(path => {
      const year = path.survYrs ?? 0; // Default to 0 if undefined
      const bucket = buckets.find(b => year >= b.minYear && year <= b.maxYear);
      if (bucket) {
        bucket.count++;
      }
    });

    // Calculate percentages and age ranges
    buckets.forEach(bucket => {
      bucket.percentage = (bucket.count / failedPaths.length) * 100;
      const startAge = retAge + bucket.minYear;
      const endAge = retAge + Math.min(bucket.maxYear, 30);
      bucket.age1Range = bucket.maxYear >= 999 ? `${startAge}+` : `${startAge}-${endAge}`;
    });

    // Find critical window (bucket with highest failure count)
    const criticalBucket = buckets.reduce((max, b) => b.count > max.count ? b : max, buckets[0]);
    const criticalWindow = criticalBucket.count > 0 ? {
      label: criticalBucket.label,
      percentage: criticalBucket.percentage,
      ageRange: criticalBucket.age1Range,
    } : null;

    return {
      totalFailures: failedPaths.length,
      buckets: buckets.filter(b => b.count > 0),
      criticalWindow,
    };
  }, [batchSummary, retAge, age1]);

  if (!analysis || analysis.totalFailures === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-600" />
            Sequence of Returns Risk
          </CardTitle>
          <CardDescription>
            Analyzing when portfolio failures occur during retirement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-green-700 font-semibold mb-2">No Failures Detected</div>
            <p className="text-sm text-muted-foreground">
              Your portfolio survived all {batchSummary?.allRuns?.length.toLocaleString() || 0} Monte Carlo scenarios.
              This indicates excellent resilience against sequence of returns risk.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...analysis.buckets.map(b => b.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Sequence of Returns Risk Analysis
        </CardTitle>
        <CardDescription>
          When portfolio failures occur - identifies your most vulnerable years
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Critical Window Insight */}
        {analysis.criticalWindow && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Critical Danger Zone: {analysis.criticalWindow.label}
                </div>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>{analysis.criticalWindow.percentage.toFixed(1)}%</strong> of portfolio failures
                  occur during {analysis.criticalWindow.label.toLowerCase()} of retirement
                  (ages {analysis.criticalWindow.ageRange}). This is when your portfolio is most vulnerable
                  to market downturns.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Failure Timeline Histogram */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Failure Distribution ({analysis.totalFailures.toLocaleString()} failures across {batchSummary?.allRuns?.length.toLocaleString() || 0} simulations)
          </div>
          {analysis.buckets.map((bucket) => (
            <div key={bucket.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium min-w-[100px]">{bucket.label}</span>
                  <Badge variant="outline" className="text-xs">
                    Ages {bucket.age1Range}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {bucket.count.toLocaleString()} ({bucket.percentage.toFixed(1)}%)
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-500"
                  style={{ width: `${(bucket.count / maxCount) * 100}%` }}
                >
                  {bucket.percentage >= 10 && (
                    <span>{bucket.percentage.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key Insights */}
        <div className="border-t pt-4 space-y-2">
          <div className="text-sm font-medium">Key Insights:</div>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              Early retirement years (1-10) are most vulnerable to sequence risk
            </li>
            <li>
              Portfolio losses in the first decade can compound over time
            </li>
            <li>
              If you survive the first 10-15 years, long-term success becomes more likely
            </li>
            <li>
              Consider reducing spending during market downturns in these critical years
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
