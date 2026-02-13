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
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import {
  PiggyBank,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Info,
  DollarSign,
  Calculator,
  Clock,
  Zap,
  Award,
  Users,
  ArrowUp,
  ArrowRight,
  Sparkles,
  Scale,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanConfig } from "@/lib/plan-config-context";

// ==================== Types ====================

interface SavingsRateImpactProps {
  /** Whether dark mode is enabled */
  isDarkMode?: boolean;
}

interface SavingsRateHistory {
  month: string;
  rate: number;
}

// ==================== Constants ====================

// Time to FI by savings rate (assuming 5% real return, 4% SWR)
// Formula: Years = ln((SR / WR) + 1) / ln(1 + r) where SR=savings rate, WR=withdrawal rate, r=real return
const SAVINGS_RATE_TO_FI_YEARS: Record<number, number> = {
  5: 66,
  10: 51,
  15: 43,
  20: 37,
  25: 32,
  30: 28,
  35: 25,
  40: 22,
  45: 19,
  50: 17,
  55: 14.5,
  60: 12.5,
  65: 10.5,
  70: 8.5,
  75: 7,
  80: 5.5,
  85: 4,
  90: 2.5,
};

// Comparative data
const COMPARISON_DATA = {
  usAverage: 7,
  financiallyStressed: 0,
  comfortable: 15,
  goalOriented: 20,
  fireAspiring: 35,
  fireCommunity: 50,
  extremeFire: 70,
};

// FIRE milestones
const FIRE_MILESTONES = [
  { rate: 10, label: "Minimum", description: "Building basic security" },
  { rate: 20, label: "Traditional", description: "Standard retirement advice" },
  { rate: 30, label: "Accelerated", description: "Ahead of schedule" },
  { rate: 50, label: "FIRE Ready", description: "Financial independence in ~17 years" },
  { rate: 70, label: "Extreme FIRE", description: "FI in under a decade" },
];

// ==================== Helper Functions ====================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Calculate years to FI given savings rate
 * Using the formula from Early Retirement Now / Mr Money Mustache
 */
function calculateYearsToFI(
  savingsRate: number,
  realReturn: number = 5,
  withdrawalRate: number = 4
): number {
  if (savingsRate <= 0) return Infinity;
  if (savingsRate >= 100) return 0;

  const sr = savingsRate / 100;
  const wr = withdrawalRate / 100;
  const r = realReturn / 100;

  // Years = ln((SR / WR) + 1) / ln(1 + r)
  // Simplified: Years to save 25x expenses at savings rate sr with return r
  const years = Math.log((sr / wr) + 1) / Math.log(1 + r);
  return Math.max(0, years);
}

/**
 * Calculate impact of increasing savings rate vs return
 */
function calculateImpactComparison(
  currentSavingsRate: number,
  currentIncome: number,
  currentExpenses: number,
  realReturn: number = 5
): { savingsImpact: number; returnImpact: number } {
  // Impact of 5% increase in savings rate
  const currentYears = calculateYearsToFI(currentSavingsRate, realReturn);
  const newSavingsYears = calculateYearsToFI(currentSavingsRate + 5, realReturn);
  const savingsImpact = currentYears - newSavingsYears;

  // Impact of 1% better return
  const betterReturnYears = calculateYearsToFI(currentSavingsRate, realReturn + 1);
  const returnImpact = currentYears - betterReturnYears;

  return { savingsImpact, returnImpact };
}

// ==================== Component ====================

