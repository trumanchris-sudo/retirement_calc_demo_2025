"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Shield,
  Target,
  BarChart3,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  Info,
  DollarSign,
  Calendar,
  Briefcase,
} from "lucide-react";
import type { BatchSummary } from "@/types/planner";

// Historical S&P 500 data for specific years (year-over-year returns)
// Using actual historical data from constants
const HISTORICAL_RETURNS: Record<number, number[]> = {
  // Dot-com crash period (2000-2009) - "Lost Decade"
  2000: [-9.03, -11.85, -21.97, 28.36, 10.74, 4.83, 15.61, 5.48, -36.55, 25.94, 14.82, 2.10, 15.89, 32.15, 13.52],
  // Post-crisis recovery (2010-2019) - "Bull Market"
  2010: [14.82, 2.10, 15.89, 32.15, 13.52, 1.36, 11.77, 21.61, -4.23, 31.21, 18.02, 28.47, -18.04, 26.06, 25.02],
  // Great Depression start
  1929: [-8.30, -25.12, -43.84, -8.64, 49.98, -1.19, 46.74, 31.94, 35.34, -35.34, 29.28, -1.10, -12.77, 19.17, 25.06],
  // 2008 Financial Crisis
  2008: [-36.55, 25.94, 14.82, 2.10, 15.89, 32.15, 13.52, 1.36, 11.77, 21.61, -4.23, 31.21, 18.02, 28.47, -18.04],
};

interface SequenceRiskProps {
  batchSummary: BatchSummary | null;
  retirementAge: number;
  age1: number;
  withdrawalRate?: number;
  initialBalance?: number;
}

interface SimulationPath {
  year: number;
  balance: number;
  return: number;
  withdrawal: number;
}

/**
 * SequenceRisk Visualizer
 *
 * Demonstrates why the ORDER of returns matters in retirement - not just the average.
 * Features side-by-side comparisons, historical examples, interactive simulations,
 * and mitigation strategies.
 */
