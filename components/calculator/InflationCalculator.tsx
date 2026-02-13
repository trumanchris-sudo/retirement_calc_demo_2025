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
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  Legend,
  Tooltip as RTooltip,
  Bar,
  BarChart,
  ComposedChart,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Info,
  ShoppingCart,
  Coffee,
  Home,
  Car,
  Briefcase,
  Calculator,
  History,
  BarChart3,
  LineChart as LineChartIcon,
  Zap,
} from "lucide-react";

// =============================================================================
// CONSTANTS & DATA
// =============================================================================

// Historical average inflation rate (1926-2024)
const HISTORICAL_INFLATION_AVG = 2.9;

// S&P 500 historical average nominal return
const SP500_NOMINAL_RETURN = 10.3;

// S&P 500 real return (after inflation)
const SP500_REAL_RETURN = 7.2;

// Historical inflation by decade
const DECADE_INFLATION: Record<string, number> = {
  "1930s": -2.1, // Great Depression deflation
  "1940s": 5.4,  // WWII inflation
  "1950s": 2.2,
  "1960s": 2.5,
  "1970s": 7.4,  // Oil shocks
  "1980s": 5.1,
  "1990s": 2.9,
  "2000s": 2.6,
  "2010s": 1.8,
  "2020s": 5.2,  // Post-COVID
};

// Notable inflation events for context
const NOTABLE_EVENTS = [
  { year: 1946, rate: 18.1, event: "Post-WWII spike" },
  { year: 1974, rate: 12.3, event: "First oil shock" },
  { year: 1980, rate: 13.5, event: "Peak inflation" },
  { year: 2009, rate: -0.4, event: "Financial crisis deflation" },
  { year: 2022, rate: 8.0, event: "Post-COVID surge" },
];

