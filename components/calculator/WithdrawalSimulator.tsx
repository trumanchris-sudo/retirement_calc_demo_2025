"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Wallet,
  Layers,
  Calculator,
  Play,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  Brain,
} from "lucide-react";
import {
  LIFE_EXP,
  SP500_YOY_NOMINAL,
  mulberry32,
} from "@/lib/calculations/shared";

// ============================================
// Types
// ============================================

export interface WithdrawalSimulatorProps {
  initialPortfolio: number;
  retirementAge: number;
  currentAge: number;
  inflationRate?: number;
  expectedReturn?: number;
}

type WithdrawalStrategy =
  | "fixed4"
  | "variablePercentage"
  | "guardrails"
  | "bucket"
  | "dynamic";

interface StrategyInfo {
  id: WithdrawalStrategy;
  name: string;
  shortName: string;
  description: string;
  icon: React.ReactNode;
  pros: string[];
  cons: string[];
  psychologyFit: string;
  riskTolerance: "low" | "medium" | "high";
}

interface SimulationYear {
  year: number;
  age: number;
  portfolioValue: number;
  withdrawal: number;
  marketReturn: number;
}

interface StrategyResult {
  strategy: WithdrawalStrategy;
  successRate: number;
  medianEndingWealth: number;
  averageIncome: number;
  incomeVolatility: number; // Standard deviation of annual income
  worstCaseIncome: number; // 5th percentile income
  bestCaseIncome: number; // 95th percentile income
  averageYearsLasted: number;
  percentileEndingWealth: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  samplePath: SimulationYear[];
}

interface BucketState {
  cash: number;
  bonds: number;
  stocks: number;
}

// ============================================
// Strategy Definitions
// ============================================

const STRATEGIES: StrategyInfo[] = [
  {
    id: "fixed4",
    name: "Fixed 4% Rule",
    shortName: "4% Rule",
    description:
      "Classic approach: Withdraw 4% of initial balance in year 1, then adjust for inflation each year.",
    icon: <Calculator className="h-5 w-5" />,
    pros: [
      "Simple and predictable",
      "Well-researched historical success",
      "Easy to budget around",
    ],
    cons: [
      "Ignores market conditions",
      "May leave money on table",
      "Risk of depletion in poor sequences",
    ],
    psychologyFit:
      "Best for those who value predictability and simplicity. You want to know exactly what you can spend each month.",
    riskTolerance: "medium",
  },
  {
    id: "variablePercentage",
    name: "Variable Percentage",
    shortName: "Variable %",
    description:
      "Withdraw a fixed percentage (e.g., 4%) of current portfolio value each year.",
    icon: <TrendingUp className="h-5 w-5" />,
    pros: [
      "Never depletes portfolio",
      "Automatically adjusts to market",
      "Leaves larger legacy in good markets",
    ],
    cons: [
      "Income varies significantly",
      "Hard to budget",
      "May have to cut spending dramatically",
    ],
    psychologyFit:
      "Best for flexible spenders who can adjust lifestyle up or down with market conditions.",
    riskTolerance: "high",
  },
  {
    id: "guardrails",
    name: "Guardrails Strategy",
    shortName: "Guardrails",
    description:
      "Start with 4% rule, increase spending 10% after good years, decrease 10% after bad years, within limits.",
    icon: <Shield className="h-5 w-5" />,
    pros: [
      "Balances stability and flexibility",
      "Responds to market without wild swings",
      "Protects against sequence risk",
    ],
    cons: [
      "More complex to implement",
      "Requires tracking portfolio peaks",
      "Still some income variability",
    ],
    psychologyFit:
      "Best for those who want some stability but can handle moderate adjustments. The middle ground.",
    riskTolerance: "medium",
  },
  {
    id: "bucket",
    name: "Bucket Strategy",
    shortName: "Buckets",
    description:
      "Divide portfolio into cash (2-3 yrs), bonds (5-7 yrs), and stocks. Refill from stocks in up markets.",
    icon: <Layers className="h-5 w-5" />,
    pros: [
      "Psychological peace of mind",
      "Clear short-term security",
      "Avoid selling stocks in down markets",
    ],
    cons: [
      "Cash drag reduces long-term returns",
      "Complex rebalancing rules",
      "May not outperform simpler strategies",
    ],
    psychologyFit:
      "Best for those who need to see their near-term spending secure. Visual/tangible approach.",
    riskTolerance: "low",
  },
  {
    id: "dynamic",
    name: "Dynamic Spending",
    shortName: "Dynamic",
    description:
      "Base withdrawal on portfolio value and remaining life expectancy. More sophisticated actuarial approach.",
    icon: <Brain className="h-5 w-5" />,
    pros: [
      "Mathematically optimal",
      "Adapts to longevity",
      "Higher safe spending early",
    ],
    cons: [
      "Complex to calculate",
      "Requires mortality assumptions",
      "Income varies over time",
    ],
    psychologyFit:
      "Best for analytical types who trust math and can handle variable income for optimal results.",
    riskTolerance: "high",
  },
];

