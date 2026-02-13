"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ReferenceLine,
} from "recharts";
import {
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  Coffee,
  ShoppingCart,
  Heart,
  GraduationCap,
  Fuel,
  Home,
  Info,
  TrendingUp,
  Clock,
  Landmark,
} from "lucide-react";

// Lazy load the ComposedChart for better performance
const ComposedChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.ComposedChart })),
  { ssr: false }
);

const AreaChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.AreaChart })),
  { ssr: false }
);

interface InflationImpactProps {
  /** Current inflation rate assumption (default 3%) */
  inflationRate?: number;
  /** Starting portfolio value */
  portfolioValue?: number;
  /** Expected nominal return rate */
  nominalReturnRate?: number;
  /** Current year */
  currentYear?: number;
  /** Whether dark mode is enabled */
  isDarkMode?: boolean;
  /** Years until retirement */
  yearsToRetirement?: number;
  /** Monthly Social Security benefit (if any) */
  socialSecurityMonthly?: number;
  /** Monthly pension benefit (if any) */
  pensionMonthly?: number;
}

// Historical inflation data for context
const HISTORICAL_INFLATION = {
  average1900to2024: 3.2,
  average1970s: 7.1,
  peak1980: 13.5,
  average2010s: 1.8,
  post2020spike: 8.0,
};

// Category-specific inflation rates (higher than general CPI)
const CATEGORY_INFLATION = {
  general: 3.0,
  healthcare: 5.5, // Medical costs historically inflate ~5-6%
  college: 6.0, // College costs historically inflate ~5-7%
  housing: 4.0, // Housing costs vary by location
  food: 3.5,
  energy: 4.0,
};

// Real items for the $100 test - visceral comparisons
const ITEMS_2006 = [
  { name: "Cup of coffee", price2006: 2.5, icon: Coffee },
  { name: "Gallon of gas", price2006: 2.59, icon: Fuel },
  { name: "Dozen eggs", price2006: 1.45, icon: ShoppingCart },
  { name: "Movie ticket", price2006: 6.55, icon: TrendingUp },
  { name: "Loaf of bread", price2006: 1.05, icon: ShoppingCart },
];

/**
 * Calculate purchasing power after inflation
 */
function calculatePurchasingPower(
  amount: number,
  inflationRate: number,
  years: number
): number {
  return amount / Math.pow(1 + inflationRate / 100, years);
}

/**
 * Calculate future cost with inflation
 */
