"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Area,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  Shield,
  Zap,
  Building2,
  Landmark,
  Wrench,
  Play,
  RotateCcw,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, fmtPercent } from "@/lib/utils";

// Historical crisis scenarios with real data
interface CrisisScenario {
  id: string;
  name: string;
  shortName: string;
  period: string;
  peakToTrough: number; // Maximum drawdown percentage
  duration: number; // Months to bottom
  recoveryMonths: number; // Months to recover to previous peak
  description: string;
  icon: React.ReactNode;
  color: string;
  yearlyReturns: number[]; // Sequence of annual returns during crisis
  characteristics: string[];
}

const CRISIS_SCENARIOS: CrisisScenario[] = [
  {
    id: "great-depression",
    name: "Great Depression",
    shortName: "1929 Crash",
    period: "1929-1932",
    peakToTrough: -86.2,
    duration: 34, // months
    recoveryMonths: 267, // 22+ years to fully recover
    description:
      "The worst stock market crash in history. Markets lost 86% of their value over 3 years.",
    icon: <Building2 className="h-5 w-5" />,
    color: "hsl(0, 84%, 60%)",
    yearlyReturns: [-8.4, -24.9, -43.3, -8.2, -25.1, 53.9, 47.6, -35.0, 28.5, 25.2],
    characteristics: [
      "Bank failures wiped out savings",
      "25% unemployment at peak",
      "Deflation of ~10% annually",
      "Took 25 years for full recovery",
    ],
  },
  {
    id: "2008-crisis",
    name: "2008 Financial Crisis",
    shortName: "2008 Crisis",
    period: "2007-2009",
    peakToTrough: -56.8,
    duration: 17,
    recoveryMonths: 49,
    description:
      "Housing bubble collapse triggered a global financial meltdown. S&P 500 lost 57% from peak.",
    icon: <Landmark className="h-5 w-5" />,
    color: "hsl(25, 95%, 53%)",
    yearlyReturns: [5.5, -37.0, 26.5, 15.1, 2.1, 16.0, 32.4],
    characteristics: [
      "Housing prices fell 33%",
      "Major banks collapsed/rescued",
      "Credit markets froze",
      "4 years to full recovery",
    ],
  },
  {
    id: "stagflation-70s",
    name: "1970s Stagflation",
    shortName: "Stagflation",
    period: "1973-1982",
    peakToTrough: -48.2,
    duration: 21,
    recoveryMonths: 96,
    description:
      "A decade of high inflation, oil shocks, and stagnant growth. Real returns were devastated.",
    icon: <TrendingDown className="h-5 w-5" />,
    color: "hsl(45, 93%, 47%)",
    yearlyReturns: [-14.7, -26.5, 37.2, 23.8, -7.2, 6.6, 18.4, 32.4, -4.9, 21.4],
    characteristics: [
      "Inflation peaked at 14.8%",
      "Oil prices quadrupled",
      "Negative real returns for decade",
      "Bond investors devastated",
    ],
  },
  {
    id: "japan-lost-decade",
    name: "Japan's Lost Decades",
    shortName: "Japan 1990s",
    period: "1990-2012",
    peakToTrough: -81.9,
    duration: 240,
    recoveryMonths: 408, // Still not fully recovered in real terms
    description:
      "Japanese markets crashed 80%+ and never fully recovered. A warning about prolonged stagnation.",
    icon: <Clock className="h-5 w-5" />,
    color: "hsl(280, 87%, 65%)",
    yearlyReturns: [-39.0, 0.6, -25.6, 2.5, 13.2, 0.5, -18.6, -27.4, 36.0, 7.6],
    characteristics: [
      "Real estate bubble burst",
      "Deflation for 20+ years",
      "Zombie companies persisted",
      "Still below 1989 peak (inflation-adjusted)",
    ],
  },
];

interface CustomScenario {
  name: string;
  crashPercent: number;
  durationMonths: number;
  recoveryShape: "V" | "U" | "L" | "W";
  inflationRate: number;
}

