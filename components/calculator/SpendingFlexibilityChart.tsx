"use client"

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Info } from "lucide-react";
import type { GuardrailsResult } from "@/types/planner";

interface SpendingFlexibilityChartProps {
  guardrailsResult: GuardrailsResult | null;
  isCalculating?: boolean;
}

export function SpendingFlexibilityChart({ guardrailsResult, isCalculating }: SpendingFlexibilityChartProps) {
  const [spendingReduction] = useState(10); // Default 10% reduction

  if (isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600 animate-pulse" />
            Spending Flexibility Impact
          </CardTitle>
          <CardDescription>
            Calculating how spending guardrails improve success rate...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Analyzing spending flexibility strategies...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!guardrailsResult) {
    return null;
  }

  const { baselineSuccessRate, newSuccessRate, improvement, preventableFailures, totalFailures } = guardrailsResult;
  const baselinePercent = baselineSuccessRate * 100;
  const newPercent = newSuccessRate * 100;
  const improvementPercent = improvement * 100;

  // No failures = no need for guardrails
  if (totalFailures === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Spending Flexibility Impact Analysis
        </CardTitle>
        <CardDescription>
          How reducing spending during market downturns improves your retirement success
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy Explanation */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Spending Guardrails Strategy
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                When your portfolio experiences a significant drawdown (20%+ below peak), reduce spending by{" "}
                <strong>{spendingReduction}%</strong> until the portfolio recovers. This simple flexibility can
                dramatically improve long-term success, especially during your critical early retirement years.
              </p>
            </div>
          </div>
        </div>

        {/* Success Rate Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-sm text-muted-foreground mb-1">Baseline Success Rate</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {baselinePercent.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Fixed spending strategy
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
            <div className="text-sm text-green-700 dark:text-green-400 mb-1">With Spending Guardrails</div>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {newPercent.toFixed(1)}%
            </div>
            <div className="text-xs text-green-700 dark:text-green-400 mt-1">
              {spendingReduction}% reduction during downturns
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-900 flex flex-col justify-center">
            <div className="text-sm text-emerald-700 dark:text-emerald-400 mb-1">Improvement</div>
            <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              +{improvementPercent.toFixed(1)}%
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              {preventableFailures} failures prevented
            </div>
          </div>
        </div>

        {/* Visual Progress Bars */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Fixed Spending</span>
              <Badge variant="outline">{baselinePercent.toFixed(1)}%</Badge>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
              <div
                className="bg-gradient-to-r from-gray-400 to-gray-500 h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500"
                style={{ width: `${baselinePercent}%` }}
              >
                {baselinePercent >= 15 && `${baselinePercent.toFixed(0)}%`}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Flexible Spending (Guardrails)</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {newPercent.toFixed(1)}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500"
                style={{ width: `${newPercent}%` }}
              >
                {newPercent >= 15 && `${newPercent.toFixed(0)}%`}
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Guidance */}
        <div className="border-t pt-4 space-y-2">
          <div className="text-sm font-medium">How to Implement Spending Guardrails:</div>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              <strong>Monitor your portfolio quarterly</strong> - Track current value vs historical peak
            </li>
            <li>
              <strong>Trigger at 20% drawdown</strong> - When portfolio drops 20%+ below peak, activate guardrails
            </li>
            <li>
              <strong>Reduce discretionary spending {spendingReduction}%</strong> - Cut travel, dining out, entertainment (not essentials)
            </li>
            <li>
              <strong>Resume normal spending</strong> - Once portfolio recovers to within 5% of peak
            </li>
            <li>
              <strong>Most critical in early years</strong> - First 10 years of retirement are most vulnerable
            </li>
          </ul>
        </div>

        {/* Key Insight */}
        {improvementPercent >= 5 && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                  Significant Impact Detected
                </div>
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  Spending flexibility could prevent <strong>{preventableFailures}</strong> out of{" "}
                  <strong>{totalFailures}</strong> portfolio failures. This {improvementPercent.toFixed(1)}% improvement
                  in success rate demonstrates that you have meaningful control over your retirement outcome through
                  behavioral adjustments during market downturns.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
