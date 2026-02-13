"use client";

import React, { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  Info,
  BookOpen,
  Calculator,
  LineChart,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
// Note: calculateBondAllocation from bondAllocation.ts can be used for integration
// with the main calculator engine when this component is wired up

// Lazy load the ComposedChart for better performance
const ComposedChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.ComposedChart })),
  { ssr: false }
);

const AreaChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.AreaChart })),
  { ssr: false }
);

interface BondTentProps {
  /** Current age of primary person */
  currentAge?: number;
  /** Retirement age target */
  retirementAge?: number;
  /** Current portfolio value */
  portfolioValue?: number;
  /** Current stock allocation percentage (0-100) */
  currentStockAllocation?: number;
  /** Whether dark mode is enabled */
  isDarkMode?: boolean;
  /** Callback when bond tent configuration changes */
  onConfigChange?: (config: BondTentConfig) => void;
  /** Monte Carlo success rate without bond tent */
  baselineSuccessRate?: number;
  /** Monte Carlo success rate with bond tent */
  bondTentSuccessRate?: number;
}

export interface BondTentConfig {
  enabled: boolean;
  buildupStartAge: number;
  peakAge: number; // Usually retirement age
  peakBondAllocation: number;
  finalBondAllocation: number;
  drawdownEndAge: number;
}

// Research citations
const RESEARCH_CITATIONS = [
  {
    author: "Wade Pfau",
    title: "The Role of Bonds in a Retirement Income Portfolio",
    publication: "Journal of Financial Planning",
    year: 2015,
    keyFinding: "Rising equity glide paths can increase portfolio longevity by reducing sequence risk.",
    url: "https://www.financialplanningassociation.org/",
  },
  {
    author: "Michael Kitces",
    title: "Should Equity Exposure Decrease In Retirement, Or Is A Rising Equity Glidepath Actually Better?",
    publication: "Nerd's Eye View",
    year: 2014,
    keyFinding: "Retiring with a higher bond allocation and gradually increasing stocks outperforms the traditional approach.",
    url: "https://www.kitces.com/blog/",
  },
  {
    author: "Wade Pfau & Michael Kitces",
    title: "Reducing Retirement Risk with a Rising Equity Glide-Path",
    publication: "Journal of Financial Planning",
    year: 2014,
    keyFinding: "A 30% equity allocation at retirement increasing to 60% outperformed static allocations.",
    url: "https://www.financialplanningassociation.org/",
  },
  {
    author: "Javier Estrada",
    title: "The Glidepath Illusion: An International Perspective",
    publication: "The Journal of Portfolio Management",
    year: 2014,
    keyFinding: "Rising equity paths show higher terminal wealth across most international markets.",
    url: "https://jpm.pm-research.com/",
  },
];

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format full currency
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
 * Calculate traditional age-in-bonds allocation
 */
function calculateTraditionalAllocation(age: number): number {
  // Classic "age in bonds" rule, capped at reasonable levels
  return Math.min(Math.max(age, 20), 80);
}

/**
 * Calculate bond tent allocation for a given age
 */
function calculateBondTentAllocation(
  age: number,
  config: BondTentConfig,
  startingBondAllocation: number
): number {
  const { buildupStartAge, peakAge, peakBondAllocation, finalBondAllocation, drawdownEndAge } = config;

  // Before buildup phase: starting allocation
  if (age < buildupStartAge) {
    return startingBondAllocation;
  }

  // Buildup phase: linear increase to peak
  if (age < peakAge) {
    const progress = (age - buildupStartAge) / (peakAge - buildupStartAge);
    return startingBondAllocation + (peakBondAllocation - startingBondAllocation) * progress;
  }

  // At peak (retirement)
  if (age === peakAge) {
    return peakBondAllocation;
  }

  // Drawdown phase: decrease bonds (increase equities)
  if (age < drawdownEndAge) {
    const progress = (age - peakAge) / (drawdownEndAge - peakAge);
    return peakBondAllocation - (peakBondAllocation - finalBondAllocation) * progress;
  }

  // After drawdown: final allocation
  return finalBondAllocation;
}