interface StressTestProps {
  /** Current portfolio value */
  portfolioValue: number;
  /** Annual withdrawal amount */
  annualWithdrawal: number;
  /** Current age */
  currentAge: number;
  /** Target end age for simulation */
  endAge?: number;
  /** Stock allocation percentage (0-100) */
  stockAllocation?: number;
  /** Bond allocation percentage (0-100) */
  bondAllocation?: number;
  /** Expected annual return (decimal, e.g., 0.07 for 7%) */
  expectedReturn?: number;
}

interface YearlyData {
  year: number;
  age: number;
  portfolioValue: number;
  withdrawal: number;
  marketReturn: number;
  cumulativeReturn: number;
  drawdown: number;
  isRecovering: boolean;
}

// Calculate how a portfolio would perform through a crisis
function simulateCrisis(
  initialValue: number,
  annualWithdrawal: number,
  startAge: number,
  years: number,
  crisisReturns: number[],
  stockAllocation: number,
  expectedReturn: number
): YearlyData[] {
  const data: YearlyData[] = [];
  let portfolio = initialValue;
  let peakValue = initialValue;
  let cumulativeReturn = 1;

  for (let i = 0; i < years; i++) {
    const age = startAge + i;

    // Get return for this year (blend crisis returns with expected returns)
    let yearReturn: number;
    if (i < crisisReturns.length) {
      // During crisis: use historical returns adjusted for allocation
      const stockReturn = crisisReturns[i] / 100;
      const bondReturn = i < 3 ? 0.02 : 0.04; // Simplified bond returns
      yearReturn = stockAllocation * stockReturn + (1 - stockAllocation) * bondReturn;
    } else {
      // Post-crisis: use expected returns
      yearReturn = expectedReturn;
    }

    // Apply withdrawal first (beginning of year)
    const withdrawal = Math.min(annualWithdrawal, portfolio);
    portfolio -= withdrawal;

    // Apply market return
    portfolio *= 1 + yearReturn;
    portfolio = Math.max(0, portfolio);

    // Track metrics
    cumulativeReturn *= 1 + yearReturn;
    peakValue = Math.max(peakValue, portfolio);
    const drawdown = peakValue > 0 ? ((peakValue - portfolio) / peakValue) * 100 : 0;

    data.push({
      year: i + 1,
      age,
      portfolioValue: portfolio,
      withdrawal,
      marketReturn: yearReturn * 100,
      cumulativeReturn: (cumulativeReturn - 1) * 100,
      drawdown,
      isRecovering: i >= crisisReturns.length,
    });

    if (portfolio <= 0) break;
  }

  return data;
}

// Custom crash scenario builder
function buildCustomCrisisReturns(scenario: CustomScenario): number[] {
  const { crashPercent, durationMonths, recoveryShape } = scenario;
  const durationYears = Math.ceil(durationMonths / 12);
  const returns: number[] = [];

  // Calculate annual returns to achieve total crash
  const annualCrash = Math.pow(1 + crashPercent / 100, 1 / durationYears) - 1;

  // Crash phase
  for (let i = 0; i < durationYears; i++) {
    returns.push(annualCrash * 100);
  }

  // Recovery phase based on shape
  switch (recoveryShape) {
    case "V": // Sharp recovery
      returns.push(40, 25, 15, 10);
      break;
    case "U": // Gradual bottom then recovery
      returns.push(-5, 0, 5, 20, 15, 10);
      break;
    case "L": // No recovery (stagnation)
      returns.push(2, 1, 0, -2, 3, 1, 2, -1);
      break;
    case "W": // Double dip
      returns.push(25, 15, -20, -15, 30, 20, 10);
      break;
  }

  return returns;
}

// Chart configuration
const chartConfig: ChartConfig = {
  portfolioValue: {
    label: "Portfolio Value",
    color: "hsl(220, 70%, 50%)",
  },
  baseline: {
    label: "Expected Path",
    color: "hsl(142, 76%, 36%)",
  },
  drawdown: {
    label: "Drawdown",
    color: "hsl(0, 84%, 60%)",
  },
};

