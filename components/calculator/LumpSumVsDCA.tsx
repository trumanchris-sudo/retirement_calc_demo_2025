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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Bar,
  BarChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Brain,
  Shuffle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Heart,
  Zap,
  Scale,
  BookOpen,
  ArrowRight,
  Info,
  Lightbulb,
} from "lucide-react";

// Import historical S&P 500 data from shared constants
import { SP500_ORIGINAL, SP500_START_YEAR, SP500_END_YEAR } from "@/lib/calculations/shared/constants";

// Lazy load ComposedChart for better performance
const ComposedChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.ComposedChart })),
  { ssr: false }
);

// Types
interface SimulationResult {
  year: number;
  month: number;
  lumpSumValue: number;
  dcaValue: number;
  dcaInvested: number;
  marketReturn: number;
}

interface HistoricalOutcome {
  startYear: number;
  lumpSumFinal: number;
  dcaFinal: number;
  lumpSumWins: boolean;
  difference: number;
  differencePercent: number;
}

interface ProbabilityBin {
  range: string;
  lumpSumCount: number;
  dcaCount: number;
  midpoint: number;
}

// Format currency
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};

// Simulate DCA vs Lump Sum for a given starting year
function simulateHistoricalPeriod(
  amount: number,
  startYear: number,
  dcaMonths: number = 12
): SimulationResult[] {
  const results: SimulationResult[] = [];
  const startIndex = startYear - SP500_START_YEAR;

  if (startIndex < 0 || startIndex >= SP500_ORIGINAL.length) {
    return results;
  }

  // Lump sum invests everything immediately
  let lumpSumValue = amount;

  // DCA invests monthly over the specified period
  const monthlyInvestment = amount / dcaMonths;
  let dcaValue = 0;
  let dcaInvested = 0;
  let dcaCash = amount;

  // Simulate month by month for the investment period + 1 year
  const totalMonths = dcaMonths + 12;

  for (let month = 0; month < totalMonths; month++) {
    const yearOffset = Math.floor(month / 12);
    const yearIndex = startIndex + yearOffset;

    if (yearIndex >= SP500_ORIGINAL.length) break;

    // Get monthly return (annual return / 12, simplified)
    const annualReturn = SP500_ORIGINAL[yearIndex] / 100;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

    // Lump sum grows
    lumpSumValue *= (1 + monthlyReturn);

    // DCA: invest monthly amount if still in DCA period
    if (month < dcaMonths) {
      dcaInvested += monthlyInvestment;
      dcaCash -= monthlyInvestment;
    }

    // DCA invested portion grows
    dcaValue *= (1 + monthlyReturn);
    if (month < dcaMonths) {
      // New investment grows for half the month on average
      dcaValue += monthlyInvestment * (1 + monthlyReturn * 0.5);
    }

    results.push({
      year: startYear + yearOffset,
      month: month + 1,
      lumpSumValue,
      dcaValue: dcaValue + dcaCash,
      dcaInvested,
      marketReturn: SP500_ORIGINAL[yearIndex],
    });
  }

  return results;
}

// Calculate all historical outcomes
function calculateAllHistoricalOutcomes(
  amount: number,
  dcaMonths: number
): HistoricalOutcome[] {
  const outcomes: HistoricalOutcome[] = [];

  // Need at least 2 years of data for meaningful comparison
  const maxStartYear = SP500_END_YEAR - 1;

  for (let year = SP500_START_YEAR; year <= maxStartYear; year++) {
    const simulation = simulateHistoricalPeriod(amount, year, dcaMonths);
    if (simulation.length < dcaMonths) continue;

    const finalResult = simulation[simulation.length - 1];
    const lumpSumFinal = finalResult.lumpSumValue;
    const dcaFinal = finalResult.dcaValue;
    const lumpSumWins = lumpSumFinal > dcaFinal;
    const difference = lumpSumFinal - dcaFinal;
    const differencePercent = ((lumpSumFinal - dcaFinal) / amount) * 100;

    outcomes.push({
      startYear: year,
      lumpSumFinal,
      dcaFinal,
      lumpSumWins,
      difference,
      differencePercent,
    });
  }

  return outcomes;
}