// Real-world items for purchasing power comparison
const PURCHASING_POWER_ITEMS = [
  {
    name: "Cup of Coffee",
    icon: Coffee,
    basePrice: 4.50,
    category: "daily"
  },
  {
    name: "Grocery Cart",
    icon: ShoppingCart,
    basePrice: 200,
    category: "weekly"
  },
  {
    name: "Monthly Rent",
    icon: Home,
    basePrice: 2000,
    category: "monthly"
  },
  {
    name: "Used Car",
    icon: Car,
    basePrice: 25000,
    category: "major"
  },
  {
    name: "Annual Salary",
    icon: Briefcase,
    basePrice: 60000,
    category: "annual"
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate future value with inflation erosion
 */
function calculateFutureValue(
  presentValue: number,
  inflationRate: number,
  years: number
): number {
  return presentValue / Math.pow(1 + inflationRate / 100, years);
}

/**
 * Calculate future cost after inflation
 */
function calculateFutureCost(
  currentCost: number,
  inflationRate: number,
  years: number
): number {
  return currentCost * Math.pow(1 + inflationRate / 100, years);
}

/**
 * Calculate investment growth (nominal)
 */
function calculateInvestmentGrowth(
  principal: number,
  returnRate: number,
  years: number
): number {
  return principal * Math.pow(1 + returnRate / 100, years);
}

/**
 * Format currency
 */
function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

interface InflationCalculatorProps {
  /** Initial amount for calculations */
  initialAmount?: number;
  /** Default inflation rate assumption */
  defaultInflationRate?: number;
  /** Default time horizon */
  defaultYears?: number;
  /** Enable dark mode */
  isDarkMode?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const InflationCalculator = React.memo(function InflationCalculator({
  initialAmount = 10000,
  defaultInflationRate = 3.0,
  defaultYears = 20,
  isDarkMode = false,
}: InflationCalculatorProps) {
  // State
  const [amount, setAmount] = useState(initialAmount);
  const [inflationRate, setInflationRate] = useState(defaultInflationRate);
  const [years, setYears] = useState(defaultYears);
  const [activeTab, setActiveTab] = useState("calculator");

  // Handle amount input
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
    if (!isNaN(value) && value >= 0) {
      setAmount(value);
    }
  }, []);

  // =============================================================================
  // CALCULATIONS
  // =============================================================================

  // Future purchasing power (what your money will be worth)
  const futureValue = useMemo(() => {
    return calculateFutureValue(amount, inflationRate, years);
  }, [amount, inflationRate, years]);

  // Future cost (what things will cost)
  const futureCost = useMemo(() => {
    return calculateFutureCost(amount, inflationRate, years);
  }, [amount, inflationRate, years]);

  // S&P 500 growth comparison
  const sp500Growth = useMemo(() => {
    const nominalValue = calculateInvestmentGrowth(amount, SP500_NOMINAL_RETURN, years);
    const realValue = calculateInvestmentGrowth(amount, SP500_REAL_RETURN, years);
    return {
      nominal: nominalValue,
      real: realValue,
      inflationLost: nominalValue - realValue,
    };
  }, [amount, years]);

  // Purchasing power loss percentage
  const purchasingPowerLoss = useMemo(() => {
    return ((amount - futureValue) / amount) * 100;
  }, [amount, futureValue]);

  // Timeline data for charts
  const timelineData = useMemo(() => {
    const data = [];
    for (let year = 0; year <= years; year++) {
      const cashValue = calculateFutureValue(amount, inflationRate, year);
      const sp500Nominal = calculateInvestmentGrowth(amount, SP500_NOMINAL_RETURN, year);
      const sp500Real = calculateInvestmentGrowth(amount, SP500_REAL_RETURN, year);

      data.push({
        year,
        cash: cashValue,
        cashPercent: (cashValue / amount) * 100,
        sp500Nominal,
        sp500Real,
        sp500RealGrowth: ((sp500Real - amount) / amount) * 100,
        inflationDrag: sp500Nominal - sp500Real,
      });
    }
    return data;
  }, [amount, inflationRate, years]);

  // Purchasing power items with future costs
  const purchasingPowerComparison = useMemo(() => {
    return PURCHASING_POWER_ITEMS.map((item) => ({
      ...item,
      futurePrice: calculateFutureCost(item.basePrice, inflationRate, years),
      percentIncrease: (calculateFutureCost(item.basePrice, inflationRate, years) / item.basePrice - 1) * 100,
    }));
  }, [inflationRate, years]);

  // Historical decade comparison data
  const decadeComparisonData = useMemo(() => {
    return Object.entries(DECADE_INFLATION).map(([decade, rate]) => ({
      decade,
      rate,
      futureValue: calculateFutureValue(amount, rate, 10),
      purchasingPowerKept: (calculateFutureValue(amount, rate, 10) / amount) * 100,
    }));
  }, [amount]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          Inflation Calculator
        </CardTitle>
        <CardDescription className="text-base">
          <span className="font-semibold italic">
            &ldquo;What will ${formatCurrency(amount, true)} be worth in {years} years?&rdquo;
          </span>
          <span className="block mt-1 text-muted-foreground">
            Understand why investing matters more than just saving
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-1 h-auto">
            <TabsTrigger value="calculator" className="text-xs sm:text-sm">
              <Calculator className="h-4 w-4 mr-1" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="visualizer" className="text-xs sm:text-sm">
              <TrendingDown className="h-4 w-4 mr-1" />
              Visualizer
            </TabsTrigger>
            <TabsTrigger value="sp500" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              vs S&P 500
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <History className="h-4 w-4 mr-1" />
              History
            </TabsTrigger>
            <TabsTrigger value="whyinvest" className="text-xs sm:text-sm">
              <Zap className="h-4 w-4 mr-1" />
              Why Invest
            </TabsTrigger>
          </TabsList>

          {/* =================================================================
              TAB 1: MAIN CALCULATOR
          ================================================================= */}
          <TabsContent value="calculator" className="space-y-6 mt-6">
            {/* Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Amount Today
                </label>
                <Input
                  type="text"
                  value={formatCurrency(amount)}
                  onChange={handleAmountChange}
                  className="text-lg font-semibold"
                />
                <div className="flex gap-2 mt-2">
                  {[1000, 10000, 50000, 100000].map((preset) => (
                    <Badge
                      key={preset}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      onClick={() => setAmount(preset)}
                    >
                      {formatCurrency(preset, true)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Years Slider */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4 text-blue-600" />
                    Years
                  </span>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {years}
                  </Badge>
                </label>
                <Slider
                  value={[years]}
                  onValueChange={(v) => setYears(v[0])}
                  min={1}
                  max={50}
                  step={1}
                  thumbLabel="Select number of years"
                  className="mt-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 year</span>
                  <span>50 years</span>
                </div>
              </div>

              {/* Inflation Rate Slider */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    Inflation Rate
                  </span>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {inflationRate}%
                  </Badge>
                </label>
                <Slider
                  value={[inflationRate]}
                  onValueChange={(v) => setInflationRate(v[0])}
                  min={0}
                  max={10}
                  step={0.5}
                  thumbLabel="Select inflation rate"
                  className="mt-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span className="text-green-600">3% avg</span>
                  <span>10%</span>
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Purchasing Power Lost */}
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    Purchasing Power In {years} Years
                  </span>
                </div>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                  {formatCurrency(futureValue)}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Lost {purchasingPowerLoss.toFixed(1)}% of value
                </div>
                <div className="mt-3 h-2 bg-red-200 dark:bg-red-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${100 - purchasingPowerLoss}%` }}
                  />
                </div>
              </div>

              {/* Future Cost */}
              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    What {formatCurrency(amount, true)} Buys Will Cost
                  </span>
                </div>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {formatCurrency(futureCost)}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                  +{((futureCost / amount - 1) * 100).toFixed(0)}% more expensive
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  At {inflationRate}% annual inflation
                </div>
              </div>

              {/* S&P 500 Alternative */}
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    If Invested in S&P 500
                  </span>
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(sp500Growth.real)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Real growth (after inflation)
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Based on {SP500_REAL_RETURN}% historical real return
                </div>
              </div>
            </div>

            {/* The Wake-Up Call */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-8 w-8 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    The Real Cost of Not Investing
                  </h3>
                  <p className="text-amber-800 dark:text-amber-200 mt-2">
                    If you keep {formatCurrency(amount)} in cash for {years} years, you don&apos;t just &ldquo;not make money&rdquo; -
                    you actually <strong>lose {formatCurrency(amount - futureValue)}</strong> in purchasing power.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                      <div className="text-sm text-muted-foreground">Cash Under Mattress</div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(futureValue)} real value
                      </div>
                      <div className="text-xs text-red-500">
                        Lost {formatPercent(-purchasingPowerLoss)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                      <div className="text-sm text-muted-foreground">Invested in S&P 500</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(sp500Growth.real)} real value
                      </div>
                      <div className="text-xs text-green-500">
                        Gained {formatPercent(((sp500Growth.real - amount) / amount) * 100)}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-4 font-semibold">
                    Difference: {formatCurrency(sp500Growth.real - futureValue)} more by investing!
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 2: PURCHASING POWER VISUALIZER
          ================================================================= */}
          <TabsContent value="visualizer" className="space-y-6 mt-6">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-lg p-6 border border-red-200 dark:border-red-900">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-red-600" />
                What Your {formatCurrency(amount, true)} Will Actually Buy
              </h3>

              {/* Visual Dollar Shrinking */}
              <div className="flex items-center justify-center gap-8 py-6 mb-6">
                <div className="text-center">
                  <div className="relative">
                    <DollarSign className="h-24 w-24 text-green-600" strokeWidth={1.5} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold">100%</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Today</div>
                </div>
                <div className="text-4xl text-gray-400">→</div>
                <div className="text-center">
                  <div
                    className="relative transition-all duration-500"
                    style={{ transform: `scale(${1 - purchasingPowerLoss / 100})` }}
                  >
                    <DollarSign className="h-24 w-24 text-red-400" strokeWidth={1.5} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold">{(100 - purchasingPowerLoss).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div
                    className="text-sm text-muted-foreground mt-2"
                    style={{ marginTop: `${purchasingPowerLoss * 0.5}px` }}
                  >
                    In {years} Years
                  </div>
                </div>
              </div>

              {/* Real Items Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {purchasingPowerComparison.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.name}
                      className="bg-white dark:bg-gray-900 rounded-lg p-4 border"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold">{item.name}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Today:</span>
                          <span className="font-medium">{formatCurrency(item.basePrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">In {years} years:</span>
                          <span className="font-medium text-red-600">{formatCurrency(item.futurePrice)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
                            style={{ width: `${Math.min(item.percentIncrease, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-red-500 text-right">
                          +{item.percentIncrease.toFixed(0)}% more expensive
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Purchasing Power Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Purchasing Power Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="year"
                        tickFormatter={(v) => `Year ${v}`}
                        tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                      />
                      <YAxis
                        tickFormatter={(v) => formatCurrency(v, true)}
                        tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                        domain={[0, amount]}
                      />
                      <RTooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                          borderRadius: "8px",
                          border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                        }}
                      />
                      <ReferenceLine
                        y={amount}
                        stroke="#3b82f6"
                        strokeDasharray="5 5"
                        label={{ value: "Original Value", position: "right", fill: "#3b82f6" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cash"
                        stroke="#ef4444"
                        fill="url(#cashGradient)"
                        strokeWidth={2}
                        name="Real Purchasing Power"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Key Insight */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">
                    The Rule of 72
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    At {inflationRate}% inflation, your money loses half its purchasing power every{" "}
                    <strong>{Math.round(72 / inflationRate)} years</strong>. This is the &ldquo;Rule of 72&rdquo; -
                    divide 72 by the inflation rate to estimate how long until your money is worth half.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 3: S&P 500 COMPARISON
          ================================================================= */}
          <TabsContent value="sp500" className="space-y-6 mt-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-6 border border-green-200 dark:border-green-900">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Cash vs S&P 500: The Real Numbers
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border text-center">
                  <div className="text-sm text-muted-foreground mb-1">Starting Amount</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(amount)}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 text-center">
                  <div className="text-sm text-red-600 mb-1">Cash After {years} Years</div>
                  <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {formatCurrency(futureValue)}
                  </div>
                  <div className="text-xs text-red-500">
                    (real purchasing power)
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 text-center">
                  <div className="text-sm text-green-600 mb-1">S&P 500 After {years} Years</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {formatCurrency(sp500Growth.real)}
                  </div>
                  <div className="text-xs text-green-500">
                    (inflation-adjusted)
                  </div>
                </div>
              </div>

              {/* The Big Number */}
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg p-6 text-center">
                <div className="text-sm text-green-700 dark:text-green-300 mb-2">
                  By Investing Instead of Holding Cash, You Gain
                </div>
                <div className="text-5xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(sp500Growth.real - futureValue)}
                </div>
                <div className="text-lg text-green-700 dark:text-green-300 mt-2">
                  in real purchasing power over {years} years
                </div>
              </div>
            </div>

            {/* Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Growth Comparison Over Time</CardTitle>
                <CardDescription>
                  Cash (losing value) vs S&P 500 (growing value), both inflation-adjusted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={timelineData}>
                      <defs>
                        <linearGradient id="sp500Gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="year"
                        tickFormatter={(v) => `Year ${v}`}
                        tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                      />
                      <YAxis
                        tickFormatter={(v) => formatCurrency(v, true)}
                        tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                      />
                      <RTooltip
                        formatter={(v: number, name: string) => [formatCurrency(v), name]}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                          borderRadius: "8px",
                          border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                        }}
                      />
                      <Legend />
                      <ReferenceLine
                        y={amount}
                        stroke="#6b7280"
                        strokeDasharray="3 3"
                        label={{ value: "Starting Value", position: "right" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sp500Real"
                        stroke="#22c55e"
                        fill="url(#sp500Gradient)"
                        strokeWidth={3}
                        name="S&P 500 (Real)"
                      />
                      <Line
                        type="monotone"
                        dataKey="cash"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                        name="Cash (Real)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Nominal vs Real Returns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    Nominal vs Real Returns
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>S&P 500 Nominal Return:</span>
                    <span className="font-bold text-blue-600">{SP500_NOMINAL_RETURN}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minus Inflation (~3%):</span>
                    <span className="font-bold text-red-600">-3%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Real Return:</span>
                    <span className="font-bold text-green-600">{SP500_REAL_RETURN}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-900 dark:text-amber-100">
                    The Inflation Drag
                  </span>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Even in the S&amp;P 500, inflation &ldquo;steals&rdquo; some of your returns. After {years} years:
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Nominal Value:</span>
                    <span className="font-bold">{formatCurrency(sp500Growth.nominal)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Lost to Inflation:</span>
                    <span className="font-bold">-{formatCurrency(sp500Growth.inflationLost)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>Real Value:</span>
                    <span className="font-bold text-green-600">{formatCurrency(sp500Growth.real)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 4: HISTORICAL COMPARISON
          ================================================================= */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-6 border border-purple-200 dark:border-purple-900">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                How {formatCurrency(amount, true)} Would Have Fared in Different Decades
              </h3>

              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={decadeComparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      type="number"
                      domain={[0, 120]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="decade"
                      width={60}
                      tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                    />
                    <RTooltip
                      formatter={(v: number) => [`${v.toFixed(1)}%`, "Purchasing Power Kept"]}
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                        borderRadius: "8px",
                        border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                      }}
                    />
                    <Bar
                      dataKey="purchasingPowerKept"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                      name="% of Purchasing Power Kept"
                    />
                    <ReferenceLine
                      x={100}
                      stroke="#22c55e"
                      strokeDasharray="5 5"
                      label={{ value: "100% (break even)", position: "top" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Decade Details */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {decadeComparisonData.map((decade) => (
                  <div
                    key={decade.decade}
                    className={`rounded-lg p-3 text-center border ${
                      decade.rate < 0
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                        : decade.rate > 5
                        ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                        : "bg-gray-50 border-gray-200 dark:bg-gray-900/50"
                    }`}
                  >
                    <div className="text-sm font-semibold">{decade.decade}</div>
                    <div
                      className={`text-lg font-bold ${
                        decade.rate < 0
                          ? "text-green-600"
                          : decade.rate > 5
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {decade.rate > 0 ? "+" : ""}{decade.rate}%
                    </div>
                    <div className="text-xs text-muted-foreground">avg/year</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notable Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notable Inflation Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {NOTABLE_EVENTS.map((event) => (
                    <div
                      key={event.year}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        event.rate < 0
                          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20"
                          : event.rate > 10
                          ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                          : "bg-amber-50 border-amber-200 dark:bg-amber-950/20"
                      }`}
                    >
                      <div>
                        <span className="font-semibold">{event.year}:</span>{" "}
                        <span className="text-muted-foreground">{event.event}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          event.rate < 0
                            ? "text-blue-600 border-blue-300"
                            : event.rate > 10
                            ? "text-red-600 border-red-300"
                            : "text-amber-600 border-amber-300"
                        }
                      >
                        {event.rate > 0 ? "+" : ""}{event.rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Long-term Average */}
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-indigo-900 dark:text-indigo-100">
                    Long-Term Average: {HISTORICAL_INFLATION_AVG}%
                  </div>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    Since 1926, US inflation has averaged about {HISTORICAL_INFLATION_AVG}% per year. This includes the
                    Great Depression (deflation), the 1970s oil crisis (high inflation), and the recent post-COVID surge.
                    Planning for 3% inflation is reasonable for most scenarios.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 5: WHY INVESTING MATTERS
          ================================================================= */}
          <TabsContent value="whyinvest" className="space-y-6 mt-6">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg p-6 border border-emerald-200 dark:border-emerald-900">
              <h3 className="text-xl font-bold mb-6 text-center text-emerald-900 dark:text-emerald-100">
                Why Investing Matters: A Visual Story
              </h3>

              {/* The Story in Numbers */}
              <div className="space-y-6">
                {/* Chapter 1: The Problem */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <span className="font-bold text-red-600">1</span>
                    </div>
                    <h4 className="text-lg font-semibold">The Problem: Inflation Steals Your Money</h4>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Even at a &ldquo;low&rdquo; 3% inflation rate, your money loses purchasing power every single day.
                    It&apos;s like a slow leak you can&apos;t see.
                  </p>
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Your {formatCurrency(amount, true)} becomes worth only</div>
                      <div className="text-4xl font-bold text-red-600 my-2">{formatCurrency(futureValue)}</div>
                      <div className="text-sm text-red-500">in real terms after {years} years</div>
                    </div>
                  </div>
                </div>

                {/* Chapter 2: The Solution */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <span className="font-bold text-green-600">2</span>
                    </div>
                    <h4 className="text-lg font-semibold">The Solution: Let Your Money Work For You</h4>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Investing in a diversified portfolio (like the S&P 500) historically grows faster than inflation,
                    meaning your wealth actually increases in real terms.
                  </p>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Your {formatCurrency(amount, true)} grows to</div>
                      <div className="text-4xl font-bold text-green-600 my-2">{formatCurrency(sp500Growth.real)}</div>
                      <div className="text-sm text-green-500">in real purchasing power after {years} years</div>
                    </div>
                  </div>
                </div>

                {/* Chapter 3: The Difference */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="font-bold text-blue-600">3</span>
                    </div>
                    <h4 className="text-lg font-semibold">The Difference: Life-Changing Wealth</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Cash (Losing)</div>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(futureValue)}</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <div className="text-3xl font-bold text-blue-600">vs</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Invested (Growing)</div>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(sp500Growth.real)}</div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">The Gap (Your Opportunity Cost)</div>
                    <div className="text-4xl font-bold text-blue-600">{formatCurrency(sp500Growth.real - futureValue)}</div>
                    <div className="text-sm text-blue-500">This is what you miss by not investing</div>
                  </div>
                </div>
              </div>
            </div>

            {/* The Formula */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                The Simple Formula for Building Wealth
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-3xl mb-2">1</div>
                  <div className="font-semibold">Spend Less Than You Earn</div>
                  <div className="text-sm text-muted-foreground">Create savings to invest</div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-3xl mb-2">2</div>
                  <div className="font-semibold">Invest the Difference</div>
                  <div className="text-sm text-muted-foreground">In low-cost index funds</div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-3xl mb-2">3</div>
                  <div className="font-semibold">Let Time Work For You</div>
                  <div className="text-sm text-muted-foreground">Compound growth does the rest</div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg p-6 border border-green-300 dark:border-green-700 text-center">
              <h4 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
                The Best Time to Start Investing Was Yesterday
              </h4>
              <p className="text-green-800 dark:text-green-200 mb-4">
                The second best time is today. Every day you wait, inflation chips away at your wealth.
              </p>
              <div className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold">
                <Zap className="h-5 w-5" />
                Start your retirement plan now
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

InflationCalculator.displayName = "InflationCalculator";

export default InflationCalculator;