export default function SavingsRateImpact({
  isDarkMode = false,
}: SavingsRateImpactProps) {
  const { config } = usePlanConfig();

  // State
  const [customIncome, setCustomIncome] = useState<number | null>(null);
  const [customExpenses, setCustomExpenses] = useState<number | null>(null);
  const [targetSavingsRate, setTargetSavingsRate] = useState(50);
  const [raiseAmount, setRaiseAmount] = useState(10000);
  const [raiseSavePercent, setRaiseSavePercent] = useState(50);
  const [historyEntries, setHistoryEntries] = useState<SavingsRateHistory[]>([
    { month: "6 months ago", rate: 15 },
    { month: "3 months ago", rate: 18 },
    { month: "Today", rate: 22 },
  ]);

  // Calculate income from config
  const grossAnnualIncome = useMemo(() => {
    if (customIncome !== null) return customIncome;
    const primary = config.primaryIncome || 0;
    const spouse = config.spouseIncome || 0;
    return primary + spouse;
  }, [config.primaryIncome, config.spouseIncome, customIncome]);

  // Calculate expenses from config
  const annualExpenses = useMemo(() => {
    if (customExpenses !== null) return customExpenses;
    const monthlyHousehold = config.monthlyHouseholdExpenses || 0;
    const monthlyDiscretionary = config.monthlyDiscretionary || 0;
    const monthlyChildcare = config.monthlyChildcare || 0;
    const totalMonthly = monthlyHousehold + monthlyDiscretionary + monthlyChildcare;

    // If no expenses configured, estimate based on contributions
    if (totalMonthly === 0) {
      const totalContributions =
        (config.cTax1 || 0) +
        (config.cPre1 || 0) +
        (config.cPost1 || 0) +
        (config.cTax2 || 0) +
        (config.cPre2 || 0) +
        (config.cPost2 || 0);
      // Estimate expenses as income minus savings
      return Math.max(0, grossAnnualIncome - totalContributions);
    }

    return totalMonthly * 12;
  }, [config, grossAnnualIncome, customExpenses]);

  // Calculate annual savings
  const annualSavings = useMemo(() => {
    const totalContributions =
      (config.cTax1 || 0) +
      (config.cPre1 || 0) +
      (config.cPost1 || 0) +
      (config.cMatch1 || 0) +
      (config.cTax2 || 0) +
      (config.cPre2 || 0) +
      (config.cPost2 || 0) +
      (config.cMatch2 || 0);
    return totalContributions;
  }, [config]);

  // Calculate savings rate
  const savingsRate = useMemo(() => {
    if (grossAnnualIncome <= 0) return 0;
    return (annualSavings / grossAnnualIncome) * 100;
  }, [annualSavings, grossAnnualIncome]);

  // Calculate years to FI
  const yearsToFI = useMemo(() => {
    return calculateYearsToFI(savingsRate);
  }, [savingsRate]);

  // Time to FI chart data
  const timeToFIData = useMemo(() => {
    const data = [];
    for (let rate = 5; rate <= 90; rate += 5) {
      data.push({
        rate,
        years: calculateYearsToFI(rate),
        label: `${rate}%`,
      });
    }
    return data;
  }, []);

  // Savings vs returns impact
  const impactComparison = useMemo(() => {
    return calculateImpactComparison(savingsRate, grossAnnualIncome, annualExpenses);
  }, [savingsRate, grossAnnualIncome, annualExpenses]);

  // The Math Visualization - impact at different savings rates
  const savingsVsReturnsData = useMemo(() => {
    const rates = [10, 25, 50, 75];
    return rates.map((rate) => {
      const yearsBase = calculateYearsToFI(rate, 5);
      const yearsBetterReturn = calculateYearsToFI(rate, 6);
      const yearsMoreSavings = calculateYearsToFI(rate + 5, 5);

      return {
        rate: `${rate}%`,
        baseYears: yearsBase,
        betterReturnSavings: yearsBase - yearsBetterReturn,
        moreSavingsImpact: yearsBase - yearsMoreSavings,
      };
    });
  }, []);

  // Lifestyle inflation impact
  const lifestyleInflationData = useMemo(() => {
    const monthlyRaise = raiseAmount / 12;
    const savedPortion = (raiseSavePercent / 100) * raiseAmount;
    const spentPortion = raiseAmount - savedPortion;

    // Current FI timeline
    const currentYears = calculateYearsToFI(savingsRate);

    // If you save the raise
    const newSavings = annualSavings + savedPortion;
    const newRate = grossAnnualIncome > 0 ? (newSavings / (grossAnnualIncome + raiseAmount)) * 100 : 0;
    const yearsIfSaved = calculateYearsToFI(newRate);

    // If you spend the raise
    const inflatedRate = grossAnnualIncome > 0 ? (annualSavings / (grossAnnualIncome + raiseAmount)) * 100 : 0;
    const yearsIfSpent = calculateYearsToFI(inflatedRate);

    return {
      monthlyRaise,
      savedPortion,
      spentPortion,
      currentYears,
      yearsIfSaved,
      yearsIfSpent,
      yearsSaved: yearsIfSpent - yearsIfSaved,
    };
  }, [raiseAmount, raiseSavePercent, savingsRate, annualSavings, grossAnnualIncome]);

  // Comparison data for chart
  const comparisonChartData = useMemo(() => {
    return [
      { category: "US Average", rate: COMPARISON_DATA.usAverage, fill: "#94a3b8" },
      { category: "Comfortable", rate: COMPARISON_DATA.comfortable, fill: "#60a5fa" },
      { category: "Goal-Oriented", rate: COMPARISON_DATA.goalOriented, fill: "#34d399" },
      { category: "FIRE Aspiring", rate: COMPARISON_DATA.fireAspiring, fill: "#a78bfa" },
      { category: "FIRE Community", rate: COMPARISON_DATA.fireCommunity, fill: "#f472b6" },
      { category: "You", rate: savingsRate, fill: "#22c55e" },
    ].sort((a, b) => a.rate - b.rate);
  }, [savingsRate]);

  // Chart config
  const chartConfig: ChartConfig = {
    years: { label: "Years to FI", color: "#3b82f6" },
    rate: { label: "Savings Rate", color: "#22c55e" },
  };

  // Add history entry
  const addHistoryEntry = useCallback((rate: number) => {
    const today = new Date();
    const monthName = today.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    setHistoryEntries((prev) => [...prev, { month: monthName, rate }]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Core Truth */}
      <Card className="border-2 border-green-300 dark:border-green-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-green-900 dark:text-green-100">
            <PiggyBank className="h-8 w-8 text-green-600" />
            Savings Rate Impact Visualizer
          </CardTitle>
          <CardDescription className="text-green-800 dark:text-green-200 text-lg">
            <span className="font-bold italic">
              "Savings rate matters more than investment returns."
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <Flame className="h-6 w-6 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100">
                  The #1 Lever Most People Ignore
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  You can't control the market. You can't control inflation. But you CAN control
                  how much you save. Every dollar saved does double duty: it's money you have AND
                  money you've proven you don't need.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 h-auto">
          <TabsTrigger value="calculator" className="text-xs">
            <Calculator className="h-3 w-3 mr-1" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Time to FI
          </TabsTrigger>
          <TabsTrigger value="math" className="text-xs">
            <Scale className="h-3 w-3 mr-1" />
            The Math
          </TabsTrigger>
          <TabsTrigger value="impact" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Impact
          </TabsTrigger>
          <TabsTrigger value="raises" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Raises
          </TabsTrigger>
          <TabsTrigger value="journey" className="text-xs">
            <Award className="h-3 w-3 mr-1" />
            Journey
          </TabsTrigger>
          <TabsTrigger value="compare" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Compare
          </TabsTrigger>
        </TabsList>

        {/* 1. SAVINGS RATE CALCULATOR */}
        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Savings Rate Calculator
              </CardTitle>
              <CardDescription>
                Income - Expenses = Savings. Savings / Income = Savings Rate %
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Input Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="income">Annual Gross Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="income"
                      type="number"
                      value={customIncome !== null ? customIncome : grossAnnualIncome}
                      onChange={(e) => setCustomIncome(parseFloat(e.target.value) || 0)}
                      className="pl-7 font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From your plan: {formatCurrency(grossAnnualIncome)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenses">Annual Expenses</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="expenses"
                      type="number"
                      value={customExpenses !== null ? customExpenses : annualExpenses}
                      onChange={(e) => setCustomExpenses(parseFloat(e.target.value) || 0)}
                      className="pl-7 font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimated from contributions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Annual Savings</Label>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(annualSavings)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From configured contributions
                  </p>
                </div>
              </div>

              {/* Big Savings Rate Display */}
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-8 text-center">
                <div className="text-sm text-muted-foreground mb-2">Your Savings Rate</div>
                <div className={cn(
                  "text-7xl font-bold",
                  savingsRate >= 50 ? "text-green-600" :
                  savingsRate >= 25 ? "text-blue-600" :
                  savingsRate >= 15 ? "text-amber-600" :
                  "text-red-600"
                )}>
                  {formatPercent(savingsRate)}
                </div>
                <div className="text-lg mt-2 text-muted-foreground">
                  {savingsRate >= 50 ? "FIRE-Ready! Financial independence in reach" :
                   savingsRate >= 25 ? "Solid progress! Ahead of most Americans" :
                   savingsRate >= 15 ? "Good start! Room to accelerate" :
                   "Building momentum. Every increase matters!"}
                </div>

                {/* Progress Bar to 50% */}
                <div className="mt-6 max-w-md mx-auto">
                  <div className="flex justify-between text-sm mb-1">
                    <span>0%</span>
                    <span className="font-medium">Target: 50%</span>
                    <span>100%</span>
                  </div>
                  <Progress
                    value={Math.min(savingsRate, 100)}
                    className="h-4"
                  />
                </div>
              </div>

              {/* The Formula */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
                <div className="text-center font-mono text-lg">
                  <span className="text-blue-600">{formatCurrency(grossAnnualIncome)}</span>
                  <span className="mx-2">-</span>
                  <span className="text-red-600">{formatCurrency(annualExpenses)}</span>
                  <span className="mx-2">=</span>
                  <span className="text-green-600">{formatCurrency(annualSavings)}</span>
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  {formatCurrency(annualSavings)} / {formatCurrency(grossAnnualIncome)} = <strong>{formatPercent(savingsRate)}</strong>
                </div>
              </div>

              {/* Years to FI */}
              <div className={cn(
                "rounded-lg p-6 border-2",
                yearsToFI <= 10 ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" :
                yearsToFI <= 20 ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" :
                yearsToFI <= 30 ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" :
                "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">At this rate, FI in approximately</div>
                    <div className="text-4xl font-bold">
                      {yearsToFI === Infinity ? "Never" : `${Math.round(yearsToFI)} years`}
                    </div>
                  </div>
                  <Clock className={cn(
                    "h-12 w-12",
                    yearsToFI <= 10 ? "text-green-600" :
                    yearsToFI <= 20 ? "text-blue-600" :
                    yearsToFI <= 30 ? "text-amber-600" :
                    "text-red-600"
                  )} />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Based on 5% real returns and 4% safe withdrawal rate
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. TIME TO FI BY SAVINGS RATE */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Time to Financial Independence by Savings Rate
              </CardTitle>
              <CardDescription>
                Interactive slider to see how savings rate affects your timeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Milestones */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800 text-center">
                  <div className="text-3xl font-bold text-red-600">~51 yrs</div>
                  <div className="text-sm font-medium">10% Savings</div>
                  <div className="text-xs text-muted-foreground">Standard retirement timeline</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800 text-center">
                  <div className="text-3xl font-bold text-amber-600">~32 yrs</div>
                  <div className="text-sm font-medium">25% Savings</div>
                  <div className="text-xs text-muted-foreground">Accelerated path</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 text-center">
                  <div className="text-3xl font-bold text-blue-600">~17 yrs</div>
                  <div className="text-sm font-medium">50% Savings</div>
                  <div className="text-xs text-muted-foreground">FIRE territory</div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800 text-center">
                  <div className="text-3xl font-bold text-green-600">~7 yrs</div>
                  <div className="text-sm font-medium">75% Savings</div>
                  <div className="text-xs text-muted-foreground">Extreme FIRE</div>
                </div>
              </div>

              {/* Interactive Slider */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Explore Savings Rates</span>
                  <Badge variant="outline" className="text-lg px-4 py-1">
                    {targetSavingsRate}%
                  </Badge>
                </div>
                <Slider
                  value={[targetSavingsRate]}
                  onValueChange={(v) => setTargetSavingsRate(v[0])}
                  min={5}
                  max={90}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>5%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>90%</span>
                </div>

                <div className="mt-6 text-center">
                  <div className="text-sm text-muted-foreground">
                    At {targetSavingsRate}% savings rate, reach FI in:
                  </div>
                  <div className="text-5xl font-bold text-purple-600 mt-2">
                    {Math.round(calculateYearsToFI(targetSavingsRate))} years
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeToFIData}>
                    <defs>
                      <linearGradient id="colorYears" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="label"
                      className="text-sm"
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                    />
                    <YAxis
                      domain={[0, 70]}
                      className="text-sm"
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                      label={{ value: "Years to FI", angle: -90, position: "insideLeft" }}
                    />
                    <RTooltip
                      formatter={(v: number) => [`${Math.round(v)} years`, "Time to FI"]}
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                        borderRadius: "8px",
                        border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                      }}
                    />
                    <ReferenceLine
                      x={`${Math.round(savingsRate / 5) * 5}%`}
                      stroke="#22c55e"
                      strokeDasharray="5 5"
                      label={{ value: "Your Rate", fill: "#22c55e", position: "top" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="years"
                      stroke="#8b5cf6"
                      fill="url(#colorYears)"
                      strokeWidth={3}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Key Insight */}
              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-purple-900 dark:text-purple-100">
                      The Power Law of Savings
                    </div>
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      Notice how the curve drops sharply? Going from 10% to 20% saves 14 years.
                      Going from 50% to 60% saves only 4.5 years. Early percentage gains have
                      the biggest impact on your timeline.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. THE MATH VISUALIZATION */}
        <TabsContent value="math">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                The Math: Why Savings Rate Wins
              </CardTitle>
              <CardDescription>
                At low savings, returns don't matter much. At high savings, you're buying freedom.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* The Core Truth */}
              <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
                <div className="text-center space-y-4">
                  <div className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
                    Why Savings Rate Matters More
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Double Benefit of Savings</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Every dollar you save does TWO things:
                        (1) It adds to your nest egg, and
                        (2) It proves you need less to live on, reducing your FI target.
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Returns Are Unreliable</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You can't control the market. Historical averages mean nothing
                        for any given year. Savings rate is the ONE variable you control.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="text-left py-3 px-4 font-semibold">Savings Rate</th>
                      <th className="text-center py-3 px-4 font-semibold">Base Years to FI</th>
                      <th className="text-center py-3 px-4 font-semibold text-blue-600">+1% Better Return</th>
                      <th className="text-center py-3 px-4 font-semibold text-green-600">+5% More Savings</th>
                      <th className="text-center py-3 px-4 font-semibold">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsVsReturnsData.map((row, idx) => (
                      <tr key={row.rate} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-900/50"}>
                        <td className="py-3 px-4 font-medium">{row.rate}</td>
                        <td className="py-3 px-4 text-center">{row.baseYears.toFixed(1)} years</td>
                        <td className="py-3 px-4 text-center text-blue-600">
                          -{row.betterReturnSavings.toFixed(1)} years
                        </td>
                        <td className="py-3 px-4 text-center text-green-600">
                          -{row.moreSavingsImpact.toFixed(1)} years
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.moreSavingsImpact > row.betterReturnSavings ? (
                            <Badge className="bg-green-600">Savings</Badge>
                          ) : (
                            <Badge className="bg-blue-600">Returns</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Visual Chart */}
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={savingsVsReturnsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" label={{ value: "Years Saved", position: "bottom" }} />
                    <YAxis type="category" dataKey="rate" width={60} />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="betterReturnSavings" fill="#3b82f6" name="+1% Return" />
                    <Bar dataKey="moreSavingsImpact" fill="#22c55e" name="+5% Savings Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* The Punchline */}
              <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-lg text-green-900 dark:text-green-100">
                      The Crossover Point
                    </div>
                    <p className="text-green-800 dark:text-green-200 mt-2">
                      <strong>At most savings rates, increasing savings by 5% beats a 1% better return by 2-3x.</strong>
                      {" "}The only scenario where returns matter more is when you're already saving 75%+ -
                      and at that point, you're already winning!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. SAVINGS RATE VS RETURN IMPACT */}
        <TabsContent value="impact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Savings Rate vs Return Impact
              </CardTitle>
              <CardDescription>
                "Increasing savings rate 5% beats a 1% better return"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Your Current Situation */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
                <div className="text-sm text-muted-foreground mb-2">Your Current Situation</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{formatPercent(savingsRate)}</div>
                    <div className="text-xs text-muted-foreground">Current Savings Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{Math.round(yearsToFI)} yrs</div>
                    <div className="text-xs text-muted-foreground">Years to FI</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">5%</div>
                    <div className="text-xs text-muted-foreground">Assumed Real Return</div>
                  </div>
                </div>
              </div>

              {/* Impact Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* +5% Savings Rate */}
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-6 border-2 border-green-300 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowUp className="h-6 w-6 text-green-600" />
                    <span className="font-semibold text-lg">+5% Savings Rate</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New Rate:</span>
                      <span className="font-bold text-green-600">{formatPercent(savingsRate + 5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Years Saved:</span>
                      <span className="font-bold text-green-600 text-2xl">
                        {impactComparison.savingsImpact.toFixed(1)} years
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extra Monthly Savings:</span>
                      <span className="font-medium">
                        {formatCurrency((grossAnnualIncome * 0.05) / 12)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                    <div className="text-sm text-green-700 dark:text-green-300">
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      100% within your control
                    </div>
                  </div>
                </div>

                {/* +1% Return */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                    <span className="font-semibold text-lg">+1% Better Return</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New Return:</span>
                      <span className="font-bold text-blue-600">6% real</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Years Saved:</span>
                      <span className="font-bold text-blue-600 text-2xl">
                        {impactComparison.returnImpact.toFixed(1)} years
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Difficulty:</span>
                      <span className="font-medium text-amber-600">Beat market average</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                    <div className="text-sm text-amber-600">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Not guaranteed, requires luck/skill
                    </div>
                  </div>
                </div>
              </div>

              {/* The Verdict */}
              <div className={cn(
                "rounded-lg p-6 border-2",
                impactComparison.savingsImpact > impactComparison.returnImpact
                  ? "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600"
                  : "bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600"
              )}>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">The Winner</div>
                  <div className="text-3xl font-bold">
                    {impactComparison.savingsImpact > impactComparison.returnImpact ? (
                      <span className="text-green-600">+5% Savings Rate</span>
                    ) : (
                      <span className="text-blue-600">+1% Better Return</span>
                    )}
                  </div>
                  <div className="text-lg mt-2">
                    saves{" "}
                    <strong>
                      {Math.abs(impactComparison.savingsImpact - impactComparison.returnImpact).toFixed(1)} more years
                    </strong>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    That's{" "}
                    {(
                      (Math.max(impactComparison.savingsImpact, impactComparison.returnImpact) /
                        Math.min(impactComparison.savingsImpact, impactComparison.returnImpact)) || 1
                    ).toFixed(1)}x
                    more powerful!
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. LIFESTYLE INFLATION WARNING */}
        <TabsContent value="raises">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Lifestyle Inflation Warning
              </CardTitle>
              <CardDescription>
                "A raise only helps if you SAVE it"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Warning Banner */}
              <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-orange-900 dark:text-orange-100">
                      The Lifestyle Inflation Trap
                    </div>
                    <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                      Most people upgrade their lifestyle with every raise. New car, bigger house,
                      fancier dinners. Result? They're never any closer to financial freedom.
                      <strong> Your expenses rise to meet your income.</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Raise Calculator */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="raise-amount">Annual Raise Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="raise-amount"
                          type="number"
                          value={raiseAmount}
                          onChange={(e) => setRaiseAmount(parseFloat(e.target.value) || 0)}
                          className="pl-7 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Percentage You'll Save</Label>
                        <Badge variant="outline">{raiseSavePercent}%</Badge>
                      </div>
                      <Slider
                        value={[raiseSavePercent]}
                        onValueChange={(v) => setRaiseSavePercent(v[0])}
                        min={0}
                        max={100}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0% (spend it all)</span>
                        <span>100% (save it all)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <span className="text-muted-foreground">Monthly Raise:</span>
                      <span className="font-bold">{formatCurrency(lifestyleInflationData.monthlyRaise)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <span className="text-green-700 dark:text-green-300">You'll Save:</span>
                      <span className="font-bold text-green-600">{formatCurrency(lifestyleInflationData.savedPortion)}/yr</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <span className="text-red-700 dark:text-red-300">You'll Spend:</span>
                      <span className="font-bold text-red-600">{formatCurrency(lifestyleInflationData.spentPortion)}/yr</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Visualization */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border text-center">
                  <div className="text-sm text-muted-foreground mb-1">Current Timeline</div>
                  <div className="text-3xl font-bold">{Math.round(lifestyleInflationData.currentYears)} yrs</div>
                  <div className="text-xs text-muted-foreground">to FI</div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800 text-center">
                  <div className="text-sm text-green-700 dark:text-green-300 mb-1">
                    Save {raiseSavePercent}% of Raise
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round(lifestyleInflationData.yearsIfSaved)} yrs
                  </div>
                  <div className="text-xs text-green-600">
                    {lifestyleInflationData.currentYears > lifestyleInflationData.yearsIfSaved
                      ? `${(lifestyleInflationData.currentYears - lifestyleInflationData.yearsIfSaved).toFixed(1)} years sooner!`
                      : "to FI"}
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800 text-center">
                  <div className="text-sm text-red-700 dark:text-red-300 mb-1">
                    Spend 100% of Raise
                  </div>
                  <div className="text-3xl font-bold text-red-600">
                    {Math.round(lifestyleInflationData.yearsIfSpent)} yrs
                  </div>
                  <div className="text-xs text-red-600">
                    {lifestyleInflationData.yearsIfSpent > lifestyleInflationData.currentYears
                      ? "Actually LONGER!"
                      : "to FI"}
                  </div>
                </div>
              </div>

              {/* The Punchline */}
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg p-6 border-2 border-green-300 dark:border-green-700">
                <div className="text-center space-y-3">
                  <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                    The Raise Reality Check
                  </div>
                  <div className="text-4xl font-bold text-green-600">
                    {lifestyleInflationData.yearsSaved.toFixed(1)} years
                  </div>
                  <p className="text-green-800 dark:text-green-200">
                    That's how much time you'll save by keeping {raiseSavePercent}% of your raise
                    instead of spending it all. Every raise is a fork in the road: freedom or lifestyle creep.
                  </p>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      The 50% Rule
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      A sustainable approach: Save 50% of every raise, spend 50%. You still enjoy
                      improving your lifestyle while accelerating toward freedom. Over time, this
                      naturally increases your savings rate with each raise.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. YOUR SAVINGS RATE JOURNEY */}
        <TabsContent value="journey">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                Your Savings Rate Journey
              </CardTitle>
              <CardDescription>
                Track your progress and celebrate improvements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Achievement */}
              <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-lg p-6 text-center">
                <div className="text-sm text-muted-foreground mb-2">Current Achievement Level</div>
                <div className="text-4xl font-bold text-amber-600 mb-2">
                  {savingsRate >= 70 ? "Extreme FIRE" :
                   savingsRate >= 50 ? "FIRE Ready" :
                   savingsRate >= 30 ? "Accelerated" :
                   savingsRate >= 20 ? "Traditional" :
                   savingsRate >= 10 ? "Building" :
                   "Starting Out"}
                </div>
                <div className="text-lg text-amber-700 dark:text-amber-300">
                  {formatPercent(savingsRate)} Savings Rate
                </div>
              </div>

              {/* Milestones Progress */}
              <div className="space-y-4">
                <div className="text-sm font-medium">Savings Rate Milestones</div>
                {FIRE_MILESTONES.map((milestone) => {
                  const achieved = savingsRate >= milestone.rate;
                  const progress = Math.min((savingsRate / milestone.rate) * 100, 100);

                  return (
                    <div key={milestone.rate} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {achieved ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Target className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className={cn(
                            "font-medium",
                            achieved ? "text-green-700 dark:text-green-300" : "text-muted-foreground"
                          )}>
                            {milestone.rate}% - {milestone.label}
                          </span>
                        </div>
                        {achieved && (
                          <Badge className="bg-green-600">Achieved!</Badge>
                        )}
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{milestone.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* History Tracking */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
                <div className="text-sm font-medium mb-4">Your Progress Over Time</div>
                {historyEntries.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyEntries}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, Math.max(50, ...historyEntries.map(h => h.rate)) + 10]} />
                        <RTooltip />
                        <Line
                          type="monotone"
                          dataKey="rate"
                          stroke="#22c55e"
                          strokeWidth={3}
                          dot={{ fill: "#22c55e", strokeWidth: 2, r: 5 }}
                          name="Savings Rate %"
                        />
                        <ReferenceLine y={50} stroke="#8b5cf6" strokeDasharray="5 5" label="FIRE Target" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Start tracking your savings rate journey!</p>
                  </div>
                )}

                <button
                  onClick={() => addHistoryEntry(savingsRate)}
                  className="mt-4 w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  type="button"
                >
                  <Sparkles className="h-4 w-4" />
                  Record Today's Rate ({formatPercent(savingsRate)})
                </button>
              </div>

              {/* Celebration or Encouragement */}
              {savingsRate >= 25 ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        Congratulations! You're Ahead of the Curve
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        At {formatPercent(savingsRate)}, you're saving more than most Americans ever will.
                        Every percentage point from here accelerates your journey to freedom. Keep going!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-900 dark:text-blue-100">
                        Every Step Counts
                      </div>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        You're at {formatPercent(savingsRate)} - that's a solid foundation!
                        Focus on increasing by just 1% per month. Small, consistent improvements
                        compound into massive results over time.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. COMPARISON TO AVERAGES */}
        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Comparison to Averages
              </CardTitle>
              <CardDescription>
                Where do you stand? Where do you want to be?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border text-center">
                  <div className="text-sm text-muted-foreground mb-1">US Average</div>
                  <div className="text-3xl font-bold text-gray-500">~7%</div>
                  <div className="text-xs text-muted-foreground">Personal savings rate</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800 text-center">
                  <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">FIRE Community</div>
                  <div className="text-3xl font-bold text-purple-600">50%+</div>
                  <div className="text-xs text-purple-600">Target savings rate</div>
                </div>
                <div className={cn(
                  "rounded-lg p-4 border-2 text-center",
                  savingsRate >= 50
                    ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700"
                    : savingsRate >= 20
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700"
                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700"
                )}>
                  <div className="text-sm text-muted-foreground mb-1">You</div>
                  <div className={cn(
                    "text-3xl font-bold",
                    savingsRate >= 50 ? "text-green-600" :
                    savingsRate >= 20 ? "text-blue-600" :
                    "text-amber-600"
                  )}>
                    {formatPercent(savingsRate)}
                  </div>
                  <div className="text-xs text-muted-foreground">Current rate</div>
                </div>
              </div>

              {/* Comparison Chart */}
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" domain={[0, 80]} unit="%" />
                    <YAxis type="category" dataKey="category" width={100} />
                    <RTooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Savings Rate"]} />
                    <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                      {comparisonChartData.map((entry, index) => (
                        <Bar
                          key={index}
                          dataKey="rate"
                          fill={entry.category === "You" ? "#22c55e" : entry.fill}
                        />
                      ))}
                    </Bar>
                    <ReferenceLine x={50} stroke="#8b5cf6" strokeDasharray="5 5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Where Do You Want to Be */}
              <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
                <div className="text-center space-y-4">
                  <div className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
                    Where Do You Want to Be?
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 hover:ring-2 hover:ring-indigo-300 cursor-pointer transition-all">
                      <div className="text-xl font-bold text-gray-600">20%</div>
                      <div className="text-sm font-medium">Traditional Path</div>
                      <div className="text-xs text-muted-foreground">
                        Retire at 65 comfortably
                      </div>
                      <div className="text-xs text-indigo-600 mt-2">~37 years to FI</div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 ring-2 ring-purple-400">
                      <div className="text-xl font-bold text-purple-600">50%</div>
                      <div className="text-sm font-medium">FIRE Target</div>
                      <div className="text-xs text-muted-foreground">
                        Financial independence in ~17 years
                      </div>
                      <Badge className="mt-2 bg-purple-600">Recommended</Badge>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 hover:ring-2 hover:ring-indigo-300 cursor-pointer transition-all">
                      <div className="text-xl font-bold text-green-600">70%+</div>
                      <div className="text-sm font-medium">Extreme FIRE</div>
                      <div className="text-xs text-muted-foreground">
                        FI in under a decade
                      </div>
                      <div className="text-xs text-green-600 mt-2">~8.5 years to FI</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gap Analysis */}
              {savingsRate < 50 && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-6 border">
                  <div className="flex items-start gap-4">
                    <ArrowRight className="h-8 w-8 text-purple-600 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-lg">
                        To reach 50% FIRE target:
                      </div>
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Gap to close:</span>
                          <span className="font-bold text-purple-600">
                            {formatPercent(50 - savingsRate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Extra monthly savings needed:</span>
                          <span className="font-bold text-purple-600">
                            {formatCurrency(((50 - savingsRate) / 100) * grossAnnualIncome / 12)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Time saved vs current rate:</span>
                          <span className="font-bold text-green-600">
                            {(yearsToFI - calculateYearsToFI(50)).toFixed(1)} years
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Encouragement */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      Remember: Progress Over Perfection
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Don't compare yourself to extreme savers or feel bad about where you are.
                      What matters is the direction you're moving. Every 1% increase in savings rate
                      is a victory. Focus on consistent, sustainable progress.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Named export for flexibility
export { SavingsRateImpact };