// ============================================
// Simulation Logic
// ============================================

const NUM_SIMULATIONS = 1000;
const BOND_RETURN = 4.5; // Average bond return %
const CASH_RETURN = 2.5; // Cash/money market return %

/**
 * Generate a sequence of market returns using bootstrap sampling
 */
function generateReturns(years: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const returns: number[] = [];

  for (let i = 0; i < years; i++) {
    // Bootstrap sample from historical returns
    const idx = Math.floor(rng() * SP500_YOY_NOMINAL.length);
    returns.push(SP500_YOY_NOMINAL[idx] / 100); // Convert to decimal
  }

  return returns;
}

/**
 * Fixed 4% Rule: 4% of initial balance, inflation-adjusted
 */
function simulateFixed4(
  initialPortfolio: number,
  years: number,
  inflationRate: number,
  returns: number[]
): SimulationYear[] {
  const results: SimulationYear[] = [];
  let portfolio = initialPortfolio;
  let withdrawal = initialPortfolio * 0.04;

  for (let y = 0; y < years; y++) {
    const marketReturn = returns[y] || 0.07;

    // Withdraw at start of year
    const actualWithdrawal = Math.min(withdrawal, portfolio);
    portfolio -= actualWithdrawal;

    // Apply market return
    portfolio *= (1 + marketReturn);

    results.push({
      year: y + 1,
      age: 0, // Will be filled in by caller
      portfolioValue: Math.max(0, portfolio),
      withdrawal: actualWithdrawal,
      marketReturn: marketReturn * 100,
    });

    // Adjust withdrawal for inflation
    withdrawal *= (1 + inflationRate);
  }

  return results;
}

/**
 * Variable Percentage: Fixed % of current portfolio each year
 */
function simulateVariablePercentage(
  initialPortfolio: number,
  years: number,
  _inflationRate: number,
  returns: number[],
  withdrawalRate: number = 0.04
): SimulationYear[] {
  const results: SimulationYear[] = [];
  let portfolio = initialPortfolio;

  for (let y = 0; y < years; y++) {
    const marketReturn = returns[y] || 0.07;

    // Withdraw percentage of current portfolio
    const withdrawal = portfolio * withdrawalRate;
    portfolio -= withdrawal;

    // Apply market return
    portfolio *= (1 + marketReturn);

    results.push({
      year: y + 1,
      age: 0,
      portfolioValue: Math.max(0, portfolio),
      withdrawal,
      marketReturn: marketReturn * 100,
    });
  }

  return results;
}

/**
 * Guardrails: Adjust spending up/down based on portfolio performance
 */