export function StressTest({
  portfolioValue,
  annualWithdrawal,
  currentAge,
  endAge = 95,
  stockAllocation = 0.6,
  bondAllocation = 0.4,
  expectedReturn = 0.07,
}: StressTestProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>("2008-crisis");
  const [activeTab, setActiveTab] = useState<string>("scenarios");
  const [customScenario, setCustomScenario] = useState<CustomScenario>({
    name: "Custom Crash",
    crashPercent: -50,
    durationMonths: 18,
    recoveryShape: "U",
    inflationRate: 3,
  });
  const [showComparison, setShowComparison] = useState(false);

  const yearsToSimulate = endAge - currentAge;

  // Get current scenario
  const currentScenarioData = useMemo(() => {
    return CRISIS_SCENARIOS.find((s) => s.id === selectedScenario);
  }, [selectedScenario]);

  // Simulate selected crisis scenario
  const crisisSimulation = useMemo(() => {
    if (!currentScenarioData) return [];
    return simulateCrisis(
      portfolioValue,
      annualWithdrawal,
      currentAge,
      yearsToSimulate,
      currentScenarioData.yearlyReturns,
      stockAllocation,
      expectedReturn
    );
  }, [
    currentScenarioData,
    portfolioValue,
    annualWithdrawal,
    currentAge,
    yearsToSimulate,
    stockAllocation,
    expectedReturn,
  ]);

  // Simulate baseline (no crisis)
  const baselineSimulation = useMemo(() => {
    return simulateCrisis(
      portfolioValue,
      annualWithdrawal,
      currentAge,
      yearsToSimulate,
      [], // No crisis returns
      stockAllocation,
      expectedReturn
    );
  }, [portfolioValue, annualWithdrawal, currentAge, yearsToSimulate, stockAllocation, expectedReturn]);

  // Simulate custom scenario
  const customSimulation = useMemo(() => {
    const returns = buildCustomCrisisReturns(customScenario);
    return simulateCrisis(
      portfolioValue,
      annualWithdrawal,
      currentAge,
      yearsToSimulate,
      returns,
      stockAllocation,
      expectedReturn
    );
  }, [customScenario, portfolioValue, annualWithdrawal, currentAge, yearsToSimulate, stockAllocation, expectedReturn]);

  // Run all scenarios for comparison
  const allScenarioResults = useMemo(() => {
    return CRISIS_SCENARIOS.map((scenario) => {
      const simulation = simulateCrisis(
        portfolioValue,
        annualWithdrawal,
        currentAge,
        yearsToSimulate,
        scenario.yearlyReturns,
        stockAllocation,
        expectedReturn
      );
      const finalValue = simulation[simulation.length - 1]?.portfolioValue ?? 0;
      const survives = finalValue > 0;
      const worstDrawdown = Math.max(...simulation.map((d) => d.drawdown));
      const recoveryYear = simulation.findIndex(
        (d, i) => i > 0 && d.portfolioValue >= portfolioValue && simulation[i - 1].portfolioValue < portfolioValue
      );

      return {
        scenario,
        simulation,
        finalValue,
        survives,
        worstDrawdown,
        recoveryYear: recoveryYear > 0 ? recoveryYear : null,
      };
    });
  }, [portfolioValue, annualWithdrawal, currentAge, yearsToSimulate, stockAllocation, expectedReturn]);

  // Combined chart data
  const combinedChartData = useMemo(() => {
    return crisisSimulation.map((point, i) => ({
      ...point,
      baseline: baselineSimulation[i]?.portfolioValue ?? 0,
    }));
  }, [crisisSimulation, baselineSimulation]);

  // Analysis metrics
  const analysisMetrics = useMemo(() => {
    const crisis = crisisSimulation;
    const baseline = baselineSimulation;

    if (crisis.length === 0 || baseline.length === 0) {
      return {
        finalValueCrisis: 0,
        finalValueBaseline: 0,
        valueDifference: 0,
        worstDrawdown: 0,
        recoveryYear: null as number | null,
        survives: false,
        yearsLost: 0,
      };
    }

    const finalValueCrisis = crisis[crisis.length - 1]?.portfolioValue ?? 0;
    const finalValueBaseline = baseline[baseline.length - 1]?.portfolioValue ?? 0;
    const valueDifference = finalValueCrisis - finalValueBaseline;
    const worstDrawdown = Math.max(...crisis.map((d) => d.drawdown));

    // Find when portfolio recovers to starting value
    const recoveryYear = crisis.findIndex((d, i) => {
      if (i === 0) return false;
      return d.portfolioValue >= portfolioValue && crisis[i - 1].portfolioValue < portfolioValue;
    });

    // Determine if portfolio survives
    const survives = finalValueCrisis > 0;

    // Calculate years of withdrawals "lost" compared to baseline
    const yearsLost = baseline.findIndex((d) => d.portfolioValue <= finalValueCrisis) - crisis.length;

    return {
      finalValueCrisis,
      finalValueBaseline,
      valueDifference,
      worstDrawdown,
      recoveryYear: recoveryYear > 0 ? recoveryYear : null,
      survives,
      yearsLost: Math.max(0, yearsLost),
    };
  }, [crisisSimulation, baselineSimulation, portfolioValue]);

  const handleResetCustom = useCallback(() => {
    setCustomScenario({
      name: "Custom Crash",
      crashPercent: -50,
      durationMonths: 18,
      recoveryShape: "U",
      inflationRate: 3,
    });
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Portfolio Stress Testing
        </CardTitle>
        <CardDescription>
          See how your retirement plan would hold up during the worst market crises in history.
          Understanding these scenarios helps you prepare for the unexpected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scenarios" className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Historical</span> Crises
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-1">
              <Wrench className="h-4 w-4" />
              Custom <span className="hidden sm:inline">Scenario</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Scenario</span> Comparison
            </TabsTrigger>
          </TabsList>

          {/* Historical Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-6">
            {/* Scenario Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CRISIS_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all text-left",
                    "hover:shadow-md",
                    selectedScenario === scenario.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: scenario.color }}>{scenario.icon}</span>
                    <span className="font-semibold text-sm">{scenario.shortName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{scenario.period}</div>
                  <div
                    className="text-lg font-bold mt-1"
                    style={{ color: scenario.color }}
                  >
                    {scenario.peakToTrough.toFixed(1)}%
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Scenario Details */}
            {currentScenarioData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scenario Info */}
                <div className="space-y-4">
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: currentScenarioData.color + "40" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ color: currentScenarioData.color }}>
                        {currentScenarioData.icon}
                      </span>
                      <h3 className="font-semibold">{currentScenarioData.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {currentScenarioData.description}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Peak Decline</div>
                        <div className="font-bold text-red-600">
                          {currentScenarioData.peakToTrough.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Time to Bottom</div>
                        <div className="font-bold">
                          {currentScenarioData.duration} months
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Recovery Time</div>
                        <div className="font-bold">
                          {Math.round(currentScenarioData.recoveryMonths / 12)} years
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Period</div>
                        <div className="font-bold">{currentScenarioData.period}</div>
                      </div>
                    </div>
                  </div>

                  {/* Characteristics */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Key Characteristics
                    </h4>
                    <ul className="space-y-1">
                      {currentScenarioData.characteristics.map((char, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">-</span>
                          {char}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Chart */}
                <div className="lg:col-span-2">
                  <div className="h-[350px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <ComposedChart data={combinedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="age"
                          tickLine={false}
                          axisLine={false}
                          label={{ value: "Age", position: "bottom", offset: -5 }}
                        />
                        <YAxis
                          tickFormatter={(value) => fmt(value)}
                          tickLine={false}
                          axisLine={false}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => {
                                if (name === "baseline") return [fmt(value as number), "Expected Path"];
                                if (name === "portfolioValue") return [fmt(value as number), "Crisis Path"];
                                return [value, name];
                              }}
                            />
                          }
                        />
                        <ReferenceLine
                          y={portfolioValue}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="5 5"
                          label={{ value: "Starting Value", position: "right" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="baseline"
                          stroke="hsl(142, 76%, 36%)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="baseline"
                        />
                        <Area
                          type="monotone"
                          dataKey="portfolioValue"
                          fill={currentScenarioData.color + "30"}
                          stroke={currentScenarioData.color}
                          strokeWidth={2}
                          name="portfolioValue"
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            )}

            {/* "Your Portfolio Would Have..." Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  analysisMetrics.survives
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {analysisMetrics.survives ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium">Survival Status</span>
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    analysisMetrics.survives ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                  )}
                >
                  {analysisMetrics.survives ? "Survives" : "Depleted"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {analysisMetrics.survives
                    ? `Ends with ${fmt(analysisMetrics.finalValueCrisis)}`
                    : "Portfolio runs out before end"}
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium">Worst Drawdown</span>
                </div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {analysisMetrics.worstDrawdown.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Peak to trough decline
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Recovery Time</span>
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {analysisMetrics.recoveryYear !== null
                    ? `${analysisMetrics.recoveryYear} years`
                    : "Never"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Time to recover starting value
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">vs. Expected</span>
                </div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {analysisMetrics.valueDifference >= 0 ? "+" : ""}
                  {fmt(analysisMetrics.valueDifference)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Difference from expected path
                </div>
              </div>
            </div>

            {/* Your Portfolio Would Have... Summary */}
            <div className="p-6 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Your Portfolio Would Have...
              </h3>
              {currentScenarioData && (
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Starting with {fmt(portfolioValue)}</strong> and withdrawing{" "}
                    <strong>{fmt(annualWithdrawal)}/year</strong>, if you had retired at age{" "}
                    <strong>{currentAge}</strong> just before the{" "}
                    <strong>{currentScenarioData.name}</strong>:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      Your portfolio would have dropped to as low as{" "}
                      <strong className="text-red-600">
                        {fmt(portfolioValue * (1 - analysisMetrics.worstDrawdown / 100))}
                      </strong>{" "}
                      (a {analysisMetrics.worstDrawdown.toFixed(1)}% decline)
                    </li>
                    <li>
                      {analysisMetrics.recoveryYear !== null ? (
                        <>
                          It would have taken approximately{" "}
                          <strong>{analysisMetrics.recoveryYear} years</strong> to recover your
                          starting value
                        </>
                      ) : (
                        <>Your portfolio would never have fully recovered to its starting value</>
                      )}
                    </li>
                    <li>
                      At age {endAge}, you would have{" "}
                      {analysisMetrics.survives ? (
                        <>
                          <strong className="text-green-600">
                            {fmt(analysisMetrics.finalValueCrisis)}
                          </strong>{" "}
                          remaining
                        </>
                      ) : (
                        <strong className="text-red-600">run out of money</strong>
                      )}
                    </li>
                    <li>
                      Compared to normal markets, you would be{" "}
                      <strong
                        className={
                          analysisMetrics.valueDifference >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {fmt(Math.abs(analysisMetrics.valueDifference))}
                      </strong>{" "}
                      {analysisMetrics.valueDifference >= 0 ? "ahead" : "behind"}
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Custom Scenario Tab */}
          <TabsContent value="custom" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Custom Scenario Builder */}
              <div className="space-y-6">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Build Your Scenario
                  </h3>

                  <div className="space-y-5">
                    {/* Scenario Name */}
                    <div className="space-y-2">
                      <Label htmlFor="scenario-name">Scenario Name</Label>
                      <Input
                        id="scenario-name"
                        value={customScenario.name}
                        onChange={(e) =>
                          setCustomScenario((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="My Custom Crash"
                      />
                    </div>

                    {/* Crash Percentage */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Market Crash</Label>
                        <span className="text-sm font-bold text-red-600">
                          {customScenario.crashPercent}%
                        </span>
                      </div>
                      <Slider
                        value={[customScenario.crashPercent]}
                        onValueChange={([value]) =>
                          setCustomScenario((prev) => ({ ...prev, crashPercent: value }))
                        }
                        min={-90}
                        max={-10}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>-90% (Catastrophic)</span>
                        <span>-10% (Mild)</span>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Crash Duration</Label>
                        <span className="text-sm font-bold">
                          {customScenario.durationMonths} months
                        </span>
                      </div>
                      <Slider
                        value={[customScenario.durationMonths]}
                        onValueChange={([value]) =>
                          setCustomScenario((prev) => ({ ...prev, durationMonths: value }))
                        }
                        min={3}
                        max={60}
                        step={3}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>3 months (Fast)</span>
                        <span>5 years (Prolonged)</span>
                      </div>
                    </div>

                    {/* Recovery Shape */}
                    <div className="space-y-2">
                      <Label>Recovery Shape</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {(["V", "U", "L", "W"] as const).map((shape) => (
                          <button
                            key={shape}
                            onClick={() =>
                              setCustomScenario((prev) => ({ ...prev, recoveryShape: shape }))
                            }
                            className={cn(
                              "p-3 rounded-lg border-2 transition-all text-center",
                              "hover:border-primary/50",
                              customScenario.recoveryShape === shape
                                ? "border-primary bg-primary/5"
                                : "border-border"
                            )}
                          >
                            <div className="text-2xl font-bold">{shape}</div>
                            <div className="text-xs text-muted-foreground">
                              {shape === "V" && "Sharp"}
                              {shape === "U" && "Gradual"}
                              {shape === "L" && "None"}
                              {shape === "W" && "Double"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Inflation */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Inflation Rate</Label>
                        <span className="text-sm font-bold">{customScenario.inflationRate}%</span>
                      </div>
                      <Slider
                        value={[customScenario.inflationRate]}
                        onValueChange={([value]) =>
                          setCustomScenario((prev) => ({ ...prev, inflationRate: value }))
                        }
                        min={0}
                        max={15}
                        step={0.5}
                        className="w-full"
                      />
                    </div>

                    <Button variant="outline" onClick={handleResetCustom} className="w-full">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </div>

              {/* Custom Scenario Chart */}
              <div className="lg:col-span-2">
                <div className="p-4 rounded-lg border">
                  <h3 className="font-semibold mb-4">
                    {customScenario.name}: Portfolio Projection
                  </h3>
                  <div className="h-[350px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <ComposedChart
                        data={customSimulation.map((point, i) => ({
                          ...point,
                          baseline: baselineSimulation[i]?.portfolioValue ?? 0,
                        }))}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="age"
                          tickLine={false}
                          axisLine={false}
                          label={{ value: "Age", position: "bottom", offset: -5 }}
                        />
                        <YAxis
                          tickFormatter={(value) => fmt(value)}
                          tickLine={false}
                          axisLine={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ReferenceLine
                          y={portfolioValue}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="baseline"
                          stroke="hsl(142, 76%, 36%)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Expected Path"
                        />
                        <Area
                          type="monotone"
                          dataKey="portfolioValue"
                          fill="hsl(280, 87%, 65%, 0.3)"
                          stroke="hsl(280, 87%, 65%)"
                          strokeWidth={2}
                          name="Custom Scenario"
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                </div>

                {/* Custom Scenario Results */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Final Value</div>
                    <div className="font-bold">
                      {fmt(customSimulation[customSimulation.length - 1]?.portfolioValue ?? 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Worst Drawdown</div>
                    <div className="font-bold text-red-600">
                      {Math.max(...customSimulation.map((d) => d.drawdown)).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div
                      className={cn(
                        "font-bold",
                        (customSimulation[customSimulation.length - 1]?.portfolioValue ?? 0) > 0
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {(customSimulation[customSimulation.length - 1]?.portfolioValue ?? 0) > 0
                        ? "Survives"
                        : "Depleted"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">vs. Expected</div>
                    <div className="font-bold">
                      {fmt(
                        (customSimulation[customSimulation.length - 1]?.portfolioValue ?? 0) -
                          (baselineSimulation[baselineSimulation.length - 1]?.portfolioValue ?? 0)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Scenario Comparison
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    See how your portfolio would have performed across all major historical crises.
                    This helps you understand your plan&apos;s resilience to different types of
                    market stress.
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Scenario</th>
                    <th className="text-center p-3 font-semibold">Survival</th>
                    <th className="text-right p-3 font-semibold">Final Value</th>
                    <th className="text-right p-3 font-semibold">Max Drawdown</th>
                    <th className="text-right p-3 font-semibold">Recovery Time</th>
                    <th className="text-right p-3 font-semibold">vs. Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Baseline Row */}
                  <tr className="border-b bg-green-50/50 dark:bg-green-950/10">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Expected (No Crisis)</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Yes
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmt(baselineSimulation[baselineSimulation.length - 1]?.portfolioValue ?? 0)}
                    </td>
                    <td className="p-3 text-right">0%</td>
                    <td className="p-3 text-right">N/A</td>
                    <td className="p-3 text-right">-</td>
                  </tr>

                  {/* Crisis Scenarios */}
                  {allScenarioResults.map(({ scenario, survives, finalValue, worstDrawdown, recoveryYear }) => (
                    <tr key={scenario.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color: scenario.color }}>{scenario.icon}</span>
                          <div>
                            <div className="font-medium">{scenario.name}</div>
                            <div className="text-xs text-muted-foreground">{scenario.period}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {survives ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                            <XCircle className="h-3 w-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">{fmt(finalValue)}</td>
                      <td className="p-3 text-right">
                        <span className="text-red-600">{worstDrawdown.toFixed(1)}%</span>
                      </td>
                      <td className="p-3 text-right">
                        {recoveryYear ? `${recoveryYear} years` : "Never"}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            finalValue -
                              (baselineSimulation[baselineSimulation.length - 1]?.portfolioValue ?? 0) >=
                            0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {fmt(
                            finalValue -
                              (baselineSimulation[baselineSimulation.length - 1]?.portfolioValue ?? 0)
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual Comparison Chart */}
            <div className="p-4 rounded-lg border">
              <h3 className="font-semibold mb-4">Recovery Timeline Comparison</h3>
              <div className="h-[400px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="age"
                      type="number"
                      domain={[currentAge, endAge]}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "Age", position: "bottom", offset: -5 }}
                    />
                    <YAxis
                      tickFormatter={(value) => fmt(value)}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ReferenceLine
                      y={portfolioValue}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                    />
                    {/* Baseline */}
                    <Line
                      data={baselineSimulation}
                      type="monotone"
                      dataKey="portfolioValue"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={3}
                      dot={false}
                      name="Expected"
                    />
                    {/* All crisis scenarios */}
                    {allScenarioResults.map(({ scenario, simulation }) => (
                      <Line
                        key={scenario.id}
                        data={simulation}
                        type="monotone"
                        dataKey="portfolioValue"
                        stroke={scenario.color}
                        strokeWidth={2}
                        dot={false}
                        name={scenario.shortName}
                        opacity={0.8}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-1 rounded" style={{ backgroundColor: "hsl(142, 76%, 36%)" }} />
                  <span>Expected</span>
                </div>
                {CRISIS_SCENARIOS.map((scenario) => (
                  <div key={scenario.id} className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-1 rounded" style={{ backgroundColor: scenario.color }} />
                    <span>{scenario.shortName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Best Case Survival
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {allScenarioResults.filter((r) => r.survives).length} out of{" "}
                  {CRISIS_SCENARIOS.length} historical crisis scenarios show your portfolio
                  surviving to age {endAge}.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {allScenarioResults.filter((r) => !r.survives).length > 0 ? (
                    <>
                      {allScenarioResults.filter((r) => !r.survives).length} scenario(s) would
                      deplete your portfolio. Consider reducing withdrawals or increasing savings.
                    </>
                  ) : (
                    <>
                      Your portfolio appears resilient across all historical crises. Consider this
                      a strong indicator of long-term sustainability.
                    </>
                  )}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default StressTest;
