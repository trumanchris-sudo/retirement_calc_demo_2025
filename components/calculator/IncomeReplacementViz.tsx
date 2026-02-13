"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DollarSign,
  TrendingUp,
  Shield,
  Briefcase,
  Home,
  Heart,
  Plane,
  Users,
  Check,
  X,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/utils";
import type { FilingStatus } from "@/types/calculator";
import {
  calcSocialSecurity,
  calcCombinedSocialSecurity,
  calcRMD,
} from "@/lib/calculations/retirementEngine";
import { LIFE_EXP, RMD_START_AGE } from "@/lib/calculations/shared/constants";

// ============================================================================
// Types
// ============================================================================

interface IncomeReplacementVizProps {
  // Portfolio & Withdrawal
  portfolioAtRetirement: number; // Total portfolio value at retirement
  withdrawalRate: number; // Annual withdrawal rate (e.g., 4 for 4%)
  inflationRate: number; // Annual inflation rate (e.g., 2.6 for 2.6%)

  // Personal Info
  currentAge: number;
  retirementAge: number;
  maritalStatus: FilingStatus;
  spouseAge?: number;

  // Current Income (for replacement ratio)
  currentAnnualIncome: number; // Combined household income
  monthlyContributions?: number; // Current 401k/retirement contributions

  // Social Security
  includeSocialSecurity: boolean;
  ssAverageEarnings: number; // Average indexed earnings for SS calculation
  ssClaimAge: number;
  ssAverageEarnings2?: number; // Spouse's earnings
  ssClaimAge2?: number;

  // Pension (optional)
  monthlyPension?: number;

  // Account breakdown (for RMD calculations)
  pretaxBalance?: number;

  // State tax rate
  stateRate?: number;

  // Loading state
  isCalculating?: boolean;
}

interface IncomeSource {
  name: string;
  monthlyAmount: number;
  isGuaranteed: boolean;
  color: string;
  startAge?: number;
}

interface IncomeOverTimePoint {
  age: number;
  year: number;
  totalIncome: number;
  socialSecurity: number;
  portfolioWithdrawal: number;
  pension: number;
  purchasingPower: number;
  rmdImpact: number;
}

