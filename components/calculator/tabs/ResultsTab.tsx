"use client"

import React, { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SequenceRiskChart } from "@/components/calculator/SequenceRiskChart";
import { SpendingFlexibilityChart } from "@/components/calculator/SpendingFlexibilityChart";
import { WealthAccumulationChart } from "@/components/calculator/charts";
import { RMD_START_AGE } from "@/lib/constants";
import type { CalculationResult } from "@/types/calculator";
import type { WalkSeries, BatchSummary, GuardrailsResult } from "@/types/planner";
import { fmt } from "@/lib/utils";

// RMD chart components from recharts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Chart loading fallback
const ChartLoadingFallback = ({ height = "h-64" }: { height?: string }) => (
  <div className={`${height} animate-pulse bg-gray-100 dark:bg-gray-800 rounded`} />
);

export interface ResultsTabProps {
  // Results
  res: CalculationResult;
  walkSeries: WalkSeries;

  // Chart Controls
  activeChartTab: string;
  setActiveChartTab: (value: string) => void;
  showP10: boolean;
  setShowP10: (value: boolean) => void;
  showP90: boolean;
  setShowP90: (value: boolean) => void;

  // Display
  isDarkMode: boolean;

  // Batch/Monte Carlo Data
  batchSummary: BatchSummary | null;
  guardrailsResult: GuardrailsResult | null;

  // Age info for sequence risk chart
  retAge: number;
  age1: number;
}

export function ResultsTab({
  res,
  walkSeries,
  activeChartTab,
  setActiveChartTab,
  showP10,
  setShowP10,
  showP90,
  setShowP90,
  isDarkMode,
  batchSummary,
  guardrailsResult,
  retAge,
  age1
}: ResultsTabProps) {
  return (
    <>
      <AnimatedSection animation="slide-up" delay={300}>
        <div className="print-section print-block chart-container">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Projections</CardTitle>
              <CardDescription>Visualize your wealth accumulation and tax planning</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeChartTab} onValueChange={setActiveChartTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 print-hide tab-controls">
                  <TabsTrigger value="accumulation">Accumulation</TabsTrigger>
                  <TabsTrigger value="rmd">RMD Tax Bomb</TabsTrigger>
                </TabsList>

                <TabsContent value="accumulation" className="space-y-4">
                  {walkSeries === 'trulyRandom' && (
                    <div className="flex gap-6 items-center print-hide">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-p10"
                          checked={showP10}
                          onCheckedChange={(checked) => setShowP10(checked as boolean)}
                        />
                        <label
                          htmlFor="show-p10"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Show 10th Percentile (Nominal)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-p90"
                          checked={showP90}
                          onCheckedChange={(checked) => setShowP90(checked as boolean)}
                        />
                        <label
                          htmlFor="show-p90"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Show 90th Percentile (Nominal)
                        </label>
                      </div>
                    </div>
                  )}
                  {/* Wealth Accumulation Chart */}
                  {res?.data && res.data.length > 0 && (
                    <div className="chart-block">
                      <Suspense fallback={<ChartLoadingFallback height="h-[400px]" />}>
                        <WealthAccumulationChart
                          data={res.data}
                          showP10={showP10}
                          showP90={showP90}
                          isDarkMode={isDarkMode}
                          fmt={fmt}
                        />
                      </Suspense>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="rmd" className="space-y-4">
                  {res.rmdData && res.rmdData.length > 0 ? (
                    <>
                      <Suspense fallback={<ChartLoadingFallback height="h-[400px]" />}>
                        <div className="chart-block">
                          <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={res.rmdData}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="age" />
                              <YAxis tickFormatter={(v) => fmt(v as number)} />
                              <RTooltip
                                formatter={(v) => fmt(v as number)}
                                contentStyle={{
                                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                  borderRadius: "8px",
                                  border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                  color: isDarkMode ? '#f3f4f6' : '#1f2937'
                                }}
                                labelStyle={{
                                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                  fontWeight: 'bold'
                                }}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="spending"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                                name="Spending Need (after SS)"
                              />
                              <Line
                                type="monotone"
                                dataKey="rmd"
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                name="Required RMD"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Suspense>
                      <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>Tax Planning Tip:</strong> When the red dashed line (RMD) crosses above the green line (Spending),
                          you&apos;re forced to withdraw more than you need. Consider Roth conversions before age {RMD_START_AGE} to reduce future RMDs.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">No RMD data available. RMDs begin at age {RMD_START_AGE} when you have pre-tax account balances.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </AnimatedSection>

      {/* Sequence of Returns Risk Analysis */}
      {batchSummary && (
        <AnimatedSection animation="fade-in" delay={500}>
          <SequenceRiskChart
            batchSummary={batchSummary}
            retirementAge={retAge}
            age1={age1}
          />
        </AnimatedSection>
      )}

      {/* Spending Flexibility Impact Analysis */}
      {guardrailsResult && (
        <AnimatedSection animation="fade-in" delay={600}>
          <SpendingFlexibilityChart
            guardrailsResult={guardrailsResult}
          />
        </AnimatedSection>
      )}
    </>
  );
}