export const SequenceRisk = React.memo(function SequenceRisk({
  batchSummary,
  retirementAge,
  age1,
  withdrawalRate = 4,
  initialBalance = 1000000,
}: SequenceRiskProps) {
  const [activeTab, setActiveTab] = useState("concept");
  const [crashYear, setCrashYear] = useState(1);
  const [crashMagnitude, setCrashMagnitude] = useState(40);

  const yearsToRetirement = retirementAge - age1;
  const criticalWindowStart = Math.max(0, yearsToRetirement - 5);
  const criticalWindowEnd = yearsToRetirement + 5;

  // Generate the "same average, different sequence" comparison
  const sequenceComparison = useMemo(() => {
    const years = 20;
    const annualWithdrawal = initialBalance * (withdrawalRate / 100);

    // Good sequence: Positive returns early, negative later
    const goodSequence = [
      12, 15, 10, 8, 14, 11, 9, 13, 7, 6, // Strong early years
      5, 3, 2, -2, -4, -8, 0, 4, 1, -1     // Weaker later years
    ];

    // Bad sequence: Same returns, reversed (negative early)
    const badSequence = [...goodSequence].reverse();

    // Both have the same average: ~7%
    const goodAvg = goodSequence.reduce((a, b) => a + b, 0) / goodSequence.length;
    const badAvg = badSequence.reduce((a, b) => a + b, 0) / badSequence.length;

    // Simulate both paths
    const simulatePath = (returns: number[]): SimulationPath[] => {
      let balance = initialBalance;
      const path: SimulationPath[] = [{ year: 0, balance, return: 0, withdrawal: 0 }];

      for (let i = 0; i < years; i++) {
        const returnPct = returns[i] / 100;
        balance = balance * (1 + returnPct);
        const withdrawal = Math.min(annualWithdrawal, balance);
        balance -= withdrawal;
        balance = Math.max(0, balance);

        path.push({
          year: i + 1,
          balance,
          return: returns[i],
          withdrawal,
        });
      }

      return path;
    };

    return {
      good: simulatePath(goodSequence),
      bad: simulatePath(badSequence),
      goodAvg,
      badAvg,
      goodSequence,
      badSequence,
    };
  }, [initialBalance, withdrawalRate]);

  // Historical scenario comparison
  const historicalComparison = useMemo(() => {
    const years = 15;
    const annualWithdrawal = initialBalance * (withdrawalRate / 100);

    const simulateHistorical = (startYear: number): SimulationPath[] => {
      const returns = HISTORICAL_RETURNS[startYear] || [];
      let balance = initialBalance;
      const path: SimulationPath[] = [{ year: startYear, balance, return: 0, withdrawal: 0 }];

      for (let i = 0; i < Math.min(years, returns.length); i++) {
        const returnPct = returns[i] / 100;
        balance = balance * (1 + returnPct);
        const withdrawal = Math.min(annualWithdrawal, balance);
        balance -= withdrawal;
        balance = Math.max(0, balance);

        path.push({
          year: startYear + i + 1,
          balance,
          return: returns[i],
          withdrawal,
        });
      }

      return path;
    };

    return {
      year2000: simulateHistorical(2000),
      year2010: simulateHistorical(2010),
    };
  }, [initialBalance, withdrawalRate]);

  // Interactive crash simulation
  const crashSimulation = useMemo(() => {
    const years = 25;
    const annualWithdrawal = initialBalance * (withdrawalRate / 100);

    // Baseline: steady 7% returns
    const baselineReturns = Array(years).fill(7);

    // Crash scenario: 40% drop in specified year, then recovery
    const crashReturns = baselineReturns.map((r, i) => {
      if (i === crashYear - 1) return -crashMagnitude;
      if (i === crashYear) return crashMagnitude * 0.5; // Partial recovery
      return r;
    });

    const simulatePath = (returns: number[]): SimulationPath[] => {
      let balance = initialBalance;
      const path: SimulationPath[] = [{ year: 0, balance, return: 0, withdrawal: 0 }];

      for (let i = 0; i < years; i++) {
        const returnPct = returns[i] / 100;
        balance = balance * (1 + returnPct);
        const withdrawal = Math.min(annualWithdrawal, balance);
        balance -= withdrawal;
        balance = Math.max(0, balance);

        path.push({
          year: i + 1,
          balance,
          return: returns[i],
          withdrawal,
        });
      }

      return path;
    };

    const baseline = simulatePath(baselineReturns);
    const crashed = simulatePath(crashReturns);

    // Calculate impact
    const finalBaseline = baseline[baseline.length - 1].balance;
    const finalCrash = crashed[crashed.length - 1].balance;
    const impact = ((finalBaseline - finalCrash) / finalBaseline) * 100;
    const survives = finalCrash > 0;

    return {
      baseline,
      crashed,
      impact,
      survives,
      crashYear,
    };
  }, [initialBalance, withdrawalRate, crashYear, crashMagnitude]);

  // Monte Carlo distribution analysis
  const monteCarloAnalysis = useMemo(() => {
    if (!batchSummary?.allRuns) return null;

    const runs = batchSummary.allRuns;
    const totalRuns = runs.length;
    const failures = runs.filter(r => r.ruined).length;
    const successRate = ((totalRuns - failures) / totalRuns) * 100;

    // Categorize by outcome
    const excellent = runs.filter(r => !r.ruined && r.eolReal > initialBalance * 2).length;
    const good = runs.filter(r => !r.ruined && r.eolReal > initialBalance && r.eolReal <= initialBalance * 2).length;
    const adequate = runs.filter(r => !r.ruined && r.eolReal > 0 && r.eolReal <= initialBalance).length;
    const failed = failures;

    // Find 5th percentile data
    const sortedEOL = runs.map(r => r.eolReal).sort((a, b) => a - b);
    const p5Index = Math.floor(totalRuns * 0.05);
    const p5Value = sortedEOL[p5Index];

    return {
      totalRuns,
      successRate,
      excellent,
      good,
      adequate,
      failed,
      p5Value,
      distribution: [
        { label: "Excellent (2x+)", count: excellent, color: "bg-emerald-500" },
        { label: "Good (1-2x)", count: good, color: "bg-green-500" },
        { label: "Adequate (0-1x)", count: adequate, color: "bg-yellow-500" },
        { label: "Failed", count: failed, color: "bg-red-500" },
      ],
    };
  }, [batchSummary, initialBalance]);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Mini chart component for path visualization
  const MiniChart = ({
    data,
    color,
    height = 120,
    showZeroLine = true,
  }: {
    data: SimulationPath[];
    color: string;
    height?: number;
    showZeroLine?: boolean;
  }) => {
    const maxBalance = Math.max(...data.map(d => d.balance), initialBalance * 1.5);
    const minBalance = 0;
    const range = maxBalance - minBalance;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d.balance - minBalance) / range) * 100;
      return `${x},${y}`;
    }).join(" ");

    const zeroY = 100 - ((0 - minBalance) / range) * 100;
    const startY = 100 - ((initialBalance - minBalance) / range) * 100;

    return (
      <svg viewBox="0 0 100 100" className="w-full" style={{ height }} preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1="0" y1={startY} x2="100" y2={startY} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2,2" />
        {showZeroLine && (
          <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2,2" />
        )}

        {/* Path line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
        />

        {/* Area fill */}
        <polygon
          fill={`${color}20`}
          points={`0,100 ${points} 100,100`}
        />
      </svg>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              Sequence of Returns Risk
            </CardTitle>
            <CardDescription className="mt-1 text-base">
              Why the ORDER of returns matters more than the average in retirement
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200">
            Critical Risk Factor
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 p-0 h-auto flex-wrap">
            <TabsTrigger value="concept" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-4 py-3 text-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              The Concept
            </TabsTrigger>
            <TabsTrigger value="historical" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-4 py-3 text-sm">
              <Calendar className="h-4 w-4 mr-2" />
              Historical Examples
            </TabsTrigger>
            <TabsTrigger value="yourwindow" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-4 py-3 text-sm">
              <Target className="h-4 w-4 mr-2" />
              Your Risk Window
            </TabsTrigger>
            <TabsTrigger value="simulation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-4 py-3 text-sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Interactive Simulation
            </TabsTrigger>
            <TabsTrigger value="mitigation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-4 py-3 text-sm">
              <Shield className="h-4 w-4 mr-2" />
              Mitigation Strategies
            </TabsTrigger>
            <TabsTrigger value="montecarlo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-4 py-3 text-sm">
              <Lightbulb className="h-4 w-4 mr-2" />
              Why Monte Carlo
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: The Concept */}
          <TabsContent value="concept" className="p-6 space-y-6">
            {/* Key insight box */}
            <div className="bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200 dark:border-orange-800 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 text-lg">
                    The Core Insight
                  </h3>
                  <p className="text-orange-800 dark:text-orange-200 mt-1">
                    Two portfolios with the <strong>exact same average return</strong> can have
                    <strong> dramatically different outcomes</strong> in retirement. The difference?
                    <strong> When</strong> the good and bad years occur.
                  </p>
                </div>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Good sequence */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-green-50 dark:bg-green-900/30 p-4 border-b border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-900 dark:text-green-100">
                      &ldquo;Lucky&rdquo; Sequence
                    </h4>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Strong returns early, weaker returns later
                  </p>
                </div>
                <div className="p-4">
                  <MiniChart data={sequenceComparison.good} color="#22c55e" />
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average Annual Return:</span>
                      <span className="font-semibold">{sequenceComparison.goodAvg.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Starting Balance:</span>
                      <span className="font-semibold">{formatCurrency(initialBalance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Final Balance (Year 20):</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(sequenceComparison.good[sequenceComparison.good.length - 1].balance)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">First 5 years returns:</div>
                    <div className="flex gap-1">
                      {sequenceComparison.goodSequence.slice(0, 5).map((r, i) => (
                        <Badge key={i} variant="outline" className={r >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {r > 0 ? "+" : ""}{r}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bad sequence */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-red-50 dark:bg-red-900/30 p-4 border-b border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-900 dark:text-red-100">
                      &ldquo;Unlucky&rdquo; Sequence
                    </h4>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Weak returns early, strong returns later
                  </p>
                </div>
                <div className="p-4">
                  <MiniChart data={sequenceComparison.bad} color="#ef4444" />
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average Annual Return:</span>
                      <span className="font-semibold">{sequenceComparison.badAvg.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Starting Balance:</span>
                      <span className="font-semibold">{formatCurrency(initialBalance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Final Balance (Year 20):</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(sequenceComparison.bad[sequenceComparison.bad.length - 1].balance)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">First 5 years returns:</div>
                    <div className="flex gap-1">
                      {sequenceComparison.badSequence.slice(0, 5).map((r, i) => (
                        <Badge key={i} variant="outline" className={r >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {r > 0 ? "+" : ""}{r}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* The math explanation */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Info className="h-5 w-5 text-blue-500" />
                Why Does This Happen?
              </h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">The Withdrawal Effect:</strong> When you&apos;re taking money out,
                  early losses are devastating because you&apos;re selling shares at low prices.
                  Those shares can&apos;t participate in later recovery.
                </p>
                <p>
                  <strong className="text-foreground">The Math:</strong> Losing 30% then gaining 30% doesn&apos;t get you back
                  to even. $100 -&gt; $70 -&gt; $91. You need a 43% gain to recover from a 30% loss.
                </p>
                <p>
                  <strong className="text-foreground">The Compounding Curse:</strong> During accumulation, bad early years
                  hurt less because you&apos;re adding money. In retirement, you&apos;re removing money,
                  amplifying the damage.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Historical Examples */}
          <TabsContent value="historical" className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">
                Real World: Retired in 2000 vs 2010
              </h3>
              <p className="text-blue-800 dark:text-blue-200 mt-1 text-sm">
                Same $1M portfolio, same {withdrawalRate}% withdrawal rate. Dramatically different outcomes.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* 2000 retiree */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-red-50 dark:bg-red-900/30 p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-red-900 dark:text-red-100">
                        Retired January 2000
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Dot-com crash, then 2008 crisis
                      </p>
                    </div>
                    <Badge variant="destructive">Challenging</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <MiniChart data={historicalComparison.year2000} color="#ef4444" height={150} />
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-2">Market returns (first 5 years):</div>
                      <div className="flex flex-wrap gap-1">
                        {HISTORICAL_RETURNS[2000].slice(0, 5).map((r, i) => (
                          <Badge key={i} variant="outline" className={r >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {r > 0 ? "+" : ""}{r.toFixed(0)}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance after 15 years:</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(historicalComparison.year2000[historicalComparison.year2000.length - 1]?.balance || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2010 retiree */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-green-50 dark:bg-green-900/30 p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-900 dark:text-green-100">
                        Retired January 2010
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Post-crisis recovery bull market
                      </p>
                    </div>
                    <Badge className="bg-green-600">Favorable</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <MiniChart data={historicalComparison.year2010} color="#22c55e" height={150} />
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-2">Market returns (first 5 years):</div>
                      <div className="flex flex-wrap gap-1">
                        {HISTORICAL_RETURNS[2010].slice(0, 5).map((r, i) => (
                          <Badge key={i} variant="outline" className={r >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {r > 0 ? "+" : ""}{r.toFixed(0)}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance after 15 years:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(historicalComparison.year2010[historicalComparison.year2010.length - 1]?.balance || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key takeaway */}
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">Key Takeaway</h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    The 2000 retiree faced the &quot;lost decade&quot; with two major market crashes in their first 9 years.
                    The 2010 retiree caught the longest bull market in history. <strong>Same starting point,
                    same withdrawal strategy - luck of timing made a massive difference.</strong>
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Your Risk Window */}
          <TabsContent value="yourwindow" className="p-6 space-y-6">
            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 text-lg">
                    Your Critical Risk Window
                  </h3>
                  <p className="text-purple-800 dark:text-purple-200 mt-1">
                    The <strong>5 years before and 5 years after retirement</strong> are when you&apos;re most
                    vulnerable to sequence risk. This is your &quot;risk zone.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline visualization */}
            <div className="border rounded-xl p-6">
              <h4 className="font-semibold mb-4">Your Personal Timeline</h4>

              <div className="relative">
                {/* Timeline bar */}
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  {/* Pre-risk zone */}
                  <div
                    className="absolute h-4 bg-green-400"
                    style={{
                      left: 0,
                      width: `${(criticalWindowStart / (yearsToRetirement + 15)) * 100}%`
                    }}
                  />
                  {/* Risk zone */}
                  <div
                    className="absolute h-4 bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 animate-pulse"
                    style={{
                      left: `${(criticalWindowStart / (yearsToRetirement + 15)) * 100}%`,
                      width: `${(10 / (yearsToRetirement + 15)) * 100}%`
                    }}
                  />
                  {/* Post-risk zone */}
                  <div
                    className="absolute h-4 bg-green-400"
                    style={{
                      left: `${(criticalWindowEnd / (yearsToRetirement + 15)) * 100}%`,
                      width: `${((yearsToRetirement + 15 - criticalWindowEnd) / (yearsToRetirement + 15)) * 100}%`
                    }}
                  />
                </div>

                {/* Markers */}
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Today (Age {age1})</span>
                  <span className="text-red-600 font-semibold">Risk Zone</span>
                  <span>Age {retirementAge + 10}</span>
                </div>

                {/* Retirement marker */}
                <div
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${(yearsToRetirement / (yearsToRetirement + 15)) * 100}%` }}
                >
                  <div className="w-0.5 h-8 bg-blue-600" />
                  <div className="text-xs text-blue-600 font-semibold whitespace-nowrap -ml-8 mt-1">
                    Retirement (Age {retirementAge})
                  </div>
                </div>
              </div>

              {/* Risk zone details */}
              <div className="mt-8 grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Before Risk Zone
                  </div>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    Ages {age1} - {age1 + criticalWindowStart}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Still accumulating. Market dips are buying opportunities.
                  </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 ring-2 ring-red-500/30">
                  <div className="text-sm text-red-700 dark:text-red-300 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Critical Risk Zone
                  </div>
                  <div className="text-2xl font-bold text-red-600 mt-1">
                    Ages {age1 + criticalWindowStart} - {retirementAge + 5}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Most vulnerable period. Protect with strategies below.
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                    After Risk Zone
                  </div>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    Ages {retirementAge + 5}+
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    If portfolio survives, risk decreases over time.
                  </p>
                </div>
              </div>
            </div>

            {/* Why this matters */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border">
              <h4 className="font-semibold mb-3">Why This Window Matters</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Before retirement:</strong> You&apos;re still adding money. A crash means buying cheap.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Early retirement:</strong> You&apos;re withdrawing from a shrinking base. Devastating.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Late retirement:</strong> Your portfolio has had time to grow. More resilient.</span>
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* Tab 4: Interactive Simulation */}
          <TabsContent value="simulation" className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">
                What If Markets Crash In Year {crashYear}?
              </h3>
              <p className="text-blue-800 dark:text-blue-200 mt-1 text-sm">
                Adjust the sliders to see how crash timing affects your portfolio survival.
              </p>
            </div>

            {/* Controls */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Crash Year: Year {crashYear} of Retirement
                  </label>
                  <Slider
                    value={[crashYear]}
                    onValueChange={(v) => setCrashYear(v[0])}
                    min={1}
                    max={15}
                    step={1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Year 1 (Worst)</span>
                    <span>Year 15 (Better)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Crash Magnitude: -{crashMagnitude}%
                  </label>
                  <Slider
                    value={[crashMagnitude]}
                    onValueChange={(v) => setCrashMagnitude(v[0])}
                    min={10}
                    max={60}
                    step={5}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>-10% (Correction)</span>
                    <span>-60% (Depression)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Baseline */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b">
                  <h4 className="font-semibold">Baseline: Steady 7% Returns</h4>
                </div>
                <div className="p-4">
                  <MiniChart data={crashSimulation.baseline} color="#3b82f6" height={120} />
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">Final Balance:</span>{" "}
                    <span className="font-bold text-blue-600">
                      {formatCurrency(crashSimulation.baseline[crashSimulation.baseline.length - 1].balance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Crash scenario */}
              <div className="border rounded-xl overflow-hidden">
                <div className={`p-4 border-b ${crashSimulation.survives ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                  <h4 className="font-semibold">
                    {crashMagnitude}% Crash in Year {crashYear}
                  </h4>
                </div>
                <div className="p-4">
                  <MiniChart
                    data={crashSimulation.crashed}
                    color={crashSimulation.survives ? "#f59e0b" : "#ef4444"}
                    height={120}
                  />
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">Final Balance:</span>{" "}
                    <span className={`font-bold ${crashSimulation.survives ? 'text-amber-600' : 'text-red-600'}`}>
                      {formatCurrency(crashSimulation.crashed[crashSimulation.crashed.length - 1].balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact summary */}
            <div className={`rounded-xl p-5 border ${
              crashSimulation.survives
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {crashSimulation.survives ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <h4 className={`font-semibold ${crashSimulation.survives ? 'text-amber-900 dark:text-amber-100' : 'text-red-900 dark:text-red-100'}`}>
                    {crashSimulation.survives
                      ? `Portfolio Survives - But ${crashSimulation.impact.toFixed(0)}% Less Wealth`
                      : `Portfolio Depleted Before Year 25`
                    }
                  </h4>
                  <p className={`text-sm mt-1 ${crashSimulation.survives ? 'text-amber-800 dark:text-amber-200' : 'text-red-800 dark:text-red-200'}`}>
                    {crashYear <= 3
                      ? "Early crashes are devastating. The portfolio has less time and fewer assets to recover."
                      : crashYear <= 7
                      ? "Mid-early crashes still cause significant damage during the critical window."
                      : "Later crashes are more manageable because the portfolio has already grown."
                    }
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 5: Mitigation Strategies */}
          <TabsContent value="mitigation" className="p-6 space-y-6">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Protecting Against Sequence Risk
              </h3>
              <p className="text-emerald-800 dark:text-emerald-200 mt-1 text-sm">
                You can&apos;t control the market, but you can control your strategy.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Strategy 1: Bond Tent */}
              <div className="border rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Bond Tent / Rising Equity Glide Path</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Increase bond allocation 5 years before retirement, then gradually shift back to stocks.
                    </p>
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                      <strong>Example:</strong> 80% stocks at 55 → 50% stocks at retirement → 70% stocks at 70
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 2: Cash Buffer */}
              <div className="border rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Cash Buffer (2-3 Years)</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Keep 2-3 years of expenses in cash/short-term bonds. Draw from this during market downturns.
                    </p>
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                      <strong>Example:</strong> {formatCurrency(initialBalance * 0.08)} - {formatCurrency(initialBalance * 0.12)} cash reserve
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 3: Flexible Spending */}
              <div className="border rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <RefreshCw className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Flexible Spending Rules</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cut discretionary spending by 10-20% when portfolio drops 15%+. Resume when it recovers.
                    </p>
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                      <strong>Impact:</strong> Can improve success rate by 10-15 percentage points
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 4: Part-time Work */}
              <div className="border rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                    <Briefcase className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Part-Time Work Option</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Earn $15-25K/year in the first 5 years. This dramatically reduces sequence risk.
                    </p>
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                      <strong>Benefit:</strong> Reduces portfolio withdrawals during the critical window
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Combined approach */}
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                The Power of Combining Strategies
              </h4>
              <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-2">
                Using multiple strategies together is more effective than any single approach:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Bond tent + Cash buffer = Protection without abandoning growth
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Flexible spending + Part-time work = Dynamic response to market conditions
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  All four combined can improve success rate by 15-25 percentage points
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* Tab 6: Why Monte Carlo */}
          <TabsContent value="montecarlo" className="p-6 space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Why We Run {batchSummary?.allRuns?.length.toLocaleString() || "2,000"} Simulations
              </h3>
              <p className="text-indigo-800 dark:text-indigo-200 mt-1 text-sm">
                Monte Carlo simulation captures sequence risk by showing the full range of possible outcomes.
              </p>
            </div>

            {/* Monte Carlo explanation */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-xl p-5">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  What Traditional Planning Misses
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">x</span>
                    <span>Assumes steady average returns every year</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">x</span>
                    <span>Ignores market volatility and sequences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">x</span>
                    <span>Shows only one &quot;most likely&quot; outcome</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">x</span>
                    <span>Can&apos;t quantify risk of failure</span>
                  </li>
                </ul>
              </div>

              <div className="border rounded-xl p-5 border-green-200 dark:border-green-800">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  What Monte Carlo Reveals
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">&#10003;</span>
                    <span>Tests thousands of different sequences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">&#10003;</span>
                    <span>Uses historical volatility patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">&#10003;</span>
                    <span>Shows range from best to worst case</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">&#10003;</span>
                    <span>Gives actual probability of success</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Distribution visualization */}
            {monteCarloAnalysis && (
              <div className="border rounded-xl p-5">
                <h4 className="font-semibold mb-4">Your Outcome Distribution ({monteCarloAnalysis.totalRuns.toLocaleString()} simulations)</h4>

                {/* Success rate badge */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`text-4xl font-bold ${
                    monteCarloAnalysis.successRate >= 90 ? 'text-green-600' :
                    monteCarloAnalysis.successRate >= 75 ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {monteCarloAnalysis.successRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Success Rate<br />
                    <span className="text-xs">(Portfolio survives through retirement)</span>
                  </div>
                </div>

                {/* Distribution bars */}
                <div className="space-y-3">
                  {monteCarloAnalysis.distribution.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">
                          {item.count.toLocaleString()} ({((item.count / monteCarloAnalysis.totalRuns) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-500`}
                          style={{ width: `${(item.count / monteCarloAnalysis.totalRuns) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* The 5th percentile matters */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-100">
                    The 5th Percentile Matters
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                    We don&apos;t plan for the median outcome - we plan for the bad ones.
                    {monteCarloAnalysis && (
                      <span>
                        {" "}In your 5th percentile scenario, you&apos;d have <strong>{formatCurrency(monteCarloAnalysis.p5Value)}</strong> at
                        end of life. This is what happens if you&apos;re unlucky.
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                    <strong>A good plan succeeds even in bad scenarios</strong> - that&apos;s why we run thousands of simulations,
                    not just one.
                  </p>
                </div>
              </div>
            </div>

            {/* Final message */}
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                The Bottom Line
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                Sequence of returns risk is real, but it&apos;s manageable. By understanding your risk window,
                using multiple mitigation strategies, and planning for bad scenarios (not just average ones),
                you can significantly improve your odds of a successful retirement.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
