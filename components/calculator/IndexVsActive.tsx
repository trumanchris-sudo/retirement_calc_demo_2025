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
import { SliderInput } from "@/components/form/SliderInput";
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  BarChart3,
  PieChart,
  Target,
  Briefcase,
  Scale,
  Zap,
  Shield,
} from "lucide-react";

// =============================================================================
// SPIVA DATA - Real statistics on active fund underperformance
// =============================================================================

interface SPIVACategory {
  category: string;
  underperformance1Year: number;
  underperformance5Year: number;
  underperformance10Year: number;
  underperformance15Year: number;
  avgExpenseRatioActive: number;
  avgExpenseRatioIndex: number;
}

const SPIVA_DATA: SPIVACategory[] = [
  {
    category: "U.S. Large Cap",
    underperformance1Year: 60,
    underperformance5Year: 77,
    underperformance10Year: 87,
    underperformance15Year: 92,
    avgExpenseRatioActive: 0.68,
    avgExpenseRatioIndex: 0.03,
  },
  {
    category: "U.S. Mid Cap",
    underperformance1Year: 55,
    underperformance5Year: 73,
    underperformance10Year: 84,
    underperformance15Year: 90,
    avgExpenseRatioActive: 0.92,
    avgExpenseRatioIndex: 0.04,
  },
  {
    category: "U.S. Small Cap",
    underperformance1Year: 48,
    underperformance5Year: 68,
    underperformance10Year: 82,
    underperformance15Year: 89,
    avgExpenseRatioActive: 1.05,
    avgExpenseRatioIndex: 0.05,
  },
  {
    category: "International Developed",
    underperformance1Year: 65,
    underperformance5Year: 80,
    underperformance10Year: 88,
    underperformance15Year: 91,
    avgExpenseRatioActive: 0.89,
    avgExpenseRatioIndex: 0.06,
  },
  {
    category: "Emerging Markets",
    underperformance1Year: 52,
    underperformance5Year: 75,
    underperformance10Year: 85,
    underperformance15Year: 88,
    avgExpenseRatioActive: 1.15,
    avgExpenseRatioIndex: 0.11,
  },
  {
    category: "U.S. Government Bonds",
    underperformance1Year: 58,
    underperformance5Year: 72,
    underperformance10Year: 80,
    underperformance15Year: 85,
    avgExpenseRatioActive: 0.55,
    avgExpenseRatioIndex: 0.03,
  },
  {
    category: "U.S. Investment Grade",
    underperformance1Year: 62,
    underperformance5Year: 78,
    underperformance10Year: 86,
    underperformance15Year: 90,
    avgExpenseRatioActive: 0.62,
    avgExpenseRatioIndex: 0.04,
  },
];

// =============================================================================
// WHY ACTIVE FAILS - Cost breakdown
// =============================================================================

interface CostFactor {
  name: string;
  activeImpact: string;
  indexImpact: string;
  explanation: string;
  annualDrag: number; // Percentage
}

const COST_FACTORS: CostFactor[] = [
  {
    name: "Expense Ratio",
    activeImpact: "0.50% - 1.50%",
    indexImpact: "0.03% - 0.10%",
    explanation:
      "Annual fee charged by the fund. This comes directly out of your returns, every single year.",
    annualDrag: 0.9, // Difference
  },
  {
    name: "Trading Costs",
    activeImpact: "0.10% - 0.50%",
    indexImpact: "0.01% - 0.02%",
    explanation:
      "Active managers trade frequently, incurring bid-ask spreads and market impact costs. Index funds rarely trade.",
    annualDrag: 0.25,
  },
  {
    name: "Cash Drag",
    activeImpact: "0.10% - 0.30%",
    indexImpact: "Near 0%",
    explanation:
      "Active funds hold cash for redemptions and tactical moves. Cash earns less than stocks over time.",
    annualDrag: 0.15,
  },
  {
    name: "Tax Inefficiency",
    activeImpact: "0.50% - 1.00%",
    indexImpact: "0.05% - 0.20%",
    explanation:
      "High turnover triggers capital gains taxes. Index funds have minimal turnover and rarely distribute gains.",
    annualDrag: 0.5,
  },
];

// =============================================================================
// THREE FUND PORTFOLIO
// =============================================================================

interface FundAllocation {
  name: string;
  ticker: string;
  expenseRatio: number;
  allocation: number;
  description: string;
  color: string;
}