// Main Component
export default function LumpSumVsDCA() {
  // State
  const [amount, setAmount] = useState(100000);
  const [dcaMonths, setDcaMonths] = useState(12);
  const [selectedYear, setSelectedYear] = useState(2000);
  const [hybridPercent, setHybridPercent] = useState(50);
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [activeTab, setActiveTab] = useState("research");

  // Calculate historical outcomes
  const historicalOutcomes = useMemo(
    () => calculateAllHistoricalOutcomes(amount, dcaMonths),
    [amount, dcaMonths]
  );

  // Statistics
  const stats = useMemo(() => {
    if (historicalOutcomes.length === 0) {
      return { lumpSumWinRate: 0, avgDifference: 0, medianDifference: 0 };
    }

    const lumpSumWins = historicalOutcomes.filter((o) => o.lumpSumWins).length;
    const winRate = (lumpSumWins / historicalOutcomes.length) * 100;

    const differences = historicalOutcomes.map((o) => o.differencePercent);
    differences.sort((a, b) => a - b);

    const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
    const medianDiff = differences[Math.floor(differences.length / 2)];

    return {
      lumpSumWinRate: winRate,
      avgDifference: avgDiff,
      medianDifference: medianDiff,
    };
  }, [historicalOutcomes]);

  // Selected year simulation
  const selectedSimulation = useMemo(
    () => simulateHistoricalPeriod(amount, selectedYear, dcaMonths),
    [amount, selectedYear, dcaMonths]
  );

  // Chart data for selected year
  const chartData = useMemo(() => {
    return selectedSimulation.map((r, i) => ({
      month: r.month,
      "Lump Sum": Math.round(r.lumpSumValue),
      DCA: Math.round(r.dcaValue),
      "Amount Invested (DCA)": Math.round(r.dcaInvested),
    }));
  }, [selectedSimulation]);

  // Probability distribution data
  const distributionData = useMemo((): ProbabilityBin[] => {
    const bins: Map<string, { lumpSum: number; dca: number; midpoint: number }> = new Map();
    const binSize = 10; // 10% bins

    historicalOutcomes.forEach((outcome) => {
      const lumpSumReturn = ((outcome.lumpSumFinal - amount) / amount) * 100;
      const dcaReturn = ((outcome.dcaFinal - amount) / amount) * 100;

      const lumpSumBin = Math.floor(lumpSumReturn / binSize) * binSize;
      const dcaBin = Math.floor(dcaReturn / binSize) * binSize;

      const lumpSumKey = `${lumpSumBin}% to ${lumpSumBin + binSize}%`;
      const dcaKey = `${dcaBin}% to ${dcaBin + binSize}%`;

      // Lump Sum
      if (!bins.has(lumpSumKey)) {
        bins.set(lumpSumKey, { lumpSum: 0, dca: 0, midpoint: lumpSumBin + binSize / 2 });
      }
      bins.get(lumpSumKey)!.lumpSum++;

      // DCA
      if (!bins.has(dcaKey)) {
        bins.set(dcaKey, { lumpSum: 0, dca: 0, midpoint: dcaBin + binSize / 2 });
      }
      bins.get(dcaKey)!.dca++;
    });

    return Array.from(bins.entries())
      .map(([range, data]) => ({
        range,
        lumpSumCount: data.lumpSum,
        dcaCount: data.dca,
        midpoint: data.midpoint,
      }))
      .sort((a, b) => a.midpoint - b.midpoint);
  }, [historicalOutcomes, amount]);

  // Years for selection
  const availableYears = useMemo(() => {
    const years = [];
    for (let y = SP500_START_YEAR; y <= SP500_END_YEAR - 1; y++) {
      years.push(y);
    }
    return years;
  }, []);

  // Notable periods
  const notablePeriods = [
    { year: 1929, label: "Great Depression Start", type: "crash" },
    { year: 1973, label: "Oil Crisis / Stagflation", type: "crash" },
    { year: 1987, label: "Black Monday", type: "crash" },
    { year: 2000, label: "Dot-Com Bubble", type: "crash" },
    { year: 2007, label: "Financial Crisis", type: "crash" },
    { year: 2020, label: "COVID Crash", type: "crash" },
    { year: 1995, label: "Bull Market Run", type: "bull" },
    { year: 2009, label: "Recovery Start", type: "bull" },
    { year: 2013, label: "Strong Bull Market", type: "bull" },
  ];

  // Get recommendation based on risk tolerance
  const getRecommendation = useCallback(() => {
    if (riskTolerance === "low") {
      return {
        strategy: "DCA",
        allocation: "100% DCA over 12 months",
        reasoning:
          "Your priority is peace of mind. While lump sum wins more often, DCA lets you sleep at night.",
      };
    }
    if (riskTolerance === "high") {
      return {
        strategy: "Lump Sum",
        allocation: "100% invested immediately",
        reasoning:
          "You can handle volatility. Historically, lump sum wins ~67% of the time. Time in market beats timing the market.",
      };
    }
    return {
      strategy: "Hybrid",
      allocation: `${hybridPercent}% now, ${100 - hybridPercent}% over ${dcaMonths} months`,
      reasoning:
        "Balance math and emotion. Get most of the expected return while reducing regret risk.",
    };
  }, [riskTolerance, hybridPercent, dcaMonths]);

  const recommendation = getRecommendation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
          <Scale className="h-7 w-7 text-blue-600" />
          Lump Sum vs. Dollar Cost Averaging
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          &quot;I have {formatCurrency(amount)} to invest. Should I invest it all at once or spread it out?&quot;
        </p>
      </div>

      {/* Input Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Your Scenario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Invest</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1000, Number(e.target.value)))}
                  className="pl-7"
                  min={1000}
                  step={10000}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>DCA Period: {dcaMonths} months</Label>
              <Slider
                value={[dcaMonths]}
                onValueChange={(v) => setDcaMonths(v[0])}
                min={3}
                max={24}
                step={1}
                thumbLabel="DCA period in months"
              />
            </div>
            <div className="space-y-2">
              <Label>Your Risk Tolerance</Label>
              <Select value={riskTolerance} onValueChange={(v: "low" | "medium" | "high") => setRiskTolerance(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Low - Sleep is priority
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-yellow-500" />
                      Medium - Balanced
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-green-500" />
                      High - Math over emotion
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="research" className="text-xs sm:text-sm">
            <BookOpen className="h-4 w-4 mr-1 hidden sm:inline" />
            Research
          </TabsTrigger>
          <TabsTrigger value="historical" className="text-xs sm:text-sm">
            <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
            History
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="text-xs sm:text-sm">
            <Target className="h-4 w-4 mr-1 hidden sm:inline" />
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="psychology" className="text-xs sm:text-sm">
            <Brain className="h-4 w-4 mr-1 hidden sm:inline" />
            Psychology
          </TabsTrigger>
          <TabsTrigger value="hybrid" className="text-xs sm:text-sm">
            <Shuffle className="h-4 w-4 mr-1 hidden sm:inline" />
            Hybrid
          </TabsTrigger>
          <TabsTrigger value="exception" className="text-xs sm:text-sm">
            <AlertTriangle className="h-4 w-4 mr-1 hidden sm:inline" />
            Exception
          </TabsTrigger>
          <TabsTrigger value="volatility" className="text-xs sm:text-sm">
            <TrendingDown className="h-4 w-4 mr-1 hidden sm:inline" />
            Volatility
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: The Research */}
        <TabsContent value="research" className="space-y-4 mt-4">
          <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                The Math: Vanguard Research
              </CardTitle>
              <CardDescription>
                What does the data actually say?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Win Rate Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-950/30 rounded-xl">
                  <div className="text-5xl font-bold text-green-600 mb-2">
                    ~67%
                  </div>
                  <div className="text-lg font-medium">Lump Sum Wins</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Historically, across multiple markets and time periods
                  </p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-950/30 rounded-xl">
                  <div className="text-5xl font-bold text-yellow-600 mb-2">
                    ~33%
                  </div>
                  <div className="text-lg font-medium">DCA Wins</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Usually when markets decline during the DCA period
                  </p>
                </div>
              </div>

              {/* Key Insight */}
              <div className="p-4 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      Why Does Lump Sum Usually Win?
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Markets go up more often than they go down. By investing immediately,
                      your money is exposed to this upward bias for longer. DCA effectively
                      keeps cash on the sidelines, which historically returns less than equities.
                    </p>
                  </div>
                </div>
              </div>

              {/* Your Data */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-3">
                  From Our Historical Data ({SP500_START_YEAR}-{SP500_END_YEAR}):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.lumpSumWinRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Lump Sum Win Rate
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercent(stats.avgDifference)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg. LS Advantage
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatPercent(stats.medianDifference)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Median LS Advantage
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribution Chart */}
              <div>
                <h4 className="font-semibold mb-3">Outcome Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={distributionData} barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Frequency", angle: -90, position: "insideLeft", fontSize: 12 }} />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="lumpSumCount" name="Lump Sum" fill="#3b82f6" />
                    <Bar dataKey="dcaCount" name="DCA" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Returns over {dcaMonths + 12} months following investment
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Historical Simulation */}
        <TabsContent value="historical" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Historical Simulation
              </CardTitle>
              <CardDescription>
                Pick any start date and see what actually happened
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Year Selection */}
              <div className="flex flex-wrap items-center gap-2">
                <Label className="whitespace-nowrap">Start Year:</Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(Number(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Quick Select Notable Periods */}
                <div className="flex flex-wrap gap-1 ml-2">
                  {notablePeriods.map((period) => (
                    <Button
                      key={period.year}
                      variant={selectedYear === period.year ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedYear(period.year)}
                      className="text-xs"
                    >
                      {period.type === "crash" ? (
                        <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                      ) : (
                        <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                      )}
                      {period.year}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Results Summary */}
              {selectedSimulation.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Lump Sum Final</div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(selectedSimulation[selectedSimulation.length - 1]?.lumpSumValue || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPercent(
                        ((selectedSimulation[selectedSimulation.length - 1]?.lumpSumValue || 0) - amount) /
                          amount *
                          100
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">DCA Final</div>
                    <div className="text-xl font-bold text-yellow-600">
                      {formatCurrency(selectedSimulation[selectedSimulation.length - 1]?.dcaValue || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPercent(
                        ((selectedSimulation[selectedSimulation.length - 1]?.dcaValue || 0) - amount) /
                          amount *
                          100
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Winner</div>
                    <div className="text-xl font-bold">
                      {(selectedSimulation[selectedSimulation.length - 1]?.lumpSumValue || 0) >
                      (selectedSimulation[selectedSimulation.length - 1]?.dcaValue || 0) ? (
                        <span className="text-blue-600 flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-5 w-5" />
                          Lump Sum
                        </span>
                      ) : (
                        <span className="text-yellow-600 flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-5 w-5" />
                          DCA
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by{" "}
                      {formatCurrency(
                        Math.abs(
                          (selectedSimulation[selectedSimulation.length - 1]?.lumpSumValue || 0) -
                            (selectedSimulation[selectedSimulation.length - 1]?.dcaValue || 0)
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Chart */}
              <div>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLumpSum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDCA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="month"
                      label={{ value: "Month", position: "bottom", offset: -5 }}
                    />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <RTooltip
                      formatter={(v: number) => formatCurrency(v)}
                      labelFormatter={(l) => `Month ${l}`}
                    />
                    <Legend />
                    <ReferenceLine y={amount} stroke="#888" strokeDasharray="3 3" label="Initial" />
                    <Line
                      type="monotone"
                      dataKey="Lump Sum"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="DCA"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Amount Invested (DCA)"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Market Context */}
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                <Info className="h-4 w-4 inline mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Market return in {selectedYear}:{" "}
                  <span
                    className={
                      SP500_ORIGINAL[selectedYear - SP500_START_YEAR] >= 0
                        ? "text-green-600 font-medium"
                        : "text-red-600 font-medium"
                    }
                  >
                    {formatPercent(SP500_ORIGINAL[selectedYear - SP500_START_YEAR])}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Your Scenario */}
        <TabsContent value="scenarios" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Expected Outcomes
              </CardTitle>
              <CardDescription>
                Based on {historicalOutcomes.length} historical scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scenario Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lump Sum Scenarios */}
                <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-4">
                    Lump Sum Outcomes
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Best Case (90th %ile)</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(
                          historicalOutcomes
                            .map((o) => o.lumpSumFinal)
                            .sort((a, b) => b - a)[Math.floor(historicalOutcomes.length * 0.1)] || 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Expected (Median)</span>
                      <span className="font-medium">
                        {formatCurrency(
                          historicalOutcomes
                            .map((o) => o.lumpSumFinal)
                            .sort((a, b) => a - b)[Math.floor(historicalOutcomes.length * 0.5)] || 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Worst Case (10th %ile)</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(
                          historicalOutcomes
                            .map((o) => o.lumpSumFinal)
                            .sort((a, b) => a - b)[Math.floor(historicalOutcomes.length * 0.1)] || 0
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DCA Scenarios */}
                <div className="p-4 rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                  <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-4">
                    DCA Outcomes
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Best Case (90th %ile)</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(
                          historicalOutcomes
                            .map((o) => o.dcaFinal)
                            .sort((a, b) => b - a)[Math.floor(historicalOutcomes.length * 0.1)] || 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Expected (Median)</span>
                      <span className="font-medium">
                        {formatCurrency(
                          historicalOutcomes
                            .map((o) => o.dcaFinal)
                            .sort((a, b) => a - b)[Math.floor(historicalOutcomes.length * 0.5)] || 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Worst Case (10th %ile)</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(
                          historicalOutcomes
                            .map((o) => o.dcaFinal)
                            .sort((a, b) => a - b)[Math.floor(historicalOutcomes.length * 0.1)] || 0
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Insight */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Key Insight</h4>
                <p className="text-sm text-muted-foreground">
                  Notice that both best and worst cases are more extreme for lump sum.
                  DCA narrows the range of outcomes - you give up some upside potential
                  in exchange for limiting downside risk.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Psychology Factor */}
        <TabsContent value="psychology" className="space-y-4 mt-4">
          <Card className="border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                The Psychology Factor
              </CardTitle>
              <CardDescription>
                The best strategy is one you will stick with
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* The Big Question */}
              <div className="p-6 bg-gradient-to-br from-red-100 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20 rounded-xl text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">
                  How would you feel if the market dropped 30% tomorrow?
                </h3>
                <p className="text-muted-foreground">
                  If you invested {formatCurrency(amount)} today and woke up to{" "}
                  {formatCurrency(amount * 0.7)}, would you:
                </p>
              </div>

              {/* Response Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-100/50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <Zap className="h-6 w-6 text-green-600 mb-2" />
                  <h4 className="font-semibold">Buy More!</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    &quot;Stocks are on sale! This is a buying opportunity.&quot;
                  </p>
                  <Badge className="mt-2" variant="outline">
                    Lump Sum is for you
                  </Badge>
                </div>
                <div className="p-4 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <Scale className="h-6 w-6 text-yellow-600 mb-2" />
                  <h4 className="font-semibold">Stay the Course</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    &quot;Volatility happens. I will not panic sell.&quot;
                  </p>
                  <Badge className="mt-2" variant="outline">
                    Either works
                  </Badge>
                </div>
                <div className="p-4 rounded-lg bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <Heart className="h-6 w-6 text-red-600 mb-2" />
                  <h4 className="font-semibold">Feel Sick</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    &quot;I knew I should have waited. I have to sell before it gets worse.&quot;
                  </p>
                  <Badge className="mt-2" variant="outline">
                    Consider DCA
                  </Badge>
                </div>
              </div>

              {/* Sleep Quote */}
              <div className="p-4 bg-purple-100/50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                <p className="text-lg font-medium italic">
                  &quot;DCA is not about returns. It is about SLEEP.&quot;
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  If you would panic sell after a lump sum followed by a crash,
                  you would have been better off with DCA - even though lump sum
                  was mathematically optimal.
                </p>
              </div>

              {/* Regret Minimization */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-3">Regret Minimization Framework</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-blue-600">Lump Sum Regret:</p>
                    <p className="text-muted-foreground">
                      &quot;I invested everything and then it dropped. Should have waited.&quot;
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-600">DCA Regret:</p>
                    <p className="text-muted-foreground">
                      &quot;Market kept going up while I was DCA-ing. Should have invested sooner.&quot;
                    </p>
                  </div>
                </div>
                <p className="text-sm mt-3 font-medium">
                  Which regret would hurt more? That is your answer.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Hybrid Approach */}
        <TabsContent value="hybrid" className="space-y-4 mt-4">
          <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-green-600" />
                The Hybrid Approach
              </CardTitle>
              <CardDescription>
                Balance math and emotion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hybrid Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Investment Split</Label>
                  <Badge variant="outline">
                    {hybridPercent}% now / {100 - hybridPercent}% DCA
                  </Badge>
                </div>
                <Slider
                  value={[hybridPercent]}
                  onValueChange={(v) => setHybridPercent(v[0])}
                  min={0}
                  max={100}
                  step={10}
                  thumbLabel="Percentage to invest now"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>100% DCA</span>
                  <span>50/50 Split</span>
                  <span>100% Lump Sum</span>
                </div>
              </div>

              {/* Visual Split */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(amount * (hybridPercent / 100))}
                  </div>
                  <div className="text-sm text-muted-foreground">Invest Now</div>
                </div>
                <div className="p-4 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(amount * ((100 - hybridPercent) / 100))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    DCA over {dcaMonths} months
                    <br />
                    <span className="text-xs">
                      ({formatCurrency((amount * ((100 - hybridPercent) / 100)) / dcaMonths)}/month)
                    </span>
                  </div>
                </div>
              </div>

              {/* Common Splits */}
              <div className="space-y-3">
                <h4 className="font-semibold">Common Approaches:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    variant={hybridPercent === 50 ? "default" : "outline"}
                    onClick={() => setHybridPercent(50)}
                    className="justify-start"
                  >
                    <div className="text-left">
                      <div className="font-medium">50/50 Split</div>
                      <div className="text-xs opacity-70">Half now, half over time</div>
                    </div>
                  </Button>
                  <Button
                    variant={hybridPercent === 70 ? "default" : "outline"}
                    onClick={() => setHybridPercent(70)}
                    className="justify-start"
                  >
                    <div className="text-left">
                      <div className="font-medium">70/30 Split</div>
                      <div className="text-xs opacity-70">Lean toward math</div>
                    </div>
                  </Button>
                  <Button
                    variant={hybridPercent === 30 ? "default" : "outline"}
                    onClick={() => setHybridPercent(30)}
                    className="justify-start"
                  >
                    <div className="text-left">
                      <div className="font-medium">30/70 Split</div>
                      <div className="text-xs opacity-70">Lean toward comfort</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Benefits */}
              <div className="p-4 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200">
                  Why Hybrid Works
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Captures most of the expected lump sum advantage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Reduces regret in both up and down markets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Psychologically easier to commit to</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Less likely to trigger panic selling</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: The Exception */}
        <TabsContent value="exception" className="space-y-4 mt-4">
          <Card className="border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                The Exception
              </CardTitle>
              <CardDescription>
                When this debate does not apply to you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Message */}
              <div className="p-6 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 rounded-xl">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-center mb-2">
                  If you are investing regularly from your paycheck...
                </h3>
                <p className="text-center text-lg font-medium text-green-700 dark:text-green-300">
                  You are already dollar cost averaging!
                </p>
              </div>

              {/* Explanation */}
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  The lump sum vs. DCA debate only applies to one-time windfalls:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg">
                    <h4 className="font-semibold mb-2">This Applies To:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>- Inheritance</li>
                      <li>- Large bonus</li>
                      <li>- Home sale proceeds</li>
                      <li>- Settlement or lawsuit</li>
                      <li>- Lottery winnings</li>
                      <li>- Stock options exercise</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-semibold mb-2">This Does NOT Apply To:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>- 401(k) contributions</li>
                      <li>- Monthly savings</li>
                      <li>- Automatic investments</li>
                      <li>- Paycheck deductions</li>
                      <li>- Recurring transfers</li>
                      <li>- Dividend reinvestment</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Important Note */}
              <div className="p-4 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-semibold mb-2">Important</h4>
                <p className="text-sm text-muted-foreground">
                  For regular income investing, the choice is already made - you invest
                  each paycheck as it comes in. This is DCA by default, and it is the
                  right approach because you cannot invest money you do not have yet.
                </p>
              </div>

              {/* The Real Question */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">The Real Question</h4>
                <p className="text-sm text-muted-foreground">
                  If you are asking &quot;lump sum or DCA?&quot; you probably have a
                  windfall to invest. In that case, the math favors lump sum, but
                  your psychology might favor DCA or a hybrid approach.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Volatility Drag */}
        <TabsContent value="volatility" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Volatility Drag Explained
              </CardTitle>
              <CardDescription>
                Why DCA underperforms in rising markets and feels better in falling markets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cash Drag */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Cash Drag: The Hidden Cost of DCA
                </h4>
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    When you DCA over 12 months, on average only 50% of your money is
                    invested at any given time. The uninvested cash earns very little.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">100%</div>
                      <div className="text-xs text-muted-foreground">Lump Sum Exposure</div>
                    </div>
                    <div>
                      <ArrowRight className="h-6 w-6 mx-auto text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">~50%</div>
                      <div className="text-xs text-muted-foreground">DCA Avg Exposure</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rising vs Falling Markets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Rising Markets
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your cash waits on the sidelines while prices climb. Each monthly
                    purchase buys fewer shares than the previous month.
                  </p>
                  <div className="p-3 bg-white/50 dark:bg-black/20 rounded">
                    <p className="text-xs font-medium">
                      Result: Lump sum wins because full investment captures full gains
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Falling Markets
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your cash is protected while prices fall. Each monthly purchase
                    buys more shares than the previous month.
                  </p>
                  <div className="p-3 bg-white/50 dark:bg-black/20 rounded">
                    <p className="text-xs font-medium">
                      Result: DCA wins because it avoids full exposure to losses
                    </p>
                  </div>
                </div>
              </div>

              {/* The Math */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-3">The Math Behind It</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Consider {formatCurrency(amount)} with a 10% annual return:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded">
                    <p className="font-medium">Lump Sum</p>
                    <p className="text-muted-foreground">
                      {formatCurrency(amount)} x 1.10 = {formatCurrency(amount * 1.10)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Full year of growth on full amount
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 rounded">
                    <p className="font-medium">DCA (12 months)</p>
                    <p className="text-muted-foreground">
                      Average ~6 months invested = ~5% gain
                      <br />
                      {formatCurrency(amount)} x 1.05 = ~{formatCurrency(amount * 1.05)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Less time in market = less growth
                    </p>
                  </div>
                </div>
              </div>

              {/* Why DCA Feels Better */}
              <div className="p-4 bg-purple-100/50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                <h4 className="font-semibold mb-2">Why DCA Feels Better in Crashes</h4>
                <p className="text-sm text-muted-foreground">
                  Imagine the market drops 20% right after you invest:
                </p>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <p className="font-medium text-blue-600">Lump Sum:</p>
                    <p className="text-muted-foreground">
                      Lost {formatCurrency(amount * 0.20)} immediately
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-600">DCA:</p>
                    <p className="text-muted-foreground">
                      Lost only {formatCurrency((amount / 12) * 0.20)} on first month
                    </p>
                  </div>
                </div>
                <p className="text-sm mt-3 font-medium">
                  Plus: DCA buys the remaining 11 months at lower prices!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendation Card */}
      <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Your Personalized Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground">Strategy</div>
              <div className="text-2xl font-bold text-primary">{recommendation.strategy}</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground">Allocation</div>
              <div className="text-lg font-medium">{recommendation.allocation}</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground">Risk Profile</div>
              <Badge variant="outline" className="text-base">
                {riskTolerance.charAt(0).toUpperCase() + riskTolerance.slice(1)}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg">
        <Info className="h-4 w-4 inline mr-1" />
        Historical data from {SP500_START_YEAR}-{SP500_END_YEAR} (S&P 500 nominal returns).
        Past performance does not guarantee future results.
        This is educational content, not financial advice.
      </div>
    </div>
  );
}