/**
 * BondTent - Visualizes and implements the bond tent / rising equity glide path strategy
 */
export const BondTent = React.memo(function BondTent({
  currentAge = 55,
  retirementAge = 65,
  portfolioValue = 1000000,
  currentStockAllocation = 80,
  isDarkMode = false,
  onConfigChange,
  baselineSuccessRate = 85,
  bondTentSuccessRate = 92,
}: BondTentProps) {
  // Bond tent configuration state
  const [config, setConfig] = useState<BondTentConfig>({
    enabled: true,
    buildupStartAge: Math.max(currentAge, retirementAge - 10),
    peakAge: retirementAge,
    peakBondAllocation: 45,
    finalBondAllocation: 25,
    drawdownEndAge: retirementAge + 15,
  });

  const startingBondAllocation = 100 - currentStockAllocation;

  // Update config handler
  const updateConfig = useCallback((updates: Partial<BondTentConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  }, [config, onConfigChange]);

  // Generate glide path data for visualization
  const glidePathData = useMemo(() => {
    const data = [];
    const startAge = Math.min(currentAge, config.buildupStartAge - 5);
    const endAge = Math.max(95, config.drawdownEndAge + 5);

    for (let age = startAge; age <= endAge; age++) {
      const bondTentBonds = calculateBondTentAllocation(age, config, startingBondAllocation);
      const traditionalBonds = calculateTraditionalAllocation(age);

      data.push({
        age,
        year: new Date().getFullYear() + (age - currentAge),
        bondTentStocks: 100 - bondTentBonds,
        bondTentBonds: bondTentBonds,
        traditionalStocks: 100 - traditionalBonds,
        traditionalBonds: traditionalBonds,
        isRetirement: age === retirementAge,
        isCurrent: age === currentAge,
      });
    }
    return data;
  }, [currentAge, config, startingBondAllocation, retirementAge]);

  // Calculate rebalancing actions for the implementation tab
  const rebalancingActions = useMemo(() => {
    const actions = [];

    for (let year = 0; year <= 20; year++) {
      const age = currentAge + year;
      const targetBondPct = calculateBondTentAllocation(age, config, startingBondAllocation);
      const targetStockPct = 100 - targetBondPct;

      // Simple projection assuming 7% annual growth
      const projectedPortfolio = portfolioValue * Math.pow(1.07, year);

      // Previous year's allocation (for calculating shift)
      const prevTargetBondPct = year === 0
        ? startingBondAllocation
        : calculateBondTentAllocation(age - 1, config, startingBondAllocation);

      const allocationShift = targetBondPct - prevTargetBondPct;
      const dollarShift = projectedPortfolio * Math.abs(allocationShift / 100);

      const targetBondValue = projectedPortfolio * (targetBondPct / 100);
      const targetStockValue = projectedPortfolio * (targetStockPct / 100);

      actions.push({
        year,
        age,
        targetBondPct,
        targetStockPct,
        projectedPortfolio,
        targetBondValue,
        targetStockValue,
        allocationShift,
        dollarShift,
        phase: age < config.peakAge ? "buildup" : age <= config.drawdownEndAge ? "drawdown" : "maintenance",
        action: allocationShift > 0
          ? `Shift ${formatCurrency(dollarShift)} from stocks to bonds`
          : allocationShift < 0
            ? `Shift ${formatCurrency(dollarShift)} from bonds to stocks`
            : "Maintain current allocation",
      });
    }
    return actions;
  }, [currentAge, config, portfolioValue, startingBondAllocation]);

  // Calculate success rate improvement
  const successRateImprovement = bondTentSuccessRate - baselineSuccessRate;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
            Bond Tent / Rising Equity Glide Path
          </CardTitle>
          <CardDescription className="text-blue-800 dark:text-blue-200 text-base">
            <span className="font-semibold italic">
              &ldquo;Build up bonds before retirement, then gradually shift back to stocks.&rdquo;
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-muted-foreground">
                Current Allocation
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {currentStockAllocation}% / {startingBondAllocation}%
              </div>
              <div className="text-sm text-muted-foreground">
                Stocks / Bonds
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="text-sm text-muted-foreground">
                Peak Bond Allocation
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {config.peakBondAllocation}%
              </div>
              <div className="text-sm text-muted-foreground">
                At retirement (age {config.peakAge})
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-sm text-muted-foreground">
                Final Allocation
              </div>
              <div className="text-2xl font-bold text-green-600">
                {100 - config.finalBondAllocation}% / {config.finalBondAllocation}%
              </div>
              <div className="text-sm text-muted-foreground">
                Stocks / Bonds (age {config.drawdownEndAge}+)
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="text-sm text-muted-foreground">
                Success Rate Impact
              </div>
              <div className="text-2xl font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="h-5 w-5" />
                +{successRateImprovement.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                vs traditional glide path
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="concept" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-1 h-auto">
          <TabsTrigger value="concept" className="text-xs">
            <Lightbulb className="h-3 w-3 mr-1" />
            Concept
          </TabsTrigger>
          <TabsTrigger value="visualize" className="text-xs">
            <LineChart className="h-3 w-3 mr-1" />
            Visualize
          </TabsTrigger>
          <TabsTrigger value="configure" className="text-xs">
            <Calculator className="h-3 w-3 mr-1" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="implement" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Implement
          </TabsTrigger>
          <TabsTrigger value="research" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Research
          </TabsTrigger>
        </TabsList>

        {/* 1. CONCEPT TAB */}
        <TabsContent value="concept">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Understanding the Bond Tent Strategy
              </CardTitle>
              <CardDescription>
                Why the conventional wisdom may be backwards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* The Problem */}
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-red-900 dark:text-red-100">
                      The Problem with Traditional Glide Paths
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                      Traditional advice says to reduce stocks as you age - &ldquo;age in bonds.&rdquo;
                      But this means you&apos;re most conservative when your portfolio is at its <strong>largest</strong>,
                      right when sequence of returns risk is highest.
                    </p>
                    <ul className="text-sm text-red-800 dark:text-red-200 mt-2 list-disc list-inside space-y-1">
                      <li>Your portfolio peaks at retirement</li>
                      <li>A market crash in early retirement is devastating</li>
                      <li>Traditional glide paths don&apos;t protect against this specific risk</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* The Solution */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      The Bond Tent Solution
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200 mt-2">
                      Build up bonds in the years <strong>before</strong> retirement, creating a protective &ldquo;tent&rdquo; over
                      the danger zone. Then gradually shift back to stocks during retirement.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-blue-600">Phase 1</div>
                        <div className="text-sm font-medium">Buildup</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Ages {config.buildupStartAge} - {config.peakAge - 1}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Increase bonds to {config.peakBondAllocation}%
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center border-2 border-orange-300">
                        <div className="text-lg font-bold text-orange-600">Phase 2</div>
                        <div className="text-sm font-medium">Peak Protection</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          At retirement (age {config.peakAge})
                        </div>
                        <div className="text-xs text-orange-600 mt-1">
                          Maximum bond allocation
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-green-600">Phase 3</div>
                        <div className="text-sm font-medium">Rising Equity</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Ages {config.peakAge + 1} - {config.drawdownEndAge}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          Decrease bonds to {config.finalBondAllocation}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why It Works */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      Why This Works
                    </div>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Protects against sequence risk:</strong> Bonds buffer the critical early retirement years
                          when a market crash would be most damaging.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Maintains long-term growth:</strong> Shifting back to stocks provides growth
                          potential for the later decades of retirement.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Reduces &ldquo;die with too much&rdquo; risk:</strong> If you survive the danger zone,
                          you likely have decades of growth ahead - lean into it.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Research-backed:</strong> Studies by Pfau, Kitces, and others show this approach
                          outperforms traditional glide paths.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Visual Comparison */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
                <div className="text-sm font-medium mb-4">Traditional vs Bond Tent Approach</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-red-700 dark:text-red-300">Traditional Glide Path</span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded p-3 text-sm">
                      <ul className="space-y-1 text-red-800 dark:text-red-200">
                        <li>Start aggressive (80% stocks)</li>
                        <li>Steadily reduce stocks over time</li>
                        <li>Most conservative at retirement</li>
                        <li>Stay conservative in retirement</li>
                      </ul>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      Most conservative when most vulnerable
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-700 dark:text-green-300">Bond Tent (Rising Equity)</span>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded p-3 text-sm">
                      <ul className="space-y-1 text-green-800 dark:text-green-200">
                        <li>Build bonds before retirement</li>
                        <li>Peak protection at retirement</li>
                        <li>Gradually increase stocks after</li>
                        <li>More aggressive in later retirement</li>
                      </ul>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      Maximum protection during danger zone
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. VISUALIZE TAB */}
        <TabsContent value="visualize">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-blue-600" />
                Bond Tent Visualization
              </CardTitle>
              <CardDescription>
                See the &ldquo;tent&rdquo; shape of your allocation over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Chart - Stock Allocation */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Stock Allocation Over Time</div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={glidePathData}>
                      <defs>
                        <linearGradient id="colorBondTent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorTraditional" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="age"
                        className="text-sm"
                        tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                        label={{ value: "Age", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        className="text-sm"
                        tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                        label={{ value: "Stock Allocation", angle: -90, position: "insideLeft" }}
                      />
                      <RTooltip
                        formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                          borderRadius: "8px",
                          border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                        }}
                      />
                      <Legend />
                      <ReferenceLine
                        x={retirementAge}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        label={{
                          value: "Retirement",
                          position: "top",
                          fill: "#f59e0b",
                        }}
                      />
                      <ReferenceLine
                        x={currentAge}
                        stroke="#10b981"
                        strokeDasharray="3 3"
                        label={{
                          value: "Now",
                          position: "top",
                          fill: "#10b981",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="bondTentStocks"
                        stroke="#3b82f6"
                        fill="url(#colorBondTent)"
                        strokeWidth={3}
                        name="Bond Tent (Stocks)"
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="traditionalStocks"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Traditional (Stocks)"
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bond Allocation Chart */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Bond Allocation Over Time (The &ldquo;Tent&rdquo;)</div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={glidePathData}>
                      <defs>
                        <linearGradient id="colorBondTentBonds" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="age"
                        className="text-sm"
                        tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                        label={{ value: "Age", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        className="text-sm"
                        tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280" }}
                        label={{ value: "Bond Allocation", angle: -90, position: "insideLeft" }}
                      />
                      <RTooltip
                        formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                          borderRadius: "8px",
                          border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                        }}
                      />
                      <Legend />
                      <ReferenceLine
                        x={retirementAge}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        label={{
                          value: "Peak",
                          position: "top",
                          fill: "#f59e0b",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="bondTentBonds"
                        stroke="#f59e0b"
                        fill="url(#colorBondTentBonds)"
                        strokeWidth={3}
                        name="Bond Tent"
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="traditionalBonds"
                        stroke="#6b7280"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Traditional (Age in Bonds)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Key Insight */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100">
                      Why It&apos;s Called a &ldquo;Tent&rdquo;
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      The bond allocation rises before retirement and falls after - creating a tent-like shape.
                      This &ldquo;tent&rdquo; provides shelter during the most vulnerable years while allowing for growth
                      before and after the danger zone.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CONFIGURE TAB */}
        <TabsContent value="configure">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-purple-600" />
                Configure Your Bond Tent
              </CardTitle>
              <CardDescription>
                Customize the strategy for your situation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Buildup Start Age */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">Buildup Start Age</span>
                    <p className="text-xs text-muted-foreground">When to start increasing bond allocation</p>
                  </div>
                  <Badge variant="outline">{config.buildupStartAge}</Badge>
                </div>
                <Slider
                  value={[config.buildupStartAge]}
                  onValueChange={(v) => updateConfig({ buildupStartAge: v[0] })}
                  min={Math.max(30, currentAge)}
                  max={config.peakAge - 1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Earlier (more gradual)</span>
                  <span>Later (more aggressive)</span>
                </div>
              </div>

              {/* Peak Bond Allocation */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">Peak Bond Allocation</span>
                    <p className="text-xs text-muted-foreground">Maximum bond percentage at retirement</p>
                  </div>
                  <Badge variant="outline">{config.peakBondAllocation}%</Badge>
                </div>
                <Slider
                  value={[config.peakBondAllocation]}
                  onValueChange={(v) => updateConfig({ peakBondAllocation: v[0] })}
                  min={30}
                  max={60}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30% (more aggressive)</span>
                  <span>60% (more conservative)</span>
                </div>
              </div>

              {/* Final Bond Allocation */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">Final Bond Allocation</span>
                    <p className="text-xs text-muted-foreground">Target bond percentage after drawdown</p>
                  </div>
                  <Badge variant="outline">{config.finalBondAllocation}%</Badge>
                </div>
                <Slider
                  value={[config.finalBondAllocation]}
                  onValueChange={(v) => updateConfig({ finalBondAllocation: v[0] })}
                  min={15}
                  max={config.peakBondAllocation - 5}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>15% (more growth)</span>
                  <span>{config.peakBondAllocation - 5}% (less change)</span>
                </div>
              </div>

              {/* Drawdown End Age */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">Drawdown End Age</span>
                    <p className="text-xs text-muted-foreground">When to reach final allocation</p>
                  </div>
                  <Badge variant="outline">{config.drawdownEndAge}</Badge>
                </div>
                <Slider
                  value={[config.drawdownEndAge]}
                  onValueChange={(v) => updateConfig({ drawdownEndAge: v[0] })}
                  min={config.peakAge + 5}
                  max={config.peakAge + 25}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Faster transition ({config.peakAge + 5})</span>
                  <span>Slower transition ({config.peakAge + 25})</span>
                </div>
              </div>

              {/* Configuration Summary */}
              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-3">
                  Your Bond Tent Configuration
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {config.peakAge - config.buildupStartAge}
                    </div>
                    <div className="text-xs text-muted-foreground">Years to build</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {config.peakBondAllocation - startingBondAllocation}%
                    </div>
                    <div className="text-xs text-muted-foreground">Bond increase</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {config.drawdownEndAge - config.peakAge}
                    </div>
                    <div className="text-xs text-muted-foreground">Years to unwind</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {config.peakBondAllocation - config.finalBondAllocation}%
                    </div>
                    <div className="text-xs text-muted-foreground">Equity recovery</div>
                  </div>
                </div>
              </div>

              {/* Preset Strategies */}
              <div className="space-y-3">
                <div className="text-sm font-medium">Quick Presets</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-3"
                    onClick={() => updateConfig({
                      buildupStartAge: retirementAge - 5,
                      peakBondAllocation: 40,
                      finalBondAllocation: 25,
                      drawdownEndAge: retirementAge + 10,
                    })}
                  >
                    <div className="text-left">
                      <div className="font-medium">Conservative</div>
                      <div className="text-xs text-muted-foreground">40% peak, quick recovery</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3"
                    onClick={() => updateConfig({
                      buildupStartAge: retirementAge - 10,
                      peakBondAllocation: 50,
                      finalBondAllocation: 30,
                      drawdownEndAge: retirementAge + 15,
                    })}
                  >
                    <div className="text-left">
                      <div className="font-medium">Moderate</div>
                      <div className="text-xs text-muted-foreground">50% peak, balanced</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3"
                    onClick={() => updateConfig({
                      buildupStartAge: retirementAge - 10,
                      peakBondAllocation: 60,
                      finalBondAllocation: 35,
                      drawdownEndAge: retirementAge + 20,
                    })}
                  >
                    <div className="text-left">
                      <div className="font-medium">Aggressive Protection</div>
                      <div className="text-xs text-muted-foreground">60% peak, slow recovery</div>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. IMPLEMENT TAB */}
        <TabsContent value="implement">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Implementation Roadmap
              </CardTitle>
              <CardDescription>
                Your year-by-year rebalancing guide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      Your Starting Point
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Current Age</div>
                        <div className="font-semibold">{currentAge}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Current Allocation</div>
                        <div className="font-semibold">{currentStockAllocation}% / {startingBondAllocation}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Portfolio Value</div>
                        <div className="font-semibold">{formatCurrencyFull(portfolioValue)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Years to Retirement</div>
                        <div className="font-semibold">{retirementAge - currentAge}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Immediate Action */}
              {rebalancingActions.length > 0 && rebalancingActions[0].allocationShift !== 0 && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ArrowRight className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        This Year&apos;s Action
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        {rebalancingActions[0].action}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Target Allocation</div>
                          <div className="font-semibold">
                            {rebalancingActions[0].targetStockPct.toFixed(1)}% Stocks / {rebalancingActions[0].targetBondPct.toFixed(1)}% Bonds
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Estimated Transfer</div>
                          <div className="font-semibold">
                            {formatCurrencyFull(rebalancingActions[0].dollarShift)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rebalancing Timeline Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-900/50">
                      <th className="text-left py-2 px-3">Year</th>
                      <th className="text-left py-2 px-3">Age</th>
                      <th className="text-left py-2 px-3">Phase</th>
                      <th className="text-left py-2 px-3">Target</th>
                      <th className="text-left py-2 px-3">Shift</th>
                      <th className="text-left py-2 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rebalancingActions.slice(0, 15).map((action) => (
                      <tr
                        key={action.year}
                        className={`border-b ${
                          action.age === retirementAge
                            ? "bg-orange-50 dark:bg-orange-950/20"
                            : action.age === currentAge
                            ? "bg-green-50 dark:bg-green-950/20"
                            : ""
                        }`}
                      >
                        <td className="py-2 px-3">{new Date().getFullYear() + action.year}</td>
                        <td className="py-2 px-3 font-medium">{action.age}</td>
                        <td className="py-2 px-3">
                          <Badge
                            variant="outline"
                            className={
                              action.phase === "buildup"
                                ? "bg-blue-100 text-blue-700 border-blue-300"
                                : action.phase === "drawdown"
                                ? "bg-green-100 text-green-700 border-green-300"
                                : "bg-gray-100 text-gray-700 border-gray-300"
                            }
                          >
                            {action.phase}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {action.targetStockPct.toFixed(0)}% / {action.targetBondPct.toFixed(0)}%
                        </td>
                        <td className="py-2 px-3">
                          {action.allocationShift !== 0 && (
                            <span
                              className={
                                action.allocationShift > 0
                                  ? "text-blue-600"
                                  : "text-green-600"
                              }
                            >
                              {action.allocationShift > 0 ? "+" : ""}
                              {action.allocationShift.toFixed(1)}% bonds
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {action.dollarShift > 100 ? action.action : "Hold steady"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Implementation Tips */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100">
                      Implementation Tips
                    </div>
                    <ul className="text-sm text-amber-800 dark:text-amber-200 mt-2 list-disc list-inside space-y-1">
                      <li>Rebalance annually or when allocation drifts more than 5%</li>
                      <li>Use new contributions to rebalance when possible (tax-efficient)</li>
                      <li>Consider rebalancing in tax-advantaged accounts first</li>
                      <li>During buildup: direct new investments to bonds</li>
                      <li>During drawdown: spend from bonds first, let stocks grow</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. RESEARCH TAB */}
        <TabsContent value="research">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                Academic Research & Citations
              </CardTitle>
              <CardDescription>
                The evidence behind rising equity glide paths
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Researchers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
                      <span className="text-lg font-bold text-indigo-700 dark:text-indigo-200">WP</span>
                    </div>
                    <div>
                      <div className="font-semibold">Wade Pfau, PhD, CFA</div>
                      <div className="text-xs text-muted-foreground">American College of Financial Services</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Professor of Retirement Income and author of &ldquo;Retirement Planning Guidebook.&rdquo;
                    Pioneer in sequence of returns risk research and retirement income strategies.
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-700 dark:text-purple-200">MK</span>
                    </div>
                    <div>
                      <div className="font-semibold">Michael Kitces, CFP</div>
                      <div className="text-xs text-muted-foreground">Buckingham Wealth Partners</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Financial planner and industry thought leader. Publisher of the Nerd&apos;s Eye View blog.
                    Co-author of key research on retirement glide paths.
                  </p>
                </div>
              </div>

              {/* Research Citations */}
              <div className="space-y-4">
                <div className="text-sm font-medium">Key Research Papers</div>
                {RESEARCH_CITATIONS.map((citation, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{citation.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {citation.author} | {citation.publication} ({citation.year})
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground bg-white dark:bg-gray-900 rounded p-2 border-l-4 border-blue-500">
                          <strong>Key Finding:</strong> {citation.keyFinding}
                        </div>
                      </div>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Key Findings Summary */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      What the Research Shows
                    </div>
                    <ul className="text-sm text-green-800 dark:text-green-200 mt-2 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-green-600">1.</span>
                        <span>
                          Rising equity glide paths (starting conservative, becoming aggressive)
                          produced higher safe withdrawal rates than declining glide paths across
                          historical data.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-green-600">2.</span>
                        <span>
                          A 30% equity allocation at retirement rising to 60-70% over 30 years
                          outperformed static 60/40 portfolios in Monte Carlo simulations.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-green-600">3.</span>
                        <span>
                          The benefit comes from reducing sequence of returns risk in early retirement
                          when the portfolio is largest and most vulnerable.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-green-600">4.</span>
                        <span>
                          Results hold across international markets, not just US equities,
                          suggesting the strategy is robust.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Caveats */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100">
                      Important Caveats
                    </div>
                    <ul className="text-sm text-amber-800 dark:text-amber-200 mt-2 list-disc list-inside space-y-1">
                      <li>Past performance doesn&apos;t guarantee future results</li>
                      <li>The strategy requires discipline during market volatility</li>
                      <li>Individual circumstances (health, expenses, income) matter</li>
                      <li>Consider consulting a financial advisor for personalized advice</li>
                      <li>The optimal glide path depends on your specific situation</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Further Reading */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      Further Reading
                    </div>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                      <li>
                        <a
                          href="https://www.kitces.com/blog/should-equity-exposure-decrease-in-retirement-or-is-a-rising-equity-glidepath-actually-better/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline flex items-center gap-1"
                        >
                          Kitces: Rising Equity Glidepath
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://www.retirementresearcher.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline flex items-center gap-1"
                        >
                          Pfau&apos;s Retirement Researcher
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://earlyretirementnow.com/safe-withdrawal-rate-series/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline flex items-center gap-1"
                        >
                          Big ERN&apos;s Safe Withdrawal Rate Series
                          <ExternalLink className="h-3 w-3" />
                        </a>
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

BondTent.displayName = "BondTent";

export default BondTent;