function calculateFutureCost(
  currentCost: number,
  inflationRate: number,
  years: number
): number {
  return currentCost * Math.pow(1 + inflationRate / 100, years);
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format currency with full precision
 */
function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * InflationImpact - Makes inflation viscerally felt
 * "A number isn't a plan. Purchasing power is the plan."
 */
export const InflationImpact = React.memo(function InflationImpact({
  inflationRate = 3.0,
  portfolioValue = 1000000,
  nominalReturnRate = 8.0,
  currentYear = new Date().getFullYear(),
  isDarkMode = false,
  yearsToRetirement = 20,
  socialSecurityMonthly = 2500,
  pensionMonthly = 0,
}: InflationImpactProps) {
  // Interactive controls
  const [timeHorizon, setTimeHorizon] = useState(30);
  const [selectedScenario, setSelectedScenario] = useState<
    "normal" | "moderate" | "severe"
  >("normal");

  // Calculate real return
  const realReturn = useMemo(() => {
    return (
      ((1 + nominalReturnRate / 100) / (1 + inflationRate / 100) - 1) * 100
    );
  }, [nominalReturnRate, inflationRate]);

  // Purchasing power data for visualization
  const purchasingPowerData = useMemo(() => {
    const data = [];
    for (let year = 0; year <= timeHorizon; year += 5) {
      const purchasingPower = calculatePurchasingPower(
        portfolioValue,
        inflationRate,
        year
      );
      data.push({
        year: currentYear + year,
        yearsOut: year,
        nominal: portfolioValue,
        real: purchasingPower,
        percentageLeft: (purchasingPower / portfolioValue) * 100,
      });
    }
    return data;
  }, [portfolioValue, inflationRate, timeHorizon, currentYear]);

  // Real vs Nominal returns chart data
  const returnsComparisonData = useMemo(() => {
    const data = [];
    let nominalBalance = portfolioValue;
    let realBalance = portfolioValue;

    for (let year = 0; year <= timeHorizon; year++) {
      data.push({
        year: currentYear + year,
        nominal: nominalBalance,
        real: realBalance,
        inflation: nominalBalance - realBalance,
      });

      nominalBalance *= 1 + nominalReturnRate / 100;
      realBalance *= 1 + realReturn / 100;
    }
    return data;
  }, [
    portfolioValue,
    nominalReturnRate,
    realReturn,
    timeHorizon,
    currentYear,
  ]);

  // Expense inflation timeline data
  const expenseTimelineData = useMemo(() => {
    const baseCosts = {
      groceries: 800,
      healthcare: 500,
      housing: 2000,
      utilities: 300,
    };

    const data = [];
    for (let year = 0; year <= 30; year += 10) {
      data.push({
        year: currentYear + year,
        yearsOut: year,
        groceries: calculateFutureCost(baseCosts.groceries, CATEGORY_INFLATION.food, year),
        healthcare: calculateFutureCost(baseCosts.healthcare, CATEGORY_INFLATION.healthcare, year),
        housing: calculateFutureCost(baseCosts.housing, CATEGORY_INFLATION.housing, year),
        utilities: calculateFutureCost(baseCosts.utilities, CATEGORY_INFLATION.energy, year),
      });
    }
    return data;
  }, [currentYear]);

  // Inflation scenario data (normal vs 1970s-style)
  const scenarioData = useMemo(() => {
    const scenarios = {
      normal: 3.0,
      moderate: 5.0,
      severe: 8.0, // 1970s style
    };

    const scenarioRate = scenarios[selectedScenario];
    const data = [];

    for (let year = 0; year <= 30; year++) {
      const normalPower = calculatePurchasingPower(portfolioValue, 3.0, year);
      const scenarioPower = calculatePurchasingPower(
        portfolioValue,
        scenarioRate,
        year
      );

      data.push({
        year: currentYear + year,
        normal: normalPower,
        scenario: scenarioPower,
        difference: normalPower - scenarioPower,
      });
    }
    return data;
  }, [portfolioValue, selectedScenario, currentYear]);

  // Calculate key metrics for the $100 test
  const inflationMultiplier2006to2026 = Math.pow(1.03, 20); // ~1.806
  const inflationMultiplier2026to2046 = Math.pow(1 + inflationRate / 100, 20);

  // Dollar bill shrinking visual data
  const dollarShrinkingData = useMemo(() => {
    const purchasingPowerRemaining = calculatePurchasingPower(
      100,
      inflationRate,
      timeHorizon
    );
    return {
      original: 100,
      remaining: purchasingPowerRemaining,
      percentLost: 100 - purchasingPowerRemaining,
    };
  }, [inflationRate, timeHorizon]);

  return (
    <div className="space-y-6">
      {/* Header with Key Message */}
      <Card className="border-red-200 dark:border-red-900 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Inflation: The Silent Killer of Retirement
          </CardTitle>
          <CardDescription className="text-red-800 dark:text-red-200 text-base">
            <span className="font-semibold italic">
              "A number isn't a plan. Purchasing power is the plan."
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <div className="text-sm text-muted-foreground">
                Your {formatCurrency(portfolioValue)} today
              </div>
              <div className="text-2xl font-bold text-red-600">
                = {formatCurrency(purchasingPowerData[purchasingPowerData.length - 1]?.real || 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                in {timeHorizon} years (today's dollars)
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="text-sm text-muted-foreground">
                Purchasing Power Lost
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {(100 - dollarShrinkingData.remaining).toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">
                at {inflationRate}% inflation over {timeHorizon} years
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="text-sm text-muted-foreground">
                Real Return After Inflation
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {realReturn.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                ({nominalReturnRate}% nominal - {inflationRate}% inflation)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="erosion" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 h-auto">
          <TabsTrigger value="erosion" className="text-xs">
            <TrendingDown className="h-3 w-3 mr-1" />
            Erosion
          </TabsTrigger>
          <TabsTrigger value="returns" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Real vs Nominal
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">
            <ShoppingCart className="h-3 w-3 mr-1" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="test" className="text-xs">
            <DollarSign className="h-3 w-3 mr-1" />
            $100 Test
          </TabsTrigger>
          <TabsTrigger value="income" className="text-xs">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Protected Income
          </TabsTrigger>
          <TabsTrigger value="sequence" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Sequence Risk
          </TabsTrigger>
          <TabsTrigger value="tips" className="text-xs">
            <Landmark className="h-3 w-3 mr-1" />
            TIPS & I-Bonds
          </TabsTrigger>
        </TabsList>

        {/* 1. PURCHASING POWER EROSION */}
        <TabsContent value="erosion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Purchasing Power Erosion
              </CardTitle>
              <CardDescription>
                Watch your money's real value shrink over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Time Horizon Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Time Horizon</span>
                  <Badge variant="outline">{timeHorizon} years</Badge>
                </div>
                <Slider
                  value={[timeHorizon]}
                  onValueChange={(v) => setTimeHorizon(v[0])}
                  min={5}
                  max={40}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Visual Dollar Bill Shrinking */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <div className="text-center space-y-4">
                  <div className="text-lg font-semibold text-green-800 dark:text-green-200">
                    Your Dollar Bill Shrinks Over Time
                  </div>
                  <div className="flex items-center justify-center gap-8">
                    {/* Today's dollar */}
                    <div className="text-center">
                      <div className="relative">
                        <DollarSign
                          className="h-24 w-24 text-green-600"
                          strokeWidth={1.5}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-green-700">
                            $1
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        Today ({currentYear})
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-4xl text-gray-400">→</div>

                    {/* Future dollar (shrunken) */}
                    <div className="text-center">
                      <div
                        className="relative transition-all duration-500"
                        style={{
                          transform: `scale(${dollarShrinkingData.remaining / 100})`,
                        }}
                      >
                        <DollarSign
                          className="h-24 w-24 text-red-400"
                          strokeWidth={1.5}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-red-500">
                            $1
                          </span>
                        </div>
                      </div>
                      <div
                        className="text-sm text-muted-foreground mt-2"
                        style={{
                          marginTop: `${24 - (dollarShrinkingData.remaining / 100) * 24}px`,
                        }}
                      >
                        In {timeHorizon} years ({currentYear + timeHorizon})
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                    Your ${portfolioValue.toLocaleString()} in {currentYear} dollars ={" "}
                    {formatCurrencyFull(
                      purchasingPowerData[purchasingPowerData.length - 1]
                        ?.real || 0
                    )}{" "}
                    in {currentYear + timeHorizon} dollars
                  </div>
                </div>
              </div>

              {/* Purchasing Power Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={purchasingPowerData}>
                    <defs>
                      <linearGradient
                        id="colorPurchasing"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="year"
                      className="text-sm"
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                    />
                    <YAxis
                      tickFormatter={(v) => formatCurrency(v)}
                      className="text-sm"
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                    />
                    <RTooltip
                      formatter={(v: number) => formatCurrencyFull(v)}
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                        borderRadius: "8px",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                      }}
                    />
                    <Legend />
                    <ReferenceLine
                      y={portfolioValue}
                      stroke="#3b82f6"
                      strokeDasharray="5 5"
                      label={{
                        value: "Nominal Value",
                        position: "right",
                        fill: "#3b82f6",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="real"
                      stroke="#ef4444"
                      fill="url(#colorPurchasing)"
                      strokeWidth={2}
                      name="Real Purchasing Power"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Key Insight */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100">
                      The Invisible Tax
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      At {inflationRate}% inflation, your money loses half its
                      purchasing power every{" "}
                      {Math.round(72 / inflationRate)} years (the Rule of 72).
                      This isn't a theoretical risk - it's happening right now.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. REAL VS NOMINAL RETURNS */}
        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Real vs Nominal Returns
              </CardTitle>
              <CardDescription>
                Your portfolio grew {nominalReturnRate}%... but inflation was{" "}
                {inflationRate}%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Nominal Return
                  </div>
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {nominalReturnRate}%
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    What your statement shows
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Inflation
                  </div>
                  <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                    -{inflationRate}%
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    The silent erosion
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-700 dark:text-green-300">
                    REAL Return
                  </div>
                  <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {realReturn.toFixed(1)}%
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    What you actually keep
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={returnsComparisonData}>
                    <defs>
                      <linearGradient
                        id="colorNominal"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorReal"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="year"
                      className="text-sm"
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                    />
                    <YAxis
                      tickFormatter={(v) => formatCurrency(v)}
                      className="text-sm"
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                    />
                    <RTooltip
                      formatter={(v: number, name: string) => [
                        formatCurrencyFull(v),
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                        borderRadius: "8px",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="nominal"
                      stroke="#3b82f6"
                      fill="url(#colorNominal)"
                      strokeWidth={2}
                      name="Nominal (What Statement Shows)"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="real"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      name="Real (Actual Purchasing Power)"
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* The Gap */}
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-orange-900 dark:text-orange-100">
                      The Gap Grows Over Time
                    </div>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      After {timeHorizon} years, your nominal balance would be{" "}
                      {formatCurrencyFull(
                        returnsComparisonData[returnsComparisonData.length - 1]
                          ?.nominal || 0
                      )}
                      , but its real purchasing power is only{" "}
                      {formatCurrencyFull(
                        returnsComparisonData[returnsComparisonData.length - 1]
                          ?.real || 0
                      )}
                      . The difference of{" "}
                      {formatCurrencyFull(
                        (returnsComparisonData[returnsComparisonData.length - 1]
                          ?.nominal || 0) -
                          (returnsComparisonData[
                            returnsComparisonData.length - 1
                          ]?.real || 0)
                      )}{" "}
                      is lost to inflation.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. EXPENSE INFLATION TIMELINE */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
                Expense Inflation Timeline
              </CardTitle>
              <CardDescription>
                Different expenses inflate at different rates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Expense Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Groceries */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Groceries</span>
                    <Badge variant="outline" className="ml-auto">
                      {CATEGORY_INFLATION.food}% annual
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Today:</span>
                      <span className="font-medium">$800/month</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>In 20 years:</span>
                      <span className="font-medium">
                        {formatCurrencyFull(
                          calculateFutureCost(800, CATEGORY_INFLATION.food, 20)
                        )}
                        /month
                      </span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>In 30 years:</span>
                      <span className="font-medium">
                        {formatCurrencyFull(
                          calculateFutureCost(800, CATEGORY_INFLATION.food, 30)
                        )}
                        /month
                      </span>
                    </div>
                  </div>
                </div>

                {/* Healthcare */}
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-5 w-5 text-red-600" />
                    <span className="font-semibold">Healthcare</span>
                    <Badge
                      variant="outline"
                      className="ml-auto bg-red-100 text-red-700 border-red-300"
                    >
                      {CATEGORY_INFLATION.healthcare}% annual
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Today:</span>
                      <span className="font-medium">$500/month</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>In 20 years:</span>
                      <span className="font-medium">
                        {formatCurrencyFull(
                          calculateFutureCost(
                            500,
                            CATEGORY_INFLATION.healthcare,
                            20
                          )
                        )}
                        /month
                      </span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>In 30 years:</span>
                      <span className="font-medium">
                        {formatCurrencyFull(
                          calculateFutureCost(
                            500,
                            CATEGORY_INFLATION.healthcare,
                            30
                          )
                        )}
                        /month
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Healthcare inflates nearly 2x faster than general CPI
                  </div>
                </div>

                {/* College (Grandkids) */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">College (Grandkids)</span>
                    <Badge
                      variant="outline"
                      className="ml-auto bg-blue-100 text-blue-700 border-blue-300"
                    >
                      {CATEGORY_INFLATION.college}% annual
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Today (4-year public):</span>
                      <span className="font-medium">$100,000</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>In 18 years:</span>
                      <span className="font-medium">
                        {formatCurrencyFull(
                          calculateFutureCost(
                            100000,
                            CATEGORY_INFLATION.college,
                            18
                          )
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    College costs have outpaced inflation for decades
                  </div>
                </div>

                {/* Housing */}
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Home className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold">Housing / Rent</span>
                    <Badge
                      variant="outline"
                      className="ml-auto bg-amber-100 text-amber-700 border-amber-300"
                    >
                      {CATEGORY_INFLATION.housing}% annual
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Today:</span>
                      <span className="font-medium">$2,000/month</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>In 20 years:</span>
                      <span className="font-medium">
                        {formatCurrencyFull(
                          calculateFutureCost(
                            2000,
                            CATEGORY_INFLATION.housing,
                            20
                          )
                        )}
                        /month
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Insight */}
              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-purple-900 dark:text-purple-100">
                      Retiree Inflation is Higher Than CPI
                    </div>
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      The Consumer Price Index (CPI) measures average inflation.
                      But retirees spend more on healthcare (5.5% inflation) and
                      less on items that deflate (like electronics). Your
                      personal inflation rate may be 1-2% higher than the
                      official rate.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. THE $100 TEST */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                The $100 Test
              </CardTitle>
              <CardDescription>
                Making inflation visceral with real items you buy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timeline Banner */}
              <div className="bg-gradient-to-r from-green-100 via-amber-100 to-red-100 dark:from-green-900/30 dark:via-amber-900/30 dark:to-red-900/30 rounded-lg p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground">2006</div>
                    <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                      $100
                    </div>
                    <div className="text-xs text-green-600">Full basket</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Today</div>
                    <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                      ${Math.round(100 * inflationMultiplier2006to2026)}
                    </div>
                    <div className="text-xs text-amber-600">Same items</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      2046 (20 years)
                    </div>
                    <div className="text-3xl font-bold text-red-700 dark:text-red-300">
                      $
                      {Math.round(
                        100 *
                          inflationMultiplier2006to2026 *
                          inflationMultiplier2026to2046
                      )}
                    </div>
                    <div className="text-xs text-red-600">Same items</div>
                  </div>
                </div>
              </div>

              {/* Individual Items */}
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  What $100 Bought in 2006:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ITEMS_2006.map((item) => {
                    const Icon = item.icon;
                    const priceToday = item.price2006 * inflationMultiplier2006to2026;
                    const priceFuture = priceToday * inflationMultiplier2026to2046;

                    return (
                      <div
                        key={item.name}
                        className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-green-600">2006:</span>
                            <span>${item.price2006.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-600">Today:</span>
                            <span>${priceToday.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600">2046:</span>
                            <span>${priceFuture.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* The Punchline */}
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-red-900 dark:text-red-100">
                      The Math Doesn't Lie
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      If you're planning to retire on $5,000/month in today's
                      dollars, you'll need{" "}
                      <strong>
                        ${Math.round(5000 * inflationMultiplier2026to2046).toLocaleString()}
                        /month
                      </strong>{" "}
                      in 20 years just to maintain the same lifestyle. That's
                      not a raise - that's breaking even.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. INFLATION-PROTECTED INCOME */}
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Inflation-Protected Income Sources
              </CardTitle>
              <CardDescription>
                Not all income keeps up with rising costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Income Sources Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Social Security - Protected */}
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border-2 border-green-300 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-6 w-6 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      Social Security
                    </span>
                  </div>
                  <Badge className="bg-green-600 hover:bg-green-700 mb-3">
                    Inflation-Adjusted
                  </Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Today:</span>
                      <span className="font-medium">
                        ${socialSecurityMonthly.toLocaleString()}/month
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>In 20 years:</span>
                      <span className="font-medium">
                        {formatCurrencyFull(
                          calculateFutureCost(
                            socialSecurityMonthly,
                            inflationRate,
                            20
                          )
                        )}
                        /month
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-green-600 dark:text-green-400">
                    COLA adjustments protect your purchasing power
                  </div>
                </div>

                {/* Pension - Usually NOT Protected */}
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border-2 border-red-300 dark:border-red-700">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldX className="h-6 w-6 text-red-600" />
                    <span className="font-semibold text-red-800 dark:text-red-200">
                      Pension (Typical)
                    </span>
                  </div>
                  <Badge variant="destructive" className="mb-3">
                    Usually NOT Adjusted
                  </Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Year 1:</span>
                      <span className="font-medium">
                        ${(pensionMonthly || 2000).toLocaleString()}/month
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Year 20:</span>
                      <span className="font-medium text-red-600">
                        ${(pensionMonthly || 2000).toLocaleString()}/month
                      </span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Real value in year 20:</span>
                      <span className="font-medium">
                        {formatCurrencyFull(
                          calculatePurchasingPower(
                            pensionMonthly || 2000,
                            inflationRate,
                            20
                          )
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-red-600 dark:text-red-400">
                    Fixed payments lose ~{(100 - calculatePurchasingPower(100, inflationRate, 20)).toFixed(0)}% of purchasing power over 20 years
                  </div>
                </div>

                {/* Portfolio - Must Grow */}
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border-2 border-amber-300 dark:border-amber-700">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-6 w-6 text-amber-600" />
                    <span className="font-semibold text-amber-800 dark:text-amber-200">
                      Portfolio Withdrawals
                    </span>
                  </div>
                  <Badge className="bg-amber-600 hover:bg-amber-700 mb-3">
                    Must Grow to Maintain
                  </Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Year 1 withdrawal:</span>
                      <span className="font-medium">$4,000/month</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Year 20 needed:</span>
                      <span className="font-medium">
                        {formatCurrencyFull(
                          calculateFutureCost(4000, inflationRate, 20)
                        )}
                        /month
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                    Your withdrawals must increase with inflation
                  </div>
                </div>
              </div>

              {/* The Strategy */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      Building an Inflation-Resistant Income Floor
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                      The ideal retirement income strategy layers multiple sources:
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 list-disc list-inside space-y-1">
                      <li>
                        <strong>Foundation:</strong> Social Security (covers
                        essential expenses)
                      </li>
                      <li>
                        <strong>Buffer:</strong> Pension or annuity income
                        (understand if it adjusts)
                      </li>
                      <li>
                        <strong>Flexibility:</strong> Portfolio withdrawals
                        (must grow 3-4% annually)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. SEQUENCE OF INFLATION RISK */}
        <TabsContent value="sequence">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Sequence of Inflation Risk
              </CardTitle>
              <CardDescription>
                When inflation hits matters as much as how much
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scenario Selector */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedScenario === "normal" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedScenario("normal")}
                >
                  Normal (3%)
                </Badge>
                <Badge
                  variant={
                    selectedScenario === "moderate" ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => setSelectedScenario("moderate")}
                >
                  Moderate (5%)
                </Badge>
                <Badge
                  variant={selectedScenario === "severe" ? "default" : "outline"}
                  className="cursor-pointer bg-red-600 hover:bg-red-700"
                  onClick={() => setSelectedScenario("severe")}
                >
                  1970s-Style (8%)
                </Badge>
              </div>

              {/* Scenario Comparison Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={scenarioData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="year"
                      className="text-sm"
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                    />
                    <YAxis
                      tickFormatter={(v) => formatCurrency(v)}
                      className="text-sm"
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                    />
                    <RTooltip
                      formatter={(v: number, name: string) => [
                        formatCurrencyFull(v),
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                        borderRadius: "8px",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="normal"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Normal Inflation (3%)"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="scenario"
                      stroke={
                        selectedScenario === "severe"
                          ? "#ef4444"
                          : selectedScenario === "moderate"
                          ? "#f59e0b"
                          : "#10b981"
                      }
                      strokeWidth={3}
                      dot={false}
                      name={`Scenario (${
                        selectedScenario === "severe"
                          ? "8%"
                          : selectedScenario === "moderate"
                          ? "5%"
                          : "3%"
                      })`}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Impact Analysis */}
              {selectedScenario !== "normal" && (
                <div
                  className={`rounded-lg p-4 border ${
                    selectedScenario === "severe"
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                      : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`h-5 w-5 ${
                        selectedScenario === "severe"
                          ? "text-red-600"
                          : "text-amber-600"
                      } mt-0.5 flex-shrink-0`}
                    />
                    <div>
                      <div
                        className={`font-semibold ${
                          selectedScenario === "severe"
                            ? "text-red-900 dark:text-red-100"
                            : "text-amber-900 dark:text-amber-100"
                        }`}
                      >
                        {selectedScenario === "severe"
                          ? "1970s-Style Inflation Devastates Retirement"
                          : "Elevated Inflation Erodes Faster"}
                      </div>
                      <p
                        className={`text-sm mt-1 ${
                          selectedScenario === "severe"
                            ? "text-red-800 dark:text-red-200"
                            : "text-amber-800 dark:text-amber-200"
                        }`}
                      >
                        After 30 years with{" "}
                        {selectedScenario === "severe" ? "8%" : "5%"} inflation,
                        your {formatCurrency(portfolioValue)} would have
                        purchasing power of only{" "}
                        {formatCurrencyFull(
                          scenarioData[scenarioData.length - 1]?.scenario || 0
                        )}
                        . That's{" "}
                        {formatCurrencyFull(
                          (scenarioData[scenarioData.length - 1]?.normal || 0) -
                            (scenarioData[scenarioData.length - 1]?.scenario ||
                              0)
                        )}{" "}
                        less than normal inflation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Why Early Retirement Inflation is Worst */}
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-orange-900 dark:text-orange-100">
                      Why High Inflation Early = Worst Case
                    </div>
                    <ul className="text-sm text-orange-800 dark:text-orange-200 mt-2 list-disc list-inside space-y-1">
                      <li>
                        Higher withdrawals needed immediately deplete principal
                        faster
                      </li>
                      <li>
                        Less capital remaining to benefit from future market
                        recoveries
                      </li>
                      <li>
                        Compounds over decades - small early shortfalls become
                        huge
                      </li>
                      <li>
                        This is why we project conservatively and stress-test
                        scenarios
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. TIPS AND I-BONDS EDUCATION */}
        <TabsContent value="tips">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-blue-600" />
                TIPS and I-Bonds: Inflation Protection
              </CardTitle>
              <CardDescription>
                Treasury instruments that protect your purchasing power
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Two-Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TIPS */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                    <span className="font-semibold text-blue-900 dark:text-blue-100">
                      TIPS (Treasury Inflation-Protected Securities)
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium">How they work:</span>
                      <p className="text-muted-foreground mt-1">
                        Principal adjusts with CPI. Interest paid on adjusted
                        principal twice yearly. At maturity, you get the greater
                        of adjusted or original principal.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-gray-900 rounded p-2">
                        <div className="text-xs text-muted-foreground">
                          Maturities
                        </div>
                        <div className="font-medium">5, 10, 30 years</div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded p-2">
                        <div className="text-xs text-muted-foreground">
                          Purchase Limit
                        </div>
                        <div className="font-medium">No limit</div>
                      </div>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 text-xs">
                      <strong>Best for:</strong> Larger allocations, tax-advantaged
                      accounts (interest is taxable annually even though not
                      received)
                    </div>
                  </div>
                </div>

                {/* I-Bonds */}
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-6 w-6 text-green-600" />
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      I-Bonds (Series I Savings Bonds)
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium">How they work:</span>
                      <p className="text-muted-foreground mt-1">
                        Composite rate = fixed rate + inflation rate. Interest
                        compounds semi-annually. Can't redeem for 1 year; 3-month
                        interest penalty if redeemed before 5 years.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-gray-900 rounded p-2">
                        <div className="text-xs text-muted-foreground">
                          Purchase Limit
                        </div>
                        <div className="font-medium text-green-600">
                          $10,000/year
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded p-2">
                        <div className="text-xs text-muted-foreground">
                          Tax Treatment
                        </div>
                        <div className="font-medium">Deferred until redemption</div>
                      </div>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 rounded p-2 text-xs">
                      <strong>Best for:</strong> Emergency reserves, tax-deferred
                      growth, guaranteed inflation protection
                    </div>
                  </div>
                </div>
              </div>

              {/* Portfolio Allocation Strategy */}
              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-purple-900 dark:text-purple-100">
                      Inflation Protection Strategy
                    </div>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mt-2">
                      Consider allocating 10-25% of your bond allocation to
                      inflation-protected securities. This creates a "purchasing
                      power floor" that rises with inflation, reducing sequence
                      risk.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          $10K
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Annual I-Bond limit per person
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          $20K
                        </div>
                        <div className="text-xs text-muted-foreground">
                          For married couples ($10K each)
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          $25K
                        </div>
                        <div className="text-xs text-muted-foreground">
                          With $5K tax refund in paper bonds
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Feature</th>
                      <th className="text-left py-2 px-3">TIPS</th>
                      <th className="text-left py-2 px-3">I-Bonds</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-medium">Purchase limit</td>
                      <td className="py-2 px-3">No limit</td>
                      <td className="py-2 px-3">$10,000/year</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-medium">Liquidity</td>
                      <td className="py-2 px-3">Tradeable (price risk)</td>
                      <td className="py-2 px-3">1-year lock, 5-year penalty</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-medium">Tax timing</td>
                      <td className="py-2 px-3">Annual (phantom income)</td>
                      <td className="py-2 px-3">Deferred until redemption</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-medium">Deflation protection</td>
                      <td className="py-2 px-3">Principal floor at par</td>
                      <td className="py-2 px-3">Rate can't go below 0%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Best use</td>
                      <td className="py-2 px-3">IRA/401k allocation</td>
                      <td className="py-2 px-3">Taxable emergency reserves</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action Items */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-900 dark:text-emerald-100">
                      Action Items to Protect Your Purchasing Power
                    </div>
                    <ul className="text-sm text-emerald-800 dark:text-emerald-200 mt-2 list-disc list-inside space-y-1">
                      <li>
                        Max out I-Bond purchases annually ($10K/person) at{" "}
                        <a
                          href="https://www.treasurydirect.gov"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          TreasuryDirect.gov
                        </a>
                      </li>
                      <li>
                        Consider TIPS funds (like VTIP, SCHP) in tax-advantaged
                        accounts
                      </li>
                      <li>
                        Build a TIPS ladder in your IRA for predictable
                        inflation-adjusted income
                      </li>
                      <li>
                        Remember: These protect principal, not grow wealth -
                        balance with growth assets
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

InflationImpact.displayName = "InflationImpact";

export default InflationImpact;
