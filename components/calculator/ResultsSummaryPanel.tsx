'use client'

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Area,
  Rectangle,
  ResponsiveContainer,
} from "recharts";

// Lazy load heavy chart components
const AreaChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.AreaChart })),
  { ssr: false }
);
const Sankey = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.Sankey })),
  { ssr: false }
);

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { FlippingStatCard } from "@/components/calculator/StatCards";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { TabPanel } from "@/components/calculator/TabPanel";
import { DollarSignIcon, CalendarIcon, SparkleIcon, ChartLoadingFallback } from "@/components/ui/InlineIcons";
import { TrendingUpIcon } from "@/components/calculator/InputHelpers";
import { AiInsightBox } from "@/components/calculator/AiInsightBox";
import { PlanSummaryCard } from "@/components/calculator/PlanSummaryCard";
import { NextStepsCard } from "@/components/calculator/NextStepsCard";
import { fmt } from "@/lib/utils";
import type { MainTabId } from "@/components/calculator/TabNavigation";
import type { CalculationResult, SavedScenario } from "@/types/calculator";
import type { BatchSummary, ReturnMode } from "@/types/planner";
import type { SensitivityAnalysisData, SensitivityVariation } from "@/hooks/useCalculation";
import type { FilingStatus } from "@/lib/calculations/taxCalculations";
import type { EmploymentType } from "@/types/calculator";

export interface ResultsSummaryPanelProps {
  activeMainTab: MainTabId;
  isDirty: boolean;
  res: CalculationResult | null;
  calc: () => void;
  isLoadingAi: boolean;
  isRunning: boolean;
  batchSummary: BatchSummary | null;
  resultsViewMode: 'quick' | 'detailed';
  setResultsViewMode: (value: 'quick' | 'detailed') => void;
  retirementAge: number;
  total: number;
  returnMode: ReturnMode;
  retRate: number;
  inflationRate: number;
  wdRate: number;
  isDarkMode: boolean;
  askExplainQuestion: (question: string) => void;
  aiInsight: string | null;
  aiError: string | null;
  fetchAiInsight: (result: CalculationResult, olderAge: number, question: string) => Promise<void>;
  olderAgeForAnalysis: number;
  planConfigEmploymentType1: EmploymentType;
  planConfigEmploymentType2: EmploymentType | undefined;
  marital: FilingStatus;
  cPre1: number;
  cPre2: number;
  showSensitivity: boolean;
  setShowSensitivity: (value: boolean) => void;
  calculateSensitivity: () => SensitivityAnalysisData | null;
  sensitivityData: SensitivityAnalysisData | null;
  setSensitivityData: (data: SensitivityAnalysisData | null) => void;
  showScenarios: boolean;
  setShowScenarios: (value: boolean) => void;
  savedScenarios: SavedScenario[];
  selectedScenarios: Set<string>;
  setSelectedScenarios: (value: Set<string>) => void;
  showComparison: boolean;
  setShowComparison: (value: boolean) => void;
  scenarioName: string;
  setScenarioName: (value: string) => void;
  saveScenario: () => void;
  deleteScenario: (id: string) => void;
  loadScenario: (scenario: SavedScenario) => void;
}

