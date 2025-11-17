"use client"

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar, Info, AlertCircle } from "lucide-react";
import type { RothConversionResult } from "@/types/planner";

interface RothConversionOptimizerProps {
  rothResult: RothConversionResult | null;
  isCalculating?: boolean;
}

export function RothConversionOptimizer({ rothResult, isCalculating }: RothConversionOptimizerProps) {
  if (isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600 animate-pulse" />
            Roth Conversion Optimizer
          </CardTitle>
          <CardDescription>
            Calculating optimal Roth conversion strategy...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Analyzing tax-efficient conversion opportunities...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rothResult) {
    return null;
  }

  // No recommendation case
  if (!rothResult.hasRecommendation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-600" />
            Roth Conversion Optimizer
          </CardTitle>
          <CardDescription>
            Strategic tax-efficient Roth conversion analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  No Recommendation Available
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {rothResult.reason || "Unable to generate Roth conversion recommendation for your situation."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Has recommendation - display full analysis
  const {
    conversions = [],
    conversionWindow,
    totalConverted = 0,
    avgAnnualConversion = 0,
    lifetimeTaxSavings = 0,
    baselineLifetimeTax = 0,
    optimizedLifetimeTax = 0,
    rmdReduction = 0,
    rmdReductionPercent = 0,
    effectiveRateImprovement = 0,
    targetBracket = 0.24,
    targetBracketLimit = 0,
  } = rothResult;

  const bracketLabel = `${(targetBracket * 100).toFixed(0)}%`;
  const taxSavingsPercent = baselineLifetimeTax > 0
    ? ((lifetimeTaxSavings / baselineLifetimeTax) * 100).toFixed(1)
    : "0.0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-purple-600" />
          Roth Conversion Optimizer
        </CardTitle>
        <CardDescription>
          Strategic tax-efficient conversion plan to minimize lifetime taxes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Recommendation */}
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                Recommended Strategy
              </div>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Convert <strong>${avgAnnualConversion.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year</strong>{" "}
                from age <strong>{conversionWindow?.startAge}</strong> to <strong>{conversionWindow?.endAge}</strong>{" "}
                (before RMDs start at 73). This fills the {bracketLabel} tax bracket and could save{" "}
                <strong>${lifetimeTaxSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>{" "}
                in lifetime taxes.
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
            <div className="text-sm text-green-700 dark:text-green-400 mb-1">Lifetime Tax Savings</div>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              ${(lifetimeTaxSavings / 1000).toFixed(0)}k
            </div>
            <div className="text-xs text-green-700 dark:text-green-400 mt-1">
              {taxSavingsPercent}% reduction
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
            <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">Total to Convert</div>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              ${(totalConverted / 1000).toFixed(0)}k
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Over {conversionWindow?.years} years
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
            <div className="text-sm text-orange-700 dark:text-orange-400 mb-1">RMD Reduction</div>
            <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
              {rmdReductionPercent.toFixed(0)}%
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-400 mt-1">
              ${(rmdReduction / 1000).toFixed(0)}k less RMDs
            </div>
          </div>
        </div>

        {/* Comparison Bars */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Lifetime Tax Comparison
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">No Conversions (Baseline)</span>
              <Badge variant="outline">${(baselineLifetimeTax / 1000).toFixed(0)}k</Badge>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-400 to-red-500 h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500"
                style={{ width: "100%" }}
              >
                ${(baselineLifetimeTax / 1000).toFixed(0)}k
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">With Strategic Conversions</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ${(optimizedLifetimeTax / 1000).toFixed(0)}k
              </Badge>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500"
                style={{ width: `${(optimizedLifetimeTax / baselineLifetimeTax) * 100}%` }}
              >
                ${(optimizedLifetimeTax / 1000).toFixed(0)}k
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Schedule */}
        {conversions.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Recommended Conversion Schedule</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {conversions.slice(0, 10).map((conv, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm pb-2 border-b border-gray-200 dark:border-gray-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Age {conv.age}</Badge>
                      <span className="text-muted-foreground">Convert:</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        ${conv.conversionAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Tax: ${conv.tax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                ))}
                {conversions.length > 10 && (
                  <div className="text-xs text-center text-muted-foreground pt-2">
                    ...and {conversions.length - 10} more years
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Strategy Explanation */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Why This Works
              </div>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>
                  <strong>Fill low brackets now:</strong> Convert at {bracketLabel} before RMDs force you into higher brackets (32%+)
                </li>
                <li>
                  <strong>Tax-free growth:</strong> Converted amounts grow tax-free in Roth for life
                </li>
                <li>
                  <strong>No RMDs on Roth:</strong> Reduces forced distributions and future tax burden
                </li>
                <li>
                  <strong>Estate planning:</strong> Heirs inherit Roth IRA tax-free (no income tax on distributions)
                </li>
                <li>
                  <strong>Flexibility:</strong> Roth withdrawals don't affect IRMAA (Medicare surcharges) or SS taxation
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Implementation Steps */}
        <div className="border-t pt-4 space-y-2">
          <div className="text-sm font-medium">How to Implement:</div>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>
              <strong>Start conversions in year 1 of retirement</strong> (or whenever you're in lower tax brackets)
            </li>
            <li>
              <strong>Calculate annual taxable income</strong> - Include SS, pensions, investment income, withdrawals
            </li>
            <li>
              <strong>Determine bracket capacity</strong> - How much room until you hit the next bracket?
            </li>
            <li>
              <strong>Convert to fill the bracket</strong> - Work with your tax advisor to execute conversion
            </li>
            <li>
              <strong>Pay conversion taxes from taxable accounts</strong> - Don't use IRA funds to pay the tax
            </li>
            <li>
              <strong>Repeat annually until age 72</strong> - Stop before RMDs start at 73
            </li>
          </ol>
        </div>

        {/* Important Note */}
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Important Considerations
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                This analysis assumes constant growth and tax rates. Actual conversions should be reviewed annually with a tax professional.
                Consider state taxes, IRMAA thresholds, ACA subsidies, and other factors specific to your situation. The 5-year rule applies
                to Roth conversions - converted amounts must age 5 years before penalty-free withdrawal (if under 59½).
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