interface LifestyleBenchmark {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  monthlyCost: number;
  covered: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate monthly income from various sources
 */
function calculateIncomeSources(
  portfolioAtRetirement: number,
  withdrawalRate: number,
  includeSocialSecurity: boolean,
  ssAverageEarnings: number,
  ssClaimAge: number,
  maritalStatus: FilingStatus,
  ssAverageEarnings2?: number,
  ssClaimAge2?: number,
  monthlyPension?: number
): IncomeSource[] {
  const sources: IncomeSource[] = [];

  // Portfolio withdrawals (variable income)
  const annualWithdrawal = portfolioAtRetirement * (withdrawalRate / 100);
  const monthlyWithdrawal = annualWithdrawal / 12;

  sources.push({
    name: "Portfolio Withdrawals",
    monthlyAmount: monthlyWithdrawal,
    isGuaranteed: false,
    color: "#3b82f6", // blue-500
  });

  // Social Security (guaranteed income)
  if (includeSocialSecurity && ssAverageEarnings > 0) {
    let annualSS: number;

    if (maritalStatus === "married" && ssAverageEarnings2 !== undefined) {
      annualSS = calcCombinedSocialSecurity(
        ssAverageEarnings,
        ssAverageEarnings2,
        ssClaimAge,
        ssClaimAge2 || ssClaimAge,
        67
      );
    } else {
      annualSS = calcSocialSecurity(ssAverageEarnings, ssClaimAge, 67);
    }

    sources.push({
      name: "Social Security",
      monthlyAmount: annualSS / 12,
      isGuaranteed: true,
      color: "#22c55e", // green-500
      startAge: ssClaimAge,
    });
  }

  // Pension (guaranteed income)
  if (monthlyPension && monthlyPension > 0) {
    sources.push({
      name: "Pension",
      monthlyAmount: monthlyPension,
      isGuaranteed: true,
      color: "#a855f7", // purple-500
    });
  }

  return sources;
}

/**
 * Calculate income over time from retirement to life expectancy
 */
function calculateIncomeOverTime(
  portfolioAtRetirement: number,
  withdrawalRate: number,
  inflationRate: number,
  retirementAge: number,
  includeSocialSecurity: boolean,
  ssAverageEarnings: number,
  ssClaimAge: number,
  maritalStatus: FilingStatus,
  ssAverageEarnings2?: number,
  ssClaimAge2?: number,
  monthlyPension?: number,
  pretaxBalance?: number
): IncomeOverTimePoint[] {
  const points: IncomeOverTimePoint[] = [];
  const yearsInRetirement = LIFE_EXP - retirementAge;
  const inflationFactor = 1 + inflationRate / 100;

  let currentPortfolio = portfolioAtRetirement;
  const baseWithdrawal = portfolioAtRetirement * (withdrawalRate / 100);

  for (let year = 0; year <= yearsInRetirement; year++) {
    const age = retirementAge + year;
    const currentYear = new Date().getFullYear() + (age - retirementAge);

    // Inflation-adjusted withdrawal need
    const inflationAdjustedWithdrawal =
      baseWithdrawal * Math.pow(inflationFactor, year);

    // Social Security (starts at claim age)
    let annualSS = 0;
    if (includeSocialSecurity && age >= ssClaimAge) {
      if (maritalStatus === "married" && ssAverageEarnings2 !== undefined) {
        const spouse2Claiming =
          ssClaimAge2 !== undefined && age >= ssClaimAge2;
        if (spouse2Claiming) {
          annualSS = calcCombinedSocialSecurity(
            ssAverageEarnings,
            ssAverageEarnings2,
            ssClaimAge,
            ssClaimAge2!,
            67
          );
        } else {
          annualSS = calcSocialSecurity(ssAverageEarnings, ssClaimAge, 67);
        }
      } else {
        annualSS = calcSocialSecurity(ssAverageEarnings, ssClaimAge, 67);
      }
      // Adjust SS for inflation (COLA)
      annualSS *= Math.pow(inflationFactor, Math.max(0, year - (ssClaimAge - retirementAge)));
    }

    // Annual pension (also COLA adjusted in many cases)
    const annualPension = (monthlyPension || 0) * 12 * Math.pow(1.02, year); // Assume 2% COLA

    // RMD impact (forced higher withdrawals at 73+)
    let rmdImpact = 0;
    if (age >= RMD_START_AGE && pretaxBalance) {
      const estimatedPretax = pretaxBalance * Math.pow(1.05, year); // Rough estimate
      const rmd = calcRMD(estimatedPretax, age);
      const normalWithdrawal = inflationAdjustedWithdrawal - annualSS - annualPension;
      if (rmd > normalWithdrawal) {
        rmdImpact = rmd - normalWithdrawal;
      }
    }

    // Portfolio withdrawal (what's needed after SS and pension)
    const portfolioWithdrawal = Math.max(
      0,
      inflationAdjustedWithdrawal - annualSS - annualPension
    ) + rmdImpact;

    // Update portfolio (simplified growth model)
    currentPortfolio =
      currentPortfolio * 1.05 - portfolioWithdrawal; // Assume 5% return
    if (currentPortfolio < 0) currentPortfolio = 0;

    // Purchasing power (real dollars)
    const totalIncome =
      portfolioWithdrawal + annualSS + annualPension;
    const purchasingPower = totalIncome / Math.pow(inflationFactor, year);

    points.push({
      age,
      year: currentYear,
      totalIncome: totalIncome / 12, // Monthly
      socialSecurity: annualSS / 12, // Monthly
      portfolioWithdrawal: portfolioWithdrawal / 12, // Monthly
      pension: annualPension / 12, // Monthly
      purchasingPower: purchasingPower / 12, // Monthly purchasing power
      rmdImpact: rmdImpact / 12, // Monthly
    });
  }

  return points;
}

/**
 * Get lifestyle benchmarks and whether they're covered
 */
function getLifestyleBenchmarks(monthlyIncome: number): LifestyleBenchmark[] {
  // Typical retiree expenses (national averages, adjusted for age)
  return [
    {
      category: "Housing",
      icon: Home,
      monthlyCost: 1800, // Mortgage/rent/taxes/insurance
      covered: monthlyIncome >= 1800,
    },
    {
      category: "Healthcare",
      icon: Heart,
      monthlyCost: 800, // Medicare + supplemental + out-of-pocket
      covered: monthlyIncome >= 2600,
    },
    {
      category: "Travel",
      icon: Plane,
      monthlyCost: 500, // Moderate travel budget
      covered: monthlyIncome >= 3100,
    },
    {
      category: "Helping Family",
      icon: Users,
      monthlyCost: 400, // Gifts, support for kids/grandkids
      covered: monthlyIncome >= 3500,
    },
  ];
}

/**
 * Get color for income replacement ratio
 */
function getReplacementRatioColor(ratio: number): string {
  if (ratio >= 0.9) return "text-green-600 dark:text-green-400";
  if (ratio >= 0.7) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getReplacementRatioBgColor(ratio: number): string {
  if (ratio >= 0.9) return "bg-green-500";
  if (ratio >= 0.7) return "bg-yellow-500";
  return "bg-red-500";
}

function getReplacementRatioMessage(ratio: number): string {
  if (ratio >= 1.0) return "Excellent! You may have more income in retirement.";
  if (ratio >= 0.9) return "Great! You're on track for a comfortable retirement.";
  if (ratio >= 0.8) return "Good! Most retirees need 70-80% - you're well positioned.";
  if (ratio >= 0.7) return "Adequate. This meets typical retirement income needs.";
  return "Consider increasing savings or adjusting retirement expectations.";
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Large monthly income display
 */
function MonthlyIncomeHero({
  totalMonthly,
  sources,
}: {
  totalMonthly: number;
  sources: IncomeSource[];
}) {
  return (
    <div className="text-center space-y-4 py-6">
      <div className="text-muted-foreground text-sm font-medium">
        Your Projected Monthly Retirement Income
      </div>
      <div className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
        {fmt(totalMonthly)}
        <span className="text-2xl md:text-3xl text-muted-foreground font-normal">
          /month
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        {sources.map((source) => (
          <Badge
            key={source.name}
            variant="outline"
            className="flex items-center gap-2 px-3 py-1.5"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: source.color }}
            />
            <span className="font-medium">{source.name}:</span>
            <span>{fmt(source.monthlyAmount)}</span>
            {source.isGuaranteed && (
              <Shield className="w-3 h-3 text-green-500" />
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/**
 * Income replacement ratio gauge
 */
function IncomeReplacementGauge({
  currentMonthlyIncome,
  retirementMonthlyIncome,
  monthlyContributions,
}: {
  currentMonthlyIncome: number;
  retirementMonthlyIncome: number;
  monthlyContributions: number;
}) {
  // Calculate spendable income (current income minus retirement contributions)
  const currentSpendable = currentMonthlyIncome - monthlyContributions;
  const ratio = currentSpendable > 0 ? retirementMonthlyIncome / currentSpendable : 0;
  const percentage = Math.min(ratio * 100, 150); // Cap at 150% for display

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Income Replacement Ratio</div>
        <Badge
          variant="outline"
          className={cn(
            "font-bold",
            getReplacementRatioColor(ratio)
          )}
        >
          {(ratio * 100).toFixed(0)}%
        </Badge>
      </div>

      {/* Gauge */}
      <div className="relative h-8 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        {/* Target zone indicator */}
        <div
          className="absolute h-full bg-yellow-200/50 dark:bg-yellow-900/30"
          style={{ left: "70%", width: "20%" }}
        />
        <div
          className="absolute h-full bg-green-200/50 dark:bg-green-900/30"
          style={{ left: "90%", width: "60%" }}
        />

        {/* Fill bar */}
        <div
          className={cn(
            "h-full transition-all duration-500 flex items-center justify-end pr-3",
            getReplacementRatioBgColor(ratio)
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        >
          {percentage >= 20 && (
            <span className="text-white text-sm font-bold">
              {(ratio * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* Markers */}
        <div className="absolute top-full pt-1 left-[70%] transform -translate-x-1/2 text-xs text-muted-foreground">
          70%
        </div>
        <div className="absolute top-full pt-1 left-[90%] transform -translate-x-1/2 text-xs text-muted-foreground">
          90%
        </div>
      </div>

      <div className={cn("text-sm", getReplacementRatioColor(ratio))}>
        {getReplacementRatioMessage(ratio)}
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground">Current Spendable</div>
          <div className="text-lg font-semibold">{fmt(currentSpendable)}/mo</div>
          <div className="text-xs text-muted-foreground">
            (After {fmt(monthlyContributions)} contributions)
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
          <div className="text-xs text-blue-700 dark:text-blue-400">
            Retirement Income
          </div>
          <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {fmt(retirementMonthlyIncome)}/mo
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-400">
            Projected monthly
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Income over time chart
 */
function IncomeOverTimeChart({
  data,
  ssClaimAge,
}: {
  data: IncomeOverTimePoint[];
  ssClaimAge: number;
}) {
  const chartConfig: ChartConfig = {
    totalIncome: {
      label: "Total Monthly Income",
      color: "#3b82f6",
    },
    purchasingPower: {
      label: "Purchasing Power",
      color: "#f97316",
    },
    socialSecurity: {
      label: "Social Security",
      color: "#22c55e",
    },
    portfolioWithdrawal: {
      label: "Portfolio",
      color: "#8b5cf6",
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Monthly Income Over Time</div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
            Total Income
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 rounded-full bg-orange-500 mr-1.5" />
            Purchasing Power
          </Badge>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[300px]">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="age"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            tickFormatter={(age) => `${age}`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => fmt(v)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span>
                    {name}: {fmt(value as number)}
                  </span>
                )}
              />
            }
          />

          {/* Reference line for SS claiming */}
          <ReferenceLine
            x={ssClaimAge}
            stroke="#22c55e"
            strokeDasharray="5 5"
            label={{
              value: "SS Starts",
              position: "top",
              fill: "#22c55e",
              fontSize: 11,
            }}
          />

          {/* Reference line for RMDs */}
          <ReferenceLine
            x={RMD_START_AGE}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{
              value: "RMDs Begin",
              position: "top",
              fill: "#f59e0b",
              fontSize: 11,
            }}
          />

          <Area
            type="monotone"
            dataKey="totalIncome"
            stroke="#3b82f6"
            fill="url(#incomeGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="purchasingPower"
            stroke="#f97316"
            fill="url(#powerGradient)"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ChartContainer>

      <div className="text-xs text-muted-foreground text-center">
        The dashed line shows purchasing power adjusted for inflation
      </div>
    </div>
  );
}

/**
 * Paycheck comparison visualization
 */
function PaycheckComparison({
  currentMonthlyIncome,
  retirementMonthlyIncome,
  monthlyContributions,
  stateRate,
}: {
  currentMonthlyIncome: number;
  retirementMonthlyIncome: number;
  monthlyContributions: number;
  stateRate: number;
}) {
  // Calculate deductions from current paycheck
  const ficaTax = currentMonthlyIncome * 0.0765; // 7.65% FICA
  const estimatedFedTax = currentMonthlyIncome * 0.15; // Rough estimate
  const estimatedStateTax = currentMonthlyIncome * (stateRate / 100);
  const commuteCost = 300; // Average commute cost

  const currentTakeHome =
    currentMonthlyIncome -
    ficaTax -
    estimatedFedTax -
    estimatedStateTax -
    monthlyContributions -
    commuteCost;

  // Retirement income (less deductions)
  const retirementFedTax = retirementMonthlyIncome * 0.12; // Lower bracket
  const retirementStateTax = retirementMonthlyIncome * (stateRate / 100);
  const retirementTakeHome =
    retirementMonthlyIncome - retirementFedTax - retirementStateTax;

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">
        Your Last Paycheck vs. First Retirement Check
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Current Paycheck */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span className="font-medium">Current Paycheck</span>
          </div>
          <div className="text-2xl font-bold">{fmt(currentMonthlyIncome)}</div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>FICA Tax</span>
              <span>-{fmt(ficaTax)}</span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>Federal Tax</span>
              <span>-{fmt(estimatedFedTax)}</span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>State Tax</span>
              <span>-{fmt(estimatedStateTax)}</span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>401k Contribution</span>
              <span>-{fmt(monthlyContributions)}</span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>Commute Costs</span>
              <span>-{fmt(commuteCost)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Take-Home</span>
              <span className="text-green-600 dark:text-green-400">
                {fmt(currentTakeHome)}
              </span>
            </div>
          </div>
        </div>

        {/* Retirement Check */}
        <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">Retirement Check</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {fmt(retirementMonthlyIncome)}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>No FICA Tax</span>
              <span>+{fmt(ficaTax)}</span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>Federal Tax (lower)</span>
              <span>-{fmt(retirementFedTax)}</span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>State Tax</span>
              <span>-{fmt(retirementStateTax)}</span>
            </div>
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>No 401k Deduction</span>
              <span>+{fmt(monthlyContributions)}</span>
            </div>
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>No Commute</span>
              <span>+{fmt(commuteCost)}</span>
            </div>
            <div className="border-t border-blue-200 dark:border-blue-700 pt-2 flex justify-between font-semibold">
              <span>Spendable</span>
              <span className="text-green-600 dark:text-green-400">
                {fmt(retirementTakeHome)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {retirementTakeHome > currentTakeHome && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-800 dark:text-green-200">
            Your spendable income in retirement could be{" "}
            <strong>{fmt(retirementTakeHome - currentTakeHome)}</strong> more
            per month due to eliminated deductions!
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Lifestyle benchmarks checklist
 */
function LifestyleBenchmarks({
  benchmarks,
  monthlyIncome,
}: {
  benchmarks: LifestyleBenchmark[];
  monthlyIncome: number;
}) {
  const coveredCount = benchmarks.filter((b) => b.covered).length;
  const totalCost = benchmarks.reduce((sum, b) => sum + b.monthlyCost, 0);
  const remainingAfterBenchmarks = monthlyIncome - totalCost;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {fmt(monthlyIncome)}/month affords you:
        </div>
        <Badge
          variant="outline"
          className={cn(
            coveredCount === benchmarks.length
              ? "text-green-600 border-green-300"
              : "text-yellow-600 border-yellow-300"
          )}
        >
          {coveredCount}/{benchmarks.length} covered
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {benchmarks.map((benchmark) => {
          const Icon = benchmark.icon;
          return (
            <div
              key={benchmark.category}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                benchmark.covered
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                  : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-full",
                  benchmark.covered
                    ? "bg-green-100 dark:bg-green-900/50"
                    : "bg-gray-200 dark:bg-gray-800"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    benchmark.covered
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500"
                  )}
                />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{benchmark.category}</div>
                <div className="text-xs text-muted-foreground">
                  ~{fmt(benchmark.monthlyCost)}/mo
                </div>
              </div>
              {benchmark.covered ? (
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <X className="h-5 w-5 text-gray-400" />
              )}
            </div>
          );
        })}
      </div>

      {remainingAfterBenchmarks > 0 && (
        <div className="text-sm text-muted-foreground">
          After covering these essentials, you have approximately{" "}
          <strong className="text-foreground">
            {fmt(remainingAfterBenchmarks)}
          </strong>{" "}
          remaining for other expenses and savings.
        </div>
      )}
    </div>
  );
}

/**
 * Income floor visualization
 */
function IncomeFloorViz({
  guaranteedMonthly,
  variableMonthly,
  sources,
}: {
  guaranteedMonthly: number;
  variableMonthly: number;
  sources: IncomeSource[];
}) {
  const total = guaranteedMonthly + variableMonthly;
  const guaranteedPct = total > 0 ? (guaranteedMonthly / total) * 100 : 0;

  const guaranteedSources = sources.filter((s) => s.isGuaranteed);
  const variableSources = sources.filter((s) => !s.isGuaranteed);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-green-600" />
        <span className="text-sm font-medium">Income Security Analysis</span>
      </div>

      {/* Visual breakdown */}
      <div className="relative h-12 rounded-lg overflow-hidden flex">
        <div
          className="bg-green-500 flex items-center justify-center text-white text-sm font-medium transition-all duration-500"
          style={{ width: `${guaranteedPct}%` }}
        >
          {guaranteedPct >= 15 && "Guaranteed"}
        </div>
        <div
          className="bg-blue-500 flex items-center justify-center text-white text-sm font-medium transition-all duration-500"
          style={{ width: `${100 - guaranteedPct}%` }}
        >
          {100 - guaranteedPct >= 15 && "Variable"}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Guaranteed Income */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-900 dark:text-green-100">
              Guaranteed Income
            </span>
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
            {fmt(guaranteedMonthly)}/mo
          </div>
          <div className="space-y-1">
            {guaranteedSources.map((source) => (
              <div
                key={source.name}
                className="flex justify-between text-sm text-green-800 dark:text-green-200"
              >
                <span>{source.name}</span>
                <span>{fmt(source.monthlyAmount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Variable Income */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Variable Income
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">
            {fmt(variableMonthly)}/mo
          </div>
          <div className="space-y-1">
            {variableSources.map((source) => (
              <div
                key={source.name}
                className="flex justify-between text-sm text-blue-800 dark:text-blue-200"
              >
                <span>{source.name}</span>
                <span>{fmt(source.monthlyAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market crash scenario */}
      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              Market Crash Protection
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Even if markets drop 50%, your guaranteed income of{" "}
              <strong>{fmt(guaranteedMonthly)}/month</strong> remains untouched.
              This covers {((guaranteedMonthly / total) * 100).toFixed(0)}% of
              your projected retirement income, providing a stable foundation
              regardless of market conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const IncomeReplacementViz = React.memo(function IncomeReplacementViz({
  portfolioAtRetirement,
  withdrawalRate,
  inflationRate,
  currentAge,
  retirementAge,
  maritalStatus,
  spouseAge,
  currentAnnualIncome,
  monthlyContributions = 0,
  includeSocialSecurity,
  ssAverageEarnings,
  ssClaimAge,
  ssAverageEarnings2,
  ssClaimAge2,
  monthlyPension = 0,
  pretaxBalance,
  stateRate = 5,
  isCalculating = false,
}: IncomeReplacementVizProps) {
  // Calculate all derived data
  const {
    incomeSources,
    totalMonthlyIncome,
    guaranteedMonthly,
    variableMonthly,
    incomeOverTime,
    lifestyleBenchmarks,
  } = useMemo(() => {
    const sources = calculateIncomeSources(
      portfolioAtRetirement,
      withdrawalRate,
      includeSocialSecurity,
      ssAverageEarnings,
      ssClaimAge,
      maritalStatus,
      ssAverageEarnings2,
      ssClaimAge2,
      monthlyPension
    );

    const total = sources.reduce((sum, s) => sum + s.monthlyAmount, 0);
    const guaranteed = sources
      .filter((s) => s.isGuaranteed)
      .reduce((sum, s) => sum + s.monthlyAmount, 0);
    const variable = sources
      .filter((s) => !s.isGuaranteed)
      .reduce((sum, s) => sum + s.monthlyAmount, 0);

    const overTime = calculateIncomeOverTime(
      portfolioAtRetirement,
      withdrawalRate,
      inflationRate,
      retirementAge,
      includeSocialSecurity,
      ssAverageEarnings,
      ssClaimAge,
      maritalStatus,
      ssAverageEarnings2,
      ssClaimAge2,
      monthlyPension,
      pretaxBalance
    );

    const benchmarks = getLifestyleBenchmarks(total);

    return {
      incomeSources: sources,
      totalMonthlyIncome: total,
      guaranteedMonthly: guaranteed,
      variableMonthly: variable,
      incomeOverTime: overTime,
      lifestyleBenchmarks: benchmarks,
    };
  }, [
    portfolioAtRetirement,
    withdrawalRate,
    inflationRate,
    retirementAge,
    includeSocialSecurity,
    ssAverageEarnings,
    ssClaimAge,
    maritalStatus,
    ssAverageEarnings2,
    ssClaimAge2,
    monthlyPension,
    pretaxBalance,
  ]);

  // Loading state
  if (isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600 animate-pulse" />
            Monthly Retirement Income
          </CardTitle>
          <CardDescription>
            Calculating your retirement income projection...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="animate-pulse text-muted-foreground">
              Analyzing income sources and projections...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (portfolioAtRetirement <= 0) {
    return null;
  }

  const currentMonthlyIncome = currentAnnualIncome / 12;

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Monthly Retirement Income
          </CardTitle>
          <CardDescription>
            Your retirement translated into the paycheck you will receive
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Hero Section - Big Monthly Number */}
          <MonthlyIncomeHero
            totalMonthly={totalMonthlyIncome}
            sources={incomeSources}
          />

          <div className="border-t pt-6" />

          {/* Income Replacement Ratio */}
          <IncomeReplacementGauge
            currentMonthlyIncome={currentMonthlyIncome}
            retirementMonthlyIncome={totalMonthlyIncome}
            monthlyContributions={monthlyContributions}
          />

          <div className="border-t pt-6" />

          {/* Income Over Time Chart */}
          <IncomeOverTimeChart
            data={incomeOverTime}
            ssClaimAge={ssClaimAge}
          />

          <div className="border-t pt-6" />

          {/* Paycheck Comparison */}
          <PaycheckComparison
            currentMonthlyIncome={currentMonthlyIncome}
            retirementMonthlyIncome={totalMonthlyIncome}
            monthlyContributions={monthlyContributions}
            stateRate={stateRate}
          />

          <div className="border-t pt-6" />

          {/* Lifestyle Benchmarks */}
          <LifestyleBenchmarks
            benchmarks={lifestyleBenchmarks}
            monthlyIncome={totalMonthlyIncome}
          />

          <div className="border-t pt-6" />

          {/* Income Floor / Security */}
          <IncomeFloorViz
            guaranteedMonthly={guaranteedMonthly}
            variableMonthly={variableMonthly}
            sources={incomeSources}
          />

          {/* Footer Note */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                These projections are based on a {withdrawalRate}% withdrawal
                rate and assume {inflationRate}% average inflation. Social
                Security estimates use your provided earnings history and claim
                age of {ssClaimAge}.
              </p>
              <p>
                Actual income may vary based on market performance, tax law
                changes, and personal circumstances. Consider consulting a
                financial advisor for personalized advice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});

export default IncomeReplacementViz;
