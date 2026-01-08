"use client"

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle2, AlertCircle } from "lucide-react";

export interface RiskSummaryCardProps {
  baseSuccessRate?: number;
  currentScenario: {
    name: string;
    description: string;
    successRate?: number;
    eolWealth?: number;
    withdrawalAmount?: number;
  };
  showComparison?: boolean;
}

/**
 * RiskSummaryCard - Shows risk metrics and success rates for stress testing
 * Displays base case vs current scenario comparison
 */
export const RiskSummaryCard = React.memo(function RiskSummaryCard({
  baseSuccessRate,
  currentScenario,
  showComparison = true
}: RiskSummaryCardProps) {
  const successRate = currentScenario.successRate ?? 100;
  const baseRate = baseSuccessRate ?? 100;
  const difference = successRate - baseRate;

  // Determine risk level based on success rate
  const getRiskLevel = (rate: number) => {
    if (rate >= 95) return { label: "Low Risk", color: "text-green-600 dark:text-green-400", icon: CheckCircle2 };
    if (rate >= 85) return { label: "Moderate Risk", color: "text-yellow-600 dark:text-yellow-400", icon: AlertCircle };
    if (rate >= 70) return { label: "Elevated Risk", color: "text-orange-600 dark:text-orange-400", icon: AlertTriangle };
    return { label: "High Risk", color: "text-red-600 dark:text-red-400", icon: AlertTriangle };
  };

  const currentRisk = getRiskLevel(successRate);
  const baseRisk = getRiskLevel(baseRate);
  const RiskIcon = currentRisk.icon;
  const BaseRiskIcon = baseRisk.icon;

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiskIcon className={`h-5 w-5 ${currentRisk.color}`} />
          Risk Summary
        </CardTitle>
        <CardDescription>
          Plan success rate and scenario comparison
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Scenario */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Current Scenario</h4>
            <Badge variant={successRate >= 85 ? "default" : "destructive"}>
              {currentScenario.name}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{currentScenario.description}</p>

          <div className="grid grid-cols-1 gap-3">
            {/* Success Rate */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
                <div className={`text-2xl font-bold ${currentRisk.color}`}>
                  {successRate.toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className={currentRisk.color}>
                  {currentRisk.label}
                </Badge>
              </div>
            </div>

            {/* Additional Metrics */}
            {currentScenario.eolWealth !== undefined && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">End-of-Life Wealth (real)</div>
                  <div className="text-lg font-semibold">
                    ${Math.round(currentScenario.eolWealth).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {currentScenario.withdrawalAmount !== undefined && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Annual Withdrawal (real)</div>
                  <div className="text-lg font-semibold">
                    ${Math.round(currentScenario.withdrawalAmount).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Base Case Comparison */}
        {showComparison && baseSuccessRate !== undefined && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Comparison to Base Case</h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <BaseRiskIcon className={`h-4 w-4 ${baseRisk.color}`} />
                  <div>
                    <div className="text-xs text-muted-foreground">Base Case</div>
                    <div className="text-sm font-semibold">{baseRate.toFixed(1)}%</div>
                  </div>
                </div>
                <Badge variant="outline">{baseRisk.label}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  {difference >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Difference</div>
                    <div className={`text-sm font-semibold ${
                      difference >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {difference >= 0 ? '+' : ''}{difference.toFixed(1)}%
                    </div>
                  </div>
                </div>
                {Math.abs(difference) < 5 ? (
                  <Badge variant="outline">Similar</Badge>
                ) : difference < 0 ? (
                  <Badge variant="destructive">Worse</Badge>
                ) : (
                  <Badge variant="default">Better</Badge>
                )}
              </div>
            </div>

            {/* Risk Interpretation */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-muted-foreground">
                {difference < -10 && (
                  <><strong>High Impact:</strong> This scenario significantly reduces your plan's success rate. Consider mitigation strategies.</>
                )}
                {difference >= -10 && difference < -5 && (
                  <><strong>Moderate Impact:</strong> This scenario has a noticeable effect on your plan's reliability.</>
                )}
                {difference >= -5 && difference < 5 && (
                  <><strong>Low Impact:</strong> Your plan remains relatively stable under this scenario.</>
                )}
                {difference >= 5 && (
                  <><strong>Positive Impact:</strong> This scenario improves your plan's success rate.</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* No Comparison Available */}
        {showComparison && baseSuccessRate === undefined && (
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground italic">
              Run a base case calculation first to see scenario comparisons.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
