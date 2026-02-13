"use client"

import React, { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { RiskSummaryCard } from "@/components/calculator/RiskSummaryCard";
import { RecalculateButton } from "@/components/calculator/RecalculateButton";
import { ScenarioComparisonChart } from "@/components/calculator/charts";
import { BEAR_MARKET_SCENARIOS, type BearMarketScenario } from "@/lib/simulation/bearMarkets";
import { INFLATION_SHOCK_SCENARIOS, type InflationShockScenario } from "@/lib/simulation/inflationShocks";
import type { CalculationResult, ComparisonData } from "@/types/calculator";
import type { ReturnMode } from "@/types/planner";
import { fmt } from "@/lib/utils";

export interface ScenariosTabProps {
  // Results
  res: CalculationResult | null;
  retMode: ReturnMode;
  retRate: number;

  // Stress Test State
  showStressTests: boolean;
  setShowStressTests: (value: boolean) => void;
  historicalYear: number | null;
  setHistoricalYear: (value: number | null) => void;
  inflationShockRate: number;
  setInflationShockRate: (value: number) => void;
  inflationShockDuration: number;
  setInflationShockDuration: (value: number) => void;

  // Comparison Mode
  comparisonMode: boolean;
  setComparisonMode: (value: boolean) => void;
  comparisonData: ComparisonData;
  runComparison: () => void;
  runRandomComparison: () => void;

  // Display
  isDarkMode: boolean;
  isLoadingAi: boolean;

  // Actions
  onCalculate: () => void;
}

export function ScenariosTab({
  res, retMode, retRate,
  showStressTests, setShowStressTests,
  historicalYear, setHistoricalYear,
  inflationShockRate, setInflationShockRate,
  inflationShockDuration, setInflationShockDuration,
  comparisonMode, setComparisonMode, comparisonData,
  runComparison, runRandomComparison,
  isDarkMode, isLoadingAi, onCalculate
}: ScenariosTabProps) {
  if (!res) return null;

  return (
    <>
      {/* Risk Summary Card */}
      <AnimatedSection animation="fade-in" delay={200}>
        <RiskSummaryCard
          baseSuccessRate={res.probRuin !== undefined ? (1 - res.probRuin) * 100 : undefined}
          currentScenario={{
            name: retMode === 'fixed' ? 'Fixed Returns' : 'Historical Bootstrap',
            description: retMode === 'fixed'
              ? `Assumes constant ${retRate}% annual return`
              : 'Based on historical market data (1928-2024)',
            successRate: res.probRuin !== undefined ? (1 - res.probRuin) * 100 : 100,
            eolWealth: res.eolReal,
            withdrawalAmount: res.wdReal
          }}
          showComparison={false}
        />
      </AnimatedSection>

      <AnimatedSection animation="slide-up" delay={275}>
        <div className="print:hidden">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Portfolio Stress Tests</CardTitle>
                  <CardDescription>Test your retirement plan against adverse market conditions, inflation shocks, and compare scenarios</CardDescription>
                </div>
                <Button
                  variant={showStressTests ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowStressTests(!showStressTests)}
                  className="no-print"
                >
                  {showStressTests ? "Hide" : "Show"}
                </Button>
              </div>
            </CardHeader>
            {showStressTests && (
              <CardContent>
                <Tabs defaultValue="bear" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="bear">Bear Markets</TabsTrigger>
                    <TabsTrigger value="inflation">Inflation Shocks</TabsTrigger>
                    <TabsTrigger value="comparison">Comparison</TabsTrigger>
                  </TabsList>

                  {/* Bear Market Tab */}
                  <TabsContent value="bear" className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold">Bear Market Retirement Scenarios</h3>
                      <p className="text-sm text-muted-foreground">Test your plan with actual historical returns from major market crashes</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Test your plan against the worst bear markets in history. Each scenario uses <strong>actual sequential S&P 500 returns</strong> from that year forward.
                      {historicalYear && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded text-xs font-semibold">
                          Currently using {historicalYear} returns
                        </span>
                      )}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {BEAR_MARKET_SCENARIOS.map((scenario) => (
                        <button
                          key={scenario.year}
                          onClick={() => setHistoricalYear(scenario.year)}
                          className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-lg hover:scale-[1.02] ${
                            historicalYear === scenario.year
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-100 dark:bg-blue-950 ring-2 ring-blue-400'
                              : scenario.risk === 'extreme'
                              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:border-red-400'
                              : scenario.risk === 'high'
                              ? 'border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 hover:border-orange-400'
                              : 'border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 hover:border-yellow-400'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-sm">{scenario.year} - {scenario.label}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                              scenario.risk === 'extreme'
                                ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'
                                : scenario.risk === 'high'
                                ? 'bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-100'
                                : 'bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'
                            }`}>
                              {scenario.firstYear}
                            </span>
                          </div>
                          {historicalYear === scenario.year && (
                            <div className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700">
                              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Active scenario</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {historicalYear && (
                        <>
                          <Button
                            onClick={onCalculate}
                            variant="default"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Recalculate
                          </Button>
                          <Button
                            onClick={() => setHistoricalYear(null)}
                            variant="outline"
                            size="sm"
                          >
                            Clear Scenario
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">Understanding Sequence-of-Returns Risk</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        These scenarios show why <strong>when you retire matters</strong>. Retiring into a bear market can permanently damage your portfolio even if markets recover later.
                        Click any scenario above to recalculate using actual historical returns from that year.
                      </p>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                          <strong>Your Monte Carlo simulation already accounts for this!</strong> By running 1,000 scenarios with different return sequences,
                          it includes outcomes similar to these historical periods.
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Inflation Shock Tab */}
                  <TabsContent value="inflation" className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold">Inflation Shock Scenarios</h3>
                      <p className="text-sm text-muted-foreground">Test your plan against periods of elevated inflation</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Model the impact of sustained high inflation on your real purchasing power.
                      {inflationShockRate > 0 && (
                        <span className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 rounded text-xs font-semibold">
                          {inflationShockRate}% inflation for {inflationShockDuration} years active
                        </span>
                      )}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {INFLATION_SHOCK_SCENARIOS.map((scenario) => (
                        <button
                          key={`${scenario.rate}-${scenario.duration}`}
                          onClick={() => {
                            setInflationShockRate(scenario.rate);
                            setInflationShockDuration(scenario.duration);
                          }}
                          className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-lg hover:scale-[1.02] ${
                            inflationShockRate === scenario.rate && inflationShockDuration === scenario.duration
                              ? 'border-orange-500 dark:border-orange-400 bg-orange-100 dark:bg-orange-950 ring-2 ring-orange-400'
                              : scenario.risk === 'extreme'
                              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:border-red-400'
                              : scenario.risk === 'high'
                              ? 'border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 hover:border-orange-400'
                              : 'border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 hover:border-yellow-400'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-sm">{scenario.label}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                              scenario.risk === 'extreme'
                                ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'
                                : scenario.risk === 'high'
                                ? 'bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-100'
                                : 'bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'
                            }`}>
                              {scenario.rate}%
                            </span>
                          </div>
                          {inflationShockRate === scenario.rate && inflationShockDuration === scenario.duration && (
                            <div className="mt-2 pt-2 border-t border-orange-300 dark:border-orange-700">
                              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Active scenario</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="mb-4 p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-semibold mb-3">Custom Inflation Scenario</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Inflation Rate (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={inflationShockRate}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) setInflationShockRate(Math.max(0, Math.min(20, val)));
                              else if (e.target.value === '') setInflationShockRate(0);
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Duration (years)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={inflationShockDuration}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) setInflationShockDuration(Math.max(1, Math.min(10, val)));
                              else if (e.target.value === '') setInflationShockDuration(1);
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {inflationShockRate > 0 && (
                        <>
                          <Button
                            onClick={onCalculate}
                            variant="default"
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Recalculate
                          </Button>
                          <Button
                            onClick={() => setInflationShockRate(0)}
                            variant="outline"
                            size="sm"
                          >
                            Clear Scenario
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">Understanding Inflation Risk</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        High inflation early in retirement can be devastating to your purchasing power.
                        <strong> Real wealth</strong> (what you can actually buy) may decline significantly.
                      </p>
                    </div>

                    <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
                          <strong>Can be combined with bear markets!</strong> Activate both an inflation shock and a bear market scenario to model compound stress.
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Scenario Comparison Tab */}
                  <TabsContent value="comparison" className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold">Scenario Comparison</h3>
                      <p className="text-sm text-muted-foreground">Compare baseline vs bear market vs inflation shock side-by-side</p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                          <strong>Comparison Mode Active:</strong> Select a bear market and/or inflation shock above, then click "Refresh Comparison" to update the chart.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Baseline Scenario */}
                      <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <h4 className="font-semibold text-sm">Baseline</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your plan with current assumptions (no shocks)
                        </p>
                      </div>

                      {/* Bear Market Scenario */}
                      <div className={`p-4 border-2 rounded-lg ${
                        historicalYear
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${historicalYear ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                          <h4 className="font-semibold text-sm">
                            {historicalYear
                              ? BEAR_MARKET_SCENARIOS.find(s => s.year === historicalYear)?.label
                              : 'No Bear Market'}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {historicalYear
                            ? `${historicalYear} crash applied`
                            : 'Select a bear market scenario above'}
                        </p>
                      </div>

                      {/* Inflation Shock Scenario */}
                      <div className={`p-4 border-2 rounded-lg ${
                        inflationShockRate > 0
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                          : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${inflationShockRate > 0 ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                          <h4 className="font-semibold text-sm">
                            {inflationShockRate > 0
                              ? `${inflationShockRate}% Inflation`
                              : 'No Inflation Shock'}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {inflationShockRate > 0
                            ? `${inflationShockDuration} years of elevated inflation`
                            : 'Select an inflation shock above'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center gap-3">
                      <Button
                        onClick={() => {
                          setComparisonMode(true);
                          runComparison();
                        }}
                        variant="default"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Refresh Comparison
                      </Button>
                      <Button
                        onClick={runRandomComparison}
                        variant="outline"
                        size="sm"
                        className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-950/20"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Random Comparison
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            )}
          </Card>
        </div>
      </AnimatedSection>

      {/* Comparison Chart */}
      {comparisonMode && comparisonData.baseline?.data && comparisonData.baseline.data.length > 0 && (
        <AnimatedSection animation="slide-up" delay={300}>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Scenario Comparison Chart</CardTitle>
              <CardDescription>Compare baseline, bear market, and inflation shock scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-block">
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <ScenarioComparisonChart
                    data={comparisonData.baseline.data}
                    comparisonData={comparisonData}
                    isDarkMode={isDarkMode}
                    fmt={fmt}
                  />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      )}

      {/* Recalculate Button */}
      <div className="flex justify-center mt-6">
        <RecalculateButton onClick={onCalculate} isCalculating={isLoadingAi} />
      </div>
    </>
  );
}