function simulateGuardrails(
  initialPortfolio: number,
  years: number,
  inflationRate: number,
  returns: number[],
  ceilingPct: number = 0.10,
  floorPct: number = 0.10
): SimulationYear[] {
  const results: SimulationYear[] = [];
  let portfolio = initialPortfolio;
  let withdrawal = initialPortfolio * 0.04;
  let portfolioPeak = initialPortfolio;
  const minWithdrawal = initialPortfolio * 0.03; // Floor
  const maxWithdrawal = initialPortfolio * 0.06; // Ceiling

  for (let y = 0; y < years; y++) {
    const marketReturn = returns[y] || 0.07;

    // Check guardrails
    const currentWithdrawalRate = withdrawal / portfolio;

    // If withdrawal rate > 5%, reduce spending (portfolio down)
    if (currentWithdrawalRate > 0.05 && portfolio < portfolioPeak * 0.8) {
      withdrawal = Math.max(minWithdrawal, withdrawal * (1 - floorPct));
    }
    // If withdrawal rate < 3%, increase spending (portfolio up)
    else if (currentWithdrawalRate < 0.03 && portfolio > portfolioPeak * 1.2) {
      withdrawal = Math.min(maxWithdrawal, withdrawal * (1 + ceilingPct));
    }

    const actualWithdrawal = Math.min(withdrawal, portfolio);
    portfolio -= actualWithdrawal;

    // Apply market return
    portfolio *= (1 + marketReturn);

    // Update peak
    portfolioPeak = Math.max(portfolioPeak, portfolio);

    results.push({
      year: y + 1,
      age: 0,
      portfolioValue: Math.max(0, portfolio),
      withdrawal: actualWithdrawal,
      marketReturn: marketReturn * 100,
    });

    // Adjust withdrawal for inflation (but guardrails may override)
    withdrawal *= (1 + inflationRate);
  }

  return results;
}

/**
 * Bucket Strategy: Cash -> Bonds -> Stocks buckets
 */
function simulateBucket(
  initialPortfolio: number,
  years: number,
  inflationRate: number,
  returns: number[]
): SimulationYear[] {
  const results: SimulationYear[] = [];
  const annualSpending = initialPortfolio * 0.04;

  // Initial bucket allocation
  const buckets: BucketState = {
    cash: annualSpending * 2.5, // 2.5 years cash
    bonds: annualSpending * 6, // 6 years bonds
    stocks: initialPortfolio - (annualSpending * 8.5), // Rest in stocks
  };

  let withdrawal = annualSpending;

  for (let y = 0; y < years; y++) {
    const stockReturn = returns[y] || 0.07;
    const bondReturn = BOND_RETURN / 100;
    const cashReturn = CASH_RETURN / 100;

    // Withdraw from cash bucket first
    const totalPortfolio = buckets.cash + buckets.bonds + buckets.stocks;
    const actualWithdrawal = Math.min(withdrawal, totalPortfolio);

    if (buckets.cash >= actualWithdrawal) {
      buckets.cash -= actualWithdrawal;
    } else {
      let remaining = actualWithdrawal - buckets.cash;
      buckets.cash = 0;
      if (buckets.bonds >= remaining) {
        buckets.bonds -= remaining;
      } else {
        remaining -= buckets.bonds;
        buckets.bonds = 0;
        buckets.stocks = Math.max(0, buckets.stocks - remaining);
      }
    }

    // Apply returns to each bucket
    buckets.cash *= (1 + cashReturn);
    buckets.bonds *= (1 + bondReturn);
    buckets.stocks *= (1 + stockReturn);

    // Refill buckets from stocks if stocks are up
    if (stockReturn > 0.05 && buckets.stocks > 0) {
      const targetCash = withdrawal * 2.5;
      const targetBonds = withdrawal * 6;

      // Refill cash
      if (buckets.cash < targetCash) {
        const refillAmount = Math.min(targetCash - buckets.cash, buckets.stocks * 0.1);
        buckets.cash += refillAmount;
        buckets.stocks -= refillAmount;
      }

      // Refill bonds
      if (buckets.bonds < targetBonds && buckets.stocks > 0) {
        const refillAmount = Math.min(targetBonds - buckets.bonds, buckets.stocks * 0.1);
        buckets.bonds += refillAmount;
        buckets.stocks -= refillAmount;
      }
    }

    results.push({
      year: y + 1,
      age: 0,
      portfolioValue: Math.max(0, buckets.cash + buckets.bonds + buckets.stocks),
      withdrawal: actualWithdrawal,
      marketReturn: stockReturn * 100,
    });

    // Adjust withdrawal for inflation
    withdrawal *= (1 + inflationRate);
  }

  return results;
}

/**
 * Dynamic Spending: Based on portfolio value and remaining life expectancy
 */