export function ResultsSummaryPanel({
  activeMainTab,
  isDirty,
  res,
  calc,
  isLoadingAi,
  isRunning,
  batchSummary,
  resultsViewMode,
  setResultsViewMode,
  retirementAge,
  total,
  returnMode,
  retRate,
  inflationRate,
  wdRate,
  isDarkMode,
  askExplainQuestion,
  aiInsight,
  aiError,
  fetchAiInsight,
  olderAgeForAnalysis,
  planConfigEmploymentType1,
  planConfigEmploymentType2,
  marital,
  cPre1,
  cPre2,
  showSensitivity,
  setShowSensitivity,
  calculateSensitivity,
  sensitivityData,
  setSensitivityData,
  showScenarios,
  setShowScenarios,
  savedScenarios,
  selectedScenarios,
  setSelectedScenarios,
  showComparison,
  setShowComparison,
  scenarioName,
  setScenarioName,
  saveScenario,
  deleteScenario,
  loadScenario,
}: ResultsSummaryPanelProps) {
  if (!res) {
    return (
      <TabPanel id="results" activeTab={activeMainTab}>
        {null}
      </TabPanel>
    );
  }

  return (
            <TabPanel id="results" activeTab={activeMainTab}>
            {/* Dirty State Banner */}
            {isDirty && res && (
              <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                          Inputs Modified
                        </p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                          Your inputs have changed. Recalculate to see updated projections.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={calc}
                      disabled={isLoadingAi || isRunning}
                      className="flex-shrink-0"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${(isLoadingAi || isRunning) ? 'animate-spin' : ''}`} />
                      Recalculate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Plan Summary Card */}
            <div className="mb-6">
              <PlanSummaryCard result={res} batchSummary={batchSummary} />
            </div>

            {/* Next Steps Card */}
            <div className="mb-6">
              <NextStepsCard result={res} batchSummary={batchSummary} />
            </div>

            {/* View Mode Toggle */}
            <div className="flex justify-center mb-6">
              <ToggleGroup
                type="single"
                value={resultsViewMode}
                onValueChange={(value) => {
                  if (value === 'quick' || value === 'detailed') {
                    setResultsViewMode(value)
                  }
                }}
                className="bg-muted p-1 rounded-lg"
              >
                <ToggleGroupItem value="quick" className="px-6">
                  Quick View
                </ToggleGroupItem>
                <ToggleGroupItem value="detailed" className="px-6">
                  Detailed View
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Detailed View Content */}
            {resultsViewMode === 'detailed' && (
            <div className="space-y-6">
            <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <FlippingStatCard
                title="Future Balance"
                value={fmt(res.finNom)}
                sub={`At age ${retirementAge} (nominal)`}
                color="blue"
                icon={DollarSignIcon}
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">Future Balance - Details</span>
                      <span className="flip-card-icon text-xs print-hide flip-hint">Click to flip back ↻</span>
                    </div>
                    <div className="flip-card-body-details">
                      <p className="mb-4">
                        This is your projected total retirement balance at age {retirementAge} in future dollars (nominal).
                      </p>
                      <ul className="flip-card-list">
                        <li>
                          <span className="flip-card-list-label">Current Savings</span>
                          <span className="flip-card-list-value">{fmt(total)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Future Value</span>
                          <span className="flip-card-list-value">{fmt(res.finNom)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">In Today's Dollars</span>
                          <span className="flip-card-list-value">{fmt(res.finReal)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Years to Retirement</span>
                          <span className="flip-card-list-value">{res.yrsToRet} years</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Total Contributions</span>
                          <span className="flip-card-list-value">{fmt(res.totC)}</span>
                        </li>
                      </ul>
                      <p className="flip-card-details-text">
                        Includes current savings plus all contributions and growth from now until retirement,
                        accounting for mid-year contributions and {returnMode === 'fixed' ? `compounding returns at ${retRate}% annual return` : 'historical S&P 500 total-return bootstrap (1928–2024)'}.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="Today's Dollars"
                value={fmt(res.finReal)}
                sub={`At age ${retirementAge} (real)`}
                color="indigo"
                icon={TrendingUpIcon}
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">Today's Dollars - Details</span>
                      <span className="flip-card-icon text-xs print-hide flip-hint">Click to flip back ↻</span>
                    </div>
                    <div className="flip-card-body-details">
                      <p className="mb-4">
                        This is the nominal balance adjusted for inflation to show its value in today's purchasing power.
                      </p>
                      <ul className="flip-card-list">
                        <li>
                          <span className="flip-card-list-label">Future Balance (Nominal)</span>
                          <span className="flip-card-list-value">{fmt(res.finNom)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">In Today's Dollars (Real)</span>
                          <span className="flip-card-list-value">{fmt(res.finReal)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Inflation Rate</span>
                          <span className="flip-card-list-value">{inflationRate}%</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Years to Retirement</span>
                          <span className="flip-card-list-value">{res.yrsToRet} years</span>
                        </li>
                      </ul>
                      <p className="flip-card-details-text">
                        Formula: Real Value = Nominal Value ÷ (1 + {inflationRate/100})<sup>{res.yrsToRet}</sup>
                        <br/>
                        This helps you understand what your retirement savings will actually buy in terms of today's purchasing power.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="Annual Withdrawal"
                value={fmt(res.wd)}
                sub={`Year 1 (${wdRate}% rate)`}
                color="green"
                icon={CalendarIcon}
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">Withdrawal Strategy - Details</span>
                      <span className="flip-card-icon text-xs print-hide flip-hint">Click to flip back ↻</span>
                    </div>
                    <div className="flip-card-body-details">
                      <p className="mb-4">
                        This is your starting withdrawal for the first year of retirement, calculated as {wdRate}% of your total balance.
                      </p>
                      <ul className="flip-card-list">
                        <li>
                          <span className="flip-card-list-label">Future Balance</span>
                          <span className="flip-card-list-value">{fmt(res.finNom)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Withdrawal Rate</span>
                          <span className="flip-card-list-value">{wdRate}%</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Year 1 Withdrawal</span>
                          <span className="flip-card-list-value">{fmt(res.wd)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">After Taxes</span>
                          <span className="flip-card-list-value">{fmt(res.wdAfter)}</span>
                        </li>
                      </ul>
                      <p className="flip-card-details-text">
                        In all future years, this amount will be adjusted upward by the rate of inflation ({inflationRate}%) to maintain your purchasing power, regardless of market performance.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="Real After-Tax Income"
                value={fmt(res.wdReal)}
                sub="Year 1 inflation-adjusted spending"
                color="emerald"
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">Real After-Tax Income - Details</span>
                      <span className="flip-card-icon text-xs print-hide flip-hint">Click to flip back ↻</span>
                    </div>
                    <div className="flip-card-body-details">
                      <p className="mb-4">
                        This is your actual spendable income in today's dollars after paying {fmt(res.tax.tot)} in taxes on your {fmt(res.wd)} withdrawal.
                      </p>
                      <ul className="flip-card-list">
                        <li>
                          <span className="flip-card-list-label">Gross Withdrawal</span>
                          <span className="flip-card-list-value">{fmt(res.wd)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Federal Ordinary Tax</span>
                          <span className="flip-card-list-value">-{fmt(res.tax.fedOrd)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Federal Capital Gains</span>
                          <span className="flip-card-list-value">-{fmt(res.tax.fedCap)}</span>
                        </li>
                        {res.tax.niit > 0 && (
                          <li>
                            <span className="flip-card-list-label">NIIT (3.8%)</span>
                            <span className="flip-card-list-value">-{fmt(res.tax.niit)}</span>
                          </li>
                        )}
                        <li>
                          <span className="flip-card-list-label">State Tax</span>
                          <span className="flip-card-list-value">-{fmt(res.tax.state)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">After-Tax (Nominal)</span>
                          <span className="flip-card-list-value">{fmt(res.wdAfter)}</span>
                        </li>
                      </ul>
                      <p className="flip-card-details-text">
                        Taxes vary by account type: Pre-tax 401k/IRA incurs ordinary income tax, Taxable accounts incur capital gains tax, and Roth accounts are tax-free.
                      </p>
                    </div>
                  </>
                }
              />
            </div>

            {/* Lifetime Wealth Flow - Sankey Diagram (Screen only - hidden from print) */}
            <div className="print:hidden wealth-flow-block">
                <Card className="border-2 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Real Lifetime Wealth Flow Chart</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs print-hide"
                          onClick={(e) => {
                            e.stopPropagation();
                            askExplainQuestion("How can I optimize my end-of-life wealth and estate planning?");
                          }}
                        >
                          Explain This
                        </Button>
                      </CardTitle>
                      <CardDescription className="flex items-center justify-between">
                        <span>From end-of-life wealth to net inheritance (all values in today's dollars)</span>
                        {res.probRuin !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            Probability of Running Out: <span className="font-semibold">{(res.probRuin * 100).toFixed(0)}%</span>
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                {res.eolAccounts && res.eol > 0 ? (
                  <>
                    <Suspense fallback={<ChartLoadingFallback height="h-[350px]" />}>
                    <div className="wealth-flow-responsive">
                    <ResponsiveContainer width="100%" height={350}>
                      <Sankey
                        data={{
                          nodes: [
                            { name: `Taxable — ${fmt(res.eolAccounts.taxable)}` },
                            { name: `Pre-Tax — ${fmt(res.eolAccounts.pretax)}` },
                            { name: `Roth — ${fmt(res.eolAccounts.roth)}` },
                            { name: `Estate Tax — ${fmt(res.estateTax || 0)}` },
                            { name: `Net to Heirs — ${fmt(res.netEstate || res.eol)}` },
                          ],
                          links: (() => {
                            // Use eolReal for ratios since all values are in real dollars
                            const totalReal = res.eolReal || res.eol;
                            const taxRatio = (res.estateTax || 0) / totalReal;
                            const heirRatio = (res.netEstate || totalReal) / totalReal;

                            const links = [];

                            // Taxable flows (soft orange)
                            if (res.estateTax > 0 && res.eolAccounts.taxable > 0) {
                              links.push({
                                source: 0,
                                target: 3,
                                value: res.eolAccounts.taxable * taxRatio,
                                color: '#fb923c',
                                sourceName: 'Taxable',
                                targetName: 'Estate Tax'
                              });
                            }
                            if (res.eolAccounts.taxable > 0) {
                              links.push({
                                source: 0,
                                target: 4,
                                value: res.eolAccounts.taxable * heirRatio,
                                color: '#fb923c',
                                sourceName: 'Taxable',
                                targetName: 'Net to Heirs'
                              });
                            }

                            // Pre-tax flows (soft blue)
                            if (res.estateTax > 0 && res.eolAccounts.pretax > 0) {
                              links.push({
                                source: 1,
                                target: 3,
                                value: res.eolAccounts.pretax * taxRatio,
                                color: '#60a5fa',
                                sourceName: 'Pre-Tax',
                                targetName: 'Estate Tax'
                              });
                            }
                            if (res.eolAccounts.pretax > 0) {
                              links.push({
                                source: 1,
                                target: 4,
                                value: res.eolAccounts.pretax * heirRatio,
                                color: '#60a5fa',
                                sourceName: 'Pre-Tax',
                                targetName: 'Net to Heirs'
                              });
                            }

                            // Roth flows (soft green)
                            if (res.estateTax > 0 && res.eolAccounts.roth > 0) {
                              links.push({
                                source: 2,
                                target: 3,
                                value: res.eolAccounts.roth * taxRatio,
                                color: '#4ade80',
                                sourceName: 'Roth',
                                targetName: 'Estate Tax'
                              });
                            }
                            if (res.eolAccounts.roth > 0) {
                              links.push({
                                source: 2,
                                target: 4,
                                value: res.eolAccounts.roth * heirRatio,
                                color: '#4ade80',
                                sourceName: 'Roth',
                                targetName: 'Net to Heirs'
                              });
                            }

                            return links;
                          })(),
                        }}
                        width={800}
                        height={350}
                        nodeWidth={15}
                        nodePadding={15}
                        margin={{ top: 30, right: 80, bottom: 30, left: 80 }}
                        link={(props: any) => {
                          const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;

                          return (
                            <g>
                              <path
                                d={`
                                  M${sourceX},${sourceY}
                                  C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
                                `}
                                fill="none"
                                stroke={payload?.color || (isDarkMode ? '#64748b' : '#94a3b8')}
                                strokeWidth={linkWidth}
                                strokeOpacity={0.6}
                                style={{ transition: 'all 0.3s ease' }}
                                className="hover:stroke-opacity-90"
                              />
                              <title>
                                {`${payload?.sourceName} → ${payload?.targetName}\n${fmt(payload?.value || 0)} (${((payload?.value || 0) / res.eol * 100).toFixed(1)}% of total)`}
                              </title>
                            </g>
                          );
                        }}
                        node={(props: any) => {
                          const { x, y, width, height, index, payload } = props;
                          // Muted color palette
                          const colors = [
                            '#fb923c', // soft orange (Taxable)
                            '#60a5fa', // soft blue (Pre-Tax)
                            '#4ade80', // soft green (Roth)
                            '#ef4444', // muted red (Estate Tax)
                            '#10b981'  // blended green (Net to Heirs)
                          ];
                          const fill = colors[index] || (isDarkMode ? '#475569' : '#64748b');

                          // Extract label and value from payload name
                          // Format is "Label — $Value"
                          const fullName = payload?.name || '';
                          const [label, value] = fullName.split(' — ');

                          // Position text - center vertically within node
                          const textY = y + height / 2;

                          return (
                            <g>
                              <Rectangle
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                fill={fill}
                                fillOpacity={0.85}
                              />
                              {/* Node label with value - positioned adjacent to node */}
                              <text
                                x={index < 3 ? x - 10 : x + width + 10}
                                y={textY - 8}
                                textAnchor={index < 3 ? "end" : "start"}
                                dominantBaseline="middle"
                                fill={isDarkMode ? '#d1d5db' : '#374151'}
                                fontSize="13"
                                fontWeight="600"
                              >
                                {label}
                              </text>
                              {/* Dollar value below label */}
                              <text
                                x={index < 3 ? x - 10 : x + width + 10}
                                y={textY + 8}
                                textAnchor={index < 3 ? "end" : "start"}
                                dominantBaseline="middle"
                                fill={isDarkMode ? '#9ca3af' : '#6b7280'}
                                fontSize="12"
                                fontWeight="500"
                              >
                                {value}
                              </text>
                            </g>
                          );
                        }}
                      >
                        <RTooltip
                          content={({ payload }: any) => {
                            if (!payload || !payload.length) return null;
                            const data = payload[0];
                            return (
                              <div style={{
                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                borderRadius: "8px",
                                border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                padding: '8px 12px'
                              }}>
                                <p className="font-semibold">{data.payload?.name}</p>
                                <p className="text-sm">{fmt(data.value)}</p>
                              </div>
                            );
                          }}
                        />
                      </Sankey>
                    </ResponsiveContainer>
                    </div>
                    </Suspense>

                    {/* Disclaimer */}
                    <div className="pt-4 mt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold">Disclaimer:</span> This Lifetime Wealth Flow illustration attributes estate tax proportionally across all account types (taxable, pre-tax, and Roth) based on their share of the total estate. In practice, executors often choose to satisfy estate tax using taxable assets first to preserve tax-advantaged accounts like Roth IRAs. However, federal estate tax is imposed on the value of the entire estate—not on specific accounts—and the economic burden ultimately depends on your estate structure, beneficiary designations, and the tax treatment of your trust or inheritance plan (including whether a dynasty trust is used and how it is taxed). This chart is a simplified economic attribution model and should not be interpreted as guidance on which assets will or should be used to pay estate tax.
                      </p>
                    </div>

                    {/* Total RMDs if applicable */}
                    {res.totalRMDs > 0 && (
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Total RMDs (Age 73+)</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Cumulative Required Minimum Distributions
                            </p>
                          </div>
                          <p className="text-lg font-bold text-foreground">{fmt(res.totalRMDs)}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No end-of-life wealth data available.</p>
                  </div>
                )}
                    </CardContent>
                </Card>
            </div>

            <div className="print:hidden analysis-block">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <SparkleIcon className="text-blue-600" />
                      Plan Analysis
                    </CardTitle>
                    <CardDescription>Generate AI analysis of your retirement plan</CardDescription>
                  </div>
                  {res && !aiInsight && !isLoadingAi && (
                    <Button
                      onClick={async () => {
                        if (res && olderAgeForAnalysis > 0) {
                          await fetchAiInsight(res, olderAgeForAnalysis, "Please analyze my retirement plan and provide key insights and recommendations.");
                        }
                      }}
                      className="no-print whitespace-nowrap"
                    >
                      Generate
                    </Button>
                  )}
                </div>
              </CardHeader>
              {(aiInsight || isLoadingAi) && (
                <CardContent>
                  <AiInsightBox
                    insight={aiInsight ?? ''}
                    error={aiError}
                    isLoading={isLoadingAi}
                  />
                </CardContent>
              )}
            </Card>
            </div>

            {/* 2026 Income Planner CTA */}
            {res && (
              <div className="print:hidden mt-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                      <TrendingUpIcon className="w-5 h-5" />
                      Ready to Plan Your 2026 Income?
                    </CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-300">
                      Your retirement plan is complete! Now build a detailed 2026 income budget with pre-filled estimates from your calculations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Route to self-employed calculator if either person is not W-2
                      // Only check spouse employment type if married
                      const usesSelfEmployed =
                        (planConfigEmploymentType1 && planConfigEmploymentType1 !== 'w2') ||
                        (marital === 'married' && planConfigEmploymentType2 && planConfigEmploymentType2 !== 'w2');
                      const targetPath = usesSelfEmployed ? '/self-employed-2026' : '/income-2026';
                      const plannerName = usesSelfEmployed ? '2026 Self-Employed Planner' : '2026 Income Planner';

                      return (
                        <>
                          <Link href={targetPath}>
                            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                              View {plannerName} →
                            </Button>
                          </Link>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            Fields will be pre-populated based on your {fmt(cPre1 + cPre2)} annual contributions
                          </p>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Sensitivity Analysis - Hide interactive UI from print */}
            <AnimatedSection animation="slide-up" delay={200}>
              <div className="print:hidden">
              <Card data-sensitivity-section>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Which Variables Matter Most?</CardTitle>
                      <CardDescription>Impact ranking - highest to lowest</CardDescription>
                    </div>
                    <Button
                      variant={showSensitivity ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (!showSensitivity) {
                          const data = calculateSensitivity();
                          setSensitivityData(data);
                        }
                        setShowSensitivity(!showSensitivity);
                      }}
                      className="no-print"
                    >
                      {showSensitivity ? "Hide" : "Analyze"}
                    </Button>
                  </div>
                </CardHeader>
                {showSensitivity && sensitivityData && (
                  <CardContent className="print:block">
                    <p className="text-sm text-muted-foreground mb-6">
                      Variables ranked by impact on your end-of-life wealth. Focus your planning on the top factors.
                    </p>

                    {/* Impact Ranking List */}
                    <div className="space-y-4">
                      {sensitivityData.variations.map((variation: SensitivityVariation, idx: number) => {
                        const maxRange = sensitivityData.variations[0].range;
                        const impactScore = Math.min(5, Math.max(1, Math.round((variation.range / maxRange) * 5)));

                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-bold text-sm">
                                  {idx + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-foreground">{variation.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Impact range: {fmt(variation.range)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <div
                                    key={level}
                                    className={`w-3 h-6 rounded-sm ${
                                      level <= impactScore
                                        ? 'bg-blue-500 dark:bg-blue-400'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">How to Use This</h4>
                      <ul className="text-xs text-muted-foreground space-y-1.5">
                        <li>• <strong>Top-ranked variables</strong> have the biggest influence on your retirement outcome</li>
                        <li>• <strong>Impact bars (1-5)</strong> show relative importance at a glance</li>
                        <li>• Focus on optimizing the top 2-3 variables for maximum benefit</li>
                        <li>• Consider small changes to high-impact variables before big changes to low-impact ones</li>
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
              </div>
            </AnimatedSection>

            {/* Save/Compare Scenarios - Hide interactive UI from print */}
            <AnimatedSection animation="slide-up" delay={250}>
              <div className="print:hidden">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="scenarios" className="border-none">
                  <Card data-scenarios-section>
                    <AccordionTrigger className="px-6 hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                      <CardHeader className="p-0 flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <CardTitle className="text-left">Save & Compare Scenarios</CardTitle>
                            <CardDescription className="text-left">Save different retirement strategies and compare them side-by-side</CardDescription>
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowScenarios(!showScenarios);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                e.preventDefault();
                                setShowScenarios(!showScenarios);
                              }
                            }}
                            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 no-print cursor-pointer ${
                              showScenarios
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            {showScenarios ? "Hide" : `Show (${savedScenarios.length})`}
                          </div>
                        </div>
                      </CardHeader>
                    </AccordionTrigger>
                    {!showScenarios && savedScenarios.length > 0 && (
                      <div className="print-only mt-4">
                        <p className="text-sm text-muted-foreground">
                          {savedScenarios.length} saved scenario{savedScenarios.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    )}
                  <AccordionContent>
                    {(showScenarios || savedScenarios.length > 0) && (
                      <CardContent className="print:block pt-4">
                    {/* Save Current Scenario */}
                    {res && (
                      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-start gap-2 mb-3">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>Save your current calculation</strong> to compare with other strategies later.
                            To create more scenarios: adjust inputs → recalculate → save with a new name.
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <UIInput
                            id="scenario-name"
                            type="text"
                            placeholder="Give this scenario a name (e.g., 'Retire at 67', 'Max Savings')"
                            value={scenarioName}
                            onChange={(e) => setScenarioName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && scenarioName.trim()) {
                                saveScenario();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            onClick={saveScenario}
                            disabled={!scenarioName.trim()}
                            className="whitespace-nowrap"
                          >
                            💾 Save
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Saved Scenarios List */}
                    {savedScenarios.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No saved scenarios yet.</p>
                        <p className="text-xs mt-2">Run a calculation and save it above to start comparing different strategies.</p>
                      </div>
                    ) : (
                      <>
                        {/* Compare Selected Button */}
                        {savedScenarios.length >= 2 && (
                          <div className="mb-4 flex items-center gap-3">
                            <Button
                              variant={showComparison ? "default" : "outline"}
                              size="sm"
                              onClick={() => setShowComparison(!showComparison)}
                              disabled={selectedScenarios.size === 0}
                            >
                              {showComparison ? "Hide" : "Compare Selected"} ({selectedScenarios.size})
                            </Button>
                            {selectedScenarios.size > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedScenarios(new Set())}
                                className="text-xs"
                              >
                                Clear Selection
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Comparison Chart */}
                        {showComparison && selectedScenarios.size > 0 && (() => {
                          // Pre-compute selected scenarios and max values once (O(n) instead of O(n^2))
                          const selectedScenariosArray = Array.from(selectedScenarios);
                          const selectedScenarioData = selectedScenariosArray
                            .map(id => savedScenarios.find(s => s.id === id))
                            .filter((s): s is NonNullable<typeof s> => s !== undefined);

                          const maxEOL = Math.max(...selectedScenarioData.map(s => s.results.eolReal || 0));
                          const maxIncome = Math.max(...selectedScenarioData.map(s => s.results.wdReal || 0));
                          const maxBalance = Math.max(...selectedScenarioData.map(s => s.results.finReal || 0));

                          return (
                          <div className="comparison-chart mb-6 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg print:border-gray-300">
                            <h4 className="font-semibold mb-4 text-indigo-900 dark:text-indigo-100">Visual Comparison</h4>
                            <div className="space-y-4">
                              {/* EOL Wealth Comparison */}
                              <div>
                                <div className="text-xs font-medium mb-2 text-muted-foreground">End-of-Life Wealth (Real, Inflation-Adjusted)</div>
                                {selectedScenarioData.map((scenario) => {
                                  const pct = maxEOL > 0 ? (scenario.results.eolReal / maxEOL) * 100 : 0;
                                  return (
                                    <div key={scenario.id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.eolReal)}</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                                        <div
                                          className="bg-gradient-to-r from-green-500 to-emerald-600 h-6 rounded-full flex items-center justify-end px-2 transition-all"
                                          style={{ width: `${pct}%` }}
                                        >
                                          {pct > 20 && (
                                            <span className="text-xs font-semibold text-white">{pct.toFixed(0)}%</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Annual Income Comparison */}
                              <div>
                                <div className="text-xs font-medium mb-2 text-muted-foreground">Annual Retirement Income (Real, Inflation-Adjusted)</div>
                                {selectedScenarioData.map((scenario) => {
                                  const pct = maxIncome > 0 ? (scenario.results.wdReal / maxIncome) * 100 : 0;
                                  return (
                                    <div key={scenario.id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.wdReal)}</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                                        <div
                                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-6 rounded-full flex items-center justify-end px-2 transition-all"
                                          style={{ width: `${pct}%` }}
                                        >
                                          {pct > 20 && (
                                            <span className="text-xs font-semibold text-white">{pct.toFixed(0)}%</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Retirement Balance Comparison */}
                              <div>
                                <div className="text-xs font-medium mb-2 text-muted-foreground">Balance at Retirement (Real, Inflation-Adjusted)</div>
                                {selectedScenarioData.map((scenario) => {
                                  const pct = maxBalance > 0 ? (scenario.results.finReal / maxBalance) * 100 : 0;
                                  return (
                                    <div key={scenario.id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.finReal)}</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                                        <div
                                          className="bg-gradient-to-r from-purple-500 to-violet-600 h-6 rounded-full flex items-center justify-end px-2 transition-all"
                                          style={{ width: `${pct}%` }}
                                        >
                                          {pct > 20 && (
                                            <span className="text-xs font-semibold text-white">{pct.toFixed(0)}%</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          );
                        })()}

                        {/* Print Header for Scenarios */}
                        <div className="print-only print-scenario-header">
                          Saved Retirement Scenarios
                        </div>

                        {/* Comparison Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                {savedScenarios.length >= 2 && (
                                  <th className="text-left py-2 px-2 font-semibold w-8">
                                    <Checkbox
                                      checked={selectedScenarios.size === savedScenarios.length}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedScenarios(new Set(savedScenarios.map(s => s.id)));
                                        } else {
                                          setSelectedScenarios(new Set());
                                        }
                                      }}
                                    />
                                  </th>
                                )}
                                <th className="text-left py-2 px-2 font-semibold">Scenario</th>
                                <th className="text-right py-2 px-2 font-semibold">Retire Age</th>
                                <th className="text-right py-2 px-2 font-semibold">Balance @ Retirement</th>
                                <th className="text-right py-2 px-2 font-semibold">Annual Income</th>
                                <th className="text-right py-2 px-2 font-semibold">End-of-Life</th>
                                {savedScenarios.some(s => s.results.probRuin !== undefined) && (
                                  <th className="text-right py-2 px-2 font-semibold">Risk of Ruin</th>
                                )}
                                <th className="text-right py-2 px-2 font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Current Plan Row (if calculated) */}
                              {res && (
                                <tr className="border-b border-border bg-primary/5">
                                  {savedScenarios.length >= 2 && <td className="py-2 px-2"></td>}
                                  <td className="py-2 px-2 font-medium text-primary">Current Plan (unsaved)</td>
                                  <td className="text-right py-2 px-2">{retirementAge}</td>
                                  <td className="text-right py-2 px-2">{fmt(res.finReal)} <span className="text-xs text-muted-foreground">real</span></td>
                                  <td className="text-right py-2 px-2">{fmt(res.wdReal)}</td>
                                  <td className="text-right py-2 px-2">{fmt(res.eol)}</td>
                                  {savedScenarios.some(s => s.results.probRuin !== undefined) && (
                                    <td className="text-right py-2 px-2">
                                      {res.probRuin !== undefined ? `${(res.probRuin * 100).toFixed(1)}%` : '-'}
                                    </td>
                                  )}
                                  <td className="text-right py-2 px-2">-</td>
                                </tr>
                              )}
                              {/* Saved Scenarios */}
                              {savedScenarios.map((scenario) => (
                                <tr key={scenario.id} className="border-b border-border hover:bg-muted/50">
                                  {savedScenarios.length >= 2 && (
                                    <td className="py-2 px-2">
                                      <Checkbox
                                        checked={selectedScenarios.has(scenario.id)}
                                        onCheckedChange={(checked) => {
                                          const newSet = new Set(selectedScenarios);
                                          if (checked) {
                                            newSet.add(scenario.id);
                                          } else {
                                            newSet.delete(scenario.id);
                                          }
                                          setSelectedScenarios(newSet);
                                        }}
                                      />
                                    </td>
                                  )}
                                  <td className="py-2 px-2 font-medium">{scenario.name}</td>
                                  <td className="text-right py-2 px-2">{scenario.inputs.retirementAge}</td>
                                  <td className="text-right py-2 px-2">{fmt(scenario.results.finReal)} <span className="text-xs text-muted-foreground">real</span></td>
                                  <td className="text-right py-2 px-2">{fmt(scenario.results.wdReal)}</td>
                                  <td className="text-right py-2 px-2">{fmt(scenario.results.eol)}</td>
                                  {savedScenarios.some(s => s.results.probRuin !== undefined) && (
                                    <td className="text-right py-2 px-2">
                                      {scenario.results.probRuin !== undefined ? `${(scenario.results.probRuin * 100).toFixed(1)}%` : '-'}
                                    </td>
                                  )}
                                  <td className="text-right py-2 px-2">
                                    <div className="flex gap-1 justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => loadScenario(scenario)}
                                      >
                                        Load
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                        onClick={() => deleteScenario(scenario.id)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Key Insights */}
                        {savedScenarios.length >= 2 && (
                          <div className="mt-6 p-4 bg-muted rounded-lg">
                            <h4 className="text-sm font-semibold mb-2">Quick Comparison</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {(() => {
                                const allScenarios = res ? [{ name: "Current", results: { eolReal: res.eolReal, wdReal: res.wdReal, finReal: res.finReal } }, ...savedScenarios] : savedScenarios;
                                const bestEOL = allScenarios.reduce((max, s) => s.results.eolReal > max.results.eolReal ? s : max);
                                const bestIncome = allScenarios.reduce((max, s) => s.results.wdReal > max.results.wdReal ? s : max);
                                return (
                                  <>
                                    <div className="flex items-start gap-2">
                                      <span className="text-green-600 dark:text-green-400">🏆</span>
                                      <div>
                                        <strong>Highest end-of-life wealth:</strong> {bestEOL.name} ({fmt(bestEOL.results.eolReal)})
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-blue-600 dark:text-blue-400">💰</span>
                                      <div>
                                        <strong>Highest annual income:</strong> {bestIncome.name} ({fmt(bestIncome.results.wdReal)})
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                      </CardContent>
                    )}
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
              </div>
            </AnimatedSection>
            </div>
            )}

            {/* Quick View Content - Simplified */}
            {resultsViewMode === 'quick' && (
              <div className="space-y-6">
                <AnimatedSection animation="fade-in" delay={200}>
                <Card>
                  <CardHeader>
                    <CardTitle>Wealth Projection</CardTitle>
                    <CardDescription>Your projected wealth over time (inflation-adjusted)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<ChartLoadingFallback height="h-[400px]" />}>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={res.data}>
                        <defs>
                          <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="year"
                          label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Balance ($)', angle: -90, position: 'insideLeft' }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <RTooltip
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                          labelFormatter={(label) => `Year ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="real"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#wealthGradient)"
                          name="Real Balance"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    </Suspense>
                  </CardContent>
                </Card>
                </AnimatedSection>

                <p className="text-sm text-muted-foreground text-center">
                  Switch to <strong>Detailed View</strong> to see comprehensive charts, tax analysis, and advanced projections.
                </p>
              </div>
            )}

            </TabPanel>
  );
}
