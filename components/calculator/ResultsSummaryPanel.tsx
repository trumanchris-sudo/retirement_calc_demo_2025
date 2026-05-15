'use client'

import React, { Suspense, useMemo } from "react";
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
import { CHART_SEMANTIC, SANKEY_COLORS, getTooltipStyles } from "@/lib/chartColors";
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
  // isDarkMode is accepted via props but no longer consumed here;
  // chart colors now use CSS-variable tokens from chartColors.ts.
  isDarkMode: _isDarkMode, // eslint-disable-line @typescript-eslint/no-unused-vars
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
  // Pre-compute scenario comparison data to avoid recalculation on each render
  const comparisonData = useMemo(() => {
    if (!res || savedScenarios.length === 0) return null;

    const selectedScenariosArray = Array.from(selectedScenarios);
    const selectedScenarioData = selectedScenariosArray
      .map(id => savedScenarios.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    if (selectedScenarioData.length === 0) return null;

    const maxEOL = Math.max(...selectedScenarioData.map(s => s.results.eolReal || 0));
    const maxIncome = Math.max(...selectedScenarioData.map(s => s.results.wdReal || 0));
    const maxBalance = Math.max(...selectedScenarioData.map(s => s.results.finReal || 0));

    return { selectedScenarioData, maxEOL, maxIncome, maxBalance };
  }, [savedScenarios, res, selectedScenarios]);

  const sankeyData = useMemo(() => {
    if (!res?.eolAccounts || !res.eol || res.eol <= 0) return null;

    const nodes = [
      { name: `Taxable — ${fmt(res.eolAccounts.taxable)}` },
      { name: `Pre-Tax — ${fmt(res.eolAccounts.pretax)}` },
      { name: `Roth — ${fmt(res.eolAccounts.roth)}` },
      { name: `Estate Tax — ${fmt(res.estateTax || 0)}` },
      { name: `Net to Heirs — ${fmt(res.netEstate || res.eol)}` },
    ];

    const totalReal = res.eolReal || res.eol;
    const taxRatio = (res.estateTax || 0) / totalReal;
    const heirRatio = (res.netEstate || totalReal) / totalReal;

    const links: Array<{
      source: number;
      target: number;
      value: number;
      color: string;
      sourceName: string;
      targetName: string;
    }> = [];

    // Taxable flows
    if (res.estateTax > 0 && res.eolAccounts.taxable > 0) {
      links.push({
        source: 0, target: 3,
        value: res.eolAccounts.taxable * taxRatio,
        color: SANKEY_COLORS.accounts.taxable,
        sourceName: 'Taxable', targetName: 'Estate Tax',
      });
    }
    if (res.eolAccounts.taxable > 0) {
      links.push({
        source: 0, target: 4,
        value: res.eolAccounts.taxable * heirRatio,
        color: SANKEY_COLORS.accounts.taxable,
        sourceName: 'Taxable', targetName: 'Net to Heirs',
      });
    }

    // Pre-tax flows
    if (res.estateTax > 0 && res.eolAccounts.pretax > 0) {
      links.push({
        source: 1, target: 3,
        value: res.eolAccounts.pretax * taxRatio,
        color: SANKEY_COLORS.accounts["401k"],
        sourceName: 'Pre-Tax', targetName: 'Estate Tax',
      });
    }
    if (res.eolAccounts.pretax > 0) {
      links.push({
        source: 1, target: 4,
        value: res.eolAccounts.pretax * heirRatio,
        color: SANKEY_COLORS.accounts["401k"],
        sourceName: 'Pre-Tax', targetName: 'Net to Heirs',
      });
    }

    // Roth flows
    if (res.estateTax > 0 && res.eolAccounts.roth > 0) {
      links.push({
        source: 2, target: 3,
        value: res.eolAccounts.roth * taxRatio,
        color: SANKEY_COLORS.accounts.roth,
        sourceName: 'Roth', targetName: 'Estate Tax',
      });
    }
    if (res.eolAccounts.roth > 0) {
      links.push({
        source: 2, target: 4,
        value: res.eolAccounts.roth * heirRatio,
        color: SANKEY_COLORS.accounts.roth,
        sourceName: 'Roth', targetName: 'Net to Heirs',
      });
    }

    return { nodes, links };
  }, [res]);

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

            <div className="mb-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
              <PlanSummaryCard result={res} batchSummary={batchSummary} />
              <NextStepsCard result={res} batchSummary={batchSummary} />
            </div>

            {/* View Mode Toggle */}
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold tracking-tight">Projection Details</p>
                <p className="text-xs text-muted-foreground">
                  Keep the first view focused, then drill into cards, charts, and assumptions.
                </p>
              </div>
              <ToggleGroup
                type="single"
                value={resultsViewMode}
                onValueChange={(value) => {
                  if (value === 'quick' || value === 'detailed') {
                    setResultsViewMode(value)
                  }
                }}
                className="w-full rounded-xl bg-muted p-1 sm:w-auto"
              >
                <ToggleGroupItem value="quick" className="flex-1 rounded-lg px-5 sm:flex-none">
                  Quick View
                </ToggleGroupItem>
                <ToggleGroupItem value="detailed" className="flex-1 rounded-lg px-5 sm:flex-none">
                  Detailed View
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Detailed View Content */}
            {resultsViewMode === 'detailed' && (
            <div className="space-y-6">
            <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <FlippingStatCard
                title="Projected Balance"
                value={fmt(res.finNom)}
                sub={`Estimated balance at age ${retirementAge} (nominal)`}
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
                        This is your estimated retirement balance at age {retirementAge}. Actual results will vary based on market performance, contribution changes, and other factors.
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
                          <span className="flip-card-list-label">In Today&apos;s Dollars</span>
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
                        accounting for mid-year contributions and {returnMode === 'fixed' ? `compounding returns at ${retRate}% nominal annual return (before inflation)` : 'historical S&P 500 total-return bootstrap (1928–2024)'}.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="Today's Dollars"
                value={fmt(res.finReal)}
                sub={`Estimated value at age ${retirementAge} (real)`}
                color="indigo"
                icon={TrendingUpIcon}
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">Today&apos;s Dollars - Details</span>
                      <span className="flip-card-icon text-xs print-hide flip-hint">Click to flip back ↻</span>
                    </div>
                    <div className="flip-card-body-details">
                      <p className="mb-4">
                        This is the nominal balance adjusted for inflation to show its value in today&apos;s purchasing power.
                      </p>
                      <ul className="flip-card-list">
                        <li>
                          <span className="flip-card-list-label">Future Balance (Nominal)</span>
                          <span className="flip-card-list-value">{fmt(res.finNom)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">In Today&apos;s Dollars (Real)</span>
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
                        This helps you understand what your retirement savings will actually buy in terms of today&apos;s purchasing power.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="Est. Annual Withdrawal"
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
                title="Est. After-Tax Income"
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
                        This is your actual spendable income in today&apos;s dollars after paying {fmt(res.tax.tot)} in taxes on your {fmt(res.wd)} withdrawal.
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
                            askExplainQuestion("How can I optimize my net estate and estate planning?");
                          }}
                        >
                          What Does This Mean?
                        </Button>
                      </CardTitle>
                      <CardDescription className="flex items-center justify-between">
                        <span>From end-of-life balance to net inheritance (all values in today&apos;s dollars)</span>
                        {res.probRuin !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            Risk of Outliving Savings: <span className="font-semibold">{(res.probRuin * 100).toFixed(0)}%</span>
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                {res.eolAccounts && res.eol > 0 ? (
                  <>
                    <Suspense fallback={<ChartLoadingFallback height="h-[350px]" />}>
                    <div className="wealth-flow-responsive" role="img" aria-label="Sankey diagram showing lifetime wealth flow from taxable, pre-tax, and Roth accounts to estate tax and net inheritance">
                    {/* Screen-reader-only text summary of the wealth flows */}
                    <span className="sr-only">
                      Wealth flow summary: Taxable account balance {fmt(res.eolAccounts.taxable)}, Pre-tax account balance {fmt(res.eolAccounts.pretax)}, Roth account balance {fmt(res.eolAccounts.roth)}. Estate tax: {fmt(res.estateTax || 0)}. Net to heirs: {fmt(res.netEstate || res.eol)}.
                    </span>
                    <ResponsiveContainer width="100%" height={350}>
                      <Sankey
                        data={sankeyData!}
                        width={800}
                        height={350}
                        nodeWidth={15}
                        nodePadding={15}
                        margin={{ top: 30, right: 80, bottom: 30, left: 80 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Reason: recharts Sankey link render prop has no public type export
                        link={(props: any) => {
                          const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props as { sourceX: number; targetX: number; sourceY: number; targetY: number; sourceControlX: number; targetControlX: number; linkWidth: number; payload: { color?: string; sourceName?: string; targetName?: string; value?: number } };

                          return (
                            <g>
                              <path
                                d={`
                                  M${sourceX},${sourceY}
                                  C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
                                `}
                                fill="none"
                                stroke={payload?.color || SANKEY_COLORS.neutral}
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Reason: recharts Sankey node render prop has no public type export
                        node={(props: any) => {
                          const { x, y, width, height, index, payload } = props as { x: number; y: number; width: number; height: number; index: number; payload: { name?: string } };
                          // Theme-aware color palette from chartColors
                          const colors = [
                            SANKEY_COLORS.accounts.taxable,  // Taxable
                            SANKEY_COLORS.accounts["401k"],  // Pre-Tax
                            SANKEY_COLORS.accounts.roth,     // Roth
                            SANKEY_COLORS.spending.healthcare, // Estate Tax (red)
                            SANKEY_COLORS.income.salary,     // Net to Heirs (green)
                          ];
                          const fill = colors[index] || SANKEY_COLORS.neutral;

                          // Extract label and value from payload name
                          // Format is "Label — $Value"
                          const fullName = String(payload?.name || '');
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
                                fill="hsl(var(--foreground))"
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
                                fill="hsl(var(--muted-foreground))"
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
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Reason: recharts Tooltip content callback has no exported type for Sankey
                          content={({ payload }: any) => {
                            if (!payload || !payload.length) return null;
                            const data = payload[0] as { payload?: { name?: string }; value?: number };
                            return (
                              <div style={{
                                ...getTooltipStyles().contentStyle,
                                padding: '8px 12px'
                              }}>
                                <p className="font-semibold">{data.payload?.name}</p>
                                <p className="text-sm">{fmt(data.value || 0)}</p>
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
                    <p className="text-sm">Wealth flow projection will appear after running a calculation. If this persists, try lowering your withdrawal rate or delaying retirement to build a larger end-of-life balance.</p>
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
                      Analyze My Plan
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
                      Variables ranked by impact on your net estate. Focus your planning on the top factors.
                    </p>

                    {/* Impact Ranking List */}
                    {sensitivityData.variations.every((v: SensitivityVariation) => !v.range || isNaN(v.range)) ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">All factors have equal impact. Try adjusting your inputs to see differentiated sensitivity results.</p>
                      </div>
                    ) : (
                    <div className="space-y-4">
                      {sensitivityData.variations.map((variation: SensitivityVariation, idx: number) => {
                        const safeRange = isNaN(variation.range) ? 0 : variation.range;
                        const maxRange = sensitivityData.variations[0].range;
                        const safeMaxRange = (!maxRange || isNaN(maxRange) || maxRange === 0) ? 1 : maxRange;
                        const impactScore = Math.min(5, Math.max(1, Math.round((safeRange / safeMaxRange) * 5)));

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
                                    Impact range: {isNaN(safeRange) ? 'N/A' : fmt(safeRange)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <div
                                    key={level}
                                    role="progressbar"
                                    aria-valuenow={level <= impactScore ? 100 : 0}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`${variation.label} impact level ${level} of 5${level <= impactScore ? ' (filled)' : ' (empty)'}`}
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
                    )}

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
                        <p className="text-xs mt-2">Run a calculation and save it to start comparing strategies — for example, retiring at 62 vs. 67, or saving more aggressively.</p>
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
                        {showComparison && comparisonData && (
                          <div className="comparison-chart mb-6 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg print:border-gray-300">
                            <h4 className="font-semibold mb-4 text-indigo-900 dark:text-indigo-100">Visual Comparison</h4>
                            <div className="space-y-4">
                              {/* Net Estate Comparison */}
                              <div>
                                <div className="text-xs font-medium mb-2 text-muted-foreground">Net Estate (Real, Inflation-Adjusted)</div>
                                {comparisonData.maxEOL === 0 ? (
                                  <div className="text-xs text-muted-foreground py-2">N/A -- all scenarios have $0 net estate</div>
                                ) : (
                                comparisonData.selectedScenarioData.map((scenario) => {
                                  const pct = (scenario.results.eolReal / comparisonData.maxEOL) * 100;
                                  return (
                                    <div key={scenario.id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.eolReal)}</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                                        <div
                                          role="progressbar"
                                          aria-valuenow={Math.round(pct)}
                                          aria-valuemin={0}
                                          aria-valuemax={100}
                                          aria-label={`${scenario.name} net estate: ${fmt(scenario.results.eolReal)}`}
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
                                })
                                )}
                              </div>

                              {/* Annual Income Comparison */}
                              <div>
                                <div className="text-xs font-medium mb-2 text-muted-foreground">Annual Retirement Income (Real, Inflation-Adjusted)</div>
                                {comparisonData.maxIncome === 0 ? (
                                  <div className="text-xs text-muted-foreground py-2">N/A -- all scenarios have $0 retirement income</div>
                                ) : comparisonData.selectedScenarioData.map((scenario) => {
                                  const pct = (scenario.results.wdReal / comparisonData.maxIncome) * 100;
                                  return (
                                    <div key={scenario.id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.wdReal)}</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                                        <div
                                          role="progressbar"
                                          aria-valuenow={Math.round(pct)}
                                          aria-valuemin={0}
                                          aria-valuemax={100}
                                          aria-label={`${scenario.name} annual income: ${fmt(scenario.results.wdReal)}`}
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
                                {comparisonData.maxBalance === 0 ? (
                                  <div className="text-xs text-muted-foreground py-2">N/A -- all scenarios have $0 retirement balance</div>
                                ) : comparisonData.selectedScenarioData.map((scenario) => {
                                  const pct = (scenario.results.finReal / comparisonData.maxBalance) * 100;
                                  return (
                                    <div key={scenario.id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.finReal)}</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                                        <div
                                          role="progressbar"
                                          aria-valuenow={Math.round(pct)}
                                          aria-valuemin={0}
                                          aria-valuemax={100}
                                          aria-label={`${scenario.name} balance at retirement: ${fmt(scenario.results.finReal)}`}
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
                        )}

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
                                <th className="text-right py-2 px-2 font-semibold">Retirement Age</th>
                                <th className="text-right py-2 px-2 font-semibold">Balance @ Retirement</th>
                                <th className="text-right py-2 px-2 font-semibold">Annual Income</th>
                                <th className="text-right py-2 px-2 font-semibold">Net Estate</th>
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
                                        <strong>Highest net estate:</strong> {bestEOL.name} ({fmt(bestEOL.results.eolReal)})
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
                    <CardTitle>Portfolio Balance Projection</CardTitle>
                    <CardDescription>Your projected portfolio balance over time (inflation-adjusted)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Custom inline legend — matches "Two Paths Diverge" style */}
                    <div className="flex items-center gap-4 text-xs mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_SEMANTIC.real }} />
                        <span className="text-muted-foreground">Real Balance</span>
                      </div>
                    </div>
                    <Suspense fallback={<ChartLoadingFallback height="h-[400px]" />}>
                    <div className="h-[400px]" role="img" aria-label="Wealth projection area chart showing inflation-adjusted portfolio balance over time">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={res.data}>
                        <defs>
                          <linearGradient id="qvRealGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_SEMANTIC.real} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={CHART_SEMANTIC.real} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 12 }} />
                        <RTooltip
                          formatter={(value: number) => [fmt(value), 'Balance']}
                          labelFormatter={(label) => `Year ${label}`}
                          contentStyle={getTooltipStyles().contentStyle}
                          labelStyle={getTooltipStyles().labelStyle}
                        />
                        <Area
                          type="monotone"
                          dataKey="real"
                          stroke={CHART_SEMANTIC.real}
                          strokeWidth={2}
                          fill="url(#qvRealGrad)"
                          name="Real Balance"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    </div>
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