function simulateDynamic(
  initialPortfolio: number,
  years: number,
  _inflationRate: number,
  returns: number[],
  startingAge: number
): SimulationYear[] {
  const results: SimulationYear[] = [];
  let portfolio = initialPortfolio;

  for (let y = 0; y < years; y++) {
    const currentAge = startingAge + y;
    const remainingYears = Math.max(1, LIFE_EXP - currentAge);
    const marketReturn = returns[y] || 0.07;

    // Dynamic withdrawal rate based on remaining years
    // Higher rate as you age (actuarial approach)
    const dynamicRate = 1 / (remainingYears + 2); // +2 for margin of safety

    // Blend with portfolio value
    const withdrawal = portfolio * Math.min(0.08, Math.max(0.03, dynamicRate));

    portfolio -= withdrawal;
    portfolio *= (1 + marketReturn);

    results.push({
      year: y + 1,
      age: currentAge + 1,
      portfolioValue: Math.max(0, portfolio),
      withdrawal,
      marketReturn: marketReturn * 100,
    });
  }

  return results;
}

/**
 * Run full Monte Carlo simulation for a strategy
 */
function runStrategySimulation(
  strategy: WithdrawalStrategy,
  initialPortfolio: number,
  years: number,
  inflationRate: number,
  startingAge: number
): StrategyResult {
  const allRuns: SimulationYear[][] = [];
  const endingWealths: number[] = [];
  const allWithdrawals: number[][] = [];
  let successCount = 0;
  let totalYearsLasted = 0;

  for (let sim = 0; sim < NUM_SIMULATIONS; sim++) {
    const returns = generateReturns(years, sim * 12345 + Date.now() % 10000);

    let simResults: SimulationYear[];

    switch (strategy) {
      case "fixed4":
        simResults = simulateFixed4(initialPortfolio, years, inflationRate, returns);
        break;
      case "variablePercentage":
        simResults = simulateVariablePercentage(initialPortfolio, years, inflationRate, returns);
        break;
      case "guardrails":
        simResults = simulateGuardrails(initialPortfolio, years, inflationRate, returns);
        break;
      case "bucket":
        simResults = simulateBucket(initialPortfolio, years, inflationRate, returns);
        break;
      case "dynamic":
        simResults = simulateDynamic(initialPortfolio, years, inflationRate, returns, startingAge);
        break;
      default:
        simResults = simulateFixed4(initialPortfolio, years, inflationRate, returns);
    }

    // Fill in ages
    simResults.forEach((r, i) => {
      r.age = startingAge + i + 1;
    });

    allRuns.push(simResults);

    // Track ending wealth
    const endingWealth = simResults[simResults.length - 1]?.portfolioValue || 0;
    endingWealths.push(endingWealth);

    // Track withdrawals
    allWithdrawals.push(simResults.map(r => r.withdrawal));

    // Check success (portfolio lasted full duration)
    const lastNonZeroYear = simResults.findIndex(r => r.portfolioValue <= 0);
    if (lastNonZeroYear === -1) {
      successCount++;
      totalYearsLasted += years;
    } else {
      totalYearsLasted += lastNonZeroYear;
    }
  }

  // Calculate statistics
  endingWealths.sort((a, b) => a - b);

  const flatWithdrawals = allWithdrawals.flat();
  const avgIncome = flatWithdrawals.reduce((a, b) => a + b, 0) / flatWithdrawals.length;

  // Income volatility (standard deviation)
  const incomeVariance = flatWithdrawals.reduce((sum, w) => sum + Math.pow(w - avgIncome, 2), 0) / flatWithdrawals.length;
  const incomeVolatility = Math.sqrt(incomeVariance);

  // Percentile incomes
  const sortedWithdrawals = [...flatWithdrawals].sort((a, b) => a - b);
  const worstCaseIncome = sortedWithdrawals[Math.floor(sortedWithdrawals.length * 0.05)];
  const bestCaseIncome = sortedWithdrawals[Math.floor(sortedWithdrawals.length * 0.95)];

  // Percentile ending wealth
  const p10 = endingWealths[Math.floor(NUM_SIMULATIONS * 0.10)];
  const p25 = endingWealths[Math.floor(NUM_SIMULATIONS * 0.25)];
  const p50 = endingWealths[Math.floor(NUM_SIMULATIONS * 0.50)];
  const p75 = endingWealths[Math.floor(NUM_SIMULATIONS * 0.75)];
  const p90 = endingWealths[Math.floor(NUM_SIMULATIONS * 0.90)];

  // Pick median run as sample path
  const medianRunIdx = Math.floor(NUM_SIMULATIONS / 2);
  const sortedRuns = [...allRuns].sort((a, b) => {
    const aEnd = a[a.length - 1]?.portfolioValue || 0;
    const bEnd = b[b.length - 1]?.portfolioValue || 0;
    return aEnd - bEnd;
  });

  return {
    strategy,
    successRate: (successCount / NUM_SIMULATIONS) * 100,
    medianEndingWealth: p50,
    averageIncome: avgIncome,
    incomeVolatility,
    worstCaseIncome,
    bestCaseIncome,
    averageYearsLasted: totalYearsLasted / NUM_SIMULATIONS,
    percentileEndingWealth: { p10, p25, p50, p75, p90 },
    samplePath: sortedRuns[medianRunIdx],
  };
}