const THREE_FUND_PORTFOLIO: FundAllocation[] = [
  {
    name: "U.S. Total Stock Market",
    ticker: "VTSAX / VTI",
    expenseRatio: 0.03,
    allocation: 60,
    description:
      "Owns every U.S. company. 4,000+ stocks. All sizes. All sectors. Complete diversification.",
    color: "bg-blue-500",
  },
  {
    name: "International Total Stock Market",
    ticker: "VTIAX / VXUS",
    expenseRatio: 0.07,
    allocation: 30,
    description:
      "Owns every international company. 8,000+ stocks. Developed and emerging markets. Global exposure.",
    color: "bg-emerald-500",
  },
  {
    name: "U.S. Total Bond Market",
    ticker: "VBTLX / BND",
    expenseRatio: 0.03,
    allocation: 10,
    description:
      "High-quality bonds. Government and corporate. Provides stability and income.",
    color: "bg-amber-500",
  },
];

// =============================================================================
// ACCOUNT TYPE RECOMMENDATIONS
// =============================================================================

interface AccountRecommendation {
  accountType: string;
  recommendation: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

const ACCOUNT_RECOMMENDATIONS: AccountRecommendation[] = [
  {
    accountType: "Taxable Brokerage",
    recommendation: "Total Market Index Funds",
    reason:
      "Tax-efficient, low turnover, qualified dividends. Use tax-loss harvesting for additional savings.",
    priority: "high",
  },
  {
    accountType: "401(k) with Good Options",
    recommendation: "Target Date Index Fund or 3-Fund Portfolio",
    reason:
      "Low fees, automatic rebalancing. Check if your plan has institutional share classes.",
    priority: "high",
  },
  {
    accountType: "401(k) with Bad Options",
    recommendation: "Target Date Fund (if available) or Lowest-Cost Option",
    reason:
      "If all options are expensive, pick the least bad one. Supplement with IRA investments.",
    priority: "medium",
  },
  {
    accountType: "Traditional IRA",
    recommendation: "Total Market Index Funds",
    reason:
      "No tax advantage to muni bonds here. Use low-cost equity index funds for growth.",
    priority: "high",
  },
  {
    accountType: "Roth IRA",
    recommendation: "Growth-Oriented Index Funds",
    reason:
      "Tax-free growth forever. Tilt toward stocks since gains are never taxed.",
    priority: "high",
  },
  {
    accountType: "HSA",
    recommendation: "Total Market Index Funds",
    reason:
      "Triple tax advantage. Invest for growth if you can cover medical expenses out of pocket.",
    priority: "high",
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function IndexVsActive() {
  // Calculator state
  const [investmentAmount, setInvestmentAmount] = useState(100000);
  const [timeHorizon, setTimeHorizon] = useState(30);
  const [activeExpenseRatio, setActiveExpenseRatio] = useState(1.0);
  const [indexExpenseRatio, setIndexExpenseRatio] = useState(0.03);
  const [expectedReturn, setExpectedReturn] = useState(7);

  // Calculate growth comparison
  const growthComparison = useMemo(() => {
    const years = Array.from({ length: timeHorizon + 1 }, (_, i) => i);
    const indexGrowth: number[] = [];
    const activeGrowth: number[] = [];

    let indexBalance = investmentAmount;
    let activeBalance = investmentAmount;

    const indexNetReturn = (expectedReturn - indexExpenseRatio) / 100;
    const activeNetReturn = (expectedReturn - activeExpenseRatio) / 100;

    years.forEach((year) => {
      indexGrowth.push(indexBalance);
      activeGrowth.push(activeBalance);

      indexBalance *= 1 + indexNetReturn;
      activeBalance *= 1 + activeNetReturn;
    });

    const finalIndexValue = indexGrowth[indexGrowth.length - 1];
    const finalActiveValue = activeGrowth[activeGrowth.length - 1];
    const difference = finalIndexValue - finalActiveValue;
    const percentDifference = ((difference / finalActiveValue) * 100).toFixed(
      1
    );

    return {
      years,
      indexGrowth,
      activeGrowth,
      finalIndexValue,
      finalActiveValue,
      difference,
      percentDifference,
    };
  }, [
    investmentAmount,
    timeHorizon,
    activeExpenseRatio,
    indexExpenseRatio,
    expectedReturn,
  ]);

  // Format currency
  const formatCurrency = useCallback((value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  }, []);

  // Format as full currency
  const formatFullCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // Calculate total cost drag
  const totalCostDrag = useMemo(() => {
    return COST_FACTORS.reduce((sum, factor) => sum + factor.annualDrag, 0);
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-6">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
          Index Funds vs. Active Management
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          The evidence is overwhelming: low-cost index funds beat actively
          managed funds over time. Here is the data, the math, and the simple
          path forward.
        </p>
      </div>

      <Tabs defaultValue="evidence" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="evidence" className="text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />
            Evidence
          </TabsTrigger>
          <TabsTrigger value="why" className="text-xs sm:text-sm">
            <TrendingDown className="w-4 h-4 mr-1 hidden sm:inline" />
            Why Active Fails
          </TabsTrigger>
          <TabsTrigger value="calculator" className="text-xs sm:text-sm">
            <DollarSign className="w-4 h-4 mr-1 hidden sm:inline" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="bias" className="text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 mr-1 hidden sm:inline" />
            Bias
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="text-xs sm:text-sm">
            <Scale className="w-4 h-4 mr-1 hidden sm:inline" />
            Exceptions
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs sm:text-sm">
            <Target className="w-4 h-4 mr-1 hidden sm:inline" />
            By Account
          </TabsTrigger>
          <TabsTrigger value="simple" className="text-xs sm:text-sm">
            <PieChart className="w-4 h-4 mr-1 hidden sm:inline" />
            Simple Portfolio
          </TabsTrigger>
        </TabsList>

        {/* ============================================================= */}
        {/* TAB 1: SPIVA EVIDENCE */}
        {/* ============================================================= */}
        <TabsContent value="evidence" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                SPIVA Scorecard: The Hard Numbers
              </CardTitle>
              <CardDescription>
                S&P Dow Jones Indices tracks how many active funds underperform
                their benchmark index. The results are damning.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key stat callout */}
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-6 text-center">
                <div className="text-6xl font-bold text-red-600 mb-2">90%+</div>
                <div className="text-lg font-semibold text-red-900 dark:text-red-100">
                  of actively managed funds underperform their benchmark over 15
                  years
                </div>
                <div className="text-sm text-red-700 dark:text-red-300 mt-2">
                  Source: S&P Dow Jones SPIVA U.S. Scorecard
                </div>
              </div>

              {/* Data table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-semibold">
                        Category
                      </th>
                      <th className="text-center py-3 px-2 font-semibold">
                        1 Year
                      </th>
                      <th className="text-center py-3 px-2 font-semibold">
                        5 Years
                      </th>
                      <th className="text-center py-3 px-2 font-semibold">
                        10 Years
                      </th>
                      <th className="text-center py-3 px-2 font-semibold">
                        15 Years
                      </th>
                      <th className="text-center py-3 px-2 font-semibold hidden sm:table-cell">
                        Fee Diff
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SPIVA_DATA.map((row) => (
                      <tr
                        key={row.category}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-2 font-medium">
                          {row.category}
                        </td>
                        <td className="text-center py-3 px-2">
                          <Badge
                            variant="outline"
                            className={
                              row.underperformance1Year >= 50
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }
                          >
                            {row.underperformance1Year}%
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-2">
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            {row.underperformance5Year}%
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-2">
                          <Badge
                            variant="outline"
                            className="bg-red-100 text-red-800 border-red-300"
                          >
                            {row.underperformance10Year}%
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-2">
                          <Badge
                            variant="outline"
                            className="bg-red-200 text-red-900 border-red-400"
                          >
                            {row.underperformance15Year}%
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-2 hidden sm:table-cell">
                          <span className="text-muted-foreground">
                            {(
                              row.avgExpenseRatioActive -
                              row.avgExpenseRatioIndex
                            ).toFixed(2)}
                            %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Percentage of active funds that underperformed their benchmark
                index. Higher is worse.
              </div>

              {/* Key insight */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      The Pattern is Clear
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Notice how underperformance gets <em>worse</em> over time,
                      not better. This is not random chance - it is the
                      cumulative effect of higher costs compounding year after
                      year. The longer you hold active funds, the more certain
                      your underperformance becomes.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 2: WHY ACTIVE FAILS */}
        {/* ============================================================= */}
        <TabsContent value="why" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Why Active Management Fails
              </CardTitle>
              <CardDescription>
                It is not about talent. It is about math. Active managers face
                structural headwinds that make consistent outperformance nearly
                impossible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Total drag visualization */}
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-sm text-red-700 dark:text-red-300 mb-1">
                    Total Annual Drag on Active Funds
                  </div>
                  <div className="text-5xl font-bold text-red-600">
                    {totalCostDrag.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Active managers must beat the index by this much just to
                    break even
                  </div>
                </div>

                {/* Drag breakdown bar */}
                <div className="w-full h-8 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
                  {COST_FACTORS.map((factor, idx) => (
                    <div
                      key={factor.name}
                      className={`h-full flex items-center justify-center text-xs text-white font-medium ${
                        idx === 0
                          ? "bg-red-500"
                          : idx === 1
                            ? "bg-red-400"
                            : idx === 2
                              ? "bg-red-300"
                              : "bg-red-600"
                      }`}
                      style={{
                        width: `${(factor.annualDrag / totalCostDrag) * 100}%`,
                      }}
                      title={`${factor.name}: ${factor.annualDrag}%`}
                    >
                      {factor.annualDrag >= 0.3
                        ? `${factor.annualDrag}%`
                        : ""}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 flex-wrap gap-2">
                  {COST_FACTORS.map((factor) => (
                    <span key={factor.name}>
                      {factor.name}: {factor.annualDrag}%
                    </span>
                  ))}
                </div>
              </div>

              {/* Cost breakdown cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COST_FACTORS.map((factor) => (
                  <div
                    key={factor.name}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{factor.name}</h3>
                      <Badge variant="destructive">-{factor.annualDrag}%</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-red-50 dark:bg-red-950/20 rounded p-2">
                        <div className="text-xs text-muted-foreground">
                          Active
                        </div>
                        <div className="font-mono text-red-600">
                          {factor.activeImpact}
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 rounded p-2">
                        <div className="text-xs text-muted-foreground">
                          Index
                        </div>
                        <div className="font-mono text-green-600">
                          {factor.indexImpact}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {factor.explanation}
                    </p>
                  </div>
                ))}
              </div>

              {/* The math */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      The Math Does Not Lie
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Before an active manager can earn you a single extra
                      dollar, they must first overcome a {totalCostDrag.toFixed(1)}%
                      annual headwind. That means they need returns roughly
                      {" "}{(totalCostDrag + 7).toFixed(1)}% vs the market&apos;s 7% just
                      to match an index fund. Year after year. For decades.
                      Possible? Technically. Likely? The data says no.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 3: COST CALCULATOR */}
        {/* ============================================================= */}
        <TabsContent value="calculator" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Fee Impact Calculator
              </CardTitle>
              <CardDescription>
                See exactly how much fees cost you over time. The difference is
                staggering.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Input controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SliderInput
                  label="Investment Amount"
                  value={investmentAmount}
                  min={10000}
                  max={1000000}
                  step={10000}
                  onChange={setInvestmentAmount}
                  formatValue={(v) => formatCurrency(v)}
                />
                <SliderInput
                  label="Time Horizon (Years)"
                  value={timeHorizon}
                  min={5}
                  max={50}
                  step={1}
                  unit=" years"
                  onChange={setTimeHorizon}
                />
                <SliderInput
                  label="Active Fund Expense Ratio"
                  value={activeExpenseRatio}
                  min={0.25}
                  max={2.0}
                  step={0.05}
                  unit="%"
                  onChange={setActiveExpenseRatio}
                  warningThreshold={0.75}
                  dangerThreshold={1.0}
                />
                <SliderInput
                  label="Index Fund Expense Ratio"
                  value={indexExpenseRatio}
                  min={0.01}
                  max={0.25}
                  step={0.01}
                  unit="%"
                  onChange={setIndexExpenseRatio}
                />
              </div>

              {/* Expected return */}
              <SliderInput
                label="Expected Annual Market Return"
                value={expectedReturn}
                min={4}
                max={12}
                step={0.5}
                unit="%"
                onChange={setExpectedReturn}
                description="Historical average for stocks is around 7% after inflation"
              />

              {/* Results comparison */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {/* Index result */}
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      Index Fund
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(growthComparison.finalIndexValue)}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Net return:{" "}
                    {(expectedReturn - indexExpenseRatio).toFixed(2)}%
                  </div>
                </div>

                {/* Active result */}
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-900 dark:text-red-100">
                      Active Fund
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-red-600">
                    {formatCurrency(growthComparison.finalActiveValue)}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Net return:{" "}
                    {(expectedReturn - activeExpenseRatio).toFixed(2)}%
                  </div>
                </div>

                {/* Difference */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900 dark:text-blue-100">
                      You Keep
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    +{formatCurrency(growthComparison.difference)}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {growthComparison.percentDifference}% more wealth
                  </div>
                </div>
              </div>

              {/* Visual comparison bar */}
              <div className="space-y-3 mt-6">
                <div className="text-sm font-medium">
                  Visual Comparison After {timeHorizon} Years
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-20">Index</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500"
                        style={{ width: "100%" }}
                      >
                        {formatCurrency(growthComparison.finalIndexValue)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-20">Active</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-400 to-red-500 h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500"
                        style={{
                          width: `${(growthComparison.finalActiveValue / growthComparison.finalIndexValue) * 100}%`,
                        }}
                      >
                        {formatCurrency(growthComparison.finalActiveValue)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key message */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-900 rounded-lg p-6 text-center">
                <div className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  By choosing index funds, you keep an extra
                </div>
                <div className="text-5xl font-bold text-green-600 mb-2">
                  {formatFullCurrency(growthComparison.difference)}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  That is {growthComparison.percentDifference}% more money in
                  your pocket over {timeHorizon} years
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 4: SURVIVORSHIP BIAS */}
        {/* ============================================================= */}
        <TabsContent value="bias" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                The Survivorship Bias Problem
              </CardTitle>
              <CardDescription>
                When you look at fund performance, you are only seeing the
                winners. The losers have vanished.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visual explanation */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Before */}
                  <div>
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">
                      15 Years Ago: 1,000 Funds Existed
                    </div>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 100 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded bg-amber-400"
                          title="Active fund"
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Each square = 10 funds
                    </div>
                  </div>

                  {/* After */}
                  <div>
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">
                      Today: Only 400 Survive
                    </div>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 100 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded ${
                            i < 40
                              ? "bg-amber-400"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                          title={i < 40 ? "Surviving fund" : "Closed/merged"}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      60% of funds closed or merged away
                    </div>
                  </div>
                </div>
              </div>

              {/* The problems */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Failed Funds Disappear</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      When an actively managed fund performs poorly, the fund
                      company quietly merges it into another fund or closes it
                      entirely. Its terrible track record vanishes from history.
                      You never see it when comparing options.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Winners Get Marketed</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fund companies aggressively market their successful funds
                      while quietly burying the failures. The 5-star fund you
                      see advertised is one of hundreds that were launched -
                      most of which no longer exist.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">
                      Historical Returns Are Cherry-Picked
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      When you look at &ldquo;15-year average returns,&rdquo;
                      you are only seeing funds that survived 15 years.
                      The worst performers - the ones that would have dragged
                      down the average - are not included because they no longer
                      exist.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">
                      Past Performance Predicts Nothing
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Studies consistently show that top-performing funds rarely
                      repeat their success. Last decade&apos;s winner is just
                      as likely to be next decade&apos;s loser. You cannot
                      identify the &ldquo;good&rdquo; active managers in
                      advance.
                    </p>
                  </div>
                </div>
              </div>

              {/* The reality */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      What This Means For You
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Even the SPIVA data showing 90%+ underperformance is{" "}
                      <em>generous</em> to active funds. It only includes
                      surviving funds. If we could resurrect all the closed
                      funds and include their terrible returns, active
                      management would look even worse.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 5: WHEN ACTIVE MIGHT WORK */}
        {/* ============================================================= */}
        <TabsContent value="exceptions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-600" />
                When Active Management Might Work
              </CardTitle>
              <CardDescription>
                To be fair, there are narrow cases where active management has a
                theoretical edge. But &ldquo;might&rdquo; is doing a lot of
                heavy lifting here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* The cases */}
              <div className="space-y-4">
                {/* Small Cap Value */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-amber-600" />
                      <h4 className="font-semibold">Small Cap Value</h4>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Maybe
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Small company stocks are less efficiently priced because
                    fewer analysts cover them. A skilled manager might find
                    undervalued gems that the market has overlooked.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Reality check:</strong> Over 15 years, 89% of
                      small cap active funds still underperform their index.
                      Even in this &ldquo;inefficient&rdquo; market, most
                      managers fail.
                    </p>
                  </div>
                </div>

                {/* Emerging Markets */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-amber-600" />
                      <h4 className="font-semibold">Emerging Markets</h4>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Maybe
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Markets in developing countries have less regulatory
                    oversight and transparency. Local knowledge and on-the-ground
                    research might provide an edge.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Reality check:</strong> Over 15 years, 88% of
                      emerging market active funds underperform. The
                      &ldquo;edge&rdquo; from local knowledge is eaten by higher
                      fees.
                    </p>
                  </div>
                </div>

                {/* Municipal Bonds */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-amber-600" />
                      <h4 className="font-semibold">Municipal Bonds</h4>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Maybe
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Muni bonds trade in a fragmented, dealer-based market with
                    less transparency. Skilled traders might get better
                    execution.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Reality check:</strong> Some active muni managers
                      do add value, but so do low-cost muni index funds. The
                      difference is smaller than in equities.
                    </p>
                  </div>
                </div>
              </div>

              {/* The bottom line */}
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      But Probably Not
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Even in these &ldquo;favorable&rdquo; categories, you
                      cannot reliably identify winning active managers in
                      advance. Past performance does not predict future results.
                      And you still pay higher fees every single year whether
                      the manager wins or loses.
                    </p>
                  </div>
                </div>
              </div>

              {/* The simplest advice */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      The Simplest Advice
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Use index funds everywhere. If you absolutely must scratch
                      the active management itch, limit it to 10% of your
                      portfolio and consider it entertainment, not investment
                      strategy.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 6: ACCOUNT RECOMMENDATIONS */}
        {/* ============================================================= */}
        <TabsContent value="recommendations" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Recommendations by Account Type
              </CardTitle>
              <CardDescription>
                Different accounts have different rules and tax implications.
                Here is what to use where.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ACCOUNT_RECOMMENDATIONS.map((rec) => (
                <div
                  key={rec.accountType}
                  className={`border rounded-lg p-4 ${
                    rec.priority === "high"
                      ? "border-green-200 bg-green-50/50 dark:bg-green-950/10"
                      : rec.priority === "medium"
                        ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10"
                        : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{rec.accountType}</h4>
                        <Badge
                          variant="outline"
                          className={
                            rec.priority === "high"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : rec.priority === "medium"
                                ? "bg-amber-100 text-amber-700 border-amber-300"
                                : "bg-gray-100 text-gray-700"
                          }
                        >
                          {rec.priority === "high" ? "Best Option" : "OK Option"}
                        </Badge>
                      </div>
                      <div className="text-lg font-medium text-blue-600 mb-2">
                        {rec.recommendation}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rec.reason}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Special note for bad 401k */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Stuck With a Bad 401(k)?
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      Many employer plans have terrible options with high fees.
                      Here is your action plan:
                    </p>
                    <ol className="text-sm text-amber-800 dark:text-amber-200 list-decimal list-inside space-y-1">
                      <li>
                        Contribute enough to get the full employer match (free
                        money)
                      </li>
                      <li>
                        Then max out your IRA where you control the options
                      </li>
                      <li>
                        Then go back to the 401(k) if you still have money to
                        save
                      </li>
                      <li>
                        When you leave the job, roll the 401(k) into your IRA
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 7: SIMPLE PORTFOLIO */}
        {/* ============================================================= */}
        <TabsContent value="simple" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-emerald-600" />
                The Three-Fund Portfolio
              </CardTitle>
              <CardDescription>
                Everything you need. Nothing you don&apos;t. Total market
                diversification in three funds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visual pie chart representation */}
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Simple pie visualization */}
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* US Stocks - 60% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#3b82f6"
                      strokeWidth="20"
                      strokeDasharray="150.8 251.3"
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                    {/* International - 30% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="20"
                      strokeDasharray="75.4 251.3"
                      strokeDashoffset="-150.8"
                      transform="rotate(-90 50 50)"
                    />
                    {/* Bonds - 10% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth="20"
                      strokeDasharray="25.1 251.3"
                      strokeDashoffset="-226.2"
                      transform="rotate(-90 50 50)"
                    />
                    <text
                      x="50"
                      y="50"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-lg font-bold fill-current"
                    >
                      3 Funds
                    </text>
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {THREE_FUND_PORTFOLIO.map((fund) => (
                    <div key={fund.name} className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded ${fund.color}`}
                        aria-hidden="true"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{fund.name}</span>
                          <span className="font-bold">{fund.allocation}%</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {fund.ticker} ({fund.expenseRatio}% expense ratio)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fund details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {THREE_FUND_PORTFOLIO.map((fund) => (
                  <div
                    key={fund.name}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${fund.color}`}
                        aria-hidden="true"
                      />
                      <h4 className="font-semibold text-sm">{fund.name}</h4>
                    </div>
                    <div className="font-mono text-lg text-blue-600">
                      {fund.ticker}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fund.description}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Expense Ratio
                      </span>
                      <Badge variant="outline" className="text-green-600">
                        {fund.expenseRatio}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Combined expense ratio */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 text-center">
                <div className="text-sm text-green-700 dark:text-green-300 mb-1">
                  Weighted Average Expense Ratio
                </div>
                <div className="text-4xl font-bold text-green-600">0.04%</div>
                <div className="text-sm text-muted-foreground mt-1">
                  That is $4 per year for every $10,000 invested
                </div>
              </div>

              {/* Why this works */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Why This Is All You Need
                    </div>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-disc list-inside">
                      <li>
                        <strong>U.S. Total Market:</strong> Owns 4,000+ U.S.
                        companies. Every sector. Every size. Complete domestic
                        diversification.
                      </li>
                      <li>
                        <strong>International:</strong> Owns 8,000+ companies
                        across developed and emerging markets. Global
                        diversification.
                      </li>
                      <li>
                        <strong>Bonds:</strong> Provides stability and income.
                        Reduces volatility. Gives you something to rebalance
                        from in crashes.
                      </li>
                      <li>
                        <strong>Together:</strong> You own essentially the
                        entire world economy for 0.04% per year.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* You don't need more */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">
                  You Do Not Need Anything Else
                </h3>
                <p className="text-emerald-800 dark:text-emerald-200 max-w-lg mx-auto">
                  Not sector funds. Not factor funds. Not alternatives. Not
                  crypto. Not gold. Not REITs (they are already in the total
                  market fund). Three funds. Rebalance once a year. Done.
                </p>
              </div>

              {/* Allocation by age */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Suggested Allocation by Age
                </h4>
                <div className="text-sm text-muted-foreground mb-4">
                  A common rule: Bonds = Your Age. Adjust based on risk
                  tolerance.
                </div>
                <div className="space-y-2">
                  {[
                    { age: "20s", stocks: 90, bonds: 10 },
                    { age: "30s", stocks: 80, bonds: 20 },
                    { age: "40s", stocks: 70, bonds: 30 },
                    { age: "50s", stocks: 60, bonds: 40 },
                    { age: "60s", stocks: 50, bonds: 50 },
                    { age: "70+", stocks: 40, bonds: 60 },
                  ].map((row) => (
                    <div key={row.age} className="flex items-center gap-2">
                      <span className="w-12 text-sm font-medium">
                        {row.age}
                      </span>
                      <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full"
                          style={{ width: `${row.stocks}%` }}
                        />
                        <div
                          className="bg-amber-400 h-full"
                          style={{ width: `${row.bonds}%` }}
                        />
                      </div>
                      <span className="w-24 text-xs text-right">
                        {row.stocks}% / {row.bonds}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-emerald-500" />
                    Stocks (US + International)
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-amber-400" />
                    Bonds
                  </div>
                </div>
              </div>

              {/* Final message */}
              <div className="text-center text-muted-foreground text-sm py-4">
                &ldquo;The stock market is a device for transferring money from
                the impatient to the patient.&rdquo; &mdash; Warren Buffett
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/20 dark:to-emerald-950/20 border-2 border-blue-200 dark:border-blue-900">
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">The Bottom Line</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div>
                <div className="text-4xl font-bold text-blue-600">90%+</div>
                <div className="text-sm text-muted-foreground">
                  Active funds underperform over 15 years
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-emerald-600">0.03%</div>
                <div className="text-sm text-muted-foreground">
                  Total market index fund cost
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-amber-600">3</div>
                <div className="text-sm text-muted-foreground">
                  Funds for complete diversification
                </div>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The case for simplicity is the case for keeping more of your
              money. Low-cost index funds are not the exciting choice. They are
              the winning choice.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default IndexVsActive;