// ============================================
// Component
// ============================================

export function WithdrawalSimulator({
  initialPortfolio,
  retirementAge,
  currentAge,
  inflationRate = 2.5,
  expectedReturn = 7,
}: WithdrawalSimulatorProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<StrategyResult[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<WithdrawalStrategy | null>(null);
  const [portfolioAmount, setPortfolioAmount] = useState(initialPortfolio);
  const [activeTab, setActiveTab] = useState("overview");

  const yearsInRetirement = LIFE_EXP - retirementAge;

  const runSimulation = useCallback(async () => {
    setIsSimulating(true);
    setProgress(0);
    setResults([]);

    const allResults: StrategyResult[] = [];

    for (let i = 0; i < STRATEGIES.length; i++) {
      const strategy = STRATEGIES[i];

      // Simulate async to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = runStrategySimulation(
        strategy.id,
        portfolioAmount,
        yearsInRetirement,
        inflationRate / 100,
        retirementAge
      );

      allResults.push(result);
      setProgress(((i + 1) / STRATEGIES.length) * 100);
    }

    setResults(allResults);
    setIsSimulating(false);
  }, [portfolioAmount, yearsInRetirement, inflationRate, retirementAge]);

  const getResultForStrategy = useCallback(
    (strategyId: WithdrawalStrategy): StrategyResult | undefined => {
      return results.find(r => r.strategy === strategyId);
    },
    [results]
  );

  const bestStrategy = useMemo(() => {
    if (results.length === 0) return null;

    // Score strategies based on success rate, income stability, and ending wealth
    const scored = results.map(r => {
      const successScore = r.successRate;
      const stabilityScore = 100 - (r.incomeVolatility / r.averageIncome) * 100;
      const wealthScore = Math.min(100, (r.medianEndingWealth / portfolioAmount) * 50);

      return {
        strategy: r.strategy,
        score: successScore * 0.5 + stabilityScore * 0.3 + wealthScore * 0.2,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.strategy;
  }, [results, portfolioAmount]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-600 bg-green-50 border-green-200";
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200";
      case "high": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 85) return "text-emerald-600";
    if (rate >= 75) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-blue-600" />
          Withdrawal Strategy Simulator
        </CardTitle>
        <CardDescription>
          Compare different withdrawal strategies through Monte Carlo simulation.
          Each strategy is tested against {NUM_SIMULATIONS.toLocaleString()} market scenarios.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Portfolio Input */}
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="font-medium">Portfolio at Retirement</span>
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(portfolioAmount)}
            </span>
          </div>
          <Slider
            value={[portfolioAmount]}
            onValueChange={([val]) => setPortfolioAmount(val)}
            min={100000}
            max={10000000}
            step={50000}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$100K</span>
            <span>$10M</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Retirement Age:</span>
              <span className="ml-2 font-medium">{retirementAge}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Years in Retirement:</span>
              <span className="ml-2 font-medium">{yearsInRetirement}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Inflation:</span>
              <span className="ml-2 font-medium">{inflationRate}%</span>
            </div>
          </div>
        </div>

        {/* Run Simulation Button */}
        <Button
          onClick={runSimulation}
          disabled={isSimulating}
          className="w-full"
          size="lg"
        >
          {isSimulating ? (
            <>
              <div className="animate-spin mr-2">
                <Calculator className="h-5 w-5" />
              </div>
              Running {NUM_SIMULATIONS.toLocaleString()} Simulations...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Run Monte Carlo Comparison
            </>
          )}
        </Button>

        {/* Progress Bar */}
        {isSimulating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              Testing {STRATEGIES.find((_, i) => i === Math.floor((progress / 100) * STRATEGIES.length))?.name || "strategies"}...
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
              <TabsTrigger value="psychology">Psychology Fit</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {STRATEGIES.map((strategy) => {
                  const result = getResultForStrategy(strategy.id);
                  const isBest = bestStrategy === strategy.id;

                  return (
                    <Card
                      key={strategy.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedStrategy === strategy.id
                          ? "ring-2 ring-blue-500"
                          : ""
                      } ${isBest ? "border-green-400 bg-green-50/50 dark:bg-green-950/20" : ""}`}
                      onClick={() => setSelectedStrategy(strategy.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {strategy.icon}
                            <CardTitle className="text-base">{strategy.shortName}</CardTitle>
                          </div>
                          {isBest && (
                            <Badge variant="default" className="bg-green-600">
                              Recommended
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Success Rate</span>
                              <span className={`text-lg font-bold ${getSuccessRateColor(result.successRate)}`}>
                                {result.successRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Avg Income</span>
                              <span className="font-medium">
                                {formatCurrency(result.averageIncome)}/yr
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Income Volatility</span>
                              <span className="text-sm">
                                {((result.incomeVolatility / result.averageIncome) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={getRiskColor(strategy.riskTolerance)}
                            >
                              {strategy.riskTolerance.charAt(0).toUpperCase() + strategy.riskTolerance.slice(1)} Risk
                            </Badge>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Run simulation to see results
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Best Strategy Recommendation */}
              {bestStrategy && (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 dark:text-green-100">
                        Recommended: {STRATEGIES.find(s => s.id === bestStrategy)?.name}
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        Based on balancing success rate, income stability, and ending wealth,
                        this strategy offers the best overall outcome for your situation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison" className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Strategy</th>
                      <th className="text-right p-3">Success Rate</th>
                      <th className="text-right p-3">Avg Income</th>
                      <th className="text-right p-3">Worst Case</th>
                      <th className="text-right p-3">Best Case</th>
                      <th className="text-right p-3">Ending Wealth (Median)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STRATEGIES.map((strategy) => {
                      const result = getResultForStrategy(strategy.id);
                      if (!result) return null;

                      return (
                        <tr
                          key={strategy.id}
                          className={`border-b hover:bg-slate-50 dark:hover:bg-slate-900 ${
                            bestStrategy === strategy.id ? "bg-green-50 dark:bg-green-950/20" : ""
                          }`}
                        >
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-2">
                              {strategy.icon}
                              {strategy.shortName}
                              {bestStrategy === strategy.id && (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </td>
                          <td className={`text-right p-3 font-bold ${getSuccessRateColor(result.successRate)}`}>
                            {result.successRate.toFixed(1)}%
                          </td>
                          <td className="text-right p-3">{formatCurrency(result.averageIncome)}</td>
                          <td className="text-right p-3 text-red-600">{formatCurrency(result.worstCaseIncome)}</td>
                          <td className="text-right p-3 text-green-600">{formatCurrency(result.bestCaseIncome)}</td>
                          <td className="text-right p-3">{formatCurrency(result.medianEndingWealth)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Visual Comparison Bars */}
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">Success Rate Comparison</h4>
                {STRATEGIES.map((strategy) => {
                  const result = getResultForStrategy(strategy.id);
                  if (!result) return null;

                  return (
                    <div key={strategy.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{strategy.shortName}</span>
                        <span className="font-medium">{result.successRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            result.successRate >= 95
                              ? "bg-green-500"
                              : result.successRate >= 85
                              ? "bg-emerald-500"
                              : result.successRate >= 75
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${result.successRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Psychology Fit Tab */}
            <TabsContent value="psychology" className="mt-4 space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      Which Strategy Fits Your Psychology?
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      The best strategy is one you can stick with. Consider your personality
                      and how you handle uncertainty when choosing.
                    </p>
                  </div>
                </div>
              </div>

              {STRATEGIES.map((strategy) => {
                const result = getResultForStrategy(strategy.id);

                return (
                  <Card key={strategy.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {strategy.icon}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <h4 className="font-semibold">{strategy.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {strategy.description}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Best for: </span>
                            {strategy.psychologyFit}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" /> Pros
                            </h5>
                            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                              {strategy.pros.map((pro, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
                              <TrendingDown className="h-4 w-4" /> Cons
                            </h5>
                            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                              {strategy.cons.map((con, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <XCircle className="h-3 w-3 text-red-500 mt-1 flex-shrink-0" />
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {result && (
                          <div className="flex items-center gap-4 pt-2 border-t">
                            <Badge variant="outline" className={getRiskColor(strategy.riskTolerance)}>
                              {strategy.riskTolerance.charAt(0).toUpperCase() + strategy.riskTolerance.slice(1)} Risk Tolerance Needed
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Income varies by{" "}
                              <span className="font-medium">
                                {((result.incomeVolatility / result.averageIncome) * 100).toFixed(0)}%
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-4 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5" />
                <h4 className="font-semibold">Detailed Strategy Metrics</h4>
              </div>

              {STRATEGIES.map((strategy) => {
                const result = getResultForStrategy(strategy.id);
                if (!result) return null;

                return (
                  <Card key={strategy.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {strategy.icon}
                        {strategy.name}
                        {bestStrategy === strategy.id && (
                          <Badge variant="default" className="bg-green-600 ml-2">
                            Recommended
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <div className="text-sm text-muted-foreground">Success Rate</div>
                          <div className={`text-xl font-bold ${getSuccessRateColor(result.successRate)}`}>
                            {result.successRate.toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <div className="text-sm text-muted-foreground">Average Annual Income</div>
                          <div className="text-xl font-bold">{formatCurrency(result.averageIncome)}</div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <div className="text-sm text-muted-foreground">Income Volatility</div>
                          <div className="text-xl font-bold">
                            {((result.incomeVolatility / result.averageIncome) * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <div className="text-sm text-muted-foreground">Median Ending Wealth</div>
                          <div className="text-xl font-bold">{formatCurrency(result.medianEndingWealth)}</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Ending Wealth Distribution</div>
                        <div className="grid grid-cols-5 gap-2 text-center text-sm">
                          <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded">
                            <div className="text-xs text-muted-foreground">10th %ile</div>
                            <div className="font-medium">{formatCurrency(result.percentileEndingWealth.p10)}</div>
                          </div>
                          <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
                            <div className="text-xs text-muted-foreground">25th %ile</div>
                            <div className="font-medium">{formatCurrency(result.percentileEndingWealth.p25)}</div>
                          </div>
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                            <div className="text-xs text-muted-foreground">Median</div>
                            <div className="font-medium">{formatCurrency(result.percentileEndingWealth.p50)}</div>
                          </div>
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                            <div className="text-xs text-muted-foreground">75th %ile</div>
                            <div className="font-medium">{formatCurrency(result.percentileEndingWealth.p75)}</div>
                          </div>
                          <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
                            <div className="text-xs text-muted-foreground">90th %ile</div>
                            <div className="font-medium">{formatCurrency(result.percentileEndingWealth.p90)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Income Range</div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm">
                              Worst case: <span className="font-medium">{formatCurrency(result.worstCaseIncome)}/yr</span>
                            </span>
                          </div>
                          <div className="flex-1 h-2 bg-gradient-to-r from-red-200 via-amber-200 to-green-200 rounded-full" />
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm">
                              Best case: <span className="font-medium">{formatCurrency(result.bestCaseIncome)}/yr</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}

        {/* Educational Note */}
        {results.length === 0 && !isSimulating && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Understanding Withdrawal Strategies</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Different withdrawal strategies have different trade-offs between income stability,
                  success rate, and ending wealth. The classic 4% rule is simple but may not be optimal
                  for everyone. Run the simulation to see how each strategy performs under thousands
                  of different market scenarios.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STRATEGIES.map((s) => (
                    <Badge key={s.id} variant="outline" className="cursor-pointer hover:bg-slate-100">
                      {s.icon}
                      <span className="ml-1">{s.shortName}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WithdrawalSimulator;
